/* ── Craft layer: materials, design families, defences and seals ──
   Every civilization belongs to a design family from its own visual culture; the family decides the card
   silhouette, frame, corner ornaments and name plate. The civ then adds its own pattern, colours and crest. */
const CIV_FAMILY = {
  britons: 'gothic', franks: 'gothic', teutons: 'gothic', spanish: 'gothic', portuguese: 'gothic',
  celts: 'knot', vikings: 'knot', goths: 'knot',
  byzantines: 'icon', slavs: 'icon', bulgarians: 'icon', ethiopians: 'icon',
  bohemians: 'folk', poles: 'folk', lithuanians: 'folk', magyars: 'folk',
  arabs: 'islamic', persians: 'islamic', turks: 'islamic', berbers: 'islamic',
  mongols: 'steppe', huns: 'steppe', khitans: 'steppe', jurchens: 'steppe',
  chinese: 'scroll', japanese: 'scroll', koreans: 'scroll',
  indians: 'temple', khmer: 'temple', daiviet: 'temple', malay: 'temple',
  malians: 'sahel', aztecs: 'codex', mayans: 'codex', incas: 'andes',
};
const FAMILY_NAMES = { gothic: 'a Gothic manuscript', knot: 'insular knotwork', icon: 'a Byzantine icon', folk: 'Central European folk embroidery', islamic: 'Islamic tilework',
  steppe: 'steppe felt and leather', scroll: 'an East Asian scroll mount', temple: 'temple stonework', sahel: 'Sahelian mud architecture', codex: 'a Mesoamerican codex', andes: 'Andean stonework', merc: 'a mercenary\'s brass' };
/* corner ornaments, one per family (gold leaf on the frame) */
const CORNERS = {
  gothic: '<path d="M2 22C2 10 10 2 22 2" fill="none" stroke="#d8b45c" stroke-width="2"/><path d="M6 15c3-1 4-4 3-7M9 9c3 0 5 2 6 5" fill="none" stroke="#b9361f" stroke-width="1.4"/><circle cx="15" cy="15" r="2" fill="#d8b45c"/>',
  knot: '<path d="M3 13c0-6 4-10 10-10M3 13c6 0 10 4 10 10M13 3c0 6 4 10 10 10" fill="none" stroke="#d8b45c" stroke-width="1.8"/><rect x="9" y="9" width="8" height="8" fill="none" stroke="#d8b45c" stroke-width="1.4" transform="rotate(45 13 13)"/>',
  icon: '<circle cx="9" cy="9" r="5" fill="#b9361f" stroke="#e8c96e" stroke-width="1.6"/><circle cx="18" cy="5" r="1.6" fill="#f3e6c4"/><circle cx="5" cy="18" r="1.6" fill="#f3e6c4"/>',
  folk: '<path d="M8 4h4v4h4v4h-4v4H8v-4H4V8h4z" fill="#b9361f"/><path d="M18 2h3v3h-3zM2 18h3v3H2z" fill="#2b2118"/>',
  islamic: '<path d="M11 1l2.6 6.4L20 10l-6.4 2.6L11 19l-2.6-6.4L2 10l6.4-2.6z" fill="#e8c96e" stroke="#7a5a12" stroke-width=".8"/><circle cx="11" cy="10" r="2" fill="#2a6f86"/>',
  steppe: '<path d="M4 20c0-8 4-14 11-14 4 0 6 3 5 6s-5 3-6 0" fill="none" stroke="#e2c070" stroke-width="2" stroke-linecap="round"/>',
  scroll: '<path d="M3 13c0-5 3-8 7-8 3 0 5 2 5 5 0 2-2 3-3 2s0-3 1-2" fill="none" stroke="#e2c070" stroke-width="1.8" stroke-linecap="round"/><path d="M3 20h17" stroke="#e2c070" stroke-width="1.2"/>',
  temple: '<path d="M12 3c-3 3-3 7 0 10 3-3 3-7 0-10zM12 13c-3-2-8-1-9 2 3 0 6 0 9 1M12 13c3-2 8-1 9 2-3 0-6 0-9 1" fill="#e2c070"/>',
  sahel: '<path d="M3 21V9l3-6 3 6v12M11 21V5l3-3 3 3v16" fill="#c8915a" stroke="#5a3418" stroke-width="1.1"/><path d="M4 12h3M12 9h3M12 14h3" stroke="#5a3418" stroke-width="1.2"/>',
  codex: '<path d="M2 20h7v-7h7V6h6" fill="none" stroke="#e8c96e" stroke-width="2.2"/><circle cx="19" cy="17" r="2.6" fill="#1f6d6a" stroke="#e8c96e"/>',
  andes: '<rect x="3" y="3" width="8" height="8" fill="#e8c96e"/><rect x="13" y="13" width="8" height="8" fill="#b9361f"/><path d="M13 3h8v8h-8z" fill="none" stroke="#e8c96e" stroke-width="1.3"/>',
  merc: '<circle cx="11" cy="11" r="7" fill="#c9a24a" stroke="#5a4210" stroke-width="1.2"/><path d="M11 7v8M8.5 9h4M8.5 13h5" stroke="#5a4210" stroke-width="1.3"/>',
};
/* defences drawn as little buildings, chosen by what the card is */
const BUILD = {
  wall: '<path d="M2 21V10h3V7h3v3h2.5V7h3v3H16V7h3v3h3v11z" fill="#b9ad96" stroke="#2f2416" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 15h20M7 15v6M12 15v6M17 15v6" stroke="#2f2416" stroke-width=".9"/>',
  palisade: '<path d="M3.5 21V9L5 5.5 6.5 9v12M9 21V8l1.5-3.5L12 8v13M14.5 21V9L16 5.5 17.5 9v12M20 21V10l1-2.5 1 2.5v11" fill="#a97e4c" stroke="#2f2416" stroke-width="1"/><path d="M2 13h21M2 18h21" stroke="#2f2416" stroke-width="1.1"/>',
  tower: '<path d="M7.5 21V9.5H6V5h2.2v1.8h2.1V5h3.4v1.8h2.1V5H18v4.5h-1.5V21z" fill="#b9ad96" stroke="#2f2416" stroke-width="1.15" stroke-linejoin="round"/><path d="M10.6 21v-3.8a1.4 1.4 0 0 1 2.8 0V21M11 11.5h2" stroke="#2f2416" stroke-width="1"/>',
  castle: '<path d="M1.5 21V11h2V9h2v2h2V6h2V4h2v2h2v5h2V9h2v2h2v10z" fill="#b9ad96" stroke="#2f2416" stroke-width="1.15" stroke-linejoin="round"/><path d="M10.4 21v-4a1.6 1.6 0 0 1 3.2 0v4M10.5 8.5h3" stroke="#2f2416" stroke-width="1"/>',
  spikes: '<path d="M3.5 21V9L5 5.5 6.5 9v12M9 21V8l1.5-3.5L12 8v13M14.5 21V9L16 5.5 17.5 9v12M20 21V10l1-2.5 1 2.5v11" fill="#8f6a3e" stroke="#2f2416" stroke-width="1"/><path d="M5 5.5L5 3M10.5 4.5V2M16 5.5V3M21 7.5V5.5" stroke="#b02a19" stroke-width="1.6" stroke-linecap="round"/><path d="M2 14h21" stroke="#2f2416" stroke-width="1.1"/>',
  church: '<path d="M4.5 21V12l7.5-5.5 7.5 5.5v9z" fill="#e5d6b0" stroke="#2f2416" stroke-width="1.15" stroke-linejoin="round"/><path d="M12 6.5V2M10.2 3.6h3.6M10.2 21v-4.2a1.8 1.8 0 0 1 3.6 0V21" stroke="#2f2416" stroke-width="1.1"/>',
  regen: '<path d="M2 21V10h3V7h3v3h2.5V7h3v3H16V7h3v3h3v11z" fill="#a9b996" stroke="#2f2416" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 16.5a4 4 0 1 0 2-3.4" fill="none" stroke="#2c6b2a" stroke-width="1.6"/><path d="M9.6 11.3l.6 2.2-2.2.4" fill="none" stroke="#2c6b2a" stroke-width="1.4"/>',
  stall: '<path d="M3 10l2-5h14l2 5z" fill="#b9361f" stroke="#2f2416" stroke-width="1.1"/><path d="M3 10c1.5 1.5 3 1.5 4.5 0 1.5 1.5 3 1.5 4.5 0 1.5 1.5 3 1.5 4.5 0 1.5 1.5 3 1.5 4.5 0" fill="#f1e2bd" stroke="#2f2416" stroke-width="1"/><path d="M4.5 12v9h15v-9" fill="#d8c59a" stroke="#2f2416" stroke-width="1.1"/><circle cx="12" cy="16.5" r="2.4" fill="#d8b45c" stroke="#6b4c0e"/>',
  wonder: '<path d="M2 21h20l-2-3H4zM5 18l1.5-3h11l1.5 3M7 15l1.5-3h7l1.5 3M9 12l1.5-3h3l1.5 3M12 9V4" fill="#e9c763" stroke="#4a3208" stroke-width="1.1" stroke-linejoin="round"/><path d="M10 5.2l2-1.6 2 1.6" fill="none" stroke="#4a3208" stroke-width="1.1"/>',
};
function buildOf(st) {
  if (st.kind === 'wonder') return 'wonder';
  if (st.kind === 'thorns') return 'spikes';
  if (st.kind === 'sacred') return 'church';
  if (st.kind === 'income') return 'stall';
  if (st.kind === 'regen') return 'regen';
  const n = st.card.name;
  if (st.kind === 'fortress' || /castle|keep|fortress|fort|citadel|kasbah|detinets|krepost|potala|great wall|marienburg|theodosian/i.test(n)) return 'castle';
  if (/palisade|wagon|wagenburg/i.test(n)) return 'palisade';
  if (/tower/i.test(n)) return 'tower';
  return 'wall';
}
const BUILD_NOTE = { regen: 'regains 1 durability each turn', sacred: 'heals its owner 1 HP each turn', thorns: 'whoever hits it takes 1 damage', fortress: 'raze removes only 1 durability', income: 'gives its owner 1 gold each turn' };
function buildHTML(st) {
  const turns = Math.max(0, 3 - (st.age || 0));
  const tip = st.kind === 'wonder' ? `${st.card.name}: ${st.dur} durability. Its builder wins if it still stands in ${turns} turn(s).` : `${st.card.name}: absorbs ${st.dur} more damage${BUILD_NOTE[st.kind] ? '; ' + BUILD_NOTE[st.kind] : ''}.`;
  return `<span class="bld ${st.kind === 'wonder' ? 'wonder' : ''}" data-tip="${esc(tip)}"><svg viewBox="0 0 24 24" aria-hidden="true">${BUILD[buildOf(st)]}</svg><b>${st.dur}</b>${st.kind === 'wonder' ? `<em>${turns}</em>` : ''}</span>`;
}
/* a wax seal for HP */
const SEAL_PATH = (() => { const n = 16, pts = []; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, r = i % 2 ? 21.2 : 23; pts.push(`${(24 + Math.cos(a) * r).toFixed(1)},${(24 + Math.sin(a) * r).toFixed(1)}`); } return 'M' + pts.join('L') + 'Z'; })();
function sealHP(P, hp) {
  const low = hp <= 3 && P.alive;
  return `<span class="hpseal${low ? ' low' : ''}" data-tip="${hp} of ${P.maxHP} HP"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="${SEAL_PATH}" fill="#9f2a1c" stroke="#55120a" stroke-width="1.2"/><circle cx="24" cy="24" r="16" fill="none" stroke="#5e130b" stroke-width="1.5" opacity=".75"/><path d="M13.5 17a13 13 0 0 1 14.5-6.3" stroke="#ffe7c9" stroke-opacity=".3" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg><b>${hp}</b><small>of ${P.maxHP}</small></span>`;
}
/* materials: vellum fibres, oak grain, leather — generated once as SVG noise */
function installMaterials() {
  const u = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  const vellum = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .3 0 0 0 0 .16 0 0 0 .7 -.12'/></filter><rect width='260' height='260' filter='url(#f)' opacity='.5'/><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55 0 0 0 0 .38 0 0 0 0 .18 0 0 0 .9 -.35'/></filter><rect width='260' height='260' filter='url(#g)' opacity='.45'/></svg>`;
  const oak = `<svg xmlns='http://www.w3.org/2000/svg' width='2400' height='400'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='.0025 .16' numOctaves='4' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .2 0 0 0 0 .12 0 0 0 0 .06 0 0 0 1.1 -.25'/></filter><rect width='2400' height='400' filter='url(#w)'/></svg>`;
  const leather = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .1 0 0 0 0 .06 0 0 0 0 .03 0 0 0 .8 -.2'/></filter><rect width='200' height='200' filter='url(#l)'/></svg>`;
  const R = document.documentElement.style;
  R.setProperty('--vellum-tex', u(vellum)); R.setProperty('--oak-tex', u(oak)); R.setProperty('--leather-tex', u(leather));
  let css = '';
  for (const [f, svg] of Object.entries(CORNERS)) css += `.fam-${f}{--corner:${u(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${svg.replace(/"/g, "'")}</svg>`)}}\n`;
  const el = document.createElement('style'); el.id = 'family-styles'; el.textContent = css; document.head.appendChild(el);
}
