# Wax & Wane: the rules

The complete rules of the game, for people and for programs. Wax & Wane is played by the rules of Othello, the game
also known as Reversi: whoever knows those knows this game. Where this text and `engine/rules.js` could be read
differently, `engine/rules.js` is the rules: it is the one file the game, every computer player and the arena run.

## 1. The game in short

Two sides, **Dark** and **Light**, on a board of 8 × 8 squares. They share one kind of piece, the **disc**, which is
dark on one face and light on the other. A disc belongs to the side whose face is up. (In an ordinary Othello set
Dark is Black and Light is White.)

On your move you put one disc on the board, your face up, so that it **encloses** discs of the other side between
itself and another disc of yours, in a straight line. Every disc enclosed is **turned over** and is yours from then
on. Discs are never taken off the board and never moved: they only change face.

Dark moves first. The game ends when neither side can move, and **the side with more discs showing its face wins**.

## 2. The board and the start

Files (columns) are `a` to `h` from left to right. Ranks (rows) are `1` to `8` **from the top down**, the way games
of Othello are written down. A square is named by file and rank: `a1` is the top left corner, `h8` the bottom right
one. The board has no near side or far side: neither player owns an edge, and every direction counts the same.

The game starts with four discs on the four middle squares, the two of each side diagonal to each other: Light on
`d4` and `e5`, Dark on `e4` and `d5`. In the diagrams `X` is a Dark disc, `O` a Light disc and `.` an empty square.

```
     a b c d e f g h
  1  . . . . . . . .
  2  . . . . . . . .
  3  . . . . . . . .
  4  . . . O X . . .
  5  . . . X O . . .
  6  . . . . . . . .
  7  . . . . . . . .
  8  . . . . . . . .

  Dark to move: d3 c4 f5 e6
```

There are 64 discs for the 64 squares, shared by both sides: nobody can run out of discs.

## 3. A move

A move puts **one disc** on **an empty square**, the mover's face up. It is allowed only if the new disc
**encloses** at least one disc of the other side.

### 3.1 Enclosing

Start from the new disc and go in a straight line: along the row, along the column or along a diagonal, eight
directions in all. In one direction the new disc encloses when

1. the very next square holds a disc of the other side,
2. more discs of the other side may follow it, with no gap between them, and
3. right after the last of them stands a disc of the mover's own.

The discs of the other side that stand between the new disc and that disc of the mover's own are enclosed. There
may be one of them or several.

```
     a b c d e f g h             a b c d e f g h
  3  . . . . . . . .          3  . . . . . . . .
  4  . . . O X . . .          4  . . . O X . . .
  5  . . . X O . . .          5  . . . X X X . .
  6  . . . . . . . .          6  . . . . . . . .

  Dark plays f5, turning e5
```

Going left from `f5`: `e5` is Light, and right after it `d5` is Dark. So `e5` is enclosed.

### 3.2 Everything enclosed is turned over

A disc may enclose in several directions at once. **Every** disc enclosed, in **every** direction, is turned over.
The mover does not choose among them and may not leave any as it was.

```
     a b c d e f g h             a b c d e f g h
  2  . . . . X . . .          2  . . . . X . . .
  3  . . X . O . . .          3  . . X . X . . .
  4  . . . O O . . .          4  . . . X X . . .
  5  . . X O . O . .          5  . . X X X O . .

  Dark plays e5, turning d4 e4 e3 d5
```

Up and to the left `d4` is enclosed (by `c3`), straight up `e4` and `e3` (by `e2`), to the left `d5` (by `c5`).
To the right `f5` is not: nothing Dark stands beyond it.

### 3.3 What is not enclosed

- **A gap breaks the line.** Discs on the far side of an empty square are not enclosed.
- **Only as far as the nearest disc of the mover's own.** Discs of the other side that stand farther along the
  same line, beyond that disc, stay as they are.
- **The edge encloses nothing.** A run of discs that reaches the edge of the board, with no disc of the mover's
  own at its end, is not enclosed.

```
     a b c d e f g h             a b c d e f g h
  1  X O X O . O . X          1  X O X X X O . X

  Dark plays e1, turning d1
```

To the left only `d1` is turned: the line stops at `c1`, and `b1` stays Light although it stands between two Dark
discs. To the right `f1` stays Light: `g1` is empty.

- **Only lines from the new disc count.** A disc that has just been turned over encloses nothing in its turn.
  After a move there may well be discs of the other side standing between two of the mover's; they stay.

```
     a b c d e f g h             a b c d e f g h
  1  . O X . . . . .          1  X X X . . . . .
  2  . O . . . . . .          2  . O . . . . . .
  3  . X . . . . . .          3  . X . . . . . .

  Dark plays a1, turning b1
```

`b2` now stands between `b1` and `b3`, both Dark, and stays Light: the new disc is on `a1`, and no line from `a1`
has `b2` between `a1` and a Dark disc.

### 3.4 A square that encloses nothing

Putting a disc there is not allowed, however many discs stand next to it.

```
     a b c d e f g h
  3  . . . . . . . .
  4  . . . O X . . .
  5  . . . X O . . .
  6  . . . . . . . .

  Dark may not play c5
  Dark may not play f4
  Dark may not play c3
```

## 4. Passing

A side with no move **passes**: it misses that turn, and the other side moves again. A side that has a move must
make one. It may not pass instead.

```
     a b c d e f g h
  1  X . . . . . . .
  2  . O . . . . . .
  3  . . . O . . . .

  Light to move: pass
```

Light has nowhere to enclose anything (a disc on a corner cannot be enclosed at all), and Dark can still play `c3`.
So Light passes and Dark moves:

```
     a b c d e f g h             a b c d e f g h
  1  X . . . . . . .          1  X . . . . . . .
  2  . O . . . . . .          2  . X . . . . . .
  3  . . . O . . . .          3  . . X O . . . .

  Dark plays c3, turning b2
```

```
     a b c d e f g h
  1  X . . . . . . .
  2  . X . . . . . .
  3  . . X O . . . .

  Light to move: b3
```

A pass is for one turn. A side may have to pass several turns running while the other side goes on moving, and it
plays again as soon as it has a move.

## 5. The end of the game

The game is over when **neither side can move**. Most often the board is full by then. It can come sooner: one
side may have no disc left, or squares may be left where neither side encloses anything.

Then the discs are counted. The side with more discs showing its face has won. With the same number each, the game
is **drawn**. Empty squares count for nobody. A score is written with Dark's discs first.

```
     a b c d e f g h
  1  X X X . O O . .

  Nobody can move. Dark 3, Light 2: Dark wins
```

```
     a b c d e f g h
  1  X X . O O . . .

  Nobody can move. Dark 2, Light 2: drawn
```

The shortest game there is lasts nine moves and leaves Light without a disc:

```
  From the start: f5 d6 c5 f4 e7 f6 g5 e6 e3
  Nobody can move. Dark 13, Light 0: Dark wins
```

Nothing else ends a game. There is no limit on moves and no rule about a position coming back: every disc put down
stays on the board, so a game has at most 60 moves that put one down, and whatever passes fall between them.

## 6. Points that are easy to get wrong

1. **A move has to turn something.** An empty square next to discs is no move unless the new disc encloses.
2. **All of it.** Everything enclosed is turned over, in every direction. There is no choosing.
3. **No chain.** Only lines that start from the new disc count. Discs turned over by a move enclose nothing.
4. **To the nearest of your own, and no farther.**
5. **A gap or the edge encloses nothing.**
6. **Passing is never a choice.** With a move to make, a side makes one, even a move that helps the other side.
7. **A pass does not end the game.** The game ends only when both sides are without a move. One side may pass
   again and again while the other plays on.
8. **The board need not fill up.** A game can end with empty squares, and with one side holding no discs at all.
9. **Corners stay.** A disc on a corner square can never be enclosed, so it is never turned over again. This is
   not a rule of its own: no straight line has a corner in its middle.
10. **Dark always moves first.** Who plays Dark is for the players to settle.

## 7. Words used

| Word | Meaning |
|---|---|
| disc | the one kind of piece: dark on one face, light on the other |
| Dark, Light | the two sides; a disc is Dark's while its dark face is up |
| enclose | to have discs of the other side in an unbroken straight run between the new disc and one of your own |
| turn over | an enclosed disc changes face, and so changes side |
| pass | a side with no move misses its turn |

## 8. What is not in these rules

Rule sheets for Othello and for the older Reversi differ here and there. For the avoidance of doubt, in this game:

- The first four discs are always the ones in section 2. The players do not place them themselves.
- There is no stock of 32 discs a side to run out of.
- A side with no move passes. The game does not end until both sides are without a move.
- Empty squares at the end are not added to the winner's count.
- No disc is given on a corner as a handicap.
- The rules have no clock. A computer player is given an allowance for each move, which is not part of the rules
  of the game (`docs/BOT_BRIEF.md`).

## 9. The rules as a program

`engine/rules.js` is plain JavaScript with nothing around it. In short:

- **Squares** are numbered 0 to 63, a1 first, row by row: `square = file + 8 × (rank − 1)`, so a1 0, h1 7, a8 56,
  h8 63.
- **Sides** are `DARK` 0 and `LIGHT` 1. **A square** holds 0 when it is empty, 1 for a Dark disc, 2 for a Light one.
- **A move** is the number of the square the disc goes on. A pass is the number 64, `PASS_MOVE`.
- **A position** is the board and whose move it is. Nothing else matters: how the position came about changes
  nothing.
- A side that must pass has exactly one move, `PASS_MOVE`. When the game is over there are no moves.
- `newGame()`, `legalMoves(S)`, `playMove(S, m)` and `describe(S, m)` are all a referee needs.

For anyone writing the rules again in another language, these counts have to come out the same. From the start
there are 4 moves, and the number of different games of 1 to 11 moves is:

| Moves | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Games | 4 | 12 | 56 | 244 | 1,396 | 8,200 | 55,092 | 390,216 | 3,005,288 | 24,571,284 | 212,258,800 |

A pass counts as a move, and a game that is over sooner counts once. These are the counts known for Othello.

`engine/perft.txt` has such counts for positions from the middle and end of games, made by a second, separate
program. `node engine/rules.test.js` checks the rules against them, and `node engine/rules.doc.test.js` checks
every diagram and statement on this page.
