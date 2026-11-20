/* Things that stand about in a Los Angeles parking lot and along its streets, built with a Builder: trees (the
   rounded broadleaf trees of the lot, the Indian laurel figs of Mariposa, fan palms), parked cars of 2015, light poles,
   the steel picket fence, curbs, stripes and wheel stops, street lights, signal poles, hydrants. */
import * as THREE from 'three';
import { park } from './cars.js';
import { M, canvasTex, rng, shade } from '../../engine/tex.js';
import { X } from './mat.js';

const mats = new Map();
const mat = (k, f) => { let m = mats.get(k); if (!m) mats.set(k, m = f()); return m; };
const leafTex = (base, seed) => canvasTex(256, 256, (g, w, h) => {
  const R = rng(seed); g.fillStyle = shade(base, -0.25); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = R(); g.fillStyle = v < 0.45 ? shade(base, -0.45 + R() * 0.2) : v < 0.85 ? shade(base, (R() - 0.3) * 0.3) : shade(base, 0.25 + R() * 0.25); g.beginPath(); g.ellipse(R() * w, R() * h, 2 + R() * 4, 1.5 + R() * 2.5, R() * 3, 0, 7); g.fill(); }
});
const frondTex = () => canvasTex(128, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h); const R = rng(4);
  g.strokeStyle = '#5b5a2c'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 20); g.stroke();
  for (let i = 0; i < 46; i++) { const a = -Math.PI / 2 + (i / 45 - 0.5) * 2.6, len = 70 + R() * 50; g.strokeStyle = R() < 0.6 ? '#4f6a2c' : '#6c8a3c'; g.lineWidth = 3 + R() * 2; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2 + Math.cos(a) * len * 0.55, 40 + Math.abs(Math.sin(a)) * len * 0.3 + len * 0.55); g.stroke(); }
}, { repeat: false });
const pickTex = () => canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f4f3ef'; for (let x = 4; x < w; x += 16) g.fillRect(x, 0, 4, h); g.fillRect(0, 4, w, 4); g.fillRect(0, h - 10, w, 4); }, { repeat: true });

export const P = {
  leaves: (c = '#4d6b30', seed = 1) => mat('leaf' + c + seed, () => new THREE.MeshStandardMaterial({ map: leafTex(c, seed), roughness: 0.9 })),
  bark: (c = '#6b5a48') => M.plain(c, 0.9),
  frond: () => mat('frond', () => { const m = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }); return m; }),
  picket: () => mat('picket', () => new THREE.MeshStandardMaterial({ map: pickTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 })),
  stripe: () => M.plain('#e9e8e2', 0.85), red: () => M.plain('#b3332b', 0.8), curb: () => X.conc('#c3bfb6', 3, false),
  pole: () => M.plain('#5d5f60', 0.5, 0.6), poleDark: () => M.plain('#2f3133', 0.5, 0.6),
};

/** a rounded broadleaf tree (the lot's water gums and pittosporums): h tall, crown r wide */
export function tree(b, x, z, o = {}) {
  const R = rng(o.seed ?? ((x * 73 + z * 31) | 0)), h = o.h ?? 6 + R() * 2.5, r = o.r ?? 2.2 + R() * 1.0, lean = (R() - 0.5) * 6;
  const leaves = o.leaves ?? P.leaves(['#4d6b30', '#577838', '#466428', '#5f7f3b'][(R() * 4) | 0], (R() * 9) | 0);
  b.cyl(P.bark(o.bark), x, 0, z, 0.13 + h * 0.012, h * 0.55, { seg: 7, r2: 0.09, rz: lean });
  for (let i = 0; i < 3; i++) { const a = R() * 6.283; b.bar(P.bark(o.bark), x, h * 0.42, z, x + Math.cos(a) * r * 0.55, h * (0.62 + R() * 0.1), z + Math.sin(a) * r * 0.55, 0.08, { round: true, seg: 5, cast: false }); }
  const n = o.blobs ?? 6;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R(), d = r * (0.25 + R() * 0.4), s = r * (0.55 + R() * 0.3); b.sphere(leaves, x + Math.cos(a) * d, h * 0.68 + R() * h * 0.22, z + Math.sin(a) * d, s, { seg: 7, sy: 0.82 }); }
  b.sphere(leaves, x, h * 0.84, z, r * 0.7, { seg: 7, sy: 0.75 });
}
/** an Indian laurel fig of Mariposa Ave: a wide dome on a grey trunk that splits low */
export function ficus(b, x, z, o = {}) {
  /* the Indian laurel figs of Mariposa and Continental (photographs 1783–1786): a short grey trunk splitting low into
     five or six smooth limbs, a dense dark dome much wider than tall, its underside a ceiling some 3.5 m up */
  const R = rng(o.seed ?? ((x * 37 + z * 11) | 0)), h = o.h ?? 8.2 + R() * 2, r = o.r ?? 5.2 + R() * 1.4;
  const bark = P.bark('#706d67'), leaves = P.leaves('#2f4d22', 3 + ((R() * 3) | 0)), dark = P.leaves('#26421c', 6);
  b.cyl(bark, x, 0, z, 0.46, 0.4, { seg: 10, r2: 0.38 });
  b.cyl(bark, x, 0.35, z, 0.38, 1.5, { seg: 10, r2: 0.32 });
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + R() * 0.5, d1 = r * 0.3, d2 = r * 0.62, y1 = 3.2 + R() * 0.7, y2 = h * 0.62;
    const x1 = x + Math.cos(a) * d1, z1 = z + Math.sin(a) * d1;
    b.bar(bark, x, 1.6, z, x1, y1, z1, 0.3, { round: true, seg: 6 });
    b.bar(bark, x1, y1 - 0.1, z1, x + Math.cos(a + 0.3) * d2, y2, z + Math.sin(a + 0.3) * d2, 0.17, { round: true, seg: 5 });
  }
  // the crown: a ring of clumps hanging low at the rim, a dome inside it
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + R() * 0.4, d = r * (0.58 + R() * 0.14); b.sphere(i % 3 ? leaves : dark, x + Math.cos(a) * d, h * 0.6 + R() * 0.6, z + Math.sin(a) * d, r * 0.5, { seg: 8, seg2: 6, sy: 0.7 }); }
  b.sphere(leaves, x, h * 0.74, z, r * 0.78, { seg: 10, seg2: 6, sy: 0.5 });
}
/** a Mexican fan palm: a tall thin trunk and a ball of fronds */
export function palm(b, x, z, o = {}) {
  const R = rng(o.seed ?? ((x * 13 + z * 7) | 0)), h = o.h ?? 12 + R() * 7, lean = (R() - 0.5) * 5;
  b.cyl(P.bark('#7a6a55'), x, 0, z, 0.24, h, { seg: 8, r2: 0.17, rz: lean });
  const tx = x + Math.sin(lean * Math.PI / 180) * -h, ty = h;
  b.sphere(P.bark('#6f5a3e'), tx, ty - 0.4, z, 0.55, { seg: 7, sy: 1.4 });           // the skirt of dead fronds
  const fr = P.frond();
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * 360 + R() * 20, tilt = 25 + R() * 50;
    b.push(tx, ty, z, a); b.rbox(fr, 0, 0.0, -1.25, 0.05, 1.6, 2.5, 0, { rx: -(90 - tilt), cast: true }); b.pop();
  }
  for (let i = 0; i < 11; i++) { const a = (i + 0.5) / 11 * 360; b.push(tx, ty, z, a); b.quad(fr, '+y', 0, 0.15, -1.3, 1.4, 2.6, { cast: false }); b.pop(); }
}
/** a car parked in a stall, nose toward `face` (degrees, clockwise from north): recorded, set down with the others (cars.js) */
export function car(b, x, z, face, o = {}) { park(b, x, z, face, o); }
/** the old Beetle that stood in the hotel's lot on 22/9 (the photograph at 09:48) */
export function beetle(b, x, z, face) {
  const body = M.plain('#8a5a3c', 0.25, 0.55), glass = M.plain('#1b2228', 0.12, 0.3), tyre = M.plain('#151515', 0.85);
  b.push(x, 0, z, face);
  b.sphere(body, 0, 0.8, 0.1, 1, { sx: 0.8, sy: 0.62, sz: 1.95, seg: 16 });
  b.box(M.plain('#2a2a2a', 0.6), -0.78, 0.3, -1.95, 0.78, 0.55, 2.05, { solid: true });
  b.sphere(glass, 0, 1.12, 0.15, 1, { sx: 0.62, sy: 0.4, sz: 0.95, seg: 12 });
  b.sphere(body, 0, 1.2, 0.2, 1, { sx: 0.6, sy: 0.32, sz: 0.85, seg: 12 });
  for (const sx of [-1, 1]) for (const sz of [-1.25, 1.2]) b.cyl(tyre, sx * 0.68, 0.32, sz, 0.32, 0.2, { rz: 90, seg: 12 });
  b.pop();
}
/** a parking-lot light: a square steel pole and one or two shoebox heads */
export function lotLight(b, x, z, h, glow, heads = 1, face = 0) {
  b.box(P.curb(), x - 0.3, 0, z - 0.3, x + 0.3, 0.6, z + 0.3, { solid: true });
  b.box(P.pole(), x - 0.08, 0.6, z - 0.08, x + 0.08, h, z + 0.08, {});
  for (let i = 0; i < heads; i++) {
    b.push(x, h, z, face + i * 180);
    b.box(P.pole(), -0.04, -0.04, 0, 0.04, 0.04, 0.6, { cast: false });
    b.box(P.poleDark(), -0.28, -0.18, 0.55, 0.28, 0.02, 1.15, {});
    b.box(glow, -0.24, -0.185, 0.6, 0.24, -0.175, 1.1, { cast: false });
    b.pop();
  }
}
/** a cobra-head street light on a tapered pole, arm reaching over the road toward `face` */
export function streetLight(b, x, z, face, glow) {
  b.cyl(P.pole(), x, 0, z, 0.13, 9.0, { seg: 8, r2: 0.08 });
  b.push(x, 8.8, z, face + 180);                       // (the frame's +z is the arm's reach)
  b.bar(P.pole(), 0, 0, 0, 0, 0.35, 2.3, 0.08, { round: true, seg: 6 });
  b.box(P.pole(), -0.18, 0.22, 2.1, 0.18, 0.42, 2.85, {});
  b.box(glow, -0.15, 0.215, 2.15, 0.15, 0.225, 2.8, { cast: false });
  b.pop();
}
/** the glare round lamp heads after dark: one cloud of sprites, [x, y, z] each; hidden until set visible */
export function glare(scene, heads, size = 3.2, colour = [255, 226, 186], name = 'glare') {
  const tex = canvasTex(64, 64, (c, w) => { const [r, g, bl] = colour, gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(255,250,240,1)`); gr.addColorStop(0.12, `rgba(${r},${g},${bl},0.75)`); gr.addColorStop(0.4, `rgba(${r},${g},${bl},0.16)`); gr.addColorStop(1, `rgba(${r},${g},${bl},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, { repeat: false });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(heads.flat(), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pts.name = name; pts.visible = false; pts.renderOrder = 3; scene.add(pts);
  return pts;
}
/** a steel picket fence from (x0, z0) to (x1, z1): posts, rails, pickets (a drawn sheet) */
export function fence(b, x0, z0, x1, z1, h = 1.5) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.4)), ang = Math.atan2(x1 - x0, -(z1 - z0)) * 180 / Math.PI;
  for (let i = 0; i <= n; i++) { const t = i / n; b.box(M.plain('#f1f0ec', 0.5), x0 + (x1 - x0) * t - 0.03, 0, z0 + (z1 - z0) * t - 0.03, x0 + (x1 - x0) * t + 0.03, h + 0.04, z0 + (z1 - z0) * t + 0.03, {}); }
  b.push((x0 + x1) / 2, 0, (z0 + z1) / 2, ang); b.quad(P.picket(), '+x', 0, h / 2, 0, len, h, { uv: [0.6, h], cast: false }); b.pop();
  const s = Math.min(x0, x1), e = Math.max(x0, x1), zs = Math.min(z0, z1), ze = Math.max(z0, z1);
  b.solid(s - 0.05, 0, zs - 0.05, e + 0.05, h, ze + 0.05);
}
