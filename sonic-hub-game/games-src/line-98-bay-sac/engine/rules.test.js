// node engine/rules.test.js — the rules, one at a time, each as docs/RULES.md states it.
const assert = require('assert');
const L = require('./rules');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 5).join('\n  ')); process.exitCode = 1; } }

/** A game from a picture: nine rows of nine signs, '.' an empty square, a digit 0..6 a ball of that colour.
 *  `next` is the three to come as [colour, row, column], three times. */
function game(rows, next = [[0, 0, 0], [0, 0, 1], [0, 0, 2]], shown = true) {
  assert.strictEqual(rows.length, 9);
  const board = [];
  for (const row of rows) { const r = row.replace(/ /g, ''); assert.strictEqual(r.length, 9, row); for (const ch of r) board.push(ch === '.' ? -1 : Number(ch)); }
  return { board, next: next.map(([c, y, x]) => ({ c, at: y * 9 + x })), shown, score: 0, moves: 0, over: false, back: null };
}
const at = (y, x) => y * 9 + x;
const picture = s => { const out = []; for (let y = 0; y < 9; y++) out.push(s.board.slice(y * 9, y * 9 + 9).map(c => (c < 0 ? '.' : c)).join('')); return out; };
/** a source that hands out these numbers and nothing else, and checks each was asked for within its range */
function told(...values) {
  let i = 0;
  const rnd = n => { assert.ok(i < values.length, 'more numbers were asked for than the test expects'); const v = values[i++]; assert.ok(v >= 0 && v < n, `number ${i} (${v}) was asked for out of ${n}`); return v; };
  rnd.left = () => values.length - i;
  return rnd;
}
const never = () => { throw new Error('no number should have been asked for'); };
const kinds = ev => ev.map(e => e.type + (e.by ? ':' + e.by : '')).join(' ');

test('a game starts with five balls, the three to come on free squares of their own, and no points', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const s = L.newGame(L.seeded(seed));
    assert.strictEqual(s.board.filter(c => c >= 0).length, 5);
    assert.ok(s.board.every(c => c >= -1 && c <= 6));
    assert.strictEqual(s.next.length, 3); assert.strictEqual(s.shown, true);
    assert.strictEqual(new Set(s.next.map(b => b.at)).size, 3);
    for (const b of s.next) { assert.strictEqual(s.board[b.at], -1); assert.ok(b.c >= 0 && b.c <= 6); }
    assert.strictEqual(s.score, 0); assert.strictEqual(s.over, false); assert.strictEqual(s.back, null);
  }
});
test('every colour and every square turns up at the start, each about as often as the others', () => {
  const colours = new Array(7).fill(0), squares = new Array(81).fill(0), rnd = L.seeded(98);
  for (let i = 0; i < 6000; i++) { const s = L.newGame(rnd); s.board.forEach((c, k) => { if (c >= 0) { colours[c]++; squares[k]++; } }); }
  for (const n of colours) assert.ok(Math.abs(n - 30000 / 7) < 300, 'colours ' + colours);
  for (const n of squares) assert.ok(Math.abs(n - 30000 / 81) < 90, 'squares ' + squares);
});

test('a ball goes only to a free square it can get to over free squares side by side', () => {
  const s = game([
    '0 . 1 . . . . . .',
    '. . 1 . . . . . .',
    '1 1 1 . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . 2']);
  assert.deepStrictEqual(L.path(s, at(0, 0), at(0, 1)), [at(0, 0), at(0, 1)]);
  assert.deepStrictEqual(L.path(s, at(0, 0), at(1, 1)).length, 3);
  assert.strictEqual(L.path(s, at(0, 0), at(3, 3)), null, 'walled in: corners do not join squares');
  assert.strictEqual(L.path(s, at(0, 0), at(0, 2)), null, 'a square with a ball on it');
  assert.strictEqual(L.path(s, at(0, 0), at(0, 0)), null);
  assert.strictEqual(L.path(s, at(4, 4), at(0, 0)), null, 'no ball to move');
  assert.deepStrictEqual(L.reach(s, at(0, 0)).sort((a, b) => a - b), [at(0, 1), at(1, 0), at(1, 1)]);
  assert.strictEqual(L.move(s, at(0, 0), at(3, 3), never), null);
  assert.strictEqual(s.back, null, 'a move that cannot be made changes nothing');
});
test('the way taken is a shortest one, and of several the one the program takes', () => {
  const s = game(['. . . . . . . . .', '. 3 . . . . . . .', '. . . . . . . . .', '. . . . . . . . .', '. . . . . . . . .', '. . . . . . . . .', '. . . . . . . . .', '. . . . . . . . .', '. . . . . . . . .']);
  // from the far end backwards: the square to the right if it is on a shortest way, else left, else below, else above
  // so on an open board a ball goes up or down first and along the row last
  assert.deepStrictEqual(L.path(s, at(1, 1), at(3, 3)), [at(1, 1), at(2, 1), at(3, 1), at(3, 2), at(3, 3)]);
  assert.deepStrictEqual(L.path(s, at(1, 1), at(3, 0)), [at(1, 1), at(2, 1), at(3, 1), at(3, 0)]);
  assert.deepStrictEqual(L.path(s, at(1, 1), at(0, 3)), [at(1, 1), at(0, 1), at(0, 2), at(0, 3)]);
  s.board[at(2, 1)] = 5;                                    // with the square below taken there are two ways round: it goes by the right
  assert.deepStrictEqual(L.path(s, at(1, 1), at(3, 1)), [at(1, 1), at(1, 2), at(2, 2), at(3, 2), at(3, 1)]);
  const rnd = L.seeded(7);
  for (let i = 0; i < 300; i++) {
    const g = L.newGame(rnd); for (let k = 0; k < 30; k++) { const e = Math.floor(rnd(81)); if (g.board[e] < 0) g.board[e] = rnd(7); }
    const from = g.board.findIndex(c => c >= 0);
    for (const to of L.reach(g, from)) {
      const way = L.path(g, from, to);
      assert.strictEqual(way[0], from); assert.strictEqual(way[way.length - 1], to);
      for (let k = 1; k < way.length; k++) { const d = Math.abs(way[k] - way[k - 1]); assert.ok(d === 9 || (d === 1 && Math.floor(way[k] / 9) === Math.floor(way[k - 1] / 9))); assert.strictEqual(g.board[way[k]], -1); }
      assert.strictEqual(new Set(way).size, way.length);
    }
  }
});

test('after a move that takes nothing off, the three to come come up where they were shown, and three more are drawn', () => {
  const s = game([
    '0 . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .'], [[1, 4, 4], [2, 5, 5], [3, 6, 6]]);
  // the numbers asked for: three colours, then three squares out of those still open
  const rnd = told(4, 5, 6, 0, 0, 0);
  const ev = L.move(s, at(0, 0), at(0, 3), rnd);
  assert.strictEqual(kinds(ev), 'move grow next');
  assert.strictEqual(rnd.left(), 0);
  assert.deepStrictEqual(ev[0], { type: 'move', colour: 0, path: [0, 1, 2, 3] });
  assert.deepStrictEqual(ev[1].balls, [{ c: 1, at: at(4, 4), from: null }, { c: 2, at: at(5, 5), from: null }, { c: 3, at: at(6, 6), from: null }]);
  assert.strictEqual(s.board[at(4, 4)], 1); assert.strictEqual(s.board[at(5, 5)], 2); assert.strictEqual(s.board[at(6, 6)], 3);
  assert.strictEqual(s.board[at(0, 0)], -1); assert.strictEqual(s.board[at(0, 3)], 0);
  // the first free squares in order are 0, 1, 2 (the moved ball is on 3)
  assert.deepStrictEqual(s.next, [{ c: 4, at: 0 }, { c: 5, at: 1 }, { c: 6, at: 2 }]);
  assert.strictEqual(s.shown, true); assert.strictEqual(s.score, 0); assert.strictEqual(s.moves, 1); assert.strictEqual(s.over, false);
});
test('a ball may pass over, and stop on, a square one of the three is to come up on; that one then comes up somewhere else', () => {
  const s = game([
    '0 . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .'], [[1, 0, 2], [2, 0, 1], [3, 8, 8]]);
  // ball 0 of the three loses its square to the moved ball. Open to it: every free square but the other two's
  // (1 and 80), so the open squares start 0, 3, 4, ... and number 2 of them is square 4
  const rnd = told(2, 0, 0, 0, 5, 5, 5);
  const ev = L.move(s, at(0, 0), at(0, 2), rnd);
  assert.strictEqual(kinds(ev), 'move grow next');
  assert.deepStrictEqual(ev[1].balls[0], { c: 1, at: 4, from: 2 });
  assert.strictEqual(s.board[2], 0); assert.strictEqual(s.board[4], 1); assert.strictEqual(s.board[1], 2); assert.strictEqual(s.board[80], 3);
  for (let seed = 1; seed <= 300; seed++) {          // never onto a ball, never onto another of the three
    const g = game(picture(s).map(r => r.split('').join(' ')), [[1, 0, 5], [2, 0, 6], [3, 0, 7]]);
    g.board[at(0, 5)] = -1; g.board[at(0, 6)] = -1; g.board[at(0, 7)] = -1;
    const out = L.move(g, at(0, 2), at(0, 6), L.seeded(seed));
    const places = out[1].balls.map(b => b.at);
    assert.strictEqual(new Set(places).size, 3); assert.ok(!places.includes(at(0, 6)));
    assert.strictEqual(out[1].balls[1].from, at(0, 6));
  }
});

const lineGame = (len, extra = []) => {
  // a row of len - 1 balls of colour 3 from the left of row 4, and the one that completes it waiting below its end
  const rows = Array.from({ length: 9 }, () => new Array(9).fill('.'));
  for (let x = 0; x < len - 1; x++) rows[4][x] = '3';
  rows[5][len - 1] = '3';
  for (const [y, x, c] of extra) rows[y][x] = String(c);
  return game(rows.map(r => r.join(' ')), [[1, 8, 6], [2, 8, 7], [5, 8, 8]]);
};
test('five in a row are taken off for 5 points, nothing comes up, and the three to come stay as they were', () => {
  const s = lineGame(5, [[0, 8, 0]]), before = JSON.stringify([s.next, s.shown]);      // a ball far away, so the board is not left empty
  const ev = L.move(s, at(5, 4), at(4, 4), never);
  assert.strictEqual(kinds(ev), 'move clear:move');
  assert.deepStrictEqual(ev[1].groups, [{ colour: 3, cells: [36, 37, 38, 39, 40], points: 5 }]);
  assert.strictEqual(s.score, 5); assert.strictEqual(s.moves, 1); assert.strictEqual(s.over, false);
  assert.deepStrictEqual(picture(s).join('').replace(/\./g, ''), '0');
  assert.strictEqual(JSON.stringify([s.next, s.shown]), before);
});
test('the more balls in a line, the more each is worth: 5, 12, 21, 32 and 45 points', () => {
  const want = { 5: 5, 6: 12, 7: 21, 8: 32, 9: 45 };
  for (let len = 5; len <= 9; len++) {
    assert.strictEqual(L.points(len), want[len]);
    const s = lineGame(len, [[0, 8, 6]]);      // one more ball far away, so the board is not left empty
    const ev = L.move(s, at(5, len - 1), at(4, len - 1), never);
    assert.strictEqual(kinds(ev), 'move clear:move', 'length ' + len);
    assert.strictEqual(ev[1].groups[0].cells.length, len);
    assert.strictEqual(s.score, want[len]);
    assert.strictEqual(s.board.filter(c => c >= 0).length, 1);
    assert.deepStrictEqual(s.next, [{ c: 1, at: at(8, 6) }, { c: 2, at: at(8, 7) }, { c: 5, at: at(8, 8) }]);
    assert.strictEqual(s.shown, true);
  }
});
test('four in a row are not a line', () => {
  const s = lineGame(4, [[0, 8, 6]]);
  const ev = L.move(s, at(5, 3), at(4, 3), L.seeded(1));
  assert.strictEqual(kinds(ev), 'move grow next'); assert.strictEqual(s.score, 0);
});
test('a line may run across, down, or either way aslant', () => {
  const ways = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dy, dx] of ways) {
    const rows = Array.from({ length: 9 }, () => new Array(9).fill('.'));
    const y0 = 2, x0 = dx < 0 ? 6 : 2;
    for (let k = 0; k < 4; k++) rows[y0 + k * dy][x0 + k * dx] = '6';
    const ey = y0 + 4 * dy, ex = x0 + 4 * dx;                // where the fifth is to go
    rows[8][0] = '6'; rows[0][8] = '2';
    const s = game(rows.map(r => r.join(' ')), [[1, 8, 6], [2, 8, 7], [5, 8, 8]]);
    const ev = L.move(s, at(8, 0), at(ey, ex), never);
    assert.strictEqual(kinds(ev), 'move clear:move', `way ${dy},${dx}`);
    assert.strictEqual(s.score, 5);
    assert.deepStrictEqual(picture(s).join('').replace(/\./g, ''), '2');
  }
});
test('two lines that cross are taken together, the ball they share counted once: nine balls, 45 points', () => {
  const s = game([
    '. . . . 1 . . . .',
    '. . . . 1 . . . .',
    '1 1 . 1 1 . . . .',
    '. . . . 1 . . . .',
    '. . . . 1 . . . .',
    '. . 1 . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . 0',
    '. . . . . . . . .'], [[1, 8, 6], [2, 8, 7], [5, 8, 8]]);
  const ev = L.move(s, at(5, 2), at(2, 2), never);
  assert.strictEqual(kinds(ev), 'move clear:move');
  assert.strictEqual(ev[1].groups.length, 1);
  assert.strictEqual(ev[1].groups[0].cells.length, 9); assert.strictEqual(ev[1].groups[0].points, 45);
  assert.strictEqual(s.score, 45);
  assert.strictEqual(s.board.filter(c => c >= 0).length, 1);
});
test('a line longer than five is taken whole, wherever the ball that completes it lands', () => {
  const s = game([
    '. . . . . . . . .',
    '4 4 4 . 4 4 4 . .',
    '. . . 4 . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . 0',
    '. . . . . . . . .'], [[1, 8, 6], [2, 8, 7], [5, 8, 8]]);
  const ev = L.move(s, at(2, 3), at(1, 3), never);
  assert.strictEqual(ev[1].groups[0].cells.length, 7); assert.strictEqual(s.score, 21);
});

test('a line made by the balls that come up is taken and counts, and the game goes on with the next three', () => {
  const s = game([
    '2 2 2 2 . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . 0',
    '. . . . . . . . .'], [[2, 0, 4], [3, 5, 5], [4, 6, 6]]);
  const rnd = told(1, 1, 1, 10, 10, 10);
  const ev = L.move(s, at(7, 8), at(8, 8), rnd);
  assert.strictEqual(kinds(ev), 'move grow next clear:grow');
  assert.deepStrictEqual(ev[3].groups, [{ colour: 2, cells: [0, 1, 2, 3, 4], points: 5 }]);
  assert.strictEqual(s.score, 5);
  assert.strictEqual(s.board.filter(c => c >= 0).length, 3);
  assert.strictEqual(s.next.every(b => b.c === 1), true);
  assert.strictEqual(s.over, false);
});
test('balls of two colours taken at one time are counted colour by colour', () => {
  const s = game([
    '2 2 2 2 . . . . .',
    '. . . . . . . . .',
    '5 5 5 5 5 . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . 0',
    '. . . . . . . . .'], [[2, 0, 4], [5, 2, 5], [4, 6, 6]]);
  s.board[at(2, 4)] = -1;                       // the fives are four, with a gap the coming ball does not fill…
  s.board[at(2, 4)] = 5; s.board[at(2, 5)] = -1; s.board[at(2, 0)] = -1; // …so: 5s on columns 1..4, the coming one on column 5
  const ev = L.move(s, at(7, 8), at(8, 8), L.seeded(3));
  const clear = ev.find(e => e.type === 'clear');
  assert.strictEqual(clear.by, 'grow');
  assert.deepStrictEqual(clear.groups.map(g => [g.colour, g.cells.length, g.points]), [[2, 5, 5], [5, 5, 5]]);
  assert.strictEqual(s.score, 10);
});
test('of two separate lines of one colour running the same way, one is taken at this look and the other at the next', () => {
  const s = game([
    '2 2 2 2 . . . . .',
    '. . . . . . . . .',
    '2 2 2 2 2 . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . .',
    '. . . . . . . . 0',
    '. . . . . . . 6 .'], [[2, 0, 4], [2, 2, 5], [4, 6, 6]]);
  s.board[at(2, 0)] = -1;                        // row 2: columns 1..4, and the coming ball on column 5
  let ev = L.move(s, at(7, 8), at(8, 8), L.seeded(3));
  let clear = ev.find(e => e.type === 'clear');
  assert.strictEqual(clear.groups.length, 1);
  assert.deepStrictEqual(clear.groups[0].cells, [0, 1, 2, 3, 4], 'the first one found, from the top');
  assert.strictEqual(s.score, 5);
  assert.deepStrictEqual(s.board.slice(18, 27), [-1, 2, 2, 2, 2, 2, -1, -1, -1], 'the other stands, for now');
  const before = JSON.stringify(s.next);
  ev = L.move(s, at(8, 7), at(7, 7), never);     // any move: the look after it finds the line, and nothing comes up
  assert.strictEqual(kinds(ev), 'move clear:move'); assert.strictEqual(s.score, 10);
  assert.strictEqual(JSON.stringify(s.next), before);
});

/** a board with a ball on every square and no five alike in any line; `holes` are left free */
function crowded(holes) {
  const rows = Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) => String((x + 2 * y) % 7)));
  for (const [y, x] of holes) rows[y][x] = '.';
  return rows.map(r => r.join(' '));
}
test('with fewer than three free squares after a move that takes nothing, the game is over and nothing more comes up', () => {
  const s = game(crowded([[0, 0], [0, 1]]), [[1, 0, 0], [2, 0, 1], [3, 8, 8]], false);
  assert.strictEqual(linesThePlainWay(s.board).size, 0);
  const ev = L.move(s, at(0, 2), at(0, 1), never);          // still two free squares afterwards
  assert.strictEqual(kinds(ev), 'move over');
  assert.strictEqual(s.over, true); assert.strictEqual(L.freeCount(s), 2, 'the last squares stay empty');
  assert.strictEqual(s.back, null);
  assert.strictEqual(L.move(s, at(0, 1), at(0, 0), never), null, 'a game that is over takes no move');
  assert.strictEqual(L.stepBack(s, never), false, 'and no step back');
});
test('with three free squares the three come up; a full board then ends the game', () => {
  const s = game(crowded([[0, 0], [0, 1], [8, 8]]), [[0, 0, 0], [3, 0, 1], [5, 8, 8]]);
  // the ball on (0,2) steps to (0,1), onto the square the second of the three was to have: that one is given the
  // only square open to it, (0,2). Nothing is asked for the next three's squares: none is free
  const ev = L.move(s, at(0, 2), at(0, 1), told(0, 1, 2, 3));
  assert.strictEqual(kinds(ev), 'move grow next over');
  assert.deepStrictEqual(ev[1].balls, [{ c: 0, at: at(0, 0), from: null }, { c: 3, at: at(0, 2), from: at(0, 1) }, { c: 5, at: at(8, 8), from: null }]);
  assert.strictEqual(L.freeCount(s), 0); assert.strictEqual(s.over, true);
});
test('with fewer than three squares free, the three to come have colours and no squares; a line taken then gives them room again', () => {
  const s = game(crowded([[0, 0], [0, 1], [4, 4], [8, 8]]), [[0, 0, 0], [3, 4, 4], [5, 8, 8]]);
  // (0,2) steps to (0,1): free are (0,0), (0,2), (4,4), (8,8); the three come up on their squares and (0,2) is left
  let ev = L.move(s, at(0, 2), at(0, 1), told(4, 5, 6));
  assert.strictEqual(kinds(ev), 'move grow next');
  assert.strictEqual(s.over, false); assert.strictEqual(L.freeCount(s), 1);
  assert.strictEqual(s.shown, false);
  assert.deepStrictEqual(s.next.map(b => b.c), [4, 5, 6]);
  assert.deepStrictEqual(ev[2], { type: 'next', next: s.next, shown: false });
  // one square free: any move into it frees another, two are free, nothing is taken: over
  ev = L.move(s, at(0, 3), at(0, 2), never);
  assert.strictEqual(kinds(ev), 'move over');
});
test('a board left with nothing on it gets the three to come at once', () => {
  const s = lineGame(5);
  const rnd = told(6, 6, 6, 0, 0, 0);
  const ev = L.move(s, at(5, 4), at(4, 4), rnd);
  assert.strictEqual(kinds(ev), 'move clear:move grow next');
  assert.strictEqual(s.board.filter(c => c >= 0).length, 3);
  assert.strictEqual(s.board[at(8, 6)], 1); assert.strictEqual(s.board[at(8, 7)], 2); assert.strictEqual(s.board[at(8, 8)], 5);
  assert.strictEqual(s.score, 5); assert.strictEqual(s.over, false);
});

test('Step back returns the board, the points and the three to come to what they were, once', () => {
  const s = L.newGame(L.seeded(11)), before = JSON.stringify([s.board, s.next, s.shown, s.score, s.moves]);
  assert.strictEqual(L.stepBack(s, never), false, 'nothing to step back to before the first move');
  const from = s.board.findIndex(c => c >= 0), to = L.reach(s, from)[0];
  L.move(s, from, to, L.seeded(5));
  assert.notStrictEqual(JSON.stringify([s.board, s.next, s.shown, s.score, s.moves]), before);
  assert.strictEqual(L.stepBack(s, never), true);
  assert.strictEqual(JSON.stringify([s.board, s.next, s.shown, s.score, s.moves]), before);
  assert.strictEqual(L.stepBack(s, never), false, 'one move only');
  // points won by the move go back with it
  const g = lineGame(6, [[0, 8, 6]]);
  L.move(g, at(5, 5), at(4, 5), never); assert.strictEqual(g.score, 12);
  L.stepBack(g, never); assert.strictEqual(g.score, 0); assert.strictEqual(g.board[at(5, 5)], 3);
});

/* Every line there is, found the plain way: for every ball, how many of its colour stand in a row through it. */
function linesThePlainWay(board) {
  const hit = new Set();
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    const c = board[y * 9 + x]; if (c < 0) continue;
    for (const [dy, dx] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const py = y - dy, px = x - dx;
      if (py >= 0 && px >= 0 && px < 9 && board[py * 9 + px] === c) continue;      // not the start of its run
      const run = [];
      for (let ky = y, kx = x; ky < 9 && kx >= 0 && kx < 9 && board[ky * 9 + kx] === c; ky += dy, kx += dx) run.push(ky * 9 + kx);
      if (run.length >= 5) run.forEach(k => hit.add(k));
    }
  }
  return hit;
}
test('whole games played at random: nothing is ever left standing in a line, and the count of points is the sum of its parts', () => {
  const rnd = L.seeded(1998);
  let games = 0, moves = 0, cleared = 0, grown = 0, best = 0;
  for (; games < 400; games++) {
    const s = L.newGame(rnd);
    let total = 0;
    for (let guard = 0; guard < 5000 && !s.over; guard++) {
      const balls = []; s.board.forEach((c, k) => { if (c >= 0) balls.push(k); });
      let from = -1, targets = [];
      for (let tries = 0; tries < 40 && !targets.length; tries++) { from = balls[rnd(balls.length)]; targets = L.reach(s, from); }
      if (!targets.length) { for (const b of balls) { targets = L.reach(s, b); if (targets.length) { from = b; break; } } }
      assert.ok(targets.length, 'a game that is not over has a move');
      const before = s.board.filter(c => c >= 0).length, to = targets[rnd(targets.length)];
      const ev = L.move(s, from, to, rnd);
      moves++;
      let took = 0, came = 0;
      for (const e of ev) {
        if (e.type === 'clear') for (const g of e.groups) { took += g.cells.length; total += g.points; assert.strictEqual(g.points, (g.cells.length - 4) * g.cells.length); assert.ok(g.cells.length >= 5); cleared++; }
        if (e.type === 'grow') { came += e.balls.length; grown++; assert.strictEqual(e.balls.length, 3); }
      }
      assert.strictEqual(s.board.filter(c => c >= 0).length, before - took + came);
      assert.strictEqual(s.score, total);
      const byMove = ev.find(e => e.type === 'clear' && e.by === 'move');
      if (!byMove && !s.over) assert.strictEqual(came, 3, 'no line by the move: three come up');
      if (byMove && before - took > 0) assert.strictEqual(came, 0, 'a line by the move: nothing comes up');
      assert.strictEqual(linesThePlainWay(s.board).size, 0, 'a line was left standing:\n' + picture(s).join('\n'));
      if (!s.over) {
        assert.ok(L.freeCount(s) > 0);
        assert.strictEqual(new Set(s.next.map(b => b.at)).size, 3);
        // squares of their own: free ones, unless the ball that just moved stands on one (it had taken a line, so nothing came up)
        if (s.shown) for (const b of s.next) assert.ok(s.board[b.at] === -1 || b.at === to);
        if (ev.some(e => e.type === 'next')) assert.strictEqual(ev.filter(e => e.type === 'next').pop().shown, s.shown);
      } else assert.ok(L.freeCount(s) < 3 || !byMove);
    }
    assert.ok(s.over, 'a game played at random ends');
    best = Math.max(best, s.score);
  }
  assert.ok(cleared > 20 && grown > 5000, `too little happened: ${cleared} lines, ${grown} times three came up`);
  console.log(`  (${games} games, ${moves} moves, ${cleared} lines taken, best ${best} points)`);
});

console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
