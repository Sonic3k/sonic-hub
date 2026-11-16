/* Runs a place: draws it, lets a visitor walk through it, and puts the slips of paper (year, hour, rooms, cards) over
   it. A place is an object (see README: "What a place is"); everything here is the same for every place. */
import * as THREE from 'three';
import { setAniso, canvasTex, texKeys } from './tex.js';
import { setupLight } from './light.js';
import { setupNav } from './nav.js';
import { setupUI } from './ui.js';
import { readMoment } from './hub.js';

/** Let the page show its first slip ("Đang dựng…") before the building, which keeps the browser busy for a moment, begins. */
export function run(place) { requestAnimationFrame(() => setTimeout(() => start(place), 20)); }

function start(place) {
  const meta = place.meta, Y = meta.years || null;
  const canvas = document.getElementById('scene');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { document.getElementById('fail').style.display = 'flex'; throw e; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 700);
  const shared = { solids: [] };

  /* what the rooms hand back: bright dots on what can be touched, spots for things that change, shades that glow */
  const lampMats = [], lampCache = new Map();
  const ctx = {
    hot: [], spots: {}, clocks: [], hour: meta.hours[0].id,
    /** a material that glows when the hour is lit (a lamp shade, a tube): colour, strength lit, its own tint, strength unlit */
    lampMat(c, k = 2, base = 0.9, day = 0) {
      const key = `${c}|${k}|${base}|${day}`; let m = lampCache.get(key);
      if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(base), emissive: c, emissiveIntensity: day, roughness: 0.6 }); m.userData.noCast = true; m.userData.lamp = { k, day }; lampCache.set(key, m); lampMats.push(m); }
      return m;
    },
  };

  const live = place.build({ scene, shared, ctx, renderer }) || {};
  const light = setupLight(renderer, scene, place.light);

  /* ── the bright dots on what can be touched ── */
  const dotTex = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.95)'); r.addColorStop(0.36, 'rgba(255,255,255,0.28)'); r.addColorStop(0.7, 'rgba(255,255,255,0.22)'); r.addColorStop(0.78, 'rgba(255,255,255,0.9)'); r.addColorStop(0.86, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { repeat: false });
  const dots = ctx.hot.map(h => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
    s.position.set(h.pos[0], h.pos[1], h.pos[2]); s.scale.setScalar(0.085); s.renderOrder = 20; scene.add(s);
    return { ...h, s, v: new THREE.Vector3(h.pos[0], h.pos[1], h.pos[2]) };
  });
  const walkMark = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  walkMark.position.y = 0.012; walkMark.renderOrder = 19; scene.add(walkMark);

  /* ── wiring ── */
  let ui;
  const first = place.views[place.start] || Object.values(place.views)[0];
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
  }, { start: first.pose, bounds: place.bounds });

  /** a bright dot was touched: the place may act on it (switch the TV, play a chord), then its card opens */
  function touch(id) { const extra = live.touch ? live.touch(id) : undefined; ui.showCard(id, extra); }
  function applyHour(id) {
    ctx.hour = id; light.setHour(id);
    const lit = light.lit(id);
    for (const m of lampMats) m.emissiveIntensity = lit ? m.userData.lamp.k : m.userData.lamp.day;
    if (live.setHour) live.setHour(id);
    renderer.shadowMap.needsUpdate = true;
  }
  /* which room the address names: #bep opens in the kitchen, and picking a room writes its name there */
  const viewOfHash = () => { const k = decodeURIComponent(location.hash.slice(1)); return place.views[k] ? k : null; };
  ui = setupUI(place, {
    setYear(y) { if (live.setYear) live.setYear(y); renderer.shadowMap.needsUpdate = true; },
    setHour: applyHour,
    goto(key) { const v = place.views[key]; if (!v) return; ui.cut(() => nav.setPose(...v.pose)); try { history.replaceState(null, '', '#' + key); } catch { /* the address stays as it was */ } },
    startTour() { ui.close(); if (place.tour) nav.startTour(place.tour); },
    stopTour() { nav.stopTour(); },
  });
  addEventListener('hashchange', () => { const k = viewOfHash(); if (k) { ui.hideIntro(); ui.cut(() => nav.setPose(...place.views[k].pose)); ui.label(place.views[k].name); } });

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

  /* The moment to open on. ?at=2007-06-15T18:05 is how Sonic Hub names a moment (/pc?at=…, /phone?at=…): the year
     picks the machines (kept inside the years this place has), the hour of the clock picks the hour of the day.
     Without it: the year this visitor left it on, or the place's own. */
  const want = readMoment(new URLSearchParams(location.search).get('at'));
  if (Y) ui.setYear(want ? Math.min(Y.to, Math.max(Y.from, want.year)) : ui.year0, true);
  const hourOf = h => { const hs = [...meta.hours].sort((a, b) => (a.from ?? 0) - (b.from ?? 0)); let pick = hs[hs.length - 1]; for (const x of hs) if (h >= (x.from ?? 0)) pick = x; return pick.id; };
  ui.setHour(want && meta.hours.length > 1 ? hourOf(want.hour) : meta.hours[0].id, true);
  { const k = viewOfHash(); if (k) nav.setPose(...place.views[k].pose); }

  let last = performance.now(), clock = 0, slow = 0, frames = 0, paused = false, woke = performance.now();
  canvas.addEventListener('pointerdown', () => { woke = performance.now(); });
  function animate(dt) {
    clock += dt;
    if (live.animate) live.animate(dt, clock);
    const pulse = 0.085 + Math.sin(clock * 2.4) * 0.008;
    for (const d of dots) { const dist = d.v.distanceTo(camera.position); d.s.visible = dist < 7.5; d.s.scale.setScalar(pulse * Math.min(1.5, 0.55 + dist * 0.2)); }
    if (walkMark.material.opacity > 0) walkMark.material.opacity = Math.max(0, walkMark.material.opacity - dt * 1.3);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || paused) { last = now; return; }
    // standing still, 25 pictures a second are enough for what moves by itself (and kinder to a phone's battery)
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

  /* for the tools (tools/*.mjs) and for looking around from the console */
  window.__world = {
    ready: true, place: meta.id,
    setPose: (x, y, z, h, p) => nav.setPose(x, y, z, h, p),
    goto: name => { const v = place.views[name]; if (v) nav.setPose(...v.pose); },
    setHour: h => ui.setHour(h, true), setYear: y => ui.setYear(y, true),
    hideIntro: () => ui.hideIntro(), card: id => touch(id), tour: () => place.tour && nav.startTour(place.tour),
    renderOnce: () => { nav.update(0); animate(0.016); renderer.render(scene, camera); },
    hot: () => dots.map(d => ({ id: d.id, pos: d.pos, r: d.r })),
    project: (x, y, z) => { camera.updateMatrixWorld(); const v = new THREE.Vector3(x, y, z).project(camera), r = canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height, v.z]; },
    texKeys,
    texMB: () => { const seen = new Set(); let n = 0; scene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap']) { const t = m[k]; if (t && t.image && !seen.has(t.uuid)) { seen.add(t.uuid); n += t.image.width * t.image.height * 4 * 4 / 3; } } }); return [seen.size, +(n / 1048576).toFixed(1)]; },
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, solids: shared.solids.length, pose: nav.getPose(), dpr, geoms: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),
    pose: () => nav.getPose(), pause: v => { paused = v; },
    step: dt => { nav.update(dt); animate(dt); }, touring: () => nav.touring, solids: () => shared.solids, tourKeys: place.tour || [],
    state: () => ({ ...ui.state }),
  };
}
