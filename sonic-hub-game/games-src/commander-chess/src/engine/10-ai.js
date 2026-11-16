/* ── The computer player ──
   It looks ahead move by move (alpha-beta, deepening one move at a time while its clock allows), and at the end of
   each line plays out the captures that are still hanging, so that it does not count a piece it has just taken
   without seeing what takes back. A deployment is looked at step by step: after a step the same side is still to
   move, and ending the deployment is a move like any other.

   Inside the look-ahead a side may leave its Commander where it can be taken; the answer is then to take it, and
   that line is lost. At the top it only ever chooses among moves the rules allow.

   A player is a strength and a temperament:
     depth, quiet  how far it looks, and how far it follows captures beyond that
     ms            thinking time for the deepening levels
     noise, slip   how shaky its judgement is, and how often it just plays something
     style         what it likes: see STYLE0 below. Two players of the same strength with different styles go
                   for different things, which is what makes them different people to play against. */
const VALUE = [0, 100, 240, 115, 110, 320, 170, 280, 450, 500, 150];
const STYLE0 = { adv: 1, hq: 1, guard: 1, air: 1, sea: 1, guns: 1, armor: 1, foot: 1 };
const WIN = 100000;

const AI = (() => {
  const clock = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  let nodes = 0, deadline = 0, out = false, W = STYLE0, val = VALUE, qDepth = 4, jitter = 0, salt = 0;
  const hist = new Int32Array(NSQ * NSQ), killer = new Int32Array(128);
  const HOME = [1, 12], DIST = new Uint8Array(NSQ * NSQ);
  for (let a = 0; a < NSQ; a++) for (let b = 0; b < NSQ; b++) DIST[a * NSQ + b] = Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

  function setStyle(style) {
    W = Object.assign({}, STYLE0, style || {});
    val = VALUE.slice();
    val[AIR] *= W.air; val[NAVY] *= W.sea; val[ARTILLERY] *= W.guns; val[MISSILE] *= W.guns; val[TANK] *= W.armor; val[INFANTRY] *= W.foot; val[MILITIA] *= W.foot;
  }
  /** what stands on a point is worth, riders and all */
  function stackValue(S, s) { let v = 0; const t = S.top[s]; if (t < 0) return 0; for (const p of members(S, s)) v += S.kind[p] === COMMANDER ? 5000 : VALUE[S.kind[p]] * (S.hero[p] ? 1.4 : 1); return v; }

  /** The position as the side to move sees it. Counted: the pieces (a hero is worth two fifths more); ground gained
   *  by the pieces that have to walk; how near they are to the other side's Headquarters points and how many turns
   *  either side has held one; how crowded each Commander is by enemies and how far it has strayed from home; a plane
   *  that air defence has locked on to. */
  function evaluate(S) {
    let sc = 0;
    const cr = S.at[S.cmd[RED]], cb = S.at[S.cmd[BLUE]];
    for (let p = 0; p < S.n; p++) {
      const s = S.at[p]; if (s < 0) continue;
      const k = S.kind[p], side = S.own[p]; if (k === COMMANDER) continue;
      let v = val[k] * (S.hero[p] ? 1.4 : 1);
      const fwd = side === RED ? rankOf(s) - 1 : 12 - rankOf(s), foe = side === RED ? cb : cr, mine = side === RED ? cr : cb;
      if (k === INFANTRY || k === MILITIA || k === TANK || k === ENGINEER) {
        v += fwd * 4 * W.adv;
        const c = CORE[1 - side], dc = Math.min(DIST[s * NSQ + c[0]], DIST[s * NSQ + c[1]]);
        if (dc < 5) v += (5 - dc) * 9 * W.hq;
      } else if (k === AIR) { v += Math.min(fwd, 5) * 3 * W.adv; }
      else if (k === ARTILLERY || k === MISSILE) { v += Math.min(fwd, 6) * 3 * W.adv; }
      if (foe >= 0 && k !== HQ) { const d = DIST[s * NSQ + foe]; if (d <= 3) v += (4 - d) * 7 * W.adv; }       // pressing the other Commander
      if (mine >= 0 && k !== AIR && k !== NAVY && k !== HQ) { const d = DIST[s * NSQ + mine]; if (d <= 2) v += 4 * W.guard; }   // standing by one's own
      sc += side === RED ? v : -v;
    }
    for (let side = 0; side < 2; side++) {
      const c = side === RED ? cr : cb; if (c < 0) continue;
      let v = 0;
      const away = side === RED ? rankOf(c) - 1 : 12 - rankOf(c); v -= away * 14 * W.guard + (away > 2 ? (away - 2) * 20 * W.guard : 0);
      if (S.car[S.cmd[side]] >= 0) v += 10 * W.guard;
      v += S.core[side] * S.core[side] * 260 * W.hq;
      for (const h of CORE[1 - side]) { const q = S.top[h]; if (q >= 0 && S.own[q] === side) v += 120 * W.hq; }
      sc += side === RED ? v : -v;
    }
    for (const x of S.exp) sc += (S.own[x.p] === RED ? -1 : 1) * 300;
    sc = S.turn === RED ? sc : -sc;
    if (jitter) { let h = (salt ^ (S.at[S.cmd[RED]] * 131 + S.at[S.cmd[BLUE]] * 31 + S.half * 7)) >>> 0; for (let p = 0; p < S.n; p += 3) h = (Math.imul(h, 16777619) ^ (S.at[p] + 1)) >>> 0; sc += (h % (2 * jitter + 1)) - jitter; }
    return sc + 8;
  }

  /** how a finished game counts for the side that would be to move at `ply` */
  const overValue = (S, me, ply) => (S.over.winner < 0 ? 0 : S.over.winner === me ? WIN - ply : -WIN + ply);

  function order(S, list, ply, first) {
    const sc = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      const m = list[i], mode = mMode(m);
      let v;
      if (m === first) v = 2e9;
      else if (mode === CAPTURE || mode === STAY) v = 1e6 + stackValue(S, mTo(m)) * 16 - VALUE[S.kind[mActor(m)]];
      else if (mode === SUICIDE) v = 1e6 + (stackValue(S, mTo(m)) - VALUE[S.kind[mActor(m)]]) * 16;
      else if (mode === INTERCEPT) v = -1e9;
      else if (mode === COMMIT) v = 5e5;
      else v = (m === killer[ply * 2] || m === killer[ply * 2 + 1] ? 8e5 : 0) + hist[mFrom(m) * NSQ + mTo(m)] - (mode === COMBINE ? 40 : 0);
      sc[i] = v;
    }
    const idx = list.map((_, i) => i).sort((a, b) => sc[b] - sc[a]);
    return idx.map(i => list[i]);
  }
  const takes = mode => mode === CAPTURE || mode === STAY || mode === SUICIDE;

  /** the captures still on, played out */
  function quiesce(S, alpha, beta, ply, left) {
    nodes++;
    const stand = evaluate(S);
    if (left <= 0 || stand >= beta || ply > 60) return stand;
    if (stand > alpha) alpha = stand;
    const me = S.turn, raw = genTakes(S), list = order(S, raw, ply, 0);
    let best = stand;
    for (const m of list) {
      if (mMode(m) === SUICIDE && stackValue(S, mTo(m)) < VALUE[AIR]) continue;       // throwing a plane at something cheaper never settles anything
      const T = clone(S); if (!play(T, m, false)) continue;
      const v = T.over ? overValue(T, me, ply) : T.turn === me ? quiesce(T, alpha, beta, ply + 1, left - 1) : -quiesce(T, -beta, -alpha, ply + 1, left - 1);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    return best;
  }
  /** captures by whole stacks only: getting off a carrier in the middle of an exchange is left to the full look-ahead */
  function genTakes(S) { return gen(S, [], true).filter(m => takes(mMode(m))); }

  function search(S, depth, alpha, beta, ply) {
    if (depth <= 0) return quiesce(S, alpha, beta, ply, qDepth);
    nodes++;
    if ((nodes & 1023) === 0 && clock() > deadline) out = true;
    if (out) return 0;
    const me = S.turn, list = order(S, gen(S, []), ply, 0);
    let best = -WIN * 2, n = 0;
    for (const m of list) {
      const mode = mMode(m); if (mode === INTERCEPT) continue;
      const T = clone(S); if (!play(T, m, false)) continue;
      let v;
      if (T.over) v = overValue(T, me, ply);
      else if (T.turn === me) v = search(T, depth, alpha, beta, ply + 1);                 // still deploying
      else {
        const quiet = !takes(mode) && mode !== COMMIT;
        if (depth >= 3 && n >= 6 && quiet) {                                               // late quiet moves get a shallower look first
          v = -search(T, depth - 2, -alpha - 1, -alpha, ply + 1);
          if (v > alpha) v = -search(T, depth - 1, -beta, -alpha, ply + 1);
        } else v = -search(T, depth - 1, -beta, -alpha, ply + 1);
      }
      if (out) return 0;
      n++;
      if (v > best) {
        best = v;
        if (v > alpha) {
          alpha = v;
          if (alpha >= beta) { if (!takes(mode) && ply < 64) { if (killer[ply * 2] !== m) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = m; } hist[mFrom(m) * NSQ + mTo(m)] += depth * depth; } break; }
        }
      }
    }
    if (!n) return -WIN + ply;                                                             // nothing playable: the Commander is lost
    return best;
  }

  /** One move for the side to move in S (a step of a deployment, or COMMIT, when one is going on).
   *  opt: { depth, quiet, ms, noise, slip, style, seen } — seen maps positions (posKey) to how often they have come up. */
  function think(S, opt = {}) {
    const legal = legalMoves(S); if (!legal.length) return { move: -1, score: 0, depth: 0, nodes: 0 };
    const sane = legal.filter(m => mMode(m) !== INTERCEPT), pool = sane.length ? sane : legal;
    if (pool.length === 1) return { move: pool[0], score: 0, depth: 0, nodes: 0 };
    setStyle(opt.style); qDepth = opt.quiet === undefined ? 4 : opt.quiet; jitter = opt.jitter || 0; salt = (opt.salt || 0) >>> 0;
    nodes = 0; out = false; hist.fill(0); killer.fill(0);
    const me = S.turn, rnd = opt.random || Math.random;
    if (opt.slip && rnd() < opt.slip) return { move: pool[Math.floor(rnd() * pool.length)], score: 0, depth: 0, nodes: 0, slipped: true };
    const maxDepth = opt.depth || 2, t0 = clock();
    deadline = t0 + (opt.ms || 1e9);
    let ranked = pool.map(m => ({ m, v: 0 })), done = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = -WIN * 2; const next = [];
      const wide = opt.noise > 0 || depth === 1;                                           // a shaky player needs a true value for every move, to be wrong about
      for (const r of ranked) {
        const T = clone(S); play(T, r.m, true);
        let v;
        if (T.over) v = overValue(T, me, 0);
        else if (opt.seen && T.dOrg < 0 && (opt.seen[posKey(T)] || 0) >= 2) v = 0;        // a third time is a draw
        else if (T.turn === me) v = search(T, depth, wide ? -WIN * 2 : alpha, WIN * 2, 1);
        else v = -search(T, depth - 1, -WIN * 2, wide ? WIN * 2 : -alpha, 1);
        if (out) break;
        next.push({ m: r.m, v }); if (v > alpha) alpha = v;
      }
      if (out && !next.length) break;
      if (out) { const top = next.slice().sort((a, b) => b.v - a.v)[0]; if (top.v > ranked[0].v || top.m === ranked[0].m) ranked = [top].concat(ranked.filter(r => r.m !== top.m)); break; }
      ranked = next.sort((a, b) => b.v - a.v); done = depth;
      if (ranked[0].v > WIN - 100 || clock() - t0 > (opt.ms || 1e9) * 0.45) break;
    }
    let pick = ranked[0];
    if (opt.noise > 0 && done) {
      let top = -Infinity;
      for (const r of ranked) { const v = Math.abs(r.v) > WIN - 200 ? r.v : r.v + (rnd() + rnd() + rnd() - 1.5) * opt.noise * 1.4; if (v > top) { top = v; pick = r; } }
    }
    return { move: pick.m, score: pick.v, depth: done, nodes, ms: Math.round(clock() - t0) };
  }
  /** a whole turn: the moves of a deployment up to and including its end, or the one move */
  function turn(S, opt) {
    const T = clone(S), moves = [], me = T.turn; let info = null;
    for (let guard = 0; guard < 6 && !T.over && T.turn === me; guard++) {
      const r = think(T, guard ? Object.assign({}, opt, { slip: 0 }) : opt); if (r.move < 0) break;
      if (!info) info = r; moves.push(r.move); if (!play(T, r.move, true)) break;
    }
    return { moves, info };
  }
  return { think, turn, evaluate: S => { setStyle(null); jitter = 0; return evaluate(S); } };
})();

if (typeof module !== 'undefined') module.exports = { AI, VALUE, STYLE0, WIN };
