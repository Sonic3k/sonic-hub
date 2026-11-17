/* Checks how the shelf carries a visitor's code from one game's site to the next (src/code.ts).
   Run from the app's folder: npm test */
import { readFileSync } from 'node:fs';
import { toGame, type Game } from '../src/catalog';
import { heldCode, splitHash, takeCodeFromAddress, tidyCode, withCode } from '../src/code';

let failed = 0, passed = 0;
function same(what: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else { failed++; console.log(`  FAIL  ${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
}

const CODE = 'K7QM-2XPD-9RBT';

// a code is twelve of thirty-one signs, however it is typed
same('as shown', tidyCode(CODE), CODE);
same('small letters, spaces', tidyCode(' k7qm 2xpd 9rbt '), CODE);
same('no dashes', tidyCode('K7QM2XPD9RBT'), CODE);
for (const bad of ['', 'hello', 'K7QM-2XPD-9RB', 'K7QM-2XPD-9RBTT', 'K7QM-2XPD-9RB0', 'K7QM-2XPD-9RBI', 'K7QM-2XPD-9RBO', 'K7QM-2XPD-9RB1', 'K7QM-2XPD-9RBL', '<b>K7QM-2XPD</b>']) same(`not a code: "${bad}"`, tidyCode(bad), null);

// the part of the address after #
same('none there', splitHash(''), { had: false, code: null, rest: '' });
same('something else', splitHash('#chapter-3'), { had: false, code: null, rest: '#chapter-3' });
same('a code', splitHash(`#code=${CODE}`), { had: true, code: CODE, rest: '' });
same('a code as a browser writes it', splitHash(`#code=${encodeURIComponent('k7qm 2xpd 9rbt')}`), { had: true, code: CODE, rest: '' });
same('among other things', splitHash(`#room=2&code=${CODE}&x=1`), { had: true, code: CODE, rest: '#room=2&x=1' });
same('not a code', splitHash('#code=not-one'), { had: true, code: null, rest: '' });
same('badly written', splitHash('#code=%E0%A4%A'), { had: true, code: null, rest: '' });

// leaving: only a whole https address gets the code, and only when there is one
same('with a code', withCode('https://game.example/', CODE), `https://game.example/#code=${CODE}`);
same('after what is there', withCode('https://game.example/#room=2', CODE), `https://game.example/#room=2&code=${CODE}`);
same('no code held', withCode('https://game.example/', null), 'https://game.example/');
same('a page of this site', withCode('/games/keep-it-down', CODE), '/games/keep-it-down');
same('plain http', withCode('http://game.example/', CODE), 'http://game.example/');
same('something else', withCode('javascript:alert(1)', CODE), 'javascript:alert(1)');

// arriving: a browser page, stood in for
function page(url: string, kept: Record<string, string> = {}) {
  const at = new URL(url), store = new Map(Object.entries(kept)), replaced: string[] = [];
  Object.assign(globalThis, {
    location: { get hash() { return at.hash; }, get pathname() { return at.pathname; }, get search() { return at.search; } },
    history: { state: { idx: 3 }, replaceState: (_state: unknown, _title: string, to: string) => { replaced.push(to); at.href = new URL(to, at).href; } },
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  });
  return { at, store, replaced };
}
let p = page(`https://shelf.example/game/keep-it-down-extended?from=x#code=${CODE}`);
takeCodeFromAddress();
same('a code handed over is kept', [heldCode(), p.store.get('sonic-hub.code')], [CODE, CODE]);
same('and wiped off the address, the rest of which stays', [p.replaced, p.at.href], [['/game/keep-it-down-extended?from=x'], 'https://shelf.example/game/keep-it-down-extended?from=x']);
p = page('https://shelf.example/#code=2345-6789-ABCD', { 'sonic-hub.code': CODE });
takeCodeFromAddress();
same('a browser that has a code keeps its own', [heldCode(), p.at.href], [CODE, 'https://shelf.example/']);
p = page('https://shelf.example/#code=nonsense&tab=2');
takeCodeFromAddress();
same('what cannot be a code is wiped and not kept', [heldCode(), p.at.href], [null, 'https://shelf.example/#tab=2']);
p = page('https://shelf.example/browse#tab=2');
takeCodeFromAddress();
same('an address without one is left alone', [p.replaced, heldCode()], [[], null]);
p = page('https://shelf.example/', { 'sonic-hub.code': 'spoiled' });
same('a spoiled code is not one', heldCode(), null);
Object.assign(globalThis, { localStorage: { getItem: () => { throw new Error('no storage'); }, setItem: () => { throw new Error('no storage'); } } });
same('a browser that keeps nothing has none, and nothing breaks', [heldCode(), withCode('https://game.example/')], [null, 'https://game.example/']);

// the shelf as it stands: only games that keep their players with the service are handed the code
const games: Game[] = JSON.parse(readFileSync('public/catalog.json', 'utf8')).games.map(toGame);
const handed = games.filter(g => g.saves);
same('games that are handed the code', handed.map(g => g.key), ['keep-it-down-extended']);
for (const g of handed) same(`${g.key} is a page of its own on the web`, [/^https:\/\/[^/]+\//.test(g.play ?? ''), g.frame], [true, null]);
same('someone else’s file is never handed it', toGame({ key: 'x', title: 'X', group: 'cards', frame: { file: '/kept/x.html' }, saves: true }).saves, false);

console.log(`${passed} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
