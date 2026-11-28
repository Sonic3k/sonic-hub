/* Home in Torrance, 2019–2022, as a site of the South Bay world: what stands round 20606 Anza Ave that the map's
   tiles do not have, built by hand from anza.json (where each thing comes from, and what is guessed).

     · the alley behind the building, from Spencer to Emerald: the block wall along its east side with the trees of the
       next lots over it, its asphalt from that wall to the buildings with the concrete gutter down it and the aprons
       before the carports, the wooden poles and their wires; on its west the buildings' backs as Street View shows them
       — a carport under the floor above (teal posts, red-and-white bollards), closed garage doors, a plain wall — the
       iron gates between them, the bins by the way in; the car stands in one stall of his building's carport;
     · the grounds of the church on Emerald, where he parked by the kerb: the lawn, the row of light, open trees along
       the walk, the playground, the lot, the fence and hedge on the east, the planter at the corner, the poles;
     · the business park's front on Spencer by Earl, where he parked too: its clipped figs, its cabinet and low sign.

   Streets, walks, kerbs and the cars at the kerbs are the world's own (the tiles); so are the other buildings: the
   tiles build each carport building without the strip on the alley that is built here (data/world.py: CARPORTS). */
import * as THREE from 'three';
import { canvasTex, rng } from '../../engine/tex.js';
import { X, concTex, stuccoTex } from '../esa-el-segundo-2015/mat.js';
import { carGeo, CAR_COLOURS } from '../../engine/world/tiles.js';
import { plantMaterial, treeAt, shrubAt, hedgeBox, mergePlants } from '../../engine/plants.js';
import A from './anza.json';

const C = c => new THREE.Color(c), dk = (c, f) => C(c).multiplyScalar(f);
const WHITE = C('#f1f0ea'), FRAME = C('#f4f3ef'), IRON = C('#1d1f21'), GALV = C('#9ea3a6'), WOOD = C('#5d4636'), YELLOW = C('#e2b624'), RED = C('#c23a2e'),
  CONC = C('#ffffff'), BRICK = C('#9b4a36'), TAN = C('#c9b391'), BIN = { blue: C('#1f4fa0'), green: C('#2f5a35') }, DUMP = C('#6c7174'), LID = C('#3f4346');

/** a growing mesh: quads with a colour each (anticlockwise seen from the side they face); uv from the world, one
    repeat of the texture every `s` metres, unless the quad brings its own */
function Acc(s = 2) {
  const pos = [], nor = [], col = [], uv = [], idx = [];
  const A = {
    quad(a, b, c, d, k, uvs) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const i0 = pos.length / 3, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      [a, b, c, d].forEach((p, i) => {
        pos.push(p[0], p[1], p[2]); nor.push(nx, ny, nz); col.push(k.r, k.g, k.b);
        if (uvs) uv.push(uvs[2 * i], uvs[2 * i + 1]); else if (ay >= ax && ay >= az) uv.push(p[0] / s, p[2] / s); else if (ax >= az) uv.push(p[2] / s, p[1] / s); else uv.push(p[0] / s, p[1] / s);
      });
      idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    },
    tri(a, b, c, k) { A.quad(a, b, c, c, k); },
    /** a box; `skip`: faces left out, of 'xXyYzZ' (small letter: the low side) */
    box(x0, y0, z0, x1, y1, z1, k, skip = '') {
      if (!skip.includes('Y')) A.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], k);
      if (!skip.includes('y')) A.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], k);
      if (!skip.includes('x')) A.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], k);
      if (!skip.includes('X')) A.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], k);
      if (!skip.includes('z')) A.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], k);
      if (!skip.includes('Z')) A.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], k);
    },
    /** a vertical slab from (ax, az) to (bx, bz), t thick, from y0 to y1, with its top and ends; `along`: uv runs along
        it (u in metres / su, v in metres / sv) */
    slab(ax, az, bx, bz, y0, y1, t, k, su = 0, sv = 0, u0 = 0) {
      const L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * t / 2, nz = (bx - ax) / L * t / 2;
      const P = (x, z, sgn, y) => [x + nx * sgn, y, z + nz * sgn], uvs = su ? (a, b) => [a / su, y0 / sv, b / su, y0 / sv, b / su, y1 / sv, a / su, y1 / sv] : () => undefined;
      A.quad(P(ax, az, 1, y0), P(bx, bz, 1, y0), P(bx, bz, 1, y1), P(ax, az, 1, y1), k, uvs(u0, u0 + L));
      A.quad(P(bx, bz, -1, y0), P(ax, az, -1, y0), P(ax, az, -1, y1), P(bx, bz, -1, y1), k, uvs(u0 + L, u0));
      A.quad(P(ax, az, 1, y1), P(bx, bz, 1, y1), P(bx, bz, -1, y1), P(ax, az, -1, y1), k);
      A.quad(P(ax, az, -1, y0), P(ax, az, 1, y0), P(ax, az, 1, y1), P(ax, az, -1, y1), k);
      A.quad(P(bx, bz, 1, y0), P(bx, bz, -1, y0), P(bx, bz, -1, y1), P(bx, bz, 1, y1), k);
    },
    /** a post of `n` sides, radius r0 at its foot and r1 at its top */
    post(x, z, r0, r1, y0, y1, k, n = 8, cap = true) {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        A.quad([x + ca * r0, y0, z - sa * r0], [x + cb * r0, y0, z - sb * r0], [x + cb * r1, y1, z - sb * r1], [x + ca * r1, y1, z - sa * r1], k);
        if (cap) A.tri([x, y1, z], [x + ca * r1, y1, z - sa * r1], [x + cb * r1, y1, z - sb * r1], k);
      }
    },
    /** a thin bar from p to q (a wire, a rail), w by w */
    bar(p, q, w, k) {
      const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], L = Math.hypot(dx, dy, dz) || 1, u = [dx / L, dy / L, dz / L];
      const up = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], s = [u[1] * up[2] - u[2] * up[1], u[2] * up[0] - u[0] * up[2], u[0] * up[1] - u[1] * up[0]], sl = Math.hypot(...s);
      const e1 = s.map(v => v / sl * w / 2), e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
      const c = (o, i, j) => [o[0] + e1[0] * i + e2[0] * j, o[1] + e1[1] * i + e2[1] * j, o[2] + e1[2] * i + e2[2] * j];
      for (const [i0, j0, i1, j1] of [[1, 1, -1, 1], [-1, 1, -1, -1], [-1, -1, 1, -1], [1, -1, 1, 1]]) A.quad(c(p, i0, j0), c(p, i1, j1), c(q, i1, j1), c(q, i0, j0), k);
    },
    /** a flat polygon (x, z points) at height y, facing up */
    poly(pts, y, k) {
      const v = pts.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(v, []);
      for (const [a, b, c] of tris) {
        const P = i => [pts[i][0], y, pts[i][1]], cr = (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
        if (cr < 0) A.tri(P(a), P(b), P(c), k); else A.tri(P(a), P(c), P(b), k);
      }
    },
    /** a band w wide along a line of (x, z) points, at height y */
    band(line, w, y, k) {
      for (let i = 0; i + 1 < line.length; i++) {
        const [ax, az] = line[i], [bx, bz] = line[i + 1], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * w / 2, nz = (bx - ax) / L * w / 2;
        A.quad([ax - nx, y, az - nz], [bx - nx, y, bz - nz], [bx + nx, y, bz + nz], [ax + nx, y, az + nz], k);   // (seen from above: left edge, then right)
      }
      for (let i = 1; i + 1 < line.length; i++) A.post(line[i][0], line[i][1], w / 2, w / 2, y - 0.001, y, k, 10);   // (the joints)
    },
    mesh(mat, name, cast = true) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); return m;
    },
  };
  return A;
}

/* ── pictures ── */
/** a slump-block wall: courses of 4 in, blocks of 16 in, their faces bulging and rough · 1.6 m × 0.8 m */
const blockTex = () => canvasTex(512, 256, (g, w, h) => {
  const R = rng(23); g.fillStyle = '#8e7f69'; g.fillRect(0, 0, w, h);
  const bw = w / 4, bh = h / 8;
  for (let r = 0; r < 8; r++) for (let i = -1; i < 4; i++) {
    const x = i * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = 0.92 + R() * 0.16, base = [205 * v, 186 * v, 155 * v];
    const gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, `rgb(${base.map(c => Math.min(255, c * 1.08) | 0)})`); gr.addColorStop(0.55, `rgb(${base.map(c => c | 0)})`); gr.addColorStop(1, `rgb(${base.map(c => c * 0.78 | 0)})`);
    g.fillStyle = gr; g.beginPath(); g.roundRect(x + 2, y + 2, bw - 4, bh - 3.5, 7); g.fill();
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${R() < 0.5 ? '60,45,30' : '255,245,225'},${(R() * 0.18).toFixed(2)})`; g.fillRect(x + 3 + R() * (bw - 6), y + 3 + R() * (bh - 6), 1 + R() * 2, 1 + R() * 2); }
  }
}, { aniso: 8 });
/** chain-link: galvanized wire in diamonds, the rest clear · 0.6 m */
const linkTex = () => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(176,182,186,1)'; g.lineWidth = 2.2;
  for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(k * w / 4, 0); g.lineTo(k * w / 4 + h, h); g.stroke(); g.beginPath(); g.moveTo(k * w / 4, h); g.lineTo(k * w / 4 + h, 0); g.stroke(); }
});
/** a window's glass: the room behind dim, a curtain or blind in some · 1 window */
const glassTex = () => canvasTex(128, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5d6d78'); gr.addColorStop(0.5, '#2c3840'); gr.addColorStop(1, '#1d262c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(230,226,214,0.55)'; for (let i = 0; i < 14; i++) g.fillRect(4 + i * 9, 0, 6, h * 0.92);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(0, h * 0.1); g.lineTo(w * 0.45, 0); g.lineTo(w * 0.75, 0); g.lineTo(0, h * 0.5); g.fill();
}, { repeat: false });

export function buildAnza({ scene }) {
  const al = A.alley, P = A.park, S = A.spencer, R = rng(7);
  const stucco = new THREE.MeshStandardMaterial({ map: stuccoTex('#f2efe8', 6), vertexColors: true, roughness: 0.95 });
  const concM = new THREE.MeshStandardMaterial({ map: concTex('#d6d1c6', 4, false), vertexColors: true, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const walkM = new THREE.MeshStandardMaterial({ map: concTex('#cfc9bd', 4, true), vertexColors: true, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const asph = X.asphalt('#4d4c49', 9).clone(); asph.polygonOffset = true; asph.polygonOffsetFactor = -1; asph.polygonOffsetUnits = -1;   // (the alley's is old and pale, Street View)
  const blockM = new THREE.MeshStandardMaterial({ map: blockTex(), vertexColors: true, roughness: 0.96 });
  const plainM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 });
  const woodM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const glassM = new THREE.MeshStandardMaterial({ map: glassTex(), roughness: 0.12, metalness: 0.35 });
  const lawnM = X.lawn().clone(); lawnM.polygonOffset = true; lawnM.polygonOffsetFactor = -1; lawnM.polygonOffsetUnits = -1;
  const chipsM = X.mulch().clone(); chipsM.polygonOffset = true; chipsM.polygonOffsetFactor = -3; chipsM.polygonOffsetUnits = -3;
  const gravelM = X.gravel().clone(); gravelM.polygonOffset = true; gravelM.polygonOffsetFactor = -1; gravelM.polygonOffsetUnits = -1;
  const linkT = linkTex(); linkT.repeat.set(1, 1);
  const linkM = new THREE.MeshStandardMaterial({ map: linkT, transparent: false, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
  const lampM = new THREE.MeshStandardMaterial({ color: '#f3ead2', emissive: '#ffe3a6', emissiveIntensity: 0, roughness: 0.4 });

  const ground = Acc(3), walls = Acc(3.2), block = Acc(1), metal = Acc(1), wood = Acc(1), glass = Acc(1), conc = Acc(2), walk = Acc(1.524), lawn = Acc(3), chips = Acc(1.5), gravel = Acc(1.5), link = Acc(0.6), lamps = Acc(1);
  const plants = [], cars = [];
  const at = (line, z) => {                                                          // x of a line of (x, z) points at z (it runs north–south)
    for (let i = 0; i + 1 < line.length; i++) { const [ax, az] = line[i], [bx, bz] = line[i + 1]; if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + (bx - ax) * (z - az) / (bz - az); }
    return z < line[0][1] ? line[0][0] : line[line.length - 1][0];
  };
  const wallNS = al.wall.filter(([, z], i) => i === 0 || z > al.wall[i - 1][1]);      // (the wall's run along the alley, before it turns east along Emerald)

  /* ── the alley: asphalt from the buildings to the wall, the gutter down it ── */
  const zA = al.west[0][1], zB = al.west[al.west.length - 1][1];
  for (let z = zA; z < zB - 0.01; z += 4) {
    const z2 = Math.min(zB, z + 4), w1 = at(al.west, z), w2 = at(al.west, z2), e1 = at(wallNS, z), e2 = at(wallNS, z2);
    ground.quad([w2, -0.02, z2], [e2, -0.02, z2], [e1, -0.02, z], [w1, -0.02, z], WHITE);
    const g1 = e1 - al.gutter, g2 = e2 - al.gutter, h = al.gutterW / 2;
    conc.quad([g2 - h, -0.012, z2], [g2 + h, -0.012, z2], [g1 + h, -0.012, z], [g1 - h, -0.012, z], dk('#ffffff', 0.84));
  }
  /* the block wall, its cap, and where it turns along Emerald */
  let run = 0;
  for (let i = 0; i + 1 < al.wall.length; i++) {
    const [ax, az] = al.wall[i], [bx, bz] = al.wall[i + 1], L = Math.hypot(bx - ax, bz - az);
    block.slab(ax, az, bx, bz, -0.05, al.wallH, 0.2, dk('#ffffff', 1), 1.6, 0.8, run);
    block.slab(ax, az, bx, bz, al.wallH, al.wallH + 0.07, 0.27, dk('#ffffff', 1.04), 1.6, 0.8, run);
    run += L;
  }
  const [nx0, nz0] = al.wall[0]; block.box(nx0 - 0.25, -0.05, nz0 - 0.05, nx0 + 0.25, al.wallH + 0.25, nz0 + 0.45, dk('#ffffff', 1));    // the pier at its end on Spencer
  wood.box(nx0 - 0.3, al.wallH + 0.25, nz0 - 0.1, nx0 + 0.3, al.wallH + 0.33, nz0 + 0.5, BRICK);
  /* creeper over it where the pictures show it, and the trees of the lots beyond */
  for (const [za, zb] of al.creeper) { const x = at(wallNS, (za + zb) / 2); plants.push(hedgeBox({ x0: x - 0.42, y0: 0.15, z0: za, x1: x - 0.1, y1: al.wallH + 0.22, z1: zb, seed: Math.round(za), tint: '#5d7f3a' })); }
  al.trees.forEach(([kind, x, z, h, r], i) => plants.push(treeAt(kind, { h, r, seed: 30 + i, at: [x, 0, z], tint: kind === 'gum' ? '#3f5f33' : undefined })));

  /* ── the buildings' backs on the alley ── */
  const homeFace = A.faces[A.home.face];
  const windowAt = (x, y0, y1, z0, z1, frameK = FRAME) => {                            // a window in a wall facing +x at x: frame proud of it, glass set in
    metal.box(x, y0 - 0.05, z0 - 0.05, x + 0.07, y0 + 0.02, z1 + 0.05, frameK); metal.box(x, y1 - 0.02, z0 - 0.05, x + 0.07, y1 + 0.05, z1 + 0.05, frameK);
    metal.box(x, y0, z0 - 0.05, x + 0.07, y1, z0 + 0.02, frameK); metal.box(x, y0, z1 - 0.02, x + 0.07, y1, z1 + 0.05, frameK); metal.box(x, y0, (z0 + z1) / 2 - 0.02, x + 0.06, y1, (z0 + z1) / 2 + 0.02, frameK);
    glass.quad([x + 0.02, y0, z1], [x + 0.02, y0, z0], [x + 0.02, y1, z0], [x + 0.02, y1, z1], WHITE, [0, 0, 1, 0, 1, 1, 0, 1]);
  };
  const windowsRow = (x, y0, y1, z0, z1, every, w) => { const n = Math.max(1, Math.floor((z1 - z0) / every)), step = (z1 - z0) / n; for (let k = 0; k < n; k++) { const zc = z0 + step * (k + 0.5); windowAt(x, y0, y1, zc - w / 2, zc + w / 2); } };
  const bollard = (x, z) => { metal.post(x, z, 0.09, 0.09, 0, 0.62, RED, 10); metal.post(x, z, 0.091, 0.091, 0.62, 0.74, WHITE, 10, false); metal.post(x, z, 0.09, 0.09, 0.74, 0.92, RED, 10); };
  for (const f of A.faces) {
    const x = f.x, z0 = f.z0, z1 = f.z1, h = f.h, L = z1 - z0, wallK = C(f.wall), trimK = C(f.trim), top = h;
    if (f.kind === 'carport') {
      const xb = x - f.depth, xs = xb - 0.4, yc = 2.45, n = f.stalls, sw = L / n, ROOF = C('#8a8880');   // (xs: where the tiles' building stops: data/world.py CARPORTS)
      conc.quad([xb, -0.015, z1], [x, -0.015, z1], [x, -0.015, z0], [xb, -0.015, z0], dk('#ffffff', 0.9));                 // its floor
      conc.quad([x, -0.012, z1], [x + al.apron, -0.012, z1], [x + al.apron, -0.012, z0], [x, -0.012, z0], WHITE);       // the apron before it
      walls.quad([xb, yc, z0], [x + 0.05, yc, z0], [x + 0.05, yc, z1], [xb, yc, z1], dk(f.wall, 0.82));                  // the ceiling of the stalls (looking down)
      walls.box(xb - 0.02, 0, z0, xb + 0.02, yc, z1, dk(f.wall, 0.86), 'yYzZx');                                          // the back wall, in the building's colour
      walls.box(x - 0.12, yc, z0, x + 0.05, top, z1, wallK, 'xy');                                                     // the floor above: its face on the alley
      walls.box(xs, 0, z0 - 0.18, x + 0.05, top, z0, wallK, 'y'); walls.box(xs, 0, z1, x + 0.05, top, z1 + 0.18, wallK, 'y');   // the two ends, closed to the ground
      walls.box(xs, yc, z0, xb, top, z1, wallK, 'yzZ');                                                                   // (what lies between the stalls' back and the tiles' building)
      walls.quad([xs, top + 0.01, z0 - 0.18], [xs, top + 0.01, z1 + 0.18], [x - 0.12, top + 0.01, z1 + 0.18], [x - 0.12, top + 0.01, z0 - 0.18], ROOF);   // its roof, as flat and grey as the tiles' over the rest
      metal.box(x + 0.05, top - 0.05, z0 - 0.5, x + 0.55, top, z1 + 0.5, dk(f.wall, 0.75));                               // the eave over the alley, and its fascia
      metal.box(x + 0.55, top - 0.32, z0 - 0.5, x + 0.62, top + 0.05, z1 + 0.5, trimK);
      for (let k = 1; k < n; k++) { const z = z0 + k * sw; metal.box(x - 0.22, 0, z - 0.08, x - 0.06, yc, z + 0.08, C(f.post)); bollard(x + 0.12, z); }   // posts between the stalls, a bollard before each
      for (let k = 0; k < n; k += 2) { const z = z0 + (k + 0.5) * sw; wood.box(xb + 0.02, 0, z - 0.45, xb + 0.06, 2.0, z + 0.45, dk('#8a6d52', 1)); }   // a storeroom's door at the back of every other stall
      for (let k = 1; k < n; k += 2) { const z = z0 + k * sw; lamps.box(x + 0.05, yc + 0.08, z - 0.09, x + 0.2, yc + 0.32, z + 0.09, WHITE); }
      windowsRow(x + 0.05, yc + 1.0, yc + 2.15, z0 + 0.6, z1 - 0.6, 3.1, 1.7);
      for (let k = 0; k < n; k++) {                                                    // cars nose in, in most of the stalls — not in his (it is his car that stands there)
        if (f === homeFace && k === A.home.stall) continue;
        if (R() < 0.35) continue;
        cars.push([x - 2.9, z0 + (k + 0.5) * sw, Math.PI / 2, (R() * CAR_COLOURS.length) | 0]);
      }
    } else if (f.kind === 'garages' || f.kind === 'plain') {
      const fx = x + 0.04;                                                            // a skin a few centimetres off the tiles' wall
      if (f.new) {                                                                     // a building the map does not have: all of it
        const [cx0, cx1, cz0, cz1] = f.court, w0 = f.west;
        walls.box(w0, 0, z0, x, h, z1, wallK, 'yY');
        const ck = dk(f.wall, 0.92);                                                   // the courtyard's walls, facing into it
        walls.quad([cx0, 0, cz1], [cx0, 0, cz0], [cx0, h, cz0], [cx0, h, cz1], ck); walls.quad([cx1, 0, cz0], [cx1, 0, cz1], [cx1, h, cz1], [cx1, h, cz0], ck);
        walls.quad([cx0, 0, cz0], [cx1, 0, cz0], [cx1, h, cz0], [cx0, h, cz0], ck); walls.quad([cx1, 0, cz1], [cx0, 0, cz1], [cx0, h, cz1], [cx1, h, cz1], ck);
        const ring = [[w0, z0], [x, z0], [x, z1], [w0, z1]], hole = [[cx0, cz0], [cx1, cz0], [cx1, cz1], [cx0, cz1]];
        const v = ring.map(([a, b]) => new THREE.Vector2(a, b)), hv = hole.map(([a, b]) => new THREE.Vector2(a, b)), all = [...ring, ...hole];
        for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(v, [hv])) { const p = i => [all[i][0], h, all[i][1]]; const cr = (all[b][0] - all[a][0]) * (all[c][1] - all[a][1]) - (all[b][1] - all[a][1]) * (all[c][0] - all[a][0]); if (cr < 0) walls.tri(p(a), p(b), p(c), dk('#9a9a96', 1)); else walls.tri(p(a), p(c), p(b), dk('#9a9a96', 1)); }
        const rf = C(f.roof), e = 1.3;                                                 // a mansard of red tile all round its outside
        wood.quad([w0 - 0.4, h - 0.2, z1 + 0.4], [x + 0.4, h - 0.2, z1 + 0.4], [x - e, h + 0.8, z1 - e], [w0 + e, h + 0.8, z1 - e], rf);
        wood.quad([x + 0.4, h - 0.2, z0 - 0.4], [w0 - 0.4, h - 0.2, z0 - 0.4], [w0 + e, h + 0.8, z0 + e], [x - e, h + 0.8, z0 + e], rf);
        wood.quad([x + 0.4, h - 0.2, z1 + 0.4], [x + 0.4, h - 0.2, z0 - 0.4], [x - e, h + 0.8, z0 + e], [x - e, h + 0.8, z1 - e], rf);
        wood.quad([w0 - 0.4, h - 0.2, z0 - 0.4], [w0 - 0.4, h - 0.2, z1 + 0.4], [w0 + e, h + 0.8, z1 - e], [w0 + e, h + 0.8, z0 + e], rf);
        const fl = (h - 0.6) / f.storeys;
        for (let s = 1; s < f.storeys; s++) {                                          // its windows on the other three sides
          const GL = dk('#2d3b45', 1);
          for (let zc = z0 + 3; zc < z1 - 2; zc += 4.2) metal.box(w0 - 0.05, s * fl + 0.9, zc - 0.8, w0 + 0.01, s * fl + 2.1, zc + 0.8, GL);
          for (let xc = w0 + 3; xc < x - 3; xc += 4.4) for (const zz of [z0, z1]) metal.box(xc - 0.8, s * fl + 0.9, zz - 0.05, xc + 0.8, s * fl + 2.1, zz + 0.05, GL);
        }
      }
      if (f.new) walls.box(fx - 0.03, 0, z0, fx, h - 0.2, z1, wallK, 'xyYzZ');
      else {                                                                           // the strip of it the tiles leave out (data/world.py CARPORTS): its face on the alley, its ends, its roof
        walls.box(x - 0.5, 0, z0, fx, h, z1, wallK, 'xyY');
        walls.quad([x - 0.5, h + 0.01, z0], [x - 0.5, h + 0.01, z1], [fx, h + 0.01, z1], [fx, h + 0.01, z0], C('#8a8880'));
      }
      metal.box(fx, h - 0.45, z0 - 0.1, fx + 0.1, h - 0.1, z1 + 0.1, trimK);             // its band under the roof
      const storeys = f.storeys, fl = (h - 0.6) / storeys;
      if (f.kind === 'garages') {
        const n = f.bays, bw = L / n;
        conc.quad([x, -0.012, z1], [x + al.apron, -0.012, z1], [x + al.apron, -0.012, z0], [x, -0.012, z0], WHITE);
        for (let k = 0; k < n; k++) { const za = z0 + k * bw + 0.3, zb = z0 + (k + 1) * bw - 0.3; metal.box(fx, 0, za, fx + 0.05, 2.15, zb, C(f.doors)); for (let j = 1; j < 4; j++) metal.box(fx + 0.05, j * 0.54, za + 0.05, fx + 0.07, j * 0.54 + 0.03, zb - 0.05, dk(f.doors, 0.85)); }
        for (let s = 1; s < storeys; s++) windowsRow(fx, s * fl + 0.95, s * fl + 2.05, z0 + 0.4, z1 - 0.4, 3.4, 1.6);
      } else {
        for (let s = 0; s < storeys; s++) windowsRow(fx, s * fl + 0.95, s * fl + 2.05, z0 + 0.6, z1 - 0.6, 4.6, 1.5);
        for (let z = z0 + 2.2; z < z1 - 1; z += 4.6) metal.box(fx, 0.1, z - 0.25, fx + 0.03, 0.38, z + 0.25, dk('#6f6f6a', 1));   // vents at its foot
      }
    }
  }
  /* his building's front on Anza (a skin on the tiles' wall, facing west): siding over a brick base, the windows with
     their red shutters, the grey roof's lower slope, the way in under its canopy; the lawn and hedges before it */
  { const F = A.front, H = F.h, fl = (H - 0.6) / F.storeys, SID = C(F.siding), BR = C(F.brick), SH = C(F.shutter), RF = C(F.roof);
    for (const [fx0, za, zb] of F.segs) {
      const fx = fx0 - 0.04, W = (y0, y1, z0, z1, k) => walls.quad([fx, y0, za + z0], [fx, y0, za + z1], [fx, y1, za + z1], [fx, y1, za + z0], k);   // (facing west: z runs to the left)
      W(0, 1.0, 0, zb - za, BR); W(1.0, H - 0.2, 0, zb - za, SID);
      wood.quad([fx - 0.5, H - 0.25, za], [fx - 0.5, H - 0.25, zb], [fx + 1.1, H + 0.9, zb - 1.1], [fx + 1.1, H + 0.9, za + 1.1], RF);   // the roof's lower slope over the eave
      for (let s = 0; s < F.storeys; s++) for (let z = za + 2.2; z < zb - 1.6; z += 3.6) {
        if (Math.abs(z - F.entry) < 2.4) continue;
        const y0 = s * fl + 0.95, y1 = s * fl + 2.05, z0 = z - 0.65, z1 = z + 0.65;
        glass.quad([fx - 0.02, y0, z0], [fx - 0.02, y0, z1], [fx - 0.02, y1, z1], [fx - 0.02, y1, z0], WHITE, [1, 0, 0, 0, 0, 1, 1, 1]);
        metal.box(fx - 0.07, y0 - 0.05, z0 - 0.05, fx, y1 + 0.05, z0 + 0.03, FRAME); metal.box(fx - 0.07, y0 - 0.05, z1 - 0.03, fx, y1 + 0.05, z1 + 0.05, FRAME);
        metal.box(fx - 0.07, y0 - 0.05, z0, fx, y0 + 0.02, z1, FRAME); metal.box(fx - 0.07, y1 - 0.02, z0, fx, y1 + 0.05, z1, FRAME);
        for (const zs of [z0 - 0.5, z1 + 0.1]) metal.box(fx - 0.06, y0, zs, fx, y1, zs + 0.4, SH);
      }
    }
    const ez = F.entry, ex = F.segs[1][0] - 0.04;                                       // the way in: brick piers, a gabled canopy, steps
    for (const dz of [-1.3, 1.3]) walls.box(ex - 2.2, 0, ez + dz - 0.22, ex - 1.76, 2.6, ez + dz + 0.22, BR);
    wood.quad([ex - 2.5, 2.6, ez + 1.7], [ex, 2.6, ez + 1.7], [ex, 3.4, ez], [ex - 2.5, 3.4, ez], dk('#4a3426', 1)); wood.quad([ex, 2.6, ez - 1.7], [ex - 2.5, 2.6, ez - 1.7], [ex - 2.5, 3.4, ez], [ex, 3.4, ez], dk('#4a3426', 1));
    for (let k = 0; k < 3; k++) conc.box(ex - 2.4 + k * 0.32, 0, ez - 1.0, ex - 1.76, 0.17 * (k + 1), ez + 1.0, dk('#ffffff', 0.92));
    lawn.poly(F.yard, 0.08, WHITE);
    plants.push(hedgeBox({ x0: F.segs[0][0] - 1.2, y0: 0.08, z0: F.segs[0][1] + 0.6, x1: F.segs[0][0] - 0.3, y1: 0.95, z1: F.entry - 2.3, seed: 61 }));
    plants.push(hedgeBox({ x0: F.segs[1][0] - 1.2, y0: 0.08, z0: F.entry + 2.3, x1: F.segs[1][0] - 0.3, y1: 0.95, z1: F.segs[1][2] - 0.6, seed: 62 }));
  }

  /* between the buildings: iron gates, the bins by the way in, a bollard or two */
  for (const g of A.gaps) {
    const x = g.x, za = g.z0 + 0.05, zb = g.z1 - 0.05, H = 1.85, K = g.fence === 'iron' ? IRON : GALV;
    metal.box(x - 0.04, 0, za, x + 0.04, H + 0.15, za + 0.08, K); metal.box(x - 0.04, 0, zb - 0.08, x + 0.04, H + 0.15, zb, K);
    for (const y of [0.12, H - 0.1]) metal.box(x - 0.025, y, za, x + 0.025, y + 0.05, zb, K);
    for (let z = za + 0.12; z < zb - 0.08; z += g.fence === 'iron' ? 0.12 : 0.1) metal.box(x - 0.012, 0.05, z - 0.012, x + 0.012, H + (g.fence === 'iron' ? 0.08 : 0), z + 0.012, K);
    if (g.gate) { const zm = (za + zb) / 2; metal.box(x - 0.035, 0, zm - 0.04, x + 0.035, H + 0.1, zm + 0.04, K); metal.box(x - 0.03, H * 0.5, za + 0.1, x + 0.03, H * 0.5 + 0.04, zb - 0.1, K); }
    for (let k = 0; k < g.bollards; k++) bollard(x + 0.9, za + (zb - za) * (k + 1) / (g.bollards + 1));
    for (const [c, bx, bz] of g.bins) { metal.box(bx - 0.3, 0.06, bz - 0.36, bx + 0.3, 1.0, bz + 0.36, BIN[c]); metal.box(bx - 0.34, 1.0, bz - 0.38, bx + 0.32, 1.06, bz + 0.38, dk(BIN[c].getStyle(), 0.8)); metal.post(bx + 0.27, bz - 0.3, 0.06, 0.06, 0, 0.12, IRON, 8); metal.post(bx + 0.27, bz + 0.3, 0.06, 0.06, 0, 0.12, IRON, 8); }
    for (const [dx, dz] of g.dumpsters || []) {                                     // a steel bin a truck lifts: tapered, a lid in two halves
      metal.box(dx - 0.6, 0.15, dz - 0.95, dx + 0.6, 1.2, dz + 0.95, DUMP); metal.box(dx - 0.66, 1.2, dz - 0.98, dx + 0.62, 1.27, dz + 0.98, LID);
      metal.box(dx + 0.6, 0.75, dz - 0.7, dx + 0.68, 0.85, dz + 0.7, DUMP); for (const zz of [dz - 0.7, dz + 0.7]) for (const xx of [dx - 0.45, dx + 0.45]) metal.post(xx, zz, 0.07, 0.07, 0, 0.15, IRON, 6);
    }
  }
  /* the poles down the west side of the alley, and their wires */
  const poleX = z => at(al.west, z) + 0.55, tops = [];
  for (const z of al.poles) {
    const x = poleX(z); wood.post(x, z, 0.15, 0.11, 0, 11.2, WOOD, 10);
    metal.post(x, z, 0.155, 0.155, 0.35, 0.5, YELLOW, 10, false); metal.post(x, z, 0.152, 0.152, 1.0, 1.15, YELLOW, 10, false);
    wood.box(x - 1.25, 10.35, z - 0.06, x + 1.25, 10.5, z + 0.06, WOOD); wood.box(x - 0.6, 8.6, z - 0.05, x + 0.6, 8.72, z + 0.05, WOOD);
    for (const dx of [-1.1, 0, 1.1]) metal.post(x + dx, z, 0.035, 0.035, 10.5, 10.68, GALV, 6);
    if (Math.round(z) % 3 === 0) metal.post(x - 0.35, z, 0.26, 0.26, 7.6, 8.5, GALV, 10);                               // a can on some
    tops.push([x, z]);
  }
  const wire = (p, q, sag, k = IRON) => { const n = 8; let a = p; for (let i = 1; i <= n; i++) { const t = i / n, b = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t - sag * 4 * t * (1 - t), p[2] + (q[2] - p[2]) * t]; metal.bar(a, b, 0.018, k); a = b; } };
  for (let i = 0; i + 1 < tops.length; i++) {
    const [ax, az] = tops[i], [bx, bz] = tops[i + 1];
    for (const dx of [-1.1, 0, 1.1]) wire([ax + dx, 10.66, az], [bx + dx, 10.66, bz], 0.45);
    for (const dx of [-0.5, 0.5]) wire([ax + dx, 8.55, az], [bx + dx, 8.55, bz], 0.6);
  }

  /* ── the church's grounds on Emerald ── */
  lawn.poly(P.lawn, 0.07, WHITE);
  ground.poly(P.lot, -0.018, dk('#ffffff', 0.96));
  for (const line of P.paths) walk.band(line, 1.8, 0.1, WHITE);
  walk.poly(P.plaza, 0.1, dk('#e9d6c0', 1));
  chips.poly(P.playground, 0.11, WHITE);
  P.row.forEach(([x, z, h, r], i) => plants.push(treeAt('round', { h, r, seed: 60 + i, at: [x, 0.07, z], tint: '#8fa859', cards: 70 })));   // the row along the walk: light, open crowns
  P.trees.forEach(([kind, x, z, h, r], i) => plants.push(treeAt(kind, { h, r, seed: 80 + i, at: [x, 0.07, z] })));
  P.shrubs.forEach(([x, z], i) => plants.push(shrubAt({ r: 0.8 + (i % 3) * 0.15, seed: 90 + i, at: [x, 0.07, z] })));
  { const [[hx, hz0], [, hz1]] = P.hedge; plants.push(hedgeBox({ x0: hx - 0.55, y0: 0.07, z0: hz0, x1: hx + 0.55, y1: 1.4, z1: hz1, seed: 41 })); }
  { const [[fx, fz0], [, fz1]] = P.fence, H = P.fenceH;                                // the tall chain-link fence on the east
    for (let z = fz0; z <= fz1 + 0.01; z += 3) metal.post(fx, z, 0.035, 0.035, 0, H + 0.05, GALV, 6);
    metal.bar([fx, H, fz0], [fx, H, fz1], 0.045, GALV);
    link.quad([fx, 0.05, fz1], [fx, 0.05, fz0], [fx, H, fz0], [fx, H, fz1], WHITE, [fz1 / 0.6, 0.05 / 0.6, fz0 / 0.6, 0.05 / 0.6, fz0 / 0.6, H / 0.6, fz1 / 0.6, H / 0.6]);
  }
  { const [cx, cz] = P.corner;                                                       // the planter at the corner, its flowers, the pillar with its plaque
    walls.box(cx + 0.4, 0.07, cz - 1.1, cx + 3.0, 0.62, cz - 0.1, BRICK);
    for (let k = 0; k < 4; k++) plants.push(shrubAt({ r: 0.42, seed: 120 + k, at: [cx + 0.8 + k * 0.62, 0.6, cz - 0.6], tint: '#7b5bb8', gain: 1.25 }));
    walls.box(cx - 0.25, 0.07, cz - 1.5, cx + 0.25, 1.75, cz - 1.0, TAN); wood.box(cx - 0.32, 1.75, cz - 1.57, cx + 0.32, 1.85, cz - 0.93, BRICK);
    metal.box(cx + 0.25, 0.9, cz - 1.42, cx + 0.27, 1.45, cz - 1.08, dk('#4a3a28', 1));
  }
  { const [gx, gz] = P.goal, w = 1.6, H = 1.6;                                         // a small goal on the lawn, its mouth to the north
    for (const px of [gx - w, gx + w]) metal.post(px, gz, 0.04, 0.04, 0.07, H, WHITE, 6);
    metal.bar([gx - w, H, gz], [gx + w, H, gz], 0.08, WHITE); metal.bar([gx - w, 0.1, gz + 1.0], [gx + w, 0.1, gz + 1.0], 0.06, WHITE);
    for (const x of [gx - w, gx + w]) { metal.bar([x, H, gz], [x, 0.1, gz + 1.0], 0.06, WHITE); }
  }
  for (const [x, z] of P.lamps) { metal.post(x, z, 0.06, 0.05, 0.07, 4.3, dk('#2c2f31', 1), 8); metal.box(x - 0.2, 4.3, z - 0.2, x + 0.2, 4.4, z + 0.2, dk('#2c2f31', 1)); lamps.box(x - 0.15, 3.95, z - 0.15, x + 0.15, 4.3, z + 0.15, WHITE); }
  for (const [x, z] of P.tables) {                                                    // picnic tables
    wood.box(x - 0.9, 0.75, z - 0.38, x + 0.9, 0.8, z + 0.38, dk('#8d6a4a', 1));
    for (const s of [-1, 1]) { wood.box(x - 0.9, 0.44, z + s * 0.62 - 0.14, x + 0.9, 0.48, z + s * 0.62 + 0.14, dk('#8d6a4a', 1)); for (const dx of [-0.7, 0.7]) wood.box(x + dx - 0.04, 0.07, z + s * 0.5 - 0.04, x + dx + 0.04, 0.75, z + s * 0.5 + 0.04, dk('#5e4632', 1)); }
  }
  for (const [x, z, a] of P.benches) {
    const u = a ? [0, 1] : [1, 0], v = a ? [1, 0] : [0, 1], pt = (s, t) => [x + u[0] * s + v[0] * t, z + u[1] * s + v[1] * t];
    const [p0, p1] = [pt(-0.9, -0.2), pt(0.9, 0.2)]; wood.box(Math.min(p0[0], p1[0]), 0.43, Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), 0.48, Math.max(p0[1], p1[1]), dk('#8d6a4a', 1));
    const [q0, q1] = [pt(-0.9, 0.2), pt(0.9, 0.26)]; wood.box(Math.min(q0[0], q1[0]), 0.55, Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), 0.95, Math.max(q0[1], q1[1]), dk('#8d6a4a', 1));
    for (const s of [-0.75, 0.75]) { const q = pt(s, 0); metal.box(q[0] - 0.04, 0.07, q[1] - 0.04, q[0] + 0.04, 0.45, q[1] + 0.04, IRON); }
  }
  { // the play structure on the woodchips: posts, two decks, a roof, a slide; swings beside it
    const cx = 3298.5, cz = 8866.0, PO = dk('#6b4e36', 1), DECK = dk('#3a6b45', 1), ROOF = dk('#2f7f4f', 1), SL = dk('#e0b12a', 1);
    for (const dx of [-1.2, 1.2]) for (const dz of [-1.2, 1.2]) wood.post(cx + dx, cz + dz, 0.07, 0.07, 0.11, 3.1, PO, 6);
    for (const dx of [-1.2, 1.2]) for (const dz of [3.2]) wood.post(cx + dx, cz + dz, 0.07, 0.07, 0.11, 2.2, PO, 6);
    metal.box(cx - 1.3, 1.45, cz - 1.3, cx + 1.3, 1.55, cz + 1.3, DECK); metal.box(cx - 1.3, 0.95, cz + 1.3, cx + 1.3, 1.05, cz + 3.3, DECK);
    metal.quad([cx - 1.6, 3.1, cz + 1.6], [cx + 1.6, 3.1, cz + 1.6], [cx, 3.9, cz], [cx, 3.9, cz], ROOF); metal.quad([cx + 1.6, 3.1, cz - 1.6], [cx - 1.6, 3.1, cz - 1.6], [cx, 3.9, cz], [cx, 3.9, cz], ROOF);
    metal.quad([cx - 1.6, 3.1, cz - 1.6], [cx - 1.6, 3.1, cz + 1.6], [cx, 3.9, cz], [cx, 3.9, cz], ROOF); metal.quad([cx + 1.6, 3.1, cz + 1.6], [cx + 1.6, 3.1, cz - 1.6], [cx, 3.9, cz], [cx, 3.9, cz], ROOF);
    for (const s of [-0.38, 0.38]) metal.bar([cx + s, 1.6, cz - 1.3], [cx + s, 0.3, cz - 4.0], 0.07, SL);
    metal.quad([cx - 0.36, 0.25, cz - 4.0], [cx + 0.36, 0.25, cz - 4.0], [cx + 0.36, 1.5, cz - 1.3], [cx - 0.36, 1.5, cz - 1.3], SL);
    const sx = 3294.0, s0 = 8872.5, s1 = 8878.0;                                       // the swings: an A-frame each end, a beam, two seats
    for (const z of [s0, s1]) { metal.bar([sx - 1.1, 0.11, z], [sx, 2.6, z], 0.07, dk('#2a5e8a', 1)); metal.bar([sx + 1.1, 0.11, z], [sx, 2.6, z], 0.07, dk('#2a5e8a', 1)); }
    metal.bar([sx, 2.6, s0], [sx, 2.6, s1], 0.09, dk('#2a5e8a', 1));
    for (const z of [s0 + 1.6, s1 - 1.6]) { for (const dz of [-0.22, 0.22]) metal.bar([sx, 2.58, z + dz], [sx, 0.55, z + dz], 0.015, GALV); metal.box(sx - 0.12, 0.5, z - 0.25, sx + 0.12, 0.55, z + 0.25, IRON); }
  }
  /* the poles along Emerald's north side and their wires */
  const ptops = []; for (const x of P.poles) { const z = 9007.2; wood.post(x, z, 0.15, 0.11, 0.07, 11.4, WOOD, 10); wood.box(x - 0.06, 10.55, z - 1.25, x + 0.06, 10.7, z + 1.25, WOOD); ptops.push([x, z]); }
  for (let i = 0; i + 1 < ptops.length; i++) { const [ax, az] = ptops[i], [bx, bz] = ptops[i + 1]; for (const dz of [-1.1, 0, 1.1]) wire([ax, 10.82, az + dz], [bx, 10.82, bz + dz], 0.55); wire([ax, 8.9, az], [bx, 8.9, bz], 0.7); }

  /* ── across Emerald from the lawn: the self storage's wall, its band, the gravel bed before it ── */
  { const T = A.storage, z = T.z - 0.05;
    walls.quad([T.x1, 0, z], [T.x0, 0, z], [T.x0, T.h - 0.55, z], [T.x1, T.h - 0.55, z], C(T.wall));
    walls.quad([T.x1, T.h - 0.55, z - 0.04], [T.x0, T.h - 0.55, z - 0.04], [T.x0, T.h + 0.02, z - 0.04], [T.x1, T.h + 0.02, z - 0.04], C(T.band));
    gravel.poly(T.gravel, 0.06, WHITE);
    T.plants.forEach(([x, gz, r], i) => plants.push(shrubAt({ r, seed: 160 + i, at: [x, 0.06, gz], tint: '#7e8f4c' })));
  }

  /* ── the business park's front on Spencer ── */
  lawn.poly(S.lawn, 0.07, WHITE);
  S.trees.forEach(([x, z], i) => plants.push(treeAt('fig', { h: 5.6 + (i % 3) * 0.4, r: 2.0 + (i % 2) * 0.25, seed: 140 + i, at: [x, 0.07, z] })));
  { const [[hx0, hz], [hx1]] = S.hedge; plants.push(hedgeBox({ x0: hx0, y0: 0.07, z0: hz - 0.45, x1: hx1, y1: 1.05, z1: hz + 0.45, seed: 52 })); }
  { const [x, z] = S.cabinet; metal.box(x - 0.55, 0.07, z - 0.3, x + 0.55, 1.55, z + 0.3, dk('#9aa69a', 1)); metal.box(x - 0.6, 0.07, z - 0.36, x + 0.6, 0.18, z + 0.36, dk('#a8a49a', 1)); }
  { const [x, z] = S.sign; walls.box(x - 1.3, 0.07, z - 0.25, x + 1.3, 0.95, z + 0.25, TAN); wood.box(x - 1.38, 0.95, z - 0.31, x + 1.38, 1.03, z + 0.31, dk('#b19b7c', 1)); }

  /* ── what is built, in meshes ── */
  const out = [ground.mesh(asph, 'anza ground', false), conc.mesh(concM, 'anza ground concrete', false), walk.mesh(walkM, 'anza ground walks', false), lawn.mesh(lawnM, 'anza ground lawn', false),
    chips.mesh(chipsM, 'anza ground chips', false), gravel.mesh(gravelM, 'anza ground gravel', false), block.mesh(blockM, 'anza walls block'), walls.mesh(stucco, 'anza walls'), wood.mesh(woodM, 'anza walls wood'),
    metal.mesh(plainM, 'anza fine metal'), glass.mesh(glassM, 'anza fine glass', false), link.mesh(linkM, 'anza fine fence', false), lamps.mesh(lampM, 'anza fine lamps', false)];
  const pm = new THREE.Mesh(mergePlants(plants), plantMaterial()); pm.name = 'anza trees'; pm.castShadow = true; pm.receiveShadow = false; pm.matrixAutoUpdate = false; out.push(pm);
  if (cars.length) {
    const cm = new THREE.InstancedMesh(carGeo(true), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25 }), cars.length), d = new THREE.Object3D();
    cars.forEach(([x, z, a, c], i) => { d.position.set(x, 0, z); d.rotation.set(0, a, 0); d.updateMatrix(); cm.setMatrixAt(i, d.matrix); cm.setColorAt(i, C(CAR_COLOURS[c])); });
    cm.name = 'anza fine cars'; cm.castShadow = true; cm.receiveShadow = true; cm.computeBoundingSphere(); out.push(cm);
  }
  for (const m of out) scene.add(m);
  return {
    setHour(id) { lampM.emissiveIntensity = id === 'toi' ? 1.6 : 0; },
    /** for the checks: his stall's middle, and the buildings' faces on the alley */
    stall: () => { const f = homeFace, sw = (f.z1 - f.z0) / f.stalls; return [f.x - 3.0, f.z0 + (A.home.stall + 0.5) * sw]; },
    faces: A.faces,
  };
}
