# Commander Chess

Cờ Tư Lệnh (by Nguyễn Quý Hải) with a campaign: a coast of five garrisons, opponents with ratings and their own way
of playing, points won and lost by rating, and a card for every opponent beaten. One self-contained page.

    npm run build     # src/ → dist/index.html
    npm test          # the rules: 11 positions from cotulenh.vn, one check per rule, random games
    npm run sim -- isolde nadia 10    # let two of the computer's players meet
    npm start         # serve dist/ (Railway runs build, then this)

## What is where

- `src/engine/00-core.js`: the rules, as cotulenh.vn plays them (its guide, then checked against the site itself).
- `src/engine/10-ai.js`, `20-players.js`: the computer player, and how each opponent plays.
- `src/game/60-campaign.js`: places, the women, what they say, points, what is saved.
- `src/game/40-art.js`, `50-board.js`, `70-screens.js`, `80-main.js`, `src/shell.html`: everything seen.
- `test/site-vectors.js`: what the site lit up for every piece in eleven positions of two games played there.

## Pictures

Every woman has a drawn stand-in. Set `ART.base` in `60-campaign.js` to a folder that has
`<id>/portrait.webp`, `<id>/card-1.webp`, `card-2.webp`, `card-3.webp` (ids: pia, sol, hana, nadia, isolde) and
the pictures are used instead; a missing file falls back to the stand-in.

## Ratings

The five at Port Halcyon were rated by letting them play each other (`tools/sim.js`): each one beats the one below
her nearly every game, so the numbers are spread wide. Only the first place is built; the other four are on the
chart with what is planned for them.
