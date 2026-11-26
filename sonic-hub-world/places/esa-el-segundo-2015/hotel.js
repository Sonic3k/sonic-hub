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
import { plantMaterial, hedgeBox } from '../../engine/plants.js';
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
    mulch: X.mulch(),
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
/** a slab whose outline is drawn across the wing — points [c, y] — and which is a0…a1 thick along it (a raked wall) */
function prism(b, mat, ax, pts, a0, a1, o = {}) {
  const sh = new THREE.Shape(), k = ax === 'x' ? -1 : 1;
  pts.forEach(([c, y], i) => (i ? sh.lineTo(k * c, y) : sh.moveTo(k * c, y))); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: a1 - a0, bevelEnabled: false });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  if (ax === 'x') { g.rotateY(Math.PI / 2); g.translate(a0, 0, 0); } else g.translate(0, 0, a0);
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
      for (const [fl, y] of [[1, G1], [2, G2]]) {
        ops.push({ a: d[0], b: d[1], y0: y, y1: y + DOOR_H, k, fl, door: true, odd });
        ops.push({ a: wn[0], b: wn[1], y0: y + OPEN.sill, y1: y + OPEN.head, k, fl, odd, lv });
      }
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
        { const pa = op.odd ? op.b + 0.14 : op.a - 0.22; put(m.metal, pa, y + 1.46, outer, pa + 0.08, y + 1.58, outer + S.sgn * 0.012, { cast: false });     // the room's number, by the latch
          if (isHis(S.s, op.k, op.fl) && HIS.room) { const [nx, nz] = loc(pa + 0.04, outer + S.sgn * 0.014); plate(b, String(HIS.room), nx, y + 1.52, nz, 0.07, 0.11, S.out, '#d9d6cc', '#26272a', { size: 0.4, weight: 700, font: 'Arial, sans-serif' }); } }      // his: 271, by the hotel's folio (how the plate looked is not in any photograph)
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
          { const [ha, hc] = loc(a, Math.min(S.C(h0), S.C(h1))), [hb, hd] = loc(e, Math.max(S.C(h0), S.C(h1)));               // a clipped hedge, its leaves the engine's (engine/plants.js)
            b.geo(plantMaterial(), hedgeBox({ x0: Math.min(ha, hb), y0: 0.1, z0: Math.min(hc, hd), x1: Math.max(ha, hb), y1: top, z1: Math.max(hc, hd), tint: Math.round(a) % 2 ? '#314d24' : '#3a5a2a', seed: 3 + Math.round(a * 3) % 89 }), { cast: false }); }
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
    if (i < 7) { const [l0, l1] = fa(sL), yl = yL - (i + 1) * st; box(m.tread, l0, yl - 0.05, d0, l1, yl, d1 - 0.025, { uv: [1, 1], uvw: true }); box(m.slab, l0, Math.max(G1, yl - 0.24), d0, l1, yl - 0.05, d1, { cast: false }); }
  }
  { const [u0, u1] = fa(sU); box(m.walk, u0, SLAB, dTop, u1, G2, -KERB, { uv: [1.5, 1.5], uvw: true }); }             // the last tread runs into the walkway
  // the wall between the two flights: from the ground to a rake a guard's height over the upper one
  prism(b, m.towerLo, ax, [[O(dL), 0], [O(dTop), 0], [O(dTop), G2 + 1.02], [O(dL), yL + 1.02]], am - 0.15, am + 0.15);
  solid(am - 0.15, 0, dTop, am + 0.15, G2 + 1.02, dL);
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
  const U = { uv: [2, 2], uvw: true }, H1 = G1 + R.h, paint = X.roomWall('#e4cc98'), putX = along(b, 'x'), putZ = along(b, 'z');
  const planks = X.vinyl().clone(); planks.color.set('#8d837a');                 // the room's floor: wood-look planks, darker than the studios'
  const glassy = X.glassDark(), dark = M.plain('#3f4446', 0.5, 0.3), cream = M.plain('#ece7da', 0.7), black = M.plain('#26272a', 0.4, 0.15), white = M.plain('#f3f1ea', 0.6), base = M.plain('#c9b28a', 0.6), ceil = M.plain('#f1eee6', 0.9), steel = M.plain('#b9bcbf', 0.3, 0.7), soff = M.plain('#e6e4de', 0.95);
  /* the lines (plan.js, LOBBY). Along x: x0 the west wall's inside; xB the beam's face to the room and xE its face to the
     bay, which is the block's end; xP the cased east end of the desk's wall; vx the door wall's inside and dx its outside;
     px the porch columns' outer face. Along z: z0 the north wall's inside; bz0 the bay's north wall inside and zc0 its
     outside, the porch's north face; zp the desk's wall (its face to the guest), zo its back, zb the office's back wall;
     bz1 the back of the nook by the door. Heights: H1 the room's ceiling, HB the bay's, yBm the beam's underside (and
     the dropped ceiling's over the desk), yLow the top of the low walls under the tiled roof */
  const D = K.desk, x0 = R.x0, xB = R.x1, xP = x0 + D.end, vx = xE + K.bay.d, dx = K.doorX, px = Po.x1, pw = Po.pier[0], pd = Po.pier[1];
  const z0 = R.z0, zp = R.zp, zo = zp + D.wall, zb = zo + K.office, bz0 = z0 + K.bay.n, bw = 0.15, zc0 = bz0 - bw, bz1 = z0 + K.bay.s, pz0 = Po.z0, pz1 = Po.z1;
  const HB = G1 + K.bay.h, yBm = G1 + K.beam.under, yLow = Po.eave - 0.2;
  const wx0 = x0 + K.win.x[0], wx1 = x0 + K.win.x[1], win = [[G1 + K.win.sill, G1 + K.win.head, true], [G2 + K.win.sill, G2 + K.win.head, false]];

  /* THE BLOCK: two storeys, one module long. Upstairs a room like the others' (its window to Mariposa, its door on the
     upper walkway's end); at the ground the lobby, and south of the office the closed back of the house */
  band(putX, zN, zN + 0.25, xW, xE, H1 + 0.25, EAVE, [{ a: wx0, b: wx1, y0: win[1][0], y1: win[1][1] }], m.wall, m.wall);
  b.box(m.wall, xW, H1 + 0.25, zN + 0.25, xE, EAVE, zS, { ...U });
  b.box(m.wall, xW, 0, zb, xE, H1 + 0.25, zS, { ...U, solid: true });
  // its corners to Mariposa: wide terracotta piers, white capitals under the eaves (the east one runs back as far as the bay's wall)
  { const y1 = SOFFIT - 0.02, cap = (xa, za, xb, zb2) => { for (const [y, t, e] of [[y1 - 0.3, 0.1, 0.03], [y1 - 0.2, 0.2, 0.08]]) b.box(m.trim, xa - e, y, za - e, xb + e, y + t, zb2 + e, { cast: false }); };
    for (const [xa, za, xb, zb2] of [[xW - 0.03, zN - 0.1, xW + 0.68, zN + 0.2], [xE - 0.68, zN - 0.1, xE + 0.06, zN + 0.2], [xW - 0.02, zS - 0.2, xW + 0.46, zS + 0.1], [xE - 0.46, zS - 0.2, xE + 0.06, zS + 0.1]]) { b.box(m.col, xa, 0, za, xb, y1, zb2, { ...U }); cap(xa, za, xb, zb2); }
    b.box(m.col, xE - 0.02, 0, zN + 0.2, xE + 0.06, y1, zc0 + 0.02, { ...U }); cap(xE - 0.02, zN + 0.2, xE + 0.06, zc0 + 0.02); }      // the east pier's return along the block's end, as far as the bay's wall
  b.box(m.trim, xW, SOFFIT, zN - 0.02, xE + 0.3, EAVE + 0.08, zN + 0.04, { cast: false }); b.box(m.trim, xW, SOFFIT, zS - 0.04, xE + 0.3, EAVE + 0.08, zS + 0.02, { cast: false });
  b.box(m.soffit, xW, SOFFIT, wing.z0, xE + 0.3, SOFFIT + 0.04, zN, { cast: false }); b.box(m.soffit, xW, SOFFIT, zS, xE + 0.3, SOFFIT + 0.04, wing.z1, { cast: false });
  // the north face: a window on each floor, "Lobby" between them, the building's letter on the east pier, the rooms' numbers on the west one
  band(putX, zN, zN + 0.25, xW, xE, 0, H1 + 0.25, [{ a: wx0, b: wx1, y0: win[0][0], y1: win[0][1] }], m.wall, paint);
  for (const [y0, y1, real] of win) {
    windowFrame(b, 'x', wx0, wx1, y0, y1, zN + 0.05, { mat: m.frame, mull: 1, t: 0.05, d: 0.07, glass: false });
    for (let i = 1; i < 4; i++) b.box(m.frame, wx0, y0 + (y1 - y0) * i / 4 - 0.01, zN + 0.03, wx1, y0 + (y1 - y0) * i / 4 + 0.01, zN + 0.06, { cast: false });
    for (const xm of [wx0, (wx0 + wx1) / 2]) for (let i = 1; i < 3; i++) b.box(m.frame, xm + (wx1 - wx0) * i / 6 - 0.01, y0, zN + 0.03, xm + (wx1 - wx0) * i / 6 + 0.01, y1, zN + 0.06, { cast: false });
    b.box(glassy, wx0 + 0.04, y0 + 0.04, zN + 0.05, wx1 - 0.04, y1 - 0.04, zN + 0.056, { cast: false });
    if (!real) b.box(m.liner, wx0 - 0.1, y0 - 0.1, zN + 0.2, wx1 + 0.1, y1 + 0.15, zN + 0.21, { cast: false });
  }
  plate(b, 'Lobby', (wx0 + wx1) / 2, G2 - 0.11, zN - 0.012, 0.98, 0.4, '-z', '#4a4640', '#f4f1e8');
  plate(b, 'A', xE - 0.31, G2 + 1.05, zN - 0.112, 0.34, 0.4, '-z', '#8c3b2b', '#f4f1e8', { size: 0.92, font: 'Arial, sans-serif' });
  plate(b, 'Rooms\n151 – 177\n103 – 127', xW + 0.34, G2 - 0.18, zN - 0.112, 0.58, 0.6, '-z', '#3b3a48', '#f4f1e8', { size: 0.62, font: 'Arial, sans-serif' });

  /* THE ROOM under the block, the strip under the beam, the bay and the office: floors and ceilings */
  b.box(planks, x0, G1 - 0.02, z0, xE, G1 + 0.008, zb, { uv: [1.2, 1.2], uvw: true, cast: false });
  b.box(planks, xE, G1 - 0.02, bz0, vx, G1 + 0.008, bz1, { uv: [1.2, 1.2], uvw: true, cast: false });
  b.box(planks, xE, G1 - 0.02, bz1, xP, G1 + 0.008, zb, { uv: [1.2, 1.2], uvw: true, cast: false });
  b.box(ceil, xW + 0.02, H1, zN + 0.02, xE - 0.02, H1 + 0.25, zb, { cast: false });
  b.box(ceil, xE - 0.02, HB, zc0 + 0.02, dx - 0.02, HB + 0.1, bz1 + 0.02, { cast: false });
  b.box(ceil, xE - 0.02, H1, bz1 + 0.02, xP, H1 + 0.1, zb, { cast: false });
  /* the west wall: the block's own, to the walkway; in it, by the window wall, THE BACK DOOR — half glazed, white inside, EXIT
     over it — standing open onto the ground-floor walkway */
  const zk0 = z0 + K.back.z[0], zk1 = z0 + K.back.z[1], kH = G1 + K.back.h;
  band(putZ, xW, x0, z0, zb, 0, H1 + 0.25, [{ a: zk0, b: zk1, y0: 0, y1: kH }], m.wall, paint);
  b.box(m.walk, xW, 0, zk0, x0, G1, zk1, { cast: false });
  for (const x of [x0, xW - 0.02]) for (const [a0, a1, y0, y1] of [[zk0 - 0.07, zk0, G1, kH + 0.07], [zk1, zk1 + 0.07, G1, kH + 0.07], [zk0 - 0.07, zk1 + 0.07, kH, kH + 0.07]]) b.box(white, x, y0, a0, x + 0.02, y1, a1, { cast: false });
  b.push(xW + 0.02, G1, zk1 - 0.025, 180);                                     // hinged at its south jamb, swung out against the next wall
  { const h = K.back.h, g0 = 1.04, g1 = h - 0.16;
    b.box(white, 0, 0.02, -0.02, 0.9, h - 0.02, 0.02, {}); b.box(glassy, 0.14, g0, -0.026, 0.76, g1, 0.026, { cast: false });
    for (let i = 1; i < 3; i++) b.box(white, 0.14 + 0.62 * i / 3 - 0.008, g0, -0.03, 0.14 + 0.62 * i / 3 + 0.008, g1, 0.03, { cast: false });
    b.box(white, 0.14, (g0 + g1) / 2 - 0.008, -0.03, 0.76, (g0 + g1) / 2 + 0.008, 0.03, { cast: false });
    for (const [y0, y1] of [[0.14, 0.86]]) b.box(M.plain('#e6e3da', 0.6), 0.14, y0, -0.024, 0.76, y1, 0.024, { cast: false });
    b.box(steel, 0.76, 0.98, -0.07, 0.86, 1.02, 0.07, { cast: false }); }
  b.pop(); b.solid(xW - 0.93, G1, zk1 - 0.06, xW, kH, zk1);
  plate(b, 'EXIT', x0 + 0.024, kH + 0.27, (zk0 + zk1) / 2, 0.36, 0.2, '+x', '#f4f6f2', '#1f8f3f', { lit: true, size: 0.62, font: 'Arial, sans-serif', weight: 700 });
  b.push(xW - 0.025, G2, zk0, 90); doorLeaf(b, zk1 - zk0, 2.03, m.door, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' });      // the door of the room over the lobby, at the upper walkway's end
  b.box(m.trim, -0.07, 0, -0.03, 0, 2.1, 0.03, { cast: false }); b.box(m.trim, zk1 - zk0, 0, -0.03, zk1 - zk0 + 0.07, 2.1, 0.03, { cast: false }); b.box(m.trim, -0.07, 2.03, -0.03, zk1 - zk0 + 0.07, 2.1, 0.03, { cast: false }); b.pop();
  ctx.hot.push({ id: 'backdoor', pos: [x0 + 0.06, G1 + 1.5, (zk0 + zk1) / 2], r: 0.2 });

  /* THE BLOCK'S END WALL at the ground: a stub by the window wall, its end cased in white; over the rest a beam, its
     underside level with the dropped ceiling over the desk, which it runs into */
  band(putZ, xB, xE, z0, bz0, 0, H1 + 0.25, [], paint, m.wall);
  b.box(white, xB - 0.014, G1, bz0 - 0.07, xB, yBm, bz0, { cast: false }); b.box(white, xB - 0.014, G1, bz0, xE + 0.014, yBm, bz0 + 0.012, { cast: false });
  b.box(black, xB - 0.02, G1 + 1.2, bz0 - 0.055, xB - 0.012, G1 + 1.36, bz0 - 0.015, { cast: false });                  // a small black plate on the casing
  b.box(paint, xB, yBm, bz0, xE, H1 + 0.25, zo, { cast: false }); b.box(soff, xB - 0.002, yBm - 0.006, bz0, xE + 0.002, yBm, zo, { cast: false });
  b.box(paint, xE, yBm, bz0, xE + 0.012, HB, zp - D.clip, { cast: false });                                             // the beam's face to the bay

  /* THE ENTRY BAY under the low roof, 1.3 m from the beam to the door wall: its north wall half a metre back from the room's,
     the air-conditioner in it; in the door wall the door, glass with blinds each side of it, a row of lights over them */
  const E = K.entry, e0 = z0 + E.door[0], e1 = z0 + E.door[1], sN = e0 - E.post - E.side, sS = e1 + E.post, sy0 = G1 + 0.14, sy1 = G1 + E.h, t0 = G1 + E.transom[0], t1 = G1 + E.transom[1], dT = G1 + E.h;
  band(putX, zc0, bz0, xE, dx, 0, yLow, [], m.towerLo, paint);
  { const a0 = xE + K.ac[0], a1 = a0 + K.ac[1];
    b.box(m.louvre, a0, 0.2, zc0 - 0.02, a1, 0.6, zc0, { uv: [K.ac[1], 0.4], cast: false }); b.box(m.trim, a0 - 0.02, 0.6, zc0 - 0.03, a1 + 0.02, 0.63, zc0, { cast: false });
    b.box(cream, a0, G1, bz0, a1, G1 + 0.42, bz0 + 0.2, { solid: true }); b.box(dark, a0 + 0.06, G1 + 0.42, bz0 + 0.03, a1 - 0.06, G1 + 0.424, bz0 + 0.16, { cast: false }); }
  band(putZ, vx, dx, zc0, pz1, 0, yLow, [
    { a: sN, b: sN + E.side, y0: sy0, y1: t1 }, { a: sN + E.side, b: e0, y0: t0, y1: t1 }, { a: e0, b: e1, y0: 0, y1: t1 },
    { a: e1, b: sS, y0: t0, y1: t1 }, { a: sS, b: sS + E.side, y0: sy0, y1: t1 }], paint, m.towerLo);
  { const xm = (vx + dx) / 2;                                                   // the wall between the door's head and the lights over it
    for (const [a0, a1, y0] of [[sN, sN + E.side, sy1], [e0, e1, dT + 0.03], [sS, sS + E.side, sy1]]) { b.box(paint, vx, y0, a0, xm, t0, a1, { cast: false }); b.box(m.towerLo, xm, y0, a0, dx, t0, a1, { cast: false }); }
    const fr = (y0, y1, a0, a1) => b.box(dark, xm - 0.035, y0, a0, xm + 0.035, y1, a1, { cast: false });
    for (const [a0, a1] of [[sN, sN + E.side], [sS, sS + E.side]]) { fr(sy0, sy1, a0 - 0.02, a0 + 0.025); fr(sy0, sy1, a1 - 0.025, a1 + 0.02); fr(sy0 - 0.02, sy0 + 0.025, a0, a1); fr(sy1 - 0.025, sy1 + 0.02, a0, a1); b.box(glassy, xm - 0.006, sy0, a0, xm + 0.006, sy1, a1, { cast: false }); }
    fr(G1, dT + 0.03, e0 - 0.03, e0 + 0.02); fr(G1, dT + 0.03, e1 - 0.02, e1 + 0.03); fr(dT, dT + 0.05, e0, e1);
    fr(t0 - 0.02, t0 + 0.025, sN, sS + E.side); fr(t1 - 0.025, t1 + 0.02, sN, sS + E.side); b.box(glassy, xm - 0.006, t0, sN, xm + 0.006, t1, sS + E.side, { cast: false });
    for (let i = 0; i <= 6; i++) { const z = sN + (sS + E.side - sN) * i / 6; fr(t0, t1, z - 0.012, z + 0.012); }
    b.box(M.plain('#d9d7cf', 0.5), vx - 0.11, dT + 0.03, e0 - 0.04, vx, dT + 0.2, e1 + 0.04, { cast: false });      // the door's operator over its head, inside
    // a lantern outside each side of the glass: a dark hood, a frosted box that glows after dark
    for (const z of [sN - 0.22, sS + E.side + 0.26]) { b.box(dark, dx, G1 + 2.16, z - 0.09, dx + 0.16, G1 + 2.22, z + 0.09, { cast: false }); b.box(m.sconce, dx + 0.02, G1 + 1.88, z - 0.065, dx + 0.13, G1 + 2.16, z + 0.065, { cast: false }); }
    // the leaf: glass in fifteen lights, hinged at its north jamb, standing open onto the porch
    b.push(dx - 0.02, G1, e0 + 0.025, 0);
    b.box(dark, 0, 0.02, -0.02, 0.9, E.h - 0.02, 0.02, {}); b.box(glassy, 0.12, 0.3, -0.026, 0.78, E.h - 0.16, 0.026, { cast: false });
    for (let i = 1; i < 3; i++) b.box(M.plain('#d9d6cc', 0.5), 0.12 + 0.66 * i / 3 - 0.008, 0.3, -0.03, 0.12 + 0.66 * i / 3 + 0.008, E.h - 0.16, 0.03, { cast: false });
    for (let i = 1; i < 5; i++) b.box(M.plain('#d9d6cc', 0.5), 0.12, 0.3 + (E.h - 0.46) * i / 5 - 0.008, -0.03, 0.78, 0.3 + (E.h - 0.46) * i / 5 + 0.008, 0.03, { cast: false });
    b.pop(); b.solid(dx, G1, e0 - 0.03, dx + 0.93, dT, e0 + 0.05);
    b.box(M.plain('#2c2c2c', 0.95), dx + 0.12, G1 + 0.004, e0 - 0.05, dx + 0.66, G1 + 0.016, e1 + 0.05, { cast: false }); }     // the mat before the door
  /* past the desk's wall's end, by the door: a shallow nook with a shelf of pale wood; behind it and the office, the low
     roof's closed part (its wall to the porch carries the night boxes) */
  band(putZ, xP, xP + 0.08, zp, bz1, 0, HB, [], paint, paint);
  b.box(white, xP - 0.03, G1, zp - 0.014, xP + 0.094, yBm, zp, { cast: false });                                       // the wall's white-cased end
  b.box(m.towerLo, xP, 0, bz1, vx, yLow, pz1, { ...U, solid: true }); b.box(paint, xP + 0.08, G1, bz1 - 0.012, vx, HB, bz1, { cast: false });
  b.box(m.towerLo, xE, 0, zb, xP, yLow, pz1, { ...U, solid: true });
  { const s0 = xP + 0.1, s1 = vx - 0.03, t1s = bz1 - 0.02, t0s = t1s - 0.3, pale = M.wood('#c9a66b', 0.3, 5);
    for (const [x, z] of [[s0, t0s], [s1 - 0.03, t0s], [s0, t1s - 0.03], [s1 - 0.03, t1s - 0.03]]) b.box(pale, x, G1, z, x + 0.03, G1 + 1.5, z + 0.03, {});
    for (let i = 0; i < 5; i++) b.box(pale, s0, G1 + 0.1 + i * 0.34, t0s, s1, G1 + 0.12 + i * 0.34, t1s, { cast: false });
    b.solid(s0, G1, t0s, s1, G1 + 1.5, t1s); }

  /* THE DESK'S WALL, on the left as one comes in: from its cased end in the bay to the room's south-west corner, where the
     office's door is — a black front and ledge chest-high, notched down where one signs; the office behind */
  const dA = x0 + D.door[0], dB = x0 + D.door[1], oA = x0 + D.open[0], oB = x0 + D.open[1], lA = x0 + D.low[0], lB = x0 + D.low[1];
  band(putX, zp, zo, x0, xP, 0, H1, [{ a: dA, b: dB, y0: 0, y1: G1 + D.doorH }, { a: oA, b: oB, y0: G1 + D.sill, y1: G1 + D.head }], cream, paint);
  b.box(paint, xE, H1, zp, xP, HB, zo, { cast: false });
  b.push(dA, G1, zp + 0.05, 0); doorLeaf(b, dB - dA, D.doorH, white, { rows: [[0.12, 0.76], [0.86, 1.62], [1.72, 2.03]], cols: 2, handle: 'lever' }); b.pop();      // white, six panels, shut; its lever on the east edge
  for (const [a0, a1, y0, y1] of [[Math.max(x0, dA - 0.07), dA, G1, G1 + D.doorH + 0.07], [dB, dB + 0.07, G1, G1 + D.doorH + 0.07], [Math.max(x0, dA - 0.07), dB + 0.07, G1 + D.doorH, G1 + D.doorH + 0.07]]) b.box(white, a0, y0, zp - 0.02, a1, y1, zp, { cast: false });
  b.solid(dA, G1, zp, dB, G1 + D.doorH, zo);
  for (const [a0, a1] of [[dB + 0.07, xP - 0.03]]) b.box(base, a0, G1, zp - 0.012, a1, G1 + 0.1, zp, { cast: false });      // the skirting
  for (const [a0, a1] of [[oA, lA], [lB, oB]]) { b.box(black, a0, G1 + D.sill, zp - 0.03, a1, G1 + D.ledge, zp + 0.3, {}); b.solid(a0, G1, zp - 0.03, a1, G1 + D.ledge, zp); }
  b.box(black, lA, G1 + D.sill, zp - 0.03, lB, G1 + D.lowTop, zp + 0.45, {}); b.solid(lA, G1, zp - 0.03, lB, G1 + D.lowTop, zp);
  b.box(black, oA, G1 + 0.72, zo, oB, G1 + 0.76, zo + 0.62, { cast: false });                    // the clerk's top
  for (const [x, y, z] of [[(lA + lB) / 2 - 0.16, G1 + D.lowTop, zp + 0.06], [oB - 0.55, G1 + D.ledge, zp + 0.06]]) {      // a small screen and a card reader
    b.box(black, x - 0.06, y, z + 0.02, x + 0.06, y + 0.02, z + 0.14, { cast: false }); b.rbox(M.plain('#3d4046', 0.35), x, y + 0.11, z + 0.08, 0.25, 0.17, 0.016, 0, { rx: -22, cast: false });
    b.rbox(M.plain('#3d4046', 0.35), x + 0.3, y + 0.07, z + 0.08, 0.085, 0.15, 0.045, 0, { rx: -18, cast: false });
  }
  // the office: its back wall red, a big framed picture of a door mat on it (drawn plainly, not the hotel's own); a dark
  // screen on its east wall; a low run of cabinets under a black top
  { const red = X.roomWall('#b2382c'), fw = 1.4, fh = 0.81, fx = x0 + 2.6, fy = G1 + 1.655;                      // the frame's place and size: read off the hotel's picture
    b.box(paint, x0, G1, zb - 0.012, oA + 0.6, H1, zb, { cast: false }); b.box(red, oA + 0.6, G1, zb - 0.012, xP, H1, zb, { cast: false });
    b.box(red, xP - 0.012, G1, zb - 0.6, xP, H1, zb, { cast: false }); b.box(paint, xP - 0.012, G1, bz1, xP, H1, zb - 0.6, { cast: false });
    b.box(black, fx - fw / 2, fy - fh / 2, zb - 0.045, fx + fw / 2, fy + fh / 2, zb - 0.012, { cast: false });
    const t = plateTex(420, 246, (g, W, H) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#a8763f'; g.fillRect(W * 0.14, H * 0.2, W * 0.72, H * 0.6); g.fillStyle = 'rgba(70,45,20,0.35)'; for (let y = H * 0.2; y < H * 0.8; y += 5) g.fillRect(W * 0.14, y, W * 0.72, 1.4); g.fillStyle = '#3a2c1e'; g.font = `700 ${Math.round(H * 0.27)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WELCOME', W / 2, H * 0.52); });
    b.quad(new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), '-z', fx, fy, zb - 0.047, fw - 0.1, fh - 0.1, { cast: false });
    b.box(black, xP - 0.05, G1 + 1.6, zo + 0.335, xP - 0.014, G1 + 2.275, zo + 1.54, { cast: false });                // a 55-inch screen: its size in the picture
    b.box(M.plain('#2f4638', 0.6), oA + 0.5, G1, zb - 0.5, xP - 0.014, G1 + 0.86, zb - 0.012, {}); b.box(black, oA + 0.48, G1 + 0.86, zb - 0.52, xP - 0.014, G1 + 0.9, zb - 0.012, { cast: false }); }
  /* the ceiling drops over the desk to the beam's level, lights in it; east of the beam it runs slantwise back to the wall's
     cased end. A white moulding where the walls meet the ceiling */
  const tube = ctx.lampMat('#fff6e6', 1.8, 0.95, 0.75), sA = oA - 0.05, zd = zp - D.drop;
  b.box(soff, sA, yBm - 0.004, zd, xB, H1, zo + 1.0, { cast: false }); b.box(soff, xB, yBm - 0.004, zo, xP, H1, zo + 1.0, { cast: false });
  { const wedge = (mat, y0, y1) => { const sh = new THREE.Shape(); sh.moveTo(xE, zp - D.clip); sh.lineTo(xP + 0.08, zp); sh.lineTo(xE, zp); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, y1, 0); b.geo(mat, g, { cast: false }); };
    wedge(paint, yBm, HB); wedge(soff, yBm - 0.005, yBm); }
  b.box(paint, sA, yBm, zd - 0.012, xB, H1, zd, { cast: false }); b.box(paint, sA - 0.012, yBm, zd, sA, H1, zp, { cast: false });           // its two faces to the room
  for (let i = 0; i < 3; i++) b.cyl(tube, sA + 0.5 + i * (xB - sA - 1.0) / 2, yBm - 0.014, zp - D.drop / 2, 0.085, 0.012, { seg: 14, cast: false });
  for (const [a0, c0, a1, c1] of [[x0, z0, xB, z0 + 0.05], [x0, z0, x0 + 0.05, zp], [x0, zp - 0.05, sA - 0.012, zp], [xB - 0.05, z0, xB, zd - 0.012], [sA - 0.012, zd - 0.062, xB, zd - 0.012], [sA - 0.062, zd - 0.062, sA - 0.012, zp]])
    b.box(white, a0, H1 - 0.07, c0, a1, H1, c1, { cast: false });
  for (const [x, z, ew, y] of [[xB - 0.63, z0 + 1.32, true, H1], [(oA + oB) / 2, zo + 1.35, true, H1], [(xE + vx) / 2, (e0 + e1) / 2, false, HB]]) b.box(tube, x - (ew ? 0.61 : 0.09), y - 0.07, z - (ew ? 0.16 : 0.45), x + (ew ? 0.61 : 0.09), y - 0.005, z + (ew ? 0.16 : 0.45), { cast: false });      // the room's one long fixture hangs by the beam (the hotel's picture)

  /* blinds: in the glass each side of the door, and at the window to Mariposa (with a white casing) */
  const slats = new THREE.MeshStandardMaterial({ map: plateTex(64, 256, (g, W, H) => { g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) { g.fillStyle = 'rgba(120,115,100,0.55)'; g.fillRect(0, y, W, 1.6); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, y + 1.6, W, 2); } g.fillStyle = 'rgba(90,90,80,0.5)'; for (const x of [W * 0.2, W * 0.8]) g.fillRect(x, 0, 1.2, H); }), roughness: 0.8, side: THREE.DoubleSide });
  for (const z of [sN + E.side / 2, sS + E.side / 2]) b.quad(slats, '-x', vx + 0.03, (sy0 + sy1) / 2, z, E.side - 0.03, sy1 - sy0 - 0.03, { cast: false });
  b.quad(slats, '+z', (wx0 + wx1) / 2, (win[0][0] + win[0][1]) / 2, z0 - 0.09, wx1 - wx0 - 0.04, win[0][1] - win[0][0] - 0.04, { cast: false });
  for (const [a0, a1, y0, y1] of [[wx0 - 0.08, wx0, win[0][0] - 0.08, win[0][1] + 0.08], [wx1, wx1 + 0.08, win[0][0] - 0.08, win[0][1] + 0.08], [wx0 - 0.08, wx1 + 0.08, win[0][1], win[0][1] + 0.08], [wx0 - 0.08, wx1 + 0.08, win[0][0] - 0.08, win[0][0]]]) b.box(white, a0, y0, z0, a1, y1, z0 + 0.02, { cast: false });

  /* THE BREAKFAST, by the way in, on the right — where he remembers it (24 Nov 2026): against the window wall where it
     begins past the beam, two steps from the door. What stood on it is in his own photograph of 19 Aug 2015 (07:10, on the
     table in his room): coffee in the hotel's paper cup, a packet of instant oatmeal, a wrapped muffin, a red apple */
  { const B = K.breakfast, bx0 = x0 + B.x[0], bx1 = x0 + B.x[1], c0 = z0 + 0.02, c1 = c0 + B.depth, y = G1 + B.h, zc = c0 + 0.27, espresso = M.wood('#3b2a20', 0.3, 7), wicker = M.plain('#8a6a43', 0.9);
    b.box(espresso, bx0, G1 + 0.08, c0, bx1, y - 0.04, c1 - 0.03, {}); b.box(black, bx0 - 0.02, y - 0.04, c0, bx1 + 0.02, y, c1, {}); b.box(black, bx0 + 0.04, G1, c0 + 0.04, bx1 - 0.04, G1 + 0.08, c1 - 0.08, { cast: false });
    b.solid(bx0, G1, c0, bx1, y, c1);
    // two pump pots of coffee at its far end, a drip tray before each
    [0.16, 0.4].forEach(d => { const x = bx0 + d; b.cyl(black, x, y, zc - 0.07, 0.085, 0.3, { seg: 16 }); b.cyl(black, x, y + 0.3, zc - 0.07, 0.07, 0.05, { seg: 14, r2: 0.045, cast: false }); b.box(black, x - 0.012, y + 0.33, zc - 0.07, x + 0.012, y + 0.355, zc + 0.06, { cast: false }); b.box(steel, x - 0.055, y, zc + 0.03, x + 0.055, y + 0.012, zc + 0.15, { cast: false }); });
    // paper cups upside down in two stacks (plain: the real ones carried the hotel's name)
    for (const [x, n] of [[bx0 + 0.6, 7], [bx0 + 0.7, 5]]) for (let i = 0; i < n; i++) b.cyl(white, x, y + i * 0.022, zc - 0.1, 0.04, 0.095, { seg: 12, r2: 0.03, cast: false });
    // nearest the door: a basket of red apples, a basket of wrapped muffins, packets of oatmeal standing in a rack against the wall
    const ax = bx0 + 0.94, mx = bx0 + 1.27;
    b.cyl(wicker, ax, y, zc + 0.02, 0.12, 0.085, { seg: 16, r2: 0.155 });
    [[0, 0], [0.07, 0.02], [-0.065, 0.03], [0.02, -0.07], [-0.045, -0.055], [0.06, -0.05], [0.0, 0.072]].forEach(([ox, oz], i) => b.sphere(M.plain(i % 3 ? '#a3201c' : '#7d1719', 0.35), ax + ox, y + 0.105 + (i === 0 ? 0.045 : 0), zc + 0.02 + oz, 0.038, { seg: 10, cast: false }));
    b.cyl(wicker, mx, y, zc + 0.02, 0.12, 0.085, { seg: 16, r2: 0.155 });
    [[0, 0], [0.07, 0.03], [-0.07, 0.02], [0.012, -0.072], [-0.02, 0.076]].forEach(([ox, oz], i) => { const x = mx + ox, z = zc + 0.02 + oz, yy = y + 0.075 + (i === 0 ? 0.045 : 0); b.cyl(M.plain('#e9e2d2', 0.8), x, yy, z, 0.027, 0.035, { seg: 10, r2: 0.036, cast: false }); b.sphere(M.plain('#8f5f36', 0.9), x, yy + 0.042, z, 0.04, { seg: 10, sy: 0.62, cast: false }); });
    b.box(black, bx0 + 0.82, y, c0 + 0.03, bx0 + 1.42, y + 0.02, c0 + 0.12, { cast: false });
    ['#8a5a2b', '#5f7d3a', '#a8442c', '#c8a23a', '#8a5a2b', '#5f7d3a'].forEach((c, i) => b.rbox(M.plain(c, 0.7), bx0 + 0.87 + i * 0.1, y + 0.085, c0 + 0.075, 0.085, 0.13, 0.03, 0, { rx: 12, cast: false }));
    plate(b, 'Breakfast\n6:00 – 9:30', bx0 + 0.65, y + 0.07, c1 - 0.07, 0.2, 0.13, '+z', '#f4f1e8', '#3a3a3a', { size: 0.6, font: 'Arial, sans-serif' });
    b.box(white, bx0 + 0.55, y, c1 - 0.1, bx0 + 0.75, y + 0.006, c1 - 0.045, { cast: false });
    ctx.hot.push({ id: 'breakfast', pos: [bx0 + 1.05, y + 0.42, zc], r: 0.2 });
    // under the window beyond it, where the long coffee counter is today: two armchairs (a guess)
    const gold = M.plain('#b78a2d', 0.85);
    for (const x of [wx0 + 0.05, wx0 + 0.78]) { b.box(gold, x, G1 + 0.16, c0, x + 0.62, G1 + 0.44, c0 + 0.62, {}); b.box(gold, x, G1 + 0.44, c0, x + 0.62, G1 + 0.86, c0 + 0.14, {}); for (const ox of [0, 0.54]) b.box(gold, x + ox, G1 + 0.44, c0 + 0.14, x + ox + 0.08, G1 + 0.6, c0 + 0.6, { cast: false }); for (const [ox, oz] of [[0.03, 0.03], [0.55, 0.03], [0.03, 0.55], [0.55, 0.55]]) b.box(espresso, x + ox, G1, c0 + oz, x + ox + 0.04, G1 + 0.16, c0 + oz + 0.04, { cast: false }); b.solid(x, G1, c0, x + 0.62, G1 + 0.86, c0 + 0.62); }
  }
  ctx.hot.push({ id: 'desk', pos: [(lA + lB) / 2, G1 + 1.5, zp - 0.03], r: 0.2 });
  flat(x0, z0, xB, zp, G1); flat(xB, bz0, xE, zp, G1); flat(xE, bz0, vx, zp, G1); flat(xP + 0.08, zp, vx, bz1, G1); flat(vx, e0, dx + 0.05, e1, G1); flat(xW - 0.05, zk0, x0, zk1, G1);

  /* THE PORCH before the door, a metre deep: two stubby terracotta columns with white caps and a flat arch between them to
     the drive; a narrow round arch in its north side, through which the door shows from Mariposa; a low tiled roof over it
     and the bay, leaning on the block. On the door wall south of the glass, the night boxes */
  b.box(m.walk, dx, 0, pz0, px, G1, pz1, { uv: [1.5, 1.5], uvw: true, cast: false }); flat(dx, pz0 + 0.3, px, pz1 - 0.1, G1);
  for (const za of [pz0, pz1 - pd]) {
    b.box(m.col, px - pw, 0, za, px, Po.cap[0], za + pd, { ...U, solid: true });
    b.box(m.trim, px - pw - 0.04, Po.cap[0], za - 0.04, px + 0.04, Po.cap[0] + 0.28, za + pd + 0.04, { cast: false }); b.box(m.trim, px - pw - 0.1, Po.cap[0] + 0.28, za - 0.1, px + 0.1, Po.cap[1], za + pd + 0.1, { cast: false });
    b.box(m.towerLo, px - pw + 0.04, Po.cap[1], za + 0.04, px - 0.04, Po.eave, za + pd - 0.04, U);
  }
  b.box(m.towerLo, px - pw + 0.04, Po.arch[1], pz0, px - 0.04, Po.eave, pz1, U);
  spandrel(b, m.towerLo, 'z', pz0 + pd - 0.04, pz1 - pd + 0.04, Po.arch[0], Po.arch[1], Po.arch[1] + 0.002, px - pw + 0.04, px - 0.04);
  spandrel(b, m.towerLo, 'x', dx, px - pw + 0.04, Po.side[1] - Po.side[0] / 2, Po.side[1], Po.eave, pz0 + 0.02, pz0 + 0.3);                 // its north side: the arch
  { const zz = sS + E.side; for (const [y0, y1, a0, a1] of [[G1 + 0.95, G1 + 1.5, zz + 0.55, zz + 0.95], [G1 + 1.05, G1 + 1.4, zz + 1.05, zz + 1.3]]) b.box(M.plain('#c9c7c0', 0.5, 0.3), dx, y0, a0, dx + 0.06, y1, a1, { cast: false }); }      // the night boxes
  b.box(m.soffit, xE, Po.eave - 0.2, pz0 - 0.3, px, Po.eave - 0.16, pz1, { cast: false });
  b.box(m.trim, xE, Po.eave - 0.14, pz0 - 0.33, px + 0.33, Po.eave + 0.06, pz0 - 0.27, { cast: false }); b.box(m.trim, px + 0.27, Po.eave - 0.14, pz0 - 0.33, px + 0.33, Po.eave + 0.06, pz1, { cast: false });
  hipRoof(b, m.roof2, 2 * xE - (px + 0.3), pz0 - 0.3, px + 0.3, pz1 + 0.05, Po.eave + 0.04, 0.36, m.ridge);
  plate(b, 'Lobby', px - 0.03, Po.arch[1] + 0.62, pz1 - 1.15, 0.8, 0.3, '+x', '#4a4640', '#f4f1e8');
  plate(b, '1910', px - 0.03, Po.arch[1] + 0.62, pz0 + 1.45, 0.95, 0.36, '+x', '#4a4640', '#f4f1e8', { font: 'Arial, sans-serif' });
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
  { const [, z0, x1, z1] = K.yard;
    b.box(m.wall2, x1 - 0.15, 0, z0, x1, 1.3, z1, { ...U, solid: true }); b.box(m.wall2, xE, 0, z0, x1, 1.3, z0 + 0.15, { ...U, solid: true }); b.box(m.wall2, xE, 0, z1 - 0.15, x1, 1.3, z1, { ...U, solid: true });
    for (let i = 0; i < 3; i++) { const z = z0 + 0.9 + i * 1.35; b.box(M.plain('#b9bcbb', 0.5, 0.4), xE + 0.5, 0, z - 0.45, xE + 1.4, 0.95, z + 0.45, {}); b.cyl(M.plain('#3a3d3e', 0.5, 0.5), xE + 0.95, 0.95, z, 0.34, 0.03, { seg: 14, cast: false }); } }
  ctx.lobby = { door: [dx, G1 + 1.2, (e0 + e1) / 2], lamp: [(x0 + xB) / 2, H1 - 0.3, (z0 + zp) / 2] };
  ctx.hot.push({ id: 'lobby', pos: [px + 0.05, Po.arch[1] + 0.2, (pz0 + pz1) / 2 - 0.6], r: 0.26 });
}
