#!/usr/bin/env node
/* The arena: every bot in bots/, at every level it has, plays every other, and each gets a rating on one scale.

     node arena/arena.js                 all against all, 30 games a pair, a second a move at most
     node arena/arena.js --games 60      more games a pair
     node arena/arena.js --ms 400        the time a bot is asked to stay within for a move
     node arena/arena.js --only house    only players whose name has this in it (several: house,opus)
     node arena/arena.js --vs opus       only pairs with such a player in them: a new bot against everyone
     node arena/arena.js --jobs 2        how many pairs are played at once (default: one a processor)
     node arena/arena.js --keep          start from the results already in arena/results.json and add to them

   Each side of a pair has Dark as often as Light. A bot that breaks, plays a move it may not, or takes more than
   three times its allowance over a move loses that game. The table and arena/ratings.json come out at the end;
   arena/results.json keeps every pair's score so a later run can add a newcomer without replaying the rest. */
const fs = require('fs'), path = require('path'), os = require('os'), { fork } = require('child_process');
const { ROOT, rules, Player, playGame, fit } = require('./lib');

/** What the scale hangs from: the first of these that is playing keeps its number, and everyone else is placed around
 *  it. house:new is the game's own mark. Where the house bot is not there (the kit that goes out to whoever writes a
 *  new bot), greedy stands in at the number it has among the house bots, so ratings there read on the same scale. */
const PINS = [['house:new', 600], ['greedy:greedy', 650]];
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i < 0 ? dflt : process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]; };
const botFile = bot => path.join(ROOT, 'bots', bot + '.js');

if (process.argv.includes('--child')) {
  // one pair at a time, handed over by the parent
  const R = rules();
  process.on('message', t => {
    const A = new Player(botFile(t.a.bot), t.a.level), B = new Player(botFile(t.b.bot), t.b.level);
    const out = { a: A.id, b: B.id, wa: 0, wb: 0, dr: 0, plies: 0, forfeits: [], darkWins: 0, discsA: 0, discsB: 0 };
    for (let g = 0; g < t.games; g++) {
      const aDark = g % 2 === 0, r = playGame(R, aDark ? A : B, aDark ? B : A, { timeMs: t.ms, seed: t.seed + g });
      if (r.winner < 0) out.dr++; else if ((r.winner === R.DARK) === aDark) out.wa++; else out.wb++;
      if (r.winner === R.DARK) out.darkWins++;
      out.discsA += r.discs[aDark ? 0 : 1]; out.discsB += r.discs[aDark ? 1 : 0];
      out.plies += r.plies; if (r.forfeit && out.forfeits.length < 5) out.forfeits.push(r.forfeit);
    }
    out.time = [A, B].map(p => ({ id: p.id, mean: p.moves ? p.msTotal / p.moves : 0, max: p.msMax, late: p.late, moves: p.moves }));
    process.send(out);
  });
} else main();

function main() {
  const games = +arg('games', 30), ms = +arg('ms', 1000), jobs = +arg('jobs', os.cpus().length) || 1;
  const only = typeof arg('only') === 'string' ? arg('only').split(',') : null, vs = typeof arg('vs') === 'string' ? arg('vs').split(',') : null;
  const resultsFile = path.join(__dirname, 'results.json'), ratingsFile = path.join(__dirname, 'ratings.json');

  // who is playing
  const players = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'bots')).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort()) {
    const probe = new Player(path.join(ROOT, 'bots', f));
    if (probe.error) { console.log(`${f}: left out — ${probe.error}`); continue; }
    for (const level of probe.info.levels) players.push({ id: path.basename(f, '.js') + ':' + level, bot: path.basename(f, '.js'), level, name: probe.info.name, author: probe.info.author });
  }
  const has = (p, words) => words.some(w => p.id.includes(w));
  const pool = only ? players.filter(p => has(p, only)) : players;
  const old = arg('keep') && fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, 'utf8')).pairs : [];
  const tasks = [];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    if (vs && !has(pool[i], vs) && !has(pool[j], vs)) continue;
    tasks.push({ a: pool[i], b: pool[j], games, ms, seed: 1000 * (i + 1) + 17 * (j + 1) });
  }
  console.log(`${pool.length} players, ${tasks.length} pairs, ${games} games a pair, ${ms} ms a move, ${Math.min(jobs, tasks.length)} at a time`);

  const done = []; let next = 0, running = 0;
  const finish = () => {
    // a pair played again replaces what was kept of it
    const key = p => [p.a, p.b].sort().join(' ');
    const fresh = new Set(done.map(key)), pairs = old.filter(p => !fresh.has(key(p))).concat(done);
    fs.writeFileSync(resultsFile, JSON.stringify({ ms, pairs }, null, 1) + '\n');
    report(players, pairs, ratingsFile, ms);
  };
  if (!tasks.length) return finish();
  for (let k = 0; k < Math.min(jobs, tasks.length); k++) {
    const child = fork(__filename, ['--child']);
    const give = () => { if (next < tasks.length) { running++; child.send(tasks[next++]); } else child.disconnect(); };
    child.on('message', r => {
      running--; done.push(r);
      const slow = r.time.filter(t => t.late).map(t => `${t.id} over its time ${t.late}×, worst ${Math.round(t.max)} ms`).join('; ');
      console.log(`${r.a} v ${r.b}: ${r.wa}–${r.wb}${r.dr ? ` (${r.dr} drawn)` : ''}${r.forfeits.length ? `  FORFEIT ${r.forfeits[0].by}: ${r.forfeits[0].why}` : ''}${slow ? '  [' + slow + ']' : ''}`);
      give();
      if (!running && next >= tasks.length) finish();
    });
    give();
  }
}

function report(players, pairs, ratingsFile, ms) {
  const ids = [...new Set(pairs.flatMap(p => [p.a, p.b]))];
  if (!ids.length) return console.log('nothing played');
  const anchor = PINS.find(pin => ids.includes(pin[0])) || [ids[0], 1500];
  const R = fit(ids, pairs, anchor);
  const rows = ids.map(id => {
    const mine = pairs.filter(p => p.a === id || p.b === id);
    let w = 0, l = 0, d = 0; for (const p of mine) { const a = p.a === id; w += a ? p.wa : p.wb; l += a ? p.wb : p.wa; d += p.dr; }
    const who = players.find(p => p.id === id) || { name: '?', author: '?', bot: id.split(':')[0], level: id.split(':')[1] };
    return { id, bot: who.bot, level: who.level, name: who.name, author: who.author, rating: Math.round(R[id]), won: w, lost: l, drawn: d };
  }).sort((x, y) => y.rating - x.rating);
  console.log('\nrating  player                 won  lost drawn   by');
  for (const r of rows) console.log(`${String(r.rating).padStart(6)}  ${r.id.padEnd(20)} ${String(r.won).padStart(5)} ${String(r.lost).padStart(5)} ${String(r.drawn).padStart(5)}   ${r.author}`);
  const forfeits = pairs.flatMap(p => p.forfeits || []);
  if (forfeits.length) console.log(`\nforfeits: ${[...new Set(forfeits.map(f => f.by + ' — ' + f.why))].join('; ')}`);
  fs.writeFileSync(ratingsFile, JSON.stringify({ anchor: { id: anchor[0], rating: anchor[1] }, ms, players: rows }, null, 1) + '\n');
  console.log(`\nwritten: ${path.relative(ROOT, ratingsFile)}`);
}
