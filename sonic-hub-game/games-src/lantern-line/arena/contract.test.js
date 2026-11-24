// node arena/contract.test.js — what the host and the arena hold a bot to, and that every file in bots/ keeps to it,
// on both boards.
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), assert = require('assert');
const { ROOT, rules, Player, playGame, fit } = require('./lib');
const R = rules(), RANDOM = path.join(ROOT, 'bots', 'random.js');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'll-bots-'));
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
test('a game between two bots is played to its end by the rules, on either board', () => {
  for (const size of [5, 7]) {
    const r = game(new Player(RANDOM), new Player(RANDOM), { seed: 3, size });
    assert.ok([0, 1].includes(r.winner)); assert.strictEqual(r.forfeit, null); assert.strictEqual(r.size, size);
    assert.strictEqual(r.plies, R.geometry(size).lines); assert.strictEqual(r.score[0] + r.score[1], size * size); assert.strictEqual(r.why, 'squares');
  }
});
test('a bot is asked for every line it draws, those after a square it took included, and is told the board', () => {
  const seen = bot('counter', 'let asked = 0; const BOT = { levels: ["x"], think(S, opt) { asked++; if (opt.size !== S.n || ![5, 7].includes(opt.size)) throw new Error("size " + opt.size); const ms = legalMoves(S); for (const m of ms) if (takes(S, m)) return m; return ms[0]; }, get asked() { return asked; } };');
  for (const size of [5, 7]) {
    const p = new Player(seen), r = game(p, p, { size });
    assert.strictEqual(r.forfeit, null); assert.strictEqual(p.moves, R.geometry(size).lines, 'asked once a line, the whole game through');
  }
});
test('a move that is not allowed loses the game on the spot, and so does breaking', () => {
  const twice = new Player(bot('twice', 'const BOT = { levels: ["x"], think(S) { return S.history.length ? S.history[0] : 0; } };'));   // the first line of the game, again
  let r = game(new Player(RANDOM), twice);
  assert.strictEqual(r.winner, R.RED); assert.strictEqual(r.why, 'forfeit'); assert.strictEqual(r.plies, 1); assert.match(r.forfeit.why, /not one of the moves allowed/);
  const off = new Player(bot('off', 'const BOT = { levels: ["x"], think(S) { return S.line.length; } };'));     // one past the last line
  r = game(off, new Player(RANDOM), { size: 7 });
  assert.strictEqual(r.winner, R.GOLD); assert.strictEqual(r.plies, 0); assert.deepStrictEqual(r.score, [0, 0]);
  const thrower = new Player(bot('thrower', 'const BOT = { levels: ["x"], think() { throw new Error("oops"); } };'));
  assert.match(game(thrower, new Player(RANDOM)).forfeit.why, /think threw: oops/);
  const mute = new Player(bot('mute', 'const BOT = { levels: ["x"], think() {} };'));
  assert.match(game(mute, new Player(RANDOM)).forfeit.why, /returned undefined/);
});
test('a bot that does not come back is cut off, and loses', () => {
  const stuck = new Player(bot('stuck', 'const BOT = { levels: ["x"], think() { for (;;) {} } };'));
  const t0 = Date.now(), r = game(stuck, new Player(RANDOM), { timeMs: 50, cap: 150 });
  assert.strictEqual(r.winner, R.GOLD); assert.match(r.forfeit.why, /took more than 150 ms/); assert.ok(Date.now() - t0 < 2000);
});
test('what a bot declares is its own: it may reuse a name from the rules, and may leave the position in any state', () => {
  const messy = new Player(bot('messy', `
    const RED = 99, SIZES = null; function gen() { return 'mine'; }        // names the rules use: no clash
    const BOT = { levels: ['x'], think(S, opt) {
      const moves = legalMoves(S), m = moves[Math.floor(opt.rand() * moves.length)];
      make(S, m); S.line.fill(1); S.turn = 7; S.score[0] = -3;            // wrecked, and never put back
      return m;
    } };`));
  for (const size of [5, 7]) assert.strictEqual(game(messy, new Player(RANDOM), { size }).forfeit, null);
});
test('a bot file runs in strict mode: a slip such as an undeclared name stops it rather than leaking', () => {
  const sloppy = new Player(bot('sloppy', 'const BOT = { levels: ["x"], think(S) { best = legalMoves(S)[0]; return best; } };'));
  assert.match(game(sloppy, new Player(RANDOM)).forfeit.why, /think threw: best is not defined/);
});
test('a bot is asked at one of its own levels, on the board it is told, and gets its random numbers from the host', () => {
  const p = new Player(bot('levels', 'const BOT = { levels: ["a", "b"], think(S, opt) { const ms = legalMoves(S); return ms[opt.level === "a" ? 0 : Math.floor(opt.rand() * ms.length)]; } };'), 'b');
  assert.strictEqual(p.id, 'levels:b');
  const one = p.move(7, [], 100, 42, 500).move, again = p.move(7, [], 100, 42, 500).move;
  assert.strictEqual(one, again, 'the same seed, the same move');
  assert.ok(one >= 0 && one < 112);
  assert.match(p.move(6, [], 100, 1, 500).error, /cannot be played through/, 'a board the game does not have');
  assert.match(p.move(5, [60], 100, 1, 500).error, /cannot be played through/, 'a line the 5 × 5 board does not have');
  p.level = 'zzz'; assert.match(p.move(5, [], 100, 1, 500).error, /no such level/);
});

/* every bot in bots/, whoever wrote it */
for (const file of fs.readdirSync(path.join(ROOT, 'bots')).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort()) {
  const first = new Player(path.join(ROOT, 'bots', file)), name = file.slice(0, -3);
  test(`bots/${file} holds to the contract: at each of its levels it plays a whole game by the rules on both boards, and stays within its allowance`, () => {
    assert.strictEqual(first.error, '', first.error);
    assert.ok(first.info.name && first.info.author, 'a name and who wrote it');
    assert.strictEqual(new Set(first.info.levels).size, first.info.levels.length, 'no level named twice');
    first.info.levels.forEach((level, i) => {
      for (const size of [5, 7]) {
        const p = new Player(path.join(ROOT, 'bots', file), level), red = (i + size) % 2 === 0;
        const r = red ? playGame(R, p, new Player(RANDOM), { size, timeMs: 1000, seed: 21 + i }) : playGame(R, new Player(RANDOM), p, { size, timeMs: 1000, seed: 21 + i });
        assert.strictEqual(r.forfeit, null, `${name}:${level} on ${size} × ${size}: ${r.forfeit ? r.forfeit.why : ''}`);
        assert.ok(r.slowest[red ? 0 : 1] <= 1000, `${name}:${level} took ${Math.round(r.slowest[red ? 0 : 1])} ms over a move on ${size} × ${size}; it is asked to stay within 1000`);
      }
    });
  });
}

test('ratings: a pinned player keeps its number, a walk-over counts as no more than 97 in 100, equals come out level', () => {
  const r = fit(['a', 'b', 'c', 'd'], [{ a: 'a', b: 'b', wa: 0, wb: 40, dr: 0 }, { a: 'b', b: 'c', wa: 10, wb: 30, dr: 0 }, { a: 'c', b: 'd', wa: 20, wb: 20, dr: 0 }], ['a', 600]);
  assert.strictEqual(r.a, 600); assert.ok(Math.abs(r.b - r.a - 604) < 2, 'capped: ' + (r.b - r.a)); assert.ok(Math.abs(r.c - r.b - 191) < 2); assert.ok(Math.abs(r.d - r.c) < 1);
});
test('docs/BOT_BRIEF.md promises nothing the rules do not have: every name it lists is in engine/rules.js, and the fields it names are on a game', () => {
  const brief = fs.readFileSync(path.join(ROOT, 'docs', 'BOT_BRIEF.md'), 'utf8'), rulesText = fs.readFileSync(path.join(ROOT, 'engine', 'rules.js'), 'utf8');
  const block = brief.slice(brief.indexOf('## What you can call'), brief.indexOf('Inside a search')), listed = new Set();
  for (const line of block.split('\n')) if (/^[A-Z][A-Z_ ]+$/.test(line.trim())) for (const name of line.trim().split(/\s+/)) listed.add(name);   // the constants, on a line of their own
  for (const m of block.matchAll(/\b([a-z]\w*)\(/g)) listed.add(m[1]);
  for (const name of ['legalMoves', 'make', 'unmake', 'takes', 'isSafe', 'describe', 'geometry', 'lineAt', 'keyLo', 'RED', 'GOLD', 'SIZES']) assert.ok(listed.has(name), 'the brief no longer lists ' + name);
  const ctx = vm.createContext({}); vm.runInContext(rulesText, ctx);   // what a bot's file has in scope: the rules' own top-level names
  for (const name of listed) assert.notStrictEqual(vm.runInContext(`typeof ${name}`, ctx), 'undefined', name + ' is in the brief but not in engine/rules.js');
  const S = R.newGame(7);
  for (const m of brief.matchAll(/`S\.(\w+)/g)) assert.ok(m[1] in S, 'S.' + m[1]);
  for (const m of brief.matchAll(/\bg\.(\w+)/g)) assert.ok(m[1] in S.g, 'g.' + m[1]);
  assert.deepStrictEqual([S.g.n, S.g.dots, S.g.across, S.g.lines, S.g.squares], [7, 8, 56, 112, 49]);
  assert.deepStrictEqual([R.lineName(0, 5), R.lineAt('b1-a1', 5), R.dotName(5 + 2, 5), R.squareName(0, 5), R.lineAt('a1-c1', 5)], ['a1-b1', 0, 'b2', 'a1', -1]);
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
