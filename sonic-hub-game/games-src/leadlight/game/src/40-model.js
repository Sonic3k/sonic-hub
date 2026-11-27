/* The game's data as the screens use it, and the rules a deck is held to (the original's: at least
   Min_Cards_In_Deck cards, no more than Max_Duplicates_In_Deck of one card, no more than the hero's rank allows,
   no more of a card than the player owns, and landscapes laid as its CWDeckController.SetLandscapes lays them). */

const Game = { save: null, cast: null, me: null };
const DATA = CONTENT.data;
Catalog.load(DATA);
const ROW = Object.fromEntries(DATA.cards.map(c => [c.id, c]));
const HERO = Object.fromEntries(DATA.leaders.map(l => [l.id, l]));
const QUEST = Object.fromEntries(DATA.quests.map(q => [q.id, q]));
const RECIPE = Object.fromEntries(DATA.recipes.map(r => [r.card, r]));
const MIN_CARDS = Number(DATA.params.Min_Cards_In_Deck) || 10, MAX_COPIES = Number(DATA.params.Max_Duplicates_In_Deck) || 4, MAX_DECKS = 6;
/** how many cards a hero of this rank can take into battle */
function deckMax(rank) { const r = DATA.rankUp.find(x => x.rank === rank) || DATA.rankUp[DATA.rankUp.length - 1]; return r.deckMax; }
const cardName = id => ROW[id].name + (ROW[id].edition ? ' (' + ROW[id].edition + ')' : '');

/** the four landscapes a deck of these cards lays, as the original chooses them: its most common realms first */
function autoLands(ids) {
  const n = [0, 0, 0, 0, 0];
  for (const id of ids) { const f = ROW[id] && ROW[id].faction; if (f >= 0 && f < 5) n[f]++; }
  const list = n.map((v, t) => [t, v]).sort((a, b) => b[1] - a[1]);   // ties keep the realms' own order
  const k = list.filter(x => x[1] > 0).length, [a, b, c, d] = list.map(x => x[0]), [va, vb, vc] = list.map(x => x[1]);
  if (k >= 4) return [a, b, c, d];
  if (k === 3) { const t = va + vb + vc; return vb / t >= 0.5 ? [a, b, b, c] : vc / t >= 0.5 ? [a, b, c, c] : [a, a, b, c]; }
  if (k === 2) { const t = va + vb; return va / t >= 0.65 ? [a, a, a, b] : vb / t >= 0.65 ? [a, b, b, b] : [a, a, b, b]; }
  return [a, a, a, a];
}
function landsOf(deck) { return deck.lands && deck.lands.length === 4 ? deck.lands.slice() : autoLands(deck.cards); }
/** what keeps a deck from the table, in words: [] when nothing does. rank: the hero's, when it is known.
 *  owned: the player's cards ({ id: count }), when the deck is to be held to them */
function deckIssues(deck, rank, owned) {
  const out = [], n = deck.cards.length;
  if (n < MIN_CARDS) out.push(`A deck needs at least ${MIN_CARDS} cards (this one has ${n}).`);
  if (rank && n > deckMax(rank)) out.push(`A rank ${rank} hero takes no more than ${deckMax(rank)} cards (this deck has ${n}).`);
  const copies = {}; for (const id of deck.cards) copies[id] = (copies[id] || 0) + 1;
  const over = Object.keys(copies).filter(id => copies[id] > MAX_COPIES);
  if (over.length) out.push(`No more than ${MAX_COPIES} of one card: ${over.map(cardName).join(', ')}.`);
  if (owned) {
    const short = Object.keys(copies).filter(id => copies[id] > (owned[id] || 0));
    if (short.length) out.push(`More than you own: ${short.map(id => `${cardName(id)} (${owned[id] || 0})`).join(', ')}.`);
  }
  return out;
}
/** a deck of the save as the engine plays it */
function engineDeck(deck, name = 'you') {
  const d = new Deck(name);
  for (const l of landsOf(deck)) d.AddLandscape(l);
  for (const id of deck.cards) d.AddCard(new CardItem(Catalog.card(id), 1));
  return d;
}
