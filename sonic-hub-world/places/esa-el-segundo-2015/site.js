/* The hotel's grounds and the shopping centre's lot next door: asphalt, stalls, kerbs and planting, the way in from
   Mariposa with the sign on its island, the lobby's forecourt, the white picket fence between the two lots, the trees
   along it (the light-green ones in the photographs of 22/9), lot lights, parked cars of 2015 — and the old Beetle and
   the mattress against the stair tower that stood there on the morning of 22/9.
   Where things are: the satellite picture, measured in the frame of the County's footprints (plan.js: LOT; EVIDENCE.md
   has the table). What they look like: his photographs of the west side; the hotel's own for the entrance. */
import * as THREE from 'three';
import { part } from '../../engine/kit.js';
import { M, canvasTex, plateTex, rng } from '../../engine/tex.js';
import { X } from './mat.js';
import { P, tree, car, beetle, lotLight, fence, glare } from './props.js';
import { WINGS, LOT, LOBBY, TOWER, KERB, G1, flat } from './plan.js';
import { plate } from './hotel.js';

const STALL = LOT.stall;
/** a row of stalls from z0 to z1, the cars nosing up to the kerb at xHead, their tails at xTail: as many stalls as fit
    at about 2.7 m. o.empty(zc): leave that stall free; o.hc: how many at the z1 end are handicap stalls */
function rowZ(b, xHead, xTail, z0, z1, fill, R, o = {}) {
  const n = Math.max(1, Math.round((z1 - z0) / STALL)), w = (z1 - z0) / n, face = xHead > xTail ? 90 : 270, dir = Math.sign(xHead - xTail);
  for (let i = 0; i <= n; i++) { const z = z0 + i * w; b.box(P.stripe(), Math.min(xHead, xTail), 0.012, z - 0.05, Math.max(xHead, xTail), 0.016, z + 0.05, { cast: false }); }
  for (let i = 0; i < n; i++) {
    const zc = z0 + (i + 0.5) * w, hc = o.hc && i >= n - o.hc, stop = xHead - dir * 0.7;
    b.box(P.curb(), stop - 0.08, 0, zc - 0.9, stop + 0.08, 0.13, zc + 0.9, { cast: false });
    const take = R() < fill, jz = R(), jr = R();
    if (hc) hcMark(b, xTail + dir * 0.95, zc, w, xHead, xTail);
    else if (take && !(o.empty && o.empty(zc))) car(b, (xHead + xTail) / 2 + dir * 0.2, zc + (jz - 0.5) * 0.25, face + (jr - 0.5) * 4, { seed: (zc * 13 + xHead * 7) | 0 });
  }
}
/** the same along x: the cars nose up to the kerb at zHead */
function rowX(b, zHead, zTail, x0, x1, fill, R, o = {}) {
  const n = Math.max(1, Math.round((x1 - x0) / STALL)), w = (x1 - x0) / n, face = zHead > zTail ? 180 : 0, dir = Math.sign(zHead - zTail);
  for (let i = 0; i <= n; i++) { const x = x0 + i * w; b.box(P.stripe(), x - 0.05, 0.012, Math.min(zHead, zTail), x + 0.05, 0.016, Math.max(zHead, zTail), { cast: false }); }
  for (let i = 0; i < n; i++) {
    const xc = x0 + (i + 0.5) * w, stop = zHead - dir * 0.7;
    b.box(P.curb(), xc - 0.9, 0, stop - 0.08, xc + 0.9, 0.13, stop + 0.08, { cast: false });
    const take = R() < fill, jx = R(), jr = R();
    if (take && !(o.empty && o.empty(xc))) car(b, xc + (jx - 0.5) * 0.25, (zHead + zTail) / 2 + dir * 0.2, face + (jr - 0.5) * 4, { seed: (xc * 11 + zHead * 5) | 0 });
  }
}
/** a handicap stall's marks: the blue square with its white figure at the stall's tail, blue lines along its sides */
function hcMark(b, x, zc, w, xHead, xTail) {
  const blue = M.plain('#2d6db5', 0.8);
  b.box(blue, x - 0.65, 0.013, zc - 0.65, x + 0.65, 0.017, zc + 0.65, { cast: false });
  for (const [x0, z0, x1, z1] of [[-0.5, -0.5, 0.5, -0.42], [-0.5, 0.42, 0.5, 0.5], [-0.5, -0.5, -0.42, 0.5], [0.42, -0.5, 0.5, 0.5], [-0.18, -0.12, 0.17, 0.12]]) b.box(P.stripe(), x + x0, 0.018, zc + z0, x + x1, 0.02, zc + z1, { cast: false });
  for (const dz of [-w / 2, w / 2]) b.box(blue, Math.min(xHead, xTail), 0.017, zc + dz - 0.06, Math.max(xHead, xTail), 0.021, zc + dz + 0.06, { cast: false });
}
/** one row of stalls along z (cars facing +x when face=90, −x when 270) from z0 to z1, its stripes from x0 to x1 */
function stallsZ(b, x0, x1, z0, z1, face, fill, R, skip = () => false) {
  const W = 2.75, n = Math.floor((z1 - z0) / W);
  for (let i = 0; i <= n; i++) { const z = z0 + i * W; if (skip(z)) continue; b.box(P.stripe(), Math.min(x0, x1), 0.012, z - 0.05, Math.max(x0, x1), 0.016, z + 0.05, { cast: false }); }
  for (let i = 0; i < n; i++) {
    const zc = z0 + (i + 0.5) * W; if (skip(zc)) continue;
    const xs = Math.min(x0, x1), xe = Math.max(x0, x1), stop = face === 90 ? xe - 0.75 : xs + 0.75;
    b.box(P.curb(), stop - 0.08, 0, zc - 0.9, stop + 0.08, 0.13, zc + 0.9, { cast: false });
    if (R() < fill) car(b, (xs + xe) / 2 + (face === 90 ? 0.25 : -0.25), zc + (R() - 0.5) * 0.25, face + (R() - 0.5) * 4, { seed: (zc * 13 + xs * 7) | 0 });
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
    b.box(X.asphalt('#3d3d3c', 3), -100, -0.04, -68.4, 52, 0.0, 132, { uv: [4, 4], uvw: true, cast: false });
    const n = WINGS.north, s = WINGS.south, mn = WINGS.main, L = LOT;
    const red = P.red(), walk = X.conc('#c6c2b8', 4, true), yellow = M.plain('#d9b030', 0.8), white = P.stripe();
    const shrub = (x, z, r = 0.6, c = '#46682c') => b.sphere(P.leaves(c, 1), x, r * 0.7, z, r, { seg: 7, sy: 0.75, cast: false });
    /** where a face's stair towers break its row of stalls: [from, to, the island's options] — as long as the tower with the
        walk that passes either side of it; the island itself starts at the tower's face (`face`: x or z) */
    const WALK = 1.4, towerCuts = (wing, side, face) => wing.towers.filter(t => t.side === side).map(t => { const am = (t.a0 + t.a1) / 2; return [am - TOWER.w / 2 - WALK, am + TOWER.w / 2 + WALK, { shrubs: 3, face }]; });
    const treeCut = (span, o = {}) => [span[0], span[1], { tree: true, shrubs: 2, ...o }];
    /** an island in a row of stalls: red kerb, mulch, shrubs, perhaps a tree (the photographs of 19/8, 2/9 and 22/9) */
    const island = (x0, z0, x1, z1, o = {}) => {
      planter(b, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), { red: true, solid: true, ...o });
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = Math.abs(x1 - x0), lz = Math.abs(z1 - z0), k = o.shrubs ?? 3;
      if (o.tree) tree(b, cx + (o.dx ?? 0), cz + (o.dz ?? 0), { h: o.h ?? 6.2, r: o.r ?? 2.5, leaves: P.leaves(o.leaf ?? '#79a046', 3) });
      for (let i = 0; i < k; i++) { const t = k > 1 ? i / (k - 1) - 0.5 : 0, w = i % 2 ? 0.4 : -0.4; shrub(cx + (lx > lz ? t * (lx - 1.6) : w), cz + (lx > lz ? w : t * (lz - 1.6)), 0.55 + (i % 2) * 0.12); }
    };
    /** rows of stalls along one kerb (x = head), broken by islands */
    const rowsZ = (xHead, xTail, z0, z1, cuts, fill, o = {}) => {
      let from = z0; const lo = Math.min(xHead, xTail), hi = Math.max(xHead, xTail);
      for (const [c0, c1, io] of [...cuts].sort((p, q) => p[0] - q[0])) {
        if (c0 > from + 1.5) rowZ(b, xHead, xTail, from, c0, fill, R, o.seg ? o.seg(from, c0) : o);
        const w = io.tree || io.plain || io.open ? 0 : WALK;                    // a tower's island: a concrete walk either side of it, from the aisle to the walkway
        if (!io.open) island(io.face ?? xHead, c0 + w + 0.12, xTail, c1 - w - 0.12, io);
        if (w) for (const z of [c0, c1 - w]) { b.box(walk, lo, 0, z, hi, 0.15, z + w, { uv: [1.5, 1.5], uvw: true, cast: false }); flat(lo, z, hi, z + w, 0.15); }
        from = c1;
      }
      if (z1 > from + 1.5) rowZ(b, xHead, xTail, from, z1, fill, R, o.seg ? o.seg(from, z1) : o);
    };
    const rowsX = (zHead, zTail, x0, x1, cuts, fill, o = {}) => {
      let from = x0; const lo = Math.min(zHead, zTail), hi = Math.max(zHead, zTail);
      for (const [c0, c1, io] of [...cuts].sort((p, q) => p[0] - q[0])) {
        if (c0 > from + 1.5) rowX(b, zHead, zTail, from, c0, fill, R, o);
        const w = io.tree ? 0 : WALK;
        island(c0 + w + 0.12, io.face ?? zHead, c1 - w - 0.12, zTail, io);
        if (w) for (const x of [c0, c1 - w]) { b.box(walk, x, 0, lo, x + w, 0.15, hi, { uv: [1.5, 1.5], uvw: true, cast: false }); flat(x, lo, x + w, hi, 0.15); }
        from = c1;
      }
      if (x1 > from + 1.5) rowX(b, zHead, zTail, from, x1, fill, R, o);
    };

    /* WEST OF THE TWO WINGS (the photographs of 17/8, 19/8, 2/9 and 22/9): stalls nose-in to the planting in front of the
       walkway, an island before each stair tower, one with a tree between them and the two handicap stalls north of
       it; the drive; stalls nose-in to the strip along the fence. On the morning of 22/9 the fence row stood empty
       from the Beetle at its north end down past where he took the photograph, and the handicap stalls were free.
       THE WAY THROUGH TO THE SHOPS' LOT (he said on 26/11/2026 that the fence was drawn wrong at the real way in; the
       satellite picture; his photograph of 22/9, 09:47:21, where the white fence ends at a lamp post and a van stands
       beyond it): level with the front of Ralphs the strip and its fence stop for some 9 m, z 54.6 … 63.6 — the two lots
       are one there, a hatched box painted either side of the line to keep it clear. Everywhere else the lot is shut:
       the strip runs north to a planted bed that closes the corner behind the main wing (L.gate, L.bed in plan.js). */
    const westFace = n.x0 - TOWER.out - 0.05, eastFace = n.x1 + TOWER.out + 0.05;
    rowsZ(L.westKerb, L.westTail, -5.0, 116.2, [...towerCuts(n, 'A', westFace), ...towerCuts(s, 'A', westFace), ...L.trees.west.map(t => treeCut(t, { dx: -1.2 }))], 0.5,
      { seg: (z0, z1) => ({ hc: z1 === L.trees.west[0][0] ? 2 : 0, empty: z => z > 26 && z < 34.5 }) });      // nothing stood under his stretch of railing at 09:47
    const [g0, g1] = L.gate, [bx0, bz0, bz1] = L.bed;
    rowsZ(L.fenceKerb, L.fenceTail, -5.8, 113.2, [[L.trees.fence[0], g0, { plain: true, shrubs: 2 }], [g0, g1, { open: true }], [g1, L.trees.fence[1], { plain: true, shrubs: 2 }]], 0.55, { empty: z => z < 41.5 });      // 1777: three cars at its south end, the rest of it free
    beetle(b, (L.fenceKerb + L.fenceTail) / 2 - 0.2, -5.8 + 1.35, 270);
    // the strip along the fence: kerb, mulch, its trees and shrubs, the lot's lights; the fence itself — in two lengths, the way through between them
    const xm = (L.fence + L.fenceKerb) / 2, rr = (L.fenceKerb - L.fence) / 2;        // (its ends at the way through are round: the straight lengths stop short of it by that much)
    for (const [z0, z1] of [[bz0, g0 - rr], [g1 + rr, 128]]) {
      b.box(P.curb(), L.fenceKerb - 0.15, 0, z0, L.fenceKerb, 0.16, z1, { cast: false, solid: true });
      b.box(X.mulch(), L.fence, 0, z0, L.fenceKerb - 0.15, 0.1, z1, { uv: [1.5, 1.5], uvw: true, cast: false });
      fence(b, L.fence, Math.max(z0, bz1), L.fence, z1, 1.5);                    // (the fence stops with the strip's straight length; its last post stands where the round end begins)
    }
    // the strip's two ends at the way through: rounded (the satellite picture)
    for (const z of [g0 - rr, g1 + rr]) { b.cyl(P.curb(), xm, 0, z, rr, 0.16, { seg: 18, cast: false }); b.cyl(X.mulch(), xm, 0, z, rr - 0.15, 0.17, { seg: 18, cast: false }); b.solid(xm - rr, 0, z - rr, xm + rr, 0.16, z + rr); shrub(xm, z, 0.5, '#3f6328'); }
    for (let z = -2; z < 126; z += 7.5 + R() * 3.5) if (z < g0 - 3.4 || z > g1 + 3.4) tree(b, L.fence + 1.5 + (R() - 0.5) * 0.7, z, { h: 6.5 + R() * 2, r: 2.3 + R() * 0.8, leaves: P.leaves(R() < 0.6 ? '#79a046' : '#5f8a35', 2 + ((R() * 3) | 0)) });
    for (let z = -3; z < 126; z += 7) { const zz = z + R() * 3; if (zz < g0 - 2.2 || zz > g1 + 2.2) shrub(L.fence + 2.2 + R() * 0.5, zz, 0.5, '#3f6328'); }
    for (const z of [7, 35, 67, 93, 121]) { lotLight(b, L.fence + 2.3, z, 8.2, glowLot, 2, 90); lights.push([L.fence + 2.3, 8, z]); }
    // the way through: a hatched box either side of the line
    for (const x0 of [L.fence - 5.3, L.fence + 0.9]) {
      const x1 = x0 + 3.3, z0 = g0 + 1.9, z1 = g1 - 1.9;
      for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + 0.1], [x0, z1 - 0.1, x1, z1], [x0, z0, x0 + 0.1, z1], [x1 - 0.1, z0, x1, z1]]) b.box(white, a0, 0.012, c0, a1, 0.016, c1, { cast: false });
      for (let k = 0; k < 6; k++) b.rbox(white, (x0 + x1) / 2, 0.014, z0 + 0.45 + k * 0.86, 0.1, 0.004, 4.2, 52, { cast: false });
    }
    // the bed that shuts the corner behind the main wing: from the big trees' kerb east to the fence's strip; the fence along its far side; stalls nose-in to it
    b.box(P.curb(), bx0, 0, bz0 - 0.15, L.fenceKerb, 0.16, bz0, { cast: false, solid: true });
    b.box(X.mulch(), bx0, 0, bz0, L.fence, 0.1, bz1, { uv: [1.5, 1.5], uvw: true, cast: false });
    fence(b, bx0, bz1, L.fence, bz1, 1.5);
    for (let x = bx0 + 2.5; x < L.fence - 1.5; x += 5.2 + R() * 2.4) tree(b, x, (bz0 + bz1) / 2 + (R() - 0.5) * 1.2, { h: 7.5 + R() * 3, r: 2.9 + R(), leaves: P.leaves(R() < 0.5 ? '#3f5f2a' : '#5f8a35', 4) });
    for (let x = bx0 + 1; x < L.fence - 0.6; x += 3.4) shrub(x + R(), bz0 + 0.9 + R() * 0.6, 0.5, '#3f6328');
    rowX(b, bz0 - 0.15, L.southEdge + 0.3, -33.0, -12.2, 0.6, R);
    /* EAST OF THEM: the same planting, stalls nose-in to it, the drive, a strip of trees against the neighbours' lot */
    rowsZ(L.eastKerb, L.eastTail, -1.8, 53.2, [...towerCuts(n, 'B', eastFace), treeCut(L.trees.east[0], { dx: 1.0 })], 0.45);
    rowsZ(L.eastKerb, L.eastTail, 59.2, 116.6, [...towerCuts(s, 'B', eastFace), treeCut(L.trees.east[1], { dx: 1.0 })], 0.45);
    b.box(P.curb(), L.eastEdge, 0, -48.8, L.eastEdge + 0.3, 0.16, 128, { cast: false, solid: true });
    b.box(X.mulch(), L.eastEdge + 0.3, 0, -54.8, L.eastEdge + 5.6, 0.1, 128, { uv: [1.5, 1.5], uvw: true, cast: false });
    for (let z = -45; z < 126; z += 8 + R() * 5) tree(b, L.eastEdge + 2.9 + (R() - 0.5) * 2, z, { h: 7 + R() * 3, r: 2.6 + R() });
    for (const z of [11, 49, 87, 119]) { lotLight(b, L.eastEdge + 1.0, z, 8.2, glowLot, 2, 270); lights.push([L.eastEdge + 1.0, 8, z]); }
    /* NORTH OF THE MAIN WING: stalls nose-in to its planting between the stair towers, a tree on an island half-way; the
       aisle; then the hedge, the lawn and Mariposa's sidewalk */
    rowsX(L.northKerb, L.northTail, -25.6, L.court.x0 - 0.2, [...towerCuts(mn, 'A', mn.z0 - TOWER.out - 0.05).filter(t => t[0] < 0), treeCut(L.trees.north, { h: 5.5, r: 2.2 })], 0.5);
    b.box(red, -30.8, 0, L.northEdge - 0.15, L.island[0], 0.16, L.northEdge, { cast: false, solid: true });
    b.box(X.mulch(), -38.8, 0, L.northEdge - 1.9, L.island[0], 0.1, L.northEdge - 0.15, { uv: [1.5, 1.5], uvw: true, cast: false });
    for (let x = -38.3; x < L.island[0] - 0.4; x += 3) { const e = Math.min(x + 3, L.island[0] - 0.4); b.box(M.plain(Math.round(x) % 2 ? '#314d24' : '#3a5a2a', 0.95), x, 0.08, L.northEdge - 3.9, e, 1.05, L.northEdge - 1.9, { cast: false }); }
    b.solid(-38.3, 0, L.northEdge - 3.9, L.island[0] - 0.4, 1.05, L.northEdge - 1.9);
    b.box(X.lawn(), -38.8, 0.0, L.walk - 0.15, L.island[0], 0.1, L.northEdge - 3.9, { uv: [2, 2], uvw: true, cast: false });      // (a hand's breadth in under the sidewalk: no crack at its back edge)
    for (const x of [-23, -6, 3]) tree(b, x, L.walk + 1.2, { h: 9.5, r: 3.5, leaves: P.leaves('#3f5f2a', 6) });
    b.box(M.plain('#d8d6cf', 0.7), 13.2, 0.1, L.walk + 0.6, 13.8, 0.75, L.walk + 1.1, { cast: false });                  // a utility box on the lawn
    /* THE WAY IN from Mariposa (the satellite picture for where things are; Street View of July 2015, a month before he
       came, for what grew there): a two-lane drive at the lot's north-east corner, between the island that carries the
       sign — clipped round shrubs under two tall pines; the gravel and agaves of today came later — and a bed of trees
       on the boundary. A walk crosses the island from the sidewalk and goes over the aisle on a hatched strip to the
       lobby's forecourt. West of the island a low white fence ran along the sidewalk before the lawn. */
    const [ix0, iz0, ix1, iz1] = L.island, [dx0, dx1] = L.drive, C = L.court, hx0 = C.x0, hx1 = C.x0 + 3.2;
    planter(b, ix0, iz0, ix1, iz1, { red: true, solid: false });
    const bed = X.mulch(), pine = () => P.leaves('#2f4a25', 6), ball = (x, z, r) => shrub(x, z, r * 1.35, '#3c5a28');
    b.box(bed, ix0 + 0.15, 0, iz0 + 0.15, ix1 - 0.15, 0.13, iz1 - 0.15, { uv: [1.5, 1.5], uvw: true, cast: false });
    for (const [x0, z0, x1, z1] of [[ix0 + 0.15, iz0, hx0 + 0.7, iz0 + 3.2], [ix0 + 0.15, iz0 + 1.8, hx0 + 2.9, iz0 + 3.2], [hx0 + 1.2, iz0 + 1.8, hx0 + 2.9, iz1]]) b.box(walk, x0, 0, z0, x1, 0.145, z1, { uv: [1.5, 1.5], uvw: true, cast: false });
    b.box(yellow, hx0 + 1.25, 0.145, iz1 - 0.75, hx0 + 2.85, 0.155, iz1 - 0.05, { cast: false });
    for (const [x, z, r] of [[ix0 + 4.6, iz0 + 0.9, 0.5], [ix0 + 6.6, iz0 + 1.2, 0.6], [ix0 + 7.0, iz1 - 1.3, 0.45], [ix1 - 2.2, iz0 + 1.3, 0.6], [ix1 - 1.7, iz1 - 1.5, 0.5], [ix0 + 10.3, iz1 - 1.0, 0.45], [ix0 + 9.6, iz0 + 1.1, 0.55]]) ball(x, z, r);
    for (const [x, z] of [[ix0 + 6.1, iz0 + 3.0], [ix1 - 2.2, iz0 + 3.8]]) tree(b, x, z, { h: 11.5, r: 3.3, blobs: 7, leaves: pine() });      // the two pines (their places: two panoramas of July 2015 crossed)
    fence(b, -38.3, L.walk + 0.3, ix0 - 2.2, L.walk + 0.3, 0.95);
    monument(b, L.sign[0], L.sign[1]);
    b.solid(L.sign[0] - 0.3, 0, L.sign[1] - 1.9, L.sign[0] + 0.3, 2.3, L.sign[1] + 1.9);
    ctx.hot.push({ id: 'sign', pos: [L.sign[0], 2.45, L.sign[1]], r: 0.3 });
    // the drive's marks (the satellite picture): a white line between its lanes; in the lane OUT — the east one, on the
    // right of a car leaving — a bar before the sidewalk and the word STOP. (The first build had an arrow in each lane,
    // out on the west and in on the east: the wrong side of the road. He saw it at once from the car, 26/11/2026.)
    const dv = L.driveLine;
    b.box(white, dv - 0.05, 0.012, iz0 + 0.3, dv + 0.05, 0.016, iz1 + 0.4, { cast: false });
    b.box(white, dv + 0.3, 0.012, iz0 + 0.5, dx1 - 0.3, 0.016, iz0 + 0.9, { cast: false });
    { const STOP = { S: [[0, 2.05, 0.5, 2.4], [0, 1.375, 0.13, 2.05], [0, 1.025, 0.5, 1.375], [0.37, 0.35, 0.5, 1.025], [0, 0, 0.5, 0.35]], T: [[0, 2.05, 0.5, 2.4], [0.185, 0, 0.315, 2.05]],
        O: [[0, 0, 0.13, 2.4], [0.37, 0, 0.5, 2.4], [0.13, 2.05, 0.37, 2.4], [0.13, 0, 0.37, 0.35]], P: [[0, 0, 0.13, 2.4], [0.13, 2.05, 0.5, 2.4], [0.13, 1.05, 0.5, 1.4], [0.37, 1.4, 0.5, 2.05]] };
      const xm = (dv + dx1) / 2, foot = iz0 + 4.0;                                   // read by the car leaving: its top to the street, the letters from west to east
      [...'STOP'].forEach((ch, i) => { const x = xm - 1.39 + i * 0.76; for (const [x0, y0, x1, y1] of STOP[ch]) b.box(white, x + x0, 0.012, foot - y1, x + x1, 0.016, foot - y0, { cast: false }); }); }
    // the bed on the boundary side, its trees
    b.box(red, dx1, 0, iz0, dx1 + 0.15, 0.16, -54.8, { cast: false, solid: true });
    b.box(bed, dx1 + 0.15, 0, iz0, L.eastEdge + 5.6, 0.13, -54.8, { uv: [1.5, 1.5], uvw: true, cast: false });
    for (const [x, z] of [[dx1 + 2.4, iz0 + 2.2], [dx1 + 4.8, -58.3], [dx1 + 2.0, -56.4]]) tree(b, x, z, { h: 7.5, r: 2.8 });
    ball(dx1 + 1.6, iz0 + 5.0, 0.5); ball(dx1 + 3.4, -61.3, 0.45);
    // the walk over the aisle: a hatched strip, a yellow pad at the forecourt's kerb
    { const z0 = L.northEdge + 0.1, z1 = C.z0;
      for (const x of [hx0, hx1]) b.box(white, x - 0.05, 0.012, z0, x + 0.05, 0.016, z1, { cast: false });
      for (let z = z0 + 0.5; z < z1 - 0.3; z += 0.95) b.rbox(white, (hx0 + hx1) / 2, 0.014, z, 0.1, 0.004, 3.5, 62, { cast: false });
      b.box(yellow, hx0 + 1.2, 0.16, z1, hx0 + 3.1, 0.17, z1 + 0.85, { cast: false }); }
    /* THE LOBBY'S FORECOURT: a red kerb round the wing's north-east corner (a fire lane), a concrete walk inside it from
       the hatched strip round to the porch and on south along the drive; between walk and wall, in 2015, a planted bed —
       low shrubs, a tall pine before the block, a small round tree by the porch (Street View, July 2015) */
    { const N = 14, zb = mn.z0 + KERB, xe = LOBBY.east, zEnd = mn.z1 - KERB + 1.35, w = 1.35, door = (LOBBY.door[0] + LOBBY.door[1]) / 2;
      b.box(bed, C.x0, 0, C.z0, C.cx, 0.13, zb, { uv: [1.5, 1.5], uvw: true, cast: false });
      b.box(bed, C.cx, 0, C.cz, C.x1, 0.13, zb, { uv: [1.5, 1.5], uvw: true, cast: false });
      b.box(bed, xe, 0, zb, C.x1, 0.13, zEnd, { uv: [1.5, 1.5], uvw: true, cast: false });
      const fan = (mat, r, y) => { const g = new THREE.CircleGeometry(r, N, 0, Math.PI / 2); g.rotateX(-Math.PI / 2); g.translate(C.cx, y, C.cz); const uv = g.attributes.uv, pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 1.5, pp.getZ(i) / 1.5); b.geo(mat, g, { cast: false }); };
      fan(bed, C.r, 0.13); fan(walk, C.r - 0.12, 0.15); fan(bed, C.r - 0.12 - w, 0.152);
      // the walk's two straight legs, the pad out to it from the porch, its turn to the south-east stair tower
      b.box(walk, C.x0 + 3.1, 0, C.z0 + 0.12, C.cx, 0.15, C.z0 + 0.12 + w, { uv: [1.5, 1.5], uvw: true, cast: false });
      b.box(walk, C.x1 - 0.12 - w, 0, C.cz, C.x1 - 0.12, 0.15, mn.z1 - KERB, { uv: [1.5, 1.5], uvw: true, cast: false });
      b.box(walk, LOBBY.porch.x1, 0, door - 1.35, C.x1 - 0.12 - w, 0.15, door + 1.05, { uv: [1.5, 1.5], uvw: true, cast: false });
      b.box(walk, mn.towers[3].a1 + 0.2, 0, mn.z1 - KERB, C.x1 - 0.12, 0.15, mn.z1 - KERB + w, { uv: [1.5, 1.5], uvw: true, cast: false });
      flat(C.x0, C.z0, C.x1, zEnd, 0.15);
      // its kerb: west side, north side, the quarter round, the east side
      b.box(red, C.x0 - 0.15, 0, C.z0, C.x0, 0.16, L.northKerb, { cast: false }); b.box(red, C.x0 - 0.15, 0, C.z0 - 0.15, C.cx, 0.16, C.z0, { cast: false }); b.box(red, C.x1, 0, C.cz, C.x1 + 0.15, 0.16, zEnd, { cast: false });
      for (let i = 0; i < N; i++) { const a0 = i / N * Math.PI / 2, a1 = (i + 1) / N * Math.PI / 2, am = (a0 + a1) / 2, r = C.r + 0.075; b.rbox(red, C.cx + Math.cos(am) * r, 0.08, C.cz - Math.sin(am) * r, 0.15, 0.16, r * (a1 - a0) + 0.03, -am * 180 / Math.PI, { cast: false }); }
      for (const [x, z, r] of [[C.x0 + 1.4, C.z0 + 2.6, 0.45], [C.cx - 4.6, C.z0 + 3.2, 0.55], [C.cx + 3.2, C.cz - 3.9, 0.5], [C.x1 - 2.6, C.cz + 7.4, 0.5], [C.x1 - 2.9, C.cz + 13.0, 0.45], [xe + 3.3, zb + 0.5, 0.4], [C.cx - 1.6, C.z0 + 4.6, 0.5], [C.cx - 6.8, C.z0 + 5.0, 0.45]]) ball(x, z, r);
      tree(b, C.cx + 2.2, C.cz - 5.1, { h: 11, r: 3.2, blobs: 7, leaves: pine() }); tree(b, C.cx + 4.8, C.cz - 2.3, { h: 4.6, r: 1.7, blobs: 5 });
      for (const [x, z] of [[C.cx - 7.5, C.z0 + 4.2], [C.x1 - 2.2, LOBBY.yard[3] + 2.2]]) shrub(x, z, 0.45, '#6f8a4a');
      tree(b, C.x1 - 2.6, mn.z1 - 1.6, { h: 6.5, r: 2.4 }); }
    /* SOUTH OF THE MAIN WING: stalls nose-in to its planting between the stair towers, a tree on an island; the aisle.
       Then, before the north wing's end: two lawns, a row of stalls between them, a walk down its east side */
    rowsX(L.southKerb, L.southTail, -24.2, 27.1, [...towerCuts(mn, 'B', mn.z1 + TOWER.out + 0.05), treeCut(L.trees.south, { h: 7.5, r: 3.2, leaf: '#4d6b30' })], 0.5);
    { const z0 = L.southEdge, z1 = -7.3;
      rowX(b, z1, z0 + 0.3, 11.5, 22.3, 0.6, R); rowX(b, z1, z0 + 0.3, -11.8, -6.4, 0.6, R);
      planter(b, 5.5, z0, 11.1, -6.0, { lawn: true, solid: true }); planter(b, 22.5, z0, 29.5, -5.8, { lawn: true, solid: true }); tree(b, 25.8, -9.2, { h: 6.5, r: 2.4 });
      island(-6.2, z0 + 0.2, -3.3, -6.0, { tree: true, shrubs: 1, h: 8, r: 3.6, leaf: '#4d6b30' });
      b.box(walk, 29.7, 0, z0, 31.2, 0.15, n.z0 + 2.4, { uv: [1.5, 1.5], uvw: true, cast: false }); flat(29.7, z0, 31.2, n.z0 + 2.4, 0.15);
      b.box(P.curb(), 11.2, 0, z1, 31.2, 0.16, z1 + 0.15, { cast: false });
      b.box(X.mulch(), 11.2, 0, z1 + 0.15, 29.7, 0.12, n.z0 + 0.3, { uv: [1.5, 1.5], uvw: true, cast: false });
      for (let x = 11.6; x < 29.2; x += 3) { const e = Math.min(x + 3, 29.4); if (x < 17.5 || x > 24.5) { b.box(M.plain(Math.round(x) % 2 ? '#314d24' : '#3a5a2a', 0.95), x, 0.1, z1 + 0.5, e, 0.9, z1 + 1.3, { cast: false }); b.solid(x, 0, z1 + 0.5, e, 0.9, z1 + 1.3); } } }
    /* ROUND THE MAIN WING'S WEST END: a single lane between the wing and the kerb of the big trees that stand against the
       shops' lot */
    b.box(P.curb(), L.bed[0] + 3.85, 0, L.northEdge, L.bed[0] + 4.0, 0.16, L.bed[1], { cast: false, solid: true });
    b.box(X.mulch(), L.bed[0], 0, L.northEdge - 4, L.bed[0] + 3.85, 0.1, L.bed[2], { uv: [1.5, 1.5], uvw: true, cast: false });
    b.box(X.mulch(), L.bed[0], 0, L.walk, -38.8, 0.1, L.northEdge - 4, { uv: [1.5, 1.5], uvw: true, cast: false });                    // … up to the sidewalk, beside the frontage's lawn
    b.box(P.curb(), L.bed[0] - 0.15, 0, L.walk, L.bed[0], 0.16, L.bed[2] + 0.15, { cast: false, solid: true });                      // its kerb on the shops' side, and round the bed's far side
    b.box(P.curb(), L.bed[0], 0, L.bed[2], L.fence, 0.16, L.bed[2] + 0.15, { cast: false });
    for (let z = -62; z < L.bed[1] - 2; z += 7.5) tree(b, L.bed[0] + 2.0 + (R() - 0.5) * 1.6, z, { h: 9 + R() * 3, r: 3.4 + R(), leaves: P.leaves('#3f5f2a', 6) });
    // the picnic table and the grill in the passage between the two north–south wings (the hotel's "picnic area"; where exactly is a guess)
    picnic(b, 8.0, 54.9);
    // the morning of 22/9: a blue mattress on its side against the south face of the north-west stair tower (the
    // photograph of 09:48:14, taken from the drive to the south)
    { const tw = n.towers.find(t => t.side === 'A' && t.a0 < 30), zs = (tw.a0 + tw.a1) / 2 + TOWER.w / 2;
      b.rbox(M.plain('#8fb4dd', 0.9), 10.25, 0.86, zs + 0.3, 1.9, 1.4, 0.24, 0, { rx: -11 });
      for (let i = 0; i < 5; i++) b.rbox(M.plain('#a9c7e8', 0.9), 9.49 + i * 0.38, 0.86, zs + 0.425, 0.012, 1.36, 0.005, 0, { rx: -11, cast: false });     // its quilting
      b.solid(9.25, 0, zs, 11.25, 1.5, zs + 0.6); }
  }, 'hotelLot');

  /* ── the shopping centre's lot: rows of stalls from the Starbucks corner down to the front of Ralphs ── */
  const shops = part(scene, shared, b => {
    // three double rows with a line of tree diamonds down each, a single row against the hotel's fence and one along
    // Sepulveda's side (the satellite picture)
    const rows = [[-37.8, -27.2, 10.5, 49], [-55.8, -45.2, -20, 51], [-74.6, -64.0, 8, 51]];
    for (const [x0, x1, zTop, zBot] of rows) {
      const line = (x0 + x1) / 2, skip = zTop < 0 ? (z => z > 2.5 && z < 8) : (() => false);
      stallsZ(b, x0, line, zTop, zBot, 270, 0.62, R, skip);
      stallsZ(b, line, x1, zTop, zBot, 90, 0.62, R, skip);
      planter(b, x0 + 0.4, zTop - 4.2, x1 - 0.4, zTop - 0.2, { solid: true }); tree(b, line, zTop - 2.2, { h: 7.5, r: 2.6 });
      planter(b, x0 + 0.4, zBot + 0.2, x1 - 0.4, zBot + 3.0, { solid: true }); tree(b, line - 2.5, zBot + 1.6, { h: 6.5, r: 2.2 });
      planter(b, line - 0.7, 22, line + 0.7, 28, { solid: true }); tree(b, line, 25, { h: 7, r: 2.4 });
      lotLight(b, line, 25, 9, glowLot, 2, 90); lights.push([line, 9, 25]);
      // a cart corral in each row
      cartCorral(b, line, 40);
    }
    stallsZ(b, LOT.fence - 5.7, LOT.fence - 0.4, 5, 53, 90, 0.62, R);
    stallsZ(b, -92, -86.5, 6, 50, 270, 0.62, R);
    for (const [z0, z1] of [[3, LOT.gate[0] - 1.5], [LOT.gate[1] + 1.5, 128]]) b.box(P.curb(), LOT.fence - 0.4, 0, z0, LOT.fence - 0.25, 0.16, z1, { cast: false });      // the kerb along the hotel's fence, open at the way through
    // the drive in front of Ralphs, its stripes
    b.box(P.stripe(), -84, 0.012, 59.2, -19, 0.016, 59.3, { cast: false });
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
/** the hotel's sign by the way in: a cabinet on a stucco base, set square to the street so that both directions read
    it; plain letters, no logo; lit at night */
function monument(b, x, z) {
  b.box(X.stucco('#d6bf86', 7), x - 0.28, 0, z - 1.85, x + 0.28, 0.55, z + 1.85, { uv: [2, 2], uvw: true });
  b.box(M.plain('#20262a', 0.5), x - 0.2, 0.55, z - 1.75, x + 0.2, 2.2, z + 1.75, {});
  for (const [face, dx] of [['+x', 0.206], ['-x', -0.206]]) plate(b, 'Extended Stay\nAmerica', x + dx, 1.375, z, 3.3, 1.5, face, '#1f3a2c', '#f4f1e8', { lit: true, size: 0.62 });
}
/** a cart corral: two rails on posts */
function cartCorral(b, x, z) {
  const m = M.plain('#c9ccce', 0.4, 0.8);
  for (const s of [-0.55, 0.55]) { b.bar(m, x + s, 0.9, z - 3.5, x + s, 0.9, z + 3.5, 0.05, { round: true, seg: 6, cast: false }); for (const e of [-3.5, 0, 3.5]) b.bar(m, x + s, 0, z + e, x + s, 0.9, z + e, 0.05, { round: true, seg: 6, cast: false }); }
  for (let i = 0; i < 4; i++) { const zz = z - 2.6 + i * 0.36; b.box(M.plain('#b9bcbf', 0.4, 0.8), x - 0.3, 0.45, zz - 0.4, x + 0.3, 0.95, zz + 0.4, { cast: false }); }
  b.solid(x - 0.6, 0, z - 3.5, x + 0.6, 0.95, z + 3.5);
}
