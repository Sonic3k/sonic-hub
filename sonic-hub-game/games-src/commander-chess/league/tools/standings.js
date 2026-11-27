// What the results so far say: the table by points, and ratings fitted to every game (400 apart = ten wins to one).
//   node tools/standings.js [results.jsonl] [--json]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(ROOT, 'out/results.jsonl');
const P = require('./players.js'), idx = new Map(P.map((p, i) => [p.key, i])), n = P.length;
const rows = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean) : [];
const st = P.map(p => ({ key: p.key, ai: p.ai, by: p.by, level: p.levelName, w: 0, d: 0, l: 0, rw: 0, rd: 0, rl: 0, bw: 0, bd: 0, bl: 0, faults: 0, turns: 0, msSum: 0, max: 0, late: 0, games: 0 }));
const score = Array.from({ length: n }, () => new Float64Array(n)), played = Array.from({ length: n }, () => new Float64Array(n));
for (const g of rows) {
  const a = idx.get(g.red), b = idx.get(g.blue); if (a === undefined || b === undefined) continue;
  const A = st[a], B = st[b];
  if (g.winner === 0) { A.w++; A.rw++; B.l++; B.bl++; score[a][b] += 1; } else if (g.winner === 1) { B.w++; B.bw++; A.l++; A.rl++; score[b][a] += 1; } else { A.d++; A.rd++; B.d++; B.bd++; score[a][b] += 0.5; score[b][a] += 0.5; }
  played[a][b]++; played[b][a]++;
  if (g.fault) st[g.fault.side ? b : a].faults++;
  for (const [s, k] of [[A, 0], [B, 1]]) { s.games++; s.msSum += g.ms[k]; if (g.max[k] > s.max) s.max = g.max[k]; s.late += g.late[k]; s.turns += g.turns; }
}
/* ratings: the most likely strengths under "expected score = 1 / (1 + 10^(difference / 400))", a draw counting as half
   a win and half a loss, with a very weak pull to the middle so that a player who won or lost everything stays finite */
const Q = Math.LN10 / 400, r = new Float64Array(n), PRIOR = 1 / (900 * 900);
for (let it = 0; it < 4000; it++) {
  let move = 0;
  for (let i = 0; i < n; i++) {
    let grad = -r[i] * PRIOR / Q, hess = PRIOR / (Q * Q);
    for (let j = 0; j < n; j++) if (j !== i && played[i][j]) { const e = 1 / (1 + Math.pow(10, (r[j] - r[i]) / 400)); grad += score[i][j] - played[i][j] * e; hess += played[i][j] * e * (1 - e); }
    const step = grad / (hess * Q) ; r[i] += Math.max(-200, Math.min(200, step)); move = Math.max(move, Math.abs(step));
  }
  if (move < 0.01) break;
}
/* the scale: set so that the game's own opponents sit, on average, at their ratings in the campaign. Only those of
   them who both won and lost points count: one who lost (or won) everything has no rating the games can pin down. */
const CAMPAIGN = { 'house:Pia': 500, 'house:Marisol': 950, 'house:Hana': 1350, 'house:Nadia': 1700, 'house:Isolde': 2000 };
const pinned = P.map((p, i) => i).filter(i => CAMPAIGN[P[i].key] !== undefined && st[i].w + st[i].d > 0 && st[i].l + st[i].d > 0);
const shift = pinned.length ? pinned.reduce((a, i) => a + CAMPAIGN[P[i].key] - r[i], 0) / pinned.length : 1300 - r.reduce((a, x) => a + x, 0) / n;
st.forEach((s, i) => {
  let info = 0; for (let j = 0; j < n; j++) if (j !== i && played[i][j]) { const e = 1 / (1 + Math.pow(10, (r[j] - r[i]) / 400)); info += played[i][j] * e * (1 - e); }
  s.rating = Math.round(r[i] + shift); s.pm = info > 0 ? Math.round(1 / (Q * Math.sqrt(info))) : null; s.pts = 3 * s.w + s.d; s.played = s.w + s.d + s.l; s.ms = s.games ? Math.round(s.msSum / s.games) : 0;
});
const order = st.slice().sort((a, b) => b.pts - a.pts || b.w - a.w || b.rating - a.rating || a.key.localeCompare(b.key));
if (process.argv.includes('--json')) { process.stdout.write(JSON.stringify({ games: rows.length, order, pinned: pinned.map(i => P[i].key), campaign: CAMPAIGN })); }
else {
  console.log(rows.length + ' games');
  console.log('  #  player              played   W   D   L  pts  rating   ±    ms/turn  slowest  late  faults');
  order.forEach((s, i) => console.log(String(i + 1).padStart(3) + '  ' + s.key.padEnd(18) + String(s.played).padStart(7) + String(s.w).padStart(5) + String(s.d).padStart(4) + String(s.l).padStart(4) + String(s.pts).padStart(5) + String(s.rating).padStart(8) + String(s.pm === null ? '' : s.pm).padStart(5) + String(s.ms).padStart(10) + String(s.max).padStart(9) + String(s.late).padStart(6) + String(s.faults).padStart(8)));
  const why = {}; for (const g of rows) { const k = g.why + (g.cause ? '/' + g.cause : '') + (g.fault ? '/' + g.fault.kind : ''); why[k] = (why[k] || 0) + 1; }
  console.log('ended by:', JSON.stringify(why), '| draws', rows.filter(g => g.winner < 0).length, '| Red won', rows.filter(g => g.winner === 0).length, 'Blue won', rows.filter(g => g.winner === 1).length, '| avg turns', rows.length ? Math.round(rows.reduce((a, g) => a + g.turns, 0) / rows.length) : 0, '| avg seconds a game', rows.length ? Math.round(rows.reduce((a, g) => a + g.wall, 0) / rows.length) : 0);
}
