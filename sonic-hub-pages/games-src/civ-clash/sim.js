// node sim.js [games-per-pair] [--tune] — AI vs AI: 1v1 round robin and 4-player free-for-all.
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['00-core.js', '10-data.js', '15-imperial.js', '20-engine.js', '30-ai.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), { filename: f });
function play(seed, civs) {
  const S = newGame({ seed, civs, ai: civs.map(() => true) });
  S.quiet = true;
  for (const P of S.players) chooseRelic(S, P.id, aiRelic(S, P));
  startGame(S);
  let guard = 0;
  while (S.winner == null && guard++ < 5000) {
    const a = aiAct(S, S.turn);
    if (a.kind === 'buy') buy(S, S.turn, a.idx);
    else if (a.kind === 'play') playCard(S, S.turn, a.uid, a.target);
    if (S.winner != null) break;
    if (a.kind === 'end' || S.plays <= 0 || !S.players[S.turn].hand.length) { if (a.kind !== 'buy' || S.plays <= 0) endTurn(S); }
  }
  return S;
}
module.exports = { play };
if (require.main === module) {
  const N = +process.argv[2] || 20, ids = CIV_ORDER;
  for (const c of ids) { const n = buildDeck({ nextUid: 1 }, c).length; if (n !== 24) console.log('DECK SIZE', c, n); }
  const w = {}, g = {}, rounds = [], how = { wonder: 0, time: 0, ko: 0 };
  let firstWins = 0, games = 0;
  for (const a of ids) { w[a] = 0; g[a] = 0; }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = 0; k < N; k++) {
    const civs = k % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    const S = play(1 + i * 1000 + j * 37 + k * 7919, civs);
    games++; rounds.push(S.round);
    if (S.winner === 0) firstWins++;
    if (S.wonderWin) how.wonder++; else if (S.timeUp) how.time++; else how.ko++;
    for (const P of S.players) { g[P.civ]++; if (S.winner === P.id) w[P.civ]++; }
  }
  const rate = c => w[c] / g[c];
  const sorted = ids.slice().sort((a, b) => rate(b) - rate(a));
  rounds.sort((a, b) => a - b);
  console.log(`1v1: ${games} games, first player wins ${Math.round(firstWins / games * 100)}%, rounds p10/p50/p90 ${rounds[Math.floor(games * .1)]}/${rounds[Math.floor(games * .5)]}/${rounds[Math.floor(games * .9)]}, ends ${JSON.stringify(how)}`);
  console.log(sorted.map(c => `${c}:${Math.round(rate(c) * 100)}(${CIVS[c].hp2})`).join(" "));
  // 4-player FFA
  const fw = {}, fg = {};
  for (const c of ids) { fw[c] = 0; fg[c] = 0; }
  for (let k = 0; k < N * 40; k++) {
    const S0 = { rs: 777 + k };
    const civs = shuffled(S0, ids).slice(0, 4);
    const S = play(5000 + k, civs);
    for (const P of S.players) { fg[P.civ]++; if (S.winner === P.id) fw[P.civ]++; }
  }
  const fr = c => fw[c] / Math.max(1, fg[c]);
  console.log('FFA4: ' + ids.slice().sort((a, b) => fr(b) - fr(a)).map(c => `${c}:${Math.round(fr(c) * 100)}`).join(' '));
  if (process.argv.includes('--tune')) {
    const out = {};
    for (const c of ids) { const r = rate(c), f = fr(c); let hp = CIVS[c].hp; if (r > 0.56 || f > 0.32) hp--; else if (r < 0.44 || f < 0.18) hp++; out[c] = clamp(hp, 7, 14); }
    console.log('TUNE ' + JSON.stringify(out));
  }
}
