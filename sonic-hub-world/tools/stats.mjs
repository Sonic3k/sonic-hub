// Triangles and meshes per part of a place: PLACE=<id> node tools/stats.mjs
import { launch, open } from './lib.mjs';
const browser = await launch();
const { page } = await open(browser, { width: 640, height: 400 });
const s = await page.evaluate(() => window.__world.stats());
const rows = Object.entries(s).sort((a, b) => b[1][0] - a[1][0]);
let t = 0; for (const [k, [tris, n]] of rows) { t += tris; console.log(String(tris).padStart(9), String(n).padStart(5), ' ', k); }
console.log(String(t).padStart(9), '      total');
await browser.close();
