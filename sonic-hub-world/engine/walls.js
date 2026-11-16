/* Walls and what goes in them: a wall with openings, the lining of a doorway, window frames, bars, door leaves.
   Every place is built from these, in its own plan's numbers. Along a wall, `a` runs along it and `c` across it:
   axis 'x' is a wall running east–west (c is z), axis 'z' one running north–south (c is x). */
import * as THREE from 'three';
import { M } from './tex.js';

/** a box in wall coordinates: a runs along the wall, c across it */
export const along = (b, axis) => (mat, a0, y0, c0, a1, y1, c1, o) => (axis === 'x' ? b.box(mat, a0, y0, c0, a1, y1, c1, o) : b.box(mat, c0, y0, a0, c1, y1, a1, o));

/** How a material lies on a wall of a storey H metres high: paint (a 64-pixel strip shaded from floor to ceiling) once
 *  over the height, anything else every two metres. */
export const uvFor = H => m => (m.map && m.map.image && m.map.image.width === 64 ? { uv: [1, H], uvw: true } : { uv: [2, 2], uvw: true });

/** The wall-maker of a storey H metres high (paint is shaded once from floor to ceiling, so it needs to know).
 *  wall(b, axis, c0, c1, a0, a1, openings, m0, m1 = m0, top = H): axis 'x' — m0 faces north, m1 south; axis 'z' — m0 west,
 *  m1 east. An opening is { a, b, y1, y0? } along the wall. */
export function makeWall(H) {
  const uvOf = uvFor(H);
  return function wall(b, axis, c0, c1, a0, a1, ops, m0, m1 = m0, top = H) {
    const put = along(b, axis), mid = (c0 + c1) / 2;
    const halves = m0 === m1 ? [[c0, c1, m0]] : [[c0, mid, m0], [mid, c1, m1]];
    const list = [...ops].sort((p, q) => p.a - q.a);
    for (const [k0, k1, m] of halves) {
      const o = { ...uvOf(m), solid: true };
      const piece = (p0, p1, y0, y1) => { if (p1 - p0 > 1e-4 && y1 - y0 > 1e-4) put(m, p0, y0, k0, p1, y1, k1, o); };
      let cur = a0;
      for (const op of list) { piece(cur, op.a, 0, top); piece(op.a, op.b, 0, op.y0 ?? 0); piece(op.a, op.b, op.y1, top); cur = op.b; }
      piece(cur, a1, 0, top);
    }
  };
}

/** the wooden lining of a doorway (two jambs and a head), a little proud of the wall on both sides */
export function casing(b, axis, a, bb, y1, c0, c1, mat, t = 0.05, proud = 0.018, w = 0.07) {
  const put = along(b, axis);
  put(mat, a, 0, c0, a + t, y1, c1, { grain: 'y', uv: [1, 1] });
  put(mat, bb - t, 0, c0, bb, y1, c1, { grain: 'y', uv: [1, 1] });
  put(mat, a, y1 - t, c0, bb, y1, c1, { uv: [1, 1] });
  for (const [k0, k1] of [[c0 - proud, c0], [c1, c1 + proud]]) {      // the architrave on each face
    put(mat, a - w + t, 0, k0, a + t, y1 + w - t, k1, { grain: 'y', uv: [1, 1] });
    put(mat, bb - t, 0, k0, bb + w - t, y1 + w - t, k1, { grain: 'y', uv: [1, 1] });
    put(mat, a - w + t, y1 - t, k0, bb + w - t, y1 + w - t, k1, { uv: [1, 1] });
  }
}

/** horizontal flat bars across an opening (the way every window here is barred), with uprights */
export function bars(b, axis, a0, a1, y0, y1, c, mat, step = 0.145, th = 0.026, dp = 0.012, ups = 0.75) {
  const put = along(b, axis);
  for (let y = y0 + step * 0.6; y < y1 - 0.02; y += step) put(mat, a0, y, c - dp / 2, a1, y + th, c + dp / 2, {});
  const n = Math.max(1, Math.round((a1 - a0) / ups));
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; put(mat, a - 0.012, y0, c - dp, a + 0.012, y1, c + dp, {}); }
}

/** a window: frame, mullions, glass; opts: mull (count), trans (height of a transom bar) */
export function windowFrame(b, axis, a0, a1, y0, y1, c, o = {}) {
  const put = along(b, axis), fm = o.mat ?? M.steelWhite(), t = o.t ?? 0.05, d = o.d ?? 0.07;
  put(fm, a0, y0, c - d / 2, a1, y0 + t, c + d / 2, {}); put(fm, a0, y1 - t, c - d / 2, a1, y1, c + d / 2, {});
  put(fm, a0, y0, c - d / 2, a0 + t, y1, c + d / 2, {}); put(fm, a1 - t, y0, c - d / 2, a1, y1, c + d / 2, {});
  const n = o.mull ?? 1;
  for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / (n + 1); put(fm, a - t / 2, y0, c - d / 2, a + t / 2, y1, c + d / 2, {}); }
  if (o.trans) put(fm, a0, o.trans - t / 2, c - d / 2, a1, o.trans + t / 2, c + d / 2, {});
  if (o.glass !== false) put(M.glass(), a0 + t, y0 + t, c - 0.004, a1 - t, y1 - t, c + 0.004, { cast: false });
}

/** A panelled door leaf in its own frame: hinge on the origin, the leaf runs along +x, 4 cm thick. */
export function doorLeaf(b, w, h, mat, o = {}) {
  b.box(mat, 0, 0.012, -0.02, w, h, 0.02, { grain: 'y', uv: [1, 1] });
  const rows = o.rows ?? [[0.14, 0.86], [1.0, h - 0.14]], cols = o.cols ?? 1, m = 0.11;
  for (const [y0, y1] of rows) for (let c = 0; c < cols; c++) {
    const x0 = m + (w - 2 * m + 0.05) * c / cols, x1 = m + (w - 2 * m + 0.05) * (c + 1) / cols - 0.05;
    for (const s of [-1, 1]) {
      b.box(mat, x0, y0, s * 0.02, x1, y1, s * 0.03, { grain: 'y', uv: [1, 1], cast: false });
      b.box(mat, x0 + 0.035, y0 + 0.035, s * 0.03, x1 - 0.035, y1 - 0.035, s * 0.036, { grain: 'y', uv: [1, 1], cast: false });
    }
  }
  const ch = M.chrome();
  if (o.handle === 'lever') {
    for (const s of [-1, 1]) { b.box(ch, w - 0.085, 0.86, s * 0.02, w - 0.045, 1.12, s * 0.028, { cast: false }); b.box(ch, w - 0.19, 1.02, s * 0.03, w - 0.055, 1.04, s * 0.05, { cast: false }); }
  } else if (o.handle !== 'none') {
    for (const s of [-1, 1]) { b.cyl(ch, w - 0.065, 0, 0, 0.012, 0.045, { rx: 90 * s, seg: 8, cast: false }); b.geo(ch, new THREE.SphereGeometry(0.03, 10, 8).translate(w - 0.065, 1.0, s * 0.06), { cast: false }); }
  }
  return b;
}
/** A glazed, barred leaf (balcony and loggia doors): hinge on the origin, along +x. */
export function glazedLeaf(b, w, h, o = {}) {
  const fm = o.mat ?? M.steelWhite(), t = 0.045;
  b.box(fm, 0, 0.02, -0.02, t, h, 0.02); b.box(fm, w - t, 0.02, -0.02, w, h, 0.02);
  b.box(fm, 0, 0.02, -0.02, w, 0.02 + t * 1.6, 0.02); b.box(fm, 0, h - t, -0.02, w, h, 0.02);
  b.box(M.glass(), t, 0.02 + t * 1.6, -0.003, w - t, h - t, 0.003, { cast: false });
  if (o.bars !== false) for (let y = 0.2; y < h - 0.08; y += 0.145) b.box(fm, t, y, -0.008, w - t, y + 0.024, 0.008);
}
