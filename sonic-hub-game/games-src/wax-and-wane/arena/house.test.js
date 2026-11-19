// node arena/house.test.js — what the house bot (bots/house.js) is expected to see and to do at each of its levels.
const vm = require('vm'), path = require('path'), assert = require('assert');
const { ROOT, rules, Player, playGame } = require('./lib');
const R = rules(), HOUSE = path.join(ROOT, 'bots', 'house.js'), RANDOM = path.join(ROOT, 'bots', 'random.js');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const game = (a, b, opt) => playGame(R, a, b, Object.assign({ timeMs: 200, seed: 5 }, opt));

const DISC = { '.': 0, X: 1, O: 2 }, EMPTY_ROW = '........';
const rowsWith = (...pairs) => { const rows = new Array(8).fill(EMPTY_ROW); for (const [rank, row] of pairs) rows[rank - 1] = row; return rows; };
/** What the house bot makes of a position (64 numbers, a1 first) at a level: { move, score, depth, nodes }. */
function houseOn(house, squares, turn, level, seed = 1) {
  house.ctx.__t = { b: Array.from(squares), turn, level, seed };
  return JSON.parse(vm.runInContext('(() => { let s = __t.seed; const rand = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; }; return JSON.stringify(__BOT.think(position(__t.b, __t.turn), { level: __t.level, timeMs: 400, rand })); })()', house.ctx));
}
const houseAt = (house, rows, turn, level, seed) => houseOn(house, [...rows.join('')].map(ch => DISC[ch]), turn, level, seed);
/** how many discs the side to move ends ahead by with the best play on both sides, found the slow and certain way */
const buf = new Int8Array(64 * 34);
function bestEnd(S, alpha = -65, beta = 65, off = 0) {
  const n = R.gen(S, buf, off);
  if (!n) return S.count[S.turn] - S.count[1 - S.turn];
  let best = -65;
  for (let i = 0; i < n; i++) {
    R.make(S, buf[off + i]); const v = -bestEnd(S, -beta, -Math.max(alpha, best), off + n); R.unmake(S);
    if (v > best) { best = v; if (best >= beta) break; }
  }
  return best;
}

const house = new Player(HOUSE), LEVELS = house.info.levels;
test('the house bot has five levels, weakest first', () => assert.deepStrictEqual(LEVELS, ['new', 'crescent', 'quarter', 'gibbous', 'full']));
test('from crescent up it takes a corner that would otherwise go to the other side', () => {
  // a1 encloses b1 for Dark, and a2 for Light if Dark leaves it; the four moves of the opening are there as well
  const rows = rowsWith([1, '.OX.....'], [2, 'X.......'], [3, 'O.......'], [4, '...OX...'], [5, '...XO...']);
  for (const level of LEVELS.slice(1)) for (let seed = 1; seed <= 10; seed++) assert.strictEqual(R.sqName(houseAt(house, rows, R.DARK, level, seed).move), 'a1', level);
});
test('from quarter up it does not open a corner to the other side while it has another move', () => {
  // b2 turns c3, and then Light takes a1 along the diagonal; f5, e6 and f6 give nothing away
  const rows = rowsWith([3, '..O.....'], [4, '...XX...'], [5, '...XO...']);
  for (const level of LEVELS.slice(2)) for (let seed = 1; seed <= 8; seed++) assert.notStrictEqual(R.sqName(houseAt(house, rows, R.DARK, level, seed).move), 'b2', level);
});
test('where a level plays the game out, it plays it as well as it can be played', () => {
  const rand = rng(31);
  for (const [level, left] of [['quarter', 5], ['gibbous', 8], ['full', 10]]) {
    for (let found = 0; found < 3;) {
      const S = R.newGame();
      while (!S.over && S.empties > left) { const ms = R.legalMoves(S); R.playMove(S, ms[Math.floor(rand() * ms.length)]); }
      if (S.over || S.empties !== left || R.legalMoves(S).length < 3) continue;
      const best = bestEnd(S), r = houseOn(house, S.b, S.turn, level, found + 1);
      assert.strictEqual(r.score, best, `${level}: it reckons ${r.score}, and the game is worth ${best}`);
      R.make(S, r.move); const got = -bestEnd(S); R.unmake(S);
      assert.strictEqual(got, best, `${level} with ${left} squares left played ${R.sqName(r.move)} for ${got}; ${best} was there`);
      found++;
    }
  }
});
test('every level plays whole games by the rules, and each beats the one below it more often than not', () => {
  for (const level of LEVELS) assert.strictEqual(game(new Player(HOUSE, level), new Player(RANDOM), { seed: 9 }).forfeit, null, level);
  for (let i = 1; i < 4; i++) {   // the top level is left to the arena: it takes its time
    const lo = new Player(HOUSE, LEVELS[i - 1]), hi = new Player(HOUSE, LEVELS[i]); let w = 0;
    for (let g = 0; g < 12; g++) { const hiDark = g % 2 === 0, r = game(hiDark ? hi : lo, hiDark ? lo : hi, { seed: 40 + g }); if (r.winner >= 0 && (r.winner === R.DARK) === hiDark) w++; }
    assert.ok(w >= 8, `${LEVELS[i]} won ${w} of 12 against ${LEVELS[i - 1]}`);
  }
});
test('the top level answers within its allowance, on a count of positions rather than on the clock', () => {
  const top = new Player(HOUSE, 'full'), opening = ['f5', 'f6', 'e6', 'f4', 'e3'].map(R.sqOf);
  for (const history of [[], opening]) {
    const a = top.move(history, 1000, 1, 3000), b = top.move(history, 1000, 1, 3000);
    assert.strictEqual(a.move, b.move, 'the same position and seed give the same move'); assert.ok(a.ms < 1000 && b.ms < 1000, Math.round(Math.max(a.ms, b.ms)) + ' ms');
  }
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
