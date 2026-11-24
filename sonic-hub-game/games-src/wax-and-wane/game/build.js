#!/usr/bin/env node
/* Puts the game together as one page:

     node game/build.js                 →  ../../public/games/, where the portal serves it from:
                                             wax-and-wane.html         the game
                                             wax-and-wane-admin.html   the page on which the cast is given names, ages and pictures
                                             wax-and-wane-bots/        the bots the campaign's opponents play as, fetched when one sits down
                                           and docs/ROSTER.md: who plays as which bot
     node game/build.js --dir <folder>  →  the same three somewhere else
     node game/build.js --out <file>    →  the game alone as one file, every bot carried in it: opens from a disk

   For trying the page against something other than the saves service the campaign names (with --dir or --out):
     --saves http://127.0.0.1:3200      the players are kept with a service on this machine
     --saves none                       the players are kept in the browser only

   The rules sit in their own <script id="rules">: the page runs them, and hands the same text to every bot's
   worker. The host and the house bot are carried as text; the other bots are text files beside the page. Every
   opponent's rating is taken from arena/ratings.json, which the league writes, so what the game shows is what was
   measured. The two typefaces are carried in the page too when their packages are installed (npm install); without
   them the page asks Google Fonts for them instead.

   kit/build.js asks this file for the same page with no bot and no campaign in it: the kit's board. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const inScript = text => text.replace(/<\/script/gi, '<\\/script');   // nothing in a script may close it early
const MARKS = ['/*__TITLE__*/', '<!--__ICON__-->', '<!--__FONTS__-->', '/*__CSS__*/', '<!--__HOME__-->', '/*__TAG__*/', '<!--__CAMPAIGN__-->', '/*__RULES__*/', '/*__HOST__*/', '/*__BOTS__*/', '/*__JS__*/'];
const CAMPAIGN_SRC = new Set(['12-save.js', '13-cast.js', '15-points.js', '25-world.js', '70-campaign.js']);   // what the kit's board goes without
const PORTAL = path.join(ROOT, '..', '..', 'public', 'games'), BOTS_DIR = 'wax-and-wane-bots';
const CARRIED = ['house'];                                              // bots the page always carries: free play needs the house bot

/** The campaign as the page carries it: every opponent with her rating from the league and the writer of her bot.
 *  saves: undefined (the service the campaign names), 'none', or the address of another. file: a campaign to read
 *  in place of content/campaign.json (the tests hand it ones that are wrong). Throws when something in it cannot be
 *  right. Returns { content, bots: the bot files it uses, opens: the points at which each opponent and place opens,
 *  START }. */
function campaign({ saves, file } = {}) {
  const content = JSON.parse(file ? fs.readFileSync(file, 'utf8') : read('content/campaign.json'));
  const ratings = Object.fromEntries(JSON.parse(read('arena/ratings.json')).players.map(p => [p.id, p.rating]));
  const writers = JSON.parse(read('bots/written-by.json'));
  const bots = new Set(), seen = new Set();
  for (const v of content.venues) for (const id of v.opponents) {
    const o = content.opponents[id];
    if (!o) throw new Error(`${v.id} lists ${id}, who is not among the opponents`);
    if (seen.has(id)) throw new Error(`${id} is in two places`);
    seen.add(id);
    const key = `${o.bot}:${o.level}`;
    if (!(key in ratings)) throw new Error(`${id} plays as ${key}, which the league has not rated: node arena/league.js, then node arena/league.js --table --ratings`);
    if (!fs.existsSync(path.join(ROOT, 'bots', o.bot + '.js'))) throw new Error(`${id} plays as ${key}, but there is no bots/${o.bot}.js`);
    const by = (writers[o.bot] || {}).model;
    if (!(typeof by === 'string' && by.trim())) throw new Error(`${id} plays as ${key}, and bots/written-by.json does not say who wrote bots/${o.bot}.js`);
    if (!(o.age >= 18)) throw new Error(`${id}: everyone in the cast is an adult`);
    o.rating = ratings[key]; o.by = by; bots.add(o.bot);
  }
  for (const id of Object.keys(content.opponents)) if (!seen.has(id)) throw new Error(`${id} is in no place`);
  const seated = new Map();
  for (const id of seen) { const o = content.opponents[id], key = `${o.bot}:${o.level}`; if (seated.has(key)) throw new Error(`${id} and ${seated.get(key)} both play as ${key}`); seated.set(key, id); }
  /* an opponent names another by her key in braces ({isolde}), which the page reads as the name she goes by now */
  const amiss = [...require('./names')(content.opponents), ...require('./lasting')(content)];
  if (amiss.length) throw new Error(amiss.join('\n'));
  /* where the players' games are kept: the service the campaign names, or what this one build was asked to use */
  if (saves !== undefined) { if (saves === 'none') delete content.saves; else content.saves = { api: saves, game: (content.saves || {}).game || 'wax-and-wane' }; }
  if (content.saves) {
    const { api, game } = content.saves, local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(api || '');
    if (!(/^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(api || '') || (saves !== undefined && local))) throw new Error('saves.api is the address of the saves service, https and nothing after the host: ' + api);
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(game || '')) throw new Error('saves.game is the name this game keeps its players under: small letters, digits and dashes');
  }
  for (const v of content.venues) {   // within a place, weakest first: that is the order they open in
    const sorted = v.opponents.slice().sort((a, b) => content.opponents[a].rating - content.opponents[b].rating);
    if (sorted.join() !== v.opponents.join()) throw new Error(`${v.id}: by rating the order should be ${sorted.join(', ')}`);
  }
  const points = vm.runInNewContext(read('game/src/15-points.js') + '\n;({ START, opensAt })');
  const opens = points.opensAt(content.venues, content.opponents);
  for (let i = 1; i < content.venues.length; i++) if (opens[content.venues[i].id] < opens[content.venues[i - 1].id]) throw new Error(`${content.venues[i].id} would open before ${content.venues[i - 1].id}: the map lights up in the order the places are listed`);
  return { content, bots: [...bots].sort(), opens, START: points.START };
}

/** The page as text. kit: the board that goes out with the kit (no bot carried, no campaign; a bot's file is loaded
 *  for a side). saves: see campaign(). whole: every bot the campaign uses is carried in the page, so the page needs
 *  nothing beside it. Returns { html, carried: whether the typefaces are in it, camp: the campaign as built }. */
function page({ kit = false, saves, whole = false } = {}) {
  const shell = read('game/shell.html'), { html: fonts, carried } = require('./fonts')(ROOT);
  for (const mark of MARKS) if (!shell.includes(mark)) throw new Error('game/shell.html has lost its ' + mark);
  const camp = kit ? null : campaign({ saves });
  const src = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.js') && !(kit && CAMPAIGN_SRC.has(f))).sort();
  const head = `const KIT = ${kit};\n` + (kit ? '' : `const CONTENT = ${JSON.stringify(camp.content)};\nconst BOTS_AT = ${JSON.stringify(whole ? '' : BOTS_DIR + '/')};\n`);
  const js = head + src.map(f => read('game/src/' + f)).join('\n');
  const bots = kit ? [] : whole ? [...new Set([...CARRIED, ...camp.bots])] : CARRIED;
  const fill = {
    '/*__TITLE__*/': kit ? 'Wax &amp; Wane: the board' : 'Wax &amp; Wane',
    // on the portal the page wears the portal's mark, as its other games do; the kit's board, opened from a folder, has a moon of its own
    '<!--__ICON__-->': kit || whole ? `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23141c3c'/%3E%3Cpath d='M16 2a14 14 0 0 1 0 28z' fill='%23f5edd8'/%3E%3C/svg%3E">` : '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<!--__FONTS__-->': fonts,
    '/*__CSS__*/': kit ? '' : read('game/campaign.css'),
    '<!--__HOME__-->': kit ? '<span class="home">Wax &amp; Wane: the board</span>' : whole ? '' : '<a class="home" id="home" href="/">‹ <span class="far">Sonic Hub </span>Games</a>',
    '/*__TAG__*/': kit ? 'The board, with no computer player.' : 'Othello, played with moons.',
    '<!--__CAMPAIGN__-->': kit ? '' : read('game/campaign.html'),
    '/*__RULES__*/': inScript(read('engine/rules.js')),
    '/*__HOST__*/': inScript(read('engine/host.js')),
    '/*__BOTS__*/': bots.map(b => `<script type="text/plain" data-bot="${b}">\n${inScript(read(`bots/${b}.js`))}\n</script>`).join('\n'),
    '/*__JS__*/': inScript(js),
  };
  let html = shell;
  for (const mark of MARKS) html = html.replace(mark, () => fill[mark]);
  return { html, carried, camp };
}
/** The page on which the cast is given other names, ages and pictures: game/admin.html with the campaign's cast in it. */
function adminPage(camp) {
  const { content } = camp, shell = read('game/admin.html'), { html: fonts } = require('./fonts')(ROOT);
  for (const mark of ['<!--__FONTS__-->', '/*__CAST__*/null']) if (!shell.includes(mark)) throw new Error('game/admin.html has lost its ' + mark);
  const casting = { api: (content.saves || {}).api || '', game: (content.saves || {}).game || '',
    rooms: content.venues.map(v => ({ name: v.name, members: v.opponents.map(id => { const o = content.opponents[id]; return { id, name: o.name, age: o.age, plates: o.plates, role: o.role, rating: o.rating, bot: o.bot, level: o.level, by: o.by }; }) })) };
  return shell.replace('<!--__FONTS__-->', () => fonts).replace('/*__CAST__*/null', () => inScript(JSON.stringify(casting)));
}
/** The bot files that stand beside the page, by name: the campaign's, less the ones the page carries. */
const beside = camp => camp.bots.filter(b => !CARRIED.includes(b));
module.exports = page;
Object.assign(module.exports, { campaign, adminPage, beside, PORTAL, BOTS_DIR, CARRIED });

if (require.main === module) {
  const flag = name => { const i = process.argv.indexOf('--' + name); if (i < 0) return undefined; const v = process.argv[i + 1]; if (!v || v.startsWith('--')) throw new Error(`--${name} needs something after it`); return v; };
  const saves = flag('saves'), one = flag('out'), dir = path.resolve(flag('dir') || PORTAL), served = !one && dir === PORTAL;
  if (saves !== undefined && served) throw new Error('--saves is for trying things out: give it somewhere else to write with --dir or --out, so that what the portal serves stays what the campaign says');
  const kb = text => Math.round(Buffer.byteLength(text) / 1024) + ' KB';
  if (one) {
    const { html, carried } = page({ saves, whole: true });
    fs.mkdirSync(path.dirname(path.resolve(one)), { recursive: true }); fs.writeFileSync(path.resolve(one), html);
    console.log(`built ${path.relative(process.cwd(), path.resolve(one))}, ${kb(html)}, every bot in it` + (carried ? '' : '  (typefaces not carried: run npm install first)'));
  } else {
    const { html, carried, camp } = page({ saves });
    fs.mkdirSync(path.join(dir, BOTS_DIR), { recursive: true });
    fs.writeFileSync(path.join(dir, 'wax-and-wane.html'), html);
    fs.writeFileSync(path.join(dir, 'wax-and-wane-admin.html'), adminPage(camp));
    const wanted = beside(camp).map(b => b + '.js');
    for (const f of fs.readdirSync(path.join(dir, BOTS_DIR))) if (!wanted.includes(f)) fs.unlinkSync(path.join(dir, BOTS_DIR, f));
    for (const f of wanted) fs.copyFileSync(path.join(ROOT, 'bots', f), path.join(dir, BOTS_DIR, f));
    if (served) fs.writeFileSync(path.join(ROOT, 'docs', 'ROSTER.md'), require('./roster')(camp.content, camp.opens, camp.START));
    console.log(`built ${path.relative(process.cwd(), path.join(dir, 'wax-and-wane.html'))}, ${kb(html)}, with its cast page and ${wanted.length} bots beside it` + (carried ? '' : '  (typefaces not carried: run npm install first, or the page will fetch them from Google Fonts)'));
    console.log(camp.content.saves ? `  players kept with ${camp.content.saves.api} as ${camp.content.saves.game}` : '  players kept in the browser only');
    for (const v of camp.content.venues) console.log(`  ${v.name}${camp.opens[v.id] > camp.START ? `, opens at ${camp.opens[v.id]} points` : ''}: ${v.opponents.map(id => `${camp.content.opponents[id].name} ${camp.content.opponents[id].rating}`).join(', ')}`);
  }
}
