// Screenshot harness: opens dist/index.html in headless Chrome (software GL), serves three from node_modules
// in place of the CDN, and captures given camera poses.
// usage: node tools/shot.mjs <name> [w=1280] [h=720] ['x,y,z,yaw,pitch;...' | preset names] [mode] [year]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');

const [name = 'shot', W = '1280', H = '720', poses = '', mode = '', year = '', uiState = ''] = process.argv.slice(2);
const html = path.resolve('dist/index.html');
const three = fs.readFileSync('node_modules/three/build/three.module.min.js');

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'],
});
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: +W < 700, isMobile: +W < 700 });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
await page.route('**/*', route => {
  const u = route.request().url();
  if (u.startsWith('file://')) return route.continue();
  if (u.endsWith('/three.module.min.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: three });
  return route.abort();
});
await page.goto('file://' + html);
const ok = await page.waitForFunction(() => window.__house && window.__house.ready, null, { timeout: 120000 }).then(() => true).catch(() => false);
if (!ok) { console.log('NOT READY'); console.log(logs.join('\n')); await page.screenshot({ path: `shots/${name}_fail.png` }); await browser.close(); process.exit(1); }
await page.evaluate(() => window.__house.pause(true));
if (mode) await page.evaluate(m => window.__house.setMode(m), mode);
if (year) await page.evaluate(y => window.__house.setYear(+y), year);
// 7th argument: intro | rooms | notes | card:<id> — the state of the slips over the scene
if (uiState !== 'intro') await page.evaluate(() => window.__house.hideIntro && window.__house.hideIntro());
if (uiState === 'rooms') await page.evaluate(() => document.getElementById('b-rooms').click());
if (uiState === 'notes') await page.evaluate(() => document.getElementById('go-notes').click());
if (uiState.startsWith('card:')) await page.evaluate(id => window.__house.card(id), uiState.slice(5));
const list = poses ? poses.split(';').filter(Boolean) : ['default'];
let i = 0;
for (const p of list) {
  if (p !== 'default') {
    const v = p.split(',').map(Number);
    if (v.some(Number.isNaN)) await page.evaluate(n => window.__house.goto(n, true), p);
    else await page.evaluate(v => window.__house.setPose(...v), v);
  }
  await page.evaluate(() => window.__house.renderOnce());
  await page.waitForTimeout(120);
  await page.evaluate(() => window.__house.renderOnce());
  await page.waitForTimeout(60);
  const out = `shots/${name}_${String(i++).padStart(2, '0')}.png`;
  await page.screenshot({ path: out, timeout: 90000 });
  console.log(out);
}
const info = await page.evaluate(() => window.__house.info ? window.__house.info() : null);
console.log('info', JSON.stringify(info));
const errs = logs.filter(l => /error|warn/i.test(l));
if (errs.length) console.log(errs.slice(0, 30).join('\n'));
await browser.close();
