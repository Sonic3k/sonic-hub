/* Commander Chess (Cờ Tư Lệnh) — computer players for AI kit 2 (rules of 752c960 2026-11-17).
   One player, one level: Du Kích (a move or two ahead, counts men). */
'use strict';

/* ── An early build of the strong player, its search and judgement kept as they were ──
   An alpha-beta search played on the engine's own positions, with the captures played out at the end of every
   line. Its judgement is the first one the strong player had, a count: men, where they stand, and in a game of
   battles the arms that are running out. It knows nothing else.
   What sets a player of this build apart is in player():
     looks   how many positions it may look at in a turn. The first move of every line is always looked at, with
             what can be taken right after it; deeper only while there are looks left.
     noise   how far two first moves may differ and still be the same to it (turns 1-4, 5-8, later), so that no
             two games go alike. */
const NSQ = CC.NSQ;
const MOVE = CC.MOVE, CAPTURE = CC.CAPTURE, STAY = CC.STAY, SUICIDE = CC.SUICIDE, INTERCEPT = CC.INTERCEPT, COMBINE = CC.COMBINE, COMMIT = CC.COMMIT, COMMIT_MOVE = CC.COMMIT_MOVE;
const K_C = CC.COMMANDER, K_I = CC.INFANTRY, K_T = CC.TANK, K_M = CC.MILITIA, K_E = CC.ENGINEER, K_A = CC.ARTILLERY, K_G = CC.ANTIAIR, K_S = CC.MISSILE, K_F = CC.AIR, K_N = CC.NAVY, K_H = CC.HQ;

const MAXPLY = 96, MAXMOVES = 1024, PVW = MAXPLY + 2;
const INF = 32000, MATE = 30000, MATE_BOUND = 29000;
const EMPTY = [];

/* ── evaluation tables ── */
const VAL = new Int32Array([0, 100, 200, 100, 100, 300, 120, 240, 420, 800, 90]);
const HEROV = new Int32Array([0, 40, 70, 40, 30, 80, 40, 60, 220, 120, 60]);
const ARM = new Int8Array([-1, 2, 2, -1, -1, 2, -1, -1, 1, 0, -1]);
const PST = [new Int16Array(11 * NSQ), new Int16Array(11 * NSQ)];
(function buildPST() {
  const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
  for (let s = 0; s < NSQ; s++) {
    const f = s % 11, r = ((s / 11) | 0) + 1;
    const cen = 3 - Math.min(3, Math.abs(f - 6));           // 0..3, centre of the land is file g
    const v = new Int16Array(11);
    v[K_I] = 3 * cl(r - 5, -2, 4) + cen;
    v[K_E] = 2 * cl(r - 5, -2, 3);
    v[K_M] = 3 * cl(r - 5, -2, 4) + cen;
    v[K_T] = 5 * cl(r - 4, -2, 5) + 2 * cen;
    v[K_A] = [0, -10, -10, 0, 8, 16, 20, 20, 15, 15, 10, 10, 10][r];
    v[K_G] = [0, -6, -6, -2, 0, 6, 10, 10, 8, 6, 4, 4, 4][r];
    v[K_S] = [0, -8, -4, 0, 6, 8, 6, 2, 0, 0, 0, 0, 0][r] + cen;
    v[K_F] = 0;
    v[K_N] = 3 * cl(r - 3, -1, 5);
    v[K_C] = r === 1 ? 10 : r === 2 ? 5 : r === 3 ? -5 : -15 * (r - 3);
    v[K_H] = 0;
    const sb = (12 - r) * 11 + f;                            // the same point seen from Blue's side
    for (let k = 0; k < 11; k++) { PST[0][k * NSQ + s] = v[k]; PST[1][k * NSQ + sb] = v[k]; }
  }
})();

/* ── Zobrist keys ── */
let zs = 0x9E3779B9 | 0;
function zrand() { zs ^= zs << 13; zs ^= zs >>> 17; zs ^= zs << 5; return zs | 0; }
const Z1 = new Int32Array(11 * 4 * NSQ), Z2 = new Int32Array(11 * 4 * NSQ);
for (let i = 0; i < Z1.length; i++) { Z1[i] = zrand(); Z2[i] = zrand(); }
const ZT1 = zrand(), ZT2 = zrand();
const ZD1 = new Int32Array(NSQ), ZD2 = new Int32Array(NSQ), ZA1 = new Int32Array(64), ZA2 = new Int32Array(64);
for (let i = 0; i < NSQ; i++) { ZD1[i] = zrand(); ZD2[i] = zrand(); }
for (let i = 0; i < 64; i++) { ZA1[i] = zrand(); ZA2[i] = zrand(); }
const ZG1 = [zrand(), zrand(), zrand(), zrand()], ZG2 = [zrand(), zrand(), zrand(), zrand()];
const ZH1 = new Int32Array(128), ZH2 = new Int32Array(128);
for (let i = 0; i < 128; i++) { ZH1[i] = zrand(); ZH2[i] = zrand(); }

/* ── transposition table ── */
const TT_BITS = 15, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const ttKey = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttInfo = new Int32Array(TT_SIZE);
let ttGen = 1;
const FL_EXACT = 1, FL_LOWER = 2, FL_UPPER = 3;
function ttStore(ti, h2, move, score, depth, flag, ply) {
  const old = ttInfo[ti];
  if (ttKey[ti] === h2 && (old & 63) === ttGen && ((old >> 8) & 255) > depth + 2 && flag !== FL_EXACT) { if (move && !ttMove[ti]) ttMove[ti] = move; return; }
  if (score > MATE_BOUND) score += ply; else if (score < -MATE_BOUND) score -= ply;
  if (!move && ttKey[ti] === h2) move = ttMove[ti];
  ttKey[ti] = h2; ttMove[ti] = move; ttInfo[ti] = (score << 16) | ((depth & 255) << 8) | (flag << 6) | ttGen;
}

/* ── search state ── */
let N = 0;                       // pieces in the game the pool is built for
let pool = [], poolAll = [];
const genBuf = [], qBuf = [];
for (let i = 0; i < MAXPLY + 2; i++) { genBuf.push([]); qBuf.push([]); }
const tmpBuf = [];
const mvList = new Int32Array((MAXPLY + 2) * MAXMOVES), mvScore = new Int32Array((MAXPLY + 2) * MAXMOVES);
const hash1 = new Int32Array(MAXPLY + 4), hash2 = new Int32Array(MAXPLY + 4);
const killer1 = new Int32Array(MAXPLY + 4), killer2 = new Int32Array(MAXPLY + 4);
const history = new Int32Array(2 * NSQ * NSQ);
const pvTab = new Int32Array((MAXPLY + 2) * PVW), pvLen = new Int32Array(MAXPLY + 2);
const LMR = new Int8Array(64 * 64);
for (let d = 1; d < 64; d++) for (let i = 1; i < 64; i++) LMR[d * 64 + i] = Math.floor(0.4 + Math.log(d) * Math.log(i) / 2.3);
let histSeen = new Map(), histAny = new Uint8Array(4096);
let LOOKS = 1, NOISE = [0, 0, 0];        // of the player whose turn it is: see player()
let nodes = 0, tick = 0, stopFlag = false, deadline = 0, clockFn = null, salt1 = 0, salt2 = 0, maxNodes = 0;
let H1 = 0, H2 = 0;

function buildPool(S) {
  N = S.n; pool = []; poolAll = [];
  const n = S.n, offAt = (NSQ + 4 * n + 1) & ~1;
  for (let i = 0; i < MAXPLY + 4; i++) {
    const buf = new ArrayBuffer(offAt + 2 * n);
    pool.push({ n, kind: S.kind, own: S.own, cmd: S.cmd, total: S.total, had: S.had, men: S.men,
      top: new Int8Array(buf, 0, NSQ), at: new Int16Array(buf, offAt, n), car: new Int8Array(buf, NSQ, n), c1: new Int8Array(buf, NSQ + n, n), c2: new Int8Array(buf, NSQ + 2 * n, n), hero: new Uint8Array(buf, NSQ + 3 * n, n),
      turn: 0, half: 0, full: 1, over: null, dOrg: -1, dAct: EMPTY, dIrr: 0, ad: [null, null], log: null });
    poolAll.push(new Uint8Array(buf));
  }
}
function setRoot(S) {
  if (S.n !== N || !pool.length) buildPool(S);
  const d = pool[0];
  for (let i = 0; i < pool.length; i++) { const q = pool[i]; q.kind = S.kind; q.own = S.own; q.cmd = S.cmd; q.total = S.total; q.had = S.had; q.men = S.men; }
  d.top.set(S.top); d.at.set(S.at); d.car.set(S.car); d.c1.set(S.c1); d.c2.set(S.c2); d.hero.set(S.hero);
  d.turn = S.turn; d.half = S.half; d.full = S.full; d.over = S.over; d.dOrg = S.dOrg; d.dAct = S.dAct.length ? S.dAct.slice() : EMPTY; d.dIrr = S.dIrr; d.ad[0] = d.ad[1] = null;
  const g = (S.total ? 1 : 0) + (S.n === 38 ? 0 : 2); salt1 = ZG1[g]; salt2 = ZG2[g];
}
/** the position after move m at ply, in pool[ply + 1]; null if the rules refuse it */
function makeChild(ply, m) {
  const s = pool[ply], d = pool[ply + 1];
  poolAll[ply + 1].set(poolAll[ply]);
  d.turn = s.turn; d.half = s.half; d.full = s.full; d.over = null; d.dOrg = s.dOrg; d.dAct = s.dOrg >= 0 ? s.dAct.slice() : EMPTY; d.dIrr = s.dIrr; d.ad[0] = null; d.ad[1] = null;
  if (--tick < 0) { tick = 16; if (nodes >= maxNodes || clockFn() <= deadline) stopFlag = true; }
  return CC.play(d, m, true) ? d : null;
}
function hashOf(S) {
  let a = salt1, b = salt2;
  const at = S.at, kind = S.kind, own = S.own, hero = S.hero, n = S.n;
  for (let p = 0; p < n; p++) { const s = at[p]; if (s < 0) continue; const i = ((kind[p] << 2) | (own[p] << 1) | hero[p]) * NSQ + s; a ^= Z1[i]; b ^= Z2[i]; }
  if (S.turn) { a ^= ZT1; b ^= ZT2; }
  if (S.dOrg >= 0) { a ^= ZD1[S.dOrg]; b ^= ZD2[S.dOrg]; const act = S.dAct; for (let j = 0; j < act.length; j++) { a ^= ZA1[act[j]]; b ^= ZA2[act[j]]; } }
  if (S.half >= 70) { a ^= ZH1[S.half]; b ^= ZH2[S.half]; }
  H1 = a; H2 = b;
}

/* ── evaluation: from the side to move ── */
function evaluate(S) {
  const at = S.at, kind = S.kind, own = S.own, hero = S.hero, n = S.n;
  let sc = 0;
  let nv0 = 0, nv1 = 0, ar0 = 0, ar1 = 0, ld0 = 0, ld1 = 0;
  for (let p = 0; p < n; p++) {
    const s = at[p]; if (s < 0) continue;
    const k = kind[p];
    let v = VAL[k]; if (hero[p]) v += HEROV[k];
    if (own[p]) { sc -= v + PST[1][k * NSQ + s]; if (k === K_N) nv1++; else if (k === K_F) ar1++; else if (ARM[k] === 2) ld1++; }
    else { sc += v + PST[0][k * NSQ + s]; if (k === K_N) nv0++; else if (k === K_F) ar0++; else if (ARM[k] === 2) ld0++; }
  }
  if (!S.total) {
    if (nv0 === 1) sc -= 250; if (nv1 === 1) sc += 250;
    if (ar0 === 1) sc -= 250; if (ar1 === 1) sc += 250;
    if (ld0 <= 2) sc -= 150 * (3 - ld0); if (ld1 <= 2) sc += 150 * (3 - ld1);
  }
  return (S.turn ? -sc : sc) + 8;
}
function stackValue(S, s) {
  const t = S.top[s]; if (t < 0) return 0;
  let v = VAL[S.kind[t]] + (S.kind[t] === K_C ? 5000 : 0);
  const a = S.c1[t]; if (a >= 0) { v += VAL[S.kind[a]] + (S.kind[a] === K_C ? 5000 : 0); const b = S.c2[t]; if (b >= 0) v += VAL[S.kind[b]] + (S.kind[b] === K_C ? 5000 : 0); }
  return v;
}
function terminal(over, me, ply) { const w = over.winner; return w < 0 ? 0 : w === me ? MATE - ply : -(MATE - ply); }
function pointsScore(S, me, ply) { const pts = CC.points(S); return pts[me] > pts[1 - me] ? MATE - ply : pts[me] < pts[1 - me] ? -(MATE - ply) : 0; }

/* how often has this position (hash at ply) stood before: in the game, and on the way here */
function repeats(ply) {
  const a = hash1[ply], b = hash2[ply];
  let c = histAny[a & 4095] ? (histSeen.get(a * 4294967296 + (b >>> 0)) || 0) : 0;
  for (let j = ply - 2; j >= 1; j--) if (hash1[j] === a && hash2[j] === b) c++;
  return c;
}

/* ── move ordering ── */
function scoreMoves(S, ply, buf, ttm) {
  const base = ply * MAXMOVES, me = S.turn, hbase = me * NSQ * NSQ;
  let n = 0;
  const k1 = killer1[ply], k2 = killer2[ply];
  for (let i = 0; i < buf.length; i++) {
    const m = buf[i], mode = (m >> 16) & 7;
    let sc;
    if (mode === INTERCEPT) continue;
    if (m === ttm) sc = 1 << 30;
    else if (mode === CAPTURE || mode === STAY) sc = (1 << 24) + stackValue(S, (m >> 8) & 255) * 16 - VAL[S.kind[(m >> 19) & 63]];
    else if (mode === SUICIDE) { const g = stackValue(S, (m >> 8) & 255) - VAL[K_F]; sc = g >= 0 ? (1 << 24) + g * 16 : -(1 << 22) + g; }
    else if (m === k1) sc = (1 << 22) + 2;
    else if (m === k2) sc = (1 << 22) + 1;
    else if (mode === COMMIT) sc = (1 << 22);
    else sc = history[hbase + (m & 255) * NSQ + ((m >> 8) & 255)];
    mvList[base + n] = m; mvScore[base + n] = sc; n++;
  }
  return n;
}
function pickMove(base, i, n) {
  let bi = i, bs = mvScore[base + i];
  for (let j = i + 1; j < n; j++) if (mvScore[base + j] > bs) { bs = mvScore[base + j]; bi = j; }
  if (bi !== i) { const m = mvList[base + bi]; mvList[base + bi] = mvList[base + i]; mvList[base + i] = m; mvScore[base + bi] = mvScore[base + i]; mvScore[base + i] = bs; }
  return mvList[base + i];
}
function genCaptures(S, out) {
  if (S.dOrg >= 0) { CC.genSquare(S, S.dOrg, out, true); return out; }
  const at = S.at, own = S.own, car = S.car, c1 = S.c1, n = S.n, me = S.turn;
  for (let p = 0; p < n; p++) {
    if (own[p] !== me || at[p] < 0 || car[p] >= 0) continue;
    if (c1[p] < 0) CC.genSquare(S, at[p], out, true);
    else { tmpBuf.length = 0; CC.genSquare(S, at[p], tmpBuf, false); for (let i = 0; i < tmpBuf.length; i++) { const md = (tmpBuf[i] >> 16) & 7; if (md === CAPTURE || md === STAY || md === SUICIDE) out.push(tmpBuf[i]); } }
  }
  return out;
}

/* ── quiescence ── */
const QMAX = 10;
function qsearch(ply, alpha, beta, qd) {
  const S = pool[ply], me = S.turn;
  nodes++;
  if (stopFlag) return 0;
  if (ply >= MAXPLY - 2) return evaluate(S);
  const session = S.dOrg >= 0;
  const h1 = hash1[ply], h2 = hash2[ply], ti = h1 & TT_MASK, alpha0 = alpha;
  let ttm = 0;
  if (ttKey[ti] === h2) {
    const info = ttInfo[ti]; ttm = ttMove[ti];
    if ((info & 63) === ttGen) {
      let v = (info >> 16); const fl = (info >> 6) & 3;
      if (v > MATE_BOUND) v -= ply; else if (v < -MATE_BOUND) v += ply;
      if (fl === FL_EXACT || (fl === FL_LOWER && v >= beta) || (fl === FL_UPPER && v <= alpha)) return v;
    }
  }
  let best = -INF, bestMove = 0, n = 0, all = false;
  const base = ply * MAXMOVES, buf = qBuf[ply];
  if (session) {
    /* in a deployment: end it here, or go on taking */
    const c = makeChild(ply, COMMIT_MOVE);
    if (c) {
      let v;
      if (c.over) v = terminal(c.over, me, ply + 1);
      else { hashOf(c); hash1[ply + 1] = H1; hash2[ply + 1] = H2; v = -qsearch(ply + 1, -beta, -alpha, qd + 1); }
      best = v; bestMove = COMMIT_MOVE; if (v >= beta) return v; if (v > alpha) alpha = v;
    }
    buf.length = 0;
    if (qd < QMAX) CC.genSquare(S, S.dOrg, buf, true);
  } else {
    const inChk = CC.inCheck(S, me);
    if (inChk && qd <= 1) { all = true; buf.length = 0; CC.gen(S, buf); }
    else {
      const stand = evaluate(S);
      if (stand >= beta || qd >= QMAX) return stand;
      best = stand; if (stand > alpha) alpha = stand;
      buf.length = 0; genCaptures(S, buf);
    }
  }
  if (all) n = scoreMoves(S, ply, buf, ttm);
  else for (let i = 0; i < buf.length; i++) {
    const m = buf[i], mode = (m >> 16) & 7; if (mode === INTERCEPT) continue;
    let g = stackValue(S, (m >> 8) & 255); if (mode === SUICIDE) g -= VAL[K_F];
    mvList[base + n] = m; mvScore[base + n] = m === ttm ? 1 << 30 : g * 16 - VAL[S.kind[(m >> 19) & 63]]; n++;
  }
  let legal = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const m = pickMove(base, i, n);
      const d = makeChild(ply, m); if (!d) continue;
      let v;
      if (d.over) v = terminal(d.over, me, ply + 1);
      else {
        hashOf(d); hash1[ply + 1] = H1; hash2[ply + 1] = H2;
        if (d.turn === me) { v = qsearch(ply + 1, alpha, beta, qd + 1); if (v <= -INF) continue; }
        else v = -qsearch(ply + 1, -beta, -alpha, qd + 1);
      }
      legal++;
      if (stopFlag) return 0;
      if (v > best) { best = v; bestMove = m; if (v > alpha) { alpha = v; if (v >= beta) break; } }
    }
    if (!session || best > -INF || pass === 1) break;
    /* a deployment with neither an end nor a capture: any way out of it */
    buf.length = 0; CC.genSquare(S, S.dOrg, buf, false); n = 0;
    for (let i = 0; i < buf.length; i++) { const m = buf[i], md = (m >> 16) & 7; if (md !== MOVE && md !== COMBINE) continue; mvList[base + n] = m; mvScore[base + n] = 0; n++; }
  }
  if (all && !legal) return -(MATE - ply);
  if (session && best <= -INF) return -INF;
  if (qd < QMAX - 2) ttStore(ti, h2, bestMove, best, 0, best >= beta ? FL_LOWER : best > alpha0 ? FL_EXACT : FL_UPPER, ply);
  return best;
}

/* ── the main search ── */
const quietsTried = new Int32Array((MAXPLY + 2) * 64);
function search(ply, depth, alpha, beta) {
  if (depth <= 0) return qsearch(ply, alpha, beta, 0);
  const S = pool[ply], me = S.turn, pv = beta - alpha > 1;
  nodes++; pvLen[ply] = 0;
  if (stopFlag) return 0;
  if (ply >= MAXPLY - 2) return evaluate(S);
  const h1 = hash1[ply], h2 = hash2[ply], ti = h1 & TT_MASK;
  let ttm = 0;
  if (ttKey[ti] === h2) {
    const info = ttInfo[ti]; ttm = ttMove[ti];
    if (!pv && (info & 63) === ttGen && ((info >> 8) & 255) >= depth) {
      let v = (info >> 16); const fl = (info >> 6) & 3;
      if (v > MATE_BOUND) v -= ply; else if (v < -MATE_BOUND) v += ply;
      if (fl === FL_EXACT || (fl === FL_LOWER && v >= beta) || (fl === FL_UPPER && v <= alpha)) return v;
    }
  }
  const session = S.dOrg >= 0;
  const inChk = session ? false : CC.inCheck(S, me);
  let stat = -INF;
  if (!inChk && !session) {
    stat = evaluate(S);
    if (!pv && beta > -MATE_BOUND && beta < MATE_BOUND) {
      /* far enough ahead that a quiet reply will not change it */
      if (depth <= 2 && stat - 130 * depth >= beta) return stat;
      /* null move */
      if (depth >= 3 && stat >= beta) {
        const d = pool[ply + 1];
        poolAll[ply + 1].set(poolAll[ply]);
        d.turn = 1 - me; d.half = S.half; d.full = S.full; d.over = null; d.dOrg = -1; d.dAct = EMPTY; d.dIrr = 0; d.ad[0] = null; d.ad[1] = null;
        hash1[ply + 1] = h1 ^ ZT1; hash2[ply + 1] = h2 ^ ZT2;
        const R = 3 + (depth >> 2);
        const v = -search(ply + 1, depth - 1 - R, -beta, -beta + 1);
        if (stopFlag) return 0;
        if (v >= beta) return v < MATE_BOUND ? v : beta;
      }
    }
  }
  if (depth >= 4 && !ttm) depth--;
  const buf = genBuf[ply]; buf.length = 0; CC.gen(S, buf);
  const n = scoreMoves(S, ply, buf, ttm), base = ply * MAXMOVES;
  let best = -INF, bestMove = 0, legal = 0, flag = FL_UPPER, quiets = 0;
  const hbase = me * NSQ * NSQ, qb = ply * 64;
  const prune = !pv && !inChk && !session && alpha > -MATE_BOUND;
  for (let i = 0; i < n; i++) {
    const m = pickMove(base, i, n), mode = (m >> 16) & 7;
    const d = makeChild(ply, m); if (!d) continue;
    let v;
    const quiet = mode === MOVE || mode === COMBINE || mode === COMMIT;
    if (d.over) { v = terminal(d.over, me, ply + 1); legal++; }
    else {
      const same = d.turn === me;
      hashOf(d); hash1[ply + 1] = H1; hash2[ply + 1] = H2;
      if (!same && quiet && repeats(ply + 1) >= 2) { v = pointsScore(d, me, ply + 1); legal++; }
      else {
        const nd = mode === COMMIT ? depth : depth - 1;
        let red = 0;
        if (quiet && legal > 0) {
          /* does it check, or make a hero? then it is not a quiet move after all */
          const sharp = !same && (d.half === 0 && mode === MOVE || CC.inCheck(d, 1 - me));
          if (!sharp) {
            if (prune && best > -MATE_BOUND) {
              if (depth <= 3 && quiets >= 5 + 5 * depth * depth) { legal++; quiets++; continue; }
              if (depth <= 2 && stat + 90 + 110 * depth <= alpha) { legal++; quiets++; continue; }
            }
            if (depth >= 3 && !inChk && quiets >= 2) {
              red = LMR[(depth < 63 ? depth : 63) * 64 + (quiets < 63 ? quiets : 63)];
              if (pv) red--;
              if (m === killer1[ply] || m === killer2[ply]) red--;
              if (red > nd - 1) red = nd - 1; if (red < 0) red = 0;
            }
          }
        }
        if (same) {
          if (legal === 0) v = search(ply + 1, nd, alpha, beta);
          else {
            v = search(ply + 1, nd - red, alpha, alpha + 1);
            if (v > alpha && red > 0) v = search(ply + 1, nd, alpha, alpha + 1);
            if (v > alpha && v < beta) v = search(ply + 1, nd, alpha, beta);
          }
          if (v <= -INF) continue;                              // a deployment that cannot be ended
        } else if (legal === 0) v = -search(ply + 1, nd, -beta, -alpha);
        else {
          v = -search(ply + 1, nd - red, -alpha - 1, -alpha);
          if (v > alpha && red > 0) v = -search(ply + 1, nd, -alpha - 1, -alpha);
          if (v > alpha && v < beta) v = -search(ply + 1, nd, -beta, -alpha);
        }
        legal++;
      }
    }
    if (stopFlag) return 0;
    if (quiet) { if (quiets < 64) quietsTried[qb + quiets] = m; quiets++; }
    if (v > best) {
      best = v; bestMove = m;
      if (v > alpha) {
        alpha = v; flag = FL_EXACT;
        const pb = ply * PVW, cb = (ply + 1) * PVW, cl = d.over ? 0 : pvLen[ply + 1];
        pvTab[pb] = m; for (let j = 0; j < cl; j++) pvTab[pb + 1 + j] = pvTab[cb + j]; pvLen[ply] = cl + 1;
        if (v >= beta) {
          flag = FL_LOWER;
          if (quiet && mode !== COMMIT) {
            if (killer1[ply] !== m) { killer2[ply] = killer1[ply]; killer1[ply] = m; }
            const bonus = depth * depth;
            const hi = hbase + (m & 255) * NSQ + ((m >> 8) & 255); history[hi] += bonus - (history[hi] * bonus >> 12);
            const qn = quiets - 1 < 64 ? quiets - 1 : 64;
            for (let j = 0; j < qn; j++) { const q = quietsTried[qb + j]; if (q === m || q === COMMIT_MOVE) continue; const qi = hbase + (q & 255) * NSQ + ((q >> 8) & 255); history[qi] -= bonus + (history[qi] * bonus >> 12); }
          }
          break;
        }
      }
    }
  }
  if (!legal) return session ? -INF : -(MATE - ply);
  if (best <= -INF) return -INF;
  ttStore(ti, h2, bestMove, best, depth, flag, ply);
  return best;
}

/* ── the root ── */
let rootMoves = [], rootNoise = null, rootBest = 0, rootScore = 0, rootPV = [];
function searchRoot(depth, alpha, beta) {
  const S = pool[0], me = S.turn;
  let best = -INF;
  for (let i = 0; i < rootMoves.length; i++) {
    const m = rootMoves[i], mode = (m >> 16) & 7;
    const d = makeChild(0, m); if (!d) continue;
    let v;
    if (d.over) v = terminal(d.over, me, 1);
    else {
      hashOf(d); hash1[1] = H1; hash2[1] = H2;
      const same = d.turn === me;
      if (!same && repeats(1) >= 2) v = pointsScore(d, me, 1);
      else {
        /* e: a small push of its own for each first move, so that games differ */
        const nd = mode === COMMIT ? depth : depth - 1, e = rootNoise ? rootNoise.get(m) | 0 : 0, a = alpha - e, b = beta - e;
        if (same) {
          if (i === 0) v = search(1, nd, a, b);
          else { v = search(1, nd, a, a + 1); if (v > a && v < b && !stopFlag) v = search(1, nd, a, b); }
          if (v <= -INF) v = -MATE;
        } else if (i === 0) v = -search(1, nd, -b, -a);
        else { v = -search(1, nd, -a - 1, -a); if (v > a && v < b && !stopFlag) v = -search(1, nd, -b, -a); }
        if (v > -MATE_BOUND && v < MATE_BOUND) v += e;
      }
    }
    if (stopFlag) break;
    if (v > best) {
      best = v;
      if (v > alpha) {
        alpha = v; rootBest = m; rootScore = v;
        rootPV = [m]; if (!d.over) for (let j = 0; j < pvLen[1]; j++) rootPV.push(pvTab[PVW + j]);
        if (i > 0) { rootMoves.splice(i, 1); rootMoves.unshift(m); }
        if (v >= beta) break;
      }
    }
  }
  return best;
}
function think(S0, legal, ctx, budgetMs) {
  setRoot(S0);
  const S = pool[0];
  clockFn = ctx.timeLeft; deadline = ctx.timeLeft() - budgetMs; stopFlag = false; nodes = 0; tick = 0;
  maxNodes = 1e9;                                              // the first move of every line is always looked at
  const t0 = ctx.timeLeft();
  ttGen = (ttGen % 62) + 1;
  killer1.fill(0); killer2.fill(0);
  for (let j = 0; j < history.length; j++) history[j] >>= 2;
  /* the game so far, for repetitions */
  histSeen = new Map(); histAny.fill(0);
  if (ctx.seen) for (const key in ctx.seen) { const h = keyHash(key); if (h !== null) { histSeen.set(h, ctx.seen[key]); histAny[Math.floor(h / 4294967296) & 4095] = 1; } }
  hashOf(S); hash1[0] = H1; hash2[0] = H2;
  let moves = legal.filter(m => CC.mMode(m) !== INTERCEPT); if (!moves.length) moves = legal.slice();
  const sc0 = new Map();
  for (const m of moves) { const mode = CC.mMode(m); let s = 0; if (mode === CAPTURE || mode === STAY) s = 1000 + stackValue(S, CC.mTo(m)); else if (mode === SUICIDE) s = 500 + stackValue(S, CC.mTo(m)) - VAL[K_F]; sc0.set(m, s); }
  moves.sort((a, b) => sc0.get(b) - sc0.get(a));
  rootMoves = moves; rootBest = moves[0]; rootScore = -INF; rootPV = [moves[0]];
  rootNoise = null;
  { const amp = S0.full <= 4 ? NOISE[0] : S0.full <= 8 ? NOISE[1] : NOISE[2];
    if (amp && S0.dOrg < 0 && typeof ctx.random === 'function') { rootNoise = new Map(); for (const m of moves) rootNoise.set(m, Math.round((ctx.random() * 2 - 1) * amp)); } }
  let doneDepth = 0, prev = 0;
  for (let depth = 1; depth <= 60; depth++) {
    let alpha = -INF, beta = INF, w = 35;
    if (depth >= 4 && prev > -MATE_BOUND && prev < MATE_BOUND) { alpha = prev - w; beta = prev + w; }
    let v;
    for (;;) {
      v = searchRoot(depth, alpha, beta);
      if (stopFlag) break;
      if (v <= alpha && alpha > -INF) { w *= 3; alpha = w > 800 ? -INF : v - w; }
      else if (v >= beta && beta < INF) { w *= 3; beta = w > 800 ? INF : v + w; }
      else break;
    }
    if (stopFlag) break;
    prev = v; doneDepth = depth; maxNodes = LOOKS;
    if ((v > MATE_BOUND || v < -MATE_BOUND) && depth >= 4) break;
    if (moves.length === 1 && depth >= 2) break;
    if (nodes >= maxNodes || t0 - ctx.timeLeft() > budgetMs * 0.55) break;
  }
  return rootPV;
}
/* the key of a past position (CC.posKey), as the search's own hash */
const KCODE = {}; for (let k = 0; k < 11; k++) KCODE[CC.KIND_CODE[k]] = k;
const keyCache = new Map();
function keyHash(key) {
  const ck = keyCache.get(key);
  if (ck !== undefined && ck.s1 === salt1) return ck.h;
  let a = salt1, b = salt2;
  try {
    const parts = key.split('|');
    if (parts[0] === 'b') { a ^= ZT1; b ^= ZT2; }
    for (let i = 1; i < parts.length; i++) {
      const c = parts[i].indexOf(':'), s = +parts[i].slice(0, c), t = parts[i];
      for (let j = c + 1; j < t.length; j += 2) {
        const k = KCODE[t[j]], o = t[j + 1] === 'b' ? 1 : 0; let h = 0;
        if (t[j + 2] === '*') { h = 1; j++; }
        const idx = ((k << 2) | (o << 1) | h) * NSQ + s; a ^= Z1[idx]; b ^= Z2[idx];
      }
    }
  } catch (e) { return null; }
  const h = a * 4294967296 + (b >>> 0);
  if (keyCache.size > 5000) keyCache.clear();
  keyCache.set(key, { h, s1: salt1 });
  return h;
}

/* when there is nothing better to go by (no time at all, or a position it was not built for): the dearest
   thing on offer, else the first move that does not throw a plane away */
function plainPick(S, legal) {
  let top = -Infinity, pick = legal[0];
  for (const m of legal) {
    const mode = CC.mMode(m); if (mode === CC.INTERCEPT) continue;
    let gain = 0;
    if (mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE) { gain = 1; for (const p of CC.members(S, CC.mTo(m))) gain += CC.POINTS[S.kind[p]]; if (mode === CC.SUICIDE) gain -= CC.POINTS[CC.AIR]; }
    if (gain > top) { top = gain; pick = m; }
  }
  return pick;
}

/* the turn of a player of this build: p is what sets it apart */
function player(p) {
  return function (S, ctx) {
    const me = S.turn, out = [];
    LOOKS = p.looks; NOISE = p.noise;
    let total = ctx.timeLeft(); if (!(total > 0)) total = 50;
    let pv = null, pvAt = 0;
    while (!S.over && S.turn === me) {
      const legal = CC.legalMoves(S);
      if (!legal.length) break;
      let m = -1;
      if (legal.length === 1) m = legal[0];
      else {
        try {
          if (pv && pvAt < pv.length && legal.includes(pv[pvAt])) m = pv[pvAt];              // the rest of a deployment: as planned
          else {
            const budget = Math.min(ctx.timeLeft() - total * 0.45 - 4, total * 0.45);        // never more than half the time
            if (budget > 2) { pv = think(S, legal, ctx, budget); pvAt = 0; m = pv[0]; }
          }
        } catch (e) { m = -1; }
        if (!legal.includes(m)) m = plainPick(S, legal);
      }
      out.push(m); pvAt++;
      if (!CC.play(S, m, true)) break;
    }
    return out;
  };
}

registerAI({
  id: 'du-kich',
  name: 'Du Kích',
  author: 'Claude Fable 5.2 (Anthropic)',
  about: 'The Guerrilla. Counts men and nothing else. He looks a move or two ahead, snaps up whatever is loose and steps out of the way of what he can see coming; he has no plan, and what he cannot see in two moves does not exist for him.',
  turn: player({ looks: 600, noise: [12, 8, 8] }),
});
