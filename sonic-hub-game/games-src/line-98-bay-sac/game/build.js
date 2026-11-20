#!/usr/bin/env node
/* Puts the game together as one page that needs nothing beside it:

     node game/build.js                 →  ../../public/games/line-98-bay-sac.html, where the portal serves it from
     node game/build.js --out <file>    →  the same page somewhere else

   The rules sit in their own <script id="rules">, exactly as engine/rules.js has them. Everything else is game/src,
   file after file in the order of their names, in one script. The two typefaces are carried in the page too when
   their packages are installed (npm install); without them the page asks Google Fonts for them instead. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const inScript = text => text.replace(/<\/script/gi, '<\\/script');   // nothing in a script may close it early
const MARKS = ['<!--__FONTS__-->', '/*__RULES__*/', '/*__JS__*/'];

/** The page as text. Returns { html, carried: whether the typefaces are in it }. */
function page() {
  const shell = read('game/shell.html'), { html: fonts, carried } = require('./fonts')(ROOT);
  for (const mark of MARKS) if (!shell.includes(mark)) throw new Error('game/shell.html has lost its ' + mark);
  const src = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.js')).sort();
  const js = "(function () {\n'use strict';\n" + src.map(f => read('game/src/' + f)).join('\n') + '\n})();';
  const fill = { '<!--__FONTS__-->': fonts, '/*__RULES__*/': inScript(read('engine/rules.js')), '/*__JS__*/': inScript(js) };
  let html = shell;
  for (const mark of MARKS) html = html.replace(mark, () => fill[mark]);
  return { html, carried };
}
module.exports = page;

if (require.main === module) {
  const i = process.argv.indexOf('--out'), out = path.resolve(i < 0 ? path.join(ROOT, '..', '..', 'public', 'games', 'line-98-bay-sac.html') : process.argv[i + 1]);
  const { html, carried } = page();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`built ${path.relative(process.cwd(), out)}, ${Math.round(Buffer.byteLength(html) / 1024)} KB` + (carried ? '' : '  (typefaces not carried: run npm install first, or the page will fetch them from Google Fonts)'));
}
