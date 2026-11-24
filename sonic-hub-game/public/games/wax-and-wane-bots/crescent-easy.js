/* ── Crescent Easy: a computer player for Wax & Wane ──
   One level, `easy`.
   One of a family of five (Crescent Easy, Medium, Hard, Expert, Master) below Eclipse, the strongest. They are not
   Eclipse made to blunder: each is an earlier version of it, kept as it was, that sees less far or judges less well.

   What it is
     The first version of the bot. It looks one move ahead and no further: each move is worth its square (corners
     and edges are good, the squares next to an empty corner are a gift to the other side), less what the other
     side could then do. Among moves it finds as good as each other it takes any.

   How strong
     It beats the kit's `greedy`, which plays for the most discs at once, in most games. What beats it is anything
     that has to be seen coming: it does not ask what the answer to its move will be.

   What it keeps to
     One file, plain JavaScript, nothing but the kit's own functions and performance.now().
     It answers at once.
     Whatever happens inside, what it returns is one of the moves allowed. */
const BOT = (() => {
  // ── The board the bot keeps for itself ───────────────────────────────────────────────────────────────────────────
  // A hundred cells: the sixty-four squares with a border one cell wide all round them. A line followed off the board
  // ends in a border cell, which is neither side's disc, so no step has to ask where the edge is. A cell holds
  // 0 (empty), 1 (a Dark disc), 2 (a Light disc) or 3 (border). The rules' own square s is cell 11 + 10 × row + file.
  const bd = new Uint8Array(100).fill(3);
  const TO_P = new Uint8Array(64), TO_S = new Int8Array(100).fill(-1);
  for (let s = 0; s < 64; s++) { const p = 11 + (s >> 3) * 10 + (s & 7); TO_P[s] = p; TO_S[p] = s; }
  const discs = new Int32Array(3);                 // discs[1]: Dark's on the board, discs[2]: Light's
  let nEmpty = 0, parity = 0;

  // The empty squares, in a list that is always in the same order: the kinds of square that are most often good to
  // play first (corners, then the squares two from a corner…), the squares next to a corner last. Trying moves in
  // this order is already half of trying the best first.
  const ORDER = Uint8Array.from(('a1 h1 a8 h8 c1 f1 a3 h3 a6 h6 c8 f8 c3 f3 c6 f6 d1 e1 a4 h4 a5 h5 d8 e8 d3 e3 c4 f4 c5 f5 d6 e6 ' +
    'd2 e2 b4 g4 b5 g5 d7 e7 c2 f2 b3 g3 b6 g6 c7 f7 b1 g1 a2 h2 a7 h7 b8 g8 b2 g2 b7 g7 d4 e4 d5 e5').split(' ').map(n => TO_P[sqOf(n)]));
  const eNext = new Uint8Array(100), ePrev = new Uint8Array(100);      // cell 0 is the head of the list, and its end
  // The board in four quarters. Who gets the last move in a quarter matters at the end of a game, so the bot keeps
  // which quarters have an odd number of empty squares: one bit each.
  const QUAD = new Uint8Array(100);
  for (let s = 0; s < 64; s++) QUAD[TO_P[s]] = (s >> 3) < 4 ? ((s & 7) < 4 ? 1 : 2) : ((s & 7) < 4 ? 4 : 8);

  // discs turned over by the moves played so far in the search, so that each move can be taken back
  const stk = new Uint8Array(8192);
  let sp = 0;

  /** Takes a position in: b is the rules' S.b. */
  function load(b) {
    discs[1] = discs[2] = 0; nEmpty = 0; parity = 0; sp = 0;
    for (let s = 0; s < 64; s++) { const v = b[s]; bd[TO_P[s]] = v; if (v) discs[v]++; }
    let last = 0;
    for (let i = 0; i < 64; i++) {
      const p = ORDER[i];
      if (bd[p]) continue;
      eNext[last] = p; ePrev[p] = last; last = p; nEmpty++; parity ^= QUAD[p];
    }
    eNext[last] = 0; ePrev[0] = last;
  }

  /** Turns over what a disc of `me` on the empty cell p encloses, and remembers the cells. Returns how many: 0 means
   *  p is not a move, and nothing has been touched. The disc itself is not put down here. */
  function flips(p, me, opp) {
    let n = sp, t;
    t = p - 11; if (bd[t] === opp) { do t -= 11; while (bd[t] === opp); if (bd[t] === me) for (t += 11; t !== p; t += 11) { bd[t] = me; stk[n++] = t; } }
    t = p - 10; if (bd[t] === opp) { do t -= 10; while (bd[t] === opp); if (bd[t] === me) for (t += 10; t !== p; t += 10) { bd[t] = me; stk[n++] = t; } }
    t = p - 9; if (bd[t] === opp) { do t -= 9; while (bd[t] === opp); if (bd[t] === me) for (t += 9; t !== p; t += 9) { bd[t] = me; stk[n++] = t; } }
    t = p - 1; if (bd[t] === opp) { do t -= 1; while (bd[t] === opp); if (bd[t] === me) for (t += 1; t !== p; t += 1) { bd[t] = me; stk[n++] = t; } }
    t = p + 1; if (bd[t] === opp) { do t += 1; while (bd[t] === opp); if (bd[t] === me) for (t -= 1; t !== p; t -= 1) { bd[t] = me; stk[n++] = t; } }
    t = p + 9; if (bd[t] === opp) { do t += 9; while (bd[t] === opp); if (bd[t] === me) for (t -= 9; t !== p; t -= 9) { bd[t] = me; stk[n++] = t; } }
    t = p + 10; if (bd[t] === opp) { do t += 10; while (bd[t] === opp); if (bd[t] === me) for (t -= 10; t !== p; t -= 10) { bd[t] = me; stk[n++] = t; } }
    t = p + 11; if (bd[t] === opp) { do t += 11; while (bd[t] === opp); if (bd[t] === me) for (t -= 11; t !== p; t -= 11) { bd[t] = me; stk[n++] = t; } }
    const k = n - sp; sp = n;
    return k;
  }
  /** How many discs a disc of `me` on the empty cell p would turn over. Nothing is changed. */
  function countOf(p, me, opp) {
    let n = 0, t, c;
    t = p - 11; if (bd[t] === opp) { c = 0; do { t -= 11; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p - 10; if (bd[t] === opp) { c = 0; do { t -= 10; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p - 9; if (bd[t] === opp) { c = 0; do { t -= 9; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p - 1; if (bd[t] === opp) { c = 0; do { t -= 1; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p + 1; if (bd[t] === opp) { c = 0; do { t += 1; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p + 9; if (bd[t] === opp) { c = 0; do { t += 9; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p + 10; if (bd[t] === opp) { c = 0; do { t += 10; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    t = p + 11; if (bd[t] === opp) { c = 0; do { t += 11; c++; } while (bd[t] === opp); if (bd[t] === me) n += c; }
    return n;
  }
  /** Is the empty cell p a move for `me`? */
  function isMove(p, me, opp) {
    let t;
    t = p - 11; if (bd[t] === opp) { do t -= 11; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p - 10; if (bd[t] === opp) { do t -= 10; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p - 9; if (bd[t] === opp) { do t -= 9; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p - 1; if (bd[t] === opp) { do t -= 1; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p + 1; if (bd[t] === opp) { do t += 1; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p + 9; if (bd[t] === opp) { do t += 9; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p + 10; if (bd[t] === opp) { do t += 10; while (bd[t] === opp); if (bd[t] === me) return true; }
    t = p + 11; if (bd[t] === opp) { do t += 11; while (bd[t] === opp); if (bd[t] === me) return true; }
    return false;
  }
  /** How many moves `me` has. */
  function mobility(me, opp) {
    let n = 0;
    for (let p = eNext[0]; p; p = eNext[p]) if (isMove(p, me, opp)) n++;
    return n;
  }
  /** After flips(p, me, opp) gave k: the disc goes down. */
  function put(p, me, k) {
    bd[p] = me; discs[me] += k + 1; discs[3 - me] -= k; nEmpty--; parity ^= QUAD[p];
    const a = ePrev[p], z = eNext[p]; eNext[a] = z; ePrev[z] = a;
  }
  /** Takes back a move of `me` on p that turned over k discs. */
  function take(p, me, k) {
    const opp = 3 - me;
    for (let i = 0; i < k; i++) bd[stk[--sp]] = opp;
    bd[p] = 0; discs[me] -= k + 1; discs[opp] += k; nEmpty++; parity ^= QUAD[p];
    eNext[ePrev[p]] = p; ePrev[eNext[p]] = p;
  }

  // ── The end of the game, played out in full ──────────────────────────────────────────────────────────────────────
  // With few squares left every line of play can be followed to the last disc: no judgement is needed, only counting.
  // What comes back is the final count as the side to move sees it (its discs less the other side's), exact when it
  // lies between alpha and beta and a bound on the right side otherwise.
  let nodes = 0, stop = false, deadline = 0, nodeCap = 0, nextCheck = 0;
  /** Looked at now and then: is the time up (or, for a level that counts positions, the count)? */
  function check() {
    nextCheck = nodes + (nodeCap && nodeCap < 16384 ? (nodeCap >> 3) + 1 : 2048);   // a small count is watched closely
    if ((nodeCap && nodes >= nodeCap) || performance.now() >= deadline) stop = true;
  }
  /** One square left, `me` to move. */
  function solve1(p, me, opp) {
    nodes++;
    const d = discs[me] - discs[opp];
    let k = countOf(p, me, opp);
    if (k) return d + 2 * k + 1;
    k = countOf(p, opp, me);
    return k ? d - 2 * k - 1 : d;
  }
  /** A few squares left: moves in quarters with an odd number of empty squares first (there the mover gets the last
   *  word), otherwise in the fixed order. */
  /** Two squares left, a and b, `me` to move. */
  function solve2(a, b, me, opp, alpha, beta, passed) {
    nodes++;
    let best = -99, k = flips(a, me, opp);
    if (k) {
      bd[a] = me; discs[me] += k + 1; discs[opp] -= k;
      best = -solve1(b, opp, me);
      bd[a] = 0; discs[me] -= k + 1; discs[opp] += k;
      for (; k; k--) bd[stk[--sp]] = opp;
      if (best >= beta) return best;
    }
    k = flips(b, me, opp);
    if (k) {
      bd[b] = me; discs[me] += k + 1; discs[opp] -= k;
      const v = -solve1(a, opp, me);
      bd[b] = 0; discs[me] -= k + 1; discs[opp] += k;
      for (; k; k--) bd[stk[--sp]] = opp;
      if (v > best) best = v;
    }
    if (best !== -99) return best;
    if (passed) return discs[me] - discs[opp];
    return -solve2(a, b, opp, me, -beta, -alpha, true);
  }
  function solveLow(me, opp, alpha, beta, passed) {
    if (nEmpty === 2) return solve2(eNext[0], eNext[eNext[0]], me, opp, alpha, beta, passed);
    if (nEmpty === 1) return solve1(eNext[0], me, opp);
    nodes++;
    let best = -99;
    for (let turn = (parity === 0 || parity === 15) ? 1 : 0; turn < 2; turn++) {
      for (let p = eNext[0]; p; p = eNext[p]) {
        if (turn === 0 ? !(parity & QUAD[p]) : (parity & QUAD[p]) && parity !== 15 && parity !== 0) continue;
        const k = flips(p, me, opp);
        if (!k) continue;
        put(p, me, k);
        const v = -solveLow(opp, me, -beta, -alpha, false);
        take(p, me, k);
        if (v > best) { best = v; if (v > alpha) { if (v >= beta) return v; alpha = v; } }
      }
    }
    if (best === -99) {
      if (passed) return discs[me] - discs[opp];
      return -solveLow(opp, me, -beta, -alpha, true);
    }
    return best;
  }
  const FF_FROM = 7;                               // from this many empty squares on, the move that leaves the other side fewest moves is tried first
  const sMove = new Uint8Array(64 * 34), sKey = new Int32Array(64 * 34);
  const CORNER = new Uint8Array(100); for (const n of ['a1', 'h1', 'a8', 'h8']) CORNER[TO_P[sqOf(n)]] = 1;
  /** More squares left: every move is tried out first for how many moves it leaves the other side, and the one that
   *  leaves fewest goes first (a side with few moves is soon forced, and a forced line is quickly settled). */
  function solve(me, opp, alpha, beta, passed) {
    if (nEmpty < FF_FROM) return solveLow(me, opp, alpha, beta, passed);
    nodes++;
    if (nodes >= nextCheck) check();
    if (stop) return 0;
    const off = nEmpty * 34;
    let n = 0;
    for (let p = eNext[0]; p; p = eNext[p]) {
      const k = flips(p, me, opp);
      if (!k) continue;
      put(p, me, k);
      let key = mobility(opp, me) * 4;
      if (CORNER[p]) key -= 6;
      if (!(parity & QUAD[p])) key -= 1;                  // after the move this quarter is even: the mover had the odd one
      take(p, me, k);
      let i = off + n++;
      for (; i > off && sKey[i - 1] > key; i--) { sKey[i] = sKey[i - 1]; sMove[i] = sMove[i - 1]; }
      sKey[i] = key; sMove[i] = p;
    }
    if (!n) {
      if (passed) return discs[me] - discs[opp];
      return -solve(opp, me, -beta, -alpha, true);
    }
    let best = -99;
    for (let i = off; i < off + n; i++) {
      const p = sMove[i], k = flips(p, me, opp);
      put(p, me, k);
      const v = -solve(opp, me, -beta, -alpha, false);
      take(p, me, k);
      if (stop) return 0;
      if (v > best) { best = v; if (v > alpha) { if (v >= beta) return v; alpha = v; } }
    }
    return best;
  }

  // ── The move: what looks best right now, one move ahead ──────────────────────────────────────────────────────────
  // Two things a player learns first: some squares are worth having (corners, edges) and some are a gift to the other
  // side (the squares next to an empty corner); and a move that leaves the other side little choice is a good one.
  // Each move is worth its square, less what the other side can then do. Nothing is looked further ahead.
  const SQ_WORTH = new Int8Array(100);
  {
    const rows = [[30, -8, 6, 3], [-8, -14, -1, -1], [6, -1, 1, 0], [3, -1, 0, 0]];
    for (let s = 0; s < 64; s++) { const r = s >> 3, f = s & 7; SQ_WORTH[TO_P[s]] = rows[r < 4 ? r : 7 - r][f < 4 ? f : 7 - f]; }
  }
  const CORNER_OF = new Uint8Array(100);            // for the squares next to a corner: that corner
  for (const [c, near] of [['a1', 'b1 a2 b2'], ['h1', 'g1 h2 g2'], ['a8', 'b8 a7 b7'], ['h8', 'g8 h7 g7']]) for (const n of near.split(' ')) CORNER_OF[TO_P[sqOf(n)]] = TO_P[sqOf(c)];
  const MOBILITY = 2;                              // what one move fewer for the other side is worth
  function think(S, opt) {
    load(S.b);
    const me = S.turn + 1, opp = 3 - me;
    let best = -1, top = -1e9;
    for (let p = eNext[0]; p; p = eNext[p]) {
      const k = flips(p, me, opp);
      if (!k) continue;
      put(p, me, k);
      let worth = SQ_WORTH[p] - MOBILITY * mobility(opp, me) + opt.rand();     // among equals, any
      if (SQ_WORTH[p] < 0 && bd[CORNER_OF[p]] === me) worth -= SQ_WORTH[p];      // next to a corner of one's own: no gift
      take(p, me, k);
      if (worth > top) { top = worth; best = p; }
    }
    return TO_S[best];
  }
  /** The move to play. Whatever happens inside, what comes back is one of the moves allowed. */
  function safeThink(S, opt) {
    const legal = legalMoves(S);
    if (legal.length < 2) return legal[0];
    let m;
    try { m = think(S, opt || {}); } catch (e) { m = legal[0]; }
    return legal.includes(m) ? m : legal[0];
  }
  const BOT = { name: 'Crescent Easy', author: 'Claude', levels: ['easy'], think: safeThink };
  
  return BOT;
})();
