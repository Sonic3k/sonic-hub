/* The cards, heroes and decks as the engine plays them, built from content/data.json (or what the page carries). */
const Catalog = {
  cards: {}, leaders: {}, decks: {}, order: [],
  load(data) {
    this.cards = {}; this.leaders = {}; this.decks = {}; this.order = data.cards.map(c => c.id);
    for (const c of data.cards) this.cards[c.id] = new CardForm(c);
    for (const l of data.leaders) this.leaders[l.id] = new LeaderForm(l);
    for (const d of data.decks) this.decks[d.id] = d;
    return this;
  },
  card(id) { const f = this.cards[id]; if (!f) throw new Error('no card ' + id); return f; },
  leader(id, rank) { const f = this.leaders[id]; if (!f) throw new Error('no hero ' + id); return new LeaderItem(f, rank); },
  /** a preset deck as a Deck, each card with its level and what it may drop */
  deck(id) {
    const d = this.decks[id]; if (!d) throw new Error('no deck ' + id);
    const deck = new Deck(id);
    for (const l of d.landscapes) deck.AddLandscape(l);
    for (const [card, level, drop, dropLevel, weight, coin, coins] of d.cards) {
      const item = new CardItem(this.card(this.order[card]), level);
      item.DropRate = drop; item.DropLevel = dropLevel; item.StaticDropWeight = weight; item.CoinDropRate = coin; item.CoinReward = coins;
      deck.AddCard(item);
    }
    return deck;
  },
};
