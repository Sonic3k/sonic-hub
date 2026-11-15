// node test.js — the rules, and that every level of the computer only ever writes where it may.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
for (const f of ['00-core.js', '10-ai.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), { filename: f });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const at = (n, r, c) => r * n + c;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('a new sheet has X top-left, O bottom-right, X to move', () => {
  for (const n of SIZES) {
    const S = newGame(n);
    assert.strictEqual(S.occ[0], 1); assert.strictEqual(S.occ[n * n - 1], 2);
    assert.deepStrictEqual(S.head, [0, n * n - 1]); assert.strictEqual(S.turn, X); assert.strictEqual(S.over, null);
    assert.deepStrictEqual(legalMoves(S).sort((a, b) => a - b), [1, n, n + 1]);
  }
});
test('a mark goes only on an empty square touching your own last mark', () => {
  const S = newGame(11);
  assert.strictEqual(playMove(S, at(11, 5, 5)), false);          // far away
  assert.strictEqual(playMove(S, 0), false);                      // taken
  assert.strictEqual(playMove(S, at(11, 1, 1)), true);
  assert.strictEqual(S.turn, O);
  assert.strictEqual(playMove(S, at(11, 2, 2)), false);          // next to X's mark, not O's
  assert.strictEqual(playMove(S, at(11, 9, 9)), true);
  assert.strictEqual(playMove(S, at(11, 0, 0)), false);
  assert.deepStrictEqual(S.head, [at(11, 1, 1), at(11, 9, 9)]);
});
test('slipping diagonally between two marks that touch at a corner is allowed', () => {
  const S = newGame(11);
  // both walk the long diagonal; X takes the middle square
  for (const [r, c] of [[1, 1], [9, 9], [2, 2], [8, 8], [3, 3], [7, 7], [4, 4], [6, 6], [5, 5]]) assert.ok(playMove(S, at(11, r, c)), `${r},${c}`);
  // O goes round to (4,5); from there (5,4) lies across the corner where X's (4,4) and (5,5) touch
  assert.ok(playMove(S, at(11, 5, 6)));           // O
  assert.ok(playMove(S, at(11, 6, 5)));           // X anywhere
  assert.ok(playMove(S, at(11, 4, 5)));           // O
  assert.ok(playMove(S, at(11, 7, 4)));           // X anywhere
  assert.ok(isLegal(S, at(11, 5, 4)), 'O may slip from (4,5) to (5,4) between X at (4,4) and (5,5)');
  assert.ok(playMove(S, at(11, 5, 4)));
});
test('the side with no empty square next to its last mark is penned in and loses', () => {
  const T = newGame(11);
  T.occ[1] = 2; T.occ[11] = 2;                      // two of the three squares around X's corner are taken
  assert.deepStrictEqual(legalMoves(T), [12]);
  T.turn = O; T.head[O] = at(11, 2, 2); T.occ[at(11, 2, 2)] = 2;
  assert.ok(playMove(T, 12));                       // O writes the last one
  assert.deepStrictEqual(T.over, { winner: O, loser: X });
  assert.deepStrictEqual(legalMoves(T), []);
  assert.strictEqual(playMove(T, at(11, 5, 5)), false);
});
test('undo takes marks back in order, down to the two starting marks', () => {
  const S = newGame(13), first = at(13, 1, 0), second = at(13, 12, 11);
  playMove(S, first); playMove(S, second);
  assert.deepStrictEqual(undoMove(S), { side: O, from: 168, to: second });
  assert.strictEqual(S.occ[second], 0); assert.strictEqual(S.turn, O); assert.strictEqual(S.head[O], 168);
  undoMove(S);
  assert.strictEqual(undoMove(S), null);
  assert.deepStrictEqual(Array.from(S.occ).filter(Boolean), [1, 2]);
});
test('a saved game replays to the same sheet; a bad list is refused', () => {
  const S = newGame(11), r = rng(3);
  for (let i = 0; i < 30 && !S.over; i++) { const m = legalMoves(S); playMove(S, m[Math.floor(r() * m.length)]); }
  const T = replay(11, S.history.map(m => m.to));
  assert.deepStrictEqual(Array.from(T.occ), Array.from(S.occ)); assert.deepStrictEqual(T.head, S.head); assert.strictEqual(T.turn, S.turn);
  assert.strictEqual(replay(11, [60]), null); assert.strictEqual(replay(12, []), null); assert.strictEqual(replay(11, 'x'), null);
});
test('every level always answers with a legal move, and every game ends with a winner', () => {
  let games = 0;
  for (const n of SIZES) for (const lx of LEVELS) for (const lo of LEVELS) {
    const S = newGame(n), r = rng(n * 100 + games++);
    let guard = 0;
    while (!S.over) {
      const level = S.turn === X ? lx : lo;
      const { move } = AI.think(S, { level, rand: r, timeMs: 15, maxDepth: level === 'hard' ? 4 : undefined });
      assert.ok(isLegal(S, move), `${level} wrote on ${move} at move ${S.history.length} (${n}x${n})`);
      playMove(S, move);
      assert.ok(++guard <= n * n, 'a game cannot be longer than the sheet');
    }
    assert.ok(S.over.winner === X || S.over.winner === O);
    assert.strictEqual(legalMoves(S).length, 0);
  }
});
test('hard takes a win in one and avoids walking into a dead end', () => {
  // O's last mark has exactly one empty square next to it, and X can take it
  const S = newGame(11);
  const oHead = at(11, 5, 5); S.head[O] = oHead; S.occ[oHead] = 2;
  for (const [r, c] of [[4, 4], [4, 5], [4, 6], [5, 4], [6, 4], [6, 5], [6, 6]]) S.occ[at(11, r, c)] = 2;   // only (5,6) is left
  const xHead = at(11, 4, 7); S.head[X] = xHead; S.occ[xHead] = 1; S.turn = X;
  for (const level of ['medium', 'hard']) assert.strictEqual(AI.think(S, { level, timeMs: 50 }).move, at(11, 5, 6), level);
});
console.log(passed, 'passed');
