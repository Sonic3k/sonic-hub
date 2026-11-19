/* ── The campaign: where the journey goes, who waits there, what they say, and what is kept ──
   The Meridian League keeps its officers sharp on the sand table: every spring the Grand Maneuvers go round the
   Lumen coast from station to station. The player is a new lieutenant working along it.

   Everyone on the coast is one of the players of the league (league/): last season every one of them played every
   other, and how they finished is the List. A rating here is the rating that league gave, a record is the record it
   left, and what is said of how someone plays is what was seen in those games. bot: which player she is ({ file of
   league/bots, the player's id in it, its level }); by: who wrote it. ROSTER.md has the same as a table.

   The stations are not steps of difficulty. A station has whoever is posted there: a recruit beside a general, a
   cadet beside the Commandant. On average the tables get stronger along the route, and the Admiralty's is the
   strongest. What paces the journey is the player's points: a promotion opens the next station, and an officer sits
   down once the player's best points come within reach of her rating (needs).

   Points are won and lost by rating, the way chess clubs count them, but not evenly: a win is worth up to WIN_K, a
   loss costs up to LOSS_K, and the first win against each officer pays FIRST more. So points climb, and the quick
   way up is to beat someone rated above you rather than the same people again.

   The rules are the same at every table: the standard line-up and a game of battles, which is what the league
   played and so what every rating was measured at.

   Each officer has a drawn stand-in until her own picture is there (ART.base), and three cards to win. In what she
   says, {you} stands for the player's rank at that moment. */
const ART = { base: '' };                                     // e.g. 'https://cdn.example/commander-chess/' → <base><id>/portrait.webp, card-1.webp …
const START_RATING = 600, WIN_K = 48, LOSS_K = 24, FIRST = 30, FLOOR = 100;   // FLOOR: points never fall below it
const CARD_WINS = [1, 3, 5];                                  // wins against her that earn her first, second and third card
const SETUP = { game: 'battles', lineup: 'standard' };        // every table's game: the league's

/* open: the points that open the station, which are the points of a promotion (RANKS). pin: which side of its flag
   the label stands on the wide chart. */
const PLACES = [
  { id: 'halcyon', name: 'Port Halcyon', room: 'The Harbour Mess', open: 0, pin: 'right',
    blurb: 'The fleet’s home port. After the evening gun the mess above the docks clears a table. Ensigns learn the game here, and the Commandant still plays.' },
  { id: 'kestrel', name: 'Kestrel Field', room: 'The Ready Room', open: 700, pin: 'right',
    blurb: 'The air station on the plain. Between sorties the wing plays in the ready room, and plays the way it flies: your planes first.' },
  { id: 'ironwood', name: 'Ironwood Depot', room: 'The Motor Pool', open: 800, pin: 'right',
    blurb: 'The army’s depot in the pine woods. A board on an oil drum, recruits who grab at everything, and an old general nobody here has beaten.' },
  { id: 'lantern', name: 'Cape Lantern', room: 'The Chart Room', open: 950, pin: 'right',
    blurb: 'The Staff College under the light. The Mensah sisters count before they move, and the Commandant will tell you afterwards where you lost.' },
  { id: 'meridian', name: 'Fort Meridian', room: 'The Gun Deck', open: 1200, pin: 'right',
    blurb: 'The star fort on the point, guarding the Gate. Gunners play a patient game: everything covered, everything in range. Nobody here is easy.' },
  { id: 'admiralty', name: 'The Admiralty', room: 'The Long Table', open: 1450, pin: 'left',
    blurb: 'The capital on the Sound. The Sea Lords keep one board at the end of the long table. The First Sea Lord lost one game last season.' },
];
const HOUSE_RULES = 'The standard line-up and a game of battles: it ends with a Commander, or with a side’s last ship, its last plane, or the last of its infantry, tanks and artillery.';

/* The officers, station by station (61-halcyon.js … 66-admiralty.js add theirs in the order of the route).
   rating, rec [won, drawn, lost], list (her place on it) and wins (of her wins, how many in a hundred were at sea, in
   the air, on land) are the league's (league/out/standings.json, results.jsonl). The one figure set by hand is Pia
   Lindqvist's rating: she lost every game, which no rating can be fitted to.
   look: skin, hair, its cut, cap, coat, for the stand-in (41-busts.js). tone: the colours behind her and of her shirt. */
const WOMEN = [];
const MODELS = { fable: 'Claude Fable 5.2', game: 'Claude Fable 5.2 (the game’s own player)', opus: 'Claude Opus 5.5', sonnet: 'Claude Sonnet 5.5', grok: 'Grok',
  luna: 'GPT-6 Luna Max', sol: 'GPT-6.1 Sol Max', astra: 'GPT-6 Astra Max', astra2: 'GPT-6.2 Astra Max', terra: 'GPT-6.1 Terra Max' };
/** a player of the league: bot('dai-bang', 2) is level 2 of the player dai-bang in dai-bang.js; a file with several players names its file */
const bot = (id, level = 1, file = id + '.js') => ({ file, id, level });

const womanById = id => WOMEN.find(w => w.id === id), placeById = id => PLACES.find(p => p.id === id);
/* the player's rank on the round, by points. The first five promotions open the five stations beyond the home port; at Vice
   Admiral the General and the Second Sea Lord sit down, at Admiral the First Sea Lord. */
const RANKS = [[0, 'Lieutenant'], [700, 'Lieutenant Commander'], [800, 'Commander'], [950, 'Captain'], [1200, 'Commodore'], [1450, 'Rear Admiral'], [1700, 'Vice Admiral'], [1900, 'Admiral']];
const rankFor = r => RANKS.filter(x => r >= x[0]).pop()[1];
const nextRank = r => RANKS.find(x => x[0] > r) || null;
/** what she says, with the player's rank where she uses it */
const myRank = () => rankFor(SAVE.peak);                       // a promotion is kept: the rank goes by the best points, as the stations do
const said = text => String(text).replace(/\{you\}/g, myRank());

/* ── points ── */
const expected = (mine, hers) => 1 / (1 + Math.pow(10, (hers - mine) / 400));
/** points for a result against her: result 1 win, 0.5 draw, 0 loss. What is gained counts in full (WIN_K), what is
 *  lost counts half (LOSS_K); a win is never worth nothing. The bonus for a first win is not in here: see winWorth. */
const pointsFor = (mine, hers, result) => { const d = result - expected(mine, hers), p = d >= 0 ? Math.round(WIN_K * d) : -Math.round(LOSS_K * -d); return result === 1 ? Math.max(1, p) : p; };
/** what a win against her is worth now, the first-win bonus included */
const winWorth = w => pointsFor(SAVE.rating, w.rating, 1) + (recordOf(w.id).w ? 0 : FIRST);

/* ── what is kept between visits ── */
const STORE = 'commander-chess.v1';
const RULES = 3;                                              // 2: the author's own rules. 3: the league's players at every table. A game begun before is not gone back to.
const freshSave = () => ({ rating: START_RATING, peak: START_RATING, record: {}, met: {}, seen: {}, sound: true, side: 0, all: false, match: null, rules: RULES });
let SAVE = freshSave();
function loadSave() {
  try { const d = JSON.parse(localStorage.getItem(STORE) || 'null'); if (d && typeof d.rating === 'number') { if (d.rules !== RULES) { d.match = null; d.rules = RULES; } SAVE = Object.assign(freshSave(), d); } } catch (e) { /* nothing kept: start fresh */ }
  return SAVE;
}
function keep() { try { localStorage.setItem(STORE, JSON.stringify(SAVE)); } catch (e) { /* a browser that keeps nothing: the game still plays */ } }
const recordOf = id => SAVE.record[id] || { w: 0, l: 0, d: 0 };
const placeOpen = p => SAVE.all || SAVE.peak >= p.open;
/** does she sit down with the player? Her station has to be open, and the player's best points within her reach */
const isOpen = w => SAVE.all || (SAVE.peak >= placeById(w.place).open && SAVE.peak >= w.needs);
/** she sits down and has not been played yet */
const isNew = w => isOpen(w) && !(recordOf(w.id).w + recordOf(w.id).l + recordOf(w.id).d);
/** where the player's points put them on the List: 1 is the top */
const listPlace = () => 1 + WOMEN.filter(w => w.rating > SAVE.rating).length;
const ordinal = n => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
/** the cards of hers that have been won: [true, false, false] */
const cardsWon = w => CARD_WINS.map(n => recordOf(w.id).w >= n);
const cardCount = () => WOMEN.reduce((n, w) => n + cardsWon(w).filter(Boolean).length, 0);

/** Writes a finished rated game into the save. Returns what changed, for the result screen. */
function scoreGame(w, result) {
  const before = SAVE.rating, first = result === 1 && !recordOf(w.id).w ? FIRST : 0, after = Math.max(FLOOR, before + pointsFor(before, w.rating, result) + first), had = cardsWon(w);
  const openBefore = WOMEN.filter(isOpen).map(x => x.id), placesBefore = PLACES.filter(placeOpen).map(p => p.id), rankBefore = rankFor(SAVE.peak);
  const r = SAVE.record[w.id] = recordOf(w.id);
  if (result === 1) r.w++; else if (result === 0) r.l++; else r.d++;
  SAVE.rating = after; SAVE.peak = Math.max(SAVE.peak, after); SAVE.match = null;
  keep();
  const now = cardsWon(w);
  return { before, after, delta: after - before, first, newCards: now.map((v, i) => (v && !had[i] ? i : -1)).filter(i => i >= 0), promoted: myRank() !== rankBefore ? myRank() : '',
    newWomen: WOMEN.filter(x => isOpen(x) && !openBefore.includes(x.id)), newPlaces: PLACES.filter(p => placeOpen(p) && !placesBefore.includes(p.id)) };
}
const pick = list => list[Math.floor(Math.random() * list.length)];
