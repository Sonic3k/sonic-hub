// node sim.js [games] [hardMs] [pairs]   how the levels fare against each other, each pair playing both colours equally
//                                        (pairs like  hard:medium,medium:medium ; "random" is a player that moves at random)
// node sim.js speed [ms]                 how deep Hard gets in its thinking time, from a few positions
// KID_STYLE='{"medium":{"depth":4}}' node sim.js …   tries out other settings for a level (see STYLE in src/10-ai.js)
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['00-core.js', '10-ai.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), { filename: f });
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const randomMover = (S, rand) => { const mv = legalMoves(S); return mv[Math.floor(rand() * mv.length)]; };
function mover(name, hardMs) {
  if (name === 'random') return randomMover;
  return (S, rand) => AI.think(S, { level: name, timeMs: hardMs, rand }).move;
}
/** One game; returns { winner (0, 1 or −1), plies, why } */
function game(light, dark, rand) {
  const S = newGame();
  while (!S.over) playMove(S, (S.turn === LIGHT ? light : dark)(S, rand));
  return { winner: S.over.winner, plies: S.history.length, why: S.over.why };
}
function match(a, b, games, hardMs, seed) {
  const A = mover(a, hardMs), B = mover(b, hardMs), rand = rng(seed);
  let wa = 0, wb = 0, dr = 0, light = 0, plies = [], whys = {};
  for (let g = 0; g < games; g++) {
    const aLight = g % 2 === 0, r = aLight ? game(A, B, rand) : game(B, A, rand);
    if (r.winner < 0) { dr++; whys[r.why] = (whys[r.why] || 0) + 1; }
    else if ((r.winner === LIGHT) === aLight) wa++; else wb++;
    if (r.winner === LIGHT) light++;
    plies.push(r.plies);
  }
  plies.sort((x, y) => x - y);
  return { a, b, wa, wb, dr, light, median: plies[plies.length >> 1], max: plies[plies.length - 1], whys };
}

if (process.env.KID_STYLE) { const o = JSON.parse(process.env.KID_STYLE); for (const k in o) Object.assign(AI.STYLE[k], o[k]); }   // trying out other settings
const arg = process.argv.slice(2);
if (arg[0] === 'speed') {
  const ms = +arg[1] || 450, rand = rng(5);
  const S = newGame();
  for (let i = 0; i < 60 && !S.over; i++) {
    if (i % 10 === 0) {
      const t = Date.now(), r = AI.think(S, { level: 'hard', timeMs: ms, rand });
      console.log(`ply ${String(i).padStart(3)}  depth ${r.depth}  nodes ${r.nodes}  ${Date.now() - t} ms  score ${r.score}`);
    }
    playMove(S, AI.think(S, { level: 'medium', rand }).move);
  }
} else {
  const games = +arg[0] || 20, hardMs = +arg[1] || 100, pairs = arg[2] ? arg[2].split(',').map(p => p.split(':')) : [['easy', 'random'], ['medium', 'easy'], ['hard', 'medium'], ['hard', 'easy']];
  console.log(`${games} games a pair, Hard thinking ${hardMs} ms a move`);
  for (const [a, b] of pairs) {
    const t = Date.now(), r = match(a, b, games, hardMs, 11);
    console.log(`${a.padEnd(6)} v ${b.padEnd(6)}  ${String(r.wa).padStart(3)} – ${String(r.wb).padEnd(3)} draws ${String(r.dr).padEnd(3)} ${JSON.stringify(r.whys).padEnd(26)} Light won ${String(r.light).padEnd(3)} median ${r.median} plies, longest ${r.max}   (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  }
}
