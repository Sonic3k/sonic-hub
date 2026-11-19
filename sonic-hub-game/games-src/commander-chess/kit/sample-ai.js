/* The sample player: the least that keeps to the contract.
   It is here to show the calls and to be beaten. It is not a model of how to play: it looks no further than its own
   move and knows nothing of what the other side can do. It has one level, so it says nothing about levels. */
'use strict';

registerAI({
  id: 'sample',
  name: 'Sample',
  author: 'the kit',
  about: 'Takes the dearest thing it can take right now; otherwise plays any move at all.',

  turn(S, ctx) {
    const me = S.turn, moves = [];
    /* a turn is one move, or several when pieces leave a stack one after another: go on until the turn has passed */
    while (!S.over && S.turn === me) {
      const legal = CC.legalMoves(S);
      const sane = legal.filter(m => CC.mMode(m) !== CC.INTERCEPT);   // a plane shot down for nothing
      const pool = sane.length ? sane : legal;
      let top = -Infinity, best = [];
      for (const m of pool) {
        const mode = CC.mMode(m);
        let gain = 0;
        if (mode === CC.CAPTURE || mode === CC.STAY || mode === CC.SUICIDE) for (const p of CC.members(S, CC.mTo(m))) gain += CC.POINTS[S.kind[p]];
        if (mode === CC.SUICIDE) gain -= CC.POINTS[CC.AIR];           // the plane does not come back
        if (gain > top) { top = gain; best = [m]; } else if (gain === top) best.push(m);
      }
      const m = best[Math.floor(ctx.random() * best.length)];
      moves.push(m);
      CC.play(S, m, true);                                            // S is ours to change
    }
    return moves;
  },
});
