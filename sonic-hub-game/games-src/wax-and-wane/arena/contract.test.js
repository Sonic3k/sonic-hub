// node arena/contract.test.js — what the host and the arena hold a bot to, and that every file in bots/ keeps to it.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { ROOT, rules, Player, playGame, fit } = require('./lib');
const R = rules(), RANDOM = path.join(ROOT, 'bots', 'random.js');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-bots-'));
/** A bot written on the spot. */
const bot = (name, src) => { const f = path.join(dir, name + '.js'); fs.writeFileSync(f, src); return f; };
const game = (a, b, opt) => playGame(R, a, b, Object.assign({ timeMs: 200, seed: 5 }, opt));

test('a bot is one object called BOT: its name, who wrote it, its levels, and think', () => {
  const p = new Player(RANDOM);
  assert.strictEqual(p.error, ''); assert.deepStrictEqual(p.info, { name: 'Random', author: 'Claude', levels: ['random'] }); assert.strictEqual(p.id, 'random:random');
  assert.match(new Player(bot('nothing', 'const x = 1;')).error, /does not define BOT/);
  assert.match(new Player(bot('nothink', 'const BOT = { levels: ["a"] };')).error, /think is not a function/);
  assert.match(new Player(bot('nolevels', 'const BOT = { levels: [], think() {} };')).error, /at least one level/);
  assert.match(new Player(bot('broken', 'const BOT = {{;')).error, /could not be loaded/);
});
test('a game between two bots is played to its end by the rules', () => {
  const r = game(new Player(RANDOM), new Player(RANDOM), { seed: 3 });
  assert.ok([0, 1, -1].includes(r.winner)); assert.strictEqual(r.forfeit, null); assert.ok(r.plies > 10);
});
test('a move that is not allowed loses the game on the spot, and so does breaking', () => {
  const cheat = new Player(bot('cheat', 'const BOT = { levels: ["x"], think(S) { return sqOf("a1"); } };'));   // a corner, with nothing to enclose from it
  let r = game(cheat, new Player(RANDOM));
  assert.strictEqual(r.winner, R.LIGHT); assert.strictEqual(r.why, 'forfeit'); assert.strictEqual(r.plies, 0); assert.match(r.forfeit.why, /not one of the moves allowed/);
  assert.deepStrictEqual(r.discs, [2, 2]);
  r = game(new Player(RANDOM), cheat);
  assert.strictEqual(r.winner, R.DARK); assert.strictEqual(r.plies, 1);
  const thrower = new Player(bot('thrower', 'const BOT = { levels: ["x"], think() { throw new Error("oops"); } };'));
  assert.match(game(thrower, new Player(RANDOM)).forfeit.why, /think threw: oops/);
  const mute = new Player(bot('mute', 'const BOT = { levels: ["x"], think() {} };'));
  assert.match(game(mute, new Player(RANDOM)).forfeit.why, /returned undefined/);
});
test('a bot that does not come back is cut off, and loses', () => {
  const stuck = new Player(bot('stuck', 'const BOT = { levels: ["x"], think() { for (;;) {} } };'));
  const t0 = Date.now(), r = game(stuck, new Player(RANDOM), { timeMs: 50, cap: 150 });
  assert.strictEqual(r.winner, R.LIGHT); assert.match(r.forfeit.why, /took more than 150 ms/); assert.ok(Date.now() - t0 < 2000);
});
test('a side that has to pass is not asked: the host passes for it, and think only ever has a disc to place', () => {
  // twenty-five moves into this game Light has nowhere to go
  const before = 'f5 f4 d3 d6 f6 d2 c6 g6 f3 g4 g3 b7 h4 g2 f2 g7 h1 f1 e2 h2 h3 g5 e1 d1 g1'.split(' ').map(R.sqOf);
  assert.deepStrictEqual(Array.from(R.legalMoves(R.replay(before))), [R.PASS_MOVE]);
  const never = new Player(bot('never', 'const BOT = { levels: ["x"], think() { throw new Error("asked to pass"); } };'));
  assert.deepStrictEqual(never.move(before, 100, 1, 500).move, R.PASS_MOVE);
  const careful = new Player(bot('careful', 'const BOT = { levels: ["x"], think(S, opt) { const ms = legalMoves(S); if (ms.includes(PASS_MOVE)) throw new Error("handed a pass"); return ms[Math.floor(opt.rand() * ms.length)]; } };'));
  for (let seed = 1; seed <= 6; seed++) assert.strictEqual(game(careful, new Player(RANDOM), { seed }).forfeit, null);
});
test('what a bot declares is its own: it may reuse a name from the rules, and may leave the position in any state', () => {
  const messy = new Player(bot('messy', `
    const DARK = 99, RUN = null; function gen() { return 'mine'; }        // names the rules use: no clash
    const BOT = { levels: ['x'], think(S, opt) {
      const moves = legalMoves(S), m = moves[Math.floor(opt.rand() * moves.length)];
      make(S, m); S.b.fill(0); S.turn = 7; S.count[0] = -3;               // wrecked, and never put back
      return m;
    } };`));
  const r = game(messy, new Player(RANDOM));
  assert.strictEqual(r.forfeit, null);
});
test('a bot file runs in strict mode: a slip such as an undeclared name stops it rather than leaking', () => {
  const sloppy = new Player(bot('sloppy', 'const BOT = { levels: ["x"], think(S) { best = legalMoves(S)[0]; return best; } };'));
  assert.match(game(sloppy, new Player(RANDOM)).forfeit.why, /think threw: best is not defined/);
});
test('a bot is asked at one of its own levels, and gets its random numbers from the host', () => {
  const p = new Player(bot('levels', 'const BOT = { levels: ["a", "b"], think(S, opt) { const ms = legalMoves(S); return ms[opt.level === "a" ? 0 : Math.floor(opt.rand() * ms.length)]; } };'), 'b');
  assert.strictEqual(p.id, 'levels:b');
  const one = p.move([], 100, 42, 500).move, again = p.move([], 100, 42, 500).move;
  assert.strictEqual(one, again, 'the same seed, the same move');
  p.level = 'zzz'; assert.match(p.move([], 100, 1, 500).error, /no such level/);
});

/* every bot in bots/, whoever wrote it */
for (const file of fs.readdirSync(path.join(ROOT, 'bots')).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort()) {
  const first = new Player(path.join(ROOT, 'bots', file)), name = file.slice(0, -3);
  test(`bots/${file} holds to the contract: at each of its levels it plays a whole game by the rules and stays within its allowance`, () => {
    assert.strictEqual(first.error, '', first.error);
    assert.ok(first.info.name && first.info.author, 'a name and who wrote it');
    assert.strictEqual(new Set(first.info.levels).size, first.info.levels.length, 'no level named twice');
    first.info.levels.forEach((level, i) => {
      const p = new Player(path.join(ROOT, 'bots', file), level), dark = i % 2 === 0;
      const r = dark ? playGame(R, p, new Player(RANDOM), { timeMs: 1000, seed: 21 + i }) : playGame(R, new Player(RANDOM), p, { timeMs: 1000, seed: 21 + i });
      assert.strictEqual(r.forfeit, null, `${name}:${level} ${r.forfeit ? r.forfeit.why : ''}`);
      assert.ok(r.slowest[dark ? 0 : 1] <= 1000, `${name}:${level} took ${Math.round(r.slowest[dark ? 0 : 1])} ms over a move; it is asked to stay within 1000`);
    });
  });
}

test('ratings: a pinned player keeps its number, a walk-over counts as no more than 97 in 100, equals come out level', () => {
  const r = fit(['a', 'b', 'c', 'd'], [{ a: 'a', b: 'b', wa: 0, wb: 40, dr: 0 }, { a: 'b', b: 'c', wa: 10, wb: 30, dr: 0 }, { a: 'c', b: 'd', wa: 20, wb: 20, dr: 0 }], ['a', 600]);
  assert.strictEqual(r.a, 600); assert.ok(Math.abs(r.b - r.a - 604) < 2, 'capped: ' + (r.b - r.a)); assert.ok(Math.abs(r.c - r.b - 191) < 2); assert.ok(Math.abs(r.d - r.c) < 1);
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
