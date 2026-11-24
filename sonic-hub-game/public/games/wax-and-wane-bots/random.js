/* ── The smallest bot there is ──
   It puts its disc on any square it may, chosen at random. The arena keeps it as the floor of the scale, and it
   shows the whole of what a bot file has to be: one object called BOT. */
const BOT = {
  name: 'Random',
  author: 'Claude',
  levels: ['random'],
  think(S, opt) {
    const moves = legalMoves(S);
    return moves[Math.floor(opt.rand() * moves.length)];
  },
};
