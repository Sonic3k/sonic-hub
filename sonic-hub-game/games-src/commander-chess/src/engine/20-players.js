/* ── The players the computer can be ──
   One entry for each opponent of the campaign (the people themselves, their words and their cards are in the game's
   own files; here is only how each of them plays). style: what she counts for more or less than the plain value —
   adv ground gained and pressure on the other Commander, hq the Headquarters points, guard her own Commander's
   safety, and air / sea / guns / armor / foot how she prices those arms.
   The ratings in the campaign were measured by letting these play each other: node tools/sim.js */
const PLAYERS = {
  pia: { depth: 1, quiet: 0, noise: 220, slip: 0.18, style: { air: 0.8, adv: 1.4 } },
  sol: { depth: 1, quiet: 1, noise: 150, slip: 0.12, style: { adv: 1.3, foot: 1.2, armor: 1.1 } },
  hana: { depth: 2, quiet: 3, noise: 55, slip: 0.02, style: { guns: 1.15, sea: 1.1, adv: 0.7, guard: 1.5 } },
  nadia: { depth: 3, quiet: 4, noise: 12, ms: 1600, style: { adv: 1.5, hq: 1.6, air: 0.92 } },
  isolde: { depth: 5, quiet: 5, noise: 0, ms: 3000, jitter: 4, style: { guard: 1.2 } },
};
if (typeof module !== 'undefined') module.exports = { PLAYERS };
