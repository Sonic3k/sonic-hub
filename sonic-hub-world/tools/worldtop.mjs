// Plans of a world: pictures from straight above, north up, to hold its streets against a map. From the module's folder after a build:
//   PLACE=south-bay node tools/worldtop.mjs <out dir> <size px> <cut m | 0> <x,z,span[,name]> […]
// cut: only what lies below that height is drawn (1.2 shows the street under the trees); 0 draws everything.
import { launch, open } from './lib.mjs';
const [out, size = '1000', cut = '1.2', ...spots] = process.argv.slice(2);
const browser = await launch();
const { page, logs } = await open(browser, { width: +size, height: +size, place: process.env.PLACE || 'south-bay' });
await page.evaluate(() => { const W = window.__world; W.go(); W.pause(true); W.setView('road'); W.setHour('sang'); document.documentElement.classList.add('bare'); });
await page.addStyleTag({ content: '#top, #road, #bar, .pads, #intro, #arrive, #unit, #load, #speed { display: none !important }' });
for (const spot of spots) {
  const [x, z, span, name] = spot.split(',');
  await page.evaluate(async ([x, z, span, cut]) => {
    const W = window.__world; W.over(x, z, span, cut);
    for (let k = 0; k < 600; k++) { W.step(0.016); if (k % 10 === 0) await new Promise(r => setTimeout(r, 30)); if (k > 60 && W.settled(1)) break; }
    W.step(0.0001); W.renderOnce(); W.renderOnce();
  }, [+x, +z, +span, +cut]);
  const file = `${out}/top_${name || `${x}_${z}`}.png`; await page.screenshot({ path: file }); console.log(file);
}
if (logs.length) console.log('LOGS', logs.slice(0, 8).join('\n'));
await browser.close();
