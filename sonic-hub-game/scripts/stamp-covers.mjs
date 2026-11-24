/* A game's pictures keep their names when they are taken again (caro-title-640.webp is the same name whatever is on
   it), and a browser keeps a picture for a while without asking for it again (serve.json). Left at that, whoever
   looked at the shelf shortly before a picture changed goes on seeing the old one, on some pages and not on others,
   until the browser lets go of it.

   So the catalogue that is served says, of each game that has pictures, what they are right now: `stamp`, a few
   letters made from the bytes of its cover files. The page puts the stamp into their addresses (cover() in
   src/catalog.ts): a picture that changed is at another address and is fetched at once, and one that did not change
   is still found where the browser kept it.

   Run after the page is built, which `npm run build` does: it reads the covers in dist/ and writes dist/catalog.json.
   The catalogue in public/ stays as it is written by hand, with no stamp in it, and a page run from the sources
   (`npm run dev`) asks for pictures by name alone.

     node scripts/stamp-covers.mjs [folder]      (the built page's folder; dist if not given) */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(process.argv[2] ?? join(ROOT, 'dist'));
const WIDTHS = [640, 1280];

const file = join(DIST, 'catalog.json');
const catalogue = JSON.parse(await readFile(file, 'utf8'));
let stamped = 0;
const absent = [];
for (const game of catalogue.games) {
  delete game.stamp;                                  // never one carried over: it is made from what is there now
  if (!game.shots?.length) continue;
  const hash = createHash('sha256');
  let found = 0;
  for (const shot of game.shots) for (const width of WIDTHS) {
    const name = `${game.key}-${shot}-${width}.webp`;
    try { hash.update(name).update(await readFile(join(DIST, 'covers', name))); found++; } catch { absent.push(name); }
  }
  if (!found) continue;
  game.stamp = hash.digest('hex').slice(0, 10);
  stamped++;
}
await writeFile(file, JSON.stringify(catalogue));
console.log(`covers: the pictures of ${stamped} games stamped in ${file}`);
if (absent.length) console.log(`covers: the catalogue names pictures that are not there: ${absent.join(', ')}`);
