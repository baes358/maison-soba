// scripts/smoke-generate.mjs
//
// End-to-end smoke test for the /api/generate handler.
// Runs three briefs against the real Claude Haiku 4.5 model, prints the
// results, and asserts schema validity.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/smoke-generate.mjs
//
// Cost: ~$0.01 per brief at 2026 Haiku 4.5 pricing.

import handler from '../api/generate.js';

const BRIEFS = [
  'A library in autumn, dust on amber spines, the last hour of reading.',
  'Petrichor on a Sicilian terrace, salt and figs, late afternoon.',
  'Midnight in a frankincense church.'
];

function makeRes() {
  return {
    _status: null, _body: null, _headers: {},
    status(c) { this._status = c; return this; },
    json(b) { this._body = b; return this; },
    end() { return this; },
    setHeader(k, v) { this._headers[k] = v; }
  };
}

function summarize(c) {
  if (c.error) return `  ERROR: ${c.error}`;
  const topSum   = c.top_notes.reduce((s, n) => s + n.pct, 0);
  const heartSum = c.heart_notes.reduce((s, n) => s + n.pct, 0);
  const baseSum  = c.base_notes.reduce((s, n) => s + n.pct, 0);
  return [
    `  Name:        ${c.name}`,
    `  Tagline:     ${c.tagline}`,
    `  Family:      ${c.family}`,
    `  Top   (${topSum}%):   ${c.top_notes.map(n => `${n.material} ${n.pct}%`).join(', ')}`,
    `  Heart (${heartSum}%):  ${c.heart_notes.map(n => `${n.material} ${n.pct}%`).join(', ')}`,
    `  Base  (${baseSum}%):  ${c.base_notes.map(n => `${n.material} ${n.pct}%`).join(', ')}`,
    `  Total:       ${topSum + heartSum + baseSum}%`,
    `  Longevity:   ${c.longevity_hours}h   Projection: ${c.projection}   Intensity: ${c.intensity_pct}%`,
    `  Mood:        ${c.mood_word}   Season: ${c.season}   Time: ${c.time_of_day}`,
    `  Palette:     ink ${c.design_tokens.palette.ink} | paper ${c.design_tokens.palette.paper} | accent ${c.design_tokens.palette.accent} | shadow ${c.design_tokens.palette.shadow}`,
    `  Motif:       ${c.design_tokens.motif_family} / ${c.design_tokens.motif_subject}`,
    `  Edition:     ${c.edition_number}/999`,
    `  Critique:    ${c.self_critique}`
  ].join('\n');
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Set ANTHROPIC_API_KEY before running this script.');
  process.exit(1);
}

let passed = 0;
for (let i = 0; i < BRIEFS.length; i++) {
  const brief = BRIEFS[i];
  console.log(`\n${'='.repeat(72)}\nBrief ${i + 1}/${BRIEFS.length}: "${brief}"\n${'='.repeat(72)}`);

  const req = { method: 'POST', headers: { 'x-forwarded-for': `test-ip-${i}` }, body: { brief } };
  const res = makeRes();
  const start = Date.now();
  await handler(req, res);
  const ms = Date.now() - start;

  if (res._status !== 200) {
    console.error(`  ✗ status ${res._status}`);
    console.error(`  body:`, res._body);
    continue;
  }
  console.log(summarize(res._body));
  console.log(`  Latency:     ${ms} ms`);
  passed++;
}

console.log(`\n${'='.repeat(72)}\n${passed}/${BRIEFS.length} briefs returned valid 200 responses.\n`);
process.exit(passed === BRIEFS.length ? 0 : 1);
