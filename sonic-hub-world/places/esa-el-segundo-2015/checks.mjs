// Extended Stay America, El Segundo: drives the page the way a visitor would (mouse, keys, touch) and checks that it
// answers — the studio, its door, the stairs down to the lot, the streets, the cards, the address, the cost of a frame.
// Run from the module's folder after a build: node places/esa-el-segundo-2015/checks.mjs
import { launch, open as openPage } from '../../tools/lib.mjs';

const PLACE = 'esa-el-segundo-2015';
const G2 = 3.05, ROOM_X0 = 14.48, ROOM_Z0 = 32.86;      // plan.js: the studio's floor, its front wall and its north wall
const browser = await launch();
const results = []; const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); console.log(cond ? 'PASS' : 'FAIL', '·', name, extra ? '— ' + extra : ''); };
const open = (vp, mobile, more = {}) => openPage(browser, { ...vp, mobile, place: PLACE, ...more });
const pose = page => page.evaluate(() => window.__world.pose());
const wait = async (page, ms) => { await page.waitForTimeout(60); await page.evaluate(n => { for (let i = 0; i < n; i++) window.__world.step(0.05); }, Math.max(1, Math.round(ms / 50))); };
const walk = async (page, key, ms) => { await page.focus('#scene'); await page.keyboard.down(key); await wait(page, ms); await page.keyboard.up(key); await wait(page, 150); };
const turnTo = (page, h) => page.evaluate(h => { const p = window.__world.pose(); window.__world.setPose(p[0], p[1], p[2], h, 0); }, h);

/* ── desktop: mouse and keys ── */
try {
  const { page, ctx, logs } = await open({ width: 900, height: 560 }, false);
  ok('intro is up, bar hidden', await page.evaluate(() => !document.getElementById('intro').classList.contains('off') && getComputedStyle(document.getElementById('bottom')).visibility === 'hidden'));
  await page.click('#go-walk');
  ok('"Tự đi" closes the intro', await page.evaluate(() => document.getElementById('intro').classList.contains('off')));
  const p0 = await pose(page);
  ok('it opens in the studio, upstairs', p0[0] > ROOM_X0 && p0[0] < ROOM_X0 + 7 && Math.abs(p0[1] - (G2 + 1.5)) < 0.1, JSON.stringify(p0));
  await page.mouse.move(440, 220); await page.mouse.down(); await page.mouse.move(500, 220, { steps: 6 }); await page.mouse.up(); await wait(page, 400);
  const p1 = await pose(page);
  ok('drag turns the head', p1[3] !== p0[3] && p1[0] === p0[0], `${p0[3]}° → ${p1[3]}°`);
  await page.evaluate(() => window.__world.goto('phong')); await wait(page, 100);
  const pa = await pose(page); await page.mouse.click(450, 470); await wait(page, 2500); const pb = await pose(page);
  ok('click on the floor walks there (and stays on this floor)', Math.hypot(pb[0] - pa[0], pb[2] - pa[2]) > 0.3 && Math.abs(pb[1] - (G2 + 1.52)) < 0.05, `moved ${Math.hypot(pb[0] - pa[0], pb[2] - pa[2]).toFixed(2)} m, eye at ${pb[1]}`);
  // the kitchen end holds: east along the aisle between the counter and the bathroom, to the cupboards
  await page.evaluate(([x0, z0]) => window.__world.setPose(x0 + 3.62, 4.55, z0 + 1.8, 90, 0), [ROOM_X0, ROOM_Z0]); await walk(page, 'KeyW', 4000);
  const pc = await pose(page);
  ok('the kitchen cupboards stop the walker', pc[0] > ROOM_X0 + 5.0 && pc[0] < ROOM_X0 + 5.9, `x = ${pc[0]}`);
  // the counter he worked at is in the way: north from the aisle, the walker stops at its end
  await page.evaluate(([x0, z0]) => window.__world.setPose(x0 + 4.4, 4.55, z0 + 1.8, 0, 0), [ROOM_X0, ROOM_Z0]); await walk(page, 'KeyW', 2500);
  const pk = await pose(page);
  ok('the counter stops the walker', pk[2] > ROOM_Z0 + 1.2 && pk[2] < ROOM_Z0 + 1.6, `z = ${pk[2]}`);
  // the door: shut, the doorway holds; open, the walker goes out onto the walkway
  const doorZ = await page.evaluate(() => window.__world.hot().find(h => h.id === 'door').pos[2]);
  await page.evaluate(() => window.__world.card('door')); await page.click('#card .x');
  await page.evaluate(([x0, z]) => window.__world.setPose(x0 + 1.2, 4.55, z, 270, 0), [ROOM_X0, doorZ]); await walk(page, 'KeyW', 3000);
  const pd = await pose(page);
  ok('a shut door holds', pd[0] > ROOM_X0 - 0.1, `x = ${pd[0]}`);
  await page.evaluate(() => window.__world.card('door')); const dc = await page.evaluate(() => document.getElementById('card-b').textContent);
  await page.click('#card .x'); await walk(page, 'KeyW', 3000);
  const pe = await pose(page);
  ok('an open door lets him out onto the walkway', pe[0] < ROOM_X0 - 0.4 && Math.abs(pe[1] - (G2 + 1.52)) < 0.1 && dc.startsWith('Đang mở'), `x = ${pe[0]}, card "${dc.slice(0, 20)}"`);
  // the south-west stairs: down the upper flight, round the landing, down the lower flight to the lot
  await page.evaluate(g2 => window.__world.setPose(12.6, g2 + 1.52, 38.8, 270, 0), G2); await walk(page, 'KeyW', 3500);
  const s1 = await pose(page);
  await turnTo(page, 0); await walk(page, 'KeyW', 900); await turnTo(page, 90); await walk(page, 'KeyW', 4000);
  const s2 = await pose(page);
  ok('the stairs go down to the lot', s1[1] < G2 + 1.52 - 0.9 && s2[1] < 1.9 && s2[0] > 11.4, `${JSON.stringify(s1)} → ${JSON.stringify(s2)}`);
  // the streets: the rooms list takes you to Starbucks; Sepulveda is walkable
  await page.click('#b-rooms'); ok('rooms list opens', await page.evaluate(() => document.getElementById('rooms').classList.contains('on')));
  const names = await page.evaluate(() => [...document.querySelectorAll('#room-list button')].map(b => b.textContent));
  const si = names.indexOf('Starbucks');
  if (si >= 0) await page.click(`#room-list li:nth-child(${si + 1}) button`); await page.waitForTimeout(500); await wait(page, 100);
  const pf = await pose(page);
  ok('"Starbucks" takes you to the corner of the lot', si >= 0 && Math.abs(pf[0] + 58) < 0.1 && Math.abs(pf[2] + 6) < 0.1, JSON.stringify(pf));
  await walk(page, 'KeyW', 2500); const pg = await pose(page);
  ok('out of doors he walks at street level', Math.hypot(pg[0] - pf[0], pg[2] - pf[2]) > 1 && Math.abs(pg[1] - 1.52) < 0.25, JSON.stringify(pg));
  // the hour
  await page.click('#h-toi'); await wait(page, 300);
  ok('"Tối" presses', await page.evaluate(() => document.getElementById('h-toi').getAttribute('aria-pressed') === 'true'));
  // a bright dot by mouse: the laptop, with the way to the hub's computer and phone of that hour
  await page.evaluate(() => window.__world.goto('phong')); await wait(page, 500);
  const hot = await page.evaluate(() => { const h = window.__world.hot().find(h => h.id === 'laptop'); return window.__world.project(...h.pos); });
  await page.mouse.click(hot[0], hot[1]); await wait(page, 500);
  const card = await page.evaluate(() => ({ on: document.getElementById('card').classList.contains('on'), t: document.getElementById('card-t').textContent, links: [...document.querySelectorAll('#card-b a')].map(a => a.href) }));
  ok('the laptop\'s dot opens its card, with the hub\'s computer and phone at 21:30 California time', card.on && card.t === 'Laptop Asus N56' && card.links.length === 2 && card.links[0].endsWith('/pc?at=2015-09-22T11:30') && card.links[1].endsWith('/phone?at=2015-09-22T11:30'), JSON.stringify(card) + ' at ' + hot.map(v => v.toFixed(0)));
  if (card.on) await page.click('#card .x'); ok('× closes the card', await page.evaluate(() => !document.getElementById('card').classList.contains('on')));
  // every dot has a card
  const ids = await page.evaluate(() => window.__world.hot().map(h => h.id));
  const missing = [];
  for (const id of ids) { if (id === 'door' || id === 'bathdoor' || id === 'curtain' || id === 'tv') continue; await page.evaluate(id => window.__world.card(id), id); const t = await page.evaluate(() => document.getElementById('card').classList.contains('on') && document.getElementById('card-t').textContent); if (!t) missing.push(id); else await page.click('#card .x'); }
  ok('every bright dot opens a card', missing.length === 0 && ids.length >= 15, `${ids.length} dots${missing.length ? ', no card: ' + missing.join(' ') : ''}`);
  // the tour
  await page.click('#b-tour'); await wait(page, 600);
  ok('tour starts', await page.evaluate(() => window.__world.touring() && document.getElementById('b-tour').textContent === 'Dừng'));
  await page.click('#b-tour'); await wait(page, 300);
  ok('tour stops', await page.evaluate(() => !window.__world.touring() && document.getElementById('b-tour').textContent === 'Tham quan'));
  // what a frame costs where the most is in sight
  await page.evaluate(() => window.__world.goto('lan-can')); await page.evaluate(() => window.__world.renderOnce());
  const info = await page.evaluate(() => window.__world.info());
  ok('a frame over the lot stays light (≤ 300 draw calls, ≤ 900k triangles)', info.calls <= 300 && info.tris <= 900000, `${info.calls} calls, ${info.tris} triangles`);
  ok('no errors on the page (desktop)', logs.length === 0, logs.join(' | '));
  await ctx.close();
} catch (e) { ok('desktop run completed', false, String(e.message).split('\n')[0]); }

/* ── the address: a moment as Sonic Hub writes it (Vietnam's clock), read on California's, and a view (#…) ── */
try {
  const a = await open({ width: 900, height: 560 }, false, { query: '?at=2015-09-22T23:47', hash: '#starbucks' });
  const st = await a.page.evaluate(() => ({ s: window.__world.state(), pose: window.__world.pose() }));
  ok('?at=2015-09-22T23:47 (Vietnam) opens at 9:47 in the morning (California)', st.s.hour === 'sang', JSON.stringify(st.s));
  ok('#starbucks opens at Starbucks', Math.abs(st.pose[0] + 58) < 0.1 && Math.abs(st.pose[2] + 6) < 0.1, JSON.stringify(st.pose));
  await a.ctx.close();
  const b = await open({ width: 900, height: 560 }, false, { query: '?at=2015-09-22T11:30' });
  const s2 = await b.page.evaluate(() => window.__world.state());
  ok('?at=2015-09-22T11:30 opens at night (21:30 the day before, California)', s2.hour === 'toi', JSON.stringify(s2));
  ok('no errors on the page (address)', a.logs.length === 0 && b.logs.length === 0, [...a.logs, ...b.logs].join(' | '));
  await b.ctx.close();
} catch (e) { ok('address run completed', false, String(e.message).split('\n')[0]); }

/* ── phone: fingers ── */
try {
  const { page, ctx, logs } = await open({ width: 360, height: 640 }, true);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  await page.tap('#go-walk');
  ok('phone: "Tự đi" closes the intro', await page.evaluate(() => document.getElementById('intro').classList.contains('off')));
  const p0 = await pose(page);
  await touch('touchStart', [[280, 200, 1]]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[280 - i * 12, 200, 1]]); await wait(page, 30); } await touch('touchEnd', []); await wait(page, 400);
  const p1 = await pose(page);
  ok('phone: right thumb turns the head', p1[3] !== p0[3], `${p0[3]}° → ${p1[3]}°`);
  await page.evaluate(() => window.__world.goto('hanh-lang')); await wait(page, 200);
  const q0 = await pose(page);
  await touch('touchStart', [[70, 430, 2]]); await wait(page, 60); await touch('touchMove', [[70, 395, 2]]); await wait(page, 60);
  const stickShown = await page.evaluate(() => getComputedStyle(document.getElementById('stick')).display === 'block');
  await touch('touchMove', [[70, 380, 2]]); await wait(page, 2200); await touch('touchEnd', []); await wait(page, 300);
  const q1 = await pose(page);
  ok('phone: left thumb shows the stick and walks along the walkway', stickShown && Math.hypot(q1[0] - q0[0], q1[2] - q0[2]) > 0.3, `stick ${stickShown}, moved ${Math.hypot(q1[0] - q0[0], q1[2] - q0[2]).toFixed(2)} m`);
  ok('phone: stick hides when the thumb lifts', await page.evaluate(() => getComputedStyle(document.getElementById('stick')).display === 'none'));
  await page.evaluate(() => window.__world.goto('ban')); await wait(page, 600);
  const tv = await page.evaluate(() => { const h = window.__world.hot().find(h => h.id === 'tv'); return window.__world.project(...h.pos); });
  await page.touchscreen.tap(tv[0], tv[1]); await wait(page, 600);
  const c1 = await page.evaluate(() => ({ on: document.getElementById('card').classList.contains('on'), t: document.getElementById('card-t').textContent, b: document.getElementById('card-b').textContent.slice(0, 30) }));
  ok('phone: tapping the TV dot opens the card and switches it on', c1.on && c1.t === 'Tivi LG' && c1.b.startsWith('Đang bật'), JSON.stringify(c1) + ' at ' + tv.map(v => v.toFixed(0)));
  if (c1.on) await page.tap('#card .x');
  const lay = await page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const a = r('b-rooms'), t = r('b-tour'); return { sw: document.documentElement.scrollWidth, iw: innerWidth, rooms: Math.round(a.height), tour: Math.round(t.height), top: r('name').right < r('hours').left }; });
  ok('phone: no sideways scroll, buttons ≥ 44 px, name clear of the hours', lay.sw <= lay.iw && lay.rooms >= 44 && lay.tour >= 44 && lay.top, JSON.stringify(lay));
  await page.evaluate(() => { document.getElementById('intro').classList.remove('off'); document.getElementById('go-notes').click(); }); await wait(page, 200);
  const notes = await page.evaluate(() => { const c = document.getElementById('card'); const r = c.getBoundingClientRect(); return { on: c.classList.contains('on'), top: Math.round(r.top), bottom: Math.round(r.bottom), scrolls: c.scrollHeight > c.clientHeight }; });
  ok('phone: the notes card fits on the screen and scrolls', notes.on && notes.top >= 60 && notes.bottom <= 640 && notes.scrolls, JSON.stringify(notes));
  ok('no errors on the page (phone)', logs.length === 0, logs.join(' | '));
  await ctx.close();
} catch (e) { ok('phone run completed', false, String(e.message).split('\n')[0]); }

const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${PLACE}: ${failed} FAILED` : `${PLACE}: all ${results.length} passed`);
await browser.close();
if (failed) process.exit(1);
