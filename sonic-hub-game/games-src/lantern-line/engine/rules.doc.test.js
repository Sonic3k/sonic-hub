// node engine/rules.doc.test.js — every statement docs/RULES.md makes, asked of the rules themselves, and every
// drawing and number on that page read off the page and checked. The numbers in the test names are its sections.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'rules.js'), 'utf8'), { filename: 'rules.js' });
const PAGE = fs.readFileSync(path.join(__dirname, '..', 'docs', 'RULES.md'), 'utf8');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }

const L = (n, name) => { const m = lineAt(name, n); assert.ok(m >= 0, 'no such line: ' + name); return m; };
function played(n, names) { const S = newGame(n); for (const name of names) assert.ok(playMove(S, L(n, name)), 'cannot draw ' + name); return S; }
const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** the text of one section of the page, by the number its heading starts with */
function section(no) { const hit = new RegExp('^## ' + no + '\\. [^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))', 'm').exec(PAGE); assert.ok(hit, 'the page has lost section ' + no); return hit[1]; }
/** The drawings in a stretch of the page: each { cols, rows, text } where text is the drawing's lines as written,
 *  without the indent of its code block. */
function drawings(text) {
  const out = [], fence = /^( *)```\n([\s\S]*?)^\1```/gm;
  for (let hit; (hit = fence.exec(text));) {
    const lines = hit[2].split('\n').map(l => l.slice(hit[1].length).replace(/\s+$/, ''));
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    if (!/^ {5}a( {3}[b-h])*$/.test(lines[0] || '')) continue;
    out.push({ cols: (lines[0].length - 6) / 4 + 1, rows: lines.filter(l => /^ *\d  \+/.test(l)).length, text: lines.join('\n') });
  }
  return out;
}
/** A board as the page draws it: its top left `cols` × `rows` dots. */
function draw(S, cols = S.n + 1, rows = S.n + 1) {
  const n = S.n, g = S.g, out = ['     ' + [...COLS.slice(0, cols)].join('   ')];
  for (let y = 0; y < rows; y++) {
    let row = String(y + 1).padStart(3) + '  ';
    for (let x = 0; x < cols; x++) { row += '+'; if (x < cols - 1) row += S.line[x + n * y] ? '---' : '   '; }
    out.push(row);
    if (y === rows - 1) break;
    let box = '     ';
    for (let x = 0; x < cols; x++) { box += S.line[g.across + x + g.dots * y] ? '|' : ' '; if (x < cols - 1) { const o = S.owner[x + n * y]; box += ' ' + (o === RED ? 'R' : o === GOLD ? 'G' : ' ') + ' '; } }
    out.push(box.replace(/\s+$/, ''));
  }
  return out.join('\n');
}
/** The position a whole-board drawing shows, with this side to move: its lines, and its squares taken as lettered. */
function read(d, n, turn) {
  assert.strictEqual(d.cols, n + 1, 'a whole board'); assert.strictEqual(d.rows, n + 1);
  const S = newGame(n), g = S.g, rows = d.text.split('\n').slice(1);
  for (let y = 0; y <= n; y++) {
    const dots = rows[2 * y], box = (rows[2 * y + 1] || '').padEnd(5 + 4 * n + 1);
    for (let x = 0; x < n; x++) if (dots.slice(6 + 4 * x, 9 + 4 * x) === '---') S.line[x + n * y] = 1;
    if (y === n) break;
    for (let x = 0; x <= n; x++) if (box[5 + 4 * x] === '|') S.line[g.across + x + g.dots * y] = 1;
    for (let x = 0; x < n; x++) { const ch = box[7 + 4 * x]; if (ch !== ' ') { S.owner[x + n * y] = ch === 'R' ? RED : GOLD; S.score[ch === 'R' ? RED : GOLD]++; } }
  }
  for (let m = 0; m < g.lines; m++) if (S.line[m]) { S.left--; for (const s of [g.lineSq[2 * m], g.lineSq[2 * m + 1]]) if (s >= 0) S.sides[s]++; }
  for (let s = 0; s < g.squares; s++) assert.strictEqual(S.sides[s] === 4, S.owner[s] >= 0, 'a square has all four sides when, and only when, it is taken');
  S.turn = turn;
  assert.strictEqual(draw(S), d.text, 'the drawing is not a board');
  return S;
}
const numbers = row => row.split('|').slice(2, -1).map(c => +c.trim().replace(/,/g, ''));
const rowOf = (text, start) => numbers(text.split('\n').find(l => l.startsWith('| ' + start)));

test('1: Red draws first, the sides take turns, and a line that takes nothing hands the turn over', () => {
  const S = newGame(5); assert.strictEqual(S.turn, RED);
  ['a1-b1', 'c3-d3', 'e5-f5', 'a6-b6'].forEach((name, i) => { assert.strictEqual(S.turn, i % 2 ? GOLD : RED); playMove(S, L(5, name)); });
});
test('2: the table of boards is what the rules have', () => {
  const rows = section(2).split('\n').filter(l => /^\| \d × \d /.test(l));
  assert.strictEqual(rows.length, SIZES.length);
  rows.forEach((row, i) => {
    const n = SIZES[i], g = geometry(n), cells = row.split('|').slice(1, -1).map(c => c.trim());
    assert.deepStrictEqual(cells, [`${n} × ${n}`, `${n + 1} × ${n + 1}`, String(g.squares), String(g.lines), `${(g.squares + 1) / 2} or more`]);
    assert.strictEqual(g.dots, n + 1);
  });
});
test('2: the names of dots, lines and squares, as the page gives them', () => {
  for (const n of SIZES) assert.strictEqual(dotName(0, n), 'a1', 'a1 is the top left dot on both boards');
  const g = geometry(5);
  assert.deepStrictEqual([lineAt('a1-b1', 5) < g.across, lineAt('a1-a2', 5) >= g.across], [true, true]);
  assert.deepStrictEqual(Array.from(g.sqLine.subarray(0, 4)).map(m => lineName(m, 5)).sort(), ['a1-a2', 'a1-b1', 'a2-b2', 'b1-b2'], 'square a1 has a1, b1, a2 and b2 at its corners');
});
test('2: the drawing of the 5 × 5 board at the start is the start', () => {
  const [start] = drawings(section(2));
  assert.strictEqual(start.text, draw(newGame(5)));
  read(start, 5, RED);
});
test('3: a move is one line between dots next to each other, not yet drawn, open to whoever is to move', () => {
  for (const name of ['a1-c1', 'a1-b2', 'b2-a1', 'a1-a3', 'a1-a1']) assert.strictEqual(lineAt(name, 5), -1, name);
  const S = played(5, ['a1-b1']);
  assert.ok(!isLegal(S, L(5, 'a1-b1')), 'a line already there');
  assert.strictEqual(legalMoves(S).length, 59); assert.strictEqual(S.turn, GOLD);
});
test('3: a line round the edge is a side of one square, every other line a side of two', () => {
  for (const n of SIZES) {
    const g = geometry(n);
    for (let m = 0; m < g.lines; m++) {
      const d0 = g.lineDot[2 * m], x = d0 % g.dots, y = (d0 / g.dots) | 0, edge = m < g.across ? y === 0 || y === n : x === 0 || x === n;
      assert.strictEqual((g.lineSq[2 * m] >= 0) + (g.lineSq[2 * m + 1] >= 0), edge ? 1 : 2, lineName(m, n));
    }
  }
});
test('4: the drawings of a square taken: Red a1-b1, Gold b1-b2, Red a2-b2, then Gold a1-a2', () => {
  const [before, after, both] = drawings(section(4));
  const S = played(5, ['a1-b1', 'b1-b2', 'a2-b2']);
  assert.strictEqual(before.text, draw(S, before.cols, before.rows));
  assert.deepStrictEqual([S.sides[0], S.turn], [3, GOLD]);
  const ev = playMove(S, L(5, 'a1-a2'));
  assert.deepStrictEqual([ev.side, ev.took, ev.again, S.turn], [GOLD, [0], true, GOLD], 'Gold takes square a1, and draws again');
  assert.strictEqual(after.text, draw(S, after.cols, after.rows));
  const T = played(5, ['a1-b1', 'a2-b2', 'a1-a2', 'b1-c1', 'b2-c2', 'c1-c2']);
  assert.strictEqual(both.text, draw(T, both.cols, both.rows));
  assert.deepStrictEqual([T.sides[0], T.sides[1], T.turn], [3, 3, RED], 'a1 and b1 each have three sides, and it is Red\'s turn');
  const e2 = playMove(T, L(5, 'b1-b2'));
  assert.deepStrictEqual([e2.took, e2.again, T.score, T.turn], [[0, 1], true, [2, 0], RED]);
  playMove(T, L(5, 'd4-e4')); assert.strictEqual(T.turn, GOLD, 'once: one more line, and the turn is over');
});
test('4: a turn goes on while each line takes; the last line of the board ends the game with nobody drawing after it', () => {
  // squares a1 and b1 side by side, a1 with three sides and b1 with two, Gold to draw: b1-b2 takes a1 and gives b1 its
  // third side, c1-c2 takes b1, and the first line that takes nothing ends Gold's turn
  const S = played(5, ['a1-b1', 'b1-c1', 'a2-b2', 'b2-c2', 'a1-a2']);
  assert.deepStrictEqual([S.turn, S.sides[0], S.sides[1]], [GOLD, 3, 2]);
  assert.deepStrictEqual([playMove(S, L(5, 'b1-b2')).took, S.turn], [[0], GOLD]);
  assert.deepStrictEqual([playMove(S, L(5, 'c1-c2')).took, S.turn], [[1], GOLD]);
  assert.deepStrictEqual([playMove(S, L(5, 'e5-f5')).took, S.turn, S.score], [[], RED, [0, 2]]);
  const rand = rng(9);
  for (const n of SIZES) {
    const G = newGame(n);
    while (G.left > 1) { const ms = legalMoves(G); playMove(G, ms[Math.floor(rand() * ms.length)]); }
    const ev = playMove(G, legalMoves(G)[0]);
    assert.ok(ev.took.length > 0 && !ev.again && G.over && !legalMoves(G).length);
  }
});
test('5: taking is a choice: any other line may be drawn, and the square waits for whoever draws its fourth side', () => {
  const S = played(5, ['a1-b1', 'b1-b2', 'a2-b2']);
  assert.ok(isLegal(S, L(5, 'd4-d5')));
  playMove(S, L(5, 'd4-d5')); assert.deepStrictEqual([S.turn, S.sides[0], S.owner[0]], [RED, 3, -1], 'Gold left it: now Red may take it');
  playMove(S, L(5, 'a1-a2')); assert.deepStrictEqual([S.owner[0], S.turn], [RED, RED]);
});
test('5: a side that has taken must draw again, even when every line left gives squares away', () => {
  const rand = rng(4);
  for (let game = 0; game < 50; game++) {
    const S = newGame(5);
    while (!S.over) {
      const ms = legalMoves(S), safe = ms.filter(m => isSafe(S, m)), took = ms.filter(m => takes(S, m));
      const m = took.length ? took[0] : safe.length ? safe[Math.floor(rand() * safe.length)] : ms[Math.floor(rand() * ms.length)];
      const before = S.turn, ev = playMove(S, m);
      if (ev.took.length && !S.over) assert.strictEqual(S.turn, before);
    }
  }
});
test('6: the game ends with the last line; every square is taken; more squares wins; no draw; 60 and 112 lines', () => {
  assert.match(section(6), /lasts 60 lines and on the 7 × 7 board 112/);
  const rand = rng(6);
  for (const n of SIZES) for (let game = 0; game < 100; game++) {
    const S = newGame(n);
    while (!S.over) { const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]); }
    assert.strictEqual(S.history.length, geometry(n).lines);
    assert.strictEqual(S.score[0] + S.score[1], n * n); assert.notStrictEqual(S.score[0], S.score[1]);
    assert.strictEqual(S.over.winner, S.score[RED] > S.score[GOLD] ? RED : GOLD);
  }
  const S = newGame(5); let i = 0;                         // more than half does not end it
  while (S.score[0] < 13 && S.score[1] < 13) { const ms = legalMoves(S); playMove(S, ms[(i++ * 7) % ms.length]); }
  assert.ok(!S.over || S.left === 0);
});
test('7: the points that are easy to get wrong', () => {
  // 1: whoever drew the other three, the square goes to whoever draws its fourth side
  const one = played(5, ['a1-b1', 'b1-b2', 'a2-b2', 'a1-a2']); assert.strictEqual(one.owner[0], GOLD);
  // 3: two at once is one more line
  const three = played(5, ['a1-b1', 'a2-b2', 'a1-a2', 'b1-c1', 'b2-c2', 'c1-c2', 'b1-b2']);
  assert.strictEqual(three.turn, RED); playMove(three, L(5, 'e5-e6')); assert.strictEqual(three.turn, GOLD);
  // 5: the third side hands the square over
  const five = played(5, ['a1-b1', 'b1-b2']);
  assert.deepStrictEqual(describe(five, L(5, 'a2-b2')).gives, [0]); assert.ok(!isSafe(five, L(5, 'a2-b2')));
  // 6: the edge is not a side: a corner square with its two inner lines has two sides, not four
  const six = played(5, ['b1-b2', 'a2-b2']); assert.deepStrictEqual([six.sides[0], six.owner[0]], [2, -1]);
  // 7: a line drawn stays, and there is always a line to draw until the game is over
  assert.ok(!isLegal(six, L(5, 'b1-b2')));
});
test('8: a safe line gives no square its third side and takes nothing', () => {
  const rand = rng(8);
  for (let k = 0; k < 400; k++) {
    const S = newGame(7), steps = Math.floor(rand() * 100);
    for (let i = 0; i < steps && !S.over; i++) { const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]); }
    for (const m of legalMoves(S)) { const ev = describe(S, m); assert.strictEqual(isSafe(S, m), !ev.took.length && !ev.gives.length && takes(S, m) === 0); }
  }
});
test('9: the numbers of lines the page gives', () => {
  assert.deepStrictEqual([lineAt('a1-b1', 5), lineAt('e6-f6', 5), lineAt('a1-a2', 5), lineAt('f5-f6', 5)], [0, 29, 30, 59]);
  const g = geometry(5);
  for (let y = 0; y <= 5; y++) for (let x = 0; x < 5; x++) assert.strictEqual(lineAt(dotName(x + 6 * y, 5) + '-' + dotName(x + 1 + 6 * y, 5), 5), x + 5 * y);
  for (let y = 0; y < 5; y++) for (let x = 0; x <= 5; x++) assert.strictEqual(lineAt(dotName(x + 6 * y, 5) + '-' + dotName(x + 6 * (y + 1), 5), 5), 30 + x + 6 * y);
  assert.strictEqual(g.across, 30);
});
test('9: the worked position: its drawing, what is said of it, and its counts', () => {
  const text = section(9), [d] = drawings(text), S = read(d, 5, RED);
  assert.strictEqual(S.left, 30); assert.deepStrictEqual(S.score, [0, 0]);
  assert.ok(legalMoves(S).every(m => !isSafe(S, m)), 'no safe line is left');
  const count = (S, k) => {
    if (k === 0) return [1, S.turn === RED ? 1 : 0, S.score[0], S.score[1]];
    const t = [0, 0, 0, 0], ms = []; gen(S, ms);
    for (const m of ms) { make(S, m); const c = count(S, k - 1); unmake(S); for (let i = 0; i < 4; i++) t[i] += c[i]; }
    return t;
  };
  const rows = [rowOf(text, 'Continuations'), rowOf(text, 'after which'), rowOf(text, 'Red\'s squares'), rowOf(text, 'Gold\'s squares')];
  rows[0].forEach((_, i) => assert.deepStrictEqual(count(S, i + 1), rows.map(r => r[i]), (i + 1) + ' lines on'));
});
test('9: engine/counts.txt has as many positions as the page says', () => {
  const lines = fs.readFileSync(path.join(__dirname, 'counts.txt'), 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  assert.strictEqual(lines.length, +/counts for (\d+) positions/.exec(section(9))[1]);
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
