# Leadlight

A lane card game, set in stained glass: every card, landscape, region and portrait is drawn in code as leaded glass.
The battle is the original mobile card game's, ported line by line, with all of its card, hero, deck and quest data;
so is the campaign around it, with what an offline game puts in place of the online parts.

    npm install                  the typefaces the page carries
    npm test                     the engine's tests (every campaign table played to its end, a thousand random
                                 pairings) and the page's (it builds, its scripts compile together, and the campaign's
                                 rules: ranks, stars, payouts, loot, the Kiln, selling, chests, flips, milestones)
    npm run sim -- 2000 7        2000 random matches, printing every error and every place the original would have hung
    node game/build.js           ../../public/games/leadlight.html and leadlight-admin.html (the cast page)

## Where things are

- `engine/` — the battle. `core.js` is the hand port of the original's GameState, CardScript, Lane, Deck and AI;
  `scripts.js` is the original's card and hero scripts, converted by `tools/transpile.py`; `match.js` runs a match
  (turns, landscapes, the Rose Window, running out of cards); `catalog.js` builds cards, heroes and preset decks.
- `content/data.json` — every card, hero, preset deck and quest, the star conditions, drop profiles, Kiln recipes,
  chest and gift weights: every number as in the original's tables. Made by `tools/extract.py` from the original's
  data with the names in `content/names.json`, which `tools/names.py` writes from `tools/rename.json`.
  `content/cast.json` — the women at the tables, each hero card being one of them in a form. `content/campaign.json`
  — the regions, the encore road and the milestones, written by `tools/campaign.py` (its header says what they are).
- `game/` — the page: `shell.html`, and `src/` (the glass painter in 20–26, cards 30, the deck rules 40, the
  campaign's rules and the save 42, the battle 50, the Rose Window 52, after a battle 54, the map 56, the collection
  58, decks 60, the Kiln 62, the chests 64, the screens 70). `admin.html` is the cast page.

## Rules kept from the original

The wheel's zones and speed come from the player's hero (TimeFor1Spin, hit and critical ranges) and the table
(SpinFactor and its modifiers); a hit deals ATK, a critical ATK × CritDamageMod; defending, a hit blocks and a
critical strikes back. Creatures go only on lanes of their realm. A deck has at least 10 cards, no more than 4 of
one card, and no more than its hero's rank allows; its landscapes are laid as the original lays them. Where the
original would have hung or crashed on its own data, the engine passes over and notes it (`AIManager.Faults`).

## The campaign

As the original runs it: a table's stars are won one a win, each its condition in turn, and the third brings a Jewel;
a win pays the hero XP and coins in the table's ranges (Random.Range, its top never given), the cards her creatures
left, and her hero on a first win; a loss pays nothing, and what was found stays with her. When one of her creatures
dies and nothing has dropped yet that turn, the table's drop profile rolls a card, else coins. Ranks follow
XPManager's curve to 50. The Kiln shows a recipe once its table is won and fires it for its coins and cards, keeping
ten creatures; a card sells for its price, keeping ten cards and ten creatures. Chests cost what the original's
schedule asks (10,000 coins, 3 Jewels), the first premium one free.

In place of the online parts: after every win, one card is turned over for each star of the table, by the original
daily gift's odds and pools, and may be turned again for its retry price. The holiday cards come as the standard
cards of their rarity. The second run of main tables, which nothing in the original opens, opens after the first
region as the encore road. What the original never gave — heroes, cards, the whole locked recipes — is given at the
milestones in `content/campaign.json`; heroes who sit at tables but were never given come over with wins against them.
