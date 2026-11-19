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
const ART = { base: typeof ART_BASE === 'string' ? ART_BASE : '' };   // a folder beside the page with <id>.jpg in it: only on a page built to try pictures out (--art)
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

/* ── who is playing, and what is kept ──
   The game has a few players of its own, as on the machine an old game was installed on: whoever opens the game, on
   any device, sees the same names and picks theirs. Nobody signs in. They are kept by the Sonic Hub games' saves
   service through its own client (10-save.js, copied as it is; SAVES says where the service is): everything is
   written to this browser at once and sent a moment later, so the game never waits and plays on with no connection.

   A player's save is all that is theirs: points, best points, the record against each officer, who has been met,
   the colour they like to play, a game left on the table. SAVE is the save of whoever is being played, and a fresh
   one while nobody is. The sound is this device's own and is kept beside it. */
const RULES = 3;                                              // 2: the author's own rules. 3: the league's players at every table. A game begun before is not gone back to.
const LEGACY = 'commander-chess.v1', SOUND = 'commander-chess.sound';   // what the game kept before it had players; this device's sound
const freshSave = () => ({ rating: START_RATING, peak: START_RATING, record: {}, met: {}, side: 0, all: false, match: null, rules: RULES });
let SAVE = freshSave();
/** what the officers were given at the same service: their pictures (12-cast.js; 41-busts.js shows them) */
const CAST = SonicCast({ api: SAVES.api, game: SAVES.game, onChange: () => { if (typeof hangPictures === 'function') hangPictures(); } });
const ROLL = SonicSave({ api: SAVES.api, game: SAVES.game, onChange: what => { if (typeof savesChanged === 'function') savesChanged(what); } });
const count = n => Math.max(0, Math.floor(Number(n)) || 0);
/** A save as it was kept, made safe to play from: whatever is missing or cannot be right is left out, and a game
 *  begun under other rules is not gone back to. */
function readSave(d) {
  const s = freshSave();
  if (!d || typeof d !== 'object') return s;
  if (Number.isFinite(d.rating)) s.rating = Math.max(FLOOR, Math.round(d.rating));
  s.peak = Math.max(s.rating, Number.isFinite(d.peak) ? Math.round(d.peak) : 0);
  for (const id in d.record || {}) if (womanById(id)) { const r = d.record[id] || {}; s.record[id] = { w: count(r.w), l: count(r.l), d: count(r.d) }; }
  for (const id in d.met || {}) if (womanById(id) && d.met[id]) s.met[id] = true;
  s.side = d.side === 1 ? 1 : 0; s.all = d.all === true;
  const m = d.match;
  if (d.rules === RULES && m && womanById(m.w) && (m.side === 0 || m.side === 1) && Array.isArray(m.moves) && m.moves.every(Number.isInteger)) s.match = { w: m.w, side: m.side, rated: !!m.rated, seed: m.seed > 0 ? Math.floor(m.seed) : 1, moves: m.moves.slice() };
  return s;
}
/** Takes up the game of the player being played, as it was kept. False when nobody is being played. */
function takeUp() { const me = ROLL.current(); SAVE = readSave(me ? me.data : null); return !!me; }
/** what was just played, kept: in this browser at once, with the service a moment later */
function keep() { ROLL.write(SAVE); }
/** the game a new player starts with */
const newcomer = () => freshSave();
function keepSound() { try { localStorage.setItem(SOUND, SFX.on ? 'on' : 'off'); } catch (e) { /* a browser that keeps nothing */ } }
/** What this browser holds when the page opens: the sound, the one game the first versions kept (it goes on as a
 *  player of its own, whose name can be changed on the roll), and the game of whoever was playing last. */
function loadSave() {
  try {
    if (localStorage.getItem(SOUND) === 'off') SFX.on = false;
    const d = JSON.parse(localStorage.getItem(LEGACY) || 'null');
    if (d && typeof d === 'object') {
      if (d.sound === false) { SFX.on = false; keepSound(); }
      const old = readSave(d), played = old.rating !== START_RATING || old.peak !== START_RATING || old.match || Object.keys(old.record).length;
      // with no room on the roll it waits where it is
      if (!played || ROLL.add('Player 1', old)) localStorage.removeItem(LEGACY);
    }
  } catch (e) { /* what was kept cannot be read: start afresh */ }
  takeUp();
  return SAVE;
}
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
