// node game/build.test.js — the page as it is built: what it carries, that its parts agree, and that the one the portal serves is this one.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = path.join(__dirname, '..'), repo = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = require('./build');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const { html, carried } = page(), between = (text, a, b) => text.slice(text.indexOf(a) + a.length, text.indexOf(b, text.indexOf(a) + a.length));
const src = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.js')).sort();

test('the page carries the rules as they are, and nothing is left unfilled', () => {
  assert.strictEqual(between(html, '<script id="rules">', '</script>').trim(), repo('engine/rules.js').trim());
  assert.ok(!/__[A-Z]+__/.test(html), 'a mark was left unfilled');
});
test('its script is one that a browser will read', () => {
  const js = between(html, '<script>\n', '\n</script>\n</body>');
  assert.ok(js.length > 100000);
  assert.doesNotThrow(() => new vm.Script(repo('engine/rules.js') + '\n' + js, { filename: 'page.js' }));
});
test('the page needs nothing beside it but the portal\'s own mark', () => {
  const asked = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !u.startsWith('data:'));
  const allowed = carried ? ['/favicon.svg', '/'] : ['/favicon.svg', '/', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
  for (const u of asked) assert.ok(allowed.some(a => u === a || (a.startsWith('https') && u.startsWith(a))), 'the page asks for ' + u);
  assert.ok(!/\bfetch\(|XMLHttpRequest|new WebSocket/.test(html), 'the page talks to something');
});
test('there are eight places: the house, and a land for each of the seven colours, in the order of the rainbow', () => {
  const made = [];
  for (const f of src.filter(f => /^4[1-9]-/.test(f))) {
    const text = repo('game/src/' + f), id = /\bid: '([a-z]+)'/.exec(text), colour = /\bcolour: (null|\d)/.exec(text);
    assert.ok(id && colour, f + ' does not say which place it is');
    for (const part of ['name: {', 'tag: {', 'dress: {', 'voice: {', 'backdrop(', 'board(', 'ball']) assert.ok(text.includes(part), `${f} has no ${part}`);
    for (const pair of [/name: \{ vi: '[^']+', en: '[^']+' \}/, /tag: \{ vi: '[^']+', en: '[^']+' \}/]) assert.match(text, pair, f + ': a name or a line is missing in one language');
    made.push([id[1], colour[1]]);
  }
  assert.deepStrictEqual(made.map(m => m[1]), ['null', '0', '1', '2', '3', '4', '5', '6']);
  assert.strictEqual(new Set(made.map(m => m[0])).size, 8);
});
test('everything said is said in both languages', () => {
  const stub = new Proxy(function () {}, { get: (t, k) => (k === 'matches' ? false : k === 'language' ? 'vi' : k === Symbol.toPrimitive ? () => '' : stub), apply: () => stub });
  const box = { Lines: require('../engine/rules'), document: { getElementById: () => stub }, window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 }, navigator: { language: 'vi-VN' }, localStorage: { getItem: () => null, setItem() {} }, Math, JSON, Number, Array, Object, String, console, out: null };
  vm.runInNewContext(repo('game/src/00-core.js') + '\nout = WORDS;', box);
  const vi = box.out.vi, en = box.out.en;
  assert.deepStrictEqual(Object.keys(en).sort(), Object.keys(vi).sort());
  for (const k of Object.keys(vi)) { assert.strictEqual(typeof en[k], typeof vi[k], k); if (Array.isArray(vi[k])) assert.strictEqual(en[k].length, vi[k].length, k); }
  assert.strictEqual(vi.colours.length, 7);
  // every word the page's own text asks for is there
  for (const m of repo('game/shell.html').matchAll(/data-t="([a-zA-Z]+)"/g)) assert.ok(typeof vi[m[1]] === 'string', 'no word for ' + m[1]);
});
test('the three stars are what docs/RULES.md says they are', () => {
  const stars = /const STARS = \[(\d+), (\d+), (\d+)\]/.exec(repo('game/src/00-core.js')).slice(1).map(Number);
  assert.deepStrictEqual(stars, [100, 250, 500]);
  assert.ok(repo('docs/RULES.md').includes('three stars at 100, 250 and 500 points'));
});
test('the page the portal serves is the one these sources build', () => {
  if (!carried) return console.log('  (typefaces not installed: run npm install to compare with the page in public/games)');
  const served = path.join(ROOT, '..', '..', 'public', 'games', 'line-98-bay-sac.html');
  assert.ok(fs.existsSync(served), 'public/games/line-98-bay-sac.html is not there: npm run build');
  assert.ok(fs.readFileSync(served, 'utf8') === html, 'public/games/line-98-bay-sac.html is out of date: npm run build');
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
