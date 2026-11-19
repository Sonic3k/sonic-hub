/* ── A bot that looks one move ahead and no further ──
   It plays the move that turns over the most discs right now, the way most people play their first games. It never
   asks what the answer will be, and it does not know that a corner is worth more than any number of discs. It is a
   second mark on the arena's scale, and it shows how a bot reads a move before playing it (countFlips). */
const BOT = {
  name: 'Greedy',
  author: 'Claude',
  levels: ['greedy'],
  think(S, opt) {
    let best = -1, top = -1;
    for (const m of legalMoves(S)) {
      const worth = countFlips(S, m) + opt.rand();           // among equals, any
      if (worth > top) { top = worth; best = m; }
    }
    return best;
  },
};
