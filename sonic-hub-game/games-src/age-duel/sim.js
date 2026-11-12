// node sim.js [games] — AI vs AI. Prints the strategy matrix (row = side 0 plan, win %), civ table, game lengths.
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['00-core.js', '10-data.js', '20-engine.js', '30-ai.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), { filename: f });
function play(seed, civ0, civ1, s0, s1, opts = {}) {
  const S = newGame({ seed, civ0, civ1, ai0: s0, ai1: s1 });
  while (!S.over) {
    aiPlan(S, 0); aiPlan(S, 1);
    if (opts.blind) for (const i of opts.blind) S.sides[i].orders.scouts = [];
    resolveTurn(S);
  }
  return S;
}
module.exports = { play };
if (require.main === module) {
  const N = +process.argv[2] || 40, plans = Object.keys(AI_STRATS);
  const how = {}, lens = [];
  console.log('Strategy matrix (row plan vs column plan, % row wins), mixed civs:');
  console.log('        ' + plans.map(p => p.padStart(8)).join(''));
  for (const a of plans) {
    let line = a.padEnd(8);
    for (const b of plans) {
      let w = 0, g = 0;
      for (let k = 0; k < N; k++) {
        const c0 = CIV_ORDER[k % 4], c1 = CIV_ORDER[(k >> 2) % 4];
        const S1 = play(1000 + k, c0, c1, a, b), S2 = play(5000 + k, c1, c0, b, a);
        if (S1.winner === 0) w++; if (S1.winner !== -1) g++;
        if (S2.winner === 1) w++; if (S2.winner !== -1) g++;
        for (const S of [S1, S2]) { how[S.over.how] = (how[S.over.how] || 0) + 1; lens.push(S.turn); }
      }
      line += String(Math.round(w / Math.max(1, g) * 100)).padStart(8);
    }
    console.log(line);
  }
  lens.sort((x, y) => x - y);
  console.log('ends:', JSON.stringify(how), ' turns p10/p50/p90:', lens[Math.floor(lens.length * 0.1)], lens[Math.floor(lens.length * 0.5)], lens[Math.floor(lens.length * 0.9)]);
  console.log('\nCiv vs civ (row wins %, random plans):');
  console.log('          ' + CIV_ORDER.map(c => c.padStart(10)).join(''));
  for (const a of CIV_ORDER) {
    let line = a.padEnd(10);
    for (const b of CIV_ORDER) { let w = 0, g = 0; for (let k = 0; k < N; k++) { const S1 = play(9000 + k, a, b, true, true), S2 = play(13000 + k, b, a, true, true); if (S1.winner === 0) w++; if (S1.winner !== -1) g++; if (S2.winner === 1) w++; if (S2.winner !== -1) g++; } line += String(Math.round(w / Math.max(1, g) * 100)).padStart(10); }
    console.log(line);
  }
  let w = 0, g = 0;
  for (let k = 0; k < N * 2; k++) { const c0 = CIV_ORDER[k % 4], c1 = CIV_ORDER[(k >> 2) % 4]; const S = play(20000 + k, c0, c1, true, true, { blind: [1] }); if (S.winner === 0) w++; if (S.winner !== -1) g++; }
  console.log('\nScouting matters? side that scouts vs blind side, same AI: scouting side wins', Math.round(w / Math.max(1, g) * 100) + '%');
}
