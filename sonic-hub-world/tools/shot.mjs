// Photographs a place from given poses.
// usage: node tools/shot.mjs <name> [w=1280] [h=720] ['x,y,z,heading,pitch;…' | names of views] [hour] [year] [intro|rooms|notes|card:<id>]
import fs from 'fs';
import { launch, open } from './lib.mjs';

const [name = 'shot', W = '1280', H = '720', poses = '', hour = '', year = '', uiState = ''] = process.argv.slice(2);
fs.mkdirSync('shots', { recursive: true });
const browser = await launch();
const { page, logs } = await open(browser, { width: +W, height: +H });
if (hour) await page.evaluate(h => window.__world.setHour(h), hour);
if (year) await page.evaluate(y => window.__world.setYear(+y), year);
// the state of the slips over the scene
if (uiState !== 'intro') await page.evaluate(() => window.__world.hideIntro());
if (uiState === 'rooms') await page.evaluate(() => document.getElementById('b-rooms').click());
if (uiState === 'notes') await page.evaluate(() => document.getElementById('go-notes').click());
if (uiState.startsWith('card:')) await page.evaluate(id => window.__world.card(id), uiState.slice(5));
const list = poses ? poses.split(';').filter(Boolean) : ['default'];
let i = 0;
for (const p of list) {
  if (p !== 'default') {
    const v = p.split(',').map(Number);
    if (v.some(Number.isNaN)) await page.evaluate(n => window.__world.goto(n), p);
    else await page.evaluate(v => window.__world.setPose(...v), v);
  }
  await page.evaluate(() => window.__world.renderOnce());
  await page.waitForTimeout(120);
  await page.evaluate(() => window.__world.renderOnce());
  await page.waitForTimeout(60);
  const out = `shots/${name}_${String(i++).padStart(2, '0')}.png`;
  await page.screenshot({ path: out, timeout: 90000 });
  console.log(out);
}
console.log('info', JSON.stringify(await page.evaluate(() => window.__world.info())));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
