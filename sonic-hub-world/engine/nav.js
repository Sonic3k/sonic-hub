/* Walking through a place. On a phone: the left thumb pushes (a stick appears under it), the right one looks around,
   a tap on the floor walks there. With a mouse: drag to look, click the floor to walk, W A S D or the arrows; Shift
   to hurry. The walker is a 36 cm circle that slides along whatever the builders registered as solid.

   A place of more than one floor (a walkway upstairs, stairs, a street) hands in `floor(x, z, y)`: the height of what
   the walker stands on at (x, z), given that its feet are at y now. A step of up to half a metre is taken, a drop of
   more than 0.6 m is a wall (nobody falls off a walkway), and the eye rides 1.52 m over the floor. Without it the floor
   is y = 0 everywhere, as it always was. */
import * as THREE from 'three';

const R = 0.19, EYE = 1.52, SPEED = 1.75, CELL = 4;
const rad = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

/** opts: { start: [x, y, z, heading, pitch], bounds: { x0, x1, z0, z1 }, floor(x, z, y), speed, tapRange } */
export function setupNav(camera, dom, solids, hooks = {}, opts = {}) {
  const st = opts.start || [0, EYE, 0, 0, 0];
  const pos = new THREE.Vector3(st[0], st[1], st[2]);
  let heading = st[3], pitch = st[4];
  const bounds = opts.bounds || { x0: -1e6, x1: 1e6, z0: -1e6, z1: 1e6 };
  const floorAt = opts.floor || null, walk = opts.speed || SPEED, tapRange = opts.tapRange || 9;
  let feet = floorAt ? floorAt(pos.x, pos.z, pos.y - EYE) : 0;

  /* the solids, filed in cells of 4 m: a street of a thousand things costs what a room of fifty did */
  const grid = new Map(), cellKey = (i, j) => (i + 8192) * 16384 + (j + 8192);
  for (const s of solids) {
    if (s.y1 - s.y0 < 0.02) continue;
    for (let i = Math.floor(s.x0 / CELL); i <= Math.floor(s.x1 / CELL); i++) for (let j = Math.floor(s.z0 / CELL); j <= Math.floor(s.z1 / CELL); j++) {
      const k = cellKey(i, j); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(s);
    }
  }
  const near = new Set();
  function around(x, z) {
    near.clear();
    for (let i = Math.floor((x - R) / CELL); i <= Math.floor((x + R) / CELL); i++) for (let j = Math.floor((z - R) / CELL); j <= Math.floor((z + R) / CELL); j++) {
      const a = grid.get(cellKey(i, j)); if (a) for (const s of a) near.add(s);
    }
    return near;
  }
  function resolve(p) {
    for (let it = 0; it < 3; it++) {
      for (const s of around(p.x, p.z)) {
        if (!(s.y0 < feet + 1.45 && s.y1 > feet + 0.3)) continue;      // between shin and shoulder of a walker standing here
        const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
        else { const l = p.x - s.x0, r = s.x1 - p.x, t = p.z - s.z0, b = s.z1 - p.z, m = Math.min(l, r, t, b); if (m === l) p.x = s.x0 - R; else if (m === r) p.x = s.x1 + R; else if (m === t) p.z = s.z0 - R; else p.z = s.z1 + R; }
      }
    }
    p.x = clamp(p.x, bounds.x0, bounds.x1); p.z = clamp(p.z, bounds.z0, bounds.z1);
  }
  /** one small step; on a place with floors, a step that would climb a wall or drop off an edge is not taken */
  function stepTo(x, z) {
    const ox = pos.x, oz = pos.z;
    pos.x = x; pos.z = z; resolve(pos);
    if (!floorAt) return true;
    const f = floorAt(pos.x, pos.z, feet);
    if (f > feet + 0.5 || f < feet - 0.6) { pos.x = ox; pos.z = oz; return false; }
    feet = f; return true;
  }
  function move(dx, dz) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.06));
    for (let i = 0; i < n; i++) {
      const sx = dx / n, sz = dz / n;
      // blocked straight on: slide along the edge, one axis at a time
      if (!stepTo(pos.x + sx, pos.z + sz) && !stepTo(pos.x + sx, pos.z)) stepTo(pos.x, pos.z + sz);
    }
  }
  function apply() {
    camera.position.copy(pos);
    camera.rotation.set(rad(pitch), -rad(heading), 0, 'YXZ');
  }

  /* ── input ── */
  const keys = new Set();
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, t: 0, moved: 0, hold: 0 };
  const look = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: 0 };
  let target = null, stall = 0, tour = null, fly = null;
  const cancelAuto = () => { if (tour) { tour = null; settle(); hooks.onTour && hooks.onTour(false); } target = null; };
  /** after a jump (a tour, a room picked from the list): which floor the walker now stands on */
  const settle = () => { if (floorAt) feet = floorAt(pos.x, pos.z, pos.y - EYE); };

  const isStickZone = e => e.pointerType === 'touch' && e.clientX < dom.clientWidth * 0.42 && e.clientY > dom.clientHeight * 0.38;
  dom.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAuto(); hooks.onTouch && hooks.onTouch();
    try { dom.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    try { dom.focus({ preventScroll: true }); } catch { /* the keys then stay with whatever had them */ }
    if (stick.id === null && isStickZone(e)) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; stick.t = performance.now(); stick.moved = 0; stick.hold = 0; hooks.onStick && hooks.onStick(stick, true); }
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
      stick.id = null; stick.x = stick.y = 0; stick.hold = 0; hooks.onStick && hooks.onStick(stick, false);
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
    if (/^(Key[WASDQE]|Arrow|Shift)/.test(e.code)) { keys.add(e.code); if (!e.code.startsWith('Shift')) cancelAuto(); if (e.code.startsWith('Arrow')) e.preventDefault(); }
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
    floorPlane.constant = -feet;  // the floor the walker stands on
    if (ray.ray.direction.y < -0.04 && ray.ray.intersectPlane(floorPlane, hit)) {
      const d = Math.hypot(hit.x - pos.x, hit.z - pos.z);
      if (d < tapRange) { target = { x: hit.x, z: hit.z, far: d > 8 }; stall = 0; hooks.onWalk && hooks.onWalk(hit); }
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
    if (tour.t >= 1) { tour.i++; tour.t = 0; if (tour.i >= k.length) { for (const q of k) q._said = false; tour = null; settle(); hooks.onTour && hooks.onTour(false); } }
  }

  function update(dt) {
    if (fly) {
      fly.t += dt / fly.d; const e = smooth(Math.min(1, fly.t));
      pos.set(fly.a[0] + (fly.b[0] - fly.a[0]) * e, fly.a[1] + (fly.b[1] - fly.a[1]) * e, fly.a[2] + (fly.b[2] - fly.a[2]) * e);
      heading = lerpAng(fly.a[3], fly.b[3], e); pitch = fly.a[4] + (fly.b[4] - fly.a[4]) * e;
      if (fly.t >= 1) { fly = null; settle(); }
    } else if (tour) stepTour(dt);
    else {
      const h = rad(heading); let f = 0, s = 0, turn = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyD')) s += 1; if (keys.has('KeyA')) s -= 1;
      if (keys.has('ArrowLeft') || keys.has('KeyQ')) turn -= 1; if (keys.has('ArrowRight') || keys.has('KeyE')) turn += 1;
      f -= stick.y; s += stick.x * 0.8;
      heading += turn * 95 * dt;
      // Shift hurries; a thumb held hard against the rim of the stick breaks into a jog after a moment
      if (stick.id !== null && Math.hypot(stick.x, stick.y) > 0.92) stick.hold += dt; else stick.hold = 0;
      const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.6 : 1 + Math.min(1.3, Math.max(0, stick.hold - 0.8));
      const moving = f || s || target;
      if (f || s) { target = null; const k = walk * pace * dt; move((Math.sin(h) * f + Math.cos(h) * s) * k, (-Math.cos(h) * f + Math.sin(h) * s) * k); }
      else if (target) {
        const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12) target = null;
        else { const bx = pos.x, bz = pos.z, v = walk * (target.far ? 2.2 : 1.15), k = Math.min(d, v * dt) / d; move(dx * k, dz * k); if (Math.hypot(pos.x - bx, pos.z - bz) < v * dt * 0.25) { stall += dt; if (stall > 0.35) target = null; } else stall = 0; }
      }
      // up and down the stairs the eye follows the feet, a little behind them
      if (floorAt && moving) pos.y += (feet + EYE - pos.y) * Math.min(1, dt * 12);
    }
    apply();
  }
  apply();
  return {
    update, pos,
    get heading() { return heading; }, get pitch() { return pitch; }, get feet() { return feet; },
    get busy() { return !!(tour || fly || target || stick.id !== null || look.id !== null || keys.size); },
    get touring() { return !!tour; },
    setPose(x, y, z, h, p) { cancelAuto(); fly = null; pos.set(x, y, z); heading = h; pitch = p; settle(); apply(); },
    getPose() { return [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), Math.round(((heading % 360) + 360) % 360), Math.round(pitch)]; },
    startTour, stopTour: cancelAuto,
  };
}
