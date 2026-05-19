// app.js — Maison Sillage front-end
//
// Six-screen state machine: landing → method → confidence → composition →
// anchoring → carte. The method screen is shown once per session via
// localStorage. Tag selection is single-select per layer, all three
// layers are required before the macerate button enables.
//
// Composition is fetched from the same-origin /api/generate function;
// no API keys live in the browser.

import { setBottleShape } from './bottles.js?v=2';

// ─── tag labels (display-only; server validates against canonical set) ──
// Mirror of /api/lib/tags.js minus the constraint strings.
const TAG_LABELS = {
  head: [
    { id: 'citrus',    label: 'citrus' },
    { id: 'green',     label: 'green' },
    { id: 'aldehydic', label: 'aldehydic' },
    { id: 'aromatic',  label: 'aromatic' },
    { id: 'marine',    label: 'marine' },
    { id: 'spice',     label: 'spice' },
    { id: 'fruit',     label: 'fruit' }
  ],
  heart: [
    { id: 'floral',  label: 'floral' },
    { id: 'iris',    label: 'iris' },
    { id: 'rose',    label: 'rose' },
    { id: 'powder',  label: 'powder' },
    { id: 'tea',     label: 'tea' },
    { id: 'honey',   label: 'honey' },
    { id: 'tobacco', label: 'tobacco' }
  ],
  base: [
    { id: 'wood',    label: 'wood' },
    { id: 'smoke',   label: 'smoke' },
    { id: 'amber',   label: 'amber' },
    { id: 'leather', label: 'leather' },
    { id: 'oud',     label: 'oud' },
    { id: 'vanilla', label: 'vanilla' },
    { id: 'musk',    label: 'musk' },
    { id: 'incense', label: 'incense' }
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
  // Update aria-pressed for all tags in this row
  $$(`.tag[data-layer="${layer}"]`).forEach(t => {
    t.setAttribute('aria-pressed', t.dataset.id === id ? 'true' : 'false');
  });
  // Enable macerate when all three are selected
  $('#btn-macerate').disabled = !(state.head && state.heart && state.base);
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

function renderLayerNotes(targetEl, notes) {
  targetEl.innerHTML = '';
  if (!Array.isArray(notes) || notes.length === 0) {
    targetEl.textContent = '—';
    return;
  }
  for (const n of notes) {
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
  // Drive the AI palette through CSS vars + SVG gradient stops
  const root = document.documentElement;
  root.style.setProperty('--accent', c.design_tokens.palette.accent);
  $('#liquid-grad-top').setAttribute('stop-color', c.design_tokens.palette.liquid_top);
  $('#liquid-grad-bot').setAttribute('stop-color', c.design_tokens.palette.liquid_bottom);

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

  try {
    const composition = await generate();
    state.composition = composition;
    renderCarte(composition);
    stopLoadingRotation();
    goTo('carte');
  } catch (err) {
    stopLoadingRotation();
    console.error('[generate]', err);
    showToast(err.message || 'The composition could not be drawn. Please try again.', 6500);
    // Send the user back to the composition screen so they can retry.
    goTo('composition');
  }
}

function handleArchive() {
  if (!state.composition) return;
  state.archive.push({
    composition: state.composition,
    when: new Date().toISOString()
  });
  showToast(`Archived. ${state.archive.length} composition${state.archive.length === 1 ? '' : 's'} in this session.`);
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
  $$('.tag').forEach(t => t.setAttribute('aria-pressed', 'false'));
  $('#btn-macerate').disabled = true;
  goTo('confidence');
}

// ─── boot ───────────────────────────────────────────────────────────────
function boot() {
  renderTags();

  // Draw the loading-screen bottle once at boot. Monolith is the default
  // silhouette during anchoring — we don't yet know what shape the AI
  // will pick. The shape on the reveal screen gets set when the composition
  // returns.
  setBottleShape($('#anchoring-bottle'), 'monolith');

  // Wire actions
  $$('[data-action="begin"]').forEach(b => b.addEventListener('click', handleBegin));
  $$('[data-action="continue"]').forEach(b => b.addEventListener('click', handleContinue));
  $$('[data-action="archive"]').forEach(b => b.addEventListener('click', handleArchive));
  $$('[data-action="reset"]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); handleReset(); }));

  $('#form-confidence').addEventListener('submit', handleConfidenceSubmit);
  $('#form-composition').addEventListener('submit', handleMacerate);

  // First screen
  goTo('landing');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
