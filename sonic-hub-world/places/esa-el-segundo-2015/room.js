/* His studio, upper floor, west face of the north wing: everything inside it. Every size and place comes from plan.js
   (IN), which was measured off the photographs of 21/9/2015 19:15 (from the door looking east; the bed; two of the north
   wall with the dresser, the TV, the mirror and the counter he worked at) and the iPhone pictures of 19/8 (breakfast at
   the counter), 18/9 (the counter and kitchen from the west, the bathroom door standing open) and 25/9 (the entry door
   open on the walkway, the closet behind it). The frame here: u runs east from the front wall, v south from the north
   wall, y up from the floor. */
import * as THREE from 'three';
import { M, plateTex, rng } from '../../engine/tex.js';
import { doorLeaf } from '../../engine/walls.js';
import { part } from '../../engine/kit.js';
import { curtain, papers, bottle } from '../../engine/furn.js';
import { X } from './mat.js';
import { ROOM, IN, CEIL, G2, flat } from './plan.js';

const D = () => ROOM.d, Wd = () => ROOM.w;
const BEIGE = '#d3be93', GREEN = '#55753c';

/* ── small drawn things ── */
const printTex = () => plateTex(128, 192, (g, w, h) => {     // the hotel print: a red door frame standing in a garden
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f4a24'); gr.addColorStop(0.45, '#4f6b3a'); gr.addColorStop(1, '#7c7a6a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const R = rng(5); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '40,80,30' : '120,150,80'},${R() * 0.5})`; g.beginPath(); g.arc(R() * w, R() * h * 0.6, 2 + R() * 5, 0, 7); g.fill(); }
  g.fillStyle = '#9d8f78'; g.fillRect(0, h * 0.82, w, h * 0.18);
  g.fillStyle = '#c4271d'; g.fillRect(w * 0.26, h * 0.16, w * 0.12, h * 0.68); g.fillRect(w * 0.62, h * 0.16, w * 0.12, h * 0.68); g.fillRect(w * 0.2, h * 0.12, w * 0.6, h * 0.08);
  g.fillStyle = '#5c6b58'; g.fillRect(w * 0.38, h * 0.2, w * 0.24, h * 0.62);
});
const clockTex = () => plateTex(64, 24, (g, w, h) => { g.fillStyle = '#101010'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff2a1a'; g.font = 'bold 17px monospace'; g.textBaseline = 'middle'; g.fillText('7:15', 8, 13); });
const screenTex = () => plateTex(256, 160, (g, w, h) => {    // the laptop's lock screen of 2015: a dark field crossed by coloured ribbons
  g.fillStyle = '#16131f'; g.fillRect(0, 0, w, h);
  const cols = ['#e8463a', '#f4a32c', '#3fb06b', '#2d8de0', '#9b4fd1', '#e85a9b'];
  for (let i = 0; i < 6; i++) { g.strokeStyle = cols[i]; g.lineWidth = 7; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(-10, h * (0.2 + i * 0.11)); g.bezierCurveTo(w * 0.3, h * (0.9 - i * 0.08), w * 0.6, h * (0.1 + i * 0.05), w + 10, h * (0.5 + i * 0.06)); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = '300 34px sans-serif'; g.fillText('7:15', 16, h - 34); g.font = '12px sans-serif'; g.fillText('Monday, September 21', 18, h - 16);
});
const badgeTex = () => plateTex(96, 140, (g, w, h) => { g.fillStyle = '#f7f7f5'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f5fae'; g.fillRect(0, h - 28, w, 28); g.fillStyle = '#9fb5d4'; g.fillRect(26, 22, 44, 52); g.fillStyle = '#222'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('ANH', w / 2, 92); g.fillText('VU', w / 2, 105); g.font = '8px sans-serif'; g.fillText('9/25/2015 6:00 PM', w / 2, 14); });
const mirrorTex = () => plateTex(96, 160, (g, w, h) => {   // what the mirror shows: the green bed wall, a dark frame, a lamp, the nightstand
  g.fillStyle = '#cbb894'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w * 0.45, 0); gr.addColorStop(0, '#53682f'); gr.addColorStop(1, '#6f8540'); g.fillStyle = gr; g.fillRect(0, 0, w * 0.42, h);
  g.fillStyle = '#e8dcc0'; g.fillRect(w * 0.42, 0, w * 0.04, h);
  g.fillStyle = '#231a15'; g.fillRect(w * 0.6, h * 0.12, w * 0.13, h * 0.5); g.fillStyle = '#d9cfbb'; g.fillRect(w * 0.62, h * 0.15, w * 0.09, h * 0.44);
  const lg = g.createRadialGradient(w * 0.2, h * 0.45, 2, w * 0.2, h * 0.45, 22); lg.addColorStop(0, 'rgba(255,250,235,1)'); lg.addColorStop(0.4, 'rgba(255,240,205,0.85)'); lg.addColorStop(1, 'rgba(255,240,205,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4f0e6'; g.fillRect(w * 0.12, h * 0.38, w * 0.15, h * 0.12);
  g.fillStyle = '#a8763e'; g.fillRect(0, h * 0.78, w * 0.4, h * 0.22); g.fillStyle = '#ece9e0'; g.fillRect(w * 0.08, h * 0.74, w * 0.16, h * 0.05);
  g.fillStyle = '#56585c'; g.fillRect(w * 0.55, h * 0.72, w * 0.28, h * 0.28);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, w, h);
});

const bathMirrorTex = () => plateTex(128, 160, (g, w, h) => {   // what the bathroom's mirror shows: the tub's tiled recess across the room, the curtain drawn back at the taps' end (on the left, as one stands at the basin)
  g.translate(w, 0); g.scale(-1, 1);
  g.fillStyle = '#b08a48'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, w, h * 0.09);                                                   // the ceiling
  g.fillStyle = '#c9b790'; g.fillRect(w * 0.24, h * 0.3, w * 0.5, h * 0.52);                                // the tiles, to above head height
  g.strokeStyle = 'rgba(120,100,70,0.35)'; g.lineWidth = 1;
  for (let i = 1; i < 9; i++) { g.beginPath(); g.moveTo(w * 0.24 + w * 0.5 * i / 9, h * 0.3); g.lineTo(w * 0.24 + w * 0.5 * i / 9, h * 0.82); g.stroke(); }
  for (let j = 1; j < 9; j++) { g.beginPath(); g.moveTo(w * 0.24, h * 0.3 + h * 0.52 * j / 9); g.lineTo(w * 0.74, h * 0.3 + h * 0.52 * j / 9); g.stroke(); }
  g.fillStyle = '#f2f1ec'; g.fillRect(w * 0.22, h * 0.82, w * 0.54, h * 0.07);                               // the tub's rim
  g.fillStyle = '#9a7a40'; g.fillRect(0, h * 0.09, w * 0.22, h * 0.91); g.fillStyle = '#a5844a'; g.fillRect(w * 0.76, h * 0.09, w * 0.24, h * 0.91);   // the walls at either hand, nearer and darker
  g.fillStyle = '#efeee8'; g.fillRect(w * 0.66, h * 0.22, w * 0.085, h * 0.64); g.fillStyle = 'rgba(160,160,150,0.5)'; for (let i = 0; i < 4; i++) g.fillRect(w * (0.672 + i * 0.02), h * 0.22, 1, h * 0.64);   // the curtain
  g.fillStyle = '#c9ccce'; g.fillRect(w * 0.22, h * 0.205, w * 0.54, 2);                                    // its rod
  g.fillStyle = '#5f4a38'; g.fillRect(0, h * 0.95, w, h * 0.05);
  const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(255,246,225,0.22)'); v.addColorStop(0.5, 'rgba(255,246,225,0.04)'); v.addColorStop(1, 'rgba(40,30,15,0.28)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
});
const glowTex = () => plateTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.5)'); r.addColorStop(0.6, 'rgba(255,255,255,0.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = r; g.fillRect(0, 0, w, h); });

/* ── soft and turned shapes ── */
/** a cushion: a ball squared off toward a box of w × h × d (e: how square in plan, ey: how flat above and below) */
const cushion = (w, h, d, e = 0.5, ey = 0.75, seg = 18) => {
  const g = new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7))), p = g.attributes.position, pw = (v, k) => Math.sign(v) * Math.pow(Math.abs(v), k);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, pw(p.getX(i), e) * w / 2, pw(p.getY(i), ey) * h / 2, pw(p.getZ(i), e) * d / 2);
  g.computeVertexNormals(); return g;
};
/** a profile [[radius, height]…] turned about the upright axis */
const turned = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
/** cloth hanging against something: w wide at its top edge (y = 0), w1 at the hem, h long, in soft upright folds */
const drape = (w, w1, h, folds = 3, depth = 0.014, thick = 0.02) => {
  const g = new THREE.BoxGeometry(1, h, thick, 20, 8, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), t = 0.5 - y / h;                           // t: 0 at the top, 1 at the hem
    p.setXYZ(i, x * (w + (w1 - w) * t), y - h / 2, p.getZ(i) + Math.sin(x * folds * 6.283 + t * 2.2) * depth * (0.25 + 0.75 * t));
  }
  g.computeVertexNormals(); return g;
};
/** a box of w × h × d eased to the radius r along its edges, k steps round each; its texture lies flat on every face,
    o.rep metres to a repeat. o.floor: the bottom edges stay sharp (a hem); o.z === false: the two ends are cut square;
    o.band: the texture's V runs once across d (a runner with a border down each side) */
const eased = (w, h, d, r, o = {}) => {
  const k = o.k || 4, per = o.rep || 0.5, S = 2 * k + 1, g = new THREE.BoxGeometry(w, h, d, S, S, S), p = g.attributes.position, uv = g.attributes.uv, nm = g.attributes.normal;
  const step = (t, len) => { const i = Math.round((t / len + 0.5) * S); return i <= k ? -len / 2 + r * i / k : len / 2 - r * (S - i) / k; };   // k steps round each end, one flat step between them
  const cl = (t, len) => Math.max(-len / 2 + r, Math.min(len / 2 - r, t)), v = new THREE.Vector3(), q = new THREE.Vector3(), face = (S + 1) * (S + 1);
  for (let i = 0; i < p.count; i++) {
    v.set(step(p.getX(i), w), step(p.getY(i), h), step(p.getZ(i), d));
    q.set(cl(v.x, w), o.floor ? Math.min(h / 2 - r, v.y) : cl(v.y, h), o.z === false ? v.z : cl(v.z, d));
    v.sub(q); if (v.lengthSq() > 1e-12) { v.setLength(r); nm.setXYZ(i, v.x / r, v.y / r, v.z / r); }
    v.add(q); p.setXYZ(i, v.x, v.y, v.z);
    const f = Math.floor(i / face) >> 1;                       // BoxGeometry's faces come as ±x, ±y, ±z
    if (o.band) uv.setXY(i, (f === 0 ? v.y : v.x) / per, v.z / d + 0.5); else uv.setXY(i, (f === 0 ? v.z : v.x) / per, (f === 1 ? v.z : v.y) / per);
  }
  return g;
};
/** a pillow: w × d in plan and h thick at its middle, thinning to a seam all round, its sides drawn in a little between the corners */
const pillow = (w, h, d, nu = 14, nv = 10) => {
  const pos = [], uv = [], idx = [];
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const a = Math.sin((i / nu - 0.5) * Math.PI), c = Math.sin((j / nv - 0.5) * Math.PI), fa = 1 - a * a, fc = 1 - c * c;       // closer rows toward the seam
      pos.push(a * w / 2 * (1 - 0.05 * fc), s * h / 2 * Math.pow(fa * fc, 0.4), c * d / 2 * (1 - 0.07 * fa)); uv.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const e = base + j * (nu + 1) + i, f = e + nu + 1; if (s > 0) idx.push(e, f, e + 1, e + 1, f, f + 1); else idx.push(e, e + 1, f, e + 1, f + 1, f); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
/** the outline of the rectangle x0..x1 × z0..z1 with its corners rounded to r, n steps a corner: [[x, z], …], turning from x toward z */
const rounded = (x0, x1, z0, z1, r, n = 6) => {
  const out = [];
  for (const [cx, cz, a0] of [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, 90], [x0 + r, z0 + r, 180], [x1 - r, z0 + r, 270]])
    for (let i = 0; i <= n; i++) { const a = (a0 + 90 * i / n) * Math.PI / 180; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return out;
};
/** a hollow sunk from that outline (its rim at y = 0): rings step down by `depth` and in by ins = [toward +x, toward -x, toward +z,
    toward -z] to a flat floor, steep at the rim and rounding into the floor. Seen from inside. Its texture lies flat, seen from above */
const hollow = (x0, x1, z0, z1, r, depth, ins, o = {}) => {
  const n = o.n ?? 6, k = o.k ?? 7, per = o.rep ?? 1, N = 4 * (n + 1), pos = [], uv = [], idx = [];
  for (let j = 0; j <= k; j++) {
    const a = j / k * Math.PI / 2, e = 1 - Math.cos(a), y = -depth * Math.sin(a);
    for (const [x, z] of rounded(x0 + ins[0] * e, x1 - ins[1] * e, z0 + ins[2] * e, z1 - ins[3] * e, r * (1 - 0.3 * e), n)) { pos.push(x, y, z); uv.push(x / per, z / per); }
  }
  const mid = pos.length / 3, mx = (x0 + ins[0] + x1 - ins[1]) / 2, mz = (z0 + ins[2] + z1 - ins[3]) / 2; pos.push(mx, -depth, mz); uv.push(mx / per, mz / per);
  for (let j = 0; j < k; j++) for (let i = 0; i < N; i++) { const A = j * N + i, B = j * N + (i + 1) % N; idx.push(A, A + N, B, B, A + N, B + N); }
  for (let i = 0; i < N; i++) idx.push(k * N + i, mid, k * N + (i + 1) % N);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
/** lay a shape's texture flat as seen from above, per metres to a repeat (for a bowl cast in a speckled top: the flecks run on) */
const flatUV = (g, per = 1) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / per, p.getZ(i) / per); return g; };
/** set a shape down in the builder's frame: tilted (o.rx, o.rz, degrees) about its own origin, then turned ry clockwise from above */
const set = (b, mat, g, x, y, z, ry = 0, o = {}) => { if (o.rx) g.rotateX(o.rx * Math.PI / 180); if (o.rz) g.rotateZ(o.rz * Math.PI / 180); if (ry) g.rotateY(-ry * Math.PI / 180); g.translate(x, y, z); return b.geo(mat, g, o); };

export function buildRoom(scene, shared, ctx) {
  const parts = {};
  // where one walks: the studio's floor and the threshold of its door
  flat(ROOM.x0, ROOM.z0, ROOM.x1, ROOM.z1, G2);
  flat(ROOM.x0 - 0.25, ROOM.z0 + IN.door[0] + 0.05, ROOM.x0 + 0.05, ROOM.z0 + IN.door[1] - 0.05, G2);
  const shade = ctx.lampMat('#fff2da', 1.6, 0.96, 0.05); shade.side = THREE.DoubleSide;        // a drum shade is seen from inside too
  const g = part(scene, shared, (b) => {
    b.push(ROOM.x0, G2, ROOM.z0);
    const d = D(), w = Wd(), bu = IN.bath.u0, bv = IN.bath.v0, K = IN.kitchen, C = IN.counter;
    const beige = X.roomWall(BEIGE), green = X.roomWall(GREEN), white = X.laminate(), oak = X.oak(), pine = X.pine(), lea = X.leather();
    const honey = M.wood('#b8762e', 0.15, 4);                  // the mirror's frame: the same oak, duller
    const plain = (c, r = 0.6, mt = 0) => M.plain(c, r, mt);
    const trim = plain('#efe8d8', 0.5), base = plain('#5f4a38', 0.6), plate = plain('#f4f2ec', 0.45);

    /* floor, ceiling, the walls this studio does not share with the hotel's shell */
    b.box(X.conc('#9a958c', 4, false), 0, -0.28, 0, d, -0.012, w, {});
    b.box(X.carpet(), 0, -0.012, 0, bu, 0, w, { uv: [1, 1], uvw: true, grain: 'z', cast: false });
    b.box(X.carpet(), bu, -0.012, 0, IN.vinyl, 0, bv, { uv: [1, 1], uvw: true, grain: 'z', cast: false });
    b.box(X.vinyl(), IN.vinyl, -0.012, 0, d, 0.002, bv, { uv: [1.2, 1.2], uvw: true, cast: false });
    b.box(plain('#8a7658', 0.4, 0.5), IN.vinyl - 0.015, 0, IN.cab.v1, IN.vinyl + 0.015, 0.005, bv, { cast: false });      // the strip where carpet meets vinyl
    { const cm = X.ceiling(); cm.shadowSide = THREE.FrontSide;                                                   // its shadow is its top's, so no light creeps in along the walls
      b.box(cm, -0.02, CEIL, -0.02, d + 0.02, CEIL + 0.3, w + 0.02, { uv: [1, 1], uvw: true }); }
    b.box(beige, -0.02, 0, -0.16, d + 0.12, CEIL + 0.3, 0, { solid: true });                          // north party wall
    b.box(green, -0.02, 0, w, bu, CEIL + 0.3, w + 0.16, { solid: true });                             // south: the bed wall, green
    b.box(beige, bu, 0, w, d + 0.12, CEIL + 0.3, w + 0.16, { solid: true });
    b.box(beige, d, 0, 0, d + 0.12, CEIL + 0.3, w, { solid: true });                                  // the back wall (plumbing behind it)
    // the bathroom box: its west face (with the print) and its north face (with the door), to the ceiling
    const [bd0, bd1] = IN.bathDoor;
    b.box(beige, bu, 0, bv + 0.1, bu + 0.1, CEIL, w, { solid: true });
    b.box(beige, bu, 0, bv, bd0, CEIL, bv + 0.1, { solid: true });
    b.box(beige, bd1, 0, bv, d, CEIL, bv + 0.1, { solid: true });
    b.box(beige, bd0, 2.03, bv, bd1, CEIL, bv + 0.1, {});
    for (const [u0, u1] of [[bd0 - 0.06, bd0], [bd1, bd1 + 0.06]]) b.box(trim, u0, 0, bv - 0.015, u1, 2.09, bv + 0.115, { cast: false });
    b.box(trim, bd0 - 0.06, 2.03, bv - 0.015, bd1 + 0.06, 2.09, bv + 0.115, { cast: false });
    b.box(plate, IN.bathSwitch.u - 0.058, IN.bathSwitch.y - 0.057, bv - 0.008, IN.bathSwitch.u + 0.058, IN.bathSwitch.y + 0.057, bv, { cast: false });   // two switches by the box's corner
    for (const du of [-0.024, 0.024]) b.box(plain('#e3dfd4', 0.4), IN.bathSwitch.u + du - 0.006, IN.bathSwitch.y - 0.014, bv - 0.013, IN.bathSwitch.u + du + 0.006, IN.bathSwitch.y + 0.014, bv - 0.008, { cast: false });
    b.cyl(plate, IN.detector.u, IN.detector.y, bv, 0.055, 0.035, { rx: -90, seg: 16, cast: false });                  // a round detector high on that face
    // the closet in the north-west corner: a wing wall, a shelf and a rail behind where the entry door swings
    const cl = IN.closet;
    b.box(beige, cl.wing[0], 0, 0, cl.wing[1], CEIL, cl.v1, { solid: true });
    b.box(trim, cl.wing[0] - 0.006, 0, cl.v1 - 0.004, cl.wing[1] + 0.006, CEIL, cl.v1 + 0.006, { cast: false });
    b.box(plain('#e9e4d6', 0.6), 0, 1.74, 0, cl.wing[0], 1.765, 0.36, {});
    b.cyl(M.chrome(), 0.02, 1.64, 0.27, 0.014, cl.wing[0] - 0.04, { rz: -90, seg: 8, cast: false });
    for (const [u, c] of [[0.42, '#3f8f5a'], [0.55, '#3f8f5a'], [0.69, '#3f8f5a'], [1.02, '#d9d6cf'], [1.14, '#d9d6cf']]) {
      b.box(plain(c, 0.5), u - 0.004, 1.42, 0.07, u + 0.004, 1.44, 0.47, { cast: false });                            // a hanger: its bar, its two arms, its hook
      b.bar(plain(c, 0.5), u, 1.44, 0.07, u, 1.56, 0.27, 0.008, { cast: false }); b.bar(plain(c, 0.5), u, 1.44, 0.47, u, 1.56, 0.27, 0.008, { cast: false }); b.bar(plain(c, 0.5), u, 1.56, 0.27, u, 1.626, 0.27, 0.006, { cast: false });
    }
    b.box(plain('#e7e5e0', 0.4), 1.22, 1.765, 0.08, 1.44, 1.86, 0.2, {});                                              // the iron on the shelf, its cord hanging
    b.bar(plain('#161616', 0.6), 1.4, 1.77, 0.2, 1.36, 0.95, 0.33, 0.007, { round: true, seg: 5, cast: false });
    // skirting: the carpet turned up the wall, a hand high, wherever the floor is carpet; dark vinyl by the kitchen
    for (const [u0, v0, u1, v1] of [[0, 0, cl.wing[0], 0.012], [cl.wing[1], 0, IN.cab.u0, 0.012], [0, w - 0.012, bu, w], [bu - 0.012, bv, bu, w], [bu, bv - 0.012, IN.vinyl, bv], [0, 0, 0.012, IN.door[0] - 0.07], [0, IN.door[1] + 0.07, 0.012, w], [cl.wing[0] - 0.012, 0, cl.wing[0], cl.v1], [cl.wing[1], 0, cl.wing[1] + 0.012, cl.v1], [cl.wing[0] - 0.012, cl.v1, cl.wing[1] + 0.012, cl.v1 + 0.012]])
      b.box(X.carpet(), u0, 0, v0, u1, 0.1, v1, { uv: [1, 1], cast: false });
    for (const [u0, v0, u1, v1] of [[C.u1, 0, IN.fridge.front, 0.012], [IN.vinyl, bv - 0.012, bd0 - 0.06, bv], [bd1 + 0.06, bv - 0.012, K.front, bv]]) b.box(base, u0, 0, v0, u1, 0.1, v1, { cast: false });
    // the casing of the entry door, inside
    const [dv0, dv1] = IN.door;
    for (const [v0, v1] of [[dv0 - 0.07, dv0], [dv1, dv1 + 0.07]]) b.box(trim, 0, 0, v0, 0.02, IN.doorH + 0.07, v1, { cast: false });
    b.box(trim, 0, IN.doorH, dv0 - 0.07, 0.02, IN.doorH + 0.07, dv1 + 0.07, { cast: false });
    b.box(plate, 0, 1.17, dv1 + 0.16, 0.008, 1.285, dv1 + 0.23, { cast: false });                                       // the light switch by the door

    /* the window: the slider's glass, its stool, the track on the ceiling that carries the plaid curtains, their wands */
    const [wv0, wv1] = IN.win;
    b.box(M.glass('#c9d6dc', 0.18), -0.14, IN.sill + 0.04, wv0 + 0.04, -0.13, IN.head - 0.04, wv1 - 0.04, { cast: false });
    b.box(plain('#f3f2ee', 0.45), -0.13, IN.sill - 0.012, wv0 - 0.01, 0.03, IN.sill + 0.02, wv1 + 0.01, {});
    for (const v of [wv0, wv1 - 0.03]) b.box(plain('#f3f2ee', 0.45), -0.13, IN.sill, v, 0.0, IN.head, v + 0.03, { cast: false });
    b.box(plain('#f3f2ee', 0.45), -0.13, IN.head - 0.03, wv0, 0.0, IN.head, wv1, { cast: false });
    const cv0 = wv0 - 0.15, cv1 = IN.curtainEnd;
    b.box(plain('#e9e6dc', 0.5, 0.2), 0.07, CEIL - 0.022, cv0 - 0.03, 0.13, CEIL, cv1 + 0.03, { cast: false });
    parts.curtainsAt = { u: 0.1, v0: cv0, v1: cv1, y0: 0.45, y1: CEIL - 0.022 };
    for (const v of [2.8, 2.92]) b.cyl(plain('#f1f0ea', 0.4), 0.165, 1.36, v, 0.005, 0.95, { seg: 6, cast: false });

    /* the dresser with its lamp and the TV: knotty pine, two drawers wide and two high */
    const dr = IN.dresser, dd = dr.d, dh = dr.h;
    b.box(pine, dr.u0, 0.071, 0.01, dr.u1, dh - 0.04, dd, { uv: [1, 1], solid: true });
    b.box(pine, dr.u0 - 0.015, dh - 0.04, 0, dr.u1 + 0.015, dh, dd + 0.03, { uv: [1, 1] });
    b.box(pine, dr.u0 - 0.015, dh, 0, dr.u1 + 0.015, dr.rail, 0.02, { uv: [1, 1], cast: false });                        // the low rail at the back of the top
    b.box(plain('#5a3d22', 0.8), dr.u0 + 0.03, 0, 0.04, dr.u1 - 0.03, 0.071, dd - 0.04, {});
    const dw = (dr.u1 - dr.u0) / 2, knob = plain('#2b2019', 0.35, 0.4);
    for (let c = 0; c < 2; c++) for (const [y0, y1] of [[0.071, 0.41], [0.427, 0.712]]) {
      const x0 = dr.u0 + c * dw + 0.008, x1 = dr.u0 + (c + 1) * dw - 0.008;
      b.box(pine, x0, y0 + 0.006, dd, x1, y1 - 0.006, dd + 0.018, { uv: [1, 1], cast: false });
      b.box(pine, x0 + 0.012, y0 + 0.018, dd + 0.018, x1 - 0.012, y1 - 0.018, dd + 0.022, { uv: [1, 1], cast: false });       // a plain front, its edges eased
      for (const s of [-0.225, 0.225]) { b.cyl(knob, (x0 + x1) / 2 + s, (y0 + y1) / 2, dd + 0.018, 0.012, 0.018, { rx: 90, seg: 10, cast: false }); b.sphere(knob, (x0 + x1) / 2 + s, (y0 + y1) / 2, dd + 0.042, 0.019, { seg: 10, cast: false }); }
    }
    // the table lamp at the west end: a ginger jar glazed verdigris, a wide white shade
    const L = IN.tvLamp;
    set(b, plain('#4f8582', 0.38), turned([[0.001, 0], [0.07, 0], [0.073, 0.018], [0.056, 0.034], [0.06, 0.07], [0.079, 0.13], [0.093, 0.19], [0.096, 0.222], [0.088, 0.26], [0.067, 0.295], [0.049, 0.31], [0.051, 0.324], [0.059, 0.334], [0.059, 0.35], [0.03, 0.358], [0.001, 0.358]], 28), L.u, dh, L.v);
    b.cyl(M.plain('#b9a36a', 0.3, 0.8), L.u, dh + 0.355, L.v, 0.009, 0.07, { seg: 6 });
    b.cyl(shade, L.u, dh + 0.393, L.v, 0.215, 0.335, { seg: 28, r2: 0.2, open: true });
    // the TV: an LG of 32 in on an oval foot, at the east end
    const T = IN.tv, tu = (T.u0 + T.u1) / 2;
    b.sphere(X.black(), tu, dh + 0.012, T.v - 0.03, 1, { sx: 0.285, sy: 0.014, sz: 0.115, seg: 20 });
    b.box(X.black(), tu - 0.05, dh + 0.01, T.v - 0.06, tu + 0.05, T.y0 + 0.02, T.v - 0.02, {});
    b.box(X.black(), T.u0, T.y0, T.v - 0.07, T.u1, T.y1, T.v, {});
    b.box(plain('#0b0c0e', 0.25, 0.3), T.u0 + 0.004, T.y0 + 0.004, T.v, T.u1 - 0.004, T.y1 - 0.004, T.v + 0.006, { cast: false });
    parts.tvAt = { u: tu, v: T.v + 0.0075, y: (T.y0 + T.y1) / 2 + 0.022, w: T.u1 - T.u0 - 0.075, h: T.y1 - T.y0 - 0.115 };
    b.box(M.plain('#b9bcc0', 0.3, 0.8), tu - 0.022, T.y0 + 0.022, T.v + 0.006, tu + 0.022, T.y0 + 0.032, T.v + 0.0075, { cast: false });     // the maker's badge, unlettered
    b.solid(T.u0, dh, T.v - 0.1, T.u1, T.y1, T.v + 0.02);
    // on the dresser: a red box on two books, papers, leaflets by the TV
    b.box(plain('#3d6b3a', 0.7), L.u + 0.2, dh, 0.1, L.u + 0.52, dh + 0.03, 0.31, {});
    b.rbox(plain('#c8362b', 0.6), L.u + 0.33, dh + 0.075, 0.2, 0.24, 0.09, 0.15, 6, {});
    b.rbox(plain('#f0d24a', 0.6), L.u + 0.33, dh + 0.122, 0.2, 0.2, 0.004, 0.05, 6, { cast: false });
    papers(b, L.u + 0.5, dh, 0.4, 0.2, 0.14, 0.012, 3);
    papers(b, T.u1 - 0.12, dh, 0.5, 0.2, 0.26, 0.03, 5);
    b.rbox(plain('#f1dc3a', 0.6), tu - 0.33, dh + 0.006, 0.5, 0.19, 0.01, 0.12, -14, { cast: false });
    // a parcel box on the floor in front of it, red and blue on white
    b.rbox(plain('#f1f0ec', 0.7), dr.u0 + 0.28, 0.08, 0.92, 0.38, 0.16, 0.3, 14, {});
    b.rbox(plain('#c5342c', 0.7), dr.u0 + 0.28, 0.162, 0.92, 0.38, 0.004, 0.05, 14, { cast: false }); b.rbox(plain('#2b4f9c', 0.7), dr.u0 + 0.29, 0.162, 1.0, 0.38, 0.004, 0.03, 14, { cast: false });

    /* the mirror: a pale wooden frame under an arched crown; the horn of the fire alarm over it; the phone jack */
    const Mi = IN.mirror, fw = 0.048;
    b.box(honey, Mi.u0, Mi.y0, 0, Mi.u1, Mi.y1, 0.03, { uv: [1, 1], grain: 'y' });
    b.quad(new THREE.MeshStandardMaterial({ map: mirrorTex(), roughness: 0.08, metalness: 0.15, envMapIntensity: 0.6 }), '+z', (Mi.u0 + Mi.u1) / 2, (Mi.y0 + Mi.y1) / 2 - 0.005, 0.0312, Mi.u1 - Mi.u0 - 2 * fw, Mi.y1 - Mi.y0 - 2 * fw - 0.01, { cast: false });
    b.box(honey, Mi.u0 - 0.04, Mi.y1, 0, Mi.u1 + 0.04, Mi.y1 + 0.028, 0.07, { uv: [1, 1] });                               // the cornice
    { const a0 = Mi.u0 - 0.032, a1 = Mi.u1 + 0.032, mid = (a0 + a1) / 2, y0 = Mi.y1 + 0.028, pk = Mi.crown, sh = new THREE.Shape();
      sh.moveTo(a0, y0); sh.lineTo(a0, y0 + 0.02); sh.bezierCurveTo(a0 + 0.13, y0 + 0.02, mid - 0.22, pk, mid - 0.08, pk); sh.lineTo(mid + 0.08, pk);
      sh.bezierCurveTo(mid + 0.22, pk, a1 - 0.13, y0 + 0.02, a1, y0 + 0.02); sh.lineTo(a1, y0); sh.lineTo(a0, y0);
      b.geo(honey, new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 14 })); }
    b.box(plate, IN.alarm.u - 0.036, IN.alarm.y - 0.06, 0, IN.alarm.u + 0.036, IN.alarm.y + 0.06, 0.012, { cast: false });
    b.cyl(plain('#d8d5cc', 0.6), IN.alarm.u, IN.alarm.y + 0.012, 0.012, 0.022, 0.003, { rx: 90, seg: 12, cast: false });
    b.box(plain('#c4372c', 0.5), IN.alarm.u - 0.01, IN.alarm.y - 0.04, 0.012, IN.alarm.u + 0.01, IN.alarm.y - 0.03, 0.014, { cast: false });
    b.box(plate, IN.jack.u - 0.035, IN.jack.y - 0.057, 0, IN.jack.u + 0.035, IN.jack.y + 0.057, 0.007, { cast: false });
    // his backpack on the floor under the mirror, against the cupboard; a dark bundle of clothes beside it
    const pack = M.plain('#1c1d20', 0.85);
    set(b, pack, cushion(0.3, 0.48, 0.2, 0.45, 0.55), Mi.u0 + 0.53, 0.24, 0.15);
    set(b, M.plain('#24262a', 0.85), cushion(0.22, 0.26, 0.1, 0.45, 0.6), Mi.u0 + 0.53, 0.18, 0.26);
    b.bar(pack, Mi.u0 + 0.44, 0.46, 0.12, Mi.u0 + 0.62, 0.46, 0.12, 0.02, { round: true, seg: 6, cast: false });
    set(b, M.plain('#17181b', 0.95), cushion(0.34, 0.1, 0.26, 0.6, 0.8), Mi.u0 + 0.16, 0.05, 0.3, 20);
    b.solid(Mi.u0 + 0.38, 0, 0, Mi.u0 + 0.68, 0.47, 0.3);

    /* swing-arm lamps: a patina plate on the wall, a brass arm in two rods, a white drum shade above its end. One over
       the counter, two by the bed (their cord covers run down the wall) */
    const swing = (u, v, y, out, du, dOut, cover) => {        // out: +1 where the wall faces south (into +v), −1 north; (du, dOut): where the arm carries the shade
      const pat = M.plain('#5d7466', 0.55, 0.3), brass = M.plain('#b49447', 0.3, 0.9);
      b.box(pat, u - 0.06, y - 0.08, v, u + 0.06, y + 0.08, v + out * 0.022, {});
      if (cover) b.box(pat, u - 0.014, 0.3, v, u + 0.014, y - 0.08, v + out * 0.012, { cast: false });
      const su = u + du, sv = v + out * dOut, ey = y + 0.03;
      b.bar(brass, u, ey, v + out * 0.022, u, ey, v + out * 0.05, 0.024, { round: true, seg: 8, cast: false });
      b.bar(brass, u, ey, v + out * 0.045, su, ey, sv, 0.011, { round: true, seg: 6, cast: false });
      b.bar(brass, u, ey - 0.026, v + out * 0.045, su, ey - 0.026, sv, 0.008, { round: true, seg: 6, cast: false });
      b.cyl(brass, su, ey - 0.035, sv, 0.014, 0.08, { seg: 8, cast: false });
      b.cyl(shade, su, y + 0.027, sv, 0.142, 0.245, { seg: 24, r2: 0.13, open: true });
    };
    const WL = IN.wallLamp;
    swing(WL.u, 0, WL.y, 1, WL.du, WL.out, false);
    b.bar(plain('#ecebe4', 0.6), WL.u + 0.01, WL.y - 0.07, 0.012, IN.outlet.u - 0.02, IN.outlet.y + 0.03, 0.02, 0.006, { round: true, seg: 5, cast: false });    // its cord, down to the outlet
    b.box(plate, IN.outlet.u - 0.058, IN.outlet.y - 0.057, 0, IN.outlet.u + 0.058, IN.outlet.y + 0.057, 0.007, { cast: false });
    b.box(plain('#f7f6f1', 0.4), IN.outlet.u + 0.008, IN.outlet.y - 0.03, 0.007, IN.outlet.u + 0.05, IN.outlet.y + 0.03, 0.05, { cast: false });               // a charger in it
    // the breaker panel and the thermostat further along the wall
    const Pn = IN.panel;
    b.box(plain('#d9c8a6', 0.7), Pn.u0, Pn.y0, 0, Pn.u1, Pn.y1, 0.01, { cast: false });
    b.box(plain('#cdbc98', 0.7), Pn.u0 + 0.03, Pn.y0 + 0.03, 0.01, Pn.u1 - 0.03, Pn.y1 - 0.03, 0.014, { cast: false });
    b.box(plate, IN.thermostat.u - 0.03, IN.thermostat.y - 0.048, 0, IN.thermostat.u + 0.03, IN.thermostat.y + 0.048, 0.022, { cast: false });
    b.box(plain('#9aa39b', 0.3), IN.thermostat.u - 0.02, IN.thermostat.y + 0.005, 0.022, IN.thermostat.u + 0.02, IN.thermostat.y + 0.032, 0.023, { cast: false });

    /* THE COUNTER he worked at: a table for two that stands out from the north wall. A white laminate top 0.87 wide and
       1.155 long, its two free corners rounded; under its wall end a white cupboard with an oak pull strip along its
       top, opening west; down its middle a panel whose front edge rakes back to the floor, under a short apron board
       cut in an ogee at each end. A high chair is pushed in from either side, into the knee room the panel leaves. */
    { const r = C.r, sh = new THREE.Shape();
      sh.moveTo(C.u0, 0); sh.lineTo(C.u1, 0); sh.lineTo(C.u1, C.v1 - r); sh.absarc(C.u1 - r, C.v1 - r, r, 0, Math.PI / 2, false); sh.lineTo(C.u0 + r, C.v1); sh.absarc(C.u0 + r, C.v1 - r, r, Math.PI / 2, Math.PI, false); sh.lineTo(C.u0, 0);
      const tg = new THREE.ExtrudeGeometry(sh, { depth: C.t, bevelEnabled: false, curveSegments: 10 }); tg.rotateX(Math.PI / 2); tg.translate(0, C.h, 0);
      b.geo(white, tg); }
    const cb = IN.cab, under = C.h - C.t;
    b.box(white, cb.u0, 0.1, 0, cb.u1, under, cb.v1, { solid: true });
    b.box(plain('#2a2522', 0.8), cb.u0 + 0.05, 0, 0, cb.u1, 0.1, cb.v1, { cast: false });                                // its recessed kick, on the west
    b.box(white, cb.u0, 0, cb.v1 - 0.018, cb.u1, 0.1, cb.v1, { cast: false });                                          // its south side comes down to the floor
    b.box(oak, cb.u0 - 0.012, under - 0.036, 0.004, cb.u0, under - 0.001, cb.v1, { uv: [1, 1], cast: false });           // the oak strip along the top of its door
    b.box(white, cb.u0 - 0.018, 0.105, 0.012, cb.u0, under - 0.04, cb.v1 - 0.012, { cast: false });                      // the door, opening west
    const lg = IN.leg, ap = IN.apron;
    { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(lg.foot, 0); sh.lineTo(lg.top, under); sh.lineTo(0, under); sh.lineTo(0, 0);
      const pg = new THREE.ExtrudeGeometry(sh, { depth: lg.u1 - lg.u0, bevelEnabled: false }); pg.rotateY(-Math.PI / 2); pg.translate(lg.u1, 0, 0); b.geo(white, pg); }
    { const og = 0.131, y1 = under, y0 = ap.y0, sh = new THREE.Shape();
      sh.moveTo(ap.u0, y1); sh.quadraticCurveTo(ap.u0 + 0.004, y1 - 0.058, ap.u0 + 0.034, y1 - 0.064); sh.lineTo(ap.u0 + 0.085, y1 - 0.074); sh.quadraticCurveTo(ap.u0 + og, y1 - 0.08, ap.u0 + og, y0);
      sh.lineTo(ap.u1 - og, y0); sh.quadraticCurveTo(ap.u1 - og, y1 - 0.08, ap.u1 - 0.085, y1 - 0.074); sh.lineTo(ap.u1 - 0.034, y1 - 0.064); sh.quadraticCurveTo(ap.u1 - 0.004, y1 - 0.058, ap.u1, y1); sh.lineTo(ap.u0, y1);
      const ag = new THREE.ExtrudeGeometry(sh, { depth: ap.v1 - ap.v0, bevelEnabled: false, curveSegments: 8 }); ag.translate(0, 0, ap.v0); b.geo(white, ag); }
    b.solid(C.u0, 0, 0, C.u1, C.h, C.v1 - 0.02);
    // the laptop, as on the evening of 21/9: open at the west edge, square with it, its screen to the chair
    const lap = IN.laptop, tilt = 18 * Math.PI / 180;
    b.push(lap.u, C.h, lap.v, lap.ry);
    b.box(M.plain('#2a2c30', 0.45, 0.4), -0.19, 0, -0.1275, 0.19, 0.016, 0.1275, {});
    b.box(M.plain('#17181b', 0.6), -0.165, 0.016, -0.105, 0.165, 0.0175, 0.02, { cast: false });                         // keys
    b.box(M.plain('#3a3d42', 0.5), -0.05, 0.016, 0.04, 0.05, 0.0172, 0.105, { cast: false });                            // the touchpad
    b.rbox(M.plain('#1b1c1f', 0.4, 0.3), 0, 0.016 + 0.1225 * Math.cos(tilt), -0.1275 - 0.1225 * Math.sin(tilt), 0.38, 0.245, 0.008, 0, { rx: -18 });
    b.pop();
    parts.screenAt = { u: lap.u, v: lap.v, y: C.h, ry: lap.ry, tilt };
    // what stood round it: the box of lemon tea and a dark tin against the wall, water, a sleeve of discs, papers; behind
    // the screen a steel flask, a clear bottle, the gallon jug, the red flask, a spectacle case; a black pouch
    b.box(plain('#f1efe8', 0.6), C.u0 + 0.085, C.h, 0.012, C.u0 + 0.32, C.h + 0.08, 0.082, {});
    b.box(plain('#3f9a4a', 0.6), C.u0 + 0.083, C.h, 0.01, C.u0 + 0.17, C.h + 0.082, 0.084, { cast: false });
    b.cyl(plain('#f2d64a', 0.6), C.u0 + 0.24, C.h + 0.04, 0.082, 0.024, 0.002, { rx: 90, seg: 12, cast: false });
    b.box(plain('#1f2a22', 0.5), C.u0 + 0.33, C.h, 0.015, C.u0 + 0.4, C.h + 0.075, 0.085, {});
    bottle(b, '#cfe6f5', C.u0 + 0.4, C.h, 0.14, 0.032, 0.235, '#2f8a3e');
    b.rbox(plain('#c9d2d6', 0.3), C.u0 + 0.19, C.h + 0.006, 0.19, 0.2, 0.012, 0.15, 14, { cast: false });               // the sleeve of discs
    papers(b, C.u0 + 0.3, C.h, 0.36, 0.3, 0.21, 0.012, 11); papers(b, C.u0 + 0.21, C.h, 0.47, 0.22, 0.16, 0.006, 12, ['#f3f1ea', '#dfe8f0']);
    b.cyl(plain('#9a9da0', 0.3, 0.8), C.u0 + 0.765, C.h, 0.08, 0.034, 0.19, { seg: 14 }); b.cyl(plain('#1b1b1c', 0.4), C.u0 + 0.765, C.h + 0.19, 0.08, 0.03, 0.03, { seg: 12, cast: false }); b.cyl(plain('#c63a2e', 0.4), C.u0 + 0.765, C.h + 0.22, 0.08, 0.022, 0.012, { seg: 10, cast: false });
    bottle(b, '#dfeaf0', C.u0 + 0.625, C.h, 0.17, 0.03, 0.2, '#e9eef2');
    b.cyl(M.glass('#e9f0f2', 0.55), C.u0 + 0.745, C.h, 0.29, 0.078, 0.2, { seg: 14 }); b.cyl(M.glass('#e9f0f2', 0.55), C.u0 + 0.745, C.h + 0.2, 0.29, 0.078, 0.07, { seg: 14, r2: 0.025 }); b.cyl(plain('#2f6fd6', 0.4), C.u0 + 0.745, C.h + 0.27, 0.29, 0.024, 0.022, { seg: 10 });
    b.cyl(plain('#e23a22', 0.35), C.u0 + 0.795, C.h, 0.44, 0.045, 0.2, { seg: 14 }); b.cyl(plain('#1c1c1c', 0.4), C.u0 + 0.795, C.h + 0.2, 0.44, 0.038, 0.05, { seg: 12 });
    b.geo(plain('#1c1c1c', 0.5), new THREE.TorusGeometry(0.035, 0.006, 6, 14).translate(C.u0 + 0.795, C.h + 0.275, 0.44), { cast: false });          // its loop
    set(b, plain('#8fb1c9', 0.5), cushion(0.15, 0.04, 0.06, 0.7, 0.7, 10), C.u0 + 0.705, C.h + 0.02, 0.535, 35);         // the spectacle case
    set(b, plain('#141517', 0.6), cushion(0.13, 0.04, 0.1, 0.55, 0.7, 10), C.u0 + 0.425, C.h + 0.02, 0.85, 8);           // the pouch
    parts.badgeAt = { u: C.u0 + 0.62, v: 1.0, y: C.h + 0.004 };
    // the two high chairs: dark leather on walnut legs, a low padded back; his grey jacket over the back of his own
    const stool = ({ u, v, face, jacket }) => {
      b.push(u, 0, v, face);                         // it faces local −z; x is its width
      const wood = X.walnut(), lw = 0.048, ax = 0.2, az = 0.23, wo = { uv: [0.6, 0.6], grain: 'y' };
      for (const sx of [-1, 1]) {
        b.box(wood, sx * ax - lw / 2, 0, -az - lw / 2, sx * ax + lw / 2, 0.5, -az + lw / 2, wo);                        // front leg
        b.box(wood, sx * ax - lw / 2, 0, az - lw / 2, sx * ax + lw / 2, 0.945, az + lw / 2, wo);                        // back post
        b.box(wood, sx * ax - 0.011, 0.455, -az, sx * ax + 0.011, 0.5, az, { uv: [0.6, 0.6], cast: false });             // rail under the seat
        b.box(wood, sx * ax - 0.011, 0.17, -az, sx * ax + 0.011, 0.205, az, { uv: [0.6, 0.6], cast: false });            // stretcher
      }
      for (const z of [-az, az]) b.box(wood, -ax, 0.455, z - 0.011, ax, 0.5, z + 0.011, { uv: [0.6, 0.6], cast: false });
      b.box(wood, -ax, 0.24, -az - 0.011, ax, 0.275, -az + 0.011, { uv: [0.6, 0.6], cast: false });                      // the foot rail
      b.box(wood, -ax, 0.17, az - 0.011, ax, 0.205, az + 0.011, { uv: [0.6, 0.6], cast: false });
      set(b, lea, cushion(0.47, 0.09, 0.5, 0.42, 0.7), 0, 0.54, -0.005);                                                // the seat
      b.box(wood, -ax, 0.905, az - 0.02, ax, 0.945, az + 0.024, { uv: [0.6, 0.6], cast: false });                        // top rail of the back
      set(b, lea, cushion(0.36, 0.31, 0.06, 0.35, 0.45), 0, 0.745, az - 0.012);                                         // its pad
      if (jacket) {                                  // a long fall behind the back, a short one in front, a sleeve down each side
        const grey = M.plain('#8e948c', 0.95), band = M.plain('#22262b', 0.9);
        set(b, grey, drape(0.46, 0.5, 0.68, 2.4, 0.014), 0, 0.95, az + 0.05);
        set(b, grey, drape(0.44, 0.46, 0.28, 2.4, 0.008), 0, 0.95, az - 0.05);
        b.cyl(grey, -0.23, 0.946, az + 0.001, 0.034, 0.46, { rz: -90, seg: 12 });
        for (const sx of [-1, 1]) set(b, grey, cushion(0.09, 0.56, 0.085, 0.6, 0.6, 12), sx * 0.245, 0.62, az + 0.03, 0, { rz: sx * 4 });
        for (const dz of [-0.012, 0.012]) b.box(band, 0.289, 0.73, az + 0.03 + dz - 0.004, 0.292, 0.88, az + 0.03 + dz + 0.004, { cast: false });   // two dark bands at one shoulder
      }
      b.pop();
    };
    IN.chairs.forEach(stool);
    b.solid(C.u0 - 0.13, 0, 0.65, C.u0 + 0.02, 0.95, 1.1); b.solid(C.u1 - 0.01, 0, 0.72, C.u1 + 0.125, 0.95, 1.18);     // what of each chair stands clear of the top

    /* the bed: a full, its head on the green south wall; an espresso headboard with two tan panels; white quilt, a tan
       runner across its foot; the nightstand to its east with the phone and the clock */
    const B = IN.bed, Hb = IN.headboard, esp = X.espresso();
    b.box(esp, Hb.u0, 0, B.v1, Hb.u1, Hb.top, w, { uv: [1, 1] });
    { const side = (Hb.u1 - Hb.u0 - 2 * Hb.pw - 0.09) / 2; for (const a0 of [Hb.u0 + side, Hb.u1 - side - Hb.pw]) b.box(M.plain('#b27f48', 0.75), a0, Hb.panel[0], B.v1 - 0.018, a0 + Hb.pw, Hb.panel[1], B.v1, { cast: false }); }
    b.box(M.plain('#4b3a2d', 0.9), B.u0 + 0.02, 0, B.v0 + 0.02, B.u1 - 0.02, 0.34, B.v1, { solid: true });            // the skirt
    // the cover: white, quilted in diamonds 0.37 m across; over the top and down three sides to its hem,
    // rounding over the mattress's edges; turned back in a fold where the pillows lie
    const q = X.quilt(), hem = 0.26, cr = 0.05, cu0 = B.u0 - 0.03, cu1 = B.u1 + 0.03, cf = B.v0 - 0.03, ch = B.v1 + 0.05;
    set(b, q, eased(cu1 - cu0, B.top - hem, ch - cf, cr, { floor: true, rep: 1.48 }), (cu0 + cu1) / 2, (B.top + hem) / 2, (cf + ch) / 2);
    set(b, q, eased(cu1 - cu0 - 0.02, 0.075, 0.15, 0.035, { rep: 1.48, k: 3 }), (cu0 + cu1) / 2, B.top - 0.005, B.v1 - 0.57, 0, { cast: false });
    // the runner across its foot: tan between two dark borders, hanging down both sides
    const [r0, r1] = B.runner, rn = X.runner(B.border / (r1 - r0)), rt = 0.008, rlow = 0.3;
    set(b, rn, eased(cu1 - cu0 + 2 * rt, B.top + rt - rlow, r1 - r0, cr + rt, { floor: true, z: false, band: true, rep: r1 - r0 }), (cu0 + cu1) / 2, (B.top + rt + rlow) / 2, (r0 + r1) / 2, 0, { cast: false });
    const pil = M.plain('#f4f3ef', 0.92);
    set(b, pil, pillow(0.68, 0.15, 0.46), B.u1 - 0.38, B.top + 0.07, B.v1 - 0.27, 4);                                   // one flat on the nightstand's side
    set(b, pil, pillow(0.68, 0.15, 0.46), B.u0 + 0.39, B.top + 0.068, B.v1 - 0.26, -3);                                 // one flat on the window's
    set(b, pil, pillow(0.7, 0.17, 0.48), (B.u0 + B.u1) / 2 + 0.06, B.top + 0.205, B.v1 - 0.26, -8, { rx: -15 });        // one across them, against the headboard
    b.solid(B.u0, 0, B.v0, B.u1, B.top, B.v1);
    const N = IN.stand, nh = N.h;
    b.box(pine, N.u0, nh - 0.03, N.v0 - 0.015, N.u1, nh, w - 0.005, { uv: [1, 1] });
    for (const [u0, u1] of [[N.u0 + 0.01, N.u0 + 0.035], [N.u1 - 0.035, N.u1 - 0.01]]) b.box(pine, u0, 0, N.v0, u1, nh - 0.03, w - 0.01, { uv: [1, 1] });
    b.box(pine, N.u0 + 0.035, 0.07, N.v0 + 0.02, N.u1 - 0.035, 0.095, w - 0.01, { uv: [1, 1], cast: false });           // the open shelf
    b.box(pine, N.u0 + 0.035, 0, w - 0.03, N.u1 - 0.035, nh - 0.03, w - 0.01, { uv: [1, 1], cast: false });
    b.box(pine, N.u0 + 0.035, 0.4, N.v0, N.u1 - 0.035, nh - 0.035, N.v0 + 0.018, { uv: [1, 1], cast: false });          // the drawer
    b.sphere(plain('#3a2416', 0.4), (N.u0 + N.u1) / 2, 0.5, N.v0 - 0.012, 0.02, { seg: 8, cast: false });
    papers(b, (N.u0 + N.u1) / 2, 0.095, N.v0 + 0.22, 0.3, 0.2, 0.05, 21, ['#3b4a6a', '#c9b48a', '#8a2f2a']);
    b.solid(N.u0, 0, N.v0, N.u1, nh, w);
    b.rbox(plain('#f1efea', 0.4), N.u1 - 0.2, nh + 0.03, N.v0 + 0.17, 0.2, 0.06, 0.2, 12, {});                           // the phone, its handset on the left
    b.rbox(plain('#f1efea', 0.4), N.u1 - 0.27, nh + 0.075, N.v0 + 0.17, 0.055, 0.04, 0.2, 12, {});
    b.rbox(plain('#141414', 0.4), N.u0 + 0.15, nh + 0.035, N.v0 + 0.27, 0.19, 0.07, 0.11, -8, {});                       // the clock radio
    b.push(N.u0 + 0.15, nh + 0.035, N.v0 + 0.27, -8); b.quad(M.screen(clockTex()), '-z', 0, 0.002, -0.056, 0.12, 0.042, { cast: false }); b.pop();
    for (const [du, ang] of [[0.13, 70], [0.2, 64]]) b.rbox(plain('#1a1a1a', 0.5), N.u0 + du, nh + 0.01, N.v0 + 0.09, 0.045, 0.02, 0.19, ang, { cast: false });     // two remotes
    for (const l of IN.bedLamps) swing(l.u, w, IN.bedLampY, -1, l.du, l.out, true);

    /* by the window: the recliner in the corner, a carton against the wall, his shoes just inside the door */
    const Rc = IN.recliner;
    b.push(Rc.u, 0, Rc.v, Rc.ry);
    b.box(M.plain('#1d130f', 0.6), -0.38, 0, -0.38, 0.38, 0.1, 0.36, { cast: false });
    set(b, lea, cushion(0.86, 0.38, 0.86, 0.3, 0.35), 0, 0.27, -0.01);                                                  // the body
    set(b, lea, cushion(0.56, 0.16, 0.6, 0.4, 0.6), 0, 0.47, -0.1);                                                     // the seat
    set(b, lea, cushion(0.6, 0.6, 0.22, 0.38, 0.45), 0, 0.67, 0.3, 0, { rx: 11 });                                      // the back, leaning: its top at 0.96
    set(b, lea, cushion(0.5, 0.18, 0.15, 0.45, 0.6), 0, 0.86, 0.32, 0, { rx: 11 });                                     // its head roll
    for (const sx of [-1, 1]) set(b, lea, cushion(0.2, 0.3, 0.8, 0.45, 0.5), sx * 0.34, 0.47, 0.0);                     // the arms
    b.pop();
    b.solid(Rc.u - 0.5, 0, Rc.v - 0.5, Rc.u + 0.5, 0.62, Math.min(w, Rc.v + 0.5));
    const card = M.plain('#a7835a', 0.9), card2 = M.plain('#8f6d47', 0.9);
    b.box(card, 0.03, 0, 2.27, 0.33, 0.31, 2.57, {}); b.box(M.plain('#5d4630', 0.95), 0.05, 0.29, 2.29, 0.31, 0.312, 2.55, { cast: false });
    b.rbox(card2, 0.18, 0.345, 2.255, 0.28, 0.01, 0.12, 0, { rx: 50, cast: false }); b.rbox(card2, 0.345, 0.345, 2.42, 0.01, 0.01, 0.28, 0, { rz: -15, cast: false });
    b.solid(0, 0, 2.25, 0.35, 0.31, 2.59);
    const shoe = (u, v, c, ang, sole = '#e9e9e6') => { set(b, M.plain(c, 0.7), cushion(0.1, 0.09, 0.27, 0.6, 0.6, 10), u, 0.055, v, ang); b.rbox(M.plain(sole, 0.7), u, 0.012, v, 0.1, 0.024, 0.27, ang, { cast: false }); };
    shoe(0.55, 2.2, '#26272b', 74); shoe(0.6, 2.32, '#26272b', 80);                                                    // dark trainers
    shoe(0.27, 1.92, '#2c68b4', 60); shoe(0.36, 2.03, '#2c68b4', 52);                                                  // the blue pair
    for (const [u, v] of [[0.62, 1.94], [0.72, 2.03]]) b.rbox(M.plain('#17181a', 0.8), u, 0.012, v, 0.1, 0.022, 0.27, 66, { cast: false });   // flip-flops

    /* the print on the bathroom box, facing the bed */
    const Pr = IN.print, pv = (Pr.v0 + Pr.v1) / 2, py = (Pr.y0 + Pr.y1) / 2;
    b.box(M.plain('#1f1712', 0.5), bu - 0.03, Pr.y0, Pr.v0, bu, Pr.y1, Pr.v1, {});
    b.box(M.plain('#f1ede2', 0.8), bu - 0.034, Pr.y0 + 0.035, Pr.v0 + 0.035, bu - 0.03, Pr.y1 - 0.035, Pr.v1 - 0.035, { cast: false });
    b.quad(new THREE.MeshStandardMaterial({ map: printTex(), roughness: 0.6 }), '-x', bu - 0.036, py, pv, 0.41, 0.67, { cast: false });

    /* the kitchenette along the back wall: fridge in the corner, then sink and a two-ring hob under four wall cupboards,
       the microwave under the first two, the hood under the others. White laminate; an oak strip is every door's handle */
    const F = IN.fridge, fw0 = plain('#f3f3f0', 0.35);
    b.box(fw0, F.front + 0.05, 0.03, F.v0, d - 0.03, F.h, F.v1, { solid: true });
    b.box(fw0, F.front, F.split + 0.012, F.v0, F.front + 0.05, F.h - 0.004, F.v1, {}); b.box(fw0, F.front, 0.06, F.v0, F.front + 0.05, F.split - 0.012, F.v1, {});
    b.box(plain('#cfcfc9', 0.4), F.front + 0.012, F.split - 0.03, F.v0 + 0.02, F.front + 0.05, F.split + 0.03, F.v1 - 0.02, { cast: false });    // the grip between the two doors
    b.sphere(plain('#9ea2a6', 0.3, 0.6), F.front - 0.001, F.h - 0.06, F.v1 - 0.12, 1, { sx: 0.003, sy: 0.012, sz: 0.035, seg: 10, cast: false });
    b.box(plain('#2a2522', 0.8), F.front + 0.06, 0, F.v0 + 0.02, d - 0.05, 0.03, F.v1 - 0.02, { cast: false });
    const k0 = K.v0, k1 = K.v1, kf = K.front, topY = 0.914, under2 = topY - 0.037;
    b.box(white, kf + 0.02, 0.115, k0, d, under2, k1, { solid: true });
    b.box(plain('#2a2522', 0.8), kf + 0.07, 0, k0, d, 0.115, k1, { cast: false });
    b.box(white, K.top, under2, k0, d, topY, k1, {});
    for (const [v0, v1] of [[k0 + 0.004, K.split - 0.002], [K.split + 0.002, k1 - 0.004]]) b.box(white, kf + 0.004, 0.742, v0, kf + 0.02, under2 - 0.006, v1, { cast: false });   // a white band under the top
    b.box(oak, kf, 0.7, k0 + 0.004, kf + 0.02, 0.74, k1 - 0.004, { uv: [1, 1], cast: false });                            // along the tops of the doors
    { const mid = (k0 + K.split) / 2; for (const [v0, v1] of [[k0 + 0.004, mid - 0.002], [mid + 0.002, K.split - 0.002]]) b.box(white, kf + 0.002, 0.12, v0, kf + 0.02, 0.698, v1, { cast: false }); }
    b.box(white, kf + 0.002, 0.432, K.split + 0.002, kf + 0.02, 0.698, k1 - 0.004, { cast: false });                    // two drawers by the bathroom door
    b.box(oak, kf, 0.387, K.split + 0.004, kf + 0.02, 0.43, k1 - 0.004, { uv: [1, 1], cast: false });
    b.box(white, kf + 0.002, 0.12, K.split + 0.002, kf + 0.02, 0.385, k1 - 0.004, { cast: false });
    // the sink and its tall tap; the hob with a pot on its back ring; things left by the sink
    const [s0, s1] = K.sink, steel = X.steel();
    b.box(steel, d - 0.5, topY - 0.001, s0 - 0.03, d - 0.1, topY + 0.004, s1 + 0.03, { cast: false });
    b.box(M.plain('#7d8287', 0.3, 0.8), d - 0.47, topY - 0.15, s0, d - 0.13, topY + 0.001, s1, { cast: false });
    b.cyl(steel, d - 0.075, topY, K.faucet, 0.018, 0.2, { seg: 10, cast: false }); b.bar(steel, d - 0.075, topY + 0.2, K.faucet, d - 0.24, topY + 0.24, K.faucet, 0.018, { round: true, seg: 8, cast: false }); b.bar(steel, d - 0.24, topY + 0.24, K.faucet, d - 0.25, topY + 0.19, K.faucet, 0.016, { round: true, seg: 8, cast: false });
    b.bar(steel, d - 0.07, topY + 0.1, K.faucet + 0.03, d - 0.07, topY + 0.13, K.faucet + 0.11, 0.012, { round: true, seg: 6, cast: false });
    const [h0, h1] = K.hob, hu = d - 0.3, rings = [h0 + 0.15, h1 - 0.16];
    b.box(plain('#d9dadb', 0.3, 0.5), d - 0.55, topY, h0, d - 0.06, topY + 0.012, h1 - 0.01, { cast: false });
    for (const hv of rings) { for (const k of [1, 0.6, 0.25]) b.geo(M.plain('#1a1a1a', 0.5, 0.3), new THREE.TorusGeometry(0.085 * k, 0.011, 6, 22).rotateX(Math.PI / 2).translate(hu, topY + 0.02, hv), { cast: false }); b.cyl(plain('#2a2a2a', 0.4, 0.3), hu, topY + 0.011, hv, 0.105, 0.004, { seg: 20, cast: false }); }
    for (const dv of [-0.035, 0.035]) b.cyl(plain('#1c1c1c', 0.4), d - 0.5, topY + 0.012, (h0 + h1) / 2 + dv, 0.016, 0.016, { seg: 10, cast: false });
    b.cyl(steel, hu, topY + 0.03, rings[1], 0.1, 0.11, { seg: 18 }); b.cyl(M.glass('#d9e4e8', 0.4), hu, topY + 0.14, rings[1], 0.103, 0.012, { seg: 18, r2: 0.07 }); b.sphere(plain('#1b1b1b', 0.4), hu, topY + 0.165, rings[1], 0.018, { seg: 8, cast: false });
    b.bar(plain('#1b1b1b', 0.5), hu - 0.02, topY + 0.115, rings[1] - 0.1, hu - 0.06, topY + 0.12, rings[1] - 0.24, 0.02, { cast: false });
    b.cyl(plain('#e8d23a', 0.4), d - 0.11, topY, K.faucet + 0.12, 0.026, 0.15, { seg: 10 }); b.cyl(plain('#f1efe8', 0.4), d - 0.11, topY + 0.15, K.faucet + 0.12, 0.012, 0.035, { seg: 8, cast: false });        // washing-up liquid
    set(b, plain('#f7f6f2', 0.95), cushion(0.2, 0.07, 0.17, 0.6, 0.8, 10), d - 0.33, topY + 0.035, s1 + 0.1, 15);       // tea towels
    b.cyl(plain('#f4f4f1', 0.3), d - 0.3, topY, s1 + 0.3, 0.085, 0.02, { seg: 16 }); b.cyl(plain('#7a2f28', 0.4), d - 0.2, topY, s1 + 0.2, 0.035, 0.08, { seg: 12 });       // a plate, a jar
    b.box(plain('#f6f5f0', 0.3), d - 0.008, topY, k0, d, K.y0, k1, { cast: false });                                     // the splashback
    b.box(plate, d - 0.014, K.outlet.y - 0.057, K.outlet.v - 0.035, d - 0.008, K.outlet.y + 0.057, K.outlet.v + 0.035, { cast: false });
    // wall cupboards, microwave, hood
    const ud = K.upper;
    b.box(white, ud + 0.02, K.y0, K.doors[0], d, K.y1, K.doors[4], {});
    for (let i = 0; i < 4; i++) b.box(white, ud, K.y0 + 0.004, K.doors[i] + 0.003, ud + 0.02, K.y1 - 0.004, K.doors[i + 1] - 0.003, { cast: false });
    b.box(oak, ud - 0.002, K.y0 - 0.04, K.doors[0] + 0.003, ud + 0.02, K.y0, K.doors[4] - 0.003, { uv: [1, 1], cast: false });
    const mw = K.mw; b.box(plain('#f0efe9', 0.35), mw.front, mw.y0, mw.v0, d, mw.y1, mw.v1, {});
    b.box(plain('#2b2e30', 0.15, 0.2), mw.front - 0.004, mw.y0 + 0.035, mw.v0 + 0.03, mw.front, mw.y1 - 0.035, mw.v0 + 0.4, { cast: false });
    b.box(plain('#e2e1da', 0.4), mw.front - 0.004, mw.y0 + 0.02, mw.v1 - 0.13, mw.front, mw.y1 - 0.02, mw.v1 - 0.02, { cast: false });
    b.box(plain('#20262a', 0.3), mw.front - 0.006, mw.y1 - 0.075, mw.v1 - 0.115, mw.front - 0.004, mw.y1 - 0.045, mw.v1 - 0.035, { cast: false });
    const hd = K.hood; b.box(plain('#f0efe9', 0.35), hd.front, hd.y0, hd.v0, d, hd.y1, hd.v1, {}); b.box(plain('#c9c9c4', 0.4, 0.4), hd.front + 0.03, hd.y0 - 0.003, hd.v0 + 0.03, d - 0.08, hd.y0, hd.v1 - 0.03, { cast: false });
    b.box(white, ud + 0.02, hd.y1, hd.v0, d, K.y0 - 0.04, hd.v1, { cast: false });
    // the ceiling: the tube light over the kitchen, the air grilles, the sprinkler
    const Ce = IN.ceiling;
    b.box(plain('#f1efe8', 0.5), Ce.tube[0] - 0.15, CEIL - 0.012, Ce.tube[1] - 0.62, Ce.tube[0] + 0.15, CEIL, Ce.tube[1] + 0.62, { cast: false });
    b.box(ctx.lampMat('#f4f8ff', 2.4, 0.95, 0.06), Ce.tube[0] - 0.14, CEIL - 0.075, Ce.tube[1] - 0.61, Ce.tube[0] + 0.14, CEIL - 0.012, Ce.tube[1] + 0.61, { cast: false });   // a wraparound lens: it glows all over
    const grille = (u, v, a, c, dark) => { b.box(plain('#e9e6dc', 0.5), u - a / 2, CEIL - 0.014, v - c / 2, u + a / 2, CEIL, v + c / 2, { cast: false }); for (let x = u - a / 2 + 0.035; x < u + a / 2 - 0.02; x += 0.04) b.box(plain(dark ? '#3c3a36' : '#8d897f', 0.6), x, CEIL - 0.016, v - c / 2 + 0.03, x + 0.022, CEIL - 0.014, v + c / 2 - 0.03, { cast: false }); };
    grille(Ce.supply[0], Ce.supply[1], 0.25, 0.3, false); grille(Ce.ret[0], Ce.ret[1], 0.42, 0.36, true);
    b.cyl(plain('#f3f2ee', 0.5), Ce.sprinkler[0], CEIL - 0.012, Ce.sprinkler[1], 0.035, 0.012, { seg: 12, cast: false }); b.cyl(M.chrome(), Ce.sprinkler[0], CEIL - 0.04, Ce.sprinkler[1], 0.01, 0.03, { seg: 8, cast: false });

    /* INSIDE THE BATHROOM. None of his photographs shows it. WHERE things stand is the first build's, which he looked at
       and found right (24 Nov 2026): the tub across the far end, against the back wall, on the left of the door; the pan
       on the party wall, facing the door, towels over it; the basin to the right, against the wall that carries the
       print. WHAT each thing looks like, and its heights, are after photographs of bathrooms in this same building (a
       traveller's of 2026 and another's of 2024, the hotel's own of about 2021). The floor is the kitchen's boards.
       EVIDENCE.md, "The bathroom's inside", says which is which, and what was got wrong on the way. */
    {
      const Bi = IN.bathIn, iu0 = bu + 0.1, iv0 = bv + 0.1, T = Bi.tile, rim = Bi.rim, tw = Bi.tub, tl = w - iv0, tu0 = d - tw, tc = d - (0.05 + tw - 0.085) / 2, sw = w - 0.012;
      const ochre = X.roomWall(Bi.wall), enamel = M.plain('#f6f5f1', 0.16), por = M.plain('#f5f5f2', 0.2), chr = X.chrome(), stone = X.marble(), cloth = M.plain('#f6f5f0', 0.95), mahog = M.plain('#6a3b25', 0.5), tile = X.bathTile();
      const tuv = { uv: [T.size * 2, T.size * 2], cast: false };
      b.box(X.vinyl(), iu0, -0.012, iv0, d, 0.003, w, { uv: [1.2, 1.2], uvw: true, cast: false });
      // the paint: a skin on each wall's inner face, the doorway left clear
      b.box(ochre, iu0, 0, w - 0.006, d, CEIL, w, { cast: false }); b.box(ochre, d - 0.006, 0, iv0, d, CEIL, w, { cast: false }); b.box(ochre, iu0, 0, iv0, iu0 + 0.006, CEIL, w, { cast: false });
      b.box(ochre, iu0, 0, iv0, bd0 - 0.06, CEIL, iv0 + 0.006, { cast: false }); b.box(ochre, bd1 + 0.06, 0, iv0, d, CEIL, iv0 + 0.006, { cast: false }); b.box(ochre, bd0 - 0.06, 2.09, iv0, bd1 + 0.06, CEIL, iv0 + 0.006, { cast: false });

      // THE TUB across the far end: white enamelled steel from wall to wall along the back wall, low (its rim 31 cm
      // over the floor), its waste at the party wall, a sloped back at the door's end
      b.push(d, 0, w, 180);                       // its own frame: x from the back wall out into the room, z from the party wall toward the door
      const ox0 = 0.05, ox1 = tw - 0.085, oz0 = 0.07, oz1 = tl - 0.065, deep = rim - 0.05;
      { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(tw + 0.008, 0); sh.lineTo(tw + 0.008, tl); sh.lineTo(0, tl); sh.lineTo(0, 0);
        const hole = new THREE.Path(); rounded(ox0, ox1, oz0, oz1, 0.11).forEach(([x, z], k) => (k ? hole.lineTo(x, z) : hole.moveTo(x, z))); hole.closePath(); sh.holes.push(hole);
        const dk = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }); dk.rotateX(Math.PI / 2); dk.translate(0, rim, 0); b.geo(enamel, dk); }
      set(b, enamel, hollow(ox0, ox1, oz0, oz1, 0.11, deep, [0.045, 0.045, 0.075, 0.27]), 0, rim - 0.014, 0, 0, { cast: false });
      b.box(enamel, tw - 0.022, 0, 0, tw, rim - 0.02, tl, {});                                                        // its apron
      b.cyl(chr, (ox0 + ox1) / 2, rim - 0.014 - deep, oz0 + 0.075 + 0.16, 0.03, 0.004, { seg: 14, cast: false });     // the waste
      b.cyl(chr, (ox0 + ox1) / 2, rim - 0.125, oz0 - 0.002, 0.034, 0.008, { rx: 90, seg: 16, cast: false });          // the overflow's plate
      b.pop(); b.solid(tu0, 0, iv0, d, 0.62, w);
      // six-inch flecked tiles on the three walls round it, from the rim to above head height
      b.box(tile, d - 0.012, rim, iv0, d, T.top, w, tuv); b.box(tile, tu0 - 0.012, rim, sw, d, T.top, w, tuv); b.box(tile, Math.max(tu0 - 0.012, bd1), rim, iv0, d, T.top, iv0 + 0.012, tuv);
      // its taps on the party wall: the valve's round plate with one lever, the spout below it, the shower's arm and rose above the tiles
      b.cyl(chr, tc, Bi.valve, sw, 0.072, 0.01, { rx: -90, seg: 22, cast: false }); b.cyl(chr, tc, Bi.valve, sw - 0.01, 0.045, 0.012, { rx: -90, seg: 18, cast: false }); b.cyl(chr, tc, Bi.valve, sw - 0.022, 0.02, 0.04, { rx: -90, seg: 12, cast: false });
      b.bar(chr, tc, Bi.valve, sw - 0.055, tc - 0.055, Bi.valve - 0.06, sw - 0.055, 0.015, { round: true, seg: 6, cast: false });
      b.cyl(chr, tc, Bi.spout, sw, 0.021, 0.115, { rx: -90, seg: 12, cast: false }); b.box(chr, tc - 0.021, Bi.spout - 0.04, sw - 0.135, tc + 0.021, Bi.spout + 0.021, sw - 0.1, { cast: false });
      b.cyl(chr, tc, Bi.spout + 0.021, sw - 0.118, 0.006, 0.02, { seg: 6, cast: false });                             // the diverter's pull
      b.cyl(chr, tc, Bi.rose, w - 0.006, 0.028, 0.006, { rx: -90, seg: 12, cast: false });
      b.bar(chr, tc, Bi.rose, w - 0.006, tc, Bi.rose - 0.03, w - 0.15, 0.016, { round: true, seg: 6, cast: false });
      { const rose = turned([[0.001, 0], [0.014, 0], [0.02, 0.03], [0.04, 0.055], [0.044, 0.062], [0.001, 0.062]], 14); set(b, chr, rose, tc, Bi.rose - 0.03, w - 0.145, 0, { rx: -118, cast: false }); }
      // the curtain's rod: its ends inside the tub's edge, bowed out over the room; the white curtain gathered at the taps' end
      const rodAt = t => [tu0 + 0.15 - 0.21 * Math.sin(Math.PI * t), iv0 + tl * t];
      for (let k = 0; k < 14; k++) { const [a0, c0] = rodAt(k / 14), [a1, c1] = rodAt((k + 1) / 14); b.bar(chr, a0, Bi.rod, c0, a1, Bi.rod, c1, 0.025, { round: true, seg: 8, cast: false }); }
      b.cyl(chr, tu0 + 0.15, Bi.rod, iv0 + 0.006, 0.027, 0.007, { rx: 90, seg: 12, cast: false }); b.cyl(chr, tu0 + 0.15, Bi.rod, w - 0.006, 0.027, 0.007, { rx: -90, seg: 12, cast: false });
      { const [a0, c0] = rodAt(0.7), [a1, c1] = rodAt(0.985), len = Math.hypot(a1 - a0, c1 - c0), ang = Math.atan2(c1 - c0, a1 - a0) * 180 / Math.PI;
        for (const [lean, fo, dp] of [[-2.6, 4.5, 0.05], [0, 5.5, 0.05], [2.5, 3.5, 0.045]]) set(b, cloth, drape(len, len + 0.06, Bi.rod - 0.1, fo, dp, 0.012), (a0 + a1) / 2, Bi.rod - 0.03, (c0 + c1) / 2, ang, { rx: lean, cast: false });   // the one cloth gathered: its folds fan apart toward the hem
        for (let k = 0; k <= 7; k++) { const [a, c] = rodAt(0.7 + 0.285 * k / 7); b.cyl(chr, a, Bi.rod - 0.034, c, 0.019, 0.004, { seg: 10, open: true, cast: false }); } }

      // THE PAN on the party wall, facing the door, its tank against the wall
      b.push(Bi.pan, 0, w - 0.006, 180);
      b.box(por, -0.235, 0.34, 0, 0.235, 0.712, 0.19, {}); b.box(por, -0.245, 0.712, -0.003, 0.245, 0.745, 0.198, {});
      b.box(chr, -0.205, 0.642, 0.19, -0.14, 0.657, 0.2, { cast: false }); b.box(chr, -0.205, 0.645, 0.2, -0.19, 0.654, 0.235, { cast: false });   // the flush lever
      { const bowl = turned([[0.001, 0], [0.11, 0], [0.115, 0.04], [0.092, 0.1], [0.1, 0.2], [0.145, 0.295], [0.182, 0.352], [0.188, 0.37], [0.001, 0.37]], 22); bowl.scale(1, 1, 1.32); set(b, por, bowl, 0, 0, 0.445); }
      set(b, por, cushion(0.375, 0.05, 0.47, 0.72, 0.7, 16), 0, 0.392, 0.455);
      b.box(por, -0.1, 0.2, 0.17, 0.1, 0.37, 0.3, { cast: false });
      b.pop(); b.solid(Bi.pan - 0.26, 0, w - 0.74, Bi.pan + 0.26, 0.8, w);
      // over its tank, on the party wall: a chromed shelf of rails with a bar under it, towels folded on it; beside the tank, the paper
      const Sf = Bi.shelf, f0 = Bi.pan - Sf.w / 2, f1 = Bi.pan + Sf.w / 2;
      for (let k = 0; k < 5; k++) b.bar(chr, f0, Sf.y, w - 0.03 - k * 0.045, f1, Sf.y, w - 0.03 - k * 0.045, 0.01, { round: true, seg: 6, cast: false });
      b.bar(chr, f0 + 0.02, Sf.y - 0.075, w - 0.2, f1 - 0.02, Sf.y - 0.075, w - 0.2, 0.018, { round: true, seg: 8, cast: false });
      for (const u of [f0 + 0.015, f1 - 0.015]) {
        b.bar(chr, u, Sf.y, w - 0.006, u, Sf.y, w - 0.225, 0.012, { cast: false }); b.bar(chr, u, Sf.y, w - 0.2, u, Sf.y - 0.075, w - 0.2, 0.012, { cast: false });
        b.bar(chr, u, Sf.y - 0.1, w - 0.006, u, Sf.y - 0.075, w - 0.2, 0.012, { cast: false }); b.cyl(chr, u, Sf.y - 0.06, w - 0.006, 0.026, 0.008, { rx: -90, seg: 12, cast: false });
      }
      for (const [u, y, ry] of [[f0 + 0.135, 0.045, 0], [f1 - 0.135, 0.045, 0], [(f0 + f1) / 2 - 0.02, 0.12, 6]]) set(b, cloth, eased(0.24, 0.078, 0.19, 0.034, { k: 3 }), u, Sf.y + y, w - 0.12, ry);
      const Pp = Bi.paper;
      for (const du of [-0.08, 0.08]) { b.box(chr, Pp.u + du - 0.018, Pp.y - 0.018, w - 0.014, Pp.u + du + 0.018, Pp.y + 0.018, w - 0.006, { cast: false }); b.box(chr, Pp.u + du - 0.007, Pp.y - 0.009, w - 0.07, Pp.u + du + 0.007, Pp.y + 0.009, w - 0.014, { cast: false }); }
      b.cyl(chr, Pp.u + 0.075, Pp.y, w - 0.062, 0.006, 0.15, { rz: 90, seg: 6, cast: false });
      b.cyl(M.plain('#f7f6f2', 0.95), Pp.u + 0.055, Pp.y - 0.03, w - 0.062, 0.052, 0.11, { rz: 90, seg: 16, cast: false });

      // THE BASIN to the right, in the far corner against the wall that carries the print: a white cabinet with a dark
      // pull strip along it; its top of flecked cultured marble with the bowl cast in it, a splash up the two walls; one
      // chrome tap with a lever; over it a mirror in a dark frame and the tube light in its white cover
      const V = Bi.vanity, vf = iu0 + V.depth, vn = V.v0, vy = V.h - 0.04, bcu = iu0 + 0.3, bcv = (vn + w) / 2;
      b.box(white, iu0, 0.1, vn, vf - 0.02, vy - 0.1, w, {}); b.box(plain('#2a2522', 0.8), iu0, 0, vn + 0.02, vf - 0.07, 0.1, w, { cast: false });   // the carcase stops under the bowl
      b.box(white, vf - 0.036, vy - 0.1, vn, vf - 0.02, vy, w, { cast: false }); b.box(white, iu0, vy - 0.1, vn, vf - 0.036, vy, vn + 0.016, { cast: false });
      b.box(mahog, vf - 0.02, vy - 0.15, vn, vf - 0.006, vy - 0.114, w - 0.004, { cast: false });
      { const mid = (vn + w) / 2; for (const [v0, v1] of [[vn + 0.004, mid - 0.002], [mid + 0.002, w - 0.004]]) b.box(white, vf - 0.02, 0.105, v0, vf - 0.004, vy - 0.153, v1, { cast: false }); }
      b.quad(ctx.lampMat('#f1efe8', 0.2, 1, 0), '-z', (iu0 + vf - 0.02) / 2, (0.1 + vy) / 2, vn - 0.0015, vf - 0.02 - iu0, vy - 0.1, { cast: false });   // its end, turned from the lamp: what the walls throw back on it
      b.solid(iu0, 0, vn, vf + 0.02, V.h + 0.1, w);
      { const sh = new THREE.Shape(), f = vf + 0.02, e = vn - 0.012;
        sh.moveTo(iu0, w - 0.006); sh.lineTo(f, w - 0.006); sh.lineTo(f, e + 0.04); sh.quadraticCurveTo(f, e, f - 0.04, e); sh.lineTo(iu0, e); sh.lineTo(iu0, w - 0.006);
        const hole = new THREE.Path(); hole.absellipse(bcu, bcv, 0.145, 0.19, 0, Math.PI * 2, true, 0); sh.holes.push(hole);
        const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false, curveSegments: 22 }); tg.rotateX(Math.PI / 2); tg.translate(0, V.h, 0); b.geo(stone, tg);
        const bowl = turned([[0.001, -0.11], [0.3, -0.107], [0.62, -0.086], [0.86, -0.048], [0.97, -0.014], [1, 0.001]], 28); bowl.scale(0.145, 1, 0.19); bowl.translate(bcu, V.h - 0.001, bcv); b.geo(X.marbleIn(), flatUV(bowl), { cast: false }); }
      b.cyl(chr, bcu - 0.02, V.h - 0.112, bcv, 0.02, 0.004, { seg: 12, cast: false });
      const sp = { uv: [1, 1], uvw: true, cast: false };
      b.box(stone, iu0 + 0.006, V.h, vn - 0.012, iu0 + 0.022, V.h + 0.1, w - 0.006, sp); b.box(stone, iu0 + 0.022, V.h, sw - 0.01, vf + 0.02, V.h + 0.1, sw + 0.006, sp);
      b.box(chr, iu0 + 0.072, V.h, bcv - 0.078, iu0 + 0.13, V.h + 0.012, bcv + 0.078, { cast: false }); b.cyl(chr, iu0 + 0.1, V.h + 0.01, bcv, 0.024, 0.06, { r2: 0.02, seg: 12, cast: false });
      b.bar(chr, iu0 + 0.1, V.h + 0.05, bcv, iu0 + 0.2, V.h + 0.075, bcv, 0.026, { round: true, seg: 8, cast: false }); b.cyl(chr, iu0 + 0.2, V.h + 0.05, bcv, 0.012, 0.03, { seg: 8, cast: false });
      b.bar(chr, iu0 + 0.1, V.h + 0.07, bcv, iu0 + 0.15, V.h + 0.13, bcv, 0.014, { round: true, seg: 6, cast: false });
      for (const [a2, c2, y2, ry2] of [[0.14, 0.13, 0.018, 3], [0.13, 0.12, 0.05, -4]]) set(b, cloth, eased(a2, y2 < 0.03 ? 0.036 : 0.03, c2, 0.014, { k: 2 }), iu0 + 0.14, V.h + y2, w - 0.13, ry2, { cast: false });   // face cloths, folded
      const m0 = vn + 0.1, m1 = w - 0.1;
      b.box(X.espresso(), iu0 + 0.006, 1.0, m0, iu0 + 0.03, 1.86, m1, { uv: [1, 1] });
      b.quad(new THREE.MeshStandardMaterial({ map: bathMirrorTex(), roughness: 0.08, metalness: 0.15, envMapIntensity: 0.6 }), '+x', iu0 + 0.031, 1.43, (m0 + m1) / 2, m1 - m0 - 0.14, 0.86 - 0.14, { cast: false });
      b.box(plain('#f1efe8', 0.5), iu0 + 0.006, 2.2, m0 + 0.08, iu0 + 0.028, 2.32, m1 - 0.08, { cast: false }); set(b, ctx.lampMat('#fff5e6', 1.9, 0.95, 0.9), eased(0.085, 0.105, m1 - m0 - 0.2, 0.035, { k: 3 }), iu0 + 0.07, 2.26, (m0 + m1) / 2, 0, { cast: false });

      // the dark base along the floor where the walls are bare, and the fan's grille overhead
      for (const [u0, v0, u1, v1] of [[vf + 0.02, w - 0.016, tu0, w - 0.006], [iu0 + 0.006, iv0 + 0.006, bd0 - 0.06, iv0 + 0.016], [iu0 + 0.006, iv0 + 0.006, iu0 + 0.016, vn - 0.012]]) b.box(base, u0, 0, v0, u1, 0.1, v1, { cast: false });
      grille(5.15, 2.75, 0.26, 0.26, false);
    }
    b.pop();
  }, 'room');

  /* the doors that open and shut: the entry (hinged at its north jamb, swinging in across the closet) and the
     bathroom's (hinged at its east jamb, swinging out toward the kitchen, as on 18/9) */
  const doorMat = M.plain('#4b3d34', 0.55), satin = M.plain('#aeb2b5', 0.35, 0.8);
  const hinge = (x, z, build) => { const pv = new THREE.Group(); pv.position.set(x, G2, z); part(pv, null, build, 'leaf'); scene.add(pv); return pv; };
  const DW = IN.door[1] - IN.door[0];
  const entry = hinge(ROOM.x0 - 0.09, ROOM.z0 + IN.door[0], b => {
    doorLeaf(b, DW, IN.doorH - 0.01, doorMat, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' });
    b.box(satin, DW - 0.13, 0.9, -0.034, DW - 0.055, 1.17, 0.034, { cast: false });                                  // the card lock's plate
    b.box(M.plain('#efe8d8', 0.5), DW - 0.003, 0.012, -0.021, DW + 0.001, IN.doorH - 0.01, 0.021, { cast: false });      // the leaf's cream edge
    b.box(satin, DW - 0.13, 1.5, -0.05, DW - 0.03, 1.535, -0.03, { cast: false });                                   // the swing bar of the guard
    b.box(satin, DW - 0.13, 1.47, -0.034, DW - 0.1, 1.565, -0.03, { cast: false });
    b.cyl(M.plain('#c9ccd0', 0.3, 0.9), DW / 2, 1.52, -0.03, 0.008, 0.01, { rx: 90, seg: 8, cast: false });          // the peephole
  });
  const BW = IN.bathDoor[1] - IN.bathDoor[0] - 0.01;
  const bath = hinge(ROOM.x0 + IN.bathDoor[1] - 0.005, ROOM.z0 + IN.bath.v0 + 0.05, b => {
    doorLeaf(b, BW, 2.02, M.plain('#e6dcc6', 0.5), { rows: [], handle: 'none' });                                      // a flat slab
    for (const sd of [-1, 1]) { b.cyl(satin, BW - 0.07, 1.02, sd * 0.02, 0.03, 0.012, { rx: 90 * sd, seg: 14, cast: false }); b.cyl(satin, BW - 0.07, 1.02, sd * 0.032, 0.011, 0.03, { rx: 90 * sd, seg: 8, cast: false }); b.box(satin, BW - 0.185, 1.012, sd * 0.05, BW - 0.06, 1.03, sd * 0.062, { cast: false }); }   // a lever on a round rose, as his picture of 18/9 shows
    b.box(X.chrome(), BW / 2 - 0.022, 1.655, -0.026, BW / 2 + 0.022, 1.705, -0.02, { cast: false });                   // the hook on its inside: a plate and two prongs
    for (const du of [-0.012, 0.012]) { b.bar(X.chrome(), BW / 2 + du, 1.68, -0.026, BW / 2 + du * 1.6, 1.668, -0.058, 0.008, { cast: false }); b.bar(X.chrome(), BW / 2 + du * 1.6, 1.668, -0.058, BW / 2 + du * 1.6, 1.69, -0.064, 0.008, { cast: false }); }
  });

  /* curtains: open by day, drawn at night (as in every photograph after dark); the plaid repeats every 0.30 m */
  const ca = parts.curtainsAt, cmat = X.plaid(), cH = ca.y1 - ca.y0, mid = (ca.v0 + ca.v1) / 2, rep = (wd, full) => [wd * full / 0.3, cH / 0.3];
  const curtains = {
    open: part(scene, null, b => { b.push(ROOM.x0, G2, ROOM.z0); curtain(b, cmat, ca.v0, ca.v0 + 0.36, ca.y0, ca.y1, 0, { folds: 7, depth: 0.05, uvr: rep(0.36, 2.6) }); curtain(b, cmat, ca.v1 - 0.36, ca.v1, ca.y0, ca.y1, 0, { folds: 7, depth: 0.05, uvr: rep(0.36, 2.6) }); b.pop(); }, 'curtainsOpen'),
    shut: part(scene, null, b => { b.push(ROOM.x0, G2, ROOM.z0); curtain(b, cmat, ca.v0, mid + 0.02, ca.y0, ca.y1, 0, { folds: 10, depth: 0.032, uvr: rep(mid - ca.v0, 1.2) }); curtain(b, cmat, mid - 0.02, ca.v1, ca.y0, ca.y1, 0, { folds: 10, depth: 0.032, uvr: rep(ca.v1 - mid, 1.2) }); b.pop(); }, 'curtainsShut'),
  };
  fixCurtains(curtains, ca);

  /* the pools of light the shades throw on the wall behind them, when the lamps burn */
  const glows = new THREE.Group(), glowMat = new THREE.MeshBasicMaterial({ map: glowTex(), color: '#ffd9a0', transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glow = (u, y, v, south, size) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), glowMat); m.position.set(ROOM.x0 + u, G2 + y, ROOM.z0 + v); if (south) m.rotation.y = Math.PI; m.renderOrder = 2; glows.add(m); };
  glow(IN.tvLamp.u, 1.68, 0.004, false, 1.1); glow(IN.wallLamp.su, 1.74, 0.004, false, 0.8);
  for (const l of IN.bedLamps) glow(l.u + l.du, 1.5, Wd() - 0.004, true, 1.05);
  glows.visible = false; scene.add(glows);

  /* the screens: the TV (off unless touched) and the laptop's lock screen */
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(parts.tvAt.w, parts.tvAt.h), new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 0.12, metalness: 0.2, emissive: '#000000' }));
  tvScreen.position.set(ROOM.x0 + parts.tvAt.u, G2 + parts.tvAt.y, ROOM.z0 + parts.tvAt.v); scene.add(tvScreen);
  const tvGlow = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 72; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t }; })();
  const sa = parts.screenAt, yaw = -sa.ry * Math.PI / 180, tilt = sa.tilt;
  const laptop = new THREE.Mesh(new THREE.PlaneGeometry(0.345, 0.195), new THREE.MeshBasicMaterial({ map: screenTex(), toneMapped: false }));
  { // the lid's inner face: half-way up the lid from the hinge at the base's back edge, a hair in front of it
    const back = new THREE.Vector3(0, 0.016 + 0.1225 * Math.cos(tilt) + 0.005 * Math.sin(tilt), -0.1275 - 0.1225 * Math.sin(tilt) + 0.005 * Math.cos(tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    laptop.position.set(ROOM.x0 + sa.u + back.x, G2 + sa.y + back.y, ROOM.z0 + sa.v + back.z); laptop.rotation.set(-tilt, yaw, 0, 'YXZ'); scene.add(laptop);
    parts.screenPos = [sa.u + back.x, sa.y + back.y, sa.v + back.z]; }
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.08), new THREE.MeshStandardMaterial({ map: badgeTex(), roughness: 0.4 }));
  badge.position.set(ROOM.x0 + parts.badgeAt.u, G2 + parts.badgeAt.y, ROOM.z0 + parts.badgeAt.v); badge.rotation.set(-Math.PI / 2, 0, 0.4); scene.add(badge);

  /* bright dots */
  const P = (u, y, v) => [ROOM.x0 + u, G2 + y, ROOM.z0 + v];
  ctx.hot.push({ id: 'tv', pos: P(parts.tvAt.u, IN.tv.y1 + 0.1, parts.tvAt.v + 0.05), r: 0.2 });
  ctx.hot.push({ id: 'bed', pos: P((IN.bed.u0 + IN.bed.u1) / 2, 0.85, IN.bed.v0 + 1.0), r: 0.25 });
  ctx.hot.push({ id: 'laptop', pos: P(parts.screenPos[0], parts.screenPos[1] + 0.17, parts.screenPos[2]), r: 0.16 });
  ctx.hot.push({ id: 'badge', pos: P(parts.badgeAt.u, 1.0, parts.badgeAt.v), r: 0.12 });
  ctx.hot.push({ id: 'counter', pos: P(IN.counter.u1 - 0.1, 1.02, IN.counter.v1 - 0.06), r: 0.14 });
  ctx.hot.push({ id: 'kitchen', pos: P(D() - 0.4, 1.28, 1.35), r: 0.22 });
  ctx.hot.push({ id: 'print', pos: P(IN.bath.u0 - 0.06, IN.print.y1 + 0.12, (IN.print.v0 + IN.print.v1) / 2), r: 0.18 });
  ctx.hot.push({ id: 'door', pos: P(0.25, 1.75, IN.door[0] + 0.5), r: 0.2 });
  ctx.hot.push({ id: 'closet', pos: P(0.9, 1.5, 0.5), r: 0.18 });
  ctx.hot.push({ id: 'bathdoor', pos: P(IN.bathDoor[0] + 0.3, 1.8, IN.bath.v0 - 0.12), r: 0.18 });
  ctx.hot.push({ id: 'bathdoor', pos: P(IN.bathDoor[0] + 0.3, 1.8, IN.bath.v0 + 0.17), r: 0.16 });                 // and on its inside: shut, the other cannot be seen from within
  ctx.hot.push({ id: 'bath', pos: P(IN.bath.u0 + 0.15, 1.5, IN.bath.v0 + 0.36), r: 0.16 });                      // on the bare wall to the right of the door
  ctx.hot.push({ id: 'curtain', pos: P(0.3, 1.9, (IN.win[0] + IN.win[1]) / 2), r: 0.2 });
  ctx.hot.push({ id: 'mirror', pos: P((IN.mirror.u0 + IN.mirror.u1) / 2, IN.mirror.crown + 0.2, 0.08), r: 0.15 });

  const state = { entry: 1, bath: 0, tv: false, night: false, curtainsShut: null };
  const setDoors = () => { entry.rotation.y = -(90 - 88 * state.entry) * Math.PI / 180; bath.rotation.y = Math.PI - (state.bath ? 62 : 0) * Math.PI / 180; };
  setDoors();
  function setCurtains(shut) { state.curtainsShut = shut; curtains.open.visible = !shut; curtains.shut.visible = shut; }
  function setTv(on) {
    state.tv = on; const m = tvScreen.material;
    if (on) { const g2 = tvGlow.c.getContext('2d'), gr = g2.createLinearGradient(0, 0, 128, 72); gr.addColorStop(0, '#2d6fb0'); gr.addColorStop(0.5, '#8fb7d8'); gr.addColorStop(1, '#c9773e'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 72); g2.fillStyle = 'rgba(255,255,255,0.85)'; g2.fillRect(8, 52, 60, 10); tvGlow.t.needsUpdate = true; m.emissive.set('#ffffff'); m.emissiveMap = tvGlow.t; m.emissiveIntensity = 1.1; m.color.set('#000'); }
    else { m.emissive.set('#000000'); m.emissiveMap = null; m.emissiveIntensity = 0; }
    m.needsUpdate = true;
  }
  return {
    group: g, state, setTv, setCurtains,
    /** whether the doorway of the entry is passable: the walker is stopped by a shut door */
    entryOpen: () => state.entry > 0.5, bathOpen: () => state.bath > 0.5,
    toggle(id) {
      if (id === 'door') { state.entry = state.entry ? 0 : 1; setDoors(); return state.entry ? 'open' : 'shut'; }
      if (id === 'bathdoor') { state.bath = state.bath ? 0 : 1; setDoors(); return state.bath ? 'open' : 'shut'; }
      if (id === 'curtain') { setCurtains(!state.curtainsShut); return state.curtainsShut ? 'shut' : 'open'; }
      if (id === 'tv') { setTv(!state.tv); return state.tv; }
      return undefined;
    },
    setHour(night) { state.night = night; setCurtains(night); glows.visible = night; },
  };
}

/** curtain() in furn.js hangs a cloth along local x facing +z; the front wall here runs along z and the room is +x */
function fixCurtains(curtains, ca) {
  for (const grp of Object.values(curtains)) {
    grp.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, p = g.attributes.position;
      // the cloth was laid at (x = v along the wall, z = 0) in the room frame: swap to (x = u, z = v)
      g.translate(-ROOM.x0, 0, -ROOM.z0);
      for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vz = p.getZ(i); p.setXYZ(i, ROOM.x0 + ca.u + vz, p.getY(i), ROOM.z0 + vx); }
      p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
      o.castShadow = false;
    });
  }
}
