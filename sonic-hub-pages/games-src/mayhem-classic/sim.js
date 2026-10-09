// node sim.js [games per pairing=400] [table games=4000] [skill=hard] — AI against AI: every duel both ways, then 3- and 4-player tables.
// Prints win rates, the first player's edge, game length, and how often each Mighty Power and rule comes up. Any stall or error is reported.
const fs = require('fs'), vm = require('vm'), path = require('path');
const CORE = path.join(__dirname, 'src', 'core');
for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort()) vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8'), { filename: f });
function play(seed, heroes, skill = 'hard', hook) {
  const S = newGame({ seed, heroes, ai: heroes.map(() => true) });
  S.quiet = true;
  for (const P of S.players) P.skill = Array.isArray(skill) ? skill[P.id] : skill;
  startGame(S);
  let guard = 0;
  while (S.winner == null && guard++ < 5000) {
    const P = cur(S);
    if (!turnOver(S)) {
      const a = aiAct(S, P.id);
      let ev = null;
      if (a.kind === 'pending') ev = resolvePending(S, a.ch);
      else if (a.kind === 'play') ev = playCard(S, P.id, a.uid, a.ch);
      if (!ev) throw new Error(`AI action refused: ${JSON.stringify(a)} by ${P.hero}`);
      if (hook) hook(S, ev);
    }
    if (turnOver(S)) endTurn(S);
  }
  if (S.winner == null) throw new Error('game did not end');
  return S;
}
module.exports = { play };
if (require.main === module) {
  const N = +process.argv[2] || 400, MG = +process.argv[3] || 4000, skill = process.argv[4] || 'hard', ids = HERO_ORDER;
  for (const h of ids) if (deckSize(h) !== RULES.deckSize) console.log('DECK SIZE', h, deckSize(h));
  const st = { powers: {}, fx: {} };
  const hook = (S, ev) => { if (ev.card.power) st.powers[ev.card.power] = (st.powers[ev.card.power] || 0) + 1; for (const f of ev.fx) st.fx[f.k] = (st.fx[f.k] || 0) + 1; };
  const w = {}, g = {}, turns = [], pair = {};
  let first = 0, games = 0, ties = 0, k = 0;
  for (const a of ids) { w[a] = 0; g[a] = 0; }
  const t0 = Date.now();
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let r = 0; r < N; r++) {
    const hs = r % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    const S = play((1 + (k++) * 7919) >>> 0, hs, skill, hook);
    games++; turns.push(S.turnNo);
    if (S.winner === S.first) first++;
    if (S.winner === -1) ties++;
    for (const P of S.players) { g[P.hero]++; if (S.winner === P.id) w[P.hero]++; }
    const key = ids[i] + '-' + ids[j]; pair[key] = pair[key] || [0, 0]; pair[key][1]++; if (S.winner >= 0 && S.players[S.winner].hero === ids[i]) pair[key][0]++;
  }
  turns.sort((a, b) => a - b);
  const pct = x => (Math.round(x * 1000) / 10).toFixed(1);
  console.log(`duels: ${games} games (${skill}), first player wins ${pct(first / games)}%, ties ${ties}, turns p10/p50/p90 ${turns[Math.floor(games * .1)]}/${turns[games >> 1]}/${turns[Math.floor(games * .9)]}  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  console.log('  ' + ids.map(h => `${h}:${pct(w[h] / g[h])}%`).join('  '));
  console.log('  ' + Object.entries(pair).map(([kk, v]) => `${kk} ${pct(v[0] / v[1])}%`).join('  '));
  const mx = {}, mg = {}, mt = [];
  for (const h of ids) mx[h] = mg[h] = 0;
  let mties = 0;
  for (let q = 0; q < MG; q++) {
    const n = q % 2 ? 3 : 4, hs = shuffled({ rs: (500009 + q * 31) >>> 0 }, ids).slice(0, n);
    const S = play((900007 + q * 104729) >>> 0, hs, skill, hook);
    mt.push(S.turnNo); if (S.winner === -1) mties++;
    for (const P of S.players) { mg[P.hero]++; mx[P.hero] += (S.winner === P.id ? 1 : 0) - 1 / n; }
  }
  mt.sort((a, b) => a - b);
  console.log(`tables: ${MG} games, ties ${mties}, turns p50/p90 ${mt[MG >> 1]}/${mt[Math.floor(MG * .9)]}`);
  console.log('  share above fair: ' + ids.map(h => `${h}:${mx[h] >= 0 ? '+' : ''}${pct(mx[h] / mg[h])}`).join('  '));
  console.log('  per game:', Object.entries(st.powers).map(([kk, v]) => `${kk} ${(v / (games + MG)).toFixed(2)}`).join(', '));
  console.log('  effects per game:', Object.entries(st.fx).map(([kk, v]) => `${kk} ${(v / (games + MG)).toFixed(2)}`).join(', '));
}
