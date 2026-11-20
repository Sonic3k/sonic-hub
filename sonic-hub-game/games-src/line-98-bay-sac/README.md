# Line 98: Bảy Sắc

Lines 98 by its own rules, played in eight painted places chosen from a map. It is one page that needs nothing
beside it, and the portal serves it at `/games/line-98-bay-sac` (`../../public/games/line-98-bay-sac.html`).

The game is the one the family computer had in 1998: nine squares by nine, balls of seven colours, five of a colour
in a line are taken off, three more come up after every move that takes nothing. What is new is where it is played.
The road on the map starts at the house and goes through seven lands, one for each colour of ball in the order of
the rainbow (đỏ, cam, vàng, lục, lam, chàm, tím), to end among the stars:

| | place | its balls | what moves there |
|---|---|---|---|
| | Nhà, 1998 | shiny balls on grey squares, numbers in lamps | the ball that is picked hops as it did |
| red | Phố Đèn Lồng | silk lanterns, a shape for each colour | they sway and flicker; a line taken is let go into the sky |
| orange | Chợ Quê | fruit on a tray of smoked bamboo | dust in the sun; a line taken goes in juice |
| yellow | Sân Trường | glass marbles on a board drawn in chalk | the tree's shade over yard and board; marbles roll |
| green | Đầm Sen | flowers on eighty-one lily pads | koi under the pads, rings on the water, petals |
| blue | Biển | crab, starfish, scallop, turtle, jellyfish, urchin, shell | a net of sunlight through the water, bubbles |
| indigo | Chàm | balls of embroidered thread on wax-drawn cloth | a ball sews its way; a line taken comes unwound |
| violet | Ngân Hà | planets on a chart of the sky | stars that brighten and fall; a line taken collapses |

**The rules are the same in every place.** A place is how the game looks, moves and sounds, and nothing else: there
is one `engine/rules.js`, and no place can reach into it.

Every place can be gone to from the start. Each keeps its own best score, its own unfinished game, and three stars
(100, 250 and 500 points). A hundred points in a land lights its colour on the rainbow beside the game's name.

The page speaks Vietnamese or English: the browser's language at first, then whichever is chosen in its settings.

## Run it

```
npm install      once: the two typefaces the page carries
npm run build    puts the page together where the portal serves it from; open it in a browser
npm test         the rules, then the page as built
```

The built page is committed, as the portal's other games are: after changing anything here, `npm run build`, and
`npm test` says so if it was forgotten.

## What is where

```
engine/rules.js        the rules, as the program plays them; the page and the tests both run this one file
engine/rules.test.js   each rule of docs/RULES.md, and whole games played at random
docs/RULES.md          the rules in words, and where in the program each was read
game/shell.html        the page: what is on it and how it is laid out; everything painted is painted by game/src
game/src/              00 numbers, colours, what is kept, the two languages · 10 the paintbox · 20 movement and the
                       small bits that fly · 30 sound · 40 what a place is · 41–48 the eight places · 50 the table
                       (the board and what moves on it) · 60 the map · 70 what is read and pressed · 80 the game
game/build.js          puts the page together; game/fonts.js carries the typefaces into it
game/build.test.js     the page as built: that it is whole, in both languages, and the one the portal serves
```

## The rules

Read from the program itself: Lines 98 version 4.2 of 08/1998 (the hub's package `lines98`), its help file and its
code, held against version 5.0 of 02/2004 (package `lines98-fruit`). `docs/RULES.md` has them in full, with the
address in the program where each stands. In short, what other tellings of the game often get wrong:

- a game starts with **five** balls, and the three to come already have their squares;
- a line is worth **(balls − 4) × balls**: 5, 12, 21, 32, 45. Two lines that cross are one count, the shared ball once;
- a line made by the balls that come up is taken and counted too;
- the game is over when **fewer than three** squares are free after a move that took nothing: the last squares stay empty;
- a board left with nothing on it gets its three balls at once;
- **one** step can be taken back.

What the program has and this game leaves out: its other two games (Squares, Blocks), the timer that brings the new
balls on its own, saved games in files, the table of ten leaders, skins.

## A new place

A place is one file in `game/src` that calls `place({...})`: what the object holds is listed at the top of
`40-places.js`. It paints its backdrop, its board and its seven balls, says how a ball holds itself while it waits
and while it is picked, what it leaves behind and what it turns into, and what its notes are made of. The table, the
map, the sheets and the saved games need nothing else. A ninth place would also need its spot on the map
(`60-atlas.js`, `place_points`), and the count in `game/build.test.js`.

## Its pictures on the shelf

`../../scripts/capture_covers.py line-98-bay-sac` takes them: the map as a player finds it part of the way along,
and a game in the middle at Phố Đèn Lồng.
