// What the tools share: headless Chrome through Playwright (software WebGL), three.js served from node_modules in
// place of the CDN, and a built place page opened and ready. Run the tools from the module's folder, after a build.
//   PLACE=<id>      which place (default: the first under places/)
//   CHROME=<path>   the browser (default: /usr/bin/google-chrome)
//   PLAYWRIGHT=<dir with node_modules/playwright>   (default: this module's own, else /opt/npm-tools)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

export const PLACE = process.env.PLACE || fs.readdirSync('places').filter(d => fs.existsSync(`places/${d}/place.js`)).sort()[0];
export const pageFile = (place = PLACE) => path.resolve(`dist/places/${place}.html`);

function playwright() {
  for (const base of [process.env.PLAYWRIGHT, process.cwd(), '/opt/npm-tools'].filter(Boolean)) {
    try { return createRequire(path.join(base, 'node_modules') + '/')('playwright'); } catch { /* try the next */ }
  }
  throw new Error('Playwright not found: npm i -D playwright, or set PLAYWRIGHT to a folder that has it');
}

export async function launch() {
  const { chromium } = playwright();
  return chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'] });
}

/** Opens a place's page. o: { width, height, dpr (device pixels per CSS pixel), mobile, place, query ('?at=…'), hash ('#bep'), wait (for the place to be built), pause (stop its own frame loop) } */
export async function open(browser, o = {}) {
  const { width = 1280, height = 720, dpr = 1, mobile = width < 700, place = PLACE, query = '', hash = '', wait = true, pause = true } = o;
  const three = fs.readFileSync('node_modules/three/build/three.module.min.js');
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage(); const logs = [];
  page.on('pageerror', e => logs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) logs.push('console ' + m.text()); });
  // a world fetches its data as it goes, which a page opened from a file may not: it is served from dist/ under a made-up address
  const world = fs.existsSync(`dist/world/${place}`), SITE = 'http://world.test/';
  const types = { html: 'text/html', json: 'application/json', js: 'text/javascript', svg: 'image/svg+xml' };
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('file://')) return route.continue();
    if (u.endsWith('/three.module.min.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: three });
    if (u.startsWith(SITE)) { const f = path.resolve('dist', decodeURIComponent(new URL(u).pathname).replace(/^\/+/, '')); return fs.existsSync(f) && fs.statSync(f).isFile() ? route.fulfill({ status: 200, contentType: types[f.split('.').pop()] || 'application/octet-stream', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: 'not found' }); }
    return route.abort();
  });
  await page.goto((world ? `${SITE}places/${place}.html` : 'file://' + pageFile(place)) + query + hash);
  if (wait) {
    const ok = await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 120000 }).then(() => true).catch(() => false);
    if (!ok) { console.log('NOT READY'); console.log(logs.join('\n')); await browser.close(); process.exit(1); }
    if (pause) await page.evaluate(() => window.__world.pause(true));
  }
  return { page, ctx, logs };
}
