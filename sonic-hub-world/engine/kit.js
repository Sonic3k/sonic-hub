/* The building kit: everything in a place is boxes, cylinders and a few spheres, collected by material and merged
   into one mesh per material, so a whole home costs a few dozen draw calls. Boxes can register as solids: the
   walker collides with those (their footprint, when they stand between ankle and head height).

   A place that was drawn first and measured later need not move every number: it hands the builder a survey —
   { y(y), z(z), rigid } — and what is laid down on the drawing's grid lands where it was measured to be (see
   Builder.survey below; the place says what its own survey means). */
import * as THREE from 'three';

const _v = new THREE.Vector3();

/** Merge indexed geometries that carry position, normal and uv. */
export function mergeGeoms(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const col = list[0].attributes.color ? new Float32Array(nv * 3) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    pos.set(p.array, vo * 3); nor.set(n.array, vo * 3);
    if (u) uv.set(u.array, vo * 2);
    if (col && g.attributes.color) col.set(g.attributes.color.array, vo * 3);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
    else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** Give a box's faces UVs in metres (tile sizes tu × tv), with the grain along a world axis when asked. */
function boxUV(geo, w, h, d, tu, tv, grain, ox, oy, oz) {
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    let du, dv, ou, ov, swap;
    if (f < 2) { du = d; dv = h; ou = oz; ov = oy; swap = grain === 'y'; }
    else if (f < 4) { du = w; dv = d; ou = ox; ov = oz; swap = grain === 'z'; }
    else { du = w; dv = h; ou = ox; ov = oy; swap = grain === 'y'; }
    for (let i = f * 4; i < f * 4 + 4; i++) {
      const u = uv.getX(i) * du + ou, v = uv.getY(i) * dv + ov;
      if (swap) uv.setXY(i, v / tu, u / tv); else uv.setXY(i, u / tu, v / tv);
    }
  }
}

export class Builder {
  /** `survey` (optional): { y(y), z(z), rigid } — two rising functions from the drawing's grid to the measured place.
   *  With one, everything laid down goes through it:
   *  · heights always, point by point (a wardrobe drawn against a ceiling that proved lower shrinks with it) — except
   *    small round things, and anything laid down with { whole: true }, which move whole, so a clock stays round;
   *  · across the floor, what is built inside a frame (push) moves whole with the frame's origin — a sofa keeps its
   *    depth and stays against its wall; outside a frame, walls and long things (`shell`, or longer than `rigid`)
   *    are mapped point by point and small things move whole.
   *  `real = true` switches it off for a while: what is laid down then is already in measured metres. */
  constructor(shared, survey = null) {
    this.buckets = new Map();
    this.solids = shared ? shared.solids : [];
    this.stack = [new THREE.Matrix4()];
    this.anchor = [null];            // per frame: the drawn z of the outermost frame it stands in (null at the root or in a soft frame)
    this.noSolid = false;
    this.survey = survey; this.shell = false; this.real = false;
  }
  get m() { return this.stack[this.stack.length - 1]; }
  /** Work in a local frame: origin at (x,y,z), turned ry degrees clockwise seen from above. `soft`: only a shift of
   *  the numbers (a whole wing written in its own measure), not a thing that moves as one piece. */
  push(x = 0, y = 0, z = 0, ry = 0, soft = false) {
    const t = new THREE.Matrix4().makeRotationY(-ry * Math.PI / 180); t.setPosition(x, y, z);
    return this._enter(this.m.clone().multiply(t), soft);
  }
  /** the same, by a ready matrix (a spot a room left for something set down later) */
  pushM(m) { return this._enter(this.m.clone().multiply(m), false); }
  _enter(m, soft) {
    const a = this.anchor[this.anchor.length - 1];
    this.stack.push(m); this.anchor.push(a !== null ? a : soft ? null : m.elements[14]); return this;
  }
  pop() { this.stack.pop(); this.anchor.pop(); return this; }
  /** how far the survey moves a stretch z0…z1 of the current frame's world across the floor when it moves whole;
   *  null when it is to be mapped point by point */
  _dz(z0, z1, round) {
    const S = this.survey, a = this.anchor[this.anchor.length - 1];
    if (a !== null) return S.z(a) - a;
    if (!this.shell && (round || z1 - z0 <= S.rigid)) { const c = (z0 + z1) / 2; return S.z(c) - c; }
    return null;
  }
  /** where a point of the current frame really stands: [x, y, z] in the place */
  at(x, y, z) {
    _v.set(x, y, z).applyMatrix4(this.m);
    if (this.survey && !this.real) { const d = this._dz(_v.z, _v.z, true); return [_v.x, this.survey.y(_v.y), d === null ? this.survey.z(_v.z) : _v.z + d]; }
    return [_v.x, _v.y, _v.z];
  }
  /** the current frame moved to (x,y,z), as it really stands: a place for something set down later (pushM, applyMatrix4) */
  spot(x = 0, y = 0, z = 0) {
    const m = this.m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)), p = this.at(x, y, z);
    return m.setPosition(p[0], p[1], p[2]);
  }

  geo(mat, g, o = {}) {
    g.applyMatrix4(this.m);
    const S = this.survey;
    if (S && !this.real) {
      const a = g.attributes.position.array, n = a.length;
      let y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < n; i += 3) { const y = a[i + 1], z = a[i + 2]; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      const round = /Sphere|Cylinder|Torus|Circle/.test(g.type);
      const dz = this._dz(z0, z1, round);
      let dy = null; if ((round || o.whole) && y1 - y0 <= 0.5) { const c = (y0 + y1) / 2; dy = S.y(c) - c; }
      for (let i = 0; i < n; i += 3) { a[i + 1] = dy === null ? S.y(a[i + 1]) : a[i + 1] + dy; a[i + 2] = dz === null ? S.z(a[i + 2]) : a[i + 2] + dz; }
    }
    if (mat.isPlain) {              // a plain colour: painted on the vertices, so all such things share one material
      const n = g.attributes.position.count, a = new Float32Array(n * 3), c = mat.rgb;
      for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      mat = mat.mat;
    }
    const cast = o.cast !== false, recv = o.recv !== false;
    const key = mat.uuid + (cast ? 'c' : '') + (recv ? 'r' : '');
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, b = { mat, cast, recv, list: [] });
    b.list.push(g);
    return this;
  }
  /** A box by its two corners. o: uv [tu,tv] metres per repeat · uvw world-aligned · grain 'x'|'y'|'z' · solid · cast · recv */
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.uv) boxUV(g, w, h, d, o.uv[0], o.uv[1], o.grain, o.uvw ? x0 : 0, o.uvw ? y0 : 0, o.uvw ? z0 : 0);
    else if (o.grain) boxUV(g, w, h, d, 1, 1, o.grain, 0, 0, 0);
    g.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2);
    if (o.solid && !this.noSolid) this.solid(x0, y0, z0, x1, y1, z1);
    return this.geo(mat, g, o);
  }
  /** A box turned about its own centre (degrees clockwise from above). */
  rbox(mat, cx, cy, cz, w, h, d, ry = 0, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.uv) boxUV(g, w, h, d, o.uv[0], o.uv[1], o.grain, 0, 0, 0);
    if (o.rx) g.rotateX(o.rx * Math.PI / 180);
    if (o.rz) g.rotateZ(o.rz * Math.PI / 180);
    if (ry) g.rotateY(-ry * Math.PI / 180);
    g.translate(cx, cy, cz);
    return this.geo(mat, g, o);
  }
  /** An upright cylinder standing on y0. o: r2 top radius · seg · rx/rz tilt (deg) about its base centre · open */
  cyl(mat, cx, y0, cz, r, h, o = {}) {
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 14, 1, !!o.open);
    g.translate(0, h / 2, 0);
    if (o.rx) g.rotateX(o.rx * Math.PI / 180);
    if (o.rz) g.rotateZ(o.rz * Math.PI / 180);
    if (o.ry) g.rotateY(-o.ry * Math.PI / 180);
    g.translate(cx, y0, cz);
    return this.geo(mat, g, o);
  }
  /** A bar between two points (round when o.round, else square). */
  bar(mat, ax, ay, az, bx, by, bz, t = 0.02, o = {}) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
    const g = o.round ? new THREE.CylinderGeometry(t / 2, t / 2, len, o.seg ?? 8) : new THREE.BoxGeometry(t, len, o.t2 ?? t);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    g.applyQuaternion(q); g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    return this.geo(mat, g, o);
  }
  sphere(mat, cx, cy, cz, r, o = {}) {
    const g = new THREE.SphereGeometry(r, o.seg ?? 14, o.seg2 ?? Math.max(6, Math.round((o.seg ?? 14) * 0.7)));
    if (o.sx || o.sy || o.sz) g.scale(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    if (o.rz) g.rotateZ(o.rz * Math.PI / 180);
    if (o.rx) g.rotateX(o.rx * Math.PI / 180);
    g.translate(cx, cy, cz);
    return this.geo(mat, g, o);
  }
  /** A flat rectangle. axis: the direction its front faces ('+x','-x','+y','-y','+z','-z'); (cx,cy,cz) its centre; a × b its size. */
  quad(mat, axis, cx, cy, cz, a, b, o = {}) {
    const g = new THREE.PlaneGeometry(a, b, o.segA ?? 1, o.segB ?? 1);
    if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * a / o.uv[0], uv.getY(i) * b / o.uv[1]); }
    if (o.uvr) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * o.uvr[0] + (o.uvr[2] ?? 0), uv.getY(i) * o.uvr[1] + (o.uvr[3] ?? 0)); }
    if (o.wave) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * o.wave[0] + (o.wave[2] ?? 0)) * o.wave[1] * (o.waveTop != null ? (1 - o.waveTop * (p.getY(i) / b + 0.5)) : 1)); g.computeVertexNormals(); }
    if (axis === '+x') g.rotateY(Math.PI / 2); else if (axis === '-x') g.rotateY(-Math.PI / 2);
    else if (axis === '+y') g.rotateX(-Math.PI / 2); else if (axis === '-y') g.rotateX(Math.PI / 2);
    else if (axis === '-z') g.rotateY(Math.PI);
    if (o.ry) g.rotateY(-o.ry * Math.PI / 180);
    g.translate(cx, cy, cz);
    return this.geo(mat, g, o);
  }
  /** Register a footprint the walker cannot pass (in the current frame; kept as its world bounding box). */
  solid(x0, y0, z0, x1, y1, z1) {
    let ax = Infinity, az = Infinity, bx = -Infinity, bz = -Infinity, ay = Infinity, by = -Infinity;
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
      _v.set(x, y, z).applyMatrix4(this.m);
      ax = Math.min(ax, _v.x); bx = Math.max(bx, _v.x); az = Math.min(az, _v.z); bz = Math.max(bz, _v.z); ay = Math.min(ay, _v.y); by = Math.max(by, _v.y);
    }
    const S = this.survey;
    if (S && !this.real) {
      const d = this._dz(az, bz, false);
      if (d === null) { az = S.z(az); bz = S.z(bz); } else { az += d; bz += d; }
      ay = S.y(ay); by = S.y(by);
    }
    this.solids.push({ x0: ax, x1: bx, z0: az, z1: bz, y0: ay, y1: by });
    return this;
  }
  /** Merge and add to a parent. Returns the meshes made. */
  build(parent) {
    const out = [];
    for (const b of this.buckets.values()) {
      if (!b.list.length) continue;
      const mesh = new THREE.Mesh(mergeGeoms(b.list), b.mat);
      mesh.castShadow = b.cast && !b.mat.userData.noCast; mesh.receiveShadow = b.recv && !b.mat.userData.noRecv;
      if (b.mat.transparent) mesh.renderOrder = b.mat.userData.order ?? 2;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh); out.push(mesh);
    }
    this.buckets.clear();
    return out;
  }
}

/** A group built with its own builder (things that are swapped by year, or move). `survey`: for a part laid down on
 *  the drawing's grid; leave it out for one built at a spot a room handed over, which is already real. */
export function part(parent, shared, fn, name, survey = null) {
  const g = new THREE.Group(); if (name) g.name = name;
  const b = new Builder(shared, survey);
  fn(b, g);
  b.build(g);
  parent.add(g);
  return g;
}
