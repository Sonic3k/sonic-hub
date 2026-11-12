// node trace.js arch bg seed — one greedy run, month by month
const { botEvents, botActs } = require('./sim.js');
const [arch = 'fan', bg = 'student', seed = '1001'] = process.argv.slice(2);
let rs = +seed * 7919 + 13; const R = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const S = newGame({ seed: +seed, arch, bg, name: '' });
console.log('T  mem   act  core  guests online/cap  vibe pas  funds   net  ap fl cr host   pol/plug');
while (!S.over) {
  botEvents(S, R, true); botActs(S, R); botEvents(S, R, true);
  const ap = S.ap, t = S.turn;
  const r = endTurn(S); const Q = r.report;
  console.log(`${String(t).padStart(2)} ${String(S.members).padStart(5)} ${String(S.active).padStart(5)} ${String(S.core).padStart(4)} ${String(Q.guests).padStart(7)} ${String(Q.online).padStart(5)}/${String(Q.cap).padStart(4)} ${String(Math.round(S.vibe)).padStart(4)} ${String(Math.round(S.passion)).padStart(3)} ${String(S.funds).padStart(6)} ${String(Q.net).padStart(5)} ${ap} ${Q.flamesN} ${Q.crashed ? 'X' : '.'} ${S.hosting.padEnd(6)} ${S.policies.length}/${S.plugins.length} ${S.over ? S.over.reason : ''}`);
}
