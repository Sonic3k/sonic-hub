// node sim.js [games-per-pair=10] [multi-games=2000] — AI vs AI: every duel pairing both ways, then random 3- and 4-player tables.
// Prints win rates, game length, how games end, and what happens to structures, guards and traps.
const fs = require('fs'), vm = require('vm'), path = require('path');
const CORE = path.join(__dirname, 'src', 'core');
for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort()) vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8'), { filename: f });
function play(seed, civs, hook) {
  const S = newGame({ seed, civs, ai: civs.map(() => true) });
  S.quiet = true;
  for (const P of S.players) { P.skill = 'hard'; chooseRelic(S, P.id, aiRelic(S, P)); }
  startGame(S);
  let guard = 0;
  while (S.winner == null && guard++ < 6000) {
    const a = aiAct(S, S.turn);
    if (a.kind === 'buy') { buy(S, S.turn, a.idx); continue; }
    if (a.kind === 'play') { const ev = playCard(S, S.turn, a.uid, a.target); if (hook && ev) hook(S, ev); }
    if (S.winner != null) break;
    if (a.kind === 'end' || S.plays <= 0 || !S.players[S.turn].hand.length) endTurn(S);
  }
  return S;
}
module.exports = { play };
if (require.main === module) {
  const N = +process.argv[2] || 10, MG = +process.argv[3] || 2000, ids = CIV_ORDER;
  for (const c of ids) { if (deckSize(c) !== 24) console.log('DECK SIZE', c, deckSize(c)); }
  const stat = { built: 0, wonders: 0, wonderWins: 0, blocks: {}, traps: 0, storms: 0, raids: 0, steals: 0, monks: 0, struct: 0, razed: 0, misses: {} };
  const hook = (S, ev) => { for (const f of ev.fx) { if (f.k === 'built') { stat.built++; if (f.wonder) stat.wonders++; } else if (f.k === 'block') stat.blocks[f.guard] = (stat.blocks[f.guard] || 0) + 1; else if (f.k === 'trap') stat.traps++; else if (f.k === 'storm') stat.storms++; else if (f.k === 'raid') stat.raids++; else if (f.k === 'steal') stat.steals++; else if (f.k === 'monk') stat.monks++; else if (f.k === 'struct') stat.struct += f.n; else if (f.k === 'razed') stat.razed++; else if (f.k === 'miss') stat.misses[f.why] = (stat.misses[f.why] || 0) + 1; } };
  const w = {}, g = {}, rounds = [], how = { wonder: 0, time: 0, ko: 0 };
  let first = 0, games = 0, k = 0;
  for (const a of ids) { w[a] = 0; g[a] = 0; }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let r = 0; r < N; r++) {
    const civs = r % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    const S = play((1 + (k++) * 7919) >>> 0, civs, hook);
    games++; rounds.push(S.round);
    if (S.winner === 0) first++;
    if (S.wonderWin) { how.wonder++; stat.wonderWins++; } else if (S.timeUp) how.time++; else how.ko++;
    for (const P of S.players) { g[P.civ]++; if (S.winner === P.id) w[P.civ]++; }
  }
  rounds.sort((a, b) => a - b);
  const pct = x => Math.round(x * 1000) / 10;
  console.log(`duel: ${games} games, first player ${pct(first / games)}%, rounds p10/p50/p90 ${rounds[Math.floor(games * .1)]}/${rounds[games >> 1]}/${rounds[Math.floor(games * .9)]}, ends ${JSON.stringify(how)}`);
  console.log('  ' + ids.slice().sort((a, b) => w[b] / g[b] - w[a] / g[a]).map(c => `${c}:${pct(w[c] / g[c])}(${CIVS[c].hp2})`).join(' '));
  const mx = {}, mg = {}, mr = [];
  for (const c of ids) mx[c] = mg[c] = 0;
  for (let q = 0; q < MG; q++) {
    const n = q % 2 ? 3 : 4, civs = shuffled({ rs: (500009 + q * 31) >>> 0 }, ids).slice(0, n);
    const S = play((900007 + q * 104729) >>> 0, civs, hook);
    mr.push(S.round);
    for (const P of S.players) { mg[P.civ]++; mx[P.civ] += (S.winner === P.id ? 1 : 0) - 1 / n; }
  }
  mr.sort((a, b) => a - b);
  console.log(`table: ${MG} games, rounds p50/p90 ${mr[MG >> 1]}/${mr[Math.floor(MG * .9)]}`);
  console.log('  ' + ids.slice().sort((a, b) => mx[b] / mg[b] - mx[a] / mg[a]).map(c => `${c}:${pct(mx[c] / mg[c])}(${CIVS[c].hp4})`).join(' '));
  console.log('  per game:', Object.entries({ built: stat.built, wonders: stat.wonders, struct: stat.struct, razed: stat.razed, traps: stat.traps, storms: stat.storms, raids: stat.raids, steals: stat.steals, monks: stat.monks }).map(([k2, v]) => `${k2} ${(v / (games + MG)).toFixed(2)}`).join(', '), '| blocks', JSON.stringify(stat.blocks), '| misses', JSON.stringify(stat.misses), '| wonder wins', stat.wonderWins);
}
