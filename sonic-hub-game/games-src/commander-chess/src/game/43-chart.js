/* ── The chart: the Lumen coast ──
   One mainland round a gulf, a home island, six stations: Port Halcyon on its island, Kestrel Field on the plain,
   Ironwood Depot in the pines, Cape Lantern at the end of the long cape, Fort Meridian on the head across the Gate
   from it, the Admiralty on the Sound behind them both.

   Everything is laid out on the wide sheet (1040 by 600). The tall sheet for an upright phone (600 by 1040) is the
   same coast turned over its other diagonal, so the journey runs from bottom left to top right on both: outlines,
   rivers and roads turn with it, while hills, trees and buildings are drawn upright where they land.

   The coast is not kept as a drawing but made: a few points for each shore, a smooth line through them, and a
   roughness laid on that line from a seed, so it is the same coast every time. Woods, peaks and soundings are
   scattered the same way. Making it takes a moment, so a sheet is made once and kept as a picture. */
const Chart = (() => {
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function noise1(rnd) { const v = Array.from({ length: 1024 }, () => rnd() * 2 - 1); return t => { const i = Math.floor(t), f = t - i, s = f * f * (3 - 2 * f), a = v[i & 1023], b = v[(i + 1) & 1023]; return a + (b - a) * s; }; }
  
  /** points along a Catmull-Rom curve through pts, about `step` apart */
  function spline(pts, closed, step = 4) {
    const n = pts.length, out = [], at = i => (closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < m; k++) { const t = k / m, t2 = t * t, t3 = t2 * t, q = [0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)); out.push(q); }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  /** push the points of an outline in and out along its normal: a coast, not a drawing */
  function roughen(line, closed, rnd, amps = [[5, 70], [2.2, 24], [0.9, 9]], keep = () => 1) {
    const n = line.length, ns = amps.map(() => noise1(rnd)), offs = amps.map(() => rnd() * 500), out = []; let s = 0;
    for (let i = 0; i < n; i++) {
      const a = line[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = line[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], p = line[i];
      if (i) s += Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]);
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      let d = 0; amps.forEach(([amp, wave], k) => { d += amp * ns[k](s / wave + offs[k]); });
      d *= keep(p, i / n);
      out.push([p[0] - ty * d, p[1] + tx * d]);
    }
    return out;
  }
  const pathOf = (line, closed) => line.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') + (closed ? 'Z' : '');
  function inside(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function distTo(poly, x, y) { let d = 1e9; for (let i = 0; i < poly.length; i += 2) { const q = Math.hypot(poly[i][0] - x, poly[i][1] - y); if (q < d) d = q; } return d; }
  /** a smooth curve through points, as an SVG path (for rivers, roads, routes) */
  const curve = (pts, step = 6) => pathOf(spline(pts, false, step), false);

  const C = { ink: '#14243a', paper: '#f1e6c8', card: '#fbf5e3', brass: '#e2b04a', red: '#d7263d', coast: '#8c6a35',
    sand: '#f5e9c4', low: '#d5e0a6', mid: '#c2d592', high: '#b0c67f', pine: '#3f7a56', pineD: '#2a5c43', leaf: '#72ad6c', leafD: '#4f8d58',
    rockL: '#efdfb2', rockD: '#b98c58', snow: '#fffaf0', wall: '#fbf5e3', wallD: '#e0d3ad', stone: '#d6cbac', stoneD: '#8a7a55', slate: '#5f7f9a', hull: '#1d2a48' };
  const ROOFS = ['#c8324b', '#d9603f', '#b4443c', '#c8324b', '#5f7f9a', '#d9603f'];
  
  /* ── the land, on the wide sheet ── */
  const MAINLAND = [[-420, 172], [-60, 178], [26, 190], [96, 207], [158, 214], [214, 206], [262, 196], [312, 212], [366, 206], [408, 190], [452, 192], [486, 220],
    [510, 266], [534, 314], [562, 354], [594, 392], [626, 428], [664, 446], [702, 432], [724, 398], [716, 352], [700, 306], [706, 262], [734, 232], [778, 226], [822, 238],
    [848, 226], [858, 204], [870, 204], [882, 228], [920, 242], [958, 264], [990, 302], [1004, 350], [998, 398], [978, 432], [930, 450], [876, 458], [836, 460], [800, 464],
    [774, 484], [770, 512], [788, 534], [824, 546], [870, 540], [916, 536], [966, 550], [1012, 584], [1040, 650], [1120, 900], [1900, 1200], [1900, -900], [-900, -900], [-900, 172]];
  const HALCYON = [[34, 344], [50, 304], [92, 280], [146, 272], [200, 278], [246, 292], [274, 320], [280, 356], [268, 382], [246, 378], [222, 380], [206, 394], [208, 414], [226, 426],
    [238, 440], [212, 452], [164, 452], [112, 440], [66, 418], [42, 384]];
  const ISLETS = [[[322, 410], [338, 402], [352, 412], [346, 428], [328, 428]], [[366, 436], [376, 432], [382, 442], [372, 448]], [[20, 262], [34, 256], [44, 266], [34, 276], [22, 272]],
    [[902, 386], [916, 380], [926, 392], [914, 402], [902, 398]], [[590, 520], [600, 514], [610, 522], [602, 532]], [[706, 560], [722, 552], [734, 564], [720, 574]]];
  /* the six stations, in the order of the journey */
  const STATIONS = [
    { id: 'halcyon', at: [186, 352] }, { id: 'kestrel', at: [306, 140] }, { id: 'ironwood', at: [540, 78] },
    { id: 'lantern', at: [652, 388] }, { id: 'meridian', at: [812, 486] }, { id: 'admiralty', at: [918, 186] }];
  /* the way the Maneuvers go from each station to the next: by sea, by road, by road, by sea, by sea */
  const LEGS = [
    [[214, 400], [262, 412], [312, 372], [338, 310], [336, 246], [322, 200], [306, 156]],
    [[306, 156], [352, 128], [416, 118], [478, 112], [540, 98]],
    [[540, 98], [556, 160], [566, 226], [596, 300], [628, 350], [652, 398]],
    [[690, 440], [716, 478], [744, 492], [772, 498]],
    [[806, 470], [800, 430], [832, 366], [880, 304], [904, 262]]];
  const RIVERS = [[[804, -40], [812, 30], [836, 92], [846, 150], [862, 205]], [[112, -40], [134, 40], [120, 110], [140, 160], [128, 208]], [[690, 40], [716, 110], [744, 170], [740, 230]]];
  const ROADS = [[[306, 156], [352, 128], [416, 118], [478, 112], [540, 98]], [[540, 98], [556, 160], [566, 226], [596, 300], [628, 350], [652, 398]],
    [[540, 98], [620, 120], [700, 150], [780, 176], [846, 190], [906, 206]], [[930, 214], [972, 232], [1014, 290], [1026, 360], [1010, 430], [950, 478], [880, 498], [834, 502]]];
  const RIDGES = [  // [points], size
    { line: [[560, 22], [640, 34], [720, 26], [790, 50], [880, 40], [960, 62], [1040, 48], [1100, 70]], size: 1 },
    { line: [[600, -8], [700, -12], [800, -4], [900, -10], [1010, 4], [1090, 10]], size: 1.15 },
    { line: [[-20, 40], [50, 56], [120, 44]], size: .8 }, { line: [[64, 322], [104, 306], [142, 316]], size: .62 }, { line: [[1040, 180], [1080, 250], [1090, 330]], size: .8 }];
  const HILLS = [[572, 270], [604, 330], [642, 300], [668, 356], [900, 500], [946, 496], [226, 96], [392, 80], [440, 160], [90, 400], [130, 408], [760, 112], [930, 110], [1024, 520], [470, 60]];
  const WOODS = [  // cx, cy, rx, ry, kind (0 pine, 1 leaf), density
    [540, 110, 132, 92, 0, 1], [470, 180, 60, 34, 0, .8], [650, 190, 66, 44, 0, .7], [92, 356, 46, 30, 1, .7], [138, 418, 56, 22, 1, .55], [236, 320, 30, 26, 1, .4], [770, 150, 40, 30, 1, .5],
    [1010, 440, 30, 50, 1, .6], [906, 500, 50, 22, 1, .55], [200, 120, 40, 30, 1, .35], [60, 120, 60, 40, 0, .5], [660, 330, 30, 40, 1, .45], [980, 150, 44, 40, 1, .5], [380, 60, 60, 36, 0, .5]];
  const FIELDS = [[754, 196, 0], [790, 206, 1], [802, 176, 2], [960, 214, 1], [984, 244, 0], [216, 166, 2], [246, 176, 0], [226, 186, 1], [388, 166, 2], [1004, 196, 2], [176, 306, 1], [160, 296, 0]];
  const SEA_NAMES = { wide: [['Halcyon Reach', 452, 330, -20, 22], ['Lumen Sound', 928, 352, -8, 21], ['The Meridian Gate', 722, 520, 14, 13], ['Gull Rocks', 352, 462, 0, 12]],
    tall: [['Halcyon Reach', 180, 578, -74, 24], ['The Meridian Gate', 92, 322, -58, 14], ['Gull Rocks', 100, 724, 0, 13]] };
  const ROSE = { wide: [452, 524, 1], tall: [80, 610, 1.05] };
  const SHIPS = { wide: [[556, 438, 1.05, -8, 'destroyer'], [972, 284, .8, 6, 'sail'], [858, 436, .7, -10, 'sail'], [300, 520, .7, 4, 'sail'], [646, 566, .85, 10, 'destroyer']],
    tall: [[196, 470, 1.1, -8, 'destroyer'], [286, 78, .9, 6, 'sail'], [164, 196, .8, -10, 'sail'], [84, 760, .9, 4, 'sail'], [44, 392, .9, 8, 'destroyer']] };
  
  /* ── small drawings ── */
  const house = (x, y, s, roof, tall = 0) => `<path d="M${f1(x - 4 * s)} ${f1(y)}V${f1(y - (5 + tall) * s)}H${f1(x + 4 * s)}V${f1(y)}Z" fill="${C.wall}"/><path d="M${f1(x)} ${f1(y)}V${f1(y - (5 + tall) * s)}H${f1(x + 4 * s)}V${f1(y)}Z" fill="${C.wallD}"/><path d="M${f1(x - 5.2 * s)} ${f1(y - (5 + tall) * s)}L${f1(x)} ${f1(y - (9.4 + tall) * s)}L${f1(x + 5.2 * s)} ${f1(y - (5 + tall) * s)}Z" fill="${roof}"/>`;
  const flag = (x, y, h, col, w = 9) => `<path d="M${f1(x)} ${f1(y)}V${f1(y - h)}" stroke="${C.ink}" stroke-width="1.1"/><path d="M${f1(x)} ${f1(y - h)}l${w} ${f1(w * .28)}l${-w} ${f1(w * .34)}Z" fill="${col}"/>`;
  const pine = (x, y, s) => `<path d="M${f1(x)} ${f1(y - 9 * s)}L${f1(x + 4.4 * s)} ${f1(y)}H${f1(x - 4.4 * s)}Z" fill="${C.pine}"/><path d="M${f1(x)} ${f1(y - 9 * s)}L${f1(x + 4.4 * s)} ${f1(y)}H${f1(x)}Z" fill="${C.pineD}"/>`;
  const leafy = (x, y, s) => `<circle cx="${f1(x)}" cy="${f1(y - 3.6 * s)}" r="${f1(3.9 * s)}" fill="${C.leafD}"/><circle cx="${f1(x - 1 * s)}" cy="${f1(y - 4.4 * s)}" r="${f1(3 * s)}" fill="${C.leaf}"/>`;
  function peak(x, y, h, rnd) {
    const w = h * (0.62 + rnd() * 0.16), k = (rnd() - 0.5) * 0.2 * w, r = x + w * 0.16;
    let g = `<path d="M${f1(x - w)} ${f1(y)}L${f1(x + k)} ${f1(y - h)}L${f1(x + w)} ${f1(y)}Z" fill="${C.rockL}"/><path d="M${f1(x + k)} ${f1(y - h)}L${f1(x + w)} ${f1(y)}H${f1(r)}L${f1(x + k + w * 0.05)} ${f1(y - h * 0.46)}Z" fill="${C.rockD}"/>`;
    if (h > 21) g += `<path d="M${f1(x + k)} ${f1(y - h)}L${f1(x + k + w * 0.3)} ${f1(y - h * 0.68)}L${f1(x + k + w * 0.1)} ${f1(y - h * 0.6)}L${f1(x + k - w * 0.04)} ${f1(y - h * 0.7)}L${f1(x + k - w * 0.16)} ${f1(y - h * 0.58)}L${f1(x + k - w * 0.32)} ${f1(y - h * 0.68)}Z" fill="${C.snow}"/>`;
    return g + `<path d="M${f1(x - w)} ${f1(y)}L${f1(x + k)} ${f1(y - h)}L${f1(x + w)} ${f1(y)}" fill="none" stroke="${C.coast}" stroke-opacity=".75" stroke-width="1" stroke-linejoin="round"/>`;
  }
  const hill = (x, y, s = 1) => `<path d="M${f1(x - 13 * s)} ${f1(y)}Q${f1(x - 4 * s)} ${f1(y - 13 * s)} ${f1(x + 4 * s)} ${f1(y - 5 * s)}Q${f1(x + 9 * s)} ${f1(y - 11 * s)} ${f1(x + 15 * s)} ${f1(y)}" fill="${C.rockL}" fill-opacity=".55" stroke="${C.coast}" stroke-opacity=".6" stroke-width="1.1" stroke-linejoin="round"/>`;
  function ship(x, y, s, rot, kind) {
    const wake = `<path d="M-30 12Q-24 8 -18 12T-6 12T6 12T18 12T30 12" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.4"/>`;
    const body = kind === 'sail'
      ? `<path d="M-13 3H13L9 9H-9Z" fill="${C.hull}"/><path d="M-1 2V-20L12 0Z" fill="${C.card}"/><path d="M-3 2V-15L-12 0Z" fill="#fff" fill-opacity=".85"/>${wake}`
      : `<path d="M-27 0H25L31 -3L24 9H-21Z" fill="${C.hull}"/><path d="M-13 0V-6H-4V-11H8V-6H15V0Z" fill="${C.hull}"/><path d="M2 -11V-22M-3 -17H7" stroke="${C.hull}" stroke-width="1.8" fill="none"/><path d="M-20 0V-4H-15V0ZM18 0V-4H22V0Z" fill="${C.hull}"/><path d="M-24 3H24" stroke="${C.red}" stroke-width="1.6"/>${wake}`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity=".92">${body}</g>`;
  }
  function roseArt(x, y, s) {
    const kite = (L, w, a, light, dark) => `<g transform="rotate(${a})"><path d="M0 ${-L}L${-w} 0H0Z" fill="${light}"/><path d="M0 ${-L}L${w} 0H0Z" fill="${dark}"/></g>`;
    let g = `<g transform="translate(${x} ${y}) scale(${s})"><circle r="47" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/><circle r="39" fill="none" stroke="#fff" stroke-opacity=".4"/>`;
    for (let i = 0; i < 32; i++) g += `<path d="M0 -39V${i % 4 ? -43 : -47}" transform="rotate(${i * 11.25})" stroke="#fff" stroke-opacity=".7" stroke-width="${i % 4 ? 1 : 1.6}"/>`;
    for (let i = 0; i < 8; i++) g += kite(25, 4, 22.5 + i * 45, '#ffffff99', '#ffffff55');
    for (let i = 0; i < 4; i++) g += kite(36, 6.5, 45 + i * 90, C.card, '#3a5a78');
    for (let i = 1; i < 4; i++) g += kite(54, 8, i * 90, C.card, C.ink);
    g += kite(58, 8.5, 0, '#ef4a5c', '#a51a30') + `<circle r="5.5" fill="${C.brass}" stroke="${C.ink}" stroke-width="1.5"/>`;
    return g + '</g>';
  }
  
  /* ── the six landmarks; `t` turns a point of the wide sheet into the sheet being drawn ── */
  function landmarks(t, tall, rnd) {
    const out = [], put = (p, svg, dy = 0) => { const q = t(p); out.push({ y: q[1] + dy, svg: typeof svg === 'function' ? svg(q[0], q[1]) : svg }); };
    const seg = (a, b, col, w, extra = '') => { const p = t(a), q = t(b); return `<path d="M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`; };
    const town = (list, s = 1) => list.forEach(([x, y, r, tl]) => put([x, y], (X, Y) => house(X, Y, s, ROOFS[r % ROOFS.length], tl || 0)));
    const boat = (p, s = .5, rot = 0) => put(p, (X, Y) => `<g transform="translate(${f1(X)} ${f1(Y)}) rotate(${rot}) scale(${s})"><path d="M-27 0H25L31 -3L24 9H-21Z" fill="${C.hull}"/><path d="M-13 0V-6H-4V-11H8V-6H15V0Z" fill="${C.hull}"/><path d="M2 -11V-20" stroke="${C.hull}" stroke-width="2"/><path d="M-22 3.500H23" stroke="${C.red}" stroke-width="1.8"/></g>`, -40);
    const tower = (X, Y, h, roof) => `<path d="M${f1(X - 3.4)} ${f1(Y)}V${f1(Y - h)}H${f1(X + 3.4)}V${f1(Y)}Z" fill="${C.wall}"/><path d="M${f1(X)} ${f1(Y)}V${f1(Y - h)}H${f1(X + 3.4)}V${f1(Y)}Z" fill="${C.wallD}"/><path d="M${f1(X - 4.6)} ${f1(Y - h)}L${f1(X)} ${f1(Y - h - 7)}L${f1(X + 4.6)} ${f1(Y - h)}Z" fill="${roof}"/>`;
    const light = (X, Y, s = 1) => `<path d="M${f1(X - 4.6 * s)} ${f1(Y)}L${f1(X - 2.8 * s)} ${f1(Y - 20 * s)}H${f1(X + 2.8 * s)}L${f1(X + 4.6 * s)} ${f1(Y)}Z" fill="${C.wall}"/><path d="M${f1(X)} ${f1(Y)}V${f1(Y - 20 * s)}H${f1(X + 2.8 * s)}L${f1(X + 4.6 * s)} ${f1(Y)}Z" fill="${C.wallD}"/><path d="M${f1(X - 4.1 * s)} ${f1(Y - 5.5 * s)}H${f1(X + 4.1 * s)}L${f1(X + 3.7 * s)} ${f1(Y - 10 * s)}H${f1(X - 3.7 * s)}ZM${f1(X - 3.2 * s)} ${f1(Y - 14.5 * s)}H${f1(X + 3.2 * s)}L${f1(X + 2.9 * s)} ${f1(Y - 18 * s)}H${f1(X - 2.9 * s)}Z" fill="${C.red}"/><path d="M${f1(X - 4 * s)} ${f1(Y - 20 * s)}H${f1(X + 4 * s)}V${f1(Y - 21.5 * s)}H${f1(X - 4 * s)}Z" fill="${C.ink}"/><circle cx="${f1(X)}" cy="${f1(Y - 24 * s)}" r="${f1(3 * s)}" fill="#ffe08a"/><circle cx="${f1(X)}" cy="${f1(Y - 24 * s)}" r="${f1(9 * s)}" fill="#ffe08a" opacity=".35"/><path d="M${f1(X - 3.4 * s)} ${f1(Y - 26.5 * s)}L${f1(X)} ${f1(Y - 31 * s)}L${f1(X + 3.4 * s)} ${f1(Y - 26.5 * s)}Z" fill="${C.ink}"/>`;
  
    /* Port Halcyon: a town round the bay, two piers, the mole light, the fleet at its moorings */
    out.push({ y: -1e3, svg: `<path d="${curve([[250, 379], [222, 381], [207, 395], [209, 414], [224, 426]].map(t))}" fill="none" stroke="${C.stone}" stroke-width="3.4" stroke-linecap="round"/>` + seg([209, 404], [234, 406], C.coast, 2.6) + seg([236, 381], [238, 398], C.coast, 2.6) });
    town([[168, 372, 0], [178, 364, 1, 1], [204, 366, 2], [214, 372, 0], [160, 384, 1], [176, 392, 3], [192, 398, 5], [158, 400, 0], [172, 410, 2], [190, 416, 4], [150, 366, 0], [200, 432, 1], [182, 430, 0], [232, 366, 3], [246, 362, 0]]);
    put([190, 376], (X, Y) => tower(X, Y, 17, C.slate) + flag(X, Y - 23, 9, C.red, 8));
    put([270, 378], (X, Y) => light(X, Y, .62));
    boat([250, 410], .5, 4); boat([232, 420], .4, 8); boat([252, 394], .36, 2);
  
    /* Kestrel Field: two runways, hangars, the tower, a windsock */
    out.push({ y: -1e3, svg: `<path d="${pathOf([[246, 128], [352, 118], [364, 168], [258, 182]].map(t), true)}" fill="#e9ddb6" stroke="${C.coast}" stroke-opacity=".35"/>` +
      seg([256, 166], [356, 138], '#74808c', 8.5) + seg([256, 166], [356, 138], '#fff', 1, 'stroke-dasharray="5 5" stroke-opacity=".9"') + seg([284, 128], [322, 176], '#8791a0', 6.5) + seg([284, 128], [322, 176], '#fff', .8, 'stroke-dasharray="4 5" stroke-opacity=".8"') });
    [[262, 142], [276, 139], [290, 136]].forEach(p => put(p, (X, Y) => `<path d="M${f1(X - 6.5)} ${f1(Y)}V${f1(Y - 3)}Q${f1(X)} ${f1(Y - 11)} ${f1(X + 6.5)} ${f1(Y - 3)}V${f1(Y)}Z" fill="${C.slate}"/><path d="M${f1(X - 4.2)} ${f1(Y)}V${f1(Y - 3.4)}H${f1(X + 4.2)}V${f1(Y)}Z" fill="${C.ink}"/>`, -30));
    put([322, 146], (X, Y) => `<path d="M${f1(X - 2.2)} ${f1(Y)}V${f1(Y - 14)}H${f1(X + 2.2)}V${f1(Y)}Z" fill="${C.wall}"/><path d="M${f1(X - 4.8)} ${f1(Y - 14)}H${f1(X + 4.8)}L${f1(X + 3.7)} ${f1(Y - 19.5)}H${f1(X - 3.7)}Z" fill="#bfe3f0" stroke="${C.ink}" stroke-width=".8"/><path d="M${f1(X)} ${f1(Y - 19.5)}V${f1(Y - 26)}" stroke="${C.red}" stroke-width="1.2"/>`);
    put([252, 152], (X, Y) => `<path d="M${f1(X)} ${f1(Y)}V${f1(Y - 11)}" stroke="${C.ink}" stroke-width="1"/><path d="M${f1(X)} ${f1(Y - 11)}l9 1.6l0 3l-9 .8Z" fill="#ff7f51"/>`);
    const planeD = 'M0 -12L3 -3L14 3V6L3 4L2 10L5 13V14.500L0 13L-5 14.500V13L-2 10L-3 4L-14 6V3L-3 -3Z';
    const plane = (p, s, rot, flying) => put(p, (X, Y) => (flying ? `<g transform="translate(${f1(X + 8)} ${f1(Y + 10)}) rotate(${rot}) scale(${s})" opacity=".2"><path d="${planeD}"/></g>` : '') +
      `<g transform="translate(${f1(X)} ${f1(Y)}) rotate(${rot}) scale(${s})"><path d="${planeD}" fill="${flying ? C.card : C.ink}" stroke="${C.ink}" stroke-width="${flying ? .9 : 0}"/></g>`, flying ? 900 : -20);
    plane([336, 160], .34, 70); plane([344, 162], .34, 70); plane([300, 170], .34, 15);
    const fly = tall ? [344, 268] : [392, 262];
    out.push({ y: 900, svg: `<path d="${curve([[346, 172], [364, 214], fly].map(t))}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round"/>` });
    plane(fly, .95, tall ? 250 : 152, true);
    town([[226, 150, 0], [236, 142, 4], [378, 150, 1]], .85);
  
    /* Ironwood Depot: sheds in a clearing, a water tower, the motor pool drawn up in a row */
    out.push({ y: -1e3, svg: `<path d="${pathOf(spline([[502, 84], [532, 70], [574, 74], [592, 96], [578, 120], [538, 126], [506, 114]].map(t), true, 5), true)}" fill="#e3d6a6" stroke="${C.coast}" stroke-opacity=".3"/>` });
    [[522, 98], [540, 94], [558, 90]].forEach((p, i) => put(p, (X, Y) => `<path d="M${f1(X - 7.5)} ${f1(Y)}V${f1(Y - 5)}H${f1(X + 7.5)}V${f1(Y)}Z" fill="${C.wall}"/><path d="M${f1(X - 8)} ${f1(Y - 5)}l4 -4.500v4.500l4 -4.500v4.500l4 -4.500v4.500l4 -4.500v4.500Z" fill="${i === 1 ? '#5f7f5a' : '#4f6f52'}"/>`));
    put([578, 104], (X, Y) => `<path d="M${f1(X - 3)} ${f1(Y)}L${f1(X - 2)} ${f1(Y - 9)}M${f1(X + 3)} ${f1(Y)}L${f1(X + 2)} ${f1(Y - 9)}" stroke="${C.ink}" stroke-width="1"/><path d="M${f1(X - 4.5)} ${f1(Y - 9)}H${f1(X + 4.5)}V${f1(Y - 15)}H${f1(X - 4.5)}Z" fill="${C.slate}"/><path d="M${f1(X - 5)} ${f1(Y - 15)}L${f1(X)} ${f1(Y - 18.5)}L${f1(X + 5)} ${f1(Y - 15)}Z" fill="${C.ink}"/>`);
    [[518, 114], [528, 113], [538, 112], [548, 111], [558, 110]].forEach(p => put(p, (X, Y) => `<rect x="${f1(X - 3.6)}" y="${f1(Y - 4.4)}" width="7.2" height="4.4" rx="1.2" fill="#4a5d3a"/><rect x="${f1(X - 1)}" y="${f1(Y - 6.4)}" width="4.6" height="2.4" rx=".8" fill="#3a4a2e"/>`));
    put([508, 102], (X, Y) => flag(X, Y, 15, C.red, 9));
  
    /* Cape Lantern: the light at the very tip, the Staff College on the rise behind it */
    const L = t([672, 412]), beam = (a, b) => { const p = t(a), q = t(b); return `<path d="M${f1(L[0])} ${f1(L[1])}L${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}Z" fill="url(#beam)"/>`; };
    out.push({ y: 1e3 - 1, svg: beam([462, 512], [488, 404]) });
    put([672, 436], (X, Y) => light(X, Y, 1), 2);
    put([640, 406], (X, Y) => `<path d="M${f1(X - 16)} ${f1(Y)}V${f1(Y - 8.5)}H${f1(X + 16)}V${f1(Y)}Z" fill="${C.wall}"/><path d="M${f1(X - 17)} ${f1(Y - 8.5)}H${f1(X + 17)}L${f1(X + 14)} ${f1(Y - 12.5)}H${f1(X - 14)}Z" fill="${C.slate}"/><path d="M${f1(X - 5.5)} ${f1(Y - 12.5)}A5.500 6 0 0 1 ${f1(X + 5.5)} ${f1(Y - 12.5)}Z" fill="${C.brass}" stroke="#94681a" stroke-width=".7"/><path d="M${f1(X)} ${f1(Y - 18.5)}V${f1(Y - 23)}" stroke="${C.ink}" stroke-width="1"/>` +
      [-12, -8, -4, 0, 4, 8, 12].map(d => `<path d="M${f1(X + d)} ${f1(Y)}V${f1(Y - 7.5)}" stroke="${C.wallD}" stroke-width="1.5"/>`).join(''));
    town([[620, 384, 4], [634, 378, 0], [612, 398, 1], [690, 404, 2], [654, 426, 0], [698, 418, 3]], .85);
  
    /* Fort Meridian: a star fort on the head of the hook, its keep, guns out over the Gate */
    const fc = t([812, 506]);
    out.push({ y: fc[1] - 9, svg: `<g transform="translate(${f1(fc[0])} ${f1(fc[1])})"><path d="${star(24, 15, 5)}" fill="#000" opacity=".16" transform="translate(2.500 3)"/><path d="${star(24, 15, 5)}" fill="${C.stone}" stroke="${C.stoneD}" stroke-width="1.6" stroke-linejoin="round"/><path d="${star(13.5, 10, 5)}" fill="#ece2c2" stroke="${C.stoneD}" stroke-width=".9"/>` +
      (tall ? [[14, 16], [20, 2], [10, -16]] : [[-17, 9], [-14, -12], [-4, 20]]).map(([gx, gy]) => `<path d="M${gx} ${gy}l${f1(gx * .55)} ${f1(gy * .55)}" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>`).join('') + `</g>` });
    put([812, 506], (X, Y) => `<path d="M${f1(X - 4.5)} ${f1(Y + 3)}V${f1(Y - 10)}H${f1(X + 4.5)}V${f1(Y + 3)}Z" fill="${C.wall}"/><path d="M${f1(X)} ${f1(Y + 3)}V${f1(Y - 10)}H${f1(X + 4.5)}V${f1(Y + 3)}Z" fill="${C.wallD}"/><path d="M${f1(X - 5.5)} ${f1(Y - 10)}v-3h2.200v1.600h2.200v-1.600h2.200v1.600h2.200v-1.600h2.200v3Z" fill="${C.stoneD}"/>` + flag(X, Y - 12, 12, C.red, 10), 6);
    town([[850, 494, 0], [862, 504, 3], [846, 516, 1], [872, 518, 2]], .85);
  
    /* The Admiralty: the capital on the Sound. A long front under a gilt dome, the town behind it, the fleet at the quay */
    out.push({ y: -1e3, svg: `<path d="${curve([[886, 232], [920, 244], [956, 264]].map(t))}" fill="none" stroke="${C.stone}" stroke-width="3.6" stroke-linecap="round"/>` + seg([852, 214], [880, 214], C.stoneD, 3) + seg([904, 240], [900, 258], C.coast, 2.6) + seg([936, 254], [928, 272], C.coast, 2.6) });
    town([[886, 166, 0, 1], [898, 158, 1], [950, 160, 3, 1], [962, 170, 0], [972, 182, 2, 1], [984, 196, 4], [876, 182, 5], [958, 218, 1], [972, 230, 0, 1], [948, 236, 2], [884, 204, 3], [870, 168, 2], [936, 146, 0], [988, 216, 5], [836, 200, 1], [826, 214, 0], [986, 250, 3], [908, 142, 4], [964, 198, 0], [996, 232, 1], [862, 190, 0], [1000, 262, 2]]);
    put([966, 190], (X, Y) => tower(X, Y, 19, C.slate));
    put([876, 202], (X, Y) => tower(X, Y, 14, '#c8324b'));
    put([918, 216], (X, Y) => `<g transform="translate(${f1(X)} ${f1(Y)}) scale(1.22)"><path d="M-25 0V-10H25V0Z" fill="${C.wall}"/><path d="M-26.500 -10H26.500V-12.500H-26.500Z" fill="${C.wallD}"/>` +
      [-22, -18, -14, -10, 10, 14, 18, 22].map(d => `<path d="M${d} 0V-9" stroke="${C.wallD}" stroke-width="1.6"/>`).join('') +
      `<path d="M-8 0V-15H8V0Z" fill="${C.wall}"/><path d="M-9.500 -15L0 -20L9.500 -15Z" fill="${C.wallD}"/><path d="M-6.500 -19A6.500 7.500 0 0 1 6.500 -19Z" fill="${C.brass}" stroke="#94681a" stroke-width=".8"/>` +
      [-5, -1.6, 1.6, 5].map(d => `<path d="M${d} 0V-14" stroke="${C.wallD}" stroke-width="1.4"/>`).join('') + `</g>` + flag(X, Y - 32, 11, C.red, 11), 3);
    boat([914, 264], .66, 8); boat([946, 280], .46, 12); boat([890, 254], .42, 4);
    return out;
  }

  /* where the first drawing of this chart was looked at: soundings and woods were scattered over that much of the sheet,
     and stay where they were approved */
  const SEEN = { wide: (() => { const k = Math.min(1338 / 1040, 726 / 600), w = 1338 / k, h = 726 / k; return [(1040 - w) / 2, (600 - h) / 2, w, h]; })(),
    tall: (() => { const k = Math.min(374 / 600, 548 / 1040), w = 374 / k, h = 548 / k; return [(600 - w) / 2, (1040 - h) / 2, w, h]; })() };
  /* how far the picture goes beyond the sheet, for a frame of another shape than the sheet: [x, y, width, height] */
  const OVER = { wide: [-230, -75, 1500, 750], tall: [-90, -156, 780, 1352] };

  /** The chart, drawn once for each sheet. Returns { svg, text }: the picture as a whole SVG document (sea, land,
   *  everything that stands on it; over OVER), and what is written on the sea (soundings, names, the compass's N) as
   *  SVG markup in the sheet's own measures, to be set in the page's type over the picture. */
  function draw(tall) {
    const W = tall ? 600 : 1040, H = tall ? 1040 : 600, rnd = rng(tall ? 77 : 7), t = tall ? p => [600 - p[1], 1040 - p[0]] : p => p;
    const [fx, fy, fw, fh] = tall ? SEEN.tall : SEEN.wide, [ox, oy, ow, oh] = tall ? OVER.tall : OVER.wide;
    const shape = (pts, amps, seed) => roughen(spline(pts, true, 4), true, rng(seed), amps);
    const lands = [shape(MAINLAND, [[5.5, 76], [2.4, 26], [1, 9]], 11), shape(HALCYON, [[3.4, 60], [1.6, 20], [.8, 8]], 23), ...ISLETS.map((p, i) => shape(p, [[1.6, 22], [.7, 7]], 40 + i))].map(l => l.map(t));
    const landD = lands.map(l => pathOf(l, true)).join(''), onLand = (x, y) => lands.some(l => inside(l, x, y)), coastDist = (x, y) => Math.min(...lands.map(l => distTo(l, x, y)));
    const lamp = t([672, 412]);
    let g = `<defs><linearGradient id="seaG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="1" gradientTransform="translate(${f1(fx)} ${f1(fy)}) scale(${f1(fw)} ${f1(fh)})"><stop offset="0" stop-color="#5bbdcf"/><stop offset=".55" stop-color="#2f8cb0"/><stop offset="1" stop-color="#236f97"/></linearGradient>
      <radialGradient id="deepG" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${f1(fx + fw * (tall ? .1 : .16))} ${f1(fy + fh * (tall ? .78 : .92))}) scale(${f1(fw * .75)} ${f1(fh * .75)})"><stop offset="0" stop-color="#0f4a6b" stop-opacity=".55"/><stop offset="1" stop-color="#0f4a6b" stop-opacity="0"/></radialGradient>
      <radialGradient id="beam" gradientUnits="userSpaceOnUse" cx="${f1(lamp[0])}" cy="${f1(lamp[1])}" r="170"><stop offset="0" stop-color="#fff3c4" stop-opacity=".62"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
      <pattern id="swell" width="34" height="16" patternUnits="userSpaceOnUse"><path d="M0 8Q8.500 3 17 8T34 8" fill="none" stroke="#fff" stroke-opacity=".17" stroke-width="1.300"/></pattern>
      <pattern id="stipple" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.500" cy="1.500" r=".55" fill="${C.coast}" fill-opacity=".5"/><circle cx="5" cy="4.600" r=".5" fill="${C.coast}" fill-opacity=".4"/></pattern>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
      <clipPath id="landClip"><path d="${landD}"/></clipPath></defs>`;
    /* the sea */
    g += `<rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="url(#seaG)"/><rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="url(#deepG)"/><rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="url(#swell)"/>`;
    for (let x = Math.floor(ox / 130) * 130; x <= ox + ow; x += 130) g += `<path d="M${x} ${oy}V${oy + oh}" stroke="#fff" stroke-opacity=".11"/>`;
    for (let y = Math.floor(oy / 120) * 120; y <= oy + oh; y += 120) g += `<path d="M${ox} ${y}H${ox + ow}" stroke="#fff" stroke-opacity=".11"/>`;
    const rose = tall ? ROSE.tall : ROSE.wide;
    for (let i = 0; i < 16; i++) { const a = i * 22.5 * Math.PI / 180; g += `<path d="M${rose[0]} ${rose[1]}L${f1(rose[0] + Math.sin(a) * 1500)} ${f1(rose[1] - Math.cos(a) * 1500)}" stroke="#fff" stroke-opacity="${i % 2 ? .07 : .13}" stroke-width="1"/>`; }
    const bigD = lands.slice(0, 2).map(l => pathOf(l, true)).join(''), smallD = lands.slice(2).map(l => pathOf(l, true)).join('');
    g += `<g fill="none" stroke="#fff" stroke-linejoin="round"><path d="${bigD}" stroke-opacity=".1" stroke-width="64"/><path d="${bigD}" stroke-opacity=".13" stroke-width="38"/><path d="${landD}" stroke-opacity=".2" stroke-width="17"/><path d="${smallD}" stroke-opacity=".12" stroke-width="34"/></g>`;
    /* soundings: scattered over open water. They are written in the page's type, so they go out as text */
    const names = tall ? SEA_NAMES.tall : SEA_NAMES.wide, taken = [[rose[0], rose[1], 74 * rose[2]], ...names.map(n => [n[1], n[2], n[0].length * n[4] * .26]), ...(tall ? SHIPS.tall : SHIPS.wide).map(s => [s[0], s[1], 44])], marks = [];
    for (let k = 0; k < 2600 && marks.length < 34; k++) {
      const x = fx + 16 + rnd() * (fw - 32), y = fy + 16 + rnd() * (fh - 32);
      if (onLand(x, y) || taken.some(q => Math.hypot(q[0] - x, q[1] - y) < q[2]) || marks.some(q => Math.hypot(q[0] - x, q[1] - y) < 74)) continue;
      const d = coastDist(x, y); if (d < 26) continue;
      marks.push([x, y, Math.max(3, Math.round(d / 5.4 + rnd() * 5))]);
    }
    let text = '';
    for (const [x, y, v] of marks) text += `<text x="${f1(x)}" y="${f1(y)}" class="sounding">${v}</text>`;
    for (const [txt, x, y, rot, size] of names) text += `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" class="sea-name" style="font-size:${size}px;letter-spacing:${f1(size * .16)}px">${txt}</text>`;
    text += `<text x="${rose[0]}" y="${f1(rose[1] - 64 * rose[2])}" class="chart-n" style="font-size:${f1(19 * rose[2])}px">N</text>`;
    for (const s of (tall ? SHIPS.tall : SHIPS.wide)) g += ship(...s);
    g += roseArt(...rose);
    /* the land: sand at the shore, then greener inland */
    g += `<path d="${landD}" fill="${C.high}"/><g clip-path="url(#landClip)"><g fill="none" stroke-linejoin="round"><path d="${landD}" stroke="${C.mid}" stroke-width="110"/><path d="${landD}" stroke="${C.low}" stroke-width="52"/></g>`;
    g += '<g filter="url(#soft)" opacity=".8">' + RIDGES.map(r => `<path d="${curve(r.line.map(t), 10)}" fill="none" stroke="#e3cf98" stroke-width="${f1(46 * r.size)}" stroke-linecap="round"/>`).join('') + '</g>';
    for (const [x, y, k] of FIELDS) { const p = t([x, y]), a = -14 + k * 9, col = ['#e8d98f', '#b7cf7a', '#d9c777'][k]; g += `<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${a})"><rect x="-13" y="-8" width="26" height="16" rx="1.500" fill="${col}" opacity=".85"/><path d="M-13 -4H13M-13 0H13M-13 4H13" stroke="${C.coast}" stroke-opacity=".28" stroke-width=".8"/></g>`; }
    g += `<g fill="none" stroke-linejoin="round"><path d="${landD}" stroke="${C.sand}" stroke-width="15"/><path d="${landD}" stroke="url(#stipple)" stroke-width="13"/></g>`;
    RIVERS.forEach((r, i) => { const d = curve(r.map(t)); g += `<path d="${d}" fill="none" stroke="#3f9cbd" stroke-width="${i ? 2.8 : 4.4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#9adbe6" stroke-width="${i ? 1.3 : 2.2}" stroke-linecap="round"/>`; });
    for (const r of ROADS) g += `<path d="${curve(r.map(t))}" fill="none" stroke="#7a5a2a" stroke-opacity=".7" stroke-width="1.500" stroke-dasharray="5 3.500" stroke-linecap="round"/>`;
    g += `</g><path d="${landD}" fill="none" stroke="${C.coast}" stroke-width="2.200" stroke-linejoin="round"/>`;
    /* everything that stands up, drawn from the back of the sheet to the front */
    const things = landmarks(t, tall, rnd), keepOff = [...STATIONS.map(s => [...t(s.at), 30]), [...t([924, 200]), 78], [...t([304, 150]), 64], [...t([196, 392]), 56], [...t([654, 410]), 46], [...t([822, 506]), 46], [...t([546, 98]), 48]];
    const roadPts = [...ROADS, ...RIVERS].flatMap(r => spline(r.map(t), false, 8));
    for (const r of RIDGES) { const line = spline(r.line.map(t), false, 6); let next = 0, s = 0; for (let i = 1; i < line.length; i++) { s += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); if (s < next) continue; const h = (17 + rnd() * 17) * r.size, x = line[i][0] + (rnd() - .5) * 10, y = line[i][1] + (rnd() - .5) * 16; next = s + h * (0.62 + rnd() * .3); if (onLand(x, y) && coastDist(x, y) > 12) things.push({ y, svg: peak(x, y, h, rnd) }); } }
    for (const [x, y] of HILLS) { const p = t([x, y]); things.push({ y: p[1] - 2, svg: hill(p[0], p[1], .8 + rnd() * .5) }); }
    for (const [cx, cy, rx, ry, kind, dens] of WOODS) {
      const c = t([cx, cy]), ex = tall ? ry : rx, ey = tall ? rx : ry;
      for (let y = c[1] - ey; y <= c[1] + ey; y += 7.5) for (let x = c[0] - ex; x <= c[0] + ex; x += 8) {
        const px = x + (rnd() - .5) * 7, py = y + (rnd() - .5) * 6, q = ((px - c[0]) / ex) ** 2 + ((py - c[1]) / ey) ** 2;
        if (q > 1 || rnd() > dens * (1.15 - q * .7) || !onLand(px, py) || coastDist(px, py) < 9 || keepOff.some(k => Math.hypot(k[0] - px, k[1] - py) < k[2] * .62) || roadPts.some(k => Math.hypot(k[0] - px, k[1] - py) < 6)) continue;
        const s = .78 + rnd() * .5; things.push({ y: py, svg: kind ? leafy(px, py, s) : pine(px, py, s) });
      }
    }
    things.sort((a, b) => a.y - b.y); for (const o of things) g += o.svg;
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${ow} ${oh}" width="${ow * 2}" height="${oh * 2}">${g}</svg>`, text };
  }
  const made = {};
  return {
    /** the sheet's own measures: [width, height] */
    size: tall => (tall ? [600, 1040] : [1040, 600]),
    over: tall => (tall ? OVER.tall : OVER.wide),
    /** drawn once and kept */
    sheet(tall) { const k = tall ? 'tall' : 'wide'; return made[k] || (made[k] = draw(tall)); },
    /** where station i stands on the sheet (its flag's foot), in the order of the route */
    at: (i, tall) => (tall ? [600 - STATIONS[i].at[1], 1040 - STATIONS[i].at[0]] : STATIONS[i].at),
    /** the way from each station to the next, a path for each leg */
    legs: tall => LEGS.map(l => curve(l.map(tall ? p => [600 - p[1], 1040 - p[0]] : p => p), 5)),
  };
})();
