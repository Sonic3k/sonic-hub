# The rules of Lines 98, as the program plays them

`engine/rules.js` plays by these, and `engine/rules.test.js` holds it to them, section by section.

## Where they come from

They were read from the program itself, not from other people's accounts of it:

- **Lines 98 version 4.2** (SORCERER, Dmitry V. Kivilyov, Perm, 08/1998): the build the hub keeps as package
  `lines98` ("the original he found again"). Its help file, `LINES98.HLP`, gives the rules in Russian and the formula
  for the points. Its program, `lines98.exe` (61 KB, Borland C++ 5.01, not packed), was disassembled and the part that
  plays the game read through: the addresses below are in that file.
- **Lines 98 version 5.0** (SorcererSoft, 02/2004): the build the hub keeps as package `lines98-fruit`. Its English
  help says the same in fewer words, and its program has the same search for lines and the same count of points
  (the shortest line of five, then `count - 4` handed to the routine that takes the balls off).

Lines 98 says of itself that it was made after *Disappearing Balls* (Oleg Demin, 1993), which is Color Lines.

Only the game called **Lines** is described and played here. The program has two more (Squares: rectangles of four
or more; Blocks: seven or more joined side by side), a timer that brings the new balls after so many seconds whether
or not a move was made, saved games in files, a table of ten leaders, and skins. None of those is in this game.

## 1. The board and the balls

Nine squares by nine. Balls of seven colours. A square holds one ball or none.

## 2. The start (`0x40370c`)

The board is cleared and the points set to 0. Five balls are put down, one after another: each on a free square
chosen at random, each of a colour chosen at random. Then the three to come are drawn (section 5).

Every free square is as likely as any other, and so is every colour.

## 3. A move (`0x40402c`, the click; `0x40188e`, the way)

- Clicking a ball picks it. Clicking another ball picks that one instead. Clicking the picked ball again leaves
  it picked.
- With a ball picked, clicking a free square moves the ball there **if there is a way**: a chain of free squares,
  each beside the last (up, down, left or right, never across a corner), from the ball to that square. A square
  where one of the three to come is shown is a free square: a ball may pass over it and stop on it.
- With no way, nothing happens (the program plays its "can't move" sound) and the ball stays picked.
- The ball travels a shortest way. Where there are several, the program takes one in particular: working back
  from the far end, the square before is the one to the right if that lies on a shortest way, else the one to the
  left, else the one below, else the one above (`0x4017ae` tries all four and the last to succeed stands). On an
  open board a ball therefore goes up or down first and along the row last.

## 4. After a move (`0x403679`)

1. **Lines are looked for** (section 6).
2. **If any ball was taken off**, nothing comes up, and the three to come stay as they were: the same colours,
   on the same squares.
3. **If none was**:
   - with **fewer than three free squares** the game is over at once, and the last squares stay empty;
   - otherwise each of the three to come that has lost its square (the moved ball stopped on it) is given a new one:
     any free square that neither of the other two has, at random. Then the three come up on their squares;
   - the next three are drawn (section 5);
   - lines are looked for again. **A line the new balls made is taken off and counted** like any other; nothing
     more follows from it.
4. If no square is free, the game is over.

**A board with nothing on it** (the last balls were taken off) does not wait for a move: step 3 follows at once, so
three balls come up (`0x403341`, at its end).

## 5. The three to come (`0x402fcf`, `0x402e48`)

Three colours are chosen at random. If at least three squares are free, each of the three is also given a free
square of its own, at random, no two the same. The program shows them small on those squares and, at the top, their
colours (an option chooses: on the board, at the top, both, or neither. They have their squares either way).

With fewer than three squares free the three have colours but no squares. If a line is then taken and the game goes
on, they come up, when their turn comes, on the squares the three before them had if those are free again, and
otherwise on free squares at random.

## 6. Lines (`0x401246`)

A line is five or more balls of one colour next to each other in a row, in a column, or on either slant.

The look goes colour by colour. For one colour, and for each of the four ways a line can run, the longest line is
looked for first (nine balls, then eight, down to five), from the top row down and from the left, and the first
one found is the one taken. So:

- a line longer than five is always taken whole;
- lines of one colour that cross are taken together, and the ball they share is one ball;
- of two separate lines of one colour that run the same way, only the first found is taken at this look. The other
  is taken at the next look, after the next move, as if that move had made it. (A single move cannot make two such
  lines. Three balls coming up can, very rarely.)

## 7. Points (`0x403341`)

For one colour's balls taken off at one look: **(number of balls − 4) × number of balls**. The help file gives the
same formula and its first two results.

| balls | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|
| points | 5 | 12 | 21 | 32 | 45 |

Two lines that cross at one ball are nine balls (5 + 5 − 1), so 45 points. Balls of two colours taken at one look
are counted colour by colour.

## 8. Step back (`0x403508`, `0x403578`)

Before each move the program keeps the board, the points and the three to come (colours and squares). Step back
returns to that, once: there is nothing to step back to again until another move has been made. Stepping back does
not cost points or a place in the table in version 4.2 (version 5.0 asks first, and keeps a player who steps back
out of its table).

Stepped back onto a board with fewer than three free squares, the program draws the colours of the three to come
anew.

A game that is over cannot be stepped back into.

## 9. What this game adds, and what it leaves alone

Everything above is the program's. Around it, this game adds things the program does not have, none of which
changes what a move does:

- eight places to play in, each with its own look, movement and sound;
- for each place a best score, and three stars at 100, 250 and 500 points. 100 is the score the program's own table
  of leaders starts with;
- the way a ball would take is shown under the pointer before the move is made;
- a game left unfinished at a place is kept there and found again.
