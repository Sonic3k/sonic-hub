#!/usr/bin/env node
/* The page's tests: it builds from what is in the folder, its scripts compile together as the browser runs them, and
   the rules a deck is held to are the original's.

     node game/build.test.js */
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path'), os = require('os');
const build = require('./build.js');
let failures = 0;
const test = (name, fn) => { try { fn(); console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } };
const ROOT = path.join(__dirname, '..');

let built;
test('the page builds, its content checked', () => {
  built = build.page({ saves: 'none' });
  assert.ok(built.html.length < 2.6e6, 'the page stays under 2.6 MB: ' + built.html.length);
  for (const mark of ['/*__TITLE__*/', '<!--__FONTS__-->', '/*__ENGINE__*/', '/*__JS__*/']) assert.ok(!built.html.includes(mark), mark + ' was filled');
  assert.strictEqual(built.content.saves, null);
  const served = build.page({});
  assert.deepStrictEqual(served.content.saves, JSON.parse(fs.readFileSync(path.join(ROOT, 'content/cast.json'))).saves);
});
test('its scripts compile together, with no name given twice', () => {
  const scripts = [...built.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.strictEqual(scripts.length, 2);
  new vm.Script(scripts.join('\n;\n'), { filename: 'leadlight.html' });
});
test('the cast page builds with every woman of the cast on it', () => {
  const c = build.content({ saves: 'none' }), admin = build.adminPage(build.content({}));
  const m = admin.match(/const CASTING = (.*?);\n/);
  const casting = JSON.parse(m ? m[1] : admin.slice(admin.indexOf('{"api"'), admin.indexOf('</script>')).split(';')[0]);
  const listed = casting.rooms.flatMap(r => r.members.map(x => x.id)).sort();
  assert.deepStrictEqual(listed, Object.keys(c.cast.people).sort());
});
/** the engine and the page's model, as the page runs them, in a sandbox */
function model() {
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, Number, String, Set, Map, Error });
  const engine = ['core.js', 'scripts.js', 'match.js', 'catalog.js'].map(f => fs.readFileSync(path.join(ROOT, 'engine', f), 'utf8')).join('\n;\n');
  const words = "const REALMS = ['Amber Fields', 'Cobalt Downs', 'Bottle Fen', 'Cranberry Vale', 'Sandglass Dunes', 'Prism']; const KINDS = ['Creature', 'Building', 'Spell'];";
  const src = ['40-model.js', '42-progress.js'].map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n;\n');
  vm.runInContext(engine + `\n;const CONTENT = ${JSON.stringify(build.content({ saves: 'none' }))};\n` + words + '\n' + src + `
;this.T = { DATA, ROW, HERO, QUEST, RECIPE, CAMPAIGN, REGIONS, MAIN, Chance, xpTable, xpForRank, rankForXp, heroRank, addHero, ownCount, cardsHeld,
  creaturesHeld, addCard, removeCards, sellBlock, sell, tableOpen, starsTotal, nextTable, meetsCondition, conditionText, lootRoll, tableDrops,
  recipeOpen, openRecipes, craftBlock, craft, chestPrice, chestBlock, openChest, flipDraw, starterDeck, newSave, mendSave, settleWin, settleLoss,
  grantMilestones, deckIssues, autoLands, landsOf, deckMax, MIN_CREATURES, RECRUIT_SURE };`, ctx);
  return ctx.T;
}
const M = model();
const blank = () => ({ turns: 4, hpLost: 0, lost: 0, defeated: 3, floops: 0, types: [6, 0, 0], factions: [6, 0, 0, 0, 0, 0], apTotal: 6, apMaxCard: 1, landscapes: 2, deckCost: 12 });
const withRand = (v, fn) => { const keep = M.Chance.rand; M.Chance.rand = typeof v === 'function' ? v : () => v; try { return fn(); } finally { M.Chance.rand = keep; } };

test('a deck is held to the original\'s rules', () => {
  const T = M, starter = T.starterDeck();
  assert.strictEqual(starter.cards.length, 12); assert.strictEqual(starter.hero, 'maple');
  assert.deepStrictEqual(Array.from(T.landsOf(starter)), [0, 0, 0, 2], 'the starter deck lays the lands the original\'s data gives it');
  assert.strictEqual(T.deckMax(1), 15); assert.strictEqual(T.deckMax(30), 40);
  assert.strictEqual(T.deckIssues(starter).length, 0);
  assert.strictEqual(T.deckIssues({ cards: starter.cards.slice(0, 9) }).length, 1, 'fewer than ten cards');
  assert.strictEqual(T.deckIssues({ cards: Array(5).fill(starter.cards[0]).concat(starter.cards.slice(5)) }).length, 1, 'five of one card');
  const sixteen = Object.keys(T.ROW).slice(0, 16);
  assert.strictEqual(T.deckIssues({ cards: sixteen }, 1).length, 1, 'sixteen cards for a rank 1 hero'); assert.strictEqual(T.deckIssues({ cards: sixteen }, 2).length, 0, 'sixteen for rank 2');
  assert.strictEqual(T.deckIssues(starter, 1, { [starter.cards[0]]: 1 }).length, 1, 'more of a card than is owned');
  const ids = n => Object.keys(T.ROW).filter(id => T.ROW[id].faction === n && T.ROW[id].type === 0);
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(1).slice(0, 3), ...ids(3).slice(0, 7), ...ids(4).slice(0, 2)])), [3, 3, 1, 4], 'three realms: the first takes two lanes');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(0).slice(0, 7), ...ids(1).slice(0, 3)])), [0, 0, 0, 1], 'two realms, the first 65% or more: three lanes');
  assert.deepStrictEqual(Array.from(T.autoLands([...ids(5).slice(0, 10)])), [0, 0, 0, 0], 'only Prism cards: the first realm on every lane');
});
test('a hero\'s rank follows her XP as XPManager has it', () => {
  const t = M.xpTable('A');
  assert.deepStrictEqual(Array.from(t.slice(0, 6)), [0, 106, 595, 1638, 3363, 5874]);
  assert.strictEqual(t[49], 1766000, 'rank 50');
  for (let i = 1; i < 60; i++) assert.ok(t[i] > t[i - 1]);
  assert.strictEqual(M.rankForXp(0), 1); assert.strictEqual(M.rankForXp(105), 1); assert.strictEqual(M.rankForXp(106), 2); assert.strictEqual(M.rankForXp(1766000), 50);
  const s = M.newSave(); M.addHero(s, 'mabel');
  assert.strictEqual(M.heroRank(s, 'mabel'), M.HERO.mabel.startLevel, 'a hero joins at her own starting rank');
});
test('a new player, and older saves', () => {
  const s = M.newSave();
  assert.strictEqual(s.coins, Number(M.DATA.params.New_Player_Coins)); assert.strictEqual(s.jewels, Number(M.DATA.params.New_Player_Gems));
  assert.deepStrictEqual(Object.keys(s.heroes), ['maple']); assert.strictEqual(M.cardsHeld(s), 12); assert.strictEqual(s.freePremium, true);
  const old = M.mendSave({ v: 1, decks: [{ name: 'x', hero: 'wren', cards: ['huskling'] }], options: { autoSpin: true } });
  assert.strictEqual(old.v, 2); assert.strictEqual(old.options.autoSpin, true); assert.deepStrictEqual(Object.keys(old.heroes), ['maple'], 'the first part\'s players start over');
  const odd = M.mendSave(Object.assign(M.newSave(), { coins: -5, stars: { 1: 9, nope: 2 }, heroes: { maple: 10, nobody: 4 }, decks: [{ name: 'y', hero: 'wren', cards: Array(4).fill('huskling').concat(['owl-archivist', 'no-card']) }] }));
  assert.strictEqual(odd.coins, 0); assert.strictEqual(odd.stars['1'], 3); assert.ok(!('nope' in odd.stars)); assert.ok(!('nobody' in odd.heroes));
  assert.strictEqual(odd.decks[0].hero, 'maple', 'a deck led by a hero she does not have is led by the first'); assert.deepStrictEqual(Array.from(odd.decks[0].cards), Array(4).fill('huskling'), 'a deck holds only what she owns');
});
test('the tables open as the original opens them, and the encore road after the first region', () => {
  const s = M.newSave(), win = id => M.settleWin(s, M.QUEST[id], { hero: 'maple', stats: blank(), earned: [], coins: 0 });
  assert.ok(M.tableOpen(s, '1') && !M.tableOpen(s, '2'));
  win('1'); assert.ok(M.tableOpen(s, '2'));
  for (let i = 2; i <= 14; i++) win(String(i));
  assert.ok(!M.tableOpen(s, '16') && !M.tableOpen(s, '8001'));
  const res = win('15');
  assert.ok(M.tableOpen(s, '16') && M.tableOpen(s, '8001')); assert.ok(res.opened.includes('16') && res.opened.includes('8001'));
  assert.ok(M.CAMPAIGN.milestones.clear[1].recipes.every(id => res.recipes.includes(id)), 'the region cleared opens its two Kiln recipes');
  win('8001'); assert.ok(M.tableOpen(s, '8002'));
  assert.strictEqual(M.REGIONS.length, 8); assert.strictEqual(M.MAIN.length, 180);
});
test('a table\'s stars, one a win, each its condition in turn; the third brings a Jewel', () => {
  const s = M.newSave(), q = M.QUEST['1'], st = blank();
  assert.deepStrictEqual(Array.from(q.conditions), ['JustWin', 'Forbid_Spells', 'OnlyLose5Creatures']);
  let r = M.settleWin(s, q, { hero: 'maple', stats: st, earned: [], coins: 0 }); assert.strictEqual(r.stars, 1); assert.ok(r.newlyCleared);
  r = M.settleWin(s, q, { hero: 'maple', stats: Object.assign(blank(), { types: [5, 0, 1] }), earned: [], coins: 0 }); assert.strictEqual(r.stars, 1, 'a spell played: no second star'); assert.strictEqual(r.met, false);
  r = M.settleWin(s, q, { hero: 'maple', stats: st, earned: [], coins: 0 }); assert.strictEqual(r.stars, 2);
  const j = s.jewels; r = M.settleWin(s, q, { hero: 'maple', stats: Object.assign(blank(), { lost: 5 }), earned: [], coins: 0 }); assert.strictEqual(r.stars, 3); assert.strictEqual(s.jewels, j + 1);
  r = M.settleWin(s, q, { hero: 'maple', stats: st, earned: [], coins: 0 }); assert.strictEqual(r.stars, 3); assert.strictEqual(r.condition, null); assert.strictEqual(s.jewels, j + 1);
});
test('the conditions judge the battle as StatsMeetCondition does', () => {
  const ok = (id, change) => M.meetsCondition(id, Object.assign(blank(), change));
  assert.ok(ok('Only_Corn', {})); assert.ok(!ok('Only_Corn', { factions: [5, 1, 0, 0, 0, 0] })); assert.ok(!ok('Forbid_Corn', {}));
  assert.ok(ok('Only_Creatures', {})); assert.ok(!ok('Only_Creatures', { types: [5, 1, 0] })); assert.ok(ok('Forbid_Spells', { types: [5, 2, 0] }));
  assert.ok(ok('FastWin5', { turns: 5 })); assert.ok(!ok('FastWin5', { turns: 6 }));
  assert.ok(ok('Defeat5', { defeated: 5 })); assert.ok(!ok('Defeat5', { defeated: 4 })); assert.ok(ok('Deafeat10', { defeated: 10 }));
  assert.ok(ok('Only1PointCards', { apMaxCard: 1 })); assert.ok(!ok('Only1PointCards', { apMaxCard: 2 }));
  assert.ok(ok('Only15Points', { apTotal: 15 })); assert.ok(!ok('Only15Points', { apTotal: 16 }));
  assert.ok(ok('Only5HP', { hpLost: 5 })); assert.ok(!ok('Only5HP', { hpLost: 6 }));
  assert.ok(ok('OnlyLose2Creatures', { lost: 2 })); assert.ok(!ok('OnlyLose2Creatures', { lost: 3 }));
  assert.ok(ok('Landscapes_Three', { landscapes: 3 })); assert.ok(!ok('Landscapes_Three', { landscapes: 2 }));
  assert.ok(ok('MaxCost30', { deckCost: 30 })); assert.ok(!ok('MaxCost30', { deckCost: 31 }));
  assert.ok(ok('MaxFloop1', { floops: 1 })); assert.ok(!ok('MaxFloop1', { floops: 2 })); assert.ok(!ok('No-such-condition', {}));
  for (const id of Object.keys(M.DATA.conditions)) assert.ok(M.conditionText(id).length > 3, id);
  assert.strictEqual(M.conditionText('Only15Points'), 'Win spending no more than 15 Light on cards.', 'the number of the condition itself, not the original\'s copied words');
});
test('a win pays as Process1PWinCommon pays: XP and coins in the table\'s ranges, the cards found, the hero of a first win', () => {
  const s = M.newSave(), q = M.QUEST['3'], li = v => Math.floor(v + 0.5);
  s.stars['1'] = 3; s.stars['2'] = 1;
  const lo = withRand(0, () => M.settleWin(s, q, { hero: 'maple', stats: blank(), earned: ['owl-archivist'], coins: 75 }));
  assert.strictEqual(lo.xp, li(q.xp[0])); assert.strictEqual(lo.reward, li(q.coins[0])); assert.strictEqual(lo.coins, lo.reward + 75);
  assert.strictEqual(M.ownCount(s, 'owl-archivist'), 1); assert.ok(lo.joined.some(j => j.id === q.heroAwarded), 'her hero joins on the first win');
  const hi = withRand(0.999999, () => M.settleWin(s, q, { hero: 'maple', stats: blank(), earned: [], coins: 0 }));
  assert.strictEqual(hi.xp, li(q.xp[1]) - 1, 'Random.Range never gives its top'); assert.strictEqual(hi.reward, li(q.coins[1]) - 1);
  assert.strictEqual(hi.joined.length, 0, 'only the first win brings her');
  const t = M.newSave(); M.settleLoss(t, q); assert.strictEqual(t.losses['3'], 1); assert.strictEqual(t.coins, 0);
});
test('a hero who sits at tables and was never given comes over, the fifth win surely', () => {
  const s = M.newSave(), q = M.MAIN.find(x => M.CAMPAIGN.recruit.includes(x.hero));
  assert.ok(q, 'some main table has one');
  const chances = [];
  for (let i = 0; i < 4; i++) { const r = withRand(0.99, () => M.settleWin(s, q, { hero: 'maple', stats: blank(), earned: [], coins: 0 })); chances.push(r.recruitChance); assert.ok(s.heroes[q.hero] === undefined); }
  assert.deepStrictEqual(chances, [0.2, 0.4, 0.6, 0.8]);
  const r = withRand(0.99, () => M.settleWin(s, q, { hero: 'maple', stats: blank(), earned: [], coins: 0 }));
  assert.strictEqual(r.recruitChance, 1); assert.ok(s.heroes[q.hero] !== undefined);
});
test('what a beaten creature leaves, as DeathActions rolls it', () => {
  const q = M.QUEST['1'], drops = M.tableDrops(q);
  assert.ok(drops.length === 4);
  assert.ok(drops.includes(withRand(0, () => M.lootRoll(q, 0)).card), 'a card from the table\'s drops');
  // the first table's coin chances are written as 50: compared with a roll from 0 to 1, coins always come when no card does
  assert.ok(withRand(0.999, () => M.lootRoll(q, 0)).coins > 0, 'no card, then coins');
  const sparse = M.MAIN.find(x => { const p = M.DATA.profiles[x.dropProfile]; return p && p.coinChance[0] > 0 && p.coinChance[0] < 1; });
  if (sparse) assert.strictEqual(withRand(0.9999, () => M.lootRoll(sparse, 0)), null, 'a table whose coin chance is below one may give nothing');
  assert.strictEqual(withRand(0, () => M.lootRoll(q, q.maxLoot)), null, 'nothing more once the table\'s most cards have dropped');
});
test('the Kiln: what opens a recipe, what keeps it from the fire, and the firing', () => {
  const s = M.newSave(), first = M.openRecipes(s);
  assert.ok(first.length >= 1 && first.every(r => r.unlock === '0'));
  const r = M.DATA.recipes.find(x => x.unlock === '4'); assert.ok(!M.recipeOpen(s, r)); s.stars['4'] = 1; assert.ok(M.recipeOpen(s, r));
  s.coins = 0; assert.ok(/costs/.test(M.craftBlock(s, r)) || r.cost === 0);
  s.coins = 1e6; for (const [id, k] of r.needs) s.cards[id] = (s.cards[id] || 0) + k;
  const before = Object.fromEntries(r.needs.map(([id]) => [id, M.ownCount(s, id)]));
  assert.strictEqual(M.craftBlock(s, r), '');
  assert.ok(M.craft(s, r)); assert.strictEqual(M.ownCount(s, r.card) >= 1, true); assert.strictEqual(s.coins, 1e6 - r.cost);
  for (const [id, k] of r.needs) assert.strictEqual(M.ownCount(s, id), before[id] - k);
  const t = M.newSave(); t.coins = 1e6; t.cards = { huskling: 10 };
  const building = M.DATA.recipes.find(x => M.ROW[x.card].type !== 0 && M.ROW[x.card].fuse);
  const trial = Object.assign({}, building, { needs: [['huskling', 1]], cost: 0 });
  assert.ok(/at least/.test(M.craftBlock(t, trial)), 'a recipe that would leave fewer than ten creatures waits');
  t.cards.huskling = 11; assert.strictEqual(M.craftBlock(t, trial), '');
});
test('selling keeps what CWSellButton keeps, and takes the card from the decks', () => {
  const s = M.newSave();
  assert.strictEqual(M.sellBlock(s, 'huskling'), '', 'the starter\'s twelve creatures: two may go');
  for (let i = 0; i < 2; i++) assert.ok(M.sell(s, 'huskling'));
  assert.ok(/at least/.test(M.sellBlock(s, 'huskling')), 'ten creatures are kept');
  assert.strictEqual(s.coins, 2 * M.ROW.huskling.sale);
  assert.strictEqual(s.decks[0].cards.filter(x => x === 'huskling').length, 2, 'the deck no longer holds what was sold');
});
test('the chests: the first premium free, then their prices; one card from their pools', () => {
  const s = M.newSave();
  assert.deepStrictEqual(Object.assign({}, M.chestPrice(s, 'premium')), { coins: 0, jewels: 0 });
  const id = M.openChest(s, 'premium'); assert.ok(M.ROW[id]); assert.strictEqual(s.freePremium, false); assert.strictEqual(s.jewels, 5);
  assert.deepStrictEqual(Object.assign({}, M.chestPrice(s, 'premium')), { coins: 0, jewels: 3 });
  assert.deepStrictEqual(Object.assign({}, M.chestPrice(s, 'normal')), { coins: 10000, jewels: 0 });
  assert.ok(M.chestBlock(s, 'normal')); s.coins = 10000; assert.ok(M.ROW[M.openChest(s, 'normal')]); assert.strictEqual(s.coins, 0);
  const holiday = M.DATA.cards.filter(c => c.holiday);
  assert.ok(holiday.length > 0 && holiday.every(c => [...M.DATA.chests.normal.pool, ...M.DATA.chests.premium.pool, ...M.DATA.flips.pools.standard].some(([x]) => x === c.id)), 'the holiday cards come as standard cards do');
});
test('the cards turned over after a win: their edition by the gift\'s odds, the card from that edition\'s pool', () => {
  const tiers = Object.fromEntries(M.DATA.flips.tiers); assert.deepStrictEqual(tiers, { standard: 30000, obsidian: 10, gilded: 5000 });
  assert.strictEqual(withRand(0, () => M.flipDraw()).tier, 'standard');
  assert.strictEqual(withRand(0.99999, () => M.flipDraw()).tier, 'gilded');
  const d = M.flipDraw(); assert.ok(M.DATA.flips.pools[d.tier].some(([x]) => x === d.card));
  assert.strictEqual(M.DATA.flips.retry, 1);
});
test('the milestones give once: a card for a region glazed, heroes at star totals', () => {
  const s = M.newSave(), r0 = M.REGIONS[0];
  for (const q of r0.tables) s.stars[q.id] = 3;
  const g = M.grantMilestones(s);
  assert.ok(g.some(x => x.kind === 'card' && x.id === M.CAMPAIGN.milestones.glazed[1].card));
  assert.ok(g.some(x => x.kind === 'hero' && x.id === M.CAMPAIGN.milestones.stars[0].hero), 'forty-five stars pass the first milestone');
  assert.strictEqual(M.grantMilestones(s).length, 0, 'and only once');
  assert.ok(M.CAMPAIGN.milestones.clear[1].recipes.every(id => M.recipeOpen(s, M.RECIPE[id])), 'the first region cleared opens its recipes');
});
test('the build writes both pages where it is told', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leadlight-'));
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--dir', dir, '--saves', 'none'], { stdio: 'pipe' });
  assert.ok(fs.statSync(path.join(dir, 'leadlight.html')).size > 100000);
  assert.ok(fs.readFileSync(path.join(dir, 'leadlight-admin.html'), 'utf8').includes('Leadlight: the cast'));
});
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
