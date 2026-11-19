# Wax & Wane

Othello, played with moons: a board for two at one screen, or against the house bot. It is one page that needs
nothing beside it, and the portal serves it at `/games/wax-and-wane` (`../../public/games/wax-and-wane.html`).

## Run it

```
npm install      once: the two typefaces the page carries
npm run build    puts the page together where the portal serves it from; open it in a browser
npm test         the rules, what a bot is held to, the house bot, the page, the kit
npm run kit      packs what a bot's writer is handed: dist-kit/wax-and-wane-kit.zip
npm run arena    every bot in bots/ against every other, with ratings at the end
```

The built page is committed, as the portal's other games are: after changing anything here, `npm run build`, and
`npm test` says so if it was forgotten.

## What is where

```
engine/rules.js    the rules; the page, every bot and the arena all run this one file
engine/host.js     hands a bot its position and checks the move it gives back
docs/RULES.md      the complete rules, in words; engine/rules.doc.test.js reads its diagrams and holds the page to the rules
docs/BOT_BRIEF.md  how a bot plugs in: what its file is, what it is given, what it is held to
bots/              one file a bot: house.js is this game's own; random.js and greedy.js are the kit's two samples
arena/             arena.js plays everyone against everyone and writes ratings.json; contract.test.js checks every
                   file in bots/; house.test.js is what the house bot is expected to see and do
game/              the page: shell.html and src/ (the painting, the sounds, the board, the game), put together by build.js
kit/               the kit that goes out to a bot's writer: its first page and build.js; its board is the game's own
                   page built with no bot in it
```

## The rules

The rules of Othello as the World Othello Federation gives them: the four discs set out diagonally at the start,
Dark first, a pass when there is no move, the game over when neither side can move, more discs wins. What other
rule sheets add and this game leaves out (the first four discs placed by the players, a stock of 32 discs a side,
empty squares counted for the winner, corners given as a handicap) is listed in `docs/RULES.md`, section 8.

## A new bot

1. `npm run kit` and give the writer `dist-kit/wax-and-wane-kit.zip`: the rules, the brief, the two sample bots, the
   arena, and a board with no computer player on which a bot's file can be tried. The house bot is not in it. Put
   the file that comes back in `bots/`. It can be tried by hand first: open the kit's `board.html` and load it for
   a side.
2. `node arena/contract.test.js` checks it. `node arena/arena.js --vs <name> --keep` plays it against everyone and
   adds its rating to the ones kept.

Still to come, as in `keepitdown-game`: a league that keeps every game, and a campaign with opponents seated from it.
