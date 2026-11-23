// node arena/league.test.js — the league's table (three points for a win, one for a draw, who had which colour), and
// the league that is kept: every game in arena/league.json plays through by the rules to the result written down.
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { ROOT, rules } = require('./lib'), { table, rated, seedOf } = require('./league');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const quietly = fn => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const pool = ['a:x', 'b:x', 'c:x'].map(id => ({ id, name: id, author: 'test', model: 'nobody' })), time = [{ moves: 30, mean: 5, max: 9, late: 0 }, { moves: 30, mean: 7, max: 30, late: 1 }];
const game = (round, dark, light, result, forfeit = null) => ({ round, dark, light, result, why: 'full', discs: result === 'draw' ? [32, 32] : result === 'dark' ? [40, 24] : [20, 44], plies: 60, moves: '', forfeit, time });

test('a win is three points, a draw one, a loss none; the table is in order of points', () => {
  const rows = quietly(() => table(pool, [game(1, 'a:x', 'b:x', 'dark'), game(1, 'b:x', 'a:x', 'draw'), game(1, 'a:x', 'c:x', 'light'), game(1, 'c:x', 'a:x', 'light'), game(1, 'b:x', 'c:x', 'dark'), game(1, 'c:x', 'b:x', 'light')], 1000));
  assert.deepStrictEqual(rows.map(r => [r.id, r.played, r.won, r.drawn, r.lost, r.points]).sort(), [['a:x', 4, 2, 1, 1, 7], ['b:x', 4, 2, 1, 1, 7], ['c:x', 4, 1, 0, 3, 3]]);
  assert.strictEqual(rows[2].id, 'c:x'); assert.ok(rows.every((r, i) => !i || rows[i - 1].points >= r.points));
});
test('each player’s games are counted by the colour it had: won, drawn, lost; and its discs for and against', () => {
  const rows = quietly(() => table(pool, [game(1, 'a:x', 'b:x', 'dark'), game(1, 'b:x', 'a:x', 'draw'), game(1, 'a:x', 'c:x', 'light'), game(1, 'c:x', 'a:x', 'light')], 1000));
  const a = rows.find(r => r.id === 'a:x'), c = rows.find(r => r.id === 'c:x');
  assert.deepStrictEqual([a.dark, a.light], [[1, 0, 1], [1, 1, 0]]); assert.deepStrictEqual([c.dark, c.light], [[0, 0, 1], [1, 0, 0]]);
  assert.deepStrictEqual([a.discsFor, a.discsAgainst], [40 + 32 + 20 + 44, 24 + 32 + 44 + 20]);
});
test('the stronger rates higher; a game lost by forfeit is marked against the one that broke; time over the allowance is counted', () => {
  const rows = quietly(() => table(pool, [game(1, 'a:x', 'b:x', 'dark'), game(1, 'b:x', 'a:x', 'light', { by: 'b:x', why: 'broke' })], 1000));
  const a = rows.find(r => r.id === 'a:x'), b = rows.find(r => r.id === 'b:x');
  assert.ok(a.rating > b.rating); assert.deepStrictEqual([a.forfeits, b.forfeits, a.late + b.late], [0, 1, 2]);
});
test('the ratings the game goes by are the league’s: a line a player, strongest first, with what it is and how it did', () => {
  const games = [game(1, 'a:x', 'b:x', 'dark'), game(1, 'b:x', 'a:x', 'light'), game(1, 'a:x', 'c:x', 'draw'), game(1, 'c:x', 'a:x', 'light'), game(1, 'b:x', 'c:x', 'light'), game(2, 'c:x', 'b:x', 'dark')];
  const r = rated(pool, games, 1000);
  assert.deepStrictEqual([r.ms, r.games, r.rounds, r.anchor.id], [1000, 6, 2, 'a:x']);
  assert.deepStrictEqual(r.players.map(p => [p.id, p.bot, p.level, p.name, p.model, p.played, p.won, p.drawn, p.lost, p.points]), [['a:x', 'a', 'x', 'a:x', 'nobody', 4, 3, 1, 0, 10], ['c:x', 'c', 'x', 'c:x', 'nobody', 4, 2, 1, 1, 7], ['b:x', 'b', 'x', 'b:x', 'nobody', 4, 0, 0, 4, 0]]);
  assert.ok(r.players.every(p => Number.isInteger(p.rating)) && r.players[0].rating > r.players[1].rating && r.players[1].rating > r.players[2].rating);
});
test('a game’s seed is its round and its two players, in their colours, and nothing else', () => {
  assert.strictEqual(seedOf(2, 'a:x', 'b:x'), seedOf(2, 'a:x', 'b:x'));
  assert.strictEqual(new Set([seedOf(1, 'a:x', 'b:x'), seedOf(2, 'a:x', 'b:x'), seedOf(1, 'b:x', 'a:x'), seedOf(1, 'a:x', 'c:x')]).size, 4);
  assert.ok(seedOf(3, 'a:x', 'b:x') > 0 && seedOf(3, 'a:x', 'b:x') < 2 ** 31);
});

/* the league that is kept */
const file = path.join(__dirname, 'league.json'), kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
if (kept) {
  const R = rules();
  test('every game kept plays through by the rules to the discs and the result written down', () => {
    for (const [n, g] of kept.games.entries()) {
      const S = R.newGame(), at = `game ${n + 1} (r${g.round} ${g.dark} v ${g.light})`;
      for (let i = 0; i < g.moves.length; i += 2) {
        if (R.legalMoves(S)[0] === R.PASS_MOVE) R.playMove(S, R.PASS_MOVE);            // a pass is not written down: it is forced
        assert.ok(R.playMove(S, R.sqOf(g.moves.slice(i, i + 2))), `${at}: ${g.moves.slice(i, i + 2)} cannot be played at move ${i / 2 + 1}`);
      }
      assert.strictEqual(S.history.length, g.plies, at + ': how many moves, passes counted');
      if (g.forfeit) {
        assert.ok(!S.over, at + ': forfeited, yet the game had ended'); assert.strictEqual(g.why, 'forfeit');
        const lost = S.turn === R.DARK ? g.dark : g.light;
        assert.strictEqual(g.forfeit.by, lost, at + ': the side to move is the one that forfeits'); assert.strictEqual(g.result, S.turn === R.DARK ? 'light' : 'dark');
      } else {
        assert.ok(S.over, at + ': the game is not over where the record stops');
        assert.deepStrictEqual(Array.from(S.over.discs), g.discs, at + ': discs'); assert.strictEqual(S.over.why, g.why, at);
        assert.strictEqual(g.result, g.discs[0] > g.discs[1] ? 'dark' : g.discs[0] < g.discs[1] ? 'light' : 'draw', at + ': more discs wins');
      }
    }
  });
  test('every pair has met as often as every other, the same number of times with each colour', () => {
    const ids = kept.players.map(p => p.id).filter(id => kept.games.some(g => g.dark === id || g.light === id)), met = new Map();
    for (const g of kept.games) met.set(g.dark + '\n' + g.light, (met.get(g.dark + '\n' + g.light) || 0) + 1);
    const rounds = Math.max(...kept.games.map(g => g.round)), short = [];
    for (const a of ids) for (const b of ids) if (a !== b && met.get(a + '\n' + b) !== rounds) short.push(`${a} (Dark) v ${b}: ${met.get(a + '\n' + b) || 0}`);
    assert.deepStrictEqual(short.slice(0, 5), [], `${short.length} pairings have not played ${rounds} games: node arena/league.js`);
    assert.strictEqual(kept.games.length, rounds * ids.length * (ids.length - 1));
    assert.strictEqual(new Set(kept.games.map(g => `${g.round} ${g.dark} ${g.light}`)).size, kept.games.length, 'a game is kept twice');
  });
  test('no bot has changed since it joined the league, and each has its writer written down', () => {
    const writers = JSON.parse(fs.readFileSync(path.join(ROOT, 'bots', 'written-by.json'), 'utf8'));
    for (const p of kept.players) {
      const f = path.join(ROOT, 'bots', p.bot + '.js');
      assert.ok(fs.existsSync(f), `bots/${p.bot}.js is in the league and not in bots/`);
      assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16), p.sha, `bots/${p.bot}.js is not the file that played: a changed bot is another player`);
      assert.ok(writers[p.bot] && writers[p.bot].model, `bots/written-by.json does not say who wrote ${p.bot}`); assert.strictEqual(p.model, writers[p.bot].model);
    }
  });
  test('arena/ratings.json is what the games kept in arena/league.json give', () => {
    const on = JSON.parse(fs.readFileSync(path.join(__dirname, 'ratings.json'), 'utf8'));
    assert.deepStrictEqual(on, rated(kept.players, kept.games, kept.ms), 'arena/ratings.json is out of date: node arena/league.js --table --ratings');
  });
}
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
