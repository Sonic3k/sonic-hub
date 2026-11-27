#!/usr/bin/env node
/* Puts Leadlight together as one page:

     node game/build.js                 →  ../../public/games/, where the portal serves it from:
                                             leadlight.html         the game
                                             leadlight-admin.html   the page on which the cast is given names, ages and pictures
     node game/build.js --dir <folder>  →  the same two somewhere else
     node game/build.js --out <file>    →  the game alone as one file

   For trying the page against something other than the saves service content/cast.json names (with --dir or --out):
     --saves http://127.0.0.1:3200      the players are kept with a service on this machine
     --saves none                       the players are kept in the browser only

   The engine (engine/*.js) and the page's own scripts (game/src/*.js, in the order of their names) are carried in
   the page, with the game's data (content/data.json, less what only the tools read) and its cast. The typefaces are
   carried too when their packages are installed (npm install); without them the page asks Google Fonts. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const inScript = text => text.replace(/<\/script/gi, '<\\/script');
const MARKS = ['/*__TITLE__*/', '<!--__ICON__-->', '<!--__FONTS__-->', '<!--__HOME__-->', '/*__TAG__*/', '/*__ENGINE__*/', '/*__JS__*/'];
const ENGINE = ['core.js', 'scripts.js', 'match.js', 'catalog.js'];
const PORTAL = path.join(ROOT, '..', '..', 'public', 'games');
const FACES = [['Federant', 'federant', 400, 'federant'], ['Alegreya Sans', 'alegreya-sans', 400], ['Alegreya Sans', 'alegreya-sans', 500], ['Alegreya Sans', 'alegreya-sans', 700],
  ['Alegreya Sans SC', 'alegreya-sans-sc', 500], ['Alegreya Sans SC', 'alegreya-sans-sc', 700]];

/** the typefaces, carried in the page when they are installed. Returns { html, carried } */
function fonts() {
  const file = ([, pkg, weight]) => path.join(ROOT, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-latin-${weight}-normal.woff2`);
  const carried = FACES.every(f => fs.existsSync(file(f)));
  return { carried, html: carried
    ? '<style>\n  /* Federant: Copyright (c) 2011 by Sorkin Type Co. Alegreya Sans and Alegreya Sans SC: Copyright 2013 The Alegreya Sans Project Authors.\n     Carried here under the SIL Open Font License, Version 1.1: https://openfontlicense.org */\n' + FACES.map(f => `  @font-face { font-family: "${f[0]}"; font-style: normal; font-weight: ${f[2]}; font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(file(f)).toString('base64')}) format("woff2"); }`).join('\n') + '\n</style>'
    : '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Federant&family=Alegreya+Sans:wght@400;500;700&family=Alegreya+Sans+SC:wght@500;700&display=swap" rel="stylesheet">' };
}

/** the game's content as the page carries it, after it has been checked. Throws when something cannot be right. */
function content({ saves } = {}) {
  const data = JSON.parse(read('content/data.json')), cast = JSON.parse(read('content/cast.json')), campaign = JSON.parse(read('content/campaign.json'));
  const people = cast.people, problems = [];
  for (const [key, p] of Object.entries(people)) {
    if (!(p.age >= 18)) problems.push(`${key}: everyone in the cast is an adult`);
    for (const k of ['name', 'role', 'about']) if (!p[k]) problems.push(`${key} has no ${k}`);
    for (const k of ['hello', 'win', 'lose']) if (!(p.lines && p.lines[k])) problems.push(`${key} has no line for ${k}`);
    if (!(p.realm >= 0 && p.realm <= 5)) problems.push(`${key}: realm is 0 to 5`);
  }
  const cards = new Set(data.cards.map(c => c.id)), heroes = new Set(data.leaders.map(l => l.id)), decks = new Set(data.decks.map(d => d.id));
  if (cards.size !== data.cards.length) problems.push('two cards share an id');
  for (const c of data.cards) { if (!c.text && c.type !== 0) problems.push(`${c.id} has no text`); if (!c.art) problems.push(`${c.id} has no art line`); if (c.id === c.src) problems.push(`${c.src} has no name of its own`); }
  for (const l of data.leaders) { if (!people[l.cast]) problems.push(`${l.id}: no one in the cast is ${l.cast}`); if (!l.text) problems.push(`${l.id} has no text`); }
  for (const q of data.quests) {
    if (!heroes.has(q.hero)) problems.push(`quest ${q.id}: no hero ${q.hero}`);
    if (!decks.has(q.deck) && q.deck !== 'player-clone') problems.push(`quest ${q.id}: no deck ${q.deck}`);
  }
  if (!decks.has('starter')) problems.push('there is no starter deck');
  // the campaign: every table, card, recipe and hero it names is in the game
  const quests = new Set(data.quests.map(q => q.id)), recipes = new Set(data.recipes.map(r => r.card));
  for (const r of campaign.regions) for (const id of [...r.tables, ...r.encore]) if (!quests.has(id)) problems.push(`${r.name}: no table ${id}`);
  for (const [k, m] of Object.entries(campaign.milestones.clear)) for (const id of m.recipes) if (!recipes.has(id)) problems.push(`region ${k} cleared: no recipe for ${id}`);
  for (const [k, m] of Object.entries(campaign.milestones.glazed)) {
    if (!cards.has(m.card)) problems.push(`region ${k} glazed: no card ${m.card}`);
    for (const id of m.recipes) if (!recipes.has(id)) problems.push(`region ${k} glazed: no recipe for ${id}`);
  }
  for (const m of campaign.milestones.stars) if (!heroes.has(m.hero)) problems.push(`${m.at} stars: no hero ${m.hero}`);
  for (const id of [...campaign.recruit, ...campaign.hidden]) if (!heroes.has(id)) problems.push(`no hero ${id}`);
  for (const q of data.quests) for (const c of q.conditions) if (c && !data.conditions[c]) problems.push(`quest ${q.id}: no condition ${c}`);
  // the roads around the campaign
  const M = campaign.mirror, fc = data.quests.filter(q => q.type === 'fc').map(q => q.id), placed = M.regions.flatMap(r => [...r.tables, ...r.bonus]);
  if (placed.length !== fc.length || fc.some(id => !placed.includes(id))) problems.push('Mirrorside does not hold every table of the mirror once');
  for (const id of [...M.heroes, campaign.velvet.lastForm]) if (!heroes.has(id)) problems.push(`no hero ${id}`);
  if (!cards.has(M.firstCard)) problems.push(`Mirrorside's first card ${M.firstCard} is no card`);
  for (const id of campaign.goldie.tables) if (!quests.has(id)) problems.push(`no treasure table ${id}`);
  if (!decks.has(campaign.goldie.hoard)) problems.push(`no hoard deck ${campaign.goldie.hoard}`);
  for (const r of data.rounds) { if (!quests.has(r.quest)) problems.push(`round ${r.round}: no table ${r.quest}`); if (r.prize.card && !cards.has(r.prize.card)) problems.push(`round ${r.round}: no card ${r.prize.card}`); }
  for (const c of campaign.cellars) for (const id of c.quests) if (!quests.has(id)) problems.push(`${c.name}: no table ${id}`);
  for (const c of campaign.ladder.cups) for (const p of c.prizes) if (p.card && !cards.has(p.card)) problems.push(`${c.name}: no card ${p.card}`);
  for (const c of campaign.commissions) { if (!cards.has(c.reward)) problems.push(`${c.name}: no card ${c.reward}`); if (!data.profiles[c.profile]) problems.push(`${c.name}: no profile ${c.profile}`); }
  for (const q of data.quests) for (const id of q.restricted) if (!heroes.has(id)) problems.push(`quest ${q.id}: no hero ${id}`);
  for (const [k, ch] of Object.entries(data.chests)) for (const [id] of ch.pool) if (!cards.has(id)) problems.push(`${k} chest: no card ${id}`);
  for (const [k, pl] of Object.entries(data.flips.pools)) for (const [id] of pl) if (!cards.has(id)) problems.push(`${k} flips: no card ${id}`);
  if (problems.length) throw new Error(problems.join('\n'));
  const drop = (o, keys) => { const r = Object.assign({}, o); for (const k of keys) delete r[k]; return r; };
  let service = cast.saves;
  if (saves !== undefined) service = saves === 'none' ? null : { api: saves, game: (cast.saves || {}).game || 'leadlight' };
  if (service) {
    const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(service.api || '');
    if (!(/^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(service.api || '') || (saves !== undefined && local))) throw new Error('saves.api is the address of the saves service, https and nothing after the host: ' + service.api);
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(service.game || '')) throw new Error('saves.game: small letters, digits and dashes');
  }
  return {
    data: { cards: data.cards.map(c => drop(c, ['src'])), leaders: data.leaders.map(l => drop(l, ['src', 'character'])), decks: data.decks.map(d => drop(d, ['src'])),
      quests: data.quests.map(q => drop(q, ['place'])), params: data.params, rankUp: data.rankUp, conditions: data.conditions, profiles: data.profiles,
      recipes: data.recipes.map(r => drop(r, ['src'])), chests: data.chests, flips: data.flips, xp: data.xp, rounds: data.rounds },
    campaign: Object.assign({}, campaign, { regions: campaign.regions.map(r => drop(r, ['place'])), cellars: campaign.cellars.map(c => drop(c, ['src'])) }),
    cast: { people }, saves: service || null,
  };
}

/** the page as text */
function page({ saves, home = true } = {}) {
  const shell = read('game/shell.html'), { html: faces, carried } = fonts();
  for (const mark of MARKS) if (!shell.includes(mark)) throw new Error('game/shell.html has lost its ' + mark);
  const c = content({ saves });
  const src = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.js')).sort();
  const js = `const CONTENT = ${JSON.stringify(c)};\n` + src.map(f => `/* ---- ${f} ---- */\n` + read('game/src/' + f)).join('\n');
  const engine = ENGINE.map(f => `/* ---- engine/${f} ---- */\n` + read('engine/' + f)).join('\n');
  const fill = {
    '/*__TITLE__*/': 'Leadlight',
    '<!--__ICON__-->': home ? '<link rel="icon" type="image/svg+xml" href="/favicon.svg">' : `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23e2a62e' stroke='%232b2830' stroke-width='3'/%3E%3Cpath d='M16 2v28M2 16h28' stroke='%232b2830' stroke-width='2'/%3E%3C/svg%3E">`,
    '<!--__FONTS__-->': faces,
    '<!--__HOME__-->': home ? '<a class="home" id="home" href="/">‹ <span class="far">Sonic Hub </span>Games</a>' : '',
    '/*__TAG__*/': 'A lane card game, set in stained glass.',
    '/*__ENGINE__*/': inScript(engine),
    '/*__JS__*/': inScript(js),
  };
  let html = shell;
  for (const mark of MARKS) html = html.replace(mark, () => fill[mark]);
  return { html, carried, content: c };
}

/** the page on which the cast is given other names, ages and pictures */
function adminPage(c) {
  const shell = read('game/admin.html'), { html: faces } = fonts();
  for (const mark of ['<!--__FONTS__-->', '/*__CAST__*/null']) if (!shell.includes(mark)) throw new Error('game/admin.html has lost its ' + mark);
  const realms = ['Amber Fields', 'Cobalt Downs', 'Bottle Fen', 'Cranberry Vale', 'Sandglass Dunes', 'Prism'];
  const casting = { api: (c.saves || {}).api || '', game: (c.saves || {}).game || '',
    rooms: realms.map((name, i) => ({ name, members: Object.entries(c.cast.people).filter(([, p]) => p.realm === i).map(([id, p]) => ({ id, name: p.name, age: p.age, role: p.role })) })).filter(r => r.members.length) };
  return shell.replace('<!--__FONTS__-->', () => faces).replace('/*__CAST__*/null', () => inScript(JSON.stringify(casting)));
}
module.exports = { page, adminPage, content, PORTAL };

if (require.main === module) {
  const flag = name => { const i = process.argv.indexOf('--' + name); if (i < 0) return undefined; const v = process.argv[i + 1]; if (!v || v.startsWith('--')) throw new Error(`--${name} needs something after it`); return v; };
  const saves = flag('saves'), one = flag('out'), dir = path.resolve(flag('dir') || PORTAL), served = !one && dir === PORTAL;
  if (saves !== undefined && served) throw new Error('--saves is for trying things out: give it somewhere else to write with --dir or --out');
  const kb = text => Math.round(Buffer.byteLength(text) / 1024) + ' KB';
  if (one) {
    const { html, carried } = page({ saves, home: false });
    fs.mkdirSync(path.dirname(path.resolve(one)), { recursive: true }); fs.writeFileSync(path.resolve(one), html);
    console.log(`built ${path.relative(process.cwd(), path.resolve(one))}, ${kb(html)}` + (carried ? '' : '  (typefaces not carried: run npm install first)'));
  } else {
    const { html, carried, content: c } = page({ saves });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'leadlight.html'), html);
    fs.writeFileSync(path.join(dir, 'leadlight-admin.html'), adminPage(c));
    console.log(`built ${path.relative(process.cwd(), path.join(dir, 'leadlight.html'))}, ${kb(html)}, with its cast page` + (carried ? '' : '  (typefaces not carried: run npm install first)'));
    console.log(c.saves ? `  players kept with ${c.saves.api} as ${c.saves.game}` : '  players kept in the browser only');
  }
}
