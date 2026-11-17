# Commander Chess

Cờ Tư Lệnh (by Nguyễn Quý Hải), by his own rules as he last set them out, with a campaign: a coast of five garrisons, opponents with ratings
and their own way of playing, points won and lost by rating, and a card for every opponent beaten. One self-contained
page. RULES.md says where each rule comes from, and what was read and not followed.

    npm run build     # src/ → dist/index.html
    npm test          # the rules: one check per rule, 11 positions from cotulenh.vn, random games
    npm run sim -- isolde nadia 10    # let two of the computer's players meet
    npm start         # serve dist/ (Railway runs build, then this)

## What is where

- `src/engine/00-core.js`: the rules (see RULES.md).
- `src/engine/10-ai.js`, `20-players.js`: the computer player, and how each opponent plays.
- `src/game/60-campaign.js`: places, the women, what they say, points, what is saved.
- `src/game/40-art.js`, `50-board.js`, `70-screens.js`, `80-main.js`, `src/shell.html`: everything seen.
- `test/site-vectors.js`: what cotulenh.vn lit up for every piece in eleven positions of two games played there
  (plain moves, where it and the author agree).

## Pictures

Every woman has a drawn stand-in. Set `ART.base` in `60-campaign.js` to a folder that has
`<id>/portrait.webp`, `<id>/card-1.webp`, `card-2.webp`, `card-3.webp` (ids: pia, sol, hana, nadia, isolde) and
the pictures are used instead; a missing file falls back to the stand-in.

## Ratings

The five at Port Halcyon were put in order by letting them play each other under the rules as they are now
(`tools/sim.js`, colours alternating):

    Marisol beat Pia      37 of 40
    Hana    beat Marisol  19 of 20
    Nadia   beat Hana      8 of 8
    Isolde  beat Nadia     5 of 6 at battles, 4 of 4 at total war

Nadia is the one with a taste for riding (`ride` in her style): against a copy of herself without it she scored 5 of
10, and had a stack of three on the board some sixty times as often. The others ride only when a line they can see
calls for it.

So the order is measured. The numbers (500, 950, 1350, 1700, 2000) are spaced narrower than those scores say,
because machines beating machines exaggerate the gap a person feels; they want adjusting once people have played.
You start at 600. Only the first place is built; the other four are on the chart with what is planned for them.
