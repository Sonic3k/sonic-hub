/* The surfaces of this place, drawn on canvases like everything in Nơi chốn (no image is loaded). Sizes in the
   comments are what one repeat stands for. Colours are taken off the photographs of August–September 2015. */
import * as THREE from 'three';
import { canvasTex, rng, shade, M, woodTex } from '../../engine/tex.js';

const cache = new Map();
const once = (k, f) => { let v = cache.get(k); if (!v) cache.set(k, v = f()); return v; };
const std = o => new THREE.MeshStandardMaterial(o);
function speck(g, w, h, R, n, a, light = false, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${light ? '255,255,255' : '0,0,0'},${(R() * a).toFixed(3)})`; g.fillRect(R() * w, R() * h, 1 + R() * s, 1 + R() * s); } }
function blotch(g, w, h, R, n, col, a, r0, r1) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${col},${(a * R()).toFixed(3)})`; g.beginPath(); g.ellipse(R() * w, R() * h, r0 + R() * r1, r0 + R() * r1 * 0.6, R() * 3, 0, 7); g.fill(); } }

/* ── stucco and paint ── */
/** sand-finish stucco · 2 m */
export const stuccoTex = (base, seed = 1) => once('stucco' + base + seed, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed * 41 + 3); g.fillStyle = base; g.fillRect(0, 0, w, h);
  blotch(g, w, h, R, 70, '90,70,40', 0.022, 10, 50); blotch(g, w, h, R, 40, '255,250,235', 0.025, 10, 50);
  speck(g, w, h, R, 14000, 0.1); speck(g, w, h, R, 7000, 0.09, true);
}, { aniso: 8 }));
/** the popcorn ceiling · 1 m */
const popcornTex = () => once('popcorn', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(9); g.fillStyle = '#efeadf'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 200 + R() * 55; g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.beginPath(); g.arc(R() * w, R() * h, 0.6 + R() * 1.6, 0, 7); g.fill(); }
}));
/** clay S-tiles, courses 0.33 m, tiles 0.25 m · 1 m */
const tileRoofTex = (base = '#b4553a', seed = 2) => once('roof' + base + seed, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed * 13); g.fillStyle = shade(base, -0.35); g.fillRect(0, 0, w, h);
  const rows = 3, cols = 4, rh = h / rows, cw = w / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw + (r % 2) * cw * 0.5, y = r * rh, f = (R() - 0.5) * 0.24, col = shade(base, f), dark = shade(base, f - 0.32);
    for (const dx of [0, -w, w]) {
      const gr = g.createLinearGradient(x + dx, 0, x + dx + cw, 0);
      gr.addColorStop(0, dark); gr.addColorStop(0.18, col); gr.addColorStop(0.42, shade(base, f + 0.16)); gr.addColorStop(0.62, col); gr.addColorStop(1, dark);
      g.fillStyle = gr; g.fillRect(x + dx + 1, y + 2, cw - 2, rh - 4);
    }
    g.fillStyle = 'rgba(30,10,5,0.45)'; g.fillRect(0, y + rh - 5, w, 5);     // the shadow under each course
    if (R() < 0.3) { g.fillStyle = `rgba(${R() < 0.5 ? '60,60,50' : '230,210,170'},0.12)`; g.fillRect(x, y, cw, rh); }
  }
  speck(g, w, h, R, 3500, 0.12); speck(g, w, h, R, 1200, 0.1, true);
}, { aniso: 16 }));

/* ── floors ── */
/** the studio's carpet: a loop pile in fine ribs, brown flecked with sand and umber along them · 1 m */
const carpetTex = () => once('carpet3', () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(77); g.fillStyle = '#5c4b37'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(0,0,0,${(0.1 + R() * 0.06).toFixed(3)})`; g.fillRect(0, y, w, 1.5); }
  for (let i = 0; i < 2600; i++) {
    const y = ((R() * h / 4) | 0) * 4 + 2.6, x = R() * w, len = 6 + R() * 46, c = ['#7d6a4c', '#43382a', '#8f7a5a', '#66563f', '#372e22', '#9c8763', '#5a4832'][(R() * 7) | 0];
    g.strokeStyle = c; g.globalAlpha = 0.3 + R() * 0.45; g.lineWidth = 1.2 + R() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    if (x + len > w) { g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + len - w, y); g.stroke(); }
  }
  g.globalAlpha = 1; speck(g, w, h, R, 5000, 0.14); speck(g, w, h, R, 1500, 0.07, true);
}, { aniso: 16 }));
/** wood-look vinyl planks of the kitchen · 1.2 m along the planks */
const vinylTex = () => once('vinyl', () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(5); const rows = 8, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -R() * 300;
    while (x < w) {
      const len = 220 + R() * 160, c = shade(['#6e4a2e', '#7b5434', '#5f3e27', '#83603e'][(R() * 4) | 0], (R() - 0.5) * 0.1);
      g.fillStyle = c; g.fillRect(x, r * rh, len, rh);
      for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(30,15,5,${0.08 + R() * 0.12})`; g.lineWidth = 0.6 + R(); const yy = r * rh + R() * rh; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + (R() - 0.5) * 6, x + len * 0.7, yy + (R() - 0.5) * 6, x + len, yy); g.stroke(); }
      g.fillStyle = 'rgba(20,10,4,0.55)'; g.fillRect(x, r * rh, 1.5, rh);
      x += len;
    }
    g.fillStyle = 'rgba(20,10,4,0.5)'; g.fillRect(0, r * rh, w, 1.4);
  }
  speck(g, w, h, R, 1500, 0.06);
}, { aniso: 16 }));
/** poured concrete with saw-cut joints · 1.5 m (one panel) */
export const concTex = (base = '#b9b5ac', seed = 1, joint = true) => once('conc' + base + seed + joint, () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(seed * 7 + 1); g.fillStyle = base; g.fillRect(0, 0, w, h);
  blotch(g, w, h, R, 24, '80,70,60', 0.07, 10, 50); speck(g, w, h, R, 4000, 0.1); speck(g, w, h, R, 1500, 0.08, true);
  if (joint) { g.fillStyle = 'rgba(40,35,30,0.55)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }
}));
/** asphalt · 4 m */
const asphaltTex = (base, seed) => once('asph' + base + seed, () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  blotch(g, w, h, R, 40, '0,0,0', 0.08, 30, 120); blotch(g, w, h, R, 20, '255,255,255', 0.035, 30, 120);
  speck(g, w, h, R, 16000, 0.22); speck(g, w, h, R, 9000, 0.16, true, 1.6);
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(10,10,10,0.25)'; g.lineWidth = 1; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (R() - 0.5) * 60; y += (R() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
}, { aniso: 16 }));
/** clipped lawn · 2 m */
const lawnTex = () => once('lawn', () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(31); g.fillStyle = '#4f7a2f'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, R, 50, '120,150,60', 0.12, 20, 80); blotch(g, w, h, R, 40, '30,50,15', 0.12, 20, 70);
  for (let i = 0; i < 26000; i++) { const v = R(); g.fillStyle = v < 0.5 ? `rgba(30,60,15,${0.3 + R() * 0.4})` : `rgba(150,190,80,${0.2 + R() * 0.4})`; g.fillRect(R() * w, R() * h, 1, 2 + R() * 3); }
}, { aniso: 8 }));
/** bark mulch of the planters · 1.5 m */
const mulchTex = () => once('mulch', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(17); g.fillStyle = '#5a3b26'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = ['#7a5236', '#3e2718', '#8c6545', '#4d3220'][(R() * 4) | 0]; g.save(); g.translate(R() * w, R() * h); g.rotate(R() * 3.14); g.fillRect(-3, -1, 4 + R() * 6, 1.5 + R() * 1.5); g.restore(); }
}));

/** the gravel of the beds by the way in (decomposed granite, pinkish tan) · 1.5 m */
const gravelTex = () => once('gravel', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(23); g.fillStyle = '#c4a283'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, R, 24, '220,190,160', 0.12, 12, 50); blotch(g, w, h, R, 20, '120,90,70', 0.1, 12, 50);
  for (let i = 0; i < 5200; i++) { g.fillStyle = ['#a8876b', '#d8bb9c', '#8d7058', '#e3cdb2', '#b79679'][(R() * 5) | 0]; g.fillRect(R() * w, R() * h, 1 + R() * 1.6, 1 + R() * 1.6); }
}));

/* ── cloth ── */
/** the curtains: a tartan on khaki — umber and grey-olive bands, thin lines of dull red and cream · 0.30 m */
const plaidTex = () => once('esaPlaid3', () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9c8667'; g.fillRect(0, 0, w, h);
  const bands = [[0, 30, '#6f5038', 0.55], [30, 5, '#e6d3a6', 0.6], [46, 4, '#8a3d36', 0.85], [62, 40, '#6c6e58', 0.45], [108, 5, '#8a3d36', 0.7], [124, 30, '#6f5038', 0.5], [160, 5, '#e6d3a6', 0.55], [176, 40, '#8f7a58', 0.3], [226, 4, '#8a3d36', 0.8], [240, 10, '#5b4431', 0.5]];
  for (const [p, s, c, a] of bands) { g.globalAlpha = a; g.fillStyle = c; g.fillRect(p, 0, s, h); g.fillRect(0, p, w, s); }
  g.globalAlpha = 1; const R = rng(4); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,240,210'},${(R() * 0.1).toFixed(3)})`; g.fillRect(R() * w, R() * h, 2, 1); }
}));
/** cultured marble of the bathroom's top: sand, flecked with grey and umber · 1 m */
const marbleTex = () => once('marble', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(21); g.fillStyle = '#dccfb3'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { g.fillStyle = ['#9a8f7c', '#b9ab90', '#6f675b', '#efe6d2', '#c9b79a', '#8a7c68'][(R() * 6) | 0]; g.globalAlpha = 0.3 + R() * 0.5; g.beginPath(); g.ellipse(R() * w, R() * h, 0.5 + R() * 1.4, 0.4 + R() * 1.1, R() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}));
/** the tub's surround: six-inch tiles of the same flecked sand, their joints a shade darker · two tiles to a repeat */
const bathTileTex = () => once('bathTile', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(22); g.fillStyle = '#d6c6a5'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) { g.fillStyle = ['#9a8f7c', '#b9ab90', '#77705f', '#ece2cc', '#c4b294'][(R() * 5) | 0]; g.globalAlpha = 0.3 + R() * 0.45; g.beginPath(); g.ellipse(R() * w, R() * h, 0.8 + R() * 2.2, 0.6 + R() * 1.8, R() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(146,124,92,0.62)';
  for (const p of [0, 128, 256]) { g.fillRect(p - 1.25, 0, 2.5, h); g.fillRect(0, p - 1.25, w, 2.5); }
  g.fillStyle = 'rgba(255,250,235,0.16)'; for (const p of [0, 128]) { g.fillRect(p + 1.25, 1.25, 1.5, 126); g.fillRect(p + 1.25, 129.25, 1.5, 126); }      // the glaze catches the light along one edge
}));
/** the white quilted cover: diamond stitching, four diamonds to a repeat (laid 1.48 m to a repeat on the bed) */
const quiltTex = (base = '#f1efe9', line = 'rgba(150,140,125,0.55)') => once('quilt' + base, () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = -2; i < 4; i++) { const sh_ = g.createLinearGradient(0, 0, w, h); sh_.addColorStop(0, 'rgba(0,0,0,0.03)'); sh_.addColorStop(1, 'rgba(255,255,255,0.03)'); g.fillStyle = sh_; }
  g.strokeStyle = line; g.lineWidth = 1.6;
  for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + h, h); g.stroke(); g.beginPath(); g.moveTo(i * 64 + h, 0); g.lineTo(i * 64, h); g.stroke(); }
  const R = rng(3); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.04})`; g.beginPath(); g.ellipse(R() * w, R() * h, 10 + R() * 30, 6 + R() * 20, R() * 3, 0, 7); g.fill(); }
}));
/** the runner across the foot of the bed: tan, quilted in diamonds half its width across, between two dark brown borders,
    each `border` of its width · the whole runner along V, one diamond pair along U */
const runnerTex = (border) => once('runner' + border.toFixed(3), () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b38f5f'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,55,30,0.45)'; g.lineWidth = 1.6;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128 + h, h); g.stroke(); g.beginPath(); g.moveTo(i * 128 + h, 0); g.lineTo(i * 128, h); g.stroke(); }
  const bw = Math.round(h * border); g.fillStyle = '#4a3527'; g.fillRect(0, 0, w, bw); g.fillRect(0, h - bw, w, bw);
  const R = rng(8); speck(g, w, h, R, 1500, 0.08);
}, { repeat: true }));
/** faux leather, dark brown · 0.5 m */
const leatherTex = () => once('leather', () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(6); g.fillStyle = '#3a2620'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, R, 30, '255,230,210', 0.05, 10, 40); speck(g, w, h, R, 3000, 0.12);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(0,0,0,${0.08 + R() * 0.1})`; g.lineWidth = 1; g.beginPath(); const x = R() * w, y = R() * h; g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 20, x + (R() - 0.5) * 60, y + (R() - 0.5) * 30); g.stroke(); }
}));
/** knotty pine of the dresser and nightstand · 1 m */
const pineTex = () => once('pine', () => {
  const t = woodTex('#c48a4c', 7);
  const c = t.image, g = c.getContext('2d'), R = rng(12);
  for (let i = 0; i < 9; i++) { const x = R() * c.width, y = R() * c.height, r = 4 + R() * 9; const gr = g.createRadialGradient(x, y, 1, x, y, r * 2.4); gr.addColorStop(0, 'rgba(70,30,10,0.85)'); gr.addColorStop(0.35, 'rgba(110,55,20,0.5)'); gr.addColorStop(1, 'rgba(110,55,20,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 3.2, r * 1.6, 0, 0, 7); g.fill(); }
  t.needsUpdate = true; return t;
});

/* ── materials ── */
const mats = new Map();
const mat = (k, f) => { let m = mats.get(k); if (!m) mats.set(k, m = f()); return m; };
export const X = {
  stucco: (c = '#dcc58a', seed = 1) => mat('stucco' + c + seed, () => std({ map: stuccoTex(c, seed), roughness: 0.95 })),
  roomWall: (c) => mat('rw' + c, () => std({ color: c, roughness: 0.92 })),
  ceiling: () => mat('ceil', () => std({ map: popcornTex(), roughness: 1 })),
  roof: (c, seed) => mat('roof' + c + seed, () => std({ map: tileRoofTex(c, seed), roughness: 0.78 })),
  carpet: () => mat('carpet', () => std({ map: carpetTex(), roughness: 1 })),
  vinyl: () => mat('vinyl', () => std({ map: vinylTex(), roughness: 0.45 })),
  conc: (c, seed, j) => mat('conc' + c + seed + j, () => std({ map: concTex(c, seed, j), roughness: 0.92 })),
  asphalt: (c = '#3b3b3b', seed = 3) => mat('asph' + c + seed, () => std({ map: asphaltTex(c, seed), roughness: 0.93 })),
  lawn: () => mat('lawn', () => std({ map: lawnTex(), roughness: 0.95 })),
  mulch: () => mat('mulch', () => std({ map: mulchTex(), roughness: 1 })),
  gravel: () => mat('gravel', () => std({ map: gravelTex(), roughness: 1 })),
  plaid: () => mat('plaid', () => std({ map: plaidTex(), roughness: 0.95, side: THREE.DoubleSide })),
  quilt: () => mat('quilt', () => std({ map: quiltTex(), roughness: 0.9 })),
  marble: () => mat('marble', () => std({ map: marbleTex(), roughness: 0.32 })),
  marbleIn: () => mat('marbleIn', () => std({ map: marbleTex(), roughness: 0.3, side: THREE.DoubleSide })),
  bathTile: () => mat('bathTile', () => std({ map: bathTileTex(), roughness: 0.38 })),
  /** chromed brass: not a pure mirror, so that by one lamp at night it still reads as bright metal */
  chrome: () => mat('chrome2', () => std({ color: '#e4e7e9', roughness: 0.26, metalness: 0.62 })),
  runner: (border = 0.075) => mat('runner' + border.toFixed(3), () => std({ map: runnerTex(border), roughness: 0.9 })),
  leather: () => mat('leather', () => std({ map: leatherTex(), roughness: 0.55 })),
  pine: () => mat('pine', () => std({ map: pineTex(), roughness: 0.5 })),
  laminate: (c = '#f3f1ea') => mat('lam' + c, () => std({ color: c, roughness: 0.35 })),
  oak: () => M.wood('#b8762e', 0.6, 4),
  espresso: () => M.wood('#1c1310', 0.5, 6),
  walnut: () => M.wood('#4b2e1e', 0.5, 9),
  steel: () => mat('steel', () => std({ color: '#c9ccce', roughness: 0.28, metalness: 0.9 })),
  black: () => mat('blk', () => std({ color: '#0d0d0f', roughness: 0.25 })),
  glassDark: () => mat('gdark', () => { const m = std({ color: '#2a3238', roughness: 0.06, metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false }); m.userData.noCast = true; m.userData.order = 3; return m; }),
};
export { M };
