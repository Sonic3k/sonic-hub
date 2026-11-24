// node arena/house.test.js — what the house bot (bots/house.js) is expected to see and to do at each of its levels.
const vm = require('vm'), path = require('path'), assert = require('assert');
const { ROOT, rules, Player, playGame } = require('./lib');
const R = rules(), HOUSE = path.join(ROOT, 'bots', 'house.js'), RANDOM = path.join(ROOT, 'bots', 'random.js');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const game = (a, b, opt) => playGame(R, a, b, Object.assign({ timeMs: 1000, seed: 5 }, opt));

const house = new Player(HOUSE), LEVELS = house.info.levels;
/** The lines the house bot draws, one after another, while it keeps the turn, from a position on n × n squares in
 *  which every line is drawn but those named; every square with four sides is someone's. */
function turnOf(level, n, open, turn, seed = 1) {
  house.ctx.__t = { level, n, open, turn, seed };
  return JSON.parse(vm.runInContext(`(() => {
    const t = __t, S = newGame(t.n), shut = new Set(t.open.map(x => lineAt(x, t.n)));
    for (let m = 0; m < S.line.length; m++) if (!shut.has(m)) { S.line[m] = 1; S.left--; for (const s of [S.g.lineSq[2 * m], S.g.lineSq[2 * m + 1]]) if (s >= 0) S.sides[s]++; }
    for (let s = 0; s < S.sides.length; s++) if (S.sides[s] === 4) { S.owner[s] = s % 2; S.score[s % 2]++; }
    S.turn = t.turn;
    let seed = t.seed; const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    const drawn = [];
    for (;;) {
      const m = __BOT.think(S, { level: t.level, size: t.n, timeMs: 1000, rand });
      drawn.push(lineName(m, t.n));
      const side = S.turn; playMove(S, m);
      if (S.over || S.turn !== side) break;
    }
    return JSON.stringify(drawn);                            // as text, so the answer is an array of this side
  })()`, house.ctx));
}
const column = (x, n) => [...Array(n + 1).keys()].map(y => 'abcdefgh'[x] + (y + 1) + '-' + 'abcdefgh'[x + 1] + (y + 1));   // the lines across in one column of squares

test('the house bot has five levels, weakest first', () => assert.deepStrictEqual(LEVELS, ['easy', 'casual', 'steady', 'sharp', 'master']));
test('from casual up it takes a square that opens nothing, and goes on taking', () => {
  // squares a1 and e5 have three sides; nothing else can be taken
  const open = ['a1-b1', 'e5-f5', ...column(2, 5)];
  for (const level of LEVELS.slice(1)) {
    const drawn = turnOf(level, 5, open, R.RED);
    assert.deepStrictEqual(drawn.slice(0, 2).sort(), ['a1-b1', 'e5-f5'], level);
  }
});
test('from steady up, handed a long chain with another to come, it takes all but two and hands those back', () => {
  // two chains of five, down columns a and e; Red has opened column a at the top: Gold takes three and draws the
  // bottom line a6-b6, so that Red has to take the last two and open column e
  const open = [...column(0, 5).slice(1), ...column(4, 5)];
  for (const level of ['steady', 'sharp', 'master']) assert.deepStrictEqual(turnOf(level, 5, open, R.GOLD), ['a2-b2', 'a3-b3', 'a4-b4', 'a6-b6'], level);
  const greedy = turnOf('casual', 5, open, R.GOLD);
  assert.deepStrictEqual(greedy.slice(0, 5), ['a2-b2', 'a3-b3', 'a4-b4', 'a5-b5', 'a6-b6'], 'casual takes the whole chain');
});
test('from steady up, handed the last chain, it takes it all', () => {
  const open = column(4, 5).slice(1);
  for (const level of ['steady', 'sharp', 'master']) assert.deepStrictEqual(turnOf(level, 5, open, R.GOLD), ['e2-f2', 'e3-f3', 'e4-f4', 'e5-f5', 'e6-f6'], level);
});
test('from steady up, made to open something, it gives the single square before a long chain', () => {
  // chains of five down columns a and c, and square e1 alone in its corner: given away, it makes the other side
  // open a chain of five
  const open = [...column(0, 5), ...column(2, 5), 'e1-f1', 'f1-f2'];
  for (const level of ['steady', 'sharp', 'master']) assert.ok(['e1-f1', 'f1-f2'].includes(turnOf(level, 5, open, R.RED)[0]), level);
});
test('on 7 × 7 too: all but two of a long chain when another is to come', () => {
  const open = [...column(0, 7).slice(1), ...column(6, 7)];
  for (const level of ['steady', 'master']) assert.deepStrictEqual(turnOf(level, 7, open, R.GOLD), ['a2-b2', 'a3-b3', 'a4-b4', 'a5-b5', 'a6-b6', 'a8-b8'], level);
});
test('every level plays whole games by the rules on both boards, and each beats the one below it more often than not', () => {
  for (const level of LEVELS) for (const size of [5, 7]) assert.strictEqual(game(new Player(HOUSE, level), new Player(RANDOM), { seed: 9, size }).forfeit, null, level + ' on ' + size);
  for (let i = 1; i < 4; i++) {   // master is left to the arena: it takes its time
    const lo = new Player(HOUSE, LEVELS[i - 1]), hi = new Player(HOUSE, LEVELS[i]); let w = 0;
    for (let g = 0; g < 12; g++) { const hiRed = g % 2 === 0, r = game(hiRed ? hi : lo, hiRed ? lo : hi, { seed: 40 + g, size: 5 }); if ((r.winner === R.RED) === hiRed) w++; }
    assert.ok(w >= 8, `${LEVELS[i]} won ${w} of 12 against ${LEVELS[i - 1]}`);
  }
});
test('the top level answers within its allowance, on a count of positions rather than on the clock', () => {
  const top = new Player(HOUSE, 'master');
  for (const size of [5, 7]) {
    const S = R.newGame(size);
    for (let i = 0; i < (size === 5 ? 24 : 50); i++) R.playMove(S, R.legalMoves(S)[(i * 7) % R.legalMoves(S).length]);
    const a = top.move(size, S.history, 1000, 1, 3000), b = top.move(size, S.history, 1000, 1, 3000);
    assert.strictEqual(a.move, b.move, 'the same position and seed give the same move'); assert.ok(a.ms < 1000, Math.round(a.ms) + ' ms');
  }
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
