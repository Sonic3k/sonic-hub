// Walks the tour path in the page (no rendering) and reports where the camera would pass through something solid.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const three = fs.readFileSync('node_modules/three/build/three.module.min.js');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 320, height: 200 } })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message));
await page.route('**/*', route => { const u = route.request().url(); if (u.startsWith('file://')) return route.continue(); if (u.endsWith('/three.module.min.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: three }); return route.abort(); });
await page.goto('file://' + path.resolve('dist/index.html'));
await page.waitForFunction(() => window.__house && window.__house.ready, null, { timeout: 120000 });
const out = await page.evaluate(() => {
  const H = window.__house; H.pause(true); H.hideIntro(); H.tour();
  const solids = H.solids(), hits = [], track = [];
  let t = 0, guard = 0;
  while (H.touring() && guard++ < 20000) {
    H.step(0.05); t += 0.05;
    const [x, y, z, h, p] = H.pose();
    track.push([+t.toFixed(2), x, y, z, h, p]);
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i]; if (y < s.y0 - 0.02 || y > s.y1 + 0.02) continue;
      const cx = Math.min(s.x1, Math.max(s.x0, x)), cz = Math.min(s.z1, Math.max(s.z0, z)), d = Math.hypot(x - cx, z - cz);
      if (d < 0.1) hits.push(["eye", +t.toFixed(2), x, y, z, i, +d.toFixed(2), [s.x0, s.y0, s.z0, s.x1, s.y1, s.z1].map(v => +v.toFixed(2)).join(',')]);
    }
    // the same place as a walker would meet it: anything between shin and shoulder, body 19 cm
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i]; if (!(s.y0 < 1.45 && s.y1 > 0.3) || (y >= s.y0 - 0.02 && y <= s.y1 + 0.02)) continue;
      const cx = Math.min(s.x1, Math.max(s.x0, x)), cz = Math.min(s.z1, Math.max(s.z0, z)), d = Math.hypot(x - cx, z - cz);
      if (d < 0.12) hits.push(["body", +t.toFixed(2), x, y, z, i, +d.toFixed(2), [s.x0, s.y0, s.z0, s.x1, s.y1, s.z1].map(v => +v.toFixed(2)).join(',')]);
    }
  }
  return { total: +t.toFixed(1), hits, n: solids.length, track };
});
const eye = out.hits.filter(h => h[0] === 'eye').length;
console.log('tour seconds', out.total, '· solids', out.n, '· samples with the eye inside or within 10 cm of something:', eye, '· samples where a walker\'s body would not fit (the tour sits at the desk and passes close to a chair):', out.hits.length - eye);
let lastKey = '';
for (const h of out.hits) { const key = h[0] + h[5]; if (key !== lastKey) console.log(`${h[0]} t=${h[1]} at (${h[2]},${h[3]},${h[4]}) d=${h[6]} solid#${h[5]} [${h[7]}]`); lastKey = key; }
fs.writeFileSync('shots/tour_track.json', JSON.stringify(out.track));
if (logs.length) console.log(logs.join('\n'));
await browser.close();
if (eye) process.exit(1);
