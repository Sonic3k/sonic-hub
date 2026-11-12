'use strict';
/* ── Mướp và Mười Hai Ngọn Đèn ──
   A modern-retro platformer. Everything (art, font, music) is generated in code:
   no image or audio files, so the page stays a single self-contained HTML file.
   Internal resolution is VIEW_H=256 tall; width follows the screen's aspect. */

const TILE = 16;
const VIEW_H = 256;
const V = { W: 448, H: VIEW_H };          // live view size in game pixels

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const sgn = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/* periodic 1D value noise: seamless over `period` */
function pnoise(x, period, seed) {
  const i = Math.floor(x), f = x - i;
  const a = hash(((i % period) + period) % period, 7, seed);
  const b = hash((((i + 1) % period) + period) % period, 7, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

const _rgbCache = new Map();
function hexRgb(h) {
  let v = _rgbCache.get(h);
  if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; _rgbCache.set(h, v); }
  return v;
}
function rgbHex(r, g, b) { return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(Math.round(lerp(A[0], B[0], t)), Math.round(lerp(A[1], B[1], t)), Math.round(lerp(A[2], B[2], t))); }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

/* tile codes shared by world logic and the terrain painter */
const T = {
  EMPTY: 0, SOLID: 1, ONEWAY: 2, ICE: 3, SPIKE_U: 4, SPIKE_D: 5, SPIKE_L: 6, SPIKE_R: 7,
  CRUMBLE: 8, BREAK: 9, FAKE: 10, BONUS: 11, BONUS_HEART: 12, SWITCH: 13, SUN: 14, MOON: 15,
  DOOR_GOLD: 16, DOOR_TEAL: 17, ALT: 18, USED: 19, TURRET: 20,
};
const isGroundCode = c => c === T.SOLID || c === T.ICE || c === T.FAKE || c === T.ALT;
