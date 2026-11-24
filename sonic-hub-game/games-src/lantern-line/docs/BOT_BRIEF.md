# Lantern Line: how a computer player is written

This page says how a computer player (a *bot*) plugs into the game Lantern Line: what its file has to be, what it is
given, what it may call, and what it is held to. What kind of player to write, how many levels it has and how strong
each should be are not decided here: that is for whoever asks for the bot.

## Two boards, two games to play

Lantern Line is played on two boards: **5 × 5 squares** and **7 × 7 squares**. The rules are the same on both, but
a bot is asked to play on either, and it is rated on each **apart**: there is a league for 5 × 5 and a league for
7 × 7, each with its own table and its own ratings. What wins on one board need not win on the other, so a bot may
play each board its own way. `opt.size` (and `S.n`) says which board a move is asked on.

A bot that plays only one board well still has to play the other: it is never asked which boards it would rather.

## What a bot is

One JavaScript file, `bots/<name>.js`, that defines one object:

```js
const BOT = {
  name: 'Your bot',
  author: 'Who wrote it',
  levels: ['one', 'two'],                       // one name or more: the levels this bot can play at
  think(S, opt) {                               // S: the position. opt: { level, size, timeMs, rand }
    const moves = legalMoves(S);                // every line not yet drawn
    return moves[Math.floor(opt.rand() * moves.length)];   // one of them: the line to draw
  },
};
```

- `levels` lists at least one name. The game asks for a move at one of them (`opt.level`); how many there are and
  what each means is the bot's own business. Each level plays on both boards.
- Everything in `engine/rules.js` is in scope in the file, so a bot need not write the rules again. It may keep a
  picture of the board of its own for speed; the move it returns is checked against `engine/rules.js` all the same.
- `bots/random.js` and `bots/greedy.js` are two small bots that show the whole of what a file has to be.

## The rules of the game

`docs/RULES.md` is the complete text. They are the rules of dots and boxes. In short:

A square of dots: 6 × 6 dots (25 squares) or 8 × 8 dots (49 squares). Two sides, **Red** and **Gold**. Red draws
first.

- **A move** draws one line between two dots next to each other, across or down, where no line is drawn yet.
- **Whoever draws the fourth side of a square takes it, and draws again.** A line that closes two squares at once
  takes both, and its side draws again once. A line that takes nothing hands the turn over.
- **Taking is never compulsory**, and nobody ever passes: there is always a line to draw until the game is over.
- **The game is over when every line is drawn.** Every square has been taken by then; whoever took more wins. The
  boards have an odd number of squares, so there is no draw.

## What `think` gets

`S` is a copy of the game made for this one call. Change it as you like (`make`, `unmake`); it is thrown away.

| | |
|---|---|
| `S.n` | the board: 5 or 7 squares to a row (the same as `opt.size`) |
| `S.g` | what that board looks like, from `geometry(S.n)`: see below |
| `S.line` | `Uint8Array`, one entry a line: 1 where it is drawn, 0 where it is not |
| `S.sides[s]` | how many of square `s`'s four sides are drawn, 0 to 4 |
| `S.owner[s]` | who took square `s`: `RED` 0, `GOLD` 1, or −1 |
| `S.score` | squares taken so far, `[Red, Gold]` |
| `S.turn` | whose move it is: `RED` 0 or `GOLD` 1. That is you |
| `S.left` | how many lines are still to be drawn |
| `S.history` | every line drawn in the game so far, in order |

`think` is only ever called when the game is on and it is your move. That may be in the middle of your own turn:
after you take a square you are asked again, with the square already yours.

`opt.level` is one of your level names. `opt.size` is 5 or 7. `opt.timeMs` is what you are asked to stay within for
this move (1000 in the arena, in the leagues and in the game). `opt.rand()` gives a number from 0 up to 1: use it for
anything random, not `Math.random`, so that a game can be played again exactly.

**Lines, dots and squares are numbers.** On a board of n × n squares, with n + 1 dots to a row:

```
dot      x + (n + 1) × y                                   x, y from 0, counted from the top left
line     across, from dot (x, y) to (x + 1, y):   x + n × y                     0 … n(n + 1) − 1
         down,   from dot (x, y) to (x, y + 1):   n(n + 1) + x + (n + 1) × y    n(n + 1) … 2n(n + 1) − 1
square   x + n × y, named by its top left dot
```

So 5 × 5 has lines 0 to 59 (0 to 29 across), and 7 × 7 has lines 0 to 111 (0 to 55 across). A move is a line's
number: return one of `legalMoves(S)`.

`S.g`, worked out once for each board:

```
g.n  g.dots  g.across  g.lines  g.squares       5 6 30 60 25   or   7 8 56 112 49
g.lineSq[2m], g.lineSq[2m + 1]                  the squares on either side of line m (above and below it, or left
                                                and right of it); −1 where that side is off the board
g.sqLine[4s], … g.sqLine[4s + 3]                the four sides of square s: top, right, bottom, left
g.lineDot[2m], g.lineDot[2m + 1]                the two dots line m joins, the top or left one first
```

## What you can call

```
legalMoves(S)            every line not yet drawn, as an array; empty when the game is over (never empty when think is called)
gen(S, out, off = 0)     the same, written into out from index off; returns how many. No array made: use it in a search
make(S, m)               draws line m without checking it. Returns how many squares it took: 0, 1 or 2.
                         When that is more than 0, S.turn has not changed: the same side moves again
unmake(S)                takes the last make back
takes(S, m)              how many squares drawing m would take now: 0, 1 or 2
isSafe(S, m)             would drawing m give no square its third side?
describe(S, m)           what m will do: { m, side, across, from, to, took: [squares], again, gives: [squares left
                         with three sides for the other side to take] }
geometry(n)              the board of n × n squares (S.g is geometry(S.n))
lineName(m, n)  lineAt('a1-b1', n)            'a1-b1' for line 0, and back (either dot first; −1 if no such line)
dotName(d, n)   dotAt('b2', n)                'b2' for dot n + 2, and back
squareName(s, n)  squareAt('a1', n)           'a1' for square 0, and back
keyLo(S) keyHi(S)        two 32-bit halves of a key for the position (the lines drawn and whose move it is, not the
                         score), for a table of positions already searched
lastMove(S)              the line drawn just before, or −1 when make has drawn none
RED GOLD  SIDE  SIZES  COLS
```

Inside a search, after `make(S, m)`:

- `S.left === 0`: **the game is over.** `S.score[RED]` and `S.score[GOLD]` are the squares each side took.
- `make` returned 1 or 2: the side that drew `m` is to move again (`S.turn` is still that side).
- `make` returned 0: the turn has passed to the other side.

A game on 5 × 5 has exactly 60 moves, and on 7 × 7 exactly 112, however it goes: every line gets drawn. A turn can
be many moves long.

## What a bot is held to

- Plain JavaScript in one file. No `import`, no `require`, no DOM, no timers, no network. The file runs as the body
  of a function in strict mode, so whatever you declare is your own and cannot clash with the rules.
- It runs in a web worker in the game and under Node in the arena. `performance.now()` is there; `console` is
  there but nobody reads it.
- You may keep things between calls (a table of positions, say), but each call must stand alone: you can be asked
  about any game on either board at any time.
- Answer within `opt.timeMs`. A bot that takes more than three times that, returns a move that is not allowed, or
  throws, **loses the game on the spot**.
- The game is played on phones as well as on laptops: in the same time, the same bot gets less done there.

## Trying it

Node 18 or later, nothing to install. From the folder this file's `docs/` is in:

```
node arena/contract.test.js                          the checks every bot is held to; a file in bots/ is picked up by itself
node arena/arena.js --vs <your-name> --games 20      each of your levels against everyone, on both boards, with ratings
node arena/arena.js --vs <your-name> --size 7        on one board only
node engine/rules.test.js                            the rules, if you want to see them hold
```

The arena prints each pair's score on each board, any game lost by forfeit and why, and a table of ratings for each
board apart.

To play against your bot by hand, open `board.html` from the kit in a browser, pick the board, choose your file for
one side and pick a level. Two bots can be set against each other there too, and a bot that breaks is named with its
error.
