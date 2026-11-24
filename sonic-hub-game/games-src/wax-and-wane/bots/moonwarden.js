/*
 * Moonwarden — a time-bounded Wax & Wane player.
 * Built for this game's Othello rules: iterative deepening, negamax alpha-beta,
 * PVS, late-move reductions, a transposition table, corner-aware move ordering,
 * phase-aware positional evaluation, pass handling, and exact endgame search.
 */
'use strict';

const WW_INF = 900000000;
const WW_TT_BITS = 19;
const WW_TT_SIZE = 1 << WW_TT_BITS;
const WW_TT_MASK = WW_TT_SIZE - 1;
const WW_CORNERS = [0, 7, 56, 63];
const WW_CORNER_NEIGHBORS = [
  [[1, 8, 9], 0], [[6, 14, 15], 7],
  [[48, 49, 57], 56], [[54, 55, 62], 63],
];
const WW_POSITION = [
  100, -24, 16, 7, 7, 16, -24, 100,
  -24, -42, -4, -3, -3, -4, -42, -24,
  16, -4, 11, 3, 3, 11, -4, 16,
  7, -3, 3, 2, 2, 3, -3, 7,
  7, -3, 3, 2, 2, 3, -3, 7,
  16, -4, 11, 3, 3, 11, -4, 16,
  -24, -42, -4, -3, -3, -4, -42, -24,
  100, -24, 16, 7, 7, 16, -24, 100,
];

const WW_TT_LO = new Int32Array(WW_TT_SIZE);
const WW_TT_HI = new Int32Array(WW_TT_SIZE);
const WW_TT_DEPTH = new Int8Array(WW_TT_SIZE);
const WW_TT_SCORE = new Int32Array(WW_TT_SIZE);
const WW_TT_MOVE = new Int8Array(WW_TT_SIZE);
const WW_TT_FLAG = new Int8Array(WW_TT_SIZE); // 0 exact, 1 lower, 2 upper
const WW_TT_GEN = new Uint16Array(WW_TT_SIZE);
const WW_BUFFERS = Array.from({ length: 132 }, () => new Int8Array(40));
const WW_KILLERS = Array.from({ length: 132 }, () => new Int8Array([-1, -1]));
const WW_HISTORY = new Int32Array(2 * 64);
let WW_GENERATION = 0;
let wwNow, wwDeadline, wwNodes, wwStopped, wwRand;

function wwTimeUp(force) {
  if (wwStopped) return true;
  if (force || (wwNodes & 63) === 0) {
    if (wwNow() >= wwDeadline) wwStopped = true;
  }
  return wwStopped;
}

function wwCountMoves(b, side) {
  let n = 0;
  for (let s = 0; s < 64; s++) if (!b[s] && encloses(b, s, side)) n++;
  return n;
}

function wwPotentialMobility(b, side) {
  let n = 0;
  const foe = 2 - side;
  for (let s = 0; s < 64; s++) if (!b[s]) {
    let adjacent = false;
    for (let d = 0; d < 8; d++) {
      if (RUN[s * 8 + d] && b[s + DIR[d]] === foe) { adjacent = true; break; }
    }
    if (adjacent) n++;
  }
  return n;
}

function wwFrontier(b, side) {
  let n = 0;
  const mark = side + 1;
  for (let s = 0; s < 64; s++) if (b[s] === mark) {
    for (let d = 0; d < 8; d++) if (RUN[s * 8 + d] && !b[s + DIR[d]]) { n++; break; }
  }
  return n;
}

function wwStableEdges(b, side) {
  const mark = side + 1;
  const stable = new Uint8Array(64);
  const rays = [[1, 8], [-1, 8], [1, -8], [-1, -8]];
  for (let i = 0; i < WW_CORNERS.length; i++) {
    const corner = WW_CORNERS[i];
    if (b[corner] !== mark) continue;
    stable[corner] = 1;
    for (const step of rays[i]) {
      let s = corner + step;
      while (s >= 0 && s < 64 && b[s] === mark) {
        stable[s] = 1;
        const row = s >> 3, col = s & 7;
        if ((step === 1 || step === -1) && (col === 0 || col === 7)) break;
        if ((step === 8 || step === -8) && (row === 0 || row === 7)) break;
        s += step;
      }
    }
  }
  let n = 0;
  for (let s = 0; s < 64; s++) n += stable[s];
  return n;
}

function wwEmptyParity(S) {
  if (S.empties > 18) return 0;
  const seen = new Uint8Array(64), b = S.b;
  let odd = 0;
  for (let start = 0; start < 64; start++) if (!b[start] && !seen[start]) {
    const queue = new Int8Array(64); let head = 0, tail = 0;
    queue[tail++] = start; seen[start] = 1;
    while (head < tail) {
      const s = queue[head++], row = s >> 3, col = s & 7;
      for (let d = 0; d < 8; d++) {
        const rr = row + (d < 3 ? -1 : d > 4 ? 1 : 0);
        const cc = col + (d === 0 || d === 5 ? -1 : d === 2 || d === 7 ? 1 : d === 3 ? -1 : d === 4 ? 1 : 0);
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const t = rr * 8 + cc;
        if (!b[t] && !seen[t]) { seen[t] = 1; queue[tail++] = t; }
      }
    }
    if (tail & 1) odd++;
  }
  return odd;
}

function wwEvaluate(S) {
  const b = S.b, discs = [0, 0], positional = [0, 0];
  for (let s = 0; s < 64; s++) if (b[s]) {
    const side = b[s] - 1;
    discs[side]++;
    positional[side] += WW_POSITION[s];
  }

  let cornerDiff = 0;
  for (const c of WW_CORNERS) if (b[c]) cornerDiff += b[c] === DARK + 1 ? 1 : -1;

  let cornerRisk = [0, 0];
  for (const [near, corner] of WW_CORNER_NEIGHBORS) if (!b[corner]) {
    const [horizontal, diagonal, vertical] = near;
    if (b[horizontal]) cornerRisk[b[horizontal] - 1] -= 95;
    if (b[vertical]) cornerRisk[b[vertical] - 1] -= 95;
    if (b[diagonal]) cornerRisk[b[diagonal] - 1] -= 150;
  }

  const mobility = [wwCountMoves(b, DARK), wwCountMoves(b, LIGHT)];
  const potential = [wwPotentialMobility(b, DARK), wwPotentialMobility(b, LIGHT)];
  const frontier = [wwFrontier(b, DARK), wwFrontier(b, LIGHT)];
  const stable = [wwStableEdges(b, DARK), wwStableEdges(b, LIGHT)];
  const phase = 64 - S.empties;
  const discWeight = phase < 18 ? 1 : phase < 36 ? 2 : phase < 48 ? 4 : phase < 56 ? 8 : 18;

  const darkScore =
    (mobility[DARK] - mobility[LIGHT]) * 13 +
    (potential[DARK] - potential[LIGHT]) * 4 +
    (frontier[LIGHT] - frontier[DARK]) * 9 +
    (stable[DARK] - stable[LIGHT]) * 26 +
    (discs[DARK] - discs[LIGHT]) * discWeight +
    (positional[DARK] - positional[LIGHT]) * 2.3 +
    (cornerRisk[DARK] - cornerRisk[LIGHT]) +
    cornerDiff * 1400;

  const parity = wwEmptyParity(S) * 6 * (S.turn === DARK ? 1 : -1);
  const result = darkScore + parity;
  return S.turn === DARK ? result : -result;
}

function wwMoveOrder(S, move, ttMove, ply) {
  if (move === ttMove) return 100000000;
  if (move === PASS_MOVE) return -100000;
  let score = WW_POSITION[move] * 4 + wwRand() * 0.01;
  if (WW_CORNERS.includes(move)) score += 200000;
  const killer = WW_KILLERS[Math.min(ply, WW_KILLERS.length - 1)];
  if (killer[0] === move) score += 12000;
  else if (killer[1] === move) score += 9000;
  score += WW_HISTORY[S.turn * 64 + move];

  for (const [near, corner] of WW_CORNER_NEIGHBORS) if (move === near[0] || move === near[1] || move === near[2]) {
    if (!S.b[corner]) score -= move === near[1] ? 2600 : 1800;
  }
  // Early in the game, low-flip moves tend to preserve options and avoid
  // handing the opponent an easy mobility-rich reply.
  const flips = countFlips(S, move);
  score += S.empties > 20 ? -flips * 9 : flips * 2;
  return score;
}

function wwOrdered(S, buffer, count, ttMove, ply) {
  const list = new Array(count);
  for (let i = 0; i < count; i++) list[i] = { move: buffer[i], score: wwMoveOrder(S, buffer[i], ttMove, ply) };
  list.sort((a, b) => b.score - a.score);
  return list;
}

function wwProbe(S) {
  const lo = keyLo(S) | 0, hi = keyHi(S) | 0, index = lo & WW_TT_MASK;
  return WW_TT_GEN[index] === WW_GENERATION && WW_TT_LO[index] === lo && WW_TT_HI[index] === hi ? index : -1;
}

function wwStore(S, depth, score, flag, move) {
  const lo = keyLo(S) | 0, hi = keyHi(S) | 0, index = lo & WW_TT_MASK;
  if (WW_TT_GEN[index] === WW_GENERATION && WW_TT_DEPTH[index] > depth && WW_TT_LO[index] === lo && WW_TT_HI[index] === hi) return;
  WW_TT_GEN[index] = WW_GENERATION;
  WW_TT_LO[index] = lo; WW_TT_HI[index] = hi;
  WW_TT_DEPTH[index] = depth; WW_TT_SCORE[index] = score;
  WW_TT_FLAG[index] = flag; WW_TT_MOVE[index] = move;
}

function wwSearch(S, depth, alpha, beta, ply) {
  wwNodes++;
  if (wwTimeUp()) return 0;

  const buffer = WW_BUFFERS[Math.min(ply, WW_BUFFERS.length - 1)];
  const count = gen(S, buffer);
  if (!count) return (S.count[S.turn] - S.count[1 - S.turn]) * 10000;

  if (count === 1 && buffer[0] === PASS_MOVE) {
    make(S, PASS_MOVE);
    const value = -wwSearch(S, depth, -beta, -alpha, ply + 1);
    unmake(S);
    return value;
  }

  if (depth <= 0) return wwEvaluate(S);

  const originalAlpha = alpha;
  let ttMove = -1;
  const ttIndex = wwProbe(S);
  if (ttIndex >= 0) {
    ttMove = WW_TT_MOVE[ttIndex];
    if (WW_TT_DEPTH[ttIndex] >= depth) {
      const value = WW_TT_SCORE[ttIndex], flag = WW_TT_FLAG[ttIndex];
      if (flag === 0) return value;
      if (flag === 1 && value >= beta) return value;
      if (flag === 2 && value <= alpha) return value;
    }
  }

  const ordered = wwOrdered(S, buffer, count, ttMove, ply);
  let best = -WW_INF, bestMove = ordered[0].move, searched = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (wwTimeUp()) return 0;
    const move = ordered[i].move;
    make(S, move);
    let value;
    if (!searched) {
      value = -wwSearch(S, depth - 1, -beta, -alpha, ply + 1);
    } else {
      const late = depth >= 5 && searched >= 5 && !WW_CORNERS.includes(move) && WW_POSITION[move] < 50;
      value = -wwSearch(S, depth - 1 - (late ? 1 : 0), -alpha - 1, -alpha, ply + 1);
      if (!wwStopped && late && value > alpha)
        value = -wwSearch(S, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (!wwStopped && value > alpha && value < beta)
        value = -wwSearch(S, depth - 1, -beta, -alpha, ply + 1);
    }
    unmake(S);
    if (wwStopped) return 0;
    searched++;
    if (value > best) { best = value; bestMove = move; }
    if (value > alpha) alpha = value;
    if (alpha >= beta) {
      if (!WW_CORNERS.includes(move)) {
        const killers = WW_KILLERS[Math.min(ply, WW_KILLERS.length - 1)];
        if (killers[0] !== move) { killers[1] = killers[0]; killers[0] = move; }
        const hi = S.turn * 64 + move;
        WW_HISTORY[hi] = Math.min(200000, WW_HISTORY[hi] + depth * depth * 16);
      }
      break;
    }
  }

  const flag = best <= originalAlpha ? 2 : best >= beta ? 1 : 0;
  wwStore(S, depth, best, flag, bestMove);
  return best;
}

function wwRoot(S, moves, depth, previous) {
  const rootIndex = wwProbe(S), ttMove = rootIndex >= 0 ? WW_TT_MOVE[rootIndex] : previous;
  const ordered = wwOrdered(S, moves, moves.length, ttMove, 0);
  let alpha = -WW_INF, beta = WW_INF, best = -WW_INF, bestMove = ordered[0].move;
  for (let i = 0; i < ordered.length; i++) {
    if (wwTimeUp()) return { complete: false, move: bestMove, score: best };
    const move = ordered[i].move;
    make(S, move);
    let value;
    if (i === 0) value = -wwSearch(S, depth - 1, -beta, -alpha, 1);
    else {
      value = -wwSearch(S, depth - 1, -alpha - 1, -alpha, 1);
      if (!wwStopped && value > alpha && value < beta)
        value = -wwSearch(S, depth - 1, -beta, -alpha, 1);
    }
    unmake(S);
    if (wwStopped) return { complete: false, move: bestMove, score: best };
    if (value > best) { best = value; bestMove = move; }
    if (value > alpha) alpha = value;
  }
  wwStore(S, depth, best, 0, bestMove);
  return { complete: true, move: bestMove, score: best };
}

const BOT = {
  name: 'Moonwarden',
  author: 'GPT-6',
  levels: ['Moonwarden'],
  think(S, opt) {
    wwNow = () => performance.now();
    const budget = Number.isFinite(opt.timeMs) && opt.timeMs > 0 ? opt.timeMs : 1000;
    wwDeadline = wwNow() + Math.max(20, budget * 0.86);
    wwNodes = 0; wwStopped = false; wwRand = opt.rand || (() => 0.5);
    WW_GENERATION = (WW_GENERATION + 1) & 0xffff;
    if (!WW_GENERATION) { WW_TT_GEN.fill(0); WW_GENERATION = 1; }
    WW_HISTORY.fill(0);
    for (const killers of WW_KILLERS) { killers[0] = -1; killers[1] = -1; }

    const moves = legalMoves(S);
    if (moves.length <= 1) return moves[0];

    const ordered = wwOrdered(S, moves, moves.length, -1, 0);
    let bestMove = ordered[0].move, previousScore = 0;
    const endgame = S.empties <= 12;
    const maxDepth = endgame ? Math.min(64, S.empties + 2) : 24;
    for (let depth = 1; depth <= maxDepth; depth++) {
      wwStopped = false;
      const result = wwRoot(S, moves, depth, bestMove);
      if (!result.complete) break;
      bestMove = result.move; previousScore = result.score;
      if (endgame && depth >= S.empties + 1) break;
    }
    return bestMove;
  },
};
