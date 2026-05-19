// scripts/smoke-generate.mjs
//
// End-to-end smoke test for the /api/generate handler.
// Tests two flow shapes against the real Claude model:
//   1. Brief + name + all three tag selections.
//   2. Constraints-only (no brief) — ensures the no-brief path works.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/smoke-generate.mjs

import handler from '../api/generate.js';

const TRIALS = [
  {
    label: 'Brief + name + tags',
    body: {
      brief: 'A library in autumn, dust on amber spines, the last hour of reading.',
      name: 'soba',
      head: 'spice',
      heart: 'iris',
      base: 'leather'
    }
  },
  {
    label: 'Constraints only',
    body: {
      brief: '',
      name: 'soba',
      head: 'marine',
      heart: 'tea',
      base: 'musk'
    }
  }
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
  const T = c.top_notes.reduce((s, n) => s + n.pct, 0);
  const H = c.heart_notes.reduce((s, n) => s + n.pct, 0);
  const B = c.base_notes.reduce((s, n) => s + n.pct, 0);
  return [
    `  For client:  ${c._client_name || '(none)'}`,
    `  Name:        ${c.name}`,
    `  Tagline:     ${c.tagline}`,
    `  Family:      ${c.family}`,
    `  Top   (${T}%): ${c.top_notes.map(n => `${n.material} ${n.pct}%`).join(', ')}`,
    `  Heart (${H}%): ${c.heart_notes.map(n => `${n.material} ${n.pct}%`).join(', ')}`,
    `  Base  (${B}%): ${c.base_notes.map(n => `${n.material} ${n.pct}%`).join(', ')}`,
    `  Total:       ${T + H + B}%`,
    `  Longevity:   ${c.longevity_hours}h   Projection: ${c.projection}   Intensity: ${c.intensity_pct}%`,
    `  Mood:        ${c.mood_word}   Season: ${c.season}   Time: ${c.time_of_day}`,
    `  Palette:     liquid_top ${c.design_tokens.palette.liquid_top} | liquid_bottom ${c.design_tokens.palette.liquid_bottom} | accent ${c.design_tokens.palette.accent}`,
    `  Bottle:      ${c.design_tokens.bottle_shape}`,
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
for (let i = 0; i < TRIALS.length; i++) {
  const { label, body } = TRIALS[i];
  console.log(`\n${'='.repeat(72)}\nTrial ${i + 1}/${TRIALS.length}: ${label}\n  body: ${JSON.stringify(body)}\n${'='.repeat(72)}`);

  const req = { method: 'POST', headers: { 'x-forwarded-for': `test-ip-${i}` }, body };
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

console.log(`\n${'='.repeat(72)}\n${passed}/${TRIALS.length} trials returned valid 200 responses.\n`);
process.exit(passed === TRIALS.length ? 0 : 1);
