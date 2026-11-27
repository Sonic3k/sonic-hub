/* His car seen from outside: a black 2014 Toyota Camry (XV50), as his photographs of 24/10/2019 show it (album
   usa/camry-2014: all four sides). Sizes are the maker's: 4.805 m long, 1.82 m wide, 1.47 m high, 2.775 m between the
   axles, 1.575 m between the wheels across; 225/45 R18 tyres. No badge, no plate number (a plain plate).

   buildCarBody() → a group, its local x the way the nose points, y up, its middle on the ground at the origin; a mesh
   per material (paint, glass, black trim, chrome, tyres, lamps). `pick` lists what a tap may hit. */
import * as THREE from 'three';
import { mergeGeoms } from '../kit.js';

const L = 4.805, HW = 0.91, AXF = 1.455, AXR = -1.32, TRACK = 0.7875, TYRE = 0.335;

/** a lofted surface: `rows` are outlines (same count of points), one per station → indexed geometry, normals smoothed */
function loft(rows, close, keep) {                                                            // keep(k): which strips between outline points k, k+1
  const n = rows[0].length, pos = [], idx = [];
  for (const r of rows) for (const p of r) pos.push(p[0], p[1], p[2]);
  const m = close ? n : n - 1;
  for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < m; k++) {
    if (keep && !keep(k)) continue;
    const a = i * n + k, b = i * n + (k + 1) % n, c = (i + 1) * n + k, d = (i + 1) * n + (k + 1) % n;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** a flat cap over an outline (a fan from its middle), facing `dir` (±1 along x) */
function cap(row, dir) {
  const c = row.reduce((s, p) => [s[0] + p[0] / row.length, s[1] + p[1] / row.length, s[2] + p[2] / row.length], [0, 0, 0]), pos = [];
  for (let k = 0; k < row.length; k++) { const p = row[k], q = row[(k + 1) % row.length]; if (dir > 0) pos.push(...c, ...q, ...p); else pos.push(...c, ...p, ...q); }   // (the outline runs clockwise seen from +x)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const smooth = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;

/* the body below the windows: its half width, its underside (raised into an arch over each wheel), its top (the hood,
   the shoulder, the trunk lid) — all along x */
function halfWidth(x) {
  if (x > 1.85) return lerp(HW, 0.74, smooth(Math.min(1, (x - 1.85) / 0.55)));
  if (x < -1.95) return lerp(HW, 0.80, smooth(Math.min(1, (-1.95 - x) / 0.45)));
  return HW;
}
function under(x) {
  let y = 0.2;
  for (const a of [AXF, AXR]) { const d = Math.abs(x - a); if (d < 0.44) y = Math.max(y, TYRE + Math.sqrt(0.44 * 0.44 - d * d) * 0.95); }
  if (x > 2.2) y = Math.max(y, lerp(0.2, 0.27, (x - 2.2) / 0.2)); if (x < -2.25) y = Math.max(y, lerp(0.2, 0.31, (-2.25 - x) / 0.15));
  return y;
}
function shoulder(x) {
  // (heights off his side photograph, scaled by the wheelbase: the windows' sill 1.03–1.06 m, the hood 0.8 m at the nose)
  if (x >= 0.95) return lerp(1.03, 0.8, Math.pow(Math.min(1, (x - 0.95) / 1.45), 1.8));     // the hood, falling to the nose
  if (x >= -1.7) return lerp(1.03, 1.06, (0.95 - x) / 2.65);                                 // the beltline, rising a little to the rear
  return lerp(1.06, 1.0, smooth(Math.min(1, (-1.7 - x) / 0.7)));                             // the trunk lid
}
/** the body's outline at x: from the underside's middle round to the top's, one side then the other (y, z) */
const SIDE = (y0, y1) => [[0, y0], [0.55, y0], [0.92, y0 + 0.02], [0.99, y0 + 0.09], [1.0, lerp(y0, y1, 0.45)], [0.985, y1 - 0.13], [0.94, y1 - 0.04], [0.82, y1], [0, y1 + 0.012]];
function section(x) {
  const w = halfWidth(x), side = SIDE(under(x), shoulder(x)), out = [];
  for (const [f, y] of side) out.push([x, y, f * w]);
  for (let k = side.length - 2; k >= 1; k--) { const [f, y] = side[k]; out.push([x, y, -f * w]); }
  return out;
}
/** a point on the body's skin at x, `t` along its outline (0 the underside's middle … 8 the top's, in steps of the
    outline's points), on side s, lifted `off` off the skin */
function skinAt(x, t, s, off) {
  const w = halfWidth(x), side = SIDE(under(x), shoulder(x)), k = Math.min(7, Math.max(0, Math.floor(t))), u = t - k;
  const a = side[k], b = side[k + 1], z = lerp(a[0], b[0], u) * w, y = lerp(a[1], b[1], u);
  let dz = (b[0] - a[0]) * w, dy = b[1] - a[1]; const n = Math.hypot(dz, dy) || 1; dz /= n; dy /= n;
  return [x, y - dz * off, s * (z + dy * off)];
}
/* the glasshouse: from the windscreen's foot (x 0.92) to the rear window's (x −1.70) — its roof line at the roof's edges
   (the crown is 2 cm higher: 1.47 m), measured off his photograph from the side: the windscreen straight up to its
   header at x 0.22, the roof arching to its top over the B pillar, the rear window straight down to the trunk */
const ROOF = [[-1.7, 1.06], [-1.36, 1.235], [-1.02, 1.395], [-0.35, 1.45], [0.22, 1.385], [0.57, 1.2], [0.92, 1.03]];
const ROOF_M = (() => {                                                                        // a monotone cubic through ROOF (Fritsch–Carlson)
  const n = ROOF.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ROOF[i + 1][1] - ROOF[i][1]) / (ROOF[i + 1][0] - ROOF[i][0]));
  m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return m;
})();
function roof(x) {
  const P = ROOF; if (x <= P[0][0]) return P[0][1]; if (x >= P[P.length - 1][0]) return P[P.length - 1][1];
  let i = 0; while (x > P[i + 1][0]) i++;
  const h = P[i + 1][0] - P[i][0], t = (x - P[i][0]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * h * ROOF_M[i] + (-2 * t3 + 3 * t2) * P[i + 1][1] + (t3 - t2) * h * ROOF_M[i + 1];
}
const GX0 = -1.7, GX1 = 0.92, CROWN = 0.02;
function glassAt(x, f, s) {                                                                  // a point on the glasshouse at height fraction f, side s (±1)
  const yb = shoulder(x), yt = roof(x), wb = halfWidth(x) - 0.08, wt = 0.6, y = lerp(yb, yt, f), w = lerp(wb, wt, Math.pow(f, 1.4));
  return [x, y, s * w];
}
const roofY = (x, z) => roof(x) + CROWN * Math.max(0, 1 - Math.abs(z) / 0.6);                 // the roof's top at z (crowned)

export function buildCarBody() {
  const parts = { paint: [], glass: [], trim: [], chrome: [], tyre: [], rim: [], head: [], tail: [], plate: [] };
  // the body
  const xs = []; for (let i = 0; i <= 44; i++) { const t = i / 44; xs.push(lerp(-2.4, 2.4, t)); }
  const rows = xs.map(section), nOut = rows[0].length;
  const low = k => k < 2 || k >= nOut - 2;                                                     // the underside (and the wheel arches in it): black, as it is in the shade
  parts.paint.push(loft(rows, true, k => !low(k)), cap(rows[0], -1), cap(rows[rows.length - 1], 1)); parts.trim.push(loft(rows, true, low));
  // the glasshouse: paint, with the windows laid a centimetre proud of it
  const gx = []; for (let i = 0; i <= 32; i++) gx.push(lerp(GX0, GX1, i / 32));              // (rear to front, as the body's stations run: its faces turn outwards)
  const gf = [0, 0.25, 0.55, 0.8, 0.93, 1.0];
  const grow = gx.map(x => [...gf.map(f => glassAt(x, f, 1)), [x, roof(x) + CROWN, 0], ...gf.slice().reverse().map(f => glassAt(x, f, -1))]);
  parts.paint.push(loft(grow, false));
  // a window laid 1.2 cm proud of the glasshouse: between its rear edge xr(f) and front edge xf(f), heights f0…f1
  const win = (xr, xf, f0, f1, s, mat) => {
    const rr = []; for (let i = 0; i <= 6; i++) { const row = [];
      for (let j = 0; j <= 4; j++) { const f = lerp(f0, f1, j / 4), p = glassAt(lerp(xr(f), xf(f), i / 6), f, s); row.push([p[0], p[1], p[2] + s * 0.012]); }
      rr.push(s > 0 ? row : row.slice().reverse()); }
    parts[mat].push(loft(rr, false));
  };
  for (const s of [1, -1]) {
    win(() => -0.33, f => 0.8 - 0.62 * f, 0.1, 0.86, s, 'glass');                             // the front door's window, its front edge along the A pillar
    win(() => -0.43, () => -0.33, 0.06, 0.92, s, 'trim');                                      // the B pillar, black
    win(f => -1.06 + 0.12 * f, () => -0.43, 0.1, 0.86, s, 'glass');                            // the rear door's
    win(f => -1.52 + 0.5 * f, f => -1.12 + 0.1 * f, 0.12, 0.74, s, 'glass');                   // the small fixed window behind it, in the C pillar
  }
  const sheet = (x0, x1, w, nz = 8) => { const rr = []; for (let i = 0; i <= 8; i++) { const x = lerp(x0, x1, i / 8), row = []; for (let j = nz; j >= -nz; j--) { const z = j / nz * w(x); row.push([x, roofY(x, z) + 0.008, z]); } rr.push(row); } parts.glass.push(loft(rr, false)); };
  sheet(0.24, 0.89, x => lerp(0.57, 0.66, (x - 0.24) / 0.65));                                 // the windscreen
  sheet(-1.66, -1.06, x => lerp(0.6, 0.55, (x + 1.66) / 0.6));                                 // the rear window
  // wheels: tyre, a five-spoke wheel, a dark hub
  for (const ax of [AXF, AXR]) for (const s of [1, -1]) {
    const t = new THREE.CylinderGeometry(TYRE, TYRE, 0.225, 28, 1); t.rotateX(Math.PI / 2); t.translate(ax, TYRE, s * TRACK); parts.tyre.push(t);
    const r = new THREE.CylinderGeometry(0.235, 0.235, 0.02, 24, 1); r.rotateX(Math.PI / 2); r.translate(ax, TYRE, s * (TRACK + 0.105)); parts.trim.push(r);
    for (let k = 0; k < 5; k++) { const b = new THREE.BoxGeometry(0.05, 0.21, 0.025); b.translate(0, 0.11, 0); b.rotateZ(k * 2 * Math.PI / 5); b.translate(ax, TYRE, s * (TRACK + 0.118)); parts.rim.push(b); }
    const h = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12, 1); h.rotateX(Math.PI / 2); h.translate(ax, TYRE, s * (TRACK + 0.12)); parts.rim.push(h);
    const rimRing = new THREE.TorusGeometry(0.225, 0.016, 6, 24); rimRing.translate(ax, TYRE, s * (TRACK + 0.118)); parts.rim.push(rimRing);
  }
  const box = (mat, x, y, z, sx, sy, sz, ry = 0) => { const b = new THREE.BoxGeometry(sx, sy, sz); if (ry) b.rotateY(ry); b.translate(x, y, z); parts[mat].push(b); };
  /* what is laid on the skin: a patch over the body's sides between stations x0…x1 and outline places t0…t1, and a
     patch on an end face (the flat nose or tail) between z0…z1 and y0…y1 — each a few millimetres proud */
  const skin = (mat, x0, x1, t0, t1, s, off = 0.005, nx = 6, nt = 4) => {
    const rr = []; for (let i = 0; i <= nx; i++) { const x = lerp(x0, x1, i / nx), row = []; for (let j = 0; j <= nt; j++) row.push(skinAt(x, lerp(t0, t1, j / nt), s, off)); rr.push(s > 0 ? row : row.slice().reverse()); }
    parts[mat].push(loft(rr, false));
  };
  const face = (mat, end, z0, z1, ya, yb, off = 0.005, za = z0, zb = z1) => {   // za…zb: the top edge's ends when it is narrower (a trapezoid)
    const x = end > 0 ? 2.4 + off : -2.4 - off, q = [[x, ya, z0], [x, ya, z1], [x, yb, zb], [x, yb, za]];
    const g = new THREE.BufferGeometry(), v = end > 0 ? [q[0], q[2], q[1], q[0], q[3], q[2]] : [q[0], q[1], q[2], q[0], q[2], q[3]];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v.flat(), 3)); g.computeVertexNormals(); parts[mat].push(g);
  };
  // the nose: the lamps swept back over the corners into the wings, the narrow upper grille and its bar, the wide
  // lower grille, the fog lamps either side of it
  for (const s of [1, -1]) {
    skin('head', 1.96, 2.4, 5.15, 6.75, s, 0.006, 8, 4);
    face('head', 1, s * 0.4, s * 0.705, 0.655, 0.775, 0.006, s * 0.36, s * 0.66);
    face('trim', 1, s * 0.56, s * 0.68, 0.33, 0.43, 0.006); face('chrome', 1, s * 0.58, s * 0.66, 0.36, 0.40, 0.009);
  }
  face('trim', 1, -0.36, 0.36, 0.665, 0.765, 0.006); face('chrome', 1, -0.38, 0.38, 0.712, 0.729, 0.01);
  face('trim', 1, -0.5, 0.5, 0.3, 0.57, 0.006, -0.42, 0.42);
  // the tail: the lamps wrapping round the corners, the plate (blank) in the lid between them under a chrome bar,
  // the bumper's black lower lip
  for (const s of [1, -1]) { skin('tail', -2.4, -2.1, 4.6, 6.6, s, 0.006, 6, 4); face('tail', -1, s * 0.4, s * 0.775, 0.83, 0.95, 0.006); }
  face('plate', -1, -0.153, 0.153, 0.745, 0.897, 0.008); face('chrome', -1, -0.36, 0.36, 0.915, 0.935, 0.008);
  face('trim', -1, -0.62, 0.62, 0.31, 0.41, 0.006);
  // mirrors, the black sills, door handles, the window line in chrome
  for (const s of [1, -1]) {
    box('paint', 0.76, 1.1, s * 0.99, 0.2, 0.12, 0.16, s * 0.15); box('trim', 0.8, 1.05, s * 0.92, 0.12, 0.05, 0.06);
    box('trim', 0.05, 0.215, s * 0.9, 2.2, 0.06, 0.04); box('chrome', 0.25, 0.93, s * 0.915, 0.14, 0.025, 0.02); box('chrome', -0.85, 0.93, s * 0.915, 0.14, 0.025, 0.02);
    box('trim', -0.17, shoulder(-0.17) + 0.006, s * (HW - 0.075), 2.0, 0.018, 0.025);          // the belt moulding (black on the SE)
  }
  box('trim', 0.0, 0.27, 0, 3.6, 0.14, 1.5);                                                 // what is under it (one does not see through it)
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: 0.6, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.07 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x07090c, metalness: 0.3, roughness: 0.04, side: THREE.DoubleSide }),
    trim: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.2 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x9da2a8, metalness: 0.85, roughness: 0.32 }),
    head: new THREE.MeshStandardMaterial({ color: 0xb4bcc6, emissive: 0x15181c, metalness: 0.85, roughness: 0.14, side: THREE.DoubleSide }),
    tail: new THREE.MeshStandardMaterial({ color: 0x7a0a10, emissive: 0x1c0203, metalness: 0.15, roughness: 0.16, side: THREE.DoubleSide }),
    plate: new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.5 }),
  };
  const group = new THREE.Group(); group.name = 'my car'; const pick = [];
  for (const [k, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const g = mergeGeoms(list.map(q => (q.index ? q.toNonIndexed() : q)).map(q => { if (!q.attributes.normal) q.computeVertexNormals(); if (!q.attributes.uv) q.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2)); return q; }));
    const m = new THREE.Mesh(g, M[k]); m.name = 'my car ' + k; m.castShadow = true; m.receiveShadow = k !== 'glass'; group.add(m); pick.push(m);
  }
  group.userData.pick = pick; group.userData.materials = M;
  return group;
}
