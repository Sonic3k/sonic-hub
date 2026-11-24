/* The hotel's three wings: long two-storey blocks of studios back to back, an open walkway on each long face on both
   floors, terracotta columns and white railings, yellow stucco, hip roofs of clay tile; on each face two stair towers
   and a gabled bay between them; the lobby and the sign tower on the main wing's east end. Built from plan.js (WINGS,
   TOWER, GABLE); every wing is laid out along `a` (its length) and `c` (across it, from the roof edge of side A), so
   one set of code serves the north–south wings and the east–west one. */
import * as THREE from 'three';
import { along, makeWall, windowFrame, doorLeaf } from '../../engine/walls.js';
import { M, canvasTex, plateTex, rng, shade } from '../../engine/tex.js';
import { X } from './mat.js';
import { tree } from './props.js';
import { WINGS, G1, G2, CEIL, EAVE, PITCH, COL, KERB, FRONT, WALL, MOD, TOWER, GABLE, LOBBY, HIS, IN, doorAtStart, flat, ramp } from './plan.js';

const SOFFIT = EAVE - 0.3;               // the ceiling of the upper walkway
const SLAB = G2 - 0.28;                  // underside of the upper walkway
const DOOR_W = IN.door[1] - IN.door[0], DOOR_H = IN.doorH, PARTY = 0.22, BAY = 4.9;
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
    wall: X.stucco('#dcc58a', 1), wall2: X.stucco('#d7bd80', 2), towerLo: X.stucco('#e4d6a6', 3), towerUp: X.stucco('#d9ba6c', 6),
    col: X.stucco('#8c3b2b', 4), trim: M.plain('#f1ece0', 0.6), soffit: X.stucco('#e7dcc0', 5),
    roof: X.roof('#b4553a', 2), roof2: X.roof('#a94c33', 5), ridge: M.plain('#9c4630', 0.7),
    walk: X.conc('#aaa497', 1, true), slab: X.conc('#c9c5bb', 2, false), tread: X.conc('#b9b4a8', 4, false), steel: M.plain('#57504a', 0.5, 0.5), score: M.plain('#a8946a', 0.9),
    flood: ctx.lampMat('#fff3d6', 2.6, 0.9, 0), ivy: M.plain('#35552a', 0.95),
    inside: X.roomWall('#d8c49c'),
    door: M.plain('#4f4842', 0.55), mat: M.plain('#1d1c1b', 0.95), metal: M.plain('#2b2b2b', 0.4, 0.6),
    frame: M.plain('#f3f2ee', 0.45), glass: X.glassDark(),
    louvre: new THREE.MeshStandardMaterial({ map: louvreTex(), roughness: 0.8 }),
    rail: (() => { const m = new THREE.MeshStandardMaterial({ map: railTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }); m.userData.noCast = false; return m; })(),
    liner: M.plain('#dccfb4', 0.95), linerLit: ctx.lampMat('#ffd9a0', 0.55, 0.85, 0),
    sconce: ctx.lampMat('#fff1d0', 2.2, 0.95, 0), globe: ctx.lampMat('#fff6e4', 1.8, 0.95, 0),
    hedge: M.plain('#314d24', 0.95), hedge2: M.plain('#3a5a2a', 0.95), mulch: X.mulch(),
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

/** the wall over an arch, in one piece and smooth underneath: what lies between a segmental arch (springing at yS, its
    crown at yC, from a0 to a1 along the wall) and the level yT; c0…c1 thick. ax 'x': the wall runs east–west */
function spandrel(b, mat, ax, a0, a1, yS, yC, yT, c0, c1, o = {}) {
  const hw = (a1 - a0) / 2, am = (a0 + a1) / 2, rise = yC - yS, R = (hw * hw + rise * rise) / (2 * rise), cy = yC - R, half = Math.asin(hw / R), N = 24;
  const sh = new THREE.Shape();
  sh.moveTo(a0, yT); sh.lineTo(a1, yT); sh.lineTo(a1, yS);
  for (let i = 1; i <= N; i++) { const q = half - 2 * half * i / N; sh.lineTo(am + Math.sin(q) * R, cy + Math.cos(q) * R); }
  sh.closePath();
  const lo = Math.min(c0, c1), hi = Math.max(c0, c1), g = new THREE.ExtrudeGeometry(sh, { depth: hi - lo, bevelEnabled: false, curveSegments: 1 });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  if (ax === 'x') g.translate(0, 0, lo); else { g.rotateY(-Math.PI / 2); g.translate(hi, 0, 0); }
  b.geo(mat, g, o);
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
  /* ── the ends. Past the first and the last studio the block is closed right out to the columns' line (stores, the
     laundry, the housekeepers' rooms — on the main wing's east end the lobby), and the walkways stop at its wall.
     Where a row runs to the roof's end it ends in a wall, with a store's door across each walkway. ── */
  const ends = [];
  if (A0 > 1) ends.push({ e0: 0.35, e1: A0, at: A0, into: -1 });
  if (L - ROWS > 1) ends.push({ e0: ROWS, e1: L - 0.35, at: ROWS, into: 1 });
  const closed = a => ends.some(e => e.at === a), aS = closed(A0) ? A0 : A0 - 0.2, aE = closed(ROWS) ? ROWS : ROWS + 0.2;
  const leaf = (a, c, y, w = 0.9) => { const [lx, lz] = loc(a, c); b.push(lx, y, lz, ax === 'x' ? 90 : 0); doorLeaf(b, w, DOOR_H, m.door, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' }); b.pop(); };
  /** a terracotta pilaster on a corner, its white capital under the eaves */
  const pilaster = (a, c, y1 = SOFFIT - 0.32, h = 0.24) => {
    put(m.col, a - h, 0, c - h, a + h, y1, c + h, { uv: [2, 2], uvw: true });
    for (const [y, t, e] of [[y1 - 0.3, 0.1, 0.03], [y1 - 0.2, 0.2, 0.08]]) put(m.trim, a - h - e, y, c - h - e, a + h + e, y + t, c + h + e, { cast: false });
  };
  for (const a of [A0, ROWS]) {
    if (closed(a)) continue;
    const into = a === A0 ? -0.2 : 0.2;
    put(m.wall2, a, 0, FRONT, a + into, EAVE, W - FRONT, { solid: true });
    for (const S of sides) {
      const c0 = S.C(KERB), c1 = S.C(FRONT), lo = Math.min(c0, c1), hi = Math.max(c0, c1);
      wall(b, ax === 'x' ? 'z' : 'x', a, a + into, lo, hi, [{ a: lo + 0.45, b: lo + 1.35, y0: G2, y1: G2 + DOOR_H }], m.wall2, m.wall2);
      leaf(a + into / 2, lo + 0.45, G2);
      block(a, G2, lo, a + into, G2 + DOOR_H, hi);
    }
  }
  let lobbyEnd = null;
  for (const e of ends) {
    if (wing.lobby && e.into > 0) { lobbyEnd = e; continue; }                      // built below, in the map's own metres
    put(m.wall2, e.e0, 0, 0.3, e.e1, EAVE, W - 0.3, { uv: [2, 2], uvw: true, solid: true });
    for (const S of sides) {
      pilaster(e.into > 0 ? e.e1 - 0.2 : e.e0 + 0.2, S.C(0.3 + 0.2) - S.sgn * 0.26);
      for (const y of [G1, G2]) leaf(e.at - e.into * 0.03, Math.min(S.C(0.75), S.C(1.65)), y);
    }
  }
  /* ── the slabs: the ground walkway, the upper walkway, the ceilings ── */
  for (const S of sides) {
    const c0 = S.C(KERB), c1 = S.C(FRONT), lo = Math.min(c0, c1), hi = Math.max(c0, c1);
    put(m.walk, aS, 0, lo, aE, G1, hi, { uv: [1.5, 1.5], uvw: true });
    put(m.walk, aS, SLAB, lo, aE, G2, hi, { uv: [1.5, 1.5], uvw: true });
    put(m.trim, aS, SLAB - 0.06, S.s === 'A' ? lo - 0.04 : hi - 0.04, aE, G2 + 0.06, S.s === 'A' ? lo + 0.04 : hi + 0.04, { cast: false });
    put(m.soffit, aS, SOFFIT, Math.min(S.C(0), S.C(FRONT)), aE, SOFFIT + 0.04, Math.max(S.C(0), S.C(FRONT)), { uv: [2, 2], uvw: true, cast: false });
    put(m.trim, aS, SOFFIT - 0.32, Math.min(S.C(0.22), S.C(0.72)), aE, SOFFIT, Math.max(S.C(0.22), S.C(0.72)), { cast: true });    // the beam over the columns
    put(m.trim, 0.1, SOFFIT, Math.min(S.C(-0.02), S.C(0.04)), L - 0.1, EAVE + 0.08, Math.max(S.C(-0.02), S.C(0.04)), { cast: false }); // fascia
    // walkable: the ground walkway and the upper one, inside the railing
    const [wx0, wz0] = world(aS, S.C(0.6)), [wx1, wz1] = world(aE, S.C(FRONT));
    flat(wx0, wz0, wx1, wz1, G2);
    const [gx0, gz0] = world(aS, S.C(KERB)), [gx1, gz1] = world(aE, S.C(FRONT));
    flat(gx0, gz0, gx1, gz1, G1);
  }

  /** a white railing from a0 to a1 along the wing, standing on yF at c: its cap, its shoe, the pickets (one by one where
      he walks, a drawn sheet elsewhere) */
  const railing = (a0, a1, yF, c, fine) => {
    if (a1 - a0 < 0.15) return;
    put(m.trim, a0, yF + 1.0, c - 0.045, a1, yF + 1.07, c + 0.045, { solid: true });
    put(m.trim, a0, yF + 0.08, c - 0.02, a1, yF + 0.13, c + 0.02, {});
    if (fine) for (let a = a0 + 0.06; a < a1 - 0.03; a += 0.11) put(m.trim, a - 0.0125, yF + 0.13, c - 0.0125, a + 0.0125, yF + 1.0, c + 0.0125, {});
    else { const [lx, lz] = loc((a0 + a1) / 2, c); b.quad(m.rail, ax === 'x' ? '+z' : '+x', lx, yF + 0.565, lz, a1 - a0, 0.87, { uv: [0.62, 0.87], ry: 0 }); }
  };

  /* ── what stands on each walkway's edge: plain columns, the gabled bay's two, the stair towers' walls; the railing
     between them; the planting in front ── */
  const builtT = [], builtG = [];
  for (const S of sides) {
    const fine = !!opts.detailRail && S.s === 'A', org = ax === 'x' ? wing.x0 : wing.z0;
    const T = towersOf(S.s).map(t => { const am = (t.a0 + t.a1) / 2; return { am, w0: am - TOWER.w / 2, w1: am + TOWER.w / 2, label: t.label }; }).sort((p, q) => p.am - q.am);
    const gW = wing.gables?.[S.s], ag = gW == null ? null : gW - org, given = (wing.cols?.[S.s] || []).map(v => v - org);
    const hc = 0.2, hp = TOWER.col / 2;
    // the fixed ones, in order along the wing: { a, h: half its width, kind }
    const marks = [{ a: A0, h: closed(A0) ? 0 : hc, kind: closed(A0) ? 'end' : 'col' }];
    for (const t of T) marks.push({ a: t.w0, h: 0, kind: 'tw0' }, { a: t.w1, h: 0, kind: 'tw1' });
    if (ag != null) marks.push({ a: ag - GABLE.span / 2, h: hp, kind: 'pier0' }, { a: ag + GABLE.span / 2, h: hp, kind: 'pier1' });
    marks.push({ a: ROWS, h: closed(ROWS) ? 0 : hc, kind: closed(ROWS) ? 'end' : 'col' });
    marks.sort((p, q) => p.a - q.a);
    // plain columns between them: where a photograph puts them, else in equal bays of about 4.9 m
    const sup = [];
    for (let i = 0; i < marks.length - 1; i++) {
      const p = marks[i], q = marks[i + 1]; sup.push(p);
      if (p.kind === 'tw0' || p.kind === 'pier0') continue;
      const lo = p.a + p.h, hi = q.a - q.h, mine = given.filter(v => v > lo + 0.6 && v < hi - 0.6);
      if (mine.length) for (const v of mine) sup.push({ a: v, h: hc, kind: 'col' });
      else { const n = Math.max(1, Math.round((hi - lo) / BAY)); for (let j = 1; j < n; j++) sup.push({ a: lo + (hi - lo) * j / n, h: hc, kind: 'col' }); }
    }
    sup.push(marks[marks.length - 1]);
    for (const p of sup) if (p.kind === 'col') {
      const a = p.a, c = S.C(COL);
      put(m.col, a - 0.2, 0, c - 0.2, a + 0.2, SOFFIT - 0.32, c + 0.2, { uv: [2, 2], uvw: true, solid: true });
      for (const [y, h, e] of [[SOFFIT - 0.62, 0.1, 0.03], [SOFFIT - 0.52, 0.2, 0.08]]) put(m.trim, a - 0.2 - e, y, c - 0.2 - e, a + 0.2 + e, y + h, c + 0.2 + e, { cast: false });
      put(m.trim, a - 0.25, SLAB - 0.12, c - 0.25, a + 0.25, SLAB, c + 0.25, { cast: false });
    }
    for (let i = 0; i < sup.length - 1; i++) { const p = sup[i], q = sup[i + 1]; if (p.kind !== 'tw0') railing(p.a + p.h, q.a - q.h, G2, S.C(COL), fine); }

    /* the planting between the walkway and the stalls' kerb, about two metres deep (the photographs of 17/8, 2/9 and
       22/9 for the north wing's west face; the others are drawn alike): a clipped hedge behind the kerb, small
       round-headed trees between hedge and walkway, their heads at the upper walkway's floor; a concrete walk across
       it beside each stair tower */
    const strip = wing.strip?.[S.s] ?? 1.8, cK = S.C(KERB - strip), cW = S.C(KERB), sg = S.sgn;
    const mulch = X.mulch(), kerb = X.conc('#c3bfb6', 3, false), lobbyFrom = wing.lobby && S.s === 'A' ? ROWS - MOD : Infinity;
    const stretches = [];                               // [from, to, walk at its start, walk at its end]
    { let from = aS; for (const t of T) { stretches.push([from, t.w0, from !== aS, true]); from = t.w1; } stretches.push([from, aE, true, false]); }
    for (let [p, q, w0, w1] of stretches) {
      if (q > lobbyFrom) { q = Math.min(q, lobbyFrom); w1 = false; }
      if (q - p < 0.6) continue;
      put(mulch, p, 0, Math.min(cK - sg * 0.15, cW), q, 0.12, Math.max(cK - sg * 0.15, cW), { uv: [1.5, 1.5], uvw: true, cast: false });
      put(kerb, p, 0, Math.min(cK, cK - sg * 0.15), q, 0.16, Math.max(cK, cK - sg * 0.15), { cast: false });
      const gaps = [];                                  // where the hedge stops: the walks
      for (const [on, a0] of [[w0, p], [w1, q - 1.4]]) if (on && q - p > 4) {
        put(m.walk, a0, 0, Math.min(cK, cW), a0 + 1.4, G1, Math.max(cK, cW), { uv: [1.5, 1.5], uvw: true, cast: false });
        const [x0, z0] = world(a0, cK), [x1, z1] = world(a0 + 1.4, cW); flat(x0, z0, x1, z1, G1);
        gaps.push([a0 - 0.15, a0 + 1.55]);
      }
      const bedTree = a => { if (gaps.some(g => a > g[0] - 0.9 && a < g[1] + 0.9)) return; const [x, z] = loc(a, S.C(KERB - Math.min(strip - 0.5, 0.95))); tree(b, x, z, { h: 2.9 + m.R() * 0.4, r: 0.9 + m.R() * 0.15, blobs: 5, seed: (a * 7 + key.length) | 0 }); };
      for (const s of sup) if ((s.kind === 'col' || s.kind === 'pier1') && s.a > p + 0.8 && s.a < q - 0.8) bedTree(s.a + 0.9);
      if (w1 && q - p > 8) bedTree(q - 2.7);
      const h0 = KERB - strip + 0.2, h1 = KERB - strip + 1.0, top = 0.95;
      let from = p + 0.25;
      for (const g of [...gaps.sort((g, h) => g[0] - h[0]), [q - 0.25, q]]) {
        for (let a = from; a < g[0] - 0.3; a += 3) {
          const e = Math.min(a + 3, g[0]);
          put(Math.round(a) % 2 ? m.hedge : m.hedge2, a, 0.1, Math.min(S.C(h0), S.C(h1)), e, top, Math.max(S.C(h0), S.C(h1)), { cast: false });
          block(a, 0, Math.min(S.C(h0), S.C(h1)), e, top, Math.max(S.C(h0), S.C(h1)));
        }
        from = Math.max(from, g[1]);
      }
    }
    for (const t of T) builtT.push({ ...t, S, fine });
    if (ag != null) builtG.push({ ag, S, fine });
  }
  /* the stair towers and the gabled bays */
  const tools = { put, loc, world, block, railing, ax };
  for (const t of builtT) buildTower(b, m, ctx, { ...t, ...tools, left: ax === 'z' ? (t.S.s === 'A' ? -1 : 1) : (t.S.s === 'A' ? 1 : -1), his: key === HIS.wing && t.S.s === 'A' && t.am > L / 2 });
  for (const g of builtG) buildGable(b, m, ctx, { ...g, ...tools });
  /* the roofs: one hip over the wing, the towers' and the gabled bays' own, the low blocks' */
  b.pop();
  const top = hipRoof(b, m.roof, wing.x0, wing.z0, wing.x1, wing.z1, EAVE, PITCH, m.ridge);
  const rect = (a0, c0, a1, c1) => { const [x0, z0] = world(a0, c0), [x1, z1] = world(a1, c1); return [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; };
  for (const t of builtT) hipRoof(b, m.roof2, ...rect(t.w0 - TOWER.over, t.S.C(-TOWER.out - TOWER.over), t.w1 + TOWER.over, t.S.C(2.6)), EAVE + TOWER.rise, TOWER.pitch, m.ridge);
  for (const g of builtG) { const h = GABLE.span / 2 + TOWER.col / 2 + GABLE.over; hipRoof(b, m.roof2, ...rect(g.ag - h, g.S.C(-GABLE.over), g.ag + h, g.S.C(GABLE.back + 1.5)), EAVE + TOWER.rise, TOWER.pitch, m.ridge); }
  for (const [x0, z0, x1, z1, face] of wing.low || []) lowBlock(b, m, x0, z0, x1, z1, face);
  if (lobbyEnd) buildLobby(b, m, ctx, wing);
  return { top, lamps };
}

/* ── a stair tower (plan.js: TOWER). `am`: its middle along the wing; `left`: which way along the wing is the left of
   someone looking at it from the lot (−1 or 1) — the flight from the ground is on that side ── */
function buildTower(b, m, ctx, t) {
  const { S, put, loc, world, block, railing, ax, am, left, fine, his, label } = t, K = TOWER;
  const O = d => S.C(-d);                                  // d metres out from the wing's roof edge (negative: in under the roof)
  const box = (mat, a0, y0, d0, a1, y1, d1, o) => put(mat, a0, y0, O(d0), a1, y1, O(d1), o);
  const solid = (a0, y0, d0, a1, y1, d1) => block(a0, y0, Math.min(O(d0), O(d1)), a1, y1, Math.max(O(d0), O(d1)));
  const hw = K.w / 2, in0 = hw - K.wall, top = EAVE + K.rise, yL = K.y, st = K.step, tr = K.tread, dL = K.out - K.land, dTop = dL - 8 * tr;
  const U = { uv: [2, 2], uvw: true }, ohw = hw + K.proud - K.col;            // half the opening between the two columns
  // the pad it stands on, level with the ground walkway
  box(m.walk, am - in0, 0, -KERB, am + in0, G1, K.out, { uv: [1.5, 1.5], uvw: true, cast: false });
  // the two side walls, blank: pale to the capitals' line, ochre above; a score line at the upper floor
  for (const s of [-1, 1]) {
    const a0 = am + s * in0, a1 = am + s * hw;
    box(m.towerLo, a0, 0, -0.65, a1, K.cap[2], K.out, { ...U, solid: true });
    box(m.towerUp, a0, K.cap[2], -0.65, a1, top, K.out, U);
    box(m.score, a1, G2 - 0.34, 0, a1 + s * 0.006, G2 - 0.31, K.out, { cast: false });
  }
  // the face to the lot: wall over the arch and over each column, the arch's haunches
  box(m.towerUp, am - hw, K.arch[1], K.out - K.wall, am + hw, top, K.out, U);
  for (const s of [-1, 1]) box(m.towerUp, am + s * ohw, K.cap[2], K.out - K.wall, am + s * hw, K.arch[1], K.out, U);
  spandrel(b, m.towerUp, ax, am - ohw, am + ohw, K.arch[0], K.arch[1], K.arch[1] + 0.002, O(K.out - K.wall), O(K.out));
  // the two columns, a hand's width proud of the walls, and their capitals
  for (const s of [-1, 1]) {
    const ca = am + s * (hw + K.proud - K.col / 2), cd = K.out + K.proud - K.col / 2, h = K.col / 2;
    box(m.col, ca - h, 0, cd - h, ca + h, K.cap[0], cd + h, { ...U, solid: true });
    box(m.trim, ca - h - 0.05, K.cap[0], cd - h - 0.05, ca + h + 0.05, K.cap[1], cd + h + 0.05, { cast: false });
    box(m.trim, ca - h - 0.13, K.cap[1], cd - h - 0.13, ca + h + 0.13, K.cap[2], cd + h + 0.13, { cast: false });
  }
  // its own ceiling and eaves, a floodlight over the arch, a lamp inside
  box(m.soffit, am - hw - K.over, top - 0.24, -0.6, am + hw + K.over, top - 0.2, K.out + K.over, { cast: false });
  for (const [a0, d0, a1, d1] of [[am - hw - K.over - 0.03, K.out + K.over - 0.03, am + hw + K.over + 0.03, K.out + K.over + 0.03], [am - hw - K.over - 0.03, 0.1, am - hw - K.over + 0.03, K.out + K.over], [am + hw + K.over - 0.03, 0.1, am + hw + K.over + 0.03, K.out + K.over]]) box(m.trim, a0, top - 0.24, d0, a1, top + 0.1, d1, { cast: false });
  box(m.steel, am - 0.16, K.flood, K.out, am + 0.16, K.flood + 0.12, K.out + 0.2, { cast: false }); box(m.flood, am - 0.13, K.flood - 0.03, K.out + 0.02, am + 0.13, K.flood, K.out + 0.19, { cast: false });
  { const [lx, lz] = loc(am, O(1.4)); b.cyl(m.metal, lx, top - 0.27, lz, 0.14, 0.03, { seg: 14, cast: false }); b.sphere(m.globe, lx, top - 0.32, lz, 0.11, { seg: 12, sy: 0.6, cast: false }); }
  // the landing at the tower's face: its slab, its white edge and railing, the post in the middle
  box(m.tread, am - in0, yL - 0.18, dL, am + in0, yL, K.out - 0.04, { uv: [1.5, 1.5], uvw: true });
  box(m.trim, am - ohw, yL - 0.34, K.out - 0.1, am + ohw, yL + 0.06, K.out - 0.01, { cast: false });
  railing(am - ohw, am + ohw, yL, O(K.out - 0.06), fine);
  box(m.towerLo, am - K.post / 2, 0, K.out - 0.4, am + K.post / 2, K.arch[1] + 0.3, K.out - 0.08, { ...U, solid: true });
  solid(am - in0, 0, dL, am + in0, yL - 0.3, K.out);                       // no walking under it
  /* the two flights, either side of a wall: from the ground walkway eight risers OUT to the landing; from the landing
     nine risers BACK to the upper walkway */
  const sL = left, sU = -left, fa = s => [am + s * 0.15, am + s * in0].sort((p, q) => p - q);
  for (let i = 0; i < 8; i++) {
    const d0 = dL - i * tr, d1 = d0 - tr, [u0, u1] = fa(sU), y = yL + (i + 1) * st;
    box(m.tread, u0, y - 0.05, d0, u1, y, d1 - 0.025, { uv: [1, 1], uvw: true }); box(m.slab, u0, y - 0.24, d0, u1, y - 0.05, d1, { cast: false });
    box(m.towerLo, am - 0.15, 0, d0, am + 0.15, y + 0.95, d1, { solid: true, cast: i % 3 === 0 });                 // the wall between the flights, stepped with them
    if (i < 7) { const [l0, l1] = fa(sL), yl = yL - (i + 1) * st; box(m.tread, l0, yl - 0.05, d0, l1, yl, d1 - 0.025, { uv: [1, 1], uvw: true }); box(m.slab, l0, Math.max(G1, yl - 0.24), d0, l1, yl - 0.05, d1, { cast: false }); }
  }
  { const [u0, u1] = fa(sU); box(m.walk, u0, SLAB, dTop, u1, G2, -KERB, { uv: [1.5, 1.5], uvw: true }); }             // the last tread runs into the walkway
  box(m.towerLo, am - 0.15, 0, dTop, am + 0.15, G2 + 1.07, -0.62, { solid: true });                                 // the wall's head, at the walkway's edge
  solid(fa(sU)[0], 0, 0.96, fa(sU)[1], 1.5, dL);                                              // nor under the low end of the upper flight
  // steel strings and white handrails along both sides of each flight
  for (const [s, y0, y1, e] of [[sU, yL, G2, dTop], [sL, yL, G1, dL - 7 * tr]]) for (const a of [am + s * 0.19, am + s * (in0 - 0.04)]) {
    const [xA, zA] = loc(a, O(dL)), [xB, zB] = loc(a, O(e));
    b.bar(m.trim, xA, y0 + 0.92, zA, xB, y1 + 0.92 + (s === sL ? st : 0), zB, 0.045, { round: true, seg: 8, cast: false });
    b.bar(m.steel, xA, y0 - 0.12, zA, xB, y1 - 0.12 + (s === sL ? st : 0), zB, ax === 'z' ? 0.2 : 0.05, { t2: ax === 'z' ? 0.05 : 0.2, cast: false });
  }
  // the upper walkway's edge over the flight from the ground: a railing from the wall between the flights to the tower's wall
  { const [g0, g1] = [am + sL * 0.15, am + sL * in0].sort((p, q) => p - q); railing(g0, g1, G2, S.C(COL), fine); box(m.trim, g0, SLAB - 0.06, -KERB - 0.04, g1, G2 + 0.06, -KERB + 0.04, { cast: false }); }
  /* where one stands: the pad, the flight from the ground (a ramp), the landing, the flight back up, its head */
  const sx = (a0, d0, a1, d1) => { const [x0, z0] = world(a0, O(d0)), [x1, z1] = world(a1, O(d1)); return [x0, z0, x1, z1]; };
  const alongC = ax === 'x' ? 'z' : 'x', cAt = d => { const p = world(0, O(d)); return alongC === 'x' ? p[0] : p[1]; };
  flat(...sx(am - in0, -KERB, am + in0, dL), G1);
  ramp(...sx(fa(sL)[0], dTop, fa(sL)[1], dL), alongC, cAt(dTop), cAt(dL), G1, yL);
  flat(...sx(am - in0, dL, am + in0, K.out - 0.12), yL);
  ramp(...sx(fa(sU)[0], dTop, fa(sU)[1], dL), alongC, cAt(dL), cAt(dTop), yL, G2);
  flat(...sx(fa(sU)[0], -0.62, fa(sU)[1], dTop), G2);
  if (his) { const [hx, hz] = world(am, O(K.out - 0.2)); ctx.hot.push({ id: 'stairs', pos: [hx, yL + 1.35, hz], r: 0.26 }); }
  // the street number on the tower by the lobby (the hotel's picture)
  if (label) { const [lx, lz] = loc(am - 0.75, O(K.out + 0.012)); plate(b, label, lx, K.arch[1] + 0.33, lz, 0.62, 0.3, ax === 'x' ? (S.s === 'A' ? '-z' : '+z') : (S.s === 'A' ? '-x' : '+x'), '#4a4640', '#f4f1e8', { font: 'Arial, sans-serif' }); }
}

/* ── the gabled bay between a face's two towers: the towers' two columns and arch set on the walkway's own edge ── */
function buildGable(b, m, ctx, g) {
  const { S, put, loc, ag } = g, K = TOWER, half = GABLE.span / 2, h = K.col / 2, top = EAVE + K.rise, c = S.C(COL), U = { uv: [2, 2], uvw: true };
  for (const s of [-1, 1]) {
    const a = ag + s * half;
    put(m.col, a - h, 0, c - h, a + h, K.cap[0], c + h, { ...U, solid: true });
    put(m.trim, a - h - 0.05, K.cap[0], c - h - 0.05, a + h + 0.05, K.cap[1], c + h + 0.05, { cast: false });
    put(m.trim, a - h - 0.13, K.cap[1], c - h - 0.13, a + h + 0.13, K.cap[2], c + h + 0.13, { cast: false });
    put(m.towerUp, a - h + 0.05, K.cap[2], c - h + 0.05, a + h - 0.05, top, c + h - 0.05, U);
    put(m.trim, a - h - 0.03, SLAB - 0.12, c - h - 0.03, a + h + 0.03, SLAB, c + h + 0.03, { cast: false });
  }
  const ohw = half - h + 0.05, crown = K.arch[0] + 0.25;
  put(m.towerUp, ag - half, crown, c - 0.24, ag + half, top, c + 0.24, U);
  spandrel(b, m.towerUp, g.ax, ag - ohw, ag + ohw, K.arch[0], crown, crown + 0.002, c - 0.24, c + 0.24);
  const out = c + S.sgn * 0.24;                                            // the face toward the lot
  put(m.steel, ag - 0.16, K.flood, Math.min(out, out + S.sgn * 0.2), ag + 0.16, K.flood + 0.12, Math.max(out, out + S.sgn * 0.2), { cast: false });
  put(m.flood, ag - 0.13, K.flood - 0.03, Math.min(out + S.sgn * 0.02, out + S.sgn * 0.19), ag + 0.13, K.flood, Math.max(out + S.sgn * 0.02, out + S.sgn * 0.19), { cast: false });
  // the little roof's own ceiling over the walkway's edge, and its eaves
  const e = half + h + GABLE.over;
  put(m.soffit, ag - e, top - 0.24, Math.min(S.C(-GABLE.over), S.C(0.9)), ag + e, top - 0.2, Math.max(S.C(-GABLE.over), S.C(0.9)), { cast: false });
  put(m.trim, ag - e - 0.03, top - 0.24, Math.min(S.C(-GABLE.over - 0.03), S.C(-GABLE.over + 0.03)), ag + e + 0.03, top + 0.1, Math.max(S.C(-GABLE.over - 0.03), S.C(-GABLE.over + 0.03)), { cast: false });
  for (const s of [-1, 1]) put(m.trim, ag + s * e - 0.03, top - 0.24, Math.min(S.C(-GABLE.over), S.C(0.6)), ag + s * e + 0.03, top + 0.1, Math.max(S.C(-GABLE.over), S.C(0.6)), { cast: false });
  for (const s of [-1, 1]) put(m.towerUp, ag + s * (half + h - 0.05) - 0.05, SOFFIT, Math.min(S.C(0.05), S.C(0.9)), ag + s * (half + h - 0.05) + 0.05, top - 0.2, Math.max(S.C(0.05), S.C(0.9)), { cast: false });
}

/* ── a single-storey part under its own low tile roof: a lean-to on a wing's end, the block at the north wing's south
   end. (x0…z1): its roof's outline; `face`: where its door is ── */
function lowBlock(b, m, x0, z0, x1, z1, face) {
  const big = Math.min(x1 - x0, z1 - z0) > 3, eave = big ? 3.0 : 2.75, i = 0.25;
  b.box(m.wall2, x0 + i, 0, z0 + i, x1 - i, eave, z1 - i, { uv: [2, 2], uvw: true, solid: true });
  b.box(m.trim, x0 - 0.02, eave - 0.14, z0 - 0.02, x1 + 0.02, eave + 0.06, z1 + 0.02, { cast: false });
  hipRoof(b, m.roof2, x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, eave + 0.04, 0.36, m.ridge);
  const door = (x, z, ry) => { b.push(x, 0.02, z, ry); doorLeaf(b, 0.9, DOOR_H, m.door, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' }); b.box(m.trim, -0.07, 0, -0.03, 0, DOOR_H + 0.07, 0.03, { cast: false }); b.box(m.trim, 0.9, 0, -0.03, 0.97, DOOR_H + 0.07, 0.03, { cast: false }); b.box(m.trim, -0.07, DOOR_H, -0.03, 0.97, DOOR_H + 0.07, 0.03, { cast: false }); b.pop(); };
  if (face === 'w') door(x0 + i - 0.02, big ? z0 + 1.6 : (z0 + z1) / 2 + 0.45, 90);
  else if (face === 'n') door((x0 + x1) / 2 - 0.45, z0 + i - 0.02, 0);
  else if (face === 's') door((x0 + x1) / 2 - 0.45, z1 - i + 0.02, 0);
}

/* ── the lobby on the main wing's east end, its porch, the sign tower beside it (plan.js: LOBBY) ── */
const LIT = [];
/** the hotel's lit signs: on after dark */
export function hotelHour(night) { for (const s of LIT) s.emissiveIntensity = night ? 0.9 : 0; }
/** a plate of plain letters (no logo) facing `face` */
export function plate(b, text, x, y, z, w, h, face, bg, fg, o = {}) {
  const lines = String(text).split('\n');
  const t = plateTex(512, Math.max(32, Math.round(512 * h / w)), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = `${o.weight ?? 600} ${Math.round(H * (o.size ?? 0.6) / lines.length)}px ${o.font ?? 'Georgia, serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, W / 2, H * (i + 0.5) / lines.length + H * 0.03)); });
  const mm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, emissive: '#ffffff', emissiveMap: o.lit ? t : null, emissiveIntensity: 0 });
  if (o.lit) LIT.push(mm);
  b.quad(mm, face, x, y, z, w, h, { cast: false });
}
function buildLobby(b, m, ctx, wing) {
  const K = LOBBY, R = K.room, Po = K.porch, Tw = K.tower, xE = K.east, xW = wing.start + wing.n * MOD, zN = wing.z0 + 0.3, zS = wing.z1 - 0.3;
  const U = { uv: [2, 2], uvw: true }, H1 = G1 + R.h, paint = X.roomWall('#e3d6b8'), putX = along(b, 'x'), putZ = along(b, 'z');
  const glassy = X.glassDark(), dark = M.plain('#3f4446', 0.5, 0.3);
  /* the closed block: all of it above the lobby's ceiling, and at the ground the part south of the room */
  b.box(m.wall, xW, H1 + 0.25, zN, xE, EAVE, zS, { ...U });
  b.box(m.wall, xW, 0, R.z1 + 0.2, xE, H1 + 0.25, zS, { ...U, solid: true });
  // its corners: pilasters with their capitals under the eaves, as on the walkways
  for (const [x, z] of [[xW + 0.22, zN - 0.02], [xE - 0.22, zN - 0.02], [xW + 0.22, zS + 0.02], [xE - 0.22, zS + 0.02], [xE + 0.02, zN + 0.22], [xE + 0.02, zS - 0.22]]) {
    const y1 = SOFFIT - 0.02, h = 0.24;
    b.box(m.col, x - h, 0, z - h, x + h, y1, z + h, { ...U });
    for (const [y, t, e] of [[y1 - 0.3, 0.1, 0.03], [y1 - 0.2, 0.2, 0.08]]) b.box(m.trim, x - h - e, y, z - h - e, x + h + e, y + t, z + h + e, { cast: false });
  }
  b.box(m.trim, xW, SOFFIT, zN - 0.02, xE + 0.3, EAVE + 0.08, zN + 0.04, { cast: false }); b.box(m.trim, xW, SOFFIT, zS - 0.04, xE + 0.3, EAVE + 0.08, zS + 0.02, { cast: false });
  b.box(m.soffit, xW, SOFFIT, wing.z0, xE + 0.3, SOFFIT + 0.04, zN, { cast: false }); b.box(m.soffit, xW, SOFFIT, zS, xE + 0.3, SOFFIT + 0.04, wing.z1, { cast: false });
  // the north face: a window on each floor, "Lobby" between them, the building's letter on the corner
  const wx0 = xW + 0.95, wx1 = xE - 0.75, win = [[G1 + 0.85, G1 + 2.1, true], [G2 + 0.66, G2 + 2.2, false]];
  band(putX, zN, zN + 0.25, xW, xE, 0, H1 + 0.25, [{ a: wx0, b: wx1, y0: win[0][0], y1: win[0][1] }], m.wall, paint);
  for (const [y0, y1, real] of win) {
    windowFrame(b, 'x', wx0, wx1, y0, y1, zN + 0.05, { mat: m.frame, mull: 1, t: 0.05, d: 0.07, glass: false });
    for (let i = 1; i < 3; i++) b.box(m.frame, wx0, y0 + (y1 - y0) * i / 3 - 0.012, zN + 0.03, wx1, y0 + (y1 - y0) * i / 3 + 0.012, zN + 0.06, { cast: false });
    b.box(glassy, wx0 + 0.04, y0 + 0.04, zN + 0.05, wx1 - 0.04, y1 - 0.04, zN + 0.056, { cast: false });
    if (!real) b.box(m.liner, wx0 - 0.1, y0 - 0.1, zN + 0.3, wx1 + 0.1, y1 + 0.15, zN + 0.31, { cast: false });
  }
  plate(b, 'Lobby', (wx0 + wx1) / 2, G2 - 0.16, zN - 0.012, 0.95, 0.34, '-z', '#4a4640', '#f4f1e8');
  plate(b, 'A', xE - 0.22, G2 + 1.0, zN - 0.275, 0.3, 0.38, '-z', '#8c3b2b', '#f4f1e8', { size: 0.9, font: 'Arial, sans-serif' });
  plate(b, 'Rooms\n151 – 177\n103 – 127', xW + 0.22, G2 - 0.22, zN - 0.275, 0.4, 0.5, '-z', '#3b3a48', '#f4f1e8', { size: 0.62, font: 'Arial, sans-serif' });
  /* the room: L-shaped — the block's north part, and west of it the ground floor of the wing's last studio. Floor, ceiling,
     walls painted inside; the east wall has the door, glass each side of it and over it */
  const d0 = K.door[0], d1 = K.door[1], dT = G1 + K.doorH, side = 0.42, tr = dT + 0.38;
  // (its floor a hair over the forecourt's gravel, whose quarter round is struck from a point under this corner)
  b.box(X.vinyl(), R.x0, G1 - 0.02, R.zs, R.x1, G1 + 0.008, R.z1, { uv: [1.2, 1.2], uvw: true, cast: false }); b.box(X.vinyl(), R.split, G1 - 0.02, R.z0, R.x1, G1 + 0.008, R.zs, { uv: [1.2, 1.2], uvw: true, cast: false });
  b.box(M.plain('#f1eee6', 0.9), R.x0 - 0.2, H1, R.zs, R.split, H1 + 0.25, R.z1 + 0.2, { cast: false }); b.box(M.plain('#f1eee6', 0.9), R.split, H1, R.z0 - 0.2, R.x1 + 0.2, H1 + 0.25, R.z1 + 0.2, { cast: false });
  band(putZ, xE - 0.25, xE, zN, R.z1 + 0.2, 0, H1 + 0.25, [{ a: d0 - side, b: d0, y0: G1 + 0.35, y1: tr }, { a: d0, b: d1, y0: G1, y1: tr }, { a: d1, b: d1 + side, y0: G1 + 0.35, y1: tr }], paint, m.wall);      // east
  band(putZ, xW, xW + 0.225, zN, R.zs, 0, H1 + 0.25, [], m.wall, paint);                                             // the block's west side, to the walkway
  b.box(paint, R.x0 - 0.2, 0, R.zs, R.x0, H1, R.z1, { solid: true });                                                // west
  b.box(paint, R.x0 - 0.2, 0, R.z1, R.x1, H1, R.z1 + 0.2, { solid: true });                                          // south, behind the desk
  b.box(paint, R.x0, 0, R.zs - 0.02, R.split, H1, R.zs, { cast: false });                                            // a skin on the studio's own front wall
  // the door's frame, its leaf standing open into the room, the fixed glass
  for (const z of [d0 - side, d0, d1, d1 + side]) b.box(dark, xE - 0.16, G1 + (z === d0 || z === d1 ? 0 : 0.35), z - 0.025, xE - 0.08, tr, z + 0.025, { cast: false });
  for (const y of [G1 + 0.35, dT, tr]) b.box(dark, xE - 0.16, y - 0.025, d0 - side, xE - 0.08, y + 0.025, y === G1 + 0.35 ? d0 : d1 + side, { cast: false });
  b.box(dark, xE - 0.16, G1 + 0.325, d1, xE - 0.08, G1 + 0.375, d1 + side, { cast: false });
  for (const [z0, z1, y0, y1] of [[d0 - side, d0, G1 + 0.35, tr], [d1, d1 + side, G1 + 0.35, tr], [d0, d1, dT, tr]]) b.box(glassy, xE - 0.125, y0, z0, xE - 0.115, y1, z1, { cast: false });
  for (let i = 1; i < 5; i++) b.box(dark, xE - 0.14, dT, d0 + (d1 - d0) * i / 5 - 0.01, xE - 0.1, tr, d0 + (d1 - d0) * i / 5 + 0.01, { cast: false });
  // a lantern on the wall each side of the door: a dark hood, a frosted box that glows after dark
  for (const z of [d0 - side - 0.38, d1 + side + 0.38]) { b.box(dark, xE, G1 + 2.02, z - 0.09, xE + 0.16, G1 + 2.08, z + 0.09, { cast: false }); b.box(m.sconce, xE + 0.02, G1 + 1.74, z - 0.065, xE + 0.13, G1 + 2.02, z + 0.065, { cast: false }); }
  b.push(xE - 0.12, G1, d0, 180);                                              // hinged at its north jamb, swung in against the wall
  b.box(dark, 0, 0.02, -0.02, 0.9, K.doorH - 0.02, 0.02, {}); b.box(glassy, 0.12, 0.3, -0.026, 0.78, K.doorH - 0.16, 0.026, { cast: false });
  for (let i = 1; i < 3; i++) b.box(M.plain('#d9d6cc', 0.5), 0.12 + 0.66 * i / 3 - 0.008, 0.3, -0.03, 0.12 + 0.66 * i / 3 + 0.008, K.doorH - 0.16, 0.03, { cast: false });
  for (let i = 1; i < 5; i++) b.box(M.plain('#d9d6cc', 0.5), 0.12, 0.3 + (K.doorH - 0.46) * i / 5 - 0.008, -0.03, 0.78, 0.3 + (K.doorH - 0.46) * i / 5 + 0.008, 0.03, { cast: false });
  b.pop(); b.solid(xE - 1.05, G1, d0 - 0.06, xE - 0.1, G1 + K.doorH, d0);
  // the desk along the south side: a white front, a dark top with a raised ledge to the guest; two screens; the wall behind it
  const dz = R.desk, dx0 = R.x0 + 0.9, dx1 = R.x1 - 1.3, white = M.plain('#ece8de', 0.6), top = M.plain('#2b2a29', 0.35, 0.2);
  b.box(white, dx0, G1, dz, dx1, G1 + 1.0, dz + 0.1, { solid: true }); b.box(top, dx0 - 0.03, G1 + 1.0, dz - 0.06, dx1 + 0.03, G1 + 1.07, dz + 0.3, {});
  b.box(top, dx0, G1 + 0.72, dz + 0.1, dx1, G1 + 0.76, dz + 0.72, {}); b.box(white, dx0, G1, dz + 0.1, dx0 + 0.06, G1 + 1.0, R.z1, { solid: true });
  for (const x of [dx0 + 1.2, dx1 - 1.3]) { b.box(top, x - 0.2, G1 + 0.76, dz + 0.36, x + 0.2, G1 + 0.79, dz + 0.5, { cast: false }); b.rbox(top, x, G1 + 0.98, dz + 0.42, 0.44, 0.3, 0.03, 0, { rx: 8, cast: false }); }
  b.box(X.roomWall('#6f8f73'), dx0 + 0.3, G1 + 1.15, R.z1 - 0.012, dx1 - 0.3, H1 - 0.25, R.z1, { cast: false });
  b.box(paint, dx1 + 0.35, G1, R.z1 - 0.03, dx1 + 1.2, G1 + 2.03, R.z1, { cast: false }); b.box(m.trim, dx1 + 0.3, G1, R.z1 - 0.035, dx1 + 0.35, G1 + 2.08, R.z1, { cast: false }); b.box(m.trim, dx1 + 1.2, G1, R.z1 - 0.035, dx1 + 1.25, G1 + 2.08, R.z1, { cast: false });   // the office's door
  // a low table and two chairs by the window wall; the lights in the ceiling
  const wood = M.wood('#7a5a3c', 0.3, 2), seat = M.plain('#8a6b3f', 0.8);
  b.box(wood, R.x0 + 0.5, G1 + 0.4, R.zs + 0.25, R.x0 + 1.3, G1 + 0.45, R.zs + 0.75, {}); b.solid(R.x0 + 0.5, G1, R.zs + 0.25, R.x0 + 1.3, G1 + 0.45, R.zs + 0.75);
  for (const x of [R.x0 + 1.75, R.x0 + 2.55]) { b.box(seat, x, G1 + 0.2, R.zs + 0.12, x + 0.6, G1 + 0.44, R.zs + 0.7, {}); b.box(seat, x, G1 + 0.44, R.zs + 0.12, x + 0.6, G1 + 0.9, R.zs + 0.24, {}); b.solid(x, G1, R.zs + 0.12, x + 0.6, G1 + 0.9, R.zs + 0.7); }
  const tube = ctx.lampMat('#fff6e6', 1.8, 0.95, 0.75);
  const zr = (R.zs + R.desk) / 2;
  for (const [x, z] of [[R.x0 + 1.4, zr], [R.x0 + 3.4, zr], [R.split + 1.3, zr], [R.split + 1.3, (R.z0 + R.zs) / 2]]) b.box(tube, x - 0.55, H1 - 0.03, z - 0.14, x + 0.55, H1 - 0.005, z + 0.14, { cast: false });
  flat(R.x0, R.zs, R.x1, R.z1, G1); flat(R.split, R.z0, R.x1, R.zs, G1); flat(xE - 0.3, d0, xE + 0.05, d1, G1);
  /* the porch over the door: two stubby terracotta columns with white caps, a flat arch between them, a low tiled roof */
  const px = Po.x1, pz0 = Po.z0, pz1 = Po.z1, ph = Po.pier / 2;
  b.box(m.walk, xE, 0, pz0, px, G1, pz1, { uv: [1.5, 1.5], uvw: true, cast: false }); flat(xE, pz0 + 0.55, px + 0.0, pz1 - 0.1, G1);
  for (const z of [pz0 + ph, pz1 - ph]) {
    b.box(m.col, px - 2 * ph, 0, z - ph, px, Po.cap[0], z + ph, { ...U, solid: true });
    b.box(m.trim, px - 2 * ph - 0.04, Po.cap[0], z - ph - 0.04, px + 0.04, Po.cap[0] + 0.28, z + ph + 0.04, { cast: false }); b.box(m.trim, px - 2 * ph - 0.1, Po.cap[0] + 0.28, z - ph - 0.1, px + 0.1, Po.cap[1], z + ph + 0.1, { cast: false });
    b.box(m.towerLo, px - 2 * ph + 0.04, Po.cap[1], z - ph + 0.04, px - 0.04, Po.eave, z + ph - 0.04, U);
  }
  { const ohw = (pz1 - pz0) / 2 - 2 * ph + 0.04, zc = (pz0 + pz1) / 2;
    b.box(m.towerLo, px - 0.4, Po.arch[1], pz0, px - 0.04, Po.eave, pz1, U);
    spandrel(b, m.towerLo, 'z', zc - ohw, zc + ohw, Po.arch[0], Po.arch[1], Po.arch[1] + 0.002, px - 0.4, px - 0.04); }
  // its north side: a wall with a narrow arched way through (the hotel's picture from Mariposa)
  { const z0 = pz0 + 0.04, z1 = pz0 + 0.36, a0 = xE + Po.side[0], a1 = xE + Po.side[1], yS = Po.arch[0], yC = Po.arch[0] + 0.3;
    b.box(m.towerLo, xE, 0, z0, a0, yC, z1, { ...U, solid: true }); b.box(m.towerLo, a1, 0, z0, px - 2 * ph + 0.04, yC, z1, { ...U, solid: true }); b.box(m.towerLo, xE, yC, z0, px - 0.04, Po.eave, z1, U);
    spandrel(b, m.towerLo, 'x', a0, a1, yS, yC, yC + 0.002, z0, z1); }
  b.box(m.soffit, xE, Po.eave - 0.2, pz0, px, Po.eave - 0.16, pz1, { cast: false });
  b.box(m.trim, xE, Po.eave - 0.14, pz0 - 0.33, px + 0.33, Po.eave + 0.06, pz0 - 0.27, { cast: false }); b.box(m.trim, px + 0.27, Po.eave - 0.14, pz0 - 0.33, px + 0.33, Po.eave + 0.06, pz1, { cast: false });
  hipRoof(b, m.roof2, xE - 1.6, pz0 - 0.3, px + 0.3, pz1 + 0.05, Po.eave + 0.04, 0.36, m.ridge);
  plate(b, 'Lobby', px - 0.03, Po.arch[1] + 0.58, pz1 - 0.95, 0.8, 0.3, '+x', '#4a4640', '#f4f1e8');
  plate(b, '1910', px - 0.03, Po.arch[1] + 0.58, pz0 + 1.7, 0.95, 0.36, '+x', '#4a4640', '#f4f1e8', { font: 'Arial, sans-serif' });
  /* the sign tower: a square shaft, a column on each corner with its capital half-way up, a gridded panel to the drive, the
     hotel's name high on the face to Mariposa (plain letters; lit at night), a tiled cap */
  b.box(m.towerLo, Tw.x0, 0, Tw.z0, Tw.x1, Tw.eave, Tw.z1, { ...U, solid: true });
  for (const x of [Tw.x0 + 0.24, Tw.x1 - 0.24]) for (const z of [Tw.z0 + 0.24, Tw.z1 - 0.24]) {
    b.box(m.col, x - 0.34, 0, z - 0.34, x + 0.34, Tw.cap[0], z + 0.34, { ...U });
    b.box(m.trim, x - 0.39, Tw.cap[0], z - 0.39, x + 0.39, Tw.cap[0] + 0.3, z + 0.39, { cast: false }); b.box(m.trim, x - 0.46, Tw.cap[0] + 0.3, z - 0.46, x + 0.46, Tw.cap[1], z + 0.46, { cast: false });
  }
  { const gz0 = Tw.z0 + 0.62, gz1 = Tw.z1 - 0.62, gy0 = 0.3, gy1 = Tw.cap[0] - 0.1;
    const t = plateTex(256, 512, (g, W, H) => { g.fillStyle = '#f2ede0'; g.fillRect(0, 0, W, H); g.fillStyle = '#dcc890'; const nx = 5, ny = 9, pad = 7; for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) g.fillRect(i * W / nx + pad, j * H / ny + pad, W / nx - 2 * pad, H / ny - 2 * pad); });
    b.quad(new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), '+x', Tw.x1 + 0.012, (gy0 + gy1) / 2, (gz0 + gz1) / 2, gz1 - gz0, gy1 - gy0, { cast: false });
    b.box(m.towerUp, Tw.x1, Tw.cap[1] + 0.1, gz0, Tw.x1 + 0.012, Tw.cap[1] + 0.95, gz1, { cast: false }); }
  const signW = Tw.x1 - Tw.x0 - 0.5, sy = Tw.eave - 1.45;
  b.box(M.plain('#20262a', 0.5), Tw.x0 + 0.2, sy - 0.85, Tw.z0 - 0.09, Tw.x1 - 0.2, sy + 0.85, Tw.z0, {});
  plate(b, 'Extended Stay\nAmerica', (Tw.x0 + Tw.x1) / 2, sy, Tw.z0 - 0.095, signW, 1.5, '-z', '#1f3a2c', '#f4f1e8', { lit: true, size: 0.62 });
  b.box(m.soffit, Tw.x0 - 0.55, Tw.eave - 0.2, Tw.z0 - 0.55, Tw.x1 + 0.55, Tw.eave - 0.16, Tw.z1 + 0.55, { cast: false });
  for (const [x0, z0, x1, z1] of [[Tw.x0 - 0.58, Tw.z0 - 0.58, Tw.x1 + 0.58, Tw.z0 - 0.52], [Tw.x0 - 0.58, Tw.z1 + 0.52, Tw.x1 + 0.58, Tw.z1 + 0.58], [Tw.x0 - 0.58, Tw.z0 - 0.58, Tw.x0 - 0.52, Tw.z1 + 0.58], [Tw.x1 + 0.52, Tw.z0 - 0.58, Tw.x1 + 0.58, Tw.z1 + 0.58]]) b.box(m.trim, x0, Tw.eave - 0.2, z0, x1, Tw.eave + 0.1, z1, { cast: false });
  hipRoof(b, m.roof2, Tw.x0 - 0.55, Tw.z0 - 0.55, Tw.x1 + 0.55, Tw.z1 + 0.55, Tw.eave + 0.06, 0.5, m.ridge);
  /* the yard south of the tower: a low wall round the air-conditioners */
  { const [x0, z0, x1, z1] = K.yard;
    b.box(m.wall2, x1 - 0.15, 0, z0, x1, 1.3, z1, { ...U, solid: true }); b.box(m.wall2, xE, 0, z0, x1, 1.3, z0 + 0.15, { ...U, solid: true }); b.box(m.wall2, xE, 0, z1 - 0.15, x1, 1.3, z1, { ...U, solid: true });
    for (let i = 0; i < 3; i++) { const z = z0 + 0.9 + i * 1.35; b.box(M.plain('#b9bcbb', 0.5, 0.4), xE + 0.5, 0, z - 0.45, xE + 1.4, 0.95, z + 0.45, {}); b.cyl(M.plain('#3a3d3e', 0.5, 0.5), xE + 0.95, 0.95, z, 0.34, 0.03, { seg: 14, cast: false }); } }
  ctx.lobby = { door: [xE, G1 + 1.2, (d0 + d1) / 2], lamp: [R.split + 0.6, H1 - 0.3, zr] };
  ctx.hot.push({ id: 'lobby', pos: [px + 0.05, Po.arch[1] + 0.2, (pz0 + pz1) / 2 - 0.6], r: 0.26 });
}
