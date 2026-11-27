/* ── Everything drawn: the pieces, the map sheet they stand on, the stand-in portraits, the cards, the harbour ──
   Pieces are lacquered counters with a brass rim, Red and Blue, each with its arm's badge in cream. A hero wears a
   gold wreath; riders show as small counters on the carrier's shoulder. All of it is SVG made here: no picture
   files. (The officers' own pictures come from outside when ART.base is set; see 60-campaign.js.) */
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name, attrs = {}, html = '') => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };
const f1 = v => Math.round(v * 10) / 10;
const SIDE_NAME = ['Red', 'Blue'];
const LACQUER = [{ hi: '#ff6b5e', mid: '#d7263d', lo: '#8f1226', rim: '#f1cf7a' }, { hi: '#5f9bff', mid: '#2458c5', lo: '#12306f', rim: '#f1cf7a' }];

/* the badges, each drawn inside a box about 40 wide round 0,0 */
const star = (R, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + f1(Math.cos(a) * q) + ' ' + f1(Math.sin(a) * q); } return d + 'Z'; };
const GLYPH = [];
GLYPH[COMMANDER] = `<path d="${star(18, 7.4)}"/>`;
GLYPH[INFANTRY] = '<path d="M-13 1A13 12.5 0 0 1 13 1L15.5 5.5H-15.5Z"/><path d="M-10 9.5L0 15L10 9.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
GLYPH[TANK] = '<rect x="-17" y="3" width="34" height="11" rx="5.5"/><path d="M-10 3V-3.5Q-10 -6 -7.500 -6H4Q6.500 -6 6.500 -3.500V3Z"/><rect x="5" y="-4.200" width="15" height="3.400" rx="1.2"/><g fill="#0003"><circle cx="-10" cy="8.500" r="2.200"/><circle cx="-3.300" cy="8.500" r="2.200"/><circle cx="3.300" cy="8.500" r="2.200"/><circle cx="10" cy="8.500" r="2.200"/></g>';
GLYPH[MILITIA] = '<path d="M-17 2L0 -12L17 2Q0 6.500 -17 2Z"/><path d="M-12 15L12 7" fill="none" stroke="currentColor" stroke-width="3.200" stroke-linecap="round"/><path d="M8 5.500L14 8.800" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/>';
GLYPH[ENGINEER] = '<rect x="-18" y="-7" width="36" height="5" rx="1.500"/><path d="M-15 -2V11M-5 -2V11M5 -2V11M15 -2V11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-15 9Q-10 0 -5 9M-5 9Q0 0 5 9M5 9Q10 0 15 9" fill="none" stroke="currentColor" stroke-width="2.400"/><path d="M-18 -7L-12 -13H12L18 -7" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linejoin="round"/>';
GLYPH[ARTILLERY] = '<g transform="rotate(-28)"><rect x="-13" y="-4" width="31" height="6.500" rx="2"/><rect x="-16" y="-5.500" width="8" height="9.500" rx="2"/></g><circle cx="-5" cy="9" r="7.500"/><circle cx="-5" cy="9" r="3" fill="#0003"/><path d="M-5 9L-18 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
GLYPH[ANTIAIR] = '<g transform="rotate(-58)"><rect x="-6" y="-6" width="25" height="3.600" rx="1.500"/><rect x="-6" y="2.400" width="25" height="3.600" rx="1.500"/><rect x="-9" y="-7.500" width="9" height="15" rx="2.500"/></g><path d="M-13 15L-8 6H8L13 15Z"/>';
GLYPH[MISSILE] = '<g transform="rotate(40)"><path d="M0 -19Q6 -12 6 -4V9H-6V-4Q-6 -12 0 -19Z"/><path d="M-6 3L-12 13H-6ZM6 3L12 13H6Z"/><path d="M-3 12H3L0 18Z" fill="#0004"/></g>';
GLYPH[AIR] = '<path d="M0 -18Q3 -13 3 -6L17 5V9L3 5.500V11L7 14.500V17L0 15L-7 17V14.500L-3 11V5.500L-17 9V5L-3 -6Q-3 -13 0 -18Z"/>';
GLYPH[NAVY] = '<path d="M-18 4H18L13 12H-14Z"/><path d="M-9 4V-2H-2V-7H4V-2H10V4Z"/><path d="M1 -7V-14M-3 -11H5" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round"/><path d="M-17 16Q-12.500 13 -8 16T1 16T10 16T17 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
GLYPH[HQ] = '<path d="M-16 1L0 -8L16 1Z"/><rect x="-13" y="2.500" width="26" height="11.500"/><g fill="#0003"><rect x="-9" y="5" width="4" height="9"/><rect x="-2" y="5" width="4" height="9"/><rect x="5" y="5" width="4" height="9"/></g><path d="M0 -8V-18" fill="none" stroke="currentColor" stroke-width="1.800"/><path d="M0 -18L9 -15L0 -12Z"/>';

/** a counter, centred on 0,0; r its radius */
function counter(kind, side, hero, r = 25) {
  const c = LACQUER[side], big = kind === COMMANDER, g = (r / 25) * (big ? 0.98 : 0.92);
  return `<circle r="${r}" fill="url(#lac${side})" stroke="${c.lo}" stroke-width="1"/>` +
    `<circle r="${f1(r - 2.2)}" fill="none" stroke="${c.rim}" stroke-width="${big ? 2.6 : 1.7}"/>` + (big ? `<circle r="${f1(r - 5.6)}" fill="none" stroke="${c.rim}" stroke-opacity=".55" stroke-width="1"/>` : '') +
    `<path d="M${f1(-r * 0.72)} ${f1(-r * 0.42)}A${f1(r * 0.86)} ${f1(r * 0.86)} 0 0 1 ${f1(r * 0.3)} ${f1(-r * 0.8)}" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="2.2" stroke-linecap="round"/>` +
    `<g transform="scale(${f1(g * 100) / 100})" fill="#fff6e0" color="#fff6e0">${GLYPH[kind]}</g>` +
    (hero ? `<g class="wreath"><circle r="${f1(r + 2.8)}" fill="none" stroke="#ffd45c" stroke-width="2.6" stroke-dasharray="5 3.2"/><g transform="translate(${f1(r * 0.72)} ${f1(-r * 0.72)})"><circle r="7.5" fill="#ffd45c" stroke="#8a5a00" stroke-width="1"/><path d="${star(5.4, 2.3)}" fill="#8a5a00"/></g></g>` : '');
}
/** a stack as it stands on the board: the carrier with its riders on its shoulder. pieces: [[kind, hero] …], carrier first */
function stackArt(pieces, side) {
  let s = `<ellipse class="sh" cx="2.500" cy="5" rx="25" ry="24"/><g class="body">${counter(pieces[0][0], side, pieces[0][1])}`;
  pieces.slice(1).forEach((p, i) => { s += `<g transform="translate(${i ? -19 : 19} 18)"><circle r="11.500" fill="#1b2433" opacity=".5" cy="1.500"/>${counter(p[0], side, p[1], 10.5)}</g>`; });
  return s + '</g>';
}
/** a counter by itself, for the panels beside the board */
const pieceIcon = (kind, side, size = 30, hero = false) => `<svg class="pi" viewBox="-30 -30 60 60" width="${size}" height="${size}" aria-hidden="true">${counter(kind, side, hero)}</svg>`;
const DEFS = `<radialGradient id="lac0" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${LACQUER[0].hi}"/><stop offset=".55" stop-color="${LACQUER[0].mid}"/><stop offset="1" stop-color="${LACQUER[0].lo}"/></radialGradient>` +
  `<radialGradient id="lac1" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${LACQUER[1].hi}"/><stop offset=".55" stop-color="${LACQUER[1].mid}"/><stop offset="1" stop-color="${LACQUER[1].lo}"/></radialGradient>` +
  '<linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fb3c8"/><stop offset="1" stop-color="#2c86ab"/></linearGradient>' +
  '<linearGradient id="plank" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b98a4e"/><stop offset=".5" stop-color="#d9ae6c"/><stop offset="1" stop-color="#a87a40"/></linearGradient>' +
  '<pattern id="swell" width="34" height="16" patternUnits="userSpaceOnUse"><path d="M0 8Q8.500 3 17 8T34 8" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1.400"/></pattern>' +
  '<pattern id="paper" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="#f1e6c8"/><path d="M-10 40Q40 20 80 44T170 36M-10 110Q50 86 90 112T170 100" fill="none" stroke="#b79a5c" stroke-opacity=".2" stroke-width="1.200"/><path d="M-10 74Q46 56 84 78T170 68" fill="none" stroke="#b79a5c" stroke-opacity=".12" stroke-width="1"/></pattern>';

/* ── the board: a chart on the table. U is the distance between two points. ── */
const U = 64, PAD = 46, BW = PAD * 2 + U * 10, BH = PAD * 2 + U * 11;
/** the sheet with its sea, river, bridges, lines and letters; xy(s) says where point s lies (the view may be turned) */
function boardSheet(xy, flip) {
  const X = f => xy(sqOf(f, 1))[0], Y = r => xy(sqOf(0, r))[1];
  const coast = X(2), sea0 = flip ? BW : 0, y6 = Y(6), y7 = Y(7), mid = (y6 + y7) / 2, far = flip ? 0 : BW, dir = flip ? -1 : 1;
  const top = Math.min(y6, y7), bot = Math.max(y6, y7);
  let g = `<rect width="${BW}" height="${BH}" rx="10" fill="url(#paper)"/>`;
  // the sea: everything on the far side of file c, with a coast that wanders a little
  let d = `M${sea0} 0L${coast} 0`;
  for (let y = 0; y <= BH; y += U / 2) d += `Q${f1(coast + dir * ((y / U) % 2 ? 7 : -7))} ${f1(y + U / 4)} ${coast} ${f1(Math.min(BH, y + U / 2))}`;
  g += `<path d="${d}L${sea0} ${BH}Z" fill="url(#sea)"/><path d="${d}L${sea0} ${BH}Z" fill="url(#swell)"/>`;
  // the river: a wide mouth round d and e, then narrow under the two bridges to the edge of the sheet
  const xe = X(4) + dir * U * 0.62, xf = X(5) - dir * U * 0.1, w = 15;
  const river = `M${coast - dir * 4} ${top - 21}L${xe - dir * U * 0.3} ${top - 21}Q${xe} ${top - 21} ${xf} ${mid - w}L${far} ${mid - w}L${far} ${mid + w}L${xf} ${mid + w}Q${xe} ${bot + 21} ${xe - dir * U * 0.3} ${bot + 21}L${coast - dir * 4} ${bot + 21}Z`;
  g += `<path d="${river}" fill="url(#sea)" stroke="#1e6f93" stroke-opacity=".5" stroke-width="1.500"/><path d="${river}" fill="url(#swell)"/>`;
  // lines
  for (let f = 0; f < NF; f++) g += `<path class="${f < 2 ? 'gl sea' : 'gl'}" d="M${X(f)} ${Y(1)}V${Y(12)}"/>`;
  for (let r = 1; r <= NR; r++) g += `<path class="gl sea" d="M${X(0)} ${Y(r)}H${X(2)}"/><path class="gl" d="M${X(2)} ${Y(r)}H${X(10)}"/>`;
  for (const f of [5, 7]) g += `<g><rect x="${X(f) - 13}" y="${top - 6}" width="26" height="${bot - top + 12}" rx="3" fill="url(#plank)" stroke="#6f4c1f" stroke-width="1.200"/><path d="M${X(f) - 13} ${top + 6}h26M${X(f) - 13} ${mid}h26M${X(f) - 13} ${bot - 6}h26" stroke="#6f4c1f" stroke-opacity=".5" stroke-width="1"/></g>`;
  // the Headquarters points
  for (let f = 0; f < NF; f++) g += `<text class="coord" x="${X(f)}" y="${BH - 14}">${FILES[f]}</text><text class="coord" x="${X(f)}" y="22">${FILES[f]}</text>`;
  for (let r = 1; r <= NR; r++) g += `<text class="coord" x="${flip ? BW - 16 : 16}" y="${Y(r) + 5}">${r}</text><text class="coord" x="${flip ? 16 : BW - 16}" y="${Y(r) + 5}">${r}</text>`;
  return g + `<rect x="1.500" y="1.500" width="${BW - 3}" height="${BH - 3}" rx="9" fill="none" stroke="#7a5a2a" stroke-opacity=".55" stroke-width="3"/>`;
}
