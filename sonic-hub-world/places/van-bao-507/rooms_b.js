/* The big room — his corner behind the wardrobes, the books and the piano, his sister's side by the wide window —
   and the parents' room. After the 2013 video (0:00–1:46, 3:40–4:48) and the 2012 rehearsal photos. */
import * as THREE from 'three';
import { M, canvasTex, plateTex, plaidTex, quiltTex, dotsTex, floralTex, curtainTex, rng } from '../../engine/tex.js';
import * as P from './plan.js';
import { C, wood, N, S, W, E, wardrobe, bookshelf, cabinet, drawers, chair, stool, table, desk, bed, pillow, quiltRoll, standFan, towerFan, airCooler, bottle, jar, vase, pot, papers, figures, clockFace, lace, curtain, switchPlate, blob } from '../../engine/furn.js';

const G = { grain: 'y', uv: [1, 1] }, U = { uv: [1, 1] };
const { H } = P;
const cloth2 = (tex, key) => { const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }); return m; };
const spot = (b, x, y, z) => b.m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
/* Everything in this file is measured the east half's own way: x here = true x − P.EAST (the lobby recess pushed the two
   bedrooms that much further east than they were first drawn; see plan.js). Both builders therefore work inside a frame
   moved east by EX, and what they hand back as plain positions — bright dots, clocks, the calendar's place — is moved here. */
const EX = P.EAST;
const hotE = (ctx, ...list) => ctx.hot.push(...list.map(h => ({ ...h, pos: [h.pos[0] + EX, h.pos[1], h.pos[2]] })));
const clockE = (ctx, c) => ctx.clocks.push({ ...c, x: c.x + EX });

export function buildBigRoom(b, ctx) {
  b.push(EX, 0, 0, 0);
  const mah = wood(C.mahog, 0.85), shelfW = wood(C.shelf, 0.45), light = wood(C.light, 0.45), ch = M.chrome(), deskW = wood(C.desk, 0.7);

  /* ── his corner ── */
  // the desk on the west wall (the machines of each year are set on it by era.js), the chair, the bag by the pier
  W(b, 3.6, 5.02); desk(b, 1.1, 0.74, 0.56, { mat: deskW, ped: 0.34 });
  ctx.spots.nookDesk = spot(b, 0, 0.74, 0); ctx.spots.nookFloor = spot(b, 0, 0, 0);
  b.pop();
  blob(b, 3.6, 3.92, 4.16, 5.02, 0.42);
  E(b, 4.98, 4.2); chair(b, { mat: wood('#5a2416', 0.6), cushion: M.plain('#e0a02a', 0.9), slats: 4 }); b.pop();
  b.sphere(M.plain('#17181c', 0.8), 4.46, 0.24, 4.05, 0.5, { sx: 0.34, sy: 0.48, sz: 0.24 }); b.sphere(M.plain('#22242a', 0.8), 4.47, 0.2, 4.17, 0.5, { sx: 0.26, sy: 0.3, sz: 0.1 }); b.bar(M.plain('#7fd03a', 0.6), 4.36, 0.4, 4.16, 4.4, 0.06, 4.19, 0.012, { cast: false });
  // on the north wall beside the pier: the hook rail with the charger on it, the little shelf of keepsakes above
  b.box(M.plain('#b9bcc0', 0.3, 0.8), 3.72, 1.6, 3.62, 4.26, 1.63, 3.632, { cast: false });
  for (let x = 3.76; x < 4.24; x += 0.095) b.bar(M.plain('#b9bcc0', 0.3, 0.8), x, 1.615, 3.63, x, 1.56, 3.67, 0.008, { cast: false });
  b.box(M.plain('#1c1c1f', 0.6), 4.12, 1.36, 3.63, 4.2, 1.6, 3.66, {}); b.box(M.glow('#ff3a20', 1.2), 4.15, 1.57, 3.66, 4.17, 1.585, 3.662, { cast: false });
  N(b, 3.68, 3.62, 1.82);
  { const sm = wood('#6a2a18', 0.7), w = 0.6, h = 0.66, d = 0.19, t = 0.02;
    b.box(sm, 0, 0, 0, t, h, d, G); b.box(sm, w - t, 0, 0, w, h, d, G); b.box(sm, 0, 0, 0, w, t, d, U); b.box(sm, 0, h - t, 0, w, h, d, U); b.box(sm, 0, 0.3, 0, w, 0.3 + t, d, U);
    b.box(sm, 0.28, 0, 0, 0.28 + t, 0.3, d, G); b.box(sm, 0.34, 0.3, 0, 0.34 + t, h, d, G);
    b.box(M.books(3, 'white'), 0.03, 0.32, 0.03, 0.33, 0.52, 0.16, { uv: [0.5, 0.2], cast: false });
    b.cyl(M.plain('#f0c23a', 0.5), 0.07, t, 0.1, 0.035, 0.085, { seg: 10 }); b.cyl(M.plain('#bfe0c0', 0.5), 0.15, t, 0.1, 0.016, 0.05, { seg: 8 }); b.cyl(M.plain('#bfe0c0', 0.5), 0.2, t, 0.12, 0.016, 0.045, { seg: 8 });
    pot(b, 0.44, t, 0.1, { r: 0.05, h: 0.06, n: 9, ph: 0.05, color: '#f1efe8' });
    // the zebra and the horse (two small blocky animals)
    for (const [x, c, c2] of [[0.38, '#f2f2ee', '#1c1c1c'], [0.47, '#c98a5a', '#a86a3a']]) {
      b.box(M.plain(c, 0.6), x, 0.38, 0.07, x + 0.09, 0.42, 0.11, {}); for (const dx of [0.005, 0.07]) b.box(M.plain(c, 0.6), x + dx, 0.32, 0.075, x + dx + 0.014, 0.38, 0.105, {});
      b.box(M.plain(c, 0.6), x + 0.075, 0.41, 0.075, x + 0.095, 0.47, 0.105, {}); b.box(M.plain(c2, 0.6), x + 0.085, 0.455, 0.078, x + 0.12, 0.475, 0.102, {});
      if (c2 === '#1c1c1c') for (let s = 0.012; s < 0.085; s += 0.022) b.box(M.plain(c2, 0.6), x + s, 0.38, 0.068, x + s + 0.008, 0.422, 0.112, { cast: false });
    }
    b.cyl(M.plain('#f1efe8', 0.4), 0.54, 0.3 + t, 0.09, 0.022, 0.1, { seg: 8 }); for (const [dy, c] of [[0.02, '#e8443a'], [0.045, '#3aa0d8'], [0.07, '#6fbf3a']]) b.cyl(M.plain(c, 0.5), 0.54, 0.3 + t + dy, 0.09, 0.0225, 0.012, { seg: 8 });
    b.bar(M.plain('#c9ccd0', 0.3, 0.7), 0.54, 0.34, 0.09, 0.5, 0.56, 0.12, 0.006, {});
  }
  b.pop();
  switchPlate(b, 4.49, 1.32, 3.9, '+z', true);
  ctx.spots.calendar = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(3.608 + EX, 1.98, 5.5);      // on the west wall between the desk and the bed (video 0:13, photo of 25/5/2013)
  // the bed along the west wall: head to the south wall, the folded quilt and the pillow at that end
  S(b, 4.55, 7.98); bed(b, 0.95, 1.98, { frame: wood('#4a1c14', 0.7), fh: 0.32, mh: 0.16, head: 0.5, sheet: M.cloth(plaidTex()), sheetUV: [0.9, 0.9] });
  quiltRoll(b, M.cloth(quiltTex()), 0.93, 0.46, 0.34, 0.86, 0.5, 0.2);
  pillow(b, M.cloth(dotsTex()), 0.5, 0.62, 0.3, 0.52, 0.36, 0.11, 6);
  b.pop();
  blob(b, 3.6, 6.0, 4.55, 7.98, 0.5);
  switchPlate(b, 4.74, 0.34, 7.98, '-z');
  // between the bed and the window: the clothes rail with a white shirt on it, the tower fan
  { const x0 = 4.62, x1 = 5.14, z = 7.7, st = M.plain('#c9ccd0', 0.25, 0.85);
    for (const x of [x0, x1]) { b.bar(st, x, 0.02, z, x, 1.38, z, 0.022, { round: true }); b.bar(st, x, 0.02, z - 0.2, x, 0.02, z + 0.2, 0.022, { round: true }); }
    b.bar(st, x0, 1.38, z, x1, 1.38, z, 0.022, { round: true }); b.bar(st, x0, 0.18, z, x1, 0.18, z, 0.016, { round: true });
    const shirt = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.95, side: THREE.DoubleSide });
    b.quad(shirt, '-z', 4.88, 0.98, z - 0.012, 0.42, 0.72, { segA: 8, wave: [16, 0.022] }); b.quad(shirt, '+z', 4.88, 0.98, z + 0.03, 0.42, 0.72, { segA: 8, wave: [16, 0.022, 1] });
    b.bar(M.plain('#c9a45a', 0.7), 4.7, 1.33, z, 5.06, 1.33, z, 0.014, {}); b.bar(st, 4.88, 1.33, z, 4.88, 1.39, z, 0.006, {});
    b.solid(x0 - 0.02, 0, z - 0.05, x1 + 0.02, 1.4, z + 0.05);
  }
  b.push(5.32, 0, 7.45, 0); towerFan(b); b.pop();
  /* the east side of his corner is the back of the row of wardrobes; at its south end the study desk stands in a niche of
     the row under its hutch, facing his corner — right against the middle of the south window, which shows on both sides */
  E(b, 6.36, 6.88);
  { const w = 1.1, d = 0.55;
    b.box(mah, 0, 0, 0, 0.03, 1.95, d, G); b.box(mah, w - 0.03, 0, 0, w, 1.95, d, G); b.box(mah, 0, 0, 0, w, 1.95, 0.02, G);
    b.box(mah, 0, 0.74, 0, w, 0.775, d + 0.03, U); b.box(mah, 0.03, 0.08, 0.02, 0.4, 0.74, d - 0.02, G); drawers(b, mah, 0.045, 0.385, 0.12, 0.72, d - 0.005, 3, { hw: 0.05 });
    for (const y of [1.3, 1.62, 1.93]) b.box(mah, 0.03, y, 0.02, w - 0.03, y + 0.022, d - 0.22, U);
    b.box(M.books(4, 'mixed'), 0.06, 1.322, 0.05, 0.7, 1.58, 0.3, { uv: [1.1, 0.26], cast: false }); b.box(M.books(2, 'school'), 0.05, 1.642, 0.05, 0.85, 1.9, 0.3, { uv: [1.1, 0.26], cast: false });
    papers(b, 0.9, 1.322, 0.18, 0.2, 0.26, 0.06, 5, ['#e8443a', '#f3f0e8', '#3a8fd0', '#f2d23a']);
    // on the desk: lotion bottles, a tissue box, the white basket, the gift bag with pink paper
    bottle(b, '#f3f3ef', 0.52, 0.775, 0.16, 0.03, 0.24, '#f3f3ef'); bottle(b, '#f3f3ef', 0.6, 0.775, 0.14, 0.03, 0.26, '#f3f3ef'); bottle(b, '#dfeaf0', 0.72, 0.775, 0.2, 0.026, 0.17, '#ffffff');
    b.box(M.plain('#f1efe8', 0.7), 0.82, 0.775, 0.16, 1.06, 0.86, 0.36, {}); b.box(M.plain('#d83a4a', 0.6), 0.84, 0.86, 0.2, 1.04, 0.875, 0.34, { cast: false });
    b.box(M.plain('#17171a', 0.7), 0.9, 0.775, 0.02, 1.08, 1.02, 0.12, {}); b.sphere(M.plain('#f25a8a', 0.9), 0.99, 1.04, 0.07, 0.5, { sx: 0.16, sy: 0.1, sz: 0.09 });
    b.box(M.plain('#f6e8d8', 0.8), 0.5, 0.775, 0.38, 0.62, 0.79, 0.5, { cast: false }); b.box(M.plain('#e8556a', 0.7), 0.66, 0.775, 0.4, 0.76, 0.785, 0.47, { cast: false });
    // on the back of the niche, toward the big room: the rail of belts (photo of 22/9/2012)
    b.bar(M.plain('#c9ccd0', 0.3, 0.8), 0.15, 1.74, -0.03, 0.95, 1.74, -0.03, 0.008, {});
    for (const [x, c, l] of [[0.26, '#2a1c14', 0.72], [0.36, '#5a3a22', 0.64], [0.47, '#1c1c1f', 0.76], [0.6, '#6a4a2a', 0.6]]) b.box(M.plain(c, 0.8), x, 1.74 - l, -0.036, x + 0.035, 1.74, -0.028, { cast: false });
    b.solid(0, 0, 0, w, 1.95, d);
  }
  b.pop();
  b.push(6.42, 0, 5.3, 270); airCooler(b); b.pop();
  blob(b, 5.76, 4.68, 6.38, 7.98, 0.5);
  hotE(ctx, { id: 'pc', pos: [3.84, 1.3, 4.5], r: 0.5 }, { id: 'window', pos: [5.45, 1.6, 7.9], r: 0.5 });

  /* ── the row of wardrobes: four doors to the big room, and what stands on top (the globe is seen from both sides) ── */
  W(b, 5.78, 6.88); wardrobe(b, 2.2, 2.05, 0.58, 4, {}); b.pop();
  { const gx = 6.0, gy = 2.1;
    const globe = new THREE.MeshStandardMaterial({ map: plateTex(256, 128, (g, w, h) => { const R = rng(6); g.fillStyle = '#2f86c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#4fa0d8'; for (let i = 0; i < 30; i++) g.fillRect(R() * w, R() * h, 20 + R() * 40, 3); for (const [x, y, rx, ry, c] of [[60, 50, 24, 30, '#58a04a'], [78, 86, 12, 20, '#6ab04a'], [140, 44, 34, 22, '#c9b06a'], [150, 70, 16, 20, '#58a04a'], [200, 86, 16, 11, '#6ab04a'], [30, 40, 18, 12, '#8fb85a'], [215, 40, 20, 14, '#58a04a']]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, R(), 0, 7); g.fill(); } g.fillStyle = '#f3f3ee'; g.fillRect(0, 0, w, 9); g.fillRect(0, h - 12, w, 12); }), roughness: 0.35 });
    b.cyl(M.plain('#e8e4d8', 0.5), gx, gy, 6.7, 0.07, 0.025, { seg: 14 }); b.bar(M.plain('#e8e4d8', 0.5), gx, gy, 6.7, gx + 0.03, gy + 0.16, 6.7, 0.014, { round: true });
    b.geo(globe, new THREE.SphereGeometry(0.15, 24, 16).rotateZ(-0.4).translate(gx, gy + 0.27, 6.7), {});
    b.cyl(M.plain('#17171a', 0.4), gx, gy, 6.36, 0.05, 0.02, { seg: 12 }); b.cyl(M.plain('#17171a', 0.4), gx, gy + 0.02, 6.36, 0.018, 0.1, { seg: 8 });
    b.sphere(M.glass('#f4fbff', 0.22), gx, gy + 0.22, 6.36, 0.12, { seg: 18, cast: false });
    b.box(M.plain('#f2a6bd', 0.8), gx + 0.02, gy, 4.8, gx + 0.3, gy + 0.16, 5.22, {}); b.box(M.plain('#f6d7de', 0.8), gx + 0.06, gy + 0.16, 4.86, gx + 0.26, gy + 0.26, 5.14, {}); b.box(M.plain('#e8e2d0', 0.8), gx - 0.2, gy - 0.05, 5.5, gx + 0.08, gy + 0.2, 5.9, {});
    hotE(ctx, { id: 'globe', pos: [gx, gy + 0.27, 6.7], r: 0.3 });
  }
  // the ledge over the door: two dolls in pink and the small animals
  figures(b, P.D1.a - EX - 0.05, P.D1.b - EX + 0.05, P.D1.y1 + 0.095, 3.71, 11, 5, true);

  /* ── the long wall: books floor to ceiling, the clock, the piano under its shelves ── */
  N(b, 5.92, 3.63);
  bookshelf(b, 2.5, 2.56, 0.3, [0.06, 0.44, 0.8, 1.15, 1.5, 1.84, 2.18], { cols: 3, mat: shelfW, kinds: ['mixed', 'school', 'school', 'mixed', 'school', 'mixed', 'white'], seed: 11, fill: (r, c) => (r === 6 && c === 1 ? 0.55 : r === 0 && c === 0 ? 0.7 : 1) });
  papers(b, 0.4, 0.084, 0.24, 0.3, 0.21, 0.1, 3, ['#dfe8f0', '#f3f0e8', '#e8d0d6']); pot(b, 1.25, 2.204, 0.16, { r: 0.06, h: 0.08, n: 8, ph: 0.06 });
  b.pop();
  blob(b, 5.92, 3.63, 8.42, 3.95, 0.5);
  { const cx = 8.66, cy = 2.08;
    b.cyl(wood('#2c130d', 0.7), cx, cy, 3.62, 0.17, 0.045, { rx: 90, seg: 24 }); b.quad(new THREE.MeshStandardMaterial({ map: clockFace(256), roughness: 0.6 }), '+z', cx, cy, 3.668, 0.29, 0.29, { cast: false });
    clockE(ctx, { x: cx, y: cy, z: 3.672, ry: 0, r: 0.115 });
  }
  /* The north-east corner changes with the years (era.js sets what stands here): until 2008 a study desk under the hanging
     shelves — the Onthi.com reportage of 23/4/2008 was filmed at it — and from 2009 the piano and its stool. Whatever
     stands there, the walker meets the same two obstacles. */
  N(b, 8.9, 3.63); ctx.spots.neCorner = spot(b, 0, 0, 0); b.solid(0, 0, 0, 1.5, 1.2, 0.62); b.solid(0.38, 0, 0.85, 1.11, 0.5, 1.215); b.pop();
  blob(b, 8.9, 3.63, 10.4, 4.25, 0.55);
  N(b, 8.98, 3.63, 1.5);
  { const sm = wood('#6a2a18', 0.7), w = 1.36, t = 0.022, d = 0.2;
    for (const y of [0, 0.3, 0.6, 0.88]) b.box(sm, 0, y, 0, w, y + t, d, U);
    b.box(sm, 0, 0, 0, t, 0.9, d, G); b.box(sm, w - t, 0, 0, w, 0.9, d, G); b.box(sm, 0.42, 0.3, 0, 0.42 + t, 0.6, d, G); b.box(sm, 0.86, 0, 0, 0.86 + t, 0.3, d, G); b.box(sm, 0.6, 0.6, 0, 0.6 + t, 0.88, d, G);
    b.box(M.books(5, 'mixed'), 0.03, 0.022, 0.03, 0.5, 0.25, 0.17, { uv: [0.7, 0.23], cast: false }); b.box(M.books(6, 'school'), 0.9, 0.022, 0.03, 1.33, 0.26, 0.17, { uv: [0.7, 0.24], cast: false });
    b.box(M.books(2, 'school'), 0.45, 0.322, 0.03, 1.1, 0.55, 0.17, { uv: [0.8, 0.23], cast: false }); b.box(M.books(1, 'mixed'), 0.03, 0.622, 0.03, 0.57, 0.84, 0.17, { uv: [0.8, 0.22], cast: false });
    b.box(M.plain('#3a2a22', 0.5), 0.1, 0.322, 0.06, 0.26, 0.54, 0.08, {}); b.box(M.plain('#e8c9d2', 0.6), 0.115, 0.337, 0.08, 0.245, 0.525, 0.082, { cast: false });
    b.box(M.plain('#4a3a32', 0.5), 0.66, 0.622, 0.06, 0.8, 0.8, 0.08, {}); b.box(M.plain('#d9e2c9', 0.6), 0.675, 0.637, 0.08, 0.785, 0.785, 0.082, { cast: false });
    b.cyl(M.plain('#f1efe6', 0.4), 1.2, 0.72, 0.1, 0.07, 0.03, { rx: 90, seg: 16 }); b.cyl(wood('#2c130d', 0.7), 1.2, 0.72, 0.09, 0.08, 0.03, { rx: 90, seg: 16 });
    figures(b, 0.84, 1.12, 0.622, 0.1, 4, 9); figures(b, 0.55, 0.84, 0.022, 0.1, 3, 12);
  }
  b.pop();
  hotE(ctx, { id: 'piano', pos: [9.65, 0.95, 4.1], r: 0.6 }, { id: 'books', pos: [7.15, 1.4, 3.95], r: 0.7 });
  b.push(8.62, 0, 4.02, 160); standFan(b, { h: 1.18, r: 0.2 }); b.pop();

  /* ── the wide window: gold curtains under a pelmet, the air conditioner above, two folding tables under it ── */
  { const gold = cloth2(curtainTex('#d9a25a', 2)), pel = cloth2(curtainTex('#c98f4a', 3));
    const cw = P.BIG_WIN.b - P.BIG_WIN.a + 0.5;
    E(b, 10.6, P.BIG_WIN.a - 0.25);
    curtain(b, gold, 0.0, 0.42, 0.42, 2.26, 0.07, { folds: 6 }); curtain(b, gold, cw - 0.44, cw, 0.42, 2.26, 0.07, { folds: 6 });
    curtain(b, pel, 0, cw, 2.12, 2.4, 0.1, { folds: 34, depth: 0.02 });
    b.box(M.plain('#e9e4d6', 0.8), -0.02, 2.38, 0, cw + 0.02, 2.43, 0.13, {});
    b.pop();
    b.box(M.plain('#f2f2ee', 0.4), 10.4, 2.46, 3.72, 10.6, 2.72, 4.54, {}); b.box(M.plain('#d4d6d6', 0.5), 10.396, 2.48, 3.76, 10.4, 2.54, 4.5, { cast: false });
    for (const z0 of [4.3, 5.2]) {
      E(b, 10.56, z0);
      b.box(light, 0, 0.7, 0, 0.8, 0.725, 0.5, U);
      const st = M.plain('#b9bcc0', 0.3, 0.8); for (const x of [0.06, 0.74]) { b.bar(st, x, 0, 0.05, x, 0.7, 0.45, 0.018, { round: true }); b.bar(st, x, 0, 0.45, x, 0.7, 0.05, 0.018, { round: true }); }
      b.solid(0, 0, 0, 0.8, 0.72, 0.5);
      b.pop();
    }
    papers(b, 10.3, 0.725, 4.6, 0.3, 0.21, 0.02, 2); b.box(M.plain('#f3e9c9', 0.8), 10.2, 0.725, 5.4, 10.5, 0.82, 5.7, {}); papers(b, 10.32, 0.725, 5.82, 0.24, 0.18, 0.04, 4, ['#e9f0d8', '#f3f0e8']);
    W(b, 9.52, 4.92); chair(b, { mat: wood('#3d1711', 0.6), cushion: M.cloth(floralTex('#e9e4d2', ['#6a9a6a', '#d88a9a'], 5)) }); b.box(M.plain('#c8322e', 0.9), -0.02, 0.6, -0.03, 0.44, 0.98, 0.03, {}); b.pop();
    W(b, 9.5, 5.86); chair(b, { mat: wood('#3d1711', 0.6) }); b.pop();
    b.sphere(M.plain('#2b2f3a', 0.85), 9.95, 0.2, 6.3, 0.5, { sx: 0.34, sy: 0.4, sz: 0.24 });
  }
  /* ── the south-east corner: plastic drawers with their pink prints, her desk under its notes, her bed along the wardrobes with its head under the window's east leaves ── */
  { const pl = new THREE.MeshStandardMaterial({ map: plateTex(256, 256, (g, w, h) => { const R = rng(4); g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e88aa6'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = R() * w, y = R() * h, r = 7 + R() * 7; g.beginPath(); for (let k = 0; k < 6; k++) { g.moveTo(x, y); g.arc(x + Math.cos(k * 1.047) * r, y + Math.sin(k * 1.047) * r, r * 0.55, 0, 7); } g.stroke(); } g.strokeStyle = '#d4d2cc'; g.lineWidth = 3; for (let y = 0; y <= h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }), roughness: 0.45 });
    S(b, 10.56, 7.98);
    b.box(M.plain('#f1f0ec', 0.45), 0, 0, 0, 0.95, 1.28, 0.44, { solid: true });
    for (const x of [0.02, 0.485]) b.quad(pl, '+z', x + 0.2225, 0.65, 0.444, 0.445, 1.22, { cast: false });
    for (const x of [0.2425, 0.7075]) for (let i = 0; i < 4; i++) b.box(M.plain('#c9ccd0', 0.3, 0.6), x - 0.06, 0.2 + i * 0.305, 0.444, x + 0.06, 0.215 + i * 0.305, 0.47, { cast: false });
    b.sphere(wood('#4a1c12', 0.7), 0.32, 1.33, 0.22, 0.5, { sx: 0.3, sy: 0.14, sz: 0.3 }); b.box(M.plain('#d9d2c2', 0.8), 0.6, 1.28, 0.06, 0.9, 1.42, 0.38, {});
    b.pop();
    b.box(M.cloth(floralTex('#f1e3d8', ['#d8556a', '#e88aa6', '#8fbf7a'], 8)), 10.26, 0, 7.19, 10.56, 0.62, 7.51, { uv: [0.5, 0.5] }); b.box(M.plain('#e8d6c4', 0.8), 10.28, 0.62, 7.21, 10.54, 0.9, 7.49, {});
    S(b, 9.55, 7.98); desk(b, 1.03, 0.75, 0.55, { mat: light, ped: 0.32 });
    papers(b, 0.22, 0.75, 0.2, 0.3, 0.22, 0.13, 6, ['#f3f1ea', '#dfe8f0', '#f0e4e4', '#e9f0d8']); papers(b, 0.6, 0.75, 0.24, 0.28, 0.2, 0.07, 9); papers(b, 0.86, 0.75, 0.3, 0.22, 0.3, 0.035, 12);
    b.cyl(M.plain('#3a8fd0', 0.5), 0.92, 0.75, 0.1, 0.035, 0.1, { seg: 10 }); for (let i = 0; i < 4; i++) b.bar(M.plain(['#e8443a', '#2a2a2a', '#3a6fd8', '#f2c23a'][i], 0.5), 0.92, 0.8, 0.1, 0.9 + i * 0.012, 0.93, 0.085 + i * 0.01, 0.006, { cast: false });
    b.pop();
    const R = rng(2); for (let i = 0; i < 9; i++) b.quad(M.plain(['#f6e36a', '#8fd0f0', '#f6a6c0', '#a6e08a'][(R() * 4) | 0], 0.9), '-z', 8.7 + R() * 0.8, 1.2 + R() * 0.5, 7.996, 0.075, 0.075, { cast: false });
    N(b, 8.86, 6.87); chair(b, { mat: wood('#3d1711', 0.6), cushion: M.plain('#e2a03a', 0.9) }); b.pop();
    S(b, 7.9, 7.98); bed(b, 1.5, 2.04, { frame: wood('#c79a52', 0.5), fh: 0.32, mh: 0.17, sheet: M.cloth(floralTex('#5f7a66', ['#e9efe4', '#9fb89a', '#d9c9a8'], 3)), sheetUV: [1, 1] });
    // the cane headboard
    { const cane = wood('#c9a060', 0.4); b.box(cane, 0, 0.3, -0.05, 0.05, 0.92, 0, G); b.box(cane, 1.45, 0.3, -0.05, 1.5, 0.92, 0, G); b.box(cane, 0, 0.86, -0.05, 1.5, 0.94, 0, U); b.box(M.plain('#d9b878', 0.8), 0.05, 0.4, -0.035, 1.45, 0.86, -0.02, {}); }
    pillow(b, M.plain('#eef0e6', 0.95), 0.4, 0.5, 0.3, 0.56, 0.38, 0.12, -6); pillow(b, M.cloth(floralTex('#f3e6ea', ['#e88aa6', '#9fc79a'], 6)), 1.05, 0.5, 0.32, 0.56, 0.38, 0.12, 8);
    for (const [x, z, c, w, d] of [[0.5, 1.2, '#2a2c33', 0.34, 0.26], [0.95, 1.3, '#3a5fa8', 0.3, 0.24], [0.56, 1.62, '#f1e9dc', 0.32, 0.26], [1.02, 1.66, '#d85a9a', 0.3, 0.22], [0.8, 1.0, '#e9d7dc', 0.36, 0.2]]) b.box(M.plain(c, 0.95), x - w / 2, 0.49, z - d / 2, x + w / 2, 0.53, z + d / 2, {});
    b.pop();
    blob(b, 6.4, 5.94, 7.9, 7.98, 0.5); blob(b, 8.52, 7.43, 10.56, 7.98, 0.45);
  }
  /* ── lights: a tube on the ceiling of each half ── */
  for (const [x, z, len] of [[8.5, 5.7, 1.2], [4.7, 5.9, 0.6]]) { b.box(M.plain('#e9e7e0', 0.6), x - len / 2 - 0.04, H - 0.035, z - 0.035, x + len / 2 + 0.04, H, z + 0.035, { cast: false }); b.cyl(ctx.lampMat('#f4f8ff', 2.6, 0.95), x + len / 2, H - 0.052, z, 0.017, len, { rz: 90, seg: 8, cast: false }); }
  b.pop();
}

/** the upright piano: black, a lace runner on its lid, flowers and a music box on top */
export function piano(b) {
  const k = M.pianoBlack(), w = 1.5;
  b.box(k, 0, 0, 0, w, 0.62, 0.34, {}); b.box(k, 0, 0.62, 0, w, 1.2, 0.32, {}); b.box(k, -0.01, 1.2, -0.005, w + 0.01, 1.235, 0.34, {});
  b.box(k, 0, 0.6, 0.3, w, 0.7, 0.62, {}); b.box(k, 0.0, 0.7, 0.3, 0.07, 0.76, 0.62, {}); b.box(k, w - 0.07, 0.7, 0.3, w, 0.76, 0.62, {});
  for (const x of [0.02, w - 0.09]) b.box(k, x, 0, 0.5, x + 0.07, 0.6, 0.6, {});
  b.box(M.plain('#f4f2ea', 0.3), 0.075, 0.7, 0.42, w - 0.075, 0.716, 0.615, { cast: false });
  for (let i = 0; i < 51; i++) b.box(M.plain('#bdbab0', 0.5), 0.075 + i * (w - 0.15) / 51, 0.7, 0.42, 0.0765 + i * (w - 0.15) / 51, 0.7165, 0.615, { cast: false });
  for (let i = 0; i < 51; i++) { const n = i % 7; if (n === 2 || n === 6) continue; b.box(M.plain('#0b0b0c', 0.3), 0.075 + (i + 0.68) * (w - 0.15) / 51, 0.716, 0.42, 0.075 + (i + 1.28) * (w - 0.15) / 51, 0.727, 0.54, { cast: false }); }
  b.box(k, 0.07, 0.7, 0.33, w - 0.07, 0.86, 0.42, {});
  for (const x of [w / 2 - 0.12, w / 2, w / 2 + 0.12]) b.box(M.plain('#c9a03a', 0.3, 0.9), x - 0.02, 0.03, 0.34, x + 0.02, 0.05, 0.44, { cast: false });
  lace(b, 0.02, w - 0.02, 1.236, 0, 0.34, 0.17, ['f', 'l', 'r']);
  vase(b, 0.3, 1.24, 0.16, { color: '#e9e6f2', h: 0.16, r: 0.05, flowers: ['#9a6fd0', '#b88ae0', '#7a5ab8', '#d0a6e8'], n: 14, spread: 0.11, stem: 0.1, seed: 9 });
  b.box(M.plain('#f29ab8', 0.7), 0.62, 1.24, 0.08, 0.86, 1.33, 0.26, {}); b.box(wood('#6a2a18', 0.6), 1.05, 1.24, 0.1, 1.25, 1.31, 0.24, {}); b.cyl(M.plain('#e8e2d0', 0.4), 1.36, 1.24, 0.16, 0.035, 0.1, { seg: 10 });
  b.solid(0, 0, 0, w, 1.24, 0.62);
}

/* ── the parents' room ───────────────────────────────────────────────── */
export function buildParents(b, ctx) {
  b.push(EX, 0, 0, 0);
  const cherry = wood('#a8542a', 0.7), red = wood(C.bedred, 0.75), mah = wood(C.mahog, 0.85);
  const X0 = P.NICHE.x0 - EX;      // the wardrobe and the shelves stand in the niche behind the TV wall, their fronts near the door wall
  // wardrobe and the open shelves of bedding on the west wall
  W(b, X0, 1.92); wardrobe(b, 1.2, 2.02, 0.55, 2, { mat: cherry, panels: [[0.12, 0.42], [0.5, 1.9]] }); b.pop();
  W(b, X0, 0.7);
  { const w = 0.62, d = 0.52;
    b.box(cherry, 0, 0, 0, 0.025, 2.02, d, G); b.box(cherry, w - 0.025, 0, 0, w, 2.02, d, G); b.box(cherry, 0, 0, 0, w, 2.02, 0.015, G);
    const R = rng(8), cols = ['#f1ece0', '#c9d8c0', '#e8d0d6', '#d9e0ec', '#8fa39a', '#f3e9c9'];
    for (const y of [0.06, 0.55, 0.98, 1.4, 1.8]) { b.box(cherry, 0, y, 0, w, y + 0.024, d, U); if (y < 1.7) for (let i = 0; i < 3; i++) b.box(M.plain(cols[(R() * cols.length) | 0], 0.95), 0.05 + R() * 0.04, y + 0.024 + i * 0.1, 0.08, w - 0.05 - R() * 0.05, y + 0.12 + i * 0.1, d - 0.04 - R() * 0.06, {}); }
    b.solid(0, 0, 0, w, 2.02, d);
  }
  b.pop();
  blob(b, X0, 0.08, X0 + 0.55, 1.92, 0.5);
  // the bed, its head to the north wall, and the boarded frame behind it
  N(b, 6.5, 0.07); bed(b, 1.6, 2.05, { frame: red, fh: 0.32, mh: 0.18, head: 0.95, headSlats: 4, foot: 0.4, sheet: M.cloth(floralTex('#a59aa6', ['#c98aa0', '#8f8a9a', '#d9c9d0', '#7a8a8a'], 4)), sheetUV: [1.1, 1.1] });
  pillow(b, M.plain('#f2f0ea', 0.95), 0.42, 0.52, 0.32, 0.6, 0.4, 0.13, 4); pillow(b, M.cloth(floralTex('#f1ead2', ['#e88aa6', '#9fc79a', '#f0c23a'], 7)), 1.14, 0.52, 0.34, 0.6, 0.4, 0.13, -5);
  quiltRoll(b, M.cloth(floralTex('#5a6a5c', ['#8fa39a', '#c9d2c0', '#3f4a40'], 9)), 1.25, 0.5, 0.95, 0.9, 0.5, 0.26, 8);
  b.pop();
  blob(b, 6.5, 0.07, 8.1, 2.14, 0.55);
  { const x0 = 6.3, x1 = 8.28;
    b.box(red, x0, 0.05, 0, x1, 2.3, 0.022, { uv: [1, 1] });
    for (let y = 0.12; y < 2.28; y += 0.13) b.box(wood('#6a2c1a', 0.7), x0, y, 0.022, x1, y + 0.012, 0.026, { cast: false });
    b.box(M.plain('#f1eee6', 0.9), x0 + 0.26, 0.7, 0.022, x1 - 0.26, 2.06, 0.03, { cast: false });
    // the quarter-round shelves, then the wall cupboards with hangers hooked under them
    for (const y of [1.76, 2.06, 2.36]) b.cyl(cherry, x1, y, 0, 0.19, 0.022, { seg: 16 });
    b.cyl(M.plain('#17171a', 0.5), x1 + 0.06, 1.782, 0.08, 0.03, 0.07, { seg: 10 }); b.sphere(M.plain('#e8558a', 0.7), x1 + 0.06, 1.9, 0.08, 0.03, { seg: 8 }); b.bar(M.plain('#3f7a3a', 0.8), x1 + 0.06, 1.85, 0.08, x1 + 0.06, 1.9, 0.08, 0.006, {});
    N(b, 8.47, 0, 1.76); wardrobe(b, 0.7, 0.64, 0.36, 4, { mat: cherry, panels: [], cornice: false, handle: 'none' });
    for (let i = 0; i < 4; i++) b.box(M.chrome(), 0.06 + i * 0.175 + (i % 2 ? 0 : 0.06), 0.06, 0.36, 0.075 + i * 0.175 + (i % 2 ? 0 : 0.06), 0.3, 0.38, { cast: false });
    b.pop();
    for (const [x, c] of [[8.62, '#17171a'], [8.95, '#f2e6a0']]) { b.bar(M.plain(c, 0.5), x, 1.76, 0.3, x, 1.68, 0.3, 0.006, {}); b.bar(M.plain(c, 0.5), x - 0.2, 1.6, 0.3, x, 1.68, 0.3, 0.008, {}); b.bar(M.plain(c, 0.5), x + 0.2, 1.6, 0.3, x, 1.68, 0.3, 0.008, {}); b.bar(M.plain(c, 0.5), x - 0.2, 1.6, 0.3, x + 0.2, 1.6, 0.3, 0.008, {}); }
  }
  // bedside cabinet with the house phone, and the small table that collects everything
  N(b, 8.16, 0.05); cabinet(b, 0.46, 0.52, 0.42, 1, { mat: red });
  b.box(M.plain('#ebe4cf', 0.5), 0.1, 0.52, 0.12, 0.34, 0.58, 0.32, {}); b.box(M.plain('#e2dac2', 0.5), 0.1, 0.58, 0.14, 0.17, 0.62, 0.3, {}); b.box(M.plain('#3a3a3a', 0.6), 0.2, 0.582, 0.2, 0.32, 0.585, 0.3, { cast: false });
  b.pop();
  N(b, 8.68, 0.06); table(b, 0.86, 0.5, 0.52, { mat: red, leg: 0.045 });
  { const R = rng(31), cols = ['#6fbf3a', '#f29a3a', '#3aa0d8', '#f2d23a', '#e8556a', '#f3f1ea', '#8a6fd0'];
    for (let i = 0; i < 12; i++) { const x = 0.08 + R() * 0.7, z = 0.08 + R() * 0.34; if (R() < 0.5) bottle(b, cols[(R() * 7) | 0], x, 0.5, z, 0.02 + R() * 0.012, 0.1 + R() * 0.1); else b.box(M.plain(cols[(R() * 7) | 0], 0.7), x - 0.05, 0.5, z - 0.04, x + 0.05, 0.54 + R() * 0.06, z + 0.04, {}); }
    b.box(M.plain('#7fd03a', 0.6), 0.3, 0.5, 0.08, 0.62, 0.56, 0.3, {}); b.box(M.plain('#e9a6c0', 0.7), 0.5, 0.2, 0.1, 0.8, 0.5, 0.4, {});
  }
  b.pop();
  blob(b, 8.16, 0.05, 9.54, 0.58, 0.4);
  hotE(ctx, { id: 'phone', pos: [8.39, 0.7, 0.28], r: 0.3 });
  // the balcony door: long drapes on both sides, a fan, a stool
  { const peach = cloth2(curtainTex('#e9b79a', 4)), green = cloth2(curtainTex('#c9cfae', 5));
    E(b, 9.6, 0.5);
    curtain(b, green, 0.0, 0.34, 0.06, 2.62, 0.05, { folds: 5 }); curtain(b, peach, 0.3, 0.68, 0.06, 2.62, 0.075, { folds: 6 });
    curtain(b, peach, 1.74, 2.14, 0.06, 2.62, 0.075, { folds: 6 }); curtain(b, green, 2.1, 2.5, 0.06, 2.62, 0.05, { folds: 5 });
    b.bar(M.plain('#d9d2c2', 0.5), -0.05, 2.64, 0.07, 2.6, 2.64, 0.07, 0.022, { round: true });
    b.pop();
    b.push(9.22, 0, 0.82, 250); standFan(b, { h: 1.05, r: 0.17, color: '#f2d7e2' }); b.pop();
    b.push(9.1, 0, 2.38, 0); stool(b, { w: 0.3, h: 0.4, mat: wood('#2c130d', 0.7) }); b.pop();
  }
  // the desk in the south-east corner (its machine is set by era.js), the chair with a shirt over its back
  S(b, 9.56, 3.48); desk(b, 1.1, 0.75, 0.55, { mat: cherry, ped: 0.34 });
  ctx.spots.parDesk = spot(b, 0, 0.75, 0); ctx.spots.parFloor = spot(b, 0, 0, 0);
  b.cyl(M.plain('#2a2a2c', 0.4), 0.95, 0.75, 0.38, 0.06, 0.015, { seg: 12 }); b.bar(M.plain('#2a2a2c', 0.4), 0.95, 0.76, 0.38, 0.95, 1.05, 0.3, 0.012, { round: true }); b.bar(M.plain('#2a2a2c', 0.4), 0.95, 1.05, 0.3, 0.82, 1.1, 0.42, 0.012, { round: true }); b.cyl(M.plain('#2a2a2c', 0.4), 0.82, 1.06, 0.42, 0.05, 0.06, { seg: 10, r2: 0.025 });
  b.pop();
  blob(b, 8.46, 2.93, 9.56, 3.48, 0.45);
  N(b, 8.72, 2.28); chair(b, { mat: wood('#5a2416', 0.6) }); b.box(M.plain('#f3f3f0', 0.95), -0.015, 0.55, -0.03, 0.435, 0.98, 0.035, {}); b.pop();
  // on the south wall: the air conditioner, the hanging pockets, the row of hooks by the door with the day's clothes
  b.box(M.plain('#f2f2ee', 0.4), 8.4, 2.44, 3.3, 9.25, 2.72, 3.5, {}); b.box(M.plain('#d4d6d6', 0.5), 8.44, 2.46, 3.296, 9.21, 2.51, 3.3, { cast: false });
  b.box(M.plain('#3a8fc0', 0.9), 7.55, 1.15, 3.47, 7.98, 1.95, 3.5, {}); for (const y of [1.2, 1.46, 1.72]) b.box(M.plain('#4fa6d8', 0.9), 7.57, y, 3.455, 7.96, y + 0.2, 3.47, { cast: false });
  b.box(mah, 6.62, 1.72, 3.48, 7.28, 1.76, 3.5, { cast: false });
  { const R = rng(17), cl = [['#f3f3f0', 0.72], ['#8a8f96', 0.6], ['#9a7fd0', 0.52], ['#b8d86a', 0.5], ['#e9d0c0', 0.66]];
    cl.forEach(([c, len], i) => { const x = 6.7 + i * 0.13; b.quad(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }), '-z', x, 1.72 - len / 2, 3.44 - i * 0.012 - R() * 0.01, 0.3, len, { segA: 6, wave: [18, 0.018, i] }); });
  }
  switchPlate(b, P.PAR.x0 - EX, 1.3, 2.4, '+x');
  // the vent fan high on the gallery wall, the ceiling lamp
  b.cyl(M.plain('#e9e7e0', 0.5), 9.36, 2.46, 0, 0.16, 0.03, { rx: 90, seg: 18 }); for (let i = 0; i < 4; i++) b.rbox(M.plain('#cfcdc4', 0.5), 9.36, 2.46, 0.032, 0.28, 0.02, 0.004, 0, { rz: i * 45, cast: false });
  b.cyl(M.plain('#e9e7e0', 0.5), 7.6, H - 0.03, 1.8, 0.2, 0.03, { seg: 20 }); b.cyl(ctx.lampMat('#fff4dc', 2.2, 0.9), 7.6, H - 0.075, 1.8, 0.17, 0.045, { seg: 20, cast: false });
  b.pop();
}

/** the piano's stool: black, buttoned */
export function pianoStool(b) {
  const bl = M.plain('#0c0c0d', 0.3);
  for (const [x, z] of [[0.02, 0.02], [0.66, 0.02], [0.02, 0.3], [0.66, 0.3]]) b.box(M.pianoBlack(), x, 0, z, x + 0.045, 0.42, z + 0.045, {});
  b.box(M.pianoBlack(), 0, 0.38, 0, 0.73, 0.44, 0.365, {}); b.box(bl, 0.01, 0.44, 0.01, 0.72, 0.5, 0.355, {});
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) b.sphere(M.plain('#1c1c1e', 0.3), 0.14 + i * 0.225, 0.5, 0.11 + j * 0.15, 0.012, { seg: 6, cast: false });
}
