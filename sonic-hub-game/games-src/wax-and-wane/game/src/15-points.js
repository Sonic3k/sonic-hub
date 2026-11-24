/* ── Points: what a game for points is worth, and what a player's points open ──
   Plain arithmetic with no page in it: the game, the build and the tests all run this same file. */
const START = 600, FLOOR = 100;              // a newcomer's points; nobody falls below this
const WIN = 48, LOSS = 32;                   // the most a win brings by itself, and the most a loss costs
const SHARE = 0.2;                           // beating someone who stands above also brings this share of the gap between the two
const REACH = 200;                           // how far above a player's best points an opponent may stand and still sit down to play

/** the share of a game someone standing at `mine` is expected to take from someone at `hers`: a half between equals,
 *  three quarters when 190 points above, nine tenths when 380 above */
const expected = (mine, hers) => 1 / (1 + Math.pow(10, (hers - mine) / 400));

/** Points won or lost by a result (1 a win, 0.5 a draw, 0 a loss) against someone at `hers`.
 *  A win brings the part of WIN that was not expected, and, when she stood above, a share of the gap as well: 24
 *  between equals, 51 against someone 100 above, 76 against someone 200 above, and 12 against someone 200 below.
 *  So the game worth playing is the one against whoever stands highest, and a player gets to where she belongs in
 *  a couple of dozen games. A loss costs the part of LOSS that was expected: 16 between equals, 8 to someone 200
 *  above, 24 to someone 200 below. A win is worth more than a loss costs, so playing on moves a player up.
 *  A draw is half-way between the two. A win always brings at least one point and a loss always costs at least one. */
function stake(mine, hers, score) {
  const e = expected(mine, hers);
  const win = Math.max(1, Math.round(WIN * (1 - e) + SHARE * Math.max(0, hers - mine)));
  const loss = Math.min(-1, -Math.round(LOSS * e));
  return score === 1 ? win : score === 0 ? loss : Math.round((win + loss) / 2);
}

/** The points at which each opponent and each room opens, by id. An opponent sits down with a player whose best
 *  points have come within REACH of her rating, whichever room she is in: on that day she is still above the player,
 *  who can expect about one game in four from her. Whoever a newcomer can reach is open from the start. A room opens
 *  with the first of its opponents to open. A player's best standing is what counts, so nothing that has opened
 *  shuts again. */
function opensAt(venues, opponents) {
  const at = {};
  for (const v of venues) {
    for (const id of v.opponents) at[id] = Math.max(START, Math.round((opponents[id].rating - REACH) / 5) * 5);
    at[v.id] = Math.min(...v.opponents.map(id => at[id]));
  }
  return at;
}
