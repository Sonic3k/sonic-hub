# Wax & Wane

Othello, played with moons. Its campaign is a crossing of the Moon: the seas of the Moon are its places, the women
who live on their shores play for points, and a player's best points bring the light further across the map. Beside
the campaign, two can play at one screen, or one against the house bot, with nothing at stake.

The portal serves it at `/games/wax-and-wane` (`../../public/games/wax-and-wane.html`). The page carries the house
bot and fetches an opponent's bot from `wax-and-wane-bots/` beside it when she sits down. The page on which the cast
is given other names, ages, pictures and albums is beside it too, at `/games/wax-and-wane-admin`.

## Run it

```
npm install      once: the two typefaces the page carries
npm run build    puts the page, its cast page and the bots together where the portal serves them from, and writes docs/ROSTER.md
npm test         the rules, what a bot is held to, the league that is kept, the house bot, points and the campaign, the page, the kit
npm run kit      packs what a bot's writer is handed: dist-kit/wax-and-wane-kit.zip
npm run league   every bot in bots/, at every level, against every other: three games with each colour, every game kept
npm run arena -- --vs <name>   one bot against the rest, pair by pair: a quick rating while it is being written
```

What is built is committed, as the portal's other games are: after changing anything here, `npm run build`, and
`npm test` says so if it was forgotten.

To try the page without touching the players the game keeps, build it somewhere else and serve that folder:

```
node game/build.js --dir /tmp/ww --saves none                    players kept in the browser only
node game/build.js --dir /tmp/ww --saves http://127.0.0.1:3200   with sonic-hub-game-api running on this machine
node game/build.js --out /tmp/wax-and-wane.html --saves none     one file with every bot in it: opens from a disk
```

Opened with `?points=1200`, the page puts whoever is playing at those points, to look around without earning them.

## What is where

```
engine/rules.js    the rules; the page, every bot and the arena all run this one file
engine/host.js     hands a bot its position and checks the move it gives back
docs/RULES.md      the complete rules, in words; engine/rules.doc.test.js reads its diagrams and holds the page to the rules
docs/BOT_BRIEF.md  how a bot plugs in: what its file is, what it is given, what it is held to
bots/              one file a bot: house.js is this game's own, random.js and greedy.js are the kit's two samples, and
                   the rest came back from the writers the kit went to; written-by.json says which model wrote which
arena/             league.js plays everyone against everyone: league.json keeps every game with its moves, ratings.json
                   the ratings fitted to them, and league-xlsx.py lays the league out as a workbook; arena.js rates a
                   bot pair by pair; contract.test.js checks every file in bots/; house.test.js is what the house
                   bot is expected to see and do
content/           campaign.json: the places, who sits in each, what she is called, which bot and level she plays as, and
                   everything she says. Her rating is not in it: the build takes it from arena/ratings.json
docs/ROSTER.md     who plays as which bot, place by place, with ratings and the points at which each opens; written by the build
game/              the page: shell.html, campaign.html and campaign.css, and src/ (the painting, the map of the Moon and
                   its seas, the sounds, the board, the game, the campaign), put together by build.js; admin.html is
                   the cast page; points.test.js and build.test.js hold the campaign and what is built to account
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
2. `node arena/contract.test.js` checks it. Write the model that wrote it into `bots/written-by.json`.
3. `npm run league` plays the pairs that have not met; the games already kept stand and are not played again. A bot
   in the league is not changed: a changed file is another player and goes in under a name of its own.
4. `node arena/league.js --table --ratings` prints the table and writes everyone's rating to `arena/ratings.json`;
   `python3 arena/league-xlsx.py league.xlsx` (openpyxl) makes the workbook of it.

5. Seat her: give each of the bot's levels a place and a name in `content/campaign.json`, weakest first within a
   place, and `npm run build`. The build refuses a campaign that seats someone the league has not rated.

## The campaign

Points are counted by `game/src/15-points.js`, the same file as Keep It Down's: a newcomer starts at 600, a win
against someone who stands above brings a share of the gap, and an opponent sits down with a player whose best
points have come within 200 of her rating. A place opens with the first of its people, and nothing that has opened
shuts again. Every game won for points puts a picture in that opponent's album.

Players are kept by `sonic-hub-game-api` under the key `wax-and-wane` (`content/campaign.json` names the service):
a few to the game, the same for whoever opens it, nobody signs in. The cast's other names, ages, pictures and
albums are kept there too and changed at `/games/wax-and-wane-admin`. `game/src/12-save.js` and `13-cast.js` are
that service's own two clients, copied as they are.

Until an opponent is given a picture, a painted likeness stands in for her, and moons stand in for the pictures of
her album.
