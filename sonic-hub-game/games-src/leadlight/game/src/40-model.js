/* The game's data as the screens use it, the player's own save, and the rules a deck is held to (the original's:
   at least Min_Cards_In_Deck cards, no more than Max_Duplicates_In_Deck of one card, no more than the hero's rank
   allows, and landscapes laid as its CWDeckController.SetLandscapes lays them). */

const Game = { save: null, cast: null, me: null };
const DATA = CONTENT.data;
Catalog.load(DATA);
const ROW = Object.fromEntries(DATA.cards.map(c => [c.id, c]));
const HERO = Object.fromEntries(DATA.leaders.map(l => [l.id, l]));
const QUEST = Object.fromEntries(DATA.quests.map(q => [q.id, q]));
const MIN_CARDS = Number(DATA.params.Min_Cards_In_Deck) || 10, MAX_COPIES = Number(DATA.params.Max_Duplicates_In_Deck) || 4, MAX_DECKS = 6;
/** how many cards a hero of this rank can take into battle */
function deckMax(rank) { const r = DATA.rankUp.find(x => x.rank === rank) || DATA.rankUp[DATA.rankUp.length - 1]; return r.deckMax; }

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
/** what keeps a deck from the table, in words: [] when nothing does. rank: the hero's, when it is known */
function deckIssues(deck, rank) {
  const out = [], n = deck.cards.length;
  if (n < MIN_CARDS) out.push(`A deck needs at least ${MIN_CARDS} cards (this one has ${n}).`);
  if (rank && n > deckMax(rank)) out.push(`A rank ${rank} hero takes no more than ${deckMax(rank)} cards (this deck has ${n}).`);
  const copies = {}; for (const id of deck.cards) copies[id] = (copies[id] || 0) + 1;
  const over = Object.keys(copies).filter(id => copies[id] > MAX_COPIES);
  if (over.length) out.push(`No more than ${MAX_COPIES} of one card: ${over.map(id => ROW[id].name + (ROW[id].edition ? ' (' + ROW[id].edition + ')' : '')).join(', ')}.`);
  return out;
}
/** a deck of the save as the engine plays it */
function engineDeck(deck, name = 'you') {
  const d = new Deck(name);
  for (const l of landsOf(deck)) d.AddLandscape(l);
  for (const id of deck.cards) d.AddCard(new CardItem(Catalog.card(id), 1));
  return d;
}

/* ---------------------------------------------------------------- the player's save */

/** the deck a new player is given, with the hero the original starts a player with */
function starterDeck() {
  const pre = Catalog.decks.starter;
  return { name: 'First deck', hero: 'maple', cards: pre.cards.map(row => Catalog.order[row[0]]), lands: null };
}
function newSave() { return { v: 1, decks: [starterDeck()], deck: 0, options: { autoSpin: false, pace: 'calm' }, record: {} }; }
/** what was saved, made whole: anything missing or no longer in the game is put right */
function mendSave(s) {
  s = s && typeof s === 'object' ? s : newSave();
  if (!Array.isArray(s.decks) || !s.decks.length) s.decks = [starterDeck()];
  s.decks = s.decks.slice(0, MAX_DECKS).map(d => ({ name: String(d.name || 'Deck').slice(0, 28), hero: HERO[d.hero] ? d.hero : 'maple', cards: (d.cards || []).filter(id => ROW[id]), lands: Array.isArray(d.lands) && d.lands.length === 4 ? d.lands : null }));
  if (!(s.deck >= 0 && s.deck < s.decks.length)) s.deck = 0;
  s.options = Object.assign({ autoSpin: false, pace: 'calm' }, s.options || {});
  s.record = s.record || {};
  s.v = 1;
  return s;
}
const Me = {
  get data() { return Game.me; },
  write() { if (Game.save && Game.save.current()) Game.save.write(Game.me); },
  get deck() { return Game.me.decks[Game.me.deck]; },
};

/* ---------------------------------------------------------------- the practice tables: the campaign's tables, played freely */

const TABLES = DATA.quests.filter(q => q.type === 'main' && HERO[q.hero] && (Catalog.decks[q.deck] || q.deck === 'player-clone'));
/** the women who sit at them, each with her tables from the gentlest up */
const SITTERS = (() => {
  const by = new Map();
  for (const q of TABLES) { const key = HERO[q.hero].cast; if (!by.has(key)) by.set(key, []); by.get(key).push(q); }
  for (const list of by.values()) list.sort((a, b) => a.rank - b.rank || Number(a.id) - Number(b.id));
  return [...by.entries()].sort((a, b) => a[1][0].rank - b[1][0].rank).map(([key, tables]) => ({ key, tables }));
})();
