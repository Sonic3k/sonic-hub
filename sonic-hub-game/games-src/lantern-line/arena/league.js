#!/usr/bin/env node
/* A league on each board: every player meets every other in rounds, once with Red (who draws first) and once with
   Gold in each round. Three points for a win, one for a draw (there is none on these boards), none for a loss. The
   5 × 5 and the 7 × 7 boards are two leagues, kept apart: a player stands where it stands on each. The table comes
   out at the end of each, with each player's rating there.

     node arena/league.js                         all the bots in bots/, at every level they have, three rounds, on both boards
     node arena/league.js --size 7                on one board only (5 or 7)
     node arena/league.js --rounds 4              more rounds (or fewer)
     node arena/league.js --without random,greedy leave out players whose name has one of these in it
     node arena/league.js --only house,eclipse    only players whose name has one of these in it
     node arena/league.js --ms 1000               the time a bot is asked to stay within for a move
     node arena/league.js --jobs 2                how many games are played at once (default: one a processor)
     node arena/league.js --minutes 110           hand out no new game after this long; the ones begun are finished
     node arena/league.js --file <file>           where every game is kept (with one board only; arena/league-5x5.json
                                                  and arena/league-7x7.json if not given)
     node arena/league.js --table                 play nothing: the table of what is kept
     node arena/league.js --table --ratings       and write arena/ratings-5x5.json and arena/ratings-7x7.json from them:
                                                  the ratings the game goes by

   Every game is written down as it ends, with its moves (two letters a line: its number in base 36, as
   engine/rules.js numbers the lines), so a league that was stopped goes on from where it was, a
   later run with more rounds adds to the ones played, and a new file in bots/ plays only the pairs that have not
   met. A player is a bot's file at one of its levels: a file that has changed since it joined is another player, and
   the league says so and stops (give the changed bot a file name of its own, and it plays everyone from the start).
   The arena (arena.js) rates bots pair by pair; this is the same referee with a fixture list, a points table, and a
   record of who had which colour. Who wrote each bot is in bots/written-by.json. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { fork } = require('child_process');
const { ROOT, rules, Player, playGame, fit } = require('./lib');
const PINS = [['house:easy', 600], ['greedy:greedy', 900]];   // what the rating scale hangs from, as in the arena
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i < 0 ? dflt : process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]; };
const botFile = bot => path.join(ROOT, 'bots', bot + '.js');
const shaOf = bot => crypto.createHash('sha256').update(fs.readFileSync(botFile(bot))).digest('hex').slice(0, 16);
/** The seed a game is played with: the same for the same board, round and two players, whoever else is in the league. */
const seedOf = (size, round, red, gold) => { let h = 2166136261; for (const c of `${size}|${round}|${red}|${gold}`) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 1) || 1; };
/** a game's lines as kept: two letters a line */
const pack = moves => moves.map(m => m.toString(36).padStart(2, '0')).join(''), unpack = text => (text.match(/../g) || []).map(t => parseInt(t, 36));
const fileOf = size => path.join(__dirname, `league-${size}x${size}.json`), ratingsOf = size => path.join(__dirname, `ratings-${size}x${size}.json`);

if (require.main !== module) { /* asked for its table only */ } else if (process.argv.includes('--child')) {
  // one game, handed over by the parent: both players start it fresh, and the process ends with it
  const R = rules();
  process.on('message', t => {
    const Rd = new Player(botFile(t.red.bot), t.red.level), Gd = new Player(botFile(t.gold.bot), t.gold.level);
    const r = playGame(R, Rd, Gd, { size: t.size, timeMs: t.ms, seed: t.seed });
    const time = p => ({ moves: p.moves, mean: p.moves ? Math.round(p.msTotal / p.moves) : 0, max: Math.round(p.msMax), late: p.late });
    process.send({ round: t.round, red: Rd.id, gold: Gd.id, result: r.winner === R.RED ? 'red' : 'gold', why: r.why, score: r.score, plies: r.plies,
      moves: pack(r.moves), forfeit: r.forfeit, time: [time(Rd), time(Gd)] }, () => process.exit(0));
  });
} else main().catch(e => { console.error(e.message); process.exitCode = 1; });

async function main() {
  const sizes = arg('size') === undefined ? [5, 7] : [+arg('size')];
  if (sizes.some(n => n !== 5 && n !== 7)) throw new Error('--size is 5 or 7');
  if (typeof arg('file') === 'string' && sizes.length > 1) throw new Error('--file is for one board: give --size as well');
  for (const size of sizes) { if (await board(size)) break; }
}

/** The league on one board. True when it was stopped before its end. */
async function board(size) {
  const rounds = +arg('rounds', 3), jobs = +arg('jobs', os.cpus().length) || 1, minutes = +arg('minutes', 0);
  const words = name => (typeof arg(name) === 'string' ? arg(name).split(',') : null), only = words('only'), without = words('without');
  const file = path.resolve(typeof arg('file') === 'string' ? arg('file') : fileOf(size));
  const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const ms = +arg('ms', kept ? kept.ms : 1000);
  if (kept && kept.ms !== ms) throw new Error(`${path.relative(ROOT, file)} was played at ${kept.ms} ms a move: another time is another league (--file)`);
  if (kept && kept.size !== size) throw new Error(`${path.relative(ROOT, file)} is the league on ${kept.size} × ${kept.size}, not ${size} × ${size}`);
  console.log(`\n── the league on ${size} × ${size} ──`);

  const writers = JSON.parse(fs.readFileSync(path.join(ROOT, 'bots', 'written-by.json'), 'utf8')), players = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'bots')).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort()) {
    const bot = path.basename(f, '.js'), probe = new Player(botFile(bot));
    if (probe.error) { console.log(`${f}: left out — ${probe.error}`); continue; }
    for (const level of probe.info.levels) players.push({ id: bot + ':' + level, bot, level, name: probe.info.name, author: probe.info.author, model: (writers[bot] || {}).model || '', sha: shaOf(bot) });
  }
  for (const was of kept ? kept.players : []) {
    const now = players.find(p => p.id === was.id);
    if (now && was.sha && now.sha !== was.sha) throw new Error(`bots/${was.bot}.js is not the file that joined the league: a bot that was changed is another player. Give it a file name of its own, and put the file that played back.`);
  }
  const has = (p, list) => list.some(w => p.id.includes(w));
  const pool = players.filter(p => (!only || has(p, only)) && !(without && has(p, without)));
  const everyone = pool.concat((kept ? kept.players : []).filter(was => !pool.some(p => p.id === was.id)));   // whoever has games kept stays in the book
  const games = kept ? kept.games : [], lines = games.map(g => JSON.stringify(g));
  const save = () => { fs.writeFileSync(file + '.tmp', JSON.stringify({ size, ms, players: everyone }).slice(0, -1) + ',"games":[\n' + lines.join(',\n') + '\n]}\n'); fs.renameSync(file + '.tmp', file); };
  const out = () => { table(everyone, games, ms, size); if (arg('ratings')) keepRatings(everyone, games, ms, size); return false; };
  if (arg('table')) return out();

  // the fixtures: round by round, every pair twice, colours changed about
  const played = new Set(games.map(g => `${g.round} ${g.red} ${g.gold}`)), tasks = [];
  for (let round = 1; round <= rounds; round++) for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) for (const [r, g] of [[i, j], [j, i]]) {
    if (!played.has(`${round} ${pool[r].id} ${pool[g].id}`)) tasks.push({ size, round, red: pool[r], gold: pool[g], ms, seed: seedOf(size, round, pool[r].id, pool[g].id) });
  }
  const all = rounds * pool.length * (pool.length - 1);
  console.log(`${pool.length} players, ${rounds} rounds, ${all} games (${all - tasks.length} already played), ${ms} ms a move, ${Math.min(jobs, tasks.length)} at a time`);
  if (!tasks.length) return out();

  // A game is a process of its own. Should it stop in the middle (the machine took it away), the game is played
  // once more; a game that stops twice is left unplayed, and the next run takes it up.
  const play = t => new Promise(resolve => {
    const child = fork(__filename, ['--child']);
    child.on('message', resolve); child.on('error', () => resolve(null));
    child.on('exit', () => setTimeout(() => resolve(null), 500));   // its answer, if it gave one, is here by then
    child.send(t, () => {});
  });
  const since = Date.now(); let next = 0, count = 0, stop = '';
  const enough = () => stop || (minutes && Date.now() - since > minutes * 60000 ? (stop = `${minutes} minutes are up`) : '');
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop = 'asked to stop'; });
  const seat = async () => {
    while (next < tasks.length && !enough()) {
      const t = tasks[next++];
      let g = await play(t);
      if (!g && !enough()) { console.log(`STOPPED with its process: r${t.round} ${t.red.id} v ${t.gold.id}, which is played again`); g = await play(t); }
      if (!g) { console.log(`left unplayed: r${t.round} ${t.red.id} v ${t.gold.id}`); continue; }
      games.push(g); lines.push(JSON.stringify(g)); save(); count++;
      const mark = g.result === 'red' ? '1–0' : '0–1';
      const slow = g.time.map((x, i) => (x.late ? `${i ? g.gold : g.red} over its time ${x.late}×, worst ${x.max} ms` : '')).filter(Boolean).join('; ');
      console.log(`${size}×${size} r${g.round} ${String(count).padStart(4)}/${tasks.length}  ${g.red} v ${g.gold}: ${mark}  ${g.score[0]}–${g.score[1]}${g.forfeit ? `  FORFEIT ${g.forfeit.by}: ${g.forfeit.why}` : ''}${slow ? '  [' + slow + ']' : ''}  ${Math.round((Date.now() - since) / 60000)} min`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, seat));
  if (stop) { console.log(`\n${stop}: ${games.length} of ${all} games on ${size} × ${size} are kept, ${all - games.length} are still to play. The same command goes on from here.`); return true; }
  return out();
}

/** How everyone stands in the games kept: points, then wins less losses, then wins. Ratings are fitted to the same
 *  games. Null when nothing has been played. */
function standings(pool, games) {
  const ids = pool.map(p => p.id).filter(id => games.some(g => g.red === id || g.gold === id));
  if (!ids.length) return null;
  const row = Object.fromEntries(ids.map(id => [id, { id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, red: [0, 0, 0], gold: [0, 0, 0], squaresFor: 0, squaresAgainst: 0, forfeits: 0, moves: 0, msTotal: 0, msMax: 0, late: 0 }]));
  const pair = new Map();
  for (const g of games) {
    if (!row[g.red] || !row[g.gold]) continue;
    const Rd = row[g.red], Gd = row[g.gold], [a, b] = [g.red, g.gold].sort(), k = a + '\n' + b;
    if (!pair.has(k)) pair.set(k, { a, b, wa: 0, wb: 0, dr: 0 });
    const p = pair.get(k), redIsA = p.a === g.red;
    Rd.played++; Gd.played++;
    Rd.squaresFor += g.score[0]; Rd.squaresAgainst += g.score[1]; Gd.squaresFor += g.score[1]; Gd.squaresAgainst += g.score[0];
    const [w, l] = g.result === 'red' ? [Rd, Gd] : [Gd, Rd];
    w.won++; w.points += 3; l.lost++;
    if (g.result === 'red') { Rd.red[0]++; Gd.gold[2]++; } else { Gd.gold[0]++; Rd.red[2]++; }
    if ((g.result === 'red') === redIsA) p.wa++; else p.wb++;
    if (g.forfeit) row[g.forfeit.by].forfeits++;
    [Rd, Gd].forEach((r, i) => { const t = g.time[i]; r.moves += t.moves; r.msTotal += t.mean * t.moves; if (t.max > r.msMax) r.msMax = t.max; r.late += t.late; });
  }
  const anchor = PINS.find(pin => ids.includes(pin[0])) || [ids[0], 1500], R = fit(ids, [...pair.values()], anchor);
  const who = id => pool.find(p => p.id === id);
  const rows = ids.map(id => Object.assign(row[id], { rating: Math.round(R[id]), name: who(id).name, author: who(id).author, model: who(id).model || '' }))
    .sort((x, y) => y.points - x.points || (y.won - y.lost) - (x.won - x.lost) || y.won - x.won || y.rating - x.rating);
  return { rows, anchor, pairs: [...pair.values()] };
}

/** The table of the games kept on one board, printed; the rows come back. */
function table(pool, games, ms, size) {
  const stand = standings(pool, games);
  if (!stand) return console.log('nothing played');
  const { rows, anchor } = stand;
  const rounds = Math.max(...games.map(g => g.round)), wdl = a => a.join('-').padStart(9), wide = Math.max(22, ...rows.map(r => r.id.length));
  console.log(`\nThe league on ${size} × ${size} after ${games.length} games (${rounds} ${rounds === 1 ? 'round' : 'rounds'}, ${ms} ms a move). Win 3, draw 1, loss 0.\n`);
  console.log(` #  ${'player'.padEnd(wide)} played  won drawn lost  points    as Red   as Gold   squares   rating   ms a move (most)`);
  rows.forEach((r, i) => console.log(`${String(i + 1).padStart(2)}  ${r.id.padEnd(wide)} ${String(r.played).padStart(5)} ${String(r.won).padStart(5)} ${String(r.drawn).padStart(5)} ${String(r.lost).padStart(4)} ${String(r.points).padStart(7)}  ${wdl(r.red)} ${wdl(r.gold)}  ${String(r.squaresFor).padStart(5)}–${String(r.squaresAgainst).padEnd(5)} ${String(r.rating).padStart(6)}   ${String(r.moves ? Math.round(r.msTotal / r.moves) : 0).padStart(5)} (${r.msMax})${r.late ? `  late ${r.late}×` : ''}${r.forfeits ? `  FORFEITS ${r.forfeits}` : ''}`));
  const redWon = games.filter(g => g.result === 'red').length;
  console.log(`\nRed won ${redWon}, Gold won ${games.length - redWon}. Ratings hang from ${anchor[0]} at ${anchor[1]}.`);
  const forfeits = games.filter(g => g.forfeit);
  if (forfeits.length) console.log(`forfeits: ${[...new Set(forfeits.map(g => g.forfeit.by + ' — ' + g.forfeit.why))].join('; ')}`);
  return rows;
}

/** What the game goes by on one board (arena/ratings-5x5.json, arena/ratings-7x7.json): everyone in the table, in
 *  its order, with what it is and how it did. */
function rated(pool, games, ms, size) {
  const stand = standings(pool, games);
  if (!stand) return null;
  const who = id => pool.find(p => p.id === id);
  return { size, anchor: { id: stand.anchor[0], rating: stand.anchor[1] }, ms, games: games.length, rounds: Math.max(...games.map(g => g.round)),
    players: stand.rows.map(r => ({ id: r.id, bot: who(r.id).bot || r.id.split(':')[0], level: who(r.id).level || r.id.split(':')[1], name: r.name, author: r.author, model: r.model,
      rating: r.rating, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points })) };
}
function keepRatings(pool, games, ms, size) {
  const r = rated(pool, games, ms, size), file = ratingsOf(size);
  if (!r) return;
  fs.writeFileSync(file, JSON.stringify(r, null, 1) + '\n');
  console.log(`written: ${path.relative(ROOT, file)}`);
}
module.exports = { table, rated, standings, seedOf, pack, unpack, fileOf, ratingsOf };
