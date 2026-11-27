#!/usr/bin/env node
/* The page's tests: it builds from what is in the folder, its scripts compile together as the browser runs them, and
   the rules a deck is held to are the original's.

     node game/build.test.js */
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path'), os = require('os');
const build = require('./build.js');
let failures = 0;
const test = (name, fn) => { try { fn(); console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } };
const ROOT = path.join(__dirname, '..');

let built;
test('the page builds, its content checked', () => {
  built = build.page({ saves: 'none' });
  assert.ok(built.html.length < 2.6e6, 'the page stays under 2.6 MB: ' + built.html.length);
  for (const mark of ['/*__TITLE__*/', '<!--__FONTS__-->', '/*__ENGINE__*/', '/*__JS__*/']) assert.ok(!built.html.includes(mark), mark + ' was filled');
  assert.strictEqual(built.content.saves, null);
  const served = build.page({});
  assert.deepStrictEqual(served.content.saves, JSON.parse(fs.readFileSync(path.join(ROOT, 'content/cast.json'))).saves);
});
test('its scripts compile together, with no name given twice', () => {
  const scripts = [...built.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.strictEqual(scripts.length, 2);
  new vm.Script(scripts.join('\n;\n'), { filename: 'leadlight.html' });
});
test('the cast page builds with every woman of the cast on it', () => {
  const c = build.content({ saves: 'none' }), admin = build.adminPage(build.content({}));
  const m = admin.match(/const CASTING = (.*?);\n/);
  const casting = JSON.parse(m ? m[1] : admin.slice(admin.indexOf('{"api"'), admin.indexOf('</script>')).split(';')[0]);
  const listed = casting.rooms.flatMap(r => r.members.map(x => x.id)).sort();
  assert.deepStrictEqual(listed, Object.keys(c.cast.people).sort());
});
test('a deck is held to the original\'s rules', () => {
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, Number, String, Set, Map, Error });
  const engine = ['core.js', 'scripts.js', 'match.js', 'catalog.js'].map(f => fs.readFileSync(path.join(ROOT, 'engine', f), 'utf8')).join('\n;\n');
  const model = fs.readFileSync(path.join(__dirname, 'src/40-model.js'), 'utf8');
  vm.runInContext(engine + `\n;const CONTENT = ${JSON.stringify(build.content({ saves: 'none' }))};\n` + model + '\n;this.T = { autoLands, deckIssues, deckMax, starterDeck, landsOf, mendSave, TABLES, SITTERS, ROW };', ctx);
  const T = ctx.T, starter = T.starterDeck();
  assert.strictEqual(starter.cards.length, 12); assert.strictEqual(starter.hero, 'maple');
  assert.deepStrictEqual(Array.from(T.landsOf(starter)), [0, 0, 0, 2], 'the starter deck lays the lands the original\'s data gives it');
  assert.strictEqual(T.deckMax(1), 15); assert.strictEqual(T.deckMax(30), 40);
  assert.strictEqual(T.deckIssues(starter).length, 0);
  assert.strictEqual(T.deckIssues({ cards: starter.cards.slice(0, 9) }).length, 1, 'fewer than ten cards');
  assert.strictEqual(T.deckIssues({ cards: Array(5).fill(starter.cards[0]).concat(starter.cards.slice(5)) }).length, 1, 'five of one card');
  assert.strictEqual(T.deckIssues(starter, 1).length, 0);
  const sixteen = Object.keys(T.ROW).slice(0, 16);
  assert.strictEqual(T.deckIssues({ cards: sixteen }, 1).length, 1, 'sixteen cards for a rank 1 hero'); assert.strictEqual(T.deckIssues({ cards: sixteen }, 2).length, 0, 'sixteen for rank 2');
  // the original's rule for three realms: when the second is half the deck or more it takes two lanes
  const ids = n => Object.keys(T.ROW).filter(id => T.ROW[id].faction === n && T.ROW[id].type === 0);
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(1).slice(0, 3), ...ids(3).slice(0, 7), ...ids(4).slice(0, 2)])), [3, 3, 1, 4], 'three realms: the first takes two lanes');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(3).slice(0, 2), ...ids(1).slice(0, 3), ...ids(4).slice(0, 5)])), [4, 4, 1, 3], 'three realms, most common first');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(0).slice(0, 2), ...ids(1).slice(0, 6), ...ids(2).slice(0, 2)])), [1, 1, 0, 2], 'a tie keeps the realms\' own order');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(0).slice(0, 7), ...ids(1).slice(0, 3)])), [0, 0, 0, 1], 'two realms, the first 65% or more: three lanes');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(0).slice(0, 5), ...ids(1).slice(0, 5)])), [0, 0, 1, 1], 'two realms evenly: two lanes each');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(5).slice(0, 10)])), [0, 0, 0, 0], 'only Prism cards: the first realm on every lane');
  const mended = T.mendSave({ decks: [{ name: 'x', hero: 'nobody', cards: ['no-such-card', starter.cards[0]] }], deck: 7 });
  assert.strictEqual(mended.decks[0].hero, 'maple'); assert.deepStrictEqual(Array.from(mended.decks[0].cards), [starter.cards[0]]); assert.strictEqual(mended.deck, 0);
  assert.ok(T.SITTERS.length >= 20 && T.TABLES.length === 180, 'every main table can be sat at');
});
test('the build writes both pages where it is told', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leadlight-'));
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--dir', dir, '--saves', 'none'], { stdio: 'pipe' });
  assert.ok(fs.statSync(path.join(dir, 'leadlight.html')).size > 100000);
  assert.ok(fs.readFileSync(path.join(dir, 'leadlight-admin.html'), 'utf8').includes('Leadlight: the cast'));
});
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
