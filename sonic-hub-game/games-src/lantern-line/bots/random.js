/* ── The smallest bot there is ──
   It takes a square when one is there to take, and otherwise draws any line at all. The arena keeps it as the floor
   of the scale, and it shows the whole of what a bot file has to be: one object called BOT. */
const BOT = {
  name: 'Random',
  author: 'Claude',
  levels: ['random'],
  think(S, opt) {
    const moves = legalMoves(S);
    for (const m of moves) if (takes(S, m)) return m;
    return moves[Math.floor(opt.rand() * moves.length)];
  },
};
