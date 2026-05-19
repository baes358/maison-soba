// /api/generate.js
//
// POST /api/generate
//   body: {
//     brief:  string (≤ 500 chars, optional — but at least one of brief or
//                     tag selection must be present)
//     name:   string (≤ 60 chars, the client's first name — used only on
//                     the card, never sent to Claude)
//     head:   tag id, required (one of TAGS.head)
//     heart:  tag id, required (one of TAGS.heart)
//     base:   tag id, required (one of TAGS.base)
//   }
//
// Returns the JSON composition described in /api/lib/prompt.js, validated
// server-side against the schema and the materials reference. The Anthropic
// API key never leaves the server.
//
// Rate limiting is per-IP, per-instance, 5 / hour. Sufficient for low-traffic
// public use. Migrate to Vercel KV / Upstash Redis when shared state across
// instances becomes necessary.

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage, BOTTLE_SHAPES } from './lib/prompt.js';
import { MATERIALS_BY_NAME } from './lib/materials.js';
import { constraintsFromSelection } from './lib/tags.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_BRIEF_CHARS = 500;
const MAX_NAME_CHARS = 60;
const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_OUTPUT_TOKENS = 2048;

// ─── per-instance rate limit ──────────────────────────────────────────────
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

function gcRateLimits() {
  if (rateLimits.size < 500) return;
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimits.delete(ip);
  }
}

// ─── request validation ───────────────────────────────────────────────────
function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Body must be a JSON object.' };
  }

  // Brief is optional, but if present must be a clean non-empty string ≤ MAX.
  let brief = '';
  if (body.brief !== undefined && body.brief !== null) {
    if (typeof body.brief !== 'string') return { ok: false, message: 'brief must be a string.' };
    brief = body.brief.trim();
    if (brief.length > MAX_BRIEF_CHARS) {
      return { ok: false, message: `brief is too long (max ${MAX_BRIEF_CHARS} characters).` };
    }
  }

  // Name is optional. If present we sanitize and cap; never sent to Claude.
  let name = '';
  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name !== 'string') return { ok: false, message: 'name must be a string.' };
    name = body.name.trim().slice(0, MAX_NAME_CHARS);
  }

  // Tag selections are required.
  let constraints;
  try {
    constraints = constraintsFromSelection({
      head: body.head,
      heart: body.heart,
      base: body.base
    });
  } catch (err) {
    return { ok: false, message: err.message };
  }

  // At least one of brief or constraints must give Claude something to work
  // with. Constraints alone is acceptable, an empty everything is not.
  if (!brief && constraints.length === 0) {
    return { ok: false, message: 'Provide a brief, tag selections, or both.' };
  }

  return { ok: true, brief, name, constraints };
}

// ─── response schema validation ───────────────────────────────────────────
const HEX_RE = /^#[0-9a-f]{6}$/i;
const isHex = (s) => typeof s === 'string' && HEX_RE.test(s);

const PROJECTIONS = ['intimate', 'moderate', 'strong'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'transitional'];
const TIMES = ['morning', 'afternoon', 'evening', 'night'];
const MOTIF_FAMILIES = ['botanical', 'smoke', 'geometric', 'fruit', 'resin'];
const BOTTLE_SHAPES_SET = new Set(BOTTLE_SHAPES);

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

  // Total must equal 100. Sonnet often drifts a few points low or high
  // despite the worked example in the prompt — if it's close enough, we
  // auto-correct in a way that avoids burning an extra round-trip.
  //
  // Strategy: walk every note in descending pct, base section first
  // (the formula's natural fixative absorbers), then heart, then top.
  // The first note that can absorb the full drift without violating its
  // own typical_pct_range AND without pushing its section out of band
  // wins. This converts most near-misses into first-attempt successes,
  // saving a Sonnet call (~$0.03 + ~12s) per affected composition.
  const totalPct = [...c.top_notes, ...c.heart_notes, ...c.base_notes]
    .reduce((s, n) => s + n.pct, 0);

  if (totalPct !== 100) {
    const diff = 100 - totalPct;

    // Only rescue near-misses (±10). Larger drift means the composition
    // is too far off — retry with a corrective message.
    if (Math.abs(diff) > 10) {
      return `Total pct is ${totalPct}, must equal 100.`;
    }

    const sections = [
      { notes: c.base_notes,  name: 'base',  bounds: [25, 50] },
      { notes: c.heart_notes, name: 'heart', bounds: [30, 50] },
      { notes: c.top_notes,   name: 'top',   bounds: [15, 30] }
    ];

    let absorbed = false;
    for (const section of sections) {
      const sectionSum = section.notes.reduce((s, n) => s + n.pct, 0);
      const newSectionSum = sectionSum + diff;
      if (newSectionSum < section.bounds[0] || newSectionSum > section.bounds[1]) {
        continue; // This section can't take the change without going out of band.
      }
      // Try each note in this section, largest first.
      const candidates = section.notes.slice().sort((a, b) => b.pct - a.pct);
      for (const note of candidates) {
        const newPct = note.pct + diff;
        if (newPct < 1) continue; // Don't drive any note to zero.
        const matRange = MATERIALS_BY_NAME
          .get(note.material.toLowerCase())?.typical_pct_range;
        if (matRange && (newPct < matRange[0] || newPct > matRange[1])) continue;

        console.log(`[auto-correct] total was ${totalPct}; nudged ${note.material} (${section.name}) from ${note.pct}% to ${newPct}% to reach 100.`);
        note.pct = newPct;
        absorbed = true;
        break;
      }
      if (absorbed) break;
    }

    if (!absorbed) {
      return `Total drift ${diff} cannot be absorbed without violating section bounds or material ranges.`;
    }
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
  if (!palette || !isHex(palette.liquid_top) || !isHex(palette.liquid_bottom) || !isHex(palette.accent)) {
    return 'design_tokens.palette requires three valid hex colors (liquid_top, liquid_bottom, accent).';
  }
  if (!BOTTLE_SHAPES_SET.has(tokens.bottle_shape)) {
    return `design_tokens.bottle_shape must be one of ${BOTTLE_SHAPES.join('|')}.`;
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

async function callClaude(client, messages) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [{
      type: 'text',
      text: SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' }
    }],
    messages
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

  const v = validateRequest(req.body);
  if (!v.ok) {
    return res.status(400).json({ error: 'invalid_request', message: v.message });
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
  const initialUserMsg = buildUserMessage({ brief: v.brief, constraints: v.constraints });

  let composition = null;
  let lastError = null;
  let messages = [{ role: 'user', content: initialUserMsg }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    let text;
    try {
      text = await callClaude(client, messages);
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
      messages = [
        { role: 'user', content: initialUserMsg },
        { role: 'assistant', content: text },
        { role: 'user', content: 'Your previous response was not valid JSON. Re-output the full composition as a single JSON object. No prose, no code fences, no commentary.' }
      ];
      continue;
    }

    const schemaError = validateComposition(parsed);
    if (schemaError) {
      console.error(`[schema] attempt ${attempt}: ${schemaError}`);
      lastError = schemaError;
      messages = [
        { role: 'user', content: initialUserMsg },
        { role: 'assistant', content: text },
        { role: 'user', content: `Your previous composition failed validation with this error:\n\n  ${schemaError}\n\nFix that specific issue and re-output the complete corrected JSON. Keep the same artistic direction (name, family, character of the composition); only fix the constraint violation. No prose, no code fences.` }
      ];
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

  // Echo the client's name back so the frontend can show it on the card
  // without needing to track local state across the async call.
  return res.status(200).json({ ...composition, _client_name: v.name });
}
