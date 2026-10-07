// Balance loop. node tune.js [iterations=6] [duel games per pair=24] [3-4 player games=3000] [seed=1] [--measure] [--write]
// Each iteration plays every duel pairing both ways plus random 3- and 4-player tables (AI vs AI, fresh seeds), then moves
// each civ's duel HP (hp2) and table HP (hp4) toward a fair share by the measured worth of one HP.
// --write saves the final HP into src/core/30-civs.js.
const { play } = require('./sim.js');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const iters = args[0] !== undefined ? +args[0] : 6, N = +args[1] || 24, MG = +args[2] || 3000, seed0 = +args[3] || 1;
const measureOnly = process.argv.includes('--measure');
const ids = CIV_ORDER;
function measure(base) {
  const dw = {}, dg = {}, mx = {}, mg = {}, rounds = [], mrounds = [], seat4 = [0, 0, 0, 0];
  let first = 0, duels = 0, k = 0, n4 = 0, wonder = 0;
  for (const c of ids) dw[c] = dg[c] = mx[c] = mg[c] = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let r = 0; r < N; r++) {
    const civs = r % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    const S = play((base + (k++) * 7919) >>> 0, civs);
    duels++; if (S.winner === 0) first++; rounds.push(S.round); if (S.wonderWin) wonder++;
    for (const P of S.players) { dg[P.civ]++; if (S.winner === P.id) dw[P.civ]++; }
  }
  for (let g = 0; g < MG; g++) {
    const n = g % 2 ? 3 : 4;
    const civs = shuffled({ rs: (base + 500009 + g * 31) >>> 0 }, ids).slice(0, n);
    const S = play((base + 900007 + g * 104729) >>> 0, civs);
    mrounds.push(S.round);
    if (n === 4) { n4++; if (S.winner >= 0) seat4[S.winner]++; }
    for (const P of S.players) { mg[P.civ]++; mx[P.civ] += (S.winner === P.id ? 1 : 0) - 1 / n; }
  }
  const r = {}; for (const c of ids) r[c] = { duel: dw[c] / dg[c], multi: mx[c] / mg[c] };
  rounds.sort((a, b) => a - b); mrounds.sort((a, b) => a - b);
  return { r, first: first / duels, wonder: wonder / duels, seat4: seat4.map(x => x / n4), med: rounds[rounds.length >> 1], mmed: mrounds[mrounds.length >> 1] };
}
const pct = x => (Math.round(x * 1000) / 10).toFixed(1);
for (let it = 0; it <= iters; it++) {
  const t0 = Date.now(), M = measure((seed0 * 1000003 + it * 777767) >>> 0);
  const d = ids.map(c => M.r[c].duel), m = ids.map(c => M.r[c].multi);
  console.log(`iter ${it} (${Math.round((Date.now() - t0) / 1000)}s): duel ${pct(Math.min(...d))}–${pct(Math.max(...d))}% | table ${pct(Math.min(...m))}..+${pct(Math.max(...m))} | first ${pct(M.first)}% | 4p seats ${M.seat4.map(pct).join('/')} | wonder ${pct(M.wonder)}% | rounds ${M.med}/${M.mmed}`);
  console.log('  ' + ids.map(c => `${c}:${pct(M.r[c].duel)}/${pct(M.r[c].multi)}(${CIVS[c].hp2}/${CIVS[c].hp4})`).join(' '));
  if (it === iters || measureOnly) break;
  /* one HP is worth about 3 points of duel win rate and 3 points of table share (measured): step by that much, at most 2 HP at a
     time (1 after the first pass), and only when the gap is clearly bigger than the noise */
  const cap = it === 0 ? 2 : 1;
  for (const c of ids) {
    const gd = M.r[c].duel - 0.5, gm = M.r[c].multi;
    const sd = Math.abs(gd) > 0.03 ? clamp(Math.round(-gd / 0.032), -cap, cap) || -Math.sign(gd) : 0;
    const sm = Math.abs(gm) > 0.025 ? clamp(Math.round(-gm / 0.03), -cap, cap) || -Math.sign(gm) : 0;
    CIVS[c].hp2 = Math.max(6, CIVS[c].hp2 + sd); CIVS[c].hp4 = Math.max(6, CIVS[c].hp4 + sm);
  }
}
if (process.argv.includes('--write')) {
  const f = path.join(__dirname, 'src', 'core', '30-civs.js');
  let src = fs.readFileSync(f, 'utf8');
  for (const c of ids) src = src.replace(new RegExp(`(\\n  ${c}: \\{[^\\n]*?hp2: )\\d+(, hp4: )\\d+`), `$1${CIVS[c].hp2}$2${CIVS[c].hp4}`);
  fs.writeFileSync(f, src);
  console.log('wrote HP to 30-civs.js');
}
