/* Sol Commander — GPT-6.1 Sol Max, Commander Chess AI kit 2.
 * Standalone, synchronous, no imports. The supplied CC engine is the referee.
 * Search depth counts completed turns, including all steps of a deployment.
 */
'use strict';

const SolCommander = (() => {
  const WIN = 30000, MATE = 29000, INF = 32000, INVALID = -40000;
  const MAX_PLY = 72, SIZE = 1 << 18, MASK = SIZE - 2;
  const VALUE = [0, 115, 285, 150, 115, 420, 260, 430, 700, 1100, 85];
  const HERO = [0, 100, 160, 105, 100, 190, 175, 230, 650, 330, 130];
  const ttLo = new Int32Array(SIZE), ttHi = new Int32Array(SIZE);
  const ttCtxLo = new Int32Array(SIZE), ttCtxHi = new Int32Array(SIZE);
  const ttMove = new Int32Array(SIZE).fill(-1), ttScore = new Int16Array(SIZE);
  const ttDepth = new Int8Array(SIZE).fill(-1), ttFlag = new Uint8Array(SIZE), ttAge = new Uint16Array(SIZE);
  const killers = new Int32Array(MAX_PLY * 2).fill(-1), history = new Int32Array(64 * 132);
  const moveBuffers = Array.from({ length: MAX_PLY }, () => []);
  const orderBuffers = Array.from({ length: MAX_PLY }, () => []);
  const pv = Array.from({ length: MAX_PLY }, () => []);
  const zPosLo = new Int32Array(64 * 133), zPosHi = new Int32Array(64 * 133);
  const zHeroLo = new Int32Array(64), zHeroHi = new Int32Array(64);
  const zLinkLo = new Int32Array(64 * 65 * 3), zLinkHi = new Int32Array(64 * 65 * 3);
  const zMiscLo = new Int32Array(512), zMiscHi = new Int32Array(512);
  const zActLo = new Int32Array(64), zActHi = new Int32Array(64);
  const EVAL_SIZE = 1 << 17;
  const evalLo = new Int32Array(EVAL_SIZE), evalHi = new Int32Array(EVAL_SIZE);
  const evalValue = new Int16Array(EVAL_SIZE), evalValid = new Uint8Array(EVAL_SIZE);
  let seed = 0x61c07e21;
  const randomWord = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  for (const a of [zPosLo, zPosHi, zHeroLo, zHeroHi, zLinkLo, zLinkHi, zMiscLo, zMiscHi, zActLo, zActHi])
    for (let i = 0; i < a.length; i++) a[i] = randomWord();

  const STOP = {};
  let clock = null, reserve = 0, nodes = 0, qnodes = 0, hits = 0, generation = 0;
  let seen = {}, contextLo = 0, contextHi = 0, lastSchema = '', lastAnalysis = null;
  let rootBest = -1, rootLine = [];

  function checkTime() { if (clock && clock() <= reserve) throw STOP; }
  function tick() { if ((++nodes & 15) === 0) checkTime(); }
  function pieceValue(S, p) { return VALUE[S.kind[p]] + (S.hero[p] ? HERO[S.kind[p]] : 0); }
  function stackValue(S, s) {
    const p = S.top[s]; if (p < 0) return 0;
    let v = S.kind[p] === CC.COMMANDER ? 20000 : pieceValue(S, p);
    for (const q of [S.c1[p], S.c2[p]]) if (q >= 0) v += S.kind[q] === CC.COMMANDER ? 20000 : pieceValue(S, q);
    return v;
  }
  function stateKey(S) {
    if (S._solEpoch === generation && S._solKey) return S._solKey;
    let lo = zMiscLo[S.turn], hi = zMiscHi[S.turn];
    lo ^= zMiscLo[2 + Math.min(100, S.half)] ^ zMiscLo[104 + S.dOrg + 1];
    hi ^= zMiscHi[2 + Math.min(100, S.half)] ^ zMiscHi[104 + S.dOrg + 1];
    if (S.dIrr) { lo ^= zMiscLo[240]; hi ^= zMiscHi[240]; }
    if (S.total) { lo ^= zMiscLo[241]; hi ^= zMiscHi[241]; }
    for (let p = 0; p < S.n; p++) {
      const i = p * 133 + S.at[p] + 1;
      lo ^= zPosLo[i]; hi ^= zPosHi[i];
      if (S.hero[p]) { lo ^= zHeroLo[p]; hi ^= zHeroHi[p]; }
      if (S.car[p] >= 0) { const j = (p * 65 + S.car[p] + 1) * 3; lo ^= zLinkLo[j]; hi ^= zLinkHi[j]; }
      if (S.c1[p] >= 0) { const j = (p * 65 + S.c1[p] + 1) * 3 + 1; lo ^= zLinkLo[j]; hi ^= zLinkHi[j]; }
      if (S.c2[p] >= 0) { const j = (p * 65 + S.c2[p] + 1) * 3 + 2; lo ^= zLinkLo[j]; hi ^= zLinkHi[j]; }
    }
    for (const p of S.dAct) { lo ^= zActLo[p]; hi ^= zActHi[p]; }
    S._solEpoch = generation;
    return S._solKey = [lo | 0, hi | 0];
  }
  function stringKey(s) {
    let lo = 0x811c9dc5, hi = 0x9e3779b9;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); lo = Math.imul(lo ^ c, 16777619); hi = Math.imul(hi ^ c, 0x85ebca6b); }
    return [lo | 0, hi | 0];
  }
  function changeContext(code, old, next) {
    contextLo ^= Math.imul(code[0], old * 0x45d9f3b) ^ Math.imul(code[0], next * 0x45d9f3b);
    contextHi ^= Math.imul(code[1], old * 0x119de1f3) ^ Math.imul(code[1], next * 0x119de1f3);
  }
  function terminal(S, ply) {
    if (!S.over) return null;
    return S.over.winner < 0 ? 0 : S.over.winner === S.turn ? WIN - ply : -WIN + ply;
  }

  function positional(S, p, square) {
    const side = S.own[p], k = S.kind[p], f = CC.fileOf(square), r = CC.rankOf(square);
    const advance = side ? 13 - r : r, center = 5 - Math.abs(f - 5);
    const enemy = S.cmd[1 - side], enemySquare = enemy >= 0 ? S.at[enemy] : -1;
    let near = 0;
    if (enemySquare >= 0) near = Math.max(0, 10 - Math.max(Math.abs(f - CC.fileOf(enemySquare)), Math.abs(r - CC.rankOf(enemySquare))));
    switch (k) {
      case CC.COMMANDER: return -Math.max(0, advance - 3) * 10 + center * 2;
      case CC.NAVY: return Math.min(advance, 8) * 9 + (f === 2 ? 16 : 0) + near * 3;
      case CC.AIR: return Math.min(advance, 8) * 7 + center * 4 + near * (S.hero[p] ? 9 : 3);
      case CC.ARTILLERY: return Math.min(advance, 8) * 8 + center * 4 + near * 5;
      case CC.MISSILE: return Math.min(advance, 7) * 5 + center * 4;
      case CC.ANTIAIR: return Math.min(advance, 7) * 4 + center * 3;
      case CC.TANK: return Math.min(advance, 9) * 8 + center * 5 + near * 3;
      case CC.INFANTRY: case CC.MILITIA: return Math.min(advance, 10) * 7 + center * 3 + near * 2;
      case CC.ENGINEER: return Math.max(0, 4 - Math.abs(advance - 6)) * 5;
      default: return 0;
    }
  }
  function attacked(S, side, square) {
    if (square < 0) return false;
    for (let p = 0; p < S.n; p++) {
      if (S.own[p] === side || S.at[p] < 0) continue;
      const line = CC.LINE[S.at[p] * 132 + square]; if (line === 255) continue;
      const d = line >> 4, distance = (line & 15) + 1, k = S.kind[p];
      const reach = k === CC.HQ ? (S.hero[p] ? (d < 4 ? 2 : 1) : 0) : (d < 4 ? CC.CAP_ORTH[k] : CC.CAP_DIAG[k]) + S.hero[p];
      if (distance <= reach && CC.attacks(S, p, square)) return true;
    }
    return false;
  }
  function endangered(S, side = S.turn) {
    const commander = S.cmd[side];
    if (commander < 0 || S.at[commander] < 0 || attacked(S, side, S.at[commander])) return true;
    if (S.total) return false;
    const arms = CC.arms(S, side);
    for (let p = 0; p < S.n; p++) if (S.own[p] === side && S.at[p] >= 0) {
      const arm = CC.armOf(S.kind[p]);
      if (arm >= 0 && S.had[side][arm] && arms[arm] === 1 && attacked(S, side, S.at[p])) return true;
    }
    return false;
  }
  function evaluateRaw(S) {
    let score = 0;
    const arms = [[0, 0, 0], [0, 0, 0]], count = [0, 0];
    const redAD = CC.adMask(S, CC.RED), blueAD = CC.adMask(S, CC.BLUE);
    for (let p = 0; p < S.n; p++) {
      const square = S.at[p], side = S.own[p], sign = side ? -1 : 1, kind = S.kind[p];
      if (square < 0) continue;
      if (kind !== CC.COMMANDER) count[side]++;
      const arm = CC.armOf(kind); if (arm >= 0) arms[side][arm]++;
      let val = pieceValue(S, p) + positional(S, p, square);
      if (S.car[p] >= 0) {
        val -= kind === CC.ANTIAIR || kind === CC.MISSILE ? 55 : 12;
        if (kind === CC.COMMANDER) val += S.kind[S.car[p]] === CC.HQ ? 120 : 25;
      }
      if (kind === CC.AIR && !S.hero[p]) {
        const enemyAD = side ? redAD : blueAD;
        if (enemyAD[square]) val -= 95;
        // Protected aircraft can develop without exposing the last air arm.
        if ((side ? blueAD : redAD)[square]) val += 20;
      }
      if (kind === CC.COMMANDER) {
        const f = CC.fileOf(square), r = CC.rankOf(square);
        for (let q = 0; q < S.n; q++) if (S.at[q] >= 0 && S.car[q] < 0 && S.kind[q] !== CC.COMMANDER) {
          const distance = Math.max(Math.abs(f - CC.fileOf(S.at[q])), Math.abs(r - CC.rankOf(S.at[q])));
          if (S.own[q] === side && distance <= 2) val += 10;
          if (S.own[q] !== side && distance <= 4) val -= (5 - distance) * (S.kind[q] === CC.ARTILLERY || S.kind[q] === CC.AIR ? 18 : 6);
        }
      }
      score += sign * val;
    }
    if (!S.total) for (let side = 0; side < 2; side++) {
      const sign = side ? -1 : 1;
      // The premium must stay below an ordinary piece's value: losing the
      // penultimate unit must never *increase* the material evaluation.
      if (arms[side][0] === 1 && S.had[side][0]) score += sign * 400;
      if (arms[side][1] === 1 && S.had[side][1]) score += sign * 250;
      if (arms[side][2] === 1 && S.had[side][2]) score += sign * 50;
    }
    // Points settle repetition and quiet-turn endings, rather than a presumed draw.
    const pts = CC.points(S), pointsLead = pts[0] - pts[1];
    score += pointsLead * 2;
    if (S.half > 65) score = score * (100 - S.half) / 35 + Math.sign(pointsLead) * Math.min(6000, Math.abs(pointsLead) * 70) * (S.half - 65) / 35;
    if (count[0] === 1) score -= 80;
    if (count[1] === 1) score += 80;
    return Math.max(-18000, Math.min(18000, ((S.turn ? -score : score) + 12) | 0));
  }
  function evaluate(S) {
    const key = stateKey(S), q = Math.min(100, S.half);
    const lo = (key[0] ^ (q <= 65 ? zMiscLo[2 + q] ^ zMiscLo[2] : 0)) | 0;
    const hi = (key[1] ^ (q <= 65 ? zMiscHi[2 + q] ^ zMiscHi[2] : 0)) | 0;
    const i = lo & (EVAL_SIZE - 1);
    if (evalValid[i] && evalLo[i] === lo && evalHi[i] === hi) return evalValue[i];
    const v = evaluateRaw(S); evalLo[i] = lo; evalHi[i] = hi; evalValue[i] = v; evalValid[i] = 1;
    return v;
  }

  function captureMode(m) { const mode = CC.mMode(m); return mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE; }
  function moveOrder(S, m, hashMove, ply) {
    if (m === hashMove) return 2000000000;
    const mode = CC.mMode(m), from = CC.mFrom(m), to = CC.mTo(m), p = CC.mActor(m);
    if (mode === CC.INTERCEPT) return -2000000;
    if (captureMode(m)) {
      let gain = stackValue(S, to);
      if (mode === CC.SUICIDE) {
        const mem = CC.members(S, from), mask = CC.mGroup(m);
        for (let i = 0; i < mem.length; i++) if ((mask >> i) & 1) gain -= S.kind[mem[i]] === CC.COMMANDER ? 25000 : pieceValue(S, mem[i]);
      }
      return (gain >= 0 ? 1000000 + gain * 256 : -20000 + gain * 64) - pieceValue(S, p) + (mode === CC.STAY ? 40 : 0);
    }
    let val = mode === CC.COMMIT ? 2000 : history[p * 132 + to] + (positional(S, p, to) - positional(S, p, from)) * 32;
    if (m === killers[ply * 2]) val += 150000;
    else if (m === killers[ply * 2 + 1]) val += 130000;
    if (mode === CC.COMBINE) val += S.kind[p] === CC.COMMANDER && S.kind[S.top[to]] === CC.HQ ? 14000 : 500;
    return val;
  }
  function prepare(S, ply, hashMove) {
    const moves = moveBuffers[ply], scores = orderBuffers[ply];
    moves.length = 0; CC.gen(S, moves, false); scores.length = moves.length;
    for (let i = 0; i < moves.length; i++) scores[i] = moveOrder(S, moves[i], hashMove, ply);
    return moves.length;
  }
  function pick(ply, i, n) {
    const moves = moveBuffers[ply], scores = orderBuffers[ply];
    let best = i;
    for (let j = i + 1; j < n; j++) if (scores[j] > scores[best]) best = j;
    if (best !== i) { let x = moves[i]; moves[i] = moves[best]; moves[best] = x; x = scores[i]; scores[i] = scores[best]; scores[best] = x; }
    return moves[i];
  }
  function childSearch(S, T, depth, alpha, beta, ply, qleft) {
    const switched = S.turn !== T.turn;
    let key = null, old = 0, code = null;
    const savedLo = contextLo, savedHi = contextHi;
    if (switched && !T.over) {
      if (!T._solRepeatKey) { T._solRepeatKey = CC.posKey(T); T._solRepeatCode = stringKey(T._solRepeatKey); }
      key = T._solRepeatKey; old = seen[key] || 0; code = T._solRepeatCode;
      seen[key] = old + 1; changeContext(code, old, old + 1);
      if (old >= 2) T.over = CC.onPoints(T, 'repeat');
    }
    try {
      let value;
      if (qleft !== undefined) value = qsearch(T, switched ? -beta : alpha, switched ? -alpha : beta, ply, qleft - (switched ? 1 : 0));
      else value = search(T, depth - (switched ? 1 : 0), switched ? -beta : alpha, switched ? -alpha : beta, ply);
      return value === INVALID ? INVALID : switched ? -value : value;
    } finally {
      if (key !== null) { if (old) seen[key] = old; else delete seen[key]; contextLo = savedLo; contextHi = savedHi; }
    }
  }
  function qsearch(S, alpha, beta, ply, left) {
    tick(); qnodes++; pv[ply].length = 0;
    const end = terminal(S, ply); if (end !== null) return end;
    if (ply >= MAX_PLY - 3) return S.dOrg >= 0 ? INVALID : evaluate(S);
    const pending = S.dOrg >= 0, danger = pending || endangered(S);
    const moves = moveBuffers[ply], scores = orderBuffers[ply];
    moves.length = 0; CC.gen(S, moves, false);
    let n = moves.length;
    checkTime();
    let hasLegal = false;
    // A static evaluation is allowed only if this side really can move.
    // legalMoves/status would regenerate the entire list; find one witness instead.
    if (!pending) for (let i = 0; i < n; i++) {
      const T = CC.clone(S);
      if (CC.play(T, moveBuffers[ply][i], true) && (T.dOrg < 0 || CC.canFinish(T, 0))) { hasLegal = true; break; }
    }
    if (!pending && !hasLegal) return -WIN + ply;
    const stand = pending ? -INF : evaluate(S);
    if (!pending && left <= 0) return stand;
    let best = danger ? -INF : stand, legalCount = 0;
    if (!danger) { if (stand >= beta) return stand; if (stand > alpha) alpha = stand; }
    // Most leaf positions have no captures. Avoid ordering a hundred quiet
    // moves merely to discard them afterwards; retain the legal-move witness.
    if (!danger) {
      let kept = 0;
      for (let i = 0; i < n; i++) if (captureMode(moves[i])) moves[kept++] = moves[i];
      moves.length = n = kept;
    }
    scores.length = n;
    for (let i = 0; i < n; i++) scores[i] = moveOrder(S, moves[i], -1, ply);
    for (let i = 0; i < n; i++) {
      const m = pick(ply, i, n);
      if (!danger && !captureMode(m)) continue;
      if (CC.mMode(m) === CC.INTERCEPT && !danger) continue;
      const T = CC.clone(S); if (!CC.play(T, m, true)) continue;
      const v = childSearch(S, T, 0, alpha, beta, ply + 1, left);
      if (v === INVALID) continue;
      legalCount++;
      if (v > best) { best = v; pv[ply] = [m].concat(pv[ply + 1]); }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (pending && !legalCount) return INVALID;
    if (danger && !legalCount) return hasLegal ? stand : -WIN + ply;
    return best;
  }

  function search(S, depth, alpha, beta, ply) {
    tick(); pv[ply].length = 0;
    const end = terminal(S, ply); if (end !== null) return end;
    if (ply >= MAX_PLY - 3) return S.dOrg >= 0 ? INVALID : evaluate(S);
    if (depth <= 0) return qsearch(S, alpha, beta, ply, 3);
    const originalAlpha = alpha, isPV = beta - alpha > 1;
    const key = stateKey(S), slot = key[0] & MASK;
    let entry = -1, hashMove = -1;
    for (let i = slot; i < slot + 2; i++) if (ttDepth[i] >= 0 && ttLo[i] === key[0] && ttHi[i] === key[1]) {
      if (hashMove < 0 || ttAge[i] === generation) hashMove = ttMove[i];
      if (ttCtxLo[i] === contextLo && ttCtxHi[i] === contextHi) { entry = i; hashMove = ttMove[i]; break; }
    }
    if (entry >= 0 && ply > 0 && !isPV && ttDepth[entry] >= depth) {
      let v = ttScore[entry]; if (v > MATE) v -= ply; else if (v < -MATE) v += ply;
      hits++;
      if (ttFlag[entry] === 0 || (ttFlag[entry] === 1 ? v >= beta : v <= alpha)) { if (hashMove >= 0) pv[ply] = [hashMove]; return v; }
    }
    const pending = S.dOrg >= 0, danger = pending || endangered(S), n = prepare(S, ply, hashMove);
    checkTime();
    let best = -INF, bestMove = -1, searched = 0;
    for (let i = 0; i < n; i++) {
      const m = pick(ply, i, n), mode = CC.mMode(m), taking = captureMode(m);
      // Interceptions are ordered last, but remain searchable: deliberately
      // vacating a square can matter even when the aircraft is lost.
      const T = CC.clone(S); if (!CC.play(T, m, true)) continue;
      let v;
      if (!searched) v = childSearch(S, T, depth, alpha, beta, ply + 1);
      else {
        let reduction = 0;
        if (depth >= 3 && searched >= 5 && !danger && mode === CC.MOVE && T.turn !== S.turn && T.dOrg < 0 && !T.over) {
          let promoted = false; for (let p = 0; p < S.n; p++) if (T.hero[p] !== S.hero[p]) { promoted = true; break; }
          if (!promoted) reduction = 1;
        }
        v = childSearch(S, T, Math.max(1, depth - reduction), alpha, alpha + 1, ply + 1);
        if (reduction && v !== INVALID && v > alpha) v = childSearch(S, T, depth, alpha, alpha + 1, ply + 1);
        if (v !== INVALID && v > alpha && v < beta) v = childSearch(S, T, depth, alpha, beta, ply + 1);
      }
      if (v === INVALID) continue;
      searched++;
      if (v > best) { best = v; bestMove = m; pv[ply] = [m].concat(pv[ply + 1]); }
      if (v > alpha) { alpha = v; if (!ply) { rootBest = m; rootLine = pv[0].slice(); } }
      if (alpha >= beta) {
        if (!taking && mode !== CC.INTERCEPT) {
          if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
          const h = CC.mActor(m) * 132 + CC.mTo(m), bonus = Math.min(1200, depth * depth * 32);
          history[h] += bonus - ((history[h] * bonus / 16384) | 0);
        }
        break;
      }
    }
    if (!searched) return pending ? INVALID : -WIN + ply;
    let target = entry;
    if (target < 0) {
      const merit = i => ttDepth[i] - (ttAge[i] === generation ? 0 : 6);
      target = merit(slot) <= merit(slot + 1) ? slot : slot + 1;
    }
    if (entry < 0 || depth >= ttDepth[target] - 2 || best > originalAlpha) {
      ttLo[target] = key[0]; ttHi[target] = key[1]; ttCtxLo[target] = contextLo; ttCtxHi[target] = contextHi;
      ttDepth[target] = depth; ttMove[target] = bestMove; ttAge[target] = generation;
      ttScore[target] = best > MATE ? best + ply : best < -MATE ? best - ply : best;
      ttFlag[target] = best <= originalAlpha ? 2 : best >= beta ? 1 : 0;
    }
    return best;
  }

  function orderedLegal(S) {
    const legal = CC.legalMoves(S), danger = endangered(S);
    return legal.map(m => {
      let score = moveOrder(S, m, -1, 0);
      if (danger || captureMode(m) || CC.mMode(m) === CC.INTERCEPT) {
        const T = CC.clone(S); CC.play(T, m, true);
        if (T.over) score += T.over.winner === S.turn ? 100000000 : T.over.winner >= 0 ? -100000000 : 0;
        else if (danger && T.dOrg < 0 && endangered(T, S.turn)) score -= 3000000;
      }
      return [m, score];
    }).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }
  function completeTurn(S, line, firstLegal) {
    const T = CC.clone(S), side = S.turn, answer = [];
    let cursor = 0;
    while (!T.over && T.turn === side && answer.length < 10) {
      const legal = answer.length ? orderedLegal(T) : firstLegal;
      if (!legal.length) break;
      let m = cursor < line.length ? line[cursor++] : -1;
      if (!legal.includes(m)) m = legal.includes(CC.COMMIT_MOVE) && !endangered(T) ? CC.COMMIT_MOVE : legal[0];
      answer.push(m);
      if (!CC.play(T, m, true)) throw new Error('legal move refused by reference engine');
    }
    return answer;
  }
  function turn(S, ctx) {
    const started = performance.now();
    clock = () => ctx.timeLeft(); reserve = Math.max(12, ctx.timeMs * 0.09);
    nodes = 0; qnodes = 0; hits = 0; generation = (generation + 1) & 65535;
    S._solEpoch = -1; S._solRepeatKey = null;
    const schema = S.total + ':' + Array.from(S.kind).join(',') + ':' + Array.from(S.own).join(',') + ':' + JSON.stringify(S.had) + ':' + S.men;
    if (schema !== lastSchema) { ttDepth.fill(-1); evalValid.fill(0); history.fill(0); lastSchema = schema; }
    else for (let i = 0; i < history.length; i++) history[i] >>= 1;
    killers.fill(-1);
    seen = Object.assign(Object.create(null), ctx.seen || {}); contextLo = 0; contextHi = 0;
    for (const key of Object.keys(seen)) changeContext(stringKey(key), 0, seen[key]);
    const legal = orderedLegal(S);
    if (!legal.length) return [];
    let fallback = completeTurn(S, [], legal), bestLine = fallback.slice(), score = evaluate(S), completed = 0;
    // Taking the last arm can beat even a mutual loss. Let CC adjudicate it.
    for (const m of legal) {
      if (!captureMode(m)) continue;
      const T = CC.clone(S); if (!CC.play(T, m, true)) continue;
      if (T.over && T.over.winner === S.turn) { fallback = [m]; bestLine = [m]; score = WIN - 1; completed = 1; break; }
    }
    rootBest = bestLine[0]; rootLine = bestLine.slice();
    if (score < MATE) for (let depth = 1; depth <= 20; depth++) {
      if (clock() <= reserve) break;
      let width = depth >= 3 ? 130 : INF;
      let alpha = width === INF ? -INF : Math.max(-INF, score - width), beta = width === INF ? INF : Math.min(INF, score + width);
      try {
        for (;;) {
          const value = search(S, depth, alpha, beta, 0);
          if (value === INVALID) break;
          if (value <= alpha && alpha > -INF) { width *= 3; alpha = Math.max(-INF, value - width); continue; }
          if (value >= beta && beta < INF) { width *= 3; beta = Math.min(INF, value + width); continue; }
          // Validate/complete the whole deployment while the reserved time remains.
          bestLine = completeTurn(S, rootLine.length ? rootLine : [rootBest], legal);
          score = value; completed = depth;
          break;
        }
      } catch (e) { if (e !== STOP) throw e; break; }
      if (Math.abs(score) > MATE) break;
    }
    lastAnalysis = { depth: completed, nodes, qnodes, hits, score, ms: performance.now() - started, steps: bestLine.length };
    return bestLine;
  }
  return { turn, analysis: () => lastAnalysis };
})();

registerAI({
  id: 'sol-commander',
  name: 'Sol Commander',
  author: 'GPT-6.1 Sol Max',
  about: 'Coordinates land, sea and air attacks, protects the last ship and aircraft, and calculates complete deployments. Seeks a decisive arm or Commander victory while tracking points and repetitions.',
  levels: 1,
  turn: SolCommander.turn,
  analysis: SolCommander.analysis,
});
