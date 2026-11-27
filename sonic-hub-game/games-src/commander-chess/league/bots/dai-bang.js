/* Đại Bàng: a computer player for Commander Chess (Cờ Tư Lệnh), AI kit 2.
   One character at three depths of thought: level 1 Easy, level 2 Medium, level 3 Hard (see LEVELS below).

   How it works. Hard and Medium search with alpha-beta (principal variation search, a transposition table, killer and
   history ordering, and a quiescence search that follows captures to the end). The search takes the turn structure of
   this game as it is: after a step of a deployment the same side moves again, so the score is not negated there, and
   COMMIT costs no depth. Inside the search moves come from CC.gen and are played without the safety tests: a
   Commander left where it can be taken is simply taken on the next move, which also makes "no move that keeps the
   Commander" a loss, as the rules have it. What the player finally returns always comes from CC.legalMoves.
   Repetitions are counted with ctx.seen, hashed the same way as the search hashes positions. Easy does not search. */
'use strict';

/* ───────────────────────── names from the engine ───────────────────────── */
const NSQ = CC.NSQ;
const CMD = CC.COMMANDER, INF = CC.INFANTRY, TANK = CC.TANK, MIL = CC.MILITIA, ENG = CC.ENGINEER, ART = CC.ARTILLERY;
const AA = CC.ANTIAIR, MIS = CC.MISSILE, AIR = CC.AIR, NAVY = CC.NAVY, HQ = CC.HQ;
const MOVE = CC.MOVE, CAPTURE = CC.CAPTURE, STAY = CC.STAY, SUICIDE = CC.SUICIDE, INTERCEPT = CC.INTERCEPT, COMBINE = CC.COMBINE, COMMIT = CC.COMMIT;
const COMMIT_MOVE = CC.COMMIT_MOVE;
const mFrom = CC.mFrom, mTo = CC.mTo, mMode = CC.mMode, mActor = CC.mActor;
const gen = CC.gen, play = CC.play, clone = CC.clone, inCheck = CC.inCheck, exposed = CC.exposed;
const RANK = new Uint8Array(NSQ), FILE = new Uint8Array(NSQ);
for (let s = 0; s < NSQ; s++) { RANK[s] = CC.rankOf(s); FILE[s] = CC.fileOf(s); }

const WIN = 1000000, BIG = 2000000, MATE_NEAR = WIN - 1000, MAX_PLY = 64;

/* ───────────────────────── values ─────────────────────────
   What a piece is worth to this player, in hundredths of an Infantry. The table's own count (CC.POINTS) is used for
   what it is: the tiebreak at the end of a game. A plane is worth more here than in that count, and more than a ship:
   in games against itself, raising the plane from 500 to 700 won by a wide margin each step, mostly by mating. */
const VAL = [0, 100, 210, 100, 80, 300, 130, 230, 700, 620, 60];
const HERO_BONUS = [0, 40, 60, 40, 40, 60, 50, 60, 260, 120, 90];

/* ───────────────────────── hashing ─────────────────────────
   A position's hash is a sum over its pieces of a number for (kind, side, hero, riding or not, point), so the same
   hash can be worked out from CC.posKey text: that is how the repetitions the table counts (ctx.seen) are known. */
let rs = 0x2545F491;
const rnd32 = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return rs | 0; };
const ZSZ = 11 * 2 * 2 * 2 * NSQ;
const ZA = new Int32Array(ZSZ), ZB = new Int32Array(ZSZ);
for (let i = 0; i < ZSZ; i++) { ZA[i] = rnd32(); ZB[i] = rnd32(); }
const ZTA = rnd32(), ZTB = rnd32();
const ZDA = new Int32Array(NSQ), ZDB = new Int32Array(NSQ), ZPA = new Int32Array(64), ZPB = new Int32Array(64);
for (let i = 0; i < NSQ; i++) { ZDA[i] = rnd32(); ZDB[i] = rnd32(); }
for (let i = 0; i < 64; i++) { ZPA[i] = rnd32(); ZPB[i] = rnd32(); }
const zi = (k, side, hero, rider, s) => (((k * 2 + side) * 2 + hero) * 2 + rider) * NSQ + s;
let HA = 0, HB = 0;
function hashPos(S) {
  let a = 0, b = 0;
  if (S.turn) { a = ZTA; b = ZTB; }
  const at = S.at, kind = S.kind, own = S.own, hero = S.hero, car = S.car, n = S.n;
  for (let p = 0; p < n; p++) {
    const s = at[p]; if (s < 0) continue;
    const i = zi(kind[p], own[p], hero[p], car[p] >= 0 ? 1 : 0, s);
    a = (a + ZA[i]) | 0; b = (b + ZB[i]) | 0;
  }
  if (S.dOrg >= 0) {
    a = (a + ZDA[S.dOrg]) | 0; b = (b + ZDB[S.dOrg]) | 0;
    for (let j = 0; j < S.dAct.length; j++) { const p = S.dAct[j]; a = (a + ZPA[p]) | 0; b = (b + ZPB[p]) | 0; }
  }
  HA = a; HB = b;
}
const keyOf = (a, b) => (a >>> 0) * 2097152 + (b >>> 11);
/** the hash of a position given as CC.posKey text */
function keyOfText(t) {
  let a = 0, b = 0;
  if (t[0] === 'b') { a = ZTA; b = ZTB; }
  let i = 1;
  while (i < t.length) {
    i++;                                                    // '|'
    let s = 0; while (i < t.length && t[i] !== ':') { s = s * 10 + (t.charCodeAt(i) - 48); i++; }
    i++;                                                    // ':'
    let rider = 0;
    while (i < t.length && t[i] !== '|') {
      const k = CC.KIND_CODE.indexOf(t[i]), side = t[i + 1] === 'b' ? 1 : 0; i += 2;
      if (k < 0 || s < 0 || s >= NSQ) return -1;            // not a key of this game
      let hero = 0; if (t[i] === '*') { hero = 1; i++; }
      const z = zi(k, side, hero, rider, s); a = (a + ZA[z]) | 0; b = (b + ZB[z]) | 0;
      rider = 1;
    }
  }
  return keyOf(a, b);
}

/* ───────────────────────── transposition table ───────────────────────── */
const TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
let tA = null, tB, tMove, tScore, tDepth, tFlag, tAge;
const EXACT = 1, LOWER = 2, UPPER = 3;
let age = 0;
function ttInit() {
  if (tA) return;
  tA = new Int32Array(TT_SIZE); tB = new Int32Array(TT_SIZE); tMove = new Int32Array(TT_SIZE); tScore = new Int32Array(TT_SIZE);
  tDepth = new Int8Array(TT_SIZE); tFlag = new Uint8Array(TT_SIZE); tAge = new Uint8Array(TT_SIZE);
}
const toTT = (sc, ply) => (sc > MATE_NEAR ? sc + ply : sc < -MATE_NEAR ? sc - ply : sc);
const fromTT = (sc, ply) => (sc > MATE_NEAR ? sc - ply : sc < -MATE_NEAR ? sc + ply : sc);
function ttStore(a, b, depth, flag, sc, move, ply) {
  const i = b & TT_MASK, same = tA[i] === a && tB[i] === b;
  if (same) { if (depth < tDepth[i] && tAge[i] === age && flag !== EXACT) return; }
  else if (tAge[i] === age && tDepth[i] > depth + 1) return;
  if (move || !same) tMove[i] = move;
  tA[i] = a; tB[i] = b; tDepth[i] = depth; tFlag[i] = flag; tScore[i] = toTT(sc, ply); tAge[i] = age;
}

/* ───────────────────────── piece-square tables ─────────────────────────
   From each side's own point of view: `fwd` is how far a point lies toward the enemy (0 on the home edge). The search
   weighs them at half (PSTE): pushing forward matters less than what the pieces can take, which games bore out. Easy
   uses them whole, as the pull forward of a player who does not look ahead. */
const PST = [[], []], PSTE = [[], []], PST_SCALE = 0.5;
(function buildPST() {
  for (let side = 0; side < 2; side++) for (let k = 0; k < 11; k++) {
    const t = new Int16Array(NSQ);
    for (let s = 0; s < NSQ; s++) {
      const f = FILE[s], r = RANK[s], fwd = side ? 12 - r : r - 1, cen = 5 - Math.abs(f - 5);
      let v = 0;
      switch (k) {
        case INF: case MIL: v = 6 * Math.min(fwd, 9) + 2 * cen; break;
        case ENG: v = 3 * Math.min(fwd, 6) + cen; break;
        case TANK: v = 7 * Math.min(fwd, 9) + 3 * cen; break;
        case ART: v = 6 * Math.min(fwd, 6) + 3 * cen; break;
        case MIS: case AA: v = 4 * Math.min(fwd, 6) + 2 * cen; break;
        case AIR: v = 3 * Math.min(fwd, 7) + 3 * cen; break;
        case NAVY: v = 5 * Math.min(fwd, 8) + (f === 2 ? 6 : 0); break;
        case CMD: v = -6 * Math.max(0, fwd - 1) - 2 * Math.abs(f - 6); break;
        default: v = 0;
      }
      t[s] = v;
    }
    PST[side][k] = t;
    PSTE[side][k] = t.map(v => Math.round(v * PST_SCALE));
  }
})();

/* ───────────────────────── evaluation ─────────────────────────
   What this player looks at in a position: what each side has left and where it stands, how near each side is to
   losing a whole arm in a battle, and whom the count of quiet turns is running for. Threats and the safety of the
   Commander are left to the search: in this game it judges them better than any rule of thumb that was tried. */
let EV = null;                                              // the weights of the level being played
const armPen = (ships, air, land) => (ships === 1 ? EV.lastShip : 0) + (air === 1 ? EV.lastPlane : 0) +
  (land === 1 ? EV.land1 : land === 2 ? EV.land2 : land === 3 ? EV.land3 : 0);
function evaluate(S, me) {
  const n = S.n, at = S.at, kind = S.kind, own = S.own, hero = S.hero;
  let sc = 0, ships0 = 0, ships1 = 0, air0 = 0, air1 = 0, land0 = 0, land1 = 0;
  for (let p = 0; p < n; p++) {
    const s = at[p]; if (s < 0) continue;
    const k = kind[p], side = own[p];
    let v = VAL[k] + PSTE[side][k][s];
    if (hero[p]) v += HERO_BONUS[k];
    if (k === NAVY) { if (side) ships1++; else ships0++; }
    else if (k === AIR) { if (side) air1++; else air0++; }
    else if (k === INF || k === TANK || k === ART) { if (side) land1++; else land0++; }
    sc += side === me ? v : -v;
  }
  if (!S.total) {                                           // in a battle the last ship, the last plane are a second Commander
    const d = armPen(ships1, air1, land1) - armPen(ships0, air0, land0);
    sc += me === 0 ? d : -d;
  }
  if (S.half > 60) {                                        // the quiet-turn count runs for whoever is ahead on points
    const pts = CC.points(S), d = pts[me] - pts[1 - me];
    if (d) sc += (d > 0 ? 1 : -1) * (S.half - 60) * 3;
  }
  return sc + EV.tempo;
}

/* ───────────────────────── positions without garbage ─────────────────────────
   CC.clone makes new arrays every time, and the search makes a position for every move it looks at. These are made
   once a turn, one per ply, and filled in place: the engine's own calls work on them as on any position. */
const EMPTY_LIST = [];
let POOL = [], poolN = -1, poolKind = null;
function makePool(S) {
  if (poolN === S.n && poolKind === S.kind) return;
  POOL = []; poolN = S.n; poolKind = S.kind;
  for (let i = 0; i < 2 * (MAX_PLY + 8); i++) POOL.push({ n: S.n, kind: S.kind, own: S.own, cmd: S.cmd, total: S.total, had: S.had, men: S.men,
    top: new Int8Array(NSQ), at: new Int16Array(S.n), car: new Int8Array(S.n), c1: new Int8Array(S.n), c2: new Int8Array(S.n), hero: new Uint8Array(S.n),
    turn: 0, half: 0, full: 0, over: null, dOrg: -1, dAct: EMPTY_LIST, dIrr: 0, ad: [null, null], log: null });
}
/** position buffer number i, made a copy of S */
function copyOf(i, S) {
  const D = POOL[i];
  D.kind = S.kind; D.own = S.own; D.cmd = S.cmd; D.had = S.had; D.men = S.men;
  D.top.set(S.top); D.at.set(S.at); D.car.set(S.car); D.c1.set(S.c1); D.c2.set(S.c2); D.hero.set(S.hero);
  D.total = S.total; D.turn = S.turn; D.half = S.half; D.full = S.full; D.over = S.over; D.dOrg = S.dOrg;
  D.dAct = S.dAct.length ? S.dAct.slice() : EMPTY_LIST; D.dIrr = S.dIrr; D.ad[0] = null; D.ad[1] = null;
  return D;
}

/* ───────────────────────── search ───────────────────────── */
let ctxNow = null, hardStop = 0, aborted = false, nodes = 0;
let seenMap = new Map();
const pathKeys = new Float64Array(256); let pathLen = 0;
const killers = new Int32Array(MAX_PLY * 2);
const hist = new Int32Array(64 * NSQ);
const MB = [], MS = [];
for (let i = 0; i <= MAX_PLY + 8; i++) { MB.push([]); MS.push(new Int32Array(1024)); }

let ownDeadline = 0;                                       // our own clock as well, in case the table's ever stood still
const timeUp = () => ctxNow.timeLeft() < hardStop || clockNow() > ownDeadline;
const terminal = (over, me, ply) => (over.winner === me ? WIN - ply : over.winner < 0 ? 0 : -(WIN - ply));
function pointsScore(S, me, ply) {
  const pts = CC.points(S), d = pts[me] - pts[1 - me];
  return d > 0 ? WIN - ply : d < 0 ? -(WIN - ply) : 0;
}
/** what is on point s, as this player values it */
function stackVal(S, s) {
  const t = S.top[s]; if (t < 0) return 0;
  let v = VAL[S.kind[t]] + (S.hero[t] ? HERO_BONUS[S.kind[t]] : 0);
  const a = S.c1[t], b = S.c2[t];
  if (a >= 0) v += VAL[S.kind[a]] + (S.hero[a] ? HERO_BONUS[S.kind[a]] : 0) + (S.kind[a] === CMD ? WIN / 10 : 0);
  if (b >= 0) v += VAL[S.kind[b]] + (S.hero[b] ? HERO_BONUS[S.kind[b]] : 0) + (S.kind[b] === CMD ? WIN / 10 : 0);
  if (S.kind[t] === CMD) v += WIN / 10;
  return v;
}
/** ordering score for a move: the bigger, the sooner it is tried */
function orderScore(S, m, ply, ttm) {
  if (m === ttm) return 1 << 30;
  const mode = mMode(m);
  if (mode === CAPTURE || mode === STAY) return (1 << 26) + Math.min(stackVal(S, mTo(m)), 100000) * 8 - VAL[S.kind[mActor(m)]];
  if (mode === SUICIDE) { const g = stackVal(S, mTo(m)) - VAL[AIR]; return g > 0 ? (1 << 26) + Math.min(g, 100000) * 8 : (1 << 20) + g; }
  if (mode === INTERCEPT) return -(1 << 28);
  if (mode === COMMIT) return 1 << 24;
  if (m === killers[ply * 2]) return (1 << 23);
  if (m === killers[ply * 2 + 1]) return (1 << 23) - 1;
  return hist[mActor(m) * NSQ + mTo(m)];
}
function sortMoves(S, moves, scores, ply, ttm) {
  for (let i = 0; i < moves.length; i++) scores[i] = orderScore(S, moves[i], ply, ttm);
}
/** the next move to try: the best of those not tried yet, swapped to position i */
function pick(moves, scores, i) {
  let bi = i, bs = scores[i];
  for (let j = i + 1; j < moves.length; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
  if (bi !== i) { const m = moves[i]; moves[i] = moves[bi]; moves[bi] = m; const t = scores[i]; scores[i] = scores[bi]; scores[bi] = t; }
  return moves[i];
}
const isCap = mode => mode === CAPTURE || mode === STAY || mode === SUICIDE;

/** the score of child c (made from a position where `me` was to move), from me's point of view */
function childScore(c, me, depth, alpha, beta, ply, pvn) {
  if (c.over) return terminal(c.over, me, ply);
  if (c.turn === me) return search(c, depth, alpha, beta, ply, pvn);
  hashPos(c); const key = keyOf(HA, HB);
  let reps = seenMap.get(key) || 0;
  for (let i = 0; i < pathLen; i++) if (pathKeys[i] === key) reps++;
  if (reps >= 2) return pointsScore(c, me, ply);            // the same position a third time: the points decide
  pathKeys[pathLen++] = key;
  const sc = -search(c, depth, -beta, -alpha, ply, pvn);
  pathLen--;
  return sc;
}

let CFG = null;                                             // how the level being played searches
/** has `side` enough pieces that passing a turn is never its best move? (a null move is a guess that it is not) */
function hasMen(S, side) {
  let n = 0;
  for (let p = 0; p < S.n; p++) if (S.own[p] === side && S.at[p] >= 0 && S.kind[p] !== CMD && S.kind[p] !== HQ && ++n >= 4) return true;
  return false;
}
function search(S, depth, alpha, beta, ply, pvn) {
  if ((++nodes & 255) === 0 && timeUp()) aborted = true;
  if (aborted) return 0;
  const me = S.turn, deploy = S.dOrg >= 0;
  let inChk = false;
  if (!deploy) {
    if (inCheck(S, 1 - me)) return WIN - ply;               // their Commander can be taken now
    inChk = inCheck(S, me);
    if (inChk && CFG.checkExt && ply < MAX_PLY - 8) depth++;
  }
  if (depth <= 0 || ply >= MAX_PLY - 2) return qsearch(S, alpha, beta, ply, 0);
  hashPos(S); const ha = HA ^ CFG.saltA, hb = HB ^ CFG.saltB, ti = hb & TT_MASK;   // each level keeps its own entries
  let ttm = 0;
  if (tA[ti] === ha && tB[ti] === hb) {
    ttm = tMove[ti];
    if (!pvn && tDepth[ti] >= depth) {
      const sc = fromTT(tScore[ti], ply), f = tFlag[ti];
      if (f === EXACT || (f === LOWER && sc >= beta) || (f === UPPER && sc <= alpha)) return sc;
    }
  }
  const prunable = !pvn && !inChk && !deploy && beta < MATE_NEAR && alpha > -MATE_NEAR;
  if (prunable && (CFG.rfp || CFG.nullMove)) {
    const ev = evaluate(S, me);
    if (CFG.rfp && depth <= 2 && ev - 220 * depth >= beta) return ev;            // far above: nothing will bring it down
    if (CFG.nullMove && depth >= 3 && ev >= beta && hasMen(S, me)) {             // pass, and see whether that is still enough
      const c = copyOf(ply * 2 + 1, S); c.turn = 1 - me;
      const sc = -search(c, depth - (depth >= 6 ? 4 : 3), -beta, -beta + 1, ply + 1, false);
      if (aborted) return 0;
      if (sc >= beta) return sc >= MATE_NEAR ? beta : sc;
    }
  }
  const alpha0 = alpha;
  let best = -BIG, bestMove = 0, n = 0, skipped = 0;
  const moves = MB[ply], scores = MS[ply];
  moves.length = 0; gen(S, moves, false);
  sortMoves(S, moves, scores, ply, ttm);
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) { if (n || !skipped) break; }            // a plane thrown away is tried only when nothing else is left
    for (let i = 0; i < moves.length; i++) {
      const m = pass ? moves[i] : pick(moves, scores, i), mode = mMode(m);
      if ((mode === INTERCEPT) !== (pass === 1)) { if (!pass) skipped++; continue; }
      const c = copyOf(ply * 2, S);
      if (!play(c, m, false) || exposed(c)) continue;
      const d = mode === COMMIT ? depth : depth - 1;
      let sc;
      if (n === 0) sc = childScore(c, me, d, alpha, beta, ply + 1, pvn);
      else {
        let r = 0;
        if (CFG.lmr && depth >= 3 && n >= 3 && !inChk && (mode === MOVE || mode === COMBINE) && m !== killers[ply * 2] && m !== killers[ply * 2 + 1]
            && !c.over && c.turn !== me && !inCheck(c, me === 0 ? 1 : 0)) r = n >= 10 && depth >= 4 ? 2 : 1;
        sc = childScore(c, me, d - r, alpha, alpha + 1, ply + 1, false);
        if (!aborted && r && sc > alpha) sc = childScore(c, me, d, alpha, alpha + 1, ply + 1, false);
        if (!aborted && sc > alpha && sc < beta) sc = childScore(c, me, d, alpha, beta, ply + 1, pvn);
      }
      if (aborted) return 0;
      if (sc === -BIG) continue;                             // that step leads nowhere legal
      n++;
      if (sc > best) {
        best = sc; bestMove = m;
        if (sc > alpha) {
          alpha = sc;
          if (sc >= beta) {
            if (!isCap(mode) && mode !== COMMIT) {
              if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
              const h = mActor(m) * NSQ + mTo(m); hist[h] += depth * depth;
              if (hist[h] > (1 << 20)) for (let j = 0; j < hist.length; j++) hist[j] >>= 1;
            }
            break;
          }
        }
      }
    }
  }
  if (!n) return deploy ? -BIG : -(WIN - ply);               // no move at all: a side that cannot move has lost
  ttStore(ha, hb, depth, best >= beta ? LOWER : best > alpha0 ? EXACT : UPPER, best, bestMove, ply);
  return best;
}

function qsearch(S, alpha, beta, ply, qd) {
  if ((++nodes & 255) === 0 && timeUp()) aborted = true;
  if (aborted) return 0;
  const me = S.turn;
  if (S.dOrg >= 0) return qDeploy(S, alpha, beta, ply, qd);
  if (inCheck(S, 1 - me)) return WIN - ply;
  if (ply >= MAX_PLY) return evaluate(S, me);
  const inChk = inCheck(S, me) && qd < 4;
  let best;
  const moves = MB[ply], scores = MS[ply];
  moves.length = 0;
  if (inChk) { best = -BIG; gen(S, moves, false); }
  else {
    const sp = evaluate(S, me);
    if (sp >= beta) return sp;
    if (sp > alpha) alpha = sp;
    best = sp;
    gen(S, moves, true);
  }
  sortMoves(S, moves, scores, ply, 0);
  for (let i = 0; i < moves.length; i++) {
    const m = pick(moves, scores, i), mode = mMode(m);
    if (mode === INTERCEPT) continue;
    if (!inChk && !isCap(mode)) continue;
    const c = copyOf(ply * 2, S);
    if (!play(c, m, false) || exposed(c)) continue;
    let sc;
    if (c.over) sc = terminal(c.over, me, ply + 1);
    else if (c.turn === me) sc = qsearch(c, alpha, beta, ply + 1, qd + 1);
    else sc = -qsearch(c, -beta, -alpha, ply + 1, qd + 1);
    if (aborted) return 0;
    if (sc === -BIG) continue;
    if (sc > best) { best = sc; if (sc > alpha) { alpha = sc; if (sc >= beta) break; } }
  }
  if (best === -BIG) return inChk ? -(WIN - ply) : evaluate(S, me);
  return best;
}
/** in the middle of a deployment, in the quiescence search: hand the turn over, or strike again from the stack */
function qDeploy(S, alpha, beta, ply, qd) {
  const me = S.turn;
  let best = -BIG;
  const c0 = copyOf(ply * 2, S);
  if (play(c0, COMMIT_MOVE, false) && !exposed(c0)) {
    const sc = c0.over ? terminal(c0.over, me, ply + 1) : -qsearch(c0, -beta, -alpha, ply + 1, qd + 1);
    if (aborted) return 0;
    best = sc; if (sc > alpha) { alpha = sc; if (sc >= beta) return sc; }
  }
  if (ply >= MAX_PLY) return best === -BIG ? evaluate(S, me) : best;
  const moves = MB[ply], scores = MS[ply];
  moves.length = 0; gen(S, moves, true);
  sortMoves(S, moves, scores, ply, 0);
  for (let i = 0; i < moves.length; i++) {
    const m = pick(moves, scores, i), mode = mMode(m);
    if (mode === INTERCEPT || !isCap(mode)) continue;
    const c = copyOf(ply * 2, S);
    if (!play(c, m, false) || exposed(c)) continue;
    let sc;
    if (c.over) sc = terminal(c.over, me, ply + 1);
    else if (c.turn === me) sc = qsearch(c, alpha, beta, ply + 1, qd + 1);
    else sc = -qsearch(c, -beta, -alpha, ply + 1, qd + 1);
    if (aborted) return 0;
    if (sc === -BIG) continue;
    if (sc > best) { best = sc; if (sc > alpha) { alpha = sc; if (sc >= beta) break; } }
  }
  return best === -BIG ? evaluate(S, me) : best;
}

/* ───────────────────────── the root ───────────────────────── */
let lastDepth = 0, lastScore = 0;
/** Searches the legal moves of S with iterative deepening, until the soft time is used up or maxDepth is done.
 *  bias: a small number per move, the same for the whole turn, so that among moves the search cannot tell apart the
 *  choice varies from game to game. */
function rootSearch(S, legal, softMs, maxDepth, biasAmp) {
  const me = S.turn, t0 = ctxNow.timeLeft(), c0 = clockNow();
  let rm = legal.filter(m => mMode(m) !== INTERCEPT);
  if (!rm.length) rm = legal.slice();
  if (rm.length === 1) { lastDepth = 0; return rm[0]; }
  const rs = new Float64Array(rm.length), bias = new Map();
  for (const m of rm) bias.set(m, Math.floor(ctxNow.random() * (biasAmp + 1)));
  hashPos(S);
  const ha = HA ^ CFG.saltA, hb = HB ^ CFG.saltB, ti = hb & TT_MASK, ttm = tA[ti] === ha && tB[ti] === hb ? tMove[ti] : 0;
  for (let i = 0; i < rm.length; i++) rs[i] = orderScore(S, rm[i], 0, ttm) + bias.get(rm[i]);
  sortBy(rm, rs);
  let bestMove = rm[0], bestScore = -BIG;
  lastDepth = 0;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -BIG, iterBest = 0, iterScore = -BIG;
    for (let i = 0; i < rm.length; i++) {
      const m = rm[i], c = clone(S), b = bias.get(m);
      play(c, m, true);
      const d = mMode(m) === COMMIT ? depth : depth - 1;
      let sc;
      if (i === 0) sc = childScore(c, me, d, -BIG, BIG, 1, true) + b;
      else {
        sc = childScore(c, me, d, alpha - b, alpha - b + 1, 1, false) + b;
        if (!aborted && sc > alpha) sc = childScore(c, me, d, alpha - b, BIG, 1, true) + b;
      }
      if (aborted) break;
      rs[i] = sc;
      if (sc > iterScore) { iterScore = sc; iterBest = m; if (sc > alpha) alpha = sc; }
    }
    if (aborted) { if (iterBest && iterBest !== bestMove && iterScore > -MATE_NEAR) { bestMove = iterBest; bestScore = iterScore; } break; }
    bestMove = iterBest; bestScore = iterScore; lastDepth = depth; lastScore = bestScore;
    for (let i = 0; i < rm.length; i++) rs[i] = rm[i] === bestMove ? BIG : rs[i];
    sortBy(rm, rs);
    if (bestScore > MATE_NEAR || bestScore < -MATE_NEAR) break;
    if (t0 - ctxNow.timeLeft() > softMs || clockNow() - c0 > softMs) break;
  }
  return bestMove;
}
function sortBy(a, s) {
  const idx = Array.from(a, (_, i) => i).sort((x, y) => s[y] - s[x]);
  const a2 = idx.map(i => a[i]), s2 = idx.map(i => s[i]);
  for (let i = 0; i < a.length; i++) { a[i] = a2[i]; s[i] = s2[i]; }
}

/* ───────────────────────── Easy: a glance at each move ─────────────────────────
   No look-ahead. It takes the dearest thing it can take, likes to attack the Commander and to push forward, and asks
   one question about the move it is making: can the piece be taken where it lands? It never looks at what threatens
   its other pieces, and never at what the enemy will do next. Greedy and hasty: a person who thinks one move ahead
   beats it. */
function easyChoose(S, legal, ctx) {
  const me = S.turn, opp = 1 - me;
  let best = -BIG, choice = legal[0];
  for (const m of legal) {
    const mode = mMode(m);
    if (mode === INTERCEPT) continue;
    const c = clone(S);
    if (!play(c, m, true)) continue;
    if (c.over) { if (c.over.winner === me) return m; if (c.over.winner === opp) continue; }
    let sc = 0;
    if (mode !== COMMIT) {
      const a = mActor(m), from = mFrom(m), to = mTo(m), k = S.kind[a];
      if (mode === CAPTURE || mode === STAY || mode === SUICIDE) sc += stackVal(S, to);
      if (mode === SUICIDE) sc -= VAL[AIR];
      if (mode !== SUICIDE && c.at[a] >= 0) {
        for (let q = 0; q < c.n; q++) {
          if (c.own[q] !== opp || c.at[q] < 0) continue;
          if (CC.attacks(c, q, c.at[a])) { sc -= 0.9 * stackVal(c, c.at[a]); break; }
        }
      }
      if (mode === MOVE || mode === CAPTURE || mode === COMBINE) sc += PST[me][k][to] - PST[me][k][from];
      if (!c.over && c.dOrg < 0 && inCheck(c, opp)) sc += 30;
    }
    sc += ctx.random() * 14;
    if (sc > best) { best = sc; choice = m; }
  }
  return choice;
}

/* ───────────────────────── levels ───────────────────────── */
const NLEV = 3;
/* The levels differ in how they think, not in how long: Easy glances at each move; Medium looks at its move and every
   reply, then follows the captures to the end (two plies and a quiescence search, whatever the clock); Hard deepens
   until its share of the clock is spent, and prunes and extends where it pays. Measured at 500 ms a turn, Easy beats
   the kit's sample player about 9 games in 10, and each level beats the one below nearly always: the distance from a
   player a newcomer can beat to the best this one can do is too wide for three steps of three games in four, so the
   steps are made even instead. */
const LEVELS = {
  1: { glance: true },
  2: { maxDepth: 2, use: 0.35, soft: 0.5, bias: 6, rfp: false, nullMove: false, lmr: false, checkExt: false,
       ev: { lastShip: 220, lastPlane: 220, land1: 300, land2: 120, land3: 40, tempo: 10 } },
  3: { maxDepth: 40, use: 0.80, soft: 0.45, bias: 3, rfp: true, nullMove: true, lmr: true, checkExt: true,
       ev: { lastShip: 220, lastPlane: 220, land1: 300, land2: 120, land3: 40, tempo: 10 } },
};

/** the table's count of positions, keyed the way this player hashes */
const seenCache = new Map();
function prepareSeen(ctx) {
  seenMap = new Map();
  const seen = ctx.seen || {};
  for (const k in seen) {
    let h = seenCache.get(k);
    if (h === undefined) { h = keyOfText(k); seenCache.set(k, h); }
    if (h >= 0 && seen[k] > 0) seenMap.set(h, (seenMap.get(h) || 0) + (seen[k] | 0));
  }
}

function easyTurn(S, ctx, moves) {
  const me = S.turn;
  while (!S.over && S.turn === me && moves.length < 8) {
    const legal = CC.legalMoves(S);
    if (!legal.length) break;
    const m = easyChoose(S, legal, ctx);
    moves.push(m);
    if (!play(S, m, true)) break;
  }
}
/** plays the turn on S, pushing each move onto `moves` as it is decided */
function playTurn(S, ctx, moves) {
  const level = Math.max(1, Math.min(NLEV, Math.floor(+ctx.level) || NLEV));
  const cfg = LEVELS[level];
  if (cfg.glance) return easyTurn(S, ctx, moves);
  if (cfg.saltA === undefined) { cfg.saltA = rnd32(); cfg.saltB = rnd32(); }
  CFG = cfg; EV = cfg.ev;
  ctxNow = ctx; ttInit(); makePool(S); age = (age + 1) & 255;
  prepareSeen(ctx);
  const me = S.turn, total = ctx.timeMs;
  while (!S.over && S.turn === me && moves.length < 8) {
    const legal = CC.legalMoves(S);
    if (!legal.length) break;
    const left = ctx.timeLeft(), reserve = Math.min(40, total * 0.08), avail = Math.max(1, left - reserve);
    const budget = moves.length ? avail * 0.6 : Math.min(avail, total * cfg.use);
    hardStop = left - budget; ownDeadline = clockNow() + budget;
    aborted = false; nodes = 0; pathLen = 0;
    const m = rootSearch(S, legal, budget * cfg.soft, cfg.maxDepth, cfg.bias);
    moves.push(m);
    if (!play(S, m, true)) break;
  }
}

/* ───────────────────────── the contract ───────────────────────── */
const clockNow = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
/** the ctx the table gives, with anything missing filled in */
function safeCtx(ctx) {
  ctx = ctx || {};
  const timeMs = ctx.timeMs > 0 ? +ctx.timeMs : 1000, t0 = clockNow();
  let seed = 0x6C8E9CF5;
  return {
    level: ctx.level, timeMs,
    timeLeft: typeof ctx.timeLeft === 'function' ? () => +ctx.timeLeft() : () => timeMs - (clockNow() - t0),
    random: typeof ctx.random === 'function' ? () => { const r = +ctx.random(); return r >= 0 && r < 1 ? r : 0; } : () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; },
    seen: ctx.seen && typeof ctx.seen === 'object' ? ctx.seen : {},
  };
}
function turn(S, ctx) {
  const start = clone(S), moves = [];
  try { playTurn(S, safeCtx(ctx), moves); return moves; }
  catch (e) {
    /* Should never happen. If it does, the game is not thrown away: the moves already chosen are played again on a
       fresh copy and the turn is finished with the plainest sound choice there is. */
    const T = start, me = T.turn, done = [];
    for (const m of moves) { if (T.turn !== me || T.over || !CC.legalMoves(T).includes(m) || !play(T, m, true)) break; done.push(m); }
    while (!T.over && T.turn === me && done.length < 8) {
      const legal = CC.legalMoves(T); if (!legal.length) break;
      let best = legal[0], bv = -BIG;
      for (const m of legal) { const md = mMode(m); const v = md === INTERCEPT ? -BIG + 1 : isCap(md) ? stackVal(T, mTo(m)) : md === COMMIT ? 1 : 0; if (v > bv) { bv = v; best = m; } }
      done.push(best); play(T, best, true);
    }
    return done;
  }
}

registerAI({
  id: 'dai-bang',
  name: 'Đại Bàng',
  author: 'Claude Opus 5.5 (Anthropic)',
  about: 'Air-minded: it values its two planes above any other piece and hunts the enemy\'s planes and ships first; when it can, it checks the enemy Commander with a plane to make it a stealth hero. In a battle it guards its own last ship and last plane like a second Commander and goes for whichever arm the enemy is down to its last piece of. Easy is greedy and never looks past its own move; Medium sees one reply ahead; Hard reads as deep as the clock allows.',
  levels: 3,
  turn,
});
