// bottles.js — the six hand-drawn bottle silhouettes the AI picks from.
//
// Each shape is two SVG fragments:
//   • clip    — a single path/shape used as the body's clipPath (so the
//                 liquid gradient gets trimmed to the bottle's silhouette).
//   • strokes — the visible line drawing: cap, neck, body.
//
// All bottles share viewBox 120 × 200 so they're swappable. The liquid
// rect (set by app.js) sits at y=100, height=72 for every shape — the
// clipPath does the visual work of making it conform to the bottle.
//
// To iterate on a shape, edit the two strings here and reload — no other
// code needs to change.

export const BOTTLE_SHAPES = ['monolith', 'facet', 'obelisk', 'orb', 'tear', 'stone'];

export const BOTTLES = {
  // ─── 1. MONOLITH — tall classical rectangle ─────────────────────────
  // For architectural compositions: chypres, leathers, restrained ambers.
  monolith: {
    clip: `<rect x="28" y="52" width="64" height="120" rx="2"/>`,
    strokes: `
      <rect x="46" y="20" width="28" height="22" rx="1"/>
      <line x1="50" y1="42" x2="50" y2="52"/>
      <line x1="70" y1="42" x2="70" y2="52"/>
      <rect x="28" y="52" width="64" height="120" rx="2"/>
    `
  },

  // ─── 2. FACET — hexagonal/diamond ───────────────────────────────────
  // Crystalline, modern: aldehydics, aquatics, mineral compositions.
  // The body's top is a small flat shoulder (50→70 at y=56) so the neck
  // lines have something to rest on instead of a sharp apex.
  facet: {
    clip: `<polygon points="50,56 70,56 92,84 92,144 60,172 28,144 28,84"/>`,
    strokes: `
      <polygon points="50,20 70,20 76,26 76,38 70,44 50,44 44,38 44,26"/>
      <line x1="52" y1="44" x2="52" y2="56"/>
      <line x1="68" y1="44" x2="68" y2="56"/>
      <polygon points="50,56 70,56 92,84 92,144 60,172 28,144 28,84"/>
      <line x1="28" y1="114" x2="92" y2="114" stroke-opacity="0.35"/>
    `
  },

  // ─── 3. OBELISK — tapered/conical trapezoid ─────────────────────────
  // Ascendant, austere: green aromatics, smoky orientals, incense work.
  obelisk: {
    clip: `<path d="M 40 44 L 80 44 L 96 172 L 24 172 Z"/>`,
    strokes: `
      <rect x="50" y="20" width="20" height="14" rx="1"/>
      <line x1="52" y1="34" x2="52" y2="44"/>
      <line x1="68" y1="34" x2="68" y2="44"/>
      <path d="M 40 44 L 80 44 L 96 172 L 24 172 Z"/>
    `
  },

  // ─── 4. ORB — spherical ─────────────────────────────────────────────
  // Soft, romantic, full: lush florals, rose-led, gourmand fruit.
  orb: {
    clip: `<circle cx="60" cy="114" r="56"/>`,
    strokes: `
      <rect x="50" y="20" width="20" height="14" rx="1"/>
      <line x1="52" y1="34" x2="52" y2="58"/>
      <line x1="68" y1="34" x2="68" y2="58"/>
      <line x1="48" y1="58" x2="72" y2="58"/>
      <circle cx="60" cy="114" r="56"/>
    `
  },

  // ─── 5. TEAR — teardrop ─────────────────────────────────────────────
  // Feminine, watery, fluid: watery florals, marines, soft musks.
  tear: {
    clip: `<path d="M 50 48 C 24 70, 18 150, 60 172 C 102 150, 96 70, 70 48 Z"/>`,
    strokes: `
      <rect x="50" y="20" width="20" height="14" rx="1"/>
      <line x1="52" y1="34" x2="52" y2="48"/>
      <line x1="68" y1="34" x2="68" y2="48"/>
      <path d="M 50 48 C 24 70, 18 150, 60 172 C 102 150, 96 70, 70 48 Z"/>
    `
  },

  // ─── 6. STONE — round-squat / river-stone ───────────────────────────
  // Grounded, earthy, animalic: deep woods, ouds, leathers, vetiver-led.
  // Body is an ellipse so its top curves up to meet the neck instead of
  // sitting on a square shoulder.
  stone: {
    clip: `<ellipse cx="60" cy="112" rx="48" ry="60"/>`,
    strokes: `
      <rect x="44" y="20" width="32" height="14" rx="1"/>
      <line x1="48" y1="34" x2="48" y2="52"/>
      <line x1="72" y1="34" x2="72" y2="52"/>
      <line x1="40" y1="52" x2="80" y2="52"/>
      <ellipse cx="60" cy="112" rx="48" ry="60"/>
    `
  }
};

// Swap a bottle SVG's inner content to a given shape. Falls back to
// monolith for unknown shapes so an upstream bug never leaves the user
// with a blank screen.
export function setBottleShape(svgEl, shape) {
  const bottle = BOTTLES[shape] || BOTTLES.monolith;
  const clipEl = svgEl.querySelector('[data-bottle-clip]');
  const strokesEl = svgEl.querySelector('[data-bottle-strokes]');
  if (clipEl) clipEl.innerHTML = bottle.clip;
  if (strokesEl) strokesEl.innerHTML = bottle.strokes;
}
