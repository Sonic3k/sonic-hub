/* Builds the AI kit: what goes to somebody who is to write a computer player for the game without seeing ours.
   The rules engine goes in as it is (under one name, CC); our own computer player and its players stay out.

     node tools/kit.js      →  dist-kit/commander-chess-ai-kit/  and  dist-kit/commander-chess-ai-kit.zip
   (made when it is wanted and never committed, as the kits of the portal's other games are) */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), OUT = path.join(root, 'dist-kit'), dir = path.join(OUT, 'commander-chess-ai-kit');
const KIT = 2;                                                // goes up when the contract in kit/README.md changes
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, text) => { fs.writeFileSync(path.join(dir, f), text); console.log('  ' + f.padEnd(16) + (Buffer.byteLength(text) / 1024).toFixed(1).padStart(7) + ' KB'); };

const core = read('src/engine/00-core.js'), cut = core.lastIndexOf("if (typeof module !== 'undefined') module.exports = {");
if (cut < 0) throw new Error('the engine no longer ends with its list of exports');
const names = core.slice(cut).match(/\{([\s\S]*)\}/)[1].split(',').map(s => s.trim()).filter(Boolean);
/* Which rules these are, as the kit says of itself. While they are the rules the league was played on, to the letter,
   they keep the name they had there (league/kit/engine.js): a kit packed today is the kit that went out. Rules that
   have changed since are named after the commit that last changed them. */
const league = read('league/kit/engine.js'), was = /const CC = \{ KIT: (\d+), RULES: '([^']+)'/.exec(league);
const played = league.slice(league.indexOf('*/') + 3, league.indexOf('/** everything above, under one name */'));
let rules = 'unknown';
if (was && +was[1] === KIT && played === core.slice(0, cut).replace(' RULES.md has it point by point.', '')) rules = was[2];
else try { rules = execFileSync('git', ['log', '-1', '--format=%h %cs', '--', 'src/engine/00-core.js'], { cwd: root, encoding: 'utf8' }).trim() || rules; } catch (e) { /* not a checkout */ }
const engine = '/* Commander Chess: the rules, as code. AI kit ' + KIT + ', rules of ' + rules + '.\n' +
  '   This file is the reference every player is checked against: use it, do not change it. Everything in it is\n' +
  '   reached through CC, which is listed at the end; README.md says what the calls do. */\n' +
  core.slice(0, cut).replace(' RULES.md has it point by point.', '') +           // that is the game's own RULES.md, with its sources; the kit's is the rules alone
  '/** everything above, under one name */\nconst CC = { KIT: ' + KIT + ", RULES: '" + rules + "',\n  " + names.join(', ').replace(/(.{1,150})(, |$)/g, '$1,\n  ').replace(/,\n {2}$/, '') + ' };\n' +
  "if (typeof module !== 'undefined') module.exports = CC;\n";

const table = read('kit/src/table.js'), sample = read('kit/sample-ai.js');
const arena = '#!/usr/bin/env node\n' + read('kit/src/arena.js').replace(/^(\/\*[\s\S]*?\*\/)\n/, (all, head) => head + '\n\n' + table + '\n');
const inline = { ENGINE: engine, TABLE: table, SAMPLE: sample };
for (const [k, text] of Object.entries(inline)) if (/<\/script/i.test(text)) throw new Error(k + ' has a closing script tag in it: it cannot go into the page');
const page = read('kit/src/match.html').replace(/<!--(ENGINE|TABLE|SAMPLE)-->/g, (all, k) => inline[k]).replace(/\{\{KIT\}\}/g, String(KIT)).replace(/\{\{RULES\}\}/g, rules);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
console.log('AI kit ' + KIT + ', rules of ' + rules);
write('README.md', read('kit/README.md').replace(/\{\{KIT\}\}/g, String(KIT)).replace(/\{\{RULES\}\}/g, rules));
write('RULES.md', read('kit/RULES.md'));
write('engine.js', engine);
write('match.html', page);
write('arena.js', arena);
write('sample-ai.js', sample);
try {
  execFileSync('zip', ['-r', '-q', '-X', 'commander-chess-ai-kit.zip', 'commander-chess-ai-kit'], { cwd: OUT });
  console.log('  dist-kit/commander-chess-ai-kit.zip ' + (fs.statSync(path.join(OUT, 'commander-chess-ai-kit.zip')).size / 1024).toFixed(1) + ' KB');
} catch (e) { console.log('  (no zip made: ' + e.message.split('\n')[0] + ')'); }
