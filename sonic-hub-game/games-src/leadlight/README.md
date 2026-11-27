# Leadlight

A lane card game, set in stained glass: every card, landscape and portrait is drawn in code as leaded glass. The
battle is the original mobile card game's, ported line by line, with all of its card, hero, deck and quest data.

    npm install                  the typefaces the page carries
    npm test                     the engine's tests (every practice table played to its end, a thousand random
                                 pairings) and the page's (it builds, its scripts compile together, decks are held
                                 to the original's rules)
    npm run sim -- 2000 7        2000 random matches, printing every error and every place the original would have hung
    node game/build.js           ../../public/games/leadlight.html and leadlight-admin.html (the cast page)

## Where things are

- `engine/` — the battle. `core.js` is the hand port of the original's GameState, CardScript, Lane, Deck and AI;
  `scripts.js` is the original's card and hero scripts, converted by `tools/transpile.py`; `match.js` runs a match
  (turns, landscapes, the Rose Window, running out of cards); `catalog.js` builds cards, heroes and preset decks.
- `content/data.json` — every card, hero, preset deck and quest, every number as in the original's tables. Made by
  `tools/extract.py` from the original's data with the names in `content/names.json`, which `tools/names.py` writes
  from `tools/rename.json`. `content/cast.json` — the women at the tables, each hero card being one of them in a form.
- `game/` — the page: `shell.html`, and `src/` (the glass painter in 20–25, cards 30, the deck rules and saves 40,
  the battle 50, the Rose Window 52, decks 60, the screens 70). `admin.html` is the cast page.

## Rules kept from the original

The wheel's zones and speed come from the player's hero (TimeFor1Spin, hit and critical ranges) and the table
(SpinFactor and its modifiers); a hit deals ATK, a critical ATK × CritDamageMod; defending, a hit blocks and a
critical strikes back. Creatures go only on lanes of their realm. A deck has at least 10 cards, no more than 4 of
one card, and no more than its hero's rank allows; its landscapes are laid as the original lays them. Where the
original would have hung or crashed on its own data, the engine passes over and notes it (`AIManager.Faults`).
