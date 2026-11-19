/* Checks the campaign against the league it is made of, and its points and promotions:
   node test/campaign.test.js
   Every officer has to be one player of the league, seated once, with the rating, the record and the place on the
   List that the league left; everything she can be asked to say has to be there. Then the rules of the journey: what
   a result is worth, what a promotion opens, and that nothing closes again. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
let failed = 0, passed = 0;
const ok = (cond, what) => { if (cond) passed++; else { failed++; console.log('FAIL  ' + what); } };

/** the campaign as the page loads it, with nothing kept */
function campaign(kept) {
  const store = {}; if (kept) store['commander-chess.v1'] = JSON.stringify(kept);
  const ctx = vm.createContext({ console, localStorage: { getItem: k => (k in store ? store[k] : null), setItem(k, v) { store[k] = String(v); } } });
  const files = fs.readdirSync(path.join(root, 'src/game')).filter(f => /^6\d-.*\.js$/.test(f)).sort();
  vm.runInContext(files.map(f => fs.readFileSync(path.join(root, 'src/game', f), 'utf8')).join('\n') +
    '\nthis.C = { PLACES, WOMEN, RANKS, MODELS, SETUP, START_RATING, WIN_K, LOSS_K, FIRST, FLOOR, CARD_WINS, STORE, pointsFor, winWorth, scoreGame, rankFor, nextRank, myRank, said, placeOpen, isOpen, isNew, listPlace, ordinal, cardsWon, cardCount, womanById, placeById, recordOf, loadSave, freshSave, save: () => SAVE, set: s => { SAVE = s; } };', ctx);
  ctx.C.store = store;
  return ctx.C;
}
const C = campaign(), { PLACES, WOMEN, RANKS } = C;
const standings = require(path.join(root, 'league/out/standings.json')).order, players = require(path.join(root, 'league/tools/players.js'));

/* ── the cast is the league ── */
const KEYS = ['intro', 'rematch', 'start', 'sheTakes', 'youTake', 'sheLosesPlane', 'youLosePlane', 'check', 'checked', 'hero', 'lastYours', 'lastHers', 'ahead', 'behind', 'idle', 'win', 'lose', 'draw'];
const seated = new Set(), ids = new Set();
for (const w of WOMEN) {
  ok(!ids.has(w.id) && /^[a-z]+$/.test(w.id), w.id + ': an id of her own'); ids.add(w.id);
  const p = players.find(x => path.basename(x.file) === w.bot.file && x.id === w.bot.id && x.level === w.bot.level);
  ok(p, w.id + ': a player of the league ' + JSON.stringify(w.bot)); if (!p) continue;
  ok(!seated.has(p.key), w.id + ': ' + p.key + ' is seated once'); seated.add(p.key);
  ok(fs.existsSync(path.join(root, 'league', p.file)), w.id + ': her file is there');
  const s = standings.find(x => x.key === p.key);
  if (w.id === 'pia') ok(s.w === 0 && w.rating === 300, 'pia: she won nothing, so her rating is the one set by hand');
  else ok(s.rating === w.rating, w.id + ': rating ' + w.rating + ', the league says ' + s.rating);
  ok(s.w === w.rec[0] && s.d === w.rec[1] && s.l === w.rec[2], w.id + ': record ' + w.rec + ', the league says ' + [s.w, s.d, s.l]);
  ok(standings.indexOf(s) + 1 === w.list, w.id + ': place ' + w.list + ' on the List, the league says ' + (standings.indexOf(s) + 1));
  ok(p.by.replace(' (the game)', '') === w.by.replace(/ \(the game’s own player\)/, ''), w.id + ': written by ' + w.by + ', the league says ' + p.by);
  ok(Object.values(C.MODELS).includes(w.by), w.id + ': a model that is named');
  ok(w.wins === null ? s.w === 0 : w.wins.length === 3 && w.wins.every(v => v >= 0) && w.wins[0] + w.wins[1] + w.wins[2] <= 100, w.id + ': how she won');
  for (const k of KEYS) ok(Array.isArray(w.say[k]) && w.say[k].length && w.say[k].every(t => typeof t === 'string' && t.trim()), w.id + ': something to say for ' + k);
  ok(Object.keys(w.say).every(k => KEYS.includes(k)), w.id + ': no line that nobody asks for');
  ok(w.cards.length === 3 && w.cards.every(c => c.length === 2 && c.every(t => typeof t === 'string' && t)), w.id + ': three cards');
  ok(C.placeById(w.place), w.id + ': a station');
  ok(w.age >= 18, w.id + ': a grown woman');
  ok(w.needs >= C.placeById(w.place).open || w.needs === 0, w.id + ': she cannot sit down before her station opens');
  const lines = Object.values(w.say).flat();
  ok(!lines.some(t => /\{(?!you\})/.test(t)), w.id + ': {you} is the only thing filled in');
  ok(!/[^\x00-\x7f’…é]/.test(JSON.stringify(w.say) + JSON.stringify(w.cards) + w.style + w.job + w.name), w.id + ': plain signs only');
}
ok(WOMEN.length === players.length && seated.size === players.length, 'every player of the league is someone: ' + WOMEN.length + ' officers, ' + players.length + ' players');
ok(JSON.stringify(WOMEN.map(w => w.place)) === JSON.stringify(WOMEN.map(w => w.place).sort((a, b) => PLACES.findIndex(p => p.id === a) - PLACES.findIndex(p => p.id === b))), 'the officers come in the order of the route');

/* ── the stations ── */
let last = 0;
PLACES.forEach((pl, i) => {
  const os = WOMEN.filter(w => w.place === pl.id), avg = os.reduce((n, w) => n + w.rating, 0) / os.length;
  ok(os.length >= 4, pl.name + ': a table of four at least');
  ok(avg > last, pl.name + ': stronger on average than the station before'); last = avg;
  ok(RANKS.some(r => r[0] === pl.open), pl.name + ' opens at a promotion');
  ok(os.some(w => w.needs <= pl.open), pl.name + ': someone sits down when it opens');
  ok(i === 0 || pl.open > PLACES[i - 1].open, pl.name + ' opens after the station before');
});
ok(PLACES[0].open === 0 && WOMEN.filter(w => w.place === 'halcyon' && w.needs === 0).length >= 2, 'the home port is open from the start, with two to play');
ok(RANKS[0][0] === 0 && RANKS.every((r, i) => !i || r[0] > RANKS[i - 1][0]), 'ranks rise');
ok(C.rankFor(0) === 'Lieutenant' && C.rankFor(699) === 'Lieutenant' && C.rankFor(700) === 'Lieutenant Commander' && C.rankFor(5000) === 'Admiral', 'a rank for any points');
ok(C.nextRank(600)[0] === 700 && C.nextRank(1900) === null, 'the next promotion');
ok(Math.max(...WOMEN.map(w => w.needs)) <= RANKS[RANKS.length - 1][0], 'everyone sits down by the last promotion');
ok(C.SETUP.game === 'battles' && C.SETUP.lineup === 'standard', 'the game the league played');

/* ── points ── */
const P = C.pointsFor;
ok(P(1000, 1000, 1) === C.WIN_K / 2 && P(1000, 1000, 0) === -C.LOSS_K / 2 && P(1000, 1000, 0.5) === 0, 'between equals: half of what a win and a loss can be worth');
let fine = true;
for (let mine = 100; mine <= 2800; mine += 150) for (let hers = 300; hers <= 2710; hers += 110) {
  const w = P(mine, hers, 1), l = P(mine, hers, 0), d = P(mine, hers, 0.5);
  if (!(w >= 1 && w <= C.WIN_K && l <= 0 && l >= -C.LOSS_K && d > l - 1 && d < w + 1 && Number.isInteger(w) && Number.isInteger(l) && Number.isInteger(d))) fine = false;
  if (P(mine, hers + 110, 1) < w || P(mine, hers + 110, 0) < l) fine = false;       // the stronger she is, the more a win pays and the less a loss costs
}
ok(fine, 'a win pays 1 to WIN_K, a loss costs 0 to LOSS_K, and both go by how strong she is');

/* ── a journey ── */
{
  const J = campaign(), S = () => J.save(), w = id => J.womanById(id);
  ok(S().rating === J.START_RATING && S().peak === J.START_RATING && J.myRank() === 'Lieutenant' && J.listPlace() === 25, 'a new lieutenant: ' + S().rating + ' points, second from the bottom of the List');
  ok(PLACES.filter(J.placeOpen).map(p => p.id).join() === 'halcyon' && WOMEN.filter(J.isOpen).map(x => x.id).join() === 'pia,sol', 'at first: the home port, the ensign and the chief');
  ok(J.isNew(w('pia')) && !J.isNew(w('hana')), 'who has sat down and not been played is new');
  const worth = J.winWorth(w('sol')), a = J.scoreGame(w('sol'), 1);
  ok(a.delta === worth && a.first === J.FIRST && a.after === 600 + worth && a.newCards.join() === '0', 'a first win pays the bonus and her first card: +' + a.delta);
  ok(JSON.parse(J.store[J.STORE]).rating === a.after, 'and it is kept');
  const b = J.scoreGame(w('sol'), 1);
  ok(b.first === 0 && b.delta === P(a.after, 814, 1) && !b.newCards.length, 'a second win pays no bonus: +' + b.delta);
  ok(a.promoted === 'Lieutenant Commander' || b.promoted === 'Lieutenant Commander', 'two wins over the chief make a Lieutenant Commander');
  ok((a.newPlaces.concat(b.newPlaces)).map(p => p.id).join() === 'kestrel' && a.newWomen.concat(b.newWomen).some(x => x.id === 'yuna'), 'which opens Kestrel Field, where the pilot officer sits down');
  const c = J.scoreGame(w('sol'), 1);
  ok(c.newCards.join() === '1' && J.cardCount() === 2 && J.cardsWon(w('sol')).join() === 'true,true,false', 'the third win is her second card');
  const peak = S().peak, lost = J.scoreGame(w('yuna'), 0);
  ok(lost.delta < 0 && lost.first === 0 && S().peak === peak && S().rating === peak + lost.delta, 'a loss costs points and leaves the best points alone');
  // down she goes, and nothing closes: rank and stations go by the best points
  for (let i = 0; i < 60; i++) J.scoreGame(w('pia'), 0);
  ok(S().rating === J.FLOOR, 'points stop at the floor: ' + S().rating);
  const atFloor = J.scoreGame(w('pia'), 0);
  ok(atFloor.delta === 0 && atFloor.before === J.FLOOR && atFloor.after === J.FLOOR, 'and what is shown there adds up');
  ok(J.myRank() === 'Lieutenant Commander' && J.placeOpen(J.placeById('kestrel')) && J.isOpen(w('yuna')), 'a promotion is kept, and so is what it opened');
  ok(J.said('Good evening, {you}. {you}?') === 'Good evening, Lieutenant Commander. Lieutenant Commander?', '{you} is the rank');
  const draw = J.scoreGame(w('isolde'), 0.5);
  ok(draw.delta > 0 && J.recordOf('isolde').d === 1 && draw.first === 0, 'a draw with someone far stronger gains points');
}
{ // up the whole route: everything opens, in order, and the top can be reached
  const J = campaign(), S = () => J.save(), opened = [], sat = [];
  let games = 0;
  for (; games < 4000 && !(WOMEN.every(J.isOpen) && J.recordOf('vasilisa').w); games++) {
    const open = WOMEN.filter(J.isOpen), next = open.reduce((b, x) => (J.winWorth(x) > J.winWorth(b) ? x : b));
    const r = J.scoreGame(next, 1);
    opened.push(...r.newPlaces.map(p => p.id)); sat.push(...r.newWomen.map(x => x.id));
  }
  ok(WOMEN.every(J.isOpen) && PLACES.every(J.placeOpen), 'winning opens every station and seats every officer (' + games + ' games of winning)');
  ok(opened.join() === PLACES.slice(1).map(p => p.id).join(), 'the stations open in the order of the route: ' + opened.join(', '));
  ok(new Set(sat).size === sat.length && sat.length === WOMEN.length - 2, 'everyone sits down once');
  ok(J.myRank() === 'Admiral' && J.recordOf('vasilisa').w === 1, 'and the lieutenant ends an Admiral who has beaten the First Sea Lord (' + S().rating + ' points)');
  ok(J.listPlace() === 1 + WOMEN.filter(x => x.rating > S().rating).length, 'placed on the List by points');
  for (const x of WOMEN) if (!J.recordOf(x.id).w) J.scoreGame(x, 1);
  ok(J.cardCount() >= WOMEN.length && !WOMEN.some(J.isNew), 'a card from everyone once everyone is beaten');
}
{ // what is kept comes back; a game kept under other rules does not
  const J = campaign({ rating: 1180, peak: 1210, record: { pia: { w: 2, l: 0, d: 0 } }, met: {}, seen: {}, sound: false, side: 1, all: false, rules: 2, match: { w: 'pia', side: 0, rated: true, moves: [1, 2] } });
  const s = J.loadSave();
  ok(s.rating === 1180 && s.peak === 1210 && s.sound === false && s.record.pia.w === 2, 'points, record and settings come back');
  ok(s.match === null && s.rules === 3, 'a game begun under the old rules is not gone back to');
  ok(J.myRank() === 'Commodore' && J.listPlace() === 22, 'rank by best points, place on the List by points now');
  const K = campaign({ rating: 900, peak: 900, record: {}, met: {}, seen: {}, sound: true, side: 0, all: false, rules: 3, match: { w: 'sol', side: 0, rated: true, seed: 5, moves: [] } });
  ok(K.loadSave().match && K.save().match.seed === 5, 'a game begun under these rules is');
  ok(campaign({ nonsense: true }).loadSave().rating === 600, 'something else under the same name is not taken for a save');
}
ok(fs.existsSync(path.join(root, 'ROSTER.md')) && fs.readFileSync(path.join(root, 'ROSTER.md'), 'utf8') === require('../tools/roster.js').rosterText(), 'ROSTER.md says what the campaign says (node tools/roster.js writes it)');
{ // a portrait prompt for everyone, and the file that holds them says what the campaign says
  let all = [], err = '';
  try { all = require('../tools/avatar-prompts.js').prompts().flatMap(p => p.officers); } catch (e) { err = e.message; }
  ok(!err && all.length === WOMEN.length, 'every officer has a portrait prompt: ' + err);
  ok(all.every(o => o.prompt.includes('an adult woman, age ' + o.w.age) && /^SHOT TYPE: .*\nFRAMING: /.test(o.prompt)), 'each says she is a grown woman of her age, and names the shot before the framing');
  ok(!err && fs.existsSync(path.join(root, 'art/avatar-prompts.md')) && fs.readFileSync(path.join(root, 'art/avatar-prompts.md'), 'utf8') === require('../tools/avatar-prompts.js').promptsText(), 'art/avatar-prompts.md is up to date (node tools/avatar-prompts.js writes it)');
}
ok(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '26th'].join() === [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 26].map(C.ordinal).join(), 'ordinals');

console.log(`${passed} passed, ${failed} failed; ${WOMEN.length} officers at ${PLACES.length} stations, ${WOMEN.reduce((n, w) => n + Object.values(w.say).flat().length, 0)} lines`);
process.exit(failed ? 1 : 0);
