/* Checks that search finds what it should on a full shelf: the real games buried among 10,000 sample entries.
   Run from the app's folder: npm test */
import { readFileSync } from 'node:fs';
import { toGame, type Game } from '../src/catalog';
import { buildIndex, markTitle, search, searchShelves, type Shelf } from '../src/search';
import { makeTestShelf } from '../src/testShelf';
import { GROUPS, MACHINES } from '../src/taxonomy';

const real: Game[] = JSON.parse(readFileSync('public/catalog.json', 'utf8')).games.map(toGame);
const shelf = [...real, ...makeTestShelf(10000, new Set(real.map(g => g.key)))];
const t0 = performance.now();
const index = buildIndex(shelf);
const built = performance.now() - t0;

let failed = 0, passed = 0;
const rank = (q: string, key: string) => search(index, q).findIndex(h => h.game.key === key) + 1;
function finds(q: string, key: string, within = 1) {
  const r = rank(q, key);
  if (r >= 1 && r <= within) passed++;
  else { failed++; console.log(`  FAIL  "${q}" should find ${key} in the first ${within}; it is ${r ? '#' + r : 'not found'}. Top: ${search(index, q, { limit: 3 }).map(h => h.game.title).join(' | ')}`); }
}

// the plain name, with and without accents, in any case
finds('Mướp và Mười Hai Ngọn Đèn', 'muop'); finds('muop', 'muop'); finds('MUOP', 'muop'); finds('mướp', 'muop');
finds('muoi hai ngon den', 'muop'); finds('den muop', 'muop'); finds('twelve lanterns', 'muop');
finds('tim 4', 'tim-4'); finds('tím 4', 'tim-4'); finds('tim4', 'tim-4'); finds('tim iv', 'tim-4');
finds('len doi', 'len-doi'); finds('lên đời', 'len-doi'); finds('lendoi', 'len-doi'); finds('age duel', 'len-doi');
finds('ong trum', 'forum-tycoon'); finds('4rum', 'forum-tycoon'); finds('forum tycoon', 'forum-tycoon'); finds('forumtycoon', 'forum-tycoon'); finds('ông trùm forum', 'forum-tycoon');
// part of the name, words in any order, the last one half typed
finds('medieval mayhem 2', 'medieval-mayhem-2'); finds('medieval mayhem ii', 'medieval-mayhem-2'); finds('mayh med', 'medieval-mayhem-2'); finds('mm2', 'medieval-mayhem-2');
finds('mayhem', 'medieval-mayhem-2', 3); finds('mayhem', 'mayhem-classic', 3); finds('mayhem cl', 'mayhem-classic');
finds('masks and mortar', 'masks-and-mortar'); finds('masks mortar', 'masks-and-mortar'); finds('masksmortar', 'masks-and-mortar'); finds('mortar', 'masks-and-mortar');
// other names
finds('citadels', 'masks-and-mortar'); finds('dungeon mayhem', 'mayhem-classic'); finds('civ clash', 'medieval-mayhem-2'); finds('mario 4', 'tim-4');
// slips of the fingers
finds('medeival mayhem', 'medieval-mayhem-2', 2); finds('mahyem classic', 'mayhem-classic'); finds('citadles', 'masks-and-mortar'); finds('forum tycon', 'forum-tycoon');
finds('masks and morter', 'masks-and-mortar'); finds('lanterns twelv', 'muop');
// a game kept from the web is found like any other
finds('saltline', 'saltline'); finds('salt line', 'saltline'); finds('saltlin', 'saltline'); finds('satline', 'saltline', 3);

// every sample entry is found by its own name, typed plainly and typed without accents
const sample = shelf.filter(g => g.test).filter((_, i) => i % 37 === 0);
let exact = 0, bare = 0, slip = 0, slipN = 0, half = 0;
for (const g of sample) {
  if (rank(g.title, g.key) === 1) exact++;
  if (rank(g.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase(), g.key) === 1) bare++;
  const words = g.title.split(' '), long = words.findIndex(w => w.length >= 6);
  if (long >= 0) { // swap two letters inside a long word
    const w = words[long], typo = w.slice(0, 2) + w[3] + w[2] + w.slice(4);
    slipN++; const r = rank(words.map((x, i) => (i === long ? typo : x)).join(' '), g.key); if (r >= 1 && r <= 5) slip++;
  }
  const r = rank(g.title.slice(0, Math.max(4, g.title.length - 3)), g.key); if (r >= 1 && r <= 8) half++;
}
const pct = (a: number, b: number) => `${a}/${b}`;
console.log(`sample of ${sample.length}: exact name first ${pct(exact, sample.length)}, without accents first ${pct(bare, sample.length)}, one slip in the first five ${pct(slip, slipN)}, name cut short in the first eight ${pct(half, sample.length)}`);
if (exact !== sample.length) { failed++; console.log('  FAIL  an entry is not first for its own name'); } else passed++;
if (bare !== sample.length) { failed++; console.log('  FAIL  an entry is not first for its own name typed without accents'); } else passed++;
if (slip < slipN * 0.95) { failed++; console.log('  FAIL  too many slips lose the game'); } else passed++;
if (half < sample.length * 0.9) { failed++; console.log('  FAIL  too many half-typed names lose the game'); } else passed++;

// shelves
const shelves: Shelf[] = [...GROUPS.map(g => ({ kind: 'group' as const, key: g.key, name: g.name, to: '' })),
  ...GROUPS.flatMap(g => g.subs.map(s => ({ kind: 'sub' as const, key: s.key, name: s.name, note: g.name, to: '' }))),
  ...MACHINES.map(m => ({ kind: 'machine' as const, key: m.key, name: m.name, to: '' }))];
const shelfIs = (q: string, key: string) => { if (searchShelves(shelves, q)[0]?.key === key) passed++; else { failed++; console.log(`  FAIL  shelf "${q}" should be ${key}, got ${searchShelves(shelves, q).map(s => s.key)}`); } };
shelfIs('plat', 'platformer'); shelfIs('card', 'cards'); shelfIs('nes', 'nes'); shelfIs('tower def', 'tower-defense'); shelfIs('rpg', 'rpg'); shelfIs('flash', 'flash');

// marking
const m = markTitle('Mướp và Mười Hai Ngọn Đèn', 'muoi den').filter(p => p.hit).map(p => p.text).join('+');
if (m === 'Mười+Đèn') passed++; else { failed++; console.log('  FAIL  marking gave', m); }

// speed on the full shelf
const qs = ['m', 'ma', 'mayhem', 'tiny fox', 'iron circuit 3', 'xep gach', 'the lost', 'qqqq', 'solitaire club', 'empire of the', 'medeival', 'dua xe', 'mm2', 'turbo k'];
const t1 = performance.now(); let n = 0;
for (let i = 0; i < 5; i++) for (const q of qs) { search(index, q, { limit: 8 }); n++; }
const per = (performance.now() - t1) / n;
console.log(`${shelf.length} entries: index built in ${built.toFixed(0)} ms, a search takes ${per.toFixed(1)} ms on average`);
if (per > 40) { failed++; console.log('  FAIL  search is too slow'); } else passed++;

console.log(failed ? `${failed} failed, ${passed} passed` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
