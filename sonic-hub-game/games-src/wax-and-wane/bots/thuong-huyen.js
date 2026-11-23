/* ── Thượng Huyền ──
   One bot, five levels: L1 the easiest, L5 the strongest. (Thượng Huyền is the waxing half-moon, the first quarter.)

   It searches the moves with alpha-beta, deeper at each level, and remembers the positions it has searched. A position
   is scored by a table of square values (corners are worth most, the squares beside a corner least), by how many moves
   each side has, and on the fuller levels by the discs on the edge of the empty squares and, late in the game, by the
   disc count. With few empty squares left it plays the game out to its end and so plays that part perfectly.

   Strength is set by how many positions a level may search, not by the clock: on a machine that finishes that within
   half of opt.timeMs, the same game gives the same move every time. opt.rand breaks ties and decides the odd random
   move. The clock is a safety net for a slow phone: a search stops at half of opt.timeMs and the move of the deepest
   search that finished is played. */

// The square values, the classic table: a1 first, row by row. Corners are worth most, the squares beside them least.
const SQUARE_VALUE = Int16Array.from([
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
   10,  -2, -1, -1, -1, -1,  -2,  10,
    5,  -2, -1, -1, -1, -1,  -2,   5,
    5,  -2, -1, -1, -1, -1,  -2,   5,
   10,  -2, -1, -1, -1, -1,  -2,  10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
]);

const DISC_SCORE = 1000;   // a finished game: each disc of margin counts this much, beyond any position score
const INF = 1e9;

// The levels. depth: how many moves ahead; eval: 'pos' square values only, 'mob' with mobility, 'full' with the edge
// and the disc count as well; nodes: how many positions it may search (its strength); noise: random spread among
// near-equal moves; blunder: the chance of a random move; solve: from this many empty squares, play the game out.
const LEVEL = {
  L1: { depth: 1, eval: 'pos',  noise: 2,   blunder: 0.3, nodes: 2000,  solve: 0 },
  L2: { depth: 2, eval: 'pos',  noise: 1,   blunder: 0,   nodes: 8000,  solve: 0 },
  L3: { depth: 3, eval: 'mob',  noise: 0,   blunder: 0,   nodes: 30000, solve: 0 },
  L4: { depth: 5, eval: 'full', noise: 0,   blunder: 0,   nodes: 80000, solve: 10 },
  L5: { depth: 8, eval: 'full', noise: 0,   blunder: 0,   nodes: 60000, solve: 14 },
};

// Scratch lists, one per ply of a search, so that a search never writes over a list it is still reading.
const MOVES_AT = Array.from({ length: 130 }, () => new Uint8Array(40));
const ORDER_AT = Array.from({ length: 130 }, () => new Int32Array(40));

/** How many moves the side has on board b. */
function movesOf(b, side) {
  let n = 0;
  for (let s = 0; s < 64; s++) if (!b[s] && encloses(b, s, side)) n++;
  return n;
}

/** The position as the Dark side sees it, then turned to the side to move: positive is good for the side to move. */
function evaluate(S, kind) {
  const b = S.b;
  let v = 0, frontier = 0;
  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if (!p) continue;
    v += p === 1 ? SQUARE_VALUE[s] : -SQUARE_VALUE[s];
    if (kind === 'full') {
      for (let d = 0; d < 8; d++) if (RUN[s * 8 + d] && !b[s + DIR[d]]) { frontier += p === 1 ? 1 : -1; break; }   // a disc beside an empty square
    }
  }
  if (kind !== 'pos') v += 8 * (movesOf(b, DARK) - movesOf(b, LIGHT));
  if (kind === 'full') {
    v -= 3 * frontier;
    if (S.empties < 24) v += (S.count[DARK] - S.count[LIGHT]) * Math.round((24 - S.empties) / 2);
  }
  return S.turn === DARK ? v : -v;
}

/** Sorts moves[0..n) and scores[0..n) together, best score first. Insertion sort: the lists are short. */
function sortBest(moves, scores, n) {
  for (let i = 1; i < n; i++) {
    const sc = scores[i], m = moves[i];
    let j = i - 1;
    while (j >= 0 && scores[j] < sc) { scores[j + 1] = scores[j]; moves[j + 1] = moves[j]; j--; }
    scores[j + 1] = sc; moves[j + 1] = m;
  }
}

const BOT = {
  name: 'Thượng Huyền',
  author: 'Claude',
  levels: ['L1', 'L2', 'L3', 'L4', 'L5'],
  think(S, opt) {
    const lv = LEVEL[opt.level] || LEVEL.L1, rand = opt.rand;
    const deadline = performance.now() + (opt.timeMs > 0 ? opt.timeMs : 1000) * 0.5;
    const stopped = () => performance.now() > deadline;

    const root = [];
    gen(S, root);
    if (root.length === 1) return root[0];
    if (lv.blunder && rand() < lv.blunder) return root[Math.floor(rand() * root.length)];

    // the moves in order of the square values: the answer if there is no time for anything else
    const squareOrder = root.slice().sort((x, y) => SQUARE_VALUE[y] - SQUARE_VALUE[x]);
    let nodes = 0, aborted = false, tt = new Map(), rootOrder = squareOrder;

    function search(S, depth, alpha, beta, ply) {
      if (++nodes > lv.nodes || ((nodes & 255) === 0 && stopped())) { aborted = true; return 0; }
      const moves = MOVES_AT[ply], n = gen(S, moves);
      if (!n) return (S.count[S.turn] - S.count[1 - S.turn]) * DISC_SCORE;   // the game is over
      if (n === 1 && moves[0] === PASS_MOVE) {                                // no move: the other side plays on
        make(S, PASS_MOVE);
        const v = -search(S, depth - 1, -beta, -alpha, ply + 1);
        unmake(S);
        return v;
      }
      if (depth <= 0) return evaluate(S, lv.eval);

      const lo = keyLo(S), hi = keyHi(S), known = tt.get(lo);
      let hint = -1;
      if (known !== undefined && known.hi === hi) {
        hint = known.m;
        if (known.d >= depth && ply > 0 && (known.f === 0 || (known.f === 1 && known.v >= beta) || (known.f === 2 && known.v <= alpha))) return known.v;
      }

      const scores = ORDER_AT[ply];
      for (let i = 0; i < n; i++) scores[i] = (moves[i] === hint ? 1e6 : 0) + SQUARE_VALUE[moves[i]] * 10;
      sortBest(moves, scores, n);

      const alpha0 = alpha;
      let best = -INF, bestMove = moves[0];
      for (let i = 0; i < n; i++) {
        const m = moves[i];
        make(S, m);
        const v = -search(S, depth - 1, -beta, -alpha, ply + 1);
        unmake(S);
        if (aborted) return 0;
        if (v > best) { best = v; bestMove = m; }
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      tt.set(lo, { hi, d: depth, v: best, f: best <= alpha0 ? 2 : best >= beta ? 1 : 0, m: bestMove });
      return best;
    }

    // The best move at this depth, or -1 if the search was cut short. Each move is searched in turn, so the random
    // spread (noise) can be added to the values before the best is chosen.
    function choose(depth) {
      let bestMove = -1, bestValue = -INF, alpha = -INF;
      for (const m of rootOrder) {
        make(S, m);
        let v = -search(S, depth - 1, -INF, lv.noise ? INF : -alpha, 1);
        unmake(S);
        if (aborted) return -1;
        if (lv.noise) v += lv.noise * rand();
        if (v > bestValue) { bestValue = v; bestMove = m; }
        if (bestValue > alpha) alpha = bestValue;
      }
      return bestMove;
    }

    // From a few empty squares, the game is played out to its end, so the move is the one that wins most discs.
    if (lv.solve && S.empties <= lv.solve) {
      nodes = 0; aborted = false; tt = new Map();
      const m = choose(99);
      if (!aborted && m >= 0) return m;
    }

    nodes = 0; aborted = false; tt = new Map();
    let best = -1;
    for (let depth = 1; depth <= lv.depth; depth++) {
      const m = choose(depth);
      if (m < 0) break;
      best = m;
      rootOrder = [m].concat(rootOrder.filter(x => x !== m));
      if (stopped()) break;
    }
    return best >= 0 ? best : squareOrder[0];
  },
};
