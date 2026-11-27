// A world seen from anywhere: pictures from a point towards another. From the module's folder after a build:
//   PLACE=south-bay node tools/worldfree.mjs <out dir> <w>x<h> <sang|chieu|toi> <x,y,z,tx,ty,tz[,name[,fov]]> […]
// (x east, y up, z south, metres.) Prints what each frame costs.
import { launch, open } from './lib.mjs';
const [out, size = '1280x720', hour = 'sang', ...spots] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await launch();
const { page, logs } = await open(browser, { width: w, height: h, place: process.env.PLACE || 'south-bay' });
await page.evaluate(hour => { const W = window.__world; W.go(); W.pause(true); W.setView('road'); W.setHour(hour); document.documentElement.classList.add('bare'); }, hour);
await page.addStyleTag({ content: '#top, #road, #bar, .pads, #intro, #arrive, #unit, #load, #speed { display: none !important }' });
for (const spot of spots) {
  const [x, y, z, tx, ty, tz, name, fov] = spot.split(',');
  const info = await page.evaluate(async ([x, y, z, tx, ty, tz, fov]) => {
    const W = window.__world; W.from([x, y, z], [tx, ty, tz], fov || 0);
    for (let k = 0; k < 600; k++) { W.step(0.016); if (k % 10 === 0) await new Promise(r => setTimeout(r, 30)); if (k > 60 && W.settled(1)) break; }
    W.step(0.0001); W.renderOnce(); W.renderOnce(); return W.info();
  }, [+x, +y, +z, +tx, +ty, +tz, +fov || 0]);
  const file = `${out}/free_${name || `${x}_${z}`}.png`; await page.screenshot({ path: file }); console.log(file, info.calls, 'calls', info.tris, 'tris');
}
if (logs.length) console.log('LOGS', logs.slice(0, 8).join('\n'));
await browser.close();
