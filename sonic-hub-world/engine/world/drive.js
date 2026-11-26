/* A car on a route. The route is a path worked out beforehand (a place's data/world.py): what the back axle of a car
   traces when it is driven along the middle of the lane — every half metre its place (to the millimetre), its heading
   and how tightly it is turning — with the speed each stretch allows, where the signals and stop signs are, and how
   far a hand on the wheel may stray from it. The heading and the turning come with the path: taking them from
   neighbouring points of a line kept to the decimetre made the car's nose and its wheel twitch on a straight street.
   By default the car drives itself along it: it keeps the lane, slows for bends, stops at a red light and at a stop
   sign, and parks at the end. With a hand on the wheel the driver chooses the speed and the
   place in the road; the car still follows the route's turnings (other streets are closed to it). */
import { signalState } from './tiles.js';

const WHEELBASE = 2.775, RATIO = 14.6;            // a 2014 Camry: metres between the axles; turns of the wheel per turn of the road wheels
const AXLE = WHEELBASE / 2;                       // the car's middle is this far ahead of the axle the path belongs to
const A_GO = 1.45, A_EASE = 1.7, A_HARD = 3.6, A_SIDE = 1.9;   // m/s²: pulling away, braking gently, braking hard, sideways in a bend

/** route: what routes.json holds for one route → the same, ready for use */
export function readRoute(r) {
  const n = r.pts.length >> 1, x = new Float64Array(n), z = new Float64Array(n), s = new Float64Array(n);
  for (let i = 0; i < n; i++) { x[i] = r.pts[2 * i] / 1000; z[i] = r.pts[2 * i + 1] / 1000; if (i) s[i] = s[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]); }
  const hd = new Float64Array(n), k = new Float64Array(n);
  for (let i = 0; i < n; i++) { hd[i] = r.hd[i] / 1e5; k[i] = r.k[i] / 1e6; }        // the heading (it runs on past ±180°); + bends to the right
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  // the most each metre allows: the street's own limit, and what the bend takes without leaning
  const cap = new Float32Array(n); let li = 0, bi = 0;
  const lo = new Float32Array(n), hi = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    while (li + 1 < r.lim.length && r.lim[li + 1][0] <= s[i]) li++;
    while (bi + 1 < r.band.length && r.band[bi + 1][0] <= s[i]) bi++;
    cap[i] = Math.min(r.lim[li][1], Math.sqrt(A_SIDE / Math.max(1e-4, Math.abs(k[i])))); lo[i] = r.band[bi][1]; hi[i] = r.band[bi][2];
  }
  for (let i = n - 2; i >= 0; i--) cap[i] = Math.min(cap[i], Math.sqrt(cap[i + 1] * cap[i + 1] + 2 * A_EASE * (s[i + 1] - s[i])));   // slow in good time for what comes
  return { id: r.id, name: r.name, from: r.frm, to: r.to, n, x, z, s, hd, k, cap, lo, hi, length: s[n - 1], ctl: r.ctl.map(([at, kind, junction, group]) => ({ at, kind, junction, group })), turns: r.turns, names: r.names, straight: r.straight || [], wrap };
}

export function setupDrive() {
  let R = null, i0 = 0;
  const st = {
    phase: 'parked',        // parked · driving · arrived
    auto: true, s: 0, v: 0, lat: 0, dev: 0, acc: 0,
    x: 0, z: 0, heading: 0, pitch: 0, roll: 0,
    wheel: 0,               // the steering wheel's angle, radians (+ to the right)
    blink: 0,               // −1 left, +1 right
    street: '', waiting: '', next: null, rpm: 700, gear: 'P', held: 0, stops: 0, progress: 0,
  };
  const passed = new Set();   // stop signs already obeyed
  const at = (arr, f) => { const i = Math.min(R.n - 2, Math.max(0, Math.floor(f))), t = f - i; return arr[i] + (arr[i + 1] - arr[i]) * t; };
  const index = s => { let i = i0; while (i < R.n - 2 && R.s[i + 1] <= s) i++; while (i > 0 && R.s[i] > s) i--; i0 = i; return i + (s - R.s[i]) / Math.max(1e-6, R.s[i + 1] - R.s[i]); };
  function place() {
    const f = index(st.s), x = at(R.x, f), z = at(R.z, f), i = Math.floor(f);
    const h0 = R.hd[i], h1 = R.hd[Math.min(R.n - 1, i + 1)], h = h0 + R.wrap(h1 - h0) * (f - i);
    const nx = -Math.sin(h), nz = Math.cos(h);                                     // to the right of travel
    st.x = x + Math.cos(h) * AXLE + nx * st.lat; st.z = z + Math.sin(h) * AXLE + nz * st.lat; st.heading = h + st.dev; index(st.s);
    return f;
  }
  function setRoute(route, o = {}) {
    R = route; i0 = 0; passed.clear();
    Object.assign(st, { phase: 'parked', s: o.s ?? 0, v: 0, lat: 0, dev: 0, acc: 0, wheel: 0, blink: 0, waiting: '', gear: 'P', held: 0, stops: 0, pitch: 0, roll: 0 });
    place(); st.street = streetAt(st.s); st.progress = 0;
  }
  const streetAt = s => { let nm = ''; for (const [a, name] of R.names) { if (a <= s) nm = name; else break; } return nm; };

  /** dt seconds on; time: the world's clock (the signals run on it); input: { gas, brake, steer } each 0…1 / −1…1 */
  function update(dt, time, input) {
    if (!R || dt <= 0) return st;
    const f = index(st.s), i = Math.floor(f), kappa = at(R.k, f);
    if (st.phase === 'driving') {
      let want;                                                                    // the speed to be at
      st.waiting = '';
      if (st.auto) {
        want = Math.min(at(R.cap, f), at(R.cap, index(Math.min(R.length, st.s + st.v * 0.8))));   // and what the road asks a moment ahead
        // what lies ahead that may stop us: the end of the route, a red light, a stop sign not yet obeyed
        let stopAt = R.length - 0.6, why = 'end';
        for (const c of R.ctl) {
          const d = c.at - st.s; if (d < -1.5 || d > 140) continue;
          if (c.kind === 1) { if (!passed.has(c.at) && c.at < stopAt) { stopAt = c.at; why = 'stop'; } continue; }
          const sig = signalState(c.junction, c.group, time), need = st.v * st.v / (2 * A_EASE) + 2;   // room to stop gently
          if (sig === 0 || (sig === 1 && d > need * 0.75)) { if (d > -0.5 && c.at < stopAt) { stopAt = c.at; why = 'red'; } }
        }
        const room = stopAt - st.s;
        if (room < 160) want = Math.min(want, Math.sqrt(Math.max(0, 2 * A_EASE * 0.92 * Math.max(0, room - 0.35))));
        if (room < 0.6 && st.v < 0.25) {                                            // standing at the line
          st.v = 0; want = 0;
          if (why === 'end') { st.phase = 'arrived'; st.gear = 'P'; }
          else if (why === 'stop') { st.held += dt; st.waiting = 'stop'; if (st.held > 1.6) { passed.add(stopAt); st.held = 0; st.stops++; } }
          else st.waiting = 'red';
        } else st.held = 0;
        let a = want > st.v ? Math.min(A_GO, (want - st.v) * 1.6) : Math.max(-A_HARD, (want - st.v) * 3.2);
        if (want < 0.4 && st.v < 1.6) a = Math.max(a, -(0.35 + st.v * 0.9));          // the last metre of a stop: the foot eases off the brake
        // a foot does not jump on a pedal: the push grows by so much a second (the brake faster than the throttle)
        const most = (a < st.acc ? 3.4 : 1.6) * dt; st.acc += Math.max(-most, Math.min(most, a - st.acc)); st.v = Math.max(0, st.v + st.acc * dt);
        st.lat += (0 - st.lat) * Math.min(1, dt * 0.9); st.dev += (0 - st.dev) * Math.min(1, dt * 2.5);
      } else {
        const gas = input.gas || 0, brake = input.brake || 0;
        const a = gas * (2.4 - st.v * 0.045) - brake * 5.2 - (0.12 + st.v * 0.012) - (gas || st.v > 0.4 ? 0 : 2);
        st.acc += (a - st.acc) * Math.min(1, dt * 6); st.v = Math.max(0, Math.min(31, st.v + st.acc * dt));
        const reach = 0.34 / (1 + st.v * 0.07), aim = (input.steer || 0) * reach;       // how far the nose may swing off the lane's own line
        st.dev += (aim - st.dev) * Math.min(1, dt * 3.2);
        st.lat += st.v * Math.sin(st.dev) * dt;
        const lo = at(R.lo, f), hi = at(R.hi, f);
        if (st.lat < lo) { st.lat = lo; if (st.dev < 0) st.dev *= 0.6; st.v *= 1 - Math.min(1, dt * 1.2); }      // the kerb, or the other side's lanes
        if (st.lat > hi) { st.lat = hi; if (st.dev > 0) st.dev *= 0.6; st.v *= 1 - Math.min(1, dt * 1.2); }
        if (st.s >= R.length - 0.8) { st.v = 0; st.phase = 'arrived'; st.gear = 'P'; }
      }
      st.s = Math.min(R.length, st.s + st.v * Math.cos(st.dev) * dt / Math.max(0.5, 1 - kappa * st.lat));
      st.gear = st.phase === 'arrived' ? 'P' : 'D';
    } else { st.v = 0; st.acc += (0 - st.acc) * Math.min(1, dt * 5); }
    place();
    // the wheel: what the bend asks of the road wheels, and the driver's own hand on top of it
    const road = Math.atan(WHEELBASE * kappa) + st.dev * 0.9 + (st.auto ? 0 : (input.steer || 0) * 0.05);
    st.wheel += (road * RATIO - st.wheel) * Math.min(1, dt * 12);
    // the body on its springs: it leans out of a bend (about 0.35° for a tenth of g) and dips under the brake, and takes a moment over both
    st.roll += (-st.v * st.v * kappa * 0.006 - st.roll) * Math.min(1, dt * 3); st.pitch += (st.acc * 0.005 - st.pitch) * Math.min(1, dt * 3);
    st.blink = 0; for (const [a, b, dir] of R.turns) if (st.s >= a && st.s <= b) st.blink = dir;
    if (st.phase === 'arrived' || st.phase === 'parked') st.blink = 0;
    st.street = streetAt(st.s); st.progress = st.s / R.length;
    // the engine's turning: a six-speed automatic's saw-tooth, more with the foot down
    const mph = st.v * 2.23694, G = [0, 16, 30, 44, 58, 74, 200]; let g = 1; while (g < 6 && mph > G[g]) g++;
    const span = (mph - G[g - 1]) / (G[g] - G[g - 1]), load = Math.max(0, st.acc) / A_GO;
    const rpm = st.phase === 'driving' ? 780 + (g === 1 ? mph * 95 : 1150 + span * (700 + 900 * load)) + load * 420 : 700;
    st.rpm += (rpm - st.rpm) * Math.min(1, dt * 6);
    st.next = null; for (const [a, b, dir] of R.turns) if (b > st.s) { st.next = { in: Math.max(0, a + 38 - st.s), dir }; break; }
    return st;
  }
  return {
    state: st, update, setRoute,
    get route() { return R; },
    go() { if (R && st.phase !== 'driving') { if (st.phase === 'arrived') return; st.phase = 'driving'; st.gear = 'D'; } },
    setAuto(v) { st.auto = !!v; },
  };
}
