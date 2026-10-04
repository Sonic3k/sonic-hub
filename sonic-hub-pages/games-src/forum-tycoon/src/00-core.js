'use strict';
/* ── Ông Trùm 4rum (Forum Tycoon) ──
   Demo game #2 for Sonic Hub Pages: you run a Vietnamese fan forum from 09/2007 into the Facebook era.
   One self-contained page: pixel avatars, banners and sounds are all generated in code.
   The engine (state in one plain object S, seeded RNG) has no DOM, so sim.js can play it headlessly. */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const round1 = v => Math.round(v * 10) / 10;

/* mulberry32 on S.rs, so the whole run (and a saved run) is reproducible */
function rnd(S) {
  let t = (S.rs = (S.rs + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (S, a, b) => a + Math.floor(rnd(S) * (b - a + 1));
const chance = (S, p) => rnd(S) < p;
const pick = (S, arr) => arr[Math.floor(rnd(S) * arr.length)];
function wpick(S, entries) {
  let tot = 0;
  for (const e of entries) tot += Math.max(0, e[1]);
  if (tot <= 0) return entries[0][0];
  let r = rnd(S) * tot;
  for (const e of entries) { r -= Math.max(0, e[1]); if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}
function shuffled(S, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Vietnamese number style: 1.234 ; money is kept in thousands of đồng (k) */
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function fmtMoney(k) {
  const neg = k < 0, a = Math.abs(Math.round(k));
  const s = a >= 1000 ? (a / 1000).toFixed(a % 1000 === 0 ? 0 : 1).replace('.', ',') + 'tr' : a + 'k';
  return (neg ? '−' : '') + s;
}
const signed = (v, f = fmtN) => (v > 0 ? '+' : v < 0 ? '−' : '±') + f(Math.abs(v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
