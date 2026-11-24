// node game/build.test.js — the page as it is built: what it carries, what stands beside it, and that what the portal serves is this.
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), assert = require('assert'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), repo = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = require('./build'), { campaign, adminPage, beside, PORTAL, BOTS_DIR, CARRIED } = page;
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const { html, carried, camp } = page(), between = (text, a, b) => text.slice(text.indexOf(a) + a.length, text.indexOf(b, text.indexOf(a) + a.length));
/** the scripts a page runs (what it carries as text, the host and the bots, is not among them) */
const scripts = text => [...text.matchAll(/<script(?![^>]*type="text\/plain")[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
/** the campaign as a built page carries it */
const content = text => JSON.parse(/^const CONTENT = (.*);$/m.exec(text)[1]);
const said = JSON.parse(repo('content/campaign.json')), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-build-'));
const build = (...args) => spawnSync(process.execPath, [path.join(__dirname, 'build.js'), ...args], { cwd: ROOT, encoding: 'utf8' });

test('the page carries the rules, the host and the house bot as they are, and nothing is left unfilled', () => {
  assert.strictEqual(between(html, '<script id="rules">', '</script>').trim(), repo('engine/rules.js').trim());
  assert.strictEqual(between(html, '<script id="host" type="text/plain">', '</script>').trim(), repo('engine/host.js').trim());
  assert.strictEqual(between(html, '<script type="text/plain" data-bot="house">', '</script>').trim(), repo('bots/house.js').trim());
  assert.ok(!/__[A-Z]+__/.test(html), 'a mark was left unfilled');
  assert.ok(html.includes('const KIT = false;'));
});
test('its scripts are ones a browser will read, and no name is declared twice across them', () => {
  const all = scripts(html);
  assert.strictEqual(all.length, 2, 'the rules, and the game');
  assert.ok(all[1].length > 100000);
  for (const text of all) new vm.Script(text);
  new vm.Script(all.join('\n;\n'), { filename: 'page.js' });   // they share one scope in the page: a name declared in both stops the second from running at all
  for (const bot of camp.bots) assert.doesNotThrow(() => new vm.Script(repo('engine/rules.js') + "\n(function () { 'use strict';\n" + repo(`bots/${bot}.js`) + '\n})();', { filename: bot + '.js' }), bot);
});
test('every level the house bot has is named on the page, with a line on how it plays', () => {
  const levels = /levels: \[([^\]]+)\]/.exec(repo('bots/house.js'))[1].split(',').map(s => s.trim().replace(/'/g, ''));
  const named = between(repo('game/src/60-game.js'), 'const LEVELS = {', '};');
  for (const level of levels) assert.match(named, new RegExp(`\\b${level}: \\['[^']+', '[^']{20,}'\\]`), level);
});
test('the clients of the saves service are carried once each, as the service itself has them', () => {
  for (const [mine, theirs, opens] of [['12-save.js', 'sonic-save.js', 'function SonicSave(opt) {'], ['13-cast.js', 'sonic-cast.js', 'function SonicCast(opt) {']]) {
    const text = repo('game/src/' + mine), service = path.join(ROOT, '..', '..', '..', 'sonic-hub-game-api', 'client', theirs);
    assert.ok(fs.existsSync(service), 'sonic-hub-game-api/client/' + theirs + ' is not where it was');
    assert.ok(fs.readFileSync(service, 'utf8') === text, `game/src/${mine} is no longer sonic-hub-game-api/client/${theirs}: copy it again`);
    assert.strictEqual(html.split(opens).length - 1, 1, theirs);
    assert.strictEqual(html.split(text).length, 2, mine + ': once, as it is');
    assert.deepStrictEqual([...text.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]), [opens.slice(9, 18)], 'it adds one name to the page and no more');
  }
});
test('the campaign names the service its players are kept with, and the page says the same', () => {
  assert.match(said.saves.api, /^https:\/\/[a-z0-9.-]+$/);
  assert.strictEqual(said.saves.game, 'wax-and-wane');
  assert.deepStrictEqual(content(html).saves, said.saves);
});
test('the page carries, for every opponent, her rating as it was measured and the writer of her bot', () => {
  const ratings = Object.fromEntries(JSON.parse(repo('arena/ratings.json')).players.map(p => [p.id, p.rating])), writers = JSON.parse(repo('bots/written-by.json')), carriedIn = content(html);
  assert.deepStrictEqual(Object.keys(carriedIn.opponents).sort(), Object.keys(said.opponents).sort());
  for (const id in said.opponents) {
    const o = carriedIn.opponents[id], hers = said.opponents[id];
    assert.strictEqual(o.rating, ratings[hers.bot + ':' + hers.level], id);
    assert.strictEqual(o.by, writers[hers.bot].model, id);
    for (const k of ['name', 'age', 'role', 'about', 'bot', 'level', 'plates', 'look']) assert.deepStrictEqual(o[k], hers[k], `${id}.${k}`);
    assert.deepStrictEqual(o.lines, hers.lines, id);
  }
  assert.deepStrictEqual(carriedIn.venues, said.venues);
});
test('the page carries the house bot and fetches the others from beside it: every bot the campaign plays as is there, as it is in bots/', () => {
  assert.deepStrictEqual([...html.matchAll(/<script type="text\/plain" data-bot="([^"]+)">/g)].map(m => m[1]), CARRIED);
  assert.ok(html.includes(`const BOTS_AT = ${JSON.stringify(BOTS_DIR + '/')};`));
  const wanted = beside(camp).map(b => b + '.js').sort();
  assert.deepStrictEqual([...new Set(Object.values(said.opponents).map(o => o.bot))].filter(b => !CARRIED.includes(b)).map(b => b + '.js').sort(), wanted);
  const dir = path.join(PORTAL, BOTS_DIR);
  assert.ok(fs.existsSync(dir), 'public/games/' + BOTS_DIR + ' is not there: npm run build');
  assert.deepStrictEqual(fs.readdirSync(dir).sort(), wanted, 'public/games/' + BOTS_DIR + ' is out of date: npm run build');
  for (const f of wanted) assert.ok(fs.readFileSync(path.join(dir, f)).equals(fs.readFileSync(path.join(ROOT, 'bots', f))), `public/games/${BOTS_DIR}/${f} is not bots/${f}: npm run build`);
});
const admin = adminPage(camp), casting = text => JSON.parse(/^const CASTING = (.*);$/m.exec(text)[1]);
test('the page that keeps the cast is built beside the game: every opponent as the campaign has her, and the service what she is given is kept with', () => {
  const c = casting(admin), carriedIn = content(html);
  assert.deepStrictEqual([c.api, c.game], [said.saves.api, said.saves.game]);
  assert.deepStrictEqual(c.rooms.map(r => [r.name, r.members.map(m => m.id)]), said.venues.map(v => [v.name, v.opponents]));
  for (const m of c.rooms.flatMap(r => r.members)) { const o = carriedIn.opponents[m.id]; assert.deepStrictEqual(m, { id: m.id, name: o.name, age: o.age, plates: o.plates, role: o.role, rating: o.rating, bot: o.bot, level: o.level, by: o.by }); }
  assert.strictEqual(scripts(admin).length, 1); new vm.Script(scripts(admin)[0]);
  assert.ok(/<meta name="robots" content="noindex, nofollow">/.test(admin));
  assert.ok(!/__FONTS__|__CAST__/.test(admin), 'a mark was left unfilled');
  assert.ok(admin.includes('href="wax-and-wane"'), 'the way back to the game');
});
test('docs/ROSTER.md says who plays as which bot, as the campaign and the ratings have it now', () => {
  const want = require('./roster')(camp.content, camp.opens, camp.START), file = path.join(ROOT, 'docs', 'ROSTER.md');
  assert.ok(fs.existsSync(file) && fs.readFileSync(file, 'utf8') === want, 'docs/ROSTER.md is out of date: npm run build');
  for (const id in camp.content.opponents) { const o = camp.content.opponents[id]; assert.ok(want.includes(`| ${o.name}, `) && want.includes('`bots/' + o.bot + '.js` | ' + o.level + ' | ' + o.by + ' |'), id); }
});
test('the kit\'s board is the same page with no bot and no campaign in it', () => {
  const kit = page({ kit: true }).html;
  assert.ok(kit.includes('const KIT = true;')); assert.ok(!/<script[^>]*data-bot=/.test(kit));
  assert.strictEqual(between(kit, '<script id="rules">', '</script>'), between(html, '<script id="rules">', '</script>'));
  for (const gone of ['const CONTENT', 'function SonicSave', 'function SonicCast', 'const World', 'const Camp', 'id="world"', 'sonic-hub-game-api']) assert.ok(!kit.includes(gone), 'the kit\'s board carries ' + gone);
  assert.ok(!/__[A-Z]+__/.test(kit), 'a mark was left unfilled');
  for (const text of scripts(kit)) new vm.Script(text);
});
test('the pages the portal serves are the ones these sources build', () => {
  if (!carried) return console.log('  (typefaces not installed: run npm install to compare with the pages in public/games)');
  for (const [file, want] of [['wax-and-wane.html', html], ['wax-and-wane-admin.html', admin]]) {
    const served = path.join(PORTAL, file);
    assert.ok(fs.existsSync(served), `public/games/${file} is not there: npm run build`);
    assert.ok(fs.readFileSync(served, 'utf8') === want, `public/games/${file} is out of date: npm run build`);
  }
});
test('for trying things out, the page can be built somewhere else against a service on this machine, or with none', () => {
  const local = build('--saves', 'http://127.0.0.1:3200', '--dir', path.join(tmp, 'local'));
  assert.strictEqual(local.status, 0, local.stderr);
  assert.deepStrictEqual(content(fs.readFileSync(path.join(tmp, 'local', 'wax-and-wane.html'), 'utf8')).saves, { api: 'http://127.0.0.1:3200', game: 'wax-and-wane' });
  assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'local', BOTS_DIR)).sort(), beside(camp).map(b => b + '.js').sort());
  const none = build('--saves', 'none', '--dir', path.join(tmp, 'none'));
  assert.strictEqual(none.status, 0, none.stderr);
  assert.strictEqual(content(fs.readFileSync(path.join(tmp, 'none', 'wax-and-wane.html'), 'utf8')).saves, undefined);
  assert.ok(none.stdout.includes('players kept in the browser only'), none.stdout);
  // the cast is kept where the players are: the page that keeps it goes with the game it was built with
  assert.deepStrictEqual([casting(fs.readFileSync(path.join(tmp, 'local', 'wax-and-wane-admin.html'), 'utf8')).api, casting(fs.readFileSync(path.join(tmp, 'none', 'wax-and-wane-admin.html'), 'utf8')).api], ['http://127.0.0.1:3200', '']);
});
test('as one file it carries every bot, and asks for nothing beside it', () => {
  const one = build('--out', path.join(tmp, 'one', 'wax-and-wane.html'), '--saves', 'none');
  assert.strictEqual(one.status, 0, one.stderr);
  const text = fs.readFileSync(path.join(tmp, 'one', 'wax-and-wane.html'), 'utf8');
  assert.deepStrictEqual([...text.matchAll(/<script type="text\/plain" data-bot="([^"]+)">/g)].map(m => m[1]).sort(), camp.bots.slice().sort());
  assert.ok(text.includes('const BOTS_AT = "";') && !text.includes('href="/"'));
  assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'one')), ['wax-and-wane.html']);
});
test('a page for trying things out is never written over the ones the portal serves, and never talks to a plain http address elsewhere', () => {
  const before = fs.readFileSync(path.join(PORTAL, 'wax-and-wane.html'));
  for (const args of [['--saves', 'none'], ['--saves', 'http://127.0.0.1:3200'], ['--saves', 'none', '--dir', PORTAL], ['--saves', 'http://example.com', '--dir', path.join(tmp, 'x')], ['--saves', 'https://example.com/api', '--dir', path.join(tmp, 'x')], ['--saves'], ['--dir'], ['--out']]) {
    assert.notStrictEqual(build(...args).status, 0, args.join(' ') + ' was taken');
  }
  assert.ok(before.equals(fs.readFileSync(path.join(PORTAL, 'wax-and-wane.html'))));
  assert.ok(!fs.existsSync(path.join(tmp, 'x')));
});
test('a campaign that cannot be right is not built: someone unrated, someone seated twice, someone under age, a place out of order', () => {
  const amiss = change => { const c = JSON.parse(repo('content/campaign.json')); change(c); const f = path.join(tmp, 'amiss.json'); fs.writeFileSync(f, JSON.stringify(c)); return f; };
  const built = file => { try { campaign({ file }); return ''; } catch (e) { return e.message; } };
  assert.strictEqual(built(amiss(() => {})), '');
  assert.match(built(amiss(c => { c.opponents.posy.level = 'nonesuch'; })), /posy plays as house:nonesuch, which the league has not rated/);
  assert.match(built(amiss(c => { c.venues[1].opponents.unshift('posy'); })), /posy is in two places/);
  assert.match(built(amiss(c => { c.opponents.wren.age = 17; })), /wren: everyone in the cast is an adult/);
  assert.match(built(amiss(c => { c.venues[0].opponents.reverse(); })), /nectar: by rating the order should be/);
  assert.match(built(amiss(c => { c.venues.reverse(); })), /would open before/);
  assert.match(built(amiss(c => { c.opponents.dot.lines.hello = ['Ask Posy.']; })), /dot names Posy outright/);
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
