/* Flat 507, the family home at Vạn Bảo, as it stood between 2005 and 2012 — rebuilt from the walk-through videos of
   June 2013 kept in Sonic Hub, with the machines of each year from the hub's desk. */
import * as THREE from 'three';
import { Builder } from './kit.js';
import { setAniso, M, canvasTex, texKeys } from './tex.js';
import { buildShell, buildDoors } from './shell.js';
import { buildLiving, buildKitchen, buildOutsideRooms } from './rooms_a.js';
import { buildBigRoom, buildParents } from './rooms_b.js';
import { buildEra } from './era.js';
import { buildOutside } from './outside.js';
import { setupLight } from './light.js';
import { setupNav } from './nav.js';
import { setupUI } from './ui.js';
import * as P from './plan.js';

function start() {
const canvas = document.getElementById('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.getElementById('fail').style.display = 'flex'; document.getElementById('load').style.display = 'none'; throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 700);
const shared = { solids: [] };

/* what the rooms hand back: spots for the machines, clocks to set, lamps to light, things to touch */
const lampMats = [], lampCache = new Map();
const ctx = {
  hot: [], spots: {}, clocks: [], mode: 'chieu',
  lampMat(c, k = 2, base = 0.9, day = 0) {
    const key = `${c}|${k}|${base}|${day}`; let m = lampCache.get(key);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(base), emissive: c, emissiveIntensity: day, roughness: 0.6 }); m.userData.noCast = true; m.userData.lamp = { k, day }; lampCache.set(key, m); lampMats.push(m); }
    return m;
  },
};

const b = new Builder(shared);
buildShell(b, scene, shared);
buildLiving(b, ctx); buildKitchen(b, ctx); buildOutsideRooms(b, ctx);
buildBigRoom(b, ctx); buildParents(b, ctx);
b.build(scene);
buildDoors(scene, shared);
const era = buildEra(scene, shared, ctx);
const outside = buildOutside(scene, ctx);
const light = setupLight(renderer, scene);

/* ── things that move: the fish, the pendulum, the hands of the clocks ── */
const fish = [];
if (ctx.fish) {
  const f = ctx.fish, cols = ['#f28a2e', '#f4f1e8', '#e8552e', '#f2c23a', '#2a2a2e', '#f28a2e', '#e8e2d0'];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.SphereGeometry(0.5, 10, 8); g.scale(0.022 + (i % 3) * 0.004, 0.02, 0.055 + (i % 2) * 0.012);
    const tail = new THREE.ConeGeometry(0.014, 0.03, 4); tail.rotateX(-Math.PI / 2); tail.translate(0, 0, -0.04);
    const mat = new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.4, emissive: cols[i], emissiveIntensity: 0.25 });
    const m = new THREE.Group(); m.add(new THREE.Mesh(g, mat), new THREE.Mesh(tail, mat)); scene.add(m);
    fish.push({ m, x: f.x0 + (f.x1 - f.x0) * ((i * 0.37) % 1), y: f.y0 + (f.y1 - f.y0) * ((i * 0.61 + 0.2) % 1), ph: i * 1.7, sp: 0.16 + (i % 4) * 0.05 });
  }
}
const pend = new THREE.Group();
if (ctx.pendulum) {
  const brass = new THREE.MeshStandardMaterial({ color: '#c9a23a', roughness: 0.3, metalness: 0.9 });
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.17, 0.003), brass); rod.position.y = -0.085;
  const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 16).rotateX(Math.PI / 2), brass); bob.position.y = -0.17;
  pend.add(rod, bob); pend.position.set(ctx.pendulum.x, ctx.pendulum.y, ctx.pendulum.z); scene.add(pend);
}
const hands = ctx.clocks.map(c => {
  const g = new THREE.Group(), ink = new THREE.MeshBasicMaterial({ color: '#1c1a18' });
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.012, c.r * 0.62, 0.002).translate(0, c.r * 0.26, 0), ink), m = new THREE.Mesh(new THREE.BoxGeometry(0.007, c.r * 0.95, 0.002).translate(0, c.r * 0.4, 0.002), ink);
  g.add(h, m); g.position.set(c.x, c.y, c.z); g.rotation.y = -c.ry * Math.PI / 180; scene.add(g);
  return { h, m };
});
function setClocks(hh, mm) { for (const c of hands) { c.h.rotation.z = -((hh % 12) + mm / 60) / 12 * Math.PI * 2; c.m.rotation.z = -mm / 60 * Math.PI * 2; } }

/* ── the bright dots on what can be touched ── */
const dotTex = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.95)'); r.addColorStop(0.36, 'rgba(255,255,255,0.28)'); r.addColorStop(0.7, 'rgba(255,255,255,0.22)'); r.addColorStop(0.78, 'rgba(255,255,255,0.9)'); r.addColorStop(0.86, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { repeat: false });
const dots = ctx.hot.map(h => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
  s.position.set(h.pos[0], h.pos[1], h.pos[2]); s.scale.setScalar(0.085); s.renderOrder = 20; scene.add(s);
  return { ...h, s, v: new THREE.Vector3(h.pos[0], h.pos[1], h.pos[2]) };
});
const walkMark = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
walkMark.position.y = 0.012; walkMark.renderOrder = 19; scene.add(walkMark);

/* ── a chord on the piano (made here, no recording) ── */
let audio;
function chord() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime + 0.02, notes = [261.63, 329.63, 392.0, 493.88, 523.25];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), o2 = audio.createOscillator(), g = audio.createGain(), t = t0 + i * 0.11;
      o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.001;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
      o.connect(g); o2.connect(g); g.connect(audio.destination); o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
    });
  } catch { /* no sound on this device: the card still opens */ }
}

/* ── the walk the tour takes: the order of the 2013 video — his corner, the big room, living room, kitchen, loggia,
      the parents' room and its balcony, then out to the gallery and back in by the front door ── */
const TOUR = [
  { p: [4.8, 1.22, 4.52], h: 266, pitch: -14, t: 0.01, cut: true, label: 'Góc máy tính' },
  { p: [4.8, 1.22, 4.52], h: 266, pitch: -14, t: 3.2 },
  { p: [4.95, 1.5, 5.0], h: 212, pitch: -18, t: 3.4 },
  { p: [5.1, 1.5, 5.7], h: 180, pitch: -2, t: 3.4 },
  { p: [5.15, 1.5, 5.2], h: 140, pitch: 20, t: 3.0 },
  { p: [5.25, 1.52, 4.3], h: 75, pitch: 0, t: 2.6 },
  { p: [6.4, 1.52, 4.3], h: 96, pitch: -4, t: 3.0, label: 'Phòng có đàn piano' },
  { p: [7.6, 1.52, 4.6], h: 100, pitch: -6, t: 3.0 },
  { p: [8.85, 1.52, 5.1], h: 18, pitch: -5, t: 3.6 },
  { p: [8.85, 1.52, 5.15], h: 214, pitch: -12, t: 3.6 },
  { p: [7.3, 1.52, 4.3], h: 280, pitch: -2, t: 3.4 },
  { p: [5.3, 1.52, 4.2], h: 330, pitch: 0, t: 2.8 },
  { p: [5.08, 1.52, 3.3], h: 318, pitch: -2, t: 2.0 },
  { p: [4.2, 1.52, 2.25], h: 298, pitch: -5, t: 3.0, label: 'Phòng khách' },
  { p: [2.9, 1.52, 2.3], h: 72, pitch: -2, t: 4.2 },
  { p: [2.6, 1.52, 2.3], h: 266, pitch: -3, t: 4.2 },
  { p: [2.5, 1.52, 3.2], h: 180, pitch: -6, t: 3.0 },
  { p: [2.45, 1.52, 5.2], h: 168, pitch: -10, t: 3.6, label: 'Bếp' },
  { p: [2.42, 1.52, 6.6], h: 180, pitch: -4, t: 2.6 },
  { p: [2.36, 1.52, 7.92], h: 256, pitch: -4, t: 3.6, label: 'Lô gia' },
  { p: [2.42, 1.52, 6.6], h: 352, pitch: -4, t: 3.2 },
  { p: [2.5, 1.52, 3.9], h: 2, pitch: -3, t: 3.2 },
  { p: [3.9, 1.52, 2.92], h: 78, pitch: -2, t: 3.0 },
  { p: [5.92, 1.52, 2.95], h: 60, pitch: -4, t: 2.8, label: 'Phòng bố mẹ' },
  { p: [6.2, 1.52, 2.62], h: 42, pitch: -8, t: 3.2 },
  { p: [8.4, 1.52, 2.42], h: 78, pitch: -3, t: 3.6 },
  { p: [9.0, 1.52, 1.52], h: 88, pitch: -3, t: 2.6 },
  { p: [10.15, 1.52, 1.5], h: 82, pitch: -8, t: 3.0, label: 'Ban công nhìn xuống phố' },
  { p: [10.15, 1.52, 1.5], h: 128, pitch: -20, t: 3.4 },
  { p: [0.95, 1.52, -9.0], h: 180, pitch: -3, t: 0.01, cut: true, label: 'Hành lang tầng 5' },
  { p: [0.95, 1.52, -6.2], h: 178, pitch: -3, t: 4.2 },
  { p: [0.75, 1.52, -3.6], h: 255, pitch: -9, t: 4.0 },
  { p: [0.7, 1.52, -2.2], h: 186, pitch: -2, t: 3.4 },
  { p: [0.68, 1.52, -0.7], h: 180, pitch: -3, t: 2.8 },
  { p: [0.7, 1.52, 0.75], h: 150, pitch: -3, t: 2.8, label: 'Về nhà' },
  { p: [1.1, 1.52, 2.6], h: 62, pitch: -4, t: 3.2 },
];

/* ── wiring ── */
let ui;
const nav = setupNav(camera, canvas, shared.solids, {
  onTap(ray) {
    let best = null, bd = 1e9;
    for (const d of dots) {
      const t = d.v.clone().sub(ray.ray.origin).dot(ray.ray.direction); if (t < 0.2 || t > 6.5) continue;
      const miss = ray.ray.distanceToPoint(d.v); if (miss < Math.min(d.r, 0.16 + t * 0.07) && t < bd) { bd = t; best = d; }
    }
    if (!best) return false;
    touch(best.id); return true;
  },
  onWalk(p) { walkMark.position.x = p.x; walkMark.position.z = p.z; walkMark.material.opacity = 0.85; },
  onStick: (s, on) => ui && ui.onStick(s, on),
  onTour: on => ui && ui.tourState(on),
  onLabel: name => ui && ui.label(name),
  onTouch: () => { if (ui) ui.hideIntro(); },
  onCut: () => ui && ui.blink(),
});
function touch(id) {
  if (id === 'tv') { ui.showCard('tv', era.toggleTv()); return; }
  if (id === 'piano') chord();
  ui.showCard(id);
}
function applyMode(mode) {
  ctx.mode = mode; light.setMode(mode); era.setMode(mode); outside.setMode(mode);
  const night = mode === 'toi';
  for (const m of lampMats) m.emissiveIntensity = night ? m.userData.lamp.k : m.userData.lamp.day;
  if (ctx.water) ctx.water.emissiveIntensity = night ? 1.5 : 0.5;
  setClocks(night ? 21 : 18, night ? 0 : 5);
  if (night && !era.state.tv) era.setTv(true); if (!night && era.state.tv) era.setTv(false);
  renderer.shadowMap.needsUpdate = true;
}
ui = setupUI({
  setYear(y) { era.setYear(y); renderer.shadowMap.needsUpdate = true; },
  setMode: applyMode,
  goto(key) { const v = P.VIEWS[key]; if (v) ui.cut(() => nav.setPose(...v.pose)); },
  startTour() { ui.close(); nav.startTour(TOUR); },
  stopTour() { nav.stopTour(); },
});

let dpr = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // about 80° across; a phone held upright gets a taller view instead of a keyhole
  const hf = 80 * Math.PI / 180;
  camera.fov = Math.min(92, Math.max(52, 2 * Math.atan(Math.tan(hf / 2) / camera.aspect) * 180 / Math.PI));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

ui.setYear(ui.year0, true);
ui.setMode('chieu', true);

let last = performance.now(), clock = 0, slow = 0, frames = 0, paused = false, woke = performance.now();
canvas.addEventListener('pointerdown', () => { woke = performance.now(); });
function animate(dt) {
  clock += dt;
  if (ctx.fish) { const f = ctx.fish, span = f.z1 - f.z0; for (const q of fish) { const u = (clock * q.sp + q.ph) % 2, k = u < 1 ? u : 2 - u, e = k * k * (3 - 2 * k); q.m.position.set(q.x + Math.sin(clock * 0.7 + q.ph) * 0.02, q.y + Math.sin(clock * 0.9 + q.ph * 2) * 0.025, f.z0 + span * e); q.m.rotation.y = u < 1 ? 0 : Math.PI; } }
  pend.rotation.z = Math.sin(clock * 3.6) * 0.26;
  const pulse = 0.085 + Math.sin(clock * 2.4) * 0.008;
  for (const d of dots) { const dist = d.v.distanceTo(camera.position); d.s.visible = dist < 7.5; d.s.scale.setScalar(pulse * Math.min(1.5, 0.55 + dist * 0.2)); }
  if (walkMark.material.opacity > 0) walkMark.material.opacity = Math.max(0, walkMark.material.opacity - dt * 1.3);
}
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || paused) { last = now; return; }
  // standing still, 25 pictures a second are enough for the fish and the pendulum (and kinder to a phone's battery)
  if (nav.busy) woke = now;
  const idle = now - woke > 600;
  if (idle && now - last < 38) return;
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
  nav.update(dt); animate(dt);
  renderer.render(scene, camera);
  // a phone that cannot keep up gets a slightly softer picture, not a slower walk
  if (!idle) { frames++; if (raw > 0.034) slow++; }
  if (frames >= 90) { if (slow > 55 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); resize(); } frames = slow = 0; }
}
renderer.compile(scene, camera);
ui.ready();
requestAnimationFrame(frame);

window.__house = {
  ready: true,
  setPose: (x, y, z, h, p) => nav.setPose(x, y, z, h, p),
  goto: name => { const v = P.VIEWS[name]; if (v) nav.setPose(...v.pose); },
  setMode: m => ui.setMode(m, true), setYear: y => ui.setYear(y, true),
  hideIntro: () => ui.hideIntro(), card: id => touch(id), tour: () => nav.startTour(TOUR),
  renderOnce: () => { nav.update(0); animate(0.016); renderer.render(scene, camera); },
  texList: () => { const seen = new Map(); scene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap']) { const t = m[k]; if (t && t.image && !seen.has(t.uuid)) seen.set(t.uuid, `${t.image.width}x${t.image.height}|${k}|${t.name || ''}`); } }); return [...seen.values()]; },
  hot: () => dots.map(d => ({ id: d.id, pos: d.pos, r: d.r })),
  project: (x, y, z) => { camera.updateMatrixWorld(); const v = new THREE.Vector3(x, y, z).project(camera), r = canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height, v.z]; },
  texKeys,
  texMB: () => { const seen = new Set(); let n = 0; scene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap']) { const t = m[k]; if (t && t.image && !seen.has(t.uuid)) { seen.add(t.uuid); n += t.image.width * t.image.height * 4 * 4 / 3; } } }); return [seen.size, +(n / 1048576).toFixed(1)]; },
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, solids: shared.solids.length, pose: nav.getPose(), dpr, geoms: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),
  pose: () => nav.getPose(), pause: v => { paused = v; },
  step: dt => { nav.update(dt); animate(dt); }, touring: () => nav.touring, solids: () => shared.solids, tourKeys: TOUR,
};
}

/* let the page show its first slip ("Đang dựng nhà…") before the building, which keeps the browser busy for a moment, begins */
requestAnimationFrame(() => setTimeout(start, 20));
