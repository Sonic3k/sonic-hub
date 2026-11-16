// Plays the guided tour in headless Chrome and photographs it every few seconds.
// usage: node tools/tourshots.mjs <name> [every=3] [w=640] [h=360] [mode] [year] [from=0] [to=999]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const [name = 'tour', every = '3', W = '640', H = '360', mode = '', year = '', from = '0', to = '999'] = process.argv.slice(2);
const three = fs.readFileSync('node_modules/three/build/three.module.min.js');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: +W < 700, isMobile: +W < 700 })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message));
await page.route('**/*', route => { const u = route.request().url(); if (u.startsWith('file://')) return route.continue(); if (u.endsWith('/three.module.min.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: three }); return route.abort(); });
await page.goto('file://' + path.resolve('dist/index.html'));
await page.waitForFunction(() => window.__house && window.__house.ready, null, { timeout: 120000 });
await page.evaluate(() => { window.__house.pause(true); window.__house.hideIntro(); });
if (mode) await page.evaluate(m => window.__house.setMode(m), mode);
if (year) await page.evaluate(y => window.__house.setYear(+y), year);
await page.evaluate(() => window.__house.tour());
let t = 0, next = +from, i = 0; const files = [];
while (await page.evaluate(() => window.__house.touring()) && t <= +to) {
  if (t >= next - 1e-6) {
    await page.evaluate(() => window.__house.renderOnce()); await page.waitForTimeout(80);
    const f = `shots/${name}_${String(i++).padStart(2, '0')}.png`; await page.screenshot({ path: f, timeout: 90000 }); files.push(f);
    const pose = await page.evaluate(() => window.__house.pose()); console.log(f, 't=' + t.toFixed(1), JSON.stringify(pose));
    next += +every;
  }
  // advance to the next moment to photograph in 50 ms steps, as the page itself would
  const n = Math.max(1, Math.round(Math.min(+every, next - t) / 0.05));
  await page.evaluate(n => { for (let j = 0; j < n && window.__house.touring(); j++) window.__house.step(0.05); }, n);
  t += n * 0.05;
}
if (logs.length) console.log(logs.join('\n'));
await browser.close();
