/* The cabin of his car: a black 2014 Toyota Camry SE, as his photographs show it (Sonic Hub: usa/camry-2014, the ten
   pictures of 24/10/2019; usa/my-car-vs-lang-thang-1-minh, the cabin on the road in 2019–2020):
     · a black dashboard, a pale grey headliner and pillar trims;
     · a three-spoke wheel, black leather, its lower spoke a V of satin silver, round switch pads left and right;
     · three dials under one hood: the engine's turning on the left, the speed (to 140 mph) in the middle, fuel and
       heat on the right; white figures that glow blue-white after dark;
     · a centre stack framed in satin silver: two vents, the 6.1-inch screen between two columns of buttons (AUDIO,
       SEEK, TRACK · telephone, CAR) and under two knobs; the hazard button; two big knobs for the air, a row of
       buttons between them, four more below;
     · on the middle vent the telephone's cradle, and a blue air-freshener clipped to the right one.
   No maker's badge is drawn: the wheel's boss carries a plain oval.
   Metres, the car's own frame: x to its right, y up from the road, z to its BACK (it drives towards −z); the origin is
   on the road under the car's middle. The cabin is a scene of its own, drawn over the world after the depth is cleared:
   it can be as near to the eye as it is without the world's far streets losing their depth. */
import * as THREE from 'three';

export const EYE = [-0.37, 1.17, 0.02];      // the driver's eye
const WHEEL = [-0.37, 0.895, -0.42], TILT = 22 * Math.PI / 180;
const STACK = { x0: -0.15, x1: 0.15, top: [1.0, -0.56], foot: [0.6, -0.44] };   // it stands proud of the dashboard's own face    // [y, z] of the face's top and bottom edges
const SCREEN = { w: 0.135, h: 0.081, v: 0.672 };                                     // the screen: its size, and how far up the face its middle is

function tex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/** the dials' face: 0.37 m wide. Lit: the same figures on black, for the glow after dark. */
function clusterFace() {
  return tex(1024, 384, (g, W, H) => {
    g.fillStyle = '#060708'; g.fillRect(0, 0, W, H);
    const dial = (cx, cy, r, from, to, step, minor, label, red) => {
      const ring = g.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.06); ring.addColorStop(0, '#0b0c0e'); ring.addColorStop(0.75, '#2a2e33'); ring.addColorStop(0.9, '#9aa3ad'); ring.addColorStop(1, '#1a1c1f');
      g.fillStyle = ring; g.beginPath(); g.arc(cx, cy, r * 1.06, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0b0d'; g.beginPath(); g.arc(cx, cy, r * 0.97, 0, Math.PI * 2); g.fill();
      const n = Math.round((to - from) / minor);
      for (let k = 0; k <= n; k++) {
        const v = from + k * minor, f = (v - from) / (to - from), a = (225 - 270 * f) * Math.PI / 180, major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
        const r0 = r * (major ? 0.8 : 0.87), r1 = r * 0.94; g.strokeStyle = red != null && v >= red ? '#ff4a3a' : '#eef3f8'; g.lineWidth = major ? 4 : 2;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); g.stroke();
        if (major && label) { g.fillStyle = red != null && v >= red ? '#ff5a4a' : '#f2f6fa'; g.font = `600 ${Math.round(r * 0.19)}px Arial, Helvetica, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label(v), cx + Math.cos(a) * r * 0.64, cy - Math.sin(a) * r * 0.64); }
      }
      const hub = g.createRadialGradient(cx, cy, 2, cx, cy, r * 0.2); hub.addColorStop(0, '#3b6fb0'); hub.addColorStop(0.6, '#16263c'); hub.addColorStop(1, '#0a0b0d'); g.fillStyle = hub; g.beginPath(); g.arc(cx, cy, r * 0.2, 0, Math.PI * 2); g.fill();
    };
    dial(512, 196, 168, 0, 140, 20, 5, v => String(v), null);
    g.fillStyle = '#aeb9c4'; g.font = '500 22px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('MPH', 512, 268);
    dial(176, 206, 132, 0, 8, 1, 0.5, v => String(v), 6.5);
    g.fillStyle = '#aeb9c4'; g.font = '500 17px Arial, Helvetica, sans-serif'; g.fillText('×1000 r/min', 176, 262);
    // fuel and heat: two short arcs in the right-hand dial
    const cx = 848, cy = 206, r = 132; { const ring = g.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.06); ring.addColorStop(0, '#0b0c0e'); ring.addColorStop(0.75, '#2a2e33'); ring.addColorStop(0.9, '#9aa3ad'); ring.addColorStop(1, '#1a1c1f'); g.fillStyle = ring; g.beginPath(); g.arc(cx, cy, r * 1.06, 0, Math.PI * 2); g.fill(); g.fillStyle = '#0a0b0d'; g.beginPath(); g.arc(cx, cy, r * 0.97, 0, Math.PI * 2); g.fill(); }
    for (const [a0, a1, l0, l1] of [[205, 155, 'E', 'F'], [25, -25, 'H', 'C']]) {
      for (let k = 0; k <= 4; k++) { const a = (a0 + (a1 - a0) * k / 4) * Math.PI / 180; g.strokeStyle = '#eef3f8'; g.lineWidth = k % 2 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.8, cy - Math.sin(a) * r * 0.8); g.lineTo(cx + Math.cos(a) * r * 0.93, cy - Math.sin(a) * r * 0.93); g.stroke(); }
      g.fillStyle = '#f2f6fa'; g.font = '600 24px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const [a, s] of [[a0, l0], [a1, l1]]) g.fillText(s, cx + Math.cos(a * Math.PI / 180) * r * 0.64, cy - Math.sin(a * Math.PI / 180) * r * 0.64);
    }
    // the two small windows under the outer dials (distance run; the gear)
    for (const x of [176, 848]) { g.fillStyle = '#93a7b8'; g.fillRect(x - 46, 296, 92, 34); g.fillStyle = '#0d1420'; g.font = '600 22px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(x < 500 ? 'TRIP A' : 'P R N D', x, 314); }
  });
}
/** the centre stack's face (0.31 m × 0.445 m), everything on it that does not change */
function stackFace() {
  return tex(620, 890, (g, W, H) => {
    const silver = g.createLinearGradient(0, 0, W, 0); silver.addColorStop(0, '#8e9398'); silver.addColorStop(0.5, '#c9cdd1'); silver.addColorStop(1, '#8e9398');
    g.fillStyle = '#101113'; g.fillRect(0, 0, W, H);
    // the hood and the two vents
    g.fillStyle = '#17181a'; g.fillRect(40, 20, W - 80, 150);
    for (const x of [70, 320]) { g.fillStyle = '#050506'; g.fillRect(x, 52, 230, 96); g.fillStyle = '#26282b'; for (let k = 0; k < 5; k++) g.fillRect(x + 4, 60 + k * 18, 222, 7); g.fillStyle = '#3a3d41'; g.fillRect(x + 108, 52, 14, 96); }
    // the head unit in its silver frame
    g.fillStyle = silver; g.fillRect(24, 178, W - 48, 330);
    g.fillStyle = '#0b0c0e'; g.fillRect(40, 192, W - 80, 302);
    g.fillStyle = '#000'; g.fillRect(170, 234, 280, 174);                                // behind the screen
    const knob = (x, y, r) => { const k = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); k.addColorStop(0, '#5a5e63'); k.addColorStop(0.7, '#1c1e21'); k.addColorStop(1, '#060607'); g.fillStyle = silver; g.beginPath(); g.arc(x, y, r + 5, 0, 7); g.fill(); g.fillStyle = k; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    knob(92, 228, 30); knob(W - 92, 228, 30);
    g.fillStyle = '#9aa3ab'; g.font = '500 12px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('PWR · VOL', 92, 206); g.fillText('TUNE · SCROLL', W - 96, 206);
    const btn = (x, y, w, h, label) => { g.fillStyle = '#1b1d20'; g.fillRect(x, y, w, h); g.strokeStyle = '#3b3f44'; g.lineWidth = 1.5; g.strokeRect(x + 1, y + 1, w - 2, h - 2); if (label) { g.fillStyle = '#dfe5ea'; g.font = '600 15px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + w / 2, y + h / 2 + 1); } };
    btn(54, 276, 96, 44, 'AUDIO'); btn(54, 328, 96, 44, 'SEEK ∧'); btn(54, 380, 96, 44, 'TRACK ∨');
    btn(W - 150, 276, 96, 44, '☎'); btn(W - 150, 328, 96, 44, 'CAR'); btn(W - 150, 380, 96, 44, '▶ ❙❙');
    g.fillStyle = '#16181a'; g.fillRect(170, 428, 280, 46); g.fillStyle = '#04050a'; g.fillRect(180, 446, 260, 6);     // the disc slot
    // hazard, and the small lamps beside it
    g.fillStyle = '#0d0e10'; g.fillRect(24, 508, W - 48, 70);
    g.fillStyle = silver; g.fillRect(262, 518, 96, 50); g.fillStyle = '#c4281c'; g.beginPath(); g.moveTo(310, 526); g.lineTo(334, 562); g.lineTo(286, 562); g.closePath(); g.fill(); g.fillStyle = '#e9c9c4'; g.beginPath(); g.moveTo(310, 538); g.lineTo(322, 556); g.lineTo(298, 556); g.closePath(); g.fill();
    g.fillStyle = '#8a929a'; g.font = '500 11px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('SECURITY', 150, 536); g.fillText('PASSENGER', 468, 532); g.fillText('AIR BAG', 468, 546);
    // the air: two big knobs, buttons between, four below
    g.fillStyle = silver; g.fillRect(24, 582, W - 48, 286); g.fillStyle = '#0e0f11'; g.fillRect(36, 592, W - 72, 266);
    knob(124, 678, 62); knob(W - 124, 678, 62);
    g.fillStyle = '#dfe5ea'; g.font = '600 15px Arial, Helvetica, sans-serif'; g.fillText('LO', 84, 650); g.fillText('HI', 166, 650); g.fillText('OFF', 124, 724); g.fillText('MAX', W - 124, 664); g.fillText('A/C', W - 124, 684);
    btn(214, 622, 92, 40, 'FRONT'); btn(314, 622, 92, 40, 'A/C'); btn(214, 672, 92, 40, 'REAR'); btn(314, 672, 92, 40, '⟲');
    for (let k = 0; k < 4; k++) { btn(64 + k * 126, 772, 112, 58, ['↗', '↗↘', '↘', '≋'][k]); g.fillStyle = k === 1 ? '#49d36a' : '#1c3a23'; g.fillRect(104 + k * 126, 778, 32, 5); }
  });
}

/** every piece that never moves, put together by what it is made of */
function Parts() {
  const by = new Map();
  const add = (mat, geo, m) => { const g = geo.index ? geo.toNonIndexed() : geo; if (m) g.applyMatrix4(m); if (!by.has(mat)) by.set(mat, []); by.get(mat).push(g); };
  const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
  return {
    box(mat, w, h, d, x, y, z, rx, ry, rz) { add(mat, new THREE.BoxGeometry(w, h, d), M4(x, y, z, rx, ry, rz)); },
    cyl(mat, r0, r1, h, seg, x, y, z, rx, ry, rz) { add(mat, new THREE.CylinderGeometry(r0, r1, h, seg), M4(x, y, z, rx, ry, rz)); },
    geo(mat, geo, m) { add(mat, geo, m); }, M4,
    build(group) {
      for (const [mat, list] of by) {
        let n = 0; for (const g of list) n += g.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
        for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
        const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        const mesh = new THREE.Mesh(out, mat); mesh.frustumCulled = false; group.add(mesh);
      }
    },
  };
}

/**
 * @param o { screen: the texture the middle screen shows (engine/world/headunit.js draws it), phone: another for the
 *            telephone in its cradle (may be null) }
 * @returns { scene, camera, update(state, dt, sunInCar, night), look(dx, dy), pick(ndcX, ndcY) → 'screen' | null, resize(aspect) }
 */
export function setupCabin(o) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.03, 9);
  const hemi = new THREE.HemisphereLight('#dfe7f0', '#3a342c', 1.0), sun = new THREE.DirectionalLight('#fff1dc', 1.6), fill = new THREE.PointLight('#bcd3ff', 0, 1.6, 2);
  fill.position.set(-0.2, 1.05, -0.45); scene.add(hemi, sun, sun.target, fill);

  const mat = (c, r, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
  const dash = mat('#17181a', 0.93), pad = mat('#1c1d20', 0.86), deep = mat('#0b0c0d', 0.9), silver = mat('#8f9398', 0.46, 0.6), satin = mat('#5f6368', 0.6, 0.35), gloss = mat('#08090a', 0.22, 0.1), leather = mat('#141415', 0.58), liner = mat('#8f8b83', 1), pillar = mat('#85817a', 1);
  const rubber = mat('#0c0c0d', 0.8), paint = mat('#060709', 0.2, 0.55), mirror = new THREE.MeshBasicMaterial({ map: tex(128, 64, (g, w, h) => { const k = g.createLinearGradient(0, 0, 0, h); k.addColorStop(0, '#93a6b6'); k.addColorStop(0.42, '#aebdc8'); k.addColorStop(0.5, '#5d6770'); k.addColorStop(1, '#23272c'); g.fillStyle = k; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(20,22,26,0.85)'; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = 'rgba(16,18,20,0.9)'; g.fillRect(w * 0.08, h * 0.5, w * 0.2, h * 0.5); g.fillRect(w * 0.72, h * 0.5, w * 0.2, h * 0.5); }), toneMapped: true }), cloth = mat('#1a1b1d', 0.97), stripe = mat('#55585c', 0.95), blue = mat('#2f6fb6', 0.5), glass = mat('#0a0f16', 0.12, 0.2);
  const faceTex = clusterFace();
  const cluster = new THREE.MeshStandardMaterial({ map: faceTex, emissiveMap: faceTex, emissive: '#bcd6ff', emissiveIntensity: 0.25, roughness: 0.5 });
  const stackTex = stackFace();
  const stack = new THREE.MeshStandardMaterial({ map: stackTex, emissiveMap: stackTex, emissive: '#9fc4ff', emissiveIntensity: 0, roughness: 0.55, metalness: 0.15 });
  const screen = new THREE.MeshBasicMaterial({ map: o.screen, toneMapped: false });
  const needle = new THREE.MeshBasicMaterial({ color: '#f4f8ff', toneMapped: false }), arrowOff = '#0d2a14', arrowOn = '#3dff7a';

  const car = new THREE.Group(); scene.add(car);
  const P = Parts();
  /* the dashboard: its section (forward of the eye's plane, up) changes across the car — plain before the passenger;
     before the driver a hood rises over a well, and the dials stand at the back of the well */
  { const PLAIN = [[1.12, 0.93], [1.0, 0.955], [0.86, 0.966], [0.66, 0.972], [0.575, 0.968], [0.55, 0.952], [0.535, 0.9], [0.52, 0.8], [0.505, 0.7], [0.5, 0.6], [0.46, 0.45]];
    const full = L => [[1.12, 0.93], [1.0, 0.957 + L * 0.25], [0.86, 0.968 + L * 0.95], [0.66, 0.975 + L], [0.632, 0.955 + L], [0.8, 0.968], [0.75, 0.835], [0.57, 0.8], [0.505, 0.72], [0.5, 0.6], [0.46, 0.45]];
    const arch = t => 0.062 * Math.sin(t * Math.PI / 2);
    const sections = [[-0.79, PLAIN], [-0.64, PLAIN], [-0.612, full(arch(0.12))], [-0.55, full(arch(0.5))], [-0.46, full(arch(0.86))], [-0.37, full(arch(1))], [-0.28, full(arch(0.86))], [-0.19, full(arch(0.5))], [-0.128, full(arch(0.12))], [-0.1, PLAIN], [0.79, PLAIN]];
    const n = PLAIN.length, pos = [], idx = [];
    for (const [x, p] of sections) for (const [u, y] of p) pos.push(x, y, -u);
    for (let i = 0; i < sections.length - 1; i++) for (let k = 0; k < n - 1; k++) { const a = i * n + k, b = a + 1, c = a + n, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); P.geo(dash, g); }
  // the silver line across the passenger's side, the glove box's door, the dark floor of the well
  P.box(silver, 0.6, 0.012, 0.012, 0.47, 0.8, -0.524); P.box(deep, 0.5, 0.17, 0.012, 0.47, 0.7, -0.508, -0.05);
  // the centre stack's body, its silver cheeks, and the top that stands a little proud of the dashboard
  const sy = (STACK.top[0] + STACK.foot[0]) / 2, sz = (STACK.top[1] + STACK.foot[1]) / 2, slen = Math.hypot(STACK.top[0] - STACK.foot[0], STACK.top[1] - STACK.foot[1]), slope = Math.atan2(STACK.foot[1] - STACK.top[1], STACK.top[0] - STACK.foot[0]);
  P.box(deep, 0.31, slen, 0.14, 0, sy - 0.02, sz - 0.075, -slope);
  for (const sx of [-0.16, 0.16]) P.box(silver, 0.012, slen * 0.82, 0.03, sx, sy - 0.035, sz + 0.006, -slope);
  P.box(dash, 0.32, 0.03, 0.13, 0, 1.0, -0.62, 0.06);
  // the console between the seats: the gate of the lever, two cup holders in a silver surround, the armrest
  P.box(dash, 0.27, 0.2, 0.95, 0, 0.5, -0.02); P.box(satin, 0.2, 0.012, 0.34, 0, 0.606, -0.3); P.box(deep, 0.075, 0.014, 0.2, -0.045, 0.609, -0.33);
  P.cyl(gloss, 0.017, 0.02, 0.1, 10, -0.045, 0.66, -0.31, 0.12); P.cyl(leather, 0.026, 0.022, 0.05, 12, -0.045, 0.72, -0.317, 0.12);
  for (const z of [-0.2, -0.105]) P.cyl(deep, 0.04, 0.04, 0.014, 20, 0.055, 0.61, z);
  P.box(cloth, 0.25, 0.09, 0.42, 0, 0.66, 0.26);
  // the telephone in its cradle on the middle vent, the blue clip on the right one
  P.box(rubber, 0.018, 0.05, 0.05, 0, 1.0, -0.585, -0.4); P.box(rubber, 0.078, 0.152, 0.008, 0, 1.088, -0.55, -0.16);
  for (const sx of [-0.041, 0.041]) P.box(rubber, 0.008, 0.06, 0.02, sx, 1.08, -0.544, -0.16); P.box(rubber, 0.06, 0.012, 0.022, 0, 1.014, -0.534, -0.16);
  P.box(blue, 0.026, 0.03, 0.028, 0.1, 0.962, -0.548, -0.3);
  // the column behind the wheel, its two stalks
  P.box(dash, 0.12, 0.1, 0.2, WHEEL[0], WHEEL[1] - 0.05, WHEEL[2] - 0.13, -TILT);
  P.cyl(gloss, 0.009, 0.007, 0.17, 8, WHEEL[0] - 0.14, WHEEL[1] + 0.012, WHEEL[2] - 0.09, 0, 0, Math.PI / 2 - 0.25); P.cyl(gloss, 0.009, 0.007, 0.17, 8, WHEEL[0] + 0.14, WHEEL[1] + 0.012, WHEEL[2] - 0.09, 0, 0, -(Math.PI / 2 - 0.25));
  // the glass's frame: pillars, the header, the roof's lining, two visors, the mirror's foot
  const beam = (m, a, b, w, d) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), mid = A.clone().add(B).multiplyScalar(0.5), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); P.geo(m, new THREE.BoxGeometry(w, A.distanceTo(B), d), new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1))); };
  for (const s of [-1, 1]) { beam(pillar, [s * 0.8, 0.96, -1.08], [s * 0.645, 1.43, -0.3], 0.046, 0.07); beam(gloss, [s * 0.828, 0.96, -1.092], [s * 0.673, 1.43, -0.312], 0.03, 0.075); }
  P.box(liner, 1.36, 0.05, 0.2, 0, 1.425, -0.2, 0.25); P.box(liner, 1.4, 0.03, 1.5, 0, 1.445, 0.62);
  for (const sx of [-0.37, 0.37]) P.box(liner, 0.36, 0.014, 0.15, sx, 1.405, -0.17, 0.32);
  P.box(gloss, 0.02, 0.07, 0.02, 0, 1.385, -0.36); P.box(gloss, 0.25, 0.07, 0.028, 0, 1.335, -0.375, 0, 0.1);
  P.geo(mirror, new THREE.PlaneGeometry(0.225, 0.052), P.M4(0, 1.335, -0.3595, -0.06, 0.1));
  // the doors: the panel, the sill under the window, the switches; the post behind the driver
  for (const s of [-1, 1]) {
    P.box(dash, 0.05, 0.56, 1.75, s * 0.785, 0.71, -0.02); P.box(pad, 0.07, 0.035, 1.6, s * 0.77, 0.992, 0.0);
    P.box(silver, 0.012, 0.03, 0.14, s * 0.755, 0.9, -0.22); P.box(gloss, 0.075, 0.02, 0.24, s * 0.74, 0.865, 0.02, 0, 0, s * 0.25);
    P.box(gloss, 0.06, 0.46, 0.13, s * 0.775, 1.215, 0.42);
    // the mirror outside: its foot on the door, the black shell, the glass
    P.box(gloss, 0.1, 0.03, 0.05, s * 0.86, 1.01, -0.66); P.box(paint, 0.2, 0.125, 0.085, s * 0.99, 1.045, -0.675, 0, s * -0.12);
    P.geo(mirror, new THREE.PlaneGeometry(0.165, 0.098), P.M4(s * 0.985, 1.045, -0.6315, 0, s * -0.12 + (s < 0 ? 0.32 : -0.32)));
  }
  // the bonnet beyond the glass (black paint), the cowl and the two wipers at rest
  { const g = new THREE.PlaneGeometry(1.62, 1.32, 6, 4); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), t = (0.66 - z) / 1.32; p.setY(i, 0.995 - t * t * 0.19 - (x * x) * 0.07); p.setX(i, x * (1 - t * 0.1)); }
    g.computeVertexNormals(); g.translate(0, 0, -1.77); P.geo(paint, g); }
  P.box(rubber, 1.5, 0.02, 0.1, 0, 0.972, -1.1);
  for (const [x, a] of [[-0.3, 0.07], [0.28, 0.09]]) P.box(rubber, 0.52, 0.012, 0.014, x, 0.99, -1.075, 0, a);
  // the passenger's seat (black cloth, a grey stripe down the back), the floor
  P.box(cloth, 0.5, 0.13, 0.5, 0.42, 0.42, 0.18); P.box(cloth, 0.48, 0.62, 0.12, 0.42, 0.78, 0.47, 0.22); P.box(stripe, 0.05, 0.5, 0.125, 0.42, 0.8, 0.468, 0.22); P.box(cloth, 0.26, 0.18, 0.1, 0.42, 1.19, 0.56, 0.1);
  P.box(deep, 1.5, 0.02, 2.4, 0, 0.3, 0.2);
  P.build(car);

  /* the stack's face and the screen on it */
  const faceQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-slope, 0, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.31, slen), stack); face.position.set(0, sy, sz + 0.0005); face.quaternion.copy(faceQ); car.add(face);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(faceQ), out = new THREE.Vector3(0, 0, 1).applyQuaternion(faceQ);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), screen); scr.quaternion.copy(faceQ);
  scr.position.set(0, sy, sz).addScaledVector(up, (SCREEN.v - 0.5) * slen).addScaledVector(out, 0.0025); scr.name = 'screen'; car.add(scr);
  for (const [sx, v, r] of [[-0.109, 0.744, 0.0155], [0.109, 0.744, 0.0155], [-0.093, 0.238, 0.031], [0.093, 0.238, 0.031]]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, 0.018, 20), gloss); k.quaternion.copy(faceQ).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
    k.position.set(sx, sy, sz).addScaledVector(up, (v - 0.5) * slen).addScaledVector(out, 0.009); car.add(k);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.14, r * 1.14, 0.006, 20), silver); ring.quaternion.copy(k.quaternion); ring.position.copy(k.position).addScaledVector(out, -0.007); car.add(ring);
  }
  const phone = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.14), o.phone ? new THREE.MeshBasicMaterial({ map: o.phone, toneMapped: false }) : glass);
  phone.position.set(0, 1.088, -0.5455); phone.rotation.set(-0.16, 0, 0); car.add(phone);

  /* the dials: the face, three needles, the two arrows */
  const cq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.36, 0, 0)), cpos = new THREE.Vector3(-0.37, 0.9015, -0.772);
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.139), cluster); dial.position.copy(cpos); dial.quaternion.copy(cq); car.add(dial);
  const px = 0.37 / 1024, needles = [];
  for (const [u, v, len] of [[176, 206, 0.041], [512, 196, 0.053], [848, 206, 0.03], [848, 206, 0.03]]) {
    const pivot = new THREE.Group(); pivot.position.set((u - 512) * px, (192 - v) * px, 0.002); dial.add(pivot);
    const n = new THREE.Mesh(new THREE.BoxGeometry(len, 0.0024, 0.001), needle); n.position.x = len / 2 - 0.004; pivot.add(n); needles.push(pivot);
  }
  const arrows = [-1, 1].map(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0.006 * 1); sh.lineTo(s * 0.011, 0); sh.lineTo(0, -0.006); sh.lineTo(0, -0.0025); sh.lineTo(-s * 0.008, -0.0025); sh.lineTo(-s * 0.008, 0.0025); sh.lineTo(0, 0.0025); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: arrowOff, toneMapped: false, side: THREE.DoubleSide })); m.position.set(s * 0.068, 0.052, 0.002); dial.add(m); return m; });

  /* the wheel: it turns about its own tilted axle */
  const col = new THREE.Group(); col.position.set(...WHEEL); col.rotation.x = -TILT; car.add(col);
  const wheel = new THREE.Group(); col.add(wheel);
  { const W = Parts();
    W.geo(leather, new THREE.TorusGeometry(0.185, 0.0165, 12, 48));
    W.cyl(leather, 0.078, 0.086, 0.05, 28, 0, 0, -0.012, Math.PI / 2); W.cyl(leather, 0.064, 0.072, 0.012, 28, 0, 0, 0.018, Math.PI / 2);
    W.geo(silver, new THREE.TorusGeometry(0.024, 0.0022, 6, 28).scale(1, 0.66, 1), W.M4(0, 0.004, 0.0245));                     // the boss's plain oval
    for (const s of [-1, 1]) { W.box(leather, 0.105, 0.05, 0.022, s * 0.125, 0.004, -0.004); W.cyl(silver, 0.027, 0.027, 0.008, 20, s * 0.118, 0.0, 0.011, Math.PI / 2); W.cyl(gloss, 0.023, 0.023, 0.01, 20, s * 0.118, 0.0, 0.0125, Math.PI / 2); }
    for (const s of [-1, 1]) W.box(silver, 0.026, 0.125, 0.016, s * 0.034, -0.118, -0.002, 0, 0, s * 0.3);                        // the lower spoke: a V of satin silver
    W.box(leather, 0.04, 0.1, 0.014, 0, -0.125, -0.006);
    W.build(wheel); }

  /* where the eye is and what it looks at: beside the driver's own eye when the picture is wide; when the telephone is
     held upright, a little towards the middle of the car and looking down, so that the wheel, the dials and the screen
     all stand under the road (the way he photographed the cabin from his seat) */
  const rig = { eye: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 50 }, lookAt = { yaw: 0, pitch: 0, t: 99 };
  function resize(aspect) {
    const k = Math.min(1, Math.max(0, (aspect - 0.62) / (1.55 - 0.62)));                   // 0 upright … 1 wide
    rig.eye.set(-0.2 + (EYE[0] + 0.2) * k, 1.22 + (EYE[1] - 1.22) * k, 0.22 + (EYE[2] - 0.22) * k);
    rig.yaw = (6 * (1 - k)) * Math.PI / 180; rig.pitch = -(14 - 5 * k) * Math.PI / 180;
    const hf = (62 + 28 * k) * Math.PI / 180;                                               // across: 62° upright, 90° wide
    rig.fov = Math.min(96, Math.max(40, 2 * Math.atan(Math.tan(hf / 2) / aspect) * 180 / Math.PI));
    camera.aspect = aspect; camera.fov = rig.fov; camera.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), tmp = new THREE.Vector3();
  let blinkT = 0;
  return {
    scene, camera, rig, car,
    resize,
    /** a finger dragged across the picture turns the head; it comes back by itself */
    look(dx, dy) { lookAt.yaw = Math.max(-1.9, Math.min(1.9, lookAt.yaw + dx)); lookAt.pitch = Math.max(-0.7, Math.min(0.55, lookAt.pitch + dy)); lookAt.t = 0; },
    /** the head's turn, for the world's own camera to follow: { eye (car frame), yaw (to the right +), pitch } */
    head() { return { eye: rig.eye, yaw: rig.yaw + lookAt.yaw, pitch: rig.pitch + lookAt.pitch }; },
    /** state: the car's (engine/world/drive.js); sun: the sunlight's travel in the car's frame; hour: { sun: [colour, strength], hemi: [sky, ground, strength], lit } */
    update(state, dt, sunDir, hour, held) {
      lookAt.t += dt; if (!held && lookAt.t > 1.6) { const k = Math.min(1, dt * 2.2); lookAt.yaw -= lookAt.yaw * k; lookAt.pitch -= lookAt.pitch * k; }
      const h = this.head();
      camera.position.copy(rig.eye); camera.rotation.set(h.pitch, -h.yaw, 0, 'YXZ');
      wheel.rotation.z = -state.wheel;
      const mph = state.v * 2.23694;
      needles[1].rotation.z = (225 - 270 * Math.min(1, mph / 140)) * Math.PI / 180; needles[0].rotation.z = (225 - 270 * Math.min(1, state.rpm / 8000)) * Math.PI / 180;
      needles[2].rotation.z = (205 - 50 * 0.62) * Math.PI / 180; needles[3].rotation.z = (-25 + 50 * 0.5) * Math.PI / 180;
      blinkT = (blinkT + dt) % 0.74; const on = blinkT < 0.37;
      arrows[0].material.color.set(state.blink < 0 && on ? arrowOn : arrowOff); arrows[1].material.color.set(state.blink > 0 && on ? arrowOn : arrowOff);
      if (hour) {
        sun.color.set(hour.sun[0]); sun.intensity = hour.sun[1] * 0.75; sun.position.copy(rig.eye).addScaledVector(tmp.copy(sunDir), -4); sun.target.position.copy(rig.eye);
        hemi.color.set(hour.hemi[0]); hemi.groundColor.set(hour.hemi[1]); hemi.intensity = hour.hemi[2] * (hour.lit ? 0.75 : 0.95);
        cluster.emissiveIntensity = hour.lit ? 1.25 : 0.3; stack.emissiveIntensity = hour.lit ? 0.5 : 0; fill.intensity = hour.lit ? 0.22 : 0;
      }
      return state.blink !== 0 && on;
    },
    /** what a tap at these picture coordinates (−1…1) lands on */
    pick(x, y) { ray.setFromCamera(new THREE.Vector2(x, y), camera); const hit = ray.intersectObjects([scr, face, phone], false)[0]; return hit ? 'screen' : null; },
    setEnv(t, k) { scene.environment = t; scene.environmentIntensity = k; },
  };
}
