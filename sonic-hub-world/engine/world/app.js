/* Runs a world: a stretch of country too wide to build at once. Its ground comes 500 m at a time as the eye moves
   (tiles.js); the places built by hand stand in it as sites (the hotel in El Segundo is one); a car follows a route
   through it (drive.js) and the eye rides in its cabin (camry.js) or just above its bonnet's line, with the music he
   kept for driving on the screen in the middle (headunit.js). See claude/chuan-dung-the-gioi-3d.md for the rules this
   keeps: nothing wider than a house is built at load, and what a frame may cost is checked (places/<world>/checks.mjs).

   A world is an object:
     meta      { id, title, sub, hours: [{ id, label }] … }
     light     as a place's (engine/light.js)
     data      the folder its data/world.py wrote, relative to the page: index.json, routes.json, tiles/
     sites     [{ id, at: [x, z], reach: metres beyond which it is not drawn, build({ scene, shared, ctx, renderer }) → live,
                  near?: { at: [x, z], reach, far: /names of the parts seen from afar/ } — the rest only shows within that reach }]
     paving()  → { road, walk }: the materials the tiles' streets and sidewalks wear
     music     { api, prefer, fallback } for the head unit
     start     { route, hour } */
import * as THREE from 'three';
import { setAniso } from '../tex.js';
import { setupLight } from '../light.js';
import { setupTiles, signalState } from './tiles.js';
import { setupDrive, readRoute } from './drive.js';
import { setupCabin } from './camry.js';
import { setupHeadUnit } from './headunit.js';

export function run(world) { requestAnimationFrame(() => setTimeout(() => start(world).catch(e => { fail(e); throw e; }), 20)); }
const $ = id => document.getElementById(id);
function fail(e) { const f = $('fail'); if (f) { f.style.display = 'flex'; const p = f.querySelector('small'); if (p) p.textContent = String(e && e.message || e); } }

async function start(world) {
  const meta = world.meta, canvas = $('scene');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { fail(e); throw e; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.autoClear = false;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, 1, 0.5, world.far || 1500);
  const rig = new THREE.Group(); rig.rotation.order = 'YXZ'; scene.add(rig); rig.add(camera); camera.rotation.order = 'YXZ';
  const beams = new THREE.SpotLight('#fff3da', 0, 70, 0.62, 0.7, 1.4); beams.position.set(0, 0.75, -2.0); beams.target.position.set(0, -0.6, -30); rig.add(beams, beams.target);

  /* the data lies beside the site's pages (../world/<id>/ from /places/<id>); a page set up on its own (a preview) has it under itself */
  let base = null, index = null;
  for (const rel of [world.data, world.data.replace(/^(\.\.\/)+/, '')]) {
    const b = new URL(rel, location.href).href;
    try { const r = await fetch(b + 'index.json'); if (r.ok) { index = await r.json(); base = b; break; } } catch { /* try the next */ }
  }
  if (!index) throw new Error('index.json: not found');
  const routesRaw = await fetch(base + 'routes.json').then(r => r.json());
  const routes = new Map(routesRaw.map(r => [r.id, readRoute(r)]));

  /* ── the sites: the places built by hand, each in its own group ── */
  const lampMats = [], lampCache = new Map();
  const hourId = { v: world.start.hour || meta.hours[0].id };
  const sites = world.sites.map(s => {
    const group = new THREE.Group(); group.name = 'site ' + s.id; scene.add(group);
    const shared = { solids: [] };
    const ctx = {
      hot: [], spots: {}, clocks: [], hour: hourId.v, world: {},
      lampMat(c, k = 2, b = 0.9, day = 0) { const key = `${c}|${k}|${b}|${day}`; let m = lampCache.get(key); if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(b), emissive: c, emissiveIntensity: day, roughness: 0.6 }); m.userData.noCast = true; m.userData.lamp = { k, day }; lampCache.set(key, m); lampMats.push(m); } return m; },
    };
    const live = s.build({ scene: group, shared, ctx, renderer }) || {};
    const fine = s.near ? group.children.filter(c => !s.near.far.test(c.name || '')) : [];   // what only shows from close by
    return { ...s, group, live, fine };
  });
  const light = setupLight(renderer, scene, world.light);
  const tiles = setupTiles(scene, { base: base + 'tiles/', index, ...world.paving(), onError: (k, e) => console.warn('tile', k, e) });

  /* ── the car, its cabin, the screen ── */
  const drive = setupDrive(), st = drive.state;
  const unit = setupHeadUnit({ ...world.music, el: $('unit'), onRoute: id => takeRoute(id, true), onOpen: () => { woke = performance.now(); } });
  const cabin = setupCabin({ screen: unit.texture });
  let view = 'cabin', running = false, clock = 0, paused = false, woke = performance.now();
  const input = { gas: 0, brake: 0, steer: 0 }, keys = new Set();
  const eyeWorld = new THREE.Vector3(), dirWorld = new THREE.Vector3(), sunCar = new THREE.Vector3();
  const proxy = { position: eyeWorld, getWorldDirection: v => v.copy(dirWorld), aspect: 1, fov: 70, far: 1400, updateProjectionMatrix() {} };

  function takeRoute(id, go) {
    const r = routes.get(id); if (!r) return;
    drive.setRoute(r); unit.routes([...routes.values()], id); $('arrive').classList.remove('on'); arrivedAt = 0; pose(0); setAuto(true);
    if (go) { running = true; drive.go(); }
    hud(true);
  }
  function setAuto(v) { drive.setAuto(v); document.documentElement.classList.toggle('manual', !v); $('b-auto').setAttribute('aria-pressed', v); $('b-auto').querySelector('b').textContent = v ? 'Tự lái' : 'Cầm lái'; input.gas = input.brake = input.steer = 0; }
  function setView(v) { view = v; $('b-view').querySelector('b').textContent = v === 'cabin' ? 'Trong xe' : 'Mặt đường'; document.documentElement.dataset.view = v; resize(); }
  function setHour(id) {
    if (!world.light.hours[id]) return;
    hourId.v = id; light.setHour(id); const lit = light.lit(id);
    for (const m of lampMats) m.emissiveIntensity = lit ? m.userData.lamp.k : m.userData.lamp.day;
    for (const s of sites) if (s.live.setHour) s.live.setHour(id);
    tiles.setNight(lit); beams.intensity = lit ? 260 : 0; cabin.setEnv(scene.environment, scene.environmentIntensity);
    for (const h of meta.hours) { const b = $('h-' + h.id); if (b) b.setAttribute('aria-pressed', h.id === id); }
    renderer.shadowMap.needsUpdate = true;
  }

  /** puts the eye where the car is (and the car where its route says) */
  function pose(dt) {
    rig.position.set(st.x, st.y, st.z); rig.rotation.set(st.pitch + st.grade, -Math.PI / 2 - st.heading, -st.roll);
    if (view === 'cabin') { const h = cabin.head(); camera.position.copy(h.eye); camera.rotation.set(h.pitch, -h.yaw, 0); }
    else { camera.position.set(0, 1.18, -1.9); camera.rotation.set(-0.07, 0, 0); }
    rig.updateMatrixWorld(true); camera.getWorldPosition(eyeWorld); camera.getWorldDirection(dirWorld);
    if (over) eyeWorld.set(over.x, 1.2, over.z);                                   // the ground is streamed round the place looked at
    if (free) { eyeWorld.set(...free.eye); dirWorld.set(free.at[0] - free.eye[0], free.at[1] - free.eye[1], free.at[2] - free.eye[2]).normalize(); }
  }
  /* for the tools: the world drawn as a plan — from straight above a place, north up, so many metres across; with `cut`,
     only what lies below that height (trees and roofs hide the street from above) */
  let free = null; const freeCam = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);   // for the tools too: the world seen from any point towards any other
  let over = null; const topCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000), cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; cabin.resize(camera.aspect);
    camera.fov = view === 'cabin' ? cabin.rig.fov : Math.min(92, Math.max(46, 2 * Math.atan(Math.tan(40 * Math.PI / 180) / camera.aspect) * 180 / Math.PI));
    camera.updateProjectionMatrix(); proxy.aspect = camera.aspect; proxy.fov = camera.fov;
    document.documentElement.classList.toggle('upright', h > w * 1.15);
  }
  addEventListener('resize', resize);

  /* ── what the driver is told ── */
  const km = m => (m >= 950 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.max(10, Math.round(m / 10) * 10) + ' m');
  let hudT = 0, arrivedAt = 0;
  function hud(force) {
    if (!force && clock - hudT < 0.2) return; hudT = clock;
    const R = drive.route; if (!R) return;
    $('street').textContent = st.street || (st.phase === 'arrived' ? R.to : R.from);
    const left = R.length - st.s, mph = Math.round(st.v * 2.23694);
    let say = st.phase === 'arrived' ? 'Đã tới nơi' : st.phase === 'parked' ? 'Xe đang đỗ' : `${st.auto ? 'Tự lái' : 'Cầm lái'} · còn ${km(left)}`;
    if (st.phase === 'driving' && st.next && st.next.in < 260) say += ` · ${st.next.dir > 0 ? 'rẽ phải' : 'rẽ trái'}${st.next.in > 15 ? ' sau ' + km(st.next.in) : ''}`;
    $('say').textContent = say;
    const why = $('why'); why.textContent = st.waiting === 'red' ? 'Đèn đỏ' : st.waiting === 'stop' ? 'Biển stop' : st.waiting === 'gate' ? 'Barie' : ''; why.hidden = !st.waiting;
    $('mph').textContent = mph; $('kmh').textContent = Math.round(st.v * 3.6) + ' km/h';
  }
  function arrived() {
    const R = drive.route, back = [...routes.values()].find(r => r.id !== R.id);
    $('arrive-t').textContent = 'Đã tới ' + R.to;
    $('arrive-b').textContent = R.id === world.start.route ? 'Xe đỗ ở mặt nam nhà để xe LA4, trong khu AT&T (năm 2015 còn là DirecTV).' : 'Xe đỗ lại ở dãy phía đông của bãi, cạnh dãy phòng chính.';
    $('go-back').textContent = back ? 'Lái về ' + back.to.split(' · ')[0].split(',')[0] : ''; $('go-back').hidden = !back; $('go-back').dataset.route = back ? back.id : '';
    const walk = $('go-walk'); walk.hidden = !(R.id !== world.start.route && world.walk && /\/places\//.test(location.pathname)); if (!walk.hidden) walk.href = world.walk;
    $('arrive').classList.add('on');
  }

  /* ── hands ── */
  const hold = (id, on, off) => { const b = $(id); if (!b) return; const down = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* a mouse */ } on(); woke = performance.now(); }, up = () => off(); b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up); };
  hold('p-left', () => { input.steer = -1; }, () => { if (input.steer < 0) input.steer = 0; }); hold('p-right', () => { input.steer = 1; }, () => { if (input.steer > 0) input.steer = 0; });
  hold('p-gas', () => { input.gas = 1; }, () => { input.gas = 0; }); hold('p-brake', () => { input.brake = 1; }, () => { input.brake = 0; });
  $('b-auto').addEventListener('click', () => setAuto(!st.auto));
  $('b-view').addEventListener('click', () => setView(view === 'cabin' ? 'road' : 'cabin'));
  $('b-music').addEventListener('click', () => unit.open(!unit.state.open, 'music'));
  $('b-where').addEventListener('click', () => unit.open(true, 'go'));
  for (const h of meta.hours) { const b = $('h-' + h.id); if (b) b.addEventListener('click', () => setHour(h.id)); }
  $('go').addEventListener('click', () => { document.documentElement.classList.remove('intro'); running = true; drive.go(); woke = performance.now(); });
  $('go-back').addEventListener('click', e => takeRoute(e.currentTarget.dataset.route, true));
  $('go-again').addEventListener('click', () => takeRoute(drive.route.id, true));
  addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input, select')) return; keys.add(e.key.toLowerCase()); if (e.key === 'v') setView(view === 'cabin' ? 'road' : 'cabin'); if (e.key === 't') setAuto(!st.auto); if (e.key === 'm') unit.open(!unit.state.open, 'music'); woke = performance.now(); });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  let drag = null, held = false;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; held = true; try { canvas.setPointerCapture(e.pointerId); } catch { /* a mouse */ } woke = performance.now(); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const k = (camera.fov * Math.PI / 180) / (canvas.clientHeight || 1); if (view === 'cabin') cabin.look((e.clientX - drag.x) * k * -1.1, (e.clientY - drag.y) * k * 1.1); drag.x = e.clientX; drag.y = e.clientY; woke = performance.now(); });
  const lift = e => {
    if (drag && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8 && performance.now() - drag.t < 450 && view === 'cabin') {
      const r = canvas.getBoundingClientRect(); if (cabin.pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)) unit.open(true, 'music');
    }
    drag = null; held = false;
  };
  canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', () => { drag = null; held = false; });

  /* ── the first picture ── */
  resize(); setHour(hourId.v); setView('cabin'); takeRoute(world.start.route, false);
  let last = performance.now(), slow = 0, frames = 0, readyAt = 0;
  const hours = world.light.hours;
  function step(dt) {
    clock += dt;
    if (!st.auto) { input.steer = keys.has('arrowleft') || keys.has('a') ? -1 : keys.has('arrowright') || keys.has('d') ? 1 : (keys.size ? 0 : input.steer); if (keys.has('arrowup') || keys.has('w')) input.gas = 1; else if (keys.size) input.gas = 0; if (keys.has('arrowdown') || keys.has('s') || keys.has(' ')) input.brake = 1; else if (keys.size) input.brake = 0; }
    if (running) drive.update(dt, clock, input);
    const hr = hours[hourId.v], sd = hr.dir || world.light.sun, c = Math.cos(Math.PI / 2 + st.heading), s = Math.sin(Math.PI / 2 + st.heading);
    sunCar.set(sd[0] * c + sd[2] * s, sd[1], -sd[0] * s + sd[2] * c);                    // the sunlight's travel, seen from the car
    cabin.update(st, dt, sunCar, hr, held);
    pose(dt);
    tiles.update(eyeWorld.x, eyeWorld.z, clock);
    for (const sI of sites) {
      const d = Math.hypot(eyeWorld.x - sI.at[0], eyeWorld.z - sI.at[1]); sI.group.visible = d < sI.reach;
      if (sI.near) { const on = Math.hypot(eyeWorld.x - sI.near.at[0], eyeWorld.z - sI.near.at[1]) < sI.near.reach; if (on !== sI.fineOn) { sI.fineOn = on; for (const c of sI.fine) c.visible = on; renderer.shadowMap.needsUpdate = true; } }
      if (sI.group.visible && sI.live.animate) sI.live.animate(dt, clock, proxy);
    }
    light.tick(dt); light.follow(eyeWorld);
    if (st.phase === 'arrived' && !arrivedAt) arrivedAt = clock;
    if (arrivedAt && clock - arrivedAt > 1.4 && !$('arrive').classList.contains('on')) arrived();
    hud(false); unit.tick();
  }
  function draw() {
    if (over) {
      const half = over.span / 2, fog = scene.fog; topCam.left = -half; topCam.right = half; topCam.top = half / camera.aspect; topCam.bottom = -half / camera.aspect; topCam.updateProjectionMatrix();
      topCam.up.set(0, 0, -1); topCam.position.set(over.x, 900, over.z); topCam.lookAt(over.x, 0, over.z);
      scene.fog = null; cutPlane.constant = over.cut || 0; renderer.clippingPlanes = over.cut ? [cutPlane] : [];
      renderer.clear(); renderer.render(scene, topCam); scene.fog = fog; renderer.clippingPlanes = []; return;
    }
    if (free) { freeCam.aspect = camera.aspect; freeCam.fov = free.fov || 55; freeCam.updateProjectionMatrix(); freeCam.position.set(...free.eye); freeCam.lookAt(...free.at); renderer.clear(); renderer.render(scene, freeCam); return; }
    renderer.clear(); renderer.render(scene, camera);
    if (view === 'cabin') { renderer.clearDepth(); renderer.render(cabin.scene, cabin.camera); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || paused) { last = now; return; }
    const moving = running && st.phase === 'driving';
    if (moving || drag || unit.state.open) woke = now;
    const idle = now - woke > 900; if (idle && now - last < 38) return;
    const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw); last = now;   // (a frame's own clock may read earlier than the moment the building ended)
    step(dt); draw();
    if (!readyAt && tiles.settled(eyeWorld.x, eyeWorld.z, 1)) { readyAt = now; const b = $('go'); b.disabled = false; b.textContent = 'Lên xe'; $('load').hidden = true; window.__world.ready = true; }
    if (!idle) { frames++; if (raw > 0.034) slow++; }
    if (frames >= 90) { if (slow > 55 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); resize(); } frames = slow = 0; }
  }
  requestAnimationFrame(frame);

  /* for the tools (places/<world>/checks.mjs, tools/*.mjs) and for looking around from the console */
  window.__world = {
    ready: false, place: meta.id, kind: 'world',
    pause: v => { paused = v; }, step: dt => step(dt), renderOnce: () => draw(),
    go: () => { document.documentElement.classList.remove('intro'); running = true; drive.go(); }, route: id => takeRoute(id, true), routes: () => [...routes.values()].map(r => ({ id: r.id, length: r.length, ctl: r.ctl, turns: r.turns })),
    setView, setHour, setAuto, input, look: (a, b) => cabin.look(a, b), unit,
    /** put the car this far along its route, standing still */
    at: s => { st.s = Math.max(0, Math.min(drive.route.length, s)); st.v = 0; drive.update(1e-6, clock, input); pose(0); },
    car: () => ({ ...st }), eye: () => [eyeWorld.x, eyeWorld.y, eyeWorld.z], clock: () => clock,
    settled: (reach = 1) => tiles.settled(eyeWorld.x, eyeWorld.z, reach), tiles: () => tiles.stats(),
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, dpr, geoms: renderer.info.memory.geometries, tex: renderer.info.memory.textures, programs: renderer.info.programs.length }),
    /** one frame's cost, the two passes told apart */
    cost: () => { renderer.info.autoReset = false; renderer.info.reset(); renderer.clear(); renderer.render(scene, camera); const w = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; renderer.info.reset(); if (view === 'cabin') { renderer.clearDepth(); renderer.render(cabin.scene, cabin.camera); } const c = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; renderer.info.autoReset = true; return { world: w, cabin: c }; },
    scene: () => scene, camera: () => camera, cabin: () => cabin, drive: () => drive, signal: signalState, view: () => view,
    /** what a site built by hand gave back (its live object) */
    site: id => (sites.find(s => s.id === id) || {}).live,
    /** the plan round (x, z), `span` metres across, cut at `cut` metres above the ground (0: nothing cut); over() goes back to the car */
    over: (x, z, span = 120, cut = 0) => { over = x == null ? null : { x, z, span, cut }; pose(0); },
    /** the world seen from a point towards another ([x, y, z] each); from() goes back to the car */
    from: (eye, at, fov) => { free = eye ? { eye, at, fov } : null; pose(0); },
  };
}
