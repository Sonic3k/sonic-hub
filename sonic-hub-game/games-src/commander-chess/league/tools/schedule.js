// The league: every pair of players meets six times, three with each colour. One round is every pair once with each
// colour, in an order shuffled for that round, so that at any moment what has been played is a fair sample.
'use strict';
const P = require('./players.js');
const ROUNDS = 3, MS = 1000, MAX_TURNS = 600, SETUP = { game: 'battles', lineup: 'standard' };
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const seat = p => ({ key: p.key, file: p.file, id: p.id, level: p.level });
const games = [];
for (let r = 1; r <= ROUNDS; r++) {
  const list = [], rnd = rng(r * 7919);
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { list.push([i, j]); list.push([j, i]); }
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  for (const [a, b] of list) { const id = 'R' + r + ' ' + P[a].key + ' v ' + P[b].key; games.push({ id, round: r, red: seat(P[a]), blue: seat(P[b]), ms: MS, seed: hash(id), maxTurns: MAX_TURNS, setup: SETUP }); }
}
module.exports = { games, players: P, ROUNDS, MS, MAX_TURNS, SETUP };
if (require.main === module) console.log(games.length, 'games,', P.length, 'players,', ROUNDS, 'rounds; first:', games.slice(0, 4).map(g => g.id).join(' | '));
