# Commander Chess: write a computer player

Commander Chess (Cờ Tư Lệnh, by Nguyễn Quý Hải) is a war game for two on a board of 11 × 12 points: land, sea and
air pieces, pieces that ride on each other, air defence, and a Commander to keep alive. This kit (number {{KIT}},
rules of {{RULES}}) is everything needed to write a computer player for it.

The players written from this kit become opponents in a game with a campaign. Each is meant to be a different
character to play against, which is why the kit says how the game works and nothing about how to play it well.
That part is yours.

## In the kit

| File | What it is |
|---|---|
| `RULES.md` | the rules of the game |
| `engine.js` | the rules as code: positions, legal moves, playing a move. The reference: use it, do not change it |
| `match.html` | a table in the browser: open the file, load your players, play against one or watch them play. It carries its own copy of the engine |
| `arena.js` | the same table for Node 18 or later: checks a file of players, runs matches |
| `sample-ai.js` | the smallest valid player. It shows the calls and is there to be beaten |

## What to deliver

One JavaScript file. It registers the players you were asked for, with one call of `registerAI` for each:

```js
registerAI({
  id: 'iron-tide',            // 3 to 24 lowercase letters, digits, hyphens. Your own: not this one
  name: 'Iron Tide',          // what the player is called
  author: 'who wrote it',     // you: the model and its version
  about: 'How it plays, in a sentence or two: what it goes for, what it guards, what it will risk.',
  levels: 3,                  // how many levels of strength it has, 1 to 10. Left out: one
  turn(S, ctx) { /* … */ return moves; },
});
```

A file may register several players. Each has its own `id`, `name`, `about`, `levels` and `turn`; they may share
whatever else the file defines.

The file's text is run as the body of a function that is given two names: `CC`, the engine, and `registerAI`. So it
is a plain script: no `import`, `export` or `require`. A player works from what is in the file alone: no network
(`fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`: no asking a server or a model for the move), no DOM,
timers, workers or storage, and nothing asynchronous. The file has to run unchanged in a browser's Web Worker and
in Node 18, stay under 300 KB, and be ready within a second of loading. What it defines is private to it. A player
may keep state between turns, but it has to give a legal answer for any position it is handed, with or without
that state.

### `turn(S, ctx)`

Called when it is your turn. `S` is the position, a copy that is yours to change, and `S.turn` is your side
(`CC.RED` 0 or `CC.BLUE` 1). Return **the moves of your turn, in order**: an array of move numbers, each one taken
from `CC.legalMoves` at the moment it is played.

A turn is usually one move. It is several when pieces leave a stack one after another (a deployment, see
`RULES.md`): after such a move `S.turn` is still you, and the turn goes on until you play `CC.COMMIT_MOVE` or no
piece of the stack is left to act. The loop that always gets this right:

```js
turn(S, ctx) {
  const me = S.turn, moves = [];
  while (!S.over && S.turn === me) {
    const legal = CC.legalMoves(S);
    const m = choose(S, legal, ctx);     // yours
    moves.push(m);
    CC.play(S, m, true);
  }
  return moves;
}
```

You may also return only the first part of a turn, or a single number: when the turn is still open after your
moves, `turn` is called again for the rest, with the time that is left.

| `ctx` | |
|---|---|
| `ctx.level` | from 1 to the player's `levels`: how strong to play (see below) |
| `ctx.timeMs` | the time for this answer, in milliseconds |
| `ctx.timeLeft()` | how much of it is left |
| `ctx.random()` | a number from 0 up to 1. Use it in place of `Math.random`, so that a game can be played again move for move |
| `ctx.seen` | `{ [CC.posKey(position)]: times }` for every position that has stood at the end of a turn in this game, the present one included. A position that stands a third time ends the game on points: if the position after your turn is already in there twice, your turn does that |

### What loses the game on the spot

- a move that is not legal at the moment it is played (each one is checked against `CC.legalMoves`), or anything
  returned that is not a move
- moves that go on after your turn is over
- an exception, or an empty answer
- a turn that takes more than twice `ctx.timeMs` plus a quarter of a second

A turn that runs over `ctx.timeMs` by less than that is reported as late. A late turn does not lose a game here,
but a player that is often late will not be used.

## Players and levels

**How many.** How many players to write, and how many levels each of them is to have, is for whoever gave you
this kit to say. If nothing was said: one player with one level, playing as well as it can.

**Levels.** A player with `levels: N` is asked to play at `ctx.level` 1, its weakest, up to N, its strongest. The
top level is the best it can do in the time. Unless you were told what the levels are to be, make level 1 a
player that somebody new to the game can beat, and space the others evenly up to the top: at the same
`ctx.timeMs`, each level should win about three games in four against the level below it. The game will give
between 300 and 3000 ms a turn, and the levels have to keep their order at any of these, so make the difference in
how the player thinks and not in how long. Low levels should answer quickly. A weak level should be weak the way a
person is (greedy, hasty, timid, blind to one kind of threat), not a strong player with random moves mixed in.

**Characters.** Every player is a character: a way of playing that is its own, in what it values, what it goes
for first, how it uses stacks and the air, how much it will risk. Say it in `about`. When you write several, make
them different to play against, not one player under several names.

Any method is fine: search, playouts, rules of thumb, tables worked out beforehand and written into the file. The
sample player is not a starting point; nothing of its judgement is worth keeping.

## The engine

A **point** is a number 0–131: `(rank − 1) × 11 + file`, the files `a`–`k` being 0–10. `CC.sqOf(file, rank)`,
`CC.fileOf(s)`, `CC.rankOf(s)`, `CC.sqName(s)` (gives `'g5'`), `CC.sqNamed('g5')`.

A **piece** is a number from 0 to `S.n − 1` and keeps it for the whole game. Its kind is one of `CC.COMMANDER` 0,
`INFANTRY` 1, `TANK` 2, `MILITIA` 3, `ENGINEER` 4, `ARTILLERY` 5, `ANTIAIR` 6, `MISSILE` 7, `AIR` 8, `NAVY` 9,
`HQ` 10.

| The position `S` | |
|---|---|
| `S.n` | how many pieces the game began with (38, or 34 without Engineers) |
| `S.kind[p]`, `S.own[p]` | a piece's kind and its side |
| `S.at[p]` | the point it is on, or −1 once it has been taken |
| `S.hero[p]` | 1 for a hero |
| `S.car[p]` | the piece that carries it, or −1 |
| `S.c1[p]`, `S.c2[p]` | the pieces it carries, or −1 |
| `S.top[s]` | the piece standing on point `s` (of a stack: the carrier), or −1 |
| `S.cmd[side]` | that side's Commander |
| `S.turn` | the side to move |
| `S.dOrg`, `S.dAct` | in a deployment: the point of the stack being unloaded (−1 otherwise), and the pieces that have acted |
| `S.half` | quiet turns in a row so far; 100 ends the game on points |
| `S.total` | 1 in a game of total war, 0 in a game of battles |
| `S.over` | `null`, or `{ winner, why }` once the game is over (`winner` −1 is a draw). `why` is `'commander'`, `'sea'`, `'air'`, `'land'`, `'alone'` or `'points'`; `CC.status` adds `'mate'` and `'stuck'` for a side with no move |

A **move** is a number. `CC.mFrom(m)` and `CC.mTo(m)` are points; `CC.mMode(m)` is `CC.MOVE`, `CAPTURE`, `STAY`,
`SUICIDE`, `INTERCEPT`, `COMBINE` or `COMMIT`; `CC.mActor(m)` is the piece that moves; `CC.mGroup(m)` has a bit
for each piece of `CC.members(S, from)` that goes along. `CC.moveText(S, m)` writes it for a log (`Tf4-f6`,
`Fk4xk8`), before it is played.

| The calls that matter | |
|---|---|
| `CC.legalMoves(S)` | every move the side to move may make now. In a deployment: the next steps, and `CC.COMMIT_MOVE` where the turn may end there. About 0.6 ms |
| `CC.play(S, m, strict)` | plays `m` on `S` itself. Returns `false` if it cannot be played, and `S` is then spoiled: look at what it returns, and play on a copy when unsure. `strict` true refuses a move that leaves your own Commander to be taken or facing the other; false skips those two tests |
| `CC.clone(S)` | a copy. Cloning and playing together take about 5 µs |
| `CC.gen(S, out, takesOnly)` | pushes onto `out` every move by the rules of movement alone, safe for the Commander or not. About 30 µs. `takesOnly`: only captures, and only those a stack makes as a whole |
| `CC.status(S)` | `null` while the game goes on, else `{ winner, why }`. Unlike `S.over` it also sees a side with no legal move; it costs a `legalMoves` |
| `CC.inCheck(S, side)` | could that side's Commander be taken now? |
| `CC.attacks(S, p, s)` | could piece `p`, from where it is, take what stands on `s`? |
| `CC.members(S, s)` | the pieces on a point, carrier first |
| `CC.adMask(S, side)` | for each point, non-zero where that side's air defence reaches |
| `CC.arms(S, side)` | `[ships, planes, infantry + tanks + artillery]` still on the board |
| `CC.points(S)` | `[red, blue]` as the game counts them; `CC.POINTS[kind]` for one piece |
| `CC.posKey(S)` | the key `ctx.seen` uses |
| `CC.newGame(setup)` | a starting position, for tests of your own: `{ game: 'battles' or 'total', lineup: 'standard' or 'light' }` |

Tables: `CC.TERRAIN[s]` (`CC.LAND`, `WATER`, `MIXED`, `BRIDGE`); `CC.MOVE_ORTH[kind]`, `MOVE_DIAG`, `CAP_ORTH`,
`CAP_DIAG` (ranges; a hero has one more); `CC.RAY[s * 8 + d]` (the points from `s` in direction `d`, nearest first;
`CC.DIRS[d]` is the step); `CC.KIND_NAME`, `CC.KIND_CODE`. The rest of `CC` is the engine's own machinery.
`engine.js` is short and commented. The times are for a laptop; a phone is several times slower.

## Things that go wrong

1. **The same side may move twice.** After a deployment step the turn has not passed. A look-ahead that changes
   sides after every move is wrong for this game.
2. **`play` spoils the position when it fails**, strict or not. Clone first, or play only moves from `legalMoves`.
3. **`gen` is not `legalMoves`.** `gen` goes by the rules of movement alone. Played with `strict` true, the moves
   the rules forbid are refused, and a deployment that cannot end legally runs out of moves. Played with `strict`
   false nothing is refused: a Commander left in danger is simply taken on the next move, and `S.over` says so,
   but two Commanders left facing each other go unpunished. Either will do for a look-ahead. What you return has
   to come from `legalMoves`.
4. **`S.over` does not know that a side has no move.** A side to move with no legal move has lost; only
   `CC.status` or an empty `legalMoves` tells you.
5. **`INTERCEPT` is legal.** It throws a plane away for nothing, and `legalMoves` lists it.
6. **A deployment can end by itself.** When the last piece leaves the stack the turn is over, and a `COMMIT_MOVE`
   after that is a move after your turn.
7. **A game of battles is not a count of points.** A side that loses its last ship, its last plane, or the last of
   its infantry, tanks and artillery has lost, whatever it has taken. Look at `S.total` before deciding what matters.
8. **A game nobody wins on the board is decided on points.** 100 quiet turns or a third repetition stop the game,
   and the side ahead on points wins. `ctx.seen` is there so that you walk into that, or stay out of it, on purpose.
9. **You play both colours, both games and both line-ups.** Nothing may assume Red, fixed piece numbers, or that
   there are Engineers.
10. **Watch the clock inside your loops.** `ctx.timeLeft()` is cheap. Keep the best answer found so far and return
    it when the time is nearly up.

## Testing

    node arena.js check my-players.js

plays every player in the file at each of its levels, as both colours, in both games and with both line-ups,
against the sample player, and ends in `RESULT: PASS` or in the list of faults. A game lost by a fault is kept as
`fault-….json`, and `node arena.js show fault-….json` prints that position as text, with the legal moves (Red in
capitals, Blue in small letters, a stack written carrier first, `!` after a hero; `~` sea, `,` shore, `=` ford).

    node arena.js my-players.js#iron-tide sample-ai.js --games 20 --ms 1000     a match; --level 2:1 sets the levels
    node arena.js ladder my-players.js --games 10 --ms 500                      each level against the one below

`#id` picks one player out of a file that holds several; a file with one player needs none.

`match.html` does the same without Node: open it, load the file, and play a game or run a series.

If you cannot run code where you are, write against this page and `engine.js`, and say that you could not: the
person who gave you the kit will run the check and send you what it prints.

## Send back

The file.
