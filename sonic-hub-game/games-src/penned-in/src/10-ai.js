/* ── The computer player ──
   Three levels, each a clear step above the one before (node sim.js prints how they fare against each other):

   easy    looks one move ahead with a shaky eye, and now and then just writes somewhere. No plan for the endgame.
   medium  looks two moves ahead (its move, your answer) and counts territory properly.
   hard    searches as deep as its time allows (iterative deepening, alpha-beta, a transposition table), counts
           territory and how open it is, and plays out a walled-off endgame along the longest path it can find.

   On 11x11, each level playing X and O equally (node sim.js 15 11 100): medium beats easy 93 times in 100, hard beats
   medium 97 and easy 97. Between two players of the same level X wins about 6 games in 10.

   "Territory" is the count every level leans on: the empty squares a side can reach before the other one does.
   Once the two sides can no longer reach each other the game is a race to fill one's own room, and the side with
   more squares left wins (the side to move needs strictly more). */
const LEVELS = ['easy', 'medium', 'hard'];
const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const AI = (() => {
  const MATE = 1000000, SEP = 100000, MAXN = 169, MAXPLY = 48;
  const clock = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();

  let NB = null, NBC = null, N = 0;
  const occ = new Uint8Array(MAXN);
  const dA = new Int16Array(MAXN), dB = new Int16Array(MAXN), que = new Int16Array(MAXN), own = new Uint8Array(MAXN);
  const mvBuf = new Int16Array(MAXPLY * 8), scBuf = new Int32Array(MAXPLY * 8);

  /* transposition table: a position is the taken squares, the mover's last mark and the other side's last mark */
  const TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttLo = new Int32Array(TT_SIZE), ttHi = new Int32Array(TT_SIZE), ttVal = new Int32Array(TT_SIZE), ttInfo = new Int32Array(TT_SIZE);
  const zOccLo = new Int32Array(MAXN), zOccHi = new Int32Array(MAXN), zMLo = new Int32Array(MAXN), zMHi = new Int32Array(MAXN), zOLo = new Int32Array(MAXN), zOHi = new Int32Array(MAXN);
  (() => {
    let s = 0x9e3779b9;
    const next = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) | 0; };
    for (const z of [zOccLo, zOccHi, zMLo, zMHi, zOLo, zOHi]) for (let i = 0; i < MAXN; i++) z[i] = next();
  })();

  let nodes = 0, deadline = 0, timeUp = false, openness = 0;

  /** steps from one mark to every empty square it can still reach; returns how many it reaches */
  function bfs(src, dist) {
    dist.fill(-1, 0, N);
    let qh = 0, qt = 0;
    for (let i = src * 8, e = i + NBC[src]; i < e; i++) { const c = NB[i]; if (!occ[c]) { dist[c] = 1; que[qt++] = c; } }
    while (qh < qt) {
      const u = que[qh++], d = dist[u] + 1;
      for (let i = u * 8, e = i + NBC[u]; i < e; i++) { const c = NB[i]; if (!occ[c] && dist[c] < 0) { dist[c] = d; que[qt++] = c; } }
    }
    return qt;
  }

  /** The position as the mover (last mark a) sees it, in tenths of a square. */
  function evaluate(a, b) {
    const ra = bfs(a, dA), rb = bfs(b, dB);
    let va = 0, vb = 0, shared = false;
    for (let c = 0; c < N; c++) {
      if (occ[c]) { own[c] = 0; continue; }
      const x = dA[c], y = dB[c];
      if (x >= 0) {
        if (y >= 0) { shared = true; if (x <= y) { va++; own[c] = 1; } else { vb++; own[c] = 2; } }
        else { va++; own[c] = 1; }
      } else if (y >= 0) { vb++; own[c] = 2; } else own[c] = 0;
    }
    if (!shared) { const d = ra - rb; return (d > 0 ? SEP : -SEP) + d * 10; }
    let s = (va - vb) * 10;
    if (openness) {
      // territory that is open (squares with many neighbours of the same owner) is worth more than a thin strip
      let ea = 0, eb = 0;
      for (let c = 0; c < N; c++) {
        const o = own[c]; if (!o) continue;
        let cnt = 0;
        for (let i = c * 8, e = i + NBC[c]; i < e; i++) if (own[NB[i]] === o) cnt++;
        if (o === 1) ea += cnt; else eb += cnt;
      }
      s += (ea - eb) * openness;
    }
    return s;
  }

  function search(a, b, depth, alpha, beta, ply, hLo, hHi) {
    const off = ply * 8; let k = 0;
    for (let i = a * 8, e = i + NBC[a]; i < e; i++) { const c = NB[i]; if (!occ[c]) mvBuf[off + k++] = c; }
    if (k === 0) return -MATE + ply;
    if (depth <= 0 || ply >= MAXPLY - 1) return evaluate(a, b);
    if ((++nodes & 255) === 0 && clock() > deadline) { timeUp = true; return 0; }

    const kLo = hLo ^ zMLo[a] ^ zOLo[b], kHi = hHi ^ zMHi[a] ^ zOHi[b], slot = kLo & TT_MASK, alpha0 = alpha;
    let ttMove = -1;
    if (ttInfo[slot] !== 0 && ttLo[slot] === kLo && ttHi[slot] === kHi) {
      const info = ttInfo[slot], flag = (info >> 8) & 3;
      ttMove = (info >> 10) - 1;
      if ((info & 255) >= depth) {
        const v = ttVal[slot];
        if (flag === 1) return v;
        if (flag === 2) { if (v > alpha) alpha = v; } else if (v < beta) beta = v;
        if (alpha >= beta) return v;
      }
    }
    // the remembered best move first, then the squares that leave the most room around them
    for (let i = 0; i < k; i++) {
      const c = mvBuf[off + i]; let l = 0;
      if (c === ttMove) l = 99; else for (let j = c * 8, e = j + NBC[c]; j < e; j++) if (!occ[NB[j]]) l++;
      let j = i - 1;
      while (j >= 0 && scBuf[off + j] < l) { mvBuf[off + j + 1] = mvBuf[off + j]; scBuf[off + j + 1] = scBuf[off + j]; j--; }
      mvBuf[off + j + 1] = c; scBuf[off + j + 1] = l;
    }
    let best = -MATE * 2, bestMove = mvBuf[off];
    for (let i = 0; i < k; i++) {
      const c = mvBuf[off + i];
      occ[c] = 1;
      const v = -search(b, c, depth - 1, -beta, -alpha, ply + 1, hLo ^ zOccLo[c], hHi ^ zOccHi[c]);
      occ[c] = 0;
      if (timeUp) return 0;
      if (v > best) { best = v; bestMove = c; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    ttLo[slot] = kLo; ttHi[slot] = kHi; ttVal[slot] = best;
    ttInfo[slot] = depth | ((best <= alpha0 ? 3 : best >= beta ? 2 : 1) << 8) | ((bestMove + 1) << 10);
    return best;
  }

  /** Search to maxDepth, or as deep as timeMs allows; the answer is the best move of the last depth that finished. */
  function deepen(a, b, moves, timeMs, maxDepth, empties) {
    ttInfo.fill(0); nodes = 0; timeUp = false; deadline = clock() + timeMs;
    let hLo = 0, hHi = 0;
    for (let c = 0; c < N; c++) if (occ[c]) { hLo ^= zOccLo[c]; hHi ^= zOccHi[c]; }
    let best = moves[0], score = 0, reached = 0;
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -MATE * 2, cur = -1, curScore = -MATE * 2;
      const order = [best, ...moves.filter(m => m !== best)];
      for (const c of order) {
        occ[c] = 1;
        const v = -search(b, c, d - 1, -MATE * 2, -alpha, 1, hLo ^ zOccLo[c], hHi ^ zOccHi[c]);
        occ[c] = 0;
        if (timeUp) break;
        if (v > curScore) { curScore = v; cur = c; if (v > alpha) alpha = v; }
      }
      // a depth cut short still counts when something beat the move the last depth liked: that one was searched first
      if (timeUp) { if (cur !== -1 && cur !== best) { best = cur; score = curScore; } break; }
      best = cur; score = curScore; reached = d;
      if (score > MATE - 1000 || score < -MATE + 1000 || d >= empties) break;
    }
    return { move: best, score, depth: reached, nodes };
  }

  /* ── a walled-off endgame: the longest path through one's own room ── */
  const pathBuf = new Int16Array(MAXN * 8), scBufLp = new Int32Array(MAXN * 8), cur = new Int16Array(MAXN), bestPath = new Int16Array(MAXN);
  let lpBest = 0, lpCap = 0, lpBudget = 0, lpDeadline = 0;
  function longest(h, depth) {
    if (depth > lpBest) { lpBest = depth; bestPath.set(cur.subarray(0, depth)); }
    if (--lpBudget <= 0 || ((lpBudget & 127) === 0 && clock() > lpDeadline)) { lpBudget = 0; return; }
    const off = depth * 8; let k = 0;
    for (let i = h * 8, e = i + NBC[h]; i < e; i++) {
      const c = NB[i]; if (occ[c]) continue;
      let l = 0; for (let j = c * 8, f = j + NBC[c]; j < f; j++) if (!occ[NB[j]]) l++;
      let j = k - 1;   // the tightest squares first: they are the ones that get cut off if left for later
      while (j >= 0 && scBufLp[off + j] > l) { pathBuf[off + j + 1] = pathBuf[off + j]; scBufLp[off + j + 1] = scBufLp[off + j]; j--; }
      pathBuf[off + j + 1] = c; scBufLp[off + j + 1] = l; k++;
    }
    if (k === 0 || depth + bfs(h, dA) <= lpBest) return;
    for (let i = 0; i < k; i++) {
      const c = pathBuf[off + i];
      occ[c] = 1; cur[depth] = c;
      longest(c, depth + 1);
      occ[c] = 0;
      if (lpBest >= lpCap || lpBudget <= 0) return;
    }
  }

  /** each side's plan from its last walled-off turn: followed unless a new look finds something longer */
  const plans = [null, null];
  function fill(S, a, room, budget, timeMs) {
    const side = S.turn, plan = plans[side];
    let kept = null;
    if (plan && plan.n === S.n && plan.head === a && plan.path.length && plan.path.every(c => !occ[c])) kept = plan.path;
    let path = kept;
    if (!kept || kept.length < room) {   // a plan that already covers the whole room cannot be bettered; any other gets a shorter second look
      lpBest = 0; lpCap = room; lpBudget = budget; lpDeadline = clock() + (kept ? Math.min(timeMs, 120) : timeMs);
      longest(a, 0);
      if (!kept || lpBest > kept.length) path = Array.from(bestPath.subarray(0, lpBest));
    }
    plans[side] = path.length > 1 ? { n: S.n, head: path[0], path: path.slice(1) } : null;
    return path[0];
  }

  const libertiesAfter = c => { let l = 0; for (let j = c * 8, e = j + NBC[c]; j < e; j++) if (!occ[NB[j]]) l++; return l; };
  function shuffle(arr, rand) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

  /** The move for the side to play. opt: level, timeMs (hard's thinking time), maxDepth, rand. Returns { move, depth, score }. */
  function think(S, opt = {}) {
    const g = geo(S.n), rand = opt.rand || Math.random, level = opt.level || 'medium';
    NB = g.nb; NBC = g.nbc; N = g.N;
    let empties = 0;
    for (let c = 0; c < N; c++) { occ[c] = S.occ[c] ? 1 : 0; if (!occ[c]) empties++; }
    const a = S.head[S.turn], b = S.head[1 - S.turn];
    const moves = [];
    for (let i = a * 8, e = i + NBC[a]; i < e; i++) if (!occ[NB[i]]) moves.push(NB[i]);
    if (!moves.length) return { move: -1, depth: 0, score: -MATE };
    if (moves.length === 1) return { move: moves[0], depth: 0, score: 0 };
    shuffle(moves, rand);

    const room = bfs(a, dA); bfs(b, dB);
    let apart = true;
    for (let c = 0; c < N; c++) if (dA[c] >= 0 && dB[c] >= 0) { apart = false; break; }

    if (level === 'easy') {
      const safe = moves.filter(c => libertiesAfter(c) > 0);
      if (!safe.length) return { move: moves[0], depth: 0, score: 0 };
      if (apart) {   // fills its room by hugging the walls, without counting ahead
        let pick = safe[0], least = 99;
        for (const c of safe) { const l = libertiesAfter(c); if (l < least) { least = l; pick = c; } }
        return { move: pick, depth: 0, score: 0 };
      }
      if (rand() < 0.15) return { move: safe[0], depth: 0, score: 0 };
      openness = 0; timeUp = false; nodes = 0; deadline = Infinity;
      let pick = moves[0], top = -Infinity;
      for (const c of moves) {
        occ[c] = 1;
        let v = -search(b, c, 0, -MATE * 2, MATE * 2, 1, 0, 0);
        occ[c] = 0;
        if (v > -SEP / 2 && v < SEP / 2) v += (rand() * 2 - 1) * 60;
        if (v > top) { top = v; pick = c; }
      }
      return { move: pick, depth: 1, score: top };
    }

    if (apart) {
      const hard = level === 'hard';
      return { move: fill(S, a, room, hard ? 400000 : 3000, hard ? (opt.timeMs || 450) : 60), depth: 0, score: 0 };
    }
    plans[S.turn] = null;
    if (level === 'medium') { openness = 0; return deepen(a, b, moves, 5000, opt.maxDepth || 2, empties); }
    openness = 1;
    return deepen(a, b, moves, opt.timeMs || 450, opt.maxDepth || 40, empties);
  }

  return { think };
})();
