// Plays a place's guided tour and photographs it every few seconds.
// usage: node tools/tourshots.mjs <name> [every=3] [w=640] [h=360] [hour] [year] [from=0] [to=999]
import fs from 'fs';
import { launch, open } from './lib.mjs';

const [name = 'tour', every = '3', W = '640', H = '360', hour = '', year = '', from = '0', to = '999'] = process.argv.slice(2);
fs.mkdirSync('shots', { recursive: true });
const browser = await launch();
const { page, logs } = await open(browser, { width: +W, height: +H });
await page.evaluate(() => window.__world.hideIntro());
if (hour) await page.evaluate(h => window.__world.setHour(h), hour);
if (year) await page.evaluate(y => window.__world.setYear(+y), year);
await page.evaluate(() => window.__world.tour());
let t = 0, next = +from, i = 0;
while (await page.evaluate(() => window.__world.touring()) && t <= +to) {
  if (t >= next - 1e-6) {
    await page.evaluate(() => window.__world.renderOnce()); await page.waitForTimeout(80);
    const f = `shots/${name}_${String(i++).padStart(2, '0')}.png`; await page.screenshot({ path: f, timeout: 90000 });
    console.log(f, 't=' + t.toFixed(1), JSON.stringify(await page.evaluate(() => window.__world.pose())));
    next += +every;
  }
  // advance to the next moment to photograph in 50 ms steps, as the page itself would
  const n = Math.max(1, Math.round(Math.min(+every, next - t) / 0.05));
  await page.evaluate(n => { for (let j = 0; j < n && window.__world.touring(); j++) window.__world.step(0.05); }, n);
  t += n * 0.05;
}
if (logs.length) console.log(logs.join('\n'));
await browser.close();
