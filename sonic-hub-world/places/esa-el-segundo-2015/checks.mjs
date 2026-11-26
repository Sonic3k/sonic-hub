// Extended Stay America, El Segundo: drives the page the way a visitor would (mouse, keys, touch) and checks that it
// answers — the studio, its door, the bathroom, the stairs down to the lot, the lobby and the way in, the streets, the
// cards, the address, the cost of a frame.
// Run from the module's folder after a build: node places/esa-el-segundo-2015/checks.mjs
import { launch, open as openPage } from '../../tools/lib.mjs';

const PLACE = 'esa-el-segundo-2015';
const G2 = 3.05, ROOM_X0 = 14.48, ROOM_Z0 = 34.56, STAIR_Z = 39.0, TOWER_Y = 0.15 + 8 * 2.9 / 17;      // plan.js: the studio's floor, its front wall and its north wall; the stair tower beside it, its landing
const LB = { xW: 25.475, x0: 25.7, x1: 29.73, z0: -45.95, zp: -43.07, doorX: 31.46, doorZ: -44.1925, backZ: -45.2425, table: [28.2, 29.65, -45.43] };      // plan.js, LOBBY: the block's west face, the room (to the beam), the front door, the back door, the breakfast table (x0, x1, its front)
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
  // the bathroom: shut, its doorway holds; open, the walker goes in toward the pan, between the basin on his right and
  // the tub on his left, and both stop him
  await page.evaluate(([x0, z0]) => window.__world.setPose(x0 + 5.3, 4.55, z0 + 1.55, 180, 0), [ROOM_X0, ROOM_Z0]); await walk(page, 'KeyW', 2500);
  const b1 = await pose(page);
  ok('a shut bathroom door holds', b1[2] < ROOM_Z0 + 2.0, `z = ${b1[2]}`);
  await page.evaluate(() => window.__world.card('bathdoor')); const bc = await page.evaluate(() => document.getElementById('card-b').textContent);
  await page.click('#card .x'); await walk(page, 'KeyW', 2500);
  const b2 = await pose(page);
  ok('an open one lets him into the bathroom', b2[2] > ROOM_Z0 + 2.4 && b2[2] < ROOM_Z0 + 3.63 && bc.startsWith('Đang mở'), `z = ${b2[2]}, card "${bc.slice(0, 9)}"`);
  await turnTo(page, 270); await walk(page, 'KeyW', 2500); const b3 = await pose(page);
  await turnTo(page, 90); await walk(page, 'KeyW', 3000); const b4 = await pose(page);
  ok('the basin on the right and the tub on the left stop him', b3[0] > ROOM_X0 + 4.65 && b3[0] < ROOM_X0 + 5.1 && b4[0] < ROOM_X0 + 5.69 && b4[0] > b3[0] + 0.3, `x = ${b3[0]} … ${b4[0]}`);
  { // does the bathroom make sense? nothing stands in its doorway; the tub, the pan and the basin do not run into one
    // another; there is elbow room each side of the pan and floor to stand on before it
    const S = await page.evaluate(() => window.__world.solids().map(q => ({ ...q })));
    const X0 = ROOM_X0, Z0 = ROOM_Z0, low = q => q.y0 < G2 + 0.2 && q.y1 - q.y0 < 1.2;
    const inBath = S.filter(q => low(q) && q.x0 >= X0 + 4.05 && q.x1 <= X0 + 6.46 && q.z0 >= Z0 + 2.09 && q.z1 <= Z0 + 3.64);
    const hit = (q, x0, z0, x1, z1) => q.x0 < X0 + x1 && q.x1 > X0 + x0 && q.z0 < Z0 + z1 && q.z1 > Z0 + z0;
    const doorway = S.filter(q => q.y0 < G2 + 1.8 && q.y1 > G2 + 0.1 && hit(q, 4.925 + 0.03, 2.11, 5.685 - 0.03, 2.55));
    const tub = inBath.find(q => q.x1 > X0 + 6.4 && q.z1 - q.z0 > 1.4), basin = inBath.find(q => q.x0 < X0 + 4.1 && q.z1 > Z0 + 3.6);
    const pan = inBath.find(q => q !== tub && q !== basin && q.z1 > Z0 + 3.6 && q.x1 - q.x0 < 0.6);
    const apart = !!(tub && basin && pan && pan.x1 <= tub.x0 && basin.x1 <= pan.x0);
    const mid = pan ? (pan.x0 + pan.x1) / 2 : 0, elbow = apart ? Math.min(tub.x0 - mid, mid - basin.x1) : 0, before = pan ? pan.z0 - (Z0 + 2.1) : 0;
    ok('the bathroom makes sense: its doorway clear, tub, pan and basin apart, room by the pan and before it', doorway.length === 0 && apart && elbow >= 0.38 && before >= 0.6,
      `in the doorway ${doorway.length}; three fixtures apart ${apart}; ${elbow.toFixed(2)} m from the pan's middle to its nearer neighbour; ${before.toFixed(2)} m of floor before it`);
  }
  await page.evaluate(() => window.__world.card('bath')); const bt = await page.evaluate(() => document.getElementById('card-t').textContent); await page.click('#card .x');
  await page.evaluate(() => window.__world.goto('nha-tam')); await wait(page, 100); const b5 = await pose(page);
  ok('the bathroom has its card, and its own place in the list of rooms', bt === 'Nhà tắm' && b5[0] > ROOM_X0 + 4.1 && b5[0] < ROOM_X0 + 5.6 && b5[2] > ROOM_Z0 + 2.1 && b5[2] < ROOM_Z0 + 3.6, `"${bt}", ${JSON.stringify(b5)}`);
  // the south-west stairs: down the upper flight, round the landing, down the lower flight to the lot
  await page.evaluate(([g2, z]) => window.__world.setPose(12.75, g2 + 1.52, z + 0.8, 270, 0), [G2, STAIR_Z]); await walk(page, 'KeyW', 3500);
  const s1 = await pose(page);
  await turnTo(page, 90); await walk(page, 'KeyW', 300);                    // a step back from the railing, to pass behind the post in the middle
  await turnTo(page, 0); await walk(page, 'KeyW', 1000); await turnTo(page, 90); await walk(page, 'KeyW', 4000);
  const s2 = await pose(page);
  ok('the stairs go down to the lot: nine risers out to the landing, eight back to the ground', Math.abs(s1[1] - (TOWER_Y + 1.52)) < 0.06 && s1[0] < 9.6 && s2[1] < 1.72 && s2[0] > 12.6, `${JSON.stringify(s1)} → ${JSON.stringify(s2)}`);
  // and back up them; the landing's railing holds; the walkway's edge over the lower flight does not let one fall
  await page.evaluate(z => window.__world.setPose(12.4, 0.15 + 1.52, z - 0.8, 270, 0), STAIR_Z); await walk(page, 'KeyW', 3500);
  const s3 = await pose(page);
  await turnTo(page, 90); await walk(page, 'KeyW', 300);
  await turnTo(page, 180); await walk(page, 'KeyW', 1000); await turnTo(page, 90); await walk(page, 'KeyW', 4000);
  const s4 = await pose(page);
  await page.evaluate(([g2, z]) => window.__world.setPose(13.3, g2 + 1.52, z - 0.8, 270, 0), [G2, STAIR_Z]); await walk(page, 'KeyW', 2500);
  const s5 = await pose(page);
  ok('and up again; the railings hold', s3[0] > 8.95 && s3[0] < 9.6 && Math.abs(s3[1] - (TOWER_Y + 1.52)) < 0.06 && Math.abs(s4[1] - (G2 + 1.52)) < 0.06 && s4[0] > 13 && Math.abs(s5[1] - (G2 + 1.52)) < 0.06 && s5[0] > 12.6, `${JSON.stringify(s3)} → ${JSON.stringify(s4)}; at the edge ${JSON.stringify(s5)}`);
  // the stairs make sense: every tower on the place has a way up — the flights and landing of one on another wing's far face
  await page.evaluate(([g2]) => window.__world.setPose(-16.4, g2 + 1.52, -28.0, 180, 0), [G2]); await walk(page, 'KeyW', 700);
  const e0 = await pose(page);
  let down = e0;
  for (const [x, turn] of [[-17.2, 180], [-15.6, 180]]) { await page.evaluate(([x, g2]) => window.__world.setPose(x, g2 + 1.52, -27.6, 180, 0), [x, G2]); await walk(page, 'KeyW', 3500); const q = await pose(page); if (q[1] < down[1]) down = q; }
  ok('the main wing\'s south-west tower has stairs too', Math.abs(e0[1] - (G2 + 1.52)) < 0.06 && Math.abs(down[1] - (TOWER_Y + 1.52)) < 0.08 && down[2] > -24.2, `${JSON.stringify(e0)} → ${JSON.stringify(down)}`);
  // the lobby: one walks in at its front door and the desk stops him; the breakfast is on the right just inside; the back
  // door lets one out onto the ground-floor walkway and in again
  await page.evaluate(() => window.__world.goto('le-tan')); await wait(page, 100); const l0 = await pose(page);
  await page.evaluate(z => window.__world.setPose(35.2, 1.67, z, 270, 0), LB.doorZ); await walk(page, 'KeyW', 4200);
  const l1 = await pose(page);
  await turnTo(page, 180); await walk(page, 'KeyW', 2500); const l2 = await pose(page);
  ok('"Lễ tân" stands before the lobby; its front door lets one in, the desk stops him', l0[0] > 37 && l0[0] < 42 && l1[0] < LB.x1 - 0.3 && l1[0] > LB.x0 + 0.1 && Math.abs(l1[1] - 1.67) < 0.05 && Math.abs(l1[2] - LB.doorZ) < 0.1 && l2[2] < LB.zp && l2[2] > l1[2] + 0.4, `${JSON.stringify(l0)} → ${JSON.stringify(l1)} → ${JSON.stringify(l2)}`);
  await page.evaluate(() => window.__world.goto('bua-sang')); await wait(page, 100); const f0 = await pose(page);
  await page.evaluate(([x, z]) => window.__world.setPose(x, 1.67, z, 0, 0), [(LB.table[0] + LB.table[1]) / 2, LB.z0 + 1.6]); await walk(page, 'KeyW', 2500); const f1 = await pose(page);
  await page.evaluate(() => window.__world.card('breakfast')); const ft = await page.evaluate(() => document.getElementById('card-t').textContent + ' | ' + document.getElementById('card').textContent); await page.click('#card .x');
  ok('"Đồ ăn sáng" stands just inside the front door, the table to the right of the way in — within 2.5 m of the door, the first thing past the beam — and the table stops him; its card tells where he remembers it and of the photograph of 19/8',
    f0[0] > LB.x1 && f0[0] < LB.doorX && f0[2] > LB.z0 + 0.9 && f0[2] < LB.zp && Math.abs(f0[1] - 1.65) < 0.05 && LB.table[2] < LB.doorZ - 0.9 && LB.table[1] < LB.x1 && LB.table[1] > LB.x1 - 0.2 && LB.doorX - LB.table[1] < 2.5 && f1[2] > LB.table[2] + 0.08 && f1[2] < LB.table[2] + 0.4 && /Đồ ăn sáng/.test(ft) && /sang phải/.test(ft) && /19\/8\/2015/.test(ft),
    `${JSON.stringify(f0)} → ${JSON.stringify(f1)}; ${ft.replace(/\s+/g, ' ').slice(0, 60)}`);
  const solids = await page.evaluate(() => window.__world.solids().filter(s => s.x0 > 23 && s.x1 < 34 && s.z0 > -47 && s.z1 < -40 && s.y0 < 1.2 && s.y1 > 0.3).map(s => [s.x0, s.z0, s.x1, s.z1].map(v => +v.toFixed(2))));
  const clear = (x0, z0, x1, z1) => !solids.some(s => s[0] < x1 && s[2] > x0 && s[1] < z1 && s[3] > z0);
  ok('the lobby makes sense: a clear way 0.8 m wide from the porch through the front door and under the beam into the room, and 0.7 m wide from the room through the back door onto the walkway',
    clear(LB.x0 + 0.3, LB.doorZ - 0.4, LB.doorX + 0.3, LB.doorZ + 0.4) && clear(LB.xW - 1.0, LB.backZ - 0.35, LB.x0 + 1.0, LB.backZ + 0.35), JSON.stringify(solids.filter(s => s[0] < 32.5 && s[2] > 24.4)));
  await page.evaluate(([x, z]) => window.__world.setPose(x, 1.67, z, 270, 0), [LB.x0 + 1.0, LB.backZ]); await walk(page, 'KeyW', 2200); const k1 = await pose(page);
  await turnTo(page, 90); await walk(page, 'KeyW', 2400); const k2 = await pose(page);
  await page.evaluate(() => window.__world.card('backdoor')); const kt = await page.evaluate(() => document.getElementById('card-t').textContent); await page.click('#card .x');
  await page.evaluate(() => window.__world.goto('cua-sau')); await wait(page, 100); const k0 = await pose(page);
  ok('the back door lets one out onto the ground-floor walkway and in again; it has its card and its place in the list', k1[0] < LB.xW - 0.5 && Math.abs(k1[1] - 1.67) < 0.05 && Math.abs(k1[2] - LB.backZ) < 0.15 && k2[0] > LB.x0 + 0.5 && kt === 'Cửa sau của lễ tân' && k0[0] < LB.xW - 1 && k0[0] > LB.xW - 4 && Math.abs(k0[2] - LB.backZ) < 0.4,
    `${JSON.stringify(k1)} → ${JSON.stringify(k2)}; "${kt}"; ${JSON.stringify(k0)}`);
  await page.evaluate(() => window.__world.goto('loi-xe-vao')); await wait(page, 100); const d0 = await pose(page);
  await page.evaluate(() => window.__world.setPose(33.0, 1.52, -71.0, 180, 0)); await walk(page, 'KeyW', 6000); const d1 = await pose(page);
  ok('"Lối xe vào" stands on Mariposa\'s sidewalk by the drive; the drive runs in from the street', d0[2] < -66.4 && d0[2] > -68.4 && d0[0] > 37.5 && d1[2] > -62.5 && Math.abs(d1[0] - 33) < 0.4, `${JSON.stringify(d0)} → ${JSON.stringify(d1)}`);
  // the fence between the hotel's lot and the shops': one way through, level with the front of Ralphs — and none at the
  // north-west corner, where the first build left a gap (he said so on 26/11/2026; the satellite picture)
  await page.evaluate(() => window.__world.setPose(-5.5, 1.52, 59.1, 270, 0)); await walk(page, 'KeyW', 7000); const fw1 = await pose(page);
  await page.evaluate(() => window.__world.setPose(-5.5, 1.52, 30.0, 270, 0)); await walk(page, 'KeyW', 7000); const fw2 = await pose(page);
  await page.evaluate(() => window.__world.setPose(-22.0, 1.52, -16.0, 180, 0)); await walk(page, 'KeyW', 9000); const fw3 = await pose(page);
  ok('the fence to the shops\' lot: a way through level with Ralphs\' front; shut along the row of stalls and at the north-west corner', fw1[0] < -13 && fw2[0] > -11.6 && fw3[2] < -3.2, `through to x ${fw1[0]}; held at x ${fw2[0]}; held at z ${fw3[2]}`);
  // the streets: the rooms list takes you to Starbucks; Sepulveda is walkable
  await page.click('#b-rooms'); ok('rooms list opens', await page.evaluate(() => document.getElementById('rooms').classList.contains('on')));
  const names = await page.evaluate(() => [...document.querySelectorAll('#room-list button')].map(b => b.textContent));
  const si = names.indexOf('Starbucks');
  ok('the list of rooms has his room by its number, the bathroom, the stairs, the lobby, the breakfast, the back door and the way in', ['Phòng 271 (từ cửa nhìn vào)', 'Nhà tắm', 'Cầu thang', 'Lễ tân', 'Đồ ăn sáng ở lễ tân', 'Cửa sau lễ tân (hành lang tầng trệt)', 'Lối xe vào (Mariposa)'].every(n => names.includes(n)), names.join(' · '));
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
  // the streets are the South Bay world's: its tiles, cut to this ground, come with the page and are built by its builder
  const st = await page.evaluate(() => {
    const root = window.__world.scene().getObjectByName('tiles'), out = { squares: 0, walks: 0, marks: 0, lamps: 0, own: [] };
    if (root) for (const g of root.children) { if (!g.name.startsWith('tile ')) continue; out.squares++; for (const m of g.children) { const n = m.geometry.attributes.position ? m.geometry.attributes.position.count / 3 : 0; if (m.name === 'conc') out.walks += n; if (m.name === 'marks') out.marks += n; if (m.name === 'signal lamps') out.lamps += m.count; } }
    window.__world.scene().traverse(o => { if (/^greenery/.test(o.name)) out.own.push(o.name); });
    return out;
  });
  ok('the streets are the world\'s own: its squares of them in the page (walks, painted lines, signal lamps), none drawn by this place', st.squares === 6 && st.walks > 3000 && st.marks > 1500 && st.lamps >= 36 && st.own.length === 0, JSON.stringify(st));
  // the plants are the engine's (engine/plants.js): leaf cards cut out by alpha on the one material, and none of the old balls
  const pl = await page.evaluate(() => {
    const out = { meshes: 0, tris: 0, cut: true, sway: true, balls: 0 };
    window.__world.scene().traverse(o => {
      if (!o.isMesh) return; const m = o.material;
      if (m && m.userData && m.userData.plants) { out.meshes++; out.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); out.cut = out.cut && m.alphaTest > 0 && !!m.map; out.sway = out.sway && !!o.geometry.attributes.sway; }
      else if (m && m.map && m.map.image && m.map.image.width === 256 && /leaf/.test(m.name || '')) out.balls++;
    });
    return out;
  });
  ok('the trees, shrubs and hedges are leaf cards on the plants\' one material', pl.meshes >= 2 && pl.meshes <= 12 && pl.tris > 20000 && pl.tris < 250000 && pl.cut && pl.sway && pl.balls === 0, `${pl.meshes} meshes, ${Math.round(pl.tris / 1000)}k triangles`);
  // the cars keep those streets' lanes and lights: six minutes of them
  const tr = await page.evaluate(() => {
    const W = window.__world, L = W.live(), dt = 0.05; let prev = L.traffic();
    const out = { cars: prev.length, ran: 0, close: 1e9, waited: 0, km: 0, hardest: 0 };
    for (let k = 0; k < 360 / dt; k++) {
      W.step(dt); const cur = L.traffic(), by = {};
      cur.forEach((c, i) => {
        const p = prev[i];
        if (p.stop !== null && c.stop !== p.stop && p.sig === 0) out.ran++;                      // over its line while its light was red
        if (c.v === 0 && c.sig === 0 && c.to !== null && c.to < 1.5) out.waited++;
        out.km += c.v * dt / 1000; out.hardest = Math.max(out.hardest, (p.v - c.v) / dt); (by[c.lane] ||= []).push(c.d);
      });
      for (const ds of Object.values(by)) { ds.sort((a, b) => a - b); for (let i = 0; i + 1 < ds.length; i++) out.close = Math.min(out.close, ds[i + 1] - ds[i]); }
      prev = cur;
    }
    return out;
  });
  ok('the cars keep the streets\' lanes and lights: none over a line on red in six minutes, none on another\'s tail, they wait and they go', tr.cars >= 30 && tr.ran === 0 && tr.close >= 7 && tr.waited > 500 && tr.km > 40 && tr.hardest < 4,
    `${tr.cars} cars, ${tr.km.toFixed(0)} km between them; over a line on red: ${tr.ran}; nearest two ${tr.close.toFixed(1)} m apart; hardest braking ${tr.hardest.toFixed(1)} m/s²; ${Math.round(tr.waited * 0.05)} car-seconds waiting at red`);
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
