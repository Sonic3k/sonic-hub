/* Commander Chess — Titan Commander
 * One-file player for Commander Chess AI kit 2.  No imports or engine changes.
 * The search counts a whole deployment as one turn, including COMMIT.
 */
'use strict';

registerAI((() => {
  const MATE = 1000000, MATE_EDGE = 990000, INF = 1100000;
  const BASE = [0, 110, 235, 120, 110, 330, 175, 270, 520, 850, 100];
  const HERO = [0, 70, 100, 70, 65, 170, 150, 170, 700, 250, 80];
  const MAX_ACTIONS = 48, TABLE_LIMIT = 45000;
  let ctx, margin, stop, nodes, table, counts, sig1, sig2, keyHashes, history, killers;

  function overTime() {
    nodes++;
    if ((nodes & 7) === 0 && ctx.timeLeft() <= margin) stop = true;
    return stop;
  }
  function hashPair(k) {
    let pair = keyHashes.get(k);
    if (pair) return pair;
    let a = 0x811c9dc5 | 0, b = 0x9e3779b9 | 0;
    for (let i = 0; i < k.length; i++) {
      const c = k.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193);
      b = Math.imul(b ^ c, 0x85ebca6b); b ^= b >>> 13;
    }
    pair = [a | 0, b | 0]; keyHashes.set(k, pair); return pair;
  }
  function contribution(h, count) {
    if (!count) return 0;
    let x = (h ^ Math.imul(count, 0x9e3779b1)) | 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; return x | 0;
  }
  function changeCount(k, delta) {
    const old = counts.get(k) || 0, next = old + delta, h = hashPair(k);
    sig1 ^= contribution(h[0], old) ^ contribution(h[0], next);
    sig2 ^= contribution(h[1], old) ^ contribution(h[1], next);
    if (next) counts.set(k, next); else counts.delete(k);
    return next;
  }
  function stateKey(S) {
    // Piece identities and rider order matter to encoded moves. Captured hero
    // flags and the quiet clock matter for deciding games on points.
    let k = String.fromCharCode(S.turn, S.half, S.dOrg + 1, S.dIrr);
    for (let p = 0; p < S.n; p++) k += String.fromCharCode(S.at[p] + 1, S.car[p] + 1, S.c1[p] + 1, S.c2[p] + 1, S.hero[p]);
    if (S.dAct.length) k += ':' + S.dAct.slice().sort((a, b) => a - b).join(',');
    return k + '/' + sig1 + '/' + sig2;
  }
  const toTable = (v, ply) => v > MATE_EDGE ? v + ply : v < -MATE_EDGE ? v - ply : v;
  const fromTable = (v, ply) => v > MATE_EDGE ? v - ply : v < -MATE_EDGE ? v + ply : v;
  function terminal(S, ply) {
    const w = S.over.winner;
    return w < 0 ? 0 : w === S.turn ? MATE - ply : -MATE + ply;
  }
  function pointResult(S, ply) {
    const points = CC.points(S), us = points[S.turn], them = points[1 - S.turn];
    return us === them ? 0 : us > them ? MATE - ply : -MATE + ply;
  }
  function playSafe(S, m) {
    const T = CC.clone(S);
    if (!CC.play(T, m, true)) return null;
    if (T.dOrg >= 0 && !CC.canFinish(T, 0)) return null;
    return T;
  }

  function assess(S) {
    const value = [0, 0], arms = [[0, 0, 0], [0, 0, 0]];
    const important = [[], []];
    for (let p = 0; p < S.n; p++) {
      if (S.at[p] < 0) continue;
      const side = S.own[p], k = S.kind[p], at = S.at[p], f = CC.fileOf(at), r = CC.rankOf(at);
      if (k !== CC.COMMANDER) {
        value[side] += BASE[k] + (S.hero[p] ? HERO[k] : 0);
        const a = CC.armOf(k);
        if (a >= 0) { arms[side][a]++; if (a < 2) important[side].push(p); }
        if (S.car[p] < 0) {
          // Modest positioning incentives; material and tactics dominate.
          const advance = side === CC.RED ? r - 1 : 12 - r;
          if (k === CC.NAVY) value[side] += Math.min(advance, 8) * 3;
          else if (k === CC.AIR) value[side] += Math.min(advance, 8) * 4;
          else if (k !== CC.HQ) value[side] += Math.min(advance, 8) * 2;
          if (k !== CC.NAVY && k !== CC.HQ) value[side] += Math.max(0, 5 - Math.abs(f - 5)) * 2;
          if (S.c1[p] >= 0) value[side] += 14 + (S.c2[p] >= 0 ? 10 : 0);
        }
      } else if (S.car[p] >= 0) {
        const carrier = S.car[p];
        // Headquarters shelters against small arms. A carrier is still an
        // entire stack that can be captured in a single move.
        value[side] += S.kind[carrier] === CC.HQ ? 80 : 20;
      }
    }
    if (!S.total) for (let side = 0; side < 2; side++) {
      if (arms[side][0] === 1) value[side] -= 420;
      if (arms[side][1] === 1) value[side] -= 370;
      if (arms[side][2] === 1) value[side] -= 310;
      // A side one ship or plane from losing needs more warning than the
      // piece's ordinary material value conveys. Riders can also attack.
      for (const p of important[side]) {
        const a = CC.armOf(S.kind[p]);
        if (arms[side][a] !== 1) continue;
        const target = S.at[p];
        let attacked = false;
        for (let q = 0; q < S.n; q++) {
          if (S.own[q] !== side && S.at[q] >= 0 && CC.attacks(S, q, target)) { attacked = true; break; }
        }
        if (attacked) value[side] -= S.turn === (side ^ 1) ? 1250 : 420;
      }
    }
    return value[S.turn] - value[S.turn ^ 1];
  }

  function groupValue(S, m) {
    const from = CC.mFrom(m), members = CC.members(S, from), mask = CC.mGroup(m);
    let n = 0;
    for (let i = 0; i < members.length; i++) if (mask & (1 << i)) {
      const p = members[i]; n += BASE[S.kind[p]] + (S.hero[p] ? HERO[S.kind[p]] : 0);
      if (S.kind[p] === CC.COMMANDER) n += MATE / 2;
    }
    return n;
  }
  function victimValue(S, m) {
    const mode = CC.mMode(m);
    if (mode !== CC.CAPTURE && mode !== CC.STAY && mode !== CC.SUICIDE) return 0;
    const taken = CC.members(S, CC.mTo(m));
    let score = 0, sea = 0, air = 0, land = 0;
    for (const p of taken) {
      const k = S.kind[p];
      if (k === CC.COMMANDER) return 800000;
      score += BASE[k] + (S.hero[p] ? HERO[k] : 0);
      const a = CC.armOf(k); if (a === 0) sea++; else if (a === 1) air++; else if (a === 2) land++;
    }
    if (!S.total) {
      const counts = CC.arms(S, S.turn ^ 1);
      if ((sea && sea === counts[0]) || (air && air === counts[1]) || (land && land === counts[2])) score += 400000;
    }
    return score;
  }
  function moveRank(S, m, hashMove, ply) {
    if (m === hashMove) return 10000000;
    const mode = CC.mMode(m);
    if (mode === CC.COMMIT) return 500;
    if (mode === CC.INTERCEPT) return -2000000;
    let v = 0;
    if (mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE) {
      v = 100000 + victimValue(S, m) * 8;
      if (mode === CC.SUICIDE) v -= groupValue(S, m) * 6;
      else if (mode === CC.STAY) v += 250;
    } else {
      const from = CC.mFrom(m), to = CC.mTo(m), p = CC.mActor(m), k = S.kind[p];
      const advance = (CC.rankOf(to) - CC.rankOf(from)) * (S.turn === CC.RED ? 1 : -1);
      const central = Math.abs(CC.fileOf(from) - 5) - Math.abs(CC.fileOf(to) - 5);
      if (k !== CC.COMMANDER && k !== CC.HQ) v += advance * 12 + central * 4;
      if (mode === CC.COMBINE) v += 40;
      const h = history.get(m) || 0; v += h;
      if (killers[ply * 2] === m) v += 5000;
      else if (killers[ply * 2 + 1] === m) v += 3000;
    }
    return v;
  }
  function ordered(S, moves, hashMove, ply) {
    const pairs = new Array(moves.length);
    for (let i = 0; i < moves.length; i++) pairs[i] = [moves[i], moveRank(S, moves[i], hashMove, ply)];
    pairs.sort((a, b) => b[1] - a[1]);
    return pairs;
  }
  function enterChild(T, changed, ply, fn) {
    if (T.over) { const score = terminal(T, ply); return changed ? -score : score; }
    let key = null;
    if (changed) {
      key = CC.posKey(T);
      if (changeCount(key, 1) >= 3) {
        const result = -pointResult(T, ply); changeCount(key, -1); return result;
      }
    }
    const result = fn();
    if (key !== null) changeCount(key, -1);
    return result;
  }
  function hasStack(S) {
    for (let p = 0; p < S.n; p++) if (S.own[p] === S.turn && S.at[p] >= 0 && S.car[p] < 0 && S.c1[p] >= 0) return true;
    return false;
  }
  function noisy(m) { const mode = CC.mMode(m); return mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE; }

  function qsearch(S, alpha, beta, ply, left) {
    if (overTime()) return 0;
    if (S.over) return terminal(S, ply);
    const deployment = S.dOrg >= 0, check = !deployment && CC.inCheck(S, S.turn);
    const stand = assess(S);
    if (ply >= MAX_ACTIONS) return stand;
    if (!deployment && left <= 0 && (!check || left <= -1)) return stand;
    if (!deployment && !check) {
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
    }
    let moves;
    if (deployment || check) moves = CC.gen(S, [], false);
    else {
      moves = CC.gen(S, [], !hasStack(S));
      moves = moves.filter(noisy);
    }
    const key = deployment ? stateKey(S) : null;
    const prior = key && table.get(key), list = ordered(S, moves, prior ? prior.move : -1, ply);
    let best = deployment || check ? -INF : stand, chosen = -1, legalCount = 0;
    for (let i = 0; i < list.length; i++) {
      if (overTime()) return 0;
      const m = list[i][0], T = playSafe(S, m);
      if (!T) continue;
      legalCount++;
      const changed = T.turn !== S.turn;
      const v = enterChild(T, changed, ply + 1, () => changed
        ? -qsearch(T, -beta, -alpha, ply + 1, left - 1)
        : qsearch(T, alpha, beta, ply + 1, left));
      // A terminal move does not switch S.turn. enterChild therefore returns
      // a result from T.turn's perspective, matching the sign above.
      if (stop) return 0;
      if (v > best) { best = v; chosen = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if ((deployment || check) && !legalCount) return -MATE + ply;
    if (deployment && chosen !== -1 && table.size < TABLE_LIMIT) table.set(key, { depth: -1, move: chosen, flag: 0, value: 0 });
    return best;
  }

  function search(S, depth, alpha, beta, ply) {
    if (overTime()) return 0;
    if (S.over) return terminal(S, ply);
    if (depth <= 0 && S.dOrg < 0) return qsearch(S, alpha, beta, ply, 2);
    if (ply >= MAX_ACTIONS) return assess(S);
    const key = stateKey(S), oldAlpha = alpha, e = table.get(key);
    if (e && e.depth >= depth && e.flag) {
      const value = fromTable(e.value, ply);
      if (e.flag === 1 || (e.flag === 2 && value >= beta) || (e.flag === 3 && value <= alpha)) return value;
    }
    const list = ordered(S, CC.gen(S, [], false), e ? e.move : -1, ply);
    let best = -INF, chosen = -1, legalCount = 0;
    for (let i = 0; i < list.length; i++) {
      if (overTime()) return 0;
      const m = list[i][0], T = playSafe(S, m);
      if (!T) continue;
      legalCount++;
      const changed = T.turn !== S.turn, nextDepth = depth - (changed ? 1 : 0);
      let value = enterChild(T, changed, ply + 1, () => {
        if (legalCount === 1) return changed
          ? -search(T, nextDepth, -beta, -alpha, ply + 1)
          : search(T, nextDepth, alpha, beta, ply + 1);
        // Principal-variation scout, followed by a full search if needed.
        let score = changed
          ? -search(T, nextDepth, -alpha - 1, -alpha, ply + 1)
          : search(T, nextDepth, alpha, alpha + 1, ply + 1);
        if (!stop && score > alpha && score < beta) score = changed
          ? -search(T, nextDepth, -beta, -alpha, ply + 1)
          : search(T, nextDepth, alpha, beta, ply + 1);
        return score;
      });
      if (stop) return 0;
      if (value > best) { best = value; chosen = m; }
      if (value > alpha) alpha = value;
      if (alpha >= beta) {
        if (!noisy(m) && CC.mMode(m) !== CC.COMMIT && CC.mMode(m) !== CC.INTERCEPT) {
          if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
          history.set(m, Math.min(25000, (history.get(m) || 0) + depth * depth * 20));
        }
        break;
      }
    }
    if (!legalCount) return -MATE + ply;
    if (table.size < TABLE_LIMIT || e) table.set(key, { depth, move: chosen, flag: best >= beta ? 2 : best <= oldAlpha ? 3 : 1, value: toTable(best, ply) });
    return best;
  }

  function finishTurn(S, first) {
    const T = CC.clone(S), side = S.turn, out = [];
    let move = first;
    for (let i = 0; i < 5 && !T.over && T.turn === side; i++) {
      const legal = CC.legalMoves(T);
      if (!legal.length) break;
      if (!legal.includes(move)) {
        const hint = table.get(stateKey(T));
        if (hint && legal.includes(hint.move)) move = hint.move;
        else if (legal.includes(CC.COMMIT_MOVE)) move = CC.COMMIT_MOVE;
        else move = ordered(T, legal, -1, i)[0][0];
      }
      out.push(move);
      if (!CC.play(T, move, true)) break;
      move = -1;
    }
    return out;
  }

  function turn(S, options) {
    ctx = options; stop = false; nodes = 0; table = new Map();
    history = new Map(); killers = new Int32Array(MAX_ACTIONS * 2).fill(-1);
    counts = new Map(); keyHashes = new Map(); sig1 = 0; sig2 = 0;
    // Leave time for validating and completing a deployment after search.
    margin = Math.max(18, Math.min(130, options.timeMs * 0.16));
    const legal = CC.legalMoves(S);
    if (!legal.length) return [];
    if (legal.length === 1) return finishTurn(S, legal[0]);
    for (const k of Object.keys(options.seen || {})) {
      const count = options.seen[k] | 0;
      if (count > 0) { counts.set(k, count); const h = hashPair(k); sig1 ^= contribution(h[0], count); sig2 ^= contribution(h[1], count); }
    }
    let ranked = ordered(S, legal, -1, 0).map(x => x[0]);
    let bestMove = ranked[0], completed = false;
    for (let depth = 1; depth <= 1 && options.timeLeft() > margin; depth++) {
      let alpha = -INF, best = -INF, choice = ranked[0], searched = 0;
      const results = [];
      for (const m of ranked) {
        if (options.timeLeft() <= margin) { stop = true; break; }
        const T = CC.clone(S);
        if (!CC.play(T, m, true)) continue; // already legal; guard against a spoiled position
        const changed = T.turn !== S.turn, nextDepth = depth - (changed ? 1 : 0);
        const value = enterChild(T, changed, 1, () => {
          if (!searched) return changed ? -search(T, nextDepth, -INF, INF, 1) : search(T, nextDepth, -INF, INF, 1);
          let score = changed ? -search(T, nextDepth, -alpha - 1, -alpha, 1) : search(T, nextDepth, alpha, alpha + 1, 1);
          if (!stop && score > alpha) score = changed ? -search(T, nextDepth, -INF, -alpha, 1) : search(T, nextDepth, alpha, INF, 1);
          return score;
        });
        if (stop) break;
        searched++; results.push([m, value]);
        if (value > best) { best = value; choice = m; }
        if (value > alpha) alpha = value;
        if (value > MATE_EDGE) break;
      }
      // During the first iteration even a partially searched result is better
      // than the unsearched default. Later, retain the last complete result.
      if (!completed && searched) bestMove = choice;
      if (stop) break;
      if (searched) {
        bestMove = choice; completed = true;
        if (best > MATE_EDGE) break;
        results.sort((a, b) => b[1] - a[1]);
        ranked = results.map(x => x[0]);
      }
    }
    return finishTurn(S, bestMove);
  }
  return { id: 'titan-scout', name: 'Titan Scout', author: 'OpenAI Codex',
    about: 'A tactical commander that combines arms, protects critical ships and planes, and plans complete deployments.', levels: 1, turn };
})());
