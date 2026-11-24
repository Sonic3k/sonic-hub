// node arena/league.test.js — the league's table (three points for a win, who had which colour), each board's league
// kept apart, and the leagues that are kept: every game in arena/league-5x5.json and arena/league-7x7.json plays
// through by the rules to the result written down.
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { ROOT, rules } = require('./lib'), { table, rated, seedOf, pack, unpack, fileOf, ratingsOf } = require('./league');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const quietly = fn => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const pool = ['a:x', 'b:x', 'c:x'].map(id => ({ id, name: id, author: 'test', model: 'nobody' })), time = [{ moves: 30, mean: 5, max: 9, late: 0 }, { moves: 30, mean: 7, max: 30, late: 1 }];
const game = (round, red, gold, result, forfeit = null) => ({ round, red, gold, result, why: forfeit ? 'forfeit' : 'squares', score: result === 'red' ? [15, 10] : [9, 16], plies: 60, moves: '', forfeit, time });

test('a win is three points, a loss none; the table is in order of points', () => {
  const rows = quietly(() => table(pool, [game(1, 'a:x', 'b:x', 'red'), game(1, 'b:x', 'a:x', 'red'), game(1, 'a:x', 'c:x', 'gold'), game(1, 'c:x', 'a:x', 'gold'), game(1, 'b:x', 'c:x', 'red'), game(1, 'c:x', 'b:x', 'gold')], 1000, 5));
  assert.deepStrictEqual(rows.map(r => [r.id, r.played, r.won, r.drawn, r.lost, r.points]).sort(), [['a:x', 4, 2, 0, 2, 6], ['b:x', 4, 3, 0, 1, 9], ['c:x', 4, 1, 0, 3, 3]]);
  assert.deepStrictEqual(rows.map(r => r.id), ['b:x', 'a:x', 'c:x']);
});
test('each player’s games are counted by the colour it had: won, drawn, lost; and its squares for and against', () => {
  const rows = quietly(() => table(pool, [game(1, 'a:x', 'b:x', 'red'), game(1, 'b:x', 'a:x', 'red'), game(1, 'a:x', 'c:x', 'gold'), game(1, 'c:x', 'a:x', 'gold')], 1000, 5));
  const a = rows.find(r => r.id === 'a:x'), c = rows.find(r => r.id === 'c:x');
  assert.deepStrictEqual([a.red, a.gold], [[1, 0, 1], [1, 0, 1]]); assert.deepStrictEqual([c.red, c.gold], [[0, 0, 1], [1, 0, 0]]);
  assert.deepStrictEqual([a.squaresFor, a.squaresAgainst], [15 + 10 + 9 + 16, 10 + 15 + 16 + 9]);
});
test('the stronger rates higher; a game lost by forfeit is marked against the one that broke; time over the allowance is counted', () => {
  const rows = quietly(() => table(pool, [game(1, 'a:x', 'b:x', 'red'), game(1, 'b:x', 'a:x', 'gold', { by: 'b:x', why: 'broke' })], 1000, 7));
  const a = rows.find(r => r.id === 'a:x'), b = rows.find(r => r.id === 'b:x');
  assert.ok(a.rating > b.rating); assert.deepStrictEqual([a.forfeits, b.forfeits, a.late + b.late], [0, 1, 2]);
});
test('the ratings the game goes by are each board’s own: a line a player, strongest first, with what it is and how it did', () => {
  const games = [game(1, 'a:x', 'b:x', 'red'), game(1, 'b:x', 'a:x', 'gold'), game(1, 'a:x', 'c:x', 'red'), game(1, 'c:x', 'a:x', 'gold'), game(1, 'b:x', 'c:x', 'gold'), game(2, 'c:x', 'b:x', 'red')];
  const r = rated(pool, games, 1000, 7);
  assert.deepStrictEqual([r.size, r.ms, r.games, r.rounds, r.anchor.id], [7, 1000, 6, 2, 'a:x']);
  assert.deepStrictEqual(r.players.map(p => [p.id, p.bot, p.level, p.name, p.model, p.played, p.won, p.drawn, p.lost, p.points]), [['a:x', 'a', 'x', 'a:x', 'nobody', 4, 4, 0, 0, 12], ['c:x', 'c', 'x', 'c:x', 'nobody', 4, 2, 0, 2, 6], ['b:x', 'b', 'x', 'b:x', 'nobody', 4, 0, 0, 4, 0]]);
  assert.ok(r.players.every(p => Number.isInteger(p.rating)) && r.players[0].rating > r.players[1].rating && r.players[1].rating > r.players[2].rating);
  assert.deepStrictEqual([path.basename(fileOf(5)), path.basename(fileOf(7)), path.basename(ratingsOf(5)), path.basename(ratingsOf(7))], ['league-5x5.json', 'league-7x7.json', 'ratings-5x5.json', 'ratings-7x7.json']);
});
test('a game’s seed is its board, its round and its two players in their colours, and nothing else', () => {
  assert.strictEqual(seedOf(5, 2, 'a:x', 'b:x'), seedOf(5, 2, 'a:x', 'b:x'));
  assert.strictEqual(new Set([seedOf(5, 1, 'a:x', 'b:x'), seedOf(7, 1, 'a:x', 'b:x'), seedOf(5, 2, 'a:x', 'b:x'), seedOf(5, 1, 'b:x', 'a:x'), seedOf(5, 1, 'a:x', 'c:x')]).size, 5);
  assert.ok(seedOf(7, 3, 'a:x', 'b:x') > 0 && seedOf(7, 3, 'a:x', 'b:x') < 2 ** 31);
});
test('a game’s lines are kept two letters a line, and read back as they were', () => {
  const all = [...Array(112).keys()];
  assert.strictEqual(pack([0, 35, 36, 111]), '000z1033'); assert.deepStrictEqual(unpack(pack(all)), all); assert.deepStrictEqual(unpack(''), []);
});

/* the leagues that are kept */
const R = rules();
for (const size of [5, 7]) {
  const file = fileOf(size), kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!kept) continue;
  test(`${size} × ${size}: every game kept plays through by the rules to the squares and the result written down`, () => {
    assert.strictEqual(kept.size, size);
    for (const [n, g] of kept.games.entries()) {
      const S = R.newGame(size), at = `game ${n + 1} (r${g.round} ${g.red} v ${g.gold})`;
      for (const m of unpack(g.moves)) assert.ok(R.playMove(S, m), `${at}: line ${m} cannot be drawn at move ${S.history.length + 1}`);
      assert.strictEqual(S.history.length, g.plies, at + ': how many lines');
      assert.deepStrictEqual(Array.from(S.score), g.score, at + ': squares');
      if (g.forfeit) {
        assert.ok(!S.over, at + ': forfeited, yet the game had ended'); assert.strictEqual(g.why, 'forfeit');
        assert.strictEqual(g.forfeit.by, S.turn === R.RED ? g.red : g.gold, at + ': the side to move is the one that forfeits'); assert.strictEqual(g.result, S.turn === R.RED ? 'gold' : 'red');
      } else {
        assert.ok(S.over, at + ': the game is not over where the record stops');
        assert.strictEqual(g.result, g.score[0] > g.score[1] ? 'red' : 'gold', at + ': more squares wins');
      }
    }
  });
  test(`${size} × ${size}: every pair has met as often as every other, the same number of times with each colour`, () => {
    const ids = kept.players.map(p => p.id).filter(id => kept.games.some(g => g.red === id || g.gold === id)), met = new Map();
    for (const g of kept.games) met.set(g.red + '\n' + g.gold, (met.get(g.red + '\n' + g.gold) || 0) + 1);
    const rounds = Math.max(...kept.games.map(g => g.round)), short = [];
    for (const a of ids) for (const b of ids) if (a !== b && met.get(a + '\n' + b) !== rounds) short.push(`${a} (Red) v ${b}: ${met.get(a + '\n' + b) || 0}`);
    assert.deepStrictEqual(short.slice(0, 5), [], `${short.length} pairings have not played ${rounds} games: node arena/league.js --size ${size}`);
    assert.strictEqual(new Set(kept.games.map(g => `${g.round} ${g.red} ${g.gold}`)).size, kept.games.length, 'a game is kept twice');
  });
  test(`${size} × ${size}: no bot has changed since it joined the league, and each has its writer written down`, () => {
    const writers = JSON.parse(fs.readFileSync(path.join(ROOT, 'bots', 'written-by.json'), 'utf8'));
    for (const p of kept.players) {
      const f = path.join(ROOT, 'bots', p.bot + '.js');
      assert.ok(fs.existsSync(f), `bots/${p.bot}.js is in the league and not in bots/`);
      assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16), p.sha, `bots/${p.bot}.js is not the file that played: a changed bot is another player`);
      assert.ok(writers[p.bot] && writers[p.bot].model, `bots/written-by.json does not say who wrote ${p.bot}`); assert.strictEqual(p.model, writers[p.bot].model);
    }
  });
  test(`${size} × ${size}: its ratings file is what its games give`, () => {
    const on = JSON.parse(fs.readFileSync(ratingsOf(size), 'utf8'));
    assert.deepStrictEqual(on, rated(kept.players, kept.games, kept.ms, size), `${path.basename(ratingsOf(size))} is out of date: node arena/league.js --size ${size} --table --ratings`);
  });
}
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
