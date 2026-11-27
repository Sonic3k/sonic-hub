/* Puts the game together as one self-contained page:
     src/shell.html + the rules and the table + the league's players + src/game/*.js
       → ../../public/games/commander-chess.html, which the portal serves at /games/commander-chess
   What is built is committed, as the portal's other games are: after changing anything here, build again (the tests
   say so when it was forgotten).

   <script id="engine"> holds the rules (src/engine/00-core.js), the same rules under the one name the AI kit gives
   them (CC), the kit's table (kit/src/table.js), the seat an opponent is asked from (src/engine/30-seat.js) and the
   players themselves: every file of league/bots/ exactly as it played the league, as the body of the function the
   table would make of its text (BOTS). The page runs that script itself and starts its text again as a worker, so an
   opponent can think without holding up the drawing. Nothing on the page is made from text as it runs.

   src/engine/10-ai.js and 20-players.js are the game's own computer player. It plays through league/bots/house.js
   like everyone else (league/tools/build-house.js makes that file from the two), so they are not on the page.

   The players are kept with the saves service src/saves.json names. A page for trying things out is built somewhere
   else (--out <folder> writes <folder>/index.html), against something else when asked:
     node build.mjs --out /tmp/cc                                   the page as the portal serves it, somewhere else
     node build.mjs --saves http://127.0.0.1:3200 --out /tmp/cc     the players are kept with a service on this machine
     node build.mjs --saves none --out /tmp/cc                      the players are kept in the browser only
     node build.mjs --saves none --art art/ --out /tmp/cc           and the officers' pictures are read from /tmp/cc/art/<id>.jpg
   The address is fixed when the page is built. Nothing in the page's own address can change it. */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(root, f), 'utf8');
const all = dir => readdirSync(join(root, dir)).filter(f => f.endsWith('.js')).sort();
const flag = name => { const i = process.argv.indexOf('--' + name); if (i < 0) return undefined; const v = process.argv[i + 1]; if (!v || v.startsWith('--')) throw new Error(`--${name} needs something after it`); return v; };
const PUBLIC = resolve(root, '..', '..', 'public'), SERVED = join(PUBLIC, 'games', 'commander-chess.html');   // what the portal serves at /games/commander-chess
const DIR = flag('out'), TRIAL = flag('saves'), ART = flag('art');
const FILE = DIR === undefined ? SERVED : join(resolve(DIR), 'index.html');
if (DIR !== undefined && (FILE + '/').startsWith(PUBLIC + '/')) throw new Error('--out is for a page to try out: it does not go into the folder the portal serves from');
if (ART !== undefined && !/^(?:[a-z0-9_-]+\/)+$/.test(ART)) throw new Error('--art is a folder beside the page, written as it is asked for: small letters, digits, dashes, and a slash at the end (art/)');
if (ART !== undefined && DIR === undefined) throw new Error('--art is for trying pictures out: give it somewhere else to write with --out');

/* where the players are kept: the service src/saves.json names, or what this one build was asked to use */
let saves = JSON.parse(read('src/saves.json'));
if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(saves.game || '')) throw new Error('saves.game is the name this game keeps its players under: small letters, digits and dashes');
if (TRIAL !== undefined) {
  if (DIR === undefined) throw new Error('--saves is for trying things out: give it somewhere else to write with --out, so that the page the portal serves stays what src/saves.json says');
  saves = { api: TRIAL === 'none' ? '' : TRIAL, game: saves.game };
}
if (saves.api && !(/^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(saves.api) || (TRIAL !== undefined && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(saves.api)))) throw new Error('saves.api is the address of the saves service, https and nothing after the host: ' + saves.api);

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
/* the players: every file of league/bots/, each as the body of a function given CC and registerAI, which is what the
   table makes of a file's text. Word for word: a file is not changed to fit, and one that could not stand inside a
   script is refused. */
const botFiles = all('league/bots');
for (const f of botFiles) if (/<\/script|<!--|<script/i.test(read('league/bots/' + f))) throw new Error('league/bots/' + f + ' has something in it that a script in a page cannot hold (a script tag or the start of an HTML comment)');
const bots = `/** the league's players: each file of league/bots/ as it was handed in, as the function the table makes of its text */\nconst BOTS = {\n${botFiles.map(f => `${JSON.stringify(f)}: function (CC, registerAI) {\n${read('league/bots/' + f)}\n}`).join(',\n')}\n};`;
const rules = [core, `/** the rules under one name, as the AI kit hands them to a player */\nconst CC = { KIT: ${tag[1]}, RULES: '${tag[2]}', ${names.join(', ')} };`,
  read('kit/src/table.js'), read('src/engine/30-seat.js')].join('\n');
const engine = [rules, bots, '/** where every opponent sits */\nconst Seat = makeSeat(CC, makeTable, BOTS);'].join('\n');

const game = `/** where the players are kept: the saves service and the name this game has there (api '': in this browser only) */\nconst SAVES = ${JSON.stringify({ api: saves.api || '', game: saves.game })};\n${ART === undefined ? '' : `/** a page for trying pictures out: the officers' own pictures are files in this folder beside it */\nconst ART_BASE = ${JSON.stringify(ART)};\n`}` + all('src/game').map(f => read('src/game/' + f)).join('\n');
for (const [what, text] of [['the engine', engine], ['the game', game]]) if (/<\/script/i.test(text)) throw new Error(what + ' has a closing script tag in it: it cannot go into the page');
const shell = read('src/shell.html');
if (/\/\*__[A-Z]+__\*\//.test(shell.replace('/*__ENGINE__*/', '').replace('/*__JS__*/', ''))) throw new Error('the shell has a place the build puts nothing into');
const page = shell.replace('/*__ENGINE__*/', () => engine).replace('/*__JS__*/', () => game);
mkdirSync(dirname(FILE), { recursive: true });
writeFileSync(FILE, page);
const kb = t => Math.round(Buffer.byteLength(t) / 1024);
console.log(`built ${DIR === undefined ? 'public/games/commander-chess.html (the portal serves it at /games/commander-chess)' : FILE} ${kb(page)} KB: the players ${kb(bots)} KB (${botFiles.length} files), rules and table ${kb(rules)} KB, the game ${kb(game)} KB`);
console.log(saves.api ? `  players kept with ${saves.api} as ${saves.game}` : '  players kept in the browser only');
