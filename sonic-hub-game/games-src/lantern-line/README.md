# Lantern Line

Dots and boxes in the Pingxi valley, on a 5 × 5 or a 7 × 7 board: close a square and its sky lantern lights in your
colour. One against the house bot, whose levels are the stops of the Pingxi line (beat a stop on a board and its
station stamp is pressed), or two at one screen.

The portal serves it at `/games/lantern-line` (`../../public/games/lantern-line.html`). The page carries everything it
needs, the house bot and the typefaces included.

## Run it

```
npm install      once: the two typefaces the page carries
npm run build    puts the page together where the portal serves it from
npm test         the rules, what a bot is held to, the leagues, the house bot, the page, the kit
npm run kit      packs what a bot's writer is handed: dist-kit/lantern-line-kit.zip
npm run league   every bot in bots/, at every level, against every other, on each board apart
npm run arena -- --vs <name>   one bot against the rest, pair by pair, on both boards
```

What is built is committed, as the portal's other games are: after changing anything here, `npm run build`, and
`npm test` says so if it was forgotten. `node game/build.js --out /tmp/lantern-line.html` builds it somewhere else.

## What is where

```
engine/rules.js    the rules; the page, every bot and the arena all run this one file
engine/host.js     hands a bot its position and its board, and checks the move it gives back
docs/RULES.md      the complete rules, in words; engine/rules.doc.test.js reads its drawings and holds the page to the
                   rules, and engine/counts.txt holds counts made by a separate program
docs/BOT_BRIEF.md  how a bot plugs in: what its file is, what it is given, what it is held to
bots/              one file a bot: house.js is this game's own, random.js and greedy.js are the kit's two samples;
                   written-by.json says which model wrote which
arena/             league.js: a league on each board, every game kept with its moves (league-5x5.json, league-7x7.json)
                   and the ratings fitted to them (ratings-5x5.json, ratings-7x7.json); arena.js rates bots pair by
                   pair on both boards; contract.test.js checks every file in bots/; house.test.js is what the house
                   bot is expected to see and do
game/              the page: shell.html and src/ (the painting, the valley, the sounds, the bots' workers, the board,
                   the game), put together by build.js; fonts/ holds the few Chinese characters it shows
kit/               the kit that goes out to a bot's writer: its first page and build.js; its board is the game's own
                   page built with no bot in it
```

The typefaces are Alegreya and Alegreya Sans, and LXGW WenKai TC cut down to the characters the page shows, all under
the SIL Open Font License 1.1.
