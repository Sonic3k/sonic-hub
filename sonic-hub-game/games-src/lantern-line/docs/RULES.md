# Lantern Line: the rules

The complete rules of the game, for people and for programs. Where this text and `engine/rules.js` could be read
differently, `engine/rules.js` is the rules: it is the one file the game, every computer player and the arena run.

The game is the one known as dots and boxes.

## 1. The game in short

Two sides, **Red** and **Gold**, on a square of dots. They take turns to draw a line between two dots next to each
other, across or down. Whoever draws the **fourth side of a square takes it**, and **must draw again**. A line that
takes nothing hands the turn to the other side. When every line has been drawn, every square has been taken, and
**whoever has taken more squares wins**.

Red draws first.

## 2. The board

The game is played on one of two boards. Which one is settled before the game starts; the rules are the same on both.

| Board | Dots | Squares | Lines | Squares that win |
|---|---|---|---|---|
| 5 × 5 | 6 × 6 | 25 | 60 | 13 or more |
| 7 × 7 | 8 × 8 | 49 | 112 | 25 or more |

**Names.** A dot is named by its column letter, `a` from the left, and its row number, `1` from the top: `a1` is the
top left dot on both boards. A line is named by its two dots, the top or left one first: `a1-b1` runs across,
`a1-a2` runs down. A square is named by its top left dot: square `a1` is the one with `a1`, `b1`, `a2` and `b2` at its
corners.

The 5 × 5 board at the start:

```
     a   b   c   d   e   f
  1  +   +   +   +   +   +

  2  +   +   +   +   +   +

  3  +   +   +   +   +   +

  4  +   +   +   +   +   +

  5  +   +   +   +   +   +

  6  +   +   +   +   +   +
```

In the drawings on this page `+` is a dot, `---` a line across, `|` a line down, and a letter in a square says who
took it: `R` Red, `G` Gold. A drawing of a corner of a board shows the top left of the 5 × 5 board.

## 3. Drawing a line

A move is **one line** between two dots next to each other in the same row (across) or the same column (down), where
no line has been drawn yet. A diagonal line, a line that passes a dot, and a line that is already there are not
moves. No line belongs to either side: every line not yet drawn may be drawn by whoever's turn it is, and a line
counts the same whoever drew it.

A line round the edge of the board is a side of one square. Every other line is a side of two.

## 4. Taking a square

A line that is the **fourth side** of a square takes that square for the side that drew it, whoever drew the other
three. The same side then **draws again**.

```
     a   b   c
  1  +---+   +
         |
  2  +---+   +

  3  +   +   +
```

Red drew `a1-b1`, Gold `b1-b2`, Red `a2-b2`: square `a1` has three sides, and it is Gold's turn. Gold draws `a1-a2`,
takes square `a1`, and draws again:

```
     a   b   c
  1  +---+   +
     | G |
  2  +---+   +

  3  +   +   +
```

- A line can be the fourth side of **two squares** at once. It takes both, and its side draws again **once**.

  ```
       a   b   c   d
    1  +---+---+   +
       |       |
    2  +---+---+   +

    3  +   +   +   +
  ```

  Squares `a1` and `b1` have three sides each, and `b1-b2` is the fourth side of both. Here it is Red's turn: Red
  draws `b1-b2`, takes two squares, and draws one more line.

- A turn goes on for as long as each line takes something: a side may take many squares in one turn, one line
  after another.
- A line that takes nothing ends the turn.
- When the line that takes is the last line on the board, the game is over. Nobody draws after it.

## 5. Taking is a choice

Nothing obliges a side to take a square it could take. It may draw any other line instead. The square stays as it
is, with its three sides, for whoever draws its fourth side later: the other side, or the same side on another turn.

What is not a choice is drawing again: a side that has taken a square must draw another line, even when every line
left on the board gives squares away.

## 6. How a game ends

The game ends when the last line is drawn. Every square has then been taken, and **whoever has taken more squares
wins**. The boards have 25 and 49 squares, so the squares can never be shared evenly: **no game is drawn**.

A game on the 5 × 5 board always lasts 60 lines and on the 7 × 7 board 112, however many turns they take. A game is
played to the end even when one side already has more than half the squares.

## 7. Points that are easy to get wrong

1. **Lines are drawn, squares are taken.** A line belongs to nobody. A square goes to whoever draws its fourth side,
   whoever drew the other three.
2. **Taking means drawing again.** After a line that takes, the same side must draw another line, which may give
   squares away.
3. **Two at once is one more line.** A line that takes two squares earns one more line, not two.
4. **Taking is never compulsory.** A square with three sides may be left for later, by either side.
5. **The third side is the dangerous one.** A line that gives a square its third side, and takes nothing, hands that
   square to the other side, who draws next.
6. **The edge counts as nothing.** A square along the edge of the board needs all four of its own lines drawn to be
   taken. The edge of the board is not a side of it.
7. **No passing, no erasing.** A side must draw on its turn, there is always a line to draw until the game is over,
   and a line once drawn stays.

## 8. Words used

| Word | Meaning |
|---|---|
| line | what a move draws: between two dots next to each other, across or down |
| side | one of the four lines round a square |
| take | draw the fourth side of a square, and with it the square |
| turn | one side's lines, from the first to the one that takes nothing (or the last line of the game) |
| safe line | a line that gives no square its third side, and takes nothing |

## 9. The rules as a program

`engine/rules.js` is plain JavaScript with nothing around it. In short:

- **Dots** are numbered `x + (n + 1) × y` on a board of `n × n` squares, `x` from the left and `y` from the top, both
  from 0.
- **Lines** are numbered across ones first, row by row: the line from dot `(x, y)` to `(x + 1, y)` is `x + n × y`;
  then the lines down: from `(x, y)` to `(x, y + 1)` is `n(n + 1) + x + (n + 1) × y`. On the 5 × 5 board `a1-b1` is
  0, `e6-f6` is 29, `a1-a2` is 30 and `f5-f6` is 59.
- **Squares** are numbered `x + n × y`, `(x, y)` being the top left dot.
- **A position** is the lines drawn, the squares each side has taken, and whose move it is.
- `newGame(n)`, `legalMoves(S)`, `playMove(S, m)` and `describe(S, m)` are all a referee needs.

Any line not yet drawn is a move, so the number of moves from a position is only the number of lines left. What a
program can get wrong is who moves next and who takes what. These counts check that, for anyone writing the rules
again in another language. They are counted over every different continuation of so many lines from the position
below, a 5 × 5 board on which both sides drew only safe lines until none was left. Red is to draw, nothing has been
taken, and 30 lines are left.

```
     a   b   c   d   e   f
  1  +   +   +---+---+   +
     |       |       |   |
  2  +---+---+   +   +   +
     |           |   |   |
  3  +   +---+---+   +   +
         |           |
  4  +---+   +---+---+---+
     |           |       |
  5  +   +   +   +   +   +
         |   |       |
  6  +---+   +---+---+---+
```

| Lines on | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Continuations | 30 | 870 | 24,360 | 657,720 |
| after which Red is to draw | 0 | 822 | 3,852 | 470,960 |
| Red's squares, summed over them | 0 | 0 | 2,616 | 82,396 |
| Gold's squares, summed over them | 0 | 48 | 1,416 | 135,356 |

`engine/counts.txt` has the same four counts for 120 positions on the two boards, from the start to the last few
lines, made by a second, separate program. `node engine/rules.test.js` checks the rules against them, and
`node engine/rules.doc.test.js` checks every statement on this page.
