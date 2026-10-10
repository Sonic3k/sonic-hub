'use strict';
/* ── Masks & Mortar ──
   The Citadels rules (2016 edition), played against the computer: every round each player secretly takes a character, the
   characters are called in rank order, and each one gathers gold or cards, builds districts and uses its ability. The first
   city of 7 districts (8 with two or three players) ends the game at the end of that round; the most points wins.
   The engine is pure (state S, seeded RNG, no DOM) so sim.js and test.js can run it in node. */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function rnd(S) {
  let t = (S.rs = (S.rs + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (S, arr) => arr[Math.floor(rnd(S) * arr.length)];
function shuffled(S, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + f(x), 0);
