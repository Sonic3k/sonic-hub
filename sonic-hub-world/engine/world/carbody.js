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
function halfWidth(x) {                                                                         // (the corners rounded in plan, as the car is seen from above: nose and tail)
  if (x > 1.86) { const t = Math.min(1, (x - 1.86) / 0.54); return HW * Math.sqrt(1 - 0.56 * t * t); }
  if (x < -1.98) { const t = Math.min(1, (-1.98 - x) / 0.42); return HW * Math.sqrt(1 - 0.36 * t * t); }
  return HW;
}
function under(x) {
  let y = 0.2;
  for (const a of [AXF, AXR]) { const d = Math.abs(x - a); if (d < 0.415) y = Math.max(y, TYRE + Math.sqrt(0.415 * 0.415 - d * d) * 0.97); }   // (the arches close round the tyres)
  if (x > 2.1) y = Math.max(y, lerp(0.2, 0.3, smooth((x - 2.1) / 0.3))); if (x < -2.22) y = Math.max(y, lerp(0.2, 0.33, smooth((-2.22 - x) / 0.18)));
  return y;
}
function shoulder(x) {
  // (heights off his side photograph of 13/1/2020, scaled by the wheelbase there, where the camera's angle does least
  // harm: the windows' sill 0.98 m at the front door, rising to 1.04 m at the rear pillar; the hood 0.79 m at the nose)
  if (x >= 1.0) { const t = Math.min(1, (x - 1.0) / 1.4); return 0.98 - 0.12 * t - 0.12 * Math.pow(t, 6); }   // the hood: a gentle fall, then down over the nose
  if (x >= -1.74) return lerp(0.98, 1.04, (1.0 - x) / 2.74);                                 // the beltline, rising a little to the rear
  return lerp(1.04, 0.99, smooth(Math.min(1, (-1.74 - x) / 0.66)));                          // the trunk lid
}
/** the body's outline at x: from the underside's middle round to the top's, one side then the other (y, z) */
const SIDE = (y0, y1) => [[0, y0], [0.55, y0], [0.92, y0 + 0.02], [0.99, y0 + 0.09], [1.0, lerp(y0, y1, 0.45)], [0.985, y1 - 0.13], [0.94, y1 - 0.04], [0.82, y1], [0, y1 + 0.012]];
/** at the nose, how far back the face lies at height y: its upper part leans back over the bumper's chin */
const NOSE = 2.4, noseBack = y => 0.17 * Math.pow(Math.max(0, Math.min(1, (y - 0.42) / 0.34)), 1.4);
function section(x) {
  const w = halfWidth(x), side = SIDE(under(x), shoulder(x)), out = [], lean = x > NOSE - 0.3 ? smooth((x - (NOSE - 0.3)) / 0.3) : 0;
  const X = y => x - lean * noseBack(y);
  for (const [f, y] of side) out.push([X(y), y, f * w]);
  for (let k = side.length - 2; k >= 1; k--) { const [f, y] = side[k]; out.push([X(y), y, -f * w]); }
  return out;
}
/** a point on the body's skin at x, `t` along its outline (0 the underside's middle … 8 the top's, in steps of the
    outline's points), on side s, lifted `off` off the skin */
function skinAt(x, t, s, off) {
  const w = halfWidth(x), side = SIDE(under(x), shoulder(x)), k = Math.min(7, Math.max(0, Math.floor(t))), u = t - k;
  const a = side[k], b = side[k + 1], z = lerp(a[0], b[0], u) * w, y = lerp(a[1], b[1], u);
  let dz = (b[0] - a[0]) * w, dy = b[1] - a[1]; const n = Math.hypot(dz, dy) || 1; dz /= n; dy /= n;
  const lean = x > NOSE - 0.3 ? smooth((x - (NOSE - 0.3)) / 0.3) : 0;                         // (as the nose's sections lean)
  return [x - lean * noseBack(y), y - dz * off, s * (z + dy * off)];
}
/* the glasshouse: from the windscreen's foot (x 1.0) to the rear window's (x −1.74) — its roof line at the roof's edges
   (the crown is 2 cm higher: 1.47 m), measured off his photograph from the side: the windscreen straight up to its
   header at x 0.36, the roof arching to its top behind the B pillar, the rear window down to the trunk */
const ROOF = [[-1.74, 1.04], [-1.4, 1.235], [-1.02, 1.39], [-0.42, 1.455], [0.36, 1.37], [0.7, 1.19], [1.0, 0.98]];
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
const GX0 = -1.74, GX1 = 1.0, CROWN = 0.02;
function glassAt(x, f, s) {                                                                  // a point on the glasshouse at height fraction f, side s (±1)
  const yb = shoulder(x), yt = roof(x), wb = halfWidth(x) - 0.08, wt = 0.6, y = lerp(yb, yt, f), w = lerp(wb, wt, Math.pow(f, 1.4));
  return [x, y, s * w];
}
const roofY = (x, z) => roof(x) + CROWN * Math.max(0, 1 - Math.abs(z) / 0.6);                 // the roof's top at z (crowned)

export function buildCarBody() {
  const parts = { paint: [], glass: [], trim: [], chrome: [], tyre: [], rim: [], head: [], lens: [], tail: [], plate: [] };
  // the body
  const xs = []; for (let i = 0; i <= 44; i++) { const t = i / 44; xs.push(lerp(-2.4, 2.4, t)); }
  const rows = xs.map(section), nOut = rows[0].length;
  const low = k => k < 3 || k >= nOut - 3;                                                     // the underside, the wheel arches in it and the sill below the doors: black
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
    win(() => -0.33, f => 0.88 - 0.6 * f, 0.05, 0.9, s, 'glass');                              // the front door's window, its front edge along the A pillar
    win(() => -0.43, () => -0.33, 0.03, 0.94, s, 'trim');                                      // the B pillar, black
    win(f => -1.08 + 0.16 * f, () => -0.43, 0.05, 0.9, s, 'glass');                            // the rear door's
    win(f => -1.58 + 0.58 * f, f => -1.14 + 0.12 * f, 0.06, 0.78, s, 'glass');                 // the small fixed window behind it, in the C pillar, to a point
    win(f => -1.62 + 0.58 * f, f => 0.92 - 0.6 * f, 0.0, 0.03, s, 'chrome');                   // the bright line along their sill …
    win(() => -0.98, f => 0.9 - 0.6 * f, 0.915, 0.945, s, 'chrome');                          // … and along the doors' heads
  }
  const sheet = (x0, x1, w, nz = 8) => { const rr = []; for (let i = 0; i <= 8; i++) { const x = lerp(x0, x1, i / 8), row = []; for (let j = nz; j >= -nz; j--) { const z = j / nz * w(x); row.push([x, roofY(x, z) + 0.008, z]); } rr.push(row); } parts.glass.push(loft(rr, false)); };
  sheet(0.38, 0.97, x => lerp(0.57, 0.68, (x - 0.38) / 0.59));                                 // the windscreen
  sheet(-1.7, -1.06, x => lerp(0.62, 0.55, (x + 1.7) / 0.64));                                 // the rear window
  // wheels: the tyre, the SE's five split spokes (ten, in pairs) in bright silver, the dark wheel well behind them, a plain cap
  for (const ax of [AXF, AXR]) for (const s of [1, -1]) {
    const t = new THREE.CylinderGeometry(TYRE, TYRE, 0.225, 28, 1); t.rotateX(Math.PI / 2); t.translate(ax, TYRE, s * TRACK); parts.tyre.push(t);
    const r = new THREE.CylinderGeometry(0.228, 0.228, 0.02, 30, 1); r.rotateX(Math.PI / 2); r.translate(ax, TYRE, s * (TRACK + 0.1)); parts.trim.push(r);
    for (let k = 0; k < 5; k++) for (const d of [-1, 1]) {
      const b = new THREE.BoxGeometry(0.034, 0.17, 0.03); b.translate(0, 0.135, 0); b.rotateZ(k * 2 * Math.PI / 5 + d * 0.11); b.translate(ax, TYRE, s * (TRACK + 0.118)); parts.rim.push(b);
    }
    const h = new THREE.CylinderGeometry(0.075, 0.075, 0.035, 16, 1); h.rotateX(Math.PI / 2); h.translate(ax, TYRE, s * (TRACK + 0.12)); parts.rim.push(h);
    const rimRing = new THREE.TorusGeometry(0.222, 0.018, 6, 30); rimRing.translate(ax, TYRE, s * (TRACK + 0.118)); parts.rim.push(rimRing);
  }
  const box = (mat, x, y, z, sx, sy, sz, ry = 0) => { const b = new THREE.BoxGeometry(sx, sy, sz); if (ry) b.rotateY(ry); b.translate(x, y, z); parts[mat].push(b); };
  /* what is laid on the skin: a patch over the body's sides between stations x0…x1 and outline places t0…t1, and a
     patch on an end face (the flat nose or tail) between z0…z1 and y0…y1 — each a few millimetres proud */
  const skin = (mat, x0, x1, t0, t1, s, off = 0.005, nx = 6, nt = 4) => {
    const rr = []; for (let i = 0; i <= nx; i++) { const x = lerp(x0, x1, i / nx), row = []; for (let j = 0; j <= nt; j++) row.push(skinAt(x, lerp(t0, t1, j / nt), s, off)); rr.push(s > 0 ? row : row.slice().reverse()); }
    parts[mat].push(loft(rr, false));
  };
  const face = (mat, end, z0, z1, ya, yb, off = 0.005, za = z0, zb = z1) => {   // za…zb: the top edge's ends when it is narrower (a trapezoid); at the nose x by height: the face leans
    const X = y => (end > 0 ? NOSE - noseBack(y) + off : -2.4 - off), q = [[X(ya), ya, z0], [X(ya), ya, z1], [X(yb), yb, zb], [X(yb), yb, za]];
    const g = new THREE.BufferGeometry(), v = end > 0 ? [q[0], q[2], q[1], q[0], q[3], q[2]] : [q[0], q[1], q[2], q[0], q[2], q[3]];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v.flat(), 3)); g.computeVertexNormals(); parts[mat].push(g);
  };
  // the nose: the lamps swept back over the corners into the wings, the narrow upper grille and its bar, the wide
  // lower grille, the fog lamps either side of it
  for (const s of [1, -1]) {
    skin('head', 1.92, 2.4, 5.2, 6.8, s, 0.006, 8, 4);                                        // the housing, swept back over the corner: smoked
    skin('lens', 2.04, 2.32, 5.6, 6.4, s, 0.009, 4, 2);                                       // its bright reflectors inside
    face('head', 1, s * 0.33, s * 0.59, 0.6, 0.715, 0.006, s * 0.3, s * 0.55);
    face('lens', 1, s * 0.4, s * 0.52, 0.635, 0.69, 0.009);
    face('trim', 1, s * 0.45, s * 0.58, 0.33, 0.46, 0.006);                                   // the fog lamp's black pocket, the lamp in it, the bright strip under it
    face('lens', 1, s * 0.485, s * 0.545, 0.365, 0.425, 0.009); face('chrome', 1, s * 0.42, s * 0.59, 0.31, 0.322, 0.009);
  }
  face('trim', 1, -0.3, 0.3, 0.615, 0.71, 0.006); face('chrome', 1, -0.31, 0.31, 0.66, 0.674, 0.01);
  face('trim', 1, -0.43, 0.43, 0.3, 0.57, 0.006, -0.35, 0.35);                                // the wide lower grille, black mesh with its bars
  for (let k = 0; k < 4; k++) { const y = 0.345 + k * 0.06; face('tyre', 1, -0.4 + k * 0.016, 0.4 - k * 0.016, y, y + 0.012, 0.009); }   // (its slats, black)
  // the tail: the lamps wrapping round the corners, the plate (blank) in the lid between them under a chrome bar,
  // the bumper's black lower lip
  for (const s of [1, -1]) {
    skin('tail', -2.4, -2.06, 4.5, 6.65, s, 0.006, 6, 4); face('tail', -1, s * 0.36, s * 0.66, 0.8, 0.93, 0.006);
    face('lens', -1, s * 0.42, s * 0.63, 0.858, 0.872, 0.009);                                // the bright band across each lamp
  }
  face('plate', -1, -0.153, 0.153, 0.745, 0.897, 0.008);
  face('trim', -1, -0.56, 0.56, 0.34, 0.45, 0.006);                                           // the bumper's black lower part
  box('trim', -2.27, shoulder(-2.27) + 0.02, 0, 0.1, 0.035, 1.22);                            // the lip spoiler on the lid's edge
  { const e = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12, 1); e.rotateZ(Math.PI / 2); e.translate(-2.4, 0.36, 0.44); parts.chrome.push(e); }
  // mirrors, the black sills, door handles, the window line in chrome
  for (const s of [1, -1]) {
    box('paint', 0.78, 1.06, s * 1.0, 0.16, 0.12, 0.2, s * 0.2); box('trim', 0.82, 1.02, s * 0.92, 0.1, 0.05, 0.06);
    box('trim', 0.05, 0.215, s * 0.9, 2.2, 0.06, 0.04); box('paint', 0.25, 0.9, s * 0.915, 0.15, 0.03, 0.025); box('paint', -0.85, 0.9, s * 0.915, 0.15, 0.03, 0.025);
    box('trim', -0.17, shoulder(-0.17) + 0.006, s * (HW - 0.075), 2.0, 0.018, 0.025);          // the belt moulding (black on the SE)
  }
  box('trim', 0.0, 0.27, 0, 3.6, 0.14, 1.5);                                                 // what is under it (one does not see through it)
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0x0f181d, metalness: 0.55, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }),   // black with a blue-green flake, as the sun shows it in his photographs
    glass: new THREE.MeshPhysicalMaterial({ color: 0x3a4750, metalness: 0.15, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, side: THREE.DoubleSide }),   // tinted, with the sky in it
    trim: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.2 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xd3d7db, metalness: 0.9, roughness: 0.24 }),
    head: new THREE.MeshStandardMaterial({ color: 0x6f7881, metalness: 0.95, roughness: 0.1, side: THREE.DoubleSide }),     // the chrome bowls seen through the clear lens
    lens: new THREE.MeshStandardMaterial({ color: 0xf2f4f6, emissive: 0x3a3d42, metalness: 0.6, roughness: 0.08, side: THREE.DoubleSide }),
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
