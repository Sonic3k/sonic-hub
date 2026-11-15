// node sim.js [games] [size] [hardMs] — the levels against each other, both sides. Prints how often the row beats the column.
//   node sim.js 20 11 120     the ladder on 11x11, hard thinking 120 ms a move
//   node sim.js depth 11 450  how deep hard gets in 450 ms, move by move, in one game against medium
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['00-core.js', '10-ai.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), { filename: f });
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function play(n, lx, lo, seed, hardMs, log) {
  const S = newGame(n), r = rng(seed);
  while (!S.over) {
    const level = S.turn === X ? lx : lo, t0 = Date.now();
    const res = AI.think(S, { level, rand: r, timeMs: hardMs });
    if (log && level === 'hard') log.push({ move: S.history.length, depth: res.depth, ms: Date.now() - t0, score: res.score });
    playMove(S, res.move);
  }
  return S;
}
module.exports = { play };

if (require.main === module) {
  if (process.argv[2] === 'depth') {
    const n = +process.argv[3] || 11, ms = +process.argv[4] || 450, log = [];
    const S = play(n, 'hard', 'medium', 7, ms, log);
    console.log(log.map(l => `${String(l.move).padStart(3)}: depth ${String(l.depth).padStart(2)} ${String(l.ms).padStart(4)}ms ${l.score}`).join('\n'));
    console.log('winner', MARK[S.over.winner], 'after', S.history.length, 'moves');
  } else {
    const games = +process.argv[2] || 20, n = +process.argv[3] || 11, hardMs = +process.argv[4] || 120;
    console.log(`${n}x${n}, ${games * 2} games a pair (each level plays X and O equally), hard thinks ${hardMs} ms a move`);
    const cell = {};
    for (let i = 0; i < LEVELS.length; i++) for (let j = i; j < LEVELS.length; j++) {
      const a = LEVELS[i], b = LEVELS[j];
      let w = 0, xw = 0;
      for (let k = 0; k < games; k++) {
        const S1 = play(n, a, b, 1000 + k, hardMs), S2 = play(n, b, a, 5000 + k, hardMs);
        if (S1.over.winner === X) { w++; xw++; } if (S2.over.winner === O) w++; else xw++;
      }
      cell[a + b] = Math.round(w / (games * 2) * 100); cell[b + a] = 100 - cell[a + b];
      if (a === b) cell[a + b] = `X ${Math.round(xw / (games * 2) * 100)}`;
    }
    console.log('row beats column, % (same level: how often X wins):');
    console.log(' '.repeat(10) + LEVELS.map(l => l.padStart(8)).join(''));
    for (const a of LEVELS) console.log(a.padEnd(10) + LEVELS.map(b => String(cell[a + b]).padStart(8)).join(''));
  }
}
