// /api/lib/tags.js
//
// The selectable tags shown on "II. La composition". Each tag carries
// the exact constraint string that gets spliced into Claude's user
// message. Hard "must" language by design — the user has explicitly
// chosen these.

export const TAGS = {
  head: [
    { id: 'citrus',    label: 'citrus',    constraint: 'The head must be citrus-led.' },
    { id: 'green',     label: 'green',     constraint: 'The head must be green/aromatic-led.' },
    { id: 'aromatic',  label: 'aromatic',  constraint: 'The head must be aromatic-herbal-led.' },
    { id: 'marine',    label: 'marine',    constraint: 'The head must feature marine/aquatic notes.' },
    { id: 'spice',     label: 'spice',     constraint: 'The head must be spice-led.' },
    { id: 'fruit',     label: 'fruit',     constraint: 'The head must feature fruit notes.' }
  ],
  heart: [
    { id: 'floral',  label: 'floral',  constraint: 'The heart must be floral-led.' },
    { id: 'iris',    label: 'iris',    constraint: 'The heart must feature Iris (Orris Butter) as a primary anchor.' },
    { id: 'rose',    label: 'rose',    constraint: 'The heart must feature rose (Rose Otto, Rose Absolute, or Rose Centifolia) as a primary anchor.' },
    { id: 'tea',     label: 'tea',     constraint: 'The heart must evoke tea — consider Mate Absolute, Hay Absolute, or Osmanthus.' },
    { id: 'honey',   label: 'honey',   constraint: 'The heart must feature honeyed warmth — consider Beeswax Absolute, Honeysuckle, or Orange Blossom Absolute.' },
    { id: 'tobacco', label: 'tobacco', constraint: 'The heart must feature Tobacco Absolute prominently.' }
  ],
  base: [
    { id: 'wood',    label: 'wood',    constraint: 'The base must be woody-led — Sandalwood, Cedarwood, or Vetiver as anchor.' },
    { id: 'smoke',   label: 'smoke',   constraint: 'The base must be smoky — consider Birch Tar, Smoke Accord, Vetiver Java, or Guaiac Wood.' },
    { id: 'amber',   label: 'amber',   constraint: 'The base must be amber-led — Labdanum, Benzoin, Vanilla Absolute, or Ambroxan.' },
    { id: 'vanilla', label: 'vanilla', constraint: 'The base must feature Vanilla Absolute or Tonka Bean prominently.' },
    { id: 'musk',    label: 'musk',    constraint: 'The base must be musk-led — Galaxolide, Ambrettolide, Muscone, or Habanolide.' }
  ]
};

// Flat lookup by layer + id, used by the API to convert client selections
// into prompt constraints. Returns null when a tag id is unknown.
export function lookupTag(layer, id) {
  const group = TAGS[layer];
  if (!group) return null;
  return group.find(t => t.id === id) ?? null;
}

// Convert a {head, heart, base} selection into the constraint strings for
// the prompt. Throws when any required tag is missing or unknown.
export function constraintsFromSelection({ head, heart, base }) {
  const out = [];
  for (const [layer, id] of [['head', head], ['heart', heart], ['base', base]]) {
    if (typeof id !== 'string' || !id) {
      throw new Error(`Missing tag selection for ${layer}.`);
    }
    const tag = lookupTag(layer, id);
    if (!tag) throw new Error(`Unknown ${layer} tag: "${id}".`);
    out.push(tag.constraint);
  }
  return out;
}
