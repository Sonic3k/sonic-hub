/* Living room, kitchen, the wet rooms, the loggia, the two balconies and the gallery: what stood where,
   after the 2013 videos, the 2012 photos of the rehearsal at home and the two Tết 2009 photos. */
import * as THREE from 'three';
import { M, canvasTex, plateTex, tileTex, stoneTex, rng } from './tex.js';
import { part } from './kit.js';
import * as P from './plan.js';
import { C, wood, N, S, W, E, wardrobe, cabinet, drawers, chair, stool, table, carvedSeat, teaTable, fanHead, standFan, bottle, jar, vase, pot, papers, figures, clockFace, lace, switchPlate, blob, pillow } from './furn.js';

const G = { grain: 'y', uv: [1, 1] }, U = { uv: [1, 1] };
const { H } = P;

/* ── living room ─────────────────────────────────────────────────────── */
export function buildLiving(b, ctx) {
  const sofa = wood(C.sofa, 0.8), cherry = wood(C.cherry, 0.75), mah = wood(C.mahog, 0.85), ch = M.chrome();
  const yellow = M.plain('#e9d86a', 0.9), lime = M.plain('#d6e08a', 0.9);

  // the long seat against the gallery wall, its end table and flowers
  N(b, 2.74, 0.04); carvedSeat(b, 1.92, { panels: 3 });
  b.box(lime, 0.14, 0.39, 0.16, 0.6, 0.46, 0.56, {}); b.sphere(yellow, 1.62, 0.6, 0.2, 0.5, { sx: 0.42, sy: 0.42, sz: 0.13, rx: -14 });
  b.pop();
  blob(b, 2.74, 0.04, 4.66, 0.66, 0.45);
  b.push(2.16, 0, 0.08, 0); table(b, 0.48, 0.56, 0.48, { mat: sofa, shelf: 0.2, leg: 0.045 });
  vase(b, 0.17, 0.56, 0.2, { color: '#dfe6ea', h: 0.2, r: 0.055, n: 12, seed: 4 }); papers(b, 0.33, 0.56, 0.3, 0.2, 0.14, 0.012, 3); b.box(M.plain('#f4f2ec', 0.8), 0.3, 0.56, 0.08, 0.32, 0.78, 0.26, {});
  b.pop();
  // the single seat, its back to the balcony
  W(b, 1.5, 1.8); carvedSeat(b, 0.68, { panels: 1, d: 0.6 }); b.pop();
  blob(b, 1.5, 1.12, 2.1, 1.8, 0.4);
  // tea table and what is always on it
  b.push(2.8, 0, 1.04, 0); teaTable(b, 1.12, 0.56);
  const ty = 0.475;
  b.box(M.plain('#9ad233', 0.6), 0.56, ty, 0.2, 0.78, ty + 0.06, 0.36, {}); jar(b, '#f4f1e8', 0.64, ty + 0.01, 0.26, 0.03, 0.05, '#f1f1f1');
  jar(b, '#f0a23a', 0.42, ty, 0.14, 0.04, 0.11, '#f3d23a'); b.cyl(M.plain('#2f5fa8', 0.35), 0.86, ty, 0.2, 0.055, 0.13, { seg: 14 }); b.cyl(M.plain('#f2f2f0', 0.4), 0.86, ty + 0.13, 0.2, 0.057, 0.012, { seg: 14 });
  b.cyl(M.glass('#3fae5a', 0.55), 0.3, ty, 0.36, 0.035, 0.09, { seg: 12, cast: false }); b.box(M.plain('#141414', 0.5), 0.5, ty, 0.42, 0.67, ty + 0.018, 0.465, {});
  b.box(M.plain('#6fbf5a', 0.7), 0.3, 0.17, 0.2, 0.52, 0.24, 0.32, {}); papers(b, 0.78, 0.17, 0.28, 0.3, 0.2, 0.03, 8, ['#f4efe4', '#dbe7f2', '#f2dfe2']);
  b.pop();
  blob(b, 2.8, 1.04, 3.92, 1.6, 0.42);
  // the rack of snacks and the misting fan in the corner
  b.push(4.74, 0, 0.1, 0);
  for (const [x, z] of [[0, 0], [0.3, 0], [0, 0.26], [0.3, 0.26]]) b.box(ch, x, 0, z, x + 0.012, 0.62, z + 0.012, {});
  for (const y of [0.1, 0.34, 0.58]) b.box(M.plain('#d9dadb', 0.4, 0.5), 0, y, 0, 0.312, y + 0.01, 0.272, {});
  const R = rng(5); for (const y of [0.11, 0.35]) for (let i = 0; i < 4; i++) b.box(M.plain(['#e8443a', '#f5c63a', '#3aa0d8', '#6fbf3a', '#f08a3a'][(R() * 5) | 0], 0.6), 0.02 + i * 0.07, y, 0.03, 0.08 + i * 0.07, y + 0.13 + R() * 0.06, 0.22, {});
  b.pop();
  b.push(5.22, 0, 0.5, 215);
  b.cyl(M.plain('#121214', 0.35), 0, 0, 0, 0.15, 0.34, { seg: 18, r2: 0.13 }); b.cyl(M.plain('#2a2a2e', 0.4), 0, 0.34, 0, 0.022, 0.72, { seg: 10 });
  b.bar(M.plain('#2a2a2e', 0.4), 0.05, 0.5, 0.04, 0.06, 1.02, 0.07, 0.014, { round: true });
  b.push(0, 1.12, 0.03, 0); fanHead(b, 0.21, { color: '#1c1c20', cage: '#55585c', blade: '#8a8f96' }); b.pop();
  b.solid(-0.14, 0, -0.14, 0.14, 1, 0.14); b.pop();
  blob(b, 5.08, 0.36, 5.36, 0.64, 0.4);

  // helmets by the door, the mat, sandals at the balcony
  b.push(0.05, 0, 0.05, 0);
  for (const [x, z] of [[0, 0], [0.3, 0], [0, 0.36], [0.3, 0.36]]) b.box(ch, x, 0, z, x + 0.012, 0.98, z + 0.012, {});
  for (const y of [0.16, 0.52, 0.86]) for (let z = 0.01; z < 0.37; z += 0.06) b.box(ch, 0, y, z, 0.31, y + 0.008, z + 0.008, { cast: false });
  b.sphere(M.plain('#2f7fc6', 0.35), 0.16, 1.0, 0.19, 0.5, { sx: 0.27, sy: 0.22, sz: 0.3 }); b.sphere(M.plain('#2a93c9', 0.35), 0.16, 0.65, 0.19, 0.5, { sx: 0.27, sy: 0.22, sz: 0.3 });
  b.sphere(M.plain('#c9342c', 0.8), 0.16, 0.27, 0.19, 0.5, { sx: 0.28, sy: 0.2, sz: 0.3 });
  b.solid(0, 0, 0, 0.31, 1, 0.37); b.pop();
  b.box(M.plain('#3a3432', 1), 0.62, 0, 0.2, 1.28, 0.012, 0.62, { cast: false });
  const sand = (x, z, ry, c) => { b.rbox(M.plain(c, 0.8), x, 0.012, z, 0.09, 0.022, 0.24, ry, { cast: false }); b.rbox(M.plain(c, 0.8), x + 0.12, 0.012, z + 0.02, 0.09, 0.022, 0.24, ry + 8, { cast: false }); };
  sand(0.42, 1.2, 80, '#2b2623'); sand(0.5, 1.75, 95, '#5a3a22'); sand(0.34, 2.2, 70, '#1e1e20');
  b.box(M.plain('#4a4240', 1), 0.05, 0, 1.15, 0.38, 0.01, 1.85, { cast: false });

  // water dispenser and its spare bottle
  b.push(0.62, 0, 3.14, 0);
  b.box(M.plain('#f1f0ec', 0.4), 0, 0, 0, 0.32, 0.96, 0.33, { solid: true }); b.box(M.plain('#c9ccd0', 0.4), 0.03, 0.62, -0.006, 0.29, 0.86, 0, { cast: false });
  b.box(M.plain('#d8413a', 0.4), 0.08, 0.7, -0.03, 0.12, 0.74, 0, { cast: false }); b.box(M.plain('#3a6fd8', 0.4), 0.2, 0.7, -0.03, 0.24, 0.74, 0, { cast: false });
  b.cyl(M.glass('#6fb6e8', 0.5), 0.16, 0.96, 0.165, 0.135, 0.3, { seg: 16, cast: false }); b.cyl(M.glass('#6fb6e8', 0.5), 0.16, 1.26, 0.165, 0.135, 0.08, { seg: 16, r2: 0.04, cast: false });
  b.pop();
  b.cyl(M.glass('#6fb6e8', 0.5), 1.1, 0, 3.32, 0.135, 0.34, { seg: 16, cast: false }); b.cyl(M.glass('#6fb6e8', 0.5), 1.1, 0.34, 3.32, 0.135, 0.08, { seg: 16, r2: 0.04, cast: false }); b.cyl(M.plain('#e9e9ea', 0.5), 1.1, 0.42, 3.32, 0.04, 0.03, { seg: 10 });
  blob(b, 0.62, 3.14, 0.94, 3.47, 0.4);

  // the fish tank: mahogany frame in a wall of stacked stone, a low cabinet under it (Tết 2009: the peach branch stood right here)
  {
    const z0 = 2.66, z1 = 3.5;
    b.box(M.stone(), 0, 0, z0, 0.025, 2.12, z1, { uv: [0.9, 0.6] });
    b.box(mah, 0.025, 0.98, z0 + 0.04, 0.33, 1.05, z1 - 0.04, U); b.box(mah, 0.025, 1.66, z0 + 0.04, 0.33, 1.76, z1 - 0.04, U);
    b.box(mah, 0.025, 1.05, z0 + 0.04, 0.33, 1.66, z0 + 0.1, G); b.box(mah, 0.025, 1.05, z1 - 0.1, 0.33, 1.66, z1 - 0.04, G);
    b.box(mah, 0.02, 1.76, z0 + 0.02, 0.35, 1.8, z1 - 0.02, U);
    b.box(M.plain('#c9bfa8', 0.9), 0.03, 1.05, z0 + 0.1, 0.3, 1.1, z1 - 0.1, { cast: false });                       // gravel
    b.box(M.plain('#31452f', 1), 0.027, 1.1, z0 + 0.1, 0.03, 1.66, z1 - 0.1, { cast: false });                       // the painted back
    const R = rng(21), leaf = M.plain('#2f8f45', 0.7);
    for (let i = 0; i < 14; i++) { const z = z0 + 0.14 + R() * (z1 - z0 - 0.28), x = 0.06 + R() * 0.2, hh = 0.12 + R() * 0.3; b.bar(leaf, x, 1.1, z, x + (R() - 0.5) * 0.06, 1.1 + hh, z + (R() - 0.5) * 0.08, 0.012 + R() * 0.012, { cast: false }); }
    b.box(M.plain('#7d7466', 0.9), 0.1, 1.1, z0 + 0.3, 0.2, 1.2, z0 + 0.44, { cast: false });
    const water = new THREE.MeshStandardMaterial({ color: '#6fc2a8', roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, emissive: '#2f8f7a', emissiveIntensity: 0.5 }); water.userData.noCast = true; water.userData.order = 3;
    ctx.water = water;
    b.box(water, 0.03, 1.1, z0 + 0.1, 0.3, 1.63, z1 - 0.1, { cast: false });
    b.box(M.glass('#d8f0ea', 0.2), 0.298, 1.05, z0 + 0.1, 0.304, 1.66, z1 - 0.1, { cast: false });
    cabinet(b.push(0.025, 0, z1 - 0.04, 270), z1 - z0 - 0.08, 0.5, 0.36, 2, { mat: mah, plinth: 0.05, handle: 'none' }); b.pop();
    b.sphere(M.plain('#d8477a', 0.95), 0.2, 0.56, z0 + 0.3, 0.5, { sx: 0.3, sy: 0.14, sz: 0.4 }); b.sphere(M.plain('#c93d6c', 0.95), 0.21, 0.63, z0 + 0.34, 0.5, { sx: 0.26, sy: 0.1, sz: 0.34 });
    ctx.fish = { x0: 0.07, x1: 0.26, y0: 1.2, y1: 1.56, z0: z0 + 0.16, z1: z1 - 0.16 };
    ctx.hot.push({ id: 'fish', pos: [0.34, 1.36, (z0 + z1) / 2], r: 0.45 });
  }

  // the TV wall: tall glass cabinet, the low cabinet, the big wooden Di Lặc holding his ingot up, the altar shelf above
  {
    E(b, 5.6, 0.26);
    // glass cabinet
    const gw = 0.58, gd = 0.4, gh = 1.86;
    b.box(cherry, 0, 0, 0, gw, 0.5, gd, { ...G, solid: true }); drawers(b, cherry, 0.03, gw - 0.03, 0.06, 0.46, gd + 0.012, 2, { hw: 0.07 });
    for (const [x, z] of [[0, 0], [gw - 0.035, 0], [0, gd - 0.035], [gw - 0.035, gd - 0.035]]) b.box(cherry, x, 0.5, z, x + 0.035, gh, z + 0.035, G);
    b.box(cherry, 0, gh - 0.05, 0, gw, gh, gd, U); b.box(cherry, -0.015, gh, -0.005, gw + 0.015, gh + 0.035, gd + 0.015, U); b.box(M.plain('#d9d2c2', 0.7), 0.01, 0.5, 0.005, gw - 0.01, gh - 0.05, 0.012, { cast: false });
    for (const y of [0.84, 1.16, 1.48]) b.box(M.glass('#d8efe8', 0.3), 0.03, y, 0.03, gw - 0.03, y + 0.008, gd - 0.03, { cast: false });
    b.box(M.glass('#e6f3ef', 0.14), 0.035, 0.5, gd - 0.012, gw - 0.035, gh - 0.05, gd - 0.006, { cast: false });
    b.box(cherry, gw / 2 - 0.012, 0.5, gd - 0.02, gw / 2 + 0.012, gh - 0.05, gd, G);
    const Rg = rng(9), glassy = M.glass('#f2fbf8', 0.45);
    for (const y of [0.51, 0.85, 1.17, 1.49]) for (let i = 0; i < 6; i++) { const x = 0.07 + i * 0.085 + (Rg() - 0.5) * 0.02, z = 0.1 + Rg() * 0.2; if (Rg() < 0.55) b.cyl(glassy, x, y, z, 0.022, 0.07 + Rg() * 0.08, { seg: 8, r2: 0.028, cast: false }); else b.sphere(M.plain(['#f2efe6', '#f1b6c6', '#b7dba0', '#f0d76a', '#e6534a'][(Rg() * 5) | 0], 0.5), x, y + 0.035, z, 0.035 + Rg() * 0.015, { seg: 8 }); }
    b.solid(0, 0, 0, gw, gh, gd);
    // low cabinet
    const x0 = gw, w = 1.56, d = 0.46, h = 0.56;
    b.box(cherry, x0, h - 0.035, 0, x0 + w, h, d + 0.01, U); b.box(cherry, x0, 0.05, 0, x0 + w, h - 0.035, 0.02, G);
    b.box(cherry, x0, 0.05, 0, x0 + 0.025, h - 0.035, d, G); b.box(cherry, x0 + w - 0.025, 0.05, 0, x0 + w, h - 0.035, d, G);
    b.box(cherry, x0 + 0.02, 0, 0.03, x0 + w - 0.02, 0.05, d - 0.04, U); b.box(cherry, x0, 0.05, 0, x0 + w, 0.075, d, U);
    b.box(cherry, x0 + 0.86, 0.05, 0, x0 + 0.885, h - 0.035, d, G); b.box(cherry, x0 + 0.025, 0.3, 0, x0 + 0.86, 0.322, d - 0.03, U);
    drawers(b, cherry, x0 + 0.9, x0 + w - 0.2, 0.09, h - 0.05, d, 3, { hw: 0.07 });
    b.box(cherry, x0 + 0.885, 0.075, 0.02, x0 + w - 0.19, h - 0.035, d - 0.016, G);
    for (const y of [0.075, 0.24, 0.4]) b.box(cherry, x0 + w - 0.19, y, 0.02, x0 + w - 0.03, y + 0.02, d - 0.04, U);
    b.box(M.plain('#c9c9c6', 0.35, 0.4), x0 + 0.18, 0.325, 0.08, x0 + 0.62, 0.38, 0.36, {}); b.box(M.plain('#17171a', 0.4), x0 + 0.2, 0.08, 0.1, x0 + 0.6, 0.13, 0.36, {});
    b.cyl(M.plain('#e8e4d8', 0.3), x0 + w - 0.11, 0.095, 0.2, 0.05, 0.12, { seg: 12, r2: 0.02 });
    papers(b, x0 + 0.98, h, 0.3, 0.26, 0.19, 0.012, 4, ['#f4f2ea', '#bcd6ea', '#eef0f2']); papers(b, x0 + 1.12, h + 0.012, 0.22, 0.2, 0.15, 0.008, 6, ['#6fa8d8', '#f3f0e8']);
    jar(b, '#f2f0ea', x0 + 0.07, h, 0.2, 0.045, 0.1, '#f2f0ea'); b.cyl(M.plain('#f2f0ea', 0.3), x0 + 0.07, h + 0.1, 0.2, 0.02, 0.04, { seg: 8 });
    b.solid(x0, 0, 0, x0 + w, 0.56, d);
    ctx.tvSpot = b.m.clone().multiply(new THREE.Matrix4().makeTranslation(x0 + 0.62, h, 0.22));
    // the statue
    b.push(x0 + w - 0.26, h, 0.24, 0); diLac(b); b.pop();
    b.pop();
    ctx.hot.push({ id: 'dilac', pos: [5.36, 1.2, 2.14], r: 0.4 }, { id: 'tv', pos: [5.36, 1.27, 1.46], r: 0.42 });
    blob(b, 5.14, 0.26, 5.6, 2.4, 0.45);
    // a little stool in front
    b.push(4.72, 0, 1.25, 0); stool(b, { w: 0.3, h: 0.34 }); b.pop();
    // altar shelf, high in the corner
    const ax = 5.6, alt = wood('#3a1a12', 0.7);
    b.box(alt, ax - 0.3, 2.1, 0.2, ax, 2.135, 0.94, U);
    for (const z of [0.3, 0.84]) { b.bar(M.plain('#b9b4a8', 0.4, 0.6), ax - 0.01, 2.1, z, ax - 0.27, 2.1, z, 0.016); b.bar(M.plain('#b9b4a8', 0.4, 0.6), ax - 0.012, 1.86, z, ax - 0.25, 2.1, z, 0.014); b.bar(M.plain('#b9b4a8', 0.4, 0.6), ax - 0.012, 1.86, z, ax - 0.012, 2.1, z, 0.014); }
    b.cyl(M.plain('#b08a3a', 0.4, 0.6), ax - 0.15, 2.135, 0.57, 0.05, 0.055, { seg: 14, r2: 0.06 });
    for (let i = 0; i < 5; i++) b.bar(M.plain('#7a2a1a', 0.9), ax - 0.15 + (i - 2) * 0.008, 2.19, 0.57, ax - 0.15 + (i - 2) * 0.014, 2.4, 0.57 + (i - 2) * 0.004, 0.003, { cast: false });
    for (const z of [0.4, 0.74]) { b.cyl(M.plain('#b8322a', 0.4), ax - 0.13, 2.135, z, 0.014, 0.1, { seg: 8 }); b.sphere(ctx.lampMat('#ff5a3a', 1.6, 0.5, 1.2), ax - 0.13, 2.25, z, 0.014, { seg: 8, cast: false }); }
    pot(b, ax - 0.16, 2.135, 0.27, { r: 0.05, h: 0.07, n: 9, ph: 0.09, leaf: '#3f8a45', color: '#e8e2d2' });
    b.cyl(M.plain('#e9e6de', 0.3), ax - 0.16, 2.135, 0.86, 0.06, 0.014, { seg: 14 }); for (const [dx, dz] of [[0, 0], [0.035, 0.01], [-0.02, 0.03]]) b.sphere(M.plain('#e8a33a', 0.6), ax - 0.16 + dx, 2.175, 0.86 + dz, 0.026, { seg: 8 });
  }

  // on the walls: the pendulum clock over the seat, a small frame by the kitchen, switches
  {
    const cx = 2.34, cy = 2.12;
    b.cyl(wood('#2c130d', 0.7), cx, cy, 0.0, 0.16, 0.05, { rx: 90, seg: 24 });
    b.quad(new THREE.MeshStandardMaterial({ map: clockFace(256), roughness: 0.6 }), '+z', cx, cy, 0.052, 0.26, 0.26, { cast: false });
    b.box(wood('#2c130d', 0.7), cx - 0.075, cy - 0.42, 0, cx + 0.075, cy - 0.12, 0.045, G); b.box(M.plain('#120a06', 0.6), cx - 0.05, cy - 0.39, 0.045, cx + 0.05, cy - 0.17, 0.047, { cast: false });
    ctx.clocks.push({ x: cx, y: cy, z: 0.058, ry: 0, r: 0.1 }); ctx.pendulum = { x: cx, y: cy - 0.17, z: 0.05 };
    b.box(wood('#2c130d', 0.6), 0.5, 1.5, 3.47, 0.72, 1.82, 3.5, U); b.box(M.plain('#d9cfb6', 0.8), 0.53, 1.53, 3.465, 0.69, 1.79, 3.47, { cast: false });
    switchPlate(b, 1.83, 1.3, 0.07, '+z'); switchPlate(b, 3.5, 1.3, 3.5, '-z'); switchPlate(b, 4.3, 1.3, 3.5, '-z');
    b.box(M.plain('#f4f3ee', 0.4), 3.45, 0.32, 0, 3.57, 0.4, 0.008, { cast: false });
  }
  // the ceiling lamp: a square wooden frame with four shades
  {
    const fx = 2.75, fz = 1.75, fr = wood('#5a2a18', 0.6), shade_ = ctx.lampMat('#fff0d0', 2.2, 0.9);
    b.box(fr, fx - 0.3, H - 0.1, fz - 0.3, fx + 0.3, H - 0.06, fz + 0.3, { ...U, cast: false }); b.box(fr, fx - 0.04, H - 0.06, fz - 0.04, fx + 0.04, H, fz + 0.04, { cast: false });
    for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) b.box(shade_, fx + dx - 0.085, H - 0.19, fz + dz - 0.085, fx + dx + 0.085, H - 0.1, fz + dz + 0.085, { cast: false });
    for (const [x, z] of [[1.2, 0.9], [4.3, 0.9], [1.2, 2.7], [4.3, 2.7]]) b.cyl(ctx.lampMat('#fff4dc', 1.6, 0.9), x, H - 0.012, z, 0.045, 0.012, { seg: 12, cast: false });
  }
  ctx.hot.push({ id: 'door507', pos: [1.38, 1.5, -0.3], r: 0.4 });
}

/** Di Lặc in carved wood, the ingot held overhead with both hands (drawn simply: a silhouette you know across the room). */
function diLac(b) {
  const m = wood('#cf8f38', 0.85, 3), dk = wood('#a86a24', 0.8, 4);
  b.box(dk, -0.18, 0, -0.14, 0.18, 0.09, 0.14, U); b.cyl(dk, 0, 0.09, 0, 0.18, 0.035, { seg: 16, r2: 0.16 });
  b.cyl(m, 0, 0.11, 0, 0.2, 0.26, { seg: 18, r2: 0.17 });                      // the robe, wide at the hem
  b.sphere(m, 0, 0.47, 0.02, 0.5, { sx: 0.4, sy: 0.4, sz: 0.38, seg: 18 });    // the belly
  b.sphere(m, 0, 0.62, -0.01, 0.5, { sx: 0.34, sy: 0.2, sz: 0.26, seg: 14 });  // chest and shoulders
  b.sphere(m, 0, 0.76, 0, 0.105, { seg: 16 });                                 // the head
  b.sphere(dk, 0, 0.735, 0.085, 0.5, { sx: 0.09, sy: 0.022, sz: 0.03, seg: 8, cast: false });   // the laugh
  for (const s of [-1, 1]) {
    b.sphere(m, s * 0.105, 0.74, 0, 0.03, { sy: 1.9, sx: 0.55, seg: 8 });      // long ears
    b.bar(m, s * 0.15, 0.64, 0, s * 0.235, 0.83, 0, 0.078, { round: true, seg: 10 });   // arms: out, then up to the ingot
    b.bar(m, s * 0.235, 0.83, 0, s * 0.17, 0.99, 0, 0.066, { round: true, seg: 10 });
    b.sphere(m, s * 0.235, 0.83, 0, 0.042, { seg: 8 }); b.sphere(m, s * 0.17, 1.0, 0, 0.042, { seg: 8 });
    b.cyl(dk, s * 0.11, 0.09, 0.11, 0.035, 0.018, { seg: 10 });                // coins at his feet
  }
  b.sphere(m, 0, 1.05, 0, 0.5, { sx: 0.46, sy: 0.12, sz: 0.2, seg: 16 });      // the ingot
  b.sphere(m, 0, 1.1, 0, 0.5, { sx: 0.15, sy: 0.12, sz: 0.14, seg: 10 });
  for (const s of [-1, 1]) b.sphere(m, s * 0.2, 1.09, 0, 0.5, { sx: 0.11, sy: 0.13, sz: 0.13, seg: 8 });
  for (let i = 0; i < 11; i++) { const a = (i - 5) / 5 * 1.15; b.sphere(dk, Math.sin(a) * 0.13, 0.64 - Math.cos(a) * 0.13, 0.15 + Math.cos(a) * 0.035, 0.017, { seg: 6, cast: false }); }
}

/* ── kitchen, WC, utility, loggia ────────────────────────────────────── */
export function buildKitchen(b, ctx) {
  const mah = wood('#571a15', 0.8), ch = M.chrome(), granite = M.plain('#17181a', 0.25), tiles = M.wallTile();
  const K = P.KIT;
  // backsplash and its border, on the east and north walls
  b.box(tiles, K.x1 - 0.012, 0.84, K.z0, K.x1, 1.62, K.z1, { uv: [0.6, 0.6], uvw: true, cast: false });
  b.box(M.plain('#a8743a', 0.4), K.x1 - 0.014, 1.5, K.z0, K.x1, 1.55, K.z1, { cast: false });
  // the run of cabinets under black stone: louvred doors, the sink, the two-ring gas hob
  E(b, K.x1, 3.68);
  const w = 3.3, d = 0.56, h = 0.84;
  cabinet(b, 2.0, h - 0.04, d - 0.02, 5, { mat: mah, louvre: true, handle: 'none' });
  b.push(2.0, 0, 0, 0); cabinet(b, 1.3, h - 0.04, d - 0.02, 3, { mat: mah, handle: 'none' }); b.pop();
  b.box(granite, -0.01, h - 0.04, 0, w + 0.01, h, d + 0.02, {});
  // sink with drainer
  b.box(M.plain('#b9bcbf', 0.3, 0.85), 0.55, h, 0.08, 1.35, h + 0.006, 0.5, { cast: false }); b.box(M.plain('#6d7074', 0.35, 0.8), 0.6, h + 0.004, 0.12, 0.98, h + 0.008, 0.46, { cast: false });
  for (let x = 1.04; x < 1.32; x += 0.035) b.box(M.plain('#d4d7da', 0.3, 0.85), x, h + 0.006, 0.12, x + 0.014, h + 0.012, 0.46, { cast: false });
  b.cyl(ch, 0.79, h, 0.06, 0.016, 0.2, { seg: 8 }); b.bar(ch, 0.79, h + 0.2, 0.06, 0.79, h + 0.17, 0.22, 0.02, { round: true });
  // washing-up: basin, bowls, the green bottles
  b.box(M.plain('#b8324a', 0.6), 0.1, h, 0.14, 0.46, h + 0.08, 0.44, {}); b.sphere(M.plain('#f2f0ea', 0.3), 0.22, h + 0.11, 0.3, 0.5, { sx: 0.2, sy: 0.1, sz: 0.2 }); b.sphere(M.plain('#c9ccd0', 0.3, 0.7), 0.34, h + 0.12, 0.28, 0.5, { sx: 0.18, sy: 0.12, sz: 0.18 });
  bottle(b, '#6fc22e', 0.5, h, 0.08, 0.032, 0.24, '#e8e23a'); bottle(b, '#58b82a', 0.42, h, 0.07, 0.03, 0.22, '#e8e23a'); bottle(b, '#e2c53a', 1.5, h, 0.08, 0.033, 0.23, '#f2d23a');
  // hob
  b.box(M.plain('#0e0e10', 0.15), 2.05, h, 0.1, 2.8, h + 0.05, 0.5, {});
  for (const x of [2.24, 2.61]) { b.cyl(M.plain('#2a2a2c', 0.6), x, h + 0.05, 0.28, 0.085, 0.02, { seg: 14 }); for (let i = 0; i < 4; i++) b.rbox(M.plain('#1a1a1c', 0.6), x, h + 0.075, 0.28, 0.2, 0.012, 0.014, i * 45, { cast: false }); b.cyl(M.plain('#c9c9cc', 0.4, 0.5), x, h + 0.01, 0.5, 0.018, 0.03, { rx: 90, seg: 8 }); }
  b.cyl(M.plain('#c9ccd0', 0.3, 0.8), 2.61, h + 0.085, 0.28, 0.1, 0.1, { seg: 16 }); b.cyl(M.plain('#d8dadc', 0.3, 0.8), 2.61, h + 0.185, 0.28, 0.105, 0.012, { seg: 16 }); b.sphere(M.plain('#1a1a1c', 0.5), 2.61, h + 0.21, 0.28, 0.018, { seg: 8 });
  // seasonings against the wall
  const R = rng(13); for (let i = 0; i < 6; i++) bottle(b, ['#5a2a1a', '#e8c23a', '#2a2a2a', '#b83a2a', '#f2ead2', '#3a5a2a'][i], 2.95 + (i % 3) * 0.08, h, 0.07 + ((i / 3) | 0) * 0.08, 0.022 + R() * 0.008, 0.14 + R() * 0.08, '#c93a2a');
  b.solid(0, 0, 0, w, h, d);
  // wall cupboards with glass doors, the plate rack hung under them, the hood
  const uy = 1.62, ud = 0.33;
  b.box(mah, 0, uy, 0, w, 2.3, ud - 0.02, G);
  for (let i = 0; i < 6; i++) {
    const x0 = i * w / 6 + 0.01, x1 = (i + 1) * w / 6 - 0.01, glazed = i >= 1 && i <= 3;
    if (glazed) { b.box(mah, x0, uy + 0.02, ud - 0.02, x0 + 0.05, 2.28, ud, G); b.box(mah, x1 - 0.05, uy + 0.02, ud - 0.02, x1, 2.28, ud, G); b.box(mah, x0, uy + 0.02, ud - 0.02, x1, uy + 0.07, ud, U); b.box(mah, x0, 2.23, ud - 0.02, x1, 2.28, ud, U); b.box(M.glass('#e2efe9', 0.35), x0 + 0.05, uy + 0.07, ud - 0.014, x1 - 0.05, 2.23, ud - 0.008, { cast: false }); b.box(M.plain('#e8e6de', 0.5), x0 + 0.07, uy + 0.09, 0.05, x1 - 0.07, uy + 0.3, ud - 0.05, { cast: false }); }
    else { b.box(mah, x0, uy + 0.02, ud - 0.02, x1, 2.28, ud, { ...G, cast: false }); b.box(mah, x0 + 0.05, uy + 0.07, ud, x1 - 0.05, 2.23, ud + 0.007, { ...G, cast: false }); }
  }
  // plate rack
  for (const z of [0.05, 0.3]) b.bar(ch, 0.5, 1.42, z, 1.6, 1.42, z, 0.008, { round: true });
  for (let x = 0.52; x < 1.6; x += 0.045) { b.bar(ch, x, 1.42, 0.05, x, 1.42, 0.3, 0.004, { cast: false }); }
  for (const x of [0.5, 1.6]) { b.bar(ch, x, 1.42, 0.05, x, 1.62, 0.05, 0.008, { round: true }); b.bar(ch, x, 1.42, 0.3, x, 1.62, 0.3, 0.008, { round: true }); }
  for (let i = 0; i < 9; i++) b.cyl(M.plain('#f3f2ec', 0.25), 0.58 + i * 0.058, 1.53, 0.17, 0.1, 0.012, { rz: 90, seg: 16 });
  for (let i = 0; i < 5; i++) b.sphere(M.plain('#f1efe8', 0.25), 1.24 + i * 0.07, 1.5, 0.17, 0.5, { sx: 0.06, sy: 0.14, sz: 0.14 });
  b.box(M.plain('#231512', 0.5), 2.05, 1.46, 0, 2.8, 1.62, 0.42, {});
  for (let i = 0; i < 5; i++) { b.bar(ch, 1.7 + i * 0.06, 1.3, 0.012, 1.7 + i * 0.06, 1.48, 0.012, 0.01, { round: true }); }
  b.pop();
  blob(b, K.x1 - 0.58, 3.68, K.x1, 6.98, 0.4);

  // the west side: glass-topped table with the food cover on it, the fridge beyond
  W(b, K.x0, 5.15); table(b, 1.2, 0.76, 0.7, { mat: wood('#3d1711', 0.75), glass: true, leg: 0.055 });
  b.box(M.plain('#efe6cc', 0.7), 0.32, 0.77, 0.14, 0.86, 0.94, 0.56, {}); b.box(M.plain('#e6dcc0', 0.7), 0.3, 0.77, 0.12, 0.88, 0.8, 0.58, { cast: false });
  for (let x = 0.35; x < 0.85; x += 0.05) b.box(M.plain('#cfc4a4', 0.8), x, 0.8, 0.135, x + 0.012, 0.93, 0.565, { cast: false });
  b.cyl(M.plain('#f3f1ea', 0.3), 1.02, 0.77, 0.32, 0.06, 0.018, { seg: 14 }); b.rbox(M.plain('#f3f1ea', 0.4), 1.0, 0.8, 0.42, 0.2, 0.012, 0.05, 30, {});
  b.pop();
  b.push(K.x0 + 0.72, 0, 4.3, 90); stool(b, { w: 0.3, h: 0.44, mat: wood('#3d1711', 0.7) }); b.pop();
  blob(b, K.x0, 3.95, K.x0 + 0.7, 5.15, 0.42);
  W(b, K.x0, 5.9);
  b.box(M.plain('#aeb4b8', 0.35, 0.5), 0, 0.03, 0, 0.62, 1.66, 0.62, { solid: true }); b.box(M.plain('#8f969a', 0.4, 0.5), 0.004, 1.14, 0.62, 0.616, 1.15, 0.626, { cast: false });
  b.box(M.plain('#c5cace', 0.3, 0.6), 0.03, 0.06, 0.62, 0.59, 1.13, 0.632, { cast: false }); b.box(M.plain('#c5cace', 0.3, 0.6), 0.03, 1.16, 0.62, 0.59, 1.64, 0.632, { cast: false });
  b.box(M.plain('#6f7578', 0.4, 0.6), 0.05, 0.8, 0.632, 0.07, 1.1, 0.65, { cast: false }); b.box(M.plain('#6f7578', 0.4, 0.6), 0.05, 1.2, 0.632, 0.07, 1.45, 0.65, { cast: false });
  b.box(M.plain('#efe6cc', 0.7), 0.1, 1.66, 0.12, 0.5, 1.8, 0.48, {});
  b.pop();
  blob(b, K.x0, 5.28, K.x0 + 0.62, 5.9, 0.45);
  // on the floor: the blue basket, a mat by the loggia door
  b.box(M.plain('#3a9fd0', 0.6), 2.55, 0, 6.92, 2.85, 0.16, 7.12, {}); b.box(M.plain('#6fbf3a', 0.7), 2.58, 0.1, 6.95, 2.82, 0.17, 7.09, { cast: false });
  b.box(M.plain('#8a7a5a', 1), 1.8, 0, 6.72, 2.5, 0.012, 7.12, { cast: false });
  // tube light on the west wall, switches
  b.box(M.plain('#e8e6de', 0.5), K.x0, 2.42, 4.2, K.x0 + 0.05, 2.47, 5.4, { cast: false }); b.cyl(ctx.lampMat('#f4f8ff', 2.4, 0.95), K.x0 + 0.06, 2.4, 4.25, 0.016, 1.1, { rx: 90, seg: 8, cast: false });
  switchPlate(b, 3.3, 1.3, 3.62, '+z');

  /* WC */
  {
    const bt = M.bathTile(), wh = M.plain('#f2f2ee', 0.25);
    b.box(bt, 0, 0, 3.62, 0.012, 1.5, 5.6, { uv: [0.8, 0.8], uvw: true, cast: false }); b.box(bt, 0, 0, 3.62, 1.22, 1.5, 3.632, { uv: [0.8, 0.8], uvw: true, cast: false });
    b.box(bt, 1.208, 0, 3.62, 1.22, 1.5, 5.6, { uv: [0.8, 0.8], uvw: true, cast: false }); b.box(M.plain('#5f7486', 0.3), 0, 1.5, 3.62, 0.014, 1.56, 5.6, { cast: false });
    N(b, 0.36, 3.64);
    b.box(wh, 0.04, 0.38, 0, 0.44, 0.78, 0.18, {}); b.cyl(wh, 0.24, 0, 0.38, 0.14, 0.38, { seg: 14, r2: 0.18 }); b.cyl(wh, 0.24, 0.38, 0.4, 0.2, 0.04, { seg: 16 }); b.cyl(M.plain('#e4e4de', 0.3), 0.24, 0.42, 0.4, 0.2, 0.025, { seg: 16 });
    b.solid(0, 0, 0, 0.48, 0.8, 0.62); b.pop();
    b.cyl(M.plain('#c9382e', 0.6), 1.0, 0, 4.4, 0.12, 0.2, { seg: 12, r2: 0.14 }); stool(b.push(0.82, 0, 5.05, 0), { w: 0.26, h: 0.24, mat: M.plain('#b8322a', 0.6) }); b.pop();
    b.cyl(wh, 0.2, 2.1, 5.2, 0.13, 0.42, { rx: 0, seg: 14 }); b.bar(M.chrome(), 0.2, 2.1, 5.2, 0.2, 1.2, 5.1, 0.012, { round: true });
    b.bar(M.chrome(), 0.05, 1.1, 4.7, 0.05, 1.1, 5.3, 0.014, { round: true });
  }
  /* utility nook: basin and mirror, the washing machine */
  {
    const wh = M.plain('#f2f2ee', 0.25), U_ = P.UTL;
    b.box(M.concrete('#e9dca0', 31, 0.6), 0, 0, U_.z0, 0.01, H, U_.z1, { uv: [2, 2], cast: false }); b.box(M.concrete('#e9dca0', 31, 0.6), 0, 0, U_.z1 - 0.01, 1.22, H, U_.z1, { uv: [2, 2], cast: false });
    W(b, 0, 6.45);
    b.sphere(wh, 0.25, 0.8, 0.22, 0.5, { sx: 0.48, sy: 0.2, sz: 0.4 }); b.cyl(wh, 0.25, 0, 0.14, 0.07, 0.72, { seg: 12, r2: 0.09 }); b.cyl(M.chrome(), 0.25, 0.86, 0.06, 0.012, 0.12, { seg: 8 });
    b.box(M.plain('#b9c9cf', 0.05, 0.9), 0.05, 1.2, 0.012, 0.45, 1.75, 0.02, { cast: false }); b.box(M.plain('#e9e7e0', 0.5), 0.02, 1.08, 0, 0.48, 1.1, 0.1, {});
    bottle(b, '#3a8fd0', 0.1, 1.1, 0.05, 0.02, 0.12); bottle(b, '#e86a8a', 0.2, 1.1, 0.05, 0.018, 0.1); b.cyl(M.plain('#f2d23a', 0.5), 0.36, 1.1, 0.05, 0.028, 0.09, { seg: 10 });
    b.solid(0, 0, 0, 0.5, 1, 0.42); b.pop();
    b.box(wh, 0.04, 0.02, 6.52, 0.6, 0.88, 7.1, { solid: true }); b.box(M.plain('#d9d9d4', 0.4), 0.06, 0.88, 6.54, 0.58, 0.9, 7.08, { cast: false }); b.box(M.plain('#3a3d42', 0.3), 0.14, 0.9, 6.62, 0.5, 0.905, 6.98, { cast: false }); b.box(M.plain('#8fa0b0', 0.4), 0.06, 0.9, 6.54, 0.58, 0.95, 6.6, { cast: false });
    b.cyl(M.plain('#5a8fc0', 0.6), 0.95, 0, 6.95, 0.16, 0.3, { seg: 14, r2: 0.19 });
    b.cyl(wh, 1.0, 2.05, 6.0, 0.14, 0.5, { seg: 14 });
  }
  /* loggia: the oven on its steel rack, the laundry rail and its hangers, the clay jars, plants on the ledge */
  {
    const L = P.LOG, st = M.plain('#c9ccd0', 0.3, 0.8);
    b.push(2.78, 0, 7.78, 0);
    for (const [x, z] of [[0, 0], [0.62, 0], [0, 0.42], [0.62, 0.42]]) b.box(st, x, 0, z, x + 0.022, 1.25, z + 0.022, {});
    for (const y of [0.3, 0.72, 1.1]) { b.box(st, 0, y, 0, 0.642, y + 0.012, 0.442, {}); }
    b.box(M.plain('#e9e8e2', 0.35), 0.04, 1.112, 0.03, 0.6, 1.4, 0.4, {}); b.box(M.plain('#1a1a1c', 0.2), 0.07, 1.14, 0.03 - 0.004, 0.44, 1.37, 0.03, { cast: false }); b.box(M.plain('#c9c9c4', 0.4), 0.46, 1.14, 0.03 - 0.004, 0.58, 1.37, 0.03, { cast: false });
    b.box(M.plain('#f0d23a', 0.6), 0.05, 0.732, 0.05, 0.3, 0.9, 0.36, {}); b.sphere(M.plain('#8fd0e8', 0.5), 0.45, 0.82, 0.2, 0.5, { sx: 0.26, sy: 0.16, sz: 0.3 }); b.box(M.plain('#6fbf5a', 0.6), 0.08, 0.312, 0.06, 0.56, 0.42, 0.38, {});
    b.solid(0, 0, 0, 0.64, 1.3, 0.44); b.pop();
    // laundry rail with hangers
    b.bar(st, 0.25, 1.85, 7.95, 1.75, 1.85, 7.95, 0.022, { round: true });
    for (const x of [0.25, 1.75]) { b.bar(st, x, 0, 7.95, x, 1.85, 7.95, 0.022, { round: true }); b.box(st, x - 0.2, 0, 7.93, x + 0.2, 0.02, 7.97, {}); }
    const R = rng(77), hc = ['#f2d23a', '#3aa0e8', '#e8556a', '#6fd08a', '#f29a3a', '#e8e8e8'];
    for (let i = 0; i < 12; i++) { const x = 0.38 + i * 0.105, c = M.plain(hc[(R() * hc.length) | 0], 0.5); b.bar(c, x, 1.84, 7.95, x, 1.76, 7.95, 0.006); b.bar(c, x, 1.76, 7.95, x, 1.68, 7.74, 0.008); b.bar(c, x, 1.76, 7.95, x, 1.68, 8.16, 0.008); b.bar(c, x, 1.68, 7.74, x, 1.68, 8.16, 0.008); }
    for (const [x, c, len] of [[0.5, '#a9d8ea', 0.9], [0.72, '#f1efe8', 0.7], [0.94, '#e8b0c0', 0.6]]) b.quad(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }), '+x', x, 1.68 - len / 2, 7.95, 0.4, len, { segA: 8, wave: [14, 0.02, x * 9] });
    // jars and basins
    const clay = M.plain('#7a4a2c', 0.8);
    for (const [x, z, r, hh] of [[0.2, 8.2, 0.16, 0.34], [0.52, 8.24, 0.13, 0.28], [0.2, 7.6, 0.14, 0.3]]) { b.cyl(clay, x, 0, z, r * 0.7, hh * 0.5, { seg: 14, r2: r }); b.cyl(clay, x, hh * 0.5, z, r, hh * 0.5, { seg: 14, r2: r * 0.6 }); b.cyl(M.plain('#5a3520', 0.8), x, hh, z, r * 0.66, 0.02, { seg: 14 }); }
    b.cyl(M.plain('#e8483a', 0.5), 1.1, 0, 8.18, 0.2, 0.14, { seg: 16, r2: 0.25 }); b.cyl(M.plain('#f29a3a', 0.6), 2.3, 0, 8.2, 0.14, 0.26, { seg: 12, r2: 0.16 });
    b.solid(0.02, 0, 8.0, 0.7, 0.5, 8.42);
    for (let i = 0; i < 4; i++) pot(b, 0.5 + i * 0.75, 0.9, L.z1 + 0.07, { r: 0.07, h: 0.1, n: 9, ph: 0.12, seed: i + 2, color: '#b8643a', leaf: ['#3d7d3b', '#4f9a45', '#356f3a'][i % 3] });
  }
}

/* ── the two balconies and the gallery ──────────────────────────────── */
export function buildOutsideRooms(b, ctx) {
  // west balcony: plants in the planter, a broom, a stool
  {
    const R = rng(3), leaf = ['#3d7d3b', '#4f9a45', '#2f6a35', '#5aa04a'];
    for (let z = 0.6; z < 2.95; z += 0.16) { const x = P.BW.x0 + 0.255 + (R() - 0.5) * 0.06; b.sphere(M.plain(leaf[(R() * 4) | 0], 0.85), x, 0.3 + R() * 0.12, z, 0.07 + R() * 0.06, { seg: 7 }); if (R() < 0.4) b.bar(M.plain('#4a8a3a', 0.8), x, 0.3, z, x + (R() - 0.5) * 0.1, 0.62 + R() * 0.3, z + (R() - 0.5) * 0.1, 0.012, {}); }
    b.bar(M.plain('#c9a45a', 0.8), -0.32, 0, 0.32, -0.26, 1.25, 0.26, 0.022, { round: true }); b.cyl(M.plain('#b9963a', 0.9), -0.32, 0, 0.32, 0.09, 0.22, { seg: 8, r2: 0.03 });
    b.box(M.plain('#f1efe8', 0.7), -0.9, 0, 2.6, -0.5, 0.3, 3.1, {});
  }
  // east balcony: the flag out over the street, pots
  {
    const flag = new THREE.MeshStandardMaterial({ map: plateTex(192, 128, (g, w, h) => { g.fillStyle = '#d42a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7d23a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 32; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.closePath(); g.fill(); }), roughness: 0.9, side: THREE.DoubleSide });
    b.bar(M.plain('#c9a45a', 0.7), 10.55, 1.0, 0.45, 11.5, 2.5, 0.4, 0.024, { round: true });
    b.push(11.02, 1.75, 0.42, 0); b.quad(flag, '+z', 0.27, 0.2, 0, 0.75, 0.5, { segA: 10, wave: [9, 0.035], ry: 0 }); b.pop();
    pot(b, 10.3, 0, 2.9, { r: 0.13, h: 0.2, n: 12, ph: 0.2, color: '#a8553a' }); pot(b, 10.25, 0, 0.5, { r: 0.1, h: 0.16, n: 9, ph: 0.14, color: '#a8553a', seed: 8 });
    b.solid(10.1, 0, 2.7, 10.5, 0.6, 3.1);
  }
  // gallery: two brooms by the steel rail at its end, a bicycle further along the wall, the bulb under its roof
  {
    for (const [x, zz, lean] of [[0.12, -0.5, 0.1], [0.16, -0.8, 0.16]]) { b.bar(M.plain('#c8a868', 0.8), x, 0.1, zz, x - lean, 1.3, zz + 0.04, 0.022, { round: true }); b.cyl(M.plain('#c9a04a', 0.95), x, 0, zz, 0.1, 0.3, { seg: 8, r2: 0.03 }); }
    bicycle(b.push(1.52, 0, -8.0, 266)); b.pop(); b.solid(1.3, 0, -9.8, 1.78, 1, -7.9);
    for (const z of [-4.2, -6.9]) pot(b, P.COR.x0 - 0.1, 0.9, z, { r: 0.09, h: 0.13, n: 10, ph: 0.14, color: '#a8553a', seed: (-z) | 0 });
    b.cyl(M.plain('#f2f0ea', 0.5), 0.9, H - 0.05, -3.2, 0.05, 0.05, { seg: 10 }); b.sphere(ctx.lampMat('#ffe2a8', 2.0, 0.95), 0.9, H - 0.1, -3.2, 0.045, { seg: 10, cast: false });
    ctx.hot.push({ id: 'gallery', pos: [0.02, 1.0, -3.4], r: 0.5 });
  }
}
function bicycle(b) {
  const fr = M.plain('#e0662a', 0.4, 0.3), tyre = M.plain('#151515', 0.9), st = M.plain('#c9ccd0', 0.3, 0.8);
  for (const x of [0.36, 1.4]) { b.geo(tyre, new THREE.TorusGeometry(0.33, 0.022, 8, 28).translate(x, 0.35, 0), {}); b.geo(st, new THREE.TorusGeometry(0.3, 0.008, 6, 28).translate(x, 0.35, 0), { cast: false }); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; b.bar(st, x, 0.35, 0, x + Math.cos(a) * 0.3, 0.35 + Math.sin(a) * 0.3, 0, 0.004, { cast: false }); } }
  b.bar(fr, 0.36, 0.35, 0, 0.72, 0.78, 0, 0.03, { round: true }); b.bar(fr, 0.72, 0.78, 0, 1.22, 0.82, 0, 0.03, { round: true }); b.bar(fr, 0.72, 0.78, 0, 0.86, 0.36, 0, 0.03, { round: true });
  b.bar(fr, 0.86, 0.36, 0, 1.22, 0.82, 0, 0.03, { round: true }); b.bar(fr, 0.86, 0.36, 0, 0.36, 0.35, 0, 0.024, { round: true }); b.bar(fr, 1.22, 0.86, 0, 1.4, 0.35, 0, 0.028, { round: true });
  b.bar(st, 1.2, 0.82, 0, 1.17, 1.02, 0, 0.022, { round: true }); b.bar(st, 1.17, 1.02, -0.24, 1.17, 1.02, 0.24, 0.02, { round: true });
  b.bar(st, 0.72, 0.78, 0, 0.68, 0.92, 0, 0.02, { round: true }); b.box(M.plain('#1a1a1a', 0.7), 0.56, 0.92, -0.06, 0.8, 0.96, 0.06, {});
  b.box(M.plain('#2a4a8a', 0.6), 1.3, 0.72, -0.16, 1.56, 0.9, 0.16, {});
}
