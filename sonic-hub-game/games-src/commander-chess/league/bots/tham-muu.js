/* Commander Chess (Cờ Tư Lệnh) computer player: "Tham Mưu" (Staff Officer), three levels.
   Written for AI kit 2 (rules 752c960 2026-11-17) by Game Bot.
   Level 1 (Easy)   : looks one move ahead and at the enemy's best immediate capture, with noise and lapses.
   Level 2 (Medium) : alpha-beta, 1..3 plies, captures-only quiescence, MVV-LVA ordering, full evaluation.
   Level 3 (Hard)   : iterative deepening alpha-beta with a Zobrist transposition table, killer and history
                      ordering, check extension, quiescence, repetition / quiet-turn awareness, time control.
   A plain script: no network, DOM, timers, workers or async. Uses only CC and registerAI. */
'use strict';

/* ───────────────────────── constants ───────────────────────── */
const K = CC;
const WIN = 1000000, PTS_WIN = 900000, INF = 2000000;
/* how much each kind is worth to the search (not the points table): C I T M E A G S F N H */
const VAL = [0, 100, 230, 100, 100, 330, 130, 260, 470, 620, 90];
const LAND_ATT = [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];             // pieces that gain from moving forward
const ADV_W = [0, 7, 9, 6, 4, 6, 2, 3, 0, 0, 0];
const THREAT_R = [1, 1, 2, 1, 1, 3, 1, 2, 4, 4, 0];             // capture reach on a line (rough)

/* ───────────────────────── Zobrist hashing ───────────────────────── */
let seed32 = 0x9e3779b9;
function rnd32() { seed32 ^= seed32 << 13; seed32 ^= seed32 >>> 17; seed32 ^= seed32 << 5; return seed32 | 0; }
const ZN = 11 * 2 * 2 * K.NSQ;
const Z1 = new Int32Array(ZN), Z2 = new Int32Array(ZN);
for (let i = 0; i < ZN; i++) { Z1[i] = rnd32(); Z2[i] = rnd32(); }
const ZT1 = rnd32(), ZT2 = rnd32();
const ZD1 = new Int32Array(K.NSQ + 1), ZD2 = new Int32Array(K.NSQ + 1), ZA1 = new Int32Array(64), ZA2 = new Int32Array(64);
for (let i = 0; i <= K.NSQ; i++) { ZD1[i] = rnd32(); ZD2[i] = rnd32(); }
for (let i = 0; i < 64; i++) { ZA1[i] = rnd32(); ZA2[i] = rnd32(); }
const zi = (k, side, hero, s) => ((k * 2 + side) * 2 + (hero ? 1 : 0)) * K.NSQ + s;
let H1 = 0, H2 = 0;                                               // result registers of hashOf
/** hash of the position as the table counts it (pieces, heroes, side to move); deployment state mixed in when asked */
function hashOf(S, withDeploy) {
  let a = 0, b = 0;
  for (let p = 0; p < S.n; p++) { const s = S.at[p]; if (s < 0) continue; const i = zi(S.kind[p], S.own[p], S.hero[p], s); a ^= Z1[i]; b ^= Z2[i]; }
  if (S.turn) { a ^= ZT1; b ^= ZT2; }
  if (withDeploy && S.dOrg >= 0) { a ^= ZD1[S.dOrg]; b ^= ZD2[S.dOrg]; for (const p of S.dAct) { a ^= ZA1[p & 63]; b ^= ZA2[p & 63]; } }
  H1 = a; H2 = b;
}
/** the same hash, from a CC.posKey string (the keys of ctx.seen) */
function hashOfKey(key) {
  const parts = key.split('|'); let a = 0, b = 0;
  if (parts[0] === 'b') { a ^= ZT1; b ^= ZT2; }
  for (let j = 1; j < parts.length; j++) {
    const part = parts[j], c = part.indexOf(':'); if (c < 0) continue;
    const s = +part.slice(0, c), codes = part.slice(c + 1);
    for (let i = 0; i < codes.length;) {
      const k = K.KIND_CODE.indexOf(codes[i]); const side = codes[i + 1] === 'b' ? 1 : 0; i += 2;
      let hero = 0; if (codes[i] === '*') { hero = 1; i++; }
      if (k < 0) continue;
      const x = zi(k, side, hero, s); a ^= Z1[x]; b ^= Z2[x];
    }
  }
  H1 = a; H2 = b;
}
const hkey = (a, b) => a + ':' + b;

/* ───────────────────────── transposition table (Hard) ───────────────────────── */
const TT_BITS = 17, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const ttK1 = new Int32Array(TT_SIZE), ttK2 = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int32Array(TT_SIZE);
const ttDepth = new Int8Array(TT_SIZE), ttFlag = new Uint8Array(TT_SIZE);   // flag 0 empty, 1 exact, 2 lower, 3 upper

/* ───────────────────────── evaluation ───────────────────────── */
/** static score of S for side `me`. full: the richer terms (air defence, commander danger) */
function evaluate(S, me, full) {
  const sc = [0, 0], pts = [0, 0], arm = [[0, 0, 0], [0, 0, 0]], cmdSq = [-1, -1];
  for (let side = 0; side < 2; side++) { const c = S.cmd[side]; cmdSq[side] = c >= 0 ? S.at[c] : -1; }
  const total = S.total;
  for (let p = 0; p < S.n; p++) {
    const k = S.kind[p], o = S.own[p], s = S.at[p];
    if (s < 0) { pts[1 - o] += K.POINTS[k] + (S.hero[p] ? 10 : 0); continue; }
    let v = VAL[k] + (S.hero[p] ? 70 : 0);
    const r = ((s / 11) | 0), adv = o === 0 ? r : 11 - r;
    if (k === K.COMMANDER) {
      v -= adv * (total ? 22 : 14);
      const c = S.car[p]; if (c >= 0 && S.kind[c] === K.HQ) v += 45;
    } else {
      if (LAND_ATT[k] || ADV_W[k]) v += ADV_W[k] * (adv > 8 ? 8 : adv);
      const f = s % 11; if (k !== K.NAVY && f >= 3 && f <= 8) v += 4;
      const a = K.armOf(k); if (a >= 0) arm[o][a]++;
      /* pressure on the enemy Commander: a piece close to it */
      const es = cmdSq[1 - o];
      if (es >= 0) {
        const dx = Math.abs(s % 11 - es % 11), dy = Math.abs(r - ((es / 11) | 0)), d = dx > dy ? dx : dy;
        if (d <= THREAT_R[k] + (S.hero[p] ? 2 : 1)) v += total ? 40 : 26;
      }
    }
    sc[o] += v;
  }
  if (!total) for (let o = 0; o < 2; o++) for (let a = 0; a < 3; a++) if (S.had[o][a]) { const n = arm[o][a]; if (n === 1) sc[o] -= a === 2 ? 260 : 380; else if (n === 2) sc[o] -= 70; }
  if (full) {
    for (let o = 0; o < 2; o++) {
      const m = K.adMask(S, o); let cov = 0;
      for (let p = 0; p < S.n; p++) if (S.own[p] === o && S.at[p] >= 0 && S.car[p] < 0 && m[S.at[p]]) cov += VAL[S.kind[p]] >= 200 ? 2 : 1;
      sc[o] += cov * 5;
      if (cmdSq[o] >= 0 && m[cmdSq[o]]) sc[o] += 30;
      /* enemy planes standing inside my air defence cannot move freely */
    }
  }
  /* the points count: a tie-break that becomes the whole game as the quiet-turn count grows */
  const w = 2 + S.half * 0.16;
  const pd = pts[me] - pts[1 - me];
  return sc[me] - sc[1 - me] + pd * w + 12;
}
/** the value of a game that has ended, for `me` */
function terminal(over, me, ply) {
  if (over.winner === -1) return 0;
  const big = over.why === 'points' ? PTS_WIN : WIN;
  return over.winner === me ? big - ply : -big + ply;
}
function pointsResult(S, me, ply) {
  const pts = K.points(S); const d = pts[me] - pts[1 - me];
  return d > 0 ? PTS_WIN - ply : d < 0 ? -PTS_WIN + ply : 0;
}
/** what a capture move would gain, roughly (for ordering and Easy) */
function gainOf(S, m) {
  const mode = K.mMode(m);
  if (mode !== K.CAPTURE && mode !== K.STAY && mode !== K.SUICIDE) return 0;
  const M = K.members(S, K.mTo(m)); let g = 0;
  for (const p of M) g += S.kind[p] === K.COMMANDER ? 50000 : VAL[S.kind[p]] + (S.hero[p] ? 70 : 0);
  if (mode === K.SUICIDE) g -= VAL[K.AIR] + 40;
  return g;
}

/* ───────────────────────── search ───────────────────────── */
class Abort { }
const ABORT = new Abort();
let ctxG = null, stopAt = 0, nodes = 0, LVL = 2, maxPly = 64;
let seenSet = null;                       // hash -> times seen (from ctx.seen)
const pathH = [];                         // turn-end hashes along the search line (Hard)
const killers = []; for (let i = 0; i < 80; i++) killers.push([0, 0]);
const history = new Int32Array(1 << 16);
const histIdx = m => ((K.mActor(m) << 8) | K.mTo(m)) & 0xffff;
function timeUp() { if ((++nodes & 63) === 0 && ctxG.timeLeft() < stopAt) throw ABORT; }

/** repetition count of the position after a turn has ended (seen in the game + on this search line) */
function repCount(T) {
  hashOf(T, false); const key = hkey(H1, H2);
  let n = seenSet.get(key) || 0;
  for (let i = 0; i < pathH.length; i++) if (pathH[i] === key) n++;
  return { n, key };
}

/** captures-only search at the horizon. Score for S.turn. */
function qsearch(S, alpha, beta, ply, qd) {
  timeUp();
  const me = S.turn;
  if (S.dOrg >= 0) {                                           // a deployment left open at the horizon: close it
    const T = K.clone(S);
    if (K.play(T, K.COMMIT_MOVE, false)) { if (T.over) return terminal(T.over, me, ply); return -qsearch(T, -beta, -alpha, ply + 1, qd); }
    return evaluate(S, me, LVL >= 2);
  }
  const stand = evaluate(S, me, LVL >= 2);
  if (qd <= 0) return stand;
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  const moves = K.gen(S, [], true);
  const sc = [];
  for (let i = 0; i < moves.length; i++) { const m = moves[i]; sc.push(K.mMode(m) === K.INTERCEPT ? -1e9 : gainOf(S, m)); }
  let best = stand;
  for (let n = 0; n < moves.length; n++) {
    let bi = n; for (let j = n + 1; j < moves.length; j++) if (sc[j] > sc[bi]) bi = j;
    const m = moves[bi]; const g = sc[bi]; moves[bi] = moves[n]; sc[bi] = sc[n];
    if (g <= -1e8) break;
    if (g < 30000 && stand + g + 150 <= alpha) continue;      // delta pruning
    const T = K.clone(S);
    if (!K.play(T, m, false) || K.exposed(T)) continue;
    let v;
    if (T.over) v = terminal(T.over, me, ply + 1);
    else if (T.turn === me) v = qsearch(T, alpha, beta, ply + 1, qd - 1);
    else v = -qsearch(T, -beta, -alpha, ply + 1, qd - 1);
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  return best;
}

/** order moves: TT move, captures by MVV-LVA, killers, history */
function orderMoves(S, moves, ttm, ply, useHist) {
  const sc = new Array(moves.length);
  const kl = killers[ply] || [0, 0];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i], mode = K.mMode(m);
    let v;
    if (m === ttm) v = 1e9;
    else if (mode === K.INTERCEPT) v = -1e9;
    else if (mode === K.CAPTURE || mode === K.STAY || mode === K.SUICIDE) v = 1e7 + gainOf(S, m) * 16 - VAL[S.kind[K.mActor(m)]];
    else if (useHist && (m === kl[0] || m === kl[1])) v = 5e6;
    else if (mode === K.COMMIT) v = 4e6;
    else v = useHist ? history[histIdx(m)] : 0;
    sc[i] = v;
  }
  return sc;
}

/** negamax alpha-beta. Score for S.turn. */
function search(S, depth, alpha, beta, ply) {
  timeUp();
  const me = S.turn, hard = LVL >= 3;
  if (depth <= 0) {
    if (hard && S.dOrg < 0 && ply < maxPly - 2 && K.inCheck(S, me)) depth = 1;   // check extension
    else return qsearch(S, alpha, beta, ply, hard ? 6 : 4);
  }
  let ttm = 0, idx = -1;
  const a0 = alpha;
  if (hard) {
    hashOf(S, true); idx = H1 & TT_MASK;
    if (ttFlag[idx] && ttK1[idx] === H1 && ttK2[idx] === H2) {
      ttm = ttMove[idx];
      if (ttDepth[idx] >= depth && ply > 0) {
        const v = ttScore[idx], f = ttFlag[idx];
        if (f === 1) return v;
        if (f === 2 && v >= beta) return v;
        if (f === 3 && v <= alpha) return v;
      }
    }
  }
  /* null move: if passing still keeps us above beta, this line is good enough (never in a deployment or in check) */
  if (hard && ply > 0 && depth >= 3 && S.dOrg < 0 && beta < PTS_WIN - 1000 && S.men[me] > 0 && evaluate(S, me, false) >= beta && !K.inCheck(S, me)) {
    const T = K.clone(S); T.turn = 1 - me;
    const v = -search(T, depth - 3, -beta, -beta + 1, ply + 1);
    if (v >= beta) return v;
  }
  const moves = K.gen(S, []);
  const sc = orderMoves(S, moves, ttm, ply, hard);
  let best = -INF, bestM = 0, legal = 0;
  const myH1 = H1, myH2 = H2;
  for (let n = 0; n < moves.length; n++) {
    let bi = n; for (let j = n + 1; j < moves.length; j++) if (sc[j] > sc[bi]) bi = j;
    const m = moves[bi]; const ms = sc[bi]; moves[bi] = moves[n]; sc[bi] = sc[n];
    if (ms <= -1e9 + 1) continue;                               // interceptions: a plane thrown away
    const T = K.clone(S);
    if (!K.play(T, m, false) || K.exposed(T)) continue;
    legal++;
    let v;
    if (T.over) v = terminal(T.over, me, ply + 1);
    else if (T.turn === me) v = search(T, depth - 1, alpha, beta, ply + 1);
    else {
      let rep = null;
      if (hard) { rep = repCount(T); }
      if (rep && rep.n >= 2) v = pointsResult(T, me, ply + 1);
      else {
        if (rep) pathH.push(rep.key);
        try {
          /* late quiet moves are looked at one ply less first (LMR) */
          if (hard && depth >= 3 && legal > 4 && ms < 4e6 && T.half > 0 && !K.inCheck(T, T.turn)) {
            v = -search(T, depth - 2, -alpha - 1, -alpha, ply + 1);
            if (v > alpha) v = -search(T, depth - 1, -beta, -alpha, ply + 1);
          } else v = -search(T, depth - 1, -beta, -alpha, ply + 1);
        } finally { if (rep) pathH.pop(); }
      }
    }
    if (v > best) {
      best = v; bestM = m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (hard && !(K.mMode(m) === K.CAPTURE || K.mMode(m) === K.STAY || K.mMode(m) === K.SUICIDE)) {
            const kl = killers[ply]; if (kl && kl[0] !== m) { kl[1] = kl[0]; kl[0] = m; }
            const hi = histIdx(m); history[hi] = Math.min(history[hi] + depth * depth, 1e6);
          }
          break;
        }
      }
    }
  }
  if (!legal) return S.dOrg >= 0 ? evaluate(S, me, true) : -WIN + ply;    // no move at all: lost
  if (hard) {
    idx = myH1 & TT_MASK;
    if (ttDepth[idx] <= depth || ttK1[idx] !== myH1) {
      ttK1[idx] = myH1; ttK2[idx] = myH2; ttMove[idx] = bestM; ttScore[idx] = best; ttDepth[idx] = depth;
      ttFlag[idx] = best <= a0 ? 3 : best >= beta ? 2 : 1;
    }
  }
  return best;
}

/** value of root move m (already played into T) for `me` */
function rootValue(T, me, depth, alpha, beta) {
  if (T.over) return terminal(T.over, me, 1);
  if (T.turn === me) return search(T, depth - 1, alpha, beta, 1);
  const rep = repCount(T);
  if (rep.n >= 2) return pointsResult(T, me, 1);               // our turn would make the third repetition
  pathH.push(rep.key);
  try {
    let v = -search(T, depth - 1, -beta, -alpha, 1);
    if (rep.n === 1 && LVL >= 2) {                             // a second repetition: lean to what the points say
      const pr = pointsResult(T, me, 1); v = (v * 3 + (pr > 0 ? 400 : pr < 0 ? -400 : 0)) / 4;
    }
    return v;
  } finally { pathH.pop(); }
}

/* ───────────────────────── the three levels ───────────────────────── */
function chooseEasy(S, legal, ctx) {
  const me = S.turn, out = [];
  const blind = ctx.random() < 0.12;                           // a hasty turn: does not look at the replies
  for (const m of legal) {
    const T = K.clone(S); if (!K.play(T, m, true)) continue;
    let v;
    if (T.over) v = terminal(T.over, me, 1);
    else {
      v = evaluate(T, me, false);
      let U = T;
      if (U.dOrg >= 0) { U = K.clone(T); if (!K.play(U, K.COMMIT_MOVE, false)) U = null; }
      if (U && !U.over && U.turn !== me) {
        const rep = repCount(U); if (rep.n >= 2) v = pointsResult(U, me, 1);
        else if (!blind) {
          /* the enemy's best capture straight back, played out and judged */
          let worst = INF;
          for (const r of K.gen(U, [], true)) {
            if (K.mMode(r) === K.INTERCEPT) continue;
            const V = K.clone(U); if (!K.play(V, r, false)) continue;
            const w = V.over ? terminal(V.over, me, 2) : evaluate(V, me, false);
            if (w < worst) worst = w;
          }
          if (worst < v) v = worst;
        }
      }
    }
    if (K.mMode(m) === K.INTERCEPT) v -= 5000;
    v += (ctx.random() - 0.5) * 140;
    out.push([v, m]);
  }
  out.sort((a, b) => b[0] - a[0]);
  if (!out.length) return legal[0];
  /* a lapse now and then: one of the next few moves, but never one that loses at once */
  if (out.length > 1 && ctx.random() < 0.15) {
    const pool = out.slice(0, Math.min(4, out.length)).filter(x => x[0] > out[0][0] - 400 && x[0] > -50000);
    if (pool.length) return pool[Math.floor(ctx.random() * pool.length)][1];
  }
  return out[0][1];
}

function chooseSearch(S, legal, ctx, budget) {
  const me = S.turn, hard = LVL >= 3, maxDepth = hard ? 20 : legal.length < 25 ? 3 : 2;
  ctxG = ctx; nodes = 0;
  const startLeft = ctx.timeLeft();
  stopAt = startLeft - budget;
  if (hard) { for (const k of killers) { k[0] = 0; k[1] = 0; } for (let i = 0; i < history.length; i++) history[i] >>= 2; }
  let roots = legal.filter(m => K.mMode(m) !== K.INTERCEPT); if (!roots.length) roots = legal.slice();
  /* initial order: captures first */
  let order = roots.map(m => [gainOf(S, m), m]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  let bestM = order[0], bestV = -INF;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -INF, curBest = 0, curV = -INF; const scored = [];
    try {
      for (const m of order) {
        const T = K.clone(S); if (!K.play(T, m, true)) continue;
        let v;
        if (curV === -INF) v = rootValue(T, me, depth, -INF, INF);
        else {
          v = rootValue(T, me, depth, alpha, alpha + 1);       // null window, then re-search
          if (v > alpha) v = rootValue(T, me, depth, alpha, INF);
        }
        scored.push([v, m]);
        if (v > curV) { curV = v; curBest = m; if (v > alpha) alpha = v; }
      }
    } catch (e) {
      if (e !== ABORT) throw e;
      if (curBest && scored.length) { bestM = curBest; bestV = curV; }   // partial iteration: the best move searched deeper so far
      break;
    }
    bestM = curBest || bestM; bestV = curV;
    const rest = order.filter(m => !scored.some(x => x[1] === m));
    order = scored.sort((a, b) => b[0] - a[0]).map(x => x[1]).concat(rest);
    if (Math.abs(bestV) >= PTS_WIN - 100) break;                // a forced result found
    const used = startLeft - ctx.timeLeft();
    if (used > budget * (hard ? 0.45 : 0.35)) break;              // the next depth would not finish
  }
  return bestM;
}

function choose(S, legal, ctx) {
  if (legal.length === 1) return legal[0];
  LVL = ctx.level | 0; if (LVL < 1) LVL = 1; if (LVL > 3) LVL = 3;
  if (LVL === 1) return chooseEasy(S, legal, ctx);
  const left = ctx.timeLeft();
  const share = S.dOrg >= 0 ? 0.5 : 0.62;
  let budget = Math.max(5, left * share - 10);
  if (LVL === 2) budget = Math.min(budget, Math.max(5, ctx.timeMs * 0.45));
  return chooseSearch(S, legal, ctx, budget);
}

function buildSeen(ctx) {
  seenSet = new Map();
  const seen = ctx.seen || {};
  for (const k in seen) { hashOfKey(k); seenSet.set(hkey(H1, H2), seen[k]); }
}

registerAI({
  id: 'tham-muu',
  name: 'Tham Mưu',
  author: 'Game Bot',
  about: 'A staff officer that counts before it moves: it keeps its Commander home under air defence, trades only when the exchange pays, ' +
    'and watches the points table, playing for the third repetition or the hundredth quiet turn when ahead and steering away when behind. ' +
    'Easy looks one move deep and is hasty; Medium reads two or three plies with captures to the end; Hard thinks deeper with a memory of positions.',
  levels: 3,
  turn(S, ctx) {
    const me = S.turn, moves = [];
    buildSeen(ctx);
    while (!S.over && S.turn === me && moves.length < 12) {
      const legal = K.legalMoves(S);
      if (!legal.length) break;
      let m;
      try { m = choose(S, legal, ctx); } catch (e) { m = 0; }
      if (!m && m !== 0 || legal.indexOf(m) < 0) { const sane = legal.filter(x => K.mMode(x) !== K.INTERCEPT); m = (sane.length ? sane : legal)[0]; }
      moves.push(m);
      if (!K.play(S, m, true)) break;
    }
    return moves;
  },
});
