/*
 * Commander Chess — Bastion
 * A single-file, time-bounded search player for the kit's engine.
 * Search is done over whole turns. Splitting a stack may create several
 * actions by the same side; those actions are searched together before the
 * opponent receives a move.
 */
'use strict';

(() => {
  const MATE = 1000000;
  const INF = 1100000;
  const MAX_Q_TURNS = 8;
  const VALUES = [700, 18, 34, 16, 19, 43, 21, 29, 56, 88, 18];
  const ARM_VALUE = [65, 65, 55];

  let ctx, stop, nodes, reserveMs, table, repeatCounts;

  function timeToStop(force) {
    if (stop) return true;
    nodes++;
    if ((force || (nodes & 15) === 0) && ctx.timeLeft() <= reserveMs) stop = true;
    return stop;
  }

  function pieceValue(S, p) {
    const k = S.kind[p];
    if (k === CC.COMMANDER) return 0; // Commander loss is scored as mate.
    const v = VALUES[k];
    return v + (S.hero[p] ? 10 + Math.round(v * 0.18) : 0);
  }

  function stackValue(S, square) {
    const group = CC.members(S, square);
    let value = 0;
    for (const p of group) value += pieceValue(S, p);
    return value;
  }

  function groupValue(S, m) {
    const group = CC.members(S, CC.mFrom(m)), mask = CC.mGroup(m);
    let value = 0;
    for (let i = 0; i < group.length; i++) if ((mask >> i) & 1) value += pieceValue(S, group[i]);
    return value;
  }

  function attackArmBonus(S, targetSide, victims) {
    if (S.total) return 0;
    const remaining = CC.arms(S, targetSide), removed = [0, 0, 0];
    for (const p of victims) {
      const arm = CC.armOf(S.kind[p]);
      if (arm >= 0) removed[arm]++;
    }
    let bonus = 0;
    for (let a = 0; a < 3; a++) {
      if (S.had[targetSide][a] && remaining[a] > 0 && remaining[a] === removed[a]) bonus += 600000;
    }
    return bonus;
  }

  function moveOrder(S, m, ttMove) {
    if (m === ttMove) return 900000000;
    const mode = CC.mMode(m), from = CC.mFrom(m), to = CC.mTo(m);
    const side = S.turn;
    if (mode === CC.COMMIT) return -30000;
    if (mode === CC.INTERCEPT) return -300000;

    let score = 0;
    if (mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE) {
      const victims = CC.members(S, to);
      let victimValue = stackValue(S, to);
      if (victims.some(p => S.kind[p] === CC.COMMANDER)) return 800000000;
      score += 50000 + victimValue * 110;
      score += attackArmBonus(S, 1 - side, victims);
      if (mode === CC.SUICIDE) score -= groupValue(S, m) * 105;
      if (mode === CC.STAY) score += 120;
    }

    if (mode === CC.COMBINE) {
      score += 180;
      const moved = CC.members(S, from), mask = CC.mGroup(m);
      const target = CC.members(S, to);
      for (let i = 0; i < moved.length; i++) if ((mask >> i) & 1) {
        const p = moved[i];
        if (S.kind[p] === CC.COMMANDER && target.some(q => S.kind[q] === CC.HQ)) score += 12000;
        if (S.kind[p] === CC.ARTILLERY || S.kind[p] === CC.MISSILE || S.kind[p] === CC.ANTIAIR) {
          if (target.some(q => S.kind[q] === CC.ENGINEER)) score += 1300;
        }
      }
    }

    if (mode === CC.MOVE || mode === CC.CAPTURE || mode === CC.COMBINE) {
      const enemyCommander = S.cmd[1 - side];
      const enemySq = enemyCommander >= 0 ? S.at[enemyCommander] : -1;
      const moved = CC.members(S, from), mask = CC.mGroup(m);
      const oldRank = CC.rankOf(from), newRank = CC.rankOf(to);
      for (let i = 0; i < moved.length; i++) if ((mask >> i) & 1) {
        const p = moved[i], kind = S.kind[p];
        const forward = side === CC.RED ? newRank - oldRank : oldRank - newRank;
        score += forward * (kind === CC.COMMANDER ? 0.2 : 2.2);
        const center = 5 - Math.abs(CC.fileOf(to) - 5);
        score += center * (kind === CC.COMMANDER ? 0.2 : 0.7);
        if (enemySq >= 0 && kind !== CC.COMMANDER) {
          const oldDist = Math.abs(CC.fileOf(from) - CC.fileOf(enemySq)) + Math.abs(oldRank - CC.rankOf(enemySq));
          const newDist = Math.abs(CC.fileOf(to) - CC.fileOf(enemySq)) + Math.abs(newRank - CC.rankOf(enemySq));
          score += (oldDist - newDist) * Math.min(3, VALUES[kind] * 0.055);
        }
        if (kind === CC.ENGINEER && (newRank === 6 || newRank === 7)) score += 3;
      }
    }
    // The score is already from the moving side's point of view: advancement
    // and captures were measured relative to that side above.
    return score;
  }

  function orderedMoves(S, moves, ttMove, capturesOnly) {
    const list = [];
    for (const m of moves) {
      if (capturesOnly) {
        const mode = CC.mMode(m);
        if (mode !== CC.CAPTURE && mode !== CC.STAY && mode !== CC.SUICIDE) continue;
      }
      list.push(m);
    }
    const scores = new Array(list.length);
    for (let i = 0; i < list.length; i++) scores[i] = moveOrder(S, list[i], ttMove);
    for (let i = 1; i < list.length; i++) {
      const m = list[i], s = scores[i];
      let j = i;
      while (j > 0 && scores[j - 1] < s) {
        list[j] = list[j - 1]; scores[j] = scores[j - 1]; j--;
      }
      list[j] = m; scores[j] = s;
    }
    return list;
  }

  function tryMove(S, m) {
    const T = CC.clone(S);
    if (!CC.play(T, m, true)) return null;
    return T;
  }

  // Quiescence can stop on a quiet position, but this game also loses when a
  // side has no legal move. Find one witness without paying for the complete
  // legal-move list; deployments must still have a legal way to finish.
  function hasLegalMove(S, raw) {
    for (const m of raw) {
      if (timeToStop()) return null;
      const T = tryMove(S, m);
      if (T && (T.over || T.dOrg < 0 || CC.canFinish(T, 0))) return true;
    }
    return false;
  }

  function terminalScore(S, side, ply) {
    if (!S.over) return null;
    if (S.over.winner < 0) return 0;
    return S.over.winner === side ? MATE - ply : -MATE + ply;
  }

  function pointsScore(S, side, ply) {
    const result = CC.onPoints(S, 'repeat');
    if (result.winner < 0) return 0;
    return result.winner === side ? MATE - ply : -MATE + ply;
  }

  function hashRepeat(text, count) {
    let a = 2166136261, b = 0x9e3779b9;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      a = Math.imul(a ^ c, 16777619);
      b = Math.imul(b ^ (c + (a >>> 16)), 2246822519);
    }
    a = Math.imul(a ^ count, 0x85ebca6b);
    b = Math.imul(b ^ count, 0xc2b2ae35);
    return [a | 0, b | 0];
  }

  function transKey(S, pathLo, pathHi) {
    // The table is local to this answer, so ctx.seen is common to every node.
    // The path signature distinguishes lines with different repetition risks.
    return CC.posKey(S) + '#' + S.half + '#' + (pathLo >>> 0) + ':' + (pathHi >>> 0);
  }

  function scoreOnFinishedTurn(S, depthAfterTurn, alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth) {
    const over = terminalScore(S, side, ply);
    if (over !== null) return { valid: true, complete: true, score: over, line: [] };

    const key = CC.posKey(S);
    const prior = (ctx.seen[key] || 0) + (repeatCounts.get(key) || 0);
    if (prior >= 2) return { valid: true, complete: true, score: pointsScore(S, side, ply), line: [] };

    const local = (repeatCounts.get(key) || 0) + 1;
    repeatCounts.set(key, local);
    const token = hashRepeat(key, local), nextLo = pathLo ^ token[0], nextHi = pathHi ^ token[1];
    let score;
    if (qMode) score = -quiescence(S, -beta, -alpha, ply + 1, qDepth + 1, nextLo, nextHi);
    else score = -search(S, depthAfterTurn, -beta, -alpha, ply + 1, nextLo, nextHi);
    if (local === 1) repeatCounts.delete(key); else repeatCounts.set(key, local - 1);
    return { valid: true, complete: !stop, score, line: [] };
  }

  function afterAction(T, depth, alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth, wantLine, reduction) {
    const over = terminalScore(T, side, ply);
    if (over !== null) return { valid: true, complete: true, score: over, line: [] };
    if (T.dOrg >= 0) return deploymentSearch(T, depth, alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth, wantLine);
    return scoreOnFinishedTurn(T, depth - 1 - (reduction || 0), alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth);
  }

  function deploymentSearch(S, depth, alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth, wantLine) {
    const raw = CC.gen(S, []);
    const moves = orderedMoves(S, raw, 0, false);
    let best = -INF, bestLine = [], found = false, searched = 0;

    for (const m of moves) {
      if (timeToStop()) return { valid: false, complete: false, score: 0, line: [] };
      const T = tryMove(S, m);
      if (!T) continue;
      let result;
      if (T.dOrg >= 0) result = deploymentSearch(T, depth, alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth, wantLine);
      else result = scoreOnFinishedTurn(T, depth - 1, alpha, beta, side, ply, pathLo, pathHi, qMode, qDepth);
      if (!result.complete) return { valid: false, complete: false, score: 0, line: [] };
      if (!result.valid) continue;
      found = true; searched++;
      if (result.score > best) {
        best = result.score;
        bestLine = wantLine ? [m].concat(result.line || []) : [];
      }
      if (result.score > alpha) alpha = result.score;
      if (alpha >= beta) break;
    }
    return { valid: found, complete: true, score: found ? best : -INF, line: bestLine };
  }

  function evaluate(S, checked, full) {
    let red = 0, lostRed = 0, lostBlue = 0;
    const arms = [[0, 0, 0], [0, 0, 0]];
    const enemyCommander = [S.at[S.cmd[CC.BLUE]], S.at[S.cmd[CC.RED]]];
    const commanderSq = [S.at[S.cmd[CC.RED]], S.at[S.cmd[CC.BLUE]]];

    for (let p = 0; p < S.n; p++) {
      const side = S.own[p], sign = side === CC.RED ? 1 : -1, kind = S.kind[p], at = S.at[p];
      if (at < 0) {
        const pts = CC.POINTS[kind] + (S.hero[p] ? 10 : 0);
        if (side === CC.BLUE) lostRed += pts; else lostBlue += pts;
        continue;
      }

      const arm = CC.armOf(kind);
      if (arm >= 0) arms[side][arm]++;
      let value = VALUES[kind];
      if (kind === CC.COMMANDER) value = 720;
      if (S.hero[p]) value += 10 + Math.round(value * 0.18);
      red += sign * value;

      if (kind !== CC.COMMANDER && kind !== CC.HQ) {
        const rank = CC.rankOf(at), file = CC.fileOf(at);
        const advance = side === CC.RED ? rank - 1 : 12 - rank;
        const active = kind === CC.NAVY || kind === CC.AIR || kind === CC.ARTILLERY || kind === CC.MISSILE ? 1.25 : 0.8;
        red += sign * ((advance - 4) * active + (5 - Math.abs(file - 5)) * 0.65);
        const target = enemyCommander[side];
        if (target >= 0) {
          const distance = Math.abs(file - CC.fileOf(target)) + Math.abs(rank - CC.rankOf(target));
          red += sign * Math.max(0, 10 - distance) * active * 1.1;
        }
        if (kind === CC.ENGINEER && (rank === 6 || rank === 7) && file > 1 && file !== 5 && file !== 7) red += sign * 6;
      }

      if (kind === CC.COMMANDER && S.car[p] >= 0) {
        const carrier = S.car[p];
        red += sign * (S.kind[carrier] === CC.HQ ? 210 : 105);
      }
      if (S.car[p] < 0 && S.c1[p] >= 0) red += sign * 8; // a mobile stack has tactical reach
    }

    // A small points lead matters if the game reaches its quiet-turn or
    // repetition limit. Exact point wins are handled as terminal positions.
    red += (lostRed - lostBlue) * 0.45;

    if (!S.total) for (let side = 0; side < 2; side++) {
      const sign = side === CC.RED ? 1 : -1;
      for (let arm = 0; arm < 3; arm++) {
        if (!S.had[side][arm] || !arms[side][arm]) continue;
        const left = arms[side][arm];
        red += sign * (left === 1 ? ARM_VALUE[arm] : left === 2 ? ARM_VALUE[arm] * 0.42 : 0);
      }
    }

    if (checked) red -= S.turn === CC.RED ? 360 : -360;

    const redCmd = S.cmd[CC.RED], blueCmd = S.cmd[CC.BLUE];
    if (redCmd >= 0 && S.at[redCmd] >= 0 && blueCmd >= 0 && S.at[blueCmd] >= 0) {
      if (full) {
        const targetRed = S.at[redCmd], targetBlue = S.at[blueCmd];
        let redPressure = 0, bluePressure = 0;
        for (let p = 0; p < S.n; p++) {
          if (S.at[p] < 0 || S.kind[p] === CC.COMMANDER) continue;
          if (S.own[p] === CC.RED && CC.attacks(S, p, targetBlue)) redPressure++;
          if (S.own[p] === CC.BLUE && CC.attacks(S, p, targetRed)) bluePressure++;
        }
        red += Math.min(130, redPressure * 35) - Math.min(130, bluePressure * 35);

        // Air defence both restricts flight routes and shields valuable
        // air pieces from a suicidal raid.
        const redAD = CC.adMask(S, CC.RED), blueAD = CC.adMask(S, CC.BLUE);
        for (let p = 0; p < S.n; p++) {
          if (S.at[p] < 0 || S.kind[p] !== CC.AIR || S.hero[p]) continue;
          const side = S.own[p], sign = side === CC.RED ? 1 : -1, sq = S.at[p];
          const ownMask = side === CC.RED ? redAD : blueAD;
          const foeMask = side === CC.RED ? blueAD : redAD;
          if (ownMask[sq]) red += sign * 12;
          if (foeMask[sq]) red -= sign * 22;
        }

        const savedTurn = S.turn;
        S.turn = CC.RED; const redMobility = CC.gen(S, []).length;
        S.turn = CC.BLUE; const blueMobility = CC.gen(S, []).length;
        S.turn = savedTurn;
        const mobilityDelta = Math.max(-70, Math.min(70, redMobility - blueMobility));
        red += mobilityDelta * 0.28;
      }
    }

    return S.turn === CC.RED ? red : -red;
  }

  // At the quiescence ceiling, still answer a check correctly. Resolve the
  // current side's full turn (including any deployment) and evaluate the
  // resulting position instead of pretending the checked side can stand pat.
  function forcedTurnScore(S, mover, ply) {
    if (timeToStop()) return null;
    const terminal = terminalScore(S, mover, ply);
    if (terminal !== null) return terminal;
    if (S.dOrg < 0) return -evaluate(S, CC.inCheck(S, S.turn), true);

    const raw = CC.gen(S, []), moves = orderedMoves(S, raw, 0, false);
    let best = -INF, found = false;
    for (const m of moves) {
      if (timeToStop()) return null;
      const T = tryMove(S, m);
      if (!T) continue;
      const score = T.dOrg >= 0
        ? forcedTurnScore(T, mover, ply)
        : terminalScore(T, mover, ply) ?? -evaluate(T, CC.inCheck(T, T.turn), true);
      if (score === null) return null;
      found = true;
      if (score > best) best = score;
    }
    return found ? best : -MATE + ply;
  }

  function scoreFromTable(score, ply) {
    if (score > MATE - 10000) return score - ply;
    if (score < -MATE + 10000) return score + ply;
    return score;
  }

  function scoreToTable(score, ply) {
    if (score > MATE - 10000) return score + ply;
    if (score < -MATE + 10000) return score - ply;
    return score;
  }

  function search(S, depth, alpha, beta, ply, pathLo, pathHi) {
    if (timeToStop()) return 0;
    const terminal = terminalScore(S, S.turn, ply);
    if (terminal !== null) return terminal;
    if (depth <= 0) return quiescence(S, alpha, beta, ply, 0, pathLo, pathHi);

    const key = transKey(S, pathLo, pathHi), alphaStart = alpha;
    const entry = table.get(key);
    let ttMove = 0;
    if (entry) {
      ttMove = entry.move;
      if (entry.depth >= depth) {
        const value = scoreFromTable(entry.score, ply);
        if (entry.flag === 0) return value;
        if (entry.flag === 1 && value >= beta) return value;
        if (entry.flag === 2 && value <= alpha) return value;
      }
    }

    const side = S.turn, raw = CC.gen(S, []), moves = orderedMoves(S, raw, ttMove, false);
    let best = -INF, bestMove = 0, searched = 0;

    for (const m of moves) {
      if (timeToStop()) return 0;
      const T = tryMove(S, m);
      if (!T) continue;
      const mode = CC.mMode(m);
      const quiet = T.dOrg < 0 && !T.over && T.half === S.half + 1 && mode === CC.MOVE;
      const reduction = depth >= 4 && searched >= 5 && quiet ? 1 : 0;
      let result;

      if (searched === 0) {
        result = afterAction(T, depth, alpha, beta, side, ply, pathLo, pathHi, false, 0, false, reduction);
      } else {
        result = afterAction(T, depth, alpha, alpha + 1, side, ply, pathLo, pathHi, false, 0, false, reduction);
        if (result.complete && result.valid && result.score > alpha) {
          if (reduction) result = afterAction(T, depth, alpha, alpha + 1, side, ply, pathLo, pathHi, false, 0, false, 0);
          if (result.complete && result.valid && result.score > alpha && result.score < beta) {
            result = afterAction(T, depth, alpha, beta, side, ply, pathLo, pathHi, false, 0, false, 0);
          }
        }
      }
      if (!result.complete) return 0;
      if (!result.valid) continue;
      searched++;
      if (result.score > best) { best = result.score; bestMove = m; }
      if (result.score > alpha) alpha = result.score;
      if (alpha >= beta) break;
    }

    if (!searched) return -MATE + ply;
    const flag = best <= alphaStart ? 2 : best >= beta ? 1 : 0;
    if (table.size > 30000) table.delete(table.keys().next().value);
    table.set(key, { depth, score: scoreToTable(best, ply), flag, move: bestMove });
    return best;
  }

  function quiescence(S, alpha, beta, ply, qDepth, pathLo, pathHi) {
    if (timeToStop()) return 0;
    const terminal = terminalScore(S, S.turn, ply);
    if (terminal !== null) return terminal;

    const checked = CC.inCheck(S, S.turn);
    const stand = evaluate(S, checked, qDepth === 0);
    let raw = null;
    if (checked && qDepth >= MAX_Q_TURNS) {
      raw = CC.gen(S, []);
      const moves = orderedMoves(S, raw, 0, false);
      let best = -INF, found = false;
      for (const m of moves) {
        if (timeToStop()) return 0;
        const T = tryMove(S, m);
        if (!T) continue;
        const score = T.dOrg >= 0
          ? forcedTurnScore(T, S.turn, ply)
          : terminalScore(T, S.turn, ply) ?? -evaluate(T, CC.inCheck(T, T.turn), true);
        if (score === null) return 0;
        found = true;
        if (score > best) best = score;
      }
      return found ? best : -MATE + ply;
    }
    if (!checked) {
      if (stand >= beta) {
        raw = CC.gen(S, []);
        if (!raw.length) return -MATE + ply;
        const legal = hasLegalMove(S, raw);
        if (legal === null) return 0;
        return legal ? stand : -MATE + ply;
      }
      if (stand > alpha) alpha = stand;
      if (qDepth >= 4) {
        raw = CC.gen(S, []);
        if (!raw.length) return -MATE + ply;
        const legal = hasLegalMove(S, raw);
        if (legal === null) return 0;
        return legal ? alpha : -MATE + ply;
      }
    }

    if (!raw) raw = CC.gen(S, []);
    if (!raw.length) return checked ? -MATE + ply : -MATE + ply;
    const moves = orderedMoves(S, raw, 0, !checked);
    let searched = 0, best = checked ? -INF : alpha;

    for (const m of moves) {
      if (timeToStop()) return 0;
      const T = tryMove(S, m);
      if (!T) continue;
      const side = S.turn;
      const result = afterAction(T, 0, alpha, beta, side, ply, pathLo, pathHi, true, qDepth, false, 0);
      if (!result.complete) return 0;
      if (!result.valid) continue;
      searched++;
      if (result.score > best) best = result.score;
      if (result.score > alpha) alpha = result.score;
      if (alpha >= beta) return best;
    }

    if (checked && !searched) return -MATE + ply;
    if (!checked && !searched) {
      const legal = hasLegalMove(S, raw);
      if (legal === null) return 0;
      if (!legal) return -MATE + ply;
    }
    return checked ? best : alpha;
  }

  function rootSearch(S, rootMoves, depth, alpha, beta, previousLine) {
    const side = S.turn, pathLo = 0, pathHi = 0;
    const rootKey = transKey(S, pathLo, pathHi), old = table.get(rootKey);
    const ttMove = old ? old.move : previousLine && previousLine[0] !== undefined ? previousLine[0] : 0;
    const moves = orderedMoves(S, rootMoves, ttMove, false);
    const alphaStart = alpha;
    let best = -INF, bestLine = [], searched = 0;

    for (const m of moves) {
      if (timeToStop()) return { complete: false, score: 0, line: [] };
      const T = tryMove(S, m);
      if (!T) continue;
      const mode = CC.mMode(m);
      const quiet = T.dOrg < 0 && !T.over && T.half === S.half + 1 && mode === CC.MOVE;
      const reduction = depth >= 5 && searched >= 7 && quiet ? 1 : 0;
      let result;
      if (searched === 0) {
        result = afterAction(T, depth, alpha, beta, side, 0, pathLo, pathHi, false, 0, true, reduction);
      } else {
        result = afterAction(T, depth, alpha, alpha + 1, side, 0, pathLo, pathHi, false, 0, true, reduction);
        if (result.complete && result.valid && result.score > alpha) {
          if (reduction) result = afterAction(T, depth, alpha, alpha + 1, side, 0, pathLo, pathHi, false, 0, true, 0);
          if (result.complete && result.valid && result.score > alpha && result.score < beta) {
            result = afterAction(T, depth, alpha, beta, side, 0, pathLo, pathHi, false, 0, true, 0);
          }
        }
      }
      if (!result.complete) return { complete: false, score: 0, line: [] };
      if (!result.valid) continue;
      searched++;
      if (result.score > best) best = result.score, bestLine = [m].concat(result.line || []);
      if (result.score > alpha) alpha = result.score;
      if (alpha >= beta) break;
    }

    if (!searched) return { complete: true, score: -MATE, line: [] };
    const flag = best <= alphaStart ? 2 : best >= beta ? 1 : 0;
    if (table.size > 30000) table.delete(table.keys().next().value);
    table.set(rootKey, { depth, score: scoreToTable(best, 0), flag, move: bestLine[0] });
    return { complete: true, score: best, line: bestLine };
  }

  function safeFallback(S, rootMoves) {
    const me = S.turn, T = CC.clone(S), line = [];
    let moves = rootMoves;
    for (let guard = 0; guard < 12 && !T.over && T.turn === me; guard++) {
      if (!moves.length) break;
      const ordered = orderedMoves(T, moves, 0, false), m = ordered[0];
      if (!CC.play(T, m, true)) break;
      line.push(m);
      if (T.over || T.turn !== me) break;
      moves = CC.legalMoves(T);
    }
    return line.length ? line : rootMoves.slice(0, 1);
  }

  function validateLine(S, line) {
    const me = S.turn, T = CC.clone(S), valid = [];
    for (const m of line) {
      const legal = CC.legalMoves(T);
      if (!legal.includes(m) || !CC.play(T, m, true)) break;
      valid.push(m);
      if (T.over || T.turn !== me) break;
    }
    return valid;
  }

  function turn(S, turnContext) {
    const rootMoves = CC.legalMoves(S);
    if (!rootMoves.length) return CC.COMMIT_MOVE;

    ctx = turnContext;
    stop = false; nodes = 0; table = new Map(); repeatCounts = new Map();
    const budget = Number.isFinite(ctx.timeMs) && ctx.timeMs > 0 ? ctx.timeMs : 1000;
    reserveMs = Math.max(20, Math.min(180, budget * 0.1));

    let bestLine = safeFallback(S, rootMoves), previousScore = 0;
    const maxDepth = 12;
    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = depth >= 3 ? previousScore - 180 : -INF;
      let beta = depth >= 3 ? previousScore + 180 : INF;
      let result = rootSearch(S, rootMoves, depth, alpha, beta, bestLine);
      if (!result.complete) break;
      if (result.score <= alpha || result.score >= beta) {
        result = rootSearch(S, rootMoves, depth, -INF, INF, bestLine);
        if (!result.complete) break;
      }
      if (result.line.length) bestLine = result.line;
      previousScore = result.score;
      if (Math.abs(result.score) >= MATE - 100) break;
    }

    const validated = validateLine(S, bestLine);
    return validated.length ? validated : safeFallback(S, rootMoves);
  }

  registerAI({
    id: 'iron-commander',
    name: 'Bastion',
    author: 'GPT-6 Luna Max',
    about: 'Searches whole turns and stack deployments, protects the Commander and battle arms, and looks for decisive captures without throwing away a stack.',
    levels: 1,
    turn,
  });
})();
