// the lines that go under the table of the Standings sheet, from what actually happened
'use strict';
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const rows = fs.readFileSync(path.join(ROOT, process.argv[2] || 'out/results.jsonl'), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
let v = null; try { v = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/verify.json'), 'utf8')); } catch (e) { /* not checked yet */ }
const faults = rows.filter(g => g.fault), who = {};
for (const g of faults) { const k = (g.fault.side ? g.blue : g.red) + ' (' + g.fault.kind + ')'; who[k] = (who[k] || 0) + 1; }
const late = {}; for (const g of rows) for (const [k, key] of [[0, g.red], [1, g.blue]]) if (g.late[k]) late[key] = (late[key] || 0) + g.late[k];
const lines = [
  'The house:… players are the game\'s own five opponents, playing as they do in the game except for the clock: here every player has 1000 ms a turn (in the game Nadia takes 1600 ms and Isolde 3000 ms a move).',
  'Tham Mưu and Đại Bàng have three levels each; every level is a player of its own.',
  faults.length ? faults.length + ' game' + (faults.length > 1 ? 's were' : ' was') + ' lost by forfeit: ' + Object.entries(who).map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', ') + '. See the last column of the Games sheet.' : 'No game was lost by forfeit: not one illegal move, error or turn out of time in ' + rows.reduce((a, g) => a + g.turns, 0).toLocaleString('en-US') + ' turns.' + (Object.keys(late).length ? ' Turns that ran over 1000 ms without losing the game: ' + Object.entries(late).map(([k, n]) => k + ' ' + n).join(', ') + '.' : ''),
];
if (v && v.repeatGames) lines.push(v.repeatGames + ' game' + (v.repeatGames > 1 ? 's repeat' : ' repeats') + ' an earlier game between the same two players with the same colours move for move: players that leave nothing to chance play the same game again.');
const late2 = rows.filter(g => ['titan-scout', 'counterplay'].includes(g.red) || ['titan-scout', 'counterplay'].includes(g.blue)).length;
if (late2) lines.push('titan-scout and counterplay are the test opponents that came inside two of the submissions (with Titan Commander and with Lạc Hồng).', 'They joined after the first ' + (rows.length - late2).toLocaleString('en-US') + ' games: only their own ' + late2 + ' games were played then, and nobody else\'s were played again.');
lines.push('Every game: battles, the standard line-up of 19 a side.');
process.stdout.write(JSON.stringify(lines));
