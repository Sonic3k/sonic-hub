#!/usr/bin/env node
/* The arena: every bot in bots/, at every level it has, plays every other on both boards, and each gets a rating on
   each board: what it is worth on 5 × 5 and what it is worth on 7 × 7 are two different things.

     node arena/arena.js                 all against all, on both boards, 12 games a pair on each, a second a move at most
     node arena/arena.js --games 24      more games a pair on each board
     node arena/arena.js --size 7        one board only (5 or 7)
     node arena/arena.js --ms 400        the time a bot is asked to stay within for a move
     node arena/arena.js --only house    only players whose name has this in it (several: house,opus)
     node arena/arena.js --vs opus       only pairs with such a player in them: a new bot against everyone
     node arena/arena.js --jobs 2        how many pairs are played at once (default: one a processor)
     node arena/arena.js --keep          start from the results already in arena/results.json and add to them

   Each side of a pair has Red, who draws first, as often as Gold. A bot that breaks, plays a move it may not, or
   takes more than three times its allowance over a move loses that game. A table for each board comes out at the
   end; arena/results.json keeps every pair's score on each board, so a later run can add a newcomer without playing
   the rest again. The ratings the game goes by are the league's (league.js), not these. */
const fs = require('fs'), path = require('path'), os = require('os'), { fork } = require('child_process');
const { ROOT, rules, Player, playGame, fit } = require('./lib');

/** What the scale hangs from: the first of these that is playing keeps its number, and everyone else is placed around
 *  it. house:easy is the game's own mark. Where the house bot is not there (the kit that goes out to whoever writes a
 *  new bot), greedy stands in at about the number it has among the house bots, so ratings there read on much the
 *  same scale. */
const PINS = [['house:easy', 600], ['greedy:greedy', 900]];
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i < 0 ? dflt : process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]; };
const botFile = bot => path.join(ROOT, 'bots', bot + '.js');

if (process.argv.includes('--child')) {
  // one pair on one board at a time, handed over by the parent
  const R = rules();
  process.on('message', t => {
    const A = new Player(botFile(t.a.bot), t.a.level), B = new Player(botFile(t.b.bot), t.b.level);
    const out = { size: t.size, a: A.id, b: B.id, wa: 0, wb: 0, plies: 0, forfeits: [], redWins: 0, squaresA: 0, squaresB: 0 };
    for (let g = 0; g < t.games; g++) {
      const aRed = g % 2 === 0, r = playGame(R, aRed ? A : B, aRed ? B : A, { size: t.size, timeMs: t.ms, seed: t.seed + g });
      if ((r.winner === R.RED) === aRed) out.wa++; else out.wb++;
      if (r.winner === R.RED) out.redWins++;
      out.squaresA += r.score[aRed ? 0 : 1]; out.squaresB += r.score[aRed ? 1 : 0];
      out.plies += r.plies; if (r.forfeit && out.forfeits.length < 5) out.forfeits.push(r.forfeit);
    }
    out.time = [A, B].map(p => ({ id: p.id, mean: p.moves ? p.msTotal / p.moves : 0, max: p.msMax, late: p.late, moves: p.moves }));
    process.send(out);
  });
} else main();

function main() {
  const games = +arg('games', 12), ms = +arg('ms', 1000), jobs = +arg('jobs', os.cpus().length) || 1;
  const sizes = arg('size') === undefined ? [5, 7] : [+arg('size')];
  if (sizes.some(n => n !== 5 && n !== 7)) throw new Error('--size is 5 or 7');
  const only = typeof arg('only') === 'string' ? arg('only').split(',') : null, vs = typeof arg('vs') === 'string' ? arg('vs').split(',') : null;
  const resultsFile = path.join(__dirname, 'results.json');

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
  for (const size of sizes) for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    if (vs && !has(pool[i], vs) && !has(pool[j], vs)) continue;
    tasks.push({ size, a: pool[i], b: pool[j], games, ms, seed: 1000 * (i + 1) + 17 * (j + 1) + size });
  }
  tasks.sort((x, y) => y.size - x.size);                     // the long games first, so that the processors finish together
  console.log(`${pool.length} players, ${tasks.length / sizes.length} pairs on ${sizes.map(n => n + ' × ' + n).join(' and ')}, ${games} games a pair on each, ${ms} ms a move, ${Math.min(jobs, tasks.length)} at a time`);

  const done = []; let next = 0, running = 0;
  const finish = () => {
    // a pair played again on a board replaces what was kept of it there
    const key = p => p.size + ' ' + [p.a, p.b].sort().join(' ');
    const fresh = new Set(done.map(key)), pairs = old.filter(p => !fresh.has(key(p))).concat(done);
    fs.writeFileSync(resultsFile, JSON.stringify({ ms, pairs }, null, 1) + '\n');
    for (const size of [5, 7]) report(players, pairs.filter(p => p.size === size), size);
    console.log(`\nwritten: ${path.relative(ROOT, resultsFile)}`);
  };
  if (!tasks.length) return finish();
  for (let k = 0; k < Math.min(jobs, tasks.length); k++) {
    const child = fork(__filename, ['--child']);
    const give = () => { if (next < tasks.length) { running++; child.send(tasks[next++]); } else child.disconnect(); };
    child.on('message', r => {
      running--; done.push(r);
      const slow = r.time.filter(t => t.late).map(t => `${t.id} over its time ${t.late}×, worst ${Math.round(t.max)} ms`).join('; ');
      console.log(`${r.size}×${r.size}  ${r.a} v ${r.b}: ${r.wa}–${r.wb}  (squares ${r.squaresA}–${r.squaresB}; Red won ${r.redWins} of ${r.wa + r.wb})${r.forfeits.length ? `  FORFEIT ${r.forfeits[0].by}: ${r.forfeits[0].why}` : ''}${slow ? '  [' + slow + ']' : ''}`);
      give();
      if (!running && next >= tasks.length) finish();
    });
    give();
  }
}

function report(players, pairs, size) {
  const ids = [...new Set(pairs.flatMap(p => [p.a, p.b]))];
  if (!ids.length) return;
  const anchor = PINS.find(pin => ids.includes(pin[0])) || [ids[0], 1500];
  const R = fit(ids, pairs.map(p => ({ a: p.a, b: p.b, wa: p.wa, wb: p.wb, dr: 0 })), anchor);
  const rows = ids.map(id => {
    const mine = pairs.filter(p => p.a === id || p.b === id);
    let w = 0, l = 0, sf = 0, sa = 0;
    for (const p of mine) { const a = p.a === id; w += a ? p.wa : p.wb; l += a ? p.wb : p.wa; sf += a ? p.squaresA : p.squaresB; sa += a ? p.squaresB : p.squaresA; }
    const who = players.find(p => p.id === id) || { author: '?' };
    return { id, rating: Math.round(R[id]), won: w, lost: l, sf, sa, author: who.author };
  }).sort((x, y) => y.rating - x.rating);
  console.log(`\n${size} × ${size}\nrating  player                 won  lost  squares for–against   by`);
  for (const r of rows) console.log(`${String(r.rating).padStart(6)}  ${r.id.padEnd(20)} ${String(r.won).padStart(5)} ${String(r.lost).padStart(5)}  ${String(r.sf).padStart(7)}–${String(r.sa).padEnd(7)}      ${r.author}`);
  const forfeits = pairs.flatMap(p => p.forfeits || []);
  if (forfeits.length) console.log(`forfeits: ${[...new Set(forfeits.map(f => f.by + ' — ' + f.why))].join('; ')}`);
}
