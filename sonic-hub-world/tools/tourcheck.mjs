// Walks a place's tour (no drawing) and reports where the camera would pass through something solid.
// Fails when the eye itself goes into or within 10 cm of a solid; a body that would not fit is only listed
// (a tour may sit down at a desk, or lean past a chair).
import { launch, open, PLACE } from './lib.mjs';

const browser = await launch();
const { page, logs } = await open(browser, { width: 320, height: 200 });
const out = await page.evaluate(() => {
  const H = window.__world; H.hideIntro();
  if (!H.tourKeys.length) return null;
  H.tour();
  const solids = H.solids(), hits = [];
  const box = s => [s.x0, s.y0, s.z0, s.x1, s.y1, s.z1].map(v => +v.toFixed(2)).join(',');
  let t = 0, guard = 0;
  while (H.touring() && guard++ < 40000) {
    H.step(0.05); t += 0.05;
    const [x, y, z] = H.pose();
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i], cx = Math.min(s.x1, Math.max(s.x0, x)), cz = Math.min(s.z1, Math.max(s.z0, z)), d = Math.hypot(x - cx, z - cz);
      const eye = y >= s.y0 - 0.02 && y <= s.y1 + 0.02;
      if (eye && d < 0.1) hits.push(['eye', +t.toFixed(2), x, y, z, i, +d.toFixed(2), box(s)]);
      // the same place as a walker would meet it: anything between shin and shoulder (above the floor he stands on), body 19 cm
      else if (!eye && s.y0 < y - 1.52 + 1.45 && s.y1 > y - 1.52 + 0.3 && d < 0.12) hits.push(['body', +t.toFixed(2), x, y, z, i, +d.toFixed(2), box(s)]);
    }
  }
  return { total: +t.toFixed(1), hits, n: solids.length };
});
if (!out) { console.log(PLACE, '· no tour'); await browser.close(); process.exit(0); }
const eye = out.hits.filter(h => h[0] === 'eye').length;
console.log(PLACE, '· tour', out.total, 's · solids', out.n, '· eye inside or within 10 cm of something:', eye, '· places a body would not fit:', out.hits.length - eye);
let last = '';
for (const h of out.hits) { const key = h[0] + h[5]; if (key !== last) console.log(`  ${h[0]} t=${h[1]} at (${h[2]},${h[3]},${h[4]}) d=${h[6]} solid#${h[5]} [${h[7]}]`); last = key; }
if (logs.length) console.log(logs.join('\n'));
await browser.close();
if (eye || logs.length) process.exit(1);
