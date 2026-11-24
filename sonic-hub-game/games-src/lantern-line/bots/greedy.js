/* ── A bot that looks one line ahead and no further ──
   It takes every square it can. Otherwise it draws a safe line, one that gives nothing away, while there is one.
   When there is none, it draws the line that hands the other side the fewest squares: for each line it tries it
   (make), lets the other side take all it then could, counts, and takes it all back (unmake). It never asks what
   happens after that, so it never leaves a square on purpose. It is a second mark on the arena's scale, well above
   random. On both boards it plays the same way. */
const BOT = {
  name: 'Greedy',
  author: 'Claude',
  levels: ['greedy'],
  think(S, opt) {
    const moves = legalMoves(S);
    for (const m of moves) if (takes(S, m)) return m;
    const safe = moves.filter(m => isSafe(S, m));
    if (safe.length) return safe[Math.floor(opt.rand() * safe.length)];
    let best = moves[0], fewest = Infinity;
    for (const m of moves) {
      make(S, m);
      let given = 0, made = 0;
      for (let more = true; more;) {                   // the other side takes squares while there are any to take
        more = false;
        for (let k = 0; k < S.line.length; k++) if (!S.line[k] && takes(S, k)) { given += make(S, k); made++; more = true; break; }
      }
      while (made--) unmake(S);
      unmake(S);
      const worth = given + opt.rand() * 0.5;           // among equals, any
      if (worth < fewest) { fewest = worth; best = m; }
    }
    return best;
  },
};
