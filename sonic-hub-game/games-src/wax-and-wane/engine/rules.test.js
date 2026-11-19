// node engine/rules.test.js — the rules, the move counts in perft.txt, and a second implementation that has to agree.
//   node engine/rules.test.js --write-perft    counts the positions of perft.txt again with the second implementation
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'rules.js'), 'utf8'), { filename: 'rules.js' });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const DISC = { '.': 0, X: 1, O: 2 };   // X is Dark, O is Light
/** A position from a drawing: eight rows, rank 1 first, the way the board is looked at. */
function board(rows, turn = DARK) {
  const b = new Array(64).fill(0);
  rows.forEach((row, r) => [...row.replace(/ /g, '')].forEach((ch, f) => { b[r * 8 + f] = DISC[ch]; }));
  return position(b, turn);
}
const text = S => Array.from(S.b, p => '.XO'[p]).join('');
const names = moves => moves.map(sqName).sort().join(' ');
const at = (S, name) => S.b[sqOf(name)];
const EMPTY_ROW = '........';
const rowsWith = (...pairs) => { const rows = new Array(8).fill(EMPTY_ROW); for (const [rank, row] of pairs) rows[rank - 1] = row; return rows; };

/* ── a second implementation, written another way: two 64-bit numbers a side, moves found by sliding all discs at once ── */
const FULL = (1n << 64n) - 1n, NOT_A = 0xfefefefefefefefen, NOT_H = 0x7f7f7f7f7f7f7f7fn;
const SLIDE = [x => (x >> 9n) & NOT_H, x => x >> 8n, x => (x >> 7n) & NOT_A, x => (x >> 1n) & NOT_H, x => (x << 1n) & NOT_A, x => (x << 7n) & NOT_H & FULL, x => (x << 8n) & FULL, x => (x << 9n) & NOT_A & FULL];
const Second = {
  from(S) { let dark = 0n, light = 0n; for (let s = 0; s < 64; s++) { if (S.b[s] === 1) dark |= 1n << BigInt(s); else if (S.b[s] === 2) light |= 1n << BigInt(s); } return { own: S.turn === DARK ? dark : light, other: S.turn === DARK ? light : dark, turn: S.turn }; },
  moves(own, other) {
    const empty = ~(own | other) & FULL; let found = 0n;
    for (const slide of SLIDE) { let run = slide(own) & other; for (let i = 0; i < 5; i++) run |= slide(run) & other; found |= slide(run) & empty; }
    return found;
  },
  flips(own, other, s) {
    let turned = 0n;
    for (const slide of SLIDE) { let x = slide(1n << BigInt(s)), line = 0n; while (x & other) { line |= x; x = slide(x); } if (x & own) turned |= line; }
    return turned;
  },
  /** every move of a position as its engine number, a pass included; none when the game is over */
  list(P) {
    const out = []; let found = this.moves(P.own, P.other);
    if (!found) return this.moves(P.other, P.own) ? [PASS_MOVE] : out;
    for (let s = 0; s < 64; s++) if ((found >> BigInt(s)) & 1n) out.push(s);
    return out;
  },
  play(P, m) {
    if (m === PASS_MOVE) return { own: P.other, other: P.own, turn: 1 - P.turn };
    const turned = this.flips(P.own, P.other, m);
    return { own: P.other & ~turned, other: P.own | turned | (1n << BigInt(m)), turn: 1 - P.turn };
  },
  count(P, depth) {
    if (depth === 0) return 1;
    const moves = this.list(P);
    if (!moves.length) return 1;
    if (depth === 1) return moves.length;
    let n = 0; for (const m of moves) n += this.count(this.play(P, m), depth - 1);
    return n;
  },
  text(P) { const dark = P.turn === DARK ? P.own : P.other, light = P.turn === DARK ? P.other : P.own; let t = ''; for (let s = 0; s < 64; s++) t += (dark >> BigInt(s)) & 1n ? 'X' : (light >> BigInt(s)) & 1n ? 'O' : '.'; return t; },
};
/** how many different games of `depth` moves there are from S: a pass is a move, a game over sooner counts once */
const buf = new Int8Array(64 * 34);
function perft(S, depth, off = 0) {
  if (depth === 0) return 1;
  const n = gen(S, buf, off);
  if (!n) return 1;
  if (depth === 1) return n;
  let t = 0;
  for (let i = 0; i < n; i++) { make(S, buf[off + i]); t += perft(S, depth - 1, off + n); unmake(S); }
  return t;
}
const PERFT = path.join(__dirname, 'perft.txt');

if (process.argv.includes('--write-perft')) {
  // positions out of games played at random, counted by the second implementation alone
  const rand = rng(20261119), lines = [], seen = new Set();
  while (lines.length < 120) {
    const S = newGame(), stop = 4 + Math.floor(rand() * 58);
    while (!S.over && S.history.length < stop) { const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]); }
    if (seen.has(text(S) + S.turn)) continue;
    seen.add(text(S) + S.turn);
    const P = Second.from(S);
    lines.push(`${text(S)} ${S.turn} ${[1, 2, 3, 4].map(d => Second.count(P, d)).join(' ')}`);
  }
  const head = ['# Move counts for checking the rules: how many different games of 1, 2, 3 … moves there are from a position.',
    '# A pass counts as a move, and a game that is over sooner counts once. The counts from the start are the ones',
    '# known for Othello; the others were counted by a second, separate implementation of the rules (the one in',
    '# rules.test.js, which keeps each side\'s discs as one 64-bit number), so the two have to agree move for move.',
    '# node engine/rules.test.js reads this file.', '#',
    '# start <1 move> <2> … <9>',
    '# <board, a1 to h8 row by row: . empty, X a Dark disc, O a Light disc> <side to move: 0 Dark, 1 Light> <1 move> <2> <3> <4>'];
  fs.writeFileSync(PERFT, head.join('\n') + '\nstart 4 12 56 244 1396 8200 55092 390216 3005288\n' + lines.join('\n') + '\n');
  console.log(`written: ${lines.length} positions`);
  process.exit(0);
}

test('the start: two discs a side on the four middle squares, each side\'s on a diagonal, Dark to move', () => {
  const S = newGame();
  assert.strictEqual(text(S), EMPTY_ROW.repeat(3) + '...OX...' + '...XO...' + EMPTY_ROW.repeat(3));
  assert.deepStrictEqual([at(S, 'd4'), at(S, 'e5'), at(S, 'e4'), at(S, 'd5')], [2, 2, 1, 1]);
  assert.strictEqual(S.turn, DARK); assert.strictEqual(S.over, null);
  assert.deepStrictEqual([S.count, S.empties], [[2, 2], 60]);
  assert.strictEqual(names(legalMoves(S)), 'c4 d3 e6 f5');
});
test('squares are named the way Othello is written down: a1 top left, h8 bottom right', () => {
  assert.deepStrictEqual(['a1', 'h1', 'a8', 'h8', 'd3'].map(sqOf), [0, 7, 56, 63, 19]);
  for (let s = 0; s < 64; s++) assert.strictEqual(sqOf(sqName(s)), s);
  assert.strictEqual(sqName(PASS_MOVE), 'pass');
});
test('a disc encloses along the row, the column and both diagonals: eight directions', () => {
  // a Dark disc on d4 would enclose one Light disc each way
  const S = board([EMPTY_ROW, '.X.X.X..', '..OOO...', '.XO.OX..', '..OOO...', '.X.X.X..', EMPTY_ROW, EMPTY_ROW]);
  assert.strictEqual(names(flipsOf(S, sqOf('d4'))), 'c3 c4 c5 d3 d5 e3 e4 e5');
  const ev = playMove(S, sqOf('d4'));
  assert.strictEqual(ev.lines.length, 8); assert.ok(ev.lines.every(line => line.length === 1));
  assert.deepStrictEqual([S.count, S.empties], [[17, 0], 47]);
});
test('a run of several discs is enclosed whole, and the count of each side follows', () => {
  const S = board(rowsWith([1, '.OOOOOOX']));
  assert.strictEqual(countFlips(S, sqOf('a1')), 6);
  const ev = playMove(S, sqOf('a1'));
  assert.deepStrictEqual(ev.flips.map(sqName), ['b1', 'c1', 'd1', 'e1', 'f1', 'g1'], 'the nearest first');
  assert.strictEqual(text(S).slice(0, 8), 'XXXXXXXX'); assert.deepStrictEqual(ev.count, [8, 0]);
});
test('everything enclosed is turned over, in every direction at once', () => {
  const S = board(rowsWith([2, '....X...'], [3, '..X.O...'], [4, '...OO...'], [5, '..XO.O..']));
  const ev = playMove(S, sqOf('e5'));
  assert.strictEqual(names(ev.flips), 'd4 d5 e3 e4'); assert.strictEqual(ev.lines.length, 3);
  assert.strictEqual(at(S, 'f5'), 2, 'nothing Dark beyond f5');
});
test('a gap breaks the line, the edge encloses nothing, and the line stops at the nearest disc of the mover\'s own', () => {
  const S = board(rowsWith([1, 'XOXO.O.X']));
  assert.deepStrictEqual(flipsOf(S, sqOf('e1')).map(sqName), ['d1']);
  assert.ok(!isLegal(board(rowsWith([1, 'X.O.....'])), sqOf('d1')), 'a gap');
  assert.ok(!isLegal(board(rowsWith([1, 'OOO.....'], [8, 'X.......'])), sqOf('d1')), 'the edge');
  assert.ok(!isLegal(board(rowsWith([1, '.OOOOOOO'], [8, 'X.......'])), sqOf('a1')), 'a run that fills the row to the far edge');
});
test('only lines from the new disc count: a disc just turned over encloses nothing', () => {
  const S = board(rowsWith([1, '.OX.....'], [2, '.O......'], [3, '.X......']));
  const ev = playMove(S, sqOf('a1'));
  assert.deepStrictEqual(ev.flips.map(sqName), ['b1']);
  assert.deepStrictEqual([at(S, 'b1'), at(S, 'b2'), at(S, 'b3')], [1, 2, 1], 'b2 stays Light between two Dark discs');
});
test('a move has to enclose something, on an empty square', () => {
  const S = newGame();
  for (const name of ['c5', 'f4', 'c3', 'a1', 'd6']) assert.ok(!isLegal(S, sqOf(name)), name);
  for (const name of ['d4', 'e4', 'd5', 'e5']) assert.ok(!isLegal(S, sqOf(name)), name + ' is taken');
  assert.strictEqual(playMove(S, sqOf('c5')), null); assert.strictEqual(S.history.length, 0);
  assert.ok(!isLegal(S, PASS_MOVE), 'no passing with a move to make');
});
test('the sides move in turn, and a disc put down stays where it is', () => {
  const S = newGame();
  playMove(S, sqOf('f5')); assert.strictEqual(S.turn, LIGHT);
  assert.strictEqual(names(legalMoves(S)), 'd6 f4 f6');
  playMove(S, sqOf('d6')); assert.strictEqual(S.turn, DARK);
  assert.deepStrictEqual([at(S, 'f5'), at(S, 'd6'), S.count, S.empties], [1, 2, [3, 3], 58]);
});
test('a side with no move passes, and only then; the other side moves again', () => {
  const S = board(rowsWith([1, 'X.......'], [2, '.O......'], [3, '...O....']), LIGHT);
  assert.deepStrictEqual(legalMoves(S), [PASS_MOVE]); assert.strictEqual(S.over, null);
  const ev = playMove(S, PASS_MOVE);
  assert.deepStrictEqual([ev.pass, ev.to, ev.flips.length, S.turn], [true, -1, 0, DARK]);
  assert.strictEqual(names(legalMoves(S)), 'c3');
  playMove(S, sqOf('c3'));
  assert.strictEqual(names(legalMoves(S)), 'b3', 'Light has a move again');
});
test('a side may pass several turns running while the other plays on', () => {
  // Light's one disc is walled in on the edge; Dark fills the row beyond it one square at a time
  const S = board(rowsWith([1, 'XXO.....'], [3, 'XOOO....']), LIGHT);
  const played = [];
  while (!S.over && played.length < 12) { const ms = legalMoves(S); played.push(sqName(ms[0])); playMove(S, ms[0]); }
  const passes = played.filter(m => m === 'pass').length;
  assert.ok(passes >= 2, played.join(' '));
  assert.ok(S.over);
});
test('the game ends when neither side can move: a full board, a side swept off, or squares nobody can use', () => {
  const full = board(new Array(8).fill('XXXXOOOO'));
  assert.deepStrictEqual(full.over, { winner: -1, loser: -1, discs: [32, 32], why: 'full' }); assert.deepStrictEqual(legalMoves(full), []);
  const swept = board(rowsWith([1, 'XO......']));
  playMove(swept, sqOf('c1'));
  assert.deepStrictEqual(swept.over, { winner: DARK, loser: LIGHT, discs: [3, 0], why: 'swept' });
  const blocked = board(rowsWith([1, 'XXX.OO..']));
  assert.deepStrictEqual(blocked.over, { winner: DARK, loser: LIGHT, discs: [3, 2], why: 'blocked' });
  assert.deepStrictEqual(board(rowsWith([1, 'XX.OO...'])).over, { winner: -1, loser: -1, discs: [2, 2], why: 'blocked' });
  assert.strictEqual(board(new Array(8).fill('OOOOOXXX')).over.winner, LIGHT);
});
test('more discs wins, empty squares count for nobody, and the same number each is a draw', () => {
  const S = board([...new Array(7).fill('XXXXOOOO'), 'XXXXOOO.'], LIGHT);   // one square left, and only Dark can use it
  assert.strictEqual(S.over, null); assert.deepStrictEqual(legalMoves(S), [PASS_MOVE]);
  const T = board([...new Array(7).fill('XXXXOOOO'), 'OXXX.OOO'], LIGHT);
  assert.deepStrictEqual(names(legalMoves(T)), 'e8');
  const ev = playMove(T, sqOf('e8'));
  assert.deepStrictEqual([ev.over.winner, ev.over.discs, ev.over.why], [LIGHT, [28, 36], 'full']);
});
test('the shortest game there is: nine moves, and Light has nothing left', () => {
  const S = replay(['f5', 'd6', 'c5', 'f4', 'e7', 'f6', 'g5', 'e6', 'e3'].map(sqOf));
  assert.deepStrictEqual(S.over, { winner: DARK, loser: LIGHT, discs: [13, 0], why: 'swept' });
  assert.strictEqual(S.empties, 51); assert.deepStrictEqual(legalMoves(S), []);
  assert.strictEqual(playMove(S, sqOf('a1')), null, 'nothing is played once the game is over');
});
test('describe says what a move will do without playing it; flipsInto and countFlips agree with it', () => {
  const S = newGame(), before = text(S), ev = describe(S, sqOf('d3'));
  assert.deepStrictEqual([ev.side, ev.to, ev.pass, ev.flips.map(sqName), ev.lines.length], [DARK, 19, false, ['d4'], 1]);
  assert.strictEqual(text(S), before);
  const out = new Int8Array(40);
  assert.strictEqual(flipsInto(S, sqOf('d3'), out, 7), 1); assert.strictEqual(sqName(out[7]), 'd4'); assert.strictEqual(countFlips(S, sqOf('d3')), 1);
  assert.strictEqual(countFlips(S, sqOf('a1')), 0);
});
test('make and unmake: a whole game played and taken back leaves everything as it was', () => {
  const rand = rng(11);
  for (let g = 0; g < 200; g++) {
    const S = newGame(), start = [text(S), S.turn, S.count.slice(), S.empties, keyLo(S), keyHi(S)], trail = [];
    for (;;) {
      const n = gen(S, buf, 0); if (!n) break;
      trail.push([text(S), S.turn, S.count.slice(), S.empties, keyLo(S), keyHi(S)]);
      const m = buf[Math.floor(rand() * n)];
      const turned = make(S, m);
      assert.strictEqual(lastMove(S), m); if (m === PASS_MOVE) assert.strictEqual(turned, 0); else assert.ok(turned > 0);
      assert.strictEqual(S.count[0] + S.count[1] + S.empties, 64);
    }
    while (trail.length) { assert.strictEqual(typeof unmake(S), 'number'); assert.deepStrictEqual([text(S), S.turn, S.count.slice(), S.empties, keyLo(S), keyHi(S)], trail.pop()); }
    assert.deepStrictEqual([text(S), S.turn, S.count.slice(), S.empties, keyLo(S), keyHi(S)], start); assert.strictEqual(lastMove(S), -1);
  }
});
test('a position\'s key depends on the discs and on whose move it is, and on nothing else', () => {
  const A = replay(['f5', 'f6', 'e6', 'f4'].map(sqOf)), B = position(A.b, A.turn), C = position(A.b, 1 - A.turn);
  assert.deepStrictEqual([keyLo(A), keyHi(A)], [keyLo(B), keyHi(B)], 'however it came about');
  assert.ok(keyLo(A) !== keyLo(C) || keyHi(A) !== keyHi(C), 'the other side to move is another position');
  const seen = new Map(), rand = rng(5);
  for (let g = 0; g < 300; g++) {
    const S = newGame();
    while (!S.over) {
      const k = keyLo(S) + ':' + keyHi(S), t = text(S) + S.turn;
      if (seen.has(k)) assert.strictEqual(seen.get(k), t, 'two positions with one key'); else seen.set(k, t);
      const ms = legalMoves(S); playMove(S, ms[Math.floor(rand() * ms.length)]);
    }
  }
  assert.ok(seen.size > 10000);
});
test('playMove, undoMove and replay keep a game: its moves, its end, and the way back', () => {
  const S = newGame(), rand = rng(3);
  while (!S.over) { const ms = legalMoves(S); assert.ok(playMove(S, ms[Math.floor(rand() * ms.length)])); }
  const again = replay(S.history);
  assert.strictEqual(text(again), text(S)); assert.deepStrictEqual(again.over, S.over);
  const last = S.history[S.history.length - 1];
  assert.strictEqual(undoMove(S), last); assert.strictEqual(S.over, null); assert.ok(isLegal(S, last));
  while (S.history.length) undoMove(S);
  assert.strictEqual(text(S), text(newGame())); assert.strictEqual(undoMove(S), null);
  assert.strictEqual(replay([sqOf('a1')]), null); assert.strictEqual(replay('f5'), null); assert.strictEqual(replay([19.5]), null);
});
test('the second implementation agrees on every move and every disc turned, through 300 games played at random', () => {
  const rand = rng(77); let positions = 0;
  for (let g = 0; g < 300; g++) {
    const S = newGame(); let P = Second.from(S);
    for (;;) {
      const mine = legalMoves(S).slice().sort((a, b) => a - b), theirs = Second.list(P);
      assert.deepStrictEqual(mine, theirs, text(S) + ' ' + S.turn);
      positions++;
      if (!mine.length) { assert.ok(S.over); break; }
      const m = mine[Math.floor(rand() * mine.length)];
      playMove(S, m); P = Second.play(P, m);
      assert.strictEqual(text(S), Second.text(P));
    }
  }
  assert.ok(positions > 15000);
});
test('the counts from the start are the ones known for Othello', () => {
  const start = fs.readFileSync(PERFT, 'utf8').split('\n').find(l => l.startsWith('start ')).split(' ').slice(1).map(Number);
  assert.deepStrictEqual(start, [4, 12, 56, 244, 1396, 8200, 55092, 390216, 3005288]);
  const S = newGame();
  start.forEach((n, i) => assert.strictEqual(perft(S, i + 1), n, `${i + 1} moves`));
});
test('perft.txt: the counts of the second implementation, position by position', () => {
  const lines = fs.readFileSync(PERFT, 'utf8').split('\n').filter(l => l && !l.startsWith('#') && !l.startsWith('start '));
  assert.ok(lines.length >= 100);
  let passes = 0, ended = 0;
  for (const line of lines) {
    const [cells, turn, ...counts] = line.split(' ');
    const S = position([...cells].map(ch => DISC[ch]), +turn);
    counts.map(Number).forEach((n, i) => assert.strictEqual(perft(S, i + 1), n, `${line} at ${i + 1}`));
    if (legalMoves(S)[0] === PASS_MOVE) passes++; if (S.over) ended++;
  }
  assert.ok(passes > 0 && ended > 0, 'the file has positions with a pass to make and positions where the game is over');
});
test('5000 games played at random all end, by the rules, within 60 discs put down', () => {
  const rand = rng(2026), won = [0, 0], out = new Int8Array(64); let drawn = 0, plies = 0, passes = 0, early = 0, longest = 0;
  for (let g = 0; g < 5000; g++) {
    const S = newGame(); let discs = 0;
    while (!S.over) {
      const ms = legalMoves(S); assert.ok(ms.length > 0, 'a game that is not over has a move');
      const m = ms[Math.floor(rand() * ms.length)];
      if (m === PASS_MOVE) { assert.strictEqual(ms.length, 1); passes++; } else { assert.strictEqual(S.b[m], 0); assert.ok(flipsInto(S, m, out) > 0); discs++; }
      assert.ok(playMove(S, m));
      assert.strictEqual(S.count[0] + S.count[1] + S.empties, 64);
    }
    assert.ok(discs <= 60); assert.strictEqual(S.empties, 60 - discs);
    assert.deepStrictEqual(legalMoves(S), []); assert.ok(!canMove(S, DARK) && !canMove(S, LIGHT));
    if (S.over.winner < 0) drawn++; else won[S.over.winner]++;
    if (S.empties) early++;
    plies += S.history.length; if (S.history.length > longest) longest = S.history.length;
  }
  assert.strictEqual(won[0] + won[1] + drawn, 5000);
  if (process.argv.includes('--say')) console.log(`5000 games at random: Dark won ${won[0]}, Light won ${won[1]}, drawn ${drawn}; ${(plies / 5000).toFixed(1)} moves a game (passes included, ${(passes / 5000).toFixed(2)} a game), the longest ${longest}; ${early} ended with empty squares`);
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
