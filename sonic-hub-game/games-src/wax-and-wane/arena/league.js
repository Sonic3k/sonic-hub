#!/usr/bin/env node
/* A league: every player meets every other in rounds, once with Dark and once with Light in each round.
   Three points for a win, one for a draw, none for a loss. The table comes out at the end, with each player's rating.

     node arena/league.js                         all the bots in bots/, at every level they have, three rounds
     node arena/league.js --rounds 4              more rounds (or fewer)
     node arena/league.js --without random,greedy leave out players whose name has one of these in it
     node arena/league.js --only house,eclipse    only players whose name has one of these in it
     node arena/league.js --ms 1000               the time a bot is asked to stay within for a move
     node arena/league.js --jobs 2                how many games are played at once (default: one a processor)
     node arena/league.js --minutes 110           hand out no new game after this long; the ones begun are finished
     node arena/league.js --file arena/league.json   where every game is kept
     node arena/league.js --table                 play nothing: the table of what is kept
     node arena/league.js --table --ratings       and write arena/ratings.json from it: the ratings the game goes by

   Every game is written down as it ends, with its moves, so a league that was stopped goes on from where it was, a
   later run with more rounds adds to the ones played, and a new file in bots/ plays only the pairs that have not
   met. A player is a bot's file at one of its levels: a file that has changed since it joined is another player, and
   the league says so and stops (give the changed bot a file name of its own, and it plays everyone from the start).
   The arena (arena.js) rates bots pair by pair; this is the same referee with a fixture list, a points table, and a
   record of who had which colour. Who wrote each bot is in bots/written-by.json. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { fork } = require('child_process');
const { ROOT, rules, Player, playGame, fit } = require('./lib');
const PINS = [['house:new', 600], ['greedy:greedy', 650]];   // what the rating scale hangs from, as in the arena
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i < 0 ? dflt : process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]; };
const botFile = bot => path.join(ROOT, 'bots', bot + '.js');
const shaOf = bot => crypto.createHash('sha256').update(fs.readFileSync(botFile(bot))).digest('hex').slice(0, 16);
/** The seed a game is played with: the same for the same round and the same two players, whoever else is in the league. */
const seedOf = (round, dark, light) => { let h = 2166136261; for (const c of `${round}|${dark}|${light}`) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 1) || 1; };

if (require.main !== module) { /* asked for its table only */ } else if (process.argv.includes('--child')) {
  // one game, handed over by the parent: both players start it fresh, and the process ends with it
  const R = rules();
  process.on('message', t => {
    const D = new Player(botFile(t.dark.bot), t.dark.level), L = new Player(botFile(t.light.bot), t.light.level);
    const r = playGame(R, D, L, { timeMs: t.ms, seed: t.seed });
    const time = p => ({ moves: p.moves, mean: p.moves ? Math.round(p.msTotal / p.moves) : 0, max: Math.round(p.msMax), late: p.late });
    process.send({ round: t.round, dark: D.id, light: L.id, result: r.winner < 0 ? 'draw' : r.winner === R.DARK ? 'dark' : 'light', why: r.why, discs: r.discs, plies: r.plies,
      moves: r.moves.filter(m => m !== R.PASS_MOVE).map(m => R.sqName(m)).join(''), forfeit: r.forfeit, time: [time(D), time(L)] }, () => process.exit(0));
  });
} else main().catch(e => { console.error(e.message); process.exitCode = 1; });

async function main() {
  const rounds = +arg('rounds', 3), jobs = +arg('jobs', os.cpus().length) || 1, minutes = +arg('minutes', 0);
  const words = name => (typeof arg(name) === 'string' ? arg(name).split(',') : null), only = words('only'), without = words('without');
  const file = path.resolve(typeof arg('file') === 'string' ? arg('file') : path.join(__dirname, 'league.json'));
  const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const ms = +arg('ms', kept ? kept.ms : 1000);
  if (kept && kept.ms !== ms) throw new Error(`${path.relative(ROOT, file)} was played at ${kept.ms} ms a move: another time is another league (--file)`);

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
  const save = () => { fs.writeFileSync(file + '.tmp', JSON.stringify({ ms, players: everyone }).slice(0, -1) + ',"games":[\n' + lines.join(',\n') + '\n]}\n'); fs.renameSync(file + '.tmp', file); };
  const out = () => { table(everyone, games, ms); if (arg('ratings')) keepRatings(everyone, games, ms); };
  if (arg('table')) return out();

  // the fixtures: round by round, every pair twice, colours changed about
  const played = new Set(games.map(g => `${g.round} ${g.dark} ${g.light}`)), tasks = [];
  for (let round = 1; round <= rounds; round++) for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) for (const [d, l] of [[i, j], [j, i]]) {
    if (!played.has(`${round} ${pool[d].id} ${pool[l].id}`)) tasks.push({ round, dark: pool[d], light: pool[l], ms, seed: seedOf(round, pool[d].id, pool[l].id) });
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
      if (!g && !enough()) { console.log(`STOPPED with its process: r${t.round} ${t.dark.id} v ${t.light.id}, which is played again`); g = await play(t); }
      if (!g) { console.log(`left unplayed: r${t.round} ${t.dark.id} v ${t.light.id}`); continue; }
      games.push(g); lines.push(JSON.stringify(g)); save(); count++;
      const mark = g.result === 'draw' ? '½–½' : g.result === 'dark' ? '1–0' : '0–1';
      const slow = g.time.map((x, i) => (x.late ? `${i ? g.light : g.dark} over its time ${x.late}×, worst ${x.max} ms` : '')).filter(Boolean).join('; ');
      console.log(`r${g.round} ${String(count).padStart(4)}/${tasks.length}  ${g.dark} v ${g.light}: ${mark}  ${g.discs[0]}–${g.discs[1]} (${g.why})${g.forfeit ? `  FORFEIT ${g.forfeit.by}: ${g.forfeit.why}` : ''}${slow ? '  [' + slow + ']' : ''}  ${Math.round((Date.now() - since) / 60000)} min`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, seat));
  if (stop) return console.log(`\n${stop}: ${games.length} of ${all} games are kept, ${all - games.length} are still to play. The same command goes on from here.`);
  out();
}

/** How everyone stands in the games kept: points, then wins less losses, then wins. Ratings are fitted to the same
 *  games. Null when nothing has been played. */
function standings(pool, games) {
  const ids = pool.map(p => p.id).filter(id => games.some(g => g.dark === id || g.light === id));
  if (!ids.length) return null;
  const row = Object.fromEntries(ids.map(id => [id, { id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, dark: [0, 0, 0], light: [0, 0, 0], discsFor: 0, discsAgainst: 0, forfeits: 0, moves: 0, msTotal: 0, msMax: 0, late: 0 }]));
  const pair = new Map();
  for (const g of games) {
    if (!row[g.dark] || !row[g.light]) continue;
    const D = row[g.dark], L = row[g.light], [a, b] = [g.dark, g.light].sort(), k = a + '\n' + b;
    if (!pair.has(k)) pair.set(k, { a, b, wa: 0, wb: 0, dr: 0 });
    const p = pair.get(k), darkIsA = p.a === g.dark;
    D.played++; L.played++;
    D.discsFor += g.discs[0]; D.discsAgainst += g.discs[1]; L.discsFor += g.discs[1]; L.discsAgainst += g.discs[0];
    if (g.result === 'draw') { D.drawn++; L.drawn++; D.points++; L.points++; D.dark[1]++; L.light[1]++; p.dr++; }
    else {
      const [w, l] = g.result === 'dark' ? [D, L] : [L, D];
      w.won++; w.points += 3; l.lost++;
      if (g.result === 'dark') { D.dark[0]++; L.light[2]++; } else { L.light[0]++; D.dark[2]++; }
      if ((g.result === 'dark') === darkIsA) p.wa++; else p.wb++;
    }
    if (g.forfeit) row[g.forfeit.by].forfeits++;
    [D, L].forEach((r, i) => { const t = g.time[i]; r.moves += t.moves; r.msTotal += t.mean * t.moves; if (t.max > r.msMax) r.msMax = t.max; r.late += t.late; });
  }
  const anchor = PINS.find(pin => ids.includes(pin[0])) || [ids[0], 1500], R = fit(ids, [...pair.values()], anchor);
  const who = id => pool.find(p => p.id === id);
  const rows = ids.map(id => Object.assign(row[id], { rating: Math.round(R[id]), name: who(id).name, author: who(id).author, model: who(id).model || '' }))
    .sort((x, y) => y.points - x.points || (y.won - y.lost) - (x.won - x.lost) || y.won - x.won || y.rating - x.rating);
  return { rows, anchor, pairs: [...pair.values()] };
}

/** The table of the games kept, printed; the rows come back. */
function table(pool, games, ms) {
  const stand = standings(pool, games);
  if (!stand) return console.log('nothing played');
  const { rows, anchor } = stand;
  const rounds = Math.max(...games.map(g => g.round)), wdl = a => a.join('-').padStart(9), wide = Math.max(22, ...rows.map(r => r.id.length));
  console.log(`\nThe league after ${games.length} games (${rounds} ${rounds === 1 ? 'round' : 'rounds'}, ${ms} ms a move). Win 3, draw 1, loss 0.\n`);
  console.log(` #  ${'player'.padEnd(wide)} played  won drawn lost  points   as Dark  as Light   rating   ms a move (most)`);
  rows.forEach((r, i) => console.log(`${String(i + 1).padStart(2)}  ${r.id.padEnd(wide)} ${String(r.played).padStart(5)} ${String(r.won).padStart(5)} ${String(r.drawn).padStart(5)} ${String(r.lost).padStart(4)} ${String(r.points).padStart(7)}  ${wdl(r.dark)} ${wdl(r.light)}   ${String(r.rating).padStart(6)}   ${String(r.moves ? Math.round(r.msTotal / r.moves) : 0).padStart(5)} (${r.msMax})${r.late ? `  late ${r.late}×` : ''}${r.forfeits ? `  FORFEITS ${r.forfeits}` : ''}`));
  const darkWon = games.filter(g => g.result === 'dark').length, drawn = games.filter(g => g.result === 'draw').length;
  console.log(`\nDark won ${darkWon}, Light won ${games.length - darkWon - drawn}, drawn ${drawn}. Ratings hang from ${anchor[0]} at ${anchor[1]}.`);
  const forfeits = games.filter(g => g.forfeit);
  if (forfeits.length) console.log(`forfeits: ${[...new Set(forfeits.map(g => g.forfeit.by + ' — ' + g.forfeit.why))].join('; ')}`);
  return rows;
}

/** What the game goes by (arena/ratings.json): everyone in the table, in its order, with what it is and how it did. */
function rated(pool, games, ms) {
  const stand = standings(pool, games);
  if (!stand) return null;
  const who = id => pool.find(p => p.id === id);
  return { anchor: { id: stand.anchor[0], rating: stand.anchor[1] }, ms, games: games.length, rounds: Math.max(...games.map(g => g.round)),
    players: stand.rows.map(r => ({ id: r.id, bot: who(r.id).bot || r.id.split(':')[0], level: who(r.id).level || r.id.split(':')[1], name: r.name, author: r.author, model: r.model,
      rating: r.rating, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points })) };
}
function keepRatings(pool, games, ms) {
  const r = rated(pool, games, ms), file = path.join(__dirname, 'ratings.json');
  if (!r) return;
  fs.writeFileSync(file, JSON.stringify(r, null, 1) + '\n');
  console.log(`written: ${path.relative(ROOT, file)}`);
}
module.exports = { table, rated, standings, seedOf };
