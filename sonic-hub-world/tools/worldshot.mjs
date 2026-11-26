// Pictures of a world along its route, with what each frame costs. Run from the module's folder after a build:
//   PLACE=south-bay node tools/worldshot.mjs <out dir> <w>x<h> <cabin|road> <sang|chieu|toi> <metres along>[,<metres>…] [yaw,pitch]
import { launch, open } from './lib.mjs';
const [out, size, view = 'cabin', hour = 'sang', list = '0', lookS = ''] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await launch();
const { page, logs } = await open(browser, { width: w, height: h, place: process.env.PLACE || 'south-bay', mobile: w < 700 });
await page.evaluate(([view, hour]) => { const W = window.__world; W.go(); W.setView(view); W.setHour(hour); document.getElementById('unit').classList.remove('open'); }, [view, hour]);
for (const s of list.split(',').map(Number)) {
  const info = await page.evaluate(async ([s, lookS]) => {
    const W = window.__world; W.at(s); if (lookS) { const [a, b] = lookS.split(',').map(Number); W.look(a, b); }
    for (let k = 0; k < 400; k++) { W.step(0.016); if (k % 10 === 0) await new Promise(r => setTimeout(r, 30)); if (k > 40 && W.settled(2)) break; }
    W.at(s); if (lookS) { const [a, b] = lookS.split(',').map(Number); W.look(a, b); }
    W.step(0.0001); W.renderOnce(); W.renderOnce();
    const c = W.cost(); W.renderOnce();
    return { car: (({ x, z, heading, street }) => ({ x: +x.toFixed(1), z: +z.toFixed(1), h: +(heading * 180 / Math.PI).toFixed(0), street }))(W.car()), cost: c, tiles: W.tiles() };
  }, [s, lookS]);
  await page.screenshot({ path: `${out}/${w < h ? 'p' : 'l'}_${view}_${hour}_${String(s).padStart(4, '0')}.png` });
  console.log('  hud:', await page.evaluate(() => [document.getElementById('street').textContent, document.getElementById('say').textContent, window.__world.car().phase].join(' | ')));
  console.log(s, JSON.stringify(info.car), 'world', info.cost.world.calls, 'calls', info.cost.world.tris, 'tris · cabin', info.cost.cabin.calls, info.cost.cabin.tris, '· tiles live', info.tiles.live, 'ms', info.tiles.msAvg, 'mb', info.tiles.mb, 'worker', info.tiles.worker);
}
if (logs.length) console.log('LOGS', logs.slice(0, 12).join('\n'));
await browser.close();
