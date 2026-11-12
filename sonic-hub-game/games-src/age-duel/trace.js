// node trace.js civ0 civ1 plan0 plan1 seed — one AI vs AI game, turn by turn
const { play } = require('./sim.js');
const [c0 = 'frank', c1 = 'frank', p0 = 'rush', p1 = 'boom', seed = '11'] = process.argv.slice(2);
const S0 = newGame({ seed: +seed, civ0: c0, civ1: c1, ai0: p0, ai1: p1 });
const S = S0;
const fmtSt = st => Object.entries(st).map(([t, n]) => n + t[0]).join('');
while (!S.over) {
  aiPlan(S, 0); aiPlan(S, 1);
  const pre = [0, 1].map(i => { const P = S.sides[i]; return `${P.ai.strat[0]} A${P.age} v${villCount(P)}(${P.idle}i) ${fmtSt(P.orders.train)} b:${P.orders.builds.map(b => b.kind[0] + b.kind[1]).join('')} r:${P.orders.research || ''} mv:${P.orders.moves.map(m => m.from + '>' + m.to + ':' + total(m.units)).join(',')}`; });
  const R = resolveTurn(S);
  const army = i => Object.entries(S.sides[i].army).filter(([, st]) => total(st)).map(([r, st]) => r + ':' + fmtSt(st)).join(' ');
  const evs = R.ev.filter(e => ['battle', 'raid', 'capture', 'siege', 'relic', 'age'].includes(e.k)).map(e => e.k === 'battle' ? `B@${e.b.r}${e.b.field ? 'f' : ''} w${e.b.winner} ${Math.round(e.b.pa)}v${Math.round(e.b.pd)}` : e.k === 'raid' ? `R${e.side}@${e.r}-${e.kills}` : e.k === 'capture' ? `C${e.side}@${e.r}` : e.k === 'siege' ? `S${e.side}-${e.dmg}` : e.k === 'relic' ? `rel${e.side}=${e.total}` : `age${e.side}=${e.age}`).join(' ');
  console.log(`T${String(R.turn).padStart(2)} | ${pre[0].padEnd(52)} | ${pre[1].padEnd(52)} | ${evs}`);
  console.log(`     res0 ${JSON.stringify(S.sides[0].res)} army0 ${army(0)} | res1 ${JSON.stringify(S.sides[1].res)} army1 ${army(1)}`);
}
console.log('winner', S.winner, S.over);
