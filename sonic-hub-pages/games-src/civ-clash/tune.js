// node tune.js [iterations] [games-per-pair] — balance loop: measure 1v1 + 4-player win rates, nudge each civ's HP, repeat.
const { play } = require('./sim.js');
const iters = process.argv[2] !== undefined ? +process.argv[2] : 4, N = +process.argv[3] || 6, ids = CIV_ORDER;
function measure(seedBase) {
  const w = {}, g = {}, fw = {}, fg = {};
  for (const c of ids) { w[c] = g[c] = fw[c] = fg[c] = 0; }
  let first = 0, games = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = 0; k < N; k++) {
    const civs = k % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    const S = play(seedBase + i * 1000 + j * 37 + k * 7919, civs);
    games++; if (S.winner === 0) first++;
    for (const P of S.players) { g[P.civ]++; if (S.winner === P.id) w[P.civ]++; }
  }
  for (let k = 0; k < N * 300; k++) {
    const civs = shuffled({ rs: seedBase + 777 + k }, ids).slice(0, 4);
    const S = play(seedBase + 5000 + k, civs);
    for (const P of S.players) { fg[P.civ]++; if (S.winner === P.id) fw[P.civ]++; }
  }
  const r = {}; for (const c of ids) r[c] = { duel: w[c] / g[c], ffa: fw[c] / Math.max(1, fg[c]) };
  return { r, first: first / games };
}
for (let it = 0; it <= iters; it++) {
  const { r, first } = measure((+process.argv[4] || 100) + it * 99991);
  const duels = ids.map(c => r[c].duel), ffas = ids.map(c => r[c].ffa);
  const spread = a => `${Math.round(Math.min(...a) * 100)}–${Math.round(Math.max(...a) * 100)}%`;
  console.log(`iter ${it}: 1v1 ${spread(duels)}, FFA4 ${spread(ffas)}, first player ${Math.round(first * 100)}%`);
  if (it === iters) { console.log(ids.map(c => `${c}:${Math.round(r[c].duel * 100)}/${Math.round(r[c].ffa * 100)}(${CIVS[c].hp2}/${CIVS[c].hp4})`).join(' ')); break; }
  for (const c of ids) {
    const d = r[c].duel - 0.5, f = (r[c].ffa - 0.25) * 2;
    if (Math.abs(d) > 0.05 && !process.argv.includes('--ffa-only')) CIVS[c].hp2 = clamp(CIVS[c].hp2 - Math.sign(d), 7, 15);
    if (Math.abs(f) > 0.06) CIVS[c].hp4 = clamp(CIVS[c].hp4 - Math.sign(f), 7, 15);
  }
}
console.log('HP ' + JSON.stringify(Object.fromEntries(ids.map(c => [c, [CIVS[c].hp2, CIVS[c].hp4]]))));
