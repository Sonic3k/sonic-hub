// Looks at the site as it is served (npm start, or the live address): the list of places and a place opened from it.
// usage: node tools/site.mjs <base-url, e.g. http://127.0.0.1:3000> [name=site]
import fs from 'fs';
import { launch, PLACE } from './lib.mjs';

const [base = 'http://127.0.0.1:3000', name = 'site'] = process.argv.slice(2);
fs.mkdirSync('shots', { recursive: true });
const three = fs.readFileSync('node_modules/three/build/three.module.min.js');
const browser = await launch();
let bad = 0; const ok = (what, cond, extra = '') => { if (!cond) bad++; console.log(cond ? 'PASS' : 'FAIL', '·', what, extra ? '— ' + extra : ''); };
for (const [tag, width, height] of [['wide', 1280, 800], ['phone', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 700, isMobile: width < 700 });
  const page = await ctx.newPage(); const logs = [];
  page.on('pageerror', e => logs.push(e.message));
  // only this site, and three.js from the local copy: nothing else is reachable from the test machine
  await page.route('**/*', route => { const u = route.request().url(); if (u.startsWith(base)) return route.continue(); if (u.endsWith('/three.module.min.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: three }); return route.abort(); });
  await page.goto(base + '/'); await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${name}_${tag}_index.png`, fullPage: true });
  const list = await page.evaluate(() => ({ title: document.title, h1: document.querySelector('h1').textContent, cards: [...document.querySelectorAll('a.place')].map(a => ({ href: a.getAttribute('href'), name: a.querySelector('b').textContent, plan: a.querySelectorAll('svg rect').length })), wide: document.documentElement.scrollWidth <= innerWidth }));
  ok(`${tag}: the list names its places`, list.cards.length >= 1 && list.cards.every(c => c.href.startsWith('/places/') && c.plan > 0) && list.wide, JSON.stringify(list.cards));
  await page.click(`a.place[href="/places/${PLACE}"]`);
  const ready = await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 120000 }).then(() => true).catch(() => false);
  ok(`${tag}: ${PLACE} opens from the list and is built`, ready, page.url());
  if (ready) {
    await page.evaluate(() => window.__world.pause(true));
    const back = await page.evaluate(() => [...document.querySelectorAll('.back')].map(a => ({ hidden: a.hidden, href: a.getAttribute('href') })));
    ok(`${tag}: on the site the page offers the way back to the list`, back.length === 2 && back.every(b => !b.hidden && b.href === '/'), JSON.stringify(back));
    await page.evaluate(() => window.__world.renderOnce()); await page.waitForTimeout(150);
    await page.screenshot({ path: `shots/${name}_${tag}_place.png`, timeout: 90000 });
    await page.evaluate(() => { window.__world.hideIntro(); document.getElementById('b-rooms').click(); window.__world.renderOnce(); }); await page.waitForTimeout(120);
    await page.screenshot({ path: `shots/${name}_${tag}_rooms.png`, timeout: 90000 });
  }
  ok(`${tag}: no errors`, logs.length === 0, logs.join(' | '));
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
