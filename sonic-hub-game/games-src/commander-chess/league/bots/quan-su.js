'use strict';
/*
  Quân Sư — a Commander Chess player.

  How it thinks: iterative-deepening alpha-beta (principal variation search) with a quiescence search over captures,
  a transposition table, killer / history / MVV-LVA move ordering, check extensions, futility, null-move and
  late-move reductions. Deployments (stacks that unload piece by piece) are searched as part of the turn.
  It reads ctx.seen, so it knows when a third repetition would end the game on points, and takes it when it is
  ahead and steers away from it when it is behind.

  How it judges a position: material in the game's own points, a bonus for heroes, a little for advance and
  centralisation, pull of attackers towards the enemy Commander and of defenders towards its own, and, in
  battles, the fate of each side's last ship or plane (losing it loses the game, so it is hunted and guarded).
  No state is needed: with or without the table it gives a legal answer for any position, on either side.
*/

const NSQ = CC.NSQ, NF = CC.NF;
const MODE_MOVE = 0, MODE_CAPTURE = 1, MODE_STAY = 2, MODE_SUICIDE = 3, MODE_INTERCEPT = 4, MODE_COMBINE = 5, MODE_COMMIT = 6;
const INF = 1000000, WIN = 900000, MAXPLY = 48;
const USE_FUT = 1, USE_LMR = 1, USE_NULL = 1, FUT1 = 200, FUT2 = 450, NULL_R = 2;

/* ───────────── static tables ───────────── */
//            C    I    T    M    E    A    G    S    F    N    H
const VAL  = [0, 100, 200, 100, 100, 300, 100, 200, 400, 800, 100];     // the author's points x 10
const OVAL = [10000, 10, 20, 10, 10, 30, 10, 20, 40, 80, 10];            // for ordering captures
const HEROV = [0, 130, 130, 110, 110, 130, 110, 130, 180, 110, 160];
const ATT = [0, 3, 5, 3, 0, 4, 0, 3, 6, 3, 0];                          // pull towards the enemy Commander
const DEF = [0, 4, 4, 3, 2, 1, 6, 5, 1, 2, 0];                          // pull towards one's own Commander
const ARM = [-1, 2, 2, -1, -1, 2, -1, -1, 1, 0, -1];
const FILE = new Int8Array(NSQ), RANK = new Int8Array(NSQ);
for (let s = 0; s < NSQ; s++) { FILE[s] = s % NF; RANK[s] = (s / NF) | 0; }

function pstValue(k, f, adv) {
  const cf = Math.max(0, 5 - Math.abs(f - 6));
  switch (k) {
    case 0: return -6 * Math.max(0, adv - 1) - 3 * Math.abs(f - 6);
    case 1: return 3 * Math.min(adv, 9) + 2 * cf + (adv >= 6 ? 12 : 0);
    case 2: return 5 * Math.min(adv, 8) + 4 * cf;
    case 3: return 3 * Math.min(adv, 9) + 2 * cf;
    case 4: return (adv === 5 || adv === 6 ? 8 : 0) + cf;
    case 5: return 4 * cf + 7 * Math.min(adv, 5) - 6 * Math.max(0, adv - 7);
    case 6: return 2 * cf - 3 * Math.max(0, adv - 5);
    case 7: return 3 * cf + 4 * Math.min(adv, 5);
    case 8: return 4 * cf + 3 * Math.min(adv, 7) - (f <= 1 || f >= 10 ? 10 : 0);
    case 9: return Math.round(5 * Math.max(0, 5 - Math.abs(adv - 5.5)) + (f === 2 ? 8 : f === 1 ? 3 : 0));
    default: return 0;
  }
}
const PST = [new Int16Array(11 * NSQ), new Int16Array(11 * NSQ)];
for (let side = 0; side < 2; side++) for (let k = 0; k < 11; k++) for (let s = 0; s < NSQ; s++) {
  const r = RANK[s] + 1, adv = side === 0 ? r - 1 : 12 - r;
  PST[side][k * NSQ + s] = pstValue(k, FILE[s], adv);
}

/* ───────────── hashing ───────────── */
let zseed = 0x2545F491;
const rnd32 = () => { zseed ^= zseed << 13; zseed ^= zseed >>> 17; zseed ^= zseed << 5; return zseed | 0; };
const ZN = 2 * 11 * 2 * 2 * NSQ;
const Z1 = new Int32Array(ZN), Z2 = new Int32Array(ZN), ZD1 = new Int32Array(NSQ), ZD2 = new Int32Array(NSQ), ZA1 = new Int32Array(64), ZA2 = new Int32Array(64);
for (let i = 0; i < ZN; i++) { Z1[i] = rnd32(); Z2[i] = rnd32(); }
for (let i = 0; i < NSQ; i++) { ZD1[i] = rnd32(); ZD2[i] = rnd32(); }
for (let i = 0; i < 64; i++) { ZA1[i] = rnd32(); ZA2[i] = rnd32(); }
const ZT1 = rnd32(), ZT2 = rnd32();
let H1 = 0, H2 = 0;
function hashOf(S) {
  let a = S.turn ? ZT1 : 0, b = S.turn ? ZT2 : 0;
  const at = S.at, kind = S.kind, own = S.own, car = S.car, hero = S.hero, n = S.n;
  for (let p = 0; p < n; p++) {
    const s = at[p]; if (s < 0) continue;
    const i = ((((own[p] * 11 + kind[p]) * 2 + (car[p] >= 0 ? 1 : 0)) * 2 + hero[p]) * NSQ) + s;
    a ^= Z1[i]; b ^= Z2[i];
  }
  if (S.dOrg >= 0) { a ^= ZD1[S.dOrg]; b ^= ZD2[S.dOrg]; const d = S.dAct; for (let i = 0; i < d.length; i++) { a ^= ZA1[d[i]]; b ^= ZA2[d[i]]; } }
  H1 = a; H2 = b;
}
/* the hash of a position written as CC.posKey writes it (a position at the end of a turn) */
function hashFromKey(key) {
  let a = key.charCodeAt(0) === 98 ? ZT1 : 0, b = key.charCodeAt(0) === 98 ? ZT2 : 0;
  const parts = key.split('|');
  for (let i = 1; i < parts.length; i++) {
    const e = parts[i], colon = e.indexOf(':'), s = +e.slice(0, colon);
    let j = colon + 1, first = true;
    while (j < e.length) {
      const kind = CC.KIND_CODE.indexOf(e[j++]), side = e[j++] === 'b' ? 1 : 0; let hero = 0;
      if (e[j] === '*') { hero = 1; j++; }
      const x = ((((side * 11 + kind) * 2 + (first ? 0 : 1)) * 2 + hero) * NSQ) + s; first = false;
      a ^= Z1[x]; b ^= Z2[x];
    }
  }
  H1 = a; H2 = b;
}
const hkey = (a, b) => (a >>> 0) * 2097152 + (b >>> 11);

/* ───────────── transposition table ───────────── */
const TT_N = 1 << 18, TT_MASK = TT_N - 1;
const ttK1 = new Int32Array(TT_N), ttK2 = new Int32Array(TT_N), ttMv = new Int32Array(TT_N), ttSc = new Int32Array(TT_N), ttDF = new Int16Array(TT_N);
const F_EXACT = 0, F_LOWER = 1, F_UPPER = 2;

/* ───────────── evaluation ───────────── */
const cnt = new Int8Array(6), lone = new Int16Array(6);
const LONE_W = 4, LONE_ARMS = 2;
const SINGLE = [150, 150, 150];
const PRESS = [0, 1, 2, 1, 1, 3, 1, 2, 4, 3, 0];
function evaluate(S) {
  const n = S.n, at = S.at, kind = S.kind, own = S.own, hero = S.hero;
  const c0 = at[S.cmd[0]], c1 = at[S.cmd[1]];
  const f0 = FILE[c0], r0 = RANK[c0], f1 = FILE[c1], r1 = RANK[c1];
  let a0 = 0, a1 = 0;
  cnt.fill(0);
  for (let p = 0; p < n; p++) {
    const s = at[p]; if (s < 0) continue;
    const k = kind[p], side = own[p];
    let v = VAL[k] + PST[side][k * NSQ + s];
    if (hero[p]) v += HEROV[k];
    if (k !== 0 && k !== 10) {
      const f = FILE[s], r = RANK[s];
      const dE = side ? Math.max(Math.abs(f - f0), Math.abs(r - r0)) : Math.max(Math.abs(f - f1), Math.abs(r - r1));
      const dM = side ? Math.max(Math.abs(f - f1), Math.abs(r - r1)) : Math.max(Math.abs(f - f0), Math.abs(r - r0));
      if (dE < 6) v += ATT[k] * (6 - dE);
      if (dM < 3) v += DEF[k] * (3 - dM);
    }
    if (side) a1 += v; else a0 += v;
    const arm = ARM[k]; if (arm >= 0) { cnt[side * 3 + arm]++; lone[side * 3 + arm] = s; }
  }
  if (!S.total) {
    for (let side = 0; side < 2; side++) for (let arm = 0; arm < 3; arm++) {
      if (S.had[side][arm] && cnt[side * 3 + arm] === 1) {
        if (side) a1 -= SINGLE[arm]; else a0 -= SINGLE[arm];
        if (LONE_W && arm < LONE_ARMS) {
          // the last ship / plane of a side: how many of the other side's pieces are near it
          const q = lone[side * 3 + arm], qf = FILE[q], qr = RANK[q]; let press = 0;
          for (let p = 0; p < n; p++) {
            const s = at[p]; if (s < 0 || own[p] === side) continue;
            const w = PRESS[kind[p]]; if (!w) continue;
            const d = Math.max(Math.abs(FILE[s] - qf), Math.abs(RANK[s] - qr));
            if (d < 5) press += w * (5 - d);
          }
          press *= LONE_W; if (side) { a1 -= press; } else { a0 -= press; }
        }
      }
    }
  }
  return S.turn ? a1 - a0 + 8 : a0 - a1 + 8;
}


/* ───────────── reusable position buffers (no allocation per node) ───────────── */
const POOL = [], NPOOL = [];
function newBuf(S) { const B = CC.clone(S); B.dAct = []; return B; }
function copyState(dst, src) {
  dst.top.set(src.top); dst.at.set(src.at); dst.car.set(src.car); dst.c1.set(src.c1); dst.c2.set(src.c2); dst.hero.set(src.hero);
  dst.turn = src.turn; dst.half = src.half; dst.full = src.full; dst.over = src.over; dst.dOrg = src.dOrg; dst.dIrr = src.dIrr;
  dst.dAct = src.dAct.length ? src.dAct.slice() : EMPTY;
  dst.ad[0] = dst.ad[1] = null; dst.log = null;
  dst.n = src.n; dst.kind = src.kind; dst.own = src.own; dst.cmd = src.cmd; dst.total = src.total; dst.had = src.had; dst.men = src.men;
  return dst;
}
const EMPTY = [];
function bufFor(pool, ply, S) {
  let B = pool[ply];
  if (!B || B.n !== S.n) B = pool[ply] = newBuf(S);
  return B;
}

/* ───────────── search state ───────────── */
let CTX = null, nodes = 0, stopLeft = 0;
const TIMEOUT = { timeout: true };
const histMap = new Map(), parsedKeys = new Map();
const histTab = new Int32Array(2 * NSQ * NSQ), killers = new Int32Array(2 * (MAXPLY + 4));
const pathH1 = new Int32Array(MAXPLY + 4), pathH2 = new Int32Array(MAXPLY + 4);
const MB = [], MS = [], QB = [], QS = [];
for (let i = 0; i < MAXPLY + 4; i++) { MB.push([]); MS.push([]); QB.push([]); QS.push([]); }

function tick() { if ((++nodes & 31) === 0 && CTX.timeLeft() < stopLeft) throw TIMEOUT; }

function overScore(T, mover, ply) { const w = T.over.winner; return w < 0 ? 0 : w === mover ? WIN - ply : -(WIN - ply); }
function repScore(S, ply) {
  const pts = CC.points(S), d = pts[S.turn] - pts[1 - S.turn];
  return d > 0 ? WIN - 1000 - ply : d < 0 ? -(WIN - 1000 - ply) : 0;
}

/* order the moves of a node: scores into sc */
function scoreMoves(S, moves, n, sc, ply, ttMove, side, quiet) {
  const P = PST[side], k0 = ply * 2, ka = killers[k0], kb = killers[k0 + 1], hb = side * NSQ * NSQ;
  for (let i = 0; i < n; i++) {
    const m = moves[i];
    if (m === ttMove) { sc[i] = 1e9; continue; }
    const mode = (m >> 16) & 7;
    if (mode === MODE_COMMIT) { sc[i] = 50000; continue; }
    const from = m & 255, to = (m >> 8) & 255, a = (m >> 19) & 63;
    if (mode === MODE_CAPTURE || mode === MODE_STAY || mode === MODE_SUICIDE) {
      const t = S.top[to];
      let vic = OVAL[S.kind[t]] + (S.hero[t] ? 10 : 0);
      const c1 = S.c1[t]; if (c1 >= 0) { vic += OVAL[S.kind[c1]] + (S.hero[c1] ? 10 : 0); const c2 = S.c2[t]; if (c2 >= 0) vic += OVAL[S.kind[c2]] + (S.hero[c2] ? 10 : 0); }
      let att = OVAL[S.kind[a]]; if (att > 99) att = 99;
      if (mode === MODE_SUICIDE) { vic -= 40; if (vic <= 0) { sc[i] = 1000 + vic; continue; } }
      sc[i] = 100000 + vic * 128 - att;
      continue;
    }
    const k = S.kind[a], d = P[k * NSQ + to] - P[k * NSQ + from];
    if (mode === MODE_COMBINE) { sc[i] = 25000 + d * 10; continue; }
    let s = 20000 + d * 10 + (histTab[hb + from * NSQ + to] >> 2);
    if (m === ka) s += 9000; else if (m === kb) s += 8000;
    sc[i] = s;
  }
}

function qsearch(S, alpha, beta, ply) {
  tick();
  if (ply >= MAXPLY) return evaluate(S);
  const me = S.turn;
  if (CC.inCheck(S, me)) return search(S, 1, alpha, beta, ply);
  let best = evaluate(S);
  if (best >= beta) return best;
  if (best > alpha) alpha = best;
  const moves = QB[ply], sc = QS[ply]; moves.length = 0;
  CC.gen(S, moves, true);
  let n = moves.length; if (!n) return best;
  scoreMoves(S, moves, n, sc, ply, 0, me, false);
  for (let i = 0; i < n; i++) {
    let bi = i, bs = sc[i];
    for (let j = i + 1; j < n; j++) if (sc[j] > bs) { bs = sc[j]; bi = j; }
    const m = moves[bi]; moves[bi] = moves[i]; moves[i] = m; sc[bi] = sc[i]; sc[i] = bs;
    const mode = (m >> 16) & 7;
    if (mode === MODE_INTERCEPT) continue;
    if (mode === MODE_SUICIDE && bs < 100000) continue;
    if (bs < 100000 + 0) { /* not a capture-like move */ continue; }
    // delta pruning: even winning the victim cannot lift us to alpha
    const victim = ((bs - 100000) >> 7) * 10;     // approximate victim value in cp
    if (best + victim + 250 < alpha) continue;
    const T = copyState(bufFor(POOL, ply, S), S);
    if (!CC.play(T, m, false) || CC.exposed(T)) continue;
    let sco;
    if (T.over) sco = overScore(T, me, ply + 1);
    else if (T.turn === me) sco = search(T, 0, alpha, beta, ply + 1);
    else sco = -qsearch(T, -beta, -alpha, ply + 1);
    if (sco > best) { best = sco; if (sco > alpha) { alpha = sco; if (sco >= beta) return sco; } }
  }
  return best;
}

function search(S, depth, alpha, beta, ply) {
  tick();
  const inSession = S.dOrg >= 0;
  if (depth <= 0 && !inSession) return qsearch(S, alpha, beta, ply);
  if (ply >= MAXPLY) return evaluate(S);
  hashOf(S);
  const h1 = H1, h2 = H2;
  if (!inSession) {
    if (ply > 0) {
      let rep = histMap.get(hkey(h1, h2)) || 0;
      for (let j = 1; j < ply; j++) if (pathH1[j] === h1 && pathH2[j] === h2) rep++;
      if (rep >= 2) return repScore(S, ply);
    }
  }
  pathH1[ply] = h1; pathH2[ply] = h2;
  const me = S.turn, pv = beta - alpha > 1;
  const idx = h1 & TT_MASK;
  let ttMove = 0;
  if (ttK1[idx] === h1 && ttK2[idx] === h2) {
    ttMove = ttMv[idx];
    const info = ttDF[idx];
    if ((info >> 2) >= depth && !pv) {
      let s = ttSc[idx];
      if (s > WIN - 1000) s -= ply; else if (s < -(WIN - 1000)) s += ply;
      const fl = info & 3;
      if (fl === F_EXACT) return s;
      if (fl === F_LOWER && s >= beta) return s;
      if (fl === F_UPPER && s <= alpha) return s;
    }
  }
  const chk = CC.inCheck(S, me);
  let stat = -INF;
  if (!pv && !chk && !inSession && depth <= 3) {
    stat = evaluate(S);
    // reverse futility: far above beta at low depth
    if (USE_NULL && depth <= 2 && stat - 220 * depth >= beta && beta > -WIN + 1000 && beta < WIN - 1000) return stat - 220 * depth;
  }
  // null move: give the move away and see whether the position is still too good
  if (USE_NULL && !pv && !chk && !inSession && depth >= 3 && stat >= beta && stat > -INF && beta < WIN - 1000 && ply > 0) {
    const T = copyState(bufFor(NPOOL, ply, S), S); T.turn = 1 - me;
    const sco = -search(T, depth - 1 - NULL_R, -beta, -beta + 1, ply + 1);
    if (sco >= beta) return sco >= WIN - 1000 ? beta : sco;
  }
  const moves = MB[ply], sc = MS[ply]; moves.length = 0;
  CC.gen(S, moves, false);
  let n = moves.length;
  if (n > 1) {
    let w = 0;
    if (inSession) { for (let i = 0; i < n; i++) { const m = moves[i], md = (m >> 16) & 7; if (md === MODE_COMMIT || md === MODE_CAPTURE || md === MODE_STAY || md === MODE_SUICIDE) moves[w++] = m; } }
    else for (let i = 0; i < n; i++) { const m = moves[i]; if (((m >> 16) & 7) !== MODE_INTERCEPT) moves[w++] = m; }
    if (w > 0) { moves.length = w; n = w; }
  }
  scoreMoves(S, moves, n, sc, ply, ttMove, me, true);
  let best = -INF, bestMove = 0, flag = F_UPPER, first = true, tried = 0;
  const a0 = alpha;
  if (USE_FUT && !pv && !chk && !inSession && depth <= 2 && stat === -INF) stat = evaluate(S);
  for (let i = 0; i < n; i++) {
    let bi = i, bs = sc[i];
    for (let j = i + 1; j < n; j++) if (sc[j] > bs) { bs = sc[j]; bi = j; }
    const m = moves[bi]; moves[bi] = moves[i]; moves[i] = m; sc[bi] = sc[i]; sc[i] = bs;
    const T = copyState(bufFor(POOL, ply, S), S);
    if (!CC.play(T, m, false) || CC.exposed(T)) continue;
    let sco;
    if (T.over) sco = overScore(T, me, ply + 1);
    else {
      const same = T.turn === me;
      const mode = (m >> 16) & 7;
      const quiet = mode === MODE_MOVE || mode === MODE_COMBINE;
      let nd = depth, gives = false;
      if (!same) { nd = depth - 1; gives = CC.inCheck(T, T.turn); if (gives && ply < 2 * MAXPLY / 3) nd++; }
      if (USE_FUT && !first && quiet && !same && !gives && !chk && !pv && !inSession && depth <= 2 && stat > -INF && alpha > -WIN + 1000) {
        if (stat + (depth === 1 ? FUT1 : FUT2) <= alpha) { tried++; continue; }
      }
      let red = 0;
      if (USE_LMR && !first && quiet && !same && !gives && !chk && depth >= 3 && tried >= 3 && sc[i] < 30000) red = tried >= 8 && depth >= 5 ? 2 : 1;
      if (first) sco = same ? search(T, nd, alpha, beta, ply + 1) : -search(T, nd, -beta, -alpha, ply + 1);
      else {
        sco = same ? search(T, nd, alpha, alpha + 1, ply + 1) : -search(T, nd - red, -alpha - 1, -alpha, ply + 1);
        if (red && sco > alpha) sco = -search(T, nd, -alpha - 1, -alpha, ply + 1);
        if (sco > alpha && sco < beta) sco = same ? search(T, nd, alpha, beta, ply + 1) : -search(T, nd, -beta, -alpha, ply + 1);
      }
    }
    first = false; tried++;
    if (sco > best) {
      best = sco; bestMove = m;
      if (sco > alpha) {
        alpha = sco; flag = F_EXACT;
        if (sco >= beta) {
          flag = F_LOWER;
          const mode = (m >> 16) & 7;
          if (mode === MODE_MOVE || mode === MODE_COMBINE) {
            if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
            histTab[me * NSQ * NSQ + (m & 255) * NSQ + ((m >> 8) & 255)] += depth * depth;
          }
          break;
        }
      }
    }
  }
  if (first) return -(WIN - ply);            // nothing could be played: the side has lost
  let s = best;
  if (s > WIN - 1000) s += ply; else if (s < -(WIN - 1000)) s -= ply;
  const old = ttDF[idx];
  if (ttK1[idx] !== h1 || ttK2[idx] !== h2 || (old >> 2) <= depth) {
    ttK1[idx] = h1; ttK2[idx] = h2; ttMv[idx] = bestMove; ttSc[idx] = s; ttDF[idx] = (depth << 2) | flag;
  }
  return best;
}

/* ───────────── the root ───────────── */
function choose(S, legal, ctx, budget) {
  CTX = ctx; nodes = 0;
  const t0 = ctx.timeLeft(); stopLeft = t0 - budget;
  let moves = legal.filter(m => CC.mMode(m) !== CC.INTERCEPT); if (!moves.length) moves = legal.slice();
  if (moves.length === 1) return moves[0];
  const me = S.turn, n = moves.length, sc = new Array(n).fill(0);
  histTab.fill(0); killers.fill(0);
  const tmp = new Array(n).fill(0), ordSc = new Array(n);
  scoreMoves(S, moves, n, ordSc, 0, 0, me, true);
  for (let i = 0; i < n; i++) { const mode = CC.mMode(moves[i]); if (mode === MODE_MOVE || mode === MODE_COMBINE) ordSc[i] += ctx.random() * 25; }
  const order = moves.map((m, i) => i).sort((x, y) => ordSc[y] - ordSc[x]);
  let list = order.map(i => moves[i]);
  let bestMove = list[0], bestScore = -INF, depthDone = 0, iterBest = 0, iterScore = -INF;
  try {
    for (let depth = 1; depth <= 40; depth++) {
            let alpha = -INF; iterBest = 0; iterScore = -INF;
      const scores = new Array(n).fill(-INF);
      for (let i = 0; i < n; i++) {
        const m = list[i], T = CC.clone(S);
        if (!CC.play(T, m, false)) { scores[i] = -INF; continue; }
        let sco;
        if (T.over) sco = overScore(T, me, 1);
        else {
          const same = T.turn === me; let nd = depth;
          if (!same) { nd = depth - 1; if (CC.inCheck(T, T.turn)) nd++; }
          if (iterBest === 0) sco = same ? search(T, nd, alpha, INF, 1) : -search(T, nd, -INF, -alpha, 1);
          else {
            sco = same ? search(T, nd, alpha, alpha + 1, 1) : -search(T, nd, -alpha - 1, -alpha, 1);
            if (sco > alpha) sco = same ? search(T, nd, alpha, INF, 1) : -search(T, nd, -INF, -alpha, 1);
          }
        }
        scores[i] = sco;
        if (sco > iterScore) { iterScore = sco; iterBest = m; if (sco > alpha) alpha = sco; }
      }
      bestMove = iterBest; bestScore = iterScore; depthDone = depth;
      const idxs = list.map((m, i) => i).sort((x, y) => scores[y] - scores[x]);
      list = idxs.map(i => list[i]);
      if (bestScore > WIN - 2000 || bestScore < -(WIN - 2000)) break;
    }
  } catch (e) { if (e !== TIMEOUT) throw e; if (iterBest) { bestMove = iterBest; bestScore = iterScore; } }
  return bestMove;
}

function rebuildHistory(seen) {
  histMap.clear();
  if (parsedKeys.size > 3000) parsedKeys.clear();
  for (const key in seen) {
    let hk = parsedKeys.get(key);
    if (hk === undefined) { hashFromKey(key); hk = hkey(H1, H2); parsedKeys.set(key, hk); }
    histMap.set(hk, (histMap.get(hk) || 0) + seen[key]);
  }
}

/* a move that needs no thought, for the day something unexpected goes wrong inside the search */
function quickMove(S, legal, ctx) {
  let best = legal[0], bs = -Infinity;
  for (const m of legal) {
    const mode = CC.mMode(m); if (mode === CC.INTERCEPT) continue;
    let g = 0;
    if (mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE) { for (const p of CC.members(S, CC.mTo(m))) g += CC.POINTS[S.kind[p]]; if (mode === CC.SUICIDE) g -= 40; }
    g += ctx.random();
    if (g > bs) { bs = g; best = m; }
  }
  return best;
}

/* a new game: forget what the table learned in the last one */
function newGame() {
  ttK1.fill(0); ttK2.fill(0); ttDF.fill(0); ttMv.fill(0); ttSc.fill(0);
  histTab.fill(0); killers.fill(0); histMap.clear();
}

registerAI({
  id: 'quan-su',
  name: 'Quân Sư',
  author: 'Claude Sonnet 5.5',
  about: 'A calculating tactician: it looks several moves ahead, takes what is free, trades when it is ahead on points, ' +
    'guards its Commander and hunts the last ship and plane of the other side. Ahead on points it will take a repetition; ' +
    'behind, it avoids one.',
  turn(S, ctx) {
    const me = S.turn, moves = [];
    if (S.full <= 1) { try { newGame(); } catch (e) { /* the table stays as it was */ } }   // the first move of a game
    try { rebuildHistory(ctx.seen); } catch (e) { histMap.clear(); }
    while (!S.over && S.turn === me) {
      const legal = CC.legalMoves(S);
      if (!legal.length) break;
      const left = ctx.timeLeft();
      const budget = Math.max(1, left * (moves.length === 0 ? 0.8 : 0.5) - 3);
      let m;
      try { m = choose(S, legal, ctx, budget); } catch (e) { m = quickMove(S, legal, ctx); }
      moves.push(m);
      CC.play(S, m, true);
    }
    return moves;
  },
});
