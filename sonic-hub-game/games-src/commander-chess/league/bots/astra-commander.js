/*
 * Astra Commander — GPT-6 Astra Max
 * Commander Chess AI kit 2, rules 752c960.
 * All movement, captures, stacks, promotions and turn endings use the supplied CC.
 * Search depth counts completed turns. Deployment actions keep the same perspective.
 */
'use strict';

const {
  RED, BLUE, COMMANDER, INFANTRY, TANK, MILITIA, ENGINEER,
  ARTILLERY, ANTIAIR, MISSILE, AIR, NAVY, HQ,
  MOVE, CAPTURE, STAY, SUICIDE, INTERCEPT, COMBINE, COMMIT,
  mFrom, mTo, mActor, mMode, mGroup,
} = CC;
const WIN = 100000, MATE_BOUND = 90000, INF = 110000;
const MAX_PLY = 60, Q_TURNS = 4;
const min = Math.min, max = Math.max, abs = Math.abs, imul = Math.imul;
const value = [0, 115, 270, 150, 135, 440, 200, 300, 675, 1020, 80];
const heroValue = [0, 105, 150, 100, 95, 170, 140, 170, 480, 230, 160];
const files = new Uint8Array(132), ranks = new Uint8Array(132);
for (let s = 0; s < 132; s++) { files[s] = s % 11; ranks[s] = (s / 11) | 0; }
const pst = [RED, BLUE].map(side => Array.from({ length: 11 }, (_, kind) => {
  const scores = new Int16Array(132);
  for (let s = 0; s < 132; s++) {
    const f = files[s], advance = side === RED ? ranks[s] : 11 - ranks[s];
    const central = 4 - abs(f - 6), developed = min(advance, 6);
    let score = central * 4 + developed * 4;
    if (kind === COMMANDER) score = -max(0, advance - 1) * 16 - abs(f - 6) * 3;
    if (kind === NAVY) score = min(advance, 7) * 8 + (f === 2 ? 16 : f > 2 ? 23 : 0);
    if (kind === AIR) score = central * 6 + min(advance, 6) * 5;
    if (kind === ARTILLERY) score = central * 6 + developed * 9;
    if (kind === ANTIAIR || kind === MISSILE) score = central * 5 + min(advance, 4) * 7 - max(0, advance - 6) * 5;
    if (kind === TANK) score = central * 5 + developed * 8;
    if (kind === INFANTRY || kind === MILITIA) score = central * 3 + developed * 6;
    if (kind === ENGINEER) score = central * 2 + developed * 5;
    if (kind === HQ) score = 0;
    scores[s] = score;
  }
  return scores;
}));

// Hash the stable piece IDs as well as their placements. Move numbers contain IDs.
// Captured heroes remain in the hash because their capture is worth extra points.
let randomState = 0x62E2AC31;
function randomWord() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return randomState | 0;
}
const pieceLo = new Int32Array(64 * 133), pieceHi = new Int32Array(pieceLo.length);
const carryLo = new Int32Array(64 * 65), carryHi = new Int32Array(carryLo.length);
const heroLo = new Int32Array(64), heroHi = new Int32Array(64);
const actedLo = new Int32Array(64), actedHi = new Int32Array(64);
for (let i = 0; i < pieceLo.length; i++) { pieceLo[i] = randomWord(); pieceHi[i] = randomWord(); }
for (let i = 0; i < carryLo.length; i++) { carryLo[i] = randomWord(); carryHi[i] = randomWord(); }
for (let i = 0; i < 64; i++) { heroLo[i] = randomWord(); heroHi[i] = randomWord(); actedLo[i] = randomWord(); actedHi[i] = randomWord(); }

const TABLE_SIZE = 1 << 17;
const ttLo = new Int32Array(TABLE_SIZE), ttHi = new Int32Array(TABLE_SIZE);
const ttContext = new Int32Array(TABLE_SIZE), ttClock = new Uint8Array(TABLE_SIZE);
const ttDepth = new Int8Array(TABLE_SIZE), ttFlag = new Uint8Array(TABLE_SIZE);
const ttValue = new Int32Array(TABLE_SIZE), ttMove = new Int32Array(TABLE_SIZE);
const ttLine = new Int32Array(TABLE_SIZE * 4), ttLength = new Uint8Array(TABLE_SIZE);
const EXACT = 1, LOWER = 2, UPPER = 3;
const evalLo = new Int32Array(1 << 15), evalHi = new Int32Array(1 << 15);
const evalScore = new Int16Array(1 << 15), evalUsed = new Uint8Array(1 << 15);
const moveLists = Array.from({ length: MAX_PLY }, () => []);
const orderLists = Array.from({ length: MAX_PLY }, () => []);
const extraMoves = Array.from({ length: MAX_PLY }, () => []);
const principal = Array.from({ length: MAX_PLY }, () => []);
const pool = [];
const killers = new Int32Array(MAX_PLY * 2);
const history = new Int16Array(2 * 11 * 132);
let rootSeen, repeatContext = 0, rootDescriptor = 0;
let timer, reserve = 0, stopped = false, nodes = 0;

function expired() {
  if (timer() > reserve) return false;
  stopped = true;
  return true;
}

// Reuse the engine's representation. Only CC.play mutates game rules.
function childPosition(S, ply) {
  let T = pool[ply];
  if (!T || T.n !== S.n) { T = CC.clone(S); pool[ply] = T; return T; }
  T.kind = S.kind; T.own = S.own; T.cmd = S.cmd; T.total = S.total;
  T.had = S.had; T.men = S.men;
  T.top.set(S.top); T.at.set(S.at); T.car.set(S.car);
  T.c1.set(S.c1); T.c2.set(S.c2); T.hero.set(S.hero);
  T.turn = S.turn; T.half = S.half; T.full = S.full; T.over = S.over;
  T.dOrg = S.dOrg; T.dAct = S.dAct.slice(); T.dIrr = S.dIrr;
  T.ad[0] = null; T.ad[1] = null; T.log = null;
  return T;
}

function hash(S) {
  let lo = rootDescriptor ^ imul(S.turn + 1, 0x9E3779B9);
  let hi = imul(S.dOrg + 2, 0x85EBCA6B) ^ imul(S.dIrr + 1, 0x27D4EB2D);
  for (let p = 0; p < S.n; p++) {
    const position = p * 133 + S.at[p] + 1;
    lo ^= pieceLo[position]; hi ^= pieceHi[position];
    const carrier = p * 65 + S.car[p] + 1;
    lo ^= carryLo[carrier]; hi ^= carryHi[carrier];
    if (S.hero[p]) { lo ^= heroLo[p]; hi ^= heroHi[p]; }
    // c1/c2 order affects the bits of encoded deployment moves.
    if (S.c1[p] >= 0) lo ^= imul((p + 1) * 65 + S.c1[p], 0x7FEB352D);
    if (S.c2[p] >= 0) hi ^= imul((p + 1) * 65 + S.c2[p], 0x846CA68B);
  }
  for (const p of S.dAct) { lo ^= actedLo[p]; hi ^= actedHi[p]; }
  return [lo | 0, hi | 0];
}
// Compact equivalent of CC.posKey. It distinguishes carrier and rider order,
// sorts riders by kind, and deliberately ignores piece IDs and captured pieces.
const repetitionLo = new Int32Array(132 * 3 * 44), repetitionHi = new Int32Array(repetitionLo.length);
for (let i = 0; i < repetitionLo.length; i++) { repetitionLo[i] = randomWord(); repetitionHi[i] = randomWord(); }
function repetitionKey(S) {
  let lo = S.turn, hi = S.turn * 0x12345;
  for (let square = 0; square < 132; square++) {
    const top = S.top[square];
    if (top < 0) continue;
    let index = square * 132 + 4 * S.kind[top] + 2 * S.own[top] + S.hero[top];
    lo ^= repetitionLo[index]; hi ^= repetitionHi[index];
    let a = S.c1[top], b = S.c2[top];
    if (b >= 0 && S.kind[a] > S.kind[b]) { const old = a; a = b; b = old; }
    if (a >= 0) {
      index = square * 132 + 44 + 4 * S.kind[a] + 2 * S.own[a] + S.hero[a];
      lo ^= repetitionLo[index]; hi ^= repetitionHi[index];
    }
    if (b >= 0) {
      index = square * 132 + 88 + 4 * S.kind[b] + 2 * S.own[b] + S.hero[b];
      lo ^= repetitionLo[index]; hi ^= repetitionHi[index];
    }
  }
  return lo + ',' + hi;
}
function importedRepetitionKey(key) {
  const parts = key.split('|'), side = parts[0] === 'b' ? 1 : 0;
  let lo = side, hi = side * 0x12345;
  for (let i = 1; i < parts.length; i++) {
    const colon = parts[i].indexOf(':'), square = +parts[i].slice(0, colon);
    const occupants = parts[i].slice(colon + 1).match(/[CITMEAGSFNH][rb]\*?/g) || [];
    for (let j = 0; j < occupants.length; j++) {
      const p = occupants[j], kind = CC.KIND_CODE.indexOf(p[0]);
      const index = square * 132 + j * 44 + kind * 4 + (p[1] === 'b' ? 2 : 0) + (p.length === 3 ? 1 : 0);
      lo ^= repetitionLo[index]; hi ^= repetitionHi[index];
    }
  }
  return lo + ',' + hi;
}
function repetitionToken(key, count) {
  if (!count) return 0;
  const comma = key.indexOf(','), lo = +key.slice(0, comma), hi = +key.slice(comma + 1);
  return imul(lo ^ hi ^ imul(count, 0x9E3779B9), 0x85EBCA6B);
}
function outcome(S, side, ply) {
  return S.over.winner < 0 ? 0 : S.over.winner === side ? WIN - ply : -WIN + ply;
}
function pointOutcome(S, side, ply) {
  const score = CC.points(S), diff = score[side] - score[1 - side];
  return diff === 0 ? 0 : diff > 0 ? WIN - ply : -WIN + ply;
}
function scoreFromTable(i, ply) {
  const v = ttValue[i];
  return v > MATE_BOUND ? v - ply : v < -MATE_BOUND ? v + ply : v;
}
function store(S, lo, hi, depth, ply, score, flag, move) {
  const i = lo & (TABLE_SIZE - 1);
  if (ttFlag[i] && ttLo[i] === lo && ttHi[i] === hi &&
      ttContext[i] === repeatContext && ttClock[i] === S.half && ttDepth[i] > depth + 1) return;
  ttLo[i] = lo; ttHi[i] = hi; ttContext[i] = repeatContext; ttClock[i] = S.half;
  ttDepth[i] = depth; ttFlag[i] = flag; ttMove[i] = move;
  const line = principal[ply];
  ttLength[i] = min(4, line.length);
  for (let j = 0; j < ttLength[i]; j++) ttLine[i * 4 + j] = line[j];
  ttValue[i] = score > MATE_BOUND ? score + ply : score < -MATE_BOUND ? score - ply : score;
}

function pieceValue(S, p) {
  return value[S.kind[p]] + (S.hero[p] ? heroValue[S.kind[p]] : 0);
}
function stackValue(S, top) {
  if (top < 0) return 0;
  let score = pieceValue(S, top);
  if (S.c1[top] >= 0) score += pieceValue(S, S.c1[top]);
  if (S.c2[top] >= 0) score += pieceValue(S, S.c2[top]);
  return score;
}
function criticalStack(S, target, arms) {
  const members = CC.members(S, target), removed = [0, 0, 0];
  for (const p of members) {
    if (S.kind[p] === COMMANDER) return true;
    const arm = CC.armOf(S.kind[p]);
    if (arm >= 0) removed[arm]++;
  }
  if (S.total) return false;
  const side = S.own[S.top[target]];
  for (let a = 0; a < 3; a++) if (S.had[side][a] && arms[a] === removed[a]) return true;
  return false;
}

// Forces quiescence to search quiet rescues of a last ship, last plane or Commander.
function threatened(S) {
  if (CC.inCheck(S, S.turn)) return true;
  if (S.total) return false;
  const mine = CC.arms(S, S.turn);
  for (let p = 0; p < S.n; p++) {
    if (S.own[p] !== S.turn || S.at[p] < 0 || S.car[p] >= 0) continue;
    if (!criticalStack(S, S.at[p], mine)) continue;
    for (let q = 0; q < S.n; q++) {
      if (S.own[q] !== S.turn && S.at[q] >= 0 && CC.attacks(S, q, S.at[p])) return true;
    }
  }
  return false;
}

function evaluate(S, lo, hi) {
  const slot = lo & (evalScore.length - 1);
  let raw;
  if (evalUsed[slot] && evalLo[slot] === lo && evalHi[slot] === hi) raw = evalScore[slot];
  else {
    const totals = [0, 0], arms = [[0, 0, 0], [0, 0, 0]];
    const defences = [CC.adMask(S, RED), CC.adMask(S, BLUE)];
    const commander = [S.at[S.cmd[0]], S.at[S.cmd[1]]];
    for (let p = 0; p < S.n; p++) {
      const s = S.at[p], side = S.own[p], kind = S.kind[p];
      if (s < 0) continue;
      const arm = CC.armOf(kind);
      if (arm >= 0) arms[side][arm]++;
      totals[side] += pieceValue(S, p) + pst[side][kind][s];
      const enemy = commander[1 - side];
      if (kind !== COMMANDER && kind !== HQ && enemy >= 0) {
        const distance = max(abs(files[s] - files[enemy]), abs(ranks[s] - ranks[enemy]));
        const range = CC.CAP_ORTH[kind] + S.hero[p];
        const approach = max(0, range + 3 - distance);
        totals[side] += approach * (kind === ARTILLERY || kind === AIR ? 8 : 4);
      }
      if (S.car[p] >= 0) {
        totals[side] -= kind === COMMANDER ? 0 : 18;
        if (kind === COMMANDER && S.kind[S.car[p]] === HQ) totals[side] += 35;
      }
      if (kind === COMMANDER || kind === NAVY || kind === AIR) {
        if (defences[side][s]) totals[side] += kind === COMMANDER ? 36 : 22;
      }
      if (kind === AIR && !S.hero[p] && defences[1 - side][s]) totals[side] -= 35;
      if (S.car[p] < 0 && S.c1[p] >= 0) {
        totals[side] += 13;
        if (kind === AIR || kind === NAVY) totals[side] += 9;
      }
    }
    if (!S.total) {
      for (let side = 0; side < 2; side++) {
        // The second ship and plane allow trades that the last one cannot survive.
        if (S.had[side][0] && arms[side][0] === 1) totals[side] -= 210;
        if (S.had[side][1] && arms[side][1] === 1) totals[side] -= 190;
        if (S.had[side][2] && arms[side][2] === 1) totals[side] -= 150;
      }
    }
    // Static pressure uses the engine's attack rules, including a rider's fire.
    for (let target = 0; target < S.n; target++) {
      if (S.at[target] < 0 || S.car[target] >= 0) continue;
      const side = S.own[target], square = S.at[target];
      let attackers = 0, cheapest = INF;
      for (let p = 0; p < S.n; p++) {
        if (S.own[p] === side || S.at[p] < 0 || !CC.attacks(S, p, square)) continue;
        attackers++; cheapest = min(cheapest, pieceValue(S, p));
      }
      if (!attackers) continue;
      const worth = stackValue(S, target);
      let defended = false;
      for (let p = 0; p < S.n; p++) {
        if (S.own[p] === side && S.at[p] >= 0 && S.at[p] !== square && CC.attacks(S, p, square)) {
          defended = true; break;
        }
      }
      let pressure = 12 + min(3, attackers) * 10 + (defended ? max(0, worth - cheapest) / 22 : worth / 18);
      if (criticalStack(S, square, arms[side])) pressure += 65;
      totals[side] -= pressure;
    }
    // Actual capture points govern repetition and the quiet-turn adjudication.
    const points = CC.points(S);
    raw = (totals[RED] - totals[BLUE] + (points[RED] - points[BLUE]) * 2) | 0;
    evalUsed[slot] = 1; evalLo[slot] = lo; evalHi[slot] = hi; evalScore[slot] = raw;
  }
  if (S.half > 70) {
    const points = CC.points(S), diff = points[RED] - points[BLUE];
    raw += (S.half - 70) * (diff > 0 ? 12 : diff < 0 ? -12 : 0);
  }
  return (S.turn === RED ? raw : -raw) + 5;
}

function tactical(mode) {
  return mode === CAPTURE || mode === STAY || mode === SUICIDE;
}
function historyIndex(S, m) {
  return ((S.turn * 11 + S.kind[mActor(m)]) * 132) + mTo(m);
}
function movePriority(S, m, hint, ply) {
  if (m === hint) return 10000000;
  const mode = mMode(m);
  if (mode === COMMIT) return 20;
  const p = mActor(m), kind = S.kind[p], from = mFrom(m), to = mTo(m);
  if (mode === INTERCEPT) return -200000 - pieceValue(S, p);
  if (tactical(mode)) {
    const top = S.top[to];
    let gain = stackValue(S, top);
    // Capturing the last plane/ship wins even when that piece is well defended.
    // Search these before ordinary exchanges, including in quiescence.
    if (top >= 0 && criticalStack(S, to, CC.arms(S, S.own[top]))) gain += WIN;
    if (mode === SUICIDE) {
      const group = mGroup(m), here = CC.members(S, from);
      for (let j = 0; j < here.length; j++) if ((group >> j) & 1) gain -= pieceValue(S, here[j]);
    }
    return 30000 + 15 * gain - pieceValue(S, p) + (mode === STAY ? 80 : 0);
  }
  let rank = history[historyIndex(S, m)] + 5 * (pst[S.turn][kind][to] - pst[S.turn][kind][from]);
  if (m === killers[2 * ply]) rank += 18000;
  else if (m === killers[2 * ply + 1]) rank += 14000;
  if (mode === COMBINE) rank += kind === COMMANDER ? 150 : -50;
  return rank;
}
function pick(list, scores, at) {
  let best = at;
  for (let i = at + 1; i < list.length; i++) if (scores[i] > scores[best]) best = i;
  const m = list[best]; list[best] = list[at]; scores[best] = scores[at]; list[at] = m;
  return m;
}
function reward(S, m, ply, depth) {
  if (mMode(m) === COMMIT || mMode(m) === INTERCEPT) return;
  const i = ply * 2;
  if (killers[i] !== m) { killers[i + 1] = killers[i]; killers[i] = m; }
  const index = historyIndex(S, m), bonus = min(1000, depth * depth * 35);
  history[index] += bonus - ((history[index] * bonus) >> 13);
}

// Repetition counts change only at a completed turn, exactly as the referee does.
// Bounds include the repetition context, so a draw/points result from one history
// cannot be reused under another history.
function descend(T, side, depth, ply, alpha, beta, qleft) {
  if (T.over) { principal[ply] = []; return outcome(T, side, ply); }
  const same = T.turn === side;
  if (same) return search(T, depth, ply, alpha, beta, qleft);
  const key = repetitionKey(T), old = rootSeen.get(key) || 0;
  if (old >= 2) { principal[ply] = []; return pointOutcome(T, side, ply); }
  const previousContext = repeatContext;
  repeatContext ^= repetitionToken(key, old) ^ repetitionToken(key, old + 1);
  rootSeen.set(key, old + 1);
  const result = -search(T, depth - 1, ply, -beta, -alpha, depth <= 0 ? qleft - 1 : qleft);
  if (old) rootSeen.set(key, old); else rootSeen.delete(key);
  repeatContext = previousContext;
  return result;
}

function search(S, depth, ply, alpha, beta, qleft) {
  principal[ply] = [];
  if ((++nodes & 15) === 0 && expired()) return 0;
  if (S.over) return outcome(S, S.turn, ply);
  const [lo, hi] = hash(S), slot = lo & (TABLE_SIZE - 1);
  const match = ttFlag[slot] && ttLo[slot] === lo && ttHi[slot] === hi;
  const hint = match ? ttMove[slot] : 0;
  const qsearch = depth <= 0;
  const needed = qsearch ? -1 - Q_TURNS + max(0, qleft) : depth;
  if (match && ttContext[slot] === repeatContext && ttClock[slot] === S.half && ttDepth[slot] >= needed) {
    const score = scoreFromTable(slot, ply), flag = ttFlag[slot];
    if (flag === EXACT || (flag === LOWER && score >= beta) || (flag === UPPER && score <= alpha)) {
      principal[ply] = Array.from(ttLine.subarray(slot * 4, slot * 4 + ttLength[slot]));
      return score;
    }
  }
  const danger = threatened(S), deployment = S.dOrg >= 0;
  const force = danger || deployment || S.half === 99;
  const original = alpha;
  const horizon = ply >= MAX_PLY - 5;
  const staticScore = qsearch || horizon ? evaluate(S, lo, hi) : 0;
  // In a deployment keep going until the turn is legal and complete.
  if ((horizon || (qsearch && qleft < 0)) && !deployment) {
    if (!CC.legalMoves(S).length) return -WIN + ply;
    return staticScore;
  }
  let best = qsearch && !force ? staticScore : -INF, bestMove = 0, legal = 0;
  const list = moveLists[ply], scores = orderLists[ply];
  list.length = 0;
  if (!qsearch || force) CC.gen(S, list);
  else {
    CC.gen(S, list, true);
    // Capture-only generation omits attacks by individual riders. Add those
    // using the engine's ordinary stack generator.
    const extra = extraMoves[ply];
    for (let p = 0; p < S.n; p++) {
      if (S.at[p] < 0 || S.own[p] !== S.turn || S.car[p] >= 0 || S.c1[p] < 0) continue;
      extra.length = 0;
      CC.genSquare(S, S.at[p], extra, false);
      for (const m of extra) if (tactical(mMode(m)) && !list.includes(m)) list.push(m);
    }
  }
  if (qsearch && !force) {
    // Verify mobility before standing pat. Try one piece at a time, stopping
    // at its first legal action instead of generating every quiet move.
    const probe = extraMoves[ply];
    let mobile = false;
    for (let p = 0; p < S.n && !mobile; p++) {
      if (S.at[p] < 0 || S.own[p] !== S.turn || S.car[p] >= 0) continue;
      probe.length = 0;
      CC.genSquare(S, S.at[p], probe, false);
      for (const m of probe) {
        const T = childPosition(S, ply + 1);
        if (CC.play(T, m, true) && (T.dOrg < 0 || CC.canFinish(T, 0))) { mobile = true; break; }
      }
    }
    if (!mobile) return -WIN + ply;
    if (best >= beta) return best;
    if (best > alpha) alpha = best;
    let count = 0;
    for (const m of list) if (tactical(mMode(m))) list[count++] = m;
    list.length = count;
  }
  for (let i = 0; i < list.length; i++) scores[i] = movePriority(S, list[i], hint, ply);
  for (let i = 0; i < list.length; i++) {
    if ((i & 15) === 0 && expired()) return 0;
    const m = pick(list, scores, i), mode = mMode(m);
    const cap = tactical(mode), top = mode === COMMIT ? -1 : S.top[mFrom(m)];
    const splitting = top >= 0 && S.c1[top] >= 0 &&
      (mode === STAY || mGroup(m) !== (1 << CC.members(S, mFrom(m)).length) - 1);
    const T = childPosition(S, ply + 1);
    if (!CC.play(T, m, true)) continue;
    // A partial deployment with no legal completion is a losing search branch.
    // At the root legalMoves performs canFinish explicitly.
    legal++;
    const same = !T.over && T.turn === S.turn;
    const newHero = mode !== COMMIT && T.hero[mActor(m)] > S.hero[mActor(m)];

    let score;
    const quiet = mode === MOVE && !splitting && !newHero;
    const reduce = !qsearch && depth >= 3 && legal > 5 && quiet && !force && !same &&
      m !== hint && m !== killers[2 * ply] && !CC.inCheck(T, T.turn);
    const reduction = reduce ? 1 + (depth >= 5 && legal > 14 ? 1 : 0) : 0;
    if (best === -INF) score = descend(T, S.turn, depth, ply + 1, alpha, beta, qleft);
    else {
      score = descend(T, S.turn, depth - reduction, ply + 1, alpha, alpha + 1, qleft);
      if (!stopped && reduction && score > alpha) score = descend(T, S.turn, depth, ply + 1, alpha, alpha + 1, qleft);
      if (!stopped && score > alpha && score < beta) score = descend(T, S.turn, depth, ply + 1, alpha, beta, qleft);
    }
    if (stopped) return 0;
    if (score > best) {
      best = score; bestMove = m;
      principal[ply] = same ? [m].concat(principal[ply + 1]) : [m];
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) { if (!cap && depth > 0) reward(S, m, ply, depth); break; }
  }
  if (!legal && (force || !qsearch)) return -WIN + ply;
  store(S, lo, hi, needed, ply, best, best <= original ? UPPER : best >= beta ? LOWER : EXACT, bestMove);
  return best;
}

// Legal, complete backup turns are also useful when a transposition supplies a
// score but only the first action of its principal variation.
function completeTurn(S, proposed) {
  const T = CC.clone(S), side = S.turn, answer = [];
  for (let step = 0; step < 4 && !T.over && T.turn === side; step++) {
    const legal = CC.legalMoves(T);
    if (!legal.length) break;
    let m = proposed[step];
    if (!legal.includes(m)) {
      let best = -INF; m = legal[0];
      for (const candidate of legal) {
        const score = movePriority(T, candidate, 0, 0);
        if (score > best) { best = score; m = candidate; }
      }
    }
    answer.push(m);
    if (!CC.play(T, m, true)) break;
  }
  return answer;
}

function immediateReplyWins(S) {
  const attacks = CC.gen(S, [], true);
  for (const m of attacks) {
    if (!tactical(mMode(m))) continue;
    const T = childPosition(S, 2);
    if (CC.play(T, m, true) && T.over && T.over.winner === S.turn) return true;
  }
  return false;
}

function turn(S, ctx) {
  timer = ctx.timeLeft;
  reserve = max(6, min(75, ctx.timeMs * 0.09));
  stopped = false; nodes = 0;
  ttFlag.fill(0); evalUsed.fill(0); killers.fill(0);
  for (let i = 0; i < history.length; i++) history[i] >>= 1;
  rootDescriptor = S.total ^ (S.n << 8);
  for (let p = 0; p < S.n; p++) rootDescriptor = imul(rootDescriptor ^ (S.kind[p] + 16 * S.own[p] + 64 * p), 16777619);
  rootSeen = new Map(Object.entries(ctx.seen || {}).map(([key, count]) => [importedRepetitionKey(key), count]));
  repeatContext = 0;
  for (const [key, count] of rootSeen) repeatContext ^= repetitionToken(key, count);
  const legal = CC.legalMoves(S);
  if (!legal.length) return [];
  const roots = legal.map(m => ({ m, score: movePriority(S, m, 0, 0), unsafe: false }));
  roots.sort((a, b) => b.score - a.score);
  let answer = completeTurn(S, [roots[0].m]);
  if (roots.length === 1 && S.dOrg < 0) return answer;
  // Screen every root action for immediate wins and establish a positional order.
  for (const root of roots) {
    if (expired()) break;
    const T = childPosition(S, 1);
    if (!CC.play(T, root.m, true)) continue;
    if (T.over && T.over.winner === S.turn) return [root.m];
    if (T.over && T.over.winner !== -1 && T.over.winner !== S.turn) root.unsafe = true;
    if (!T.over && T.turn !== S.turn) {
      const repeated = (rootSeen.get(repetitionKey(T)) || 0) >= 2;
      if (repeated) {
        const result = pointOutcome(T, S.turn, 1);
        if (result > MATE_BOUND) return [root.m];
        root.unsafe = result < -MATE_BOUND;
      } else root.unsafe = immediateReplyWins(T);
    }
    const h = hash(T);
    const v = T.over ? outcome(T, S.turn, 1) : evaluate(T, h[0], h[1]) * (T.turn === S.turn ? 1 : -1);
    root.score = v;
  }
  if (roots.some(r => !r.unsafe)) {
    let count = 0;
    for (const r of roots) if (!r.unsafe) roots[count++] = r;
    roots.length = count;
  }
  roots.sort((a, b) => b.score - a.score);
  if (!stopped) answer = completeTurn(S, [roots[0].m]);
  for (let depth = 1; depth <= 30 && !expired(); depth++) {
    let alpha = -INF, best = answer[0], iteration = answer;
    for (let i = 0; i < roots.length; i++) {
      if (expired()) break;
      const r = roots[i], T = childPosition(S, 1);
      CC.play(T, r.m, true);
      let score;
      if (!i) {
        const window = depth > 1 && abs(r.score) < MATE_BOUND ? 150 : INF;
        const low = max(-INF, r.score - window), high = min(INF, r.score + window);
        score = descend(T, S.turn, depth, 1, low, high, Q_TURNS);
        if (!stopped && (score <= low || score >= high)) score = descend(T, S.turn, depth, 1, -INF, INF, Q_TURNS);
      } else {
        score = descend(T, S.turn, depth, 1, alpha, alpha + 1, Q_TURNS);
        if (!stopped && score > alpha) score = descend(T, S.turn, depth, 1, alpha, INF, Q_TURNS);
      }
      if (stopped) break;
      r.score = score;
      if (score > alpha) {
        alpha = score; best = r.m;
        iteration = !T.over && T.turn === S.turn ? [r.m].concat(principal[1]) : [r.m];
      }
      if (alpha >= WIN - 1) break;
    }
    // Keep improvements from a deeper search, but never replace a usable backup
    // by a proven losing line when its alternatives have not been searched yet.
    if (!stopped || alpha > -MATE_BOUND) answer = iteration;
    if (stopped || abs(alpha) > MATE_BOUND) break;
    roots.sort((a, b) => a.m === best ? -1 : b.m === best ? 1 : b.score - a.score);
  }
  return completeTurn(S, answer);
}

registerAI({
  id: 'astra-commander',
  name: 'Astra Commander Max',
  author: 'GPT-6 Astra Max',
  about: 'Coordinates artillery, air power and deployments to attack the Commander and decisive branches. Protects its last ship and plane and uses repetition when capture points favour it.',
  levels: 1,
  turn,
});
