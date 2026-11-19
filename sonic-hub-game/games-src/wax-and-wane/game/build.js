#!/usr/bin/env node
/* Puts the game together as one page that needs nothing beside it:

     node game/build.js                 →  ../../public/games/wax-and-wane.html, where the portal serves it from
     node game/build.js --out <file>    →  the same page somewhere else

   The rules sit in their own <script id="rules">: the page runs them, and hands the same text to every bot's
   worker. The host and the house bot are carried as text. The two typefaces are carried in the page too when their
   packages are installed (npm install); without them the page asks Google Fonts for them instead.

   kit/build.js asks this file for the same page with no bot in it: the kit's board. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const inScript = text => text.replace(/<\/script/gi, '<\\/script');   // nothing in a script may close it early
const MARKS = ['/*__TITLE__*/', '<!--__ICON__-->', '<!--__FONTS__-->', '<!--__HOME__-->', '/*__TAG__*/', '/*__RULES__*/', '/*__HOST__*/', '/*__BOTS__*/', '/*__JS__*/'];

/** The page as text. kit: the board that goes out with the kit (no bot carried; a bot's file is loaded for a side).
 *  Returns { html, carried: whether the typefaces are in it }. */
function page({ kit = false } = {}) {
  const shell = read('game/shell.html'), { html: fonts, carried } = require('./fonts')(ROOT);
  for (const mark of MARKS) if (!shell.includes(mark)) throw new Error('game/shell.html has lost its ' + mark);
  const src = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.js')).sort();
  const js = `const KIT = ${kit};\n` + src.map(f => read('game/src/' + f)).join('\n');
  const bots = kit ? [] : ['house'];
  const fill = {
    '/*__TITLE__*/': kit ? 'Wax &amp; Wane: the board' : 'Wax &amp; Wane',
    // on the portal the page wears the portal's mark, as its other games do; the kit's board, opened from a folder, has a moon of its own
    '<!--__ICON__-->': kit ? `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23141c3c'/%3E%3Cpath d='M16 2a14 14 0 0 1 0 28z' fill='%23f5edd8'/%3E%3C/svg%3E">` : '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<!--__FONTS__-->': fonts,
    '<!--__HOME__-->': kit ? '<span class="home">Wax &amp; Wane: the board</span>' : '<a class="home" href="/">‹ <span class="far">Sonic Hub </span>Games</a>',
    '/*__TAG__*/': kit ? 'The board, with no computer player.' : 'Othello, played with moons.',
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

if (require.main === module) {
  const i = process.argv.indexOf('--out'), out = path.resolve(i < 0 ? path.join(ROOT, '..', '..', 'public', 'games', 'wax-and-wane.html') : process.argv[i + 1]);
  const { html, carried } = page();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`built ${path.relative(process.cwd(), out)}, ${Math.round(Buffer.byteLength(html) / 1024)} KB` + (carried ? '' : '  (typefaces not carried: run npm install first, or the page will fetch them from Google Fonts)'));
}
