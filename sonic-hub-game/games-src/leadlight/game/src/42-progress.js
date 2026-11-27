/* The campaign around the battles. What is the original's is ported as its code runs it: the cards and heroes a
   player owns, how a hero's rank follows her XP (XPManager), which tables are open (QuestManager), how a table's
   stars are won (CWBattleEndRewardWinner, QuestConditionManager), what a beaten creature leaves (CreatureBattleScript),
   the chests (GachaManager), the Kiln (FusionManager, CWFuseCraft) and selling (CWSellButton). The roads around
   the campaign (Mirrorside, the treasure thief, the masked brawler, the cellars, the ladder, the commissions) are
   in 44-modes.js.
   What Leadlight puts in place of the online parts: the cards turned over after a win (the original's daily gift,
   its odds and its paid retry), the milestones (content/campaign.json) and the heroes won over at the table.

   Every function here takes the save it works on, so that the rules can be tried without a page. */

const CAMPAIGN = CONTENT.campaign;
const PARAM = DATA.params;
const MIN_CREATURES = Number(PARAM.Min_Creatures_In_Inventory) || 10, MIN_INVENTORY = Number(PARAM.Min_Cards_In_Inventory) || 10;
const MAX_RANK = Number(PARAM.Max_Leader_Level) || 50;
const RECRUIT = new Set(CAMPAIGN.recruit), HIDDEN_HEROES = new Set(CAMPAIGN.hidden);
const RECRUIT_SURE = 5;   // the win over her that surely brings her

/* ---------------------------------------------------------------- chance, as Unity's Random gives it */

const Chance = {
  rand: Math.random,
  /** Random.Range(0f, 1f), to be compared with <= */
  float() { return this.rand(); },
  /** Random.Range(int a, int b): b is never given; a when b is not above a */
  int(a, b) { return b > a ? a + Math.floor(this.rand() * (b - a)) : a; },
};
/** WeightedList.RandomItem: pairs [item, weight]; a number below the whole weight picks the first whose running total is above it */
function weightedPick(pairs) {
  let total = 0; const acc = [];
  for (const [item, w] of pairs) { total += Math.max(0, w); acc.push([item, total]); }
  const n = Chance.int(0, total);
  for (const [item, upto] of acc) if (n < upto) return item;
  return null;
}
/** GachaWeightTable.Pick, DailyGiftWeightTable.Pick: a number from 1 to one below the whole weight picks the first
 *  whose running total reaches it (so the last piece of the weight is never drawn, as in the original) */
function gachaPick(pairs) {
  let total = 0; const acc = [];
  for (const [item, w] of pairs) { total += w; acc.push([item, total]); }
  if (!acc.length) return null;
  const n = Chance.int(1, total), hit = acc.find(([, upto]) => n <= upto);
  return hit ? hit[0] : null;
}

/* ---------------------------------------------------------------- heroes: XP and rank */

/** XPManager's table for a scheme: the XP that rank i + 1 needs, in the original's single-precision arithmetic */
const XP_TABLES = {};
function xpTable(scheme = 'A') {
  if (XP_TABLES[scheme]) return XP_TABLES[scheme];
  const f = Math.fround, coef = f(DATA.xp[scheme] || 100), t = [];
  for (let i = 0; i < 128; i++) t.push(Math.ceil(f(coef * f(Math.pow(f(f(i) * f(1.02)), 2.5)))));
  return (XP_TABLES[scheme] = t);
}
const schemeOf = id => (HERO[id] && HERO[id].lvScheme) || 'A';
/** the XP a hero needs to be of this rank */
function xpForRank(rank, scheme = 'A') { return xpTable(scheme)[Math.max(1, rank) - 1]; }
/** FindLevel: the rank a hero of this much XP is */
function rankForXp(xp, scheme = 'A') { const t = xpTable(scheme); let n = 0; while (n < t.length && t[n] <= xp) n++; return Math.max(1, n); }
const maxXp = id => xpForRank(MAX_RANK, schemeOf(id));
function heroRank(s, id) { return rankForXp(s.heroes[id] || 0, schemeOf(id)); }
/** a hero joins at her own starting rank (LeaderManager.AddNewLeader); false when she is already here */
function addHero(s, id) {
  if (!HERO[id] || s.heroes[id] !== undefined) return false;
  s.heroes[id] = xpForRank(HERO[id].startLevel || 1, schemeOf(id));
  return true;
}
function gainXp(s, id, xp) { s.heroes[id] = Math.min(maxXp(id), (s.heroes[id] || 0) + xp); }

/* ---------------------------------------------------------------- the cards a player owns */

const ownCount = (s, id) => s.cards[id] || 0;
const cardsHeld = s => Object.values(s.cards).reduce((a, b) => a + b, 0);
const creaturesHeld = s => Object.entries(s.cards).reduce((a, [id, n]) => a + (ROW[id] && ROW[id].type === 0 ? n : 0), 0);
function addCard(s, id, n = 1) { s.cards[id] = (s.cards[id] || 0) + n; if (!s.met[id]) s.met[id] = 1; }
/** PlayerDeckManager.RemoveCards: the cards go, and with them any copies a deck holds beyond those left */
function removeCards(s, id, n = 1) {
  const left = Math.max(0, ownCount(s, id) - n);
  if (left) s.cards[id] = left; else delete s.cards[id];
  for (const d of s.decks) {
    let extra = d.cards.filter(x => x === id).length - left;
    for (let k = d.cards.length - 1; k >= 0 && extra > 0; k--) if (d.cards[k] === id) { d.cards.splice(k, 1); extra--; }
  }
}
/** what selling one of these would break (CWSellButton), or '' */
function sellBlock(s, id) {
  if (!ownCount(s, id)) return 'You have none of these.';
  if (cardsHeld(s) - 1 < MIN_INVENTORY) return `You keep at least ${MIN_INVENTORY} cards.`;
  if (ROW[id].type === 0 && creaturesHeld(s) - 1 < MIN_CREATURES) return `You keep at least ${MIN_CREATURES} creatures.`;
  return '';
}
const salePrice = id => ROW[id].sale;   // CardItem.SalePrice: the card's level, always 1 here, times its base price
function sell(s, id) { if (sellBlock(s, id)) return false; removeCards(s, id, 1); s.coins += salePrice(id); return true; }

/* ---------------------------------------------------------------- the tables and the land */

const MAIN = DATA.quests.filter(q => q.type === 'main'), FC = DATA.quests.filter(q => q.type === 'fc');
const REGIONS = CAMPAIGN.regions.map((r, i) => Object.assign({}, r, { index: i, tables: r.tables.map(id => QUEST[id]), encore: r.encore.map(id => QUEST[id]) }));
const REGION_OF = {};
REGIONS.forEach(r => { r.tables.forEach((q, k) => (REGION_OF[q.id] = { region: r.index, at: k, encore: false })); r.encore.forEach((q, k) => (REGION_OF[q.id] = { region: r.index, at: k, encore: true })); });
/** what opens a table: [the table, the stars it needs] (QuestManager: the n-th list opens at n stars), on both roads */
const OPENED_BY = {};
for (const q of [...MAIN, ...FC]) q.unlocks.forEach((list, k) => list.split(/[ ,;]+/).filter(Boolean).forEach(id => (OPENED_BY[id] = OPENED_BY[id] || []).push([q.id, k + 1])));
(OPENED_BY[CAMPAIGN.encore.first] = OPENED_BY[CAMPAIGN.encore.first] || []).push([CAMPAIGN.encore.opensAfter, 1]);
const starsAt = (s, id) => s.stars[id] || 0;
function tableOpen(s, id) { return id === '1' || (id === CAMPAIGN.mirror.first && mirrorOpen(s)) || (OPENED_BY[id] || []).some(([from, k]) => starsAt(s, from) >= k); }
/** the tables of both roads open now */
const openTableIds = s => new Set([...MAIN, ...FC].filter(t => tableOpen(s, t.id)).map(t => t.id));
const starsTotal = s => MAIN.reduce((a, q) => a + starsAt(s, q.id), 0);
const regionOpen = (s, k) => tableOpen(s, REGIONS[k].tables[0].id);
const regionCleared = (s, k) => starsAt(s, REGIONS[k].tables[14].id) > 0;
const regionGlazed = (s, k) => REGIONS[k].tables.every(q => starsAt(s, q.id) >= 3);
/** the table to play next: the first open one not yet won, else the first open one short of three stars */
function nextTable(s) {
  const open = MAIN.filter(q => tableOpen(s, q.id)).filter(q => REGION_OF[q.id]);
  return open.find(q => !starsAt(s, q.id) && !REGION_OF[q.id].encore) || open.find(q => !starsAt(s, q.id)) || open.find(q => starsAt(s, q.id) < 3) || null;
}

/* ---------------------------------------------------------------- a table's stars */

/** StatsMeetCondition: does a battle with these statistics meet the condition? st: the engine's Stats, with
 *  landscapes (the different landscapes laid) and deckCost (the deck's levels summed: its number of cards) */
function meetsCondition(id, st) {
  const c = DATA.conditions[id];
  if (!c) return false;
  if (c.types) for (let t = 0; t < st.types.length; t++) if (!c.types.includes(t) && st.types[t] > 0) return false;
  if (c.factions) for (let f = 0; f < st.factions.length; f++) if (!c.factions.includes(f) && st.factions[f] > 0) return false;
  const over = (max, v) => max !== undefined && v > max, under = (min, v) => min !== undefined && v < min;
  return !(over(c.MaxTurns, st.turns) || under(c.MinCreaturesDefeated, st.defeated) || over(c.MaxActionPointsPerCard, st.apMaxCard)
    || over(c.MaxActionPointsTotal, st.apTotal) || over(c.MaxHPLost, st.hpLost) || over(c.MaxNumCreaturesLost, st.lost)
    || under(c.MinLandscapesUsed, st.landscapes) || over(c.MaxDeckCost, st.deckCost) || over(c.MaxFloopsUsed, st.floops));
}
/** a condition in the game's words */
function conditionText(id) {
  const c = DATA.conditions[id] || {}, realm = f => REALMS[f], n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  if (id === 'JustWin' || !Object.keys(c).length) return 'Win.';
  if (c.factions) return c.factions.length === 1 ? `Win playing only ${realm(c.factions[0])} cards.` : `Win without playing a single ${realm([0, 1, 2, 3, 4, 5].find(f => !c.factions.includes(f)))} card.`;
  if (c.types) return c.types.length === 1 ? `Win playing only ${KINDS[c.types[0]].toLowerCase()}s.` : `Win without playing a ${KINDS[[0, 1, 2].find(t => !c.types.includes(t))].toLowerCase()}.`;
  if (c.MaxTurns !== undefined) return `Win within ${n(c.MaxTurns, 'turn', 'turns')}.`;
  if (c.MinCreaturesDefeated !== undefined) return `Win, defeating at least ${n(c.MinCreaturesDefeated, 'creature', 'creatures')}.`;
  if (c.MaxActionPointsPerCard !== undefined) return c.MaxActionPointsPerCard === 0 ? 'Win playing only cards that cost no Light.' : `Win playing no card that costs more than ${c.MaxActionPointsPerCard} Light.`;
  if (c.MaxActionPointsTotal !== undefined) return `Win spending no more than ${c.MaxActionPointsTotal} Light on cards.`;
  if (c.MaxHPLost !== undefined) return `Win losing no more than ${c.MaxHPLost} health.`;
  if (c.MaxNumCreaturesLost !== undefined) return `Win losing no more than ${n(c.MaxNumCreaturesLost, 'creature', 'creatures')}.`;
  if (c.MinLandscapesUsed !== undefined) return `Win with ${['', 'one', 'two', 'three', 'four'][c.MinLandscapesUsed]} different landscapes laid.`;
  if (c.MaxDeckCost !== undefined) return `Win with a deck of no more than ${c.MaxDeckCost} cards.`;
  if (c.MaxFloopsUsed !== undefined) return c.MaxFloopsUsed === 0 ? 'Win without a single glint.' : `Win glinting no more than ${n(c.MaxFloopsUsed, 'time', 'times')}.`;
  return 'Win.';
}

/* ---------------------------------------------------------------- what a beaten creature leaves */

/** a card of a deck as the deck's rows weigh them (Deck.GetWeightedCard: each card's static weight) */
function deckDropCard(deckId) { const d = Catalog.decks[deckId]; return d ? weightedPick(d.cards.map(r => [Catalog.order[r[0]], r[4]])) : null; }
/** the roll when one of her creatures dies and nothing has dropped yet this turn (DeathActions). A card first:
 *  CanDropCard — the table's drop profile, or, where it has none (the cellars), the creature's own chance and a card
 *  of her whole deck by its weights; the first table of Mirrorside gives its own card the first time
 *  (the second map's special drop). Else a commission's piece (DetermineSideQuestToDropItem). Else coins
 *  (CanDropCoins: the profile's, or the creature's own). loot: what this battle has found so far, { cards, pieces };
 *  item: the creature that fell, as the engine holds it */
function lootRoll(s, q, loot, item) {
  const earned = loot.cards.length, prof = DATA.profiles[q.dropProfile];
  let drop = false, card = null;
  if (earned < q.maxLoot) {
    if (prof) drop = prof.chest.length > earned && prof.chest[earned] !== 0 && Chance.float() <= prof.chest[earned];
    else if (item) drop = Chance.float() <= item.DropRate;
  }
  if (q.id === CAMPAIGN.mirror.first && starsAt(s, q.id) <= 0 && earned <= 0) { drop = true; card = CAMPAIGN.mirror.firstCard; }
  if (drop && !card) card = prof ? weightedPick(q.drops.map((id, i) => [id, id && ROW[id] ? prof.weights[i] || 0 : 0]).filter(([id]) => id)) : deckDropCard(q.deck);
  if (card) return { card };
  const piece = pieceRoll(s, q, loot.pieces || {});
  if (piece) return { piece };
  if (earned >= q.maxLoot) return null;
  if (prof) {
    if (prof.coinChance.length <= earned || prof.coinChance[earned] === 0) return null;
    if (Chance.float() <= prof.coinChance[earned]) {
      const coins = weightedPick(prof.coins.map((v, i) => [v, prof.coinWeights[i] || 0]).slice(0, Math.min(prof.coins.length, prof.coinWeights.length)));
      if (coins > 0) return { coins };
    }
    return null;
  }
  if (item && item.CoinDropRate > 0 && Chance.float() <= item.CoinDropRate && item.CoinReward > 0) return { coins: item.CoinReward };
  return null;
}
/** the cards a table may drop, those that can: its profile's, or, at a cellar, her deck's */
function tableDrops(q) {
  const prof = DATA.profiles[q.dropProfile];
  if (prof) return q.drops.filter((id, i) => id && ROW[id] && (prof.weights[i] || 0) > 0);
  const d = Catalog.decks[q.deck];
  return d && q.maxLoot ? [...new Set(d.cards.filter(r => r[4] > 0 && r[2] > 0).map(r => Catalog.order[r[0]]))] : [];
}

/* ---------------------------------------------------------------- the Kiln */

/** the recipes the milestones open: the card each makes */
function milestoneRecipes(s) {
  const out = new Set(), M = CAMPAIGN.milestones;
  REGIONS.forEach((r, k) => {
    if (regionCleared(s, k)) for (const id of M.clear[k + 1].recipes) out.add(id);
    if (regionGlazed(s, k)) for (const id of M.glazed[k + 1].recipes) out.add(id);
  });
  return out;
}
/** CWFuseFuseCards: a recipe is shown when its table has been won (or it names none) — a table of either road, or
 *  one of the treasure thief's — or a milestone opened it */
function recipeOpen(s, r, opened = milestoneRecipes(s)) {
  if (r.unlock === '0') return true;
  if (QUEST[r.unlock]) return starsAt(s, r.unlock) > 0;
  return opened.has(r.card);
}
function openRecipes(s) { const opened = milestoneRecipes(s); return DATA.recipes.filter(r => recipeOpen(s, r, opened)); }
/** the ingredients a recipe takes, a card named twice counted twice */
function recipeNeeds(r) { const need = {}; for (const [id, n] of r.needs) need[id] = (need[id] || 0) + n; return need; }
/** what keeps a recipe from the kiln (CanFuse, CWFuseCraft), or '' */
function craftBlock(s, r) {
  if (!ROW[r.card].fuse) return 'This card cannot be fired.';
  if (s.coins < r.cost) return `It costs ${r.cost.toLocaleString('en')} coins.`;
  const need = recipeNeeds(r);
  const short = Object.keys(need).filter(id => ownCount(s, id) < need[id]);
  if (short.length) return 'Missing: ' + short.map(id => `${need[id] - ownCount(s, id)} × ${cardName(id)}`).join(', ') + '.';
  let left = creaturesHeld(s);
  for (const [id, n] of Object.entries(need)) if (ROW[id].type === 0) left -= n;
  if (ROW[r.card].type === 0) left++;
  if (left < MIN_CREATURES) return `You keep at least ${MIN_CREATURES} creatures.`;
  return '';
}
function craft(s, r) {
  if (craftBlock(s, r)) return false;
  s.coins -= r.cost;
  for (const [id, n] of Object.entries(recipeNeeds(r))) removeCards(s, id, n);
  addCard(s, r.card);
  return true;
}

/* ---------------------------------------------------------------- chests and the cards turned over */

const CHEST = DATA.chests;
/** what opening a chest costs this player now: { coins, jewels } (the first premium chest is free, as the
 *  original's opening lesson gave it) */
function chestPrice(s, kind) { return kind === 'premium' && s.freePremium ? { coins: 0, jewels: 0 } : { coins: CHEST[kind].coins, jewels: CHEST[kind].jewels }; }
function chestBlock(s, kind) { const p = chestPrice(s, kind); return s.coins < p.coins ? `It costs ${p.coins.toLocaleString('en')} coins.` : s.jewels < p.jewels ? `It costs ${p.jewels} Jewels.` : ''; }
function openChest(s, kind) {
  if (chestBlock(s, kind)) return null;
  const p = chestPrice(s, kind);
  s.coins -= p.coins; s.jewels -= p.jewels; if (kind === 'premium') s.freePremium = false;
  const id = gachaPick(CHEST[kind].pool);
  if (id) addCard(s, id);
  return id;
}
/** one card turned over: its edition drawn by the gift's odds, then the card within that edition's pool */
function flipDraw() {
  const tier = gachaPick(DATA.flips.tiers);
  return { tier, card: gachaPick(DATA.flips.pools[tier]) };
}

/* ---------------------------------------------------------------- a save */

function starterDeck() {
  const pre = Catalog.decks.starter;
  return { name: 'First deck', hero: 'maple', cards: pre.cards.map(row => Catalog.order[row[0]]), lands: null };
}
function newSave() {
  const s = { v: 2, coins: Number(PARAM.New_Player_Coins) || 0, jewels: Number(PARAM.New_Player_Gems) || 0, cards: {}, met: {}, heroes: {},
    decks: [starterDeck()], deck: 0, stars: {}, wins: {}, losses: {}, recruit: {}, given: {}, seen: {}, freePremium: true,
    options: { autoSpin: false, pace: 'calm' } };
  mendModes(s);
  addHero(s, 'maple');
  for (const id of s.decks[0].cards) addCard(s, id);
  return s;
}
/** what was saved, made whole: an older save (the first part of the game, when every card was open) starts over
 *  with its options kept; anything missing or no longer in the game is put right */
function mendSave(old) {
  const o = old && typeof old === 'object' ? old : {};
  if (o.v !== 2) { const s = newSave(); if (o.options) Object.assign(s.options, o.options); return s; }
  const s = o;
  const num = (v, d = 0) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  s.coins = num(s.coins); s.jewels = num(s.jewels);
  const clean = (m, ok) => { const r = {}; for (const [k, v] of Object.entries(m && typeof m === 'object' ? m : {})) if (ok(k) && num(v) > 0) r[k] = num(v); return r; };
  s.cards = clean(s.cards, id => ROW[id]); s.met = clean(s.met, id => ROW[id]);
  for (const id of Object.keys(s.cards)) s.met[id] = 1;
  const heroes = {}; for (const [id, xp] of Object.entries(s.heroes || {})) if (HERO[id]) heroes[id] = Math.min(maxXp(id), num(xp));
  s.heroes = heroes; if (!Object.keys(s.heroes).length) addHero(s, 'maple');
  s.stars = clean(s.stars, id => QUEST[id]); for (const k of Object.keys(s.stars)) s.stars[k] = Math.min(3, s.stars[k]);
  s.wins = clean(s.wins, id => QUEST[id]); s.losses = clean(s.losses, id => QUEST[id]); s.recruit = clean(s.recruit, id => HERO[id]);
  s.given = s.given && typeof s.given === 'object' ? s.given : {}; s.seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
  s.freePremium = s.freePremium !== false;
  mendModes(s);
  if (!Array.isArray(s.decks) || !s.decks.length) s.decks = [starterDeck()];
  s.decks = s.decks.slice(0, MAX_DECKS).map(d => ({ name: String(d.name || 'Deck').slice(0, 28), hero: s.heroes[d.hero] !== undefined ? d.hero : 'maple' in s.heroes ? 'maple' : Object.keys(s.heroes)[0],
    cards: (d.cards || []).filter(id => ROW[id]), lands: Array.isArray(d.lands) && d.lands.length === 4 ? d.lands : null }));
  for (const d of s.decks) {   // a deck holds no more of a card than the player owns
    const n = {}; d.cards = d.cards.filter(id => (n[id] = (n[id] || 0) + 1) <= ownCount(s, id));
  }
  if (!(s.deck >= 0 && s.deck < s.decks.length)) s.deck = 0;
  s.options = Object.assign({ autoSpin: false, pace: 'calm' }, s.options || {});
  return s;
}
const Me = {
  get data() { return Game.me; },
  write() { if (Game.save && Game.save.current()) Game.save.write(Game.me); },
  get deck() { return Game.me.decks[Game.me.deck]; },
};

/* ---------------------------------------------------------------- what a win pays */

/** the heroes milestones bring, the cards they give: the new ones, given now. Returns [{ kind, id, why }] */
function grantMilestones(s) {
  const out = [], M = CAMPAIGN.milestones, total = starsTotal(s);
  REGIONS.forEach((r, k) => {
    const key = 'glazed-' + (k + 1);
    if (!s.given[key] && regionGlazed(s, k)) { s.given[key] = 1; addCard(s, M.glazed[k + 1].card); out.push({ kind: 'card', id: M.glazed[k + 1].card, why: `Every table of ${r.name} at three stars` }); }
  });
  for (const m of M.stars) if (total >= m.at && addHero(s, m.hero)) out.push({ kind: 'hero', id: m.hero, why: `${m.at} stars across the land` });
  return out.concat(grantMirror(s));
}

/** CWBattleEndRewardWinner and Process1PWinCommon (DungeonBattleResolver at a cellar, the treasure loot at a
 *  treasure table), then what Leadlight adds. battle: { hero: the player's hero, stats, earned: the card ids dropped
 *  at the table, coins: the coins dropped, pieces: { commission: pieces found } }. Returns what happened, for the
 *  page to show; the save is changed. */
function settleWin(s, q, battle) {
  const res = { quest: q.id, kind: q.type, hero: battle.hero, starsBefore: starsAt(s, q.id), newlyCleared: false, condition: null, met: null, jewel: 0,
    rankBefore: heroRank(s, battle.hero), cards: battle.earned.slice(), hoard: null, prize: null, stage: null, joined: [], gifts: [], recipes: [],
    recruitChance: null, pieces: [], done: [], started: [] };
  const recipesBefore = new Set(openRecipes(s).map(r => r.card)), tablesBefore = openTableIds(s);
  const cellar = CELLAR_OF[q.id];
  if (q.type === 'tcat') {
    // her treasure table: one step further each win (to three), and a card of her hoard
    s.stars[q.id] = Math.min(3, res.starsBefore + 1);
    res.newlyCleared = res.starsBefore === 0;
    res.hoard = deckDropCard(CAMPAIGN.goldie.hoard);
    if (res.hoard) res.cards.push(res.hoard);
  } else if (cellar) {
    // a cellar keeps how deep the player has come, and has no stars
    res.stage = cellar;
    if ((s.cellars[cellar.cellar] || 0) < cellar.stage) { s.cellars[cellar.cellar] = cellar.stage; res.newlyCleared = true; }
  } else if (q.type === 'main' || q.type === 'fc') {
    let progress = res.starsBefore;
    if (progress < 3) {
      if (progress === 0) res.newlyCleared = true;
      res.condition = q.conditions[progress];
      res.met = meetsCondition(res.condition, battle.stats);
      if (res.met) { progress++; s.stars[q.id] = progress; if (progress === 3) { s.jewels++; res.jewel = 1; } }
    }
  }
  res.stars = starsAt(s, q.id);
  const loadInt = v => Math.floor(v + 0.5);   // TFUtils.LoadInt
  res.xp = Chance.int(loadInt(q.xp[0]), loadInt(q.xp[1]));
  res.xpBefore = s.heroes[battle.hero] || 0;
  gainXp(s, battle.hero, res.xp);
  res.xpAfter = s.heroes[battle.hero]; res.rankAfter = heroRank(s, battle.hero);
  for (const id of res.cards) addCard(s, id);
  res.reward = Chance.int(loadInt(q.coins[0]), loadInt(q.coins[1]));
  res.coins = res.reward + battle.coins;
  s.coins += res.coins;
  if (q.heroAwarded && res.newlyCleared && addHero(s, q.heroAwarded)) res.joined.push({ id: q.heroAwarded, why: 'She joins you for this first win.' });
  // a hero who sits at tables and was never given: each win over her may bring her, the fifth surely
  if (RECRUIT.has(q.hero) && s.heroes[q.hero] === undefined) {
    const tries = s.recruit[q.hero] = (s.recruit[q.hero] || 0) + 1;
    res.recruitChance = Math.min(1, tries / RECRUIT_SURE);
    if (Chance.float() < res.recruitChance && addHero(s, q.hero)) { delete s.recruit[q.hero]; res.joined.push({ id: q.hero, why: tries > 1 ? 'Beaten again, she comes over to your side.' : 'Beaten, she comes over to your side.' }); }
  }
  s.wins[q.id] = (s.wins[q.id] || 0) + 1;
  if (q.type === 'elfisto') {
    res.prize = velvetBeaten(s);
    if (res.prize && res.prize.hero) res.joined.push({ id: res.prize.hero, why: 'Her last round lost, she hands you the gold mask.' });
  }
  const work = settlePieces(s, q, battle.pieces || {});
  res.pieces = work.pieces; res.done = work.done;
  res.gifts = grantMilestones(s);
  for (const g of res.gifts) if (g.kind === 'hero') res.joined.push({ id: g.id, why: g.why });
  res.recipes = openRecipes(s).map(r => r.card).filter(id => !recipesBefore.has(id));
  res.opened = [...openTableIds(s)].filter(id => !tablesBefore.has(id));
  res.started = startCommissions(s);
  return res;
}
function settleLoss(s, q) { s.losses[q.id] = (s.losses[q.id] || 0) + 1; }
