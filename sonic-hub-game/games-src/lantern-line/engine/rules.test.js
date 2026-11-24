// node engine/rules.test.js — the rules as a program: what a board is, what a line does, how a game ends, and the
// counts of engine/counts.txt, which a second, separate program made.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'rules.js'), 'utf8'), { filename: 'rules.js' });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }

const L = (n, name) => { const m = lineAt(name, n); assert.ok(m >= 0, 'no such line: ' + name); return m; };
/** a game on n × n squares with these lines drawn in this order, by the rules */
function played(n, names) { const S = newGame(n); for (const name of names ? names.split(',') : []) assert.ok(playMove(S, L(n, name.trim())), 'cannot draw ' + name); return S; }
const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

test('the two boards: 5 × 5 and 7 × 7 squares, 6 × 6 and 8 × 8 dots, 60 and 112 lines', () => {
  assert.deepStrictEqual(SIZES, [5, 7]); assert.deepStrictEqual(SIDE, ['Red', 'Gold']); assert.deepStrictEqual([RED, GOLD], [0, 1]);
  for (const [n, dots, across, lines, squares] of [[5, 6, 30, 60, 25], [7, 8, 56, 112, 49]]) {
    const g = geometry(n);
    assert.deepStrictEqual([g.n, g.dots, g.across, g.lines, g.squares], [n, dots, across, lines, squares]);
    assert.strictEqual(geometry(n), g, 'worked out once');
  }
  for (const n of [1, 2, 3, 4, 6, 8, 9, 5.5, '5', null]) assert.throws(() => geometry(n), String(n));
});
test('every square has four sides, and each of them has that square on one side of it', () => {
  for (const n of SIZES) {
    const g = geometry(n), seen = new Array(g.lines).fill(0);
    for (let s = 0; s < g.squares; s++) {
      const [top, right, bottom, left] = Array.from(g.sqLine.subarray(4 * s, 4 * s + 4)), x = s % n, y = (s / n) | 0;
      assert.deepStrictEqual([top, bottom, left, right].map(m => m < g.across), [true, true, false, false], 'top and bottom run across, left and right down');
      assert.strictEqual(g.lineSq[2 * top + 1], s, 'below its top'); assert.strictEqual(g.lineSq[2 * bottom], s, 'above its bottom');
      assert.strictEqual(g.lineSq[2 * left + 1], s, 'right of its left'); assert.strictEqual(g.lineSq[2 * right], s, 'left of its right');
      const dots = [g.lineDot[2 * top], g.lineDot[2 * top + 1], g.lineDot[2 * bottom], g.lineDot[2 * bottom + 1]];
      assert.deepStrictEqual(dots, [x + g.dots * y, x + 1 + g.dots * y, x + g.dots * (y + 1), x + 1 + g.dots * (y + 1)]);
      for (const m of [top, right, bottom, left]) seen[m]++;
    }
    for (let m = 0; m < g.lines; m++) {
      const a = g.lineSq[2 * m], b = g.lineSq[2 * m + 1], d0 = g.lineDot[2 * m], d1 = g.lineDot[2 * m + 1];
      assert.strictEqual(seen[m], (a >= 0) + (b >= 0), 'a line is a side of the squares beside it and of no other');
      assert.ok(a >= 0 || b >= 0, 'every line has a square beside it');
      assert.ok(d1 - d0 === 1 || d1 - d0 === g.dots, 'it joins two dots next to each other');
      const x0 = d0 % g.dots, y0 = (d0 / g.dots) | 0, rim = m < g.across ? y0 === 0 || y0 === n : x0 === 0 || x0 === n;
      assert.strictEqual(rim, a < 0 || b < 0, 'a line round the edge has one square beside it, every other line two');
    }
  }
});
test('names: dots by column letter and row number from the top left, a line by its two dots, a square by its top left dot', () => {
  assert.deepStrictEqual([dotName(0, 5), dotName(5, 5), dotName(35, 5), dotName(63, 7)], ['a1', 'f1', 'f6', 'h8']);
  assert.deepStrictEqual([lineName(0, 5), lineName(29, 5), lineName(30, 5), lineName(59, 5), lineName(111, 7)], ['a1-b1', 'e6-f6', 'a1-a2', 'f5-f6', 'h7-h8']);
  assert.deepStrictEqual([lineAt('a1-b1', 5), lineAt('b1-a1', 5), lineAt('a1-a2', 5), lineAt('a2-a1', 5), lineAt('f5-f6', 5)], [0, 0, 30, 30, 59]);
  assert.deepStrictEqual(['a1-c1', 'a1-b2', 'a1-a1', 'f1-g1', 'a6-a7', 'g1-h1', 'a1', 'a1-b1-c1', '', 'A1-B1'].map(x => lineAt(x, 5)), Array(10).fill(-1));
  assert.strictEqual(lineAt('g1-h1', 7), 6);
  assert.deepStrictEqual([squareName(0, 5), squareName(24, 5), squareName(48, 7), squareAt('e5', 5), squareAt('f1', 5), squareAt('g7', 7)], ['a1', 'e5', 'g7', 24, -1, 48]);
  for (const n of SIZES) {
    const g = geometry(n);
    for (let m = 0; m < g.lines; m++) assert.strictEqual(lineAt(lineName(m, n), n), m);
    for (let d = 0; d < g.dots * g.dots; d++) assert.strictEqual(dotAt(dotName(d, n), n), d);
    for (let s = 0; s < g.squares; s++) assert.strictEqual(squareAt(squareName(s, n), n), s);
  }
});
test('a new game: every line open, Red to draw, nothing taken', () => {
  for (const n of SIZES) {
    const S = newGame(n), g = geometry(n);
    assert.deepStrictEqual([S.n, S.turn, S.left, S.score, S.over, S.history.length, S.sp, S.hl, S.hh], [n, RED, g.lines, [0, 0], null, 0, 0, 0, 0]);
    assert.deepStrictEqual(legalMoves(S), [...Array(g.lines).keys()]);
    assert.ok(S.sides.every(v => v === 0) && S.owner.every(v => v === -1) && S.line.every(v => v === 0));
  }
  assert.strictEqual(newGame().n, 5, 'the 5 × 5 board when no size is given');
  assert.throws(() => newGame(6));
});
test('a line that takes nothing hands the turn over', () => {
  const S = newGame(5), ev = playMove(S, L(5, 'a1-b1'));
  assert.deepStrictEqual([ev.side, ev.across, dotName(ev.from, 5), dotName(ev.to, 5), ev.took, ev.again, ev.gives], [RED, true, 'a1', 'b1', [], false, []]);
  assert.deepStrictEqual([S.turn, S.left, S.line[0], S.sides[0], S.history], [GOLD, 59, 1, 1, [0]]);
  playMove(S, L(5, 'a1-a2')); assert.strictEqual(S.turn, RED);
});
test('the fourth side of a square takes it, and the same side draws again', () => {
  const S = played(5, 'a1-b1,a2-b2,a1-a2');                 // three sides of a1, Red, Gold, Red
  assert.deepStrictEqual([S.turn, S.sides[0]], [GOLD, 3]);
  const ev = playMove(S, L(5, 'b1-b2'));
  assert.deepStrictEqual([ev.side, ev.took, ev.again], [GOLD, [0], true]);
  assert.deepStrictEqual([S.turn, S.owner[0], S.score, S.sides[0], S.sides[1]], [GOLD, GOLD, [0, 1], 4, 1]);
});
test('a line that is the fourth side of two squares takes both, and the same side draws again once', () => {
  const S = played(5, 'a1-b1,a2-b2,a1-a2,b1-c1,b2-c2,c1-c2');   // a1 and b1 each have three sides; b1-b2 is between them
  assert.deepStrictEqual([S.sides[0], S.sides[1], S.turn], [3, 3, RED]);
  const ev = playMove(S, L(5, 'b1-b2'));
  assert.deepStrictEqual([ev.took, ev.again, S.score, S.turn, S.owner[0], S.owner[1]], [[0, 1], true, [2, 0], RED, RED, RED]);
  playMove(S, L(5, 'e5-f5')); assert.strictEqual(S.turn, GOLD, 'one line more, and the turn is over');
});
test('taking is never compulsory: with a square to take, every other line may be drawn too', () => {
  const S = played(5, 'a1-b1,a2-b2,a1-a2');
  assert.strictEqual(legalMoves(S).length, 57);
  const ev = describe(S, L(5, 'c3-d3'));
  assert.deepStrictEqual([ev.took, ev.again], [[], false]);
  playMove(S, L(5, 'c3-d3')); assert.strictEqual(S.turn, RED, 'and the square is still there for Red');
  assert.deepStrictEqual(describe(S, L(5, 'b1-b2')).took, [0]);
});
test('what a line gives: the squares it leaves with three sides for the other side', () => {
  const S = played(5, 'a1-b1,a2-b2');                       // square a1 has two sides
  assert.deepStrictEqual(describe(S, L(5, 'a1-a2')).gives, [0]);
  assert.deepStrictEqual(describe(S, L(5, 'b1-b2')).gives, [0], 'b1-b2 gives a1; b1 next to it has one side, and keeps two');
  assert.deepStrictEqual(describe(S, L(5, 'c1-c2')).gives, []);
  assert.ok(!isSafe(S, L(5, 'a1-a2')) && !isSafe(S, L(5, 'b1-b2')) && isSafe(S, L(5, 'c1-c2')) && isSafe(S, L(5, 'b2-b3')));
  assert.deepStrictEqual([takes(S, L(5, 'a1-a2')), takes(played(5, 'a1-b1,a2-b2,a1-a2'), L(5, 'b1-b2'))], [0, 1]);
  const T = played(5, 'a1-b1,a2-b2,a1-a2,b1-c1,b2-c2');      // a1 has three sides: a line that takes gives nothing, the same side goes on
  assert.deepStrictEqual(describe(T, L(5, 'b1-b2')).gives, []);
});
test('what is not a move: a line already drawn, a number that is no line, anything once the game is over', () => {
  const S = played(5, 'a1-b1');
  for (const m of [0, -1, 60, 2.5, NaN, '1', null, undefined]) assert.ok(!isLegal(S, m), String(m));
  assert.strictEqual(playMove(S, 0), null); assert.deepStrictEqual([S.turn, S.history.length], [GOLD, 1]);
  assert.ok(isLegal(newGame(7), 111) && !isLegal(newGame(5), 111));
});
test('when every line is drawn every square is taken, and whoever took more has won; there is no draw on either board', () => {
  const rand = rng(11);
  for (const n of SIZES) for (let game = 0; game < 200; game++) {
    const S = newGame(n), g = geometry(n);
    while (!S.over) { const ms = legalMoves(S); assert.ok(ms.length > 0, 'the game is on and there is no move'); assert.ok(playMove(S, ms[Math.floor(rand() * ms.length)])); }
    assert.deepStrictEqual([S.left, S.history.length, S.score[0] + S.score[1]], [0, g.lines, g.squares]);
    assert.ok(S.owner.every(o => o === RED || o === GOLD));
    assert.strictEqual(S.over.winner, S.score[0] > S.score[1] ? RED : GOLD); assert.deepStrictEqual(S.over.score, S.score);
    assert.notStrictEqual(S.score[0], S.score[1], 'an odd number of squares cannot be shared evenly');
    assert.deepStrictEqual(legalMoves(S), []);
  }
});
test('the last line drawn always takes, and nobody draws after it', () => {
  const rand = rng(5);
  for (const n of SIZES) for (let game = 0; game < 50; game++) {
    const S = newGame(n);
    while (S.left > 1) { const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]); }
    const last = legalMoves(S)[0], ev = playMove(S, last);
    assert.ok(ev.took.length >= 1); assert.strictEqual(ev.again, false); assert.ok(S.over);
  }
});
test('make and unmake: a move taken back leaves nothing behind', () => {
  const rand = rng(7);
  for (const n of SIZES) for (let game = 0; game < 30; game++) {
    const S = newGame(n), seen = [];
    while (S.left) {
      const ms = legalMoves(S); seen.push(JSON.stringify([S.hl, S.hh, S.turn, S.score, S.left, Array.from(S.sides), Array.from(S.owner)]));
      const m = ms[Math.floor(rand() * ms.length)], before = S.turn, got = make(S, m);
      assert.strictEqual(lastMove(S), m); assert.strictEqual(S.turn === before, got > 0);
    }
    while (S.sp) { unmake(S); assert.strictEqual(JSON.stringify([S.hl, S.hh, S.turn, S.score, S.left, Array.from(S.sides), Array.from(S.owner)]), seen.pop()); }
    assert.ok(S.line.every(v => v === 0)); assert.strictEqual(lastMove(S), -1);
  }
});
test('a position\'s key: the same lines and the same side to move give the same key, whatever the order and whoever took what', () => {
  const a = played(5, 'a1-b1,c3-d3,e5-f5,a6-b6'), b = played(5, 'e5-f5,a6-b6,a1-b1,c3-d3');
  assert.deepStrictEqual([keyLo(a), keyHi(a)], [keyLo(b), keyHi(b)]);
  const c = played(5, 'a1-b1,a2-b2,a1-a2,b1-b2,c1-c2'), d = played(5, 'a1-b1,a2-b2,b1-b2,c1-c2,a1-a2');
  assert.notDeepStrictEqual(c.score, d.score, 'square a1 went to different sides');
  assert.strictEqual(c.turn, d.turn); assert.deepStrictEqual([keyLo(c), keyHi(c)], [keyLo(d), keyHi(d)]);
  const e = played(5, 'a1-b1,c3-d3,e5-f5'), f = played(5, 'a1-b1,c3-d3,e5-f5,a6-b6');
  assert.notDeepStrictEqual([keyLo(e), keyHi(e)], [keyLo(f), keyHi(f)], 'one line more');
  // the same seven lines round squares a1 and b1, once with Red to move and once with Gold: drawn with b1-b2 last,
  // one line takes both squares; drawn with b1-b2 in the middle, it takes a1, and c1-c2 takes b1 after it
  const g = played(5, 'a1-b1,b1-c1,a2-b2,b2-c2,a1-a2,c1-c2,b1-b2'), k = played(5, 'a1-b1,a2-b2,a1-a2,b1-b2,b1-c1,b2-c2,c1-c2');
  assert.deepStrictEqual([g.turn, g.score, k.turn, k.score], [RED, [2, 0], GOLD, [0, 2]]);
  assert.notDeepStrictEqual([keyLo(g), keyHi(g)], [keyLo(k), keyHi(k)], 'the same lines, the other side to move');
  assert.deepStrictEqual([keyLo(newGame(5)), keyHi(newGame(5))], [0, 0]);
});
test('undoMove takes a game back a move, the last one included; replay plays a game again from its size and moves', () => {
  const rand = rng(3), S = newGame(7);
  while (!S.over) { const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]); }
  const again = replay(7, S.history);
  assert.deepStrictEqual([again.over.winner, again.score, Array.from(again.owner)], [S.over.winner, S.score, Array.from(S.owner)]);
  const last = S.history[S.history.length - 1];
  assert.strictEqual(undoMove(S), last); assert.deepStrictEqual([S.over, S.left], [null, 1]); assert.ok(isLegal(S, last));
  assert.strictEqual(undoMove(newGame(5)), null);
  assert.strictEqual(replay(5, [0, 0]), null, 'a line drawn twice'); assert.strictEqual(replay(5, [60]), null, 'no such line on 5 × 5');
  assert.strictEqual(replay(6, []), null); assert.strictEqual(replay('5', []), null); assert.strictEqual(replay(5, '0'), null);
  assert.strictEqual(replay(7, [111]).n, 7);
});

test('engine/counts.txt: every count the second, separate program made comes out the same here', () => {
  const rows = fs.readFileSync(path.join(__dirname, 'counts.txt'), 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  assert.ok(rows.length >= 100);
  const sizes = new Set();
  const count = (S, d) => {
    if (d === 0) return [1, S.turn === RED ? 1 : 0, S.score[0], S.score[1]];
    const tot = [0, 0, 0, 0], ms = [];
    gen(S, ms);
    for (const m of ms) { make(S, m); const c = count(S, d - 1); unmake(S); for (let i = 0; i < 4; i++) tot[i] += c[i]; }
    return tot;
  };
  for (const row of rows) {
    const hit = /^(\d) (\S+) : (.+)$/.exec(row); assert.ok(hit, row);
    const n = +hit[1], S = played(n, hit[2] === '-' ? '' : hit[2]);
    hit[3].split(' / ').forEach((want, i) => assert.deepStrictEqual(count(S, i + 1), want.split(' ').map(Number), `${row.slice(0, 50)}… ${i + 1} moves on`));
    sizes.add(n);
  }
  assert.deepStrictEqual([...sizes], [5, 7]);
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
