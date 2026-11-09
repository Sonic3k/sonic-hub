/* Copies js-dos (DOSBox in WebAssembly, which plays his DOS games inside the old machines) from node_modules into
   public/jsdos/, so the site serves it itself. Runs before dev and build; the copy is not committed. Only the player,
   its stylesheet and the plain DOSBox backend are taken (no DOSBox-X, no debug builds, no source maps). */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(dirname(createRequire(import.meta.url).resolve('js-dos/package.json')), 'dist');
const out = join(root, 'public', 'jsdos');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'emulators'), { recursive: true });
const files = ['js-dos.js', 'js-dos.css', 'emulators/emulators.js', 'emulators/wdosbox.js', 'emulators/wdosbox.wasm',
  'emulators/wlibzip.js', 'emulators/wlibzip.wasm'];
for (const f of files) cpSync(join(src, f), join(out, f));
console.log(`js-dos: ${files.length} files -> public/jsdos/`);
