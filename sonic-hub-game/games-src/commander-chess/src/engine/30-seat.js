/* ── A seat at the table ──
   Every opponent of the campaign is one of the players of the league (league/): a file written to the AI kit's
   contract, by whoever wrote it, taken as it was handed in. Here one of them is asked for its turn exactly the way
   the league asked: through the kit's own table (kit/src/table.js), with the same second to think, the same count of
   positions seen and the same kind of random source. What a rating says of a player was measured like this.

   The league ended a game on a player's fault. The game does not: should a player ever answer with something that is
   no move, its turn is finished for it with a plain move, and the fault is handed back to be looked at. */
function makeSeat(CC, makeTable) {
  'use strict';
  const T = makeTable(CC), held = new Map();
  const TIME = 1000;                                          // ms a turn: what the league gave
  const key = (file, id) => file + '|' + id;
  /** the player `id` of a file, loaded once. source: the file's text, needed the first time only */
  function player(file, id, source) {
    const k = key(file, id);
    if (!held.has(k)) { if (typeof source !== 'string') throw new Error('the text of ' + file + ' has not been given yet'); held.set(k, T.loadAI(source, file, id)); }
    return held.get(k);
  }
  const has = (file, id) => held.has(key(file, id));
  /** ends the turn that is going on in S for whoever is to move, with moves that ask nothing of anybody */
  function plain(S, random, out) {
    const side = S.turn;
    for (let n = 0; n < 12 && !S.over && S.turn === side; n++) {
      const legal = CC.legalMoves(S); if (!legal.length) break;
      const m = S.dOrg >= 0 && legal.includes(CC.COMMIT_MOVE) ? CC.COMMIT_MOVE : legal.filter(x => CC.mMode(x) !== CC.COMMIT)[Math.floor(random() * legal.filter(x => CC.mMode(x) !== CC.COMMIT).length)];
      if (m === undefined || !CC.play(S, m, true)) break;
      out.push(m);
    }
  }
  /** The moves of one whole turn for the side to move. q: { setup, moves, file, id, level, seed, source }: the game
   *  so far, who is asked, and the game's seed. Returns { moves, ms, fault }: fault is '' unless the player went wrong. */
  function turn(q) {
    const ai = player(q.file, q.id, q.source);
    const M = T.fromRecord({ setup: q.setup, moves: q.moves, timeMs: TIME, seed: q.seed, levels: [q.level, q.level] });
    const side = M.S.turn, out = []; let ms = 0, fault = '';
    while (!M.result && M.S.turn === side) {
      const ans = T.ask(ai, M.S, T.request(M)); ms += ans.ms || 0;
      const over = T.takeAnswer(M, ans, ev => out.push(ev.move));
      if (M.result && M.result.why === 'fault') { fault = M.result.fault.kind + ': ' + M.result.fault.detail; M.result = null; plain(M.S, T.rng((q.seed ^ 0x51ED270B) >>> 0), out); break; }
      if (over) break;
    }
    return { moves: out, ms: Math.round(ms), fault };
  }
  /** a whole turn of plain moves, for when nobody can be asked at all */
  function anyTurn(q) {
    const S = CC.replay(q.setup, q.moves), out = [];
    plain(S, T.rng((q.seed ^ 0x51ED270B) >>> 0), out);
    return { moves: out, ms: 0, fault: 'nobody could be asked' };
  }
  return { TIME, turn, anyTurn, has, table: T };
}
if (typeof module !== 'undefined') module.exports = { makeSeat };
