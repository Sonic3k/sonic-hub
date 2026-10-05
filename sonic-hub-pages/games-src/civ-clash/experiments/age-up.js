// Does "age up" add a real decision, or just luck?  Test content: five elite cards per civ
// (its five most common non-wall cards with one extra copy of their first symbol).
const { runGame, duel, ids } = require('./harness.js');
function eliteStack(S, civ) {
  const counts = {};
  for (const tok of CIVS[civ].deck.split(/\s+/)) { if (tok[0] === '+') continue; const m = tok.match(/^([A-Z]+)(\d+)$/); if (!/W/.test(m[1])) counts[m[1]] = (counts[m[1]] || 0) + +m[2]; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([icons]) => { const up = icons[0] + icons, c = cardFromIcons(up); return makeCard(S, { name: 'Elite', icons: up, civ, steps: c.steps, wall: c.wall }); });
}
function ageUp(S, P) {
  if (P.aged) return; P.aged = true; P.agedRound = S.round;
  const stack = shuffled(S, eliteStack(S, P.civ)), offer = stack.slice(0, 3), opp = opponents(S, P);
  let best = offer[0], bv = -1e9;
  for (const c of offer) { const v = Math.max(...(needsTarget(c) ? opp : [null]).map(T => cardValue(S, P, c, T))); if (v > bv) { bv = v; best = c; } }
  P.hand.push(best);
  for (const c of stack) if (c !== best) P.deck.splice(Math.floor(rnd(S) * (P.deck.length + 1)), 0, c);
}
// the engine resolves steps by name, so an extra step type can be layered on top
const origResolve = resolveStep, origValue = cardValue;
globalThis.resolveStep = (S, A, s, T, ev) => (s.ageup ? ageUp(S, A) : origResolve(S, A, s, T, ev));
globalThis.cardValue = (S, P, card, T) => (card.steps.some(s => s.ageup) ? (P.aged ? 0 : S.round <= 12 ? 3 : 0.5) : origValue(S, P, card, T));
const pct = x => (x * 100).toFixed(1) + '%';

// ── A: the card-in-deck version. Who draws it early?
{
  const buckets = { early: [0, 0], mid: [0, 0], late: [0, 0] };
  for (let g = 0; g < 8000; g++) {
    const pair = shuffled({ rs: (5 + g * 2654435761) >>> 0 }, ids).slice(0, 2);
    const S = runGame((31 + g * 7919) >>> 0, pair, {
      setup: S => { for (const P of S.players) { const i = P.deck.findIndex(c => c.icons === 'A'); const card = makeCard(S, { name: 'Age Up', icons: 'M', civ: P.civ, steps: [{ ageup: 1 }], wall: 0 }); if (i >= 0) P.deck[i] = card; else P.deck.push(card); P.deck = shuffled(S, P.deck); P.ageUid = card.uid; } },
      onTurnStart: (S, P) => { if (P.seenAt == null && P.hand.some(c => c.uid === P.ageUid)) P.seenAt = P.hTurns; return false; },
    });
    for (const P of S.players) { const b = P.seenAt != null && P.seenAt <= 3 ? 'early' : P.seenAt != null && P.seenAt <= 8 ? 'mid' : 'late'; buckets[b][1]++; if (S.winner === P.id) buckets[b][0]++; }
  }
  console.log('A · age-up as a card in the deck — win rate by when you happened to draw it:');
  for (const [k, [w, n]] of Object.entries(buckets)) console.log(`   ${k.padEnd(5)} (${k === 'early' ? 'by your 3rd turn' : k === 'mid' ? 'turns 4–8' : 'later or never'}): ${pct(w / n)} of ${n} players`);
}
// ── B: the action version — pay gold, give up your play this turn
for (const cost of [0, 1, 2]) {
  let T = 2.5;
  const opts = { onTurnStart: (S, P) => {
    if (P.aged || P.policy === 'never' || P.gold < cost) return false;
    if (P.policy === 'smart') {
      const best = bestPlay(S, P), bv = best ? best.v : 0;
      const canKill = opponents(S, P).some(X => X.hp + wallTotal(X) <= 2);
      if (canKill || P.hp <= P.maxHP * 0.35 || S.round > 10 || bv > T) return false;
    }
    P.gold -= cost; ageUp(S, P); S.plays -= 1; return true;
  } };
  const asapNever = duel(6000, 101, 'asap', 'never', opts), smartNever = duel(6000, 202, 'smart', 'never', opts), smartAsap = duel(6000, 303, 'smart', 'asap', opts);
  const when = { asap: [], smart: [] };
  for (let g = 0; g < 1500; g++) { const S = runGame((404 + g * 7919) >>> 0, shuffled({ rs: (9 + g * 2654435761) >>> 0 }, ids).slice(0, 2), { ...opts, policies: ['asap', 'smart'] }); for (const P of S.players) if (P.agedRound) when[P.policy].push(P.agedRound); }
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  console.log(`B · cost ${cost} gold + your play: asap beats never ${pct(asapNever)} · smart beats never ${pct(smartNever)} · smart beats asap ${pct(smartAsap)} · median age-up round: asap ${med(when.asap)}, smart ${med(when.smart)} (smart ages in ${pct(when.smart.length / 1500)} of games)`);
}
