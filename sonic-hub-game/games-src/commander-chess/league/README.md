# The league

Every computer player written for the game so far, at one table: the 14 bots handed in from the AI kit (a bot with
levels is one player for each level), the game's own five opponents, and the two test opponents that two of the
sessions had written for their own trials (added after the first 1518 games; only their games were played then).
Every pair meets six times, three with each colour, at 1000 ms a turn, battles with the standard line-up.
19 November 2026: 25 players, 1800 games.

    commander-chess-league.xlsx      the result: Standings, Head to head, Games
    out/results.jsonl                every game, with its moves
    bots/                            the players' files as they were handed in; house.js is the game's own five (tools/build-house.js)
    kit/                             the rules and the table the games were played with (AI kit 2)

    node tools/run.js                plays what has no result yet, two games at a time, each on a core of its own (needs taskset); it can be stopped and started again
    node tools/standings.js          the table and the ratings
    node tools/verify.js             plays every recorded game again against the rules
    tools/finish.sh                  from the results to the workbook

To add a player: put its file in `bots/`, add it to `tools/players.js`, and run again. Only the games that are new are played.
