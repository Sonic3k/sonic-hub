// node probe.js civ:hp2:hp4 [...] — measure one civ at a given HP against the field (duels both ways + 3/4-player tables)
const { play } = require('./sim.js');
const ids = CIV_ORDER;
function probe(civ, hp2, hp4, base) {
  const keep = [CIVS[civ].hp2, CIVS[civ].hp4];
  CIVS[civ].hp2 = hp2; CIVS[civ].hp4 = hp4;
  let dw = 0, dg = 0, tx = 0, tg = 0, k = 0;
  for (const o of ids) if (o !== civ) for (let r = 0; r < 160; r++) {
    const civs = r % 2 ? [civ, o] : [o, civ];
    const S = play((base + (k++) * 7919) >>> 0, civs); dg++;
    if (S.winner >= 0 && S.players[S.winner].civ === civ) dw++;
  }
  for (let g = 0; g < 3000; g++) {
    const n = g % 2 ? 3 : 4, others = shuffled({ rs: (base + 31 * g + 5) >>> 0 }, ids.filter(c => c !== civ)).slice(0, n - 1);
    const seat = g % n, civs = others.slice(); civs.splice(seat, 0, civ);
    const S = play((base + 900007 + g * 104729) >>> 0, civs); tg++;
    tx += (S.winner === seat ? 1 : 0) - 1 / n;
  }
  CIVS[civ].hp2 = keep[0]; CIVS[civ].hp4 = keep[1];
  return { duel: dw / dg, table: tx / tg };
}
for (const arg of process.argv.slice(2)) {
  const [civ, a, b] = arg.split(':');
  const r = probe(civ, +a, +b, 4242);
  console.log(`${civ} hp ${a}/${b}: duel ${(r.duel * 100).toFixed(1)}%  table ${(r.table * 100 >= 0 ? '+' : '') + (r.table * 100).toFixed(1)} pts`);
}
