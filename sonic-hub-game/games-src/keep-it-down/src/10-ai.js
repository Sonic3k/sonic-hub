/* ── The computer player ──
   Three levels, each a clear step above the one before (node sim.js prints how they fare against each other):

   easy    looks at its own move only, with a shaky eye: it takes what it can take and walks into what it did not
           see coming. One move in ten it just moves something.
   medium  looks three moves ahead (its move, your answer, its next) and plays out the exchanges after that.
   hard    searches as deep as its time allows (iterative deepening, alpha-beta, a transposition table), six or
           seven moves in half a second on a laptop, and plays the best it finds.

   What every level counts: the pieces (a Ram 100, a Gate 260, a Keep 1500), and how near each Ram stands to the
   squares around the other side's Gates and Keeps, which is where it has to get to do any damage.

   A Keep falls to any Ram that reaches it, from the front or from the side, with or without something behind it.
   The levels learn that from the rules themselves (gen in 00-core.js), in every line they look down. Two things on
   top of that were tried when the rule came in, medium against itself over 200 to 400 games a setting: counting a
   Ram right beside a Keep as a threat in its own right, and pulling Rams harder towards a side's last Keep. Neither
   won more games, so what is counted stayed as it is.

   Sixty games a pair, each playing Light and Dark equally (node sim.js 60 100): easy beats a player that moves at
   random 60–0; medium beats easy 60–0; hard, given a tenth of a second a move (in the game it gets half a second),
   beats easy 60–0 and medium 57–2 with 1 drawn. Neither colour has the better of it: medium against itself, Light
   won 27 games and Dark 33. */
const LEVELS = ['easy', 'medium', 'hard'];
const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const AI = (() => {
  const WIN = 1000000, MAXPLY = 96, W = 40;                   // W: room for the moves of one position
  const VAL = new Int32Array([0, 100, 260, 1500]);
  const NEAR = 4, REACH = 6;                                  // a Ram within REACH squares of its goal: NEAR for each square nearer
  const URGE = 50;                                            // taking now rather than later is worth  value × depth left / URGE
  let QUIESCE = 4;                                            // captures followed beyond the last full move (set by the level)
  const clock = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();

  const mvBuf = new Int32Array(MAXPLY * W), scBuf = new Int32Array(MAXPLY * W);
  const killer = new Int32Array(MAXPLY * 2), hist = new Int32Array(8192);
  const DIST = new Uint8Array(4096);
  for (let a = 0; a < 64; a++) for (let b = 0; b < 64; b++) DIST[a * 64 + b] = Math.abs((a >> 3) - (b >> 3)) + Math.abs((a & 7) - (b & 7));
  const goal = [new Int8Array(32), new Int8Array(32)], ramAt = [new Int8Array(16), new Int8Array(16)];

  const TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttLo = new Int32Array(TT_SIZE), ttHi = new Int32Array(TT_SIZE), ttVal = new Int32Array(TT_SIZE), ttInfo = new Int32Array(TT_SIZE);

  let nodes = 0, deadline = 0, timeUp = false;

  /** The position as the side to move sees it. */
  function evaluate(S) {
    const b = S.b; let sc = 0, g0 = 0, g1 = 0, r0 = 0, r1 = 0;
    for (let s = 0; s < 64; s++) {
      const p = b[s]; if (!p) continue;
      const k = p & 3, sd = p >> 2;
      sc += sd ? -VAL[k] : VAL[k];
      if (k === RAM) { if (sd) ramAt[1][r1++] = s; else ramAt[0][r0++] = s; continue; }
      for (let d = 0; d < 4; d++) {                           // the squares beside a Gate or a Keep
        const y = NB[s * 4 + d]; if (y < 0) continue;
        const q = b[y]; if (q && (q & 3) !== RAM && (q >> 2) === sd) continue;
        if (sd) goal[1][g1++] = y; else goal[0][g0++] = y;
      }
    }
    for (let i = 0; i < r0; i++) {
      const s = ramAt[0][i] * 64; let best = 99;
      for (let k = 0; k < g1; k++) { const d = DIST[s + goal[1][k]]; if (d < best) best = d; }
      if (best < REACH) sc += NEAR * (REACH - best);
    }
    for (let i = 0; i < r1; i++) {
      const s = ramAt[1][i] * 64; let best = 99;
      for (let k = 0; k < g0; k++) { const d = DIST[s + goal[0][k]]; if (d < best) best = d; }
      if (best < REACH) sc -= NEAR * (REACH - best);
    }
    return S.turn === LIGHT ? sc : -sc;
  }

  /** Does this move take something? */
  function takes(S, m) {
    const kind = m >> 12;
    if (kind === STRIKE) return true;
    const to = (m >> 6) & 63;
    if (kind === SWING) return S.b[to] !== 0;
    if (kind !== PUSH) return false;
    if ((S.b[to] & 3) !== RAM) return true;
    const beyond = NB[to * 4 + dirOf(m & 63, to)];
    return beyond < 0 || S.b[beyond] !== 0;
  }
  /** After a move: is the game drawn on the spot? */
  const drawn = (S, m, before) => (!S.rams[0] && !S.rams[1]) || S.quiet >= QUIET_LIMIT || (m === PASS_MOVE && before === PASS_MOVE);

  /* At the end of the look-ahead, play out the captures that are still on, so that something taken on the last move
     is not counted without the answer to it (a Keep striking back, a Gate stepping onto a Ram, a crush). */
  function quiesce(S, alpha, beta, ply, left) {
    nodes++;
    const stand = evaluate(S);
    if (left <= 0 || stand >= beta || ply >= MAXPLY - 1) return stand;
    if (stand > alpha) alpha = stand;
    const off = ply * W, n = gen(S, mvBuf, off);
    let best = stand;
    for (let i = 0; i < n; i++) {
      const m = mvBuf[off + i];
      if (!takes(S, m)) continue;
      const cap = make(S, m);
      const v = !S.keeps[S.turn] ? WIN - ply : (!S.rams[0] && !S.rams[1]) ? 0 : -quiesce(S, -beta, -alpha, ply + 1, left - 1);
      unmake(S);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    return best;
  }

  function search(S, depth, alpha, beta, ply) {
    if (depth <= 0) return quiesce(S, alpha, beta, ply, QUIESCE);
    if ((++nodes & 1023) === 0 && clock() > deadline) { timeUp = true; return 0; }
    if (ply >= MAXPLY - 1) return evaluate(S);

    // near the no-capture limit the same position is worth different things at different counts: no memory there
    const remember = S.quiet + depth + QUIESCE < QUIET_LIMIT;
    const kLo = keyLo(S), kHi = keyHi(S), slot = kLo & TT_MASK, alpha0 = alpha;
    let ttMove = -1;
    if (ttInfo[slot] !== 0 && ttLo[slot] === kLo && ttHi[slot] === kHi) {
      const info = ttInfo[slot];
      ttMove = (info >> 10) - 1;
      if (remember && (info & 255) >= depth) {
        const flag = (info >> 8) & 3; let v = ttVal[slot];
        if (v > WIN / 2) v -= ply; else if (v < -WIN / 2) v += ply;
        if (flag === 1) return v;
        if (flag === 2) { if (v > alpha) alpha = v; } else if (v < beta) beta = v;
        if (alpha >= beta) return v;
      }
    }

    const off = ply * W, n = gen(S, mvBuf, off), before = lastMove(S), k0 = killer[ply * 2], k1 = killer[ply * 2 + 1], hOff = S.turn << 12;
    for (let i = 0; i < n; i++) {                             // the remembered move, what takes most, shoves, then what has worked before
      const m = mvBuf[off + i]; let v;
      if (m === ttMove) v = 1 << 30;
      else if (takes(S, m)) v = (1 << 28) + VAL[S.b[(m >> 6) & 63] & 3] * 1000;
      else if (m === k0) v = (1 << 27) + 1; else if (m === k1) v = 1 << 27;
      else v = hist[hOff + (m & 4095)] + ((m >> 12) === PUSH ? 1 << 20 : 0);
      scBuf[off + i] = v;
    }
    let best = -WIN * 2, bestMove = mvBuf[off];
    for (let i = 0; i < n; i++) {
      let bi = i;
      for (let j = i + 1; j < n; j++) if (scBuf[off + j] > scBuf[off + bi]) bi = j;
      const m = mvBuf[off + bi]; mvBuf[off + bi] = mvBuf[off + i]; mvBuf[off + i] = m; scBuf[off + bi] = scBuf[off + i];

      const cap = make(S, m); let v;
      if (!S.keeps[S.turn]) v = WIN - ply;
      else if (drawn(S, m, before)) v = 0;
      else {
        const urge = cap ? (VAL[cap & 3] * depth / URGE) | 0 : 0;
        v = urge - search(S, depth - 1, -beta + urge, -alpha + urge, ply + 1);
      }
      unmake(S);
      if (timeUp) return 0;
      if (v > best) {
        best = v; bestMove = m;
        if (v > alpha) {
          alpha = v;
          if (alpha >= beta) {
            if (!cap && m !== PASS_MOVE) {
              if (m !== k0) { killer[ply * 2 + 1] = k0; killer[ply * 2] = m; }
              if (hist[hOff + (m & 4095)] < 1 << 19) hist[hOff + (m & 4095)] += depth * depth;
            }
            break;
          }
        }
      }
    }
    if (remember) {
      ttLo[slot] = kLo; ttHi[slot] = kHi;
      ttVal[slot] = best > WIN / 2 ? best + ply : best < -WIN / 2 ? best - ply : best;
      ttInfo[slot] = Math.min(depth, 255) | ((best <= alpha0 ? 3 : best >= beta ? 2 : 1) << 8) | ((bestMove + 1) << 10);
    } else if (ttInfo[slot] === 0) { ttLo[slot] = kLo; ttHi[slot] = kHi; ttVal[slot] = 0; ttInfo[slot] = (bestMove + 1) << 10; }
    return best;
  }

  function shuffle(arr, rand) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

  /** Looks maxDepth moves ahead, or as far as timeMs allows. Returns the moves best first with their scores, from the
   *  last depth that was finished. Scores are exact down to `margin` below the best; under that they only say "worse". */
  function deepen(S, moves, maxDepth, timeMs, margin) {
    ttInfo.fill(0); killer.fill(0); hist.fill(0); nodes = 0; timeUp = false; deadline = clock() + timeMs;
    const before = lastMove(S);
    let order = moves.slice(), scores = order.map(() => 0), reached = 0;
    for (let d = 1; d <= maxDepth; d++) {
      const sc = []; let best = -WIN * 2;
      for (let i = 0; i < order.length; i++) {
        const m = order[i], cap = make(S, m); let v;
        if (!S.keeps[S.turn]) v = WIN - 1;
        else if (drawn(S, m, before)) v = 0;
        else {
          const urge = cap ? (VAL[cap & 3] * d / URGE) | 0 : 0, floor = Math.max(-WIN * 2, best - margin - 1);
          v = urge - search(S, d - 1, -WIN * 2, -floor + urge, 1);
        }
        unmake(S);
        if (timeUp) break;
        sc.push(v); if (v > best) best = v;
      }
      if (timeUp) {
        // a depth cut short still counts when something beat the move the last depth liked: that one was looked at first
        let top = 0;
        for (let i = 1; i < sc.length; i++) if (sc[i] > sc[top]) top = i;
        if (top > 0) { const m = order[top]; order = [m, ...order.filter(x => x !== m)]; scores = order.map((_, i) => i ? -WIN * 2 : sc[top]); }
        break;
      }
      const idx = order.map((_, i) => i).sort((a, b) => sc[b] - sc[a] || a - b);
      order = idx.map(i => order[i]); scores = idx.map(i => sc[i]); reached = d;
      if (best > WIN / 2 || best < -WIN / 2) break;           // the end is in sight: looking further changes nothing
    }
    return { order, scores, depth: reached, nodes };
  }

  /** How each level plays: how far it looks, how much time it may take, how unsteady its judgement is (jitter: every
   *  move's score is off by up to that much; slack: any move within that much of the best will do), and how often it
   *  just moves something. */
  const STYLE = {
    easy: { depth: 1, follow: 0, ms: 2000, jitter: 30, slack: 0, wild: 0.1 },
    medium: { depth: 3, follow: 4, ms: 4000, jitter: 0, slack: 3, wild: 0 },
    hard: { depth: 40, follow: 4, ms: 450, jitter: 0, slack: 3, wild: 0 },
  };

  /** The move for the side to play. opt: level, timeMs (hard's thinking time), maxDepth, rand. Returns { move, score, depth, nodes }. */
  function think(S, opt = {}) {
    const rand = opt.rand || Math.random, st = STYLE[opt.level] || STYLE.medium;
    const moves = legalMoves(S);
    if (!moves.length) return { move: -1, score: 0, depth: 0, nodes: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0, depth: 0, nodes: 0 };
    shuffle(moves, rand);
    const sure = moves.find(m => { make(S, m); const won = !S.keeps[S.turn]; unmake(S); return won; });
    if (sure !== undefined) return { move: sure, score: WIN, depth: 1, nodes: 0 };
    if (st.wild && rand() < st.wild) return { move: moves[0], score: 0, depth: 0, nodes: 0 };

    QUIESCE = st.follow;
    const maxDepth = opt.maxDepth || st.depth, timeMs = opt.level === 'hard' ? (opt.timeMs || st.ms) : st.ms;
    const r = deepen(S, moves, maxDepth, timeMs, st.jitter ? WIN * 4 : st.slack);
    const best = r.scores[0], decided = best > WIN / 2 || best < -WIN / 2;
    let pick = 0;
    if (!decided && st.jitter) {
      let top = -Infinity;
      for (let i = 0; i < r.order.length; i++) { const v = r.scores[i] + (rand() * 2 - 1) * st.jitter; if (v > top) { top = v; pick = i; } }
    } else if (!decided && st.slack) {
      let k = 1; while (k < r.order.length && r.scores[k] >= best - st.slack) k++;
      pick = Math.floor(rand() * k);
    }
    return { move: r.order[pick], score: r.scores[pick], depth: r.depth, nodes: r.nodes };
  }

  return { think, evaluate, STYLE };
})();
