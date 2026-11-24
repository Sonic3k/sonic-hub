/* ── The house bot ──
   The computer player the game ships with, as a bot like any other (docs/BOT_BRIEF.md). Five levels, weakest first:

   easy    takes every square it is handed, and otherwise draws more or less anywhere: it gives squares away
           without noticing.
   casual  takes every square it can, draws only safe lines while there are any, and when there are none it hands
           over as few squares as it can. It never leaves a square on purpose.
   steady  the same while safe lines are left. Once they are gone it plays the end exactly: it knows which chain to
           open first, and when to take all but two of a chain and leave the last two, so that the other side has to
           open the next one.
   sharp   steady's end, and before it, once few safe lines are left, it reckons whose turn it will be when they run
           out, and draws so that it will not be its own.
   master  reckons that from the first line: it searches ahead (alpha-beta, with a table of positions already
           searched) and judges each position by playing the safe lines out and counting the end exactly. It will
           give a square or two away early to come out right at the end.

   The end, once no safe line is left, is a set of chains (rows of squares that fall one after another) and loops.
   Whoever has to open one hands it over; whoever is handed a long one can take all of it and open the next, or take
   all but two and hand those two back, so that the other side has to open again. valueOf() counts that exactly
   for any set of chains and loops.

   Its budget is a count of positions, not a stretch of time, so it is as strong on a phone as on a laptop; the clock
   only stops it if the device is too slow to get there. It plays both boards the same way: its search is deeper on
   the 5 × 5 board, where there is less to look at.

   Everything the rules file declares is in scope here. The file is the body of a function, so these names are its own. */
const MAXL = 112, MAXS = 49, MAXPLY = 64;
const clock = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
const LEVEL = {
  steady: { budget: 30000, depth: 6, rollouts: 0, sacrifices: false, from: 0 },          // from: search once this few safe lines are left (0: only at the end)
  sharp: { budget: 60000, depth: 24, rollouts: 1, sacrifices: false, from: 12 },
  master: { budget: 150000, depth: 60, rollouts: 2, sacrifices: true, from: Infinity },
};
/* the orders the safe lines are played out in, to judge a position: steps through the lines, prime to how many there are */
const STRIDE = { 5: [7, 13, 11], 7: [9, 5, 13] };

/* ── small things about squares and lines ── */
/** the side of square s not yet drawn, other than `not` */
function openSide(S, s, not) { const SL = S.g.sqLine; for (let i = 4 * s; i < 4 * s + 4; i++) { const m = SL[i]; if (!S.line[m] && m !== not) return m; } return -1; }
/** the square across line m from square s, or −1 for the edge of the board */
function across(S, m, s) { const LS = S.g.lineSq; return LS[2 * m] === s ? LS[2 * m + 1] : LS[2 * m]; }
/** How many squares the other side could take one after another, if line m were drawn now and took nothing. */
function gift(S, m) {
  make(S, m);
  let given = 0, made = 0;
  for (let more = true; more;) {
    more = false;
    for (let s = 0; s < S.sides.length; s++) if (S.sides[s] === 3) { given += make(S, openSide(S, s, -1)); made++; more = true; break; }
  }
  while (made--) unmake(S);
  unmake(S);
  return given;
}
/** A square that can be taken without opening anything (its fourth side leads off the board, to a square that will
 *  not have three sides after it, or to another square it takes as well): the line that takes it, or −1. */
function freeTake(S) {
  for (let s = 0; s < S.sides.length; s++) {
    if (S.sides[s] !== 3) continue;
    const m = openSide(S, s, -1), o = across(S, m, s);
    if (o < 0 || S.sides[o] !== 2) return m;
  }
  return -1;
}
const anyToTake = S => { for (let s = 0; s < S.sides.length; s++) if (S.sides[s] === 3) return true; return false; };
function safeLines(S, out) { out.length = 0; for (let m = 0; m < S.line.length; m++) if (!S.line[m] && isSafe(S, m)) out.push(m); return out; }

/* ── the end: chains and loops ── */
const seen = new Uint8Array(MAXS), CH = [], LP = [];
/** Reads a position with nothing to take and no safe line as chains and loops of squares with two sides each, into
 *  chains and loops (their lengths). Returns how many squares are left over with fewer than two sides: junctions,
 *  where several chains meet. With none, the reading is exact. */
function structure(S, chains, loops) {
  chains.length = 0; loops.length = 0;
  const B = S.sides.length, sides = S.sides, SL = S.g.sqLine;
  let junctions = 0;
  for (let s = 0; s < B; s++) { seen[s] = 0; if (S.owner[s] < 0 && sides[s] < 2) junctions++; }
  for (let s = 0; s < B; s++) {                              // chains: from an end at the edge, or at a junction
    if (seen[s] || sides[s] !== 2) continue;
    let start = -1;
    for (let i = 4 * s; i < 4 * s + 4 && start < 0; i++) { const m = SL[i]; if (S.line[m]) continue; const o = across(S, m, s); if (o < 0 || sides[o] < 2) start = m; }
    if (start < 0) continue;
    let len = 0, cur = s, prev = start;
    for (;;) {
      seen[cur] = 1; len++;
      const m = openSide(S, cur, prev), o = across(S, m, cur);
      if (o < 0 || sides[o] !== 2 || seen[o]) break;
      prev = m; cur = o;
    }
    chains.push(len);
  }
  for (let s = 0; s < B; s++) {                              // loops: what is left
    if (seen[s] || sides[s] !== 2) continue;
    let len = 0, cur = s, prev = -1;
    for (;;) { seen[cur] = 1; len++; const m = openSide(S, cur, prev), o = across(S, m, cur); if (o < 0 || seen[o]) break; prev = m; cur = o; }
    loops.push(len);
  }
  return junctions;
}
const memo = new Map();
const sortNum = a => { for (let i = 1; i < a.length; i++) { const v = a[i]; let j = i - 1; while (j >= 0 && a[j] > v) { a[j + 1] = a[j]; j--; } a[j + 1] = v; } return a; };
/** What is still to be won, for the side that has to open something, from these chains and loops (lengths, in
 *  order): squares it will take less squares the other side will take, both playing their best. Opening a chain of
 *  one or two hands it over and the other side moves next (a chain of two is opened in the middle, so that it cannot
 *  be handed back). A longer chain, or a loop, is taken whole, or all but two (four, of a loop) and those handed back
 *  so that the opener has to open again: the other side picks whichever is better for it. */
function valueOf(ch, lp) {
  if (!ch.length && !lp.length) return 0;
  const key = ch.join(',') + '|' + lp.join(',');
  let v = memo.get(key);
  if (v !== undefined) return v;
  v = -Infinity;
  for (let i = 0; i < ch.length; i++) {
    if (i && ch[i] === ch[i - 1]) continue;
    const L = ch[i], r = valueOf(ch.slice(0, i).concat(ch.slice(i + 1)), lp);
    const x = L <= 2 ? -L - r : Math.min(-L - r, 4 - L + r);
    if (x > v) v = x;
  }
  for (let i = 0; i < lp.length; i++) {
    if (i && lp[i] === lp[i - 1]) continue;
    const L = lp[i], r = valueOf(ch, lp.slice(0, i).concat(lp.slice(i + 1)));
    const x = Math.min(-L - r, 8 - L + r);
    if (x > v) v = x;
  }
  if (memo.size > 300000) memo.clear();
  memo.set(key, v);
  return v;
}
/** The value of a position with nothing to take and no safe line, for the side to move: exact when it is only chains
 *  and loops; with junctions, a guess that counts each junction square into the longest chain. */
function endValue(S) {
  const j = structure(S, CH, LP);
  if (j) { sortNum(CH); for (let k = 0; k < j; k++) { if (CH.length) CH[CH.length - 1 - (k % CH.length)]++; else CH.push(1); } }
  return valueOf(sortNum(CH).slice(), sortNum(LP).slice());
}

/* ── judging a position that still has safe lines: play them out, and count the end ── */
let rollouts = 1;
function estimate(S) {
  if (!rollouts) return 0;
  const E = S.line.length;
  let total = 0;
  for (let r = 0; r < rollouts; r++) {
    const stride = STRIDE[S.n][r % 3];
    let k = 0, m = ((S.hl >>> 4) + 31 * r) % E;
    if (m < 0) m += E;
    for (let i = 0; i < E; i++, m = (m + stride) % E) if (!S.line[m] && isSafe(S, m)) { make(S, m); k++; }
    nodes += k;
    const v = endValue(S);
    for (let i = 0; i < k; i++) unmake(S);
    total += k & 1 ? -v : v;
  }
  return total / rollouts;
}
/** how many safe lines can still be drawn one after another, playing them in one order */
function safeCount(S) {
  const E = S.line.length; let k = 0;
  for (let i = 0, m = 0; i < E; i++, m = (m + STRIDE[S.n][0]) % E) if (!S.line[m] && isSafe(S, m)) { make(S, m); k++; }
  for (let i = 0; i < k; i++) unmake(S);
  return k;
}

/* ── the search ── */
const TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const ttLo = new Int32Array(TT_SIZE), ttHi = new Int32Array(TT_SIZE), ttVal = new Float64Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE), ttMove = new Int16Array(TT_SIZE);
const SALT = { 5: [0x5bd1e995, 0x1b873593], 7: [0x27d4eb2f, 0x165667b1] };   // the two boards never share a table entry
const EXACT = 1, LOWER = 2, UPPER = 3, SURE = 100;
const moveBuf = new Int16Array(MAXPLY * MAXL), scoreBuf = new Float64Array(MAXPLY * MAXL), hist = new Int32Array(MAXL);
let nodes = 0, ticks = 0, budget = 0, deadline = 0, aborted = false, sacrifices = false;

function store(S, depth, v, flag, m) {
  const salt = SALT[S.n], lo = S.hl ^ salt[0], i = lo & TT_MASK;
  ttLo[i] = lo; ttHi[i] = S.hh ^ salt[1]; ttVal[i] = v; ttDepth[i] = Math.max(-100, Math.min(SURE, depth)); ttFlag[i] = flag; ttMove[i] = m;
}
/** What is still to be won from S for the side to move, looking `depth` lines ahead (taking squares, and declining
 *  them, does not count against it). */
function search(S, depth, alpha, beta, ply) {
  nodes++;
  if (++ticks >= 64) { ticks = 0; if (nodes > budget || clock() > deadline) aborted = true; }
  if (aborted || !S.left) return 0;
  const salt = SALT[S.n], lo = S.hl ^ salt[0], hi = S.hh ^ salt[1], ti = lo & TT_MASK;
  let ttm = -1;
  if (ttLo[ti] === lo && ttHi[ti] === hi && ttFlag[ti]) {
    ttm = ttMove[ti];
    if (ttDepth[ti] >= depth) { const v = ttVal[ti], f = ttFlag[ti]; if (f === EXACT || (f === LOWER && v >= beta) || (f === UPPER && v <= alpha)) return v; }
  }
  // a square to take: one that opens nothing is always taken; the first square of a chain is taken, or declined by
  // drawing the far side of the next square, which hands back the last two (or, of a loop, the last four)
  let cs = -1, cm = -1, co = -1;
  for (let s = 0; s < S.sides.length; s++) {
    if (S.sides[s] !== 3) continue;
    const m = openSide(S, s, -1), o = across(S, m, s);
    if (o < 0 || S.sides[o] !== 2) { const got = make(S, m), v = got + search(S, depth, alpha - got, beta - got, ply + 1); unmake(S); return v; }
    if (cs < 0) { cs = s; cm = m; co = o; }
  }
  const a0 = alpha;
  if (cs >= 0) {
    const got = make(S, cm);
    let best = got + search(S, depth, alpha - got, beta - got, ply + 1), bm = cm;
    unmake(S);
    if (aborted) return 0;
    if (best > alpha) alpha = best;
    const d = openSide(S, co, cm), x = d < 0 ? -1 : across(S, d, co);
    if (alpha < beta && d >= 0 && (x < 0 || S.sides[x] <= 1 || (S.sides[x] === 2 && (() => { const e = openSide(S, x, d), y = across(S, e, x); return y >= 0 && S.sides[y] === 3; })()))) {
      make(S, d);
      const v = -search(S, depth - 1, -beta, -alpha, ply + 1);
      unmake(S);
      if (aborted) return 0;
      if (v > best) { best = v; bm = d; }
    }
    store(S, depth, best, best <= a0 ? UPPER : best >= beta ? LOWER : EXACT, bm);
    return best;
  }
  // nothing to take
  const base = ply * MAXL;
  let n = 0;
  for (let m = 0; m < S.line.length; m++) if (!S.line[m] && isSafe(S, m)) moveBuf[base + n++] = m;
  if (!n) {
    const j = structure(S, CH, LP);
    if (!j) { const v = valueOf(sortNum(CH).slice(), sortNum(LP).slice()); store(S, SURE, v, EXACT, -1); return v; }
    if (depth <= 0) return endValue(S);
    for (let m = 0; m < S.line.length; m++) if (!S.line[m]) { moveBuf[base + n] = m; scoreBuf[base + n] = -gift(S, m); n++; }
  } else {
    if (depth <= 0) return estimate(S);
    for (let i = 0; i < n; i++) scoreBuf[base + i] = hist[moveBuf[base + i]];
    if (sacrifices && ply <= 2) for (let m = 0; m < S.line.length; m++) {     // a square or two given away, to come out right at the end
      if (S.line[m] || isSafe(S, m)) continue;
      const given = gift(S, m);
      if (given <= 2) { moveBuf[base + n] = m; scoreBuf[base + n] = -1e9 - given; n++; }
    }
  }
  for (let i = 0; i < n; i++) if (moveBuf[base + i] === ttm) scoreBuf[base + i] = 2e9;
  for (let i = 1; i < n; i++) {                                // best first
    const m = moveBuf[base + i], sc = scoreBuf[base + i]; let k = i - 1;
    while (k >= 0 && scoreBuf[base + k] < sc) { moveBuf[base + k + 1] = moveBuf[base + k]; scoreBuf[base + k + 1] = scoreBuf[base + k]; k--; }
    moveBuf[base + k + 1] = m; scoreBuf[base + k + 1] = sc;
  }
  let best = -Infinity, bm = moveBuf[base];
  for (let i = 0; i < n; i++) {
    const m = moveBuf[base + i];
    make(S, m);                                                // takes nothing: there was nothing to take
    const v = -search(S, depth - 1, -beta, -alpha, ply + 1);
    unmake(S);
    if (aborted) return 0;
    if (v > best) { best = v; bm = m; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) { hist[m] += depth * depth + 1; break; }
  }
  store(S, depth, best, best <= a0 ? UPPER : best >= beta ? LOWER : EXACT, bm);
  return best;
}

/** The move the search settles on, looking deeper until the budget is spent. */
function searched(S, opt, cfg) {
  nodes = 0; ticks = 0; aborted = false; sacrifices = cfg.sacrifices; rollouts = cfg.rollouts;
  budget = cfg.budget * (S.n === 5 ? 1 : 1.2) * (safeCount(S) > 24 ? 0.25 : 1);   // early on, while the end is far off, it looks less hard
  deadline = clock() + Math.max(50, (opt.timeMs || 1000) * 0.7);
  hist.fill(0);
  // the moves at the root: a chain to take, or decline; or every line worth a thought
  const moves = [], d0 = [];
  const cs = (() => { for (let s = 0; s < S.sides.length; s++) if (S.sides[s] === 3) return s; return -1; })();
  if (cs >= 0) {
    const cm = openSide(S, cs, -1), co = across(S, cm, cs);
    moves.push(cm);
    const d = openSide(S, co, cm);
    if (d >= 0) moves.push(d);
  } else {
    safeLines(S, moves);
    if (!moves.length || sacrifices) for (let m = 0; m < S.line.length; m++) if (!S.line[m] && !isSafe(S, m) && (!moves.length || gift(S, m) <= 2)) d0.push(m);
    const given = new Map(d0.map(m => [m, gift(S, m)]));
    d0.sort((a, b) => given.get(a) - given.get(b));
  }
  for (let i = moves.length - 1; i > 0; i--) { const j = Math.floor(opt.rand() * (i + 1)), t = moves[i]; moves[i] = moves[j]; moves[j] = t; }   // among equals, any
  const all = moves.concat(d0);
  let best = all[0], sure = false;
  for (let depth = 1; depth <= cfg.depth && !sure; depth++) {
    let alpha = -Infinity, top = -Infinity, pick = -1;
    for (const m of all) {
      const got = make(S, m);
      const v = got ? got + search(S, depth, alpha - got, Infinity, 1) : -search(S, depth - 1, -Infinity, -alpha, 1);
      unmake(S);
      if (aborted) break;
      if (v > top) { top = v; pick = m; }
      if (v > alpha) alpha = v;
    }
    if (pick >= 0 && (!aborted || pick !== best)) best = pick;
    if (aborted) break;
    all.splice(all.indexOf(best), 1); all.unshift(best);       // the best so far is looked at first next time
    sure = Math.abs(top) >= 1e8;
  }
  return best;
}

/* ── the levels ── */
function easy(S, rand) {
  const moves = legalMoves(S);
  for (const m of moves) if (takes(S, m)) return m;
  const safe = moves.filter(m => isSafe(S, m));
  if (safe.length && rand() < 0.5) return safe[Math.floor(rand() * safe.length)];
  return moves[Math.floor(rand() * moves.length)];
}
function casual(S, rand) {
  const moves = legalMoves(S);
  for (const m of moves) if (takes(S, m)) return m;
  const safe = moves.filter(m => isSafe(S, m));
  if (safe.length) return safe[Math.floor(rand() * safe.length)];
  let best = moves[0], fewest = Infinity;
  for (const m of moves) { const w = gift(S, m) + rand() * 0.5; if (w < fewest) { fewest = w; best = m; } }
  return best;
}

const BOT = {
  name: 'House',
  author: 'Claude',
  levels: ['easy', 'casual', 'steady', 'sharp', 'master'],
  think(S, opt) {
    const rand = opt.rand;
    if (opt.level === 'easy') return easy(S, rand);
    if (opt.level === 'casual') return casual(S, rand);
    const cfg = LEVEL[opt.level];
    const free = freeTake(S);
    if (free >= 0) return free;                                // a square that opens nothing is always worth taking
    if (!anyToTake(S)) {
      const safe = safeLines(S, []);
      if (safe.length && (cfg.from === 0 || (cfg.from !== Infinity && safeCount(S) > cfg.from))) return safe[Math.floor(rand() * safe.length)];
    }
    return searched(S, opt, cfg);
  },
};
