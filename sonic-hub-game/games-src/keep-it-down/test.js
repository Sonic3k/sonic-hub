// node test.js — the rules, the move counts in perft.txt, and that every level of the computer only ever plays what it may.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
for (const f of ['00-core.js', '10-ai.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), { filename: f });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const PIECE = { '.': 0, R: RAM, G: GATE, K: KEEP, r: RAM + 4, g: GATE + 4, k: KEEP + 4 };   // capitals are Light's
const sq = name => 'abcdefgh'.indexOf(name[0]) + 8 * (+name[1] - 1);
/** A position from a drawing: eight rows, rank 8 first, the way a board is looked at with Light at the bottom. */
function board(rows, turn = LIGHT, extra = {}) {
  const b = new Array(64).fill(0);
  rows.forEach((row, i) => [...row.replace(/ /g, '')].forEach((ch, f) => { b[(7 - i) * 8 + f] = PIECE[ch]; }));
  return position(b, turn, extra.koP === undefined ? -1 : extra.koP, extra.koQ === undefined ? -1 : extra.koQ, extra.alarm === undefined ? -1 : extra.alarm);
}
const mv = (from, to, kind) => moveOf(sq(from), sq(to), kind);
const can = (S, from, to, kind) => isLegal(S, mv(from, to, kind));
const at = (S, name) => S.b[sq(name)];
const HOME = ['..gkkg..', '........', 'rrrrrrrr', '........', '........', 'RRRRRRRR', '........', '..GKKG..'];

test('the start: eight Rams on the third rank, a Gate each side of two Keeps on the first, Light to move', () => {
  const S = newGame();
  assert.deepStrictEqual(Array.from(S.b), Array.from(board(HOME).b));
  assert.strictEqual(S.turn, LIGHT); assert.strictEqual(S.over, null);
  assert.deepStrictEqual(S.keeps, [2, 2]); assert.deepStrictEqual(S.rams, [8, 8]);
  assert.strictEqual(legalMoves(S).length, 18);   // each Ram forward or back, each Gate out in front of its Keep
});
test('a Ram steps one square up, down, left or right, onto an empty square', () => {
  const S = board(['...kk...', '........', '........', '........', '...R....', '........', '........', '...KK...']);
  assert.deepStrictEqual(movesFrom(S, sq('d4')).map(m => sqName(mTo(m))).sort(), ['c4', 'd3', 'd5', 'e4']);
  const T = board(['...kk...', '........', '........', '...R....', '..RRR...', '........', '........', '...KK...']);
  assert.deepStrictEqual(movesFrom(T, sq('d4')).map(m => sqName(mTo(m))), ['d3'], 'not onto its own pieces, and never diagonally');
  const U = board(['...kk...', '........', '........', '........', '........', '........', '........', 'R..KK...']);
  assert.deepStrictEqual(movesFrom(U, sq('a1')).map(m => sqName(mTo(m))).sort(), ['a2', 'b1'], 'the wall stops it');
});
test('stepping into an enemy Ram shoves it one square on', () => {
  const S = board(['...kk...', '........', '........', '...r....', '...R....', '........', '........', '...KK...']);
  const ev = playMove(S, mv('d4', 'd5', PUSH));
  assert.strictEqual(ev.what, 'shove'); assert.strictEqual(ev.pushedTo, sq('d6')); assert.strictEqual(ev.loud, false);
  assert.strictEqual(at(S, 'd5'), RAM); assert.strictEqual(at(S, 'd6'), RAM + 4); assert.strictEqual(at(S, 'd4'), 0);
  assert.deepStrictEqual(S.rams, [1, 1]);
});
test('a Ram that was just shoved may not push back at once, but may do anything else, and may push back a turn later', () => {
  const S = board(['...kk...', '........', '........', '...r....', '...R....', '........', '........', '...KK...']);
  playMove(S, mv('d4', 'd5', PUSH));                       // Dark's Ram is now on d6, Light's on d5
  assert.ok(!can(S, 'd6', 'd5', PUSH), 'no pushing straight back');
  assert.deepStrictEqual(movesFrom(S, sq('d6')).map(m => sqName(mTo(m))).sort(), ['c6', 'd7', 'e6']);
  playMove(S, mv('d6', 'c6', STEP)); playMove(S, mv('d5', 'd4', STEP)); playMove(S, mv('c6', 'd6', STEP)); playMove(S, mv('d4', 'd5', STEP));
  assert.ok(can(S, 'd6', 'd5', PUSH), 'a turn later it may');
  // another Ram may answer the shove straight away
  const T = board(['...kk...', '........', '........', '...rr...', '...R....', '........', '........', '...KK...']);
  playMove(T, mv('d4', 'd5', PUSH));
  assert.ok(!can(T, 'd6', 'd5', PUSH)); assert.ok(can(T, 'e5', 'd5', PUSH), 'the Ram beside it was not shoved');
});
test('a Ram with no room behind it is taken: against a piece of either colour, or against the wall', () => {
  for (const [behind, label] of [['r', 'its own Ram'], ['R', 'an enemy Ram'], ['g', 'a Gate']]) {
    const rows = ['...kk...', '...X....', '...r....', '...R....', '........', '........', '........', '...KK...'];
    const S = board(rows.map(r => r.replace('X', behind === 'g' ? 'g' : behind)));
    const ev = playMove(S, mv('d5', 'd6', PUSH));
    assert.strictEqual(ev.what, 'crush', label); assert.strictEqual(ev.anvil, sq('d7')); assert.ok(ev.loud);
    assert.strictEqual(at(S, 'd6'), RAM, 'the Ram that pushed stands where the taken one stood'); assert.strictEqual(at(S, 'd5'), 0);
    assert.strictEqual(S.alarm, sq('d6'));
  }
  const W = board(['r..kk...', 'R.......', '........', '........', '........', '........', '........', '...KK...']);
  const ev = playMove(W, mv('a7', 'a8', PUSH));
  assert.strictEqual(ev.what, 'crush'); assert.strictEqual(ev.anvil, -1, 'the wall'); assert.strictEqual(at(W, 'a8'), RAM); assert.deepStrictEqual(W.rams, [1, 0]);
  const side = board(['...kk...', '........', '........', 'rR......', '........', '........', '........', '...KK...']);
  assert.strictEqual(playMove(side, mv('b5', 'a5', PUSH)).what, 'crush', 'the side walls count too');
});
test('standing either side of an enemy Ram takes nothing: it has to be pushed', () => {
  const S = board(['...kk...', '........', '.......r', '..Rr....', '....R...', '........', '........', '...KK...']);
  assert.strictEqual(playMove(S, mv('e4', 'e5', STEP)).what, 'step');
  assert.strictEqual(at(S, 'd5'), RAM + 4); assert.deepStrictEqual(S.rams, [2, 2]);
  playMove(S, mv('h6', 'h5', STEP));
  assert.strictEqual(playMove(S, mv('c5', 'd5', PUSH)).what, 'crush', 'pushed against the Ram on the far side, it goes');
});
test('a Gate cannot be shoved; a Ram takes it only with something behind it', () => {
  // a Gate at home falls to a Ram beside it (the Keep is behind) or in front of it (the wall is behind)
  const D = board(['.Rgkk...', '..R.....', '........', '........', '........', '........', '........', '...KK...']);
  assert.ok(can(D, 'b8', 'c8', PUSH)); assert.ok(can(D, 'c7', 'c8', PUSH));
  const ev = playMove(D, mv('c7', 'c8', PUSH));
  assert.strictEqual(ev.what, 'take'); assert.strictEqual(ev.anvil, -1, 'the wall'); assert.strictEqual(at(D, 'c8'), RAM); assert.strictEqual(at(D, 'c7'), 0);
  // a Gate out in front of its Keep falls to a Ram in front of it (the Keep is behind) …
  const E = board(['...kk...', '...g....', '...R....', '........', '........', '........', '........', '...KK...']);
  assert.ok(can(E, 'd6', 'd7', PUSH)); assert.strictEqual(describe(E, mv('d6', 'd7', PUSH)).anvil, sq('d8'));
  // … but from the side only when something stands on the far side
  const F = board(['...kk...', '..Rg....', '........', '........', '........', '........', '........', '...KK...']);
  assert.ok(!can(F, 'c7', 'd7', PUSH)); assert.ok(!can(F, 'c7', 'd7', STEP));
  const Gp = board(['...kk...', '..Rgg...', '........', '........', '........', '........', '........', '...KK...']);
  assert.ok(can(Gp, 'c7', 'd7', PUSH), 'the other Gate is behind it');
  const H = board(['...kk...', '..RgR...', '........', '........', '........', '........', '........', '...KK...']);
  assert.ok(can(H, 'c7', 'd7', PUSH), 'even the pusher’s own Ram will do');
});
test('a Keep cannot be shoved, and needs nothing behind it: a Ram that gets to it takes it', () => {
  // from in front
  const A = board(['...kk...', '...R....', '........', '........', '........', '........', '........', '...KK...']);
  assert.ok(can(A, 'd7', 'd8', PUSH));
  const ev = playMove(A, mv('d7', 'd8', PUSH));
  assert.strictEqual(ev.what, 'take'); assert.strictEqual(ev.anvil, -2, 'nothing behind it is asked for'); assert.ok(ev.loud);
  assert.strictEqual(at(A, 'd8'), RAM); assert.strictEqual(at(A, 'd7'), 0); assert.deepStrictEqual(A.keeps, [2, 1]); assert.strictEqual(A.alarm, sq('d8'));
  // from beside it, with the other Keep on the far side
  const B = board(['..Rkk...', '........', '........', '........', '........', '........', '........', '...KK...']);
  assert.ok(can(B, 'c8', 'd8', PUSH));
  // from beside it with an empty square on the far side: taken all the same, and nothing is shoved along
  for (const [rows, from] of [[['..Rk....', '........'], 'c8'], [['...kR...', '........'], 'e8'], [['.r.kR...', '...r....'], 'e8']]) {
    const C = board([...rows, '........', '........', '........', '........', '........', '...KK...']);
    assert.ok(can(C, from, 'd8', PUSH), from); assert.ok(!can(C, from, 'd8', STEP), 'it is a capture, never a plain step');
    const was = Array.from(C.b), e = playMove(C, mv(from, 'd8', PUSH));
    assert.strictEqual(e.what, 'take'); assert.strictEqual(e.pushedTo, -1); assert.strictEqual(e.anvil, -2);
    assert.strictEqual(at(C, 'd8'), RAM); assert.strictEqual(at(C, from), 0);
    assert.strictEqual(C.b.filter(p => p === KEEP + 4).length, 0, 'the Keep is gone, not moved');
    assert.deepStrictEqual(C.over, { winner: LIGHT, loser: DARK, why: 'keeps' }, 'and it was the last one');
    undoMove(C);
    assert.deepStrictEqual(Array.from(C.b), was, 'taking the move back stands the Keep up again'); assert.deepStrictEqual(C.keeps, [2, 1]); assert.strictEqual(C.over, null);
  }
  // Dark takes Light's the same way
  const E = board(['...kk...', '........', '........', '........', '........', '........', '........', '..rK....'], DARK);
  assert.ok(can(E, 'c1', 'd1', PUSH)); assert.strictEqual(playMove(E, mv('c1', 'd1', PUSH)).what, 'take'); assert.strictEqual(E.over.winner, DARK);
  // a Keep is never a Ram's own to walk through, and an empty square beside it is still just a step
  const F = board(['...kk...', '........', '........', '........', '........', '........', '........', '..RK....']);
  assert.deepStrictEqual(movesFrom(F, sq('c1')).map(m => sqName(mTo(m)) + mKind(m)).sort(), ['b1' + STEP, 'c2' + STEP]);
});
test('a Gate has two posts, beside its Keep and in front of it, and takes an enemy Ram standing on the other one', () => {
  const S = newGame();
  assert.deepStrictEqual(movesFrom(S, sq('c1')), [mv('c1', 'd2', SWING)]); assert.deepStrictEqual(movesFrom(S, sq('f1')), [mv('f1', 'e2', SWING)]);
  playMove(S, mv('c1', 'd2', SWING));
  assert.strictEqual(at(S, 'd2'), GATE); assert.strictEqual(at(S, 'c1'), 0);
  playMove(S, mv('f8', 'e7', SWING)); assert.strictEqual(at(S, 'e7'), GATE + 4);
  assert.deepStrictEqual(movesFrom(S, sq('d2')), [mv('d2', 'c1', SWING)], 'and back again, nowhere else');
  const T = board(['...kk...', '........', '........', '........', '........', '........', '...r....', '..GKKG..']);
  const ev = playMove(T, mv('c1', 'd2', SWING));
  assert.strictEqual(ev.what, 'slam'); assert.strictEqual(at(T, 'd2'), GATE); assert.deepStrictEqual(T.rams, [0, 0]);
  assert.strictEqual(T.alarm, -1, 'a Gate taking a Ram wakes nobody');
  const U = board(['...kk...', '........', '........', '........', '........', '........', '...R....', '..GKKG..']);
  assert.deepStrictEqual(movesFrom(U, sq('c1')), [], 'its own Ram is in the way');
  assert.strictEqual(POST[sq('c8')], sq('d7')); assert.strictEqual(POST[sq('f8')], sq('e7')); assert.strictEqual(POST[sq('e2')], sq('f1'));
});
test('a Keep never moves, and strikes only a Ram that has just taken something on a square next to it', () => {
  // Dark's Ram on d3 takes Light's Ram on d2 against the Keep: that makes a noise, and the Keep on d1 may strike it
  const S = board(['...kk...', '........', '........', '........', '........', '...r....', '...R....', '...KK...'], DARK);
  const ev = playMove(S, mv('d3', 'd2', PUSH));
  assert.strictEqual(ev.what, 'crush'); assert.deepStrictEqual(ev.wakes, [sq('d1')]);
  assert.deepStrictEqual(wokenKeeps(S), [sq('d1')]);
  assert.ok(can(S, 'd1', 'd2', STRIKE));
  assert.strictEqual(playMove(S, mv('d1', 'd2', STRIKE)).what, 'strike');
  assert.strictEqual(at(S, 'd2'), 0); assert.strictEqual(at(S, 'd1'), KEEP, 'the Keep stays where it is'); assert.deepStrictEqual(S.rams, [0, 0]);
  for (const s of [3, 4, 59, 60]) assert.strictEqual(kindOf(newGame().b[s]), KEEP);
});
test('a Ram that only walks up to a Keep is safe from it', () => {
  const S = board(['...kk...', '........', '........', '........', '........', '...r....', '........', '...KK...'], DARK);
  assert.deepStrictEqual(describe(S, mv('d3', 'd2', STEP)).wakes, []);
  playMove(S, mv('d3', 'd2', STEP));
  assert.deepStrictEqual(wokenKeeps(S), []); assert.ok(!legalMoves(S).some(m => mKind(m) === STRIKE));
});
test('the Keep may strike on the very next move only', () => {
  const S = board(['...kk...', '........', '.......r', '........', '........', '...r....', 'R..R....', '...KK...'], DARK);
  playMove(S, mv('d3', 'd2', PUSH));
  assert.ok(can(S, 'd1', 'd2', STRIKE));
  playMove(S, mv('a2', 'a3', STEP)); playMove(S, mv('h6', 'h5', STEP));
  assert.strictEqual(at(S, 'd2'), RAM + 4, 'the Ram is still there');
  assert.ok(!legalMoves(S).some(m => mKind(m) === STRIKE), 'but the chance is gone');
});
test('shoving a guard aside makes no noise; taking a Gate does', () => {
  const S = board(['...kk...', '........', '........', '........', '........', '........', '.rR.....', '...KK...'], DARK);
  const ev = playMove(S, mv('b2', 'c2', PUSH));             // Light's Ram goes from c2 to d2
  assert.strictEqual(ev.what, 'shove'); assert.deepStrictEqual(ev.wakes, []); assert.deepStrictEqual(wokenKeeps(S), []);
  const T = board(['...kk...', '........', '........', '........', '........', '........', '........', '.rGKK...'], DARK);
  const ev2 = playMove(T, mv('b1', 'c1', PUSH));
  assert.strictEqual(ev2.what, 'take'); assert.deepStrictEqual(ev2.wakes, [sq('d1')]); assert.ok(can(T, 'd1', 'c1', STRIKE));
});
test('taking one Keep wakes the other beside it; a capture away from every Keep wakes nobody', () => {
  const S = board(['...kk...', '........', '........', '........', '........', '........', '...r....', '...KK...'], DARK);
  const ev = playMove(S, mv('d2', 'd1', PUSH));
  assert.deepStrictEqual(ev.wakes, [sq('e1')]); assert.strictEqual(S.over, null); assert.ok(can(S, 'e1', 'd1', STRIKE));
  const T = board(['...kk...', '........', '........', 'Rr......', '........', '........', '........', '...KK...'], DARK);
  const far = playMove(T, mv('b5', 'a5', PUSH));
  assert.ok(far.loud); assert.deepStrictEqual(far.wakes, []); assert.deepStrictEqual(wokenKeeps(T), []);
});
test('the side that loses both Keeps loses', () => {
  const S = board(['...k....', '...R....', '........', '........', '........', '........', '........', '...KK...']);
  const ev = playMove(S, mv('d7', 'd8', PUSH));
  assert.deepStrictEqual(S.over, { winner: LIGHT, loser: DARK, why: 'keeps' }); assert.strictEqual(ev.over, S.over);
  assert.deepStrictEqual(legalMoves(S), []); assert.strictEqual(playMove(S, mv('d8', 'd7', STEP)), null);
});
test('drawn: no Rams left on either side, two passes in a row, or sixty moves each with nothing taken', () => {
  const S = board(['...kk...', '........', '........', '........', '........', '........', '...r....', '..GKK...']);
  playMove(S, mv('c1', 'd2', SWING));
  assert.deepStrictEqual(S.over, { winner: -1, why: 'spent' });
  // nothing to move: the turn passes; if the other side has nothing either, that is the end
  const T = board(['...kk...', '........', '........', '........', '........', '........', '........', '...KK...']);
  assert.deepStrictEqual(legalMoves(T), [PASS_MOVE]);
  const U = board(['...kk...', '........', '........', '........', '........', '........', '........', '...KKG.R']);
  playMove(U, mv('h1', 'h2', STEP));
  assert.deepStrictEqual(legalMoves(U), [PASS_MOVE]); assert.strictEqual(playMove(U, PASS_MOVE).what, 'pass'); assert.strictEqual(U.over, null);
  const V2 = newGame();
  for (let i = 0; i < QUIET_LIMIT / 4; i++) for (const [f, t] of [['a3', 'a4'], ['a6', 'a5'], ['a4', 'a3'], ['a5', 'a6']]) { assert.strictEqual(V2.over, null); playMove(V2, mv(f, t, STEP)); }
  assert.deepStrictEqual(V2.over, { winner: -1, why: 'quiet' }); assert.strictEqual(V2.history.length, QUIET_LIMIT);
});
test('a move that is not allowed changes nothing', () => {
  const S = newGame(), before = Array.from(S.b).join();
  for (const m of [mv('a3', 'b4', STEP), mv('a3', 'a5', STEP), mv('a6', 'a5', STEP), mv('d1', 'd2', STEP), mv('c1', 'c2', SWING), mv('d1', 'd2', STRIKE), mv('a3', 'a4', PUSH), PASS_MOVE, -1, 99999])
    assert.strictEqual(playMove(S, m), null);
  assert.strictEqual(Array.from(S.b).join(), before); assert.strictEqual(S.turn, LIGHT); assert.strictEqual(S.history.length, 0);
});
test('taking moves back restores everything, and a game can be played again from its list of moves', () => {
  const rand = rng(21);
  for (let g = 0; g < 30; g++) {
    const S = newGame(), snaps = [];
    const snap = () => JSON.stringify([Array.from(S.b), S.turn, S.koP, S.koQ, S.alarm, S.quiet, S.keeps, S.rams, S.hl, S.hh]);
    while (!S.over && S.history.length < 400) {
      snaps.push(snap());
      const moves = legalMoves(S), loud = moves.filter(m => describe(S, m).loud || mKind(m) === STRIKE);
      playMove(S, loud.length && rand() < 0.7 ? loud[Math.floor(rand() * loud.length)] : moves[Math.floor(rand() * moves.length)]);
    }
    const again = replay(S.history);
    assert.strictEqual(JSON.stringify(Array.from(again.b)), JSON.stringify(Array.from(S.b))); assert.deepStrictEqual(again.over, S.over);
    while (S.history.length) { undoMove(S); assert.strictEqual(snap(), snaps.pop()); assert.strictEqual(S.over, null); }
  }
  assert.strictEqual(replay([mv('a3', 'a4', STEP), mv('a3', 'a4', STEP)]), null); assert.strictEqual(replay('x'), null); assert.strictEqual(replay([1.5]), null);
});
test('the move counts agree with the second implementation of the rules (perft.txt)', () => {
  const perft = (S, d) => { if (!d) return 1; const out = []; gen(S, out); let t = 0; for (const m of out) { make(S, m); t += perft(S, d - 1); unmake(S); } return t; };
  const code = { '.': 0, R: 1, r: 5, G: 2, g: 6, K: 3, k: 7 };
  const lines = fs.readFileSync(path.join(__dirname, 'perft.txt'), 'utf8').split('\n').filter(l => l && l[0] !== '#');
  assert.deepStrictEqual([1, 2, 3, 4].map(d => perft(newGame(), d)), lines[0].split(' ').slice(1, 5).map(Number));
  assert.ok(lines.length > 100);
  for (const line of lines.slice(1)) {
    const [b, turn, koP, koQ, alarm, ...want] = line.split(' ');
    const S = position([...b].map(c => code[c]), +turn, +koP, +koQ, +alarm);
    assert.deepStrictEqual([1, 2, 3].map(d => perft(S, d)), want.map(Number), line);
  }
});
test('every level plays whole games with allowed moves only, and the games end', () => {
  const rand = rng(8);
  for (const [a, b] of [['easy', 'easy'], ['medium', 'easy'], ['easy', 'medium'], ['medium', 'medium'], ['hard', 'easy'], ['easy', 'hard']]) {
    const S = newGame();
    while (!S.over) {
      const level = S.turn === LIGHT ? a : b, r = AI.think(S, { level, timeMs: 15, rand });
      assert.ok(isLegal(S, r.move), `${level} played ${r.move}`);
      playMove(S, r.move);
      assert.ok(S.history.length < 3200);
    }
    assert.ok(['keeps', 'spent', 'stuck', 'quiet'].includes(S.over.why));
  }
});
test('every level takes the last Keep when it can', () => {
  const S = board(['...k....', '...R....', 'r.......', '........', '........', '........', '........', '...KK...']);
  for (const level of LEVELS) for (let i = 0; i < 20; i++) assert.strictEqual(AI.think(S, { level, timeMs: 20, rand: rng(i) }).move, mv('d7', 'd8', PUSH), level);
});
test('every level takes the last Keep from the side, with nothing behind it', () => {
  const S = board(['..Rk....', '........', 'r.......', '........', '........', '........', '........', '...KK...']);
  for (const level of LEVELS) for (let i = 0; i < 20; i++) assert.strictEqual(AI.think(S, { level, timeMs: 20, rand: rng(i) }).move, mv('c8', 'd8', PUSH), level);
});
test('medium and hard see a Ram beside their last Keep for what it is', () => {
  // Light's last Keep on d1, its Gate out in front. Dark's Ram has reached e1: the square beyond the Keep is empty, and it takes all the same
  const lost = board(['...kk...', '........', 'rrr.....', '........', '........', 'RRR.....', '...G....', '...Kr..R']);
  assert.ok(can(position(lost.b, DARK), 'e1', 'd1', PUSH), 'the threat is real');
  for (const level of ['medium', 'hard']) assert.ok(AI.think(lost, { level, timeMs: 60, rand: rng(2) }).score < -100000, level + ' knows the game is lost: nothing of Light’s gets at that Ram in one move');
  // with a Ram of its own on f1 there is exactly one answer: push the intruder against the Keep
  const T = board(['...kk...', '........', 'rrr.....', '........', '........', 'RRR.....', '...G....', '...KrR..']);
  for (const level of ['medium', 'hard']) assert.strictEqual(AI.think(T, { level, timeMs: 60, rand: rng(5) }).move, mv('f1', 'e1', PUSH), level);
  // a Ram one step from the Keep's side: a careless move loses to it, and medium and hard do not make one
  const U = ['...kk...', '........', 'rrr.....', '........', '........', 'RRR.....', '...Gr...', '...K..R.'];
  const forced = S2 => AI.think(S2, { level: 'hard', timeMs: 150, rand: rng(7) }).score > 100000;   // can the side to move take the last Keep, whatever the answer?
  const careless = board(U); playMove(careless, mv('a3', 'a4', STEP));
  assert.ok(forced(careless), 'left alone, the Ram steps beside the Keep and takes it');
  for (const level of ['medium', 'hard']) {
    const V = board(U);
    playMove(V, AI.think(V, { level, timeMs: 60, rand: rng(6) }).move);
    assert.ok(!forced(V), level + ' has kept its last Keep safe');
  }
});
test('medium and hard strike a Ram that has just taken a Gate beside their Keep, and guard a Keep that is about to fall', () => {
  const S = board(['...kk...', '........', '........', '........', '..RRR...', '........', '........', '.rGKKG..'], DARK);
  playMove(S, mv('b1', 'c1', PUSH));
  for (const level of ['medium', 'hard']) assert.strictEqual(AI.think(S, { level, timeMs: 60, rand: rng(3) }).move, mv('d1', 'c1', STRIKE), level);
  // Dark's Ram stands on d2 with the wall behind the Keep: the Gate on c1 must step onto it
  const T = board(['...kk...', '........', 'rrr.....', '........', '........', 'RRR.....', '...r....', '..GKKG..']);
  for (const level of ['medium', 'hard']) assert.strictEqual(AI.think(T, { level, timeMs: 60, rand: rng(4) }).move, mv('c1', 'd2', SWING), level);
});
test('thinking leaves the position as it found it', () => {
  const S = newGame(); for (const m of [mv('d3', 'd4', STEP), mv('d6', 'd5', STEP), mv('c3', 'c4', STEP), mv('e6', 'e5', STEP)]) playMove(S, m);
  const before = JSON.stringify([Array.from(S.b), S.turn, S.koP, S.koQ, S.alarm, S.quiet, S.sp, S.history]);
  for (const level of LEVELS) AI.think(S, { level, timeMs: 40, rand: rng(1) });
  assert.strictEqual(JSON.stringify([Array.from(S.b), S.turn, S.koP, S.koQ, S.alarm, S.quiet, S.sp, S.history]), before);
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
