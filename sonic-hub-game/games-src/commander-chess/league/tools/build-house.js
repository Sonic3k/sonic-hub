// Wraps the game's own computer player (src/engine/10-ai.js with the five players of 20-players.js) as a kit file,
// so that the game's five opponents sit at the same table as everybody else's bots.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), REPO = path.join(ROOT, '..'), OUT = path.join(ROOT, 'bots/house.js');
const CC = require(path.join(ROOT, 'kit/engine.js'));
const names = Object.keys(CC).filter(k => k !== 'KIT' && k !== 'RULES');
let ai = fs.readFileSync(REPO + '/src/engine/10-ai.js', 'utf8');
const players = fs.readFileSync(REPO + '/src/engine/20-players.js', 'utf8');
/* The game's player looks at its clock only at some points of its look-ahead, and can run well past its time (in the
   game that only makes a move a little slower). At a table with a clock it has to stop when its time is up, so the
   league's copy looks at the clock everywhere, and more often. Nothing else of how it plays is touched. */
const patch = (from, to) => { if (ai.split(from).length !== 2) throw new Error('the computer player no longer reads: ' + from); ai = ai.replace(from, to); };
patch("    nodes++;\n    const stand = evaluate(S);", "    nodes++;\n    if ((nodes & 255) === 0 && clock() > deadline) out = true;\n    if (out) return 0;\n    const stand = evaluate(S);");
patch("-quiesce(T, -beta, -alpha, ply + 1, left - 1);\n", "-quiesce(T, -beta, -alpha, ply + 1, left - 1);\n      if (out) return 0;\n");
patch("if ((nodes & 1023) === 0 && clock() > deadline) out = true;\n    if (out) return 0;\n    const me = S.turn, list = order(S, gen(S, []), ply, 0);", "if ((nodes & 255) === 0 && clock() > deadline) out = true;\n    if (out) return 0;\n    const me = S.turn, list = order(S, gen(S, []), ply, 0);");
const text = `/* The game's own five opponents (Port Halcyon), as they play in the game: src/engine/10-ai.js and 20-players.js,
   behind the kit's contract. The only thing that is not the game's: the clock. In the game each of them has her
   own thinking time (Nadia 1600 ms, Isolde 3000 ms a move) and may run over it; here all of them keep to
   ctx.timeMs, and the look-ahead stops when that is up. How they judge and choose is the game's, line for line. */
const { ${names.join(', ')} } = CC;
${ai}
${players}
const HOUSE = [
  ['pia', 'Pia', 'Ensign Pia Lindqvist, the easiest of Port Halcyon: looks one move ahead, shakily, and now and then just plays something.'],
  ['sol', 'Marisol', 'Chief Marisol Ortega: one move ahead and the captures after it; likes ground, infantry and armour.'],
  ['hana', 'Hana', 'Lieutenant Hana Sorel: two moves ahead, keeps her Commander home and her arms whole, trusts guns and ships.'],
  ['nadia', 'Nadia', 'Commander Nadia Rahimi: three moves ahead, hunts the Commander and loads her tanks and planes to get there.'],
  ['isolde', 'Isolde', 'Captain Isolde Varga, the hardest: as deep as her clock allows, up to five moves, and gives nothing away.'],
];
for (const [who, name, about] of HOUSE) registerAI({
  id: 'house-' + who, name, author: 'Claude Fable 5.2 (the game)', about,
  turn(S, ctx) {
    const cfg = PLAYERS[who], me = S.turn, moves = [], salt = Math.floor(ctx.random() * 4294967296);
    for (let step = 0; step < 6 && !S.over && S.turn === me; step++) {
      /* a turn is nearly always one move: it gets most of the time; what is left is halved for each further step */
      const ms = Math.max(4, Math.min(cfg.ms || 1e9, step ? ctx.timeLeft() * 0.5 : ctx.timeMs * 0.8));
      const r = AI.think(S, Object.assign({}, cfg, { seen: ctx.seen, salt, random: ctx.random, ms, slip: step ? 0 : cfg.slip }));
      if (r.move < 0) break;
      moves.push(r.move);
      if (!play(S, r.move, true)) break;
    }
    return moves;
  },
});
`;
fs.writeFileSync(OUT, text);
console.log('wrote', path.relative(process.cwd(), OUT), (text.length / 1024).toFixed(1), 'KB');
