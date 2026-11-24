#!/usr/bin/env node
/* Puts the kit together: what goes out to whoever is asked to write a new bot.   node kit/build.js  →  dist-kit/

     dist-kit/lantern-line-kit/       the kit as a folder
     dist-kit/lantern-line-kit.zip    the same, in one file

   It is the rules, the brief, the bot host, the two sample bots and the arena, each exactly as this folder has it,
   and the board with no computer player (the game's own page, built with no bot in it: game/build.js). The house
   bot is left out on purpose: a new bot is to think for itself. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NAME = 'lantern-line-kit';
const flag = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? undefined : process.argv[i + 1]; };
const OUT = path.resolve(flag('out') || path.join(ROOT, 'dist-kit'));

/* as they are in this folder, at the same places */
const AS_IS = ['docs/RULES.md', 'docs/BOT_BRIEF.md', 'engine/rules.js', 'engine/host.js', 'engine/rules.test.js', 'engine/rules.doc.test.js', 'engine/counts.txt',
  'bots/random.js', 'bots/greedy.js', 'arena/lib.js', 'arena/arena.js', 'arena/contract.test.js'];

/* the board */
const { html: board, carried } = require('../game/build')({ kit: true });

const pkg = { name: NAME, version: require('../package.json').version, private: true, description: 'Lantern Line: the rules of dots and boxes on a 5 × 5 and a 7 × 7 board, a board with no computer player, and what it takes to write and rate one.',
  engines: { node: '>=18' }, scripts: { check: 'node arena/contract.test.js', arena: 'node arena/arena.js', rules: 'node engine/rules.test.js && node engine/rules.doc.test.js' } };

const files = [['START_HERE.md', read('kit/START_HERE.md')], ['board.html', board], ['package.json', JSON.stringify(pkg, null, 2) + '\n'], ...AS_IS.map(f => [f, read(f)])];

/* the folder */
const dir = path.join(OUT, NAME);
fs.rmSync(dir, { recursive: true, force: true });
for (const [f, text] of files) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); }

/* the zip: every file deflated, under one folder, with one date for all so that the same kit is the same file */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const TIME = 0, DATE = ((2026 - 1980) << 9) | (11 << 5) | 24;
function zip(entries) {
  const parts = [], central = []; let at = 0;
  for (const [name, text] of entries) {
    const raw = Buffer.from(text, 'utf8'), data = zlib.deflateRawSync(raw, { level: 9 }), n = Buffer.from(name, 'utf8'), crc = crc32(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8); local.writeUInt16LE(TIME, 10); local.writeUInt16LE(DATE, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(n.length, 26);
    const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10); cen.writeUInt16LE(TIME, 12); cen.writeUInt16LE(DATE, 14);
    cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(raw.length, 24); cen.writeUInt16LE(n.length, 28); cen.writeUInt32LE(at, 42);
    parts.push(local, n, data); central.push(cen, n); at += 30 + n.length + data.length;
  }
  const size = central.reduce((t, b) => t + b.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(at, 16);
  return Buffer.concat([...parts, ...central, end]);
}
const packed = zip(files.map(([f, text]) => [`${NAME}/${f}`, text]));
fs.writeFileSync(path.join(OUT, NAME + '.zip'), packed);

const rel = f => path.relative(process.cwd(), f) || '.';
console.log(`${rel(path.join(OUT, NAME + '.zip'))}, ${Math.round(packed.length / 1024)} KB, ${files.length} files` + (carried ? '' : '  (typefaces not carried: run npm install first, or the board will fetch them from Google Fonts)'));
for (const [f, text] of files) console.log(`  ${f.padEnd(28)} ${String(Math.round(Buffer.byteLength(text) / 1024)).padStart(4)} KB`);
