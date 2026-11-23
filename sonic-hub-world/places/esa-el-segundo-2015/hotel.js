/* The hotel's three wings: long two-storey blocks of studios back to back, an open walkway on each long face on both
   floors, terracotta columns and white railings, yellow stucco, hip roofs of clay tile, stair towers with an arch at
   the top. Built from plan.js (WINGS); every wing is laid out along `a` (its length) and `c` (across it, from the roof
   edge of side A), so one set of code serves the north–south wings and the east–west one. */
import * as THREE from 'three';
import { along, makeWall, windowFrame, doorLeaf } from '../../engine/walls.js';
import { M, canvasTex, rng, shade } from '../../engine/tex.js';
import { X } from './mat.js';
import { WINGS, G1, G2, CEIL, EAVE, PITCH, COL, FRONT, WALL, MOD, TOWER_D, HIS, IN, doorAtStart, flat, ramp } from './plan.js';

const SOFFIT = EAVE - 0.3;               // the ceiling of the upper walkway
const SLAB = G2 - 0.28;                  // underside of the upper walkway
const DOOR_W = IN.door[1] - IN.door[0], DOOR_H = IN.doorH, PARTY = 0.22, BAY = 5.9;
/** where a studio's door and window sit along its front wall, from the party wall its door is nearer to (plan.js: IN) */
export const OPEN = { door: IN.door, win: IN.win, sill: IN.sill, head: IN.head, louvre: IN.louvre };

/* ── a few drawn things ── */
const louvreTex = () => canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#cdbf9e'; g.fillRect(0, 0, w, h); for (let y = 4; y < h - 2; y += 6) { g.fillStyle = 'rgba(60,45,25,0.55)'; g.fillRect(4, y, w - 8, 2.4); g.fillStyle = 'rgba(255,250,235,0.5)'; g.fillRect(4, y + 2.4, w - 8, 1); } g.strokeStyle = 'rgba(80,60,35,0.6)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); }, { repeat: false });
const railTex = () => canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f2f1ec'; for (let x = 6; x < w; x += 12.4) g.fillRect(x, 0, 3.6, h); g.fillRect(0, h - 10, w, 10); }, { repeat: true });
let mats = null;
function materials(ctx) {
  if (mats) return mats;
  const R = rng(91);
  mats = {
    wall: X.stucco('#dcc58a', 1), wall2: X.stucco('#d7bd80', 2), tower: X.stucco('#dfca91', 3),
    col: X.stucco('#8c3b2b', 4), trim: M.plain('#f1ece0', 0.6), soffit: X.stucco('#e7dcc0', 5),
    roof: X.roof('#b4553a', 2), roof2: X.roof('#a94c33', 5), ridge: M.plain('#9c4630', 0.7),
    walk: X.conc('#aaa497', 1, true), slab: X.conc('#c9c5bb', 2, false),
    inside: X.roomWall('#d8c49c'),
    door: M.plain('#4f4842', 0.55), mat: M.plain('#1d1c1b', 0.95), metal: M.plain('#2b2b2b', 0.4, 0.6),
    frame: M.plain('#f3f2ee', 0.45), glass: X.glassDark(),
    louvre: new THREE.MeshStandardMaterial({ map: louvreTex(), roughness: 0.8 }),
    rail: (() => { const m = new THREE.MeshStandardMaterial({ map: railTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }); m.userData.noCast = false; return m; })(),
    liner: M.plain('#dccfb4', 0.95), linerLit: ctx.lampMat('#ffd9a0', 0.55, 0.85, 0),
    sconce: ctx.lampMat('#fff1d0', 2.2, 0.95, 0), globe: ctx.lampMat('#fff6e4', 1.8, 0.95, 0),
    hedge: M.plain('#3e5f2b', 0.95), hedge2: M.plain('#4d6e33', 0.95), mulch: X.mulch(),
    R,
  };
  return mats;
}

/* ── the hip roof over a rectangle (its outline is the roof's edge), eaves at y0 ── */
export function hipRoof(b, mat, x0, z0, x1, z1, y0, pitch = PITCH, ridgeMat = null) {
  const wx = x1 - x0, wz = z1 - z0, alongX = wx >= wz, half = (alongX ? wz : wx) / 2, top = y0 + half * pitch;
  const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, sl = Math.hypot(1, pitch);
  const pos = [], uv = [], idx = [];
  const face = (pts, uOf, vOf) => {           // pts: [x, y, z]; uOf/vOf give the tile coordinates (metres)
    const base = pos.length / 3;
    for (const p of pts) { pos.push(...p); uv.push(uOf(p), vOf(p)); }
    for (let i = 1; i < pts.length - 1; i++) idx.push(base, base + i, base + i + 1);
  };
  if (alongX) {
    const r0 = [x0 + half, top, zc], r1 = [x1 - half, top, zc];
    face([[x0, y0, z0], r0, r1, [x1, y0, z0]], p => p[0], p => (p[2] - z0) * sl);        // north slope
    face([[x1, y0, z1], r1, r0, [x0, y0, z1]], p => -p[0], p => (z1 - p[2]) * sl);       // south
    face([[x0, y0, z1], r0, [x0, y0, z0]], p => p[2], p => (p[0] - x0) * sl);            // west hip
    face([[x1, y0, z0], r1, [x1, y0, z1]], p => -p[2], p => (x1 - p[0]) * sl);           // east hip
    if (ridgeMat) { b.bar(ridgeMat, ...r0, ...r1, 0.17, { round: true, seg: 8 }); for (const [a, c] of [[[x0, y0, z0], r0], [[x0, y0, z1], r0], [[x1, y0, z0], r1], [[x1, y0, z1], r1]]) b.bar(ridgeMat, ...a, ...c, 0.15, { round: true, seg: 6 }); }
  } else {
    const r0 = [xc, top, z0 + half], r1 = [xc, top, z1 - half];
    face([[x0, y0, z1], r1, r0, [x0, y0, z0]], p => p[2], p => (p[0] - x0) * sl);        // west slope
    face([[x1, y0, z0], r0, r1, [x1, y0, z1]], p => -p[2], p => (x1 - p[0]) * sl);       // east
    face([[x0, y0, z0], r0, [x1, y0, z0]], p => -p[0], p => (p[2] - z0) * sl);           // north hip
    face([[x1, y0, z1], r1, [x0, y0, z1]], p => p[0], p => (z1 - p[2]) * sl);            // south hip
    if (ridgeMat) { b.bar(ridgeMat, ...r0, ...r1, 0.17, { round: true, seg: 8 }); for (const [a, c] of [[[x0, y0, z0], r0], [[x1, y0, z0], r0], [[x0, y0, z1], r1], [[x1, y0, z1], r1]]) b.bar(ridgeMat, ...a, ...c, 0.15, { round: true, seg: 6 }); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  b.geo(mat, g);
  // the eaves' fascia and the soffit under the overhang all round
  return top;
}

/** a wall from yb to yt along a (c0…c1 across it) with openings { a, b, y0, y1 }; m0 faces the smaller c, m1 the larger */
function band(put, c0, c1, a0, a1, yb, yt, ops, m0, m1) {
  const mid = (c0 + c1) / 2, halves = m0 === m1 ? [[c0, c1, m0]] : [[c0, mid, m0], [mid, c1, m1]];
  const list = [...ops].sort((p, q) => p.a - q.a);
  for (const [k0, k1, m] of halves) {
    const o = { uv: [2, 2], uvw: true, solid: true };
    const piece = (p0, p1, y0, y1) => { if (p1 - p0 > 1e-4 && y1 - y0 > 1e-4) put(m, p0, y0, k0, p1, y1, k1, o); };
    let cur = a0;
    for (const op of list) { piece(cur, op.a, yb, yt); piece(op.a, op.b, yb, op.y0); piece(op.a, op.b, op.y1, yt); cur = op.b; }
    piece(cur, a1, yb, yt);
  }
}

/* ── one wing ── */
export function buildWing(b, key, ctx, opts = {}) {
  const wing = WINGS[key], m = materials(ctx), ax = wing.axis;
  const L = ax === 'x' ? wing.x1 - wing.x0 : wing.z1 - wing.z0, W = ax === 'x' ? wing.z1 - wing.z0 : wing.x1 - wing.x0;
  const put = along(b, ax), wall = makeWall(EAVE);
  const block = (a0, y0, c0, a1, y1, c1) => (ax === 'x' ? b.solid(Math.min(a0, a1), y0, Math.min(c0, c1), Math.max(a0, a1), y1, Math.max(c0, c1)) : b.solid(Math.min(c0, c1), y0, Math.min(a0, a1), Math.max(c0, c1), y1, Math.max(a0, a1)));
  const loc = ax === 'x' ? (a, c) => [a, c] : (a, c) => [c, a];           // (along, across) → the frame's own (x, z)
  const world = (a, c) => { const [x, z] = loc(a, c); return [wing.x0 + x, wing.z0 + z]; };
  const A0 = (ax === 'x' ? wing.start - wing.x0 : wing.start - wing.z0), N = wing.n, ROWS = A0 + N * MOD;
  const outA = ax === 'x' ? '-z' : '-x', outB = ax === 'x' ? '+z' : '+x';
  const sides = [{ s: 'A', C: c => c, out: outA, sgn: -1 }, { s: 'B', C: c => W - c, out: outB, sgn: 1 }];
  const isHis = (side, k, floor) => key === HIS.wing && side === 'A' && k === HIS.module && floor === 2;
  const lit = (k, side, floor) => (rng(k * 7 + (side === 'A' ? 1 : 2) + floor * 31 + key.length * 5)() < 0.38);
  const towersOf = s => wing.towers.filter(t => t.side === s).map(t => ({ ...t, a0: (ax === 'x' ? t.a0 - wing.x0 : t.a0 - wing.z0), a1: (ax === 'x' ? t.a1 - wing.x0 : t.a1 - wing.z0) }));
  const lamps = [];

  b.push(wing.x0, 0, wing.z0);
  /* the core: the spine, the two front walls with a door and a window for each studio on each floor, the ends */
  put(m.inside, 0, 0, W / 2 - 0.075, L, EAVE, W / 2 + 0.075, { solid: true });
  for (const S of sides) {
    const ops = [];
    for (let k = 0; k < N; k++) {
      // a studio's own stretch of wall runs s0…e0; its door is at one end or the other (plan.js: hands)
      const s0 = A0 + k * MOD + PARTY / 2, e0 = s0 + MOD - PARTY, odd = doorAtStart(key, S.s, k);
      const span = ([p, q]) => (odd ? [s0 + p, s0 + q] : [e0 - q, e0 - p]);
      const d = span(OPEN.door), wn = span(OPEN.win), lv = span(OPEN.louvre);
      for (const [fl, y] of [[1, G1], [2, G2]]) { ops.push({ a: d[0], b: d[1], y0: y, y1: y + DOOR_H, k, fl, door: true, odd }); ops.push({ a: wn[0], b: wn[1], y0: y + OPEN.sill, y1: y + OPEN.head, k, fl, odd, lv }); }
    }
    const cF = S.C(FRONT), cI = S.C(FRONT + WALL);
    // the front wall in two bands, one per floor (each with its own doors and windows): stucco outside, paint inside
    for (const [fl, yb, yt] of [[1, 0, G2], [2, G2, EAVE]]) band(put, Math.min(cF, cI), Math.max(cF, cI), A0, ROWS, yb, yt, ops.filter(o => o.fl === fl), S.s === 'A' ? m.wall : m.inside, S.s === 'A' ? m.inside : m.wall);
    for (const op of ops) {
      const outer = S.C(FRONT), inner = S.C(FRONT + WALL), y = op.fl === 1 ? G1 : G2;
      if (op.door) {
        // casing on the walkway side, the leaf (his opens: place.js swings it), the mat, the lock
        const t = 0.07;
        for (const [p0, p1] of [[op.a - t, op.a], [op.b, op.b + t]]) put(m.trim, p0, y, outer + S.sgn * 0.0, p1, y + DOOR_H + t, outer + S.sgn * 0.025, { cast: false });
        put(m.trim, op.a - t, y + DOOR_H, outer, op.b + t, y + DOOR_H + t, outer + S.sgn * 0.025, { cast: false });
        put(m.mat, op.a + 0.02, y + 0.001, S.C(FRONT - 0.62), op.b - 0.02, y + 0.012, S.C(FRONT - 0.04), { cast: false, recv: true });
        { const pa = op.odd ? op.b + 0.14 : op.a - 0.22; put(m.metal, pa, y + 1.46, outer, pa + 0.08, y + 1.58, outer + S.sgn * 0.012, { cast: false }); }     // the room's number, by the latch
        if (isHis(S.s, op.k, op.fl)) { ctx.hisDoor = { a0: op.a, a1: op.b, c: (outer + inner) / 2, y, world }; continue; }
        const hingeA = op.odd ? op.a : op.b, dirA = op.odd ? 1 : -1, cc = (outer + inner) / 2;
        const [lx, lz] = loc(hingeA, cc);
        // the leaf runs from its hinge along the wall: +a for odd studios, −a for the others
        const ry = ax === 'x' ? (dirA > 0 ? 0 : 180) : (dirA > 0 ? 90 : 270);
        b.push(lx, y, lz, ry); doorLeaf(b, DOOR_W, DOOR_H, m.door, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' }); b.box(m.metal, DOOR_W - 0.14, 0.95, -0.035, DOOR_W - 0.05, 1.18, 0.035, { cast: false }); b.pop();
        block(op.a, y, outer, op.b, y + DOOR_H, inner);
      } else {
        const glassC = outer + S.sgn * -0.06;
        windowFrame(b, ax === 'x' ? 'x' : 'z', op.a, op.b, op.y0, op.y1, outer - S.sgn * 0.05, { mat: m.frame, mull: 1, t: 0.045, d: 0.06, glass: false });
        if (isHis(S.s, op.k, op.fl)) { ctx.hisWindow = { a0: op.a, a1: op.b, y0: op.y0, y1: op.y1, c: outer, world }; continue; }
        put(m.glass, op.a + 0.04, op.y0 + 0.04, outer - S.sgn * 0.052, op.b - 0.04, op.y1 - 0.04, outer - S.sgn * 0.058, { cast: false });
        // drawn curtains: the pale lining faces out; some rooms are lit at night
        put(lit(op.k, S.s, op.fl) ? m.linerLit : m.liner, op.a - 0.12, op.y0 - 0.1, inner - S.sgn * 0.06, op.b + 0.12, op.y1 + 0.18, inner - S.sgn * 0.07, { cast: false });
        // a louvre low on the wall under the window's end nearer the door (the walkway photograph of 22/9)
        put(m.louvre, op.lv[0], y + 0.06, outer + S.sgn * -0.005, op.lv[1], y + 0.47, outer + S.sgn * 0.02, { uv: [0.3, 0.41], cast: false });
        put(m.trim, op.lv[0] - 0.02, y + 0.47, outer + S.sgn * -0.005, op.lv[1] + 0.02, y + 0.5, outer + S.sgn * 0.05, { cast: false });
      }
    }
    /* a lamp on the wall between two doors that stand side by side, a globe in the ceiling between two windows, and
       here and there a white service box where a door meets the next studio's window */
    for (let k = 0; k <= N; k++) {
      const a = A0 + k * MOD, doorL = k > 0 && !doorAtStart(key, S.s, k - 1), doorR = k < N && doorAtStart(key, S.s, k), doorPair = doorL && doorR;
      for (const [fl, y] of [[1, G1], [2, G2]]) {
        if ((wing.boxes?.[S.s] || []).includes(k)) {
          // a fire-extinguisher cabinet: white, a glazed door, the red of the cylinder behind it
          put(m.frame, a - 0.17, y + 0.75, Math.min(S.C(FRONT - 0.16), S.C(FRONT)), a + 0.17, y + 1.5, Math.max(S.C(FRONT - 0.16), S.C(FRONT)), { solid: true });
          put(m.glass, a - 0.11, y + 0.84, S.C(FRONT - 0.164), a + 0.11, y + 1.41, S.C(FRONT - 0.16), { cast: false });
          put(M.plain('#b3261c', 0.5), a - 0.05, y + 0.9, S.C(FRONT - 0.162), a + 0.05, y + 1.3, S.C(FRONT - 0.158), { cast: false });
        }
        if (doorL !== doorR) continue;
        if (doorPair) {
          // a bronze hood on the wall, a frosted lens hanging under it
          put(m.metal, a - 0.075, y + 2.32, S.C(FRONT - 0.14), a + 0.075, y + 2.46, S.C(FRONT), { cast: false });
          { const [lx, lz] = loc(a, S.C(FRONT - 0.075)); b.cyl(m.sconce, lx, y + 2.14, lz, 0.055, 0.18, { seg: 12, cast: false }); }
          if (S.s === 'A' && fl === 2 && key === HIS.wing && Math.abs(k - HIS.module) <= 1) lamps.push(world(a, S.C(FRONT - 0.3)).concat(y + 2.2));
        } else {
          const cy = fl === 1 ? SLAB : SOFFIT, [lx, lz] = loc(a, S.C(1.15));
          b.cyl(m.metal, lx, cy - 0.03, lz, 0.13, 0.03, { seg: 14, cast: false }); b.sphere(m.globe, lx, cy - 0.08, lz, 0.1, { seg: 12, sy: 0.6, cast: false });
        }
      }
    }
  }
  /* ends of the rows: a wall across the core, and across each walkway a wall with a door (a store, the ice machine) */
  for (const a of [A0, ROWS]) {
    const into = a === A0 ? -0.2 : 0.2;
    put(m.wall2, a, 0, FRONT, a + into, EAVE, W - FRONT, { solid: true });
    for (const S of sides) {
      const c0 = S.C(0.25), c1 = S.C(FRONT);
      wall(b, ax === 'x' ? 'z' : 'x', a, a + into, Math.min(c0, c1), Math.max(c0, c1), [{ a: Math.min(c0, c1) + 0.45, b: Math.min(c0, c1) + 1.35, y0: G2, y1: G2 + DOOR_H }], m.wall2, m.wall2);
      const [lx, lz] = loc(a + into / 2, Math.min(c0, c1) + 0.45);
      b.push(lx, G2, lz, ax === 'x' ? 90 : 0); doorLeaf(b, 0.9, DOOR_H, m.door, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' }); b.pop();
      block(a, G2, Math.min(c0, c1), a + into, G2 + DOOR_H, Math.max(c0, c1));
    }
  }
  /* past the last studio, under the rest of the roof: a closed bay (the laundry downstairs, a store above) */
  if (L - ROWS > 1) {
    const c0 = key === 'north' ? 1.5 : 0.4;
    put(m.wall2, ROWS + 0.2, 0, c0, L - 0.35, EAVE, W - 0.4, { uv: [2, 2], uvw: true, solid: true });
    const [lx, lz] = loc(L - 0.35, W / 2 - 0.45);
    b.push(lx, G1, lz, ax === 'x' ? 90 : 0); doorLeaf(b, 0.9, DOOR_H, m.door, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' }); b.pop();
  }
  /* the slabs: the ground walkway, the upper walkway, the ceilings */
  for (const S of sides) {
    const c0 = S.C(0.25), c1 = S.C(FRONT), lo = Math.min(c0, c1), hi = Math.max(c0, c1);
    put(m.walk, A0 - 0.2, 0, lo, ROWS + 0.2, G1, hi, { uv: [1.5, 1.5], uvw: true });
    put(m.walk, A0 - 0.2, SLAB, lo, ROWS + 0.2, G2, hi, { uv: [1.5, 1.5], uvw: true });
    put(m.trim, A0 - 0.2, SLAB - 0.06, S.s === 'A' ? lo - 0.04 : hi - 0.04, ROWS + 0.2, G2 + 0.06, S.s === 'A' ? lo + 0.04 : hi + 0.04, { cast: false });
    put(m.soffit, A0 - 0.2, SOFFIT, Math.min(S.C(0), S.C(FRONT)), ROWS + 0.2, SOFFIT + 0.04, Math.max(S.C(0), S.C(FRONT)), { uv: [2, 2], uvw: true, cast: false });
    put(m.trim, A0 - 0.2, SOFFIT - 0.32, Math.min(S.C(0.22), S.C(0.72)), ROWS + 0.2, SOFFIT, Math.max(S.C(0.22), S.C(0.72)), { cast: true });    // the beam over the columns
    put(m.trim, A0 - 0.3, SOFFIT, Math.min(S.C(-0.02), S.C(0.04)), ROWS + 0.3, EAVE + 0.08, Math.max(S.C(-0.02), S.C(0.04)), { cast: false }); // fascia
    // walkable: the ground walkway and the upper one, inside the railing
    const [wx0, wz0] = world(A0 - 0.2, S.C(0.6)), [wx1, wz1] = world(ROWS + 0.2, S.C(FRONT));
    flat(wx0, wz0, wx1, wz1, G2);
    const [gx0, gz0] = world(A0 - 0.2, S.C(0.25)), [gx1, gz1] = world(ROWS + 0.2, S.C(FRONT));
    flat(gx0, gz0, gx1, gz1, G1);
  }
  /* columns, railings, hedges */
  for (const S of sides) {
    const T = towersOf(S.s);
    const gap = a => T.some(t => t.stair && a > t.a0 + 1.6 && a < t.a0 + 2.85);     // the opening onto a stair's top landing
    // columns: at the ends, at each tower's two edges, and in equal bays of about 5.9 m between (the photographs of
    // 17/8 and 22/9: five bays between the two towers of the west face)
    const cols = [], marks = [A0, ...T.flatMap(t => [t.a0, t.a1]), ROWS].sort((p, q) => p - q);
    for (let i = 0; i < marks.length - 1; i++) {
      const p = marks[i], q = marks[i + 1], inTower = T.some(t => p >= t.a0 - 1e-6 && q <= t.a1 + 1e-6), n = inTower ? 1 : Math.max(1, Math.round((q - p) / BAY));
      for (let j = 0; j < n; j++) cols.push(p + (q - p) * j / n);
    }
    cols.push(ROWS);
    for (const a of cols) {
      const c = S.C(COL);
      put(m.col, a - 0.2, 0, c - 0.2, a + 0.2, SOFFIT - 0.32, c + 0.2, { uv: [2, 2], uvw: true, solid: true });
      put(m.trim, a - 0.25, 0, c - 0.25, a + 0.25, 0.22, c + 0.25, { cast: false });
      for (const [y, h, e] of [[SOFFIT - 0.62, 0.1, 0.03], [SOFFIT - 0.52, 0.2, 0.08]]) put(m.trim, a - 0.2 - e, y, c - 0.2 - e, a + 0.2 + e, y + h, c + 0.2 + e, { cast: false });
      for (const [y, h, e] of [[SLAB - 0.12, 0.12, 0.05]]) put(m.trim, a - 0.2 - e, y, c - 0.2 - e, a + 0.2 + e, y + h, c + 0.2 + e, { cast: false });
    }
    const detailed = opts.detailRail && S.s === 'A';
    for (let i = 0; i < cols.length - 1; i++) {
      const a0 = cols[i] + 0.2, a1 = cols[i + 1] - 0.2, c = S.C(COL);
      // split the run where a stair's landing opens off the walkway
      const runs = []; let s = a0;
      for (let a = a0; a <= a1 + 1e-6; a += 0.05) { const g = gap(a); if (g && s !== null) { if (a - s > 0.1) runs.push([s, a]); s = null; } else if (!g && s === null) s = a; }
      if (s !== null && a1 - s > 0.1) runs.push([s, a1]);
      for (const [r0, r1] of runs) {
        put(m.trim, r0, G2 + 1.0, c - 0.045, r1, G2 + 1.07, c + 0.045, { solid: true });
        put(m.trim, r0, G2 + 0.08, c - 0.02, r1, G2 + 0.13, c + 0.02, {});
        if (detailed) for (let a = r0 + 0.06; a < r1 - 0.03; a += 0.11) put(m.trim, a - 0.0125, G2 + 0.13, c - 0.0125, a + 0.0125, G2 + 1.0, c + 0.0125, {});
        else { const [lx, lz] = loc((r0 + r1) / 2, c); b.quad(m.rail, ax === 'x' ? '+z' : '+x', lx, G2 + 0.565, lz, r1 - r0, 0.87, { uv: [0.62, 0.87], ry: 0 }); }
      }
      // a low hedge in the planter in front of the ground floor, with a gap at every other bay
      if (i % 2 === 0) {
        const hc0 = S.C(-0.15), hc1 = S.C(0.25), lo = Math.min(hc0, hc1), hi = Math.max(hc0, hc1);
        put(m.mulch, a0 - 0.15, 0.0, lo, a1 + 0.15, 0.13, hi, { uv: [1.5, 1.5], uvw: true, cast: false });
        put(m.trim, a0 - 0.2, 0, Math.min(S.C(-0.25), S.C(-0.15)), a1 + 0.2, 0.15, Math.max(S.C(-0.25), S.C(-0.15)), { cast: false });
        const n = Math.max(2, Math.round((a1 - a0) / 0.75));
        for (let j = 0; j < n; j++) { const a = a0 + (j + 0.5) * (a1 - a0) / n, [lx, lz] = loc(a, S.C(0.05)); b.sphere(j % 3 ? m.hedge : m.hedge2, lx, 0.42, lz, 0.42, { seg: 9, sx: 1.25, sy: 0.85, sz: 1.0 }); }
      }
    }
  }
  /* stair towers (and the plain ones on the other face) */
  for (const S of sides) for (const t of towersOf(S.s)) buildTower(b, m, ctx, { ...t, S, put, loc, world, W, ax, lamps });
  /* the roof: one hip over the rows, the towers' own, the little bays at the ends */
  b.pop();
  const top = hipRoof(b, m.roof, wing.x0, wing.z0, wing.x1, wing.z1, EAVE, PITCH, m.ridge);
  for (const S of sides) for (const t of towersOf(S.s)) {
    const [x0, z0] = world(t.a0, S.C(-TOWER_D - 0.25)), [x1, z1] = world(t.a1, S.C(0.6));
    hipRoof(b, m.roof2, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), EAVE + 0.75, 0.42, m.ridge);
  }
  for (const [x0, z0, x1, z1] of wing.bumps || []) {
    b.box(m.wall2, x0 + 0.25, 0, z0 + 0.25, x1 - 0.25, EAVE + 0.4, z1 - 0.25, { uv: [2, 2], uvw: true, solid: true });
    hipRoof(b, m.roof2, x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, EAVE + 0.4, 0.45, m.ridge);
  }
  if (wing.lobby) buildLobby(b, m, ctx, wing.lobby);
  return { top, lamps };
}

/* ── a stair tower: three stucco walls up past the eaves, an arch looking out at the top, a U-shaped stair inside ── */
function buildTower(b, m, ctx, t) {
  const { S, put, loc, world } = t, D = TOWER_D, a0 = t.a0, a1 = t.a1, len = a1 - a0;
  const C = S.C, top = EAVE + 0.75;
  // the walls: the outer face with an arch at the upper floor, the two ends; open toward the walkway
  const cOut0 = C(-D), cOut1 = C(-D + 0.25);
  const wall = makeWall(top);
  const axW = t.ax === 'x' ? 'x' : 'z', axE = t.ax === 'x' ? 'z' : 'x';
  wall(b, axW, Math.min(cOut0, cOut1), Math.max(cOut0, cOut1), a0, a1, [{ a: a0 + len / 2 - 0.85, b: a0 + len / 2 + 0.85, y0: G2 + 0.95, y1: G2 + 2.35 }], m.tower, m.tower);
  // the arch's head: a half-round of short segments
  const am = a0 + len / 2, cw = (cOut0 + cOut1) / 2;
  for (let i = 0; i < 22; i++) { const q0 = Math.PI * i / 22, q1 = Math.PI * (i + 1) / 22, r = 0.85, p0 = am - Math.cos(q0) * r, p1 = am - Math.cos(q1) * r, y = G2 + 1.55 + Math.sin((q0 + q1) / 2) * 0.8; put(m.tower, Math.min(p0, p1) - 0.002, y, Math.min(cOut0, cOut1), Math.max(p0, p1) + 0.002, G2 + 2.36, Math.max(cOut0, cOut1), { cast: false }); }
  for (const a of [a0, a1]) {
    const into = a === a0 ? 0.25 : -0.25, c0 = C(-D), c1 = C(0.15);
    put(m.tower, a, 0, Math.min(c0, c1), a + into, top, Math.max(c0, c1), { uv: [2, 2], uvw: true, solid: true });
  }
  put(m.trim, a0 - 0.05, top - 0.25, Math.min(C(-D - 0.05), C(0.2)), a1 + 0.05, top, Math.max(C(-D - 0.05), C(0.2)), { cast: false });
  // terracotta pilasters at the outer corners, as on the columns
  for (const a of [a0 + 0.2, a1 - 0.2]) { const c = C(-D + 0.12); put(m.col, a - 0.22, 0, c - 0.22, a + 0.22, G2 + 0.3, c + 0.22, { uv: [2, 2], uvw: true, solid: true }); put(m.trim, a - 0.27, G2 + 0.3, c - 0.27, a + 0.27, G2 + 0.45, c + 0.27, { cast: false }); }
  // a lamp in the arch
  const [lx, lz] = loc(am, C(-D + 0.6));
  b.cyl(m.metal, lx, G2 + 2.6, lz, 0.12, 0.05, { seg: 12, cast: false }); b.sphere(m.globe, lx, G2 + 2.5, lz, 0.13, { seg: 12, cast: false });
  if (!t.stair) {
    // a closed tower: floors at both levels behind the arch (a nook), nothing to climb
    put(m.walk, a0 + 0.25, SLAB, Math.min(C(-D + 0.25), C(0.25)), a1 - 0.25, G2, Math.max(C(-D + 0.25), C(0.25)), { uv: [1.5, 1.5], uvw: true });
    const [x0, z0] = world(a0 + 0.3, C(-D + 0.35)), [x1, z1] = world(a1 - 0.3, C(0.6)); flat(x0, z0, x1, z1, G2);
    put(m.trim, a0 + 0.25, G2 + 1.0, Math.min(C(-D + 0.2), C(-D + 0.3)), a1 - 0.25, G2 + 1.07, Math.max(C(-D + 0.2), C(-D + 0.3)), { solid: true });
    return;
  }
  /* the stair: flight 1 from the ground outward along c, a landing at the outer wall, flight 2 back up to the walkway */
  const f1 = [a0 + 0.3, a0 + 1.45], f2 = [a0 + 1.65, a0 + 2.8], cBot = -0.25, cTurn = -2.55, cLand = -D + 0.3;
  const half = G2 / 2, steps = 9;
  for (let i = 0; i < steps; i++) {
    const y1 = half * (i + 1) / steps, cA = cBot + (cTurn - cBot) * i / steps, cB = cBot + (cTurn - cBot) * (i + 1) / steps;
    put(m.walk, f1[0], y1 - 0.06, Math.min(C(cA), C(cB)), f1[1], y1, Math.max(C(cA), C(cB)), { uv: [1, 1], uvw: true });
    put(m.slab, f1[0], Math.max(0, y1 - 0.4), Math.min(C(cA), C(cB)), f1[1], y1 - 0.06, Math.max(C(cA), C(cB)), { cast: false });
    const y2 = half + half * (i + 1) / steps, cC = cTurn + (cBot - cTurn) * i / steps, cD = cTurn + (cBot - cTurn) * (i + 1) / steps;
    put(m.walk, f2[0], y2 - 0.06, Math.min(C(cC), C(cD)), f2[1], y2, Math.max(C(cC), C(cD)), { uv: [1, 1], uvw: true });
    put(m.slab, f2[0], y2 - 0.42, Math.min(C(cC), C(cD)), f2[1], y2 - 0.06, Math.max(C(cC), C(cD)), { cast: false });
  }
  // the landings: halfway at the outer wall, and the top one joining the walkway through the gap in the railing
  put(m.walk, a0 + 0.25, half - 0.2, Math.min(C(cLand), C(cTurn)), a0 + 2.8, half, Math.max(C(cLand), C(cTurn)), { uv: [1.5, 1.5], uvw: true });
  put(m.walk, f2[0], SLAB, Math.min(C(cBot), C(0.6)), f2[1], G2, Math.max(C(cBot), C(0.6)), { uv: [1.5, 1.5], uvw: true });
  // the wall between the flights, and the space under flight 2 closed off
  put(m.tower, f1[1], 0, Math.min(C(cBot - 0.05), C(cTurn)), f2[0], G2 + 1.0, Math.max(C(cBot - 0.05), C(cTurn)), { solid: true });
  put(m.tower, f2[0], 0, Math.min(C(cBot), C(cTurn)), f2[1], 1.2, Math.max(C(cBot), C(cTurn)), { solid: true });
  // handrails on the open sides
  for (const [fa, y0, y1, cA, cB] of [[f1[0] - 0.02, 0.9, half + 0.9, cBot, cTurn], [f2[1] + 0.02, half + 0.9, G2 + 0.9, cTurn, cBot]]) {
    const [xA, zA] = loc(fa, C(cA)), [xB, zB] = loc(fa, C(cB)); b.bar(m.metal, xA, y0, zA, xB, y1, zB, 0.045, { round: true, seg: 8, cast: false });
  }
  put(m.trim, a0 + 2.8, half + 0.05, Math.min(C(cLand), C(cTurn)), a0 + 2.9, half + 1.0, Math.max(C(cLand), C(cTurn)), { solid: true });
  put(m.trim, a0 + 0.25, G2 + 1.0, Math.min(C(cBot - 0.02), C(cBot + 0.04)), f2[0], G2 + 1.07, Math.max(C(cBot - 0.02), C(cBot + 0.04)), { solid: true });
  put(m.trim, f1[0] - 0.08, 0.1, Math.min(C(cBot + 0.2), C(cTurn)), f1[0] - 0.04, half + 1.0, Math.max(C(cBot + 0.2), C(cTurn)), { solid: false, cast: false });
  // walkable surfaces
  const sx = (cA, cB, aA, aB) => { const [x0, z0] = world(aA, C(cA)), [x1, z1] = world(aB, C(cB)); return [x0, z0, x1, z1]; };
  const along_c = t.ax === 'x' ? 'z' : 'x';
  { const [x0, z0, x1, z1] = sx(cBot + 0.05, cTurn, f1[0], f1[1]); const [p0] = [world(0, C(cBot))], [p1] = [world(0, C(cTurn))]; ramp(x0, z0, x1, z1, along_c, along_c === 'x' ? p0[0] : p0[1], along_c === 'x' ? p1[0] : p1[1], 0, half); }
  { const [x0, z0, x1, z1] = sx(cLand, cTurn, a0 + 0.3, a0 + 2.8); flat(x0, z0, x1, z1, half); }
  { const [x0, z0, x1, z1] = sx(cTurn, cBot, f2[0], f2[1]); const p0 = world(0, C(cTurn)), p1 = world(0, C(cBot)); ramp(x0, z0, x1, z1, along_c, along_c === 'x' ? p0[0] : p0[1], along_c === 'x' ? p1[0] : p1[1], half, G2); }
  { const [x0, z0, x1, z1] = sx(cBot, 0.7, f2[0], f2[1]); flat(x0, z0, x1, z1, G2); }
}

/* ── the lobby at the east end of the main wing: taller, a glass front on Mariposa ── */
function buildLobby(b, m, ctx, [x0, z0, x1, z1]) {
  const h = EAVE + 1.4;
  b.box(m.wall, x0, 0, z0 + 0.6, x1 - 0.5, h, z1 - 0.4, { uv: [2, 2], uvw: true, solid: true });
  // the glass front facing north, a band of trim, two lanterns
  b.box(M.plain('#20262a', 0.2, 0.3), x0 + 1.1, 0.05, z0 + 0.58, x1 - 1.6, 2.7, z0 + 0.62, { cast: false });
  for (let x = x0 + 1.1; x <= x1 - 1.6 + 1e-6; x += (x1 - x0 - 2.7) / 3) b.box(m.frame, x - 0.04, 0.05, z0 + 0.55, x + 0.04, 2.75, z0 + 0.66, {});
  b.box(m.frame, x0 + 1.05, 2.7, z0 + 0.55, x1 - 1.55, 2.82, z0 + 0.66, {});
  b.box(m.trim, x0 - 0.05, h - 0.3, z0 + 0.5, x1 - 0.45, h, z1 - 0.3, { cast: false });
  for (const x of [x0 + 0.6, x1 - 1.1]) { b.box(m.col, x - 0.25, 0, z0 + 0.1, x + 0.25, 3.4, z0 + 0.6, { solid: true }); b.box(m.trim, x - 0.3, 3.4, z0 + 0.05, x + 0.3, 3.6, z0 + 0.65, {}); }
  hipRoof(b, m.roof2, x0 - 0.4, z0 - 0.4, x1 + 0.1, z1 + 0.1, h, 0.5, m.ridge);
  ctx.lobby = { x: (x0 + x1) / 2, z: z0 + 0.4, h };
}
