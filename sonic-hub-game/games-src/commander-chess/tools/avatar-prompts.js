/* Writes art/avatar-prompts.md: one image prompt for each officer's portrait.
       node tools/avatar-prompts.js
   Who she is (name, rank, age, uniform, cap, backdrop colours) comes from the campaign's own files; what she looks
   like and the words every prompt shares come from art/avatars.js. test/campaign.test.js fails when the file no
   longer says what the two say. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const A = require(path.join(root, 'art/avatars.js'));

/** the campaign, as the page loads it */
function campaign() {
  const ctx = vm.createContext({ console, localStorage: { getItem: () => null, setItem() {} } });
  const files = fs.readdirSync(path.join(root, 'src/game')).filter(f => /^6\d-.*\.js$/.test(f)).sort();
  vm.runInContext(files.map(f => fs.readFileSync(path.join(root, 'src/game', f), 'utf8')).join('\n') + '\nthis.C = { PLACES, WOMEN };', ctx);
  const src = fs.readFileSync(path.join(root, 'src/game/41-busts.js'), 'utf8'), senior = /const SENIOR = new Set\(\[([^\]]+)\]\)/.exec(src);
  if (!senior) throw new Error('41-busts.js no longer says who wears shoulder boards');
  return Object.assign(ctx.C, { SENIOR: new Set(senior[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''))) });
}
/** the prompt for one officer */
function promptFor(w, SENIOR) {
  const a = A.WHO[w.id]; if (!a) throw new Error('art/avatars.js has nothing for ' + w.id);
  const [, , , cap, coat] = w.look;
  if (!A.COAT[coat] || !(cap in A.CAP)) throw new Error(w.id + ': a coat or cap art/avatars.js does not know (' + coat + ', ' + cap + ')');
  const wear = [A.COAT[coat], A.CAP[cap], SENIOR.has(w.rank) ? A.BOARDS : '', a.extra || ''].filter(Boolean).join(' ');
  return [
    'SHOT TYPE: ' + A.SHOT,
    'FRAMING: ' + A.FRAMING,
    `SUBJECT: ${w.rank} ${w.name} (${w.job.replace(/\.$/, '')}), an adult woman, age ${w.age}. ${a.who}`,
    'WARDROBE: ' + wear,
    'EXPRESSION: ' + a.mood,
    `BACKGROUND: A plain backdrop grading from ${a.back[0]} (${w.tone[0]}) at the top to ${a.back[1]} (${w.tone[1]}) at the bottom. Far behind her, faint and simple: ${a.back[2]}.`,
    'STYLE: ' + A.STYLE,
    'AVOID: ' + A.AVOID,
  ].join('\n');
}
/** every prompt: [{ place, officers: [{ w, prompt }] }] */
function prompts() {
  const { PLACES, WOMEN, SENIOR } = campaign();
  for (const id of Object.keys(A.WHO)) if (!WOMEN.some(w => w.id === id)) throw new Error('art/avatars.js describes ' + id + ', who is not in the campaign');
  return PLACES.map(p => ({ place: p, officers: WOMEN.filter(w => w.place === p.id).map(w => ({ w, prompt: promptFor(w, SENIOR) })) }));
}
function promptsText() {
  let t = `# Portrait prompts

One prompt for each officer's portrait, drawn rather than photographed: gouache poster work, to go with the chart and
the views at the stations. Paste a prompt whole and ask for a vertical 3:4 picture. Save each picture under her id
(the name in brackets).

SHOT TYPE, FRAMING, STYLE and AVOID are the same words in every prompt, so that the set comes out as one hand. They
are kept in \`art/avatars.js\` with what each officer looks like; this file is written by \`node tools/avatar-prompts.js\`.

`;
  for (const { place, officers } of prompts()) {
    t += `## ${place.name}\n\n`;
    for (const { w, prompt } of officers) t += `### ${w.rank} ${w.name} (\`${w.id}\`)\n\n\`\`\`text\n${prompt}\n\`\`\`\n\n`;
  }
  return t;
}
module.exports = { prompts, promptsText };
if (require.main === module) { fs.writeFileSync(path.join(root, 'art/avatar-prompts.md'), promptsText()); console.log('wrote art/avatar-prompts.md'); }
