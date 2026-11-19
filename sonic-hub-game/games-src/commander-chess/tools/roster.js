/* Writes ROSTER.md: who every officer of the campaign is in the league (which file, which player in it, which level)
   and which model wrote that player.
       node tools/roster.js
   The campaign's own files are the source (src/game/60-campaign.js … 66-admiralty.js); test/campaign.test.js fails when
   ROSTER.md no longer says what they say. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

function rosterText() {
  const ctx = vm.createContext({ console, localStorage: { getItem: () => null, setItem() {} } });
  const files = fs.readdirSync(path.join(root, 'src/game')).filter(f => /^6\d-.*\.js$/.test(f)).sort();
  vm.runInContext(files.map(f => fs.readFileSync(path.join(root, 'src/game', f), 'utf8')).join('\n') + '\nthis.C = { PLACES, WOMEN, RANKS, START_RATING, WIN_K, LOSS_K, FIRST };', ctx);
  const { PLACES, WOMEN, RANKS, START_RATING, WIN_K, LOSS_K, FIRST } = ctx.C;
  const rank = r => RANKS.filter(x => r >= x[0]).pop()[1];
  let t = `# Who is who

Every officer of the campaign is one player of the league (\`league/\`): a file of \`league/bots/\`, a player in that
file, and the level it is asked to play at. Her rating, her record and her place on the List are what that player did
in the league, at the league's game (the standard line-up, a game of battles, one second a turn). Changing a player's
file makes it another player: the league has to be played again before the campaign can use it.

This file is written by \`node tools/roster.js\` from the campaign's own files.

`;
  for (const p of PLACES) {
    const os = WOMEN.filter(w => w.place === p.id), avg = Math.round(os.reduce((n, w) => n + w.rating, 0) / os.length);
    t += `## ${p.name}: ${p.room}\n\n${p.open ? `Opens at ${p.open} points (${rank(p.open)}).` : 'Open from the start.'} Average rating ${avg}.\n\n`;
    t += '| Officer | Age | Player (file, id, level) | Written by | Rating | List | Won, drawn, lost | Sits down at |\n|---|---|---|---|---|---|---|---|\n';
    for (const w of os) t += `| ${w.rank} ${w.name} (\`${w.id}\`) | ${w.age} | \`${w.bot.file}\`, \`${w.bot.id}\`, level ${w.bot.level} | ${w.by} | ${w.rating}${w.id === 'pia' ? ' (set by hand: she won no game)' : ''} | ${w.list} | ${w.rec.join(', ')} | ${Math.max(w.needs, p.open) || 'the start'} |\n`;
    t += '\n';
  }
  t += `## Points

A new player starts at ${START_RATING}. A win is worth up to ${WIN_K} points and a loss costs up to ${LOSS_K}, by the difference in
rating; the first win against each officer pays ${FIRST} more. Rank goes by the best points reached:
${RANKS.map(r => `${r[1]} ${r[0]}`).join(', ')}.
`;
  return t;
}
module.exports = { rosterText };
if (require.main === module) { fs.writeFileSync(path.join(root, 'ROSTER.md'), rosterText()); console.log('wrote ROSTER.md'); }
