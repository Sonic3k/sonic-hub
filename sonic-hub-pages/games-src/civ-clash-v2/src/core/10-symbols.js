/* ── Symbols: the only source of every card effect ──
   A card is a list of symbols, resolved left to right against one target (Gunpowder hits every opponent).
   Every attack symbol is one hit. Damage goes into the target's structures first: the structure in front loses 1 durability
   and that hit stops there; only a target with no structure loses HP. Direct damage skips structures and goes straight to HP.
   Guards stay in the Defenses row until they are used; Traps and Storm last until their owner's next turn.
   id: the word used in unit data. word(n): card text for n of the same symbol in a row. */
const SYM = {
  A: { id: 'strike', name: 'Strike', target: 1, hit: { dmg: 1, kind: 'strike' },
    desc: 'A hit for 1 damage. A Bodyguard blocks it.', word: n => (n === 1 ? 'Strike for 1 damage' : `Strike ${times(n)}, 1 damage each`) },
  X: { id: 'flank', name: 'Flank', target: 1, hit: { dmg: 1, kind: 'flank', open: 1 },
    desc: 'A hit for 1 damage, only if the target has no structure.', word: n => (n === 1 ? 'Flank for 1 damage if they have no structure' : `Flank ${times(n)}, 1 damage each if they have no structure`) },
  Y: { id: 'eagle', name: 'Eagle', target: 1, hit: { dmg: 1, kind: 'eagle', bonusOpen: 1 },
    desc: 'A hit for 1 damage, or 2 damage if the target has no structure. A Bodyguard blocks it.', word: n => (n === 1 ? 'Hit for 1 damage, or 2 if they have no structure' : `Hit ${times(n)} for 1 damage each, or 2 if they have no structure`) },
  B: { id: 'ranged', name: 'Ranged', target: 1, hit: { dmg: 1, kind: 'ranged' },
    desc: 'A hit for 1 damage.', word: n => (n === 1 ? 'Shoot for 1 damage' : `Shoot ${times(n)}, 1 damage each`) },
  O: { id: 'longranged', name: 'Long Ranged', target: 1, hit: { dmg: 1, kind: 'longranged', direct: 1 },
    desc: 'A hit for 1 direct damage: it flies over structures straight to HP. A Mantlet blocks it.', word: n => (n === 1 ? 'Shoot for 1 direct damage' : `Shoot ${times(n)}, 1 direct damage each`) },
  K: { id: 'cavalry', name: 'Cavalry', target: 1, hit: { dmg: 2, kind: 'cavalry' },
    desc: 'A hit for 2 damage. A Camel guard blocks it.', word: n => (n === 1 ? 'Charge for 2 damage' : `Charge ${times(n)}, 2 damage each`) },
  L: { id: 'camel', name: 'Camel', target: 1, hit: { dmg: 1, kind: 'camel' }, self: 1,
    desc: 'A hit for 1 damage, and you gain a Camel guard.', word: n => (n === 1 ? 'Hit for 1 damage and gain a Camel guard' : `Hit ${times(n)} for 1 damage and gain ${n} Camel guards`) },
  E: { id: 'elephant', name: 'Elephant', target: 1, hit: { dmg: 2, kind: 'elephant' },
    desc: 'Kills 1 random guard of the target, then a hit for 2 damage.', word: n => (n === 1 ? 'Kill a guard, then hit for 2 damage' : `${cap(times(n))}: kill a guard, then hit for 2 damage`) },
  F: { id: 'gunpowder', name: 'Gunpowder', target: 0, all: 1, hit: { dmg: 1, kind: 'gunpowder' },
    desc: 'A hit for 1 damage on every opponent.', word: n => (n === 1 ? 'Hit every opponent for 1 damage' : `Hit every opponent ${times(n)}, 1 damage each`) },
  N: { id: 'ship', name: 'Ship', target: 1, hit: { dmg: 1, kind: 'ship' },
    desc: 'A hit for 1 damage that also steals 1 random card from the target\'s hand.', word: n => (n === 1 ? 'Hit for 1 damage and steal a random card' : `${cap(times(n))}: hit for 1 damage and steal a random card`) },
  R: { id: 'ram', name: 'Ram', target: 1, siege: 'front',
    desc: 'The target\'s front structure loses 2 durability. It never touches HP.', word: n => (n === 1 ? 'Their front structure loses 2 durability' : `Ram ${times(n)}: their front structure loses 2 durability each time`) },
  P: { id: 'catapult', name: 'Catapult', target: 1, siege: 'big',
    desc: 'The target\'s biggest structure loses 2 durability. It never touches HP.', word: n => (n === 1 ? 'Their biggest structure loses 2 durability' : `${cap(times(n))}: their biggest structure loses 2 durability`) },
  Z: { id: 'snipe', name: 'Snipe', target: 1,
    desc: 'Kills 1 random guard of the target.', word: n => (n === 1 ? 'Kill a random guard' : `Kill ${n} random guards`) },
  J: { id: 'raid', name: 'Raid', target: 1,
    desc: 'You gain 1 gold, and the target loses 1 gold if they have any.', word: n => (n === 1 ? 'Raid: gain 1 gold, they lose 1 if they have any' : `Raid ${times(n)}: gain 1 gold each time, they lose 1 if they have any`) },
  S: { id: 'spy', name: 'Spy', target: 1,
    desc: 'Steal 1 random card from the target\'s hand.', word: n => (n === 1 ? 'Steal a random card' : `Steal ${n} random cards`) },
  C: { id: 'monk', name: 'Monk', target: 1,
    desc: 'Look at the target\'s hand and take the card you choose.', word: n => (n === 1 ? 'Look at their hand and take a card you choose' : `Look at their hand and take ${n} cards you choose`) },
  Q: { id: 'bodyguard', name: 'Bodyguard', target: 0, guard: 'bodyguard',
    desc: 'You gain a Bodyguard guard: it blocks the next Strike or Eagle hit on you.', word: n => (n === 1 ? 'Gain a Bodyguard' : `Gain ${n} Bodyguards`) },
  I: { id: 'mantlet', name: 'Mantlet', target: 0, guard: 'mantlet',
    desc: 'You gain a Mantlet guard: it blocks the next direct damage hit on you.', word: n => (n === 1 ? 'Gain a Mantlet' : `Gain ${n} Mantlets`) },
  T: { id: 'trap', name: 'Trap', target: 0,
    desc: 'You set a Trap until your next turn: the next hit on you deals 1 direct damage back to its attacker.', word: n => (n === 1 ? 'Set a Trap' : `Set ${n} Traps`) },
  V: { id: 'storm', name: 'Storm', target: 0,
    desc: 'Until your next turn every attack on you is cancelled: hits, siege, snipes and raids.', word: () => 'Storm: every attack on you is cancelled until your next turn' },
  H: { id: 'heal', name: 'Heal', target: 0, desc: 'Heal 1 HP.', word: n => `Heal ${n} HP` },
  D: { id: 'draw', name: 'Draw', target: 0, desc: 'Draw 1 card.', word: n => (n === 1 ? 'Draw a card' : `Draw ${n} cards`) },
  G: { id: 'gold', name: 'Gold', target: 0, desc: 'Gain 1 gold. Gold hires mercenaries at the market.', word: n => `Gain ${n} gold` },
  M: { id: 'play', name: 'Extra play', target: 0, desc: 'Play another card this turn.', word: n => (n === 1 ? 'Play another card' : `Play ${n} more cards`) },
  W: { id: 'wall', name: 'Structure', target: 0,
    desc: 'The card stays in your Defenses as a structure with 1 durability per symbol. Each hit that reaches it takes 1 durability and stops there.' },
  U: { id: 'countdown', name: 'Countdown', target: 0,
    desc: 'Makes the structure a wonder. A wonder stands behind your other structures; at the start of each of your turns it loses one countdown, and when the last one goes while it still stands, you win.' },
};
const SYM_ORDER = 'AXYBOKLEFNRPZJSCQITVHDGMWU';
const SYM_BY_ID = Object.fromEntries(Object.entries(SYM).map(([code, s]) => [s.id, code]));
/* which guard blocks which hit */
const GUARD_OF = { strike: 'bodyguard', eagle: 'bodyguard', cavalry: 'camel', longranged: 'mantlet' };
const GUARD_NAME = { bodyguard: 'Bodyguard', camel: 'Camel guard', mantlet: 'Mantlet' };
const GUARD_CODE = { bodyguard: 'Q', camel: 'L', mantlet: 'I' };
function times(n) { return n === 2 ? 'twice' : `${n} times`; }
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
/* unit data writes symbols as words ('strike strike flank'); cards carry them as one letter each ('AAX') */
function symCodes(words) {
  return words.trim().split(/\s+/).filter(Boolean).map(w => { const c = SYM_BY_ID[w]; if (!c) throw new Error('unknown symbol ' + w); return c; }).join('');
}
const count = (icons, ch) => { let n = 0; for (const c of icons) if (c === ch) n++; return n; };
const needsTarget = card => [...(card.icons || '')].some(ch => SYM[ch].target);
/* readable text for any card, built only from its symbols */
function cardText(card) {
  if (card.age) return ageText(card.civ);
  return iconText(card.icons, card);
}
function iconText(icons, card) {
  const parts = [];
  let i = 0;
  while (i < icons.length) {
    const ch = icons[i]; let n = 1;
    while (icons[i + n] === ch) n++;
    if (SYM[ch].word) parts.push(SYM[ch].word(n));
    i += n;
  }
  const w = count(icons, 'W'), u = count(icons, 'U');
  if (u) parts.push(`Stays as a wonder with ${w} durability: you win if it still stands after ${u} of your turns`);
  else if (w) parts.push(`Stays as a structure with ${w} durability`);
  return parts.map(p => p + '.').join(' ');
}
