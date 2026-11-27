#!/usr/bin/env node
/* The engine's tests: the data holds together, the wheel reads as the original's did, and every table of the game
   plays to its end. A player who makes random legal moves (so every path of the player's side is walked: lanes chosen,
   discard piles opened) sits at every practice table, and at many random pairings of preset decks and heroes.

     node engine/engine.test.js */
const assert = require('assert');
const load = require('./load.js'), E = load(), data = require('../content/data.json');
E.Catalog.load(data);
let failures = 0;
const test = (name, fn) => { try { fn(); console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } };

test('the data is whole', () => {
  assert.strictEqual(data.cards.length, 416); assert.strictEqual(data.leaders.length, 72);
  const ids = new Set(data.cards.map(c => c.id)); assert.strictEqual(ids.size, data.cards.length, 'card ids are unique');
  for (const c of data.cards) if (c.script) assert.ok(E.SCRIPTS[c.script], `${c.id}: script ${c.script} was converted`);
  for (const l of data.leaders) assert.ok(E.SCRIPTS[l.script], `${l.id}: script ${l.script} was converted`);
  const decks = new Set(data.decks.map(d => d.id)), heroes = new Set(data.leaders.map(l => l.id));
  for (const q of data.quests) { assert.ok(heroes.has(q.hero), `quest ${q.id}: hero ${q.hero}`); assert.ok(decks.has(q.deck) || q.deck === 'player-clone', `quest ${q.id}: deck ${q.deck}`); }
  for (const d of data.decks) for (const row of d.cards) assert.ok(data.cards[row[0]], `${d.id}: card ${row[0]}`);
});
test('every number is the original\'s: a few cards and heroes checked by hand', () => {
  const bySrc = Object.fromEntries(data.cards.map(c => [c.src, c]));
  const cornball = bySrc.Creature_Cornball;   // Huskling
  assert.deepStrictEqual([cornball.cost, cornball.atk, cornball.def, cornball.floop, cornball.faction], [1, 2, 5, 2, 0]);
  const jake = data.leaders.find(l => l.src === 'Leader_Jake');
  assert.deepStrictEqual([jake.hp, jake.cooldown, jake.v1, jake.script], [10, 3, 3, 'ATKBonusFactionCreaturesLeader']);
  assert.strictEqual(data.params.Max_Duplicates_In_Deck, '4'); assert.strictEqual(data.params.Min_Cards_In_Deck, '10');
});
test('the Rose Window reads its zones as the original did', () => {
  const z = { hit: [0.2, 0.6], crit: [0.6, 0.7] };
  assert.strictEqual(E.wheelResult(z, 0.1), 'Miss'); assert.strictEqual(E.wheelResult(z, 0.2), 'Hit'); assert.strictEqual(E.wheelResult(z, 0.65), 'Crit'); assert.strictEqual(E.wheelResult(z, 0.71), 'Miss');
  const m = new E.Match({ seed: 5, user: { deck: E.Catalog.deck('starter'), leader: E.Catalog.leader('maple', 1) }, opponent: { deck: E.Catalog.deck('quest-1'), leader: E.Catalog.leader('wren', 1) } });
  const form = E.Catalog.leaders.maple;
  for (let i = 0; i < 50; i++) {
    const zs = E.wheelZones(m.gs, form, { spinFactor: 2 }, true, false);
    assert.ok(Math.abs((zs.hit[1] - zs.hit[0]) - form.Ring_P1_HitAreaRange) < 1e-9 && Math.abs((zs.crit[1] - zs.crit[0]) - form.Ring_P1_CritAreaRange) < 1e-9);
    assert.ok(zs.spin >= form.TimeFor1SpinMin * 2 - 1e-9 && zs.spin <= form.TimeFor1SpinMax * 2 + 1e-9, 'one turn takes the hero\'s time, times the table\'s factor');
    const open = E.wheelZones(m.gs, form, {}, true, true);
    assert.ok(Math.abs(open.hit[1] - open.hit[0] - (1 - form.Ring_P1_CritAreaRange)) < 1e-9, 'an empty lane in front: all but the critical zone is a hit');
  }
});

/* ---- whole matches */
let s = 7;
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
function play(m) {
  let steps = 0;
  while (!m.over && steps++ < 500) {
    const gs = m.gs;
    if (m.phase === 'user-setup') {
      for (let g = 0; g < 60 && m.phase === 'user-setup'; g++) {
        if (gs.Pending) { const pe = gs.Pending; if (pe.kind === 'lane') m.chooseLane(pick(pe.lanes)); else if (pe.cards.length) m.chooseCard(pick(pe.cards)); else m.skipChoice(); continue; }
        const acts = [];
        for (const c of gs.GetHand(0)) { if (c.Form.Type === E.CardType.Spell) { if (m.canCast(c)) acts.push(() => m.cast(c)); } else for (let l = 0; l < 4; l++) if (m.canSummon(c, l)) acts.push(() => m.summon(c, l)); }
        for (let l = 0; l < 4; l++) if (m.canFloop(l)) acts.push(() => m.floop(l));
        if (m.canUseHero()) acts.push(() => m.useHero());
        if (!acts.length || rnd() < 0.12) break;
        pick(acts)();
      }
      if (m.phase === 'user-setup' && !gs.Pending) m.endSetup();
    } else if (m.phase === 'ai-setup') { for (let g = 0; g < 80 && m.phase === 'ai-setup'; g++) m.aiStep(); assert.notStrictEqual(m.phase, 'ai-setup', 'the AI stops deciding'); }
    else if (m.phase === 'user-battle' || m.phase === 'ai-battle') { for (let g = 0; g < 8 && (m.phase === 'user-battle' || m.phase === 'ai-battle'); g++) { const a = m.nextAttack(); if (!a) break; m.strike(a.forced || E.wheelResult(a.zones, rnd())); } }
    else throw new Error('stuck in ' + m.phase);
    gs.Log.length = 0;
  }
  return m;
}
test('every practice table plays to its end, the player at the table\'s rank with the starter deck', () => {
  const tables = data.quests.filter(q => q.type === 'main');
  let finished = 0;
  for (const q of tables) {
    const opp = q.deck === 'player-clone' ? E.Catalog.deck('starter') : E.Catalog.deck(q.deck);
    const m = new E.Match({ seed: Number(q.id), user: { deck: E.Catalog.deck('starter'), leader: E.Catalog.leader('maple', q.rank) }, opponent: { deck: opp, leader: E.Catalog.leader(q.hero, q.rank) },
      quest: { spinFactor: q.spin, p1Hit: q.p1Hit, p1Crit: q.p1Crit, p2Hit: q.p2Hit, p2Crit: q.p2Crit, aiReshuffle: q.reshuffle } });
    m.placeLandscapes(m.gs.GetDeck(0).Landscapes.slice());
    if (play(m).over) finished++;
  }
  assert.strictEqual(finished, tables.length, `${tables.length - finished} tables did not finish`);
});
test('a thousand random pairings of preset decks and heroes play to their ends', () => {
  const decks = data.decks.filter(d => d.cards.length >= 10).map(d => d.id), heroes = data.leaders.map(l => l.id);
  let finished = 0;
  for (let i = 0; i < 1000; i++) {
    const user = E.Catalog.deck(pick(decks)), opp = E.Catalog.deck(pick(decks));
    const m = new E.Match({ seed: 4000 + i, user: { deck: user, leader: E.Catalog.leader(pick(heroes), 1 + Math.floor(rnd() * 25)) }, opponent: { deck: opp, leader: E.Catalog.leader(pick(heroes), 1 + Math.floor(rnd() * 25)) } });
    m.placeLandscapes(user.Landscapes.slice());
    if (play(m).over) finished++;
  }
  assert.strictEqual(finished, 1000);
});
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
