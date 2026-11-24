// Sỏi Trắng | Wax & Wane (Othello)
// Three deliberately lighter levels: Easy, Medium, Hard.
// Hard is capped at five plies and uses a compact evaluator, so it stays below Moonwarden.
const BOT = (() => {
  'use strict';

  const CORNERS = [0, 7, 56, 63];
  const CORNER_NEAR = [
    [0, [1, 8, 9]], [7, [6, 15, 14]],
    [56, [48, 57, 49]], [63, [55, 62, 54]],
  ];
  const POS = new Int8Array([
    90, -24, 16, 7, 7, 16, -24, 90,
    -24, -38, -5, -3, -3, -5, -38, -24,
    16, -5, 10, 3, 3, 10, -5, 16,
    7, -3, 3, 1, 1, 3, -3, 7,
    7, -3, 3, 1, 1, 3, -3, 7,
    16, -5, 10, 3, 3, 10, -5, 16,
    -24, -38, -5, -3, -3, -5, -38, -24,
    90, -24, 16, 7, 7, 16, -24, 90,
  ]);
  const INF = 1e9;
  const now = typeof performance !== 'undefined' && performance.now
    ? () => performance.now()
    : () => Date.now();
  let deadline = 0, nodes = 0, stopped = false, rand = () => 0.5;

  function mobility(S, side) {
    let n = 0;
    for (let s = 0; s < 64; s++) if (!S.b[s] && encloses(S.b, s, side)) n++;
    return n;
  }

  function potentialMobility(S, side) {
    const foe = 2 - side;
    let n = 0;
    for (let s = 0; s < 64; s++) if (!S.b[s]) {
      for (let d = 0; d < 8; d++) {
        if (RUN[s * 8 + d] && S.b[s + DIR[d]] === foe) { n++; break; }
      }
    }
    return n;
  }

  function frontier(S, side) {
    let n = 0;
    for (let s = 0; s < 64; s++) if (S.b[s] === side + 1) {
      for (let d = 0; d < 8; d++) {
        if (RUN[s * 8 + d] && !S.b[s + DIR[d]]) { n++; break; }
      }
    }
    return n;
  }

  function evaluate(S) {
    const me = S.turn, foe = 1 - me;
    const disks = S.count;
    const pos = [0, 0], corners = [0, 0], cornerRisk = [0, 0];
    for (let s = 0; s < 64; s++) if (S.b[s]) pos[S.b[s] - 1] += POS[s];
    for (const c of CORNERS) if (S.b[c]) corners[S.b[c] - 1]++;
    for (const [c, near] of CORNER_NEAR) if (!S.b[c]) {
      for (let i = 0; i < near.length; i++) {
        const owner = S.b[near[i]] - 1;
        if (owner >= 0) cornerRisk[owner] -= i === 2 ? 105 : 55;
      }
    }

    const mob = [mobility(S, DARK), mobility(S, LIGHT)];
    const pot = [potentialMobility(S, DARK), potentialMobility(S, LIGHT)];
    const fr = [frontier(S, DARK), frontier(S, LIGHT)];
    const played = 64 - S.empties;
    const discWeight = played < 16 ? 0.5 : played < 34 ? 1 : played < 48 ? 3 : played < 57 ? 8 : 18;
    return (mob[me] - mob[foe]) * 9
      + (pot[me] - pot[foe]) * 2
      + (fr[foe] - fr[me]) * 3
      + (pos[me] - pos[foe]) * 2
      + (corners[me] - corners[foe]) * 360
      + (cornerRisk[me] - cornerRisk[foe])
      + (disks[me] - disks[foe]) * discWeight;
  }

  function orderValue(S, move) {
    if (move === PASS_MOVE) return -INF;
    let score = POS[move] * 3;
    if (CORNERS.includes(move)) score += 10000;
    for (const [corner, near] of CORNER_NEAR) if (!S.b[corner]) {
      const at = near.indexOf(move);
      if (at >= 0) score -= at === 2 ? 1800 : 950;
    }
    const flips = countFlips(S, move);
    score += S.empties > 20 ? -flips * 7 : flips;
    return score;
  }

  function ordered(S, moves) {
    return moves.map(move => ({ move, score: orderValue(S, move) }))
      .sort((a, b) => b.score - a.score).map(x => x.move);
  }

  function timeUp() {
    if (stopped) return true;
    if ((nodes & 31) === 0 && now() >= deadline) stopped = true;
    return stopped;
  }

  function terminalScore(S) {
    const diff = S.count[S.turn] - S.count[1 - S.turn];
    return diff === 0 ? 0 : (diff > 0 ? 100000 : -100000) + diff * 100;
  }

  function search(S, depth, alpha, beta) {
    nodes++;
    if (timeUp()) return 0;
    const moves = legalMoves(S);
    if (!moves.length) return terminalScore(S);
    if (moves.length === 1 && moves[0] === PASS_MOVE) {
      make(S, PASS_MOVE);
      const value = -search(S, depth, -beta, -alpha);
      unmake(S);
      return value;
    }
    if (depth <= 0) return evaluate(S);

    let best = -INF;
    for (const move of ordered(S, moves)) {
      if (stopped) return 0;
      make(S, move);
      const value = -search(S, depth - 1, -beta, -alpha);
      unmake(S);
      if (stopped) return 0;
      if (value > best) best = value;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return best;
  }

  function root(S, depth, moves) {
    let best = -INF, bestMove = moves[0], alpha = -INF;
    for (const move of ordered(S, moves)) {
      if (now() >= deadline) { stopped = true; return { complete: false, move: bestMove }; }
      make(S, move);
      const value = -search(S, depth - 1, -INF, -alpha);
      unmake(S);
      if (stopped) return { complete: false, move: bestMove };
      if (value > best) { best = value; bestMove = move; }
      if (value > alpha) alpha = value;
    }
    return { complete: true, move: bestMove };
  }

  function easyMove(S, moves) {
    if (moves.length <= 1) return moves[0];
    // Easy deliberately mixes random legal play with a small positional preference.
    if (rand() < 0.58) return moves[Math.floor(rand() * moves.length)];
    let best = -INF, choices = [];
    for (const move of moves) {
      const score = orderValue(S, move) + (rand() - 0.5) * 100;
      if (score > best) { best = score; choices = [move]; }
      else if (score === best) choices.push(move);
    }
    return choices[Math.floor(rand() * choices.length)];
  }

  function think(S, opt) {
    const moves = legalMoves(S);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];
    rand = typeof opt.rand === 'function' ? opt.rand : () => 0.5;
    if (opt.level === 'Easy') return easyMove(S, moves);

    const maxDepth = opt.level === 'Medium' ? 3 : 5;
    const budget = Number.isFinite(opt.timeMs) && opt.timeMs > 0 ? opt.timeMs : 1000;
    deadline = now() + budget * 0.78;
    nodes = 0;
    stopped = false;
    let bestMove = ordered(S, moves)[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const result = root(S, depth, moves);
      if (!result.complete) break;
      bestMove = result.move;
    }
    return bestMove;
  }

  return { name: 'Sỏi Trắng', author: 'OpenAI Codex', levels: ['Easy', 'Medium', 'Hard'], think };
})();
