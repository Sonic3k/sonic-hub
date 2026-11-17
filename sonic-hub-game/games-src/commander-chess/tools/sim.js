/* Lets the computer's players meet each other: node tools/sim.js <a> <b> [games=10] [time scale=1] [seed=1] [battles|total]
   Prints the score of a against b (colours alternate) and how the games ended. */
const E = require('./engine.js');
const [a, b, gamesArg, scaleArg, seedArg, gameArg] = process.argv.slice(2);
const games = +(gamesArg || 10), scale = +(scaleArg || 1), setup = { game: gameArg === 'total' ? 'total' : 'battles' }; let seed = +(seedArg || 1) * 7919 + 13;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const cfg = name => { const p = E.PLAYERS[name]; if (!p) throw new Error('no player ' + name); return Object.assign({}, p, { ms: p.ms ? p.ms * scale : undefined, random: rnd }); };
function game(red, blue, g) {
  const S = E.newGame(setup), seen = {}, who = [cfg(red), cfg(blue)]; let plies = 0;
  seen[E.posKey(S)] = 1;
  while (plies < 600) {
    const st = E.status(S); if (st) return { st, plies };
    const t = E.AI.turn(S, Object.assign({}, who[S.turn], { seen, salt: g * 977 + S.turn }));
    if (!t.moves.length) return { st: { winner: 1 - S.turn, why: 'stuck' }, plies };
    for (const m of t.moves) E.play(S, m, true);
    plies++;
    const k = E.posKey(S); seen[k] = (seen[k] || 0) + 1; if (seen[k] >= 3 && !S.over) return { st: E.onPoints(S, 'repeat'), plies };
  }
  return { st: E.onPoints(S, 'long'), plies };
}
let wa = 0, wb = 0, dr = 0, total = 0; const how = {}; const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const aRed = g % 2 === 0, r = game(aRed ? a : b, aRed ? b : a, g), w = r.st.winner;
  if (w < 0) dr++; else if ((w === 0) === aRed) wa++; else wb++;
  const why = r.st.why === 'points' ? 'points/' + r.st.cause : r.st.why; how[why] = (how[why] || 0) + 1; total += r.plies;
}
const score = (wa + dr / 2) / games, elo = score <= 0 ? -800 : score >= 1 ? 800 : Math.round(-400 * Math.log10(1 / score - 1));
console.log(`${a} vs ${b} (${setup.game}): +${wa} =${dr} -${wb}  (${(score * 100).toFixed(0)}%, about ${elo >= 0 ? '+' : ''}${elo} Elo)  ${JSON.stringify(how)}  avg ${Math.round(total / games)} turns  ${Math.round((Date.now() - t0) / 1000)}s`);
