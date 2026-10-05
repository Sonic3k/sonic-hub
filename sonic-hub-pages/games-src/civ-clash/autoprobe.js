// node autoprobe.js [seed] — measure the field, then for every civ outside the target band try the neighbouring
// HP on identical seeds and keep whichever is closer to fair. Writes the result into src/10-data.js.
const { play } = require('./sim.js');
const fs = require('fs');
const ids = CIV_ORDER, seed = +process.argv[2] || 1;
function civStats(civ, base, nDuel = 150, nTable = 2500) {
  let dw = 0, dg = 0, tx = 0, k = 0;
  for (const o of ids) if (o !== civ) for (let r = 0; r < nDuel; r++) { const S = play((base + (k++) * 7919) >>> 0, r % 2 ? [civ, o] : [o, civ]); dg++; if (S.winner >= 0 && S.players[S.winner].civ === civ) dw++; }
  for (let g = 0; g < nTable; g++) {
    const n = g % 2 ? 3 : 4, civs = shuffled({ rs: (base + 31 * g + 5) >>> 0 }, ids.filter(c => c !== civ)).slice(0, n - 1), seat = g % n;
    civs.splice(seat, 0, civ); const S = play((base + 900007 + g * 104729) >>> 0, civs); tx += (S.winner === seat ? 1 : 0) - 1 / n;
  }
  return { duel: dw / dg, table: tx / nTable };
}
const t0 = Date.now(), before = {};
for (const c of ids) before[c] = civStats(c, seed * 7777, 60, 900);
const out = ids.filter(c => before[c].duel < 0.46 || before[c].duel > 0.54 || Math.abs(before[c].table) > 0.03);
console.log(`measured in ${Math.round((Date.now() - t0) / 1000)}s; outside the band: ${out.map(c => `${c} ${(before[c].duel * 100).toFixed(1)}%/${(before[c].table * 100).toFixed(1)}`).join(', ') || 'none'}`);
const changes = {};
for (const c of out) {
  const cur = civStats(c, seed * 31337);
  const dd = cur.duel < 0.46 ? 1 : cur.duel > 0.54 ? -1 : 0, dt = cur.table < -0.03 ? 1 : cur.table > 0.03 ? -1 : 0;
  if (dd) { CIVS[c].hp2 += dd; const alt = civStats(c, seed * 31337); if (Math.abs(alt.duel - 0.5) < Math.abs(cur.duel - 0.5)) changes[c + '.hp2'] = [CIVS[c].hp2 - dd, CIVS[c].hp2, (cur.duel * 100).toFixed(1), (alt.duel * 100).toFixed(1)]; else CIVS[c].hp2 -= dd; }
  if (dt) { CIVS[c].hp4 += dt; const alt = civStats(c, seed * 31337); if (Math.abs(alt.table) < Math.abs(cur.table)) changes[c + '.hp4'] = [CIVS[c].hp4 - dt, CIVS[c].hp4, (cur.table * 100).toFixed(1), (alt.table * 100).toFixed(1)]; else CIVS[c].hp4 -= dt; }
}
console.log('kept changes (from → to, before → after):', JSON.stringify(changes));
let d = fs.readFileSync(__dirname + '/src/10-data.js', 'utf8');
for (const c of ids) d = d.replace(new RegExp(`(  ${c}: \\{[^\\n]*?)hp2: \\d+, hp4: \\d+,`), `$1hp2: ${CIVS[c].hp2}, hp4: ${CIVS[c].hp4},`);
fs.writeFileSync(__dirname + '/src/10-data.js', d);
