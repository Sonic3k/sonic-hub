/* ── Craft layer: materials, design families, defences and seals ──
   Every civilization belongs to a design family from its own visual culture; the family decides the card
   silhouette, frame, corner ornaments and name plate. The civ then adds its own pattern, colours and crest. */
const CIV_FAMILY = {
  britons: 'gothic', franks: 'gothic', teutons: 'gothic', spanish: 'gothic', portuguese: 'gothic', italians: 'gothic', normans: 'gothic', burgundians: 'gothic',
  celts: 'knot', vikings: 'knot', goths: 'knot', saxons: 'knot',
  byzantines: 'icon', slavs: 'icon', bulgarians: 'icon', ethiopians: 'icon', armenians: 'icon', georgians: 'icon', nubians: 'icon',
  bohemians: 'folk', poles: 'folk', lithuanians: 'folk', magyars: 'folk',
  arabs: 'islamic', persians: 'islamic', turks: 'islamic', berbers: 'islamic', hindustanis: 'islamic', swahili: 'islamic',
  mongols: 'steppe', huns: 'steppe', khitans: 'steppe', jurchens: 'steppe', tatars: 'steppe', cumans: 'steppe',
  chinese: 'sino', japanese: 'sino', koreans: 'sino', daiviet: 'sino', dali: 'sino', tanguts: 'sino',
  khmer: 'temple', malay: 'temple', pagan: 'temple', bengalis: 'temple', chola: 'temple', gurjaras: 'temple', tibetans: 'temple',
  malians: 'sahel', yoruba: 'sahel', aztecs: 'codex', maya: 'codex', mississippians: 'codex', inca: 'andes',
};
const FAMILY_NAMES = { gothic: 'a Gothic manuscript', knot: 'insular knotwork', icon: 'a Byzantine icon', folk: 'Central European folk embroidery', islamic: 'Islamic tilework',
  steppe: 'steppe felt and leather', sino: 'an East Asian tiled roof', temple: 'temple stonework', sahel: 'Sahelian mud architecture', codex: 'a Mesoamerican codex', andes: 'Andean stonework', merc: 'a mercenary\'s brass' };
/* corner ornaments, one per family (gold leaf on the frame) */
const CORNERS = {
  gothic: '<path d="M2 22C2 10 10 2 22 2" fill="none" stroke="#d8b45c" stroke-width="2"/><path d="M6 15c3-1 4-4 3-7M9 9c3 0 5 2 6 5" fill="none" stroke="#b9361f" stroke-width="1.4"/><circle cx="15" cy="15" r="2" fill="#d8b45c"/>',
  knot: '<path d="M3 13c0-6 4-10 10-10M3 13c6 0 10 4 10 10M13 3c0 6 4 10 10 10" fill="none" stroke="#d8b45c" stroke-width="1.8"/><rect x="9" y="9" width="8" height="8" fill="none" stroke="#d8b45c" stroke-width="1.4" transform="rotate(45 13 13)"/>',
  icon: '<circle cx="9" cy="9" r="5" fill="#b9361f" stroke="#e8c96e" stroke-width="1.6"/><circle cx="18" cy="5" r="1.6" fill="#f3e6c4"/><circle cx="5" cy="18" r="1.6" fill="#f3e6c4"/>',
  folk: '<path d="M8 4h4v4h4v4h-4v4H8v-4H4V8h4z" fill="#b9361f"/><path d="M18 2h3v3h-3zM2 18h3v3H2z" fill="#2b2118"/>',
  islamic: '<path d="M11 1l2.6 6.4L20 10l-6.4 2.6L11 19l-2.6-6.4L2 10l6.4-2.6z" fill="#e8c96e" stroke="#7a5a12" stroke-width=".8"/><circle cx="11" cy="10" r="2" fill="#2a6f86"/>',
  steppe: '<path d="M4 20c0-8 4-14 11-14 4 0 6 3 5 6s-5 3-6 0" fill="none" stroke="#e2c070" stroke-width="2" stroke-linecap="round"/>',
  sino: '<path d="M3 19c0-4 3-6.5 6.5-5.4C9.8 9.6 14.6 8 17.6 11c2-1.6 5-.4 5 2.4" fill="none" stroke="#e2c070" stroke-width="1.8" stroke-linecap="round"/><path d="M9.5 13.6c.9 1.9 3 2.2 4.2.4M3 22.5h12" fill="none" stroke="#e2c070" stroke-width="1.3" stroke-linecap="round"/>',
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
  if (st.wonder) return 'wonder';
  const n = st.card.name;
  if (/castle|marienburg|himeji|theodosian|fortress/i.test(n)) return 'castle';
  if (/palisade/i.test(n)) return 'palisade';
  if (/tower/i.test(n)) return 'tower';
  if (/caravanserai/i.test(n)) return 'stall';
  if (/bayon|temple/i.test(n)) return 'church';
  return 'wall';
}
function buildHTML(st) {
  const tip = st.wonder ? `${st.card.name}: a wonder with ${st.dur} durability, standing behind every other structure. Its builder wins if it still stands after ${st.cd} more of their turns.`
    : `${st.card.name}: ${st.dur} durability. Each hit that reaches it takes 1 durability and stops there.`;
  return `<span class="bld ${st.wonder ? 'wonder' : ''}" data-tip="${esc(tip)}"><svg viewBox="0 0 24 24" aria-hidden="true">${BUILD[buildOf(st)]}</svg><b>${st.dur}</b>${st.wonder ? `<em>${st.cd}</em>` : ''}</span>`;
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
  /* East Asian tiled roof: ridge with end knobs, hips sweeping down, eave corners turned up, tile channels, gilded eave board */
  const D = 'M0 44V17C0 15 .6 14 1.4 13.6C6 19 13 21.6 22 21C31 20.2 38.5 14 43.6 7.4L43 2.4C44.4 .6 46.6 .8 47.6 2.8L48 5H152L152.4 2.8C153.4 .8 155.6 .6 157 2.4L156.4 7.4C161.5 14 169 20.2 178 21C187 21.6 194 19 198.6 13.6C199.4 14 200 15 200 17V44Z';
  const roof = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 44' preserveAspectRatio='none'><defs><clipPath id='r'><path d='${D}'/></clipPath>`
    + `<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7a736c'/><stop offset='.55' stop-color='#4b4540'/><stop offset='1' stop-color='#2a2521'/></linearGradient>`
    + `<pattern id='t' width='5.5' height='44' patternUnits='userSpaceOnUse'><rect width='1.6' height='44' fill='#fff' fill-opacity='.14'/><rect x='1.6' width='.9' height='44' fill='#000' fill-opacity='.45'/></pattern></defs>`
    + `<g clip-path='url(#r)'><rect width='200' height='44' fill='url(#g)'/><rect y='7' width='200' height='30' fill='url(#t)'/><rect y='37' width='200' height='7' fill='#1c130c'/><path d='M0 36.7H200' stroke='#d6b45f' stroke-width='1.1'/>`
    + `<rect x='44' y='2.6' width='112' height='5.4' fill='#2a221d'/><path d='M45 3.1H155' stroke='#d6b45f' stroke-width='.8'/></g>`
    + `<path d='M3 15.6C8 20.4 14 22.4 22 22C31 21.3 38.4 15.6 44.6 8.2M197 15.6C192 20.4 186 22.4 178 22C169 21.3 161.6 15.6 155.4 8.2' fill='none' stroke='#a39789' stroke-width='1.6'/>`
    + `<path d='M1.6 14C3 15.6 4.6 17 6.4 18M198.4 14C197 15.6 195.4 17 193.6 18M43.4 2.6C44.6 1 46.4 1 47.4 2.8M156.6 2.6C155.4 1 153.6 1 152.6 2.8' fill='none' stroke='#d6b45f' stroke-width='1.5' stroke-linecap='round'/></svg>`;
  R.setProperty('--roof-art', u(roof)); R.setProperty('--roof-mask', u(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 44' preserveAspectRatio='none'><path d='${D}'/></svg>`));
  let css = '';
  for (const [f, svg] of Object.entries(CORNERS)) css += `.fam-${f}{--corner:${u(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${svg.replace(/"/g, "'")}</svg>`)}}\n`;
  const el = document.createElement('style'); el.id = 'family-styles'; el.textContent = css; document.head.appendChild(el);
}

/* HP said plainly: a label, the number, the maximum, and a bar under the banner */
function hpTag(P, hp, mini) {
  const low = hp <= 3 && P.alive ? ' low' : '';
  return `<span class="hptag${low}${mini ? ' mini' : ''}" data-tip="${hp} of ${P.maxHP} HP. At 0 this realm falls."><small>HP</small><b>${hp}</b><i>/${P.maxHP}</i></span>`;
}
function hpBar(P, hp) { return `<div class="hpbar"><i style="width:${Math.max(0, Math.round(hp / P.maxHP * 100))}%"></i></div>`; }
/* event emblems for the round herald, drawn in iron-gall ink with a little vermilion */
const EVENT_ART = {
  plague: '<path d="M14 26c0-7 4.5-12 10-12s10 5 10 12c0 4-2 7-5 8l-1 6h-8l-1-6c-3-1-5-4-5-8z" fill="#5a4636"/><path d="M24 30l14 8-14-1z" fill="#3a2618"/><circle cx="19.5" cy="25" r="3" fill="#e9d9b4" stroke="#3a2618"/><circle cx="28.5" cy="25" r="3" fill="#e9d9b4" stroke="#3a2618"/><path d="M15 16c3-6 15-6 18 0" fill="none" stroke="#3a2618" stroke-width="2"/>',
  harvest: '<path d="M24 42V12M24 42l-8-26M24 42l8-26" stroke="#7a5a12" stroke-width="2"/><g fill="#c9962f" stroke="#7a5a12" stroke-width=".8">' + [12, 17, 22].map(y => `<ellipse cx="24" cy="${y}" rx="2.2" ry="3.4"/><ellipse cx="${16 + (y - 12) * 0.25}" cy="${y + 4}" rx="2" ry="3.2" transform="rotate(-18 ${16 + (y - 12) * 0.25} ${y + 4})"/><ellipse cx="${32 - (y - 12) * 0.25}" cy="${y + 4}" rx="2" ry="3.2" transform="rotate(18 ${32 - (y - 12) * 0.25} ${y + 4})"/>`).join('') + '</g><path d="M17 33h14" stroke="#a4301d" stroke-width="3"/>',
  silkroad: '<path d="M8 38l2-11c0-4 3-6 6-6l3-5 3 5h2l3-6 4 1 3 4 3 2-3 2-2-1-3 4v11h-3v-8l-4 1-3 7h-3l1-8-6-3-1 11z" fill="#9c7040" stroke="#3a2618" stroke-width="1.1"/><path d="M4 42h40" stroke="#a4301d" stroke-width="1.6" stroke-dasharray="3 3"/>',
  winter: '<g stroke="#2a4b77" stroke-width="2.2" stroke-linecap="round">' + [0, 60, 120].map(a => `<path d="M24 6v36M24 12l-4-4M24 12l4-4M24 36l-4 4M24 36l4 4" transform="rotate(${a} 24 24)"/>`).join('') + '</g>',
  fair: '<path d="M8 22l16-14 16 14z" fill="#a4301d" stroke="#3a2618" stroke-width="1.2"/><path d="M14 17l4 5M24 8v14M34 17l-4 5" stroke="#efe0bf" stroke-width="2"/><path d="M10 22h28v18H10z" fill="#e2cfa4" stroke="#3a2618" stroke-width="1.2"/><path d="M20 40V30h8v10" fill="#5a4636"/>',
  feast: '<path d="M14 10h12l-1 10a5 5 0 0 1-10 0z" fill="#c9962f" stroke="#3a2618" stroke-width="1.2"/><path d="M20 25v9M15 36h10" stroke="#3a2618" stroke-width="2"/><ellipse cx="33" cy="33" rx="9" ry="5" fill="#b07a3c" stroke="#3a2618" stroke-width="1.2"/><path d="M28 32c2-1 4-1 6 0M30 35c2-1 4-1 6 0" stroke="#3a2618" stroke-width=".9" fill="none"/>',
  revolt: '<path d="M14 42V14M8 14v-6M14 14V6M20 14v-6M8 14h12" stroke="#3a2618" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M32 42V20" stroke="#5a4636" stroke-width="3"/><path d="M32 6c5 4 6 8 3 12h-6c-3-4-1-8 3-12z" fill="#d9541a"/><path d="M32 10c2 2 3 4 1 6h-2c-1-2-1-4 1-6z" fill="#f4c04a"/>',
  crusade: '<path d="M10 8h28v14c0 11-7 17-14 20-7-3-14-9-14-20z" fill="#efe0bf" stroke="#3a2618" stroke-width="1.6"/><path d="M24 12v26M14 22h20" stroke="#a4301d" stroke-width="4"/>',
  monsoon: '<path d="M10 24a8 8 0 0 1 8-8 10 10 0 0 1 19 2 6 6 0 0 1 1 12H14a6 6 0 0 1-4-6z" fill="#7d8796" stroke="#3a2618" stroke-width="1.2"/><path d="M15 34l-2 6M23 34l-2 6M31 34l-2 6M19 36l-1 3M27 36l-1 3" stroke="#2a4b77" stroke-width="2" stroke-linecap="round"/>',
  flood: '<path d="M4 20c4-4 8-4 12 0s8 4 12 0 8-4 12 0 6 3 6 3M4 29c4-4 8-4 12 0s8 4 12 0 8-4 12 0 6 3 6 3M4 38c4-4 8-4 12 0s8 4 12 0 8-4 12 0 6 3 6 3" fill="none" stroke="#2a4b77" stroke-width="2.6" stroke-linecap="round"/><path d="M18 14l6-8 6 8z" fill="#a4301d"/>',
  eclipse: '<circle cx="24" cy="24" r="16" fill="#e9b949" stroke="#7a5a12" stroke-width="1.4"/>' + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(24 + Math.cos(a) * 18).toFixed(1)} ${(24 + Math.sin(a) * 18).toFixed(1)}L${(24 + Math.cos(a) * 22).toFixed(1)} ${(24 + Math.sin(a) * 22).toFixed(1)}" stroke="#7a5a12" stroke-width="1.6"/>`; }).join('') + '<circle cx="28" cy="22" r="14" fill="#2b2118"/>',
  bells: '<path d="M24 6v4M14 34c2-4 2-8 2-12a8 8 0 0 1 16 0c0 4 0 8 2 12z" fill="#c9962f" stroke="#3a2618" stroke-width="1.4"/><path d="M11 34h26" stroke="#3a2618" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="38" r="3" fill="#5a4636"/><path d="M6 18c-2 3-2 7 0 10M42 18c2 3 2 7 0 10" fill="none" stroke="#a4301d" stroke-width="1.6" stroke-linecap="round"/>',
  peace: '<path d="M24 40c-9-5-14-11-14-18a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 7-5 13-14 18z" fill="none" stroke="#a4301d" stroke-width="2"/><path d="M10 44h28" stroke="#3a2618" stroke-width="1.4"/>',
};

/* status markers, all round so they never read as buildings: the Imperial crown beside HP; a camp's guards, Traps and Storm stand
   with its buildings in the Defenses row, drawn with the same mark as the symbol that set them up */
const MEDAL_ART = {
  bodyguard: [SYM_PIG.Q, SYM_STYLE.Q[1]], camel: [SYM_PIG.L, SYM_STYLE.L[1]], mantlet: [SYM_PIG.I, SYM_STYLE.I[1]],
  trap: [SYM_PIG.T, SYM_STYLE.T[1]], storm: [SYM_PIG.V, SYM_STYLE.V[1]],
};
const MEDAL_TIP = {
  crown: 'Imperial Age: this realm has reached it, and its Imperial cards are in its deck.',
  bodyguard: 'Bodyguard: blocks the next Strike or Eagle hit on this camp, then it is gone.',
  camel: 'Camel guard: blocks the next Cavalry hit on this camp, then it is gone.',
  mantlet: 'Mantlet: blocks the next direct damage hit on this camp, then it is gone.',
  trap: 'Trap: the next hit on this camp deals 1 direct damage back to its attacker. Lasts until this camp\'s next turn.',
  storm: 'Storm: every attack on this camp is cancelled until its next turn.',
};
function medalSVG(kind) {
  if (kind === 'crown') return crownSVG(24);
  const [bg, glyph] = MEDAL_ART[kind];
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.4" fill="${bg}" stroke="#24180c" stroke-opacity=".8" stroke-width=".9"/><circle cx="12" cy="12" r="10.15" fill="none" stroke="#d2ad57" stroke-width="1.15"/>${glyph.replace(/#fff/g, '#f6ebcf')}</svg>`;
}
function medal(kind, n, cls) { return `<span class="medal m-${kind}${cls ? ' ' + cls : ''}" data-tip="${esc(MEDAL_TIP[kind])}" aria-label="${esc(MEDAL_TIP[kind])}">${medalSVG(kind)}${n > 1 ? `<b>${n}</b>` : ''}</span>`; }
function medalsOf(P) { return P.aged ? medal('crown') : ''; }
function tokensOf(P) { return [['bodyguard', P.guards.bodyguard], ['camel', P.guards.camel], ['mantlet', P.guards.mantlet], ['trap', P.traps.trap], ['storm', P.traps.storm ? 1 : 0]].filter(t => t[1] > 0); }
function guardsOf(P) { return tokensOf(P).map(([k, n]) => medal(k, n, 'guard')).join(''); }
