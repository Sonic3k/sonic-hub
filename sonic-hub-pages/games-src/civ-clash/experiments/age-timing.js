// How early is the Imperial Age? Same HP, age card arriving at turn 5..8.
const { runGame, ids } = require('./harness.js');
const orig = playCard;
globalThis.playCard = (S, pid, uid, tid) => { const P = S.players[pid], c = P.hand.find(x => x.uid === uid); const ev = orig(S, pid, uid, tid); if (ev && c && c.imperial) P.impPlayed = (P.impPlayed || 0) + 1; return ev; };
function run(n, players, base) {
  const rounds = []; let ps = 0, aged = 0, none = 0, share = 0, imp = 0, agedRounds = [];
  for (let g = 0; g < n; g++) {
    const civs = shuffled({ rs: (base + g * 2654435761) >>> 0 }, ids).slice(0, players);
    const S = runGame((base + g * 7919) >>> 0, civs);
    rounds.push(S.round); if (!S.players.some(P => P.aged)) none++;
    for (const P of S.players) { ps++; if (P.aged) { aged++; agedRounds.push(P.agedRound); share += (S.round - P.agedRound + 1) / S.round; imp += P.impPlayed || 0; } }
  }
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  return { med: med(rounds), none: none / n, aged: aged / ps, ageAt: med(agedRounds), share: share / Math.max(1, aged), imp: imp / Math.max(1, aged) };
}
const f = x => (x * 100).toFixed(0) + '%';
console.log('turn | duel: median rounds, Imperial share of the game, Imperial cards played, games with no age-up | 4 players: same');
for (const t of [5, 6, 7, 8]) {
  RULES.ageTurn = t;
  const d = run(3000, 2, 1234), q = run(1500, 4, 5678);
  console.log(`  ${t}  | ${d.med} rounds, ${f(d.share)} of the game in Imperial (age-up round ${d.ageAt}), ${d.imp.toFixed(1)} Imperial cards, ${f(d.none)} end before anyone ages | ${q.med} rounds, ${f(q.share)}, ${q.imp.toFixed(1)} cards, ${f(q.none)}`);
}
