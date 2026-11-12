/* ── Civilization motifs. Every civ wears a pattern from its own culture in its own colours.
   Tiles are small SVGs turned into CSS variables (--motif on the civ colour, --motif-soft on vellum),
   so cards, camps, banners and card backs all share one look per civ. ── */
const MOTIF_TILES = {
  cloud: (a) => [36, 24, `<path d="M3 17c0-4 5-5 7-2 0-5 8-6 9-1 2-3 8-2 7 3" fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round"/><path d="M10 15c1-2 3-2 3 0" fill="none" stroke="${a}" stroke-width="1.1"/><circle cx="30" cy="6" r="1.3" fill="${a}"/>`],
  seigaiha: (a, b) => [24, 12, ['0,0', '24,0', '12,6', '0,12', '24,12'].map(p => { const [x, y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="11" fill="${b}" stroke="${a}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="7.5" fill="none" stroke="${a}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${a}" stroke-width="1"/>`; }).join('')],
  lattice: (a) => [24, 24, `<path d="M0 12h24M12 0v24" stroke="${a}" stroke-width="1"/><rect x="7" y="7" width="10" height="10" fill="none" stroke="${a}" stroke-width="1.2"/><path d="M7 7L4 4M17 7l3-3M7 17l-3 3M17 17l3 3" stroke="${a}" stroke-width=".8"/>`],
  drum: (a) => [40, 40, `<circle cx="20" cy="20" r="15" fill="none" stroke="${a}" stroke-width="1"/><circle cx="20" cy="20" r="10.5" fill="none" stroke="${a}" stroke-width=".8" stroke-dasharray="1.5 2"/><path d="M20 12.5l1.6 5 5-1.6-3.4 3.6 3.4 3.6-5-1.6-1.6 5-1.6-5-5 1.6 3.4-3.6-3.4-3.6 5 1.6z" fill="${a}"/><path d="M2 2l3 2M38 38l-3-2M38 2l-3 2M2 38l3-2" stroke="${a}" stroke-width="1"/>`],
  naga: (a) => [20, 14, `<path d="M0 14c0-6 4-10 10-10s10 4 10 10M-10 7c0-6 4-10 10-10s10 4 10 10M10 7c0-6 4-10 10-10s10 4 10 10" fill="none" stroke="${a}" stroke-width="1.1"/>`],
  kawung: (a) => [24, 24, `<g fill="none" stroke="${a}" stroke-width="1.1"><ellipse cx="12" cy="5.5" rx="3.6" ry="5"/><ellipse cx="12" cy="18.5" rx="3.6" ry="5"/><ellipse cx="5.5" cy="12" rx="5" ry="3.6"/><ellipse cx="18.5" cy="12" rx="5" ry="3.6"/></g><circle cx="12" cy="12" r="1.2" fill="${a}"/>`],
  jali: (a) => [24, 24, `<path d="M12 0l12 12-12 12L0 12z" fill="none" stroke="${a}" stroke-width="1"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="${a}" stroke-width="1"/><circle cx="12" cy="12" r="1.3" fill="${a}"/>`],
  girih: (a) => [28, 28, `<g fill="none" stroke="${a}" stroke-width="1.1"><rect x="8" y="8" width="12" height="12"/><rect x="8" y="8" width="12" height="12" transform="rotate(45 14 14)"/></g><path d="M0 14h4.5M23.5 14H28M14 0v4.5M14 23.5V28" stroke="${a}" stroke-width="1.1"/>`],
  arabesque: (a) => [28, 24, `<path d="M0 16c6-9 10-9 14 0s8 9 14 0" fill="none" stroke="${a}" stroke-width="1.2"/><path d="M14 16c-2.5-4.5 2-7 4.5-4.5M0 16c2.5 4.5-2 7-4.5 4.5M28 16c2.5 4.5-2 7-4.5 4.5" fill="none" stroke="${a}" stroke-width="1"/><circle cx="7" cy="9" r="1.2" fill="${a}"/>`],
  iznik: (a) => [28, 28, `<path d="M14 21c-4-1-6-5-5-10 2 2 3.2 2 5-1 1.8 3 3 3 5 1 1 5-1 9-5 10z" fill="${a}"/><path d="M14 21v6M14 25c-3-1-5 0-6 2M14 25c3-1 5 0 6 2" fill="none" stroke="${a}" stroke-width="1"/>`],
  zellige: (a) => [28, 28, `<path d="M14 5l2.6 6.4L23 14l-6.4 2.6L14 23l-2.6-6.4L5 14l6.4-2.6z" fill="none" stroke="${a}" stroke-width="1.1"/><circle cx="14" cy="14" r="2" fill="${a}"/><path d="M0 0l4 4M28 0l-4 4M0 28l4-4M28 28l-4-4" stroke="${a}" stroke-width="1"/>`],
  bogolan: (a) => [32, 30, `<path d="M0 8l4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4" fill="none" stroke="${a}" stroke-width="1.5"/><g fill="${a}"><circle cx="4" cy="17" r="1.5"/><circle cx="12" cy="17" r="1.5"/><circle cx="20" cy="17" r="1.5"/><circle cx="28" cy="17" r="1.5"/></g><path d="M2 25h6M12 25h6M22 25h6" stroke="${a}" stroke-width="1.5"/>`],
  tibeb: (a) => [24, 24, `<path d="M12 2l7 10-7 10-7-10z" fill="none" stroke="${a}" stroke-width="1.1"/><path d="M12 8v8M8 12h8" stroke="${a}" stroke-width="1.1"/><circle cx="0" cy="12" r="1.2" fill="${a}"/><circle cx="24" cy="12" r="1.2" fill="${a}"/>`],
  felt: (a) => [32, 22, `<path d="M16 19c0-6-4-10-8-8s-2 6 1 5M16 19c0-6 4-10 8-8s2 6-1 5" fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round"/><path d="M0 3h32" stroke="${a}" stroke-width=".7" stroke-dasharray="2 2"/>`],
  cloisonne: (a, b) => [20, 24, `<path d="M0 6h6v6h8V6h6M0 18h6v-6M14 12v6h6M10 18v6" fill="none" stroke="${a}" stroke-width="1.3"/><rect x="7" y="7" width="6" height="4" fill="${b}"/>`],
  knot: (a) => [24, 24, `<path d="M0 12c6-8 12-8 12 0s6 8 12 0M0 12c6 8 12 8 12 0s6-8 12 0" fill="none" stroke="${a}" stroke-width="1.5"/>`],
  interlace: (a, b) => [28, 20, `<path d="M0 10c5-8 9-8 14 0s9 8 14 0" fill="none" stroke="${a}" stroke-width="3.2"/><path d="M0 10c5-8 9-8 14 0s9 8 14 0" fill="none" stroke="${b}" stroke-width="1"/>`],
  fleur: (a) => [24, 24, `<path d="M12 0L24 12 12 24 0 12z" fill="none" stroke="${a}" stroke-width=".8"/><path d="M12 7c-1.4 1.6-1.4 3.4 0 5 1.4-1.6 1.4-3.4 0-5zM12 12c-1-2-4-2.4-4.4-.6 1-.4 2.4 0 3 1.4M12 12c1-2 4-2.4 4.4-.6-1-.4-2.4 0-3 1.4M10 13.4h4M12 12v4" fill="${a}" stroke="${a}" stroke-width=".6"/>`],
  tracery: (a) => [24, 24, `<g fill="none" stroke="${a}" stroke-width="1"><circle cx="12" cy="7.5" r="4.5"/><circle cx="12" cy="16.5" r="4.5"/><circle cx="7.5" cy="12" r="4.5"/><circle cx="16.5" cy="12" r="4.5"/></g><path d="M0 0h24v24H0z" fill="none" stroke="${a}" stroke-width=".6"/>`],
  azulejo: (a) => [24, 24, `<rect width="24" height="24" fill="none" stroke="${a}" stroke-width=".8"/><circle cx="12" cy="12" r="5" fill="none" stroke="${a}" stroke-width="1.1"/><path d="M12 7v10M7 12h10" stroke="${a}" stroke-width=".7"/><path d="M0 6a6 6 0 0 0 6-6M18 0a6 6 0 0 0 6 6M24 18a6 6 0 0 0-6 6M6 24a6 6 0 0 0-6-6" fill="none" stroke="${a}" stroke-width="1"/>`],
  mudejar: (a) => [24, 24, `<path d="M0 6h24M0 18h24M6 0v24M18 0v24" stroke="${a}" stroke-width=".8"/><rect x="9" y="9" width="6" height="6" transform="rotate(45 12 12)" fill="${a}"/>`],
  diaper: (a) => [20, 20, `<path d="M10 0l10 10-10 10L0 10z" fill="none" stroke="${a}" stroke-width=".9"/><circle cx="10" cy="10" r="1.6" fill="${a}"/>`],
  mosaic: (a, b) => [16, 16, `<rect x="1" y="1" width="6" height="6" fill="${a}"/><rect x="9" y="9" width="6" height="6" fill="${a}"/><rect x="9" y="1" width="6" height="6" fill="${b}"/><rect x="1" y="9" width="6" height="6" fill="${b}"/>`],
  stitch: (a) => [24, 24, [[12, 4], [8, 8], [16, 8], [4, 12], [20, 12], [8, 16], [16, 16], [12, 20], [12, 12]].map(([x, y]) => `<path d="M${x - 1.6} ${y - 1.6}l3.2 3.2m0-3.2l-3.2 3.2" stroke="${a}" stroke-width="1.1"/>`).join('')],
  tulip: (a) => [24, 24, `<path d="M12 4c-3 3-3 6 0 9 3-3 3-6 0-9zM12 13c-2-2-6-2-7 0 2 0 4 1 5 3M12 13c2-2 6-2 7 0-2 0-4 1-5 3" fill="${a}"/><path d="M12 13v8" stroke="${a}" stroke-width="1"/>`],
  sash: (a) => [24, 12, `<path d="M0 6l6-6 6 6-6 6zM12 6l6-6 6 6-6 6z" fill="none" stroke="${a}" stroke-width="1"/><path d="M6 3v6M3 6h6M18 3v6M15 6h6" stroke="${a}" stroke-width=".8"/>`],
  wycinanki: (a) => [28, 28, Array.from({ length: 8 }, (_, i) => `<ellipse cx="14" cy="7.5" rx="2.2" ry="5" fill="${a}" transform="rotate(${i * 45} 14 14)"/>`).join('') + `<circle cx="14" cy="14" r="2.4" fill="none" stroke="${a}"/>`],
  fret: (a) => [24, 16, `<path d="M0 14h7V5h9v6h-4V8" fill="none" stroke="${a}" stroke-width="1.6"/><path d="M16 14h8" stroke="${a}" stroke-width="1.6"/>`],
  tocapu: (a) => [16, 16, `<rect x="1" y="1" width="14" height="14" fill="none" stroke="${a}" stroke-width="1"/><path d="M4 4h8v8H4z" fill="none" stroke="${a}" stroke-width=".8"/><circle cx="8" cy="8" r="1.4" fill="${a}"/>`],
  brass: (a) => [20, 20, `<circle cx="10" cy="10" r="3" fill="none" stroke="${a}" stroke-width="1"/><circle cx="0" cy="0" r="2" fill="${a}"/><circle cx="20" cy="20" r="2" fill="${a}"/>`],
  zharan: (a) => [24, 24, `<g fill="${a}"><circle cx="12" cy="12" r="2.1"/>${[0, 60, 120, 180, 240, 300].map(d => `<circle cx="${(12 + 5.4 * Math.cos(d * Math.PI / 180)).toFixed(1)}" cy="${(12 + 5.4 * Math.sin(d * Math.PI / 180)).toFixed(1)}" r="1.3"/>`).join('')}<circle cx="0" cy="0" r="1"/><circle cx="24" cy="24" r="1"/><circle cx="24" cy="0" r="1"/><circle cx="0" cy="24" r="1"/></g>`],
  endless: (a) => [24, 24, `<path d="M12 2l10 10-10 10L2 12z" fill="none" stroke="${a}" stroke-width="1.1"/><path d="M7 7l10 10M17 7L7 17" stroke="${a}" stroke-width="1"/>`],
  script: (a) => [28, 28, `<path d="M5 6h8M9 6v9M5 11h8M6 15l3 3 4-3M17 8h6M20 8v5M17 13h7M18 17l2.5 4 3-4M6 22h5M8.5 22v4" stroke="${a}" stroke-width="1.15" fill="none" stroke-linecap="round"/>`],
  kanote: (a) => [28, 20, `<path d="M0 14c4-8 10-8 14-2s10 6 14-2" fill="none" stroke="${a}" stroke-width="1.2"/><path d="M14 12c-1-4 2-7 5-6M7 9c1-3 4-4 6-2" fill="none" stroke="${a}" stroke-width="1"/><circle cx="21" cy="5" r="1.2" fill="${a}"/>`],
  kantha: (a) => [24, 24, `<path d="M0 4h24M0 12h24M0 20h24" stroke="${a}" stroke-width="1" stroke-dasharray="2 2"/><circle cx="12" cy="8" r="1.7" fill="none" stroke="${a}"/><circle cx="0" cy="16" r="1.7" fill="none" stroke="${a}"/><circle cx="24" cy="16" r="1.7" fill="none" stroke="${a}"/>`],
  kolam: (a) => [24, 24, `<g fill="${a}"><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/><circle cx="12" cy="12" r="1"/></g><path d="M12 3.5c4.7 0 8.5 3.8 8.5 8.5s-3.8 8.5-8.5 8.5-8.5-3.8-8.5-8.5 3.8-8.5 8.5-8.5zM12 3.5c-2 3-2 5.5 0 8.5s2 5.5 0 8.5" fill="none" stroke="${a}" stroke-width="1"/>`],
  bandhani: (a) => [20, 20, `<g fill="none" stroke="${a}" stroke-width="1"><circle cx="5" cy="5" r="1.7"/><circle cx="15" cy="15" r="1.7"/></g><g fill="${a}"><circle cx="15" cy="5" r=".9"/><circle cx="5" cy="15" r=".9"/><circle cx="5" cy="5" r=".5"/><circle cx="15" cy="15" r=".5"/></g>`],
  khachkar: (a) => [24, 24, `<path d="M12 4v15M6 10h12" stroke="${a}" stroke-width="1.3"/><g fill="none" stroke="${a}" stroke-width="1"><circle cx="12" cy="3.4" r="1.6"/><circle cx="5.4" cy="10" r="1.6"/><circle cx="18.6" cy="10" r="1.6"/></g><path d="M0 22.5c4-3 8-3 12 0s8 3 12 0" fill="none" stroke="${a}" stroke-width=".9"/>`],
  borjgali: (a) => [28, 28, `<g fill="none" stroke="${a}" stroke-width="1.2" stroke-linecap="round"><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(0.0 14 14)"/><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(51.4 14 14)"/><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(102.9 14 14)"/><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(154.3 14 14)"/><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(205.7 14 14)"/><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(257.1 14 14)"/><path d="M14 14c0-2.4 1.3-4.2 3.6-5.2" transform="rotate(308.6 14 14)"/></g><circle cx="14" cy="14" r="1.3" fill="${a}"/>`],
  cosmati: (a, b) => [24, 24, `<rect x="2" y="2" width="20" height="20" fill="none" stroke="${a}" stroke-width="1"/><circle cx="12" cy="12" r="5" fill="none" stroke="${a}" stroke-width="1"/><path d="M2 2l5 5M22 2l-5 5M2 22l5-5M22 22l-5-5" stroke="${a}" stroke-width="1"/><rect x="10" y="10" width="4" height="4" transform="rotate(45 12 12)" fill="${b}"/>`],
  chevron: (a) => [20, 12, `<path d="M0 10l5-6 5 6 5-6 5 6" fill="none" stroke="${a}" stroke-width="1.5"/><path d="M0 4.5l5-3.5 5 3.5 5-3.5 5 3.5" fill="none" stroke="${a}" stroke-width=".7"/>`],
  carved: (a) => [24, 24, `<circle cx="12" cy="12" r="5" fill="none" stroke="${a}" stroke-width="1.1"/><path d="M12 7v10M7 12h10M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="${a}" stroke-width=".8"/><path d="M0 1h24M0 23h24" stroke="${a}" stroke-width="1" stroke-dasharray="3 2"/>`],
  adire: (a) => [24, 24, `<circle cx="6" cy="6" r="4" fill="none" stroke="${a}" stroke-width="1"/><circle cx="6" cy="6" r="1.6" fill="${a}"/><path d="M14 15h8M14 18h8M14 21h8" stroke="${a}" stroke-width="1"/><path d="M14 3l4 4 4-4M2 15l4 4 4-4" fill="none" stroke="${a}" stroke-width="1"/>`],
  spiral: (a) => [24, 24, `<path d="M12 12a1 1 0 1 1 2 0 3 3 0 1 1-6 0 5 5 0 1 1 10 0 7 7 0 1 1-14 0" fill="none" stroke="${a}" stroke-width="1.1"/>`],
};
const CIV_MOTIF = {
  chinese: 'cloud', japanese: 'seigaiha', koreans: 'lattice', jurchens: 'felt', dali: 'zharan', tibetans: 'endless', tanguts: 'script',
  daiviet: 'drum', khmer: 'naga', malay: 'kawung', pagan: 'kanote',
  bengalis: 'kantha', hindustanis: 'jali', chola: 'kolam', gurjaras: 'bandhani',
  mongols: 'felt', huns: 'cloisonne', khitans: 'cloud', tatars: 'arabesque', cumans: 'felt',
  arabs: 'girih', turks: 'iznik', persians: 'arabesque', armenians: 'khachkar', georgians: 'borjgali',
  bohemians: 'tracery', poles: 'wycinanki', lithuanians: 'sash', bulgarians: 'stitch', slavs: 'stitch', magyars: 'tulip',
  byzantines: 'mosaic', italians: 'cosmati', spanish: 'mudejar', portuguese: 'azulejo',
  teutons: 'tracery', goths: 'cloisonne', vikings: 'interlace', saxons: 'knot', normans: 'chevron',
  britons: 'diaper', celts: 'knot', franks: 'fleur', burgundians: 'tracery',
  berbers: 'zellige', malians: 'bogolan', ethiopians: 'tibeb', swahili: 'carved', nubians: 'tibeb', yoruba: 'adire',
  aztecs: 'fret', maya: 'fret', inca: 'tocapu', mississippians: 'spiral',
};
const MOTIF_NAMES = { cloud: 'cloud scrolls', seigaiha: 'seigaiha waves', lattice: 'window lattice', drum: 'Đông Sơn drum', naga: 'naga scales', kawung: 'kawung batik',
  jali: 'jali screen', girih: 'girih stars', arabesque: 'arabesque vines', iznik: 'Iznik tulips', zellige: 'zellige stars', bogolan: 'bògòlan mudcloth', tibeb: 'tibeb weave',
  felt: 'felt horn scrolls', cloisonne: 'garnet cloisonné', knot: 'knotwork', interlace: 'ribbon interlace', fleur: 'fleur-de-lis', tracery: 'Gothic tracery', azulejo: 'azulejo tiles',
  mudejar: 'Mudéjar lattice', diaper: 'heraldic diaper', mosaic: 'gold mosaic', stitch: 'cross-stitch', tulip: 'folk tulips', sash: 'woven sash', wycinanki: 'paper-cut flowers',
  fret: 'step-fret', tocapu: 'tocapu squares', brass: 'brass studs',
  zharan: 'Bai tie-dye', endless: 'endless knots', script: 'Tangut script', kanote: 'kanote scrolls', kantha: 'kantha stitching', kolam: 'kolam loops',
  bandhani: 'bandhani dots', khachkar: 'khachkar lace', borjgali: 'borjgali suns', cosmati: 'Cosmati inlay', chevron: 'Romanesque chevrons', carved: 'carved doors',
  adire: 'adire indigo', spiral: 'shell gorget spirals' };
/* colour helpers */
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(h1, h2, t) { const a = hexRgb(h1), b = hexRgb(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function tileURL(name, a, b) {
  const [w, h, inner] = MOTIF_TILES[name](a, b);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${inner.replace(/"/g, "'")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
function installCivStyles() {
  let css = '';
  const add = (cls, color, motif) => {
    const light = mix(color, '#ffffff', 0.42), deep = mix(color, '#000000', 0.38);
    css += `.${cls}{--civ:${color};--civ-deep:${deep};--civ-light:${light};--civ-wash:${rgba(color, 0.12)};--motif:${tileURL(motif, rgba('#ffffff', 0.38), rgba('#ffffff', 0.08))};--motif-soft:${tileURL(motif, rgba(color, 0.2), 'none')};--motif-gold:${tileURL(motif, rgba('#f2cf73', 0.55), rgba('#f2cf73', 0.1))}}\n`;
  };
  for (const c of CIV_ORDER) add('civ-' + c, CIVS[c].color, CIV_MOTIF[c] || 'diaper');
  add('civ-merc', '#7a6542', 'brass');
  add('civ-neutral', '#6b5843', 'diaper');
  const el = document.createElement('style'); el.id = 'civ-styles'; el.textContent = css; document.head.appendChild(el);
}
