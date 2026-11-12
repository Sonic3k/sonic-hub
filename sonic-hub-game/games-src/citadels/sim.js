// node sim.js [games=600] [skill=hard] — AI against AI at every table size and with every set. Prints game length, how the seat
// with the first crown and each character fare, how often each character is chosen, and any stall or refused AI move.
const fs = require('fs'), vm = require('vm'), path = require('path');
const CORE = path.join(__dirname, 'src', 'core');
for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort()) vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8'), { filename: f });
function play(seed, n, set, skill, useNinth) {
  const chars = charsFor(set, n, useNinth);
  const S = newGame({ seed, names: Array.from({ length: n }, (_, i) => 'AI' + i), ai: Array(n).fill(true), chars, uniques: set.uniques, skill: 'normal' });
  for (const P of S.players) P.skill = Array.isArray(skill) ? skill[P.id] : skill;
  S.quiet = true;
  const held = [];   // [pid, char] for every character held in every round
  startGame(S);
  let guard = 0, lastRound = 0;
  while (!S.over && guard++ < 8000) {
    if (S.round !== lastRound && S.phase === 'turns') { lastRound = S.round; for (const P of S.players) for (const c of P.chars) held.push([P.id, c]); }
    const pid = S.need.pid;
    let a = aiAct(S, pid), ev = a && act(S, pid, a);
    if (!ev) { const f = aiFallback(S, pid); ev = f && act(S, pid, f); if (!ev) throw new Error(`stuck at ${S.need.kind} (${S.cur && S.cur.char})`); refused.push(`${S.cur ? S.cur.char : S.need.kind}: ${JSON.stringify(a)}`); }
  }
  if (!S.over) throw new Error('did not end');
  return { S, held };
}
const refused = [];
module.exports = { play };
if (require.main === module) {
  const N = +process.argv[2] || 600, skill = process.argv[3] || 'hard';
  const t0 = Date.now();
  const byN = {}, charWin = {}, charHeld = {}, picked = {}, offered = {};
  let errors = 0;
  for (let g = 0; g < N; g++) {
    const n = 2 + (g % 7), set = PRESETS[(g >> 1) % PRESETS.length];
    let r;
    try { r = play((g * 2654435761 + 97) >>> 0, n, set, skill, g % 3 !== 0); } catch (e) { errors++; if (errors < 6) console.log('ERROR', n, set.id, e.message); continue; }
    const { S, held } = r;
    const b = byN[n] = byN[n] || { games: 0, rounds: 0, firstCrown: 0, score: 0, spread: 0 };
    b.games++; b.rounds += S.round; b.score += S.scores[S.winner].total;
    const sorted = S.scores.map(s => s.total).sort((x, y) => y - x); b.spread += sorted[0] - sorted[1];
    for (const [pid, c] of held) { charHeld[c] = (charHeld[c] || 0) + 1 / n; if (pid === S.winner) charWin[c] = (charWin[c] || 0) + 1; }
  }
  console.log(`${N} games (${skill}) in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${errors} errors, ${refused.length} refused AI moves`);
  for (const r of refused.slice(0, 5)) console.log('  refused', r);
  for (const [n, b] of Object.entries(byN)) console.log(`  ${n} players: ${b.games} games, ${(b.rounds / b.games).toFixed(1)} rounds, winner ${(b.score / b.games).toFixed(1)} points, lead ${(b.spread / b.games).toFixed(1)}`);
  /* a character's strength: how often whoever held it in a round went on to win, against an even share (1.00) */
  const rows = Object.keys(charHeld).sort((a, b) => CHAR[a].rank - CHAR[b].rank || a.localeCompare(b));
  console.log('  win share when held (1.00 = even): ' + rows.map(c => `${c} ${((charWin[c] || 0) / charHeld[c]).toFixed(2)}`).join(', '));
}
