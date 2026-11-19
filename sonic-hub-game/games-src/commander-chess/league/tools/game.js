// One league game.   node tools/game.js '<spec as JSON>'   → one line of JSON on stdout
// spec: { id, round, red: {key,file,id,level}, blue: {...}, ms, seed, maxTurns, setup }
// The table is the kit's own (kit/table.js): every move is checked against the rules. Two things are the league's:
//  - a turn loses on time by the kit's rule (more than twice the time plus 250 ms), counted in the processor time
//    of the thread the player runs on, so that a hiccup of this machine cannot forfeit a game for it;
//  - a turn that has not come back after HANG ms of the wall clock is cut off (a player that hangs).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const CC = require(ROOT + '/kit/engine.js'), { makeTable } = require(ROOT + '/kit/table.js');
const T = makeTable(CC);
const spec = JSON.parse(process.argv[2]);
const HANG = Math.max(20000, spec.ms * 15), DEAD = spec.ms * 2 + 250;
T.LIMITS.dead = () => HANG;
const guard = (fn, ms) => { globalThis.__ccCall = fn; try { return vm.runInThisContext('__ccCall()', { timeout: Math.ceil(ms) }); } finally { globalThis.__ccCall = null; } };
const seats = [spec.red, spec.blue], t00 = Date.now();
let M = null;
function done(extra) {
  const r = M.result, S = M.S, st = M.stats;
  const o = { id: spec.id, round: spec.round, red: spec.red.key, blue: spec.blue.key, winner: r.winner, why: r.why, cause: r.cause || null, pts: CC.points(S), turns: M.turns,
    ms: st.map(s => (s.turns ? Math.round(s.ms / s.turns) : 0)), max: st.map(s => Math.round(s.max)), late: st.map(s => s.late), cpu: cpu.map(c => (c.n ? Math.round(c.sum / c.n) : 0)), cpuMax: cpu.map(c => Math.round(c.max)),
    fault: r.fault ? { side: r.fault.side, kind: r.fault.kind, turn: r.fault.turn, detail: String(r.fault.detail).slice(0, 600) } : null,
    arms: [CC.arms(S, 0), CC.arms(S, 1)], seed: spec.seed, timeMs: spec.ms, wall: Math.round((Date.now() - t00) / 100) / 10, moves: M.moves };
  process.stdout.write(JSON.stringify(Object.assign(o, extra || {})) + '\n');
}
const cpu = [{ sum: 0, max: 0, n: 0, turn: 0 }, { sum: 0, max: 0, n: 0, turn: 0 }];
M = T.newMatch({ setup: spec.setup, timeMs: spec.ms, seed: spec.seed, maxTurns: spec.maxTurns, levels: [spec.red.level, spec.blue.level], names: [spec.red.key, spec.blue.key] });
const ais = [];
for (let side = 0; side < 2 && !M.result; side++) {
  try { ais[side] = T.loadAI(fs.readFileSync(path.join(ROOT, seats[side].file), 'utf8'), path.basename(seats[side].file), seats[side].id); }
  catch (e) { M.result = { winner: 1 - side, why: 'fault', fault: { side, kind: 'load', detail: String(e && e.message || e), turn: 0, level: seats[side].level } }; }
}
while (!M.result) {
  const side = M.S.turn, before = M.turns, c0 = process.threadCpuUsage();
  const ans = T.ask(ais[side], M.S, T.request(M), guard);
  const c = process.threadCpuUsage(c0), k = cpu[side];
  k.turn += (c.user + c.system) / 1000;
  if (!ans.timedOut && !ans.error && k.turn > DEAD) { M.result = { winner: 1 - side, why: 'fault', fault: { side, kind: 'time', detail: 'the turn took ' + Math.round(k.turn) + ' ms of processor time; it had ' + spec.ms + ' ms', turn: M.turns + 1, level: seats[side].level } }; break; }
  T.takeAnswer(M, ans);
  if (M.result || M.turns !== before) { k.sum += k.turn; if (k.turn > k.max) k.max = k.turn; k.n++; k.turn = 0; }
}
done();
