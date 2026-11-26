// Builds the site into dist/:
//   places/<id>.html   one self-contained page per place (its script inline; three.js comes from the CDN)
//   world/<id>/…       the data a world loads as the eye moves (places/<id>/world/, written by its data/world.py);
//                      a world is a place whose meta says engine: 'world' (engine/world/app.js runs it)
//   index.html         the list of places
//   places.json        the same list as data, for Sonic Hub's Portal (served with CORS, see site/serve.json)
// usage: node build.mjs [--min]
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { eraOf, eraCss } from './engine/eras.js';
import { HUB } from './engine/hub.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const at = (...p) => path.join(root, ...p);
const min = process.argv.includes('--min');
// three is imported by its full address, so the page needs no import map (older phone browsers have none)
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vars)) throw new Error(`the template asks for {{${k}}}, which nothing provides`); return vars[k]; });

/** the years under the slider: every year when they fit, else only the two ends */
function yearsSlip(Y) {
  if (!Y || Y.to <= Y.from) return '';
  const n = Y.to - Y.from, all = n <= 9;
  const ticks = [];
  for (let y = Y.from; y <= Y.to; y++) if (all || y === Y.from || y === Y.to) ticks.push(`<span data-y="${y}">${y === Y.from || y === Y.to ? y : String(y).slice(2)}</span>`);
  return `<div id="years" class="slip">
    <label for="year"><span>Năm</span><output id="year-out" for="year">${Y.start}</output></label>
    <input type="range" id="year" min="${Y.from}" max="${Y.to}" step="1" value="${Y.start}">
    <div id="ticks" aria-hidden="true">${ticks.join('')}</div>
  </div>`;
}

/** a place's rooms as an outline, fitted into its own box (metres → a viewBox in centimetres) */
function planOf(rooms) {
  if (!rooms || !rooms.length) return null;
  const x0 = Math.min(...rooms.map(r => r.x0)), z0 = Math.min(...rooms.map(r => r.z0)), x1 = Math.max(...rooms.map(r => r.x1)), z1 = Math.max(...rooms.map(r => r.z1));
  const cm = v => Math.round(v * 100);
  return { box: [cm(x1 - x0), cm(z1 - z0)], rooms: rooms.map(r => [cm(r.x0 - x0), cm(r.z0 - z0), cm(r.x1 - r.x0), cm(r.z1 - r.z0)]) };
}
const planSvg = p => (p ? `<svg viewBox="-4 -4 ${p.box[0] + 8} ${p.box[1] + 8}" preserveAspectRatio="xMaxYMin meet" aria-hidden="true">${p.rooms.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" vector-effect="non-scaling-stroke"/>`).join('')}</svg>` : '');

async function buildPlace(id, tpls) {
  const meta = (await import(pathToFileURL(at('places', id, 'meta.js')).href)).default;
  if (meta.id !== id) throw new Error(`places/${id}/meta.js says its id is "${meta.id}"`);
  const world = meta.engine === 'world', tpl = world ? tpls.world : tpls.place;
  if (world && fs.existsSync(at('places', id, 'world'))) fs.cpSync(at('places', id, 'world'), at('dist', 'world', id), { recursive: true });
  const r = await build({
    stdin: { contents: `import place from './places/${id}/place.js';\nimport { run } from './engine/${world ? 'world/' : ''}app.js';\nrun(place);\n`, resolveDir: root, loader: 'js' },
    bundle: true, format: 'esm', external: ['three'], minify: min, write: false, target: 'es2020', legalComments: 'none',
  });
  const src = r.outputFiles[0].text;
  if (!/from\s*["']three["']/.test(src)) throw new Error('no import of three found');
  const js = src.replace(/from\s*["']three["']/g, 'from"' + THREE_URL + '"').replace(/<\/script/g, '<\\/script');
  const Y = meta.years || null, span = Y ? (Y.to > Y.from ? `${Y.from}–${Y.to}` : String(Y.from)) : '';
  const html = fill(tpl, {
    era: eraOf(Y ? Y.start : new Date().getFullYear()).key,
    era_css: eraCss(),
    page: esc(`${meta.title}${span ? ' ' + span : ''}`),
    title: esc(meta.title), sub: esc(meta.sub), sub_span: esc([meta.sub, span].filter(Boolean).join(' · ')),
    intro: esc(meta.intro), aria: esc(meta.aria || meta.title + '.'),
    hours: meta.hours.map((h, i) => `<button type="button" id="h-${esc(h.id)}" aria-pressed="${i === 0}">${esc(h.label)}</button>`).join(''),
    hours_hidden: meta.hours.length > 1 ? '' : ' hidden',
    years: yearsSlip(Y),
  }).replace('/*__BUNDLE__*/', () => js);
  fs.writeFileSync(at('dist', 'places', `${id}.html`), html);
  console.log(`dist/places/${id}.html`, (html.length / 1024).toFixed(1) + ' KB');
  const era = eraOf(Y ? Y.start : new Date().getFullYear());
  return { id, title: meta.title, sub: meta.sub, kind: meta.kind || '', where: meta.where || '', years: Y ? { from: Y.from, to: Y.to } : null, span, blurb: meta.blurb || '', path: `/places/${id}`, era: { paper: era.paper, ink: era.ink }, plan: planOf(meta.plan) };
}

fs.rmSync(at('dist'), { recursive: true, force: true });
fs.mkdirSync(at('dist', 'places'), { recursive: true });
const tpls = { place: fs.readFileSync(at('engine', 'page.html'), 'utf8'), world: fs.readFileSync(at('engine', 'world', 'page.html'), 'utf8') };
const ids = fs.readdirSync(at('places')).filter(d => fs.existsSync(at('places', d, 'place.js'))).sort();
const places = [];
for (const id of ids) places.push(await buildPlace(id, tpls));
// oldest first: the list reads as a life
places.sort((a, b) => (a.years ? a.years.from : 9999) - (b.years ? b.years.from : 9999) || a.title.localeCompare(b.title, 'vi'));

const cards = places.map(p => `<li><a class="place" href="${p.path}" style="--c:${p.era.ink};--p:${p.era.paper}">
      <span class="face">${planSvg(p.plan)}<span class="yrs">${esc(p.span)}</span><b>${esc(p.title)}</b></span>
      <span class="body">
        <span class="where">${esc([p.kind, p.where].filter(Boolean).join(' · '))}</span>
        <span class="sub">${esc(p.sub)}</span>
        <span class="blurb">${esc(p.blurb)}</span>
        <span class="go">Bước vào</span>
      </span>
    </a></li>`).join('\n    ');
fs.writeFileSync(at('dist', 'index.html'), fill(fs.readFileSync(at('site', 'index.html'), 'utf8'), { cards, hub: HUB, count: String(places.length) }));
fs.writeFileSync(at('dist', 'places.json'), JSON.stringify({ version: 1, name: 'Nơi chốn', places: places.map(({ span, ...p }) => p) }) + '\n');
for (const f of fs.readdirSync(at('site'))) if (f !== 'index.html') fs.copyFileSync(at('site', f), at('dist', f));
console.log('dist/index.html ·', places.length, 'place(s):', places.map(p => p.id).join(', '));
