/* ── The rules in numbers, the five symbols, and the Mighty Powers ── */
const RULES = { hp: 10, maxHP: 10, startHand: 3, emptyDraw: 2, deckSize: 28, minPlayers: 2, maxPlayers: 4 };

/* every card is a row of symbols, used top to bottom; a Mighty Power card adds the text of its power */
const SYM = {
  A: { name: 'Attack', short: 'damage', desc: 'Deals 1 damage. All the attacks on a card go to one target: an opponent, or one of their shields. Damage left after a shield breaks moves on to their next shield, then to them.' },
  S: { name: 'Shield', short: 'shield', desc: 'The card stays in front of you. Each shield symbol stops 1 damage; when they are all used up the card breaks. While you have a shield, attacks cannot reach your HP.' },
  H: { name: 'Heal', short: 'heal', desc: 'Heal 1 HP. Nobody goes above 10.' },
  D: { name: 'Draw', short: 'draw', desc: 'Draw a card.' },
  P: { name: 'Play again', short: 'play again', desc: 'Play one more card this turn. You must, even if you would rather not.' },
  M: { name: 'Mighty Power', short: 'mighty', desc: 'A power only this hero has. Do what the card says, then use its other symbols.' },
};
const SYM_ORDER = ['A', 'S', 'H', 'D', 'P'];

/* aim: what the player chooses when the card is played
   'shield'  a shield in front of an opponent      'opp'     an opponent
   'oppDeck' an opponent whose deck is stolen from  'discard' a card in your own discard pile */
/* text: the full rule (card sheet, codex); short: what fits on the card */
const POWERS = {
  whirl:    { name: 'Whirlwind', aim: null, short: 'Heal 1 per opponent, then deal 1 damage to each opponent.', text: 'Heal 1 for each opponent, then deal 1 damage to each opponent (their shields take it first).' },
  roar:     { name: 'Battle Cry', aim: null, short: 'Everyone, you too, discards their hand and draws 3.', text: 'Every player, you too, discards their whole hand and draws 3 cards.' },
  destroy:  { name: 'Break a Shield', aim: 'shield', short: 'Destroy a shield in front of an opponent.', text: 'Destroy one shield in front of an opponent, however much it has left. It goes to its owner\'s discard pile.' },
  fireball: { name: 'Firestorm', aim: null, short: 'Everyone, you too, takes 3 damage.', text: 'Every player, you too, takes 3 damage. Shields take it first, as with any damage.' },
  swap:     { name: 'Life Swap', aim: 'opp', short: 'Swap your HP with an opponent\'s.', text: 'Swap your HP with an opponent\'s HP.' },
  charm:    { name: 'Turncoat', aim: 'shield', short: 'Take an opponent\'s shield. It protects you now.', text: 'Take a shield from in front of an opponent, with any damage it has taken. It protects you now; when it breaks it goes back to its owner\'s discard pile.' },
  recall:   { name: 'Second Chance', aim: 'discard', short: 'Put a card from your discard pile into your hand.', text: 'Choose any card in your discard pile and put it into your hand.' },
  purge:    { name: 'Clean Sweep', aim: null, short: 'Destroy every shield in play, yours too.', text: 'Destroy every shield in play, your own included.' },
  disguise: { name: 'Vanish', aim: null, short: 'Until your next turn, opponents\' cards can\'t touch you or your shields.', text: 'Until the start of your next turn, nothing an opponent plays can affect you or your shields: no attack, no damage, no theft.' },
  steal:    { name: 'Light Fingers', aim: 'oppDeck', short: 'Play the top card of an opponent\'s deck as your own.', text: 'Take the top card of an opponent\'s deck and play it at once as if it were yours (its play-again symbols count for you). Then it goes to their discard pile; a shield stays in front of you until it breaks.' },
};
