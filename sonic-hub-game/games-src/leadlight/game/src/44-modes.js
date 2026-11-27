/* The roads around the campaign, as the original runs them, with what an offline game puts in place of its clock
   and its servers (content/campaign.json says which is which):
   - Mirrorside, the second road (the original's second map): opens when the land's second region is cleared; its own two
     heroes come through the glass, with a deck for them; its tables open as the land's do.
   - Who may sit where (CWQuestLoad.CanStartQuest): a hero of the mirror plays the mirror's tables and a hero of the
     land the land's; some tables take only the heroes they name; no one plays herself; two old friends never play
     each other; the cellars take a hero of the land of rank five or more (DungeonScreenController).
   - The treasure thief (the second map's bonus quest): she sits at a table of Mirrorside, moves on after five
     battles there, and once faced is gone for five more (the original's half a day).
   - The masked brawler (the original's round-by-round challenger): she may step in when a Mirrorside table is
     chosen, round by round.
   - The cellars (DungeonDataManager, DungeonBattleResolver): five stages each, one after another, every day open.
   - The ladder (the tournaments): a cup is climbed rung by rung against the land's own tables, its prizes on the way.
   - The commissions (SideQuestManager): pieces her creatures leave, kept only with a win.

   Every function here takes the save it works on, as in 42-progress.js. */

const MIRROR = CAMPAIGN.mirror, GOLDIE = CAMPAIGN.goldie, VELVET = CAMPAIGN.velvet, LADDER = CAMPAIGN.ladder;
const ROUNDS = DATA.rounds, COMMISSIONS = CAMPAIGN.commissions;
const MIRROR_REGIONS = MIRROR.regions.map((r, i) => Object.assign({}, r, { index: i, tables: r.tables.map(id => QUEST[id]), bonus: r.bonus.map(id => QUEST[id]) }));
const MIRROR_OF = {};
MIRROR_REGIONS.forEach(r => [...r.tables, ...r.bonus].forEach((q, k) => (MIRROR_OF[q.id] = { region: r.index, at: k, bonus: k >= r.tables.length })));
const CELLARS = CAMPAIGN.cellars.map((c, k) => Object.assign({}, c, { index: k, tables: c.quests.map(id => QUEST[id]) }));
const CELLAR_OF = {};
CELLARS.forEach(c => c.tables.forEach((q, i) => (CELLAR_OF[q.id] = { cellar: c.index, stage: i + 1 })));
const CELLAR_RANK = Number(PARAM.Dungeon_Min_Level) || 5;
const CELLARS_AFTER = String(PARAM.Calendar_Unlock_Tutorial || 'M5').replace(/\D/g, '') || '5';   // the land's table that shows the way down

/* ---------------------------------------------------------------- Mirrorside */

const mirrorOpen = s => starsAt(s, MIRROR.opensAfter) > 0;
const mirrorStars = s => FC.reduce((a, q) => a + starsAt(s, q.id), 0);
const mirrorRegionOpen = (s, k) => [...MIRROR_REGIONS[k].tables, ...MIRROR_REGIONS[k].bonus].some(q => tableOpen(s, q.id));
/** the battles finished at Mirrorside's tables (the original's Completed for its quest type) */
const mirrorDone = s => FC.reduce((a, q) => a + (s.wins[q.id] || 0) + (s.losses[q.id] || 0), 0);
/** the wins at one road's tables */
const roadWins = (s, road) => (road === 'fc' ? FC : MAIN).reduce((a, q) => a + (s.wins[q.id] || 0), 0);
/** the battles begun on both roads (the original's Attempts of its two quest types) */
const played = s => s.attempts.main + s.attempts.fc;
/** the Mirrorside table to play next */
function nextMirrorTable(s) {
  if (!mirrorOpen(s)) return null;
  const open = FC.filter(q => tableOpen(s, q.id));
  return open.find(q => !starsAt(s, q.id)) || open.find(q => starsAt(s, q.id) < 3) || null;
}
/** what entering Mirrorside gives, once (ValidateFCLeaders, SetupFCDeck): its two heroes, and a deck for the first of
 *  them, the player's current deck copied, where there is room and no deck is led by a hero of the mirror */
function grantMirror(s) {
  if (!mirrorOpen(s) || s.given.mirror) return [];
  s.given.mirror = 1;
  const out = [];
  for (const id of MIRROR.heroes) if (addHero(s, id)) out.push({ kind: 'hero', id, why: 'Mirrorside opens: she comes through the glass to meet you.' });
  if (!s.decks.some(d => HERO[d.hero] && HERO[d.hero].fcWorld) && s.decks.length < MAX_DECKS) {
    const from = s.decks[s.deck] || s.decks[0];
    s.decks.push({ name: 'Mirror deck', hero: MIRROR.heroes[0], cards: from.cards.slice(), lands: from.lands ? from.lands.slice() : null });
    out.push({ kind: 'deck', index: s.decks.length - 1, why: `Your deck, copied for ${heroTitle(HERO[MIRROR.heroes[0]])}` });
  }
  return out;
}

/* ---------------------------------------------------------------- who may sit where */

/** what keeps this deck's hero from this table, or '' */
function sitBlock(s, q, deck) {
  const mine = HERO[deck.hero], hers = HERO[q.hero];
  if (!mine || s.heroes[deck.hero] === undefined) return 'Choose one of your heroes to lead this deck.';
  const me = heroTitle(mine);
  if (mine.fcWorld !== hers.fcWorld) return mine.fcWorld ? `${me} belongs to Mirrorside: she plays only its tables.` : `Mirrorside's tables take a hero of the mirror, and ${me} is of the land.`;
  if (q.heroRules === 'allow' && !q.restricted.includes(deck.hero)) return `Only ${q.restricted.map(id => heroTitle(HERO[id])).join(' or ')} may sit at this table.`;
  if (q.heroRules === 'notallow' && q.restricted.includes(deck.hero)) return `${me} may not sit at this table.`;
  if (mine.cast === hers.cast) return `${nameOf(mine.cast)} cannot play against herself.`;
  for (const [a, b] of CAMPAIGN.rivals) if ((mine.cast === a && hers.cast === b) || (mine.cast === b && hers.cast === a)) return `${nameOf(a)} and ${nameOf(b)} are too fond of each other to play.`;
  if (CELLAR_OF[q.id] && heroRank(s, deck.hero) < CELLAR_RANK) return `The cellars take a hero of rank ${CELLAR_RANK} or more; ${me} is rank ${heroRank(s, deck.hero)}.`;
  return '';
}
/** everything that keeps a deck from a table: the deck's own rules, then who may sit there */
function tableIssues(s, q, deck) {
  const out = deckIssues(deck, heroRank(s, deck.hero), s.cards), why = sitBlock(s, q, deck);
  return why ? [why, ...out] : out;
}
/** the deck to offer at a table: the chosen one if it may sit, else the first that may, else the chosen one */
function deckFor(s, q) {
  if (!tableIssues(s, q, s.decks[s.deck]).length) return s.deck;
  const k = s.decks.findIndex(d => !tableIssues(s, q, d).length);
  if (k >= 0) return k;
  const world = s.decks.findIndex(d => !sitBlock(s, q, d));
  return world >= 0 ? world : s.deck;
}
/** a battle begins: what the original counts when a match starts (PlayerInfoScript.StartMatch) */
function beginTable(s, q) {
  if (q.type === 'main' || q.type === 'fc') s.attempts[q.type]++;
  if (q.type === 'tcat') s.goldie.back = mirrorDone(s);   // her LastPlayedTime
}

/* ---------------------------------------------------------------- the treasure thief */

const goldieOpen = s => GOLDIE.tables.some(id => tableOpen(s, id));
/** where she is now, put right after what has happened (the second map's UpdateBonusQuests): she comes the first time
 *  to the table the original names, later to any open table of Mirrorside, carrying one of the treasure tables; she
 *  moves on once more than five battles there have been finished since she came; once faced she is gone until more
 *  than five have been. Returns 'came', 'moved', 'left' or ''. */
function goldieUpdate(s) {
  const g = s.goldie;
  if (!goldieOpen(s)) return '';
  const done = mirrorDone(s), due = g.back < 0 || done - g.back > GOLDIE.every;
  if (!due) { if (g.at) { g.at = ''; return 'left'; } return ''; }
  const open = FC.filter(q => tableOpen(s, q.id)).map(q => q.id);
  const treasure = () => GOLDIE.tables[Chance.int(0, GOLDIE.tables.length)], spot = () => open[Chance.int(0, open.length)];
  if (g.at) {
    if (done - g.since <= GOLDIE.every) return '';
    g.at = spot(); g.table = treasure(); g.since = done;
    return 'moved';
  }
  g.table = treasure(); g.at = g.seen ? spot() : GOLDIE.first; g.seen = 1; g.since = done;
  return 'came';
}
/** the battles left before she moves on from where she sits */
const goldieStays = s => Math.max(1, GOLDIE.every + 1 - (mirrorDone(s) - s.goldie.since));

/* ---------------------------------------------------------------- the masked brawler */

const velvetRound = s => ROUNDS[s.velvet.round - 1] || null;
const velvetOpen = s => !!velvetRound(s) && ROUNDS.some(r => tableOpen(s, r.quest));
/** as the original decides: when a Mirrorside table is chosen, more battles than her round asks have been begun on both
 *  roads since she last came, and her chance comes up, she takes its place. Returns her table, or null. */
function velvetSteps(s, q) {
  if (q.type !== 'fc' || !velvetOpen(s)) return null;
  const r = velvetRound(s);
  if (played(s) - s.velvet.lapse > r.after && r.chance >= Chance.float()) { s.velvet.lapse = played(s); return QUEST[r.quest]; }
  return null;
}
/** her round lost by her: its prize, and the next round (the challenger's DisplayAward); her last brings her gold mask */
function velvetBeaten(s) {
  const r = velvetRound(s);
  if (!r) return null;
  const p = Object.assign({ round: r.round }, r.prize);
  if (p.card) addCard(s, p.card);
  if (p.jewels) s.jewels += p.jewels;
  if (p.coins) s.coins += p.coins;
  s.velvet.round++;
  if (!velvetRound(s) && addHero(s, VELVET.lastForm)) p.hero = VELVET.lastForm;
  return p;
}

/* ---------------------------------------------------------------- the cellars */

const cellarsOpen = s => starsAt(s, CELLARS_AFTER) > 0;
const cellarStageOpen = (s, k, stage) => cellarsOpen(s) && stage <= (s.cellars[k] || 0) + 1;

/* ---------------------------------------------------------------- the ladder */

const RUNGS = LADDER.rungs, CUP_NEXT = RUNGS.indexOf(10);   // a cup opens the next once its tenth place is reached
const ladderOpen = s => starsAt(s, LADDER.opensAfter) > 0;
const cupAt = (s, c) => s.ladder.cups[c] || { rung: 0, given: {}, foe: '' };
function cupOpen(s, c) { return c === 0 ? ladderOpen(s) : cupOpen(s, c - 1) && cupAt(s, c - 1).rung >= CUP_NEXT; }
const cupDone = (s, c) => cupAt(s, c).rung >= RUNGS.length - 1;
/** the rank the tables met on a rung are near */
const rungRank = (c, k) => clampN(Math.round(4 + c * 2.5 + k * (1 + c * 0.15)), 1, MAX_RANK);
/** the tables a cup's opponents come from: the land's and the cellars', each with a deck of its own */
const LADDER_TABLES = DATA.quests.filter(q => (q.type === 'main' || q.type === 'dungeon') && q.deck !== 'player-clone' && Catalog.decks[q.deck]);
/** her table for this rung: drawn among those nearest the rung's rank */
function drawFoe(s, c) {
  const want = rungRank(c, cupAt(s, c).rung), far = q => Math.abs(q.rank - want);
  const best = Math.min(...LADDER_TABLES.map(far)), near = LADDER_TABLES.filter(q => far(q) <= best + 1);
  const cup = s.ladder.cups[c] = cupAt(s, c);
  cup.foe = near[Chance.int(0, near.length)].id;
  return QUEST[cup.foe];
}
/** her table on the cup's current rung, drawn if none is */
const cupFoe = (s, c) => (cupAt(s, c).foe && QUEST[cupAt(s, c).foe]) || drawFoe(s, c);
/** a ladder battle over: a win climbs a rung and gives what the cup gives down to the new place, a loss draws another
 *  opponent; the first battle in a cup gives what its last place gives. No XP and no coins otherwise. */
function settleLadder(s, c, won) {
  const cup = s.ladder.cups[c] = cupAt(s, c), from = cup.rung, prizes = [];
  if (won && cup.rung < RUNGS.length - 1) cup.rung++;
  for (const p of LADDER.cups[c].prizes) {
    if (p.rank < RUNGS[cup.rung] || cup.given[p.rank]) continue;
    cup.given[p.rank] = 1;
    if (p.card) addCard(s, p.card);
    if (p.jewels) s.jewels += p.jewels;
    if (p.coins) s.coins += p.coins;
    prizes.push(p);
  }
  cup.foe = '';
  const opened = won && from < CUP_NEXT && cup.rung >= CUP_NEXT && c + 1 < LADDER.cups.length ? c + 1 : null;
  return { cup: c, won, from, rung: cup.rung, prizes, opened };
}
/** the next prize of a cup above where the player stands: { rank, prize } or null */
function nextPrize(s, c) {
  const at = RUNGS[cupAt(s, c).rung];
  const left = LADDER.cups[c].prizes.filter(p => p.rank < at && !cupAt(s, c).given[p.rank]).sort((a, b) => b.rank - a.rank);
  return left[0] || null;
}

/* ---------------------------------------------------------------- the commissions */

const COMMISSION = Object.fromEntries(COMMISSIONS.map(c => [c.id, c]));
/** n of a commission's pieces, in words */
const piecesOf = (c, n) => `${n} ${n === 1 ? c.piece : c.pieces}`;
const commissionBefore = c => COMMISSIONS.find(x => x.next.includes(c.id)) || null;
/** may this commission start now? (UpdatePlayableSideQuests, SideQuestController.UpdateActiveSideQuest): its table
 *  won, or the one before it done — and, after one is done, five more wins on its road */
function commissionReady(s, c) {
  if (s.commissions[c.id]) return false;
  const before = commissionBefore(c);
  if (c.after ? starsAt(s, c.after) <= 0 : !(before && s.commissions[before.id] && s.commissions[before.id].done)) return false;
  const wait = s.commissionWait[c.world];
  return !wait || roadWins(s, c.world) - wait.wins >= wait.need;
}
/** the commissions that start now; returns their ids */
function startCommissions(s) {
  const out = [];
  for (const c of COMMISSIONS) if (commissionReady(s, c)) { s.commissions[c.id] = { got: 0, at: {}, done: 0 }; out.push(c.id); }
  return out;
}
const activeCommissions = (s, road) => COMMISSIONS.filter(c => c.world === road && s.commissions[c.id] && !s.commissions[c.id].done);
/** CanSideQuestDropItem and DetermineSideQuestToDropItem: among the commissions of this road that still want pieces
 *  here, one chosen by chance; its piece drops by its profile's chance for the pieces found so far in this battle */
function pieceRoll(s, q, got) {
  const list = activeCommissions(s, q.type).filter(c => {
    const w = s.commissions[c.id], n = got[c.id] || 0;
    return w.got + n < c.need && n + (w.at[q.id] || 0) < c.perTable;
  });
  if (!list.length) return null;
  const c = list.length === 1 ? list[0] : list[Chance.int(0, list.length)], p = DATA.profiles[c.profile];
  if (!p || !p.items.length) return null;
  const k = Math.min(got[c.id] || 0, p.items.length - 1);
  return Chance.float() <= p.items[k] ? c.id : null;
}
/** a win keeps the pieces found (PostBattle_CountCollectibles); a commission with all its pieces is done, its card
 *  given, and the next of its road waits five wins. Returns { pieces: [[id, n]], done: [id] } */
function settlePieces(s, q, got) {
  const pieces = [], done = [];
  for (const [id, n] of Object.entries(got)) {
    const c = COMMISSION[id], w = s.commissions[id];
    if (!c || !w || w.done || !(n > 0)) continue;
    w.got = Math.min(c.need, w.got + n); w.at[q.id] = (w.at[q.id] || 0) + n;
    pieces.push([id, n]);
    if (w.got >= c.need) { w.done = 1; addCard(s, c.reward); s.commissionWait[c.world] = { wins: roadWins(s, c.world), need: c.lapse }; done.push(id); }
  }
  return { pieces, done };
}

/* ---------------------------------------------------------------- the save */

/** the roads' state in a save, made whole */
function mendModes(s) {
  const num = (v, d = 0) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const a = obj(s.attempts), counted = list => list.reduce((n, q) => n + (s.wins[q.id] || 0) + (s.losses[q.id] || 0), 0);
  s.attempts = { main: num(a.main, counted(MAIN)), fc: num(a.fc, counted(FC)) };
  const g = obj(s.goldie);
  s.goldie = { table: GOLDIE.tables.includes(g.table) ? g.table : '', at: QUEST[g.at] && QUEST[g.at].type === 'fc' ? g.at : '', since: num(g.since), back: Number.isFinite(g.back) && g.back >= 0 ? Math.floor(g.back) : -1, seen: g.seen ? 1 : 0 };
  if (!s.goldie.table) s.goldie.at = '';
  const v = obj(s.velvet);
  s.velvet = { round: clampN(num(v.round, 1) || 1, 1, ROUNDS.length + 1), lapse: num(v.lapse) };
  const cel = {}; for (const [k, n] of Object.entries(obj(s.cellars))) if (CELLARS[k] && num(n) > 0) cel[k] = Math.min(CELLARS[k].tables.length, num(n));
  s.cellars = cel;
  const cups = {};
  for (const [k, c] of Object.entries(obj(obj(s.ladder).cups))) if (LADDER.cups[k] && c && typeof c === 'object')
    cups[k] = { rung: clampN(num(c.rung), 0, RUNGS.length - 1), given: obj(c.given), foe: QUEST[c.foe] ? c.foe : '' };
  s.ladder = { cups };
  const work = {};
  for (const [id, w] of Object.entries(obj(s.commissions))) if (COMMISSION[id] && w && typeof w === 'object')
    work[id] = { got: Math.min(COMMISSION[id].need, num(w.got)), at: obj(w.at), done: w.done ? 1 : 0 };
  s.commissions = work;
  const wait = obj(s.commissionWait); s.commissionWait = {};
  for (const road of ['main', 'fc']) if (wait[road] && typeof wait[road] === 'object') s.commissionWait[road] = { wins: num(wait[road].wins), need: num(wait[road].need) };
  return s;
}
