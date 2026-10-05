// Shared harness for experiments: runs AI games with per-player policies and lets experiments hook turn starts.
require('../sim.js'); // loads the engine into the global scope
const ids = CIV_ORDER;
const origEndTurn = endTurn;
globalThis.endTurn = function (S) { origEndTurn(S); S.turnNo = (S.turnNo || 0) + 1; };
function randomAct(S, pid) {
  const P = S.players[pid];
  if (!S.flags.bought && rnd(S) < 0.3) { const ok = S.market.map((c, i) => [c, i]).filter(([c]) => c && P.gold >= marketCost(S, P, c)); if (ok.length) return { kind: 'buy', idx: ok[Math.floor(rnd(S) * ok.length)][1] }; }
  if (S.plays > 0 && P.hand.length) { const c = P.hand[Math.floor(rnd(S) * P.hand.length)], o = opponents(S, P); return { kind: 'play', uid: c.uid, target: needsTarget(c) && o.length ? o[Math.floor(rnd(S) * o.length)].id : null }; }
  return { kind: 'end' };
}
// opts: { policies: [..], setup(S), onTurnStart(S, P) -> true if the turn was consumed, trackRounds }
function runGame(seed, civs, opts = {}) {
  const S = newGame({ seed, civs, ai: civs.map(() => true) }); S.quiet = true;
  S.players.forEach((P, i) => { P.policy = (opts.policies || [])[i] || 'smart'; P.hTurns = 0; });
  if (opts.setup) opts.setup(S);
  for (const P of S.players) chooseRelic(S, P.id, aiRelic(S, P));
  startGame(S); S.turnNo = 0;
  let seen = -1, guard = 0;
  while (S.winner == null && guard++ < 8000) {
    const P = S.players[S.turn];
    if (S.turnNo !== seen) {
      seen = S.turnNo; P.hTurns++;
      if (opts.onRound) opts.onRound(S);
      if (opts.onTurnStart && opts.onTurnStart(S, P)) { if (S.winner == null && (S.plays <= 0 || !P.hand.length)) endTurn(S); continue; }
    }
    const a = P.policy === 'random' ? randomAct(S, S.turn) : aiAct(S, S.turn);
    if (a.kind === 'buy') buy(S, S.turn, a.idx);
    else if (a.kind === 'play') playCard(S, S.turn, a.uid, a.target);
    if (S.winner != null) break;
    if (a.kind === 'end' || S.plays <= 0 || !S.players[S.turn].hand.length) { if (a.kind !== 'buy' || S.plays <= 0) endTurn(S); }
  }
  return S;
}
// head-to-head between two policies in duels over random civ pairs, seats alternating
function duel(n, base, policyA, policyB, opts = {}) {
  let winsA = 0, games = 0;
  for (let g = 0; g < n; g++) {
    const R = { rs: (base + g * 2654435761) >>> 0 }, pair = shuffled(R, ids).slice(0, 2);
    const aFirst = g % 2 === 0;
    const S = runGame((base + g * 7919) >>> 0, pair, { ...opts, policies: aFirst ? [policyA, policyB] : [policyB, policyA] });
    games++; if (S.winner === (aFirst ? 0 : 1)) winsA++;
  }
  return winsA / games;
}
module.exports = { runGame, duel, randomAct, ids };
