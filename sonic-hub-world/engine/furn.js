/* Furniture of a Hà Nội home of the 2000s (first made for flat 507), each piece built in its own frame: the origin is its back-left foot, x runs
   along its width, z comes out from the wall it stands against, and it faces +z. The room files set pieces down
   with N / S / W / E (the wall they stand on). */
import * as THREE from 'three';
import { M, canvasTex, plateTex, shade, rng, laceTex } from './tex.js';

export const C = {
  mahog: '#4c1712', sofa: '#6b2a17', cherry: '#b45f27', shelf: '#a95c29', light: '#c9a162', desk: '#813d21', bedred: '#7a3520',
  white: '#f1efe9', black: '#18181b', cream: '#e4dcc6', steel: '#c9cdd0',
};
export const wood = (c, g = 0.6, s = 1) => M.wood(c, g, s);

/** set a piece against a wall: the back of the piece on the wall, (x, z) where its left end starts */
export const N = (b, x, z, y = 0) => b.push(x, y, z, 0);       // on the north wall, x = its west end
export const S = (b, x, z, y = 0) => b.push(x, y, z, 180);     // on the south wall, x = its east end
export const W = (b, x, z, y = 0) => b.push(x, y, z, 270);     // on the west wall, z = its south end
export const E = (b, x, z, y = 0) => b.push(x, y, z, 90);      // on the east wall, z = its north end

const G = { grain: 'y', uv: [1, 1] }, U = { uv: [1, 1] };

/* ── cases ───────────────────────────────────────────────────────────── */
export function wardrobe(b, w, h, d, n, o = {}) {
  const m = o.mat ?? wood(C.mahog, 0.85);
  b.box(m, 0, 0.06, 0, w, h, d - 0.022, { ...G, solid: true });
  b.box(m, 0.02, 0, 0.02, w - 0.02, 0.06, d - 0.05, U);
  if (o.cornice !== false) b.box(m, -0.02, h, -0.005, w + 0.02, h + 0.045, d + 0.012, U);
  const dw = w / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * dw + 0.008, x1 = (i + 1) * dw - 0.008;
    b.box(m, x0, 0.09, d - 0.022, x1, h - 0.03, d, { ...G, cast: false });
    for (const [y0, y1] of (o.panels ?? [[0.2, 0.74], [0.86, h - 0.16]])) {
      b.box(m, x0 + 0.06, y0, d, x1 - 0.06, y1, d + 0.007, { ...G, cast: false });
      b.box(m, x0 + 0.095, y0 + 0.035, d + 0.007, x1 - 0.095, y1 - 0.035, d + 0.012, { ...G, cast: false });
    }
    if (o.handle !== 'none') { const hx = (i % 2 === 0) === !o.flip ? x1 - 0.05 : x0 + 0.032; b.box(M.chrome(), hx, 0.98, d + 0.012, hx + 0.016, 1.26, d + 0.034, { cast: false }); }
  }
}
/** open shelves with their books. rows: shelf heights (bottoms of each cell); kinds: book kind per row */
export function bookshelf(b, w, h, d, rows, o = {}) {
  const m = o.mat ?? wood(C.shelf, 0.45), t = 0.024, cols = o.cols ?? Math.max(1, Math.round(w / 0.85));
  b.box(m, 0, 0, 0, t, h, d, G); b.box(m, w - t, 0, 0, w, h, d, G); b.box(m, 0, 0, 0, w, h, 0.012, G);
  for (let c = 1; c < cols; c++) { const x = w * c / cols; b.box(m, x - t / 2, 0, 0, x + t / 2, h, d, G); }
  const R = rng(o.seed ?? 7);
  for (let r = 0; r < rows.length; r++) {
    const y = rows[r], top = r + 1 < rows.length ? rows[r + 1] : h;
    b.box(m, 0, y, 0, w, y + t, d, U);
    for (let c = 0; c < cols; c++) {
      const x0 = w * c / cols + t / 2 + 0.006, x1 = w * (c + 1) / cols - t / 2 - 0.006, fill = o.fill ? o.fill(r, c) : 1;
      if (fill <= 0) continue;
      const bh = (top - y - t) * (0.8 + R() * 0.12), kind = o.kinds ? o.kinds[r % o.kinds.length] : 'mixed';
      b.box(M.books(1 + ((R() * 6) | 0), kind), x0, y + t, 0.03, x0 + (x1 - x0) * fill, y + t + bh, d - 0.025 - R() * 0.03, { uv: [1.1, bh], cast: false });
    }
  }
  b.box(m, 0, h - t, 0, w, h, d, U);
  if (o.solid !== false) b.solid(0, 0, 0, w, h, d);
}
/** a low cabinet: body, top, door lines, handles */
export function cabinet(b, w, h, d, n, o = {}) {
  const m = o.mat ?? wood(C.mahog, 0.8);
  b.box(m, 0, o.plinth ?? 0.07, 0, w, h, d - 0.02, { ...G, solid: o.solid !== false });
  if ((o.plinth ?? 0.07) > 0) b.box(m, 0.02, 0, 0.02, w - 0.02, o.plinth ?? 0.07, d - 0.06, U);
  const dw = w / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * dw + 0.008, x1 = (i + 1) * dw - 0.008, y0 = (o.plinth ?? 0.07) + 0.02, y1 = h - 0.025;
    if (o.louvre) {
      b.box(m, x0, y0, d - 0.02, x0 + 0.04, y1, d, { ...G, cast: false }); b.box(m, x1 - 0.04, y0, d - 0.02, x1, y1, d, { ...G, cast: false });
      b.box(m, x0, y0, d - 0.02, x1, y0 + 0.04, d, { ...U, cast: false }); b.box(m, x0, y1 - 0.04, d - 0.02, x1, y1, d, { ...U, cast: false });
      for (let y = y0 + 0.055; y < y1 - 0.05; y += 0.042) b.rbox(m, (x0 + x1) / 2, y, d - 0.012, x1 - x0 - 0.08, 0.008, 0.03, 0, { rx: -32, cast: false });
      b.box(M.plain('#1c0c0a', 1), x0 + 0.04, y0 + 0.04, d - 0.024, x1 - 0.04, y1 - 0.04, d - 0.02, { cast: false });
    } else {
      b.box(m, x0, y0, d - 0.02, x1, y1, d, { ...G, cast: false });
      if (o.panel !== false) b.box(m, x0 + 0.05, y0 + 0.05, d, x1 - 0.05, y1 - 0.05, d + 0.007, { ...G, cast: false });
    }
    if (o.handle !== 'none') { const hx = (i % 2 === 0) ? x1 - 0.045 : x0 + 0.03; b.box(M.chrome(), hx, h * 0.55, d + 0.005, hx + 0.014, h * 0.55 + 0.11, d + 0.026, { cast: false }); }
  }
}
/** a bank of drawers on the front of something (x0…x1, y0…y1 at depth z) */
export function drawers(b, m, x0, x1, y0, y1, z, n, o = {}) {
  const dh = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    b.box(m, x0, y0 + i * dh + 0.006, z - 0.015, x1, y0 + (i + 1) * dh - 0.006, z, { ...U, cast: false });
    const cx = (x0 + x1) / 2, cy = y0 + (i + 0.5) * dh;
    b.box(M.chrome(), cx - (o.hw ?? 0.06), cy - 0.008, z, cx + (o.hw ?? 0.06), cy + 0.008, z + 0.02, { cast: false });
  }
}

/* ── seats, tables, beds ─────────────────────────────────────────────── */
export function chair(b, o = {}) {
  const m = o.mat ?? wood(C.mahog, 0.6), w = o.w ?? 0.42, d = o.d ?? 0.42, sh = o.seat ?? 0.45, bh = o.back ?? 0.96, l = 0.038;
  for (const x of [0, w - l]) { b.box(m, x, 0, 0, x + l, bh, l, G); b.box(m, x, 0, d - l, x + l, sh, d, G); b.box(m, x + 0.008, 0.14, l, x + l - 0.008, 0.17, d - l, U); }
  b.box(m, 0, sh - 0.035, 0, w, sh, d, U);
  b.box(m, 0, bh - 0.07, 0.002, w, bh, l * 0.75, U); b.box(m, l, sh + 0.2, 0.006, w - l, sh + 0.235, l * 0.65, U);
  const n = o.slats ?? 4;
  for (let i = 0; i < n; i++) { const x = l + (w - 2 * l) * (i + 0.5) / n; b.box(m, x - 0.013, sh + 0.235, 0.008, x + 0.013, bh - 0.07, 0.026, G); }
  if (o.cushion) b.box(o.cushion, 0.02, sh, 0.03, w - 0.02, sh + 0.04, d - 0.01, { uv: [0.3, 0.3] });
  b.solid(0, 0, 0, w, sh, d);
}
export function stool(b, o = {}) {
  const m = o.mat ?? wood(C.mahog, 0.7), w = o.w ?? 0.3, h = o.h ?? 0.42, l = 0.035;
  for (const [x, z] of [[0, 0], [w - l, 0], [0, w - l], [w - l, w - l]]) b.box(m, x, 0, z, x + l, h - 0.03, z + l, G);
  b.box(m, -0.01, h - 0.035, -0.01, w + 0.01, h, w + 0.01, U); b.box(m, l, 0.12, l * 0.3, w - l, 0.15, l * 0.8, U); b.box(m, l, 0.12, w - l * 0.8, w - l, 0.15, w - l * 0.3, U);
  b.solid(0, 0, 0, w, h, w);
}
/** a table: top on four legs, a rail under the top; o.glass adds a sheet of glass over it */
export function table(b, w, h, d, o = {}) {
  const m = o.mat ?? wood(C.mahog, 0.7), l = o.leg ?? 0.05, t = o.top ?? 0.035, ins = o.inset ?? 0.02;
  for (const [x, z] of [[ins, ins], [w - l - ins, ins], [ins, d - l - ins], [w - l - ins, d - l - ins]]) b.box(m, x, 0, z, x + l, h - t, z + l, G);
  b.box(m, ins + l, h - t - 0.07, ins + 0.01, w - ins - l, h - t, ins + 0.03, U); b.box(m, ins + l, h - t - 0.07, d - ins - 0.03, w - ins - l, h - t, d - ins - 0.01, U);
  b.box(m, ins + 0.01, h - t - 0.07, ins + l, ins + 0.03, h - t, d - ins - l, U); b.box(m, w - ins - 0.03, h - t - 0.07, ins + l, w - ins - 0.01, h - t, d - ins - l, U);
  b.box(o.topMat ?? m, 0, h - t, 0, w, h, d, U);
  if (o.glass) b.box(M.glass('#cfe6df', 0.28), 0.005, h, 0.005, w - 0.005, h + 0.008, d - 0.005, { cast: false });
  if (o.shelf) b.box(m, ins + 0.02, o.shelf, ins + 0.02, w - ins - 0.02, o.shelf + 0.02, d - ins - 0.02, U);
  if (o.solid !== false) b.solid(0, 0, 0, w, h, d);
}
/** a desk with a pedestal of drawers on one side */
export function desk(b, w, h, d, o = {}) {
  const m = o.mat ?? wood(C.desk, 0.6), t = 0.03, pw = o.ped ?? 0.36;
  b.box(m, 0, h - t, 0, w, h, d, U);
  b.box(m, 0, 0, 0.02, 0.025, h - t, d - 0.02, G);
  const px = o.pedLeft ? 0.025 : w - pw;
  b.box(m, px, 0.05, 0.03, px + pw - (o.pedLeft ? 0 : 0.0), h - t, d - 0.03, G);
  b.box(m, 0.025, 0.25, 0.02, w - 0.02, h - t, 0.04, U);                        // modesty board
  if (o.drawers !== false) drawers(b, m, px + 0.015, px + pw - 0.015, 0.1, h - t - 0.02, d - 0.015, o.nd ?? 3, { hw: 0.05 });
  if (o.solid !== false) b.solid(0, 0, 0, w, h, d);
}
/** a bed: head on the wall (z = 0), foot toward the room */
export function bed(b, w, l, o = {}) {
  const m = o.frame ?? wood(C.mahog, 0.7), fh = o.fh ?? 0.3, mh = o.mh ?? 0.17;
  b.box(m, 0, 0.1, 0, w, fh, l, { ...U, solid: true });
  for (const [x, z] of [[0, 0], [w - 0.07, 0], [0, l - 0.07], [w - 0.07, l - 0.07]]) b.box(m, x, 0, z, x + 0.07, 0.1, z + 0.07, G);
  if (o.head) { b.box(m, 0, 0, -0.045, w, o.head, 0, U); if (o.headSlats) for (let i = 0; i < o.headSlats; i++) b.box(m, 0.03, fh + 0.06 + i * 0.12, 0, w - 0.03, fh + 0.14 + i * 0.12, 0.012, { ...U, cast: false }); }
  if (o.foot) b.box(m, 0, 0, l, w, o.foot, l + 0.04, U);
  b.box(o.sheet, 0.015, fh, 0.015, w - 0.015, fh + mh, l - 0.015, { uv: o.sheetUV ?? [0.9, 0.9] });
  b.box(o.sheet, 0.01, fh + mh * 0.25, 0.01, w - 0.01, fh + mh * 0.8, l - 0.01, { uv: o.sheetUV ?? [0.9, 0.9], cast: false });
}
export const pillow = (b, mat, x, y, z, w = 0.55, d = 0.36, h = 0.13, ry = 0) => { b.push(x, y, z, ry); b.sphere(mat, 0, h / 2, 0, 0.5, { sx: w, sy: h, sz: d, seg: 14 }); b.pop(); };
/** a folded quilt: two rounded slabs */
export function quiltRoll(b, mat, x, y, z, w, d, h, ry = 0) {
  b.push(x, y, z, ry);
  b.cyl(mat, 0, h * 0.5, 0, h * 0.5, w, { rz: 90, seg: 12 }); b.box(mat, -w, 0, -d * 0.45, 0, h * 0.86, d * 0.2, { uv: [0.5, 0.5] });
  b.cyl(mat, 0, h * 0.42, -d * 0.45, h * 0.42, w, { rz: 90, seg: 12 });
  b.pop();
}

/* ── the carved sofa set: seats with a fretwork back ─────────────────── */
function fret(b, m, x0, y0, x1, y1, z) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, o = { t2: 0.018 };
  const bar = (ax, ay, bx, by) => b.bar(m, ax, ay, z, bx, by, z, 0.022, o);
  bar(x0, y0, x1, y1); bar(x0, y1, x1, y0);
  const dx = (x1 - x0) * 0.3, dy = (y1 - y0) * 0.46;
  bar(cx - dx, cy, cx, cy + dy); bar(cx, cy + dy, cx + dx, cy); bar(cx + dx, cy, cx, cy - dy); bar(cx, cy - dy, cx - dx, cy);
  bar(x0, cy, cx - dx, cy); bar(cx + dx, cy, x1, cy);
}
export function carvedSeat(b, w, o = {}) {
  const m = wood(C.sofa, 0.8), d = o.d ?? 0.62, sh = 0.39, ah = 0.62, bh = 1.0, l = 0.058;
  for (const x of [0, w - l]) {
    b.box(m, x, 0, 0, x + l, bh, l, G); b.box(m, x, 0, d - l, x + l, ah, d, G);
    b.box(m, x - 0.004, ah - 0.045, 0, x + l + 0.004, ah, d + 0.01, U); b.box(m, x + 0.012, 0.13, l, x + l - 0.012, 0.17, d - l, U);
    b.box(m, x + 0.012, sh + 0.02, l, x + l - 0.012, sh + 0.05, d - l, U);
  }
  b.box(m, l, sh - 0.085, 0.01, w - l, sh - 0.03, 0.045, U); b.box(m, l, sh - 0.085, d - 0.05, w - l, sh - 0.03, d - 0.012, U);
  b.box(m, l - 0.002, sh - 0.03, 0.01, w - l + 0.002, sh, d - 0.004, U);
  b.box(m, 0, bh - 0.065, 0.002, w, bh, 0.048, U); b.box(m, l, sh + 0.09, 0.008, w - l, sh + 0.13, 0.04, U);
  const np = o.panels ?? Math.max(1, Math.round((w - 2 * l) / 0.6)), pw = (w - 2 * l) / np;
  for (let i = 0; i < np; i++) {
    const x0 = l + i * pw, x1 = x0 + pw;
    fret(b, m, x0 + 0.012, sh + 0.13, x1 - 0.012, bh - 0.065, 0.024);
    if (i) b.box(m, x0 - 0.014, sh + 0.09, 0.008, x0 + 0.014, bh - 0.065, 0.04, G);
  }
  b.solid(0, 0, 0, w, sh, d);
}
/** the tea table: glass over a fretwork, a slatted shelf below */
export function teaTable(b, w, d) {
  const m = wood(C.sofa, 0.8), h = 0.47, l = 0.055;
  for (const [x, z] of [[0, 0], [w - l, 0], [0, d - l], [w - l, d - l]]) b.box(m, x, 0, z, x + l, h, z + l, G);
  for (const z of [0, d - 0.045]) b.box(m, l, h - 0.075, z + 0.005, w - l, h - 0.01, z + 0.04, U);
  for (const x of [0, w - 0.045]) b.box(m, x + 0.005, h - 0.075, l, x + 0.04, h - 0.01, d - l, U);
  b.push(0, h - 0.03, 0, 0);
  const frets = 2, pw = (w - 0.12) / frets;
  for (let i = 0; i < frets; i++) {            // the fretwork lies flat under the glass
    const x0 = 0.06 + i * pw, x1 = x0 + pw, z0 = 0.06, z1 = d - 0.06, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const bar = (ax, az, bx, bz) => b.bar(m, ax, 0, az, bx, 0, bz, 0.02, { t2: 0.015, cast: false });
    bar(x0, z0, x1, z1); bar(x0, z1, x1, z0); bar(cx - pw * 0.3, cz, cx, z1 - 0.02); bar(cx, z1 - 0.02, cx + pw * 0.3, cz); bar(cx + pw * 0.3, cz, cx, z0 + 0.02); bar(cx, z0 + 0.02, cx - pw * 0.3, cz);
  }
  b.pop();
  b.box(M.glass('#bfe0d6', 0.3), 0.012, h - 0.008, 0.012, w - 0.012, h + 0.004, d - 0.012, { cast: false });
  for (let x = 0.08; x < w - 0.1; x += 0.075) b.box(m, x, 0.15, 0.04, x + 0.045, 0.17, d - 0.04, { ...U, cast: false });
  b.box(m, 0.03, 0.12, 0.03, w - 0.03, 0.15, 0.06, U); b.box(m, 0.03, 0.12, d - 0.06, w - 0.03, 0.15, d - 0.03, U);
  b.solid(0, 0, 0, w, h, d);
}

/* ── fans and machines of the house ──────────────────────────────────── */
let bladeMat;
export function fanHead(b, r, o = {}) {
  const body = M.plain(o.color ?? '#e9e8e2', 0.45), cage = M.plain(o.cage ?? '#c9ccd0', 0.35, 0.7);
  bladeMat = bladeMat || new THREE.MeshStandardMaterial({ color: '#a9c8e6', roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  b.cyl(body, 0, 0, -0.14, 0.065, 0.15, { rx: 90, seg: 12 });
  for (const z of [0.0, 0.1]) b.geo(cage, new THREE.TorusGeometry(r, 0.006, 6, 28).translate(0, 0, z), { cast: false });
  b.geo(cage, new THREE.TorusGeometry(r * 0.28, 0.005, 6, 16).translate(0, 0, 0.125), { cast: false });
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a); b.bar(cage, cx * r * 0.28, sy * r * 0.28, 0.125, cx * r, sy * r, 0.1, 0.004, { cast: false }); b.bar(cage, cx * r, sy * r, 0.1, cx * r, sy * r, 0, 0.004, { cast: false }); }
  const blade = o.blade ? new THREE.MeshStandardMaterial({ color: o.blade, roughness: 0.4, side: THREE.DoubleSide }) : bladeMat;
  for (let i = 0; i < 3; i++) b.geo(blade, new THREE.CircleGeometry(r * 0.84, 8, i / 3 * 6.283, 1.25).translate(0, 0, 0.055), { cast: false });
  b.cyl(body, 0, 0, 0.02, 0.035, 0.06, { rx: 90, seg: 10 });
}
export function standFan(b, o = {}) {
  const c = o.color ?? '#e9e8e2', m = M.plain(c, 0.45), h = o.h ?? 1.2, r = o.r ?? 0.2;
  b.cyl(m, 0, 0, 0, 0.21, 0.035, { seg: 22, r2: 0.19 }); b.cyl(m, 0, 0.03, 0, 0.02, h - 0.12, { seg: 10 }); b.cyl(m, 0, h * 0.45, 0, 0.028, 0.14, { seg: 10 });
  b.push(0, h, 0.02, 0); b.push(0, 0, 0, 0); fanHead(b, r, o); b.pop(); b.pop();
  b.solid(-0.12, 0, -0.12, 0.12, 1, 0.12);
}
export function towerFan(b) {
  const m = M.plain('#eeeeea', 0.45);
  b.cyl(m, 0, 0, 0, 0.16, 0.03, { seg: 20 }); b.cyl(m, 0, 0.03, 0, 0.075, 0.95, { seg: 16, r2: 0.07 });
  for (let y = 0.14; y < 0.86; y += 0.03) b.box(M.plain('#9a9c9c', 0.6), -0.045, y, 0.066, 0.045, y + 0.012, 0.078, { cast: false });
  b.cyl(M.plain('#d9d9d4', 0.4), 0, 0.98, 0, 0.07, 0.04, { seg: 16 });
  b.solid(-0.1, 0, -0.1, 0.1, 1, 0.1);
}
export function airCooler(b) {
  const m = M.plain('#f0f0ec', 0.4);
  b.box(m, 0, 0.03, 0, 0.3, 0.86, 0.28, {}); b.box(M.plain('#2a2a2c', 0.4), 0.02, 0.76, 0.265, 0.28, 0.85, 0.285, { cast: false });
  for (let y = 0.1; y < 0.72; y += 0.045) b.box(M.plain('#8f9192', 0.6), 0.035, y, 0.28, 0.265, y + 0.02, 0.288, { cast: false });
  b.solid(0, 0, 0, 0.3, 0.86, 0.28);
}

/* ── small things ────────────────────────────────────────────────────── */
export const bottle = (b, c, x, y, z, r = 0.03, h = 0.2, cap) => { const m = M.plain(c, 0.35); b.cyl(m, x, y, z, r, h * 0.72, { seg: 10 }); b.cyl(m, x, y + h * 0.72, z, r, h * 0.16, { seg: 10, r2: r * 0.4 }); b.cyl(M.plain(cap ?? '#eeeeee', 0.4), x, y + h * 0.88, z, r * 0.42, h * 0.12, { seg: 8 }); };
export const jar = (b, c, x, y, z, r = 0.04, h = 0.1, lid = '#d94a3a') => { b.cyl(M.plain(c, 0.3), x, y, z, r, h, { seg: 12 }); b.cyl(M.plain(lid, 0.4), x, y + h, z, r * 1.03, h * 0.14, { seg: 12 }); };
export function vase(b, x, y, z, o = {}) {
  const m = M.plain(o.color ?? '#e9eef2', 0.25), h = o.h ?? 0.22, r = o.r ?? 0.05;
  b.cyl(m, x, y, z, r * 0.7, h * 0.5, { seg: 12, r2: r }); b.cyl(m, x, y + h * 0.5, z, r, h * 0.5, { seg: 12, r2: r * 0.55 });
  const R = rng(o.seed ?? 5), cols = o.flowers ?? ['#d8323a', '#f0c23c', '#e8556a', '#f28a2e'], leaf = M.plain('#3f7a3a', 0.8);
  const n = o.n ?? 9;
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283, rr = R() * (o.spread ?? 0.09), hh = h + (o.stem ?? 0.14) + R() * 0.1, fx = x + Math.cos(a) * rr, fz = z + Math.sin(a) * rr;
    b.bar(leaf, x, y + h * 0.9, z, fx, y + hh, fz, 0.006, { cast: false });
    b.sphere(M.plain(cols[i % cols.length], 0.7), fx, y + hh, fz, o.fr ?? 0.028, { seg: 8 });
    if (i % 2) b.sphere(leaf, (x + fx) / 2, y + (h + hh) / 2, (z + fz) / 2, 0.022, { sx: 1.6, sy: 0.4, seg: 6 });
  }
}
export function pot(b, x, y, z, o = {}) {
  const r = o.r ?? 0.07, h = o.h ?? 0.1, R = rng(o.seed ?? 3), leaf = M.plain(o.leaf ?? '#3d7d3b', 0.85);
  b.cyl(M.plain(o.color ?? '#f1efe8', 0.6), x, y, z, r * 0.75, h, { seg: 12, r2: r });
  for (let i = 0; i < (o.n ?? 8); i++) { const a = R() * 6.283, rr = R() * r * 0.8; b.sphere(leaf, x + Math.cos(a) * rr, y + h + (o.ph ?? 0.05) * (0.4 + R()), z + Math.sin(a) * rr, r * (0.45 + R() * 0.35), { seg: 7 }); }
}
/** a stack or loose pile of papers and magazines */
export function papers(b, x, y, z, w, d, h, seed = 1, cols = ['#f3f1ea', '#e7e2d4', '#dfe8f0', '#f0e4e4']) {
  const R = rng(seed * 19), n = Math.max(1, Math.round(h / 0.012));
  for (let i = 0; i < n; i++) b.rbox(M.plain(cols[(R() * cols.length) | 0], 0.8), x + (R() - 0.5) * 0.02, y + (i + 0.5) * h / n, z + (R() - 0.5) * 0.02, w, h / n * 0.92, d, (R() - 0.5) * 14, { cast: i === n - 1 });
}
/** small bright figures in a row (the ledge over his door, the glass cabinet) */
export function figures(b, x0, x1, y, z, n, seed = 1, big = false) {
  const R = rng(seed * 41), cols = ['#f29cb4', '#f6c7d3', '#8fd19a', '#f3e08a', '#9cc8f0', '#f0a35e', '#e8e4dc', '#d86a8a'];
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i + 0.5) / n + (R() - 0.5) * 0.03, c = cols[(R() * cols.length) | 0], s = (big && i < 2) ? 1.9 : 0.8 + R() * 0.5;
    b.cyl(M.plain(c, 0.5), x, y, z, 0.022 * s, 0.05 * s, { seg: 8, r2: 0.012 * s }); b.sphere(M.plain(R() < 0.5 ? '#f3d9c4' : c, 0.5), x, y + 0.065 * s, z, 0.018 * s, { seg: 8 });
  }
}
/** a round clock; the hands are returned as a group so the hour can be set */
export function clockFace(d = 256, o = {}) {
  return plateTex(d, d, (g, w) => {
    g.fillStyle = o.bg ?? '#f4f0e4'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, 7); g.fill();
    g.strokeStyle = '#2a2622'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#2a2622'; g.font = `600 ${w * 0.12}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * 6.283 - 1.5708; g.fillText(String(i), w / 2 + Math.cos(a) * w * 0.37, w / 2 + Math.sin(a) * w * 0.37 + 1); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; g.fillRect(w / 2 + Math.cos(a) * w * 0.46 - 1, w / 2 + Math.sin(a) * w * 0.46 - 1, 2, 2); }
  });
}
/** lace laid over a top (x0…x1, z0…z1 at height y) with a scalloped drop on the open sides */
export function lace(b, x0, x1, y, z0, z1, drop = 0.16, sides = ['f']) {
  const top = M.plain('#efe3bd', 0.9), m = M.alpha(laceTex(), { test: 0.4 });
  b.box(top, x0, y, z0, x1, y + 0.004, z1, { cast: false });
  if (sides.includes('f')) b.quad(m, '+z', (x0 + x1) / 2, y - drop / 2 + 0.004, z1 + 0.003, x1 - x0, drop, { uv: [0.35, drop], cast: false });
  if (sides.includes('l')) b.quad(m, '-x', x0 - 0.003, y - drop / 2 + 0.004, (z0 + z1) / 2, z1 - z0, drop, { uv: [0.35, drop], cast: false });
  if (sides.includes('r')) b.quad(m, '+x', x1 + 0.003, y - drop / 2 + 0.004, (z0 + z1) / 2, z1 - z0, drop, { uv: [0.35, drop], cast: false });
}
/** a hanging curtain: a cloth in folds from y1 down to y0, a…b along its rail (which runs along local x);
    o.uvr [across, down]: how many times a patterned cloth repeats (left out: once per fold, once down) */
export function curtain(b, mat, x0, x1, y0, y1, z, o = {}) {
  const w = x1 - x0, folds = o.folds ?? Math.max(3, Math.round(w / 0.085));
  b.quad(mat, '+z', (x0 + x1) / 2, (y0 + y1) / 2, z, w, y1 - y0, { segA: folds * 4, segB: 1, wave: [folds * Math.PI * 2 / w, o.depth ?? 0.028, 0.6], uvr: o.uvr ?? [folds, 1], cast: o.cast !== false });
}
/** a wall switch plate */
export const switchPlate = (b, x, y, z, axis = '+z', led = false) => {
  const [dx, dz] = axis === '+z' ? [0.06, 0.008] : axis === '-z' ? [0.06, -0.008] : axis === '+x' ? [0.008, 0.06] : [-0.008, 0.06];
  if (axis[1] === 'z') { b.box(M.plain('#f4f3ee', 0.4), x - dx, y - 0.04, z, x + dx, y + 0.04, z + dz, { cast: false }); if (led) b.box(M.glow('#ff5030', 1.4), x + 0.02, y - 0.008, z + dz, x + 0.036, y + 0.008, z + dz * 1.3, { cast: false }); }
  else { b.box(M.plain('#f4f3ee', 0.4), x, y - 0.04, z - dz, x + dx, y + 0.04, z + dz, { cast: false }); if (led) b.box(M.glow('#ff5030', 1.4), x + dx, y - 0.008, z + 0.02, x + dx * 1.3, y + 0.008, z + 0.036, { cast: false }); }
};
/** the soft shadow a piece of furniture leaves on the floor */
let blobTex;
export function blob(b, x0, z0, x1, z1, a = 0.5, y = 0.004) {
  blobTex = blobTex || canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); const r = g.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.55, 'rgba(0,0,0,0.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, { repeat: false });
  const key = 'blob' + a; let m = blob.mats.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: a, depthWrite: false, color: '#1a0e08' }); m.userData.noCast = true; m.userData.noRecv = true; m.userData.order = 1; blob.mats.set(key, m); }
  const px = 0.16, pz = 0.16;
  b.quad(m, '+y', (x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0 + px * 2, z1 - z0 + pz * 2, { cast: false, recv: false });
}
blob.mats = new Map();
