// Checks the league's records against the rules and the schedule:
//  - every game of the schedule is there once, and nothing else;
//  - every recorded game, played again move by move with the engine, is legal and ends the way the record says;
//  - games of the same pair with the same colours that went move for move the same are counted.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CC = require(ROOT + '/kit/engine.js'), { makeTable } = require(ROOT + '/kit/table.js'), T = makeTable(CC);
const { games: schedule } = require('./schedule.js');
const file = process.argv[2] || path.join(ROOT, 'out/results.jsonl');
const rows = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const byId = new Map(); let dupIds = 0;
for (const g of rows) { if (byId.has(g.id)) dupIds++; byId.set(g.id, g); }
const missing = schedule.filter(g => !byId.has(g.id)).length, extra = rows.filter(g => !schedule.some(s => s.id === g.id)).length;
let bad = 0, checked = 0; const same = new Map();
for (const g of rows) {
  const spec = schedule.find(s => s.id === g.id); if (!spec) continue;
  let M;
  try { M = T.fromRecord({ setup: spec.setup, timeMs: spec.ms, seed: spec.seed, levels: [1, 1], names: [g.red, g.blue], moves: g.moves }); }
  catch (e) { bad++; console.log('NOT LEGAL', g.id, e.message); continue; }
  checked++;
  if (g.why === 'fault') { if (M.result) { bad++; console.log('MISMATCH', g.id, 'recorded a forfeit, but the moves end the game:', JSON.stringify(M.result)); } continue; }
  if (g.why === 'points' && g.cause === 'turns') { if (M.result || M.turns !== spec.maxTurns) { bad++; console.log('MISMATCH', g.id, 'turn limit'); } continue; }
  if (!M.result || M.result.winner !== g.winner || M.result.why !== g.why || (M.result.cause || null) !== (g.cause || null) || M.turns !== g.turns) { bad++; console.log('MISMATCH', g.id, JSON.stringify(M.result), 'against', g.winner, g.why, g.cause, g.turns); }
  const k = g.red + ' v ' + g.blue + '|' + g.moves.join(','); same.set(k, (same.get(k) || 0) + 1);
}
const repeats = [...same.entries()].filter(([, n]) => n > 1), repeatGames = repeats.reduce((a, [, n]) => a + n - 1, 0);
const pairs = new Map(); for (const [k, n] of repeats) { const p = k.split('|')[0]; pairs.set(p, (pairs.get(p) || 0) + n); }
console.log(rows.length + ' results; schedule ' + schedule.length + '; missing ' + missing + ', not in the schedule ' + extra + ', ids twice ' + dupIds);
console.log(checked + ' games played again with the engine: ' + (bad ? bad + ' DO NOT MATCH' : 'all legal, all end as recorded'));
console.log('games that repeat an earlier game of the same pair and colours move for move: ' + repeatGames + (pairs.size ? ' (' + [...pairs.entries()].map(([p, n]) => p + ' ×' + n).join('; ') + ')' : ''));
if (process.argv.includes('--json')) fs.writeFileSync(path.join(ROOT, 'out/verify.json'), JSON.stringify({ results: rows.length, missing, extra, dupIds, bad, repeatGames, repeatPairs: [...pairs.entries()] }));
process.exit(bad || dupIds || extra ? 1 : 0);
