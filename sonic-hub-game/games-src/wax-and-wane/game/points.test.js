// node game/points.test.js — points and what they open, and the campaign as it stands: who sits where, and what she says.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), repo = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { START, WIN, LOSS, SHARE, FLOOR, REACH, expected, stake, opensAt } = vm.runInNewContext(repo('game/src/15-points.js') + '\n;({ START, WIN, LOSS, SHARE, FLOOR, REACH, expected, stake, opensAt })');
const content = JSON.parse(repo('content/campaign.json')), league = JSON.parse(repo('arena/ratings.json')), writers = JSON.parse(repo('bots/written-by.json'));
const ratings = Object.fromEntries(league.players.map(p => [p.id, p.rating]));
for (const id in content.opponents) { const o = content.opponents[id]; o.rating = ratings[o.bot + ':' + o.level]; }
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }

test('the rule for points is the one Keep It Down plays by, to the letter', () => {
  // game/src/15-points.js of keepitdown-game, which this game's campaign is modelled on: the same file, not a copy that has drifted
  assert.strictEqual(crypto.createHash('sha256').update(repo('game/src/15-points.js')).digest('hex'), '05db8d7634e04eb3d88fecc187ed035d3772a305c14b1479c4804c45d47bd5a0');
});
test('between equals a win brings more than a loss costs, so playing on moves a player up', () => {
  assert.strictEqual(expected(900, 900), 0.5);
  assert.deepStrictEqual([stake(900, 900, 1), stake(900, 900, 0.5), stake(900, 900, 0)], [WIN / 2, (WIN - LOSS) / 4, -LOSS / 2]);
  assert.deepStrictEqual([stake(900, 900, 1), stake(900, 900, 0)], [24, -16]);
});
test('what one side expects, the other does not', () => {
  for (const [a, b] of [[600, 885], [1200, 1350], [700, 1636], [1500, 600]]) assert.ok(Math.abs(expected(a, b) + expected(b, a) - 1) < 1e-12);
});
test('beating someone who stands above also brings a share of the gap: at the edge of reach, three times a win between equals', () => {
  assert.deepStrictEqual([stake(1000, 1000, 1), stake(1000, 1100, 1), stake(1000, 1200, 1)], [24, 51, 76]);
  assert.ok(stake(1000, 1000 + REACH, 1) >= 3 * stake(1000, 1000, 1));
  assert.strictEqual(stake(1000, 1200, 1), Math.round(WIN * (1 - expected(1000, 1200)) + SHARE * 200));
  assert.deepStrictEqual([stake(1000, 900, 1), stake(1000, 800, 1), stake(1000, 600, 1)], [17, 12, 4]);
});
test('a loss costs little to someone above and the most to someone far below; a win is never worth nothing and a loss never free', () => {
  assert.deepStrictEqual([stake(1000, 1200, 0), stake(1000, 1100, 0), stake(1000, 1000, 0), stake(1000, 800, 0)], [-8, -12, -16, -24]);
  assert.deepStrictEqual([stake(2400, 600, 1), stake(600, 2400, 0), stake(2400, 600, 0)], [1, -1, -LOSS]);
});
test('the stronger she is, the more a win brings and the less a loss costs, and a draw lies between the two', () => {
  let win = 0, loss = -LOSS - 1;
  for (let hers = 300; hers <= 2500; hers += 50) {
    const w = stake(1000, hers, 1), l = stake(1000, hers, 0), d = stake(1000, hers, 0.5);
    assert.ok(w >= win && l >= loss, `at ${hers}: win ${w}, loss ${l}`);
    assert.ok(w > d && d > l && d === Math.round((w + l) / 2), `at ${hers}: win ${w}, draw ${d}, loss ${l}`);
    win = w; loss = l;
  }
});

const opens = opensAt(content.venues, content.opponents), seated = content.venues.flatMap(v => v.opponents);
test('the first place and its first opponent are open to a newcomer', () => {
  const v = content.venues[0];
  assert.deepStrictEqual([opens[v.id], opens[v.opponents[0]]], [START, START]);
  assert.ok(FLOOR < START);
});
test('an opponent opens to a player whose best points have come within reach of her rating, wherever she sits', () => {
  for (const id of seated) assert.strictEqual(opens[id], Math.max(START, Math.round((content.opponents[id].rating - REACH) / 5) * 5), id);
  const byRating = seated.slice().sort((x, y) => content.opponents[x].rating - content.opponents[y].rating);
  for (let i = 1; i < byRating.length; i++) assert.ok(opens[byRating[i]] >= opens[byRating[i - 1]], `${byRating[i]} opens before ${byRating[i - 1]}, who is weaker`);
  for (const id of seated) if (opens[id] > START) {
    const hers = content.opponents[id].rating, e = expected(opens[id], hers);
    assert.ok(opens[id] < hers && e > 0.22 && e < 0.26, `${id}: a player at ${opens[id]} expects ${e.toFixed(3)} of a game from her`);
  }
});
test('a place opens with the first of its people to open, and the places open in the order the light crosses the Moon', () => {
  for (const v of content.venues) assert.strictEqual(opens[v.id], Math.min(...v.opponents.map(id => opens[id])), v.id);
  for (let i = 1; i < content.venues.length; i++) assert.ok(opens[content.venues[i].id] > opens[content.venues[i - 1].id], `${content.venues[i].id} opens no later than ${content.venues[i - 1].id}`);
  for (const v of content.venues) {   // within a place, weakest first: the order they open in
    const sorted = v.opponents.slice().sort((a, b) => content.opponents[a].rating - content.opponents[b].rating);
    assert.deepStrictEqual(v.opponents, sorted, v.id);
  }
});
test('everyone the league has rated sits somewhere in the campaign, once, and nobody sits there unrated', () => {
  const played = seated.map(id => content.opponents[id].bot + ':' + content.opponents[id].level).sort();
  assert.deepStrictEqual(played, league.players.map(p => p.id).sort());
  assert.deepStrictEqual(seated.slice().sort(), Object.keys(content.opponents).sort(), 'everyone listed sits in exactly one place');
});
test('every opponent has a name of her own, an adult\'s age, a bot whose writer is on record, and lines for everything she may have to say', () => {
  const keys = ['hello', 'start', 'iCorner', 'youCorner', 'iBig', 'youBig', 'iPass', 'youPass', 'late', 'win', 'lose', 'draw'];
  const names = seated.map(id => content.opponents[id].name);
  assert.deepStrictEqual(names.filter((n, i) => names.indexOf(n) !== i), [], 'two opponents go by the same name');
  for (const id of seated) {
    const o = content.opponents[id];
    assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${id}: the key she is kept under at the service`);
    assert.ok(Number.isFinite(o.rating), `${id} (${o.bot}:${o.level}) has no rating in arena/ratings.json`);
    assert.ok(fs.existsSync(path.join(ROOT, 'bots', o.bot + '.js')), `${id}: bots/${o.bot}.js`);
    assert.ok(writers[o.bot] && typeof writers[o.bot].model === 'string' && writers[o.bot].model.trim(), `${id} plays as bots/${o.bot}.js, and bots/written-by.json does not say who wrote it`);
    assert.ok(o.name && Array.from(o.name).length <= 24 && o.role && o.about && o.plates >= 1 && o.plates <= 12, `${id}: name, role, about, plates`);
    assert.ok(Number.isInteger(o.age) && o.age >= 18 && o.age <= 99, `${id}: every opponent is a grown woman, and her age says so`);
    for (const k of keys) assert.ok(Array.isArray(o.lines[k]) && o.lines[k].length && o.lines[k].every(t => typeof t === 'string' && t.trim()), `${id} has nothing to say for "${k}"`);
    for (const k of Object.keys(o.lines)) assert.ok(keys.includes(k), `${id} has lines for "${k}", which nothing asks for`);
    assert.ok(o.lines.start.length >= 2 && o.lines.win.length >= 2 && o.lines.lose.length >= 2, `${id}: more than one way to begin and to end, so that two games running do not sound the same`);
  }
});
test('what is said in the campaign counts nothing and ranks nobody: how many there are and where she stands both change', () => {
  const texts = [...content.venues.map(v => [v.id, v.line]), ...seated.flatMap(id => [[id, content.opponents[id].about], [id, content.opponents[id].role], ...Object.values(content.opponents[id].lines).flat().map(t => [id, t])])];
  const many = /\b(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|forty-four)\s+(seas|places|opponents|women|pictures|albums)\b/i;
  for (const [who, text] of texts) assert.ok(!many.test(text), `${who} counts what the campaign holds: "${text}"`);
  assert.deepStrictEqual(require('./lasting')(content), []);
  const camp = (about, said = 'Hello.', line = 'A place.') => ({ venues: [{ id: 'cove', line }], opponents: { ann: { name: 'Ann', about, lines: { hello: [said] } } } });
  assert.match(require('./lasting')(camp('Second in the league, and it shows.'))[0], /^ann speaks of the league/);
  assert.deepStrictEqual(require('./lasting')(camp('Her colleagues say she is patient.')), []);
});
test('an opponent names another by her key, which has to be someone; a name written out is caught', () => {
  const namesAmiss = require('./names');
  assert.deepStrictEqual(namesAmiss(content.opponents), [], 'the campaign as it stands');
  const cast = (said, about = 'She plays.') => ({ ann: { name: 'Ann', about, lines: { hello: [said] } }, bea: { name: 'Bea', about: 'She plays too.', lines: { hello: ['Hello.'] } } });
  assert.deepStrictEqual(namesAmiss(cast('Ask {bea}. I am {ann}.')), []);
  assert.match(namesAmiss(cast('Ask {beatrice}.'))[0], /^ann names \{beatrice\}, who is not an opponent/);
  assert.match(namesAmiss(cast('Ask Bea about it.'))[0], /^ann names Bea outright: write \{bea\}/);
  assert.deepStrictEqual(namesAmiss(cast('Beatrice sends her annual greetings, Annabel.')), []);
});
test('the page has a picture, a colour, a sign and a spot on the map for every place, and can draw every likeness the campaign asks for', () => {
  const world = repo('game/src/25-world.js'), block = (from, to) => world.slice(world.indexOf(from), world.indexOf(to, world.indexOf(from)));
  const keysOf = text => [...text.matchAll(/^\s{4}([a-z]+)(?::|\()/gm)].map(m => m[1]);
  const look = keysOf(block('const LOOK = {', '\n  };')), scenes = keysOf(block('const SCENES = {', '\n  /** The picture of a place')), signs = keysOf(block('const SIGN = {', '\n  };')), motifs = keysOf(block('const MOTIF = {', '\n  const faces'));
  const hair = keysOf(block('const HAIR = {', '\n  };')), trim = keysOf(block('const TRIM = {', '\n  };'));
  for (const v of content.venues) for (const [what, has] of [['a colour and a spot', look], ['a picture', scenes], ['a sign', signs], ['something for behind its people', motifs]]) assert.ok(has.includes(v.scene), `${v.id}: game/src/25-world.js has ${what} for no "${v.scene}"`);
  assert.strictEqual(new Set(content.venues.map(v => v.scene)).size, content.venues.length, 'two places share a picture');
  for (const id of seated) {
    const [first, ...rest] = String(content.opponents[id].look || '').split(/\s+/);
    assert.ok(hair.includes(first), `${id}: no hair called "${first}"`);
    for (const t of rest) assert.ok(trim.includes(t), `${id}: nothing to wear called "${t}"`);
  }
  // the light crosses the Moon from east to west: each place lies further along than the one before it
  const at = Object.fromEntries([...block('const LOOK = {', '\n  };').matchAll(/^\s{4}([a-z]+):.*?at: \[(-?[\d.]+), (-?[\d.]+)\]/gm)].map(m => [m[1], +m[2] / Math.sqrt(1 - m[3] * m[3])]));
  for (let i = 1; i < content.venues.length; i++) assert.ok(at[content.venues[i].scene] <= at[content.venues[i - 1].scene] - 0.14, `${content.venues[i].id} does not lie far enough west of ${content.venues[i - 1].id} for the edge of the light to stand between them`);
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
