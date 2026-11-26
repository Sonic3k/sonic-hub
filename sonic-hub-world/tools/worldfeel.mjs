// How the car drives a route, in figures (a picture cannot show a twitch). Run from the module's folder after a build:
//   PLACE=south-bay node tools/worldfeel.mjs [route] [from,to …]
// The wheel's changes of direction (2° and more: the steering reversal rate), what the wheel, the nose and the body do
// on the straight streets (the route's own `straight`, or the stretches given, in metres along), the foot's changes of pedal.
import { launch, open } from './lib.mjs';
const [route = '', ...wins] = process.argv.slice(2);
const browser = await launch();
const { page, logs } = await open(browser, { width: 844, height: 390, place: process.env.PLACE || 'south-bay' });
const r = await page.evaluate(([route, wins]) => {
  const W = window.__world, D = W.drive(), st = D.state; if (route) W.route(route); W.setAuto(true); W.go();
  const R = D.route, deg = 180 / Math.PI, dt = 1 / 60, windows = wins.length ? wins : (R.straight || []);
  const on = s => windows.some(([a, b]) => s >= a && s <= b);
  const o = { id: R.id, moving: 0, swings: 0, tiny: 0, wheelOn: 0, yawOn: 0, rollOn: 0, rollMax: 0, pedal: 0, yawFlipsOn: 0, secsOn: 0, vMinOn: 99, vMaxOn: 0, straightM: windows.reduce((a, [p, q]) => a + q - p, 0) };
  let wLast = 0, wDir = 0, pW = 0, pDir = 0, pH = st.heading, pYawDir = 0, aSide = 0, guard = 0;
  while (st.phase !== 'arrived' && guard++ < 200000) {
    W.step(dt); const w = st.wheel * deg, v = st.v;
    if (v > 0.5) o.moving += dt;
    if (wDir === 0) { if (Math.abs(w) > 2) { wDir = Math.sign(w); wLast = w; } }
    else if (wDir > 0) { if (w > wLast) wLast = w; else if (wLast - w > 2) { o.swings++; wDir = -1; wLast = w; } }
    else { if (w < wLast) wLast = w; else if (w - wLast > 2) { o.swings++; wDir = 1; wLast = w; } }
    const d = w - pW; if (Math.abs(d) > 1e-6) { const s = Math.sign(d); if (pDir && s !== pDir && v > 0.5) o.tiny++; pDir = s; } pW = w;
    const yaw = (st.heading - pH) / dt * deg; pH = st.heading;
    if (on(st.s)) {
      o.secsOn += dt; o.wheelOn = Math.max(o.wheelOn, Math.abs(w)); o.yawOn = Math.max(o.yawOn, Math.abs(yaw)); o.rollOn = Math.max(o.rollOn, Math.abs(st.roll) * deg);
      o.vMinOn = Math.min(o.vMinOn, v); o.vMaxOn = Math.max(o.vMaxOn, v);
      if (Math.abs(yaw) > 0.02) { const s = Math.sign(yaw); if (pYawDir && s !== pYawDir) o.yawFlipsOn++; pYawDir = s; }
    }
    o.rollMax = Math.max(o.rollMax, Math.abs(st.roll) * deg);
    const side = st.acc > 0.3 ? 1 : st.acc < -0.3 ? -1 : 0; if (side && side !== aSide) { if (aSide) o.pedal++; aSide = side; }
  }
  o.length = R.length; o.events = R.ctl.length + R.turns.length; return o;
}, [route, wins.map(w => w.split(',').map(Number))]);
console.log(`${r.id}: ${Math.round(r.length)} m, ${Math.round(r.moving)} s moving`);
console.log(`  the wheel changes direction (2° and more) ${r.swings} times: ${(r.swings / (r.moving / 60)).toFixed(1)} a minute · any change of direction at all: ${(r.tiny / r.moving).toFixed(2)} a second`);
console.log(`  on ${Math.round(r.straightM)} m of straight street (${Math.round(r.secsOn)} s): the wheel up to ${r.wheelOn.toFixed(1)}° off the middle, the nose turning up to ${r.yawOn.toFixed(2)}°/s and changing side ${(r.yawFlipsOn / Math.max(1, r.secsOn)).toFixed(2)} times a second, the body leaning up to ${r.rollOn.toFixed(2)}°, speed ${r.vMinOn.toFixed(1)}…${r.vMaxOn.toFixed(1)} m/s`);
console.log(`  the body leans ${r.rollMax.toFixed(2)}° at most in the whole drive · the foot changes pedal ${r.pedal} times for ${r.events} signals, signs and turns`);
if (logs.length) console.log('logs', logs.slice(0, 3).join(' | '));
await browser.close();
