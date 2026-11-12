// node fuzz.js [games=2000] — random legal moves at every player count and with every set: nothing may throw, stall, lose a card or go below 0 gold.
const fs = require('fs'), vm = require('vm'), path = require('path');
const CORE = path.join(__dirname, 'src', 'core');
for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort()) vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8'), { filename: f });
const N = +process.argv[2] || 2000;
let bad = 0, acts = 0, rounds = 0, ends = 0;
const total = S => S.deck.length + S.players.reduce((a, P) => a + P.hand.length + P.city.reduce((b, e) => b + 1 + e.museum.length, 0), 0) + (S.need && (S.need.kind === 'keep') ? S.need.cards.length : 0) + (S.need && S.need.kind === 'confiscate' ? 1 : 0);
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 7), sets = PRESETS.concat([null]), set0 = sets[g % sets.length];
  const R = { rs: (g * 7919 + 13) >>> 0 }, set = set0 || randomSet(R);
  const chars = charsFor(set, n, g % 2 === 0);
  const S = newGame({ seed: (g * 104729 + 7) >>> 0, names: Array.from({ length: n }, (_, i) => 'P' + i), ai: Array(n).fill(true), chars, uniques: set.uniques });
  S.quiet = true;
  const cards0 = total(S);
  try {
    startGame(S);
    let guard = 0;
    while (!S.over && guard++ < 6000) {
      const pid = S.need.pid, moves = legalMoves(S, pid);
      if (!moves.length) throw new Error(`no move for ${S.need.kind} (${S.cur && S.cur.char})`);
      /* lean toward ending the turn now and then, toward building otherwise */
      const m = moves[Math.floor(rnd(R) * moves.length)];
      const ev = act(S, pid, m);
      if (!ev) throw new Error(`refused ${JSON.stringify(m)} at ${S.need.kind} (${S.cur && S.cur.char})`);
      acts++;
      const c = total(S);
      if (c !== cards0) throw new Error(`cards ${c} != ${cards0} after ${JSON.stringify(m)} (${S.cur && S.cur.char})`);
      if (S.players.some(P => P.gold < 0) || S.tax < 0) throw new Error('negative gold');
    }
    if (!S.over) throw new Error('did not end in 6000 actions, round ' + S.round);
    ends++; rounds += S.round;
  } catch (e) { bad++; if (bad < 8) console.log('FAIL game', g, 'n', n, set.id, e.message); }
}
console.log(`${N} games, ${ends} ended, ${bad} failed, ${(acts / N).toFixed(0)} actions and ${(rounds / Math.max(1, ends)).toFixed(1)} rounds per game`);
if (bad) process.exitCode = 1;
