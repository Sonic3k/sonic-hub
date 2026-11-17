/* Puts the game together as one self-contained page: src/shell.html + src/engine/*.js + src/game/*.js → dist/index.html
   The rules and the computer player go into their own <script id="engine">, so the page can start the same text
   again as a worker and let the computer think without holding up the drawing. */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const all = dir => readdirSync(join(root, 'src', dir)).filter(f => f.endsWith('.js')).sort().map(f => readFileSync(join(root, 'src', dir, f), 'utf8')).join('\n');
const page = readFileSync(join(root, 'src', 'shell.html'), 'utf8').replace('/*__ENGINE__*/', () => all('engine')).replace('/*__JS__*/', () => all('game'));
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), page);
console.log('built dist/index.html', Math.round(Buffer.byteLength(page) / 1024), 'KB');
