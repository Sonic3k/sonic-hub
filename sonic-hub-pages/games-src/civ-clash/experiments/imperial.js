// Pick the turn the Imperial Age card arrives, and check that aging is worth doing and that timing it is a real choice.
const { runGame, ids } = require('./harness.js');
function match(n, base, pa, pb) {
  let wa = 0;
  for (let g = 0; g < n; g++) {
    const pair = shuffled({ rs: (base + g * 2654435761) >>> 0 }, ids).slice(0, 2), aFirst = g % 2 === 0, pol = aFirst ? [pa, pb] : [pb, pa];
    const S = runGame((base + g * 7919) >>> 0, pair, { setup: S => S.players.forEach((P, i) => { P.agePolicy = pol[i]; }) });
    if (S.winner === (aFirst ? 0 : 1)) wa++;
  }
  return wa / n;
}
function profile(n, base, players) {
  const rounds = [], agedRounds = []; let ps = 0, aged = 0, endedBefore = 0;
  for (let g = 0; g < n; g++) {
    const civs = shuffled({ rs: (base + g * 2654435761) >>> 0 }, ids).slice(0, players);
    const S = runGame((base + g * 7919) >>> 0, civs);
    rounds.push(S.round); if (!S.players.some(P => P.ageGiven)) endedBefore++;
    for (const P of S.players) { ps++; if (P.aged) { aged++; agedRounds.push(P.agedRound); } }
  }
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  return `median ${med(rounds)} rounds, ${(endedBefore / n * 100).toFixed(1)}% end before anyone gets the card, ${(aged / ps * 100).toFixed(0)}% of players age (median round ${med(agedRounds)})`;
}
const pct = x => (x * 100).toFixed(1) + '%';
for (const t of [4, 5, 6]) {
  RULES.ageTurn = t;
  console.log(`ageTurn ${t}: asap beats never ${pct(match(5000, 11, 'asap', 'never'))} · AI-timed beats asap ${pct(match(5000, 22, 'smart', 'asap'))} · duels: ${profile(2000, 33, 2)} · 4p: ${profile(1200, 44, 4)}`);
}
RULES.ageTurn = 5;
for (const b of [2, 4, 7]) { AI_AGE.base = b; console.log(`ageTurn 5, AI eagerness ${b}: AI-timed beats asap ${pct(match(5000, 55, 'smart', 'asap'))}`); }
