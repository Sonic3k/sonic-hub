# Lantern Line: the rules, a bare board, and how a computer player plugs in

Lantern Line is a game for two, played by the rules of dots and boxes: the two sides take turns to draw lines between
dots, and whoever closes a square takes it and draws again. It is played on two boards, **5 × 5** and **7 × 7**
squares. This kit is the game without its computer player: the complete rules, a board to play on, and everything a
program needs to play it. What computer player to write is not said here; that comes from whoever sent you the kit.

## Two boards

A bot plays on both boards, and is told which one each time it is asked for a move. It is rated on each board apart,
in a league of its own for 5 × 5 and another for 7 × 7, so it may play each board its own way.

## What is in the kit

| | |
|---|---|
| `docs/RULES.md` | The complete rules of the game. |
| `board.html` | The game's board with **no computer player**. Open it in a browser and pick a board: two people can play at one screen. A bot's file can be loaded for either side, to play against it or to watch two bots. |
| `docs/BOT_BRIEF.md` | How a computer player plugs in: what its file has to be, what it is given and may call, what it is held to. |
| `engine/rules.js` | The rules as a program. The board, every bot and the arena run this one file. |
| `engine/host.js` | What hands a bot a position and checks the move it gives back. |
| `engine/*.test.js`, `engine/counts.txt` | The rules, tested. |
| `bots/` | Where bots live, one file each. Two small ones are there as samples. |
| `arena/` | Plays bots against each other on both boards and rates them on each. |

## Trying a bot

In a browser: open `board.html`, pick a board, load the bot's file for a side and play against it.

With Node (18 or later; nothing to install):

```
node arena/contract.test.js                  every file in bots/ is held to what a bot is held to
node arena/arena.js --vs <name> --games 20   that bot's levels against everyone, on both boards, with ratings for each
node arena/arena.js --vs <name> --size 7     on one board only
```

A bot that throws, answers with a move that is not allowed, or thinks for more than three times its allowance
loses that game on the spot.
