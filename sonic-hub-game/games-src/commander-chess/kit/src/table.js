/* ── The table ──
   What sits between two players. It loads a player's file, asks it for its turn, checks every move that comes back
   against the rules, keeps the clock and the count of repeated positions, and says when the game is over.
   arena.js (Node) and match.html (a browser) both run this same text. */
function makeTable(CC) {
  'use strict';
  const clock = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const SIDE = ['Red', 'Blue'];
  const MODE = ['MOVE', 'CAPTURE', 'STAY', 'SUICIDE', 'INTERCEPT', 'COMBINE', 'COMMIT'];
  /* how a turn may go wrong, in numbers: how often a player is asked before its turn has to be over; from where a
     turn counts as late (reported); from where it loses the game */
  const LIMITS = { calls: 6, late: ms => ms * 1.1 + 15, dead: ms => ms * 2 + 250, size: 300 * 1024, moves: 12 };

  /** a random source that gives the same numbers for the same seed */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const mix = (seed, n, side) => (seed ^ Math.imul(n + 1, 0x9E3779B1) ^ Math.imul(side + 1, 0x85EBCA6B)) >>> 0;
  function show(v) {
    let s; try { s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v); } catch (e) { s = Object.prototype.toString.call(v); }
    return s === undefined ? 'undefined' : s.length > 140 ? s.slice(0, 140) + '…' : s;
  }

  /** Runs a player's file and returns what it registered. The file's text is the body of a function that is given
   *  CC and registerAI; nothing it defines leaks out. */
  function loadAI(source, label) {
    if (source.length > LIMITS.size) throw new Error('the file is over 300 KB');
    let got = null, n = 0;
    new Function('CC', 'registerAI', source + '\n//# sourceURL=' + (label || 'ai.js'))(CC, spec => { n++; got = spec; });
    if (n !== 1) throw new Error(n ? 'registerAI was called ' + n + ' times: one file is one player' : 'the file never called registerAI');
    if (!got || typeof got.turn !== 'function') throw new Error('registerAI needs an object with a turn(S, ctx) function');
    for (const f of ['id', 'name', 'author', 'about']) if (typeof got[f] !== 'string' || !got[f].trim()) throw new Error('registerAI: "' + f + '" is missing or empty');
    if (!/^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/.test(got.id)) throw new Error('registerAI: id has to be 3 to 24 lowercase letters, digits or hyphens ("' + got.id + '")');
    return got;
  }

  /** Asks a player for its turn in position S. q: { level, timeMs, seen, seed }. guard(fn, ms), where there is one,
   *  runs fn and gives up on it after ms. Returns { moves, ms, error, timedOut, got }: moves is null when what came
   *  back was neither a move nor a list of moves. */
  function ask(ai, S, q, guard) {
    const t0 = clock();
    const ctx = { level: q.level, timeMs: q.timeMs, timeLeft: () => q.timeMs - (clock() - t0), random: rng(q.seed), seen: Object.assign({}, q.seen) };
    const copy = CC.clone(S);
    let r, error = null, timedOut = false;
    try { r = guard ? guard(() => ai.turn(copy, ctx), LIMITS.dead(q.budget || q.timeMs)) : ai.turn(copy, ctx); }
    catch (e) {
      if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') timedOut = true;
      else {                                                  // the player's own part of the trace, without the table's
        const lines = String((e && e.stack) || e).split('\n'), cut = lines.findIndex(l => /__ccCall|evalmachine|\bat (Object\.)?ask\b/.test(l));
        error = (cut > 0 ? lines.slice(0, cut) : lines).slice(0, 8).join('\n').trim();
      }
    }
    const ms = clock() - t0;
    let moves = null;
    if (!error && !timedOut) { if (typeof r === 'number') moves = [r]; else if (Array.isArray(r)) moves = r.slice(0, LIMITS.moves); }
    return { moves, ms, error, timedOut, got: error || timedOut ? '' : show(r) };
  }

  const stat = () => ({ turns: 0, ms: 0, max: 0, late: 0 });
  /** A new game at the table. o: { setup: {game, lineup}, timeMs, seed, maxTurns, levels: [red, blue], names: [red, blue] } */
  function newMatch(o) {
    o = o || {};
    const setup = { game: o.setup && o.setup.game === 'total' ? 'total' : 'battles', lineup: o.setup && o.setup.lineup === 'light' ? 'light' : 'standard' };
    const S = CC.newGame(setup);
    const M = { setup, S, moves: [], marks: [0], seen: {}, turns: 0, result: null, timeMs: o.timeMs > 0 ? +o.timeMs : 1000, seed: (o.seed >>> 0) || 1, maxTurns: o.maxTurns || 0,
      levels: o.levels || [5, 5], names: o.names || ['Red', 'Blue'], used: 0, calls: 0, stats: [stat(), stat()], lines: [], cur: [], last: null };
    M.seen[CC.posKey(S)] = 1;
    return M;
  }
  /** what to ask the side to move */
  function request(M) {
    const side = M.S.turn;
    return { level: M.levels[side], timeMs: Math.max(1, Math.round(M.timeMs - M.used)), budget: M.timeMs, seen: M.seen, seed: mix(M.seed, M.moves.length, side) };
  }
  /** Plays one move that is known to be legal, and does the table's part: the count of positions, the end of the
   *  game. Returns what happened, for whoever shows it. */
  function apply(M, m) {
    const S = M.S, mover = S.turn, commit = CC.mMode(m) === CC.COMMIT, text = commit ? '' : CC.moveText(S, m);
    S.log = []; CC.play(S, m, true); const log = S.log; S.log = null;
    M.moves.push(m);
    const dead = [], heroes = [];
    for (const ev of log) { if (ev.dead) for (const p of ev.dead) dead.push(p); if (ev.what === 'hero') heroes.push(ev.piece); }
    if (!commit) { M.cur.push(text + (dead.length ? ' [' + dead.map(p => (S.own[p] === mover ? 'loses ' : 'takes ') + CC.KIND_CODE[S.kind[p]]).join(', ') + ']' : '') + (heroes.length ? ' ★' : '')); M.last = { from: CC.mFrom(m), to: CC.mTo(m) }; }
    else if (heroes.length && M.cur.length) M.cur[M.cur.length - 1] += ' ★';
    const ended = !!S.over || S.dOrg < 0;
    if (ended) {
      const st = M.stats[mover]; st.turns++; st.ms += M.used; if (M.used > st.max) st.max = M.used; if (M.used > LIMITS.late(M.timeMs)) st.late++;
      M.lines.push({ n: M.turns + 1, side: mover, text: M.cur.join('  '), ms: Math.round(M.used) });
      M.cur = []; M.used = 0; M.calls = 0; M.turns++; M.marks.push(M.moves.length);
      if (S.over) M.result = S.over;
      else {
        const k = CC.posKey(S); M.seen[k] = (M.seen[k] || 0) + 1;
        if (M.seen[k] >= 3) M.result = CC.onPoints(S, 'repeat');
        else { const st2 = CC.status(S); if (st2) M.result = st2; else if (M.maxTurns && M.turns >= M.maxTurns) M.result = CC.onPoints(S, 'turns'); }
      }
    }
    return { mover, move: m, text, dead, heroes, ended };
  }
  function fault(M, side, kind, detail) {
    M.result = { winner: 1 - side, why: 'fault', fault: { side, kind, detail, turn: M.turns + 1, level: M.levels[side] } };
    return true;
  }
  /** what a returned value is, for a report */
  function describe(S, m) {
    if (!Number.isInteger(m)) return 'not a move number (' + show(m) + ')';
    if (CC.mMode(m) === CC.COMMIT) return S.dOrg < 0 ? 'COMMIT, with no deployment going on' : 'COMMIT, but the turn may not end like this';
    const a = CC.mActor(m), from = CC.mFrom(m), to = CC.mTo(m);
    if (m < 0 || a >= S.n || from >= CC.NSQ || to >= CC.NSQ) return 'a number that is no move (' + m + ')';
    return MODE[CC.mMode(m)] + ' ' + CC.KIND_NAME[S.kind[a]] + ' ' + CC.sqName(from) + ' to ' + CC.sqName(to) + ' (move ' + m + ')' +
      (S.at[a] !== from ? ': that piece is ' + (S.at[a] < 0 ? 'off the board' : 'on ' + CC.sqName(S.at[a])) : S.own[a] !== S.turn ? ': that piece is not yours' : '');
  }
  /** Takes a player's answer for the turn that is going on. Returns true when the turn (or the game) is over, false
   *  when the player has to be asked again for the rest of its turn. onMove gets what each move did. */
  function takeAnswer(M, ans, onMove) {
    const side = M.S.turn;
    M.used += ans.ms || 0; M.calls++;
    if (ans.timedOut) return fault(M, side, 'time', 'no answer after ' + Math.round(LIMITS.dead(M.timeMs)) + ' ms (the turn had ' + M.timeMs + ' ms)');
    if (ans.error) return fault(M, side, 'threw', ans.error);
    if (!ans.moves) return fault(M, side, 'answer', 'turn() has to return a move or an array of moves; it returned ' + ans.got);
    if (!ans.moves.length) return fault(M, side, 'empty', 'turn() returned no move');
    if (M.used > LIMITS.dead(M.timeMs)) return fault(M, side, 'time', 'the turn took ' + Math.round(M.used) + ' ms; it had ' + M.timeMs + ' ms');
    for (let i = 0; i < ans.moves.length; i++) {
      const m = ans.moves[i], where = 'move ' + (i + 1) + ' of ' + ans.moves.length + ' in the answer ';
      if (M.result || M.S.turn !== side) return fault(M, side, 'extra', where + 'came after the turn was over: ' + describe(M.S, m));
      if (!Number.isInteger(m) || !CC.legalMoves(M.S).includes(m)) return fault(M, side, 'illegal', where + 'is not legal here: ' + describe(M.S, m));
      const ev = apply(M, m); if (onMove) onMove(ev);
    }
    if (M.result || M.S.turn !== side) return true;
    if (M.calls >= LIMITS.calls) return fault(M, side, 'unfinished', 'the turn was still open after ' + M.calls + ' answers');
    return false;
  }

  /** the game so far, as something that can be kept and played again */
  const record = M => ({ kit: CC.KIT, setup: M.setup, timeMs: M.timeMs, seed: M.seed, levels: M.levels, names: M.names, moves: M.moves.slice(), result: M.result });
  /** the game of a record, played up to its n-th move (all of them if n is left out) */
  function fromRecord(rec, n) {
    const M = newMatch(rec), moves = rec.moves || [], end = n === undefined ? moves.length : Math.min(n, moves.length);
    for (let i = 0; i < end; i++) {
      if (M.result) break;
      if (!CC.legalMoves(M.S).includes(moves[i])) throw new Error('move ' + (i + 1) + ' of the record is not legal: ' + describe(M.S, moves[i]));
      apply(M, moves[i]);
    }
    return M;
  }

  /** the board as text: Red in capitals, Blue in small letters, a stack written carrier first, ! after a hero */
  function ascii(S) {
    const cell = s => { const t = CC.members(S, s).map(p => { const c = CC.KIND_CODE[S.kind[p]]; return (S.own[p] ? c.toLowerCase() : c) + (S.hero[p] ? '!' : ''); }).join(''); return (t || (CC.TERRAIN[s] === CC.WATER ? '~' : CC.TERRAIN[s] === CC.MIXED ? ',' : CC.TERRAIN[s] === CC.BRIDGE ? '=' : '.')).padEnd(6); };
    const rows = [];
    for (let r = CC.NR; r >= 1; r--) { let line = String(r).padStart(2) + '  '; for (let f = 0; f < CC.NF; f++) line += cell(CC.sqOf(f, r)); rows.push(line.trimEnd()); if (r === 7) rows.push('    ' + '~~~~~~'.repeat(CC.NF).slice(0, CC.NF * 6 - 5) + '  river'); }
    rows.push('    ' + CC.FILES.split('').map(c => c.padEnd(6)).join('').trimEnd());
    return rows.join('\n');
  }
  /** how a game ended, in words */
  function resultText(M) {
    const r = M.result; if (!r) return '';
    const who = r.winner < 0 ? 'Draw' : SIDE[r.winner] + ' (' + M.names[r.winner] + ') wins', loser = r.winner < 0 ? '' : SIDE[1 - r.winner];
    const why = { commander: loser + "'s Commander was taken", sea: loser + ' lost its last ship', air: loser + ' lost its last plane', land: loser + ' lost the last of its infantry, tanks and artillery',
      alone: loser + "'s Commander has nobody left", mate: loser + ' has no legal move and its Commander is attacked', stuck: loser + ' has no legal move' }[r.why];
    if (r.why === 'points') return who + ' on points, ' + r.pts[0] + ' to ' + r.pts[1] + ({ quiet: ' (100 quiet turns)', repeat: ' (the position came up a third time)', turns: ' (turn limit of this table)' }[r.cause] || '');
    if (r.why === 'fault') return who + ': ' + SIDE[r.fault.side] + ' (' + M.names[r.fault.side] + ', level ' + r.fault.level + ') is at fault on turn ' + r.fault.turn + ' [' + r.fault.kind + '] ' + r.fault.detail;
    return who + ': ' + why;
  }

  return { LIMITS, SIDE, MODE, rng, show, loadAI, ask, newMatch, request, apply, takeAnswer, describe, record, fromRecord, ascii, resultText };
}
if (typeof module !== 'undefined') module.exports = { makeTable };
