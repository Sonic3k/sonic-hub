// node engine/rules.doc.test.js — docs/RULES.md, asked of the rules themselves.
// Every diagram on that page is read here and what is written under it is checked: who may move where, what a move
// turns over, how the board looks afterwards, who has won. The numbers in the test names are the page's sections.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'rules.js'), 'utf8'), { filename: 'rules.js' });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const PAGE = fs.readFileSync(path.join(__dirname, '..', 'docs', 'RULES.md'), 'utf8');
const DISC = { '.': 0, X: 1, O: 2 }, SIDE_OF = { Dark: DARK, Light: LIGHT };
const text = S => Array.from(S.b, p => '.XO'[p]).join('');
const names = moves => moves.map(sqName).sort().join(' ');
const sorted = list => list.trim().split(/\s+/).sort().join(' ');

/* ── the page's diagrams: each fenced block, with the section it stands in ── */
function blocks() {
  const out = []; let section = '', inside = null;
  for (const line of PAGE.split('\n')) {
    const head = /^#{2,3} (\d+(?:\.\d+)?)/.exec(line);
    if (head && !inside) { section = head[1]; continue; }
    if (line.startsWith('```')) { if (inside) { out.push(inside); inside = null; } else inside = { section, lines: [] }; continue; }
    if (inside) inside.lines.push(line);
  }
  return out;
}
/** A block read: the board drawn (and the second one beside it, if there is one), and the statements under them. */
function read(block) {
  const boards = [new Array(64).fill(0), new Array(64).fill(0)], drawn = [false, false], says = [];
  for (const raw of block.lines) {
    const line = raw.trim();
    if (!line || /^(a b c d e f g h\s*)+$/.test(line)) continue;
    const rows = [...raw.matchAll(/([1-8]) {2}((?:[.XO] ){7}[.XO])/g)];
    if (rows.length) {
      rows.forEach((m, i) => { drawn[i] = true; m[2].split(' ').forEach((ch, f) => { boards[i][(+m[1] - 1) * 8 + f] = DISC[ch]; }); });
      assert.ok(rows.length <= 2 && raw.replace(/([1-8]) {2}((?:[.XO] ){7}[.XO])/g, '').trim() === '', 'a row with more on it than boards: ' + raw);
      continue;
    }
    says.push(line);
  }
  return { before: drawn[0] ? boards[0] : null, after: drawn[1] ? boards[1] : null, says };
}
/** Checks one block; returns how many statements it made. */
function check(block) {
  const { before, after, says } = read(block), where = `section ${block.section}: `;
  assert.ok(says.length, where + 'a diagram with nothing said under it');
  let S = null, n = 0;
  const first = /^(Dark|Light)/.exec(says[0]);
  if (before) S = position(before, first ? SIDE_OF[first[1]] : DARK);
  for (const say of says) {
    let m;
    if ((m = /^From the start: (.+)$/.exec(say))) {
      assert.ok(!before, where + 'a game from the start needs no board');
      S = replay(m[1].trim().split(/\s+/).map(sqOf)); assert.ok(S, where + 'not a game: ' + m[1]);
    } else if ((m = /^(Dark|Light) to move: (.+)$/.exec(say))) {
      assert.strictEqual(S.turn, SIDE_OF[m[1]], where + say);
      if (m[2] === 'pass') assert.deepStrictEqual(legalMoves(S), [PASS_MOVE], where + say); else assert.strictEqual(names(legalMoves(S)), sorted(m[2]), where + say);
    } else if ((m = /^(Dark|Light) plays ([a-h][1-8]), turning (.+)$/.exec(say))) {
      assert.strictEqual(S.turn, SIDE_OF[m[1]], where + say);
      assert.ok(isLegal(S, sqOf(m[2])), where + say);
      const ev = playMove(S, sqOf(m[2]));
      assert.strictEqual(names(ev.flips), sorted(m[3]), where + say);
      assert.ok(after, where + 'a move is shown with the board after it');
      assert.strictEqual(text(S), after.map(p => '.XO'[p]).join(''), where + 'the board after ' + m[2]);
    } else if ((m = /^(Dark|Light) may not play ([a-h][1-8])$/.exec(say))) {
      assert.strictEqual(S.turn, SIDE_OF[m[1]], where + say);
      assert.ok(!isLegal(S, sqOf(m[2])), where + say);
    } else if ((m = /^Nobody can move\. Dark (\d+), Light (\d+): (Dark wins|Light wins|drawn)$/.exec(say))) {
      assert.ok(S.over, where + say);
      assert.deepStrictEqual(S.over.discs, [+m[1], +m[2]], where + say);
      assert.strictEqual(S.over.winner, m[3] === 'drawn' ? -1 : SIDE_OF[m[3].split(' ')[0]], where + say);
      assert.deepStrictEqual(legalMoves(S), [], where + say);
    } else assert.fail(where + 'a line this test cannot read: ' + say);
    n++;
  }
  return n;
}

test('every diagram on the page says something that can be checked, and all of it holds', () => {
  const all = blocks(); let said = 0;
  for (const b of all) said += check(b);
  assert.ok(all.length >= 12 && said >= 15, `${all.length} diagrams, ${said} statements`);
  for (const section of ['2', '3.1', '3.2', '3.3', '3.4', '4', '5']) assert.ok(all.some(b => b.section === section), 'no diagram left in section ' + section);
});

test('1: Dark moves first; a disc is never taken off or moved, it only changes face', () => {
  assert.strictEqual(newGame().turn, DARK);
  const rand = rng(8);
  for (let g = 0; g < 200; g++) {
    const S = newGame();
    while (!S.over) {
      const before = Array.from(S.b), ms = legalMoves(S), m = ms[Math.floor(rand() * ms.length)], ev = playMove(S, m);
      let put = 0, turned = 0;
      for (let s = 0; s < 64; s++) {
        if (before[s] && !S.b[s]) assert.fail('a disc left the board');
        if (!before[s] && S.b[s]) { put++; assert.strictEqual(s, m); assert.strictEqual(S.b[s], ev.side + 1); }
        if (before[s] && S.b[s] !== before[s]) { turned++; assert.strictEqual(S.b[s], ev.side + 1, 'turned to the mover\'s face'); }
      }
      assert.strictEqual(put, m === PASS_MOVE ? 0 : 1); assert.strictEqual(turned, ev.flips.length); if (m !== PASS_MOVE) assert.ok(turned >= 1);
    }
  }
});
test('2: files a to h from the left, ranks 1 to 8 from the top; Light starts on d4 and e5, Dark on e4 and d5', () => {
  const S = newGame();
  assert.deepStrictEqual([sqOf('a1'), sqOf('h1'), sqOf('a8'), sqOf('h8')], [0, 7, 56, 63]);
  assert.deepStrictEqual(['d4', 'e5', 'e4', 'd5'].map(n => S.b[sqOf(n)]), [LIGHT + 1, LIGHT + 1, DARK + 1, DARK + 1]);
  assert.strictEqual(S.b.filter(p => p).length, 4);
});
test('2: 64 discs for 64 squares: one side may put down more than half of them', () => {
  // a game in which Light passes again and again: Dark puts down 37 discs, which a stock of 32 a side would not allow
  const game = 'f5 f4 d3 d6 f6 d2 c6 g6 f3 g4 g3 b7 h4 g2 f2 g7 h1 f1 e2 h2 h3 g5 e1 d1 g1 pass h5 pass c1 pass e3 pass h6 pass c3 c2 b2 b1 b3 a1 a3 b4 a4 pass h7 pass f7 h8 f8 pass e7 pass a5 b5 c4 pass b6 a6 a2 pass e6 pass d7 pass c7 pass b8 c8 d8 pass a8 pass a7';
  const S = newGame(), put = [0, 0];
  for (const name of game.split(' ')) { const m = name === 'pass' ? PASS_MOVE : sqOf(name); if (m !== PASS_MOVE) put[S.turn]++; assert.ok(playMove(S, m), name); }
  assert.deepStrictEqual(put, [37, 20]); assert.deepStrictEqual(S.over.discs, [58, 3]); assert.strictEqual(S.over.why, 'blocked');
});
test('3: a move is one disc on an empty square that encloses at least one disc', () => {
  const rand = rng(4);
  for (let g = 0; g < 100; g++) {
    const S = newGame();
    while (!S.over) {
      const ms = legalMoves(S);
      for (let s = 0; s < 64; s++) assert.strictEqual(ms.includes(s), !S.b[s] && countFlips(S, s) > 0, sqName(s));
      playMove(S, ms[Math.floor(rand() * ms.length)]);
    }
  }
});
test('4: a side with a move may not pass; a side without one has the pass as its only move', () => {
  const rand = rng(6); let passes = 0;
  for (let g = 0; g < 300; g++) {
    const S = newGame();
    while (!S.over) {
      const ms = legalMoves(S);
      if (ms.includes(PASS_MOVE)) { assert.strictEqual(ms.length, 1); assert.ok(!canMove(S, S.turn) && canMove(S, 1 - S.turn)); passes++; } else assert.ok(canMove(S, S.turn));
      const side = S.turn; playMove(S, ms[Math.floor(rand() * ms.length)]);
      if (!S.over) assert.strictEqual(S.turn, 1 - side, 'after a pass the other side moves');
    }
  }
  assert.ok(passes > 50);
});
test('5: the game is over exactly when neither side can move, and never has more than 60 discs put down', () => {
  const rand = rng(12);
  for (let g = 0; g < 300; g++) {
    const S = newGame(); let put = 0;
    for (;;) {
      const stuck = !canMove(S, DARK) && !canMove(S, LIGHT);
      assert.strictEqual(!!S.over, stuck);
      if (stuck) break;
      const ms = legalMoves(S), m = ms[Math.floor(rand() * ms.length)]; if (m !== PASS_MOVE) put++;
      playMove(S, m);
    }
    assert.ok(put <= 60);
    const [dark, light] = S.over.discs;
    assert.deepStrictEqual([dark, light], [S.b.filter(p => p === 1).length, S.b.filter(p => p === 2).length], 'the discs on the board, Dark first, and nothing added');
    assert.strictEqual(S.over.winner, dark > light ? DARK : light > dark ? LIGHT : -1);
  }
});
test('6.9: no straight line has a corner in its middle, and a disc on a corner is never turned over', () => {
  for (const corner of [0, 7, 56, 63]) for (let d = 0; d < 4; d++) assert.strictEqual(Math.min(RUN[corner * 8 + d], RUN[corner * 8 + 7 - d]), 0);
  const rand = rng(21);
  for (let g = 0; g < 300; g++) {
    const S = newGame(), held = {};
    while (!S.over) {
      const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]);
      for (const corner of [0, 7, 56, 63]) if (S.b[corner]) { if (held[corner]) assert.strictEqual(S.b[corner], held[corner]); else held[corner] = S.b[corner]; }
    }
  }
});
test('8: a pass does not end the game, and empty squares are not added to the winner\'s count', () => {
  const S = position('X........O.........O'.padEnd(64, '.').split('').map(ch => DISC[ch]), LIGHT);
  playMove(S, PASS_MOVE); assert.strictEqual(S.over, null);
  const T = position('XXX.OO'.padEnd(64, '.').split('').map(ch => DISC[ch]));
  assert.deepStrictEqual(T.over.discs, [3, 2]); assert.strictEqual(T.empties, 59);
});
test('9: squares, sides, discs and moves as numbers; a position is the board and whose move it is', () => {
  assert.deepStrictEqual([DARK, LIGHT, EMPTY, PASS_MOVE], [0, 1, 0, 64]);
  assert.strictEqual(sqOf('c2'), 2 + 8 * (2 - 1));
  const S = newGame(); playMove(S, sqOf('d3'));
  assert.deepStrictEqual([S.b[sqOf('d3')], S.b[sqOf('d4')], S.b[sqOf('e5')]], [1, 1, 2]);
  const T = position(S.b, S.turn);
  assert.deepStrictEqual(legalMoves(T), legalMoves(S)); assert.strictEqual(keyLo(T), keyLo(S));
  assert.deepStrictEqual(legalMoves(position('XO'.padEnd(64, '.').split('').map(ch => DISC[ch]), LIGHT)), [PASS_MOVE]);
  assert.deepStrictEqual(legalMoves(position('XXX'.padEnd(64, '.').split('').map(ch => DISC[ch]))), []);
});
test('9: the page\'s table of counts is what the rules give', () => {
  const row = /^\| Games \|(.+)\|$/m.exec(PAGE);
  assert.ok(row, 'the table has gone');
  const table = row[1].split('|').map(c => +c.replace(/[,\s]/g, ''));
  assert.deepStrictEqual(table, [4, 12, 56, 244, 1396, 8200, 55092, 390216, 3005288, 24571284, 212258800]);
  const S = newGame(), buf = new Int8Array(64 * 34);
  const count = (d, off) => { const n = gen(S, buf, off); if (!n) return 1; if (d === 1) return n; let t = 0; for (let i = 0; i < n; i++) { make(S, buf[off + i]); t += count(d - 1, off + n); unmake(S); } return t; };
  table.slice(0, 8).forEach((n, i) => assert.strictEqual(count(i + 1, 0), n));   // the last three take half a minute; rules.test.js goes to nine
  assert.match(PAGE, /From the start\s+there are 4 moves/);
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
