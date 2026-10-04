'use strict';
/* ── Lên Đời ──
   Demo game #3 for Sonic Hub Pages: a turn-based duel of medieval civilizations (400–1500) on a small map.
   Both sides give orders in secret, then the orders are revealed and resolved at the same time.
   The engine keeps the whole match in one plain object S (seeded RNG, no DOM), so sim.js can pit AIs against each other. */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function rnd(S) {
  let t = (S.rs = (S.rs + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (S, arr) => arr[Math.floor(rnd(S) * arr.length)];
function wpick(S, entries) {
  let tot = 0; for (const e of entries) tot += Math.max(0, e[1]);
  if (tot <= 0) return entries[0][0];
  let r = rnd(S) * tot;
  for (const e of entries) { r -= Math.max(0, e[1]); if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}
function shuffled(S, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sumObj = o => Object.values(o).reduce((a, b) => a + b, 0);
