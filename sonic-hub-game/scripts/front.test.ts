/* Checks the one rule for what stands up front on a shelf: a kind's highlights first, the one picked last before the
   others, then its newest games, two in all, whatever the shelf holds. And what that rule leans on in the catalogue
   file: every entry says the day it went on the shelf, and none says it is a highlight (the game service does).
   Run from the app's folder: npm test */
import { readFileSync } from 'node:fs';
import { FRONT, arrange, frontOf, takeStock } from '../src/arrange';
import { readCatalog, type Game, type Raw } from '../src/catalog';

const file = JSON.parse(readFileSync('public/catalog.json', 'utf8')) as { games: Raw[] };
const real = readCatalog(file);

let failed = 0, passed = 0;
function check(what: string, ok: boolean, saw: unknown = '') {
  if (ok) passed++;
  else { failed++; console.log(`  FAIL  ${what}${saw === '' ? '' : `: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`); }
}
const keys = (games: Game[]) => games.map(g => g.key);
const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;
const at = (n: number) => `2026-11-20T10:00:${String(n).padStart(2, '0')}.000Z`;
const game = (key: string, added: string | null, group = 'cards'): Raw => ({ key, title: key.toUpperCase(), group, added: added ?? undefined });
const shelfOf = (raws: Raw[], picks: [string, string][] = []) => arrange(takeStock(readCatalog({ games: raws }), 0), new Map(picks));
const frontOfKind = (raws: Raw[], picks: [string, string][] = [], kind = 'cards') => keys(shelfOf(raws, picks).groups.find(g => g.group.key === kind)!.games.slice(0, FRONT));

// ── the catalogue file ──
for (const r of file.games) {
  check(`catalog.json: "${r.key}" has to say the day it went on the shelf ("added": "YYYY-MM-DD"): the newest games of a kind stand up front`, /^\d{4}-\d{2}-\d{2}$/.test(r.added ?? ''), r.added ?? 'no day');
  check(`catalog.json: "${r.key}" must not say "highlight": highlights are picked on /admin and kept by the game service`, !('highlight' in r));
}
check('a highlight written in a catalogue file is not read', readCatalog({ games: [{ ...game('a', day(1)), highlight: true }] })[0].highlight === false);

// ── the rule ──
const five = [game('a', day(1)), game('b', day(5)), game('c', day(3)), game('d', day(5)), game('e', day(2))];
check('two stand up front', FRONT === 2);
check('nothing picked out: the two newest, and of two added the same day the one that comes first by name', frontOfKind(five).join() === 'b,d', frontOfKind(five));
check('one picked out: it comes first, then the newest of the others', frontOfKind(five, [['a', at(1)]]).join() === 'a,b', frontOfKind(five, [['a', at(1)]]));
check('two picked out: the one picked last first, whichever went on the shelf later', frontOfKind(five, [['e', at(1)], ['a', at(2)]]).join() === 'a,e', frontOfKind(five, [['e', at(1)], ['a', at(2)]]));
check('more than two picked out: the two picked last', frontOfKind(five, [['a', at(3)], ['e', at(2)], ['c', at(9)]]).join() === 'c,a', frontOfKind(five, [['a', at(3)], ['e', at(2)], ['c', at(9)]]));
check('a kind with one game shows that one', frontOfKind([game('solo', day(1), 'puzzle'), ...five], [], 'puzzle').join() === 'solo');
check('a game with no day comes after those that have one', frontOfKind([game('x', null), game('y', day(1)), game('z', day(2))]).join() === 'z,y');
check('a key picked out that the shelf has no game for changes nothing', frontOfKind(five, [['gone', at(5)]]).join() === 'b,d');
const picked = shelfOf(five, [['a', at(1)]]);
check('a game picked out carries the mark and the moment; the others do not', picked.byKey.get('a')!.highlight && picked.byKey.get('a')!.picked === at(1) && !picked.byKey.get('b')!.highlight && picked.byKey.get('b')!.picked === null);
check('each kind is ruled alone: a highlight in one does not move another',
  keys(shelfOf([...five, game('p', day(1), 'puzzle'), game('q', day(2), 'puzzle')], [['a', at(1)]]).groups.find(g => g.group.key === 'puzzle')!.games).join() === 'q,p');

// ── the real shelf, and a shelf of 10,000 ──
const picks: [string, string][] = [['muop', at(1)], ['len-doi', at(2)], ['medieval-mayhem-2', at(3)]];
const now = arrange(takeStock(real, 0), new Map(picks));
for (const { group, games } of now.groups) {
  check(`${group.name}: no more than ${FRONT} up front, and the one-pass pick agrees with the full order`, frontOf([...games].reverse()).map(g => g.key).join() === keys(games.slice(0, FRONT)).join());
}
const cards = now.groups.find(g => g.group.key === 'cards')!.games;
check('Card & Board as it stands: its highlight, then its newest', cards[0].key === 'medieval-mayhem-2' && cards[1].added === [...cards.slice(1)].map(g => g.added).sort().pop(), keys(cards.slice(0, 2)));

const stock = takeStock(real, 10000);
const t0 = performance.now(); const plain = arrange(stock); const first = performance.now() - t0;
const t1 = performance.now(); const again = arrange(stock, new Map(picks)); const second = performance.now() - t1;
check('on a shelf of 10,000 every kind still shows two', plain.groups.every(g => frontOf(g.games).length === FRONT && frontOf(g.games).every((x, i) => x === g.games[i])));
const moved = again.index.entries.filter((e, i) => e !== plain.index.entries[i]);
check('picking games out reads nothing again: only their own entries change, and keep what the search knew of their names',
  moved.length === picks.length && moved.every(e => e.game.highlight && e.tw === stock.index.entries.find(x => x.game.key === e.game.key)!.tw), moved.length);
check('a sample entry of the test shelf keeps the mark it was made with', again.games.filter(g => g.test && g.highlight).length === stock.games.filter(g => g.test && g.highlight).length && stock.games.some(g => g.test && g.highlight));
console.log(`${stock.games.length} entries: the shelf is laid out in ${first.toFixed(0)} ms, and again after a pick in ${second.toFixed(0)} ms`);
check('laying the shelf out again after a pick is quick', second < 150, `${second.toFixed(0)} ms`);

console.log(failed ? `${failed} failed, ${passed} passed` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
