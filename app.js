// app.js — Maison Sillage front-end
//
// Six-screen state machine: landing → method → confidence → composition →
// anchoring → carte. The method screen is shown once per session via
// localStorage. Tag selection is single-select per layer, all three
// layers are required before the macerate button enables.
//
// Composition is fetched from the same-origin /api/generate function;
// no API keys live in the browser.

import { BOTTLE_SHAPES, setBottleShape } from './bottles.js?v=3';

// ─── tag labels (display-only; server validates against canonical set) ──
// Mirror of /api/lib/tags.js minus the constraint strings.
const TAG_LABELS = {
  head: [
    { id: 'citrus',    label: 'citrus' },
    { id: 'green',     label: 'green' },
    { id: 'aromatic',  label: 'aromatic' },
    { id: 'marine',    label: 'marine' },
    { id: 'spice',     label: 'spice' },
    { id: 'fruit',     label: 'fruit' }
  ],
  heart: [
    { id: 'floral',  label: 'floral' },
    { id: 'iris',    label: 'iris' },
    { id: 'rose',    label: 'rose' },
    { id: 'tea',     label: 'tea' },
    { id: 'honey',   label: 'honey' },
    { id: 'tobacco', label: 'tobacco' }
  ],
  base: [
    { id: 'wood',    label: 'wood' },
    { id: 'smoke',   label: 'smoke' },
    { id: 'amber',   label: 'amber' },
    { id: 'vanilla', label: 'vanilla' },
    { id: 'musk',    label: 'musk' }
  ]
};

// Loading messages calibrated for a ~30-40s Sonnet 4.6 call. Each ticks
// every 3.5s so a typical generation shows 8-12 messages before reveal.
const LOADING_LINES = [
  'Consulting the organ…',
  'Reading the brief…',
  'Selecting the top notes…',
  'Listening to the heart…',
  'Choosing the base…',
  'Balancing the pyramid…',
  'Setting the longevity…',
  'Anchoring the base…',
  'Naming the composition…',
  'Filling the bottle…',
  'Pressing the seal…',
  'Drawing the card…'
];

const SCREENS = ['landing', 'method', 'confidence', 'composition', 'anchoring', 'carte'];
const METHOD_SEEN_KEY = 'maison-sillage:method-seen';

// ─── aura family mapping ─────────────────────────────────────────────────
// Olfactive family drives the colour of the ambient aura behind every screen,
// the orb on the anchoring screen, and the halo behind the vellum card.
//
// Base accord sets the family definitively. Before a base is picked, the
// heart hints at one so the room already starts to shift toward the
// memory's temperature.
const FAMILY_BY_BASE = {
  wood:    'woody',
  smoke:   'woody',
  amber:   'oriental',
  vanilla: 'gourmand',
  musk:    'oriental'
};

const FAMILY_BY_HEART = {
  floral:  'floral',
  iris:    'floral',
  rose:    'floral',
  tea:     'oriental',
  honey:   'gourmand',
  tobacco: 'woody'
};

const FAMILY_BY_HEAD = {
  citrus:   'citrus',
  marine:   'marine',
  green:    'woody',
  aromatic: 'woody',
  spice:    'oriental',
  fruit:    'gourmand'
};

// Chip glow color per family (matches the aura cores in style.css).
const FAMILY_GLOW = {
  floral:   'oklch(0.78 0.16 18)',
  oriental: 'oklch(0.62 0.16 32)',
  marine:   'oklch(0.78 0.10 210)',
  woody:    'oklch(0.70 0.12 70)',
  citrus:   'oklch(0.86 0.14 95)',
  gourmand: 'oklch(0.80 0.10 60)'
};

// Liquid colours per family — top/bottom of the bottle gradient. The
// reveal bottle picks its top from the HEAD's family and its bottom from
// the BASE's family, so the user's choices visibly mix in the glass.
const FAMILY_LIQUID = {
  floral:   { top: 'oklch(0.82 0.18 18)',  bot: 'oklch(0.58 0.18 6)'   },
  oriental: { top: 'oklch(0.68 0.16 32)',  bot: 'oklch(0.38 0.14 18)'  },
  marine:   { top: 'oklch(0.84 0.10 210)', bot: 'oklch(0.50 0.10 220)' },
  woody:    { top: 'oklch(0.74 0.12 70)',  bot: 'oklch(0.44 0.10 50)'  },
  citrus:   { top: 'oklch(0.88 0.14 95)',  bot: 'oklch(0.62 0.14 75)'  },
  gourmand: { top: 'oklch(0.84 0.10 60)',  bot: 'oklch(0.54 0.09 35)'  }
};

const AURA_FAMILIES = ['floral', 'oriental', 'marine', 'woody', 'citrus', 'gourmand'];

function currentFamily() {
  if (state.base)  return FAMILY_BY_BASE[state.base]   || 'oriental';
  if (state.heart) return FAMILY_BY_HEART[state.heart] || 'gourmand';
  if (state.head)  return FAMILY_BY_HEAD[state.head]   || 'gourmand';
  return 'gourmand';
}

function applyAuraFamily(family) {
  const ambient = document.getElementById('ambient-aura');
  const orb     = document.getElementById('anchoring-orb');
  const halo    = document.getElementById('vellum-aura');
  for (const el of [ambient, orb, halo]) {
    if (!el) continue;
    for (const f of AURA_FAMILIES) el.classList.remove('aura-' + f);
    el.classList.add('aura-' + family);
  }
}

// ─── state ──────────────────────────────────────────────────────────────
const state = {
  screen: 'landing',
  name: '',
  brief: '',
  head: null,
  heart: null,
  base: null,
  composition: null,
  archive: [] // session-only, populated when user clicks Archive
};

// ─── DOM utils ──────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function goTo(screenId) {
  if (!SCREENS.includes(screenId)) return;
  state.screen = screenId;
  $$('.screen').forEach(el => el.classList.remove('active'));
  const target = $(`[data-screen="${screenId}"]`);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ─── toast (errors and friendly notices) ────────────────────────────────
let toastTimer = null;
function showToast(message, duration = 4500) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

// ─── tag rendering ──────────────────────────────────────────────────────
function renderTags() {
  for (const layer of ['head', 'heart', 'base']) {
    const row = $(`[data-layer="${layer}"] .tag-row`);
    if (!row) continue;
    row.innerHTML = '';
    for (const { id, label } of TAG_LABELS[layer]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag';
      btn.dataset.layer = layer;
      btn.dataset.id = id;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('role', 'radio');
      btn.textContent = label;
      btn.addEventListener('click', () => selectTag(layer, id));
      row.appendChild(btn);
    }
  }
}

function selectTag(layer, id) {
  state[layer] = id;
  // Update aria-pressed and the per-chip glow for all tags in this row
  $$(`.tag[data-layer="${layer}"]`).forEach(t => {
    const selected = t.dataset.id === id;
    t.setAttribute('aria-pressed', selected ? 'true' : 'false');
    if (selected) {
      // Base chips light up with their own family glow so the colour of
      // the selection telegraphs the family it commits to. Head/heart use
      // a warm default — they hint at family without setting it.
      const glow = layer === 'base'
        ? (FAMILY_GLOW[FAMILY_BY_BASE[id]] || 'oklch(0.7 0.15 30)')
        : 'oklch(0.78 0.15 35)';
      t.style.setProperty('--chip-glow', glow);
    } else {
      t.style.removeProperty('--chip-glow');
    }
  });
  // Enable macerate when all three are selected
  $('#btn-macerate').disabled = !(state.head && state.heart && state.base);
  // Tint the room toward the memory being composed.
  applyAuraFamily(currentFamily());
}

// ─── method screen one-per-session ──────────────────────────────────────
function shouldShowMethod() {
  try { return !sessionStorage.getItem(METHOD_SEEN_KEY); } catch { return true; }
}
function markMethodSeen() {
  try { sessionStorage.setItem(METHOD_SEEN_KEY, '1'); } catch {}
}

// ─── loading line rotation ──────────────────────────────────────────────
let loadingTimer = null;
function startLoadingRotation() {
  const el = $('#loading-line');
  let i = 0;
  // Shuffle the lines lightly so two consecutive sessions don't feel identical
  const lines = LOADING_LINES.slice().sort(() => Math.random() - 0.45);
  el.textContent = lines[0];
  i = 1;
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = lines[i % lines.length];
      el.style.opacity = '1';
      i++;
    }, 480);
  }, 3500);
}
function stopLoadingRotation() {
  clearInterval(loadingTimer);
  loadingTimer = null;
}

// ─── anchoring bottle shape rotation ────────────────────────────────────
// Cycles the silhouette through all six shapes while the maceration call
// is in flight. The liquid-fill animation runs in CSS — this only swaps
// the clipPath + strokes.
let shapeRotateTimer = null;
function startShapeRotation() {
  const svg = $('#anchoring-bottle');
  if (!svg) return;
  // Shuffle so the order isn't predictable between sessions
  const shapes = BOTTLE_SHAPES.slice().sort(() => Math.random() - 0.5);
  let i = 0;
  setBottleShape(svg, shapes[i]);
  i++;
  clearInterval(shapeRotateTimer);
  shapeRotateTimer = setInterval(() => {
    setBottleShape(svg, shapes[i % shapes.length]);
    i++;
  }, 1800);
}
function stopShapeRotation() {
  clearInterval(shapeRotateTimer);
  shapeRotateTimer = null;
}

// ─── carte rendering ────────────────────────────────────────────────────

// Material display names on the card. When a material has a parenthetical
// trade name we use that — it reads more refined on the card than the
// full canonical name ("ORRIS BUTTER" beats "IRIS (ORRIS BUTTER)").
//
// Examples:
//   "Iris (Orris Butter)"             → "ORRIS BUTTER"
//   "Cypriol (Nagarmotha)"            → "NAGARMOTHA"
//   "Aldehyde C-14 (Peach Lactone)"   → "PEACH LACTONE"
//   "Bergamot"                        → "BERGAMOT"
function displayMaterial(name) {
  const m = name.match(/\(([^)]+)\)/);
  return (m ? m[1] : name).toUpperCase();
}

// Show the three most defining notes per layer — the ones the AI weighted
// most heavily for this brief. Sorting by pct ensures the card surfaces
// the materials that actually shape the composition's character, not
// whatever order the model happened to emit.
function renderLayerNotes(targetEl, notes) {
  targetEl.innerHTML = '';
  if (!Array.isArray(notes) || notes.length === 0) {
    targetEl.textContent = '—';
    return;
  }
  const top = notes.slice().sort((a, b) => b.pct - a.pct).slice(0, 3);
  for (const n of top) {
    const span = document.createElement('span');
    span.className = 'card__layer-note';
    span.textContent = displayMaterial(n.material);
    targetEl.appendChild(span);
  }
}

function projectionLabel(p) {
  return ({ intimate: 'Intimate', moderate: 'Moderate', strong: 'Strong' }[p]) || p;
}

function renderCarte(c) {
  // The card name picks up the AI's accent so each composition still
  // carries its own ink.
  const root = document.documentElement;
  root.style.setProperty('--accent', c.design_tokens.palette.accent);

  // The bottle's liquid is the user's choices made visible: head family
  // tints the top, base family tints the bottom. This ties the bottle to
  // the same colour vocabulary as the chip glow and the aura halo. Falls
  // back to the AI palette if a family is missing for any reason.
  const headFam = FAMILY_BY_HEAD[state.head];
  const baseFam = FAMILY_BY_BASE[state.base];
  const topColor = (headFam && FAMILY_LIQUID[headFam]?.top) || c.design_tokens.palette.liquid_top;
  const botColor = (baseFam && FAMILY_LIQUID[baseFam]?.bot) || c.design_tokens.palette.liquid_bottom;
  $('#liquid-grad-top').setAttribute('stop-color', topColor);
  $('#liquid-grad-bot').setAttribute('stop-color', botColor);

  // Position the vellum halo to surround the card. Drifts via CSS keyframe.
  positionVellumHalo();

  // Render the AI's chosen bottle silhouette
  setBottleShape($('#reveal-bottle'), c.design_tokens.bottle_shape);

  // Personalize the dedication
  const dedicateName = (c._client_name || state.name || 'Guest').toUpperCase();
  $('#card-dedicate-name').textContent = dedicateName;

  $('#card-name').textContent = c.name;
  // The italic line under the script name is the user's own memory — what
  // they entered on La confidence — not the AI's poetic tagline.
  // (We still receive c.tagline in the payload for archive/debug use.)
  $('#card-tagline').textContent = state.brief;

  renderLayerNotes($('#card-top'), c.top_notes);
  renderLayerNotes($('#card-heart'), c.heart_notes);
  renderLayerNotes($('#card-base'), c.base_notes);

  $('#card-mood').textContent = c.mood_word;
  $('#card-longevity').textContent = `${c.longevity_hours.toFixed(1)} hours`;
  $('#card-projection').textContent = projectionLabel(c.projection);
  $('#card-intensity').textContent = `${c.intensity_pct}%`;

  $('#card-edition').textContent = `Edition N° ${c.edition_number}`;
}

// ─── API call ───────────────────────────────────────────────────────────
async function generate() {
  const body = {
    brief: state.brief,
    name: state.name,
    head: state.head,
    heart: state.heart,
    base: state.base
  };

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  // If the response isn't JSON, the function isn't running (most common
  // cause: testing with a plain static server instead of `vercel dev`,
  // which makes /api/generate 404 with an HTML page). Surface that as a
  // specific message instead of the generic "unreadable" fallback.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 404) {
      throw new Error('The composition endpoint is not running. If you are testing locally, use `vercel dev` instead of a static server.');
    }
    throw new Error(`Unexpected response from the atelier (HTTP ${res.status}).`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Unreadable JSON from the atelier. Check the function logs.');
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status}).`);
  }
  if (data.error) {
    throw new Error(data.message || data.error);
  }
  return data;
}

// ─── flow handlers ──────────────────────────────────────────────────────
function handleBegin() {
  if (shouldShowMethod()) {
    goTo('method');
  } else {
    goTo('confidence');
  }
}

function handleContinue() {
  markMethodSeen();
  goTo('confidence');
}

function handleConfidenceSubmit(e) {
  e.preventDefault();
  const name = $('#input-name').value.trim();
  const brief = $('#input-brief').value.trim();

  if (!name) { showToast('A name, please — for the dedication.'); return; }
  if (!brief) { showToast('Even a single sentence will do.'); return; }
  if (brief.length > 500) { showToast('Briefs are kept to 500 characters.'); return; }

  state.name = name;
  state.brief = brief;
  goTo('composition');
}

async function handleMacerate(e) {
  e.preventDefault();
  if (!state.head || !state.heart || !state.base) return;

  goTo('anchoring');
  startLoadingRotation();
  startShapeRotation();

  try {
    const composition = await generate();
    state.composition = composition;
    renderCarte(composition);
    stopLoadingRotation();
    stopShapeRotation();
    goTo('carte');
    // Recompute after the screen layout settles + after the card-reveal
    // animation finishes, so the halo stays glued at every visible state.
    requestAnimationFrame(positionVellumHalo);
    setTimeout(positionVellumHalo, 1400);
  } catch (err) {
    stopLoadingRotation();
    stopShapeRotation();
    console.error('[generate]', err);
    showToast(err.message || 'The composition could not be drawn. Please try again.', 6500);
    // Send the user back to the composition screen so they can retry.
    goTo('composition');
  }
}

// Slug a perfume name into a safe filename: "Folded Light" → "folded-light".
function slugify(s) {
  return (s || 'composition')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'composition';
}

// Trigger a browser download for a data URL or blob URL.
function triggerDownload(href, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();
}

// Render the card to a high-DPI JPG data URL. Shared by both JPG and PDF
// export paths: we always go through a raster step so the PDF embeds the
// same pixel-perfect snapshot the user sees on screen (including the
// custom script font, SVG monogram, etc).
async function renderCardJpeg() {
  const card = $('#fragrance-card');
  if (!card) throw new Error('card not in DOM');

  // Lazy-import so the library only loads when the user actually saves —
  // keeps the first-paint payload small. esm.sh serves a clean ESM build.
  const { toJpeg } = await import('https://esm.sh/html-to-image@1.11.13');

  // Flatten the card for capture: remove the cursor tilt + hover lift +
  // pointer-tracked highlight, so the rasterized image is a neutral
  // straight-on shot. is-capturing also lifts max-height/overflow so the
  // full content is captured even when on-screen it was clamped to vh.
  card.classList.add('is-capturing');

  try {
    // Wait for webfonts so the JPG captures Maison Sezanne for the script
    // name and Switzer for the body, not a mid-swap fallback face.
    if (document.fonts?.ready) await document.fonts.ready;

    // Give the browser a frame to apply the flat transform before render.
    await new Promise(r => requestAnimationFrame(r));

    const dataUrl = await toJpeg(card, {
      quality: 0.96,
      pixelRatio: 2,
      backgroundColor: '#FAFAF8',
      cacheBust: true
    });

    // Measure the captured size so the caller (PDF path) knows the
    // image's natural aspect ratio without having to decode it twice.
    const rect = card.getBoundingClientRect();
    return { dataUrl, width: rect.width * 2, height: rect.height * 2 };
  } finally {
    card.classList.remove('is-capturing');
  }
}

// Wrap an async export handler with shared button-disabled, error toast,
// archive bookkeeping. `format` is shown in the "preparing…" label.
async function runArchiveExport(actionAttr, format, exportFn) {
  if (!state.composition) return;
  const btn = $$(`[data-action="${actionAttr}"]`)[0];
  const buttons = $$('[data-action^="archive-"]');
  const originalLabel = btn?.textContent;

  buttons.forEach(b => { b.disabled = true; });
  if (btn) btn.textContent = `preparing ${format}…`;

  try {
    await exportFn();
    state.archive.push({ composition: state.composition, when: new Date().toISOString(), format });
    showToast(`Saved. ${state.archive.length} composition${state.archive.length === 1 ? '' : 's'} archived this session.`);
  } catch (err) {
    console.error(`[archive:${format}]`, err);
    showToast(`The card could not be saved as ${format.toUpperCase()}. Please try again.`, 5000);
  } finally {
    buttons.forEach(b => { b.disabled = false; });
    if (btn) btn.textContent = originalLabel;
  }
}

async function handleArchiveJpg() {
  await runArchiveExport('archive-jpg', 'jpg', async () => {
    const { dataUrl } = await renderCardJpeg();
    triggerDownload(dataUrl, `maison-sillage-${slugify(state.composition?.name)}.jpg`);
  });
}

// PDF export: render the card to a JPG, then place that image on a US
// Letter page at print resolution. Margins are generous so the card sits
// like a postcard centered on the page.
async function handleArchivePdf() {
  await runArchiveExport('archive-pdf', 'pdf', async () => {
    const [{ dataUrl, width, height }, { jsPDF }] = await Promise.all([
      renderCardJpeg(),
      import('https://esm.sh/jspdf@2.5.1')
    ]);

    // US Letter portrait, inches. 1 inch = 72 pt internally; jsPDF handles
    // the conversion. Margins of 0.75" on every side leave a clean border.
    const pageW = 8.5;
    const pageH = 11;
    const margin = 0.75;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    // Fit the image inside the printable area while preserving aspect.
    const imgAspect = width / height;
    let drawW = maxW;
    let drawH = drawW / imgAspect;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * imgAspect;
    }
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
    pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
    pdf.save(`maison-sillage-${slugify(state.composition?.name)}.pdf`);
  });
}

function handleReset() {
  // Keep archive across resets; clear the in-progress brief + selections.
  state.brief = '';
  state.head = null;
  state.heart = null;
  state.base = null;
  state.composition = null;
  $('#input-brief').value = '';
  // Don't clear the name — the same client is composing again.
  $$('.tag').forEach(t => {
    t.setAttribute('aria-pressed', 'false');
    t.style.removeProperty('--chip-glow');
  });
  $('#btn-macerate').disabled = true;
  applyAuraFamily(currentFamily());
  goTo('confidence');
}

// ─── vellum halo sizing ─────────────────────────────────────────────────
// The aura behind the card is positioned/sized relative to the card so it
// looks like a halo rather than a separate blob. Recomputed on resize and
// after the card animates in.
function positionVellumHalo() {
  const card = $('#fragrance-card');
  const halo = $('#vellum-aura');
  const wrap = $('.carte-card-wrap');
  if (!card || !halo || !wrap) return;
  const cardR = card.getBoundingClientRect();
  const wrapR = wrap.getBoundingClientRect();
  const w = cardR.width + 240;
  const h = cardR.height + 160;
  halo.style.width  = `${w}px`;
  halo.style.height = `${h}px`;
  halo.style.left   = `${(cardR.left - wrapR.left) - 120}px`;
  halo.style.top    = `${(cardR.top  - wrapR.top)  - 80}px`;
}

// ─── card hover tilt ────────────────────────────────────────────────────
// Pointer-driven 3D tilt — feels like turning a printed card in your hand.
// Max tilt is intentionally small (~8°) so the effect stays restrained;
// the highlight gradient is what sells the depth.
function wireCardHover() {
  const card = $('#fragrance-card');
  if (!card) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX_TILT = 8;

  let raf = 0;
  const onMove = (e) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top)  / r.height;  // 0..1
      // ry rotates around vertical axis (left/right tilt)
      // rx rotates around horizontal axis (top/bottom tilt, inverted)
      const ry = (px - 0.5) *  MAX_TILT * 2;
      const rx = (0.5 - py) *  MAX_TILT * 2;
      card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      card.style.setProperty('--glow-x', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--glow-y', `${(py * 100).toFixed(1)}%`);
    });
  };

  card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerleave', () => {
    if (raf) cancelAnimationFrame(raf);
    card.classList.remove('is-tilting');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

// ─── bottle pointer tilt ────────────────────────────────────────────────
// Mirror of the card tilt: while the pointer is over the reveal bottle,
// rotate it toward the cursor (up to ±10°) so it feels like the glass is
// catching light. Combined with the ambient float on the wrapper stage,
// this gives the bottle a live, interactive presence.
function wireBottleHover() {
  const bottle = $('#reveal-bottle');
  if (!bottle) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX = 10;
  let raf = 0;
  const onMove = (e) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = bottle.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top)  / r.height;
      const ry = (px - 0.5) *  MAX * 2;
      const rx = (0.5 - py) *  MAX * 2;
      bottle.style.setProperty('--b-ry', `${ry.toFixed(2)}deg`);
      bottle.style.setProperty('--b-rx', `${rx.toFixed(2)}deg`);
    });
  };

  bottle.addEventListener('pointerenter', () => bottle.classList.add('is-tracking'));
  bottle.addEventListener('pointermove', onMove);
  bottle.addEventListener('pointerleave', () => {
    if (raf) cancelAnimationFrame(raf);
    bottle.classList.remove('is-tracking');
    bottle.style.setProperty('--b-rx', '0deg');
    bottle.style.setProperty('--b-ry', '0deg');
  });
}

// ─── boot ───────────────────────────────────────────────────────────────
function boot() {
  renderTags();

  // Seed the loading-screen bottle with the first silhouette. While
  // anchoring is active, shapeRotateTimer cycles it through the full set;
  // the reveal screen's bottle is set when the composition returns.
  setBottleShape($('#anchoring-bottle'), 'monolith');

  // Wire actions
  $$('[data-action="begin"]').forEach(b => b.addEventListener('click', handleBegin));
  $$('[data-action="continue"]').forEach(b => b.addEventListener('click', handleContinue));
  $$('[data-action="archive-jpg"]').forEach(b => b.addEventListener('click', handleArchiveJpg));
  $$('[data-action="archive-pdf"]').forEach(b => b.addEventListener('click', handleArchivePdf));
  $$('[data-action="reset"]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); handleReset(); }));

  $('#form-confidence').addEventListener('submit', handleConfidenceSubmit);
  $('#form-composition').addEventListener('submit', handleMacerate);

  wireCardHover();
  wireBottleHover();

  // Keep the vellum halo glued to the card across viewport changes.
  window.addEventListener('resize', positionVellumHalo);

  // Seed the ambient aura with the default family.
  applyAuraFamily(currentFamily());

  // First screen
  goTo('landing');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
