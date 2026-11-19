# Wax & Wane: how a computer player is written

This page says how a computer player (a *bot*) plugs into the game Wax & Wane: what its file has to be, what it is
given, what it may call, and what it is held to. What kind of player to write, how many levels it has and how
strong each should be are not decided here: that is for whoever asks for the bot.

## What a bot is

One JavaScript file, `bots/<name>.js`, that defines one object:

```js
const BOT = {
  name: 'Your bot',
  author: 'Who wrote it',
  levels: ['one', 'two'],                       // one name or more: the levels this bot can play at
  think(S, opt) {                               // S: the position. opt: { level, timeMs, rand }
    return legalMoves(S)[0];                    // one of the moves allowed: the square to put a disc on
  },
};
```

- `levels` lists at least one name. The game asks for a move at one of them (`opt.level`); how many there are and
  what each means is the bot's own business.
- Everything in `engine/rules.js` is in scope in the file, so a bot need not write the rules again. It may keep a
  picture of the board of its own for speed (two 64-bit sets of discs, say); the move it returns is checked against
  `engine/rules.js` all the same.
- `bots/random.js` and `bots/greedy.js` are two small bots that show the whole of what a file has to be.

## The rules of the game

`docs/RULES.md` is the complete text. They are the rules of Othello. In short:

An 8 × 8 board. Two sides, **Dark** and **Light**, and discs that are dark on one face and light on the other.
The game starts with Light on d4 and e5 and Dark on e4 and d5. Dark moves first.

- **A move** puts one disc on an empty square, the mover's face up, so that it *encloses*: in a straight line from
  it (row, column or diagonal) come one or more of the other side's discs with no gap, and right after them one
  of the mover's own. Every disc enclosed, in every direction, is turned over. A square that encloses nothing is
  not a move.
- **A side with no move passes**, and the other side moves again. A side that has a move may not pass.
- **The game is over when neither side can move.** The side with more discs showing its face wins; the same number
  each is a draw. Empty squares count for nobody.

## What `think` gets

`S` is a copy of the game made for this one call. Change it as you like (`make`, `unmake`); it is thrown away.

| | |
|---|---|
| `S.b` | `Int8Array(64)`, a1 first, row by row: square = file + 8 × (rank − 1), so a1 0, h1 7, a8 56, h8 63. a1 is the **top left** corner: ranks run from the top down. 0 is an empty square, 1 a Dark disc, 2 a Light disc |
| `S.turn` | whose move it is: `DARK` 0 or `LIGHT` 1. That is you |
| `S.count[side]` | how many discs each side has on the board |
| `S.empties` | how many squares are empty |
| `S.history` | every move of the game so far: squares, and `PASS_MOVE` wherever a side had to pass |

`think` is only ever called when you have a disc to put down. A side that has to pass is not asked: the game
passes for it. Passes do turn up inside a search, where you play them yourself (see below).

`opt.level` is one of your level names. `opt.timeMs` is what you are asked to stay within for this move (1000 in the
arena and in the game). `opt.rand()` gives a number from 0 up to 1: use it for anything random, not `Math.random`,
so that a game can be played again exactly.

A move is a number: the square the disc goes on, 0 to 63. A pass is `PASS_MOVE`, 64. Return one of `legalMoves(S)`.

## What you can call

```
legalMoves(S)            every move allowed, as an array of squares; [PASS_MOVE] when the side to move has to pass;
                         empty when the game is over (never empty, and never a pass, when think is called)
gen(S, out, off = 0)     the same, written into out from index off; returns how many. No array made: use it in a search
make(S, m)               plays m without checking it. Returns how many discs it turned over
unmake(S)                takes the last make back
countFlips(S, s)         how many discs the side to move would turn over by playing on the empty square s; 0: not a move
flipsInto(S, s, out, off = 0)    their squares, written into out from index off; returns how many
flipsOf(S, m)            the same squares as an array
encloses(b, s, side)     would a disc of `side` on the empty square s of board b (an S.b) turn anything over?
canMove(S, side)         has `side` anywhere to put a disc?
describe(S, m)           what m will do: { side, to, pass, flips: [squares], lines: [[squares along one line, nearest first], …] }
sqName(s)  sqOf('d3')    'd3' for 19, and back
DIR[d]                   what one step in direction d adds to a square's number: 0 up-left, 1 up, 2 up-right, 3 left,
                         4 right, 5 down-left, 6 down, 7 down-right
RUN[s * 8 + d]           how many squares lie beyond s in direction d before the edge of the board
keyLo(S) keyHi(S)        two 32-bit halves of a key for the position (the discs and whose move it is), for a table
                         of positions already searched
lastMove(S)              the move made just before, or −1 when make has played none
DARK LIGHT  SIDE  EMPTY  PASS_MOVE
```

Inside a search, after `make(S, m)`, ask `gen` what the side now to move can do:

- it returns 0: **the game is over.** The side to move is ahead by `S.count[S.turn] - S.count[1 - S.turn]` discs
  (behind, if that is negative).
- it returns 1 and the move is `PASS_MOVE`: that side has to pass. `make(S, PASS_MOVE)` and go on; `unmake(S)`
  takes a pass back like any other move.
- otherwise it returns the squares that side may play.

Two sizes that help when setting up arrays: a position never has more than 33 moves, and a game never has more
than 60 moves that put a disc down, with at most one pass between any two of them.

## What a bot is held to

- Plain JavaScript in one file. No `import`, no `require`, no DOM, no timers, no network. The file runs as the body
  of a function in strict mode, so whatever you declare is your own and cannot clash with the rules.
- It runs in a web worker in the game and under Node in the arena. `performance.now()` is there; `console` is
  there but nobody reads it.
- You may keep things between calls (a table of positions, say), but each call must stand alone: you can be asked
  about any game at any time.
- Answer within `opt.timeMs`. A bot that takes more than three times that, returns a move that is not allowed, or
  throws, **loses the game on the spot**.
- The game is played on phones as well as on laptops: in the same time, the same bot gets less done there.

## Trying it

Node 18 or later, nothing to install. From the folder this file's `docs/` is in:

```
node arena/contract.test.js                       the checks every bot is held to; a file in bots/ is picked up by itself
node arena/arena.js --vs <your-name> --games 20   each of your levels against everyone, with ratings at the end
node engine/rules.test.js                         the rules, if you want to see them hold
```

The arena prints each pair's score, any game lost by forfeit and why, and a table of ratings.

To play against your bot by hand, open `board.html` from the kit in a browser, choose your file for one side and
pick a level. Two bots can be set against each other there too, and a bot that breaks is named with its error.
