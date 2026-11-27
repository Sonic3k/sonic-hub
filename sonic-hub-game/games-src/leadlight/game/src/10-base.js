/* What every screen uses: finding and making elements, waiting, the screens themselves, the game's words. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
/** an element: h('div.card.r1', { onclick }, child, 'text', …) */
function h(spec, attrs, ...kids) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const phone = () => matchMedia('(max-width: 640px)').matches;

const REALMS = ['Amber Fields', 'Cobalt Downs', 'Bottle Fen', 'Cranberry Vale', 'Sandglass Dunes', 'Prism'];
const REALM_SHORT = ['Amber', 'Cobalt', 'Fen', 'Cranberry', 'Dune', 'Prism'];
const KINDS = ['Creature', 'Building', 'Spell'];
const LAND_NAMES = ['Amber Fields', 'Cobalt Downs', 'Bottle Fen', 'Cranberry Vale', 'Sandglass Dunes', 'Bare glass'];
/** what a card asks the player while she chooses, in words (the scripts name these by key) */
const PROMPTS = {
  '!!PICK_A_CREATURE': 'Choose a creature', '!!TAP_CREATURE_TO_HEAL': 'Choose a creature to heal', '!!TAP_CREATURE_TO_ATTACK': 'Choose a creature to strike',
  '!!TAP_CREATURE_TO_BOOST_ATTACK': 'Choose a creature to raise its ATK', '!!PICK_A_TARGET': 'Choose a target', '!!PICK_A_SACRIFICE': 'Choose what to give up',
  '!!PICK_A_BUILDING_TO_MOVE': 'Choose a building to move', '!!PICK_AN_EMPTY_LANE': 'Choose an empty lane', '!!TAP_CREATURE_TO_FLOOP': 'Choose a creature to glint',
  '!!TAP_CREATURE_TO_BOOST_DEFENSE': 'Choose a creature to raise its DEF', '!!TAP_CREATURE_TO_BLOCK_FLOOP': 'Choose a creature that may not glint',
};

/* ---------------------------------------------------------------- the screens */

const Screens = {
  now: null,
  show(id) {
    for (const el of $$('.screen')) el.classList.toggle('on', el.id === id);
    this.now = id;
    const room = $('#room'); room.style.filter = id === 'battle' ? 'brightness(.62) saturate(.85) blur(2px)' : '';
  },
};

/* ---------------------------------------------------------------- the room behind everything, and the name in glass */

/** a window of the atelier, drawn once: what the light comes in through */
function drawRoom(W = 1280, H = 820) {
  const p = new Pane(W, H, 2026), r = p.rand;
  p.leadW = 3.2;
  const warm = ['#f6dc9a', '#f2c97a', '#f9e7bf', '#e9b86a', '#f4d3a0', '#fbe9c8'], cool = ['#cfe0f0', '#b8d2ea', '#e2ecf6'], rose = ['#f2c2cf', '#eaa8bc', '#f6d6de'];
  for (const q of Shape.shatter([[0, 0], [W, 0], [W, H], [0, H]], r, H * 0.16, 0, 1.6)) {
    const [x, y] = Shape.centroid(q), d = Math.hypot(x - W / 2, y - H * 0.42) / (W * 0.6), set = d < 0.35 ? warm : d < 0.62 ? (r() < 0.6 ? warm : rose) : (r() < 0.5 ? cool : warm);
    p.glass(q, jitter(set[Math.floor(r() * set.length)], r, 0.8), { tex: 'streak', texAlpha: 0.5, edge: 0.18 });
  }
  const cx = W / 2, cy = H * 0.42, R = H * 0.36;
  for (let i = 0; i < 24; i++) p.glass(Shape.sector(cx, cy, R * 0.86, R, (i / 24) * TAU, ((i + 1) / 24) * TAU), i % 2 ? '#c98a2e' : '#e2b44a', { tex: 'mottle' });
  for (let i = 0; i < 12; i++) { const a0 = (i / 12) * TAU, a1 = ((i + 1) / 12) * TAU; p.glass(Shape.sector(cx, cy, R * 0.3, R * 0.86, a0, a1), ['#b83a5e', '#2f62b4', '#3f7d52', '#d6773a', '#8f78d2', '#e2a62e'][i % 6], { tex: 'ripple', texAlpha: 0.5 }); }
  for (let i = 0; i < 12; i++) { const a = ((i + 0.5) / 12) * TAU; p.glass(Shape.ellipse(cx + Math.cos(a) * R * 0.58, cy + Math.sin(a) * R * 0.58, R * 0.1, R * 0.1), '#fff0c0', { glow: 0.6 }); }
  p.glass(Shape.ellipse(cx, cy, R * 0.3, R * 0.3), '#fff2c8', { glow: 0.8, tex: 'mottle' });
  p.lightUp({ x: 0.5, y: 0.4, strength: 0.6, vignette: 0.45 });
  return p.canvas;
}
/** "Leadlight", each letter cut from glass and leaded */
function drawTitle(canvas, text = 'Leadlight') {
  const W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
  const font = `400 ${Math.round(H * 0.72)}px Federant, Marcellus, Georgia, serif`;
  const glassC = document.createElement('canvas'); glassC.width = W; glassC.height = H;
  const p = new Pane(W, H, 99); p.leadW = 2.4;
  const cols = ['#e2a62e', '#be3a5e', '#2f62b4', '#3f7d52', '#d6773a', '#8f78d2', '#f0c860', '#e07a98'];
  for (const q of Shape.shatter([[0, 0], [W, 0], [W, H], [0, H]], p.rand, H * 0.22, 0.4, 1.4)) p.glass(q, jitter(cols[Math.floor(p.rand() * cols.length)], p.rand, 0.6), { tex: 'ripple', glow: 0.25, edge: 0.15 });
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const m = mask.getContext('2d'); m.font = font; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(text, W / 2, H * 0.55);
  const pg = p.canvas.getContext('2d'); pg.globalCompositeOperation = 'destination-in'; pg.drawImage(mask, 0, 0);
  g.clearRect(0, 0, W, H);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = '#2b2830'; g.lineWidth = H * 0.07; g.strokeText(text, W / 2, H * 0.55);
  g.drawImage(p.canvas, 0, 0);
  g.strokeStyle = 'rgba(255,250,235,.35)'; g.lineWidth = H * 0.012; g.strokeText(text, W / 2 - 1, H * 0.55 - 1);
}
