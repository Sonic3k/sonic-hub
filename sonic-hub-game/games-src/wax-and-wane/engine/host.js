/* ── The bot host ──
   The last part of a bot's program. A program is three texts put end to end:

       rules.js
       const __BOT = (function () { 'use strict'; …the bot's file… ; return typeof BOT === 'undefined' ? null : BOT; })();
       host.js

   so whatever a bot declares stays its own, and it cannot trip over a name the rules use. One program to a context:
   a web worker in the game, a vm context in the arena. The host hands the bot a fresh copy of the game each time it
   is asked for a move, and checks the answer before anyone else sees it. A side that has to pass is never asked:
   the host plays the pass itself. */
const HOST = (() => {
  function rngOf(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function problem() {
    if (typeof __BOT !== 'object' || !__BOT) return 'the file does not define BOT';
    if (typeof __BOT.think !== 'function') return 'BOT.think is not a function';
    if (!Array.isArray(__BOT.levels) || !__BOT.levels.length || __BOT.levels.some(l => typeof l !== 'string' || !l)) return 'BOT.levels has to list at least one level name';
    return '';
  }
  /** Who the bot says it is: { name, author, levels }, or { error }. */
  function info() {
    const p = problem();
    return p ? { error: p } : { name: String(__BOT.name || 'Unnamed'), author: String(__BOT.author || 'unknown'), levels: __BOT.levels.slice() };
  }
  /** The bot's move in the game with this list of moves: { move }, or { error } when it has none to give.
   *  q: level, timeMs (what it is asked to stay within), seed (for the random numbers it is handed). */
  function move(history, q) {
    const p = problem(); if (p) return { error: p };
    if (!__BOT.levels.includes(q.level)) return { error: 'no such level: ' + q.level };
    const S = replay(history); if (!S) return { error: 'the game handed over cannot be played through' };
    const legal = legalMoves(S); if (!legal.length) return { error: 'the game is over' };
    if (legal[0] === PASS_MOVE) return { move: PASS_MOVE };
    let m;
    try { m = __BOT.think(S, { level: q.level, timeMs: q.timeMs, rand: rngOf(q.seed | 0) }); }
    catch (e) { return { error: 'think threw: ' + (e && e.message ? e.message : e) }; }
    if (m !== null && typeof m === 'object' && 'move' in m) m = m.move;
    if (!legal.includes(m)) return { error: 'think returned ' + (typeof m === 'number' ? m : typeof m) + ', which is not one of the moves allowed' };
    return { move: m };
  }
  return { info, move };
})();

// in a worker: { id, ask: 'info' }  or  { id, history, level, timeMs, seed }  →  the answer with the same id
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = e => { const q = e.data || {}; self.postMessage(Object.assign({ id: q.id }, q.ask === 'info' ? HOST.info() : HOST.move(q.history, q))); };
}
