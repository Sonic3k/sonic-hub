/* ── The players the computer can be ──
   One entry for each opponent of the campaign (the people themselves, their words and their cards are in the game's
   own files; here is only how each of them plays). style: what she counts for more or less than the plain value —
   see the head of the computer player's file for what each word means.
   The order of the ratings in the campaign was measured by letting these play each other: node tools/sim.js */
const PLAYERS = {
  pia: { depth: 1, quiet: 0, noise: 220, slip: 0.18, style: { air: 0.8, adv: 1.4, arms: 0.3 } },
  sol: { depth: 1, quiet: 1, noise: 150, slip: 0.12, style: { adv: 1.3, foot: 1.2, armor: 1.1, arms: 0.6 } },
  hana: { depth: 2, quiet: 3, noise: 55, slip: 0.02, style: { guns: 1.15, sea: 1.1, adv: 0.7, guard: 1.5, arms: 1.3 } },
  nadia: { depth: 3, quiet: 4, noise: 12, ms: 1600, style: { adv: 1.5, hunt: 1.7, air: 0.92, ride: 2 } },   // speed above all: she is the one who uses the rapid march
  isolde: { depth: 5, quiet: 5, noise: 0, ms: 3000, jitter: 4, style: { guard: 1.2 } },
};
if (typeof module !== 'undefined') module.exports = { PLAYERS };
