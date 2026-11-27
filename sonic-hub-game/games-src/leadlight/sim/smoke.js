#!/usr/bin/env node
/* Plays many matches as fast as possible to find what breaks: a player who does random legal things (and so walks
   every path the player's side has: lanes chosen, discard piles opened) against the game's own AI, with random
   preset decks and heroes. Every error is printed once with how often it came up.

     node sim/smoke.js [matches=500] [seed=1] */
const load = require('../engine/load.js');
const E = load();
const data = require('../content/data.json');
E.Catalog.load(data);

const N = +process.argv[2] || 500, SEED = +process.argv[3] || 1;
let s = SEED >>> 0;
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];

const decks = data.decks.filter(d => d.cards.length >= 10).map(d => d.id);
const heroes = data.leaders.map(l => l.id);

function userTurn(m) {
  const gs = m.gs;
  for (let guard = 0; guard < 60 && m.phase === 'user-setup'; guard++) {
    if (gs.Pending) {
      const pe = gs.Pending;
      if (pe.kind === 'lane') m.chooseLane(pick(pe.lanes));
      else { if (!pe.cards.length) throw new Error('an empty discard pile to choose from: ' + pe.script.constructor.name); m.chooseCard(pick(pe.cards)); }
      continue;
    }
    const acts = [];
    for (const c of gs.GetHand(0)) {
      if (c.Form.Type === E.CardType.Spell) { if (m.canCast(c)) acts.push(() => m.cast(c)); }
      else for (let l = 0; l < 4; l++) if (m.canSummon(c, l)) acts.push(() => m.summon(c, l));
    }
    for (let l = 0; l < 4; l++) if (m.canFloop(l)) acts.push(() => m.floop(l));
    if (m.canUseHero()) acts.push(() => m.useHero());
    if (!acts.length || rnd() < 0.12) { m.endSetup(); return; }
    pick(acts)();
  }
  if (m.phase === 'user-setup' && !gs.Pending) m.endSetup();
}
function battle(m) {
  for (let guard = 0; guard < 8 && (m.phase === 'user-battle' || m.phase === 'ai-battle'); guard++) {
    const a = m.nextAttack();
    if (!a) return;
    m.strike(a.forced || E.wheelResult(a.zones, rnd()));
  }
}
function aiTurn(m) {
  for (let guard = 0; guard < 80 && m.phase === 'ai-setup'; guard++) m.aiStep();
  if (m.phase === 'ai-setup') throw new Error('the AI did not stop deciding');
}

const errors = new Map(); let finished = 0, turns = 0, userWins = 0, maxTurns = 0;
for (let i = 0; i < N; i++) {
  const ud = pick(decks), od = pick(decks), uh = pick(heroes), oh = pick(heroes);
  const rank = 1 + Math.floor(rnd() * 25), orank = 1 + Math.floor(rnd() * 25);
  let m;
  try {
    const user = E.Catalog.deck(ud), opp = E.Catalog.deck(od);
    m = new E.Match({ seed: 1000 + i, user: { deck: user, leader: E.Catalog.leader(uh, rank) }, opponent: { deck: opp, leader: E.Catalog.leader(oh, orank) } });
    m.placeLandscapes(user.Landscapes.slice());
    let steps = 0;
    while (!m.over && steps++ < 400) {
      if (m.phase === 'user-setup') userTurn(m);
      else if (m.phase === 'ai-setup') aiTurn(m);
      else if (m.phase === 'user-battle' || m.phase === 'ai-battle') battle(m);
      else throw new Error('stuck in ' + m.phase);
      m.gs.Log.length = 0;
    }
    if (m.over) { finished++; if (m.winner === 0) userWins++; }
    turns += m.gs.Turn; maxTurns = Math.max(maxTurns, m.gs.Turn);
  } catch (e) {
    const key = (e.message || String(e)) + ' @ ' + ((e.stack || '').split('\n').find(l => l.includes('anonymous')) || '').trim();
    const rec = errors.get(key) || { n: 0, example: `match ${i}: ${ud} (${uh}) vs ${od} (${oh})`, stack: e.stack };
    rec.n++; errors.set(key, rec);
  }
}
const faults = {}; for (const f of E.AIManager.Faults) faults[f] = (faults[f] || 0) + 1;
console.log('passed over (where the original would have hung):', faults);
console.log(`${N} matches: ${finished} finished, ${N - finished - [...errors.values()].reduce((a, r) => a + r.n, 0)} ran out of steps, player won ${userWins}; average ${(turns / N).toFixed(1)} turns, longest ${maxTurns}`);
for (const [k, r] of [...errors.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`\n${r.n}× ${k}\n   e.g. ${r.example}\n${r.stack.split('\n').slice(0, 7).join('\n')}`);
}
