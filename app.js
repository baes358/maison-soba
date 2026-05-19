// app.js — Maison Sillage front-end
//
// Six-screen state machine: landing → method → confidence → composition →
// anchoring → carte. The method screen is shown once per session via
// localStorage. Tag selection is single-select per layer, all three
// layers are required before the macerate button enables.
//
// Composition is fetched from the same-origin /api/generate function;
// no API keys live in the browser.

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

// ─── carte rendering (placeholder — Step 5 will refine) ─────────────────
function formatNotes(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return '—';
  return notes
    .map(n => n.material.toUpperCase())
    .join('\n');
}

function projectionLabel(p) {
  return ({ intimate: 'Intimate', moderate: 'Moderate', strong: 'Strong' }[p]) || p;
}

function renderCarte(c) {
  // Set the liquid gradient + accent CSS variables from the palette
  const root = document.documentElement;
  root.style.setProperty('--accent', c.design_tokens.palette.accent);

  $('#liquid-grad-top').setAttribute('stop-color', c.design_tokens.palette.liquid_top);
  $('#liquid-grad-bot').setAttribute('stop-color', c.design_tokens.palette.liquid_bottom);

  // Dedicate to the client's name (echoed back by the server)
  const dedicateName = (c._client_name || state.name || 'Guest').toUpperCase();
  $('#card-dedicate-name').textContent = dedicateName;

  $('#card-name').textContent = c.name;
  $('#card-tagline').textContent = c.tagline;

  $('#card-top').textContent = formatNotes(c.top_notes);
  $('#card-heart').textContent = formatNotes(c.heart_notes);
  $('#card-base').textContent = formatNotes(c.base_notes);

  // The pyramid layout renders as block lines — preserve newlines.
  $$('.card__layer-notes').forEach(el => {
    el.style.whiteSpace = 'pre-line';
  });

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

  let data;
  try { data = await res.json(); } catch { data = { error: 'bad_response', message: 'Unreadable response from the atelier.' }; }

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
