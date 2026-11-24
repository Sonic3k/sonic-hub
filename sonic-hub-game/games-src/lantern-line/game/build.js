#!/usr/bin/env node
/* Puts the game together as one page that needs nothing beside it:

     node game/build.js                 →  ../../public/games/lantern-line.html, where the portal serves it from
     node game/build.js --out <file>    →  the same page somewhere else

   The rules sit in their own <script id="rules">: the page runs them, and hands the same text to every bot's
   worker. The host and the house bot are carried as text. The typefaces are carried in the page too when their
   packages are installed (npm install); without them the page asks Google Fonts for Alegreya and Alegreya Sans.

   kit/build.js asks this file for the same page with no bot in it: the kit's board. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const inScript = text => text.replace(/<\/script/gi, '<\\/script');   // nothing in a script may close it early
const MARKS = ['/*__TITLE__*/', '<!--__ICON__-->', '<!--__FONTS__-->', '<!--__HOME__-->', '/*__TAG__*/', '/*__RULES__*/', '/*__HOST__*/', '/*__BOTS__*/', '/*__JS__*/'];
const SERVED = path.join(ROOT, '..', '..', 'public', 'games', 'lantern-line.html');

/** The page as text. kit: the board that goes out with the kit (no bot carried; a bot's file is loaded for a side).
 *  Returns { html, carried: whether the Latin typefaces are in it }. */
function page({ kit = false } = {}) {
  const shell = read('game/shell.html'), { html: fonts, carried } = require('./fonts')(ROOT);
  for (const mark of MARKS) if (!shell.includes(mark)) throw new Error('game/shell.html has lost its ' + mark);
  const src = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.js')).sort();
  const js = `const KIT = ${kit};\n` + src.map(f => read('game/src/' + f)).join('\n');
  const bots = kit ? [] : ['house'];
  const fill = {
    '/*__TITLE__*/': kit ? 'Lantern Line: the board' : 'Lantern Line',
    // on the portal the page wears the portal's mark, as its other games do; the kit's board, opened from a folder, has a lantern of its own
    '<!--__ICON__-->': kit ? `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231d2a5c'/%3E%3Cpath d='M9 7h14l-3 18h-8z' fill='%23e0442f'/%3E%3Cellipse cx='16' cy='24' rx='3' ry='2' fill='%23ffe3ad'/%3E%3C/svg%3E">` : '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<!--__FONTS__-->': fonts,
    '<!--__HOME__-->': kit ? '<span class="home">Lantern Line: the board</span>' : '<a class="home" href="/">‹ <span class="far">Sonic Hub </span>Games</a>',
    '/*__TAG__*/': kit ? 'The board, with no computer player. Load a bot’s file for either side.' : 'Dots and boxes in the Pingxi valley: close a square and its lantern goes up.',
    '/*__RULES__*/': inScript(read('engine/rules.js')),
    '/*__HOST__*/': inScript(read('engine/host.js')),
    '/*__BOTS__*/': bots.map(b => `<script type="text/plain" data-bot="${b}">\n${inScript(read(`bots/${b}.js`))}\n</script>`).join('\n'),
    '/*__JS__*/': inScript(js),
  };
  let html = shell;
  for (const mark of MARKS) html = html.replace(mark, () => fill[mark]);
  return { html, carried };
}
module.exports = page;
module.exports.SERVED = SERVED;

if (require.main === module) {
  const i = process.argv.indexOf('--out'), out = path.resolve(i < 0 ? SERVED : process.argv[i + 1]);
  const { html, carried } = page({ kit: process.argv.includes('--kit') });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`built ${path.relative(process.cwd(), out)}, ${Math.round(Buffer.byteLength(html) / 1024)} KB` + (carried ? '' : '  (Latin typefaces not carried: run npm install first, or the page will fetch them from Google Fonts)'));
}
