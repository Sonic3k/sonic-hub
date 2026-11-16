/* Every surface is drawn here, on canvases: no image is loaded. Sizes in the comments are what one repeat of the
   texture stands for in the room. */
import * as THREE from 'three';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/** a colour made lighter (f > 0) or darker (f < 0), f in -1…1 */
export function shade(c, f) {
  const [r, g, b] = hex(c), k = f < 0 ? 0 : 255, t = Math.abs(f);
  return `rgb(${Math.round(r + (k - r) * t)},${Math.round(g + (k - g) * t)},${Math.round(b + (k - b) * t)})`;
}
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

let maxAniso = 4;
export const setAniso = n => { maxAniso = n; };

export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.repeat !== false) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = o.aniso ?? maxAniso;
  if (o.nearest) { t.magFilter = THREE.NearestFilter; }
  return t;
}

/* ── drawing helpers ─────────────────────────────────────────────────── */
function speckle(g, w, h, R, n, a, dark = true) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${dark ? '0,0,0' : '255,255,255'},${(R() * a).toFixed(3)})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
}
function grainLines(g, x, y, w, h, R, n, a) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < n; i++) {
    const yy = y + R() * h, len = w * (0.25 + R() * 0.9), xx = x + R() * w - len * 0.3;
    g.strokeStyle = (R() < 0.62 ? 'rgba(30,10,4,' : 'rgba(255,225,190,') + (a * (0.25 + R())).toFixed(3) + ')';
    g.lineWidth = 0.6 + R() * 1.4;
    g.beginPath(); g.moveTo(xx, yy);
    g.bezierCurveTo(xx + len * 0.3, yy + (R() - 0.5) * 3, xx + len * 0.65, yy + (R() - 0.5) * 3, xx + len, yy + (R() - 0.5) * 2); g.stroke();
  }
  g.restore();
}

/* ── textures ────────────────────────────────────────────────────────── */
const cache = new Map();
const once = (key, fn) => { let v = cache.get(key); if (!v) cache.set(key, v = fn()); return v; };
export const texKeys = () => [...cache].map(([k, t]) => `${t.image.width}x${t.image.height} ${k}`);

/** plain wood, grain along U · 1 m */
export const woodTex = (base, seed = 1) => once('wood' + base + seed, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed * 977 + 13);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) { const y = R() * h, hh = 14 + R() * 70, gr = g.createLinearGradient(0, y, 0, y + hh), c = R() < 0.5 ? '0,0,0' : '255,215,175', a = 0.02 + R() * 0.035; gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.5, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, y, w, hh); }
  grainLines(g, 0, 0, w, h, R, 170, 0.1);
  speckle(g, w, h, R, 900, 0.05);
}));

/** laminate boards, three strips of short blocks to a board, boards along U · 1.6 m */
export const planksTex = (base = '#a8632f') => once('planks' + base, () => canvasTex(1024, 1024, (g, w, h) => {
  const R = rng(4411);
  g.fillStyle = shade(base, -0.25); g.fillRect(0, 0, w, h);
  const rows = 8, bh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < 3; s++) {
      const y = r * bh + s * bh / 3; let x = -R() * 200;
      while (x < w) {
        const len = 150 + R() * 190, f = (R() - 0.5) * 0.15, warm = (R() - 0.5) * 8;
        const [cr, cg, cb] = hex(base); const k = f < 0 ? 0 : 255, t = Math.abs(f);
        g.fillStyle = `rgb(${Math.round(cr + (k - cr) * t + warm)},${Math.round(cg + (k - cg) * t)},${Math.round(cb + (k - cb) * t - warm * 0.6)})`;
        g.fillRect(x, y, len - 1, bh / 3 - 0.6);
        grainLines(g, x, y, len - 1, bh / 3 - 0.6, R, 6, 0.14);
        x += len;
      }
    }
    // the joint between boards (and their ends)
    g.fillStyle = 'rgba(20,8,2,0.55)'; g.fillRect(0, r * bh, w, 1.6);
    let x = (r % 2 ? 0.5 : 0) * 768 + R() * 80 - 400;
    while (x < w) { g.fillRect(x, r * bh, 1.6, bh); x += 768; }
  }
  speckle(g, w, h, R, 2500, 0.035);
}, { aniso: 16 }));

/** square tiles with grout · n tiles to a repeat */
export const tileTex = (base, grout, n = 4, mottle = 0.06, seed = 3) => once(`tile${base}${grout}${n}${seed}`, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed * 31 + 7), s = w / n;
  g.fillStyle = grout; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = shade(base, (R() - 0.5) * mottle * 2); g.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
    gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.08)');
    g.fillStyle = gr; g.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
  }
  speckle(g, w, h, R, 1400, mottle * 0.8);
}));

/** the cement tiles of the corridor: a red field, a cream trellis, a small flower where it crosses · 4 tiles (0.8 m) */
export const cementTex = (field = '#a9554a', line = '#eadfc6') => once('cement' + field, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(99), n = 4, s = w / n;
  g.fillStyle = field; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * s, y = j * s, c = s / 2;
    g.save(); g.translate(x, y);
    g.fillStyle = shade(field, (R() - 0.5) * 0.12); g.fillRect(0, 0, s, s);
    g.strokeStyle = line; g.lineWidth = s * 0.075; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(c, 0); g.lineTo(s, c); g.lineTo(c, s); g.lineTo(0, c); g.closePath(); g.stroke();
    g.fillStyle = line;
    for (const [px, py] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(px, py, s * 0.2, 0, 7); g.fill(); }
    g.fillStyle = shade(field, -0.25);
    for (const [px, py] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(px, py, s * 0.09, 0, 7); g.fill(); }
    // the flower in the middle
    g.fillStyle = line;
    for (let k = 0; k < 4; k++) { g.save(); g.translate(c, c); g.rotate(k * Math.PI / 2); g.beginPath(); g.ellipse(0, -s * 0.13, s * 0.065, s * 0.12, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#c9963a'; g.beginPath(); g.arc(c, c, s * 0.05, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(40,20,15,0.35)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }
  // sixty years of feet
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(90,80,70,${0.03 + R() * 0.07})`; g.beginPath(); g.ellipse(R() * w, R() * h, 20 + R() * 70, 12 + R() * 40, R() * 3, 0, 7); g.fill(); }
  speckle(g, w, h, R, 2600, 0.09);
}, { aniso: 16 }));

/** stacked stone cladding · 0.9 m wide, 0.6 m high */
export const stoneTex = () => once('stone', () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(51); g.fillStyle = '#5d605f'; g.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const rh = 26 + R() * 22; let x = -R() * 60;
    while (x < w) { const rw = 50 + R() * 110, v = 150 + R() * 70; g.fillStyle = `rgb(${v | 0},${(v + 3) | 0},${(v + 1) | 0})`; g.fillRect(x + 1.5, y + 1.5, rw - 3, rh - 3); x += rw; }
    y += rh;
  }
  speckle(g, w, h, R, 3000, 0.1); speckle(g, w, h, R, 1500, 0.08, false);
}));

/** painted wall: plain, a touch darker toward floor and ceiling · V runs the height of the room */
export const paintTex = (base) => once('paint' + base, () => canvasTex(64, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(60,45,30,0.10)'); gr.addColorStop(0.1, 'rgba(60,45,30,0.02)'); gr.addColorStop(0.82, 'rgba(60,45,30,0.02)'); gr.addColorStop(1, 'rgba(50,35,25,0.16)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}));

/** weathered render / concrete · 2 m */
export const concreteTex = (base, seed = 5, stain = 0.5) => once('conc' + base + seed, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed * 71); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${R() < 0.7 ? '60,50,40' : '255,250,240'},${(0.02 + R() * 0.07) * stain})`; g.beginPath(); g.ellipse(R() * w, R() * h, 20 + R() * 120, 10 + R() * 60, R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 16; i++) { const x = R() * w; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(50,40,30,${0.14 * stain})`); gr.addColorStop(0.6 + R() * 0.4, 'rgba(50,40,30,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + R() * 14, h); }
  speckle(g, w, h, R, 4000, 0.08);
}));

/** his sheet: blue, teal and grey bands crossed by pale lilac ones · 0.9 m */
export const plaidTex = () => once('plaid', () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(8); const cols = ['#69c3d6', '#3fa7c4', '#8fd8cf', '#5b8f86', '#d9eef0', '#4d9fb8', '#7c8a7c', '#a6e0e6'];
  let y = 0; while (y < h) { const bh = 8 + R() * 22; g.fillStyle = cols[(R() * cols.length) | 0]; g.fillRect(0, y, w, bh); y += bh; }
  g.fillStyle = 'rgba(166,160,222,0.92)'; for (let x = 20; x < w; x += 128) g.fillRect(x, 0, 26, h);
  g.fillStyle = 'rgba(166,160,222,0.9)'; for (let yy = 34; yy < h; yy += 170) g.fillRect(0, yy, w, 14);
  g.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 84; x < w; x += 128) g.fillRect(x, 0, 5, h);
  speckle(g, w, h, R, 2500, 0.05);
}));
/** the folded quilt: yellow-green checks · 0.5 m */
export const quiltTex = () => once('quilt', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(18); g.fillStyle = '#c9cf72'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(232,186,92,0.75)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 6, 0, 22, h); g.fillRect(0, i * 64 + 6, w, 22); }
  g.fillStyle = 'rgba(150,170,70,0.5)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 40, 0, 8, h); g.fillRect(0, i * 64 + 40, w, 8); }
  speckle(g, w, h, R, 900, 0.06);
}));
/** navy with small pale marks · 0.4 m */
export const dotsTex = (base = '#2a3550', dot = '#d6dbe6') => once('dots' + base, () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = dot;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillRect(i * 32 + (j % 2 ? 16 : 0) + 6, j * 32 + 8, 4, 9); }
}));
/** a printed floral cloth · 1 m */
export const floralTex = (base, cols, seed = 2) => once('floral' + base + seed, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed * 311); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    const x = R() * w, y = R() * h, r = 7 + R() * 16; g.fillStyle = rgba(cols[(R() * cols.length) | 0], 0.55 + R() * 0.35);
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + R(); g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.3, a, 0, 7); g.fill(); }
    for (const dx of [-w, w]) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; g.beginPath(); g.ellipse(x + dx + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.3, a, 0, 7); g.fill(); }
  }
  speckle(g, w, h, R, 1800, 0.05);
}));
/** lace: cream cloth ending in scallops (alpha) · U repeats every 0.35 m, V is the whole drop */
export const laceTex = () => once('lace', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(77); g.clearRect(0, 0, w, h);
  g.fillStyle = '#efe3bd'; g.fillRect(0, 0, w, h * 0.62);
  for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(i * 128 + 64, h * 0.62, 64, h * 0.34, 0, 0, Math.PI); g.fill(); }
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2; i++) for (let k = 0; k < 9; k++) { const a = Math.PI * (k + 0.5) / 9; g.beginPath(); g.arc(i * 128 + 64 + Math.cos(a) * 46, h * 0.62 + Math.sin(a) * h * 0.24, 4.5, 0, 7); g.fill(); }
  for (let x = 8; x < w; x += 16) for (let y = 10; y < h * 0.56; y += 16) { if (R() < 0.8) { g.beginPath(); g.arc(x + (y % 32 ? 0 : 8), y, 2.2, 0, 7); g.fill(); } }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(190,170,110,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h * 0.6); g.lineTo(w, h * 0.6); g.stroke();
}, { repeat: true }));
/** a curtain cloth, darker in its folds · U one fold */
export const curtainTex = (base, seed = 1) => once('curtain' + base + seed, () => canvasTex(128, 256, (g, w, h) => {
  const R = rng(seed * 5); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.04)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(255,240,200,${R() * 0.07})`; g.beginPath(); g.ellipse(R() * w, R() * h, 6 + R() * 10, 10 + R() * 22, R(), 0, 7); g.fill(); }
}));
/** bamboo blind: slats with slits of light between (alpha) · V 0.25 m */
export const blindTex = () => once('blind', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(31); g.clearRect(0, 0, w, h);
  const n = 14, s = h / n;
  for (let i = 0; i < n; i++) { g.fillStyle = shade('#b98a4e', (R() - 0.5) * 0.3); g.fillRect(0, i * s, w, s * 0.74); g.fillStyle = 'rgba(60,35,10,0.25)'; g.fillRect(0, i * s + s * 0.6, w, s * 0.14); }
  g.fillStyle = 'rgba(90,60,30,0.9)'; for (const x of [40, 128, 216]) g.fillRect(x, 0, 3, h);
}));
/** mosquito net (alpha) · 0.1 m */
export const netTex = () => once('net', () => canvasTex(64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(40,44,48,0.85)'; g.lineWidth = 1.2;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8, h); g.moveTo(0, i * 8); g.lineTo(w, i * 8); g.stroke(); }
}));

/** a shelf of books: spines of school books, magazines, novels · 1.1 m wide, as high as the shelf */
export const booksTex = (seed = 1, kind = 'mixed') => once('books' + seed + kind, () => canvasTex(512, 128, (g, w, h) => {
  const R = rng(seed * 733 + 5);
  g.fillStyle = '#1c0f0a'; g.fillRect(0, 0, w, h);
  const pal = kind === 'white' ? ['#e9e6dc', '#dfdccf', '#eeeae0', '#d6d9de']
    : kind === 'school' ? ['#7fb4d6', '#a9cfe6', '#e9a3b4', '#f2d7df', '#e8e3d2', '#9dc8a0', '#f0c75e', '#d4e3ee', '#c8443c', '#5b8fc4']
      : ['#2f5f8f', '#b23b32', '#e8e0cc', '#3d7a5c', '#d9a441', '#6b3d6b', '#1f2f45', '#c96a2f', '#8fb8cc', '#e4c9d0', '#f1efe6', '#445c2f'];
  let x = 2;
  while (x < w - 4) {
    const bw = kind === 'school' ? 5 + R() * 13 : 9 + R() * 20, bh = h * (0.7 + R() * 0.27), c = pal[(R() * pal.length) | 0];
    if (R() < 0.05) { x += 14 + R() * 22; continue; }
    g.fillStyle = c; g.fillRect(x, h - bh, bw - 1, bh);
    g.fillStyle = 'rgba(0,0,0,0.20)'; g.fillRect(x + bw - 2.2, h - bh, 1.2, bh);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, h - bh, 1.1, bh);
    if (bw > 9 && R() < 0.8) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(20,20,30,0.7)'; g.fillRect(x + bw * 0.3, h - bh * (0.75 - R() * 0.2), bw * 0.3, bh * (0.25 + R() * 0.3)); }
    if (R() < 0.35) { g.fillStyle = pal[(R() * pal.length) | 0]; g.fillRect(x, h - bh * 0.22, bw - 1, bh * 0.07); }
    x += bw;
  }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(0.25, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, { repeat: true }));

/** roof tiles · 1 m */
export const roofTex = (base = '#a33d2c') => once('roof' + base, () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(12); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y, w, 2.5); for (let x = (y / 16 % 2) * 8; x < w; x += 16) { g.fillStyle = `rgba(${R() < 0.5 ? '255,200,170' : '40,10,5'},${R() * 0.13})`; g.fillRect(x, y + 3, 15, 13); } }
  speckle(g, w, h, R, 900, 0.1);
}));
/** the front of a neighbour's house: floors of windows · the whole front. lit = the same windows at night (emissive) */
export const facadeTex = (base, seed, floors, cols, lit = false) => once(`fac${base}${seed}${floors}${cols}${lit}`, () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(seed * 131 + 17);
  if (lit) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
  else {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(60,50,40,${0.03 + R() * 0.07})`; g.fillRect(R() * w, 0, 3 + R() * 10, h); }
  }
  const fh = h / floors, cw = w / cols;
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const ww = cw * (0.5 + R() * 0.25), wh = fh * (0.42 + R() * 0.18), x = c * cw + (cw - ww) / 2, y = f * fh + fh * 0.2;
    if (lit) { if (R() < 0.42) { g.fillStyle = ['#ffd58a', '#ffe9b8', '#cfe6ff', '#ffc46b'][(R() * 4) | 0]; g.globalAlpha = 0.5 + R() * 0.5; g.fillRect(x + 2, y + 2, ww - 4, wh - 4); g.globalAlpha = 1; } else R(); continue; }
    g.fillStyle = shade(base, 0.35); g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
    g.fillStyle = ['#2b3b47', '#34454f', '#1f2b33', '#3f5560'][(R() * 4) | 0]; g.fillRect(x, y, ww, wh);
    g.strokeStyle = shade(base, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.stroke();
    if (R() < 0.5) { g.fillStyle = shade(base, -0.18); g.fillRect(c * cw + 4, y + wh + 4, cw - 8, fh * 0.1); }       // a balcony slab
    if (R() < 0.3) { g.fillStyle = '#d9d9d2'; g.fillRect(x + ww + 2, y + wh * 0.5, 9, 7); }                           // an air conditioner
  }
  if (!lit) speckle(g, w, h, R, 700, 0.06);
}, { repeat: false }));

/* ── materials ───────────────────────────────────────────────────────── */
const mats = new Map();
const mat = (key, fn) => { let m = mats.get(key); if (!m) mats.set(key, m = fn()); return m; };
const std = o => new THREE.MeshStandardMaterial(o);

export const M = {
  /** wood by colour; gloss 0 (matt) … 1 (lacquered) */
  wood: (c, gloss = 0.5, seed = 1) => mat(`wood${c}${gloss}${seed}`, () => std({ map: woodTex(c, seed), roughness: 0.62 - gloss * 0.4, metalness: 0 })),
  /** A plain colour. Not a material of its own: the builder paints it on the vertices and files the piece under one of a
   *  dozen shared materials (by sheen), so a hundred coloured trifles cost a handful of draw calls. */
  plain: (c, rough = 0.8, metal = 0) => mat(`plain${c}${rough}${metal}`, () => {
    const r = rough < 0.22 ? 0.14 : rough < 0.38 ? 0.3 : rough < 0.52 ? 0.45 : rough < 0.7 ? 0.6 : rough < 0.9 ? 0.8 : 0.95, m = metal < 0.2 ? 0 : metal < 0.6 ? 0.4 : 0.85;
    const col = new THREE.Color(c);
    return { isPlain: true, rgb: [col.r, col.g, col.b], uuid: `plain${r}${m}`, userData: {}, mat: mat(`vc${r}${m}`, () => std({ vertexColors: true, roughness: r, metalness: m })) };
  }),
  /** the same colour as a material of its own (for the few things that are not built by a builder) */
  solid: (c, rough = 0.8, metal = 0) => mat(`solid${c}${rough}${metal}`, () => std({ color: c, roughness: rough, metalness: metal })),
  paint: (c = '#efe9dc') => mat('paint' + c, () => std({ map: paintTex(c), roughness: 0.96 })),
  glow: (c, k = 1) => mat(`glow${c}${k}`, () => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }); m.userData.noCast = true; m.toneMapped = true; return m; }),
  floor: () => mat('floor', () => std({ map: planksTex(), roughness: 0.42 })),
  terracotta: () => mat('terra', () => std({ map: tileTex('#b8683c', '#6b3f2a', 4, 0.07, 3), roughness: 0.38 })),
  balconyTile: () => mat('baltile', () => std({ map: tileTex('#b9603a', '#75432e', 4, 0.08, 9), roughness: 0.5 })),
  cement: () => mat('cement', () => std({ map: cementTex(), roughness: 0.72 })),
  wallTile: () => mat('walltile', () => std({ map: tileTex('#e9e2cf', '#bdb49d', 4, 0.03, 5), roughness: 0.3 })),
  bathTile: () => mat('bathtile', () => std({ map: tileTex('#8fa3b3', '#5f6f7c', 4, 0.05, 6), roughness: 0.3 })),
  whiteTile: () => mat('whitetile', () => std({ map: tileTex('#e8e6de', '#b8b5aa', 4, 0.02, 7), roughness: 0.35 })),
  stone: () => mat('stone', () => std({ map: stoneTex(), roughness: 0.85 })),
  concrete: (c = '#d8cfba', seed = 5, stain = 0.5) => mat('conc' + c + seed, () => std({ map: concreteTex(c, seed, stain), roughness: 0.95 })),
  glass: (tint = '#cfe3e6', op = 0.16) => mat('glass' + tint + op, () => { const m = std({ color: tint, roughness: 0.04, metalness: 0, transparent: true, opacity: op, depthWrite: false }); m.userData.noCast = true; m.userData.order = 3; return m; }),
  chrome: () => mat('chrome', () => std({ color: '#d9dcdf', roughness: 0.22, metalness: 1 })),
  steelWhite: () => mat('steelw', () => std({ color: '#f1f0ea', roughness: 0.55, metalness: 0.1 })),
  steelDark: () => mat('steeld', () => std({ color: '#3c4046', roughness: 0.6, metalness: 0.35 })),
  steelGrey: () => mat('steelg', () => std({ color: '#8f958e', roughness: 0.6, metalness: 0.3 })),
  pianoBlack: () => mat('piano', () => std({ color: '#070707', roughness: 0.1, metalness: 0 })),
  cloth: (tex, rough = 0.95) => mat('cloth' + tex.uuid, () => std({ map: tex, roughness: rough })),
  alpha: (tex, o = {}) => mat('alpha' + tex.uuid, () => { const m = std({ map: tex, roughness: 0.9, transparent: false, alphaTest: o.test ?? 0.5, side: THREE.DoubleSide }); if (o.noCast) m.userData.noCast = true; return m; }),
  books: (seed, kind) => mat('books' + seed + kind, () => std({ map: booksTex(seed, kind), roughness: 0.85 })),
  screen: tex => { const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); m.userData.noCast = true; return m; },
};

/** a small canvas with text or a drawing, as an unlit or lit plate */
export function plateTex(w, h, draw) { return canvasTex(w, h, draw, { repeat: false }); }
