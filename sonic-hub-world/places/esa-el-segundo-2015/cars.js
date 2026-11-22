/* Cars. Five bodies (sedan, SUV, compact, minivan, pickup) are drawn once and set down as instances, so the four
   hundred-odd cars in the lots and on the streets cost about fifteen draw calls. A body is its side profile pushed out
   to the car's width with the wheel arches cut in; the glasshouse above the belt narrows toward the roof; pillars,
   roof panel, mirrors, lamps, plates and wheels are added. Only the paint is tinted per car. No make is copied: these
   are the shapes of a Californian car park in 2015, not particular models. */
import * as THREE from 'three';
import { mergeGeoms } from '../../engine/kit.js';
import { rng } from '../../engine/tex.js';

/* u runs along the car (+ toward the nose), y up. `top` is the outline from the front-bottom corner up over the car to
   the rear-bottom corner; the bottom edge with its arches is added. `glass` is the glasshouse (rear-bottom, front-bottom,
   roof-front, roof-rear). */
const BODIES = {
  sedan: { L: 4.75, W: 1.82, r: 0.32, axle: [1.42, -1.38], belt: 0.95, head: 0.71, tail: 0.86, pillars: [-0.38], cpillar: 0.15,
    top: [[2.30, 0.28], [2.375, 0.45], [2.36, 0.66], [2.22, 0.79], [1.02, 0.94], [-1.58, 0.97], [-2.22, 0.99], [-2.36, 0.88], [-2.375, 0.55], [-2.30, 0.28]],
    glass: [[-1.62, 0.955], [1.06, 0.925], [0.20, 1.40], [-0.98, 1.43]] },
  suv: { L: 4.6, W: 1.86, r: 0.36, axle: [1.36, -1.30], belt: 1.12, head: 0.92, tail: 1.02, pillars: [-0.28, -1.32], cpillar: 0.1, rails: true,
    top: [[2.22, 0.36], [2.30, 0.55], [2.29, 0.85], [2.14, 1.0], [1.0, 1.12], [-2.12, 1.14], [-2.27, 1.08], [-2.30, 0.55], [-2.22, 0.36]],
    glass: [[-2.16, 1.12], [1.03, 1.10], [0.25, 1.66], [-2.08, 1.70]] },
  compact: { L: 4.35, W: 1.76, r: 0.31, axle: [1.32, -1.26], belt: 0.96, head: 0.72, tail: 0.9, pillars: [-0.42], cpillar: 0.18,
    top: [[2.10, 0.28], [2.17, 0.45], [2.15, 0.68], [1.96, 0.80], [0.96, 0.95], [-1.92, 0.99], [-2.13, 0.95], [-2.17, 0.5], [-2.10, 0.28]],
    glass: [[-2.0, 0.97], [0.99, 0.935], [0.08, 1.46], [-1.66, 1.48]] },
  minivan: { L: 5.1, W: 1.98, r: 0.34, axle: [1.58, -1.50], belt: 1.05, head: 0.86, tail: 1.02, pillars: [0.02, -1.45], cpillar: 0.12,
    top: [[2.47, 0.32], [2.55, 0.5], [2.53, 0.78], [2.28, 0.95], [1.55, 1.05], [-2.38, 1.08], [-2.52, 1.0], [-2.55, 0.5], [-2.47, 0.32]],
    glass: [[-2.48, 1.06], [1.6, 1.03], [0.55, 1.72], [-2.38, 1.76]] },
  pickup: { L: 5.7, W: 2.0, r: 0.39, axle: [1.85, -1.75], belt: 1.24, head: 1.0, tail: 1.0, pillars: [], cpillar: 0.1, bed: [-2.78, -0.48],
    top: [[2.78, 0.42], [2.85, 0.62], [2.84, 1.05], [2.66, 1.17], [1.2, 1.24], [-2.80, 1.24], [-2.85, 1.2], [-2.85, 0.6], [-2.78, 0.42]],
    glass: [[-0.40, 1.22], [1.25, 1.21], [0.55, 1.86], [-0.36, 1.88]] },
};
export const KINDS = Object.keys(BODIES);
const TUMBLE = 0.15;                           // the glasshouse leans in by this share of the half-width at the roof

let MATS = null;
export function carMats() {
  return MATS ??= {
    paint: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#1a2127', roughness: 0.06, metalness: 0.25 }),
    trim: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
  };
}

/* the outline's u at height y on the nose (side +1) or the tail (side −1) */
function faceU(B, y, side) {
  const t = B.top, pts = side > 0 ? t.slice(0, 5) : t.slice(-5).reverse();
  for (let i = 0; i < pts.length - 1; i++) { const [u0, y0] = pts[i], [u1, y1] = pts[i + 1]; if ((y - y0) * (y - y1) <= 0 && y1 !== y0) return u0 + (u1 - u0) * (y - y0) / (y1 - y0); }
  return side > 0 ? t[0][0] : t[t.length - 1][0];
}
const roofY = B => Math.max(B.glass[2][1], B.glass[3][1]);
const halfAt = (B, y, hw) => y <= B.belt ? hw : hw * (1 - TUMBLE * Math.min(1, (y - B.belt) / (roofY(B) - B.belt)));
function lean(g, B, hw) {                      // narrow everything above the belt toward the roof
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > B.belt) p.setX(i, p.getX(i) * halfAt(B, y, 1)); }
  g.computeVertexNormals();
}
/** a side profile (u, y points) pushed out across the car's width w, centred, nose toward −z */
function extrude(pts, w, bevel) {
  const s = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(u, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: w - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, steps: 1, curveSegments: 4 });
  g.rotateY(Math.PI / 2);                      // shape x (u) → −z, extrusion → +x
  g.translate(-(w - 2 * bevel) / 2, 0, 0);
  return g;
}
const tint = (g, c) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const boxAt = (x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
/** a thin strip from one point to another (a pillar), t thick across, d deep */
function strip(a, b, t, d) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const g = new THREE.BoxGeometry(d, len, t); g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}

const CACHE = {};
/** the three geometries of a body (paint, glass, trim) and its size */
export function bodyParts(kind) {
  if (CACHE[kind]) return CACHE[kind];
  const B = BODIES[kind], hw = B.W / 2, paint = [], glass = [], trim = [];
  // the lower body: along the bottom from the tail to the nose, arches over both wheels
  const ground = B.top[0][1], ar = B.r + 0.07, low = [B.top[B.top.length - 1]];
  const add = q => { const l = low[low.length - 1]; if (Math.abs(l[0] - q[0]) > 1e-4 || Math.abs(l[1] - q[1]) > 1e-4) low.push(q); };
  for (const c of [B.axle[1], B.axle[0]]) { add([c - ar, ground]); for (let i = 0; i <= 6; i++) { const a = Math.PI - i / 6 * Math.PI; add([c + Math.cos(a) * ar, Math.max(ground, B.r + Math.sin(a) * ar)]); } add([c + ar, ground]); }
  for (const q of B.top.slice(0, -1)) add(q);
  const body = extrude(low, B.W, 0.06); paint.push(body);
  // the glasshouse, a little inside the body at the belt, leaning in
  const gl = extrude(B.glass, B.W - 0.07, 0.03); lean(gl, B, hw); glass.push(gl);
  // the roof panel, the pillars
  const [gr, gf, rf, rr] = B.glass, ry = roofY(B);
  const roofG = extrude([[rr[0] + 0.03, ry - 0.06], [rf[0] - 0.02, ry - 0.06], [rf[0] - 0.06, ry + 0.012], [rr[0] + 0.06, ry + 0.012]], B.W - 0.06, 0.02);
  lean(roofG, B, hw); paint.push(roofG);
  for (const s of [-1, 1]) {
    const at = (u, y, k = 0.004) => new THREE.Vector3(s * (halfAt(B, y, hw - 0.035) + k), y, -u);
    paint.push(strip(at(gf[0] - 0.02, B.belt), at(rf[0], ry - 0.02), 0.05, 0.08));                    // A-pillar
    paint.push(strip(at(gr[0] + 0.02, B.belt), at(rr[0], ry - 0.02), 0.05, B.cpillar));               // C/D-pillar
    for (const u of B.pillars) { const g = boxAt(-0.04, B.belt - 0.02, -u - 0.06, 0.04, ry - 0.03, -u + 0.06); g.translate(s * (hw - 0.05), 0, 0); lean(g, B, hw); paint.push(g); }
    trim.push(tint(boxAt(s * (hw + 0.004), ground, -(B.axle[0] - ar - 0.02), s * (hw - 0.1), ground + 0.12, -(B.axle[1] + ar + 0.02)), '#1f1f1f'));   // the sill between the arches
    paint.push(boxAt(s * (hw - 0.02), B.belt + 0.04, -(gf[0] - 0.22), s * (hw + 0.16), B.belt + 0.17, -(gf[0] - 0.02)));  // mirror
    // the lamps, the plates
    const hu = faceU(B, B.head, 1), tu = faceU(B, B.tail, -1);
    trim.push(tint(boxAt(s * (hw - 0.62), B.head - 0.06, -hu + 0.07, s * (hw - 0.16), B.head + 0.06, -hu - 0.012), '#e6e4dc'));
    trim.push(tint(boxAt(s * (hw - 0.5), B.tail - 0.07, -tu - 0.07, s * (hw - 0.1), B.tail + 0.07, -tu + 0.012), '#8e1712'));
    // the wheels: tyre, rim; a dark well inside each arch
    for (const c of B.axle) {
      const ty = new THREE.CylinderGeometry(B.r, B.r, 0.22, 11); ty.rotateZ(Math.PI / 2); ty.translate(s * (hw - 0.13), B.r, -c); trim.push(tint(ty, '#141414'));
      const rim = new THREE.CylinderGeometry(B.r * 0.6, B.r * 0.6, 0.232, 7); rim.rotateZ(Math.PI / 2); rim.translate(s * (hw - 0.13), B.r, -c); trim.push(tint(rim, '#a4a6a7'));
    }
  }
  for (const c of B.axle) trim.push(tint(boxAt(-hw + 0.26, B.r - 0.05, -c - ar, hw - 0.26, B.r + ar - 0.02, -c + ar), '#0e0e0e'));
  const hu = faceU(B, B.head - 0.2, 1), tu = faceU(B, B.tail - 0.24, -1);
  trim.push(tint(boxAt(-hw + 0.55, B.head - 0.16, -hu + 0.05, hw - 0.55, B.head + 0.02, -hu - 0.012), '#1d1f20'));       // grille
  trim.push(tint(boxAt(-0.26, B.head - 0.36, -faceU(B, B.head - 0.3, 1) + 0.04, 0.26, B.head - 0.24, -faceU(B, B.head - 0.3, 1) - 0.01), '#e9e9e2'));
  trim.push(tint(boxAt(-0.26, B.tail - 0.3, -tu - 0.04, 0.26, B.tail - 0.18, -tu + 0.01), '#e9e9e2'));
  if (B.rails) for (const s of [-1, 1]) trim.push(tint(boxAt(s * (hw * 0.72) - 0.03, ry + 0.01, -(rf[0] - 0.1), s * (hw * 0.72) + 0.03, ry + 0.06, -(rr[0] + 0.1)), '#2a2a2a'));
  if (B.bed) trim.push(tint(boxAt(-hw + 0.12, B.belt - 0.004, -B.bed[1], hw - 0.12, B.belt + 0.006, -B.bed[0]), '#1b1b1b'));
  const out = { B, geo: { paint: mergeGeoms(paint), glass: mergeGeoms(glass), trim: mergeGeoms(trim) } };
  return CACHE[kind] = out;
}

/* ── the cars parked in the lots: recorded while the place is built, set down together at the end ── */
const COLOURS = [['#f1f1ee', 22], ['#18191b', 17], ['#b9bcbf', 15], ['#6e7174', 13], ['#8c1b1b', 8], ['#1f3550', 7], ['#4d6a85', 3], ['#c7bda6', 4], ['#2f3b2f', 2], ['#5a1e24', 3], ['#e7e5dd', 4], ['#a3742f', 2]];
const MIX = [['sedan', 40], ['suv', 26], ['compact', 13], ['pickup', 11], ['minivan', 10]];
const pick = (R, list) => { let t = R() * list.reduce((s, x) => s + x[1], 0); for (const [v, w] of list) { if ((t -= w) <= 0) return v; } return list[0][0]; };
export const pickKind = R => pick(R, MIX), pickColour = R => pick(R, COLOURS);
const FLEET = [];
/** a car parked at (x, z) of the builder's current frame, nose toward `face` (degrees clockwise from north) */
export function park(b, x, z, face, o = {}) {
  const R = rng(o.seed ?? ((x * 91 + z * 17) | 0)), kind = o.kind ?? pickKind(R), colour = o.color ?? pickColour(R), B = BODIES[kind];
  const m = b.m.clone().multiply(new THREE.Matrix4().makeRotationY(-face * Math.PI / 180).setPosition(x, 0, z));
  FLEET.push({ kind, colour, m });
  b.push(x, 0, z, face); b.solid(-B.W / 2, 0, -B.L / 2, B.W / 2, 1.5, B.L / 2); b.pop();
}
export function buildFleet(scene) {
  const by = {}, group = new THREE.Group(), mats = carMats(); group.name = 'parked cars';
  for (const c of FLEET) (by[c.kind] ||= []).push(c);
  for (const [kind, list] of Object.entries(by)) {
    const { geo } = bodyParts(kind);
    for (const k of ['paint', 'glass', 'trim']) {
      const im = new THREE.InstancedMesh(geo[k], mats[k], list.length);
      list.forEach((c, i) => { im.setMatrixAt(i, c.m); if (k === 'paint') im.setColorAt(i, new THREE.Color(c.colour)); });
      im.castShadow = k !== 'trim'; im.receiveShadow = true; im.computeBoundingSphere(); group.add(im);
    }
  }
  FLEET.length = 0; scene.add(group);
  return group;
}

/* ── cars that move: instanced too, placed again every frame; head and tail lamps after dark ── */
export function swarm(scene, specs) {
  const group = new THREE.Group(), mats = carMats(), slot = [], meshes = {};
  group.name = 'traffic'; scene.add(group);
  const count = {}; for (const s of specs) { slot.push([s.kind, count[s.kind] = (count[s.kind] ?? -1) + 1]); }
  for (const [kind, n] of Object.entries(count)) {
    const { geo } = bodyParts(kind); meshes[kind] = {};
    for (const k of ['paint', 'glass', 'trim']) { const im = new THREE.InstancedMesh(geo[k], mats[k], n + 1); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; group.add(im); meshes[kind][k] = im; }
  }
  specs.forEach((s, i) => { const [k, j] = slot[i]; meshes[k].paint.setColorAt(j, new THREE.Color(s.colour)); });
  const N = specs.length, lg = new THREE.PlaneGeometry(0.34, 0.11);
  const head = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2d2').multiplyScalar(4), toneMapped: false }), N * 2);
  const tail = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2414').multiplyScalar(2.2), toneMapped: false }), N * 2);
  for (const im of [head, tail]) { im.frustumCulled = false; im.visible = false; group.add(im); }
  const lamp = specs.map(s => { const B = BODIES[s.kind]; return { hz: -faceU(B, B.head, 1) - 0.02, hy: B.head, tz: -faceU(B, B.tail, -1) + 0.02, ty: B.tail, x: B.W / 2 - 0.39 }; });
  const m = new THREE.Matrix4(), l = new THREE.Matrix4(), flip = new THREE.Matrix4().makeRotationY(Math.PI);
  return {
    /** car i at (x, z), heading a (radians, clockwise from north) */
    set(i, x, z, a) {
      const [k, j] = slot[i]; m.makeRotationY(-a).setPosition(x, 0, z);
      for (const im of Object.values(meshes[k])) im.setMatrixAt(j, m);
      const L = lamp[i];
      for (const [s, n] of [[-1, 0], [1, 1]]) {
        l.makeTranslation(s * L.x, L.hy, L.hz).premultiply(m).multiply(flip); head.setMatrixAt(i * 2 + n, l);
        l.makeTranslation(s * L.x, L.ty, L.tz).premultiply(m); tail.setMatrixAt(i * 2 + n, l);
      }
    },
    commit() { for (const g of Object.values(meshes)) for (const im of Object.values(g)) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } head.instanceMatrix.needsUpdate = tail.instanceMatrix.needsUpdate = true; },
    setNight(n) { head.visible = tail.visible = n; },
  };
}
