// node refine.js <validation-log> — for every civ outside the target band in a validation run, try HP one lower
// and one higher in the off dimension (duel = hp2, tables = hp4) against the whole field, keep the value closest to fair.
const { play } = require('./sim.js');
const fs = require('fs');
const ids = CIV_ORDER, LOG = process.argv[2];
const rows = fs.readFileSync(LOG, 'utf8').split('\n')[1].trim().split(' ').map(t => { const m = t.match(/^(\w+):([\d.]+)\/(-?[\d.]+)\((\d+)\/(\d+)\)$/); return { c: m[1], d: +m[2] / 100, t: +m[3] / 100 }; });
function probe(civ, hp2, hp4, base, wantDuel, wantTable) {
  const keep = [CIVS[civ].hp2, CIVS[civ].hp4]; CIVS[civ].hp2 = hp2; CIVS[civ].hp4 = hp4;
  let dw = 0, dg = 0, tx = 0, tg = 0, k = 0;
  if (wantDuel) for (const o of ids) if (o !== civ) for (let r = 0; r < 110; r++) { const civs = r % 2 ? [civ, o] : [o, civ]; const S = play((base + (k++) * 7919) >>> 0, civs); dg++; if (S.winner >= 0 && S.players[S.winner].civ === civ) dw++; }
  if (wantTable) for (let g = 0; g < 2600; g++) { const n = g % 2 ? 3 : 4, others = shuffled({ rs: (base + 31 * g + 5) >>> 0 }, ids.filter(c => c !== civ)).slice(0, n - 1), seat = g % n, civs = others.slice(); civs.splice(seat, 0, civ); const S = play((base + 900007 + g * 104729) >>> 0, civs); tg++; tx += (S.winner === seat ? 1 : 0) - 1 / n; }
  CIVS[civ].hp2 = keep[0]; CIVS[civ].hp4 = keep[1];
  return { duel: dg ? dw / dg : null, table: tg ? tx / tg : null };
}
const changes = {};
for (const r of rows) {
  const offD = r.d < 0.46 || r.d > 0.54, offT = Math.abs(r.t) > 0.03;
  if (!offD && !offT) continue;
  const C = CIVS[r.c], out = [];
  if (offD) {
    const cand = [[C.hp2, r.d]]; const dir = r.d < 0.5 ? 1 : -1;
    for (const h of [C.hp2 + dir, C.hp2 + 2 * dir]) { const p = probe(r.c, h, C.hp4, 8080, true, false); cand.push([h, p.duel]); if (Math.abs(p.duel - 0.5) < 0.03 || (dir > 0 ? p.duel > 0.5 : p.duel < 0.5)) break; }
    const best = cand.reduce((a, b) => (Math.abs(b[1] - 0.5) < Math.abs(a[1] - 0.5) ? b : a));
    out.push(`duel ${cand.map(([h, v]) => `${h}hp:${(v * 100).toFixed(1)}%`).join(' ')} → ${best[0]}`); changes[r.c] = changes[r.c] || {}; changes[r.c].hp2 = best[0];
  }
  if (offT) {
    const cand = [[C.hp4, r.t]]; const dir = r.t < 0 ? 1 : -1;
    for (const h of [C.hp4 + dir, C.hp4 + 2 * dir]) { const p = probe(r.c, C.hp2, h, 9090, false, true); cand.push([h, p.table]); if (Math.abs(p.table) < 0.02 || (dir > 0 ? p.table > 0 : p.table < 0)) break; }
    const best = cand.reduce((a, b) => (Math.abs(b[1]) < Math.abs(a[1]) ? b : a));
    out.push(`table ${cand.map(([h, v]) => `${h}hp:${(v * 100 >= 0 ? '+' : '') + (v * 100).toFixed(1)}`).join(' ')} → ${best[0]}`); changes[r.c] = changes[r.c] || {}; changes[r.c].hp4 = best[0];
  }
  console.log(r.c.padEnd(11), out.join(' | '));
}
fs.writeFileSync(__dirname + '/refine-result.json', JSON.stringify(changes));
