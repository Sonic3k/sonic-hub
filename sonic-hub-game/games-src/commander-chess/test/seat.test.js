/* Checks that every player of the league can be seated in the game and asked for a turn the way the game asks:
   node test/seat.test.js
   Each of them is given three positions: the first move as Red, the first reply as Blue, and a middle game reached by
   moves taken at random. What comes back has to be one whole legal turn, with no fault, within the league's time. */
const fs = require('fs'), path = require('path');
const CC = require('../league/kit/engine.js'), { makeTable } = require('../kit/src/table.js'), { makeSeat } = require('../src/engine/30-seat.js');
const PLAYERS = require('../league/tools/players.js');
const Seat = makeSeat(CC, makeTable), T = Seat.table;
let failed = 0, passed = 0;
const ok = (cond, what) => { if (cond) passed++; else { failed++; console.log('FAIL  ' + what); } };
const setup = { game: 'battles', lineup: 'standard' };

/** moves taken at random from the start, whole turns only: `turns` of them */
function wander(turns, seed) {
  const rnd = T.rng(seed), S = CC.newGame(setup), moves = [];
  for (let t = 0; t < turns && !S.over; t++) {
    const side = S.turn;
    for (let n = 0; n < 12 && !S.over && S.turn === side; n++) {
      const legal = CC.legalMoves(S); if (!legal.length) return moves;
      const m = S.dOrg >= 0 && legal.includes(CC.COMMIT_MOVE) ? CC.COMMIT_MOVE : legal.filter(x => CC.mMode(x) !== CC.COMMIT)[Math.floor(rnd() * legal.filter(x => CC.mMode(x) !== CC.COMMIT).length)];
      CC.play(S, m, true); moves.push(m);
    }
    if (CC.status(S)) break;
  }
  return moves;
}
/** is `turn` one whole legal turn after `moves`? */
function wholeTurn(moves, turn) {
  const S = CC.replay(setup, moves), side = S.turn;
  if (!turn.length) return 'no move';
  for (let i = 0; i < turn.length; i++) {
    if (S.over || S.turn !== side) return 'a move after the turn was over';
    if (!CC.legalMoves(S).includes(turn[i])) return 'move ' + (i + 1) + ' is not legal';
    CC.play(S, turn[i], true);
  }
  return S.over || S.turn !== side ? '' : 'the turn was left open';
}

const only = process.argv[2];
const positions = [['as Red, first move', []], ['as Blue, first reply', wander(1, 11)], ['in a middle game', wander(14, 5)], ['in another middle game', wander(21, 9)]];
let slowest = 0;
for (const p of PLAYERS) {
  if (only && !p.key.includes(only)) continue;
  const file = path.basename(p.file), source = fs.readFileSync(path.join(__dirname, '..', 'league', p.file), 'utf8');
  for (const [where, moves] of positions) {
    let r;
    try { r = Seat.turn({ setup, moves, file, id: p.id, level: p.level, seed: 20261119, source }); } catch (e) { r = { moves: [], ms: 0, fault: 'threw: ' + e.message }; }
    const bad = r.fault || wholeTurn(moves, r.moves);
    ok(!bad, p.key + ' ' + where + ': ' + bad);
    ok(r.ms <= T.LIMITS.dead(Seat.TIME), p.key + ' ' + where + ': took ' + r.ms + ' ms');
    if (r.ms > slowest) slowest = r.ms;
  }
}
/* a player that goes wrong is not the end of a game: its turn is finished for it, and the fault is handed back */
const broken = "registerAI({ id: 'broken', name: 'Broken', author: 'test', about: 'returns a move that is none', turn() { return 123456789; } });";
const r1 = Seat.turn({ setup, moves: [], file: 'broken.js', id: 'broken', level: 1, seed: 1, source: broken });
ok(/^illegal: /.test(r1.fault) && !wholeTurn([], r1.moves), 'an illegal answer is reported and the turn played anyway: ' + r1.fault);
const thrower = "registerAI({ id: 'thrower', name: 'Thrower', author: 'test', about: 'throws', turn() { throw new Error('no'); } });";
const r2 = Seat.turn({ setup, moves: wander(6, 3), file: 'thrower.js', id: 'thrower', level: 1, seed: 2, source: thrower });
ok(/^threw: /.test(r2.fault) && !wholeTurn(wander(6, 3), r2.moves), 'an exception is reported and the turn played anyway');
const r3 = Seat.anyTurn({ setup, moves: wander(9, 4), seed: 3 });
ok(!wholeTurn(wander(9, 4), r3.moves), 'a turn can be played with nobody to ask');
let threw = false; try { Seat.turn({ setup, moves: [], file: 'never-sent.js', id: 'x', level: 1, seed: 1 }); } catch (e) { threw = true; }
ok(threw, 'a player whose file was never given cannot be asked');

console.log(`${passed} passed, ${failed} failed; the slowest turn took ${slowest} ms`);
process.exit(failed ? 1 : 0);
