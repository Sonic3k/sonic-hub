// Flat 507: drives its page the way a visitor would (mouse, keys, touch) and checks that it answers.
// Run from the module's folder after a build: node places/van-bao-507/checks.mjs
import { launch, open as openPage } from '../../tools/lib.mjs';

const PLACE = 'van-bao-507';
const browser = await launch();
const results = []; const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); console.log(cond ? 'PASS' : 'FAIL', '·', name, extra ? '— ' + extra : ''); };
const open = (vp, mobile, more = {}) => openPage(browser, { ...vp, mobile, place: PLACE, ...more });
const pose = page => page.evaluate(() => window.__world.pose());
// lets the page take in what was just done, then advances the walk by `ms` of its own time in 50 ms steps
const wait = async (page, ms) => { await page.waitForTimeout(60); await page.evaluate(n => { for (let i = 0; i < n; i++) window.__world.step(0.05); }, Math.max(1, Math.round(ms / 50))); };

/* ── desktop: mouse and keys ── */
try {
  const { page, ctx, logs } = await open({ width: 900, height: 560 }, false);
  ok('intro is up, bar hidden', await page.evaluate(() => !document.getElementById('intro').classList.contains('off') && getComputedStyle(document.getElementById('bottom')).visibility === 'hidden'));
  await page.click('#go-walk');
  ok('"Tự đi" closes the intro', await page.evaluate(() => document.getElementById('intro').classList.contains('off') && getComputedStyle(document.getElementById('bottom')).visibility === 'visible'));
  const p0 = await pose(page);
  await page.mouse.move(440, 220); await page.mouse.down(); await page.mouse.move(500, 220, { steps: 6 }); await page.mouse.up(); await wait(page, 400);
  const p1 = await pose(page);
  ok('drag turns the head', p1[3] !== p0[3] && p1[0] === p0[0], `${p0[3]}° → ${p1[3]}°`);
  await page.mouse.click(450, 430); await wait(page, 2500);
  const p2 = await pose(page);
  ok('click on the floor walks there', Math.hypot(p2[0] - p1[0], p2[2] - p1[2]) > 0.3, `moved ${Math.hypot(p2[0] - p1[0], p2[2] - p1[2]).toFixed(2)} m`);
  await page.focus('#scene'); await page.keyboard.down('KeyS'); await wait(page, 1200); await page.keyboard.up('KeyS'); await wait(page, 200);
  const p3 = await pose(page);
  ok('S walks backwards', Math.hypot(p3[0] - p2[0], p3[2] - p2[2]) > 0.2, `moved ${Math.hypot(p3[0] - p2[0], p3[2] - p2[2]).toFixed(2)} m`);
  await page.keyboard.down('ArrowRight'); await wait(page, 800); await page.keyboard.up('ArrowRight'); await wait(page, 200);
  const p4 = await pose(page);
  ok('→ turns', p4[3] !== p3[3], `${p3[3]}° → ${p4[3]}°`);
  // walls hold: walk into the north wall for a while
  await page.evaluate(() => window.__world.setPose(2.5, 1.52, 0.8, 0, 0)); await page.keyboard.down('KeyW'); await wait(page, 2500); await page.keyboard.up('KeyW'); await wait(page, 200);
  const p5 = await pose(page);
  ok('a wall stops the walker', p5[2] > 0.15 && p5[2] < 0.8, `z = ${p5[2]}`);
  // rooms list
  await page.click('#b-rooms'); ok('rooms list opens', await page.evaluate(() => document.getElementById('rooms').classList.contains('on')));
  await page.click('#room-list li:nth-child(4) button'); await page.waitForTimeout(700); await wait(page, 100);
  const p6 = await pose(page);
  ok('"Bếp" takes you to the kitchen', Math.abs(p6[0] - 2.55) < 0.05 && Math.abs(p6[2] - 3.95) < 0.05 && await page.evaluate(() => !document.getElementById('rooms').classList.contains('on')), JSON.stringify(p6));
  // year
  await page.focus('#year'); for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight'); await wait(page, 300);
  ok('year slider moves by keys', await page.evaluate(() => document.getElementById('year-out').textContent === '2010' && document.getElementById('where').textContent.endsWith('2010') && document.documentElement.dataset.era === '2008'), await page.evaluate(() => document.getElementById('year-out').textContent));
  // hour
  await page.click('#h-toi'); await wait(page, 300);
  ok('"Tối" presses', await page.evaluate(() => document.getElementById('h-toi').getAttribute('aria-pressed') === 'true' && document.getElementById('h-chieu').getAttribute('aria-pressed') === 'false'));
  // a hotspot by mouse
  await page.evaluate(() => window.__world.goto('goc-may-tinh')); await wait(page, 500);
  const hot = await page.evaluate(() => { const h = window.__world.hot().find(h => h.id === 'pc'); return window.__world.project(...h.pos); });
  await page.mouse.click(hot[0], hot[1]); await wait(page, 500);
  const card = await page.evaluate(() => ({ on: document.getElementById('card').classList.contains('on'), t: document.getElementById('card-t').textContent, links: [...document.querySelectorAll('#card-b a')].map(a => a.href), text: document.getElementById('card-b').textContent.slice(0, 80) }));
  ok('clicking the bright dot on the computer opens its card', card.on && card.t === 'Góc máy tính' && card.links.length === 2, JSON.stringify(card) + ' at ' + hot.map(v => v.toFixed(0)));
  ok('after a click on the picture the keys are the walker\'s again', await page.evaluate(() => document.activeElement && document.activeElement.id === 'scene'));
  if (card.on) await page.click('#card .x'); ok('× closes the card', await page.evaluate(() => !document.getElementById('card').classList.contains('on')));
  // tour
  await page.click('#b-tour'); await wait(page, 600);
  ok('tour starts', await page.evaluate(() => window.__world.touring() && document.getElementById('b-tour').textContent === 'Dừng'));
  await page.click('#b-tour'); await wait(page, 300);
  ok('tour stops', await page.evaluate(() => !window.__world.touring() && document.getElementById('b-tour').textContent === 'Tham quan'));
  ok('no errors on the page (desktop)', logs.length === 0, logs.join(' | '));
  await ctx.close();
} catch (e) { ok('desktop run completed', false, String(e.message).split('\n')[0]); }

/* ── the address: a moment (?at=…, as Sonic Hub writes it) and a room (#…) ── */
try {
  const { page, ctx, logs } = await open({ width: 900, height: 560 }, false, { query: '?at=2010-06-15T21:00', hash: '#bep' });
  const st = await page.evaluate(() => ({ s: window.__world.state(), pose: window.__world.pose(), era: document.documentElement.dataset.era, toi: document.getElementById('h-toi').getAttribute('aria-pressed'), where: document.getElementById('where').textContent, back: [...document.querySelectorAll('.back')].every(a => a.hidden) }));
  ok('?at=2010-06-15T21:00 opens on 2010, in the evening', st.s.year === 2010 && st.s.hour === 'toi' && st.toi === 'true' && st.era === '2008' && st.where.endsWith('2010'), JSON.stringify(st.s));
  ok('#bep opens in the kitchen', Math.abs(st.pose[0] - 2.55) < 0.05 && Math.abs(st.pose[2] - 3.95) < 0.05, JSON.stringify(st.pose));
  ok('a lone copy of the page shows no link back to the list', st.back);
  await ctx.close();
  const b = await open({ width: 900, height: 560 }, false, { query: '?at=1999-01-01T03:00' });
  const s2 = await b.page.evaluate(() => window.__world.state());
  ok('a moment outside its years is kept inside them (1999 → 2005; 03:00 is night)', s2.year === 2005 && s2.hour === 'toi', JSON.stringify(s2));
  ok('no errors on the page (address)', logs.length === 0 && b.logs.length === 0, [...logs, ...b.logs].join(' | '));
  await b.ctx.close();
} catch (e) { ok('address run completed', false, String(e.message).split('\n')[0]); }

/* ── phone: fingers ── */
try {
  const { page, ctx, logs } = await open({ width: 360, height: 640 }, true);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  // the first touch on the picture closes the intro… tap the button instead, as most people will
  await page.tap('#go-walk');
  ok('phone: "Tự đi" closes the intro', await page.evaluate(() => document.getElementById('intro').classList.contains('off')));
  const p0 = await pose(page);
  // right thumb drags to look
  await touch('touchStart', [[280, 200, 1]]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[280 - i * 12, 200, 1]]); await wait(page, 30); } await touch('touchEnd', []); await wait(page, 400);
  const p1 = await pose(page);
  ok('phone: right thumb turns the head', p1[3] !== p0[3], `${p0[3]}° → ${p1[3]}°`);
  // left thumb pushes forward
  await touch('touchStart', [[70, 430, 2]]); await wait(page, 60); await touch('touchMove', [[70, 395, 2]]); await wait(page, 60);
  const stickShown = await page.evaluate(() => getComputedStyle(document.getElementById('stick')).display === 'block');
  await touch('touchMove', [[70, 380, 2]]); await wait(page, 2200); await touch('touchEnd', []); await wait(page, 300);
  const p2 = await pose(page);
  ok('phone: left thumb shows the stick and walks', stickShown && Math.hypot(p2[0] - p1[0], p2[2] - p1[2]) > 0.3, `stick ${stickShown}, moved ${Math.hypot(p2[0] - p1[0], p2[2] - p1[2]).toFixed(2)} m`);
  ok('phone: stick hides when the thumb lifts', await page.evaluate(() => getComputedStyle(document.getElementById('stick')).display === 'none'));
  // tap a hotspot
  await page.evaluate(() => window.__world.goto('phong-khach')); await wait(page, 600);
  const tv = await page.evaluate(() => { const h = window.__world.hot().find(h => h.id === 'tv'); return window.__world.project(...h.pos); });
  await page.touchscreen.tap(tv[0], tv[1]); await wait(page, 600);
  const c1 = await page.evaluate(() => ({ on: document.getElementById('card').classList.contains('on'), t: document.getElementById('card-t').textContent, b: document.getElementById('card-b').textContent.slice(0, 30) }));
  ok('phone: tapping the TV dot opens the card and switches it on', c1.on && c1.t === 'Tivi' && c1.b.startsWith('Đang bật'), JSON.stringify(c1) + ' at ' + tv.map(v => v.toFixed(0)));
  if (c1.on) await page.tap('#card .x');
  // tap on the floor: walk there
  await page.evaluate(() => window.__world.setPose(2.6, 1.52, 2.9, 20, -30)); await wait(page, 100);
  const p3 = await pose(page); await page.touchscreen.tap(250, 300); await wait(page, 2500); const p4 = await pose(page);
  ok('phone: a tap on the floor walks there', Math.hypot(p4[0] - p3[0], p4[2] - p3[2]) > 0.3, `moved ${Math.hypot(p4[0] - p3[0], p4[2] - p3[2]).toFixed(2)} m`);
  // the same in the corner where the left thumb rests: a quick touch there is a tap too
  await page.evaluate(() => window.__world.setPose(2.6, 1.52, 2.9, 20, -30)); await wait(page, 100);
  const p5 = await pose(page); await page.touchscreen.tap(90, 330); await wait(page, 2500); const p6 = await pose(page);
  ok('phone: a quick touch in the thumb corner is a tap too', Math.hypot(p6[0] - p5[0], p6[2] - p5[2]) > 0.3, `moved ${Math.hypot(p6[0] - p5[0], p6[2] - p5[2]).toFixed(2)} m`);
  // layout: nothing wider than the screen, the bar in two rows, buttons big enough
  const lay = await page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const y = r('years'), a = r('b-rooms'), t = r('b-tour'); return { sw: document.documentElement.scrollWidth, iw: innerWidth, years: [y.left, y.top, y.width, y.height].map(Math.round), rooms: [a.left, a.top, a.width, a.height].map(Math.round), tour: [t.left, t.top, t.width, t.height].map(Math.round), top: [r('name').right < r('hours').left] }; });
  ok('phone: no sideways scroll, years above the two buttons, buttons ≥ 44 px', lay.sw <= lay.iw && lay.years[1] < lay.rooms[1] && lay.rooms[3] >= 44 && lay.tour[3] >= 44 && lay.top[0], JSON.stringify(lay));
  // the notes card scrolls inside itself
  await page.evaluate(() => { document.getElementById('intro').classList.remove('off'); document.getElementById('go-notes').click(); }); await wait(page, 200);
  const notes = await page.evaluate(() => { const c = document.getElementById('card'); const r = c.getBoundingClientRect(); return { on: c.classList.contains('on'), top: Math.round(r.top), bottom: Math.round(r.bottom), scrolls: c.scrollHeight > c.clientHeight, sh: c.scrollHeight, ch: c.clientHeight }; });
  ok('phone: the notes card fits on the screen and scrolls', notes.on && notes.top >= 60 && notes.bottom <= 640, JSON.stringify(notes));
  ok('no errors on the page (phone)', logs.length === 0, logs.join(' | '));
  await ctx.close();
} catch (e) { ok('phone run completed', false, String(e.message).split('\n')[0]); }
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${PLACE}: ${failed} FAILED` : `${PLACE}: all ${results.length} passed`);
await browser.close();
if (failed) process.exit(1);
