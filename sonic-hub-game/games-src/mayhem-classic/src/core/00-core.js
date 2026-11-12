'use strict';
/* ── Mayhem Classic ──
   The original Dungeon Mayhem rules, played against the computer: every hero is a fixed deck of 28 cards, everyone starts at
   10 HP, you draw 1 and play 1 each turn, and the symbols on a card do the rest. Heroes, card names and art are our own; each deck
   follows the card counts and symbols of its class in the original game.
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
const count = (s, ch) => { let n = 0; for (const c of s || '') if (c === ch) n++; return n; };
