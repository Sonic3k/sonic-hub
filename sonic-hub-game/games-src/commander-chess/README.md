# Commander Chess

Cờ Tư Lệnh (by Nguyễn Quý Hải), by his own rules as he last set them out, with a campaign: the Lumen coast, the
stations along it, and the officers posted there. Every officer is a computer player written by an AI model from the
AI kit; they played a league among themselves, and their ratings, records and places on the List are what that
league left. Points are won and lost by rating, promotions open the stations, and every officer has three cards
to win. The game has a few players of its own, as an old game had on the machine it was installed on, and keeps
their games with the Sonic Hub games' saves service. One self-contained page. RULES.md says where each rule comes
from, and what was read and not followed; ROSTER.md says which player and which model every officer is.

    npm run build     # src/ → dist/index.html
    npm test          # the rules (one check per rule, 11 positions from cotulenh.vn, random games), the campaign
                      # against the league, the built page and its worker, every player asked for a turn
    npm run sim -- isolde nadia 10    # let two of the computer's players meet
    npm start         # serve dist/ (Railway runs build, then this)
    npm run kit       # kit/ → kit-out/commander-chess-ai-kit.zip, for whoever writes a computer player of their own
    npm run roster    # ROSTER.md, from the campaign's own files
    npm run avatars   # art/avatar-prompts.md: a portrait prompt for each officer

## What is where

- `src/engine/00-core.js`: the rules (see RULES.md).
- `src/engine/30-seat.js`: how an opponent is asked for her turn: through the kit's table (`kit/src/table.js`), at
  the league's time, so she plays in the game as she played in the league.
- `league/`: the league. `bots/` are the players as they were handed in, `tools/players.js` who took part,
  `out/standings.json` how it ended. The page carries the files of `bots/` as text and hands one to its worker when
  it is first needed.
- `src/engine/10-ai.js`, `20-players.js`: the game's own computer player. It is in the league as `bots/house.js`
  (`league/tools/build-house.js` makes that file from the two), so the page does not load them.
- `src/game/10-save.js`: the saves service's own browser client, copied as it is (`sonic-hub`, `sonic-hub-game-api/client/sonic-save.js`).
  `src/saves.json`: where that service is, and the name this game keeps its players under.
- `src/game/60-campaign.js`: stations, ranks, points, who is playing and what is kept. `61-halcyon.js` … `66-admiralty.js`: the officers
  of each station, what they say, their cards.
- `src/game/41-busts.js`, `42-scenes.js`, `43-chart.js`: the stand-in portraits, the view at each station, the chart
  of the coast. `40-art.js`, `50-board.js`, `70-screens.js`, `80-main.js`, `src/shell.html`: everything else seen.
- `kit/`, `tools/kit.js`: the AI kit. The rules engine under one name (`CC`), the rules as text, a plain table to play at
  (`match.html`, and `arena.js` for Node) and the contract a player's file has to keep (`kit/README.md`). Our own
  computer player stays out of it, so that what comes back was written without seeing it.
- `test/site-vectors.js`: what cotulenh.vn lit up for every piece in eleven positions of two games played there
  (plain moves, where it and the author agree).

## Players

The muster roll is the game's own: whoever opens the game, on any device, sees the same few names and picks theirs,
and nobody signs in. A player's save is all that is theirs (points, best points, the record against each officer, who
has been met, a game left on the table); it is written to the browser at once and sent to the service a moment later,
so the game never waits and plays on with no connection. A game played on from another device stands; the device left
behind is told and goes back to the title. The single save the first versions kept in the browser goes on as
"Player 1". The sound is each device's own.

    node build.mjs --saves none --out /tmp/cc                      # a page that keeps its players in the browser only
    node build.mjs --saves http://127.0.0.1:3200 --out /tmp/cc     # with a saves service run on this machine

## Pictures

Every officer has a drawn stand-in. Set `ART.base` in `60-campaign.js` to a folder that has
`<id>/portrait.webp`, `<id>/card-1.webp`, `card-2.webp`, `card-3.webp` (the ids are in ROSTER.md) and the pictures
are used instead; a missing file falls back to the stand-in. A portrait is shown from 16% below its top edge, so a
head-and-shoulders picture with the eyes about a third of the way down sits right in every frame.

## Ratings and the journey

A rating is the league's: every pair of players met six times (three with each colour), at the standard line-up and
a game of battles with one second a turn, which is therefore the game every table plays. The build stops if the rules or the
table are no longer the league's to the letter, because the ratings would not hold. A changed player is a new player:
the league has to be played again before the campaign can seat it.

The stations are not steps of difficulty: each has whoever is posted there, a recruit beside a general. What paces
the journey is the player's points (ROSTER.md has the numbers). A promotion opens the next station, and an officer
sits down once the player's best points come within reach of her rating. Nothing closes again.
