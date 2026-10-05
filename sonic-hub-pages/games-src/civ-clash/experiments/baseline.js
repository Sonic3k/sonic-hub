// What the current game is like: skill expression, length, comebacks.
const { runGame, duel, ids } = require('./harness.js');
const N = 6000;
console.log(`smart AI vs random play (duels): smart wins ${(duel(N, 11, 'smart', 'random') * 100).toFixed(1)}%`);
let rounds = [], behind = 0, comeback = 0;
for (let g = 0; g < N; g++) {
  const pair = shuffled({ rs: (99 + g * 2654435761) >>> 0 }, ids).slice(0, 2);
  let snap = null;
  const S = runGame((777 + g * 7919) >>> 0, pair, { onRound: S => { if (S.round === 7 && !snap) snap = S.players.map(p => p.hp / p.maxHP + wallTotal(p) / p.maxHP); } });
  rounds.push(S.round);
  if (snap && Math.abs(snap[0] - snap[1]) >= 0.3) { behind++; const low = snap[0] < snap[1] ? 0 : 1; if (S.winner === low) comeback++; }
}
rounds.sort((a, b) => a - b);
console.log(`rounds per duel: p10 ${rounds[N * 0.1 | 0]}, median ${rounds[N / 2 | 0]}, p90 ${rounds[N * 0.9 | 0]}`);
console.log(`clearly behind at round 7 (≥30% of max HP down): ${(behind / N * 100).toFixed(0)}% of games; those players still win ${(comeback / behind * 100).toFixed(1)}%`);
