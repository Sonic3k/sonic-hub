// Bundles src/main.js (three stays external: the page loads it from the CDN)
// and inlines the result into the page template.
import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'esm', external: ['three'], minify: process.argv.includes('--min'), write: false, target: 'es2020', legalComments: 'none' });
// three is imported by its full address, so the page needs no import map (older phone browsers have none)
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js';
const src = r.outputFiles[0].text, n = (src.match(/from\s*["']three["']/g) || []).length;
if (n < 1) throw new Error('no import of three found');
const js = src.replace(/from\s*["']three["']/g, 'from"' + THREE_URL + '"').replace(/<\/script/g, '<\\/script');
const tpl = fs.readFileSync('src/index.template.html', 'utf8');
const html = tpl.replace('/*__BUNDLE__*/', () => js);
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(1) + ' KB', 'js', (js.length / 1024).toFixed(1) + ' KB');
