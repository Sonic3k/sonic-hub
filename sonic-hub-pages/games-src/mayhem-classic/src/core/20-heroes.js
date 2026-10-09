/* ── Heroes: one deck of 28 cards each ──
   sym: the card's symbols in order (A attack, S shield, H heal, D draw, P play again); power: its Mighty Power, if any.
   art: the picture on the card (drawn in code), when it is not simply the hero's weapon. */
const HEROES = {
  barbarian: {
    name: 'Korga', title: 'the Bonesplitter', cls: 'Barbarian', color: '#b5322a', deep: '#5c150e', wash: '#f6dccf', ink: '#4a120b', emblem: 'axe', weapon: 'axe',
    blurb: 'The hardest hitter at the table. Big axes, two loyal hounds, and a howl that empties every hand.',
    cards: [
      { id: 'cleave', name: 'Cleave', sym: 'AAA', n: 5 },
      { id: 'rampage', name: 'Rampage!', sym: 'AAAA', n: 2, art: 'rampage' },
      { id: 'knuckles', name: 'Knuckle Sandwich', sym: 'AA', n: 2, art: 'fist' },
      { id: 'skullbash', name: 'Skull Bash', sym: 'AP', n: 2, art: 'helm' },
      { id: 'hatchets', name: 'Twin Hatchets', sym: 'AA', n: 2, art: 'hatchets' },
      { id: 'gnasher', name: 'Gnasher', sym: 'SSS', n: 1, art: 'hound' },
      { id: 'growler', name: 'Growler', sym: 'SSS', n: 1, art: 'hound' },
      { id: 'buckler', name: 'Studded Buckler', sym: 'SS', n: 1, art: 'buckler' },
      { id: 'weasels', name: 'Sack of Weasels', sym: 'SD', n: 1, art: 'sack' },
      { id: 'haunch', name: 'Roast Haunch', sym: 'DDH', n: 1, art: 'meat' },
      { id: 'showoff', name: 'Show Off', sym: 'HD', n: 2, art: 'flex' },
      { id: 'rack', name: 'Raid the Rack', sym: 'DD', n: 2, art: 'rack' },
      { id: 'howl', name: 'Earsplitting Howl', power: 'roar', sym: 'P', n: 2, art: 'howl' },
      { id: 'tossaside', name: 'Toss Aside', power: 'destroy', sym: 'D', n: 2, art: 'toss' },
      { id: 'whirlwind', name: 'Whirlwind of Steel', power: 'whirl', sym: '', n: 2, art: 'whirl' },
    ],
  },
  wizard: {
    name: 'Mirrin', title: 'the Arcane', cls: 'Wizard', color: '#2c5fb2', deep: '#13285a', wash: '#dbe5f7', ink: '#0f2148', emblem: 'hat', weapon: 'bolt',
    blurb: 'Lightning, fire and tricks that turn a fight around: swap lives, steal a shield, or set the whole room ablaze.',
    cards: [
      { id: 'thunderclap', name: 'Thunderclap', sym: 'AAA', n: 4, art: 'bolt' },
      { id: 'scorch', name: 'Scorching Ray', sym: 'AA', n: 3, art: 'flame' },
      { id: 'dart', name: 'Arcane Dart', sym: 'AP', n: 3, art: 'dart' },
      { id: 'tome', name: 'Tome of Secrets', sym: 'DDD', n: 3, art: 'tome' },
      { id: 'quicken', name: 'Quickened Mind', sym: 'PP', n: 3, art: 'hourglass' },
      { id: 'glare', name: 'Withering Glare', sym: 'HP', n: 2, art: 'eye' },
      { id: 'ward', name: 'Ward', sym: 'SD', n: 2, art: 'ward' },
      { id: 'granite', name: 'Granite Hide', sym: 'SS', n: 1, art: 'rock' },
      { id: 'doubles', name: 'Phantom Doubles', sym: 'SSS', n: 1, art: 'mirror' },
      { id: 'beguile', name: 'Beguile', power: 'charm', sym: '', n: 2, art: 'charm' },
      { id: 'siphon', name: 'Soul Siphon', power: 'swap', sym: '', n: 2, art: 'swap' },
      { id: 'firestorm', name: 'Firestorm', power: 'fireball', sym: '', n: 2, art: 'fireball' },
    ],
  },
  paladin: {
    name: 'Ysolde', title: 'the Dawnblade', cls: 'Paladin', color: '#c08a22', deep: '#5e3f0b', wash: '#f8edcc', ink: '#4a3208', emblem: 'sun', weapon: 'sword',
    blurb: 'Strikes that heal, the sturdiest shields at the table, and a prayer that brings back the card she needs.',
    cards: [
      { id: 'fury', name: 'Righteous Fury', sym: 'AAA', n: 2 },
      { id: 'hammer', name: 'Hammer of Duty', sym: 'AA', n: 4, art: 'hammer' },
      { id: 'oathstrike', name: 'Oathstrike', sym: 'AP', n: 3, art: 'oath' },
      { id: 'smite', name: 'Holy Smite', sym: 'AAAH', n: 3, art: 'smite' },
      { id: 'rally', name: 'Rallying Shout', sym: 'AAH', n: 3, art: 'horn' },
      { id: 'rebuke', name: 'Stern Rebuke', sym: 'PP', n: 2, art: 'finger' },
      { id: 'presence', name: 'Inspiring Presence', sym: 'DD', n: 2, art: 'banner' },
      { id: 'mend', name: 'Mend', sym: 'DDH', n: 1, art: 'hands' },
      { id: 'riposte', name: 'Riposte', sym: 'SD', n: 2, art: 'parry' },
      { id: 'aegis', name: 'Aegis of Dawn', sym: 'SSS', n: 2, art: 'aegis' },
      { id: 'bramble', name: 'Bramble the Warhorse', sym: 'SS', n: 1, art: 'steed' },
      { id: 'prayer', name: 'Answered Prayer', power: 'recall', sym: 'HH', n: 2, art: 'prayer' },
      { id: 'purging', name: 'Purging Light', power: 'purge', sym: 'P', n: 1, art: 'purge' },
    ],
  },
  rogue: {
    name: 'Vex', title: 'the Quickfingered', cls: 'Rogue', color: '#6b3fa3', deep: '#2b1450', wash: '#e8ddf5', ink: '#24103f', emblem: 'mask', weapon: 'knife',
    blurb: 'Chains of quick knives, a vanishing act, and light fingers that play other people\'s cards.',
    cards: [
      { id: 'flurry', name: 'Flurry of Knives', sym: 'AAA', n: 3, art: 'knives3' },
      { id: 'paired', name: 'Paired Knives', sym: 'AA', n: 4, art: 'knives2' },
      { id: 'flick', name: 'Flick Knife', sym: 'AP', n: 5 },
      { id: 'bandolier', name: 'More Knives!', sym: 'DDH', n: 1, art: 'bandolier' },
      { id: 'tonic', name: 'Swiped Tonic', sym: 'HP', n: 2, art: 'potion' },
      { id: 'wyvern', name: 'Pet Wyvern', sym: 'SD', n: 2, art: 'wyvern' },
      { id: 'muscle', name: 'Hired Muscle', sym: 'SS', n: 2, art: 'muscle' },
      { id: 'grudd', name: 'Grudd the Bouncer', sym: 'SSS', n: 1, art: 'bouncer' },
      { id: 'cloak', name: 'Smoke Cloak', sym: 'SD', n: 2, art: 'cloak' },
      { id: 'vanish', name: 'Vanishing Act', power: 'disguise', sym: '', n: 2, art: 'mask' },
      { id: 'cheapshot', name: 'Cheap Shot', power: 'destroy', sym: 'P', n: 2, art: 'cheap' },
      { id: 'fingers', name: 'Light Fingers', power: 'steal', sym: '', n: 2, art: 'hand' },
    ],
  },
};
const HERO_ORDER = ['barbarian', 'wizard', 'paladin', 'rogue'];
const heroName = h => `${HEROES[h].name} ${HEROES[h].title}`;
const deckSize = h => HEROES[h].cards.reduce((a, c) => a + c.n, 0);
/* the symbols across a whole deck, for the hero select screen */
function deckMix(h) { const n = { A: 0, S: 0, H: 0, D: 0, P: 0, M: 0 }; for (const c of HEROES[h].cards) { for (const ch of c.sym) n[ch] += c.n; if (c.power) n.M += c.n; } return n; }
