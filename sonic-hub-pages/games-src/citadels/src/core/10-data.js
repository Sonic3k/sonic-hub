/* ── The cards: 27 characters, 54 basic districts in four types, 30 unique districts, and the suggested sets ──
   Names follow the 2016 edition. Texts are written for this game; {noble}, {gold}, {cards} and friends are keywords the
   table prints in their own colour. A game uses one character per rank (rank 9 only with 3 or 8 players, or by choice) and
   14 of the 30 unique districts, shuffled in with the 54 basic ones. */
const RULES = { startGold: 2, startHand: 4, minPlayers: 2, maxPlayers: 8, uniquesPerGame: 14 };
const citySize = n => (n <= 3 ? 8 : 7);

const TYPES = {
  noble: { name: 'Noble', color: '#c99a1e', deep: '#6b4e08', wash: '#f6e6b3' },
  religious: { name: 'Religious', color: '#3a6db3', deep: '#16305c', wash: '#d9e5f6' },
  trade: { name: 'Trade', color: '#3f8f45', deep: '#173f1b', wash: '#d8ecd4' },
  military: { name: 'Military', color: '#b0362a', deep: '#561510', wash: '#f4d6cf' },
  unique: { name: 'Unique', color: '#7a48a8', deep: '#341a52', wash: '#e8dcf3' },
};
const TYPE_ORDER = ['noble', 'religious', 'trade', 'military', 'unique'];

/* the 54 basic districts: n is the number of copies */
const BASIC = [
  { id: 'manor', name: 'Manor', type: 'noble', cost: 3, n: 5 },
  { id: 'castle', name: 'Castle', type: 'noble', cost: 4, n: 4 },
  { id: 'palace', name: 'Palace', type: 'noble', cost: 5, n: 3 },
  { id: 'temple', name: 'Temple', type: 'religious', cost: 1, n: 3 },
  { id: 'church', name: 'Church', type: 'religious', cost: 2, n: 3 },
  { id: 'monastery', name: 'Monastery', type: 'religious', cost: 3, n: 3 },
  { id: 'cathedral', name: 'Cathedral', type: 'religious', cost: 5, n: 2 },
  { id: 'tavern', name: 'Tavern', type: 'trade', cost: 1, n: 5 },
  { id: 'market', name: 'Market', type: 'trade', cost: 2, n: 4 },
  { id: 'trading-post', name: 'Trading Post', type: 'trade', cost: 2, n: 3 },
  { id: 'docks', name: 'Docks', type: 'trade', cost: 3, n: 3 },
  { id: 'harbor', name: 'Harbor', type: 'trade', cost: 4, n: 3 },
  { id: 'town-hall', name: 'Town Hall', type: 'trade', cost: 5, n: 2 },
  { id: 'watchtower', name: 'Watchtower', type: 'military', cost: 1, n: 3 },
  { id: 'prison', name: 'Prison', type: 'military', cost: 2, n: 3 },
  { id: 'barracks', name: 'Barracks', type: 'military', cost: 3, n: 3 },
  { id: 'fortress', name: 'Fortress', type: 'military', cost: 5, n: 2 },
];

/* the 30 unique districts, one copy each. when: 'end' scores at the end, 'gather' changes gathering, 'turn' is used during the
   owner's turn, 'build' changes how a district is built, 'pass' always applies */
const UNIQUE = [
  { id: 'armory', name: 'Armory', cost: 3, when: 'turn', text: 'During your turn, destroy the Armory to destroy 1 district of your choice (not in a completed city).' },
  { id: 'basilica', name: 'Basilica', cost: 4, when: 'end', text: 'At the end of the game, score 1 extra point for each district in your city with an odd cost.' },
  { id: 'capitol', name: 'Capitol', cost: 5, when: 'end', text: 'At the end of the game, if you have at least 3 districts of the same type, score 3 extra points.' },
  { id: 'dragon-gate', name: 'Dragon Gate', cost: 6, when: 'end', text: 'At the end of the game, score 2 extra points.' },
  { id: 'factory', name: 'Factory', cost: 5, when: 'build', text: 'You pay 1 {gold} less to build any other {unique} district.' },
  { id: 'framework', name: 'Framework', cost: 3, when: 'build', text: 'You may build a district by destroying the Framework instead of paying its cost.' },
  { id: 'gold-mine', name: 'Gold Mine', cost: 6, when: 'gather', text: 'When you gather by taking {gold}, take 1 more {gold}.' },
  { id: 'great-wall', name: 'Great Wall', cost: 6, when: 'pass', text: 'The rank 8 character pays 1 more {gold} to use its ability on any other district in your city.' },
  { id: 'haunted-quarter', name: 'Haunted Quarter', cost: 2, when: 'end', text: 'At the end of the game, the Haunted Quarter counts as the district type of your choice.' },
  { id: 'imperial-treasury', name: 'Imperial Treasury', cost: 5, when: 'end', text: 'At the end of the game, score 1 extra point for each {gold} you have.' },
  { id: 'ivory-tower', name: 'Ivory Tower', cost: 5, when: 'end', text: 'At the end of the game, if the Ivory Tower is the only {unique} district in your city, score 5 extra points.' },
  { id: 'keep', name: 'Keep', cost: 3, when: 'pass', text: 'The rank 8 character cannot use its ability on the Keep.' },
  { id: 'laboratory', name: 'Laboratory', cost: 5, when: 'turn', text: 'Once per turn, discard 1 {card} from your hand to gain 2 {gold}.' },
  { id: 'library', name: 'Library', cost: 6, when: 'gather', text: 'When you gather by drawing {cards}, keep all of them.' },
  { id: 'map-room', name: 'Map Room', cost: 5, when: 'end', text: 'At the end of the game, score 1 extra point for each {card} in your hand.' },
  { id: 'monument', name: 'Monument', cost: 4, when: 'build', text: 'You cannot build the Monument if you have 5 or more districts. It counts as 2 districts toward a completed city.' },
  { id: 'museum', name: 'Museum', cost: 4, when: 'turn', text: 'Once per turn, put 1 {card} from your hand face down under the Museum. At the end of the game, score 1 extra point for each card under it.' },
  { id: 'necropolis', name: 'Necropolis', cost: 5, when: 'build', text: 'You may build the Necropolis by destroying 1 district in your city instead of paying its cost.' },
  { id: 'observatory', name: 'Observatory', cost: 4, when: 'gather', text: 'When you gather by drawing {cards}, draw 3 instead of 2.' },
  { id: 'park', name: 'Park', cost: 6, when: 'turn', text: 'If you have no {cards} in hand at the end of your turn, gain 2 {cards}.' },
  { id: 'poor-house', name: 'Poor House', cost: 4, when: 'turn', text: 'If you have no {gold} at the end of your turn, gain 1 {gold}.' },
  { id: 'quarry', name: 'Quarry', cost: 5, when: 'build', text: 'You may build districts identical to districts already in your city.' },
  { id: 'school-of-magic', name: 'School of Magic', cost: 6, when: 'pass', text: 'For abilities that gain resources for your districts, the School of Magic counts as the type of your choice.' },
  { id: 'secret-vault', name: 'Secret Vault', cost: null, when: 'end', text: 'The Secret Vault cannot be built. At the end of the game, reveal it from your hand to score 3 extra points.' },
  { id: 'smithy', name: 'Smithy', cost: 5, when: 'turn', text: 'Once per turn, pay 2 {gold} to gain 3 {cards}.' },
  { id: 'stables', name: 'Stables', cost: 2, when: 'build', text: 'Building the Stables does not count toward your building limit.' },
  { id: 'statue', name: 'Statue', cost: 3, when: 'end', text: 'If you have the {crown} at the end of the game, score 5 extra points.' },
  { id: 'theater', name: 'Theater', cost: 6, when: 'turn', text: 'At the end of each selection phase, you may swap your chosen character with an opponent\'s, without looking at it first.' },
  { id: 'thieves-den', name: 'Thieves\' Den', cost: 6, when: 'build', text: 'Pay some or all of the Thieves\' Den\'s cost with {cards} from your hand instead of {gold}: 1 card for 1 gold.' },
  { id: 'wishing-well', name: 'Wishing Well', cost: 5, when: 'end', text: 'At the end of the game, score 1 extra point for each {unique} district in your city, the Wishing Well too.' },
];
for (const d of UNIQUE) d.type = 'unique';
const DISTRICT = {};
for (const d of BASIC) DISTRICT[d.id] = d;
for (const d of UNIQUE) DISTRICT[d.id] = d;

/* the 27 characters, 3 per rank. gain: the district type the character collects for (res: gold, cards, or either) */
const CHARACTERS = [
  { id: 'assassin', rank: 1, name: 'Assassin', short: 'Name a character to kill. It skips its turn.',
    text: 'Name a character to kill. When it is called, its player stays silent and skips the whole turn. The killed character is turned up at the end of the round.' },
  { id: 'witch', rank: 1, name: 'Witch', short: 'Gather, then bewitch a character: you take its turn.',
    text: 'Gather resources, then name a character to bewitch; your turn pauses. When that character is called, its player only gathers resources. Then you finish your turn as that character: its ability, its building limit, with your own {gold}, hand and city. If nobody has it, your turn is over.' },
  { id: 'magistrate', rank: 1, name: 'Magistrate', short: 'Warrants on 3 characters; take the first district the signed one pays for.',
    text: 'Put 3 warrants face down on 3 characters; only one is signed. When the player of the signed character pays to build their first district this turn, you may reveal it and confiscate the district: it goes into your city for free and they get their {gold} back.' },
  { id: 'thief', rank: 2, name: 'Thief', short: 'Name a character to rob: take all its gold.',
    text: 'Name a character to rob (not rank 1, and not the killed or bewitched character). When it is called and turned up, you take all of its player\'s {gold}.' },
  { id: 'spy', rank: 2, name: 'Spy', short: 'Name a type and look at a hand: gold and a card per match.',
    text: 'Name a district type and choose a player, then look at their hand. For each card of that type, take 1 of their {gold} (while they have any) and draw 1 {card}.' },
  { id: 'blackmailer', rank: 2, name: 'Blackmailer', short: 'Threats on 2 characters: they pay half, or lose it all.',
    text: 'Put 2 threats face down on 2 characters (not rank 1, killed or bewitched); one is real. A threatened player, after gathering, may pay you half their {gold} (rounded down) to remove it. If they don\'t, you may turn it up: if it is the real one, take all their {gold}.' },
  { id: 'magician', rank: 3, name: 'Magician', short: 'Swap hands with a player, or redraw any cards.',
    text: 'Either swap your whole hand with another player\'s hand, or put any number of your {cards} at the bottom of the deck and draw as many.' },
  { id: 'wizard', rank: 3, name: 'Wizard', short: 'Take a card from a hand; build it at once or keep it.',
    text: 'Look at another player\'s hand and take 1 {card}. Either build it at once, paying its cost (it does not count toward your limit), or keep it. This turn you may build districts identical to ones in your city.' },
  { id: 'seer', rank: 3, name: 'Seer', short: 'Take a random card from each hand, give one back each. Build 2.',
    text: 'Take 1 random {card} from every other player\'s hand, then give each of them 1 card from your hand. You may build up to 2 districts.' },
  { id: 'king', rank: 4, name: 'King', gain: { type: 'noble', res: 'gold' }, short: 'Gold for noble districts. Take the crown.',
    text: 'Gain 1 {gold} for each {noble} district. Take the {crown}: you call the characters now and choose first next round. If you are killed, you still take the crown at the end of the round.' },
  { id: 'emperor', rank: 4, name: 'Emperor', gain: { type: 'noble', res: 'gold' }, short: 'Gold for noble districts. Give the crown away for a gold or card.',
    text: 'Gain 1 {gold} for each {noble} district. Give the {crown} to another player and take 1 {gold} or 1 random {card} from them. If you are killed, you still give the crown away at the end of the round, taking nothing.' },
  { id: 'patrician', rank: 4, name: 'Patrician', gain: { type: 'noble', res: 'cards' }, short: 'Cards for noble districts. Take the crown.',
    text: 'Gain 1 {card} for each {noble} district. Take the {crown}, like the King (also at the end of the round if you are killed).' },
  { id: 'bishop', rank: 5, name: 'Bishop', gain: { type: 'religious', res: 'gold' }, short: 'Gold for religious districts. Rank 8 can\'t touch your city.',
    text: 'Gain 1 {gold} for each {religious} district. This round the rank 8 character cannot use its ability on your districts, unless you are killed.' },
  { id: 'abbot', rank: 5, name: 'Abbot', gain: { type: 'religious', res: 'either' }, short: 'Gold or cards for religious districts. The richest pays you 1.',
    text: 'Gain 1 {gold} or 1 {card} (your mix) for each {religious} district. Once in your turn, if you are not the richest player, the richest gives you 1 {gold}.' },
  { id: 'cardinal', rank: 5, name: 'Cardinal', gain: { type: 'religious', res: 'cards' }, short: 'Cards for religious districts. Short of gold? Take it for cards.',
    text: 'Gain 1 {card} for each {religious} district. If you are short of {gold} to build a district, take the difference from one player and give them 1 {card} from your hand for each gold taken.' },
  { id: 'merchant', rank: 6, name: 'Merchant', gain: { type: 'trade', res: 'gold' }, short: 'Gold for trade districts, and 1 more.',
    text: 'Gain 1 {gold} for each {trade} district, and 1 extra {gold}.' },
  { id: 'alchemist', rank: 6, name: 'Alchemist', short: 'At the end of your turn, get back the gold you built with.',
    text: 'At the end of your turn, take back all the {gold} you paid to build districts this turn (not gold paid for anything else).' },
  { id: 'trader', rank: 6, name: 'Trader', gain: { type: 'trade', res: 'gold' }, short: 'Gold for trade districts. Build any number of trade districts.',
    text: 'Gain 1 {gold} for each {trade} district. The {trade} districts you build do not count toward your building limit.' },
  { id: 'architect', rank: 7, name: 'Architect', short: 'Gain 2 extra cards. Build up to 3.',
    text: 'Gain 2 extra {cards}. You may build up to 3 districts.' },
  { id: 'navigator', rank: 7, name: 'Navigator', short: 'Gain 4 gold or 4 cards. You cannot build.',
    text: 'Gain 4 extra {gold} or 4 extra {cards}. You cannot build any district this turn.' },
  { id: 'scholar', rank: 7, name: 'Scholar', short: 'Draw 7, keep 1. Build up to 2.',
    text: 'Draw 7 {cards}, keep 1 and shuffle the rest back into the deck. You may build up to 2 districts.' },
  { id: 'warlord', rank: 8, name: 'Warlord', gain: { type: 'military', res: 'gold' }, short: 'Gold for military districts. Destroy a district for its cost less 1.',
    text: 'Gain 1 {gold} for each {military} district. Destroy 1 district by paying 1 {gold} less than its cost. You cannot destroy one in a completed city (except your own).' },
  { id: 'diplomat', rank: 8, name: 'Diplomat', gain: { type: 'military', res: 'gold' }, short: 'Gold for military districts. Exchange a district with another city.',
    text: 'Gain 1 {gold} for each {military} district. Exchange 1 of your districts with 1 in another city (not a completed one), paying its owner the difference if theirs costs more.' },
  { id: 'marshal', rank: 8, name: 'Marshal', gain: { type: 'military', res: 'gold' }, short: 'Gold for military districts. Seize a district costing 3 or less.',
    text: 'Gain 1 {gold} for each {military} district. Seize 1 district costing 3 or less from another city (not a completed one) by paying its owner its cost.' },
  { id: 'queen', rank: 9, name: 'Queen', short: 'Gain 3 gold if you sit next to the rank 4 character.',
    text: 'If you sit next to the player who has the rank 4 character, gain 3 {gold}. If that character was killed, you gain it when it is turned up at the end of the round. Not with fewer than 5 players.' },
  { id: 'artist', rank: 9, name: 'Artist', short: 'Beautify up to 2 districts: 1 gold each, +1 point each.',
    text: 'Beautify up to 2 of your districts by putting 1 of your {gold} on each. A beautified district costs and scores 1 more for the rest of the game. Each district can be beautified once.' },
  { id: 'tax-collector', rank: 9, name: 'Tax Collector', short: 'Everyone who builds pays a tax. Take it all on your turn.',
    text: 'Whenever a player builds a district, they put 1 {gold} on your token (if they have any left), even in rounds when nobody has you. On your turn, take all the gold on the token. You pay no tax yourself.' },
];
const CHAR = {};
for (const c of CHARACTERS) CHAR[c.id] = c;
const RANK_NAMES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/* the suggested sets from the rulebook; ninth: the rank 9 character, used with 3 or 8 players (optional with 4 to 7) */
const PRESETS = [
  { id: 'first', name: 'First game', blurb: 'The eight classic characters and an easy set of unique districts.',
    chars: ['assassin', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'], ninth: null,
    uniques: ['dragon-gate', 'factory', 'haunted-quarter', 'imperial-treasury', 'keep', 'laboratory', 'library', 'map-room', 'quarry', 'school-of-magic', 'smithy', 'statue', 'thieves-den', 'wishing-well'] },
  { id: 'aristocrats', name: 'Ambitious Aristocrats', blurb: 'Warrants, a crown that pays in cards, and trade without limits.',
    chars: ['magistrate', 'thief', 'wizard', 'patrician', 'bishop', 'trader', 'architect', 'marshal'], ninth: 'queen',
    uniques: ['capitol', 'factory', 'framework', 'great-wall', 'haunted-quarter', 'keep', 'necropolis', 'park', 'poor-house', 'quarry', 'school-of-magic', 'stables', 'statue', 'thieves-den'] },
  { id: 'agents', name: 'Cunning Agents', blurb: 'A Witch, threats in the dark, and a tax on every building.',
    chars: ['witch', 'blackmailer', 'magician', 'emperor', 'abbot', 'alchemist', 'architect', 'warlord'], ninth: 'tax-collector',
    uniques: ['armory', 'basilica', 'dragon-gate', 'gold-mine', 'keep', 'monument', 'museum', 'necropolis', 'park', 'poor-house', 'quarry', 'secret-vault', 'smithy', 'theater'] },
  { id: 'emissaries', name: 'Illustrious Emissaries', blurb: 'Spies, seers and a Diplomat who trades whole districts.',
    chars: ['witch', 'spy', 'seer', 'emperor', 'bishop', 'merchant', 'scholar', 'diplomat'], ninth: 'artist',
    uniques: ['factory', 'framework', 'great-wall', 'haunted-quarter', 'ivory-tower', 'keep', 'library', 'museum', 'observatory', 'park', 'poor-house', 'quarry', 'school-of-magic', 'smithy'] },
  { id: 'dignitaries', name: 'Devious Dignitaries', blurb: 'Warrants and threats, a Navigator who never builds, an Alchemist who builds for free.',
    chars: ['magistrate', 'blackmailer', 'wizard', 'king', 'abbot', 'alchemist', 'navigator', 'marshal'], ninth: 'queen',
    uniques: ['dragon-gate', 'factory', 'framework', 'haunted-quarter', 'laboratory', 'necropolis', 'park', 'poor-house', 'secret-vault', 'smithy', 'stables', 'theater', 'thieves-den', 'wishing-well'] },
  { id: 'delegates', name: 'Tenacious Delegates', blurb: 'Card-hungry characters and districts that pay off at the end.',
    chars: ['assassin', 'spy', 'seer', 'king', 'cardinal', 'trader', 'scholar', 'diplomat'], ninth: 'artist',
    uniques: ['basilica', 'capitol', 'haunted-quarter', 'imperial-treasury', 'laboratory', 'library', 'map-room', 'observatory', 'school-of-magic', 'secret-vault', 'smithy', 'stables', 'statue', 'wishing-well'] },
  { id: 'nobles', name: 'Vicious Nobles', blurb: 'The classic killers with a Patrician, a Cardinal and the Tax Collector.',
    chars: ['assassin', 'thief', 'magician', 'patrician', 'cardinal', 'merchant', 'navigator', 'warlord'], ninth: 'tax-collector',
    uniques: ['armory', 'basilica', 'dragon-gate', 'gold-mine', 'imperial-treasury', 'ivory-tower', 'laboratory', 'map-room', 'monument', 'museum', 'school-of-magic', 'statue', 'thieves-den', 'wishing-well'] },
];

/* the characters for a table of n players from a set: Emperor never with 2, Queen never with fewer than 5, rank 9 always with 3 or 8,
   never with 2, and with 4 to 7 only when the set has one and it is wanted */
function charsFor(set, n, useNinth) {
  let cs = set.chars.slice();
  if (n === 2) cs = cs.map(c => (c === 'emperor' ? 'king' : c));
  let ninth = set.ninth;
  if (n === 3 || n === 8) ninth = ninth || (n >= 5 ? 'queen' : 'artist');
  else if (n === 2 || !useNinth) ninth = null;
  if (ninth === 'queen' && n < 5) ninth = 'artist';
  if (ninth) cs.push(ninth);
  return cs.sort((a, b) => CHAR[a].rank - CHAR[b].rank);
}
/* a random set: one character per rank and 14 unique districts */
function randomSet(S) {
  const chars = [];
  for (let r = 1; r <= 8; r++) chars.push(pick(S, CHARACTERS.filter(c => c.rank === r)).id);
  return { id: 'random', name: 'Random', chars, ninth: pick(S, ['queen', 'artist', 'tax-collector']), uniques: shuffled(S, UNIQUE.map(d => d.id)).slice(0, RULES.uniquesPerGame) };
}

const AI_NAMES = ['Aldric', 'Beatrix', 'Corvin', 'Isolde', 'Matthias', 'Rowena', 'Tobias', 'Elinor', 'Gareth', 'Ysolde', 'Benedict', 'Mathilde', 'Osric', 'Sybil'];
