/* Living room, kitchen, the wet rooms, the loggia, the two balconies and the gallery: what stood where,
   after the 2013 videos, the 2012 photos of the rehearsal at home and the two Tết 2009 photos. */
import * as THREE from 'three';
import { M, canvasTex, plateTex, tileTex, stoneTex, rng } from '../../engine/tex.js';
import { part } from '../../engine/kit.js';
import * as P from './plan.js';
import { C, wood, N, S, W, E, wardrobe, cabinet, drawers, chair, stool, table, carvedSeat, teaTable, fanHead, standFan, bottle, jar, vase, pot, papers, figures, clockFace, lace, switchPlate, blob, pillow } from '../../engine/furn.js';

const G = { grain: 'y', uv: [1, 1] }, U = { uv: [1, 1] };
const { H } = P;       // the ceiling ON THE DRAWING (2.75): everything below the living room is still on that grid

/* ── living room ─────────────────────────────────────────────────────── */
/* Set out again on 18/11/2026 and written in REAL metres (b.real): the room is 5.25 × 2.8 under a ceiling of about
   2.65. The TV wall and the lamps are read off the photograph of 22/9/2012 with the tube lamp (1.22 m) as the ruler;
   the seats, the door end and the fish tank are as the video of June 2013 shows them (3:09 from the kitchen, 4:50–4:54
   walking to the door), sized by the water bottle on the dispenser (0.27 m across). */
export function buildLiving(b, ctx) {
  b.real = true;
  const sofa = wood(C.sofa, 0.8), cherry = wood(C.cherry, 0.75), mah = wood(C.mahog, 0.85), ch = M.chrome();
  const yellow = M.plain('#e9d86a', 0.9), lime = M.plain('#d6e08a', 0.9);
  const XE = P.LIV.x1, ZS = P.sz(P.LIV.z1), RH = P.CEILING;        // the TV wall, the south wall, the ceiling

  /* the long seat against the gallery wall — about 1.6 m, its east end level with the kitchen opening's east jamb — and
     between it and the front door the end table with the flowers */
  N(b, 1.78, 0.08); carvedSeat(b, 1.6, { panels: 3 });
  b.box(lime, 0.14, 0.39, 0.16, 0.6, 0.46, 0.56, {}); b.sphere(yellow, 1.33, 0.6, 0.2, 0.5, { sx: 0.42, sy: 0.42, sz: 0.13, rx: -14 });
  b.pop();
  blob(b, 1.78, 0.08, 3.38, 0.7, 0.45);
  b.push(1.33, 0, 0.1, 0); table(b, 0.43, 0.56, 0.46, { mat: sofa, shelf: 0.2, leg: 0.045 });
  vase(b, 0.15, 0.56, 0.2, { color: '#dfe6ea', h: 0.2, r: 0.055, n: 12, seed: 4, flowers: ['#d8323a', '#f0c23c', '#c8283a', '#f28a2e'] }); papers(b, 0.3, 0.56, 0.3, 0.18, 0.14, 0.012, 3); b.box(M.plain('#f4f2ec', 0.8), 0.28, 0.56, 0.08, 0.3, 0.78, 0.26, {});
  b.pop();
  // the smaller seat at the table's west end, its back to the balcony (two panels in its back; a yellow cushion)
  W(b, 1.22, 1.64); carvedSeat(b, 0.86, { panels: 2, d: 0.6 }); b.sphere(yellow, 0.43, 0.56, 0.2, 0.5, { sx: 0.4, sy: 0.38, sz: 0.13, rx: -12 }); b.pop();
  blob(b, 1.22, 0.78, 1.82, 1.64, 0.4);
  // tea table and what is always on it
  b.push(2.16, 0, 0.99, 0); teaTable(b, 1.12, 0.56);
  const ty = 0.475;
  b.box(M.plain('#9ad233', 0.6), 0.56, ty, 0.2, 0.78, ty + 0.06, 0.36, {}); jar(b, '#f4f1e8', 0.64, ty + 0.01, 0.26, 0.03, 0.05, '#f1f1f1');
  jar(b, '#f0a23a', 0.42, ty, 0.14, 0.04, 0.11, '#f3d23a'); b.cyl(M.plain('#2f5fa8', 0.35), 0.86, ty, 0.2, 0.055, 0.13, { seg: 14 }); b.cyl(M.plain('#f2f2f0', 0.4), 0.86, ty + 0.13, 0.2, 0.057, 0.012, { seg: 14 });
  b.cyl(M.glass('#3fae5a', 0.55), 0.3, ty, 0.36, 0.035, 0.09, { seg: 12, cast: false }); b.box(M.plain('#141414', 0.5), 0.5, ty, 0.42, 0.67, ty + 0.018, 0.465, {});
  b.box(M.plain('#6fbf5a', 0.7), 0.3, 0.17, 0.2, 0.52, 0.24, 0.32, {}); papers(b, 0.78, 0.17, 0.28, 0.3, 0.2, 0.03, 8, ['#f4efe4', '#dbe7f2', '#f2dfe2']);
  b.pop();
  blob(b, 2.16, 0.99, 3.28, 1.55, 0.42);
  // the standing fan, by the south end of the TV cabinet (photograph of 22/9/2012)
  b.push(4.5, 0, 1.6, 285);
  b.cyl(M.plain('#121214', 0.35), 0, 0, 0, 0.15, 0.34, { seg: 18, r2: 0.13 }); b.cyl(M.plain('#2a2a2e', 0.4), 0, 0.34, 0, 0.022, 0.72, { seg: 10 });
  b.bar(M.plain('#2a2a2e', 0.4), 0.05, 0.5, 0.04, 0.06, 1.02, 0.07, 0.014, { round: true });
  b.push(0, 1.12, 0.03, 0); fanHead(b, 0.21, { color: '#1c1c20', cage: '#55585c', blade: '#8a8f96' }); b.pop();
  b.solid(-0.14, 0, -0.14, 0.14, 1, 0.14); b.pop();
  blob(b, 4.36, 1.46, 4.64, 1.74, 0.4);
  // the rack of snacks at the sofa's east end (video 3:09)
  b.push(3.48, 0, 0.1, 0);
  for (const [x, z] of [[0, 0], [0.3, 0], [0, 0.26], [0.3, 0.26]]) b.box(ch, x, 0, z, x + 0.012, 0.62, z + 0.012, {});
  for (const y of [0.1, 0.34, 0.58]) b.box(M.plain('#d9dadb', 0.4, 0.5), 0, y, 0, 0.312, y + 0.01, 0.272, {});
  const R = rng(5); for (const y of [0.11, 0.35]) for (let i = 0; i < 4; i++) b.box(M.plain(['#e8443a', '#f5c63a', '#3aa0d8', '#6fbf3a', '#f08a3a'][(R() * 5) | 0], 0.6), 0.02 + i * 0.07, y, 0.03, 0.08 + i * 0.07, y + 0.13 + R() * 0.06, 0.22, {});
  b.pop();

  /* the corner by the front door: the steel rack against the balcony wall, before the door's narrow leaf that stays shut,
     a spare bottle of water beside it; over it a rail of hooks with a helmet hung up (video 4:52–4:55) */
  b.box(M.plain('#2a2a2c', 0.5), 0, 1.72, 0.1, 0.02, 1.76, 0.46, { cast: false }); for (const z of [0.16, 0.28, 0.4]) b.bar(M.plain('#2a2a2c', 0.5), 0.01, 1.74, z, 0.05, 1.7, z, 0.008, { cast: false });
  b.sphere(M.plain('#2a7fc0', 0.35), 0.16, 1.6, 0.28, 0.5, { sx: 0.28, sy: 0.24, sz: 0.3 });
  b.cyl(M.glass('#6fb6e8', 0.5), 0.2, 0, 0.62, 0.135, 0.34, { seg: 16, cast: false }); b.cyl(M.glass('#6fb6e8', 0.5), 0.2, 0.34, 0.62, 0.135, 0.08, { seg: 16, r2: 0.04, cast: false }); b.cyl(M.plain('#d8413a', 0.5), 0.2, 0.42, 0.62, 0.04, 0.03, { seg: 10 });
  b.push(0.05, 0, 0.05, 0);
  for (const [x, z] of [[0, 0], [0.3, 0], [0, 0.36], [0.3, 0.36]]) b.box(ch, x, 0, z, x + 0.012, 0.98, z + 0.012, {});
  for (const y of [0.16, 0.52, 0.86]) for (let z = 0.01; z < 0.37; z += 0.06) b.box(ch, 0, y, z, 0.31, y + 0.008, z + 0.008, { cast: false });
  b.sphere(M.plain('#2f7fc6', 0.35), 0.16, 1.0, 0.19, 0.5, { sx: 0.27, sy: 0.22, sz: 0.3 }); b.sphere(M.plain('#2a93c9', 0.35), 0.16, 0.65, 0.19, 0.5, { sx: 0.27, sy: 0.22, sz: 0.3 });
  b.sphere(M.plain('#c9342c', 0.8), 0.16, 0.27, 0.19, 0.5, { sx: 0.28, sy: 0.2, sz: 0.3 });
  b.solid(0, 0, 0, 0.31, 1, 0.37); b.pop();
  b.box(M.plain('#3a3432', 1), 0.56, 0, 0.08, 1.2, 0.012, 0.5, { cast: false });
  const sand = (x, z, ry, c) => { b.rbox(M.plain(c, 0.8), x, 0.012, z, 0.09, 0.022, 0.24, ry, { cast: false }); b.rbox(M.plain(c, 0.8), x + 0.12, 0.012, z + 0.02, 0.09, 0.022, 0.24, ry + 8, { cast: false }); };
  sand(0.42, 1.25, 80, '#2b2623'); sand(0.56, 1.7, 95, '#5a3a22'); sand(0.34, 2.1, 70, '#1e1e20'); sand(0.7, 2.25, 110, '#3a2c26');
  b.box(M.plain('#4a4240', 1), 0.05, 0, 1.3, 0.38, 0.01, 2.0, { cast: false });

  // the water dispenser stands against the short wall between the fish tank and the kitchen opening, the small framed
  // picture on the wall beside it, toward the opening (2012 photo, video 4:50–4:52)
  b.push(1.46, 0, ZS - 0.35, 0);
  b.box(M.plain('#f1f0ec', 0.4), 0, 0, 0, 0.32, 0.96, 0.33, { solid: true }); b.box(M.plain('#c9ccd0', 0.4), 0.03, 0.62, -0.006, 0.29, 0.86, 0, { cast: false });
  b.box(M.plain('#d8413a', 0.4), 0.08, 0.7, -0.03, 0.12, 0.74, 0, { cast: false }); b.box(M.plain('#3a6fd8', 0.4), 0.2, 0.7, -0.03, 0.24, 0.74, 0, { cast: false });
  b.cyl(M.glass('#6fb6e8', 0.5), 0.16, 0.96, 0.165, 0.135, 0.3, { seg: 16, cast: false }); b.cyl(M.glass('#6fb6e8', 0.5), 0.16, 1.26, 0.165, 0.135, 0.08, { seg: 16, r2: 0.04, cast: false });
  b.pop();
  b.cyl(M.glass('#6fb6e8', 0.5), 1.24, 0, ZS - 0.2, 0.135, 0.34, { seg: 16, cast: false }); b.cyl(M.glass('#6fb6e8', 0.5), 1.24, 0.34, ZS - 0.2, 0.135, 0.08, { seg: 16, r2: 0.04, cast: false }); b.cyl(M.plain('#e9e9ea', 0.5), 1.24, 0.42, ZS - 0.2, 0.04, 0.03, { seg: 10 });
  blob(b, 1.46, ZS - 0.35, 1.78, ZS - 0.02, 0.4);

  /* the fish tank: a thin wall aquarium in a moulded mahogany frame, like a picture's, on a strip of stacked grey stone —
     on the SOUTH wall by the balcony corner (video 3:23–3:26); the low carved cabinet under it, things dropped on top.
     (Tết 2009: the peach branch stood in front of it.) */
  {
    const x0 = 0.3, x1 = 1.4, y0 = 0.8, y1 = 1.7, zw = ZS, zf = ZS - 0.12, fw = 0.125;
    b.box(M.stone(), x0 - 0.05, 0, zw - 0.025, x1 + 0.05, RH - 0.075, zw, { uv: [0.9, 0.6] });
    b.box(mah, x0, y0, zf, x1, y0 + fw, zw - 0.025, U); b.box(mah, x0, y1 - fw, zf, x1, y1, zw - 0.025, U);
    b.box(mah, x0, y0 + fw, zf, x0 + fw, y1 - fw, zw - 0.025, G); b.box(mah, x1 - fw, y0 + fw, zf, x1, y1 - fw, zw - 0.025, G);
    b.box(mah, x0 - 0.02, y1, zf - 0.015, x1 + 0.02, y1 + 0.035, zw - 0.025, U);
    for (const cx of [x0 + fw / 2, x1 - fw / 2]) for (const cy of [y0 + fw / 2, y1 - fw / 2]) b.box(mah, cx - 0.035, cy - 0.035, zf - 0.012, cx + 0.035, cy + 0.035, zf, U);
    const gx0 = x0 + fw, gx1 = x1 - fw, gy0 = y0 + fw, gy1 = y1 - fw;
    b.box(M.plain('#c9bfa8', 0.9), gx0, gy0, zf + 0.014, gx1, gy0 + 0.05, zw - 0.03, { cast: false });                 // gravel
    b.box(M.plain('#31452f', 1), gx0, gy0, zw - 0.032, gx1, gy1, zw - 0.027, { cast: false });                         // the painted back
    const R = rng(21), leaf = M.plain('#2f8f45', 0.7);
    for (let i = 0; i < 16; i++) { const x = gx0 + 0.04 + R() * (gx1 - gx0 - 0.08), z = zf + 0.03 + R() * 0.05, hh = 0.12 + R() * 0.36; b.bar(leaf, x, gy0 + 0.05, z, x + (R() - 0.5) * 0.08, gy0 + 0.05 + hh, z + (R() - 0.5) * 0.02, 0.012 + R() * 0.012, { cast: false }); }
    b.bar(M.plain('#4a3a2c', 0.9), gx0 + 0.22, gy0 + 0.06, zf + 0.05, gx0 + 0.6, gy0 + 0.34, zf + 0.06, 0.022, { cast: false });   // driftwood
    const water = new THREE.MeshStandardMaterial({ color: '#6fc2a8', roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, emissive: '#2f8f7a', emissiveIntensity: 0.5 }); water.userData.noCast = true; water.userData.order = 3;
    ctx.water = water;
    b.box(water, gx0, gy0 + 0.05, zf + 0.016, gx1, gy1 - 0.03, zw - 0.034, { cast: false });
    b.box(M.glass('#d8f0ea', 0.2), gx0, gy0, zf + 0.006, gx1, gy1, zf + 0.012, { cast: false });
    S(b, 1.0, zw - 0.02); cabinet(b, 0.97, 0.52, 0.35, 3, { mat: cherry, plinth: 0.05, handle: 'none' }); b.pop();
    b.sphere(M.plain('#d8477a', 0.95), 0.72, 0.6, zw - 0.2, 0.5, { sx: 0.42, sy: 0.2, sz: 0.28 }); b.sphere(M.plain('#6fa36a', 0.95), 0.36, 0.56, zw - 0.18, 0.5, { sx: 0.3, sy: 0.1, sz: 0.24 });
    blob(b, 0.03, zw - 0.37, 1.0, zw - 0.02, 0.4);
    ctx.fish = { axis: 'x', x0: gx0 + 0.08, x1: gx1 - 0.08, y0: gy0 + 0.12, y1: gy1 - 0.1, z0: zf + 0.03, z1: zw - 0.05 };
    ctx.hot.push({ id: 'fish', pos: [(x0 + x1) / 2, 1.25, zf - 0.06], r: 0.45 });
  }

  /* the TV wall, 1.84 long, from the corner: the glass cabinet (0.53 wide, about 1.5 high), the low cabinet (1.2 long,
     0.7 high) with the television (0.73 wide) and the small wooden Di Lặc holding his ingot up; over the glass cabinet,
     at 1.75, the altar shelf in the corner on its two brackets. (Heights here hang on how high the lens of the 2012
     photograph was held — 1.34 to 1.5; taken as 1.42.) */
  {
    E(b, XE, 0);
    const gw = 0.53, gd = 0.4, gh = 1.49, gb = 0.69;
    b.box(cherry, 0, 0, 0, gw, gb, gd, { ...G, solid: true }); drawers(b, cherry, 0.03, gw - 0.03, 0.06, gb - 0.04, gd + 0.012, 2, { hw: 0.07 });
    for (const [x, z] of [[0, 0], [gw - 0.035, 0], [0, gd - 0.035], [gw - 0.035, gd - 0.035]]) b.box(cherry, x, gb, z, x + 0.035, gh, z + 0.035, G);
    b.box(cherry, 0, gh - 0.05, 0, gw, gh, gd, U); b.box(cherry, -0.015, gh, -0.005, gw + 0.015, gh + 0.035, gd + 0.015, U); b.box(M.plain('#d9d2c2', 0.7), 0.01, gb, 0.005, gw - 0.01, gh - 0.05, 0.012, { cast: false });
    for (const y of [0.95, 1.2]) b.box(M.glass('#d8efe8', 0.3), 0.03, y, 0.03, gw - 0.03, y + 0.008, gd - 0.03, { cast: false });
    b.box(M.glass('#e6f3ef', 0.14), 0.035, gb, gd - 0.012, gw - 0.035, gh - 0.05, gd - 0.006, { cast: false });
    b.box(cherry, gw / 2 - 0.012, gb, gd - 0.02, gw / 2 + 0.012, gh - 0.05, gd, G);
    const Rg = rng(9), glassy = M.glass('#f2fbf8', 0.45);
    for (const y of [gb + 0.012, 0.958, 1.208]) for (let i = 0; i < 6; i++) { const x = 0.07 + i * 0.078 + (Rg() - 0.5) * 0.02, z = 0.1 + Rg() * 0.2; if (Rg() < 0.55) b.cyl(glassy, x, y, z, 0.022, 0.07 + Rg() * 0.08, { seg: 8, r2: 0.028, cast: false }); else b.sphere(M.plain(['#f2efe6', '#f1b6c6', '#b7dba0', '#f0d76a', '#e6534a'][(Rg() * 5) | 0], 0.5), x, y + 0.035, z, 0.035 + Rg() * 0.015, { seg: 8 }); }
    b.sphere(M.plain('#c8322a', 0.5), 0.4, gh + 0.065, 0.2, 0.5, { sx: 0.2, sy: 0.07, sz: 0.2, seg: 12 }); b.cyl(M.plain('#2a2a2c', 0.5), 0.16, gh + 0.035, 0.18, 0.045, 0.04, { seg: 10 }); b.cyl(M.plain('#b9bcc0', 0.3, 0.7), 0.26, gh + 0.035, 0.2, 0.04, 0.035, { seg: 10 });
    b.solid(0, 0, 0, gw, gh, gd);
    // low cabinet
    const x0 = gw, w = 1.2, d = 0.46, h = 0.7;
    b.box(cherry, x0, h - 0.035, 0, x0 + w, h, d + 0.01, U); b.box(cherry, x0, 0.05, 0, x0 + w, h - 0.035, 0.02, G);
    b.box(cherry, x0, 0.05, 0, x0 + 0.025, h - 0.035, d, G); b.box(cherry, x0 + w - 0.025, 0.05, 0, x0 + w, h - 0.035, d, G);
    b.box(cherry, x0 + 0.02, 0, 0.03, x0 + w - 0.02, 0.05, d - 0.04, U); b.box(cherry, x0, 0.05, 0, x0 + w, 0.075, d, U);
    b.box(cherry, x0 + 0.66, 0.05, 0, x0 + 0.685, h - 0.035, d, G); b.box(cherry, x0 + 0.025, 0.3, 0, x0 + 0.66, 0.322, d - 0.03, U);
    drawers(b, cherry, x0 + 0.7, x0 + w - 0.2, 0.09, h - 0.05, d, 3, { hw: 0.07 });
    b.box(cherry, x0 + 0.685, 0.075, 0.02, x0 + w - 0.19, h - 0.035, d - 0.016, G);
    for (const y of [0.075, 0.24, 0.4]) b.box(cherry, x0 + w - 0.19, y, 0.02, x0 + w - 0.03, y + 0.02, d - 0.04, U);
    b.box(M.plain('#c9c9c6', 0.35, 0.4), x0 + 0.12, 0.325, 0.08, x0 + 0.56, 0.38, 0.36, {}); b.box(M.plain('#17171a', 0.4), x0 + 0.14, 0.08, 0.1, x0 + 0.54, 0.13, 0.36, {});
    b.cyl(M.plain('#e8e4d8', 0.3), x0 + w - 0.11, 0.095, 0.2, 0.05, 0.12, { seg: 12, r2: 0.02 });
    papers(b, x0 + 0.74, h, 0.3, 0.26, 0.19, 0.012, 4, ['#f4f2ea', '#bcd6ea', '#eef0f2']); papers(b, x0 + 0.84, h + 0.012, 0.22, 0.2, 0.15, 0.008, 6, ['#6fa8d8', '#f3f0e8']);
    jar(b, '#f2f0ea', x0 + 0.07, h, 0.2, 0.045, 0.1, '#f2f0ea'); b.cyl(M.plain('#f2f0ea', 0.3), x0 + 0.07, h + 0.1, 0.2, 0.02, 0.04, { seg: 8 });
    b.solid(x0, 0, 0, x0 + w, h, d);
    ctx.tvSpot = b.spot(x0 + 0.42, h, 0.22);
    // the statue, about a foot high
    b.pushM(new THREE.Matrix4().makeScale(0.3, 0.3, 0.3).setPosition(x0 + 0.9, h, 0.24)); diLac(b); b.pop();
    ctx.hot.push({ id: 'dilac', pos: b.at(x0 + 0.9, h + 0.2, 0.3), r: 0.24 }, { id: 'tv', pos: b.at(x0 + 0.42, h + 0.3, 0.26), r: 0.4 });
    b.pop();
    blob(b, XE - 0.46, 0, XE, gw + 1.2, 0.45);
    // the altar shelf: a board in the corner, 0.75 along the gallery wall and 0.45 deep, an apron under its two open edges
    const alt = wood('#3a1a12', 0.7), ay = 1.75, ax0 = XE - 0.75, az1 = 0.45, br = M.plain('#b9b4a8', 0.4, 0.6);
    b.box(alt, ax0, ay, 0, XE, ay + 0.03, az1, U); b.box(alt, ax0, ay - 0.05, az1 - 0.02, XE, ay, az1, U); b.box(alt, ax0, ay - 0.05, 0, ax0 + 0.02, ay, az1, U);
    for (const x of [ax0 + 0.1, XE - 0.1]) { b.bar(br, x, ay - 0.3, 0.012, x, ay, 0.012, 0.016); b.bar(br, x, ay - 0.012, 0.01, x, ay - 0.012, 0.36, 0.016); b.bar(br, x, ay - 0.28, 0.014, x, ay - 0.014, 0.3, 0.014); }
    const sy_ = ay + 0.03;
    b.cyl(M.plain('#b08a3a', 0.4, 0.6), XE - 0.36, sy_, 0.2, 0.05, 0.055, { seg: 14, r2: 0.06 });
    for (let i = 0; i < 5; i++) b.bar(M.plain('#7a2a1a', 0.9), XE - 0.36 + (i - 2) * 0.008, sy_ + 0.055, 0.2, XE - 0.36 + (i - 2) * 0.014, sy_ + 0.26, 0.2 + (i - 2) * 0.004, 0.003, { cast: false });
    for (const x of [XE - 0.5, XE - 0.22]) { b.cyl(M.plain('#b8322a', 0.4), x, sy_, 0.16, 0.014, 0.1, { seg: 8 }); b.sphere(ctx.lampMat('#ff5a3a', 1.6, 0.5, 1.2), x, sy_ + 0.115, 0.16, 0.014, { seg: 8, cast: false }); }
    vase(b, XE - 0.62, sy_, 0.14, { color: '#c9a23a', h: 0.16, r: 0.05, flowers: ['#b04a8a', '#d86aa6', '#8a3a7a', '#e88ab8'], n: 12, spread: 0.1, stem: 0.12, seed: 3 });
    b.cyl(M.plain('#e9e6de', 0.3), XE - 0.14, sy_, 0.3, 0.06, 0.014, { seg: 14 }); for (const [dx, dz] of [[0, 0], [0.035, 0.01], [-0.02, 0.03]]) b.sphere(M.plain('#e8a33a', 0.6), XE - 0.14 + dx, sy_ + 0.04, 0.3 + dz, 0.026, { seg: 8 });
  }

  // on the walls: the pendulum clock high between the end table and the sofa, the small frame over the water dispenser, switches
  {
    const cx = 1.81, cy = 2.15, cz = 0.07;            // on the shallow pier that is left of the old front wall
    b.cyl(wood('#2c130d', 0.7), cx, cy, cz, 0.16, 0.05, { rx: 90, seg: 24 });
    b.quad(new THREE.MeshStandardMaterial({ map: clockFace(256), roughness: 0.6 }), '+z', cx, cy, cz + 0.052, 0.26, 0.26, { cast: false });
    b.box(wood('#2c130d', 0.7), cx - 0.075, cy - 0.42, cz, cx + 0.075, cy - 0.12, cz + 0.045, G); b.box(M.plain('#120a06', 0.6), cx - 0.05, cy - 0.39, cz + 0.045, cx + 0.05, cy - 0.17, cz + 0.047, { cast: false });
    ctx.clocks.push({ x: cx, y: cy, z: cz + 0.058, ry: 0, r: 0.1 }); ctx.pendulum = { x: cx, y: cy - 0.17, z: cz + 0.05 };
    b.box(wood('#2c130d', 0.6), 1.8, 1.52, ZS - 0.03, 2.02, 1.86, ZS, U); b.box(M.plain('#d9cfb6', 0.8), 1.83, 1.55, ZS - 0.035, 1.99, 1.83, ZS - 0.03, { cast: false });
    switchPlate(b, 1.52, 1.3, 0, '+z'); switchPlate(b, 3.62, 1.3, ZS, '-z'); switchPlate(b, 5.0, 1.3, ZS, '-z');
    /* the tube light, about 2.35 up: the ruler of the 2012 photograph (1.22 m with its fitting). It hangs in the middle of the
       wall of the room as it was before the renovation — from the old front wall's line (x 1.9) to the TV wall — not over the sofa */
    b.box(M.plain('#e8e6de', 0.5), 2.95, 2.34, 0, 4.17, 2.39, 0.05, { cast: false }); b.cyl(ctx.lampMat('#f4f8ff', 2.2, 0.95), 3.0, 2.325, 0.065, 0.016, 1.12, { rz: -90, seg: 8, cast: false });
    b.box(M.plain('#f4f3ee', 0.4), 3.05, 0.32, 0, 3.17, 0.4, 0.008, { cast: false });
  }
  // the ceiling lamp — a square wooden frame with four shades, in the middle of the old room — and four downlights
  {
    const fx = 3.6, fz = 1.4, fr = wood('#5a2a18', 0.6), shade_ = ctx.lampMat('#fff0d0', 2.2, 0.9);
    b.box(fr, fx - 0.26, RH - 0.1, fz - 0.26, fx + 0.26, RH - 0.06, fz + 0.26, { ...U, cast: false }); b.box(fr, fx - 0.04, RH - 0.06, fz - 0.04, fx + 0.04, RH, fz + 0.04, { cast: false });
    for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) b.box(shade_, fx + dx - 0.08, RH - 0.19, fz + dz - 0.08, fx + dx + 0.08, RH - 0.1, fz + dz + 0.08, { cast: false });
    for (const [x, z] of [[2.3, 0.42], [4.9, 0.42], [2.3, ZS - 0.46], [4.9, ZS - 0.46]]) b.cyl(ctx.lampMat('#fff4dc', 1.6, 0.9), x, RH - 0.012, z, 0.045, 0.012, { seg: 12, cast: false });
  }
  ctx.hot.push({ id: 'door507', pos: [1.38, 1.5, -0.3], r: 0.4 });
  b.real = false;
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
  const K = P.KIT, A = P.ALC, Wc = P.WC;
  /* The east wall, from the living-room end: the fridge (the silver two-door one of the 2012 photograph, its front level
     with the jamb of the opening), then the run of cabinets under black stone, the sink first and the hob at the far end,
     right up to the south wall. In the south wall a third of a metre of white tiles, then the double door to the loggia
     (video 2:06–2:20, 2:31, 3:08–3:10). */
  const zr = K.z0 + 0.74, w = K.z1 - zr, d = 0.56, h = 0.84;      // where the run starts; its length, depth, height
  b.box(tiles, K.x1 - 0.012, 0.84, zr, K.x1, 1.62, zr + w, { uv: [0.6, 0.6], uvw: true, cast: false });
  b.box(M.plain('#a8743a', 0.4), K.x1 - 0.014, 1.5, zr, K.x1, 1.55, zr + w, { cast: false });
  b.box(tiles, P.KIT_OPEN.b, 0, K.z0, K.x1, 2.3, K.z0 + 0.012, { uv: [0.6, 0.6], uvw: true, cast: false });      // the return beside the opening
  b.box(tiles, P.LOG_DOOR.b, 0, K.z1 - 0.012, K.x1, 2.3, K.z1, { uv: [0.6, 0.6], uvw: true, cast: false });      // the south wall beside the door, and behind the hob
  // the fridge, and the wall cupboard over it with the clay jar on top
  E(b, K.x1, K.z0 + 0.04);
  b.box(M.plain('#aeb4b8', 0.35, 0.5), 0, 0.03, 0, 0.62, 1.66, 0.62, { solid: true }); b.box(M.plain('#8f969a', 0.4, 0.5), 0.004, 1.14, 0.62, 0.616, 1.15, 0.626, { cast: false });
  b.box(M.plain('#c5cace', 0.3, 0.6), 0.03, 0.06, 0.62, 0.59, 1.13, 0.632, { cast: false }); b.box(M.plain('#c5cace', 0.3, 0.6), 0.03, 1.16, 0.62, 0.59, 1.64, 0.632, { cast: false });
  b.box(M.plain('#6f7578', 0.4, 0.6), 0.05, 0.8, 0.632, 0.07, 1.1, 0.65, { cast: false }); b.box(M.plain('#6f7578', 0.4, 0.6), 0.05, 1.2, 0.632, 0.07, 1.45, 0.65, { cast: false });
  b.box(M.plain('#efe6cc', 0.7), 0.1, 1.66, 0.12, 0.5, 1.8, 0.48, {});
  for (const [x, y, c] of [[0.4, 1.42, '#6fbf3a'], [0.5, 1.34, '#e8443a'], [0.33, 1.3, '#f2d23a']]) b.box(M.plain(c, 0.6), x, y, 0.632, x + 0.045, y + 0.045, 0.64, { cast: false });
  b.box(mah, 0, 1.8, 0, 0.66, 2.4, 0.34, G); for (const x of [0.02, 0.34]) { b.box(mah, x, 1.83, 0.34, x + 0.3, 2.37, 0.348, { ...G, cast: false }); b.bar(ch, x + (x < 0.1 ? 0.26 : 0.04), 1.9, 0.36, x + (x < 0.1 ? 0.26 : 0.04), 2.05, 0.36, 0.008, { round: true }); }
  b.cyl(M.plain('#7a4a2c', 0.8), 0.33, 2.4, 0.17, 0.09, 0.13, { seg: 14, r2: 0.14 }); b.cyl(M.plain('#7a4a2c', 0.8), 0.33, 2.53, 0.17, 0.14, 0.11, { seg: 14, r2: 0.07 });
  b.pop();
  blob(b, K.x1 - 0.66, K.z0 + 0.04, K.x1, K.z0 + 0.7, 0.45);
  // the run of cabinets: louvred doors, the sink, the two-ring gas hob
  E(b, K.x1, zr);
  cabinet(b, 2.0, h - 0.04, d - 0.02, 5, { mat: mah, louvre: true, handle: 'none' });
  b.push(2.0, 0, 0, 0); cabinet(b, w - 2.0, h - 0.04, d - 0.02, 4, { mat: mah, handle: 'none' }); b.pop();
  b.box(granite, -0.01, h - 0.04, 0, w + 0.01, h, d + 0.02, {});
  // sink with drainer
  b.box(M.plain('#b9bcbf', 0.3, 0.85), 0.55, h, 0.08, 1.35, h + 0.006, 0.5, { cast: false }); b.box(M.plain('#6d7074', 0.35, 0.8), 0.6, h + 0.004, 0.12, 0.98, h + 0.008, 0.46, { cast: false });
  for (let x = 1.04; x < 1.32; x += 0.035) b.box(M.plain('#d4d7da', 0.3, 0.85), x, h + 0.006, 0.12, x + 0.014, h + 0.012, 0.46, { cast: false });
  b.cyl(ch, 0.79, h, 0.06, 0.016, 0.2, { seg: 8 }); b.bar(ch, 0.79, h + 0.2, 0.06, 0.79, h + 0.17, 0.22, 0.02, { round: true });
  // washing-up: basin, bowls, the green bottles
  b.box(M.plain('#b8324a', 0.6), 0.1, h, 0.14, 0.46, h + 0.08, 0.44, {}); b.sphere(M.plain('#f2f0ea', 0.3), 0.22, h + 0.11, 0.3, 0.5, { sx: 0.2, sy: 0.1, sz: 0.2 }); b.sphere(M.plain('#c9ccd0', 0.3, 0.7), 0.34, h + 0.12, 0.28, 0.5, { sx: 0.18, sy: 0.12, sz: 0.18 });
  bottle(b, '#6fc22e', 0.5, h, 0.08, 0.032, 0.24, '#e8e23a'); bottle(b, '#58b82a', 0.42, h, 0.07, 0.03, 0.22, '#e8e23a'); bottle(b, '#e2c53a', 1.5, h, 0.08, 0.033, 0.23, '#f2d23a');
  // hob
  b.box(M.plain('#0e0e10', 0.15), 2.5, h, 0.1, 3.25, h + 0.05, 0.5, {});
  for (const x of [2.69, 3.06]) { b.cyl(M.plain('#2a2a2c', 0.6), x, h + 0.05, 0.28, 0.085, 0.02, { seg: 14 }); for (let i = 0; i < 4; i++) b.rbox(M.plain('#1a1a1c', 0.6), x, h + 0.075, 0.28, 0.2, 0.012, 0.014, i * 45, { cast: false }); b.cyl(M.plain('#c9c9cc', 0.4, 0.5), x, h + 0.01, 0.5, 0.018, 0.03, { rx: 90, seg: 8 }); }
  b.cyl(M.plain('#c9ccd0', 0.3, 0.8), 3.06, h + 0.085, 0.28, 0.1, 0.1, { seg: 16 }); b.cyl(M.plain('#d8dadc', 0.3, 0.8), 3.06, h + 0.185, 0.28, 0.105, 0.012, { seg: 16 }); b.sphere(M.plain('#1a1a1c', 0.5), 3.06, h + 0.21, 0.28, 0.018, { seg: 8 });
  // seasonings against the wall
  const R = rng(13); for (let i = 0; i < 6; i++) bottle(b, ['#5a2a1a', '#e8c23a', '#2a2a2a', '#b83a2a', '#f2ead2', '#3a5a2a'][i], 3.36 + (i % 3) * 0.08, h, 0.07 + ((i / 3) | 0) * 0.08, 0.022 + R() * 0.008, 0.14 + R() * 0.08, '#c93a2a');
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
  b.box(M.plain('#231512', 0.5), 2.5, 1.46, 0, 3.25, 1.62, 0.42, {});
  for (let i = 0; i < 5; i++) { b.bar(ch, 1.7 + i * 0.06, 1.3, 0.012, 1.7 + i * 0.06, 1.48, 0.012, 0.01, { round: true }); }
  b.pop();
  blob(b, K.x1 - 0.58, zr, K.x1, zr + w, 0.4);

  /* the west side: the glass-topped table stands with its short end to the wall (0.8 × 1.25: video 2:10, 2:21, 3:09), the
     food cover and the day's tins on it, a chair pushed in on its north side with a cloth over the back. South of it, in
     the corner by the door, the big fridge of 2013 stood later — not drawn, it is outside these years */
  W(b, K.x0, 6.6); table(b, 0.8, 0.76, 1.25, { mat: wood('#3d1711', 0.75), glass: true, leg: 0.055 });
  b.box(M.plain('#efe6cc', 0.7), 0.13, 0.77, 0.22, 0.67, 0.94, 0.64, {}); b.box(M.plain('#e6dcc0', 0.7), 0.11, 0.77, 0.2, 0.69, 0.8, 0.66, { cast: false });
  for (let x = 0.16; x < 0.66; x += 0.05) b.box(M.plain('#cfc4a4', 0.8), x, 0.8, 0.215, x + 0.012, 0.93, 0.645, { cast: false });
  b.cyl(M.plain('#f3f1ea', 0.3), 0.44, 0.77, 0.98, 0.06, 0.018, { seg: 14 }); b.rbox(M.plain('#f3f1ea', 0.4), 0.42, 0.8, 0.86, 0.2, 0.012, 0.05, 30, {});
  b.box(M.plain('#b8322a', 0.5), 0.5, 0.77, 0.03, 0.72, 0.9, 0.17, {}); b.box(M.plain('#f1eee6', 0.6), 0.2, 0.77, 0.03, 0.44, 0.86, 0.19, {}); b.cyl(M.plain('#2a2a2c', 0.4), 0.1, 0.77, 0.1, 0.06, 0.16, { seg: 12 });
  b.pop();
  N(b, K.x0 + 0.42, 5.33); chair(b, { mat: wood('#3d1711', 0.7) }); b.box(M.plain('#f3f3f0', 0.95), -0.015, 0.55, -0.03, 0.435, 0.98, 0.035, {}); b.pop();
  blob(b, K.x0, 5.8, K.x0 + 1.25, 6.6, 0.42);
  // on the floor: the blue basket at the counter's end, a mat by the loggia door
  b.box(M.plain('#3a9fd0', 0.6), 3.18, 0, 7.66, 3.48, 0.16, 7.88, {}); b.box(M.plain('#6fbf3a', 0.7), 3.21, 0.1, 7.69, 3.45, 0.17, 7.85, { cast: false });
  b.box(M.plain('#8a7a5a', 1), 2.3, 0, 7.5, 2.9, 0.012, 7.95, { cast: false });
  // tube light and a socket on the west wall; the pull-cord and the switch on the wall beside the opening
  b.box(M.plain('#e8e6de', 0.5), K.x0, 2.42, 5.2, K.x0 + 0.05, 2.47, 6.4, { cast: false }); b.cyl(ctx.lampMat('#f4f8ff', 2.4, 0.95), K.x0 + 0.06, 2.4, 5.25, 0.016, 1.1, { rx: 90, seg: 8, cast: false });
  switchPlate(b, K.x0, 1.25, 5.02, '+x'); switchPlate(b, 1.8, 1.3, K.z0, '+z');
  b.box(M.plain('#e9e6dc', 0.5), 1.57, 2.3, K.z0, 1.65, 2.38, K.z0 + 0.03, { cast: false }); b.bar(M.plain('#d9d6cc', 0.8), 1.61, 2.3, K.z0 + 0.02, 1.61, 1.62, K.z0 + 0.02, 0.004, { cast: false });

  /* the washing alcove, behind the fish-tank wall and open to the kitchen on its east side: on its west wall the washing
     machine and the basin under its mirror; the bathroom door is in its south wall (video 2:21–2:26) */
  {
    const wh = M.plain('#f2f2ee', 0.25);
    b.box(M.whiteTile(), 0, 0, A.z0, 0.012, 1.8, A.z1, { uv: [0.8, 0.8], uvw: true, cast: false });
    b.box(wh, 0.04, 0.02, 3.76, 0.6, 0.88, 4.34, { solid: true }); b.box(M.plain('#d9d9d4', 0.4), 0.06, 0.88, 3.78, 0.58, 0.9, 4.32, { cast: false }); b.box(M.plain('#3a3d42', 0.3), 0.2, 0.9, 3.84, 0.54, 0.905, 4.26, { cast: false }); b.box(M.plain('#8fa0b0', 0.4), 0.06, 0.9, 3.78, 0.15, 0.97, 4.32, { cast: false });
    W(b, 0, 5.12);
    b.sphere(wh, 0.25, 0.8, 0.22, 0.5, { sx: 0.48, sy: 0.2, sz: 0.4 }); b.cyl(wh, 0.25, 0, 0.14, 0.07, 0.72, { seg: 12, r2: 0.09 }); b.cyl(M.chrome(), 0.25, 0.86, 0.06, 0.012, 0.12, { seg: 8 });
    b.box(M.plain('#b9c9cf', 0.05, 0.9), 0.05, 1.2, 0.012, 0.45, 1.75, 0.02, { cast: false }); b.box(M.plain('#e9e7e0', 0.5), 0.02, 1.08, 0, 0.48, 1.1, 0.1, {});
    bottle(b, '#3a8fd0', 0.1, 1.1, 0.05, 0.02, 0.12); bottle(b, '#e86a8a', 0.2, 1.1, 0.05, 0.018, 0.1); b.cyl(M.plain('#f2d23a', 0.5), 0.36, 1.1, 0.05, 0.028, 0.09, { seg: 10 });
    b.solid(0, 0, 0, 0.5, 1, 0.42); b.pop();
    b.cyl(M.plain('#6fbf5a', 0.6), 0.34, 0, 4.5, 0.17, 0.14, { seg: 14, r2: 0.2 }); b.cyl(M.plain('#5a8fc0', 0.6), 0.36, 0.14, 4.5, 0.14, 0.1, { seg: 14, r2: 0.17 });
    b.box(M.plain('#2f6fb8', 0.6), 0.68, 0, 3.7, 0.88, 0.26, 3.84, {});
    // cloths on a dark rail on the north wall
    b.box(M.plain('#3a2a22', 0.7), 0.52, 1.5, A.z0, 1.14, 1.54, A.z0 + 0.03, { cast: false });
    for (const [x, c, len] of [[0.6, '#e8a0b8', 0.42], [0.86, '#a9d8ea', 0.5]]) b.box(M.plain(c, 0.95), x, 1.5 - len, A.z0 + 0.03, x + 0.2, 1.5, A.z0 + 0.045, { cast: false });
  }
  /* the bathroom, south of the alcove: purple-grey tiles to waist height under a wavy border, white above; the toilet against
     the far wall near the corner, the high window over it and to the east (an outside wall: bottles on its sill), the water
     heater on the west wall above (video 2:26–2:29) */
  {
    const wh = M.plain('#f2f2ee', 0.25), t = 0.012, wn = P.WC_WIN, dr = P.WC_DOOR;
    const dado = new THREE.MeshStandardMaterial({ map: tileTex('#5b4e66', '#3a3142', 4, 0.06, 12), roughness: 0.3 }), upper = M.whiteTile();
    const band = new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (g, cw, chh) => { g.fillStyle = '#e9e4da'; g.fillRect(0, 0, cw, chh); g.strokeStyle = '#4a3f58'; g.lineWidth = 7; g.beginPath(); for (let x = 0; x <= cw; x += 2) { const y = chh / 2 + Math.sin(x / cw * Math.PI * 4) * 13; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }), roughness: 0.3 });
    const slab = (x0, z0, x1, z1, yA = 0, yB = H) => {            // tiles on a stretch of wall: dado, border, white
      const seg = (m, lo, hi, uv) => { lo = Math.max(yA, lo); hi = Math.min(yB, hi); if (hi - lo > 0.005) b.box(m, x0, lo, z0, x1, hi, z1, { uv, uvw: true, cast: false }); };
      seg(dado, 0, 1.04, [0.8, 0.8]); seg(band, 1.04, 1.12, [0.32, 0.08]); seg(upper, 1.12, H, [0.8, 0.8]);
    };
    slab(0, Wc.z0, t, Wc.z1); slab(Wc.x1 - t, Wc.z0, Wc.x1, Wc.z1);
    slab(0, Wc.z0, dr.a - 0.02, Wc.z0 + t); slab(dr.b + 0.02, Wc.z0, Wc.x1, Wc.z0 + t); slab(dr.a - 0.02, Wc.z0, dr.b + 0.02, Wc.z0 + t, dr.y1 + 0.02);
    slab(0, Wc.z1 - t, wn.a, Wc.z1); slab(wn.b, Wc.z1 - t, Wc.x1, Wc.z1); slab(wn.a, Wc.z1 - t, wn.b, Wc.z1, 0, wn.y0); slab(wn.a, Wc.z1 - t, wn.b, Wc.z1, wn.y1);
    S(b, 0.66, Wc.z1 - 0.02);
    b.box(wh, 0.04, 0.38, 0, 0.44, 0.78, 0.18, {}); b.cyl(wh, 0.24, 0, 0.38, 0.14, 0.38, { seg: 14, r2: 0.18 }); b.cyl(wh, 0.24, 0.38, 0.4, 0.2, 0.04, { seg: 16 }); b.cyl(M.plain('#e4e4de', 0.3), 0.24, 0.42, 0.4, 0.2, 0.025, { seg: 16 });
    b.sphere(M.plain('#f2b8d0', 0.9), 0.24, 0.87, 0.09, 0.5, { sx: 0.3, sy: 0.17, sz: 0.15 });
    b.solid(0, 0, 0, 0.48, 0.8, 0.62); b.pop();
    b.cyl(wh, 0.19, 2.1, Wc.z1 - 0.74, 0.16, 0.6, { rx: 90, seg: 16 }); b.bar(ch, 0.1, 1.94, Wc.z1 - 0.2, 0.1, 1.2, Wc.z1 - 0.2, 0.008, {});
    b.bar(ch, 0.05, 0.8, 7.55, 0.05, 0.5, 7.62, 0.01, { round: true }); b.cyl(M.plain('#c9382e', 0.6), 0.98, 0, 6.55, 0.12, 0.2, { seg: 12, r2: 0.14 });
    stool(b.push(0.9, 0, 7.3, 0), { w: 0.26, h: 0.24, mat: M.plain('#b8322a', 0.6) }); b.pop();
    for (const [dx, c, hh] of [[0.1, '#3a6fd8', 0.15], [0.22, '#e8e2d2', 0.12], [0.36, '#3a8fd0', 0.16], [0.5, '#f2f0ea', 0.11]]) bottle(b, c, wn.a + dx, wn.y0, Wc.z1 + 0.05, 0.024, hh);
    b.sphere(ctx.lampMat('#fff4dc', 1.8, 0.9), 0.62, H - 0.07, 6.7, 0.05, { seg: 10, cast: false });
  }
  /* The loggia, outside the kitchen door and on east along the big room's wall (video 2:31–3:07). At its west end, against
     the house wall beside the door: the steel rack with the basins and the oven. Then, going east: a stainless water tank and the gas bottle by the
     wall, red hangers on a rail above them, the bent steel clothes rail with its hangers, the clay jars at the far end. */
  {
    const L = P.LOG, st = M.plain('#c9ccd0', 0.3, 0.8);
    b.push(L.x0 + 0.04, 0, L.z0 + 0.05, 0);
    for (const [x, z] of [[0, 0], [0.62, 0], [0, 0.42], [0.62, 0.42]]) b.box(st, x, 0, z, x + 0.022, 1.25, z + 0.022, {});
    for (const y of [0.3, 0.72, 1.1]) { b.box(st, 0, y, 0, 0.642, y + 0.012, 0.442, {}); }
    b.box(M.plain('#e9e8e2', 0.35), 0.04, 1.112, 0.03, 0.6, 1.4, 0.4, {}); b.box(M.plain('#1a1a1c', 0.2), 0.07, 1.14, 0.03 - 0.004, 0.44, 1.37, 0.03, { cast: false }); b.box(M.plain('#c9c9c4', 0.4), 0.46, 1.14, 0.03 - 0.004, 0.58, 1.37, 0.03, { cast: false });
    b.box(M.plain('#f0d23a', 0.6), 0.05, 0.732, 0.05, 0.3, 0.9, 0.36, {}); b.sphere(M.plain('#8fd0e8', 0.5), 0.45, 0.82, 0.2, 0.5, { sx: 0.26, sy: 0.16, sz: 0.3 }); b.box(M.plain('#6fbf5a', 0.6), 0.08, 0.312, 0.06, 0.56, 0.42, 0.38, {});
    b.solid(0, 0, 0, 0.64, 1.3, 0.44); b.pop();
    b.cyl(M.plain('#cfd3d6', 0.22, 0.9), 3.78, 0.06, L.z0 + 0.26, 0.22, 1.05, { seg: 20 }); for (let y = 0.2; y < 1.05; y += 0.14) b.cyl(M.plain('#b9bec2', 0.25, 0.9), 3.78, y, L.z0 + 0.26, 0.226, 0.012, { seg: 20, cast: false });
    b.cyl(M.plain('#cfd3d6', 0.22, 0.9), 3.78, 1.11, L.z0 + 0.26, 0.22, 0.06, { seg: 20, r2: 0.08 }); b.solid(3.56, 0, L.z0, 4.0, 1.1, L.z0 + 0.5);
    b.cyl(M.plain('#2a2c30', 0.6), 4.3, 0, L.z0 + 0.2, 0.15, 0.48, { seg: 14 }); b.cyl(M.plain('#d8652a', 0.6), 4.3, 0.3, L.z0 + 0.2, 0.152, 0.07, { seg: 14, cast: false }); b.cyl(M.plain('#2a2c30', 0.6), 4.3, 0.48, L.z0 + 0.2, 0.1, 0.1, { seg: 12, r2: 0.05 });
    b.bar(st, 3.5, 1.92, L.z0 + 0.05, 4.9, 1.92, L.z0 + 0.05, 0.008, {});
    for (let i = 0; i < 8; i++) { const x = 3.62 + i * 0.16, red = M.plain('#d8443a', 0.6); b.bar(red, x, 1.92, L.z0 + 0.05, x, 1.8, L.z0 + 0.12, 0.005, { cast: false }); b.bar(red, x, 1.8, L.z0 + 0.02, x, 1.74, L.z0 + 0.22, 0.005, { cast: false }); }
    b.push(L.x1 + 0.01, 0, 16.57, 180);  // what follows keeps the numbers of the first drawing, turned round: its jars stood at the west end then
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
    b.pop();
    for (let i = 0; i < 5; i++) pot(b, L.x0 + 0.35 + i * 0.78, 0.9, L.z1 + 0.07, { r: 0.07, h: 0.1, n: 9, ph: 0.12, seed: i + 2, color: '#b8643a', leaf: ['#3d7d3b', '#4f9a45', '#356f3a'][i % 3] });
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
  /* the parents' balcony in its cage (real metres): the door comes out at its north end; under the window the air
     conditioner's outdoor unit, at the south end the folding ladder stood against the bars, a couple of pots, the flag
     tied to a post and hanging out over the street */
  {
    b.real = true;
    const x0 = P.BE.x0, x1 = P.BE.x1, z0 = P.sz(P.BE.z0), z1 = P.sz(P.BE.z1), al = M.plain('#b9bcc0', 0.35, 0.8);
    const flag = new THREE.MeshStandardMaterial({ map: plateTex(192, 128, (g, w, h) => { g.fillStyle = '#d42a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7d23a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 32; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.closePath(); g.fill(); }), roughness: 0.9, side: THREE.DoubleSide });
    b.bar(M.plain('#c9a45a', 0.7), x1 - 0.05, 1.05, z0 + 0.66, x1 + 0.8, 2.2, z0 + 0.6, 0.024, { round: true });
    b.push(x1 + 0.3, 1.52, z0 + 0.63, 0); b.quad(flag, '+z', 0.27, 0.2, 0, 0.75, 0.5, { segA: 10, wave: [9, 0.035], ry: 0 }); b.pop();
    b.box(M.plain('#e6e5df', 0.5), x0 + 0.06, 0.08, z0 + 1.12, x0 + 0.38, 0.66, z0 + 1.92, { solid: true }); b.cyl(M.plain('#2c2e30', 0.6), x0 + 0.38, 0.37, z0 + 1.44, 0.2, 0.012, { rz: -90, seg: 18, cast: false });
    for (const y of [0.16, 0.26, 0.48, 0.58]) b.box(M.plain('#c4c3bc', 0.6), x0 + 0.381, y, z0 + 1.7, x0 + 0.386, y + 0.05, z0 + 1.88, { cast: false });
    for (const z of [z1 - 0.5, z1 - 0.12]) { b.bar(al, x1 - 0.5, 0, z, x1 - 0.12, 1.5, z, 0.03); b.bar(al, x1 - 0.72, 0, z, x1 - 0.14, 1.5, z, 0.026); }
    for (let i = 1; i <= 4; i++) { const t = i / 5; b.box(al, x1 - 0.5 + 0.38 * t - 0.05, 1.5 * t, z1 - 0.5, x1 - 0.5 + 0.38 * t + 0.05, 1.5 * t + 0.02, z1 - 0.12, {}); }
    b.box(M.plain('#2a2a2c', 0.6), x1 - 0.34, 1.5, z1 - 0.52, x1 - 0.06, 1.53, z1 - 0.1, {});
    pot(b, x0 + 0.2, 0, z1 - 0.3, { r: 0.13, h: 0.2, n: 12, ph: 0.2, color: '#a8553a' }); pot(b, x1 - 0.18, 0, z0 + 1.62, { r: 0.1, h: 0.16, n: 9, ph: 0.14, color: '#a8553a', seed: 8 });
    b.real = false;
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
