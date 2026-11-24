// node game/build.test.js — the page as it is built: what it carries, the kit's board beside it, and that what the portal serves is this.
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), zlib = require('zlib'), assert = require('assert'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), repo = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = require('./build'), { SERVED } = page;
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
const { html, carried } = page(), kit = page({ kit: true }).html;
const between = (text, a, b) => text.slice(text.indexOf(a) + a.length, text.indexOf(b, text.indexOf(a) + a.length));
/** the scripts a page runs (what it carries as text, the host and the bots, is not among them) */
const scripts = text => [...text.matchAll(/<script(?![^>]*type="text\/plain")[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'll-build-'));

/** The characters a woff2 file has shapes for, read from its cmap table. */
function charsOf(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('latin1', 0, 4), 'wOF2', file);
  const KNOWN = 'cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill'.match(/.{4}\s?/g).map(t => t.slice(0, 4));
  const count = b.readUInt16BE(12), compressed = b.readUInt32BE(20);
  let p = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const x = b[p++]; v = v * 128 + (x & 127); if (!(x & 128)) return v; } throw new Error('bad UIntBase128'); };
  const tables = [];
  for (let i = 0; i < count; i++) {
    const flags = b[p++], tag = (flags & 63) === 63 ? b.toString('latin1', p, (p += 4)) : KNOWN[flags & 63], version = flags >> 6;
    const orig = base128(), transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    tables.push({ tag, length: transformed ? base128() : orig });
  }
  const data = zlib.brotliDecompressSync(b.subarray(p, p + compressed));
  let at = 0; const where = {};
  for (const t of tables) { where[t.tag] = at; at += t.length; }
  const c = where.cmap, have = new Set();
  for (let i = 0, n = data.readUInt16BE(c + 2); i < n; i++) {
    const sub = c + data.readUInt32BE(c + 4 + i * 8 + 4), format = data.readUInt16BE(sub);
    if (format === 4) {
      const seg = data.readUInt16BE(sub + 6) / 2, ends = sub + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
      for (let s = 0; s < seg; s++) {
        const end = data.readUInt16BE(ends + s * 2), start = data.readUInt16BE(starts + s * 2), delta = data.readInt16BE(deltas + s * 2), range = data.readUInt16BE(ranges + s * 2);
        for (let ch = start; ch <= end && ch !== 0xffff; ch++) {
          const glyph = range ? data.readUInt16BE(ranges + s * 2 + range + (ch - start) * 2) : (ch + delta) & 0xffff;
          if (glyph) have.add(String.fromCodePoint(ch));
        }
      }
    } else if (format === 12) {
      for (let g = 0, groups = data.readUInt32BE(sub + 12); g < groups; g++) {
        const from = data.readUInt32BE(sub + 16 + g * 12), to = data.readUInt32BE(sub + 20 + g * 12);
        for (let ch = from; ch <= to; ch++) have.add(String.fromCodePoint(ch));
      }
    }
  }
  return have;
}

test('the page carries the rules, the host and the house bot as they are, and nothing is left unfilled', () => {
  assert.strictEqual(between(html, '<script id="rules">', '</script>').trim(), repo('engine/rules.js').trim());
  assert.strictEqual(between(html, '<script id="host" type="text/plain">', '</script>').trim(), repo('engine/host.js').trim());
  assert.strictEqual(between(html, '<script type="text/plain" data-bot="house">', '</script>').trim(), repo('bots/house.js').trim());
  assert.deepStrictEqual([...html.matchAll(/<script type="text\/plain" data-bot="([^"]+)">/g)].map(m => m[1]), ['house']);
  assert.ok(!/__[A-Z]+__/.test(html), 'a mark was left unfilled');
  assert.ok(html.includes('const KIT = false;'));
});
test('its scripts are ones a browser will read, and no name is declared twice across them', () => {
  for (const text of [html, kit]) {
    const all = scripts(text);
    assert.strictEqual(all.length, 2, 'the rules, and the game');
    for (const one of all) new vm.Script(one);
    new vm.Script(all.join('\n;\n'), { filename: 'page.js' });   // they share one scope in the page: a name declared in both stops the second from running at all
  }
  for (const bot of ['house', 'greedy', 'random']) assert.doesNotThrow(() => new vm.Script(repo('engine/rules.js') + "\n(function () { 'use strict';\n" + repo(`bots/${bot}.js`) + '\n})();', { filename: bot + '.js' }), bot);
});
test('every level the house bot has is a stop on the line, in the same order, with a word on how it plays', () => {
  const levels = /levels: \[([^\]]+)\]/.exec(repo('bots/house.js'))[1].split(',').map(s => s.trim().replace(/'/g, ''));
  const stops = [...between(repo('game/src/60-game.js'), 'const STOPS = [', '];').matchAll(/\{ level: '(\w+)', zh: '([^']+)', en: '([^']+)', line: '([^']+)' \}/g)];
  assert.deepStrictEqual(stops.map(m => m[1]), levels);
  for (const m of stops) { assert.ok(m[4].length > 40, m[1]); assert.ok(!/\d/.test(m[4]), m[1] + ': a stop\'s line says no numbers'); }
});
test('every Chinese character the page shows is in the typeface it carries for them, at both weights', () => {
  const sources = [repo('game/shell.html'), ...fs.readdirSync(path.join(__dirname, 'src')).map(f => repo('game/src/' + f))].join('\n');
  const wanted = new Set(sources.match(/[㐀-鿿豈-﫿]/gu) || []);
  assert.ok(wanted.size >= 10, 'the page shows its Chinese characters');
  for (const weight of [400, 700]) {
    const have = charsOf(path.join(__dirname, 'fonts', `kai-${weight}.woff2`));
    const lost = [...wanted].filter(ch => !have.has(ch));
    assert.deepStrictEqual(lost, [], `kai-${weight}.woff2 has no ${lost.join('')}: run game/fonts/make-kai.py with them`);
  }
  assert.ok(html.includes('font-family: "Lantern Kai"'));
});
test('the kit\'s board is the same page with no bot in it', () => {
  assert.ok(kit.includes('const KIT = true;')); assert.ok(!/<script[^>]*data-bot=/.test(kit));
  assert.strictEqual(between(kit, '<script id="rules">', '</script>'), between(html, '<script id="rules">', '</script>'));
  assert.ok(!kit.includes(repo('bots/house.js').trim().slice(0, 400)), 'the kit\'s board carries the house bot');
  assert.ok(!kit.includes('href="/"'), 'the kit\'s board points at the portal');
  assert.ok(!/__[A-Z]+__/.test(kit), 'a mark was left unfilled');
});
test('the page the portal serves is the one these sources build', () => {
  if (!carried) return console.log('  (typefaces not installed: run npm install to compare with the page in public/games)');
  assert.ok(fs.existsSync(SERVED), 'public/games/lantern-line.html is not there: npm run build');
  assert.ok(fs.readFileSync(SERVED, 'utf8') === html, 'public/games/lantern-line.html is out of date: npm run build');
});
test('it can be built somewhere else, and that does not touch the one the portal serves', () => {
  const before = fs.existsSync(SERVED) ? fs.readFileSync(SERVED) : null, out = path.join(tmp, 'x', 'page.html');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), '--out', out], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(out, 'utf8'), html);
  if (before) assert.ok(before.equals(fs.readFileSync(SERVED)));
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(process.exitCode ? 'some tests failed' : `${passed} tests passed`);
