/* ── Painting: paper, bamboo, light, lanterns and stamps ──
   Everything the page shows that is not type is painted here, on canvases, by the page itself: there is not one
   picture file. The painters are plain functions that draw into a canvas they make or are given. */
const $ = s => document.querySelector(s), sleep = ms => new Promise(res => setTimeout(res, ms));
const TAU = Math.PI * 2;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x), lerp = (a, b, k) => a + (b - a) * k;
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3), easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeBack = t => { const c = 1.9; t = clamp01(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
/** random numbers that come out the same for the same seed */
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const pixelRatio = (most = 2.5) => Math.min(most, window.devicePixelRatio || 1);
/** smooth noise along a line: the same x always gives the same value, between −1 and 1 */
function noise1(seed) {
  const r = seeded(seed), v = Array.from({ length: 512 }, () => r() * 2 - 1);
  return x => { const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return lerp(v[i & 511], v[(i + 1) & 511], k); };
}

/** The two sides' colours: the paper of their lanterns, the light inside, and the character brushed on a square
 *  they take (安 peace for Red, 福 fortune for Gold, as the Pingxi lantern makers write them). */
const LAMP = [
  { name: 'Red', paper: '#d4362c', deep: '#7e130e', mid: '#ef5a36', glow: '#ff8a4c', core: '#ffe3ad', ink: 'rgba(72, 6, 4, 0.66)', zh: '安', tie: '#ff5a3c', css: '#e0442f' },
  { name: 'Gold', paper: '#efb33b', deep: '#94600d', mid: '#f7c750', glow: '#ffd36a', core: '#fff7d6', ink: 'rgba(96, 48, 2, 0.62)', zh: '福', tie: '#ffc94a', css: '#f3b23a' },
];
const KAI = '"Lantern Kai", "Kaiti TC", "BiauKai", "STKaiti", "KaiTi", serif';

/* ── paper ── */
/** A sheet of paper w × h: a ground colour, a faint mottle, and fibres. tint: [ground, fibre light, fibre dark]. */
function paperSheet(w, h, tint, seed, fibres = 1) {
  const c = canvasOf(w, h), g = c.getContext('2d'), r = seeded(seed);
  g.fillStyle = tint[0]; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {                               // mottle: the paper took the dye unevenly
    const x = r() * w, y = r() * h, rad = (0.08 + r() * 0.22) * Math.max(w, h), gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.5 ? tint[1] : tint[2]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.06 + r() * 0.07; g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.lineCap = 'round';
  const count = Math.round(w * h / 380 * fibres);
  for (let i = 0; i < count; i++) {                            // fibres: short curling hairs, most of them faint
    const x = r() * w, y = r() * h, len = 4 + r() * r() * 26, a = r() * TAU, bend = (r() - 0.5) * len;
    g.globalAlpha = 0.05 + r() * r() * 0.3; g.strokeStyle = r() < 0.72 ? tint[1] : tint[2]; g.lineWidth = 0.35 + r() * 0.8;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len / 2 - Math.sin(a) * bend, y + Math.sin(a) * len / 2 + Math.cos(a) * bend, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}
/** Fibres alone on nothing, to lay over the page's paper-coloured panels (CSS --paper-tex). */
function paperGrain(size, seed) {
  const c = canvasOf(size, size), g = c.getContext('2d'), r = seeded(seed);
  g.lineCap = 'round';
  for (let i = 0; i < size * size / 90; i++) {
    const x = r() * size, y = r() * size, len = 3 + r() * r() * 18, a = r() * TAU;
    g.globalAlpha = 0.04 + r() * r() * 0.16; g.strokeStyle = r() < 0.6 ? '#8a6a3a' : '#ffffff'; g.lineWidth = 0.4 + r() * 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  for (let i = 0; i < size * size / 260; i++) { g.globalAlpha = 0.08 + r() * 0.12; g.fillStyle = r() < 0.5 ? '#6b4d24' : '#c9a66a'; g.fillRect(r() * size, r() * size, 0.8 + r(), 0.8 + r()); }
  return c;
}

/* ── bamboo ── */
/** A bamboo strip lying across, `len` long and `w` thick, in a canvas of its own with room round it for its shadow.
 *  Returns { c, pad }: the strip starts at (pad, pad + w / 2) on the canvas. */
function bambooStrip(len, w, seed, tone = 0) {
  const pad = Math.ceil(w * 0.9), c = canvasOf(len + pad * 2, w + pad * 2), g = c.getContext('2d'), r = seeded(seed);
  const y0 = pad, x0 = pad, rad = w * 0.42;
  const path = () => { g.beginPath(); g.moveTo(x0 + rad, y0); g.lineTo(x0 + len - rad, y0); g.quadraticCurveTo(x0 + len, y0, x0 + len, y0 + w / 2); g.quadraticCurveTo(x0 + len, y0 + w, x0 + len - rad, y0 + w); g.lineTo(x0 + rad, y0 + w); g.quadraticCurveTo(x0, y0 + w, x0, y0 + w / 2); g.quadraticCurveTo(x0, y0, x0 + rad, y0); g.closePath(); };
  // its shadow on the paper
  g.save(); g.shadowColor = 'rgba(4, 6, 24, 0.55)'; g.shadowBlur = w * 0.7; g.shadowOffsetY = w * 0.32; g.fillStyle = '#000'; path(); g.fill(); g.restore();
  // the strip: rounded, so lit along the top and dark along the bottom
  const lit = tone ? ['#fbe8b0', '#e0bd72', '#b48a44', '#6d4b1e'] : ['#fff0c0', '#e8c47a', '#bc9049', '#704c1d'];
  const gr = g.createLinearGradient(0, y0, 0, y0 + w);
  gr.addColorStop(0, lit[2]); gr.addColorStop(0.18, lit[0]); gr.addColorStop(0.42, lit[1]); gr.addColorStop(0.82, lit[2]); gr.addColorStop(1, lit[3]);
  g.fillStyle = gr; path(); g.fill();
  g.save(); path(); g.clip();
  g.lineCap = 'round';
  for (let i = 0; i < Math.max(3, w * 0.6); i++) {           // grain along its length
    const yy = y0 + w * (0.15 + r() * 0.7); g.globalAlpha = 0.08 + r() * 0.14; g.strokeStyle = r() < 0.5 ? '#6d4b1e' : '#fff6d4'; g.lineWidth = Math.max(0.5, w * 0.05);
    g.beginPath(); g.moveTo(x0 + r() * len * 0.3, yy); g.lineTo(x0 + len * (0.7 + r() * 0.3), yy + (r() - 0.5) * w * 0.1); g.stroke();
  }
  const nodes = len > w * 9 ? [0.3 + r() * 0.12, 0.7 - r() * 0.12] : [0.5 + (r() - 0.5) * 0.2];
  for (const t of nodes) {                                      // a node: a ring, darker, with a lit edge
    const x = x0 + len * t; g.globalAlpha = 0.55; g.fillStyle = '#5a3c14'; g.fillRect(x - w * 0.09, y0, w * 0.18, w);
    g.globalAlpha = 0.5; g.fillStyle = '#fff1c4'; g.fillRect(x + w * 0.09, y0, w * 0.07, w);
  }
  g.restore();
  g.globalAlpha = 1;
  return { c, pad };
}
/** The same strip standing up. */
function turned(sprite) {
  const { c, pad } = sprite, t = canvasOf(c.height, c.width), g = t.getContext('2d');
  g.translate(c.height, 0); g.rotate(Math.PI / 2); g.drawImage(c, 0, 0);
  return { c: t, pad };
}
/** A bamboo pole for the frame round the board, `len` long and `w` thick, across. */
function bambooPole(len, w, seed) {
  const c = canvasOf(len, w), g = c.getContext('2d'), r = seeded(seed);
  const gr = g.createLinearGradient(0, 0, 0, w);
  gr.addColorStop(0, '#4a3410'); gr.addColorStop(0.12, '#c49a4e'); gr.addColorStop(0.3, '#f3d995'); gr.addColorStop(0.5, '#d4ad5f'); gr.addColorStop(0.85, '#7d5a22'); gr.addColorStop(1, '#3a280c');
  g.fillStyle = gr; g.fillRect(0, 0, len, w);
  g.lineCap = 'round';
  for (let i = 0; i < w * 1.2; i++) { const y = r() * w; g.globalAlpha = 0.06 + r() * 0.12; g.strokeStyle = r() < 0.5 ? '#3a280c' : '#fff3c8'; g.lineWidth = 0.6 + r(); g.beginPath(); g.moveTo(r() * len * 0.4, y); g.lineTo(len * (0.6 + r() * 0.4), y); g.stroke(); }
  let x = w * (1.2 + r() * 1.5);
  while (x < len - w) {                                         // its nodes, a pole's length apart
    const ng = g.createLinearGradient(x - w * 0.22, 0, x + w * 0.22, 0);
    ng.addColorStop(0, 'rgba(70, 48, 14, 0)'); ng.addColorStop(0.45, 'rgba(70, 48, 14, 0.75)'); ng.addColorStop(0.6, 'rgba(255, 238, 190, 0.55)'); ng.addColorStop(1, 'rgba(70, 48, 14, 0)');
    g.globalAlpha = 1; g.fillStyle = ng; g.fillRect(x - w * 0.22, 0, w * 0.44, w);
    x += w * (3.2 + r() * 2.6);
  }
  g.globalAlpha = 1;
  return c;
}
/** The red string that lashes two poles where they cross: a few turns of it, round the point (x, y). */
function lashing(g, x, y, w) {
  g.save(); g.translate(x, y); g.rotate(Math.PI / 4);
  for (let i = -2; i <= 2; i++) {
    const gr = g.createLinearGradient(0, -w * 0.62, 0, w * 0.62);
    gr.addColorStop(0, '#5e0b08'); gr.addColorStop(0.45, '#e2493a'); gr.addColorStop(1, '#6e0f0b');
    g.fillStyle = gr; g.beginPath(); g.ellipse(i * w * 0.16, 0, w * 0.085, w * 0.62, 0, 0, TAU); g.fill();
  }
  g.restore();
}

/* ── a knot where lines meet ── */
function knot(r) {
  const s = Math.ceil(r * 4), c = canvasOf(s, s), g = c.getContext('2d'), m = s / 2;
  g.shadowColor = 'rgba(4, 6, 24, 0.6)'; g.shadowBlur = r * 0.9; g.shadowOffsetY = r * 0.35;
  const gr = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
  gr.addColorStop(0, '#d9a868'); gr.addColorStop(0.35, '#7a4a1c'); gr.addColorStop(1, '#2a160a');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255, 228, 170, 0.35)'; g.lineWidth = Math.max(0.6, r * 0.14); g.beginPath(); g.arc(m, m, r * 0.82, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  return c;
}

/* ── a square lit ── */
/** A square of paper lit from behind in a side's colour, `s` across, with its character brushed on it. */
function litSquare(s, side, seed) {
  const L = LAMP[side], c = canvasOf(s, s), g = c.getContext('2d'), r = seeded(seed);
  const gr = g.createRadialGradient(s * 0.5, s * 0.56, s * 0.04, s * 0.5, s * 0.5, s * 0.74);
  gr.addColorStop(0, L.core); gr.addColorStop(0.28, L.glow); gr.addColorStop(0.62, L.mid); gr.addColorStop(0.9, L.paper); gr.addColorStop(1, L.deep);
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.lineCap = 'round';
  for (let i = 0; i < s * s / 55; i++) {                       // the fibres, lit through
    const x = r() * s, y = r() * s, len = 2 + r() * r() * s * 0.25, a = r() * TAU;
    g.globalAlpha = 0.05 + r() * 0.16; g.strokeStyle = r() < 0.55 ? L.deep : '#fffbe8'; g.lineWidth = 0.3 + r() * 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  g.globalAlpha = 1;
  // the character, brushed in ink that the light shows through
  g.font = `700 ${Math.round(s * 0.56)}px ${KAI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = L.ink; g.shadowColor = L.ink; g.shadowBlur = s * 0.03;
  g.fillText(L.zh, s * 0.5, s * 0.53);
  g.shadowBlur = 0;
  // the edge of the paper, a little darker where the frame shades it
  const eg = g.createRadialGradient(s / 2, s / 2, s * 0.42, s / 2, s / 2, s * 0.75);
  eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(40, 6, 2, 0.35)');
  g.fillStyle = eg; g.fillRect(0, 0, s, s);
  return c;
}
/** The light a lit square throws round it: laid over everything with 'lighter'. */
function glowOf(s, side) {
  const L = LAMP[side], size = Math.ceil(s * 2.4), c = canvasOf(size, size), g = c.getContext('2d'), m = size / 2;
  const gr = g.createRadialGradient(m, m, s * 0.2, m, m, size / 2);
  gr.addColorStop(0, L.glow); gr.addColorStop(0.35, side ? 'rgba(255, 196, 80, 0.32)' : 'rgba(255, 110, 60, 0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

/* ── lanterns ── */
/** A sky lantern, `h` tall, in a canvas with room for its glow: a paper bag on a bamboo ring, wider at the top, with
 *  a flame in the opening at the bottom. side: 0 Red, 1 Gold, 2 the warm white of the lanterns everyone sends up.
 *  Returns { c, w, h, cx, cy }: (cx, cy) is the middle of the lantern on the canvas. */
function skyLantern(h, side, seed = 7, glow = 1) {
  const r = seeded(seed), w = h * 0.78, padX = h * 0.9 * glow + 2, padY = Math.max(h * 0.8 * glow, h * 0.12) + 2;   // room below, whatever the glow, for the flame
  const c = canvasOf(w + padX * 2, h + padY * 2), g = c.getContext('2d'), x0 = padX, y0 = padY;
  const tone = side === 2 ? { paper: '#ffd9a0', deep: '#b8642a', glow: '#ffc070', core: '#fffbe6' } : LAMP[side];
  if (glow) {                                                   // the light round it
    const gr = g.createRadialGradient(x0 + w / 2, y0 + h * 0.62, 0, x0 + w / 2, y0 + h * 0.6, h * 1.25 * glow);
    gr.addColorStop(0, side === 1 ? 'rgba(255, 214, 110, 0.5)' : side === 0 ? 'rgba(255, 120, 70, 0.5)' : 'rgba(255, 196, 120, 0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  }
  const top = w * 0.5, bot = w * 0.32, cx = x0 + w / 2;
  const body = () => { g.beginPath(); g.moveTo(cx - top, y0 + h * 0.08); g.quadraticCurveTo(cx - top * 1.02, y0 - h * 0.02, cx, y0); g.quadraticCurveTo(cx + top * 1.02, y0 - h * 0.02, cx + top, y0 + h * 0.08); g.lineTo(cx + bot, y0 + h * 0.94); g.lineTo(cx - bot, y0 + h * 0.94); g.closePath(); };
  const bg = g.createLinearGradient(0, y0, 0, y0 + h);
  bg.addColorStop(0, tone.deep); bg.addColorStop(0.35, tone.paper); bg.addColorStop(0.8, tone.glow); bg.addColorStop(1, tone.core);
  g.fillStyle = bg; body(); g.fill();
  g.save(); body(); g.clip();
  const ig = g.createRadialGradient(cx, y0 + h * 0.86, 0, cx, y0 + h * 0.7, h * 0.7);
  ig.addColorStop(0, 'rgba(255, 252, 230, 0.95)'); ig.addColorStop(0.4, 'rgba(255, 236, 180, 0.35)'); ig.addColorStop(1, 'rgba(255, 236, 180, 0)');
  g.fillStyle = ig; g.fillRect(x0 - 2, y0, w + 4, h);
  g.globalAlpha = 0.22; g.strokeStyle = tone.deep; g.lineWidth = Math.max(0.5, h * 0.012);
  for (let i = 1; i < 4; i++) { const t = i / 4; g.beginPath(); g.moveTo(cx + (t - 0.5) * 2 * top, y0); g.lineTo(cx + (t - 0.5) * 2 * bot, y0 + h); g.stroke(); }
  g.globalAlpha = 0.16;
  for (let i = 0; i < h * 0.5; i++) { g.fillStyle = r() < 0.5 ? tone.deep : '#fff'; g.fillRect(x0 + r() * w, y0 + r() * h, 0.8, h * 0.04); }
  g.restore();
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(70, 40, 16, 0.85)'; g.fillRect(cx - bot - h * 0.01, y0 + h * 0.93, (bot + h * 0.01) * 2, Math.max(1, h * 0.03));   // the bamboo ring
  const fg = g.createRadialGradient(cx, y0 + h * 0.97, 0, cx, y0 + h * 0.97, h * 0.12);  // the flame
  fg.addColorStop(0, '#fffef0'); fg.addColorStop(0.4, '#ffd270'); fg.addColorStop(1, 'rgba(255, 140, 40, 0)');
  g.fillStyle = fg; g.beginPath(); g.ellipse(cx, y0 + h * 0.97, h * 0.07, h * 0.1, 0, 0, TAU); g.fill();
  return { c, w, h, cx, cy: y0 + h / 2 };
}
/** A round paper lantern hung from a string, `h` tall with its tassel: red, with gold caps. */
function roundLantern(h, seed) {
  const r = seeded(seed), w = h * 0.62, pad = h * 0.7, c = canvasOf(w + pad * 2, h + pad * 2), g = c.getContext('2d'), cx = pad + w / 2, top = pad, bodyH = h * 0.62;
  const gl = g.createRadialGradient(cx, top + bodyH * 0.55, 0, cx, top + bodyH * 0.55, h * 1.05);
  gl.addColorStop(0, 'rgba(255, 110, 60, 0.42)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gl; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#2a1608'; g.fillRect(cx - 0.6, 0, 1.2, top + 2);
  const cap = (y, k) => { const cg = g.createLinearGradient(cx - w * 0.28, 0, cx + w * 0.28, 0); cg.addColorStop(0, '#6a4410'); cg.addColorStop(0.5, '#f7d27a'); cg.addColorStop(1, '#6a4410'); g.fillStyle = cg; g.fillRect(cx - w * 0.26, y, w * 0.52, bodyH * 0.09 * k); };
  const bg = g.createRadialGradient(cx - w * 0.12, top + bodyH * 0.45, w * 0.05, cx, top + bodyH * 0.5, w * 0.62);
  bg.addColorStop(0, '#ffd59a'); bg.addColorStop(0.3, '#ff7a45'); bg.addColorStop(0.75, '#d8322a'); bg.addColorStop(1, '#6e0c08');
  g.fillStyle = bg; g.beginPath(); g.ellipse(cx, top + bodyH * 0.55, w / 2, bodyH * 0.48, 0, 0, TAU); g.fill();
  g.globalAlpha = 0.28; g.strokeStyle = '#5e0b08'; g.lineWidth = Math.max(0.6, h * 0.012);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(cx, top + bodyH * 0.55, Math.abs(i) * w * 0.12 + 0.5, bodyH * 0.48, 0, 0, TAU); g.stroke(); }
  g.globalAlpha = 1;
  cap(top + bodyH * 0.04, 1); cap(top + bodyH * 0.98, 1);
  for (let i = 0; i < 9; i++) { g.strokeStyle = i % 2 ? '#c72a22' : '#e8483a'; g.lineWidth = Math.max(0.7, h * 0.014); const x = cx + (i - 4) * w * 0.03; g.beginPath(); g.moveTo(x, top + bodyH * 1.06); g.lineTo(x + (r() - 0.5) * 2, top + h * 0.98); g.stroke(); }
  return { c, cx, top };
}

/* ── a station's stamp ── */
/** The commemorative stamp of a station, as the stations of the line keep them for travellers to press into their
 *  books: red ink in a double ring, the station's name in the middle, the line's name round the top and the board
 *  round the bottom. `s` across. faded: the outline a stamp not won yet leaves. */
function stampOf(s, station, board, faded = false, seed = 3) {
  const c = canvasOf(s, s), g = c.getContext('2d'), m = s / 2, ink = faded ? 'rgba(120, 96, 70, 0.55)' : '#b8231b';
  g.strokeStyle = ink; g.fillStyle = ink;
  g.lineWidth = s * 0.045; g.beginPath(); g.arc(m, m, s * 0.46, 0, TAU); g.stroke();
  g.lineWidth = s * 0.016; g.beginPath(); g.arc(m, m, s * 0.37, 0, TAU); g.stroke();
  const ring = (text, radius, at, size, flip) => {                      // letters set round a circle
    g.save(); g.font = `700 ${size}px ${'"Alegreya Sans", sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const each = text.split(''), span = size * 0.68 / radius, start = at - (span * (each.length - 1)) / 2 * (flip ? -1 : 1);
    each.forEach((ch, i) => { const a = start + i * span * (flip ? -1 : 1); g.save(); g.translate(m + Math.cos(a) * radius, m + Math.sin(a) * radius); g.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2)); g.fillText(ch, 0, 0); g.restore(); });
    g.restore();
  };
  ring('LANTERN LINE', s * 0.415, -Math.PI / 2, s * 0.068, false);
  ring(board, s * 0.415, Math.PI / 2, s * 0.075, true);
  g.font = `700 ${Math.round(s * (station.length > 2 ? 0.2 : 0.25))}px ${KAI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(station, m, m - s * 0.02);
  g.font = `700 ${Math.round(s * 0.085)}px ${KAI}`; g.fillText('紀念章', m, m + s * 0.2);
  for (const k of [-1, 1]) { g.beginPath(); g.arc(m + k * s * 0.3, m + s * 0.12, s * 0.018, 0, TAU); g.fill(); }
  if (!faded) {                                                 // the ink did not take everywhere
    const r = seeded(seed); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < s * 2.2; i++) { g.globalAlpha = 0.25 + r() * 0.6; const rad = s * (0.004 + r() * r() * 0.02); g.beginPath(); g.arc(r() * s, r() * s, rad, 0, TAU); g.fill(); }
    g.globalAlpha = 0.18; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(r() * s, r() * s, s * (0.05 + r() * 0.12), s * (0.02 + r() * 0.05), r() * TAU, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  return c;
}

/** A board's little picture for the ticket: its dots, n × n squares, a line or two drawn and one square lit. */
function gridIcon(px, n, on) {
  const c = canvasOf(px, px), g = c.getContext('2d'), step = (px - 6) / n, ink = on ? '#fff3dc' : '#3a2c22';
  g.fillStyle = on ? 'rgba(255, 220, 150, 0.7)' : 'rgba(196, 53, 43, 0.55)'; g.fillRect(3, 3, step, step);
  g.strokeStyle = ink; g.lineWidth = Math.max(1, px / 32); g.beginPath(); g.moveTo(3, 3); g.lineTo(3 + step, 3); g.lineTo(3 + step, 3 + step); g.lineTo(3, 3 + step); g.closePath(); g.stroke();
  g.fillStyle = ink;
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) { g.beginPath(); g.arc(3 + x * step, 3 + y * step, Math.max(0.9, px / (n * 9)), 0, TAU); g.fill(); }
  return c;
}
