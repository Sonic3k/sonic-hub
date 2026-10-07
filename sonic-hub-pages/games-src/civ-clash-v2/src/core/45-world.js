/* ── The world around the table: turn rules, round events, relics ── */
const START_HAND = 3;   /* every player after the first starts with 1 more */
const RULES = { ageTurn: 7, attritionRound: 16, maxRound: 40 };
/* events: one per round from round 2, the next one is always visible */
const EVENTS = [
  { id: 'plague', name: 'Plague', text: 'Everyone loses 1 HP.' },
  { id: 'harvest', name: 'Harvest', text: 'Everyone heals 1 HP.' },
  { id: 'silkroad', name: 'Silk Road Open', text: 'Everyone gains 1 gold.' },
  { id: 'winter', name: 'Harsh Winter', text: 'Every structure except a wonder loses 1 durability.' },
  { id: 'fair', name: 'Great Fair', text: 'The market restocks 3 new cards; hiring costs 1 less gold this round.' },
  { id: 'feast', name: 'Spring Festival', text: 'Everyone draws 1 card.' },
  { id: 'revolt', name: 'Peasant Revolt', text: 'Whoever has the most HP loses 1 HP.' },
  { id: 'crusade', name: 'Crusade', text: 'This round every Strike deals 1 extra damage.' },
  { id: 'monsoon', name: 'Monsoon', text: 'No one can build structures this round: a structure card still resolves its other symbols, then is washed away.' },
  { id: 'flood', name: 'Flood', text: 'Everyone discards 1 random card.' },
  { id: 'eclipse', name: 'Eclipse', text: 'Everyone passes 1 random card to the next player.' },
  { id: 'bells', name: 'Church Bells', text: 'Whoever has the least HP heals 2 HP.' },
];
const EVENT_BY = Object.fromEntries(EVENTS.map(e => [e.id, e]));
/* relics: pick 1 of 3 before the match */
const RELICS = {
  joyeuse: { name: 'Joyeuse', text: 'Your first hit each turn deals 1 extra damage.' },
  grail:   { name: 'Holy Grail', text: 'Your first Heal each turn heals 1 extra HP.' },
  scone:   { name: 'Stone of Scone', text: 'Your structures get 1 extra durability when built.' },
  compass: { name: 'Compass', text: 'At the start of your turn, if you hold 1 card or fewer, draw 1 extra card.' },
  seal:    { name: "Merchant's Seal", text: 'Hiring costs 1 less gold (minimum 1). Start with 1 gold.' },
  jade:    { name: 'Imperial Jade', text: 'Your max HP is 2 higher.' },
  horn:    { name: 'War Horn', text: 'While you have 4 HP or less, your hits deal 1 extra damage.' },
  banner:  { name: 'Holy Banner', text: 'The first time you drop to 0 HP, rise again with 3 HP.' },
  shroud:  { name: 'Holy Mantle', text: 'Each round, the first hit against you deals 1 less damage.' },
  mint:    { name: 'Royal Mint', text: 'Gain 1 gold at the start of each of your turns.' },
};
const RELIC_IDS = Object.keys(RELICS);
