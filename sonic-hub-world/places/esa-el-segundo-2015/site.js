/* The hotel's grounds and the shopping centre's lot next door: asphalt, stripes, curbs, planting strips, the white
   picket fence between the two, the trees along it (the light-green ones in the photographs of 22/9), lot lights, parked
   cars of 2015 — and the old Beetle and the mattress against the stair tower that stood there on the morning of 22/9.
   Positions from the satellite picture of the block, laid on the County's footprints (osm.js frame). */
import * as THREE from 'three';
import { part } from '../../engine/kit.js';
import { M, canvasTex, plateTex, rng } from '../../engine/tex.js';
import { X } from './mat.js';
import { P, tree, car, beetle, lotLight, fence, glare } from './props.js';
import { WINGS } from './plan.js';

const STALL = 2.75, DEPTH = 5.4;
/** one row of stalls along z (cars facing +x when face=90, −x when 270) from z0 to z1, its stripes from x0 to x1 */
function stallsZ(b, x0, x1, z0, z1, face, fill, R, skip = () => false) {
  const n = Math.floor((z1 - z0) / STALL);
  for (let i = 0; i <= n; i++) { const z = z0 + i * STALL; if (skip(z)) continue; b.box(P.stripe(), Math.min(x0, x1), 0.012, z - 0.05, Math.max(x0, x1), 0.016, z + 0.05, { cast: false }); }
  for (let i = 0; i < n; i++) {
    const zc = z0 + (i + 0.5) * STALL; if (skip(zc)) continue;
    const xs = Math.min(x0, x1), xe = Math.max(x0, x1), stop = face === 90 ? xe - 0.75 : xs + 0.75;
    b.box(P.curb(), stop - 0.08, 0, zc - 0.9, stop + 0.08, 0.13, zc + 0.9, { cast: false });
    if (R() < fill) car(b, (xs + xe) / 2 + (face === 90 ? 0.25 : -0.25), zc + (R() - 0.5) * 0.25, face + (R() - 0.5) * 4, { seed: (zc * 13 + xs * 7) | 0 });
  }
}
/** the same along x (cars facing +z when face=180, −z when 0) */
function stallsX(b, z0, z1, x0, x1, face, fill, R, skip = () => false) {
  const n = Math.floor((x1 - x0) / STALL);
  for (let i = 0; i <= n; i++) { const x = x0 + i * STALL; if (skip(x)) continue; b.box(P.stripe(), x - 0.05, 0.012, Math.min(z0, z1), x + 0.05, 0.016, Math.max(z0, z1), { cast: false }); }
  for (let i = 0; i < n; i++) {
    const xc = x0 + (i + 0.5) * STALL; if (skip(xc)) continue;
    const zs = Math.min(z0, z1), ze = Math.max(z0, z1), stop = face === 180 ? ze - 0.75 : zs + 0.75;
    b.box(P.curb(), xc - 0.9, 0, stop - 0.08, xc + 0.9, 0.13, stop + 0.08, { cast: false });
    if (R() < fill) car(b, xc + (R() - 0.5) * 0.25, (zs + ze) / 2 + (face === 180 ? 0.25 : -0.25), face + (R() - 0.5) * 4, { seed: (xc * 11 + zs * 5) | 0 });
  }
}
/** a raised planter (curb all round, mulch or lawn in it) */
export function planter(b, x0, z0, x1, z1, o = {}) {
  const c = o.red ? P.red() : P.curb(), t = 0.15;
  b.box(o.lawn ? X.lawn() : X.mulch(), x0 + t, 0.0, z0 + t, x1 - t, 0.12, z1 - t, { uv: [1.5, 1.5], uvw: true, cast: false });
  for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]]) b.box(c, a0, 0, c0, a1, 0.16, c1, { cast: false });
  if (o.solid) b.solid(x0, 0, z0, x1, 0.16, z1);
}

export function buildSite(scene, shared, ctx) {
  const R = rng(2015);
  const glowLot = ctx.lampMat('#ffd9a0', 2.6, 0.9, 0.04);
  const lights = [];
  /* ── the hotel's lot ── */
  const hotel = part(scene, shared, b => {
    // asphalt over the whole block (the streets and the shops' lot draw their own on top)
    b.box(X.asphalt('#3d3d3c', 3), -100, -0.04, -68, 52, 0.0, 132, { uv: [4, 4], uvw: true, cast: false });
    const n = WINGS.north, s = WINGS.south;
    const towerAt = (z, wing) => wing.towers.some(t => t.side === 'A' && z > t.a0 - 0.8 && z < t.a1 + 0.8);
    const towerAtE = (z, wing) => wing.towers.some(t => t.side === 'B' && z > t.a0 - 0.8 && z < t.a1 + 0.8);
    // west of the two wings: a row of stalls nose-in to the building, the drive, a row nose-in to the fence
    // (four stalls of the north wing are kept as they stood on the morning of 22/9: the two handicap stalls south of the
    // north-west tower, empty, the island beyond them, and the one by the fence where the brown Beetle was; `keep`
    // passes a stall over while drawing the same numbers as a filled or empty stall would, so every other car stays
    // where it was)
    const keep = (centres, fill) => z => { if (!centres.some(c => Math.abs(z - c) < 0.05)) return false; if (R() < fill) { R(); R(); } return true; };
    const HC = [n.z0 + 0.6 + 4.5 * STALL, n.z0 + 0.6 + 5.5 * STALL], ISLAND = n.z0 + 0.6 + 6.5 * STALL, BEETLE = n.z0 - 2 + 0.5 * STALL;
    // (and the fence row stood empty from the Beetle down to where he took the photograph)
    const keepE = keep([...HC, ISLAND], 0.5), keepW = keep(Array.from({ length: 11 }, (_, i) => BEETLE + i * STALL), 0.55);
    for (const w of [n, s]) {
      stallsZ(b, 6.6, 11.9, w.z0 + 0.6, w.z1 - 0.6, 90, 0.5, R, z => towerAt(z, w) || (w === n && keepE(z)));
      stallsZ(b, -6.7, -1.3, w.z0 - 2, w.z1 + 1, 270, 0.55, R, z => w === n && keepW(z));
      stallsZ(b, 30.7, 35.7, w.z0 + 0.6, w.z1 - 0.6, 270, 0.45, R, z => towerAtE(z, w));
    }
    // the two handicap stalls south of the north-west tower: a blue square with its white mark at the head of each, blue
    // lines round them (the photograph of 09:48); south of them a red-curbed island of shrubs
    for (const zc of HC) {
      b.box(M.plain('#2d6db5', 0.8), 7.0, 0.013, zc - 0.65, 8.3, 0.017, zc + 0.65, { cast: false });
      b.box(P.stripe(), 7.15, 0.018, zc - 0.5, 8.15, 0.02, zc - 0.42, { cast: false }); b.box(P.stripe(), 7.15, 0.018, zc + 0.42, 8.15, 0.02, zc + 0.5, { cast: false });
      b.box(P.stripe(), 7.15, 0.018, zc - 0.5, 7.23, 0.02, zc + 0.5, { cast: false }); b.box(P.stripe(), 8.07, 0.018, zc - 0.5, 8.15, 0.02, zc + 0.5, { cast: false });
      b.box(P.stripe(), 7.5, 0.018, zc - 0.12, 7.85, 0.02, zc + 0.12, { cast: false });
      for (const dz of [-STALL / 2, STALL / 2]) b.box(M.plain('#2d6db5', 0.8), 6.6, 0.017, zc + dz - 0.06, 11.9, 0.021, zc + dz + 0.06, { cast: false });
    }
    planter(b, 6.9, ISLAND - STALL / 2 + 0.15, 11.9, ISLAND + STALL / 2 - 0.15, { red: true, solid: true });
    for (const [x, z, r] of [[8.0, ISLAND - 0.4, 0.6], [9.6, ISLAND + 0.3, 0.7], [11.0, ISLAND - 0.2, 0.55]]) b.sphere(P.leaves('#46682c', 1), x, 0.45, z, r, { seg: 7, sy: 0.75, cast: false });
    // the curb and planting strip along the fence, its trees and lights; the fence itself
    // (it stops short of the main wing: the drive from Mariposa comes round the wing's west end into this lot)
    b.box(P.curb(), -7.05, 0, -13, -6.75, 0.16, 128, { cast: false, solid: true });
    b.box(X.mulch(), -10.6, 0, -13, -7.05, 0.1, 128, { uv: [1.5, 1.5], uvw: true, cast: false });
    for (let z = -10; z < 126; z += 9.5 + R() * 4) tree(b, -8.9 + (R() - 0.5) * 0.8, z, { h: 6.5 + R() * 2, r: 2.4 + R() * 0.8, leaves: P.leaves(R() < 0.6 ? '#79a046' : '#5f8a35', 2 + ((R() * 3) | 0)) });
    for (let z = -4; z < 126; z += 7) b.sphere(P.leaves('#3f6328', 5), -8.0 + R() * 0.6, 0.35, z + R() * 3, 0.55, { seg: 7, sy: 0.7, cast: false });
    fence(b, -10.25, -12.6, -10.25, 128, 1.5);
    for (const z of [6, 34, 62, 92, 120]) { lotLight(b, -8.3, z, 8.2, glowLot, 2, 90); lights.push([-8.3, 8, z]); }
    // the east side: its drive, a strip of trees against the neighbours' lot
    b.box(P.curb(), 43.6, 0, -24, 43.9, 0.16, 128, { cast: false, solid: true });
    b.box(X.mulch(), 43.9, 0, -24, 49.5, 0.1, 128, { uv: [1.5, 1.5], uvw: true, cast: false });
    for (let z = -20; z < 126; z += 8 + R() * 5) tree(b, 46.5 + (R() - 0.5) * 2, z, { h: 7 + R() * 3, r: 2.6 + R() });
    for (const z of [10, 48, 86, 118]) { lotLight(b, 44.6, z, 8.2, glowLot, 2, 270); lights.push([44.6, 8, z]); }
    // between the north wing and the main wing: stalls along the main wing, an island with a tree and the blue sign
    stallsX(b, -26.4, -21.2, -18, 24, 0, 0.5, R, x => (x > -18.9 && x < -13.9) || (x > 20.6 && x < 26.1));       // not where the two stair towers stand
    planter(b, 4, -14.5, 26, -7.5, { red: true });
    tree(b, 9, -11, { h: 6.5 }); tree(b, 20.5, -11, { h: 7 }); for (let x = 5.5; x < 25; x += 2.2) b.sphere(P.leaves('#46682c', 1), x, 0.45, -11 + (R() - 0.5), 0.6, { seg: 7, sy: 0.7, cast: false });
    b.box(P.pole(), 13.9, 0, -8.0, 13.98, 2.1, -7.92, {}); b.box(M.plain('#2d6db5', 0.6), 13.7, 1.6, -7.95, 14.2, 2.15, -7.9, { cast: false });
    // north of the main wing: a row of stalls along it, and along Mariposa a row against the planting strip
    stallsX(b, -51.9, -46.7, -20, 22, 180, 0.4, R);
    stallsX(b, -65.8, -60.4, -14.5, 22, 0, 0.35, R);
    b.box(X.lawn(), -40, 0.0, -68.5, 50, 0.1, -65.8, { uv: [2, 2], uvw: true, cast: false });
    // the big trees west of the main wing, between it and the shops' lot
    for (let z = -64; z < -24; z += 7.5) tree(b, -33.5 + (R() - 0.5) * 2, z, { h: 9 + R() * 3, r: 3.4 + R(), leaves: P.leaves('#3f5f2a', 6) });
    b.box(X.mulch(), -37, 0, -66, -30, 0.1, -22, { uv: [1.5, 1.5], uvw: true, cast: false });
    // the picnic table and the grill in the breezeway between the two north–south wings
    picnic(b, 6.0, 55.0);
    // the hotel's sign at the west entrance on Mariposa: a stucco monument with its name in plain letters
    monument(b, -17.5, -66.6);
    // the morning of 22/9: the brown Beetle nose-in to the fence at the lot's north end, a blue mattress on its side
    // against the south face of the north-west stair tower (the photograph of 09:48:14, taken from the drive 16 m south)
    beetle(b, -3.75, BEETLE, 270);
    { const tw = n.towers.find(t => t.side === 'A' && t.a0 < 30);
      b.rbox(M.plain('#8fb4dd', 0.9), 10.0, 0.72, tw.a1 + 0.3, 1.9, 1.4, 0.24, 0, { rx: -11 });
      for (let i = 0; i < 5; i++) b.rbox(M.plain('#a9c7e8', 0.9), 9.24 + i * 0.38, 0.72, tw.a1 + 0.425, 0.012, 1.36, 0.005, 0, { rx: -11, cast: false });     // its quilting
      b.solid(9.0, 0, tw.a1, 11.0, 1.4, tw.a1 + 0.6); }
  }, 'hotelLot');

  /* ── the shopping centre's lot: rows of stalls from the Starbucks corner down to the front of Ralphs ── */
  const shops = part(scene, shared, b => {
    const rows = [[-21.5, -10.9], [-39.5, -28.5], [-57.5, -46.5], [-75.5, -64.5]];
    for (const [x0, x1] of rows) {
      const zTop = x0 < -60 ? 5 : x0 > -25 ? -12 : -20, line = (x0 + x1) / 2;
      stallsZ(b, x0, line, zTop, 56, 270, 0.62, R);
      stallsZ(b, line, x1, zTop, 56, 90, 0.62, R);
      planter(b, x0 + 0.4, zTop - 4.2, x1 - 0.4, zTop - 0.2, { solid: true }); tree(b, line, zTop - 2.2, { h: 7.5, r: 2.6 });
      planter(b, x0 + 0.4, 56.2, x1 - 0.4, 59.0, { solid: true }); tree(b, line - 2.5, 57.6, { h: 6.5, r: 2.2 });
      planter(b, line - 0.7, 22, line + 0.7, 28, { solid: true }); tree(b, line, 25, { h: 7, r: 2.4 });
      lotLight(b, line, 25, 9, glowLot, 2, 90); lights.push([line, 9, 25]);
      // a cart corral in each row
      cartCorral(b, line, 40);
    }
    // the drive in front of Ralphs, its stripes
    b.box(P.stripe(), -84, 0.012, 59.2, -14, 0.016, 59.3, { cast: false });
  }, 'shopLot');

  /* ── at night: pools of light under the lot lights ── */
  const pools = part(scene, null, b => {
    const tex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 31); r.addColorStop(0, 'rgba(255,214,150,0.55)'); r.addColorStop(0.5, 'rgba(255,200,130,0.2)'); r.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { repeat: false });
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); m.userData.noCast = true; m.userData.noRecv = true; m.userData.order = 1;
    for (const [x, , z] of lights) b.quad(m, '+y', x, 0.03, z, 22, 22, { cast: false, recv: false });
  }, 'pools');
  pools.visible = false;
  const shine = glare(scene, lights.map(([x, y, z]) => [x, y - 0.25, z]), 2.6, [255, 222, 170], 'lot glare');
  return {
    lights,
    setHour(h) { pools.visible = shine.visible = h === 'toi'; },
    animate() {},
  };
}

/** a picnic table and a charcoal grill on a post (the hotel's "picnic area") */
function picnic(b, x, z) {
  const wd = M.wood('#8a6a48', 0.3, 3);
  b.box(X.conc('#bdb9b0', 6, true), x - 2.5, 0, z - 1.8, x + 2.5, 0.1, z + 1.8, { uv: [1.5, 1.5], uvw: true, cast: false });
  b.box(wd, x - 1.0, 0.72, z - 0.4, x + 1.0, 0.77, z + 0.4, {});
  for (const s of [-1, 1]) { b.box(wd, x - 1.0, 0.42, z + s * 0.55 - 0.15, x + 1.0, 0.46, z + s * 0.55 + 0.15, {}); for (const e of [-0.8, 0.8]) b.bar(M.plain('#3a3a3a', 0.5, 0.6), x + e, 0.1, z + s * 0.7, x + e, 0.75, z - s * 0.1, 0.05, {}); }
  b.solid(x - 1.0, 0, z - 0.75, x + 1.0, 0.77, z + 0.75);
  b.cyl(M.plain('#2b2b2b', 0.6, 0.5), x + 1.9, 0.1, z - 1.0, 0.04, 0.8, { seg: 6 });
  b.box(M.plain('#1f1f1f', 0.5, 0.6), x + 1.6, 0.9, z - 1.25, x + 2.2, 1.12, z - 0.75, {});
}
/** a monument sign: a stucco slab, a tile cap, the name in plain letters (no logo) */
function monument(b, x, z) {
  b.box(X.stucco('#d6bf86', 7), x - 2.2, 0, z - 0.35, x + 2.2, 1.7, z + 0.35, { uv: [2, 2], uvw: true, solid: true });
  b.box(X.roof('#a94c33', 5), x - 2.35, 1.7, z - 0.45, x + 2.35, 1.86, z + 0.45, {});
  const t = plateTex(512, 96, (g, w, h) => { g.fillStyle = '#efe7d2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b3b52'; g.font = '600 38px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Extended Stay America', w / 2, h * 0.42); g.font = '20px sans-serif'; g.fillText('1910 E Mariposa Ave', w / 2, h * 0.8); });
  b.quad(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), '-z', x, 1.05, z - 0.36, 3.6, 0.68, { cast: false });
  b.quad(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), '+z', x, 1.05, z + 0.36, 3.6, 0.68, { cast: false });
}
/** a cart corral: two rails on posts */
function cartCorral(b, x, z) {
  const m = M.plain('#c9ccce', 0.4, 0.8);
  for (const s of [-0.55, 0.55]) { b.bar(m, x + s, 0.9, z - 3.5, x + s, 0.9, z + 3.5, 0.05, { round: true, seg: 6, cast: false }); for (const e of [-3.5, 0, 3.5]) b.bar(m, x + s, 0, z + e, x + s, 0.9, z + e, 0.05, { round: true, seg: 6, cast: false }); }
  for (let i = 0; i < 4; i++) { const zz = z - 2.6 + i * 0.36; b.box(M.plain('#b9bcbf', 0.4, 0.8), x - 0.3, 0.45, zz - 0.4, x + 0.3, 0.95, zz + 0.4, { cast: false }); }
  b.solid(x - 0.6, 0, z - 3.5, x + 0.6, 0.95, z + 3.5);
}
