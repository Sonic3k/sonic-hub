// node kit/build.test.js — the kit as it is packed: what is in it, what is kept out of it, and that it stands on its own.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), out = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-kit-')), dir = path.join(out, 'wax-and-wane-kit');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const said = execFileSync('node', [path.join(__dirname, 'build.js'), '--out', out], { encoding: 'utf8' });
const all = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? all(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).split(path.sep).join('/')])).sort();
const kit = f => fs.readFileSync(path.join(dir, f), 'utf8'), repo = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the kit holds the rules, the brief, the host, the two sample bots, the arena and the board, and no other bot', () => {
  assert.deepStrictEqual(all(dir), ['START_HERE.md', 'arena/arena.js', 'arena/contract.test.js', 'arena/lib.js', 'board.html', 'bots/greedy.js', 'bots/random.js', 'docs/BOT_BRIEF.md', 'docs/RULES.md',
    'engine/host.js', 'engine/perft.txt', 'engine/rules.doc.test.js', 'engine/rules.js', 'engine/rules.test.js', 'package.json']);
  const house = repo('bots/house.js');
  for (const f of all(dir)) for (const at of [400, 3000, 9000]) assert.ok(!kit(f).includes(house.slice(at, at + 300)), f + ' carries the house bot');
});
test('every file it shares with this folder is the same file', () => {
  for (const f of all(dir).filter(f => /^(docs|engine|bots|arena)\//.test(f))) assert.strictEqual(kit(f), repo(f), f);
});
test('the board carries these rules and this host, and no computer player', () => {
  const page = kit('board.html'), between = (a, b) => page.slice(page.indexOf(a) + a.length, page.indexOf(b, page.indexOf(a)));
  assert.strictEqual(between('<script id="rules">', '</script>').trim(), repo('engine/rules.js').trim());
  assert.strictEqual(between('<script id="host" type="text/plain">', '</script>').trim(), repo('engine/host.js').trim());
  assert.ok(!/__[A-Z]+__/.test(page), 'a mark was left unfilled'); assert.ok(!/<script[^>]*data-bot=/.test(page), 'a bot is carried in the page');
  assert.ok(page.includes('const KIT = true;')); assert.ok(page.includes('Load a bot')); assert.ok(!page.includes('href="/"'), 'the kit\'s board is nobody\'s portal');
});
test('the kit says what the game is and how a bot plugs in, and leaves what to write to whoever asks for it', () => {
  for (const f of ['START_HERE.md', 'docs/BOT_BRIEF.md', 'docs/RULES.md']) {
    const text = kit(f);
    assert.ok(!/\b(five|5) levels\b/i.test(text), f + ' says how many levels to write');
    assert.ok(!/house bot|house\.js/i.test(text), f + ' speaks of the house bot');
  }
});
test('the zip has the same files under one folder, and reads back whole', () => {
  const z = fs.readFileSync(path.join(out, 'wax-and-wane-kit.zip')), zlib = require('zlib'), names = [];
  const end = z.length - 22; assert.strictEqual(z.readUInt32LE(end), 0x06054b50);
  let at = z.readUInt32LE(end + 16);
  for (let i = 0; i < z.readUInt16LE(end + 10); i++) {
    assert.strictEqual(z.readUInt32LE(at), 0x02014b50);
    const size = z.readUInt32LE(at + 20), n = z.readUInt16LE(at + 28), name = z.toString('utf8', at + 46, at + 46 + n), local = z.readUInt32LE(at + 42);
    const from = local + 30 + z.readUInt16LE(local + 26) + z.readUInt16LE(local + 28);
    assert.strictEqual(zlib.inflateRawSync(z.subarray(from, from + size)).toString('utf8'), kit(name.replace('wax-and-wane-kit/', '')), name);
    names.push(name); at += 46 + n;
  }
  assert.deepStrictEqual(names.sort(), all(dir).map(f => 'wax-and-wane-kit/' + f).sort());
  assert.match(said, /wax-and-wane-kit\.zip, \d+ KB, 15 files/);
});
test('unpacked somewhere else, with nothing installed, its own checks pass', () => {
  const run = f => execFileSync('node', [f], { cwd: dir, encoding: 'utf8' });
  assert.match(run('engine/rules.test.js'), /tests passed/); assert.match(run('engine/rules.doc.test.js'), /tests passed/); assert.match(run('arena/contract.test.js'), /tests passed/);
});
fs.rmSync(out, { recursive: true, force: true });
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
