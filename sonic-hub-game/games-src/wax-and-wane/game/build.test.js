// node game/build.test.js — the page as it is built: what it carries, and that the one the portal serves is this one.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = path.join(__dirname, '..'), repo = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = require('./build');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const { html, carried } = page(), between = (text, a, b) => text.slice(text.indexOf(a) + a.length, text.indexOf(b, text.indexOf(a) + a.length));

test('the page carries the rules, the host and the house bot as they are, and nothing is left unfilled', () => {
  assert.strictEqual(between(html, '<script id="rules">', '</script>').trim(), repo('engine/rules.js').trim());
  assert.strictEqual(between(html, '<script id="host" type="text/plain">', '</script>').trim(), repo('engine/host.js').trim());
  assert.strictEqual(between(html, '<script type="text/plain" data-bot="house">', '</script>').trim(), repo('bots/house.js').trim());
  assert.ok(!/__[A-Z]+__/.test(html), 'a mark was left unfilled');
  assert.ok(html.includes('const KIT = false;'));
});
test('its script is one that a browser will read', () => {
  const js = between(html, '<script>\n', '\n</script>\n</body>');
  assert.ok(js.length > 20000);
  assert.doesNotThrow(() => new vm.Script(repo('engine/rules.js') + '\n' + js, { filename: 'page.js' }));
  for (const bot of ['house', 'random', 'greedy']) assert.doesNotThrow(() => new vm.Script(repo('engine/rules.js') + "\n(function () { 'use strict';\n" + repo(`bots/${bot}.js`) + '\n})();', { filename: bot + '.js' }));
});
test('every level the house bot has is named on the page, with a line on how it plays', () => {
  const levels = /levels: \[([^\]]+)\]/.exec(repo('bots/house.js'))[1].split(',').map(s => s.trim().replace(/'/g, ''));
  const named = between(repo('game/src/60-game.js'), 'const LEVELS = {', '};');
  for (const level of levels) assert.match(named, new RegExp(`\\b${level}: \\['[^']+', '[^']{20,}'\\]`), level);
});
test('the kit\'s board is the same page with no bot in it', () => {
  const kit = page({ kit: true }).html;
  assert.ok(kit.includes('const KIT = true;')); assert.ok(!/<script[^>]*data-bot=/.test(kit));
  assert.strictEqual(between(kit, '<script id="rules">', '</script>'), between(html, '<script id="rules">', '</script>'));
});
test('the page the portal serves is the one these sources build', () => {
  if (!carried) return console.log('  (typefaces not installed: run npm install to compare with the page in public/games)');
  const served = path.join(ROOT, '..', '..', 'public', 'games', 'wax-and-wane.html');
  assert.ok(fs.existsSync(served), 'public/games/wax-and-wane.html is not there: npm run build');
  assert.ok(fs.readFileSync(served, 'utf8') === html, 'public/games/wax-and-wane.html is out of date: npm run build');
});
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
