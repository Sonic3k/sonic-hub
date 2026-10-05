// Balance loop. node tune.js [iterations=6] [duel games per pair=24] [3-4 player games=6000] [seed=1] [--measure]
// Each iteration plays every duel pairing both ways plus random 3- and 4-player tables (AI vs AI, fresh seeds),
// then nudges each civ's duel HP (hp2) and table HP (hp4) by 1 toward a fair share. A civ whose nudge flips
// direction skips one step, so it settles on the better of two neighbouring HP values instead of bouncing.
const { play } = require('./sim.js');
const fs = require('fs');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const iters = args[0] !== undefined ? +args[0] : 6, N = +args[1] || 24, MG = +args[2] || 6000, seed0 = +args[3] || 1;
const measureOnly = process.argv.includes('--measure');
const ids = CIV_ORDER, last = Object.fromEntries(ids.map(c => [c, { d: 0, m: 0 }]));
function measure(base) {
  const dw = {}, dg = {}, mx = {}, mg = {}, seat3 = [0, 0, 0], seat4 = [0, 0, 0, 0], rounds = [];
  let first = 0, duels = 0, n3 = 0, n4 = 0, k = 0;
  for (const c of ids) dw[c] = dg[c] = mx[c] = mg[c] = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let r = 0; r < N; r++) {
    const civs = r % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    const S = play(base + (k++) * 7919, civs);
    duels++; if (S.winner === 0) first++; rounds.push(S.round);
    for (const P of S.players) { dg[P.civ]++; if (S.winner === P.id) dw[P.civ]++; }
  }
  for (let g = 0; g < MG; g++) {
    const n = g % 2 ? 3 : 4;
    const civs = shuffled({ rs: (base + 500009 + g * 31) >>> 0 }, ids).slice(0, n);
    const S = play((base + 900007 + g * 104729) >>> 0, civs);
    if (n === 3) { n3++; if (S.winner >= 0) seat3[S.winner]++; } else { n4++; if (S.winner >= 0) seat4[S.winner]++; }
    for (const P of S.players) { mg[P.civ]++; mx[P.civ] += (S.winner === P.id ? 1 : 0) - 1 / n; }
  }
  const r = {}; for (const c of ids) r[c] = { duel: dw[c] / dg[c], multi: mx[c] / mg[c] };
  rounds.sort((a, b) => a - b);
  return { r, first: first / duels, seat3: seat3.map(x => x / n3), seat4: seat4.map(x => x / n4), med: rounds[rounds.length >> 1], p90: rounds[Math.floor(rounds.length * 0.9)] };
}
const pct = x => (Math.round(x * 1000) / 10).toFixed(1);
for (let it = 0; it <= iters; it++) {
  const t0 = Date.now(), M = measure((seed0 * 1000003 + it * 777767) >>> 0);
  const d = ids.map(c => M.r[c].duel), m = ids.map(c => M.r[c].multi);
  console.log(`iter ${it} (${Math.round((Date.now() - t0) / 1000)}s): duel ${pct(Math.min(...d))}–${pct(Math.max(...d))}% | table excess ${pct(Math.min(...m))}..+${pct(Math.max(...m))} pts | first player ${pct(M.first)}% | 3p seats ${M.seat3.map(pct).join('/')} | 4p seats ${M.seat4.map(pct).join('/')} | rounds median ${M.med}, p90 ${M.p90}`);
  console.log('  ' + ids.map(c => `${c}:${pct(M.r[c].duel)}/${pct(M.r[c].multi)}(${CIVS[c].hp2}/${CIVS[c].hp4})`).join(' '));
  if (it === iters || measureOnly) break;
  for (const c of ids) {
    const sd = Math.abs(M.r[c].duel - 0.5) > 0.035 ? -Math.sign(M.r[c].duel - 0.5) : 0;
    const sm = Math.abs(M.r[c].multi) > 0.025 ? -Math.sign(M.r[c].multi) : 0;
    if (sd) { if (last[c].d === -sd) last[c].d = 0; else { CIVS[c].hp2 = clamp(CIVS[c].hp2 + sd, 6, 17); last[c].d = sd; } }
    if (sm) { if (last[c].m === -sm) last[c].m = 0; else { CIVS[c].hp4 = clamp(CIVS[c].hp4 + sm, 6, 17); last[c].m = sm; } }
  }
  // keep the overall HP level anchored so games stay short: shift everyone when the average drifts
  for (const [key, target] of [['hp2', 12], ['hp4', 13]]) {
    const k = Math.round(ids.reduce((s, c) => s + CIVS[c][key], 0) / ids.length - target);
    if (k) for (const c of ids) CIVS[c][key] = clamp(CIVS[c][key] - k, 6, 17);
  }
}
const hp = Object.fromEntries(ids.map(c => [c, [CIVS[c].hp2, CIVS[c].hp4]]));
if (!measureOnly) fs.writeFileSync(__dirname + '/tune-result.json', JSON.stringify(hp));
console.log('HP ' + JSON.stringify(hp));
