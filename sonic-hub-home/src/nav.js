/* Walking through the flat. On a phone: the left thumb pushes (a stick appears under it), the right one looks around,
   a tap on the floor walks there. With a mouse: drag to look, click the floor to walk, W A S D or the arrows.
   The walker is a 36 cm circle that slides along whatever the builders registered as solid. */
import * as THREE from 'three';

const R = 0.19, EYE = 1.52, SPEED = 1.75;
const rad = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

export function setupNav(camera, dom, solids, hooks = {}) {
  const pos = new THREE.Vector3(1.1, EYE, 2.6);
  let heading = 62, pitch = -4;
  const active = solids.filter(s => s.y0 < 1.45 && s.y1 > 0.3);
  const bounds = { x0: -1.14, x1: 10.56, z0: -12.0, z1: 8.42 };

  function resolve(p) {
    for (let it = 0; it < 3; it++) {
      for (const s of active) {
        const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
        else { const l = p.x - s.x0, r = s.x1 - p.x, t = p.z - s.z0, b = s.z1 - p.z, m = Math.min(l, r, t, b); if (m === l) p.x = s.x0 - R; else if (m === r) p.x = s.x1 + R; else if (m === t) p.z = s.z0 - R; else p.z = s.z1 + R; }
      }
    }
    p.x = clamp(p.x, bounds.x0, bounds.x1); p.z = clamp(p.z, bounds.z0, bounds.z1);
  }
  function move(dx, dz) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.06));
    for (let i = 0; i < n; i++) { pos.x += dx / n; pos.z += dz / n; resolve(pos); }
  }
  function apply() {
    camera.position.copy(pos);
    camera.rotation.set(rad(pitch), -rad(heading), 0, 'YXZ');
  }

  /* ── input ── */
  const keys = new Set();
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, t: 0, moved: 0 };
  const look = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: 0 };
  let target = null, stall = 0, tour = null, fly = null;
  const cancelAuto = () => { if (tour) { tour = null; hooks.onTour && hooks.onTour(false); } target = null; };

  const isStickZone = e => e.pointerType === 'touch' && e.clientX < dom.clientWidth * 0.42 && e.clientY > dom.clientHeight * 0.38;
  dom.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAuto(); hooks.onTouch && hooks.onTouch();
    try { dom.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    try { dom.focus({ preventScroll: true }); } catch { /* the keys then stay with whatever had them */ }
    if (stick.id === null && isStickZone(e)) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; stick.t = performance.now(); stick.moved = 0; hooks.onStick && hooks.onStick(stick, true); }
    else if (look.id === null) { look.id = e.pointerId; look.x = look.sx = e.clientX; look.y = look.sy = e.clientY; look.t = performance.now(); look.moved = 0; }
    e.preventDefault();
  });
  dom.addEventListener('pointermove', e => {
    if (e.pointerId === stick.id) {
      const m = 46, dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, d = Math.hypot(dx, dy) || 1, k = Math.min(d, m) / d;
      stick.x = dx * k / m; stick.y = dy * k / m; stick.moved = Math.max(stick.moved, d); hooks.onStick && hooks.onStick(stick, true);
    } else if (e.pointerId === look.id) {
      const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy);
      const k = (e.pointerType === 'touch' ? 0.2 : 0.16) * (camera.fov / 70);
      heading -= dx * k; pitch = clamp(pitch + dy * k * 0.9, -62, 62);
    }
  });
  const up = e => {
    if (e.pointerId === stick.id) {
      stick.id = null; stick.x = stick.y = 0; hooks.onStick && hooks.onStick(stick, false);
      // a quick touch that never pushed is a tap like any other: walk there, or open what was touched
      if (stick.moved < 9 && performance.now() - stick.t < 450 && e.type === 'pointerup') tap(e.clientX, e.clientY);
    }
    else if (e.pointerId === look.id) {
      look.id = null;
      if (look.moved < 9 && performance.now() - look.t < 450 && e.type === 'pointerup') tap(e.clientX, e.clientY);
    }
  };
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
  dom.addEventListener('wheel', e => { cancelAuto(); const h = rad(heading), s = -Math.sign(e.deltaY) * 0.35; move(Math.sin(h) * s, -Math.cos(h) * s); e.preventDefault(); }, { passive: false });
  dom.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // while the year slider has the focus the arrows are its own; the letters still walk
    const t = e.target; if (t && t.tagName === 'INPUT' && e.code.startsWith('Arrow')) return;
    if (/^(Key[WASDQE]|Arrow)/.test(e.code)) { keys.add(e.code); cancelAuto(); if (e.code.startsWith('Arrow')) e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function tap(cx, cy) {
    const r = dom.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();   // the tap is aimed from where the camera is now, not from the last picture drawn
    ray.setFromCamera(ndc, camera);
    if (hooks.onTap && hooks.onTap(ray)) return;
    if (ray.ray.direction.y < -0.04 && ray.ray.intersectPlane(floorPlane, hit)) {
      const d = Math.hypot(hit.x - pos.x, hit.z - pos.z);
      if (d < 9) { target = { x: hit.x, z: hit.z }; stall = 0; hooks.onWalk && hooks.onWalk(hit); }
    }
  }

  /* ── the camera path of a tour: positions on a spline, headings eased ── */
  const lerpAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
  function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  function startTour(keys_) {
    target = null; fly = null;
    tour = { k: keys_, i: 0, t: 0, from: { p: [pos.x, pos.y, pos.z], h: heading, pitch } };
    hooks.onTour && hooks.onTour(true);
  }
  function stepTour(dt) {
    const k = tour.k, cur = k[tour.i], prev = tour.i === 0 ? tour.from : k[tour.i - 1];
    tour.t += dt / cur.t;
    const t = Math.min(1, tour.t), e = smooth(t);
    // the curve never looks across a cut: the place before it and the place after it are not neighbours
    const nx = k[tour.i + 1], p0 = tour.i > 1 && !prev.cut ? k[tour.i - 2].p : prev.p, p3 = nx && !nx.cut ? nx.p : cur.p;
    if (cur.cut && tour.t < 1e-6 + dt / cur.t) { hooks.onCut && hooks.onCut(); }
    if (cur.cut) { pos.set(cur.p[0], cur.p[1], cur.p[2]); heading = cur.h; pitch = cur.pitch; tour.t = 1; }
    else {
      pos.set(cr(p0[0], prev.p[0], cur.p[0], p3[0], e), cr(p0[1], prev.p[1], cur.p[1], p3[1], e), cr(p0[2], prev.p[2], cur.p[2], p3[2], e));
      heading = lerpAng(prev.h, cur.h, e); pitch = prev.pitch + (cur.pitch - prev.pitch) * e;
    }
    if (cur.label && !cur._said) { cur._said = true; hooks.onLabel && hooks.onLabel(cur.label); }
    if (tour.t >= 1) { tour.i++; tour.t = 0; if (tour.i >= k.length) { for (const q of k) q._said = false; tour = null; hooks.onTour && hooks.onTour(false); } }
  }

  function update(dt) {
    if (fly) {
      fly.t += dt / fly.d; const e = smooth(Math.min(1, fly.t));
      pos.set(fly.a[0] + (fly.b[0] - fly.a[0]) * e, fly.a[1] + (fly.b[1] - fly.a[1]) * e, fly.a[2] + (fly.b[2] - fly.a[2]) * e);
      heading = lerpAng(fly.a[3], fly.b[3], e); pitch = fly.a[4] + (fly.b[4] - fly.a[4]) * e;
      if (fly.t >= 1) fly = null;
    } else if (tour) stepTour(dt);
    else {
      const h = rad(heading); let f = 0, s = 0, turn = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyD')) s += 1; if (keys.has('KeyA')) s -= 1;
      if (keys.has('ArrowLeft') || keys.has('KeyQ')) turn -= 1; if (keys.has('ArrowRight') || keys.has('KeyE')) turn += 1;
      f -= stick.y; s += stick.x * 0.8;
      heading += turn * 95 * dt;
      if (f || s) { target = null; const k = SPEED * dt; move((Math.sin(h) * f + Math.cos(h) * s) * k, (-Math.cos(h) * f + Math.sin(h) * s) * k); }
      else if (target) {
        const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12) target = null;
        else { const bx = pos.x, bz = pos.z, k = Math.min(d, SPEED * 1.15 * dt) / d; move(dx * k, dz * k); if (Math.hypot(pos.x - bx, pos.z - bz) < SPEED * dt * 0.25) { stall += dt; if (stall > 0.35) target = null; } else stall = 0; }
      }
    }
    apply();
  }
  apply();
  return {
    update, pos,
    get heading() { return heading; }, get pitch() { return pitch; },
    get busy() { return !!(tour || fly || target || stick.id !== null || look.id !== null || keys.size); },
    get touring() { return !!tour; },
    setPose(x, y, z, h, p) { cancelAuto(); fly = null; pos.set(x, y, z); heading = h; pitch = p; apply(); },
    getPose() { return [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), Math.round(((heading % 360) + 360) % 360), Math.round(pitch)]; },
    startTour, stopTour: cancelAuto,
  };
}
