/* Lets the computer's players meet each other: node tools/sim.js <a> <b> [games=10] [time scale=1] [seed=1]
   Prints the score of a against b (colours alternate) and how the games ended. */
const E = require('./engine.js');
const [a, b, gamesArg, scaleArg, seedArg] = process.argv.slice(2);
const games = +(gamesArg || 10), scale = +(scaleArg || 1); let seed = +(seedArg || 1) * 7919 + 13;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const cfg = name => { const p = E.PLAYERS[name]; if (!p) throw new Error('no player ' + name); return Object.assign({}, p, { ms: p.ms ? p.ms * scale : undefined, random: rnd }); };
function game(red, blue, g) {
  const S = E.newGame(), seen = {}, who = [cfg(red), cfg(blue)]; let plies = 0;
  seen[E.posKey(S)] = 1;
  while (plies < 400) {
    const st = E.status(S); if (st) return { st, plies };
    const t = E.AI.turn(S, Object.assign({}, who[S.turn], { seen, salt: g * 977 + S.turn }));
    if (!t.moves.length) return { st: { winner: 1 - S.turn, why: 'stuck' }, plies };
    for (const m of t.moves) E.play(S, m, true);
    plies++;
    const k = E.posKey(S); seen[k] = (seen[k] || 0) + 1; if (seen[k] >= 3 && !S.over) return { st: { winner: -1, why: 'repeat' }, plies };
  }
  // out of time: whoever has more left
  let m = 0; for (let p = 0; p < S.n; p++) if (S.at[p] >= 0) m += (S.own[p] === 0 ? 1 : -1) * E.VALUE[S.kind[p]];
  return { st: { winner: Math.abs(m) < 300 ? -1 : m > 0 ? 0 : 1, why: 'long' }, plies };
}
let wa = 0, wb = 0, dr = 0, total = 0; const how = {}; const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const aRed = g % 2 === 0, r = game(aRed ? a : b, aRed ? b : a, g), w = r.st.winner;
  if (w < 0) dr++; else if ((w === 0) === aRed) wa++; else wb++;
  how[r.st.why] = (how[r.st.why] || 0) + 1; total += r.plies;
}
const score = (wa + dr / 2) / games, elo = score <= 0 ? -800 : score >= 1 ? 800 : Math.round(-400 * Math.log10(1 / score - 1));
console.log(`${a} vs ${b}: +${wa} =${dr} -${wb}  (${(score * 100).toFixed(0)}%, about ${elo >= 0 ? '+' : ''}${elo} Elo)  ${JSON.stringify(how)}  avg ${Math.round(total / games)} turns  ${Math.round((Date.now() - t0) / 1000)}s`);
