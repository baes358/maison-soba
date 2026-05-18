// /api/generate.js
//
// POST /api/generate
//   body: { brief: string }   — the user's perfume brief (≤ 500 chars)
//
// Returns the JSON composition described in /api/lib/prompt.js, validated
// server-side against the schema and the materials reference. The Anthropic
// API key never leaves the server.
//
// Rate limiting is per-IP, per-instance, 5 / hour. This is intentionally
// minimal — sufficient for low-traffic public use. Migrate to Vercel KV or
// Upstash Redis when shared state across instances becomes necessary.

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from './lib/prompt.js';
import { MATERIALS_BY_NAME } from './lib/materials.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_BRIEF_CHARS = 500;
const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_OUTPUT_TOKENS = 2048;

// ─── per-instance rate limit ──────────────────────────────────────────────
// Map<ip, { count, windowStart }>. Persists across invocations within one
// warm function instance only.
const rateLimits = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
  }
  entry.count++;
  return { ok: true };
}

// Clean expired entries when the map grows. Cheap to run; no scheduler needed.
function gcRateLimits() {
  if (rateLimits.size < 500) return;
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimits.delete(ip);
  }
}

// ─── input + schema validation ────────────────────────────────────────────
function validateBrief(input) {
  if (typeof input !== 'string') return { ok: false, message: 'Brief must be a string.' };
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: 'Brief is empty.' };
  if (trimmed.length > MAX_BRIEF_CHARS) {
    return { ok: false, message: `Brief is too long (max ${MAX_BRIEF_CHARS} characters).` };
  }
  return { ok: true, brief: trimmed };
}

const HEX_RE = /^#[0-9a-f]{6}$/i;
const isHex = (s) => typeof s === 'string' && HEX_RE.test(s);

const PROJECTIONS = ['intimate', 'moderate', 'strong'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'transitional'];
const TIMES = ['morning', 'afternoon', 'evening', 'night'];
const MOTIF_FAMILIES = ['botanical', 'smoke', 'geometric', 'fruit', 'resin'];

function validateNotes(notes, label, [minSum, maxSum]) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return `${label} must be a non-empty array.`;
  }
  let sum = 0;
  for (const n of notes) {
    if (!n || typeof n !== 'object') return `${label} contains a non-object entry.`;
    if (typeof n.material !== 'string') return `${label} note is missing material.`;
    if (typeof n.pct !== 'number' || !Number.isFinite(n.pct) || n.pct <= 0) {
      return `${label} note "${n.material}" has invalid pct.`;
    }
    if (typeof n.character !== 'string' || !n.character.trim()) {
      return `${label} note "${n.material}" is missing character.`;
    }
    if (!MATERIALS_BY_NAME.has(n.material.toLowerCase())) {
      return `${label} contains unknown material "${n.material}".`;
    }
    sum += n.pct;
  }
  if (sum < minSum || sum > maxSum) {
    return `${label} pcts sum to ${sum}, outside [${minSum}, ${maxSum}].`;
  }
  return null;
}

function validateComposition(c) {
  if (!c || typeof c !== 'object') return 'Response is not an object.';

  // Off-topic short-circuit: { error: "..." } is valid output we pass through.
  if (typeof c.error === 'string' && c.error.trim()) return null;

  const required = [
    'name', 'tagline', 'family',
    'top_notes', 'heart_notes', 'base_notes',
    'longevity_hours', 'projection', 'intensity_pct',
    'mood_word', 'season', 'time_of_day',
    'design_tokens', 'self_critique', 'edition_number'
  ];
  for (const k of required) {
    if (!(k in c)) return `Missing field: ${k}`;
  }

  if (typeof c.name !== 'string' || !c.name.trim()) return 'name must be a non-empty string.';
  if (typeof c.tagline !== 'string' || !c.tagline.trim()) return 'tagline must be a non-empty string.';
  if (typeof c.family !== 'string' || !c.family.trim()) return 'family must be a non-empty string.';

  const topErr = validateNotes(c.top_notes, 'top_notes', [15, 30]);
  if (topErr) return topErr;
  const heartErr = validateNotes(c.heart_notes, 'heart_notes', [30, 50]);
  if (heartErr) return heartErr;
  const baseErr = validateNotes(c.base_notes, 'base_notes', [25, 50]);
  if (baseErr) return baseErr;

  const totalPct = [...c.top_notes, ...c.heart_notes, ...c.base_notes]
    .reduce((s, n) => s + n.pct, 0);
  if (Math.abs(totalPct - 100) > 1) {
    return `Total pct is ${totalPct}, must equal 100.`;
  }

  if (typeof c.longevity_hours !== 'number' || c.longevity_hours < 2 || c.longevity_hours > 14) {
    return 'longevity_hours out of range [2, 14].';
  }
  if (!PROJECTIONS.includes(c.projection)) return `projection must be one of ${PROJECTIONS.join('|')}.`;
  if (typeof c.intensity_pct !== 'number' || c.intensity_pct < 15 || c.intensity_pct > 95) {
    return 'intensity_pct out of range [15, 95].';
  }
  if (typeof c.mood_word !== 'string' || !c.mood_word.trim()) return 'mood_word must be a non-empty string.';
  if (!SEASONS.includes(c.season)) return `season must be one of ${SEASONS.join('|')}.`;
  if (!TIMES.includes(c.time_of_day)) return `time_of_day must be one of ${TIMES.join('|')}.`;

  const tokens = c.design_tokens;
  if (!tokens || typeof tokens !== 'object') return 'design_tokens missing.';
  const palette = tokens.palette;
  if (!palette || !isHex(palette.ink) || !isHex(palette.paper) || !isHex(palette.accent) || !isHex(palette.shadow)) {
    return 'design_tokens.palette requires four valid hex colors (ink, paper, accent, shadow).';
  }
  if (!MOTIF_FAMILIES.includes(tokens.motif_family)) {
    return `design_tokens.motif_family must be one of ${MOTIF_FAMILIES.join('|')}.`;
  }
  if (typeof tokens.motif_subject !== 'string' || !tokens.motif_subject.trim()) {
    return 'design_tokens.motif_subject must be a non-empty string.';
  }

  if (typeof c.self_critique !== 'string' || c.self_critique.trim().length < 20) {
    return 'self_critique must be a substantive paragraph.';
  }
  if (
    !Number.isInteger(c.edition_number) ||
    c.edition_number < 1 ||
    c.edition_number > 999
  ) {
    return 'edition_number must be an integer in [1, 999].';
  }

  return null;
}

// ─── Claude call + JSON extraction ────────────────────────────────────────
function extractJson(text) {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Heuristic recovery: pull the first {...} block out.
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) return null;
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

async function callClaude(client, userMessage) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [{
      type: 'text',
      text: SYSTEM_PROMPT,
      // Cache the 4k-token system prompt across requests. 5-min TTL is fine
      // for our traffic shape — every cache hit saves cost and latency.
      cache_control: { type: 'ephemeral' }
    }],
    messages: [{ role: 'user', content: userMessage }]
  });
  const block = response.content.find(b => b.type === 'text');
  return block?.text ?? '';
}

// ─── handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' });
  }

  // Validate the request shape before checking server-side config so that
  // bad client input always gets a 400 and never gets confused with a 500.
  const validation = validateBrief(req.body?.brief);
  if (!validation.ok) {
    return res.status(400).json({ error: 'invalid_brief', message: validation.message });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[config] ANTHROPIC_API_KEY is not set on the server.');
    return res.status(500).json({
      error: 'server_misconfigured',
      message: 'The atelier is not properly configured. Please notify the maintainer.'
    });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    console.warn(`[rate-limit] ip=${ip} hit ${RATE_LIMIT_PER_HOUR}/hr ceiling`);
    res.setHeader('Retry-After', Math.ceil(rate.retryAfterMs / 1000));
    return res.status(429).json({
      error: 'rate_limited',
      message: `The atelier accepts ${RATE_LIMIT_PER_HOUR} compositions per visitor each hour. Please return shortly.`
    });
  }
  gcRateLimits();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userMsg = buildUserMessage(validation.brief);

  let composition = null;
  let lastError = null;

  // Two attempts. On a malformed or invalid response, retry once with the
  // same prompt — the cache makes the system block free on the second call.
  for (let attempt = 1; attempt <= 2; attempt++) {
    let text;
    try {
      text = await callClaude(client, userMsg);
    } catch (err) {
      console.error(`[claude-api] attempt ${attempt} failed:`, err?.message || err);
      lastError = `upstream: ${err?.message || 'unknown'}`;
      if (attempt === 2) {
        return res.status(503).json({
          error: 'upstream_unavailable',
          message: 'The composition could not be drawn at this moment. Please try again.'
        });
      }
      continue;
    }

    const parsed = extractJson(text);
    if (!parsed) {
      console.error(`[parse] attempt ${attempt}: malformed JSON. head:`, text.slice(0, 300));
      lastError = 'malformed JSON';
      continue;
    }

    const schemaError = validateComposition(parsed);
    if (schemaError) {
      console.error(`[schema] attempt ${attempt}: ${schemaError}`);
      lastError = schemaError;
      continue;
    }

    composition = parsed;
    break;
  }

  if (!composition) {
    return res.status(503).json({
      error: 'composition_failed',
      message: 'The composition could not be drawn correctly. Please rephrase your brief and try again.',
      detail: lastError
    });
  }

  return res.status(200).json(composition);
}
