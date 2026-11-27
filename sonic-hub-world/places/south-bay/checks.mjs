// South Bay: opens the world the way a visitor would and checks that it holds — the page comes up, the car drives each
// route (to AT&T and back to the hotel; home to Anza two ways, to three places to park) by itself from end to end keeping the rules (the speed each street allows, no leaning in a bend, a full stop
// at a stop sign, never over a line on red) and driving like a car (on a straight street the wheel holds still, the
// body does not rock, the foot does not hunt between the pedals), it keeps off the kerbs, a hand on the wheel works and gives the wheel
// back, the screen shows his list, the way into the parking structure holds (the gate, the floors under the wheels,
// the stall on level 3, the cars standing there), on the freeways the wheels are on the decks and the slope comes and goes
// gently, at home the car stands parked by the kerb with him beside it (a tap on it and he is back at the wheel), and a
// frame never costs more than the ceiling measured on his telephone
// (claude/chuan-dung-the-gioi-3d.md: 460 draw calls, 1.2 M triangles in view; 160 MB of streamed ground).
// Run from the module's folder after a build: node places/south-bay/checks.mjs
import { launch, open as openPage } from '../../tools/lib.mjs';

const PLACE = 'south-bay';
const CEIL = { calls: 460, tris: 1.2e6, cabinCalls: 60, mb: 160, held: 49 };
const browser = await launch();
const results = []; const ok = (name, cond, extra = '') => { results.push(cond); console.log(cond ? 'PASS' : 'FAIL', '·', name, extra ? '— ' + extra : ''); };
const open = (vp, mobile, more = {}) => openPage(browser, { ...vp, mobile, place: PLACE, ...more });

/* ── a wide screen: the routes, driven ── */
{
  const { page, logs } = await open({ width: 1280, height: 720 }, false);
  const routes = await page.evaluate(async () => { await window.__world.loadAll(); return window.__world.routes(); });
  const hotel = routes.filter(r => !/^att-anza-/.test(r.id)), home = routes.filter(r => /^att-anza-[12][abc]$/.test(r.id));
  ok('the routes: to AT&T and back to the hotel; home to Anza by Inglewood Ave or Hawthorne Blvd, to three places to park', routes.length === 8 && hotel.length === 2 && hotel.every(r => r.length > 1500 && r.length < 2200) && home.length === 6 && home.every(r => r.length > 12000 && r.length < 15000),
    routes.map(r => `${r.id} ${Math.round(r.length)} m, ${r.ctl.length} signals and signs, ${r.turns.length} turns`).join(' · '));
  for (const r of routes) {
    const run = await page.evaluate(async id => {
      const W = window.__world, D = W.drive(); W.route(id); W.setView('cabin');
      const R = D.route, st = D.state, at = (arr, s) => { let i = 0; while (i < R.n - 2 && R.s[i + 1] <= s) i++; return arr[i]; };
      const out = { t: 0, over: 0, lean: 0, redRun: [], stopsMin: {}, waitsRed: 0, top: 0, arrived: false, calls: 0, tris: 0, cabinCalls: 0, worst: '', off: 0, grade: 0, push: 0, pushAt: '', yTop: 0 };
      let gPrev = st.grade;
      // where the street is straight is the map's word, not the path's (routes.json: straight — the lane's own line turns
      // by no more than 0.6° within 20 m either way): what the car does there is what is held to account
      const onStraight = s => R.straight.some(([a, b]) => s >= a && s <= b);
      const deg = 180 / Math.PI, feel = { straightM: R.straight.reduce((a, [p, q]) => a + q - p, 0), wheelOnStraight: 0, rollOnStraight: 0, sideOnStraight: 0, yawOnStraight: 0, swings: 0, moving: 0, pedal: 0, jerk: 0, wheelRate: 0, wheelRateFast: 0, sideJerk: 0, sideJerkAt: '' };
      let pSide = 0;
      let wLast = 0, wDir = 0, wBase = 0, aSide = 0, pAcc = 0, pWheel = 0, pHead = st.heading;
      for (const c of R.ctl) if (c.kind === 1) out.stopsMin[c.at] = 99;
      let prev = st.s, red = false, nextCost = 0;
      // the parking structure: the gate (a full stop; the arm down when the car draws up, up when its bumper passes, down again
      // behind it), the slope under the car (how fast it changes), the cars standing in the stalls (how near the car's body comes)
      const G = W.site('garage-940-nash'), gar = { y0: st.y, yTop: 0, gradeRate: 0, grade: 0, gateMin: 99, armStop: -1, armPass: -1, armsUp: 0, clear: 99, clearAt: '', inside: 0 };
      const gate = R.ctl.find(c => c.kind === 2); let pGrade = st.grade, passedAt = -1;
      const inGarage = () => !gate || (id === 'esa-att' ? st.s > gate.at - 5 : st.s < gate.at + 5);   // (the slope in the structure is its own: the freeways' are checked below)
      const body = [[2.42, 0.915], [2.42, -0.915], [-2.42, 0.915], [-2.42, -0.915], [2.42, 0], [-2.42, 0], [0, 0.915], [0, -0.915], [1.2, 0.915], [1.2, -0.915], [-1.2, 0.915], [-1.2, -0.915]];
      for (let k = 0; k < 60000 && !out.arrived; k++) {
        W.step(0.05); out.t += 0.05;
        if (st.v > 0.5) { const push = st.v * Math.abs(st.grade - gPrev) / 0.05; if (push > out.push) { out.push = push; out.pushAt = `${Math.round(st.s)} m at ${Math.round(st.v * 3.6)} km/h`; } }   // (the push up or down a change of slope gives: speed × how fast the slope turns)
        out.grade = Math.max(out.grade, Math.abs(st.grade)); out.yTop = Math.max(out.yTop, st.y); gPrev = st.grade;
        if (G) {
          if (inGarage()) { gar.yTop = Math.max(gar.yTop, st.y); gar.grade = Math.max(gar.grade, Math.abs(st.grade)); gar.gradeRate = Math.max(gar.gradeRate, Math.abs(st.grade - pGrade) / 0.05); } pGrade = st.grade;
          const arms = G.arms(), up = Math.max(...arms);
          if (gate) {
            if (st.s > gate.at - 2.5 && st.s < gate.at + 1) { gar.gateMin = Math.min(gar.gateMin, st.v); if (st.v < 0.05 && gar.armStop < 0) gar.armStop = up; }
            if (prev < gate.at + 0.5 && st.s >= gate.at + 0.5) { gar.armPass = up; gar.armsUp = arms.filter(a => a > 0.5).length; passedAt = out.t; }
            if (passedAt > 0 && out.t > passedAt + 8 && gar.armAfter == null) gar.armAfter = up;
          }
          const c = Math.cos(st.heading), s = Math.sin(st.heading);
          for (const [px, py, pz] of G.parked) {
            if (Math.abs(py - st.y) > 1.6 || Math.abs(px - st.x) > 6 || Math.abs(pz - st.z) > 7) continue;
            gar.inside++;
            for (const [f, l] of body) {                                             // points of the car's outline against the standing car's (0.89 × 2.28 m either way of its middle)
              const x = st.x + c * f - s * l, z = st.z + s * f + c * l, d = Math.hypot(Math.max(0, Math.abs(x - px) - 0.89), Math.max(0, Math.abs(z - pz) - 2.28));
              if (d < gar.clear) { gar.clear = d; gar.clearAt = `${Math.round(st.s)} m`; }
            }
          }
        }
        const v = st.v, cap = at(R.cap, st.s), kap = Math.abs(at(R.k, st.s));
        out.top = Math.max(out.top, v); out.over = Math.max(out.over, v - cap); out.lean = Math.max(out.lean, v * v * kap); out.off = Math.max(out.off, Math.abs(st.lat));
        // how it drives: the wheel's swings of 2° and more, what the wheel, the body and the sideways push do on a straight, the foot's changes of pedal
        const w = st.wheel * deg;
        if (wDir === 0) { if (Math.abs(w - wBase) > 2) { wDir = w > wBase ? 1 : -1; wLast = w; } }
        else if (wDir > 0) { if (w > wLast) wLast = w; else if (wLast - w > 2) { feel.swings++; wDir = -1; wLast = w; } }
        else { if (w < wLast) wLast = w; else if (w - wLast > 2) { feel.swings++; wDir = 1; wLast = w; } }
        if (v > 0.5) feel.moving += 0.05;
        if (onStraight(st.s)) {
          feel.wheelOnStraight = Math.max(feel.wheelOnStraight, Math.abs(w)); feel.rollOnStraight = Math.max(feel.rollOnStraight, Math.abs(st.roll) * deg);
          feel.sideOnStraight = Math.max(feel.sideOnStraight, v * v * kap); feel.yawOnStraight = Math.max(feel.yawOnStraight, Math.abs(st.heading - pHead) / 0.05 * deg);
        }
        const side = st.acc > 0.3 ? 1 : st.acc < -0.3 ? -1 : 0; if (side && side !== aSide) { if (aSide) feel.pedal++; aSide = side; }
        feel.jerk = Math.max(feel.jerk, Math.abs(st.acc - pAcc) / 0.05); pAcc = st.acc; pHead = st.heading;
        const wr = Math.abs(w - pWheel) / 0.05; feel.wheelRate = Math.max(feel.wheelRate, wr); if (v > 8) feel.wheelRateFast = Math.max(feel.wheelRateFast, wr); pWheel = w;
        // (how fast the sideways push grows as the wheel is turned — speed² × the bend's change: 40° a second of wheel is brisk at 30 km/h and violent at 100)
        const push = v * v * Math.tan(st.wheel / 14.6) / 2.775, sj = Math.abs(push - pSide) / 0.05; if (v > 8 && sj > feel.sideJerk) { feel.sideJerk = sj; feel.sideJerkAt = `${Math.round(st.s)} m at ${Math.round(v * 3.6)} km/h`; } pSide = push;
        for (const c of R.ctl) {
          if (c.kind === 1) { if (st.s > c.at - 2.5 && st.s < c.at + 1) out.stopsMin[c.at] = Math.min(out.stopsMin[c.at], v); }
          else if (c.kind === 0 && prev < c.at + 0.6 && st.s >= c.at + 0.6 && W.signal(c.junction, c.group, W.clock()) === 0) out.redRun.push(c.at);
        }
        if (st.waiting === 'red' && !red) out.waitsRed++; red = st.waiting === 'red';
        if (st.s >= nextCost) {                                                  // what a frame costs here, once the ground round the car is in place
          nextCost = st.s + (R.length > 5000 ? 150 : 40);                       // (on a route of 13 km, every 150 m)
          for (let w = 0; w < 60 && !W.settled(1); w++) await new Promise(f => setTimeout(f, 50));
          W.step(1e-6); const c = W.cost();
          if (c.world.calls > out.calls || c.world.tris > out.tris) out.worst = `${Math.round(st.s)} m: ${c.world.calls} calls, ${Math.round(c.world.tris / 1000)}k triangles`;
          out.calls = Math.max(out.calls, c.world.calls); out.tris = Math.max(out.tris, c.world.tris); out.cabinCalls = Math.max(out.cabinCalls, c.cabin.calls);
        }
        prev = st.s; out.arrived = st.phase === 'arrived';
      }
      out.feel = feel; out.events = R.ctl.length + R.turns.length;
      if (G) { for (let k = 0; k < 200; k++) W.step(0.05); gar.armEnd = Math.max(...G.arms()); gar.gates = st.gates; gar.yEnd = st.y; gar.head = st.heading; gar.gate = !!gate; out.gar = gar; }
      out.tiles = W.tiles(); out.end = [st.x, st.z]; return out;
    }, r.id);
    const stops = Object.entries(run.stopsMin);
    ok(`${r.id}: the car arrives by itself`, run.arrived, `${Math.round(run.t)} s for ${Math.round(r.length)} m, at most ${(run.top * 2.237).toFixed(0)} mph; waited at ${run.waitsRed} red light(s)`);
    ok(`${r.id}: never faster than the street allows`, run.over < 0.6, `over by at most ${run.over.toFixed(2)} m/s`);
    ok(`${r.id}: no leaning in the bends`, run.lean < 2.4, `${run.lean.toFixed(2)} m/s² sideways at most`);
    const f = run.feel;
    ok(`${r.id}: on a straight street the car goes straight`, f.straightM > 400 && f.wheelOnStraight < 2 && f.rollOnStraight < 0.05 && f.sideOnStraight < 0.12 && f.yawOnStraight < 0.5,
      `${Math.round(f.straightM)} m of straight street: the wheel within ${f.wheelOnStraight.toFixed(1)}° of the middle, the body within ${f.rollOnStraight.toFixed(2)}°, the nose turning ${f.yawOnStraight.toFixed(2)}° a second at most, ${f.sideOnStraight.toFixed(2)} m/s² sideways`);
    const perMin = f.swings / (f.moving / 60);
    // (the sideways push may grow by 3 m/s³ at most: the brisk end of an ordinary change of lane — a hand sawing at the
    // wheel at speed gives far more; the hotel's streets stay under 1)
    ok(`${r.id}: the wheel is turned, not sawn at`, perMin < 12 && f.wheelRate < 420 && f.sideJerk < 3.0,
      `${f.swings} turns of the wheel's direction (2° and more) in ${Math.round(f.moving)} s of moving: ${perMin.toFixed(1)} a minute; the wheel never faster than ${Math.round(f.wheelRate)}° a second (${Math.round(f.wheelRateFast)}° a second above 18 mph); above it the sideways push grows by ${f.sideJerk.toFixed(2)} m/s³ at most (${f.sideJerkAt})`);
    ok(`${r.id}: the foot does not hunt between the pedals`, f.pedal <= 2 * run.events + 6 && f.jerk < 4.5, `${f.pedal} changes of pedal for ${run.events} signals, signs and turns; the push never grows faster than ${f.jerk.toFixed(1)} m/s³`);
    ok(`${r.id}: a full stop at every stop sign`, stops.every(([, v]) => v < 0.3), stops.map(([at, v]) => `at ${Math.round(at)} m down to ${v.toFixed(2)} m/s`).join(', ') || 'no stop sign on this route');
    ok(`${r.id}: never over a line on red`, run.redRun.length === 0, run.redRun.join(', '));
    ok(`${r.id}: it keeps to its lane`, run.off < 0.05);
    ok(`${r.id}: a frame stays under the ceiling`, run.calls <= CEIL.calls && run.tris <= CEIL.tris && run.cabinCalls <= CEIL.cabinCalls, `world ${run.calls} calls / ${Math.round(run.tris / 1000)}k triangles at most (${run.worst}); cabin ${run.cabinCalls} calls`);
    if (run.gar && run.gar.gate) {
      const g = run.gar, deg = 180 / Math.PI, up = r.id === 'esa-att';
      ok(`${r.id}: a full stop at the parking structure's gate, and the arm answers`, g.gates === 1 && g.gateMin < 0.05 && g.armStop >= 0 && g.armStop < 0.35 && g.armPass > 0.9 && g.armsUp === 1 && g.armEnd < 0.02,
        `down to ${g.gateMin.toFixed(2)} m/s; the arm ${Math.round(g.armStop * 100)}% up as the car stops, ${Math.round(g.armPass * 100)}% as its bumper passes (${g.armsUp} arm up), ${Math.round(g.armEnd * 100)}% afterwards`);
      ok(`${r.id}: ${up ? 'up to level 3' : 'down from level 3'} on a slope that comes and goes gently`, Math.abs((up ? g.yEnd : g.y0) - 7.6) < 0.03 && Math.abs(up ? g.y0 : g.yEnd) < 0.03 && Math.abs(g.yTop - 7.6) < 0.03 && g.grade * deg < 2.2 && g.gradeRate * deg < 2.5,
        `from ${g.y0.toFixed(2)} m to ${g.yEnd.toFixed(2)} m; ${(g.grade * deg).toFixed(2)}° at the steepest, changing by ${(g.gradeRate * deg).toFixed(2)}° a second at most`);
      ok(`${r.id}: clear of the cars standing in the stalls`, g.inside > 500 && g.clear > 0.3, `${g.clear.toFixed(2)} m at the nearest (${g.clearAt})`);
    }
    if (/^att-anza-/.test(r.id)) {
      const deg = 180 / Math.PI;
      // (no steeper than a ramp is built, 9.8 %; a crest or a dip pushes the car up or down no more than 1.5 m/s² —
      // the heights are rounded for 1 m/s² at the road's speed (data/heights.py); a roller coaster gives 3 and more)
      ok(`${r.id}: over the freeways' bridges and ramps the slope comes and goes gently`, run.yTop > 8 && run.grade * deg < 5.6 && run.push < 1.5,
        `up to ${run.yTop.toFixed(1)} m above the ground; ${(run.grade * deg).toFixed(2)}° (${(Math.tan(run.grade) * 100).toFixed(1)} %) at the steepest; a change of slope pushes ${run.push.toFixed(2)} m/s² at most (${run.pushAt})`);
    }
    ok(`${r.id}: the ground streams without a failure`, run.tiles.failed === 0 && run.tiles.worker && run.tiles.held <= CEIL.held && run.tiles.mb <= CEIL.mb, `${run.tiles.built} squares built (${run.tiles.msAvg} ms each, ${run.tiles.msMax.toFixed(0)} ms at most), ${run.tiles.held} held, ${run.tiles.mb} MB`);
  }

  /* the wheels never climb a kerb: looking straight down under the car's middle and both sides, along the first route */
  for (const id of routes.map(r => r.id)) {
  const kerb = await page.evaluate(async id => {
    const far = /^att-anza-/.test(id), every = far ? 6 : 3, settle = far ? 240 : 120;   // (a route of 13 km looked at every 6 m)
    const W = window.__world, D = W.drive(); W.route(id);
    const T = await import(document.querySelector('script[type=module]') ? 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js' : '');
    const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), bad = [], air = [], st = D.state, R = D.route; let n = 0, decks = 0;
    const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    for (let s = 2; s < R.length - 1; s += every) {
      W.at(s); if (Math.round(s) % settle < every) { for (let w = 0; w < 80 && !W.settled(1); w++) await new Promise(f => setTimeout(f, 50)); W.step(1e-6); }
      const nx = -Math.sin(st.heading), nz = Math.cos(st.heading), fx = Math.cos(st.heading), fz = Math.sin(st.heading);
      for (const along of [0, 2.775]) for (const off of [-0.8, 0, 0.8]) {                          // under the back wheels and the front ones
        const floor = st.y + Math.tan(st.grade) * (along - 1.3875);                                // where the path has these wheels (the car's middle, st.x/z/y, is 1.39 m ahead of its back axle)
        ray.set(new T.Vector3(st.x + fx * (along - 1.3875) + nx * off, floor + 1.5, st.z + fz * (along - 1.3875) + nz * off), down); ray.far = 1.7;      // from the height of the car's roof down
        const hit = ray.intersectObjects(W.scene().children.filter(c => c.name === 'tiles' || c.name.startsWith('site')), true).find(h => shown(h.object) && !h.object.isInstancedMesh && !h.object.isSprite);
        n++; if (hit && hit.point.y - floor > 0.09) bad.push(`${Math.round(s)} m (${along ? 'front' : 'back'} ${off}): ${(hit.point.y - floor).toFixed(2)} m, ${hit.object.name || hit.object.parent.name}`);
        if (floor > 0.3) { decks++; if (!hit || hit.point.y - floor < -0.09) air.push(`${Math.round(s)} m (${along ? 'front' : 'back'} ${off}): ${hit ? (hit.point.y - floor).toFixed(2) + ' m' : 'nothing under it'}`); }   // off the ground: a deck must be there
      }
    }
    return { n, bad, air, decks };
  }, id);
  ok(`${id}: the wheels keep off the kerbs and the islands`, kerb.bad.length === 0, kerb.bad.length ? kerb.bad.slice(0, 6).join(' · ') + (kerb.bad.length > 6 ? ` … ${kerb.bad.length} in all` : '') : `${kerb.n} points looked at`);
  ok(`${id}: ${/^att-anza-/.test(id) ? 'in the parking structure and on the freeways\' bridges' : 'in the parking structure'} the wheels are on its decks`, kerb.decks > 900 && kerb.air.length === 0, kerb.air.length ? kerb.air.slice(0, 6).join(' · ') + (kerb.air.length > 6 ? ` … ${kerb.air.length} in all` : '') : `${kerb.decks} points above the ground, a deck within 9 cm under each`);
  }

  /* home: at the end of a route home the page fades, the car stands parked (none is driven: he asked for that,
     27/11/2026), he stands by it looking at it; a tap on it and he is back at the wheel. Behind the building, at
     Spencer St by Earl St, at Emerald St by the park — the same three for either way home. */
  for (const id of ['att-anza-1a', 'att-anza-1b', 'att-anza-1c']) {
    const a = await page.evaluate(async id => {
      const W = window.__world, T = await import('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js');
      W.route(id); W.go(); document.getElementById('b-skip').click(); await new Promise(f => setTimeout(f, 1300));
      for (let w = 0; w < 80 && !W.settled(1); w++) await new Promise(f => setTimeout(f, 50)); W.step(1 / 60); W.draw();
      const f = W.foot(), c = W.myCar(), R = W.drive().route, P = R.park, other = R.id.replace('-1', '-2');
      const solid = W.scene().children.filter(o => o.name === 'tiles' || o.name.startsWith('site')), shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
      const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), a = P.a, under = [];
      for (const [lx, lz] of [[2.2, 0.8], [2.2, -0.8], [-2.2, 0.8], [-2.2, -0.8], [0, 0]]) {   // under the car's corners and its middle: the street's own surface
        ray.set(new T.Vector3(c.position.x + lx * Math.cos(a) - lz * Math.sin(a), 1.6, c.position.z + lx * Math.sin(a) + lz * Math.cos(a)), down); ray.far = 2.2;
        const hit = ray.intersectObjects(solid, true).find(h => shown(h.object) && !h.object.isInstancedMesh && !h.object.isSprite); under.push(hit ? +hit.point.y.toFixed(3) : null);
      }
      const eye = new T.Vector3(f.x, 1.62, f.z), mid = new T.Vector3(c.position.x, 0.75, c.position.z), d = mid.clone().sub(eye), dist = d.length();
      ray.set(eye, d.normalize()); ray.far = dist + 3;
      const first = ray.intersectObjects([...c.userData.pick, ...solid], true).find(h => shown(h.object) && !h.object.isSprite);
      ray.set(eye, down); ray.far = 2.5; const feet = ray.intersectObjects(solid, true).find(h => shown(h.object) && !h.object.isInstancedMesh && !h.object.isSprite);
      let look = Math.atan2(c.position.z - f.z, c.position.x - f.x) - f.yaw; look = Math.atan2(Math.sin(look), Math.cos(look));
      // where the car's middle is on the screen (the eye looks at it, tilted down by its pitch), then a tap on the sky and one on the car
      const fov = 62 * Math.PI / 180, sx = Math.tan(look) / (Math.tan(fov / 2) * innerWidth / innerHeight), sy = Math.tan(Math.atan2(0.75 - 1.62, Math.hypot(c.position.x - f.x, c.position.z - f.z)) - f.pitch) / Math.tan(fov / 2);
      return { foot: !!f, view: document.documentElement.dataset.view, shown: c.visible, under, dist: +dist.toFixed(2), look: +(look * 180 / Math.PI).toFixed(1), seesCar: !!first && c.userData.pick.includes(first.object), feet: feet ? +feet.point.y.toFixed(3) : null,
        at: [Math.round((1 + sx) / 2 * innerWidth), Math.round((1 - sy) / 2 * innerHeight)], to: R.to, said: document.getElementById('arrive-b').textContent };
    }, id);
    await page.mouse.click(Math.round(page.viewportSize().width / 2), 30); await new Promise(f => setTimeout(f, 1200));
    const sky = await page.evaluate(() => !!window.__world.foot());
    await page.mouse.click(a.at[0], a.at[1]); await new Promise(f => setTimeout(f, 1400));
    const tap = await page.evaluate(() => ({ foot: !!window.__world.foot(), view: document.documentElement.dataset.view, unit: document.getElementById('unit').classList.contains('open'), tab: document.querySelector('[data-tab="go"]').getAttribute('aria-selected'), car: window.__world.myCar().visible }));
    await page.evaluate(() => document.querySelector('.unit-x').click());
    ok(`${id}: arrived, the car stands parked and he stands by it, looking at it`, a.foot && a.view === 'foot' && a.shown && a.dist > 2.5 && a.dist < 7 && Math.abs(a.look) < 2 && a.seesCar,
      `${a.to}: the car ${a.dist} m off, ${a.look}° from straight ahead, ${a.seesCar ? 'nothing between' : 'something in between'}; "${a.said}"`);
    ok(`${id}: the car stands on the street, and he on the ground`, a.under.every(y => y !== null && y < 0.09) && a.feet !== null && a.feet < 0.3,
      `under its corners and middle at ${a.under.map(y => y === null ? '—' : y.toFixed(2)).join(', ')} m; under his feet ${a.feet === null ? 'nothing' : a.feet.toFixed(2) + ' m'}`);
    ok(`${id}: a tap on the sky leaves him standing; a tap on the car and he is at the wheel`, sky && !tap.foot && tap.view === 'cabin' && !tap.car && tap.unit && tap.tab === 'true',
      `${sky ? 'still standing after the sky' : 'NOT standing after the sky'}; after the car: ${tap.view}, the screen ${tap.unit ? 'open on the places to drive to' : 'shut'}`);
  }


  /* the plants (engine/plants.js): near the car a tree is drawn leaf by leaf and a palm has its head of leaves, each
     of them once (its far shape put away meanwhile); the leaf pictures keep their cover in their smaller copies; the
     wind's clock runs with the world's */
  const plants = await page.evaluate(async () => {
    const W = window.__world; await W.route('esa-att'); const out = { spots: [] };   // (a route is loaded when chosen: wait for it)
    for (const s of [330, 900, 1330]) {                                             // Mariposa under its figs; Nash under its palms
      W.at(s); for (let w = 0; w < 120 && (w < 10 || !W.settled(1)); w++) { W.step(1e-6); await new Promise(f => setTimeout(f, 50)); } W.step(0.05); W.step(0.05);   // (the ground streams as the world steps: waited for without a step, nothing came near a spot two squares from the start)
      const near = W.near(), tiles = W.scene().getObjectByName('tiles'), e = W.eye(); let hidden = 0, pooled = 0, far = 0, nearest = 1e9;
      for (const g of tiles.children) {
        if (g.name.startsWith('near trees')) { pooled += g.count; continue; }
        const m = g.children.find(c => c.name === 'trees'); if (!m) continue;
        for (let k = 0; k < m.count; k++) { const a = m.instanceMatrix.array, o = 16 * k; if (a[o] === 0 && a[o + 5] === 0) hidden++; else { far++; nearest = Math.min(nearest, Math.hypot(g.position.x + a[o + 12] - e[0], g.position.z + a[o + 14] - e[2])); } }
      }
      out.spots.push({ s, ...near, hidden, pooled, far, nearest: Math.round(nearest) });
    }
    const t0 = W.plantTime(); for (let k = 0; k < 20; k++) W.step(0.05); out.wind = W.plantTime() - t0; out.cover = W.plantCover();
    // nothing solid inside a crown, near or far: no face of a tree wears the leaves' solid picture (the atlas's sixth cell), and a far tree is leaves too
    const lump = g => { const uv = g.attributes.uv ? g.attributes.uv.array : [1 / 3, 0.75]; let n = 0; for (let i = 0; i < uv.length; i += 2) if (uv[i] > 0.25 && uv[i] < 0.5 && uv[i + 1] > 0.5) n++; return n; };
    out.lumps = 0; out.farLeaves = true; out.farN = 0;
    for (const g of W.scene().getObjectByName('tiles').children) { if (g.name.startsWith('near trees')) out.lumps += lump(g.geometry); const m = g.children.find(c => c.name === 'trees'); if (m) { out.farN++; out.lumps += lump(m.geometry); if (!(m.material.userData.plants && m.material.alphaTest > 0)) out.farLeaves = false; } }
    const leaf = tiles => tiles.children.filter(c => c.name.startsWith('near')).every(c => c.material.userData.plants && c.material.alphaTest > 0 && c.geometry.attributes.sway);
    out.cards = leaf(W.scene().getObjectByName('tiles')); return out;
  });
  ok('near the car the trees are drawn leaf by leaf and the palms have their heads, each once', plants.cards && plants.spots.every(p => p.hidden === p.trees && p.pooled === p.trees && p.nearest >= 100) && plants.spots[0].trees >= 8 && plants.spots[2].palms >= 6,
    plants.spots.map(p => `at ${p.s} m: ${p.trees} trees and ${p.palms} palms leaf by leaf, ${p.far} trees as far shapes (the nearest ${p.nearest} m off)`).join(' · '));
  const cov = Object.entries(plants.cover).map(([k, v]) => [k, v[0], Math.max(...v.map(c => Math.abs(c - v[0])))]);
  ok('the leaf pictures keep their cover from far (their smaller copies pass as much of a spray as the full one)', cov.length === 5 && cov.every(([, c0, off]) => c0 > 0.15 && c0 < 0.8 && off < 0.05), cov.map(([k, c0, off]) => `${k} ${Math.round(c0 * 100)}% (±${(off * 100).toFixed(1)})`).join(', '));
  ok('a tree is leaves all the way in, near and far: no lump inside a crown, no ball for a far tree', plants.lumps === 0 && plants.farLeaves && plants.farN > 0, `${plants.lumps} solid faces in the trees' crowns; ${plants.farN} tiles' far trees ${plants.farLeaves ? 'drawn with leaves' : 'NOT drawn with leaves'}`);
  ok('the wind\'s clock runs with the world\'s', Math.abs(plants.wind - 1) < 0.01, `${plants.wind.toFixed(2)} s in 1 s`);

  /* a hand on the wheel */
  const hand = await page.evaluate(() => {
    const W = window.__world, D = W.drive(), st = D.state; W.route('esa-att'); W.at(140); W.go(); W.setAuto(false);
    const R = D.route, band = () => { let i = 0; while (i < R.n - 2 && R.s[i + 1] <= st.s) i++; return [R.lo[i], R.hi[i]]; }; let out = 0;
    const run = n => { for (let k = 0; k < n; k++) { W.step(0.05); const [lo, hi] = band(); out = Math.max(out, st.lat - hi, lo - st.lat); } };
    W.input.gas = 1; run(60); const v1 = st.v; W.input.gas = 0.25;
    W.input.steer = 1; run(40); const right = st.lat;
    W.input.steer = -1; run(90); const left = st.lat;
    W.input.steer = 0; W.input.gas = 0; W.input.brake = 1; run(120); const v2 = st.v;
    W.input.brake = 0; W.setAuto(true); for (let k = 0; k < 200; k++) W.step(0.05);
    return { v1, right, left, v2, back: st.lat, out, manual: document.documentElement.classList.contains('manual') };
  });
  ok('a hand on the wheel: the pedals answer', hand.v1 > 6 && hand.v2 < 0.2, `up to ${hand.v1.toFixed(1)} m/s, then stopped`);
  ok('a hand on the wheel: left and right, but not off the road', hand.right > 0.15 && hand.left < hand.right - 0.3 && hand.out < 0.4, `right to ${hand.right.toFixed(2)} m, left to ${hand.left.toFixed(2)} m of the lane's line; over the edge by ${Math.max(0, hand.out).toFixed(2)} m at most`);
  ok('the car takes the wheel back', Math.abs(hand.back) < 0.05 && !hand.manual);

  /* the two views, the hours, the screen */
  const ui = await page.evaluate(async () => {
    const W = window.__world, click = id => document.getElementById(id).click();
    click('b-view'); const road = document.documentElement.dataset.view; W.step(0.016); const c1 = W.cost(); click('b-view');
    click('h-toi'); W.step(0.016); W.renderOnce(); const night = document.getElementById('h-toi').getAttribute('aria-pressed'); click('h-sang');
    click('b-music'); await new Promise(f => setTimeout(f, 600));
    const u = W.unit.state, open = document.getElementById('unit').classList.contains('open'), rows = document.querySelectorAll('.unit-tracks li').length;
    document.querySelector('.unit-tracks button').click(); await new Promise(f => setTimeout(f, 100));
    const said = document.querySelector('.unit-say').textContent, title = document.querySelector('.unit-title').textContent;
    document.querySelector('[data-tab="go"]').click(); const places = document.querySelectorAll('.unit-routes li').length; document.querySelector('.unit-x').click();
    return { road, cabinOff: c1.cabin.calls, night, open, rows, online: u.online, list: u.list && u.list.title, said, title, places, shut: !document.getElementById('unit').classList.contains('open') };
  });
  ok('the view from the road: no cabin drawn', ui.road === 'road' && ui.cabinOff === 0);
  ok('the hours switch', ui.night === 'true');
  ok('the screen opens on his list', ui.open && ui.rows > 100 && /driving/i.test(ui.list || ''), `${ui.list}: ${ui.rows} songs${ui.online ? '' : ' (from the copy in the page: the hub is out of reach here)'}`);
  ok('a song chosen shows on the screen', ui.title.length > 0 && (ui.online || /không phát được tiếng/.test(ui.said)), ui.title);
  ok('the places to drive to', ui.places === 8 && ui.shut, `${ui.places} on the screen`);
  ok('no errors on the page', logs.length === 0, logs.slice(0, 3).join(' | '));
  await page.context().close();
}

/* ── a telephone, upright and on its side ── */
for (const [name, vp] of [['upright', { width: 390, height: 743 }], ['on its side', { width: 844, height: 390 }]]) {
  const { page, logs } = await open(vp, true);
  const r = await page.evaluate(async () => {
    const W = window.__world; W.go(); for (let k = 0; k < 200; k++) W.step(0.05);
    for (let w = 0; w < 60 && !W.settled(1); w++) await new Promise(f => setTimeout(f, 50));
    W.step(1e-6); const c = W.cost(), box = id => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
    const cab = W.cabin(), v = new (cab.camera.position.constructor)(), seen = name => { const o = cab.scene.getObjectByName(name); o.getWorldPosition(v); v.project(cab.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; };
    return { c, s: W.car().s, bar: box('bar'), road: box('road'), top: box('top'), screen: seen('screen'), w: innerWidth, h: innerHeight, fov: cab.camera.fov };
  });
  const inside = r.screen[0] > 4 && r.screen[0] < r.w - 4 && r.screen[1] > 4 && r.screen[1] < r.h - 4 && r.screen[2] < 1;
  const under = (b, p) => p[0] > b[0] && p[0] < b[2] && p[1] > b[1] && p[1] < b[3];
  ok(`telephone ${name}: it drives`, r.s > 20, `${Math.round(r.s)} m in 10 s; ${r.c.world.calls} + ${r.c.cabin.calls} calls`);
  ok(`telephone ${name}: the car's screen is in the picture, clear of the buttons`, inside && !under(r.bar, r.screen) && !under(r.road, r.screen) && !under(r.top, r.screen), `at ${Math.round(r.screen[0])}, ${Math.round(r.screen[1])} of ${r.w} × ${r.h}`);
  ok(`telephone ${name}: no errors`, logs.length === 0, logs.slice(0, 3).join(' | '));
  await page.context().close();
}

/* ── the streets themselves: what the tiles hold, read here as the page's worker reads it ── */
{
  const fs = await import('fs'), dir = new URL('./world/', import.meta.url);
  const index = JSON.parse(fs.readFileSync(new URL('index.json', dir))), A = index.streets || {};
  const routes = JSON.parse(fs.readFileSync(new URL('routes.json', dir))).map(r => JSON.parse(fs.readFileSync(new URL(`routes/${r.id}.json`, dir))));
  ok('the streets keep their own rules: no limit line inside a crosswalk, no crosswalk where nobody stops, every signal with crosswalks, STOP on the road at every stop sign, no corner that crosses itself',
    A['limit lines inside a crosswalk'] === 0 && A['crosswalks at a crossing nobody stops at'] === 0 && A['signals without a crosswalk'] === 0 && A['STOP on the road'] >= A.stops && A.stops > 100 && A['corners whose outline crosses itself'] === 0,
    `${A.crossings} crossings (${A.signals} with signals), ${A['crosswalks the map has']} crosswalks from the map and ${A['crosswalks by the rule']} by the rule, ${A['limit lines']} limit lines, ${A.corners} round corners, ${Math.round(A['kerb m'] / 1000)} km of kerb`);
  const { makeBuilder } = await import('../../engine/world/tilework.js'), build = makeBuilder();
  // (where a walk's width is known: Continental's flag of 5 ft in his photographs of 2015, Sepulveda's 3 m and Mariposa's 6 ft in Street View, Nash's west walk under the Green Line in IMG_1787)
  const WALKS = [{ name: 'Continental', at: [331, 89], r: 40, want: 1.5 }, { name: 'Sepulveda by the shops', at: [-100, 20], r: 40, want: 3.0 }, { name: 'Mariposa by the hotel', at: [40, -79], r: 40, want: 1.8 },
    { name: "Nash's west walk under the Green Line", at: [700, 200], r: 60, want: 2.5, side: x => x < 700 }, { name: "Nash's east walk there", at: [700, 200], r: 60, want: 1.8, side: x => x > 700 }].map(q => ({ ...q, w: [] }));
  const mulch = [], figs = [], aslant = { n: 0, across: 0 }, decks = [], growing = [], walls = [];
  let faces = 0, wrong = 0; const ends = new Map(), corners = [], parked = new Map(), key = (x, z) => Math.round(x * 20) + ':' + Math.round(z * 20);
  for (const f of fs.readdirSync(new URL('tiles/', dir))) {
    const [ti, tj] = f.replace('.json', '').split('_').map(Number), t = JSON.parse(fs.readFileSync(new URL('tiles/' + f, dir))), o = build.build(t).tile;
    // every face of the streets turns the way its normal says (one that does not is not drawn: a hole). The lots' own ways (y −0.035) are not the streets'.
    for (const g of [o.road, o.marks, o.conc, o.plain]) for (let i = 0; g && i < g.n; i += 3) {
      const P = k => [g.pos[3 * (i + k)], g.pos[3 * (i + k) + 1], g.pos[3 * (i + k) + 2]], a = P(0), b = P(1), c = P(2), u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n); if (l < 1e-4 || Math.abs(a[1] + 0.035) < 1e-3) continue;
      faces++; if ((n[0] * g.nor[3 * i] + n[1] * g.nor[3 * i + 1] + n[2] * g.nor[3 * i + 2]) / l / 127 < 0.3) wrong++;
    }
    // where each walk's kerb ends; where each round corner's kerb begins and ends
    for (const k of t.k || []) if (k[0] === 3 || k[0] === 5) { let x = 0, z = 0; const n = (k.length - 1) >> 2; for (let i = 0; i < n; i++) { x += k[1 + 4 * i]; z += k[2 + 4 * i]; if (i === 0 || i === n - 1) ends.set(key(x / 100 + ti * 500, z / 100 + tj * 500), 1); } }
    // the walks: how wide each is where a place is known; the mulch median's middle line and the figs in it; how a walk is scored
    for (const k of t.k || []) if (k[0] === 3 || k[0] === 8) { let x = 0, z = 0, last = null; const n = (k.length - 1) >> 2; for (let i = 0; i < n; i++) { x += k[1 + 4 * i]; z += k[2 + 4 * i]; const X = x / 100 + ti * 500, Z = z / 100 + tj * 500, w = Math.hypot(k[3 + 4 * i], k[4 + 4 * i]) / 100;
      if (k[0] === 8) { const m = [X + k[3 + 4 * i] / 100, Z + k[4 + 4 * i] / 100]; if (i) mulch.push([...last, ...m]); last = m; } else if (w >= 1.2) for (const q of WALKS) if (Math.hypot(X - q.at[0], Z - q.at[1]) < q.r && (!q.side || q.side(X, Z))) q.w.push(w); } }
    for (const q of t.p || []) if (q[0] === 0 && (q[3] | 0) === 0) figs.push([q[1] / 10 + ti * 500, q[2] / 10 + tj * 500]);
    for (let i = 0; i < o.conc.n; i += 3) {
      const g = o.conc, V = k => [g.pos[3 * (i + k)] + ti * 500, g.pos[3 * (i + k) + 1], g.pos[3 * (i + k) + 2] + tj * 500, g.uv[2 * (i + k)]], T = [V(0), V(1), V(2)];
      if (Math.abs(T[0][1] - 0.12) > 1e-3 || !T.some(v => Math.hypot(v[0] - 331, v[2] - 89) < 60)) continue;
      aslant.n++; if ([[0, 1], [1, 2], [0, 2]].some(([a, b]) => Math.abs(T[a][3] - T[b][3]) < 1e-4 && Math.hypot(T[a][0] - T[b][0], T[a][2] - T[b][2]) > 1.2)) aslant.across++;
    }
    for (const c of t.c || []) { let x = 0, z = 0; for (let i = 0; i < c[0]; i++) { x += c[1 + 2 * i]; z += c[2 + 2 * i]; if (i === 0 || i === c[0] - 1) corners.push([x / 100 + ti * 500, z / 100 + tj * 500]); } }
    for (const p of t.p || []) if (p[0] === 5) { const x = p[1] / 10 + ti * 500, z = p[2] / 10 + tj * 500, k = Math.floor(x / 20) + ':' + Math.floor(z / 20); (parked.get(k) || parked.set(k, []).get(k)).push([x, z]); }
    // the freeways' decks (their lines, how wide either side, how high) and what grows or stands by them: trees, palms, lights
    for (const f of t.f || []) { const n = (f.length - 6) >> 2; for (let i = 0; i + 1 < n; i++) decks.push([f[6 + 4 * i] / 10 + ti * 500, f[7 + 4 * i] / 10 + tj * 500, f[10 + 4 * i] / 10 + ti * 500, f[11 + 4 * i] / 10 + tj * 500, Math.max(f[2], f[3]) / 10, Math.max(f[8 + 4 * i], f[12 + 4 * i]) / 100]); }
    for (const p of t.p || []) if (p[0] <= 2) growing.push([p[1] / 10 + ti * 500, p[2] / 10 + tj * 500, p[0]]);
    // the decks' parapets, where tilework.js stands them: a side's bit set at both ends of a piece, the deck up 0.25 m
    for (const f of t.f || []) {
      const n = (f.length - 6) >> 2, X = i => f[6 + 4 * i] / 10 + ti * 500, Z = i => f[7 + 4 * i] / 10 + tj * 500, H = i => f[8 + 4 * i] / 100, F = i => f[9 + 4 * i];
      const R = i => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), l = Math.hypot(X(b) - X(a), Z(b) - Z(a)) || 1; return [-(Z(b) - Z(a)) / l, (X(b) - X(a)) / l]; };
      for (let i = 0; i + 1 < n; i++) for (const [bit, o] of [[1, -f[2] / 10], [2, f[3] / 10]]) {
        if (!((F(i) & bit) && (F(i + 1) & bit)) || !(H(i) > 0.25 || H(i + 1) > 0.25)) continue;
        const [ra, rb] = R(i), [sa, sb] = R(i + 1); walls.push([X(i) + ra * o, Z(i) + rb * o, X(i + 1) + sa * o, Z(i + 1) + sb * o, H(i), H(i + 1)]);
      }
    }
  }
  ok('between crossings a street\'s centre line runs on from one way to the next: led across where the next has a lane more on one side, never stepping', A['centre lines that step between two ways'] === 0 && A['ways joined between crossings'] > 100 && A["centre lines led across to the next way's"] > 40,
    `${A['ways joined between crossings']} joints between crossings, the lines led across at ${A["centre lines led across to the next way's"]} ends, ${A['centre lines that step between two ways']} steps left`);
  ok('no face of the streets is inside out', faces > 100000 && wrong === 0, `${faces} faces, ${wrong} wrong`);
  const near = ([x, z]) => { for (const dx of [-0.05, 0, 0.05]) for (const dz of [-0.05, 0, 0.05]) if (ends.has(key(x + dx, z + dz))) return true; return false; }, met = corners.filter(near).length;
  { const med = q => q.w.slice().sort((a, b) => a - b)[q.w.length >> 1], seg = (x, z, [a, b, c, d]) => { const l = (c - a) ** 2 + (d - b) ** 2 || 1, u = Math.max(0, Math.min(1, ((x - a) * (c - a) + (z - b) * (d - b)) / l)); return Math.hypot(x - a - (c - a) * u, z - b - (d - b) * u); }, inMedian = figs.filter(([x, z]) => mulch.some(s => seg(x, z, s) < 1.0)).length;
    ok('a walk is as wide as its street has it: 6 ft at the kerb by the city\'s rule, the big roads\' wider, and what the photographs show where they show it',
      WALKS.every(q => q.w.length >= 2 && Math.abs(med(q) - q.want) < 0.12), WALKS.map(q => `${q.name} ${q.w.length ? med(q).toFixed(2) : '—'} m (${q.want}; ${q.w.length} points)`).join(' · '));
    ok('a walk is scored across its own line, also on a street that runs aslant on the map', aslant.n >= 12 && aslant.across >= 0.95 * aslant.n, `${aslant.across} of ${aslant.n} faces of Continental's walks have a joint running straight across`);
    ok('Continental\'s figs stand in its median, in a bed of mulch (his photographs of 2015)', mulch.length > 20 && inMedian >= 15, `${inMedian} figs down the median's ${mulch.length} points`); }
  ok('the kerbs close up: a round corner begins where a walk\'s kerb ends', corners.length > 800 && met >= 0.97 * corners.length, `${met} of ${corners.length} corner ends meet a kerb's end (the others: a side with no kerb of its own)`);
  // no parked car stands in the car's way: none with its middle within 2.2 m of the path's (a car and a half's width)
  // where the path is on the ground (on a bridge it passes over the streets' parked cars, not by them)
  let nearest = 99, where = '';
  for (const r of routes) for (let i = 0; i < r.pts.length; i += 4) {
    if (r.y && r.y[i >> 1] > 1000) continue;
    const x = r.pts[i] / 1000, z = r.pts[i + 1] / 1000;
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) for (const [px, pz] of parked.get((Math.floor(x / 20) + gx) + ':' + (Math.floor(z / 20) + gz)) || []) { const d = Math.hypot(px - x, pz - z); if (d < nearest) { nearest = d; where = `${r.id} at ${Math.round(i / 4)} m`; } }
  }
  ok('no parked car stands in the car\'s way', nearest >= 2.2, `the nearest one's middle is ${nearest.toFixed(2)} m from the path's (${where}); ${index.counts ? index.counts['cars at the kerb'] : '?'} cars parked along kerbs`);
  // the line the car follows keeps to the streets' pavement (the baker measures it: each street's half width from its
  // middle line, by the map, of the streets it goes along and those joining them at their ends): 1 m outside at most
  ok('the car\'s line keeps to the pavement of the streets it goes along', routes.every(r => r.outside && r.outside[0] <= 1.0),
    routes.map(r => `${r.id} ${r.outside ? `${r.outside[0].toFixed(2)} m (at ${Math.round(r.outside[1])} m)` : '—'}`).join(' · '));
  const homeEnds = ['a', 'b', 'c'].map(e => [e, routes.find(r => r.id === `att-anza-1${e}`), routes.find(r => r.id === `att-anza-2${e}`)]);
  ok('either way home ends at the same three places to park', homeEnds.every(([, a, b]) => a && b && a.park && JSON.stringify(a.park) === JSON.stringify(b.park)),
    homeEnds.map(([e, a, b]) => `${e}: ${a && a.park ? `${a.park.x.toFixed(1)}, ${a.park.z.toFixed(1)}` : '—'} by Inglewood, ${b && b.park ? `${b.park.x.toFixed(1)}, ${b.park.z.toFixed(1)}` : '—'} by Hawthorne`).join(' · '));
  // where his car is put at home no car of the street's stands: none within a car's length and a metre, front or back, in its lane of parking
  let crowd = 99, crowdAt = '';
  for (const r of routes) if (r.park) { const P = r.park, ca = Math.cos(P.a), sa = Math.sin(P.a);
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) for (const [px, pz] of parked.get((Math.floor(P.x / 20) + gx) + ':' + (Math.floor(P.z / 20) + gz)) || []) {
      const al = (px - P.x) * ca + (pz - P.z) * sa, ac = (pz - P.z) * ca - (px - P.x) * sa; if (Math.abs(ac) < 2.4 && Math.abs(al) < crowd) { crowd = Math.abs(al); crowdAt = r.id; } } }
  ok('where his car is put at home the kerb is free for it', crowd >= 5.8, crowd < 99 ? `the nearest car in its lane of parking ${crowd.toFixed(2)} m from its middle (${crowdAt})` : 'no other car in its lane of parking nearby');
  // nothing grows through a deck: no tree, palm or light within 2 m of a deck's edge (where it is up more than half a metre; the baker keeps 2.5 m)
  const seg = (x, z, a, b, c, d) => { const l = (c - a) ** 2 + (d - b) ** 2 || 1, u = Math.max(0, Math.min(1, ((x - a) * (c - a) + (z - b) * (d - b)) / l)); return Math.hypot(x - a - (c - a) * u, z - b - (d - b) * u); };
  const dgrid = new Map(); for (const q of decks) if (q[5] > 0.5) for (let gx = Math.floor((Math.min(q[0], q[2]) - 30) / 50); gx <= Math.floor((Math.max(q[0], q[2]) + 30) / 50); gx++) for (let gz = Math.floor((Math.min(q[1], q[3]) - 30) / 50); gz <= Math.floor((Math.max(q[1], q[3]) + 30) / 50); gz++) (dgrid.get(gx + ':' + gz) || dgrid.set(gx + ':' + gz, []).get(gx + ':' + gz)).push(q);
  const through = growing.filter(([x, z]) => (dgrid.get(Math.floor(x / 50) + ':' + Math.floor(z / 50)) || []).some(q => seg(x, z, q[0], q[1], q[2], q[3]) < q[4] + 2.0));
  ok('nothing grows through the freeways\' decks: no tree, palm or light within 2 m of a raised deck', decks.length > 1000 && through.length === 0,
    `${decks.length} pieces of deck, ${growing.length} trees, palms and lights${through.length ? '; ' + through.slice(0, 4).map(([x, z, k]) => `${['tree', 'palm', 'light'][k]} at ${x.toFixed(0)}, ${z.toFixed(0)}`).join(', ') : ''}`);
  // the car never goes through a parapet: its path crosses none standing at its own height (within 1.2 m)
  { const wgrid = new Map(); for (const w of walls) for (let gx = Math.floor(Math.min(w[0], w[2]) / 25); gx <= Math.floor(Math.max(w[0], w[2]) / 25); gx++) for (let gz = Math.floor(Math.min(w[1], w[3]) / 25); gz <= Math.floor(Math.max(w[1], w[3]) / 25); gz++) (wgrid.get(gx + ':' + gz) || wgrid.set(gx + ':' + gz, []).get(gx + ':' + gz)).push(w);
    const crosses = [];
    for (const r of routes) {
      const Y = i => r.y ? r.y[i] / 1000 : 0;
      for (let i = 0; i + 2 < r.pts.length; i += 2) {
        const ax = r.pts[i] / 1000, az = r.pts[i + 1] / 1000, bx = r.pts[i + 2] / 1000, bz = r.pts[i + 3] / 1000;
        for (const w of wgrid.get(Math.floor(ax / 25) + ':' + Math.floor(az / 25)) || []) {
          const dx = bx - ax, dz = bz - az, ex = w[2] - w[0], ez = w[3] - w[1], den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
          const t = ((w[0] - ax) * ez - (w[1] - az) * ex) / den, u = ((w[0] - ax) * dz - (w[1] - az) * dx) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const y = Y(i >> 1) + (Y((i >> 1) + 1) - Y(i >> 1)) * t, h = w[4] + (w[5] - w[4]) * u;
          if (Math.abs(y - h) < 1.2) crosses.push(`${r.id} ${(ax).toFixed(0)}, ${(az).toFixed(0)}`);
        }
      }
    }
    ok('the car goes through no parapet: its path crosses none standing where it drives', walls.length > 1000 && crosses.length === 0, `${walls.length} pieces of parapet; ${crosses.length ? crosses.length + ' crossed: ' + [...new Set(crosses)].slice(0, 6).join(' · ') : 'none crossed'}`); }
  // the hotel's way in: its white line is where places/esa-el-segundo-2015 paints it; the car leaves on its east, comes in on its west
  const { LOT } = await import('../esa-el-segundo-2015/plan.js'), half = 0.92, inDrive = r => { const xs = []; for (let i = 0; i < r.pts.length; i += 2) { const x = r.pts[i] / 1000, z = r.pts[i + 1] / 1000; if (z > -67.5 && z < -59 && x > LOT.drive[0] - 3 && x < LOT.drive[1] + 3) xs.push(x); } return xs; };
  const out = inDrive(routes.find(r => r.id === 'esa-att')), back = inDrive(routes.find(r => r.id === 'att-esa'));
  ok('at the hotel\'s way in the car keeps to the right of the line: out by the east lane, in by the west', out.length > 5 && back.length > 5 && Math.min(...out) - half > LOT.driveLine && Math.max(...out) + half < LOT.drive[1] && Math.max(...back) + half < LOT.driveLine && Math.min(...back) - half > LOT.drive[0],
    `line at x ${LOT.driveLine}; out at x ${Math.min(...out).toFixed(1)}…${Math.max(...out).toFixed(1)}, in at x ${Math.min(...back).toFixed(1)}…${Math.max(...back).toFixed(1)}`);
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(bad ? `${bad} of ${results.length} checks FAILED` : `all ${results.length} checks passed`);
process.exit(bad ? 1 : 0);
