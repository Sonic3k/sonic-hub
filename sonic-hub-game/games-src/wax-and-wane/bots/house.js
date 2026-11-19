/* ── The house bot ──
   The computer player the game ships with, as a bot like any other (docs/BOT_BRIEF.md). Five levels, weakest
   first, named for the moon as it fills:

   new       plays on a whim. It likes a move that turns a lot over, sees nothing else, and half the time does not
             even look for that.
   crescent  looks at its own move only. It knows what a square is worth (a corner a great deal, the squares beside
             an empty corner less than nothing) and plays the best-looking one, with a shaky eye.
   quarter   looks at its move and your answer, and counts how many moves each side is left with as well as where
             the discs stand. It plays the last few moves of a game exactly.
   gibbous   four moves ahead with the full judgement below, every move, and the last eight squares exactly.
   full      searches as deep as its budget allows (iterative deepening, alpha-beta, a transposition table) and
             plays the last twelve squares or so exactly. Its budget is a count of positions, not a stretch of time,
             so it is as strong on a phone as on a laptop; the clock only stops it if the device is too slow to get
             there.

   What the full judgement counts: where the discs stand (PLACE), the corners and what hangs on them (a corner held,
   the discs that run along an edge from it and can never be turned again, a disc beside a corner that is still
   empty), how many moves each side has, and how many empty squares touch the other side's discs, since those are
   the squares that may yet become moves.

   Everything the rules file declares is in scope here. The file is the body of a function, so these names are its own. */
const WIN = 100000, MAXPLY = 72, W = 34;                    // W: room for the moves of one position (there are never more than 33)
const clock = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();

/* what a disc on each square is worth by standing there, corners and their neighbours apart (they are judged as they stand) */
const PLACE = new Int8Array([
  0, 0, 12, 6, 6, 12, 0, 0,
  0, 0, -3, -3, -3, -3, 0, 0,
  12, -3, 6, 2, 2, 6, -3, 12,
  6, -3, 2, 1, 1, 2, -3, 6,
  6, -3, 2, 1, 1, 2, -3, 6,
  12, -3, 6, 2, 2, 6, -3, 12,
  0, 0, -3, -3, -3, -3, 0, 0,
  0, 0, 12, 6, 6, 12, 0, 0]);
/* the order moves are tried in, the likeliest first: corners, edges, the middle, and last the squares beside a corner */
const ORDER = new Int8Array([
  90, 6, 40, 30, 30, 40, 6, 90,
  6, 0, 12, 14, 14, 12, 0, 6,
  40, 12, 26, 20, 20, 26, 12, 40,
  30, 14, 20, 0, 0, 20, 14, 30,
  30, 14, 20, 0, 0, 20, 14, 30,
  40, 12, 26, 20, 20, 26, 12, 40,
  6, 0, 12, 14, 14, 12, 0, 6,
  90, 6, 40, 30, 30, 40, 6, 90]);
/* each corner: its square, the square diagonal to it, and the two steps that lead away from it along its edges */
const CORNERS = [[0, 9, 1, 8], [7, 14, -1, 8], [56, 49, 1, -8], [63, 54, -1, -8]];
const CORNER = 95, HELD = 16, DIAGONAL = 46, BESIDE = 17, MOVES = 9, EDGE_OF_PLAY = 4;

const mvBuf = new Int8Array(MAXPLY * W), scBuf = new Int32Array(MAXPLY * W), hist = new Int32Array(128);
const TT_BITS = 17, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const ttLo = new Int32Array(TT_SIZE), ttHi = new Int32Array(TT_SIZE), ttVal = new Int32Array(TT_SIZE), ttInfo = new Int32Array(TT_SIZE);
let nodes = 0, deadline = 0, nodeCap = Infinity, timeUp = false, whole = true;

/** The position as the side to move sees it. whole: with the moves each side has and the squares at the edge of play. */
function evaluate(S) {
  const b = S.b, me = S.turn + 1, foe = 3 - me; let v = 0, mine = 0, theirs = 0, openMine = 0, openTheirs = 0;
  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if (p) { v += p === me ? PLACE[s] : -PLACE[s]; continue; }
    if (!whole) continue;
    // an empty square: who could put a disc on it (can), and whose discs it touches (touch); 1 is Dark, 2 Light, as discs are
    let can = 0, touch = 0;
    for (let d = 0; d < 8; d++) {
      const run = RUN[s * 8 + d]; if (!run) continue;
      const step = DIR[d]; let t = s + step; const first = b[t]; if (!first) continue;
      touch |= first;
      const mover = 3 - first; if (run < 2 || (can & mover)) continue;
      let k = 1; t += step;
      while (k < run && b[t] === first) { k++; t += step; }
      if (k < run && b[t] === mover) can |= mover;
    }
    if (can & me) mine++; if (can & foe) theirs++;
    if (touch & foe) openMine++; if (touch & me) openTheirs++;     // a square beside the other side's discs may yet be a move
  }
  for (let i = 0; i < 4; i++) {
    const c = CORNERS[i], at = c[0], p = b[at];
    if (!p) {                                                // an empty corner: whoever stands beside it has opened the way to it
      const x = b[c[1]], e1 = b[at + c[2]], e2 = b[at + c[3]];
      if (x) v += x === me ? -DIAGONAL : DIAGONAL;
      if (e1) v += e1 === me ? -BESIDE : BESIDE;
      if (e2) v += e2 === me ? -BESIDE : BESIDE;
    } else {                                                 // a corner held, and the discs that run from it along either edge: there for good
      const sign = p === me ? 1 : -1; let held = 0;
      for (let t = at + c[2], k = 0; k < 6 && b[t] === p; t += c[2], k++) held++;
      for (let t = at + c[3], k = 0; k < 6 && b[t] === p; t += c[3], k++) held++;
      v += sign * (CORNER + held * HELD);
    }
  }
  if (!whole) return v;
  v += (mine - theirs) * MOVES + (openMine - openTheirs) * EDGE_OF_PLAY;
  if (!mine && theirs) v -= 40; else if (!theirs && mine) v += 40;   // a side that has to pass
  if (S.empties < 18) v += (S.count[S.turn] - S.count[1 - S.turn]) * (18 - S.empties) >> 2;   // towards the end the count itself starts to matter
  return v;
}
/** A game that is over, as the side to move sees it: won, lost or drawn, and by how many discs. */
const ended = S => { const d = S.count[S.turn] - S.count[1 - S.turn]; return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0; };

function search(S, depth, alpha, beta, ply) {
  if ((++nodes & 1023) === 0 && (nodes > nodeCap || clock() > deadline)) { timeUp = true; return 0; }
  const off = ply * W, n = gen(S, mvBuf, off);
  if (!n) return ended(S);
  if (mvBuf[off] === PASS_MOVE) {                            // a pass is not a choice: it costs nothing of the look-ahead
    if (ply >= MAXPLY - 2) return evaluate(S);
    make(S, PASS_MOVE); const v = -search(S, depth, -beta, -alpha, ply + 1); unmake(S); return v;
  }
  if (depth <= 0 || ply >= MAXPLY - 2) return evaluate(S);

  const kLo = keyLo(S), kHi = keyHi(S), slot = kLo & TT_MASK, alpha0 = alpha;
  let ttMove = -1;
  if (ttInfo[slot] !== 0 && ttLo[slot] === kLo && ttHi[slot] === kHi) {
    const info = ttInfo[slot];
    ttMove = (info >> 10) - 1;
    if ((info & 255) >= depth) {
      const flag = (info >> 8) & 3, v = ttVal[slot];
      if (flag === 1) return v;
      if (flag === 2) { if (v > alpha) alpha = v; } else if (v < beta) beta = v;
      if (alpha >= beta) return v;
    }
  }
  const hOff = S.turn << 6;
  for (let i = 0; i < n; i++) { const m = mvBuf[off + i]; scBuf[off + i] = m === ttMove ? 1 << 30 : (ORDER[m] << 16) + hist[hOff + m]; }
  let best = -WIN * 2, bestMove = mvBuf[off];
  for (let i = 0; i < n; i++) {
    let bi = i;
    for (let j = i + 1; j < n; j++) if (scBuf[off + j] > scBuf[off + bi]) bi = j;
    const m = mvBuf[off + bi]; mvBuf[off + bi] = mvBuf[off + i]; mvBuf[off + i] = m; scBuf[off + bi] = scBuf[off + i];
    make(S, m);
    const v = -search(S, depth - 1, -beta, -alpha, ply + 1);
    unmake(S);
    if (timeUp) return 0;
    if (v > best) {
      best = v; bestMove = m;
      if (v > alpha) { alpha = v; if (alpha >= beta) { if (hist[hOff + m] < 60000) hist[hOff + m] += depth * depth; break; } }
    }
  }
  ttLo[slot] = kLo; ttHi[slot] = kHi; ttVal[slot] = best;
  ttInfo[slot] = Math.min(depth, 255) | ((best <= alpha0 ? 3 : best >= beta ? 2 : 1) << 8) | ((bestMove + 1) << 10);
  return best;
}

/** The rest of the game played out: how many discs the side to move ends ahead by, both sides playing their best. */
function solve(S, alpha, beta, ply) {
  if ((++nodes & 1023) === 0 && (nodes > nodeCap || clock() > deadline)) { timeUp = true; return 0; }
  const off = ply * W, n = gen(S, mvBuf, off);
  if (!n) return S.count[S.turn] - S.count[1 - S.turn];
  if (mvBuf[off] === PASS_MOVE) { make(S, PASS_MOVE); const v = -solve(S, -beta, -alpha, ply + 1); unmake(S); return v; }
  if (S.empties > 3) {                                       // first the move that leaves the other side least to do: the tree is smallest that way
    for (let i = 0; i < n; i++) {
      const m = mvBuf[off + i]; make(S, m);
      let left = 0; const b = S.b, side = S.turn;
      for (let s = 0; s < 64; s++) if (!b[s] && encloses(b, s, side)) left++;
      unmake(S);
      scBuf[off + i] = ORDER[m] - left * 24;
    }
  } else for (let i = 0; i < n; i++) scBuf[off + i] = ORDER[mvBuf[off + i]];
  let best = -99;
  for (let i = 0; i < n; i++) {
    let bi = i;
    for (let j = i + 1; j < n; j++) if (scBuf[off + j] > scBuf[off + bi]) bi = j;
    const m = mvBuf[off + bi]; mvBuf[off + bi] = mvBuf[off + i]; mvBuf[off + i] = m; scBuf[off + bi] = scBuf[off + i];
    make(S, m);
    const v = -solve(S, -beta, -alpha, ply + 1);
    unmake(S);
    if (timeUp) return 0;
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
  return best;
}

function shuffle(arr, rand) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

/** Looks maxDepth moves ahead, or as far as the budget allows. Returns the moves best first with their scores, from
 *  the last depth that was finished. Scores are exact down to `margin` below the best; under that they only say "worse". */
function deepen(S, moves, maxDepth, margin) {
  ttInfo.fill(0); hist.fill(0);
  let order = moves.slice(), scores = order.map(() => 0), reached = 0;
  for (let d = 1; d <= maxDepth; d++) {
    const sc = []; let best = -WIN * 2;
    for (let i = 0; i < order.length; i++) {
      make(S, order[i]);
      const floor = Math.max(-WIN * 2, best - margin - 1), v = -search(S, d - 1, -WIN * 2, -floor, 1);
      unmake(S);
      if (timeUp) break;
      sc.push(v); if (v > best) best = v;
    }
    if (timeUp) {
      // a depth cut short still counts when something beat the move the last depth liked: that one was looked at first
      let top = 0;
      for (let i = 1; i < sc.length; i++) if (sc[i] > sc[top]) top = i;
      if (top > 0) { const m = order[top]; order = [m, ...order.filter(x => x !== m)]; scores = order.map((_, i) => (i ? -WIN * 2 : sc[top])); }
      break;
    }
    const idx = order.map((_, i) => i).sort((a, b) => sc[b] - sc[a] || a - b);
    order = idx.map(i => order[i]); scores = idx.map(i => sc[i]); reached = d;
    if (best > WIN / 2 || best < -WIN / 2 || d >= S.empties) break;   // the end is in sight: looking further changes nothing
  }
  return { order, scores, depth: reached };
}
/** Plays every move out to the end of the game. Returns the moves best first with the discs each ends ahead by, or
 *  null if the budget ran out before all of them were done. */
function playOut(S, moves) {
  const sc = []; let best = -99;
  for (const m of moves) {
    make(S, m);
    const v = -solve(S, -64, Math.min(64, -best + 1), 1);    // moves as good as the best are wanted exactly, worse ones only as worse
    unmake(S);
    if (timeUp) return null;
    sc.push(v); if (v > best) best = v;
  }
  const idx = moves.map((_, i) => i).sort((a, b) => sc[b] - sc[a] || a - b);
  return { order: idx.map(i => moves[i]), scores: idx.map(i => sc[i]) };
}

/** How each level plays. depth: how far it looks. whole: whether it counts moves and the edge of play, or only where
 *  the discs stand. jitter: every move's score is off by up to that much. slack: any move within that much of the
 *  best will do. end: with that many empty squares or fewer it plays the game out. nodes, endNodes: how many
 *  positions the top level may look at in the middle of the game, and when playing it out. */
const STYLE = {
  new: { whim: 0.5 },
  crescent: { depth: 1, whole: false, jitter: 44, slack: 0, end: 0 },
  quarter: { depth: 2, whole: true, jitter: 7, slack: 0, end: 5 },
  gibbous: { depth: 4, whole: true, jitter: 0, slack: 2, end: 8 },
  full: { depth: 40, whole: true, jitter: 0, slack: 1, end: 12, nodes: 60000, endNodes: 260000 },
};

/** The move for the side to play, with what the search made of it: { move, score, depth, nodes }. */
function think(S, opt) {
  const rand = opt.rand, st = STYLE[opt.level], moves = legalMoves(S);
  if (moves.length === 1) return { move: moves[0], score: 0, depth: 0, nodes: 0 };
  shuffle(moves, rand);
  if (st.whim !== undefined) {                               // the new moon: any move, or the one that turns the most over
    if (rand() < st.whim) return { move: moves[0], score: 0, depth: 0, nodes: 0 };
    let best = moves[0], top = -1;
    for (const m of moves) { const k = countFlips(S, m); if (k > top) { top = k; best = m; } }
    return { move: best, score: top, depth: 1, nodes: 0 };
  }
  // the clock is a backstop: most of what is allowed, so the answer is back in time on a slow device
  nodes = 0; timeUp = false; whole = st.whole; deadline = clock() + Math.max(20, (opt.timeMs || 1000) * 0.82);
  if (S.empties <= st.end) {
    nodeCap = st.endNodes || Infinity;
    const r = playOut(S, moves);
    if (r) { let k = 1; while (k < r.order.length && r.scores[k] === r.scores[0]) k++; return { move: r.order[Math.floor(rand() * k)], score: r.scores[0], depth: S.empties, nodes, exact: true }; }
    nodes = 0; timeUp = false; deadline += Math.max(10, (opt.timeMs || 1000) * 0.1);   // not to be had in time: judge it as in the middle of the game, quickly
    nodeCap = Math.min(st.nodes || 20000, 20000);
  } else nodeCap = st.nodes ? (S.empties > 44 ? st.nodes * 0.6 : st.nodes) : Infinity;   // the first moves have the most squares to look over and the least to decide
  const r = deepen(S, moves, st.depth, st.jitter ? WIN * 4 : st.slack), best = r.scores[0], decided = best > WIN / 2 || best < -WIN / 2;
  let pick = 0;
  if (!decided && st.jitter) {
    let top = -Infinity;
    for (let i = 0; i < r.order.length; i++) { const v = r.scores[i] + (rand() * 2 - 1) * st.jitter; if (v > top) { top = v; pick = i; } }
  } else if (!decided && st.slack) {
    let k = 1; while (k < r.order.length && r.scores[k] >= best - st.slack) k++;
    pick = Math.floor(rand() * k);
  }
  return { move: r.order[pick], score: r.scores[pick], depth: r.depth, nodes };
}

const BOT = {
  name: 'House',
  author: 'Claude',
  levels: ['new', 'crescent', 'quarter', 'gibbous', 'full'],
  think,          // the host takes the move out of what this returns
  STYLE,          // open to the tests and to tuning
};
