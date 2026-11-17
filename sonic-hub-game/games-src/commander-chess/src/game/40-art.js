/* ── Everything drawn: the pieces, the map sheet they stand on, the stand-in portraits, the cards, the harbour ──
   Pieces are lacquered counters with a brass rim, Red and Blue, each with its arm's badge in cream. A hero wears a
   gold wreath; riders show as small counters on the carrier's shoulder. All of it is SVG made here: no picture
   files. (The women's own pictures come from outside when ART.base is set; see 60-campaign.js.) */
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

/* ── the women: a drawn stand-in until her own picture is there ── */
const HAIR = {
  bob: 'M-30 4Q-34 -34 0 -36Q34 -34 30 4L26 18Q24 -6 14 -14Q0 -8 -16 -12Q-24 -4 -26 18Z',
  curls: 'M-34 14Q-44 -6 -32 -22Q-28 -40 -8 -38Q4 -46 20 -36Q38 -30 34 -8Q44 8 32 22Q30 0 18 -12Q0 -6 -18 -12Q-28 0 -34 14Z',
  long: 'M-28 46Q-38 -6 -26 -24Q-14 -40 4 -37Q30 -34 29 -4Q32 24 26 46L18 46Q24 6 14 -14Q0 -6 -16 -13Q-22 6 -18 46Z',
  wave: 'M-30 30Q-40 4 -30 -18Q-18 -40 6 -37Q32 -32 30 -6Q40 10 30 34Q28 8 16 -12Q-2 -4 -18 -13Q-26 2 -30 30Z',
  updo: 'M-27 6Q-32 -22 -14 -30Q-18 -46 0 -48Q18 -46 14 -30Q32 -22 27 6Q24 -8 14 -15Q0 -8 -16 -13Q-24 -6 -27 6Z',
};
/** her picture, or the stand-in: a bust in her colours */
function portrait(w, cls = '') {
  const [a, b, c] = w.tone, id = 'pg-' + w.id;
  const fallback = `<svg class="bust" viewBox="-60 -64 120 128" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect x="-60" y="-64" width="120" height="128" fill="url(#${id})"/><circle cx="34" cy="-36" r="46" fill="#fff" opacity=".14"/><circle cx="-44" cy="30" r="40" fill="#000" opacity=".1"/>` +
    `<path d="M-52 64Q-50 26 -18 20L18 20Q50 26 52 64Z" fill="#14243a"/><path d="M-18 20L0 44L18 20" fill="${c}"/><path d="M-30 24L-18 20L-8 34ZM30 24L18 20L8 34Z" fill="#e2b04a"/>` +
    `<rect x="-8" y="6" width="16" height="18" rx="6" fill="#f0c9a4"/><ellipse cx="0" cy="-8" rx="21" ry="24" fill="#f6d5b4"/><path d="${HAIR[w.hair]}" fill="#2a1c1a"/></svg>`;
  if (!ART.base) return `<span class="portrait ${cls}">${fallback}</span>`;
  return `<span class="portrait ${cls}"><img src="${ART.base}${w.id}/portrait.webp" alt="${w.name}" onerror="this.outerHTML=this.nextElementSibling.innerHTML"><template>${fallback}</template></span>`;
}
/** one of her three cards: won, or still face down */
function cardArt(w, i, won) {
  const stars = '★'.repeat(i + 1);
  if (!won) return `<div class="card back"><div class="card-in"><span class="card-star">${stars}</span><span class="card-lock">Beat ${w.name.split(' ')[0]} ${CARD_WINS[i] === 1 ? 'once' : CARD_WINS[i] + ' times'}</span></div></div>`;
  const pic = ART.base ? `<img src="${ART.base}${w.id}/card-${i + 1}.webp" alt="" onerror="this.remove()">` : '';
  return `<div class="card t${i}"><div class="card-in">${portrait(w, 'card-pic')}${pic}<span class="card-star">${stars}</span><div class="card-cap"><b>${w.name}</b><i>${w.cards[i][0]}</i><p>${w.cards[i][1]}</p></div></div></div>`;
}

/* ── Port Halcyon at the evening gun ── */
function sceneHalcyon() {
  let lights = '', flags = '';
  for (let i = 0; i < 17; i++) { const x = 40 + i * 70, y = 392 + Math.sin(i * 0.9) * 9 + 14; lights += `<circle cx="${x}" cy="${f1(y)}" r="5" fill="#ffe08a"/><circle cx="${x}" cy="${f1(y)}" r="12" fill="#ffe08a" opacity=".22"/>`; }
  ['#d7263d', '#ffd45c', '#2458c5', '#fff6e0', '#d7263d', '#2458c5'].forEach((c, i) => { flags += `<path d="M${716 + i * 2} ${126 + i * 22}l26 6l-26 8z" fill="${c}"/>`; });
  return `<svg class="scene" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28507e"/><stop offset=".45" stop-color="#e8707a"/><stop offset=".78" stop-color="#ffb35c"/><stop offset="1" stop-color="#ffe29a"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f29a6a"/><stop offset=".35" stop-color="#3f8fa6"/><stop offset="1" stop-color="#17506b"/></linearGradient></defs>
    <rect width="1200" height="300" fill="url(#sky)"/><circle cx="820" cy="262" r="64" fill="#fff3c4"/><circle cx="820" cy="262" r="110" fill="#fff3c4" opacity=".25"/>
    <g fill="#fff" opacity=".5"><ellipse cx="260" cy="96" rx="120" ry="12"/><ellipse cx="330" cy="116" rx="80" ry="8"/><ellipse cx="980" cy="140" rx="110" ry="10"/></g>
    <path d="M0 268Q120 214 250 240Q330 200 420 252L470 270H0Z" fill="#3b3160"/><path d="M196 236V160h14v76z" fill="#f4ead2"/><path d="M192 160h22l-5 -16h-12z" fill="#c8324b"/><circle cx="203" cy="152" r="6" fill="#ffe08a"/><path class="beam" d="M203 152L60 120V186Z" fill="#ffe08a" opacity=".18"/>
    <rect y="268" width="1200" height="252" fill="url(#water)"/><g class="glints" fill="#fff3c4" opacity=".5"><rect x="760" y="282" width="120" height="4" rx="2"/><rect x="780" y="298" width="80" height="4" rx="2"/><rect x="744" y="316" width="150" height="5" rx="2"/><rect x="790" y="338" width="64" height="5" rx="2"/></g>
    <g fill="#1d2a48"><path d="M520 300h250l-22 30H548z"/><path d="M580 300v-22h40v-18h46v18h50v22z"/><path d="M640 260v-44M626 232h30" stroke="#1d2a48" stroke-width="4" fill="none"/><path d="M716 116V300" stroke="#1d2a48" stroke-width="3"/>
      <path d="M930 318h190l-16 22H950z"/><path d="M980 318v-16h32v-12h34v12h30v16z"/></g>${flags}
    <path d="M0 410Q200 392 420 404T860 400T1200 408V520H0Z" fill="#12283c"/><path d="M0 396Q300 420 600 398T1200 402" fill="none" stroke="#2a1c1a" stroke-width="2"/><g class="bulbs">${lights}</g>
    <g fill="#0c1b2a"><rect x="0" y="446" width="1200" height="10"/><path d="M60 446v74h10v-74zM260 446v74h10v-74zM460 446v74h10v-74zM660 446v74h10v-74zM860 446v74h10v-74zM1060 446v74h10v-74z"/></g></svg>`;
}

/* ── the coast the Maneuvers travel ── */
/* One island for each place, in PLACES order: its outline and hills as drawn on the wide chart (1040 by 600), where its
   flag stands there, and where that flag stands on the tall chart (600 by 1040) that an upright phone gets. */
const ISLES = [
  { d: 'M40 370Q20 270 90 240Q150 210 210 240Q270 240 290 300Q300 370 240 400Q150 440 40 370Z', hills: [[120, 300], [170, 270]], at: [208, 336], tall: [205, 905] },
  { d: 'M330 250Q300 170 370 130Q440 90 500 130Q560 160 540 230Q520 280 440 280Q360 290 330 250Z', hills: [[385, 170], [485, 185]], at: [430, 230], tall: [460, 715] },
  { d: 'M560 430Q540 360 600 330Q680 300 740 340Q790 380 760 440Q720 490 640 480Q580 470 560 430Z', hills: [[610, 400], [712, 398]], at: [655, 360], tall: [165, 520] },
  { d: 'M720 220Q700 150 770 110Q850 80 900 130Q940 180 900 230Q850 270 790 260Q740 250 720 220Z', hills: [[772, 196], [884, 190]], at: [840, 150], tall: [455, 315] },
  { d: 'M840 480Q820 410 880 390Q950 370 990 410Q1030 450 990 500Q940 530 890 520Q850 510 840 480Z', hills: [[884, 458], [966, 474]], at: [936, 432], tall: [200, 135] },
];
const CHART = {
  wide: { w: 1040, h: 600, rose: [120, 110, 1], boat: [605, 112], depths: [[330, 455, 14], [330, 60, 22], [612, 228, 31], [520, 520, 18], [960, 300, 27], [690, 560, 12], [210, 220, 25], [1000, 90, 34]] },
  tall: { w: 600, h: 1040, rose: [540, 1000, 0.7], boat: [535, 515], depths: [[105, 340, 14], [545, 665, 22], [70, 715, 31], [350, 985, 18], [560, 215, 27], [45, 55, 12], [370, 150, 25]] },
};
const chartPoint = (i, tall) => (tall ? ISLES[i].tall : ISLES[i].at);
function chartArt(tall) {
  const c = tall ? CHART.tall : CHART.wide;
  // the sea is the frame's own background, so swell and graticule run past the sheet to wherever the frame ends
  let g = '<rect x="-800" y="-800" width="2700" height="2700" fill="url(#swell)"/>';
  for (let x = -780; x <= 1820; x += 130) g += `<path d="M${x} -800V1900" stroke="#fff" stroke-opacity=".12"/>`;
  for (let y = -720; y <= 1800; y += 120) g += `<path d="M-800 ${y}H1900" stroke="#fff" stroke-opacity=".12"/>`;
  for (const o of ISLES) {
    g += `<g${tall ? ` transform="translate(${o.tall[0] - o.at[0]} ${o.tall[1] - o.at[1]})"` : ''}><path d="${o.d}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="16"/><path d="${o.d}" fill="#f1e6c8" stroke="#8c6a35" stroke-width="2.500"/><path d="${o.d}" fill="#7fb069" opacity=".35" transform="translate(6 6) scale(.985)"/>`;
    for (const [x, y] of o.hills) g += `<path d="M${x - 16} ${y + 9}L${x - 5} ${y - 9}L${x + 3} ${y + 2}L${x + 9} ${y - 5}L${x + 18} ${y + 9}" fill="none" stroke="#8c6a35" stroke-opacity=".7" stroke-width="2" stroke-linejoin="round"/>`;
    g += '</g>';
  }
  for (const [x, y, t] of c.depths) g += `<text x="${x}" y="${y}" class="sounding"${tall ? ' style="font-size:21px"' : ''}>${t}</text>`;
  g += `<g transform="translate(${c.boat[0]} ${c.boat[1]}) rotate(-12)" fill="#14243a" opacity=".8"><path d="M-22 0H22L16 9H-17Z"/><path d="M-9 0V-7H6V0Z"/><path d="M-1 -7V-16" stroke="#14243a" stroke-width="2"/><path d="M-30 13Q-24 9 -18 13T-6 13T6 13T18 13T30 13" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.500"/></g>`;
  g += `<g transform="translate(${c.rose[0]} ${c.rose[1]}) scale(${c.rose[2]})"><circle r="46" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.500"/><path d="${star(44, 9)}" fill="#fff" fill-opacity=".5" transform="rotate(18)"/><path d="M0 -52L7 0L0 52L-7 0Z" fill="#14243a"/><path d="M0 -52L7 0H-7Z" fill="#d7263d"/><text y="-58" class="chart-n">N</text></g>`;
  return g;
}
