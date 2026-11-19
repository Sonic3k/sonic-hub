// What the arena and the tests share: loading a bot the way the game does, and playing a game between two of them.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const RULES = fs.readFileSync(path.join(ROOT, 'engine', 'rules.js'), 'utf8');
const HOSTSRC = fs.readFileSync(path.join(ROOT, 'engine', 'host.js'), 'utf8');

/** A bot's whole program: the rules, its own file kept to itself, the host (see engine/host.js). */
const program = botSrc => RULES + "\nconst __BOT = (function () { 'use strict';\n" + botSrc + "\n;return typeof BOT === 'undefined' ? null : BOT;\n})();\n" + HOSTSRC;

/** The rules for whoever is refereeing, in a context of their own: R.newGame(), R.playMove(S, m), … */
function rules() {
  const ctx = vm.createContext({});
  vm.runInContext(RULES + '\n;globalThis.R = { DARK, LIGHT, SIDE, EMPTY, PASS_MOVE, sqName, sqOf, position, newGame, gen, make, unmake, legalMoves, isLegal, flipsOf, countFlips, describe, playMove, undoMove, replay };', ctx, { filename: 'rules.js' });
  return ctx.R;
}

/** One bot at one level, in a context of its own. */
class Player {
  /** file: the bot's file. level: one of its levels, or nothing for its first. */
  constructor(file, level, { quiet = true } = {}) {
    this.file = file; this.error = '';
    const mute = () => {};
    this.ctx = vm.createContext({ console: quiet ? { log: mute, warn: mute, error: mute, info: mute } : console, performance: { now: () => performance.now() } });
    try {
      vm.runInContext(program(fs.readFileSync(file, 'utf8')), this.ctx, { filename: path.basename(file), timeout: 5000 });
      this.info = JSON.parse(vm.runInContext('JSON.stringify(HOST.info())', this.ctx));   // as text, so the answer is an object of this side
      if (this.info.error) this.error = this.info.error;
    } catch (e) { this.error = 'could not be loaded: ' + (e && e.message ? e.message : e); this.info = { error: this.error }; }
    this.level = level || (this.info.levels ? this.info.levels[0] : '');
    this.id = path.basename(file, '.js') + ':' + this.level;
    this.moves = 0; this.msTotal = 0; this.msMax = 0; this.late = 0;
  }
  /** Its move in the game with this history: { move, ms } or { error, ms }. cap: how long before it is cut off. */
  move(history, timeMs, seed, cap) {
    if (this.error) return { error: this.error, ms: 0 };
    this.ctx.__q = { history, level: this.level, timeMs, seed };
    const t0 = performance.now(); let a;
    try { a = JSON.parse(vm.runInContext('JSON.stringify(HOST.move(__q.history, __q))', this.ctx, { timeout: Math.ceil(cap) })); }
    catch (e) { a = { error: /timed out/i.test(String(e && e.message)) ? `took more than ${Math.ceil(cap)} ms over a move` : 'broke: ' + (e && e.message ? e.message : e) }; }
    const ms = performance.now() - t0;
    this.moves++; this.msTotal += ms; if (ms > this.msMax) this.msMax = ms; if (ms > timeMs) this.late++;
    return a.error ? { error: a.error, ms } : { move: a.move, ms };
  }
}

/** A game between two players; Dark moves first. Returns { winner: 0 Dark | 1 Light | -1 drawn, why, discs: [Dark's,
 *  Light's], plies, forfeit }. A bot that breaks, answers with a move it may not make, or runs past the cap loses
 *  the game there and then. A side that has to pass is not asked for anything: the host passes for it. */
function playGame(R, dark, light, { timeMs = 1000, seed = 1, cap = Math.max(timeMs * 3, timeMs + 400) } = {}) {
  const S = R.newGame(), slowest = [0, 0]; let n = 0;   // slowest: the longest each side took over one move, in ms
  while (!S.over) {
    const who = S.turn === R.DARK ? dark : light;
    const a = who.move(S.history.slice(), timeMs, (seed * 7919 + n * 104729) | 0, cap);
    if (a.ms > slowest[S.turn]) slowest[S.turn] = a.ms;
    if (a.error || !R.playMove(S, a.move)) return { winner: 1 - S.turn, why: 'forfeit', discs: Array.from(S.count), plies: S.history.length, slowest, forfeit: { by: who.id, why: a.error || 'the move was refused' } };
    n++;
  }
  return { winner: S.over.winner, why: S.over.why, discs: Array.from(S.over.discs), plies: S.history.length, slowest, forfeit: null };
}

/** Ratings that best explain a set of results, on the usual scale (400 points: ten to one).
 *  pairs: [{ a, b, wa, wb, dr }] by player id. One player is pinned (anchor: [id, rating]) so that the numbers mean
 *  something from run to run. A pair in which one side won everything says only "much stronger", so every pair's
 *  score is counted as no better than 97 in 100: that keeps a walk-over from stretching the whole scale. */
function fit(ids, pairs, anchor) {
  const CLIP = 0.03, R = Object.fromEntries(ids.map(id => [id, anchor[1]]));
  const rows = pairs.map(p => { const n = p.wa + p.wb + p.dr; return n ? { a: p.a, b: p.b, n, s: Math.min(1 - CLIP, Math.max(CLIP, (p.wa + p.dr / 2) / n)) } : null; }).filter(Boolean);
  for (let it = 0; it < 20000; it++) {
    let moved = 0;
    for (const id of ids) {
      if (id === anchor[0]) continue;
      let got = 0, exp = 0, games = 0;
      for (const r of rows) {
        if (r.a !== id && r.b !== id) continue;
        const mine = r.a === id, other = mine ? r.b : r.a;
        got += r.n * (mine ? r.s : 1 - r.s); exp += r.n / (1 + Math.pow(10, (R[other] - R[id]) / 400)); games += r.n;
      }
      if (!games) continue;
      const step = 400 * (got - exp) / games; R[id] += step; if (Math.abs(step) > moved) moved = Math.abs(step);
    }
    if (moved < 0.01) break;
  }
  return R;
}

module.exports = { ROOT, program, rules, Player, playGame, fit };
