/* Puts the game together as one self-contained page:
     src/shell.html + the rules and the table + the league's players + src/game/*.js → dist/index.html

   <script id="engine"> holds the rules (src/engine/00-core.js), the same rules under the one name the AI kit gives
   them (CC), the kit's table (kit/src/table.js) and the seat an opponent is asked from (src/engine/30-seat.js). The
   page runs that text itself and starts it again as a worker, so an opponent can think without holding up the
   drawing. The players themselves, the files of league/bots/ exactly as they played the league, go in as text
   (<script id="bots">): the worker is handed the one it needs when it is first needed.

   src/engine/10-ai.js and 20-players.js are the game's own computer player. It plays through league/bots/house.js
   like everyone else (league/tools/build-house.js makes that file from the two), so they are not on the page. */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(root, f), 'utf8');
const all = dir => readdirSync(join(root, dir)).filter(f => f.endsWith('.js')).sort();

/* the rules, and the name the kit gives them. The league's players were rated on league/kit/engine.js: a build whose
   rules are not those rules to the letter would seat them at a game they were never measured at. */
const core = read('src/engine/00-core.js'), cut = core.lastIndexOf("if (typeof module !== 'undefined') module.exports = {");
if (cut < 0) throw new Error('the engine no longer ends with its list of exports');
const names = core.slice(cut).match(/\{([\s\S]*)\}/)[1].split(',').map(s => s.trim()).filter(Boolean);
const kit = read('league/kit/engine.js'), tag = /const CC = \{ KIT: (\d+), RULES: '([^']+)'/.exec(kit);
if (!tag) throw new Error('league/kit/engine.js no longer says which kit and rules it is');
const rated = kit.slice(kit.indexOf('*/') + 3, kit.indexOf('/** everything above, under one name */'));
if (rated !== core.slice(0, cut).replace(' RULES.md has it point by point.', '')) throw new Error('src/engine/00-core.js is no longer the rules the league was played on (league/kit/engine.js): the ratings of the campaign would not hold. Play the league again, or put the rules back.');
if (read('kit/src/table.js') !== read('league/kit/table.js')) throw new Error('kit/src/table.js is no longer the table the league was played at (league/kit/table.js)');
const engine = [core, `/** the rules under one name, as the AI kit hands them to a player */\nconst CC = { KIT: ${tag[1]}, RULES: '${tag[2]}', ${names.join(', ')} };`,
  read('kit/src/table.js'), read('src/engine/30-seat.js'), '/** where every opponent sits */\nconst Seat = makeSeat(CC, makeTable);'].join('\n');

/* the players: every file of league/bots/, as text */
const bots = {};
for (const f of all('league/bots')) bots[f] = read('league/bots/' + f);
const botsText = JSON.stringify(bots).replace(/</g, '\\u003c');   // nothing in it can end the script it sits in

const game = all('src/game').map(f => read('src/game/' + f)).join('\n');
for (const [what, text] of [['the engine', engine], ['the game', game]]) if (/<\/script/i.test(text)) throw new Error(what + ' has a closing script tag in it: it cannot go into the page');
const page = read('src/shell.html').replace('/*__BOTS__*/', () => botsText).replace('/*__ENGINE__*/', () => engine).replace('/*__JS__*/', () => game);
if (/\/\*__[A-Z]+__\*\//.test(page.slice(0, page.indexOf('<script type="application/json" id="bots">')))) throw new Error('the shell has a place nothing was put into');
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), page);
const kb = t => Math.round(Buffer.byteLength(t) / 1024);
console.log(`built dist/index.html ${kb(page)} KB: the players ${kb(botsText)} KB (${Object.keys(bots).length} files), rules and table ${kb(engine)} KB, the game ${kb(game)} KB`);
