// /api/lib/materials.js
//
// The Maison Sillage perfumer's organ — a curated reference of ~150 materials
// the AI perfumer can compose from. Each entry is structured so it can be
// embedded in the system prompt and machine-validated later.
//
//   name              — canonical material name shown to users
//   family            — broad olfactive family for grouping
//   volatility        — pyramid position: 'top' | 'heart' | 'base'
//   typical_pct_range — usable concentration range in the formula [min, max]
//   character         — one short, evocative perfumer's description
//
// Percentages reflect realistic working ranges, not absolute IFRA limits.
// Some materials (oud, jasmine absolute, civet) are intentionally tight to
// keep compositions defensible.

export const MATERIALS = [
  // ─── CITRUS ─────────────────────────────────────────────────────────────
  { name: 'Bergamot',            family: 'citrus',  volatility: 'top',   typical_pct_range: [3, 15],  character: 'bright, slightly bitter, with cool floral lift' },
  { name: 'Lemon',               family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 12],  character: 'cold zest, sharp and clean' },
  { name: 'Mandarin Red',        family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 10],  character: 'sweet, juicy, sunlit' },
  { name: 'Mandarin Green',      family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 10],  character: 'tart, leafy, pithy edge' },
  { name: 'Petitgrain',          family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 10],  character: 'green twigs and bitter orange leaf' },
  { name: 'Yuzu',                family: 'citrus',  volatility: 'top',   typical_pct_range: [1, 6],   character: 'east-Asian citrus, floral grapefruit shimmer' },
  { name: 'Grapefruit',          family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 12],  character: 'sulphurous tang, pink flesh' },
  { name: 'Lime',                family: 'citrus',  volatility: 'top',   typical_pct_range: [1, 8],   character: 'green and effervescent, slightly soapy' },
  { name: 'Bitter Orange',       family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 10],  character: 'dry, marmalade rind' },
  { name: 'Blood Orange',        family: 'citrus',  volatility: 'top',   typical_pct_range: [2, 8],   character: 'warmer than orange, vinous undertone' },
  { name: 'Neroli',              family: 'floral',  volatility: 'heart', typical_pct_range: [1, 6],   character: 'orange blossom by steam — green, honeyed, metallic' },

  // ─── FLORAL ─────────────────────────────────────────────────────────────
  { name: 'Rose Otto',           family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'fresh dewy rose, slightly lemony, transparent' },
  { name: 'Rose Absolute',       family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'jammy, honeyed, deep red petals' },
  { name: 'Rose Centifolia',     family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'soft, powdery, antique rose' },
  { name: 'Jasmine Sambac',      family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'narcotic, fruity, slightly tea-like' },
  { name: 'Jasmine Grandiflorum',family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'indolic, animalic-floral, voluptuous' },
  { name: 'Ylang Ylang',         family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 4], character: 'creamy, banana-custard, tropical' },
  { name: 'Tuberose',            family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'thick, carnal, mentholated white floral' },
  { name: 'Orange Blossom Absolute', family: 'floral', volatility: 'heart', typical_pct_range: [0.5, 3], character: 'sweet, indolic, honeyed' },
  { name: 'Gardenia',            family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'mushroom-edged white floral, creamy and humid' },
  { name: 'Lily of the Valley',  family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 4], character: 'green, dewy, transparent muguet' },
  { name: 'Mimosa',              family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'powdery, honeyed, slightly cucumber-green' },
  { name: 'Magnolia',            family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'lemony floral, soft and luminous' },
  { name: 'Osmanthus',           family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'apricot-leather floral, tea and stone fruit' },
  { name: 'Violet Leaf',         family: 'green',   volatility: 'top',   typical_pct_range: [0.3, 2], character: 'green, watery, cucumber and stem' },
  { name: 'Narcissus',           family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 1.5], character: 'hay-like, leathery floral, slightly animalic' },
  { name: 'Frangipani',          family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'creamy tropical floral, almond undertone' },
  { name: 'Peony',               family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 4], character: 'fresh, watery, pink-petal accord' },
  { name: 'Hyacinth',            family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'green stem, cold spring earth' },
  { name: 'Freesia',             family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'peppery, watery, clean floral' },
  { name: 'Honeysuckle',         family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 3], character: 'nectared, sun-warm, slightly indolic' },
  { name: 'Champaca',            family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'tea-like white floral, magnolia and apricot' },
  { name: 'Boronia',             family: 'floral',  volatility: 'heart', typical_pct_range: [0.2, 1], character: 'cassia-floral, hay and violet' },
  { name: 'Carnation',           family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'spicy floral, clove and rose' },
  { name: 'Iris (Orris Butter)', family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 4], character: 'powdery, cool, carrot-suede, regal' },
  { name: 'Geranium',            family: 'floral',  volatility: 'heart', typical_pct_range: [0.5, 4], character: 'rosy mint, green leaf, slightly metallic' },
  { name: 'Linden Blossom',      family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'honeyed, slightly pollen-dusty, summer tea' },
  { name: 'Broom (Genêt)',       family: 'floral',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'hay-honey floral, leather edge' },

  // ─── GREEN / HERBAL ─────────────────────────────────────────────────────
  { name: 'Galbanum',            family: 'green',   volatility: 'top',   typical_pct_range: [0.3, 2], character: 'sharp green resin, broken stems' },
  { name: 'Basil',               family: 'herbal',  volatility: 'top',   typical_pct_range: [0.5, 3], character: 'anisic, herbaceous, slightly minty' },
  { name: 'Clary Sage',          family: 'herbal',  volatility: 'top',   typical_pct_range: [0.5, 3], character: 'tea-like, ambery herb, warm musk hint' },
  { name: 'Lavender',            family: 'herbal',  volatility: 'top',   typical_pct_range: [1, 8],   character: 'camphoraceous floral herb, clean and aromatic' },
  { name: 'Rosemary',            family: 'herbal',  volatility: 'top',   typical_pct_range: [0.5, 3], character: 'piney, eucalypt, mountain-air' },
  { name: 'Thyme',               family: 'herbal',  volatility: 'top',   typical_pct_range: [0.3, 2], character: 'dry, phenolic, medicinal' },
  { name: 'Peppermint',          family: 'herbal',  volatility: 'top',   typical_pct_range: [0.2, 1.5], character: 'cold, sharp, slightly chocolate-edged' },
  { name: 'Tomato Leaf',         family: 'green',   volatility: 'top',   typical_pct_range: [0.2, 1.5], character: 'sun-warmed vine, green and slightly metallic' },
  { name: 'Fig Leaf',            family: 'green',   volatility: 'top',   typical_pct_range: [0.5, 3], character: 'milky green leaf, coconut and dust' },
  { name: 'Davana',              family: 'herbal',  volatility: 'heart', typical_pct_range: [0.3, 2], character: 'rummy, fruity, tobacco-edged' },
  { name: 'Tarragon',            family: 'herbal',  volatility: 'top',   typical_pct_range: [0.2, 1.5], character: 'anisic green herb, slightly licorice' },
  { name: 'Juniper Berry',       family: 'herbal',  volatility: 'top',   typical_pct_range: [0.3, 2], character: 'gin-cool, piney, resinous' },
  { name: 'Cypress',             family: 'woody',   volatility: 'heart', typical_pct_range: [0.5, 3], character: 'dry needles, pencil shavings, mediterranean wind' },
  { name: 'Pine Needle',         family: 'green',   volatility: 'top',   typical_pct_range: [0.3, 2], character: 'sap-bright, cold forest' },
  { name: 'Fir Balsam',          family: 'green',   volatility: 'heart', typical_pct_range: [0.3, 2], character: 'sweet resinous conifer, slightly fruity' },
  { name: 'Mate Absolute',       family: 'green',   volatility: 'heart', typical_pct_range: [0.3, 2], character: 'dry tea leaf, hay and earth' },
  { name: 'Oakmoss',             family: 'mossy',   volatility: 'base',  typical_pct_range: [0.3, 2], character: 'forest floor, ink, dry leather' },
  { name: 'Treemoss',            family: 'mossy',   volatility: 'base',  typical_pct_range: [0.3, 2], character: 'tarry, dry, woody-resinous' },

  // ─── SPICE ──────────────────────────────────────────────────────────────
  { name: 'Pink Pepper',         family: 'spice',   volatility: 'top',   typical_pct_range: [0.5, 4], character: 'crackling, rose-tinged spice, dry sparkle' },
  { name: 'Black Pepper',        family: 'spice',   volatility: 'top',   typical_pct_range: [0.3, 2], character: 'hot, woody, dry-skinned spice' },
  { name: 'Cardamom',            family: 'spice',   volatility: 'top',   typical_pct_range: [0.5, 3], character: 'cool eucalyptic spice, exotic clarity' },
  { name: 'Cinnamon',            family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'warm, sweet, slightly leathery bark' },
  { name: 'Clove',               family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.2], character: 'pungent, sharp, dentist-medicinal' },
  { name: 'Nutmeg',              family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'warm, dusty, slightly aldehydic' },
  { name: 'Ginger',              family: 'spice',   volatility: 'top',   typical_pct_range: [0.5, 3], character: 'fresh, peppery, fizzy root' },
  { name: 'Saffron',             family: 'spice',   volatility: 'heart', typical_pct_range: [0.1, 1], character: 'leathery, hay-honey, slightly metallic' },
  { name: 'Cumin',               family: 'spice',   volatility: 'heart', typical_pct_range: [0.1, 0.8], character: 'warm skin, sweat, dry-spiced earth' },
  { name: 'Coriander',           family: 'spice',   volatility: 'top',   typical_pct_range: [0.3, 2], character: 'citric, slightly soapy, faintly floral' },
  { name: 'Allspice (Pimento)',  family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'clove-nutmeg-cinnamon hybrid' },
  { name: 'Star Anise',          family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'sweet licorice, warm and rounded' },
  { name: 'Mace',                family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.2], character: 'finer, lighter nutmeg with floral edge' },
  { name: 'Cassia',              family: 'spice',   volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'rougher, redder cinnamon' },
  { name: 'Turmeric',            family: 'spice',   volatility: 'heart', typical_pct_range: [0.1, 1], character: 'earthy, slightly medicinal, woody' },

  // ─── WOODS ──────────────────────────────────────────────────────────────
  { name: 'Sandalwood',          family: 'woody',   volatility: 'base',  typical_pct_range: [3, 20],  character: 'creamy, milky, warm and quietly animalic' },
  { name: 'Cedarwood Atlas',     family: 'woody',   volatility: 'base',  typical_pct_range: [2, 15],  character: 'sharp pencil shavings, dry and clean' },
  { name: 'Cedarwood Virginia',  family: 'woody',   volatility: 'base',  typical_pct_range: [2, 15],  character: 'softer, sweeter, slightly pink cedar' },
  { name: 'Vetiver Haiti',       family: 'woody',   volatility: 'base',  typical_pct_range: [1, 10],  character: 'smoky, earthy, grapefruit-tinged root' },
  { name: 'Vetiver Java',        family: 'woody',   volatility: 'base',  typical_pct_range: [1, 10],  character: 'darker, leather and damp earth' },
  { name: 'Patchouli',           family: 'woody',   volatility: 'base',  typical_pct_range: [1, 12],  character: 'damp basement, dark cocoa, camphor' },
  { name: 'Oud',                 family: 'woody',   volatility: 'base',  typical_pct_range: [0.1, 2], character: 'deep, animalic, leather, smoke and barn' },
  { name: 'Guaiac Wood',         family: 'woody',   volatility: 'base',  typical_pct_range: [1, 8],   character: 'smoky-sweet wood, rose and tar' },
  { name: 'Cypriol (Nagarmotha)',family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'leathery root, oud-adjacent, slightly inky' },
  { name: 'Hinoki',              family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'Japanese cypress, clean bath-wood' },
  { name: 'Palo Santo',          family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'sacred wood, mint-tinged smoke' },
  { name: 'Ho Wood',             family: 'woody',   volatility: 'heart', typical_pct_range: [0.5, 4], character: 'rosewood-camphor, soft and clean' },
  { name: 'Bois de Rose',        family: 'woody',   volatility: 'heart', typical_pct_range: [0.5, 4], character: 'rosy wood, floral linalool' },
  { name: 'Birch Tar',           family: 'leather', volatility: 'base',  typical_pct_range: [0.1, 1.5], character: 'burnt rubber, russian leather, campfire' },

  // ─── RESIN / BALSAM ─────────────────────────────────────────────────────
  { name: 'Frankincense',        family: 'resin',   volatility: 'heart', typical_pct_range: [0.5, 4], character: 'cool, lemony smoke, sacred and dry' },
  { name: 'Myrrh',               family: 'resin',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'medicinal balsam, mushroom-cool' },
  { name: 'Benzoin',             family: 'resin',   volatility: 'base',  typical_pct_range: [1, 6],   character: 'vanilla-tinged balsam, warm and creamy' },
  { name: 'Labdanum',            family: 'resin',   volatility: 'base',  typical_pct_range: [1, 6],   character: 'amber, leather, sun-baked rockrose' },
  { name: 'Opoponax',            family: 'resin',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'sweet myrrh, honeyed and resinous' },
  { name: 'Elemi',               family: 'resin',   volatility: 'top',   typical_pct_range: [0.5, 3], character: 'lemony pine resin, peppery brightness' },
  { name: 'Styrax',              family: 'resin',   volatility: 'base',  typical_pct_range: [0.3, 2], character: 'cinnamic balsam, dry leather edge' },
  { name: 'Tolu Balsam',         family: 'resin',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'vanilla-cinnamon resin, warm pharmacy' },
  { name: 'Copaiba',             family: 'resin',   volatility: 'base',  typical_pct_range: [0.5, 3], character: 'soft woody balsam, pepper undertone' },
  { name: 'Peru Balsam',         family: 'resin',   volatility: 'base',  typical_pct_range: [0.5, 3], character: 'vanilla-cocoa, rich and ambery' },

  // ─── ANIMALIC ───────────────────────────────────────────────────────────
  { name: 'Ambroxan',            family: 'amber',   volatility: 'base',  typical_pct_range: [1, 8],   character: 'mineral ambergris, salt and skin' },
  { name: 'Ambergris Accord',    family: 'amber',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'oceanic warmth, sun-dried driftwood' },
  { name: 'Civet',               family: 'animalic',volatility: 'base',  typical_pct_range: [0.05, 0.5], character: 'fecal-floral, warm fur, fully diluted only' },
  { name: 'Castoreum',           family: 'animalic',volatility: 'base',  typical_pct_range: [0.1, 1.5], character: 'leather and birch tar, animal pelt' },
  { name: 'Hyraceum',            family: 'animalic',volatility: 'base',  typical_pct_range: [0.1, 1], character: 'tobacco-leather-urine, dry and complex' },
  { name: 'Ambrette Seed',       family: 'musk',    volatility: 'heart', typical_pct_range: [0.3, 2], character: 'plant musk, pear and brandy hint' },

  // ─── MUSKS ──────────────────────────────────────────────────────────────
  { name: 'Galaxolide',          family: 'musk',    volatility: 'base',  typical_pct_range: [2, 12],  character: 'clean white musk, slightly powdery' },
  { name: 'Ethylene Brassylate', family: 'musk',    volatility: 'base',  typical_pct_range: [2, 10],  character: 'soft floral musk, cotton skin' },
  { name: 'Ambrettolide',        family: 'musk',    volatility: 'base',  typical_pct_range: [1, 6],   character: 'natural-feel musk, pear and seed' },
  { name: 'Muscone',             family: 'musk',    volatility: 'base',  typical_pct_range: [0.5, 3], character: 'warm, animalic, deer-pod musk' },
  { name: 'Habanolide',          family: 'musk',    volatility: 'base',  typical_pct_range: [1, 6],   character: 'metallic-clean musk, slight ozone' },
  { name: 'Helvetolide',         family: 'musk',    volatility: 'base',  typical_pct_range: [1, 6],   character: 'soft fruity musk, pear-skin' },
  { name: 'Romandolide',         family: 'musk',    volatility: 'base',  typical_pct_range: [1, 6],   character: 'transparent musk, ambery whisper' },
  { name: 'Muscenone',           family: 'musk',    volatility: 'base',  typical_pct_range: [0.5, 3], character: 'powdery floral musk, second-skin' },

  // ─── GOURMAND ───────────────────────────────────────────────────────────
  { name: 'Vanilla Absolute',    family: 'gourmand',volatility: 'base',  typical_pct_range: [1, 8],   character: 'rummy, smoky, deep pod vanilla' },
  { name: 'Tonka Bean',          family: 'gourmand',volatility: 'base',  typical_pct_range: [1, 6],   character: 'almond-hay-vanilla, coumarin warmth' },
  { name: 'Cocoa Absolute',      family: 'gourmand',volatility: 'base',  typical_pct_range: [0.3, 2], character: 'bitter dark chocolate, dusty' },
  { name: 'Coffee Absolute',     family: 'gourmand',volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'roasted bean, bitter and resinous' },
  { name: 'Immortelle',          family: 'gourmand',volatility: 'heart', typical_pct_range: [0.3, 2], character: 'maple syrup curry, dried herb, fenugreek' },
  { name: 'Hay Absolute',        family: 'gourmand',volatility: 'heart', typical_pct_range: [0.3, 2], character: 'cut grass dried in sun, coumarin' },
  { name: 'Beeswax Absolute',    family: 'gourmand',volatility: 'base',  typical_pct_range: [0.3, 2], character: 'warm honey-wax, tobacco edge' },
  { name: 'Heliotropin',         family: 'gourmand',volatility: 'heart', typical_pct_range: [0.5, 4], character: 'almond-cherry-vanilla powder' },
  { name: 'Ethyl Vanillin',      family: 'gourmand',volatility: 'base',  typical_pct_range: [0.5, 4], character: 'sweeter, candied vanilla' },
  { name: 'Caramel Note',        family: 'gourmand',volatility: 'base',  typical_pct_range: [0.3, 2], character: 'burnt sugar, butterscotch' },
  { name: 'Praline Accord',      family: 'gourmand',volatility: 'base',  typical_pct_range: [0.3, 2], character: 'roasted hazelnut and sugar' },

  // ─── ALDEHYDES ──────────────────────────────────────────────────────────
  { name: 'Aldehyde C-10',       family: 'aldehyde',volatility: 'top',   typical_pct_range: [0.05, 0.5], character: 'orange-rind sparkle, soapy lift' },
  { name: 'Aldehyde C-11',       family: 'aldehyde',volatility: 'top',   typical_pct_range: [0.05, 0.5], character: 'waxy, slightly green, classic No. 5' },
  { name: 'Aldehyde C-12 MNA',   family: 'aldehyde',volatility: 'top',   typical_pct_range: [0.05, 0.5], character: 'metallic, ironed-linen' },
  { name: 'Aldehyde C-14 (Peach Lactone)', family: 'aldehyde', volatility: 'heart', typical_pct_range: [0.1, 1], character: 'soft peach fuzz, creamy stone fruit' },
  { name: 'Aldehyde C-16',       family: 'aldehyde',volatility: 'heart', typical_pct_range: [0.1, 1], character: 'jam-like strawberry, candied' },
  { name: 'Aldehyde C-18 (Coconut Lactone)', family: 'aldehyde', volatility: 'base',  typical_pct_range: [0.1, 1.5], character: 'creamy coconut milk, lactonic' },

  // ─── MODERN SYNTHETICS / ABSTRACTS ──────────────────────────────────────
  { name: 'Iso E Super',         family: 'woody',   volatility: 'base',  typical_pct_range: [5, 25],  character: 'cedar-velvet, soft second-skin radiance' },
  { name: 'Hedione',             family: 'floral',  volatility: 'heart', typical_pct_range: [5, 30],  character: 'magnolia-jasmine luminosity, transparent lift' },
  { name: 'Cashmeran',           family: 'woody',   volatility: 'base',  typical_pct_range: [1, 8],   character: 'velvet wood, slightly fruity-musky' },
  { name: 'Javanol',             family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'creamy sandalwood, grapefruit shimmer' },
  { name: 'Paradisone',          family: 'floral',  volatility: 'heart', typical_pct_range: [1, 8],   character: 'super-hedione, jasmine radiance' },
  { name: 'Calone',              family: 'marine',  volatility: 'top',   typical_pct_range: [0.05, 0.5], character: 'sea-melon ozonic, sun on water' },
  { name: 'Ambrocenide',         family: 'amber',   volatility: 'base',  typical_pct_range: [0.2, 2], character: 'crystalline amber, woody salt' },
  { name: 'Akigalawood',         family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 3], character: 'patchouli-pepper-oud accord' },
  { name: 'Clearwood',           family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'clean patchouli, no earthy edge' },
  { name: 'Norlimbanol',         family: 'woody',   volatility: 'base',  typical_pct_range: [0.1, 1], character: 'dry desert wood, leathery and arid' },
  { name: 'Sandalore',           family: 'woody',   volatility: 'base',  typical_pct_range: [1, 8],   character: 'milky synthetic sandalwood' },
  { name: 'Ebanol',              family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'natural-feel sandalwood, slightly floral' },
  { name: 'Polysantol',          family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'creamy sandalwood with rose lift' },
  { name: 'Georgywood',          family: 'woody',   volatility: 'base',  typical_pct_range: [0.5, 4], character: 'soft iso-e-like, more powdery' },
  { name: 'Dihydromyrcenol',     family: 'aromatic',volatility: 'top',   typical_pct_range: [1, 8],   character: 'cold lavender-citrus, fresh laundry' },
  { name: 'Vertofix',            family: 'woody',   volatility: 'base',  typical_pct_range: [1, 6],   character: 'vetiver-cedar fixative, smoky-clean' },

  // ─── OTHER ACCORDS ──────────────────────────────────────────────────────
  { name: 'Tobacco Absolute',    family: 'leather', volatility: 'heart', typical_pct_range: [0.3, 2], character: 'dry cured leaf, honey and hay' },
  { name: 'Leather Accord',      family: 'leather', volatility: 'base',  typical_pct_range: [0.5, 4], character: 'worn glove, birch and labdanum' },
  { name: 'Suede Note',          family: 'leather', volatility: 'base',  typical_pct_range: [0.3, 2], character: 'softer leather, iris-powdered' },
  { name: 'Smoke Accord',        family: 'smoky',   volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'cool ash, blown-out candle' },
  { name: 'Marine Accord',       family: 'marine',  volatility: 'top',   typical_pct_range: [0.2, 1.5], character: 'salt air, calone and ozone' },
  { name: 'Wet Stone',           family: 'mineral', volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'petrichor, slate after rain' },
  { name: 'Salt Accord',         family: 'mineral', volatility: 'heart', typical_pct_range: [0.2, 1.5], character: 'mineral salt, dry skin' },
  { name: 'Aldehydic Sparkle',   family: 'aldehyde',volatility: 'top',   typical_pct_range: [0.1, 1], character: 'champagne-fizz, lifted laundry-clean' }
];

// Compact text format for embedding in the model prompt. One line per
// material — much smaller than JSON and just as legible to the model.
export function materialsAsPromptLines() {
  return MATERIALS.map(m => {
    const [lo, hi] = m.typical_pct_range;
    return `${m.name} — ${m.family}, ${m.volatility}, ${lo}–${hi}%, ${m.character}`;
  }).join('\n');
}

// Index by lowercased name for fast server-side validation.
export const MATERIALS_BY_NAME = new Map(
  MATERIALS.map(m => [m.name.toLowerCase(), m])
);
