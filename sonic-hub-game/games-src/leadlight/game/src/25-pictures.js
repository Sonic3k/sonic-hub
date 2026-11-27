/* Every picture of the game, put together: a card's picture (its realm's glass behind, its creature, building or
   emblem in front, its edition's treatment over it), a woman's portrait, a lane's landscape. Pictures are drawn when
   first asked for and kept as small image files in memory, so a page full of cards costs little. */

const REALM_LOOK = [
  { key: 'amber', name: 'Amber Fields', main: '#e2a62e', second: '#c4622c', accent: '#7a3fa0', dark: '#6a4420', light: '#fff4dc', sky: ['#fbe9b8', '#f6d68c', '#fff3d2', '#f2c873', '#f9df9e'], far: '#dba545', near: '#c08a2f', ground: '#a66f26', stone: '#d9b77a' },
  { key: 'cobalt', name: 'Cobalt Downs', main: '#2f62b4', second: '#5a86c8', accent: '#e2b23e', dark: '#1d3a6c', light: '#edf3fb', sky: ['#d3e3f5', '#b9d1ef', '#e6eff9', '#a6c4ea', '#c6dbf3'], far: '#7da0d6', near: '#4a78bf', ground: '#33609f', stone: '#a9bcd6' },
  { key: 'fen', name: 'Bottle Fen', main: '#3f7d52', second: '#7a5aa0', accent: '#d9a43a', dark: '#22412c', light: '#eef6e8', sky: ['#dce9d2', '#c7ddba', '#eaf2e2', '#b8d3a8', '#d2e4c6'], far: '#79a274', near: '#4b7c52', ground: '#36603c', stone: '#9fae96' },
  { key: 'cranberry', name: 'Cranberry Vale', main: '#be3a5e', second: '#e07a9a', accent: '#f0c060', dark: '#6e1e36', light: '#fff1f5', sky: ['#fbdfe7', '#f7cad7', '#fdedf2', '#f2b6c8', '#f9d4df'], far: '#e594ae', near: '#c95679', ground: '#a83f60', stone: '#e8c2cc' },
  { key: 'dunes', name: 'Sandglass Dunes', main: '#d6773a', second: '#e8b060', accent: '#2f8f88', dark: '#7a3d1a', light: '#fff5e8', sky: ['#fde5c6', '#f9cf9f', '#fff1de', '#f5bc89', '#fbd9b0'], far: '#eaae74', near: '#d58644', ground: '#b9692f', stone: '#e3bf8a' },
  { key: 'prism', name: 'Prism', main: '#8f78d2', second: '#5fb8c8', accent: '#f0b94a', dark: '#3e3270', light: '#f7f3ff', sky: ['#efe9fb', '#e2f1f7', '#f8ebf3', '#e8f5ea', '#f6f2df'], far: '#b9a8e8', near: '#9d8adb', ground: '#7d6cc4', stone: '#cfc6ea' },
];
const NONE_LOOK = { key: 'none', name: 'Bare glass', main: '#9a98a6', second: '#b8b6c2', accent: '#d0c090', dark: '#4a4858', light: '#f4f3f6', sky: ['#e8e7ec', '#dcdbe3', '#f1f0f4', '#d2d1da', '#e3e2e9'], far: '#c4c2cc', near: '#aeacb8', ground: '#9896a4', stone: '#cfcdd6' };

/* names that say what colour something is */
const NAMED_COLOURS = [
  [/indigo/i, '#4b3fa6'], [/frost|snow|icicle|rime|winter/i, '#bfe0f2'], [/rust/i, '#c8622a'], [/lime/i, '#94c43a'], [/violet/i, '#8a4ab0'],
  [/\bred\b/i, '#c8303a'], [/gr[ae]y/i, '#8c8c96'], [/ember|cinder/i, '#e0602a'], [/rosy|rose/i, '#e07a98'], [/mint/i, '#5fcfa0'],
  [/citrine/i, '#e6c43a'], [/peach/i, '#f0a07a'], [/berry/i, '#5a4ab8'], [/sapphire/i, '#2a5ac8'], [/bluestone/i, '#4a6aa8'],
  [/ochre/i, '#c8962a'], [/honey/i, '#e0a83a'], [/clover/i, '#4aa060'], [/cocoa/i, '#7a4a2e'], [/night/i, '#3a3650'],
  [/sugar|bonbon/i, '#e88ab8'], [/brine/i, '#7aa04a'], [/glass viper/i, '#3fb09a'], [/porcelain/i, '#e4ecf2'], [/pale/i, '#e8e4ea'],
  [/brain/i, '#e898b4'], [/tart/i, '#e0a868'], [/paper/i, '#efe6d0'], [/clay/i, '#a8704a'], [/bog bear/i, '#6a4a32'], [/truffle|plump/i, '#f0a8b4'],
  [/gentle swan/i, '#f4f2ee'], [/crow/i, '#2e2c38'], [/jay/i, '#4a7ad0'], [/chick/i, '#f2d04a'], [/hen|rooster/i, '#c84a2a'],
  [/heifer|cow/i, '#f4efe6'], [/haybull/i, '#8a4a2a'], [/hound/i, '#b97a3a'], [/jackal/i, '#c8964a'], [/tiger/i, '#e08a2a'], [/wolf/i, '#7a7a8a'],
  [/goat/i, '#d8cbb0'], [/mallard/i, '#3a8a5a'], [/owl/i, '#9a7a52'], [/drake|rex/i, '#5a8a4a'], [/kitten|tomcat|night cat/i, '#3a3442'],
];
const SKINS = ['#f2cfb3', '#e6b48d', '#c98a62', '#a96e4a', '#8d5a3b', '#f4d7c4', '#dca27c'];
const HAIRS = ['#3a2a1e', '#6b4a2a', '#a8552a', '#d9b36a', '#2a2632', '#8a8a8a', '#5e2a1e'];

/** a card's art line, "hum outfit:coat hat:straw": { plan: 'hum', outfit: 'coat', hat: 'straw' } (bare words are true) */
function artLine(line) {
  const parts = String(line || '').split(/\s+/).filter(Boolean), f = { plan: parts[0] || 'orb' };
  for (const w of parts.slice(1)) { const i = w.indexOf(':'); if (i < 0) f[w] = true; else f[w.slice(0, i)] = w.slice(i + 1); }
  return f;
}

/** the look of an edition: the realm's colours as that edition's glass changes them */
function editionLook(base, edition) {
  const L = Object.assign({}, base);
  switch (edition) {
    case 'Gilded': Object.assign(L, { sky: ['#f6dc86', '#eec65e', '#fae8ae', '#e2b448', '#f3d374'], far: '#d9a63a', near: '#c48d2a', ground: '#a8751f', lead: '#4a3418', shine: 'rgba(255,236,170,0.45)' }); break;
    case 'Obsidian': Object.assign(L, { sky: ['#2e2644', '#3b3058', '#241e36', '#4a3d6e', '#332a4c'], far: '#3a3152', near: '#2a2340', ground: '#1e192e', lead: '#9e9bb2', shine: 'rgba(230,225,255,0.5)' }); break;
    case 'Smoked': Object.assign(L, { sky: ['#f2a868', '#d8786a', '#8a5a86', '#f0c088', '#b86a78'], far: '#6a4a6e', near: '#4a3550', ground: '#36263c' }); break;
    case 'Frosted': Object.assign(L, { sky: ['#e2f1fb', '#c9e4f6', '#f1f9fd', '#b6d8f0', '#d6ebf8'], far: '#d6e9f6', near: '#eef6fb', ground: '#dcebf5' }); break;
    case 'Mirror': {
      const turn = h => tint(h, 160, 0.02, 0);
      Object.assign(L, { main: turn(L.main), second: turn(L.second), accent: turn(L.accent), sky: L.sky.map(turn), far: turn(L.far), near: turn(L.near), ground: turn(L.ground), lead: '#5a5e6e', shine: 'rgba(240,248,255,0.55)' });
      break;
    }
  }
  L.edition = edition || '';
  return L;
}

/** the colours a figure is glazed in */
function paletteFor(card, look, seed) {
  const r = glassRng(seed ^ 0x9e3779b9), named = NAMED_COLOURS.find(([re]) => re.test(card.name));
  let main = named ? named[1] : tint(look.main, (r() - 0.5) * 26, (r() - 0.5) * 0.12, (r() - 0.5) * 0.1);
  if (look.edition === 'Mirror') main = tint(main, 160);
  return {
    main, second: tint(look.second, (r() - 0.5) * 20), accent: look.accent, dark: look.dark, light: look.light,
    skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], metal: '#b9c3cd', gold: '#e2b447',
    wood: '#8b5a33', white: '#f7f3ec', glow: '#ffe08a', stone: look.stone,
  };
}

/* ---------------------------------------------------------------- the realm behind */

function realmScene(p, look, o = {}) {
  const W = p.w, H = p.h, r = p.rand, hz = H * (o.horizon || 0.62);
  const skyCol = () => jitter(look.sky[Math.floor(r() * look.sky.length)], r, 0.7);
  for (const q of Shape.shatter([[0, 0], [W, 0], [W, hz + H * 0.1], [0, hz + H * 0.1]], r, H * (o.shard || 0.2), 0, 1.7)) p.glass(q, skyCol(), { tex: r() < 0.5 ? 'streak' : 'ripple', texAlpha: 0.5, edge: 0.16 });
  const key = look.key, ed = look.edition;
  if (ed === 'Obsidian' || ed === 'Smoked') { p.glass(Shape.ellipse(W * 0.8, H * 0.18, H * 0.075, H * 0.075), ed === 'Smoked' ? '#f6e6b0' : '#d8d4f0', { glow: 0.7, tex: 'mottle' }); }
  else if (key === 'amber' || key === 'dunes') p.glass(Shape.ellipse(W * 0.8, H * 0.17, H * 0.08, H * 0.08), '#fff2c0', { glow: 0.8, tex: 'mottle' });
  if (key === 'prism' && ed !== 'Obsidian') ['#f2a0a8', '#f6d088', '#a8dcae', '#9ec8ef', '#c0a8ea'].forEach((col, i) => p.glass(Shape.sector(W * 0.5, hz + H * 0.1, H * (0.52 - i * 0.05), H * (0.57 - i * 0.05), Math.PI, TAU), col, { tex: 'ripple', alpha: 0.85, texAlpha: 0.4 }));
  if (ed === 'Obsidian') for (let i = 0; i < 18; i++) p.glass(Shape.star(r() * W, r() * hz * 0.9, H * 0.018, H * 0.006, 4), '#f2ecff', { glow: 0.8, leadW: 0.8 });
  /* the far land, the near land */
  const wave = (y, amp, n, jag = 0.5) => { const pts = []; for (let i = 0; i <= n; i++) pts.push([(W * i) / n, y - Math.sin(i * 1.7 + r() * jag * 3) * amp - r() * amp * jag]); return pts; };
  const far = wave(hz, H * 0.05, 5);
  p.pieces([[0, H], ...Shape.curve(far, 6), [W, H]], look.far, H * 0.26, { tex: 'streak', vary: 0.8, lean: Math.PI / 2, spread: 0.5 });
  if (key === 'cobalt') for (const x of [0.12, 0.3, 0.86]) { p.glass(Shape.capsule(W * x, hz - H * 0.02, W * x, hz + H * 0.04, H * 0.008), '#5a4030'); p.glass(Shape.ellipse(W * x, hz - H * 0.06, H * 0.045, H * 0.05), jitter('#3f6f9f', r)); }
  if (key === 'cranberry') for (const x of [0.1, 0.24, 0.9]) { p.glass(Shape.ellipse(W * x, hz + H * 0.0, H * 0.06, H * 0.045), jitter('#7a9a5a', r)); for (let k = 0; k < 3; k++) p.glass(Shape.ellipse(W * x + (r() - 0.5) * H * 0.07, hz - H * 0.01 + (r() - 0.5) * H * 0.04, H * 0.012, H * 0.012), '#d0304a', { leadW: 0.8 }); }
  if (key === 'dunes') p.glass([[W * 0.12, hz + H * 0.02], [W * 0.2, hz - H * 0.1], [W * 0.28, hz + H * 0.02]], shade(look.stone, -0.05));
  const nearY = hz + H * 0.16, near = wave(nearY, H * 0.04, 4, 0.8);
  const nearPoly = [[0, H], ...Shape.curve(near, 6), [W, H]];
  if (key === 'amber') {
    const parts = Shape.shatter(nearPoly, r, H * 0.2, 0.5, 0.3);
    parts.forEach((q, i) => p.glass(q, jitter(i % 2 ? look.near : shade(look.near, 0.07), r, 0.6), { tex: 'streak', grain: 30 }));
  } else if (key === 'fen') {
    p.pieces(nearPoly, look.near, H * 0.22, { tex: 'streak', vary: 0.7 });
    p.glass(Shape.ellipse(W * 0.5, H * 0.95, W * 0.36, H * 0.07), '#6fa8a0', { tex: 'ripple', glow: 0.3 });
    for (const x of [0.06, 0.1, 0.9, 0.94]) p.glass(Shape.capsule(W * x, H, W * x + (r() - 0.5) * H * 0.05, hz - H * 0.02, H * 0.012, H * 0.004), jitter('#5f8a3f', r));
  } else p.pieces(nearPoly, look.near, H * 0.22, { tex: 'streak', vary: 0.8, lean: Math.PI / 2, spread: 0.6 });
  if (ed === 'Frosted') for (let i = 0; i < 16; i++) p.glass(Shape.star(r() * W, r() * hz, H * 0.02, H * 0.008, 6), '#ffffff', { glow: 0.6, leadW: 0.7 });
}

/** the sun-ray ground of a spell: a round window of rays in the realm's colours */
function spellGround(p, look) {
  const W = p.w, H = p.h, r = p.rand;
  for (const q of Shape.shatter([[0, 0], [W, 0], [W, H], [0, H]], r, H * 0.22, 0, 1.7)) p.glass(q, jitter(look.sky[Math.floor(r() * look.sky.length)], r, 0.6), { tex: 'streak', texAlpha: 0.45, edge: 0.15 });
  const cx = W / 2, cy = H * 0.5, R = H * 0.48, n = 12;
  for (let i = 0; i < n; i++) p.glass(Shape.sector(cx, cy, R * 0.8, R, (i / n) * TAU, ((i + 1) / n) * TAU), i % 2 ? look.main : shade(look.main, 0.1), { tex: 'mottle', edge: 0.2 });
  for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * TAU; p.glass(Shape.ellipse(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9, R * 0.05, R * 0.05), look.accent, { glow: 0.3, leadW: p.leadW * 0.8 }); }
  for (let i = 0; i < n; i++) p.glass(Shape.sector(cx, cy, 0, R * 0.8, ((i + 0.5) / n) * TAU, ((i + 1.5) / n) * TAU), mix(look.sky[i % look.sky.length], look.far, i % 2 ? 0.28 : 0.12), { tex: 'ripple', texAlpha: 0.4, glow: 0.2, edge: 0.14 });
  const halo = p.g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6); halo.addColorStop(0, 'rgba(255,250,230,0.75)'); halo.addColorStop(1, 'rgba(255,250,230,0)');
  p.g.fillStyle = halo; p.g.fillRect(0, 0, W, H);
}

/* ---------------------------------------------------------------- the pictures */

const PICTURE = { W: 360, H: 288 };

/** the realm whose glass a card's picture is set in: its own, or for the buildings and spells, which belong to no
 *  realm, the one its name speaks of (or one chosen by its name, so that they are not all alike) */
function artRealm(card, seed) {
  if (card.faction !== 5 || card.type === 0) return card.faction;
  const n = card.name;
  for (const [re, i] of [[/amber|harvest/i, 0], [/cobalt|wayfarer/i, 1], [/fen|bog|hermit|snug|ossuary|shade|coffin|restless/i, 2], [/cranberry|rose|cushion|heart|mercy|lifeline/i, 3], [/dune|sand|noon|victor|eruption|sphinx/i, 4]]) if (re.test(n)) return i;
  return seed % 6;
}
/** a card's picture as a canvas: card is a row of data.json's cards */
function drawCard(card, W = PICTURE.W, H = PICTURE.H) {
  const seed = hashOf(card.id || card.src || card.name), p = new Pane(W, H, seed);
  const look = editionLook(REALM_LOOK[artRealm(card, seed)] || NONE_LOOK, card.edition), f = artLine(card.art), c = paletteFor(card, look, seed);
  if (look.lead) { p.leadColor = look.lead; p.leadShine = look.shine; }
  if (card.type === 2) {
    spellGround(p, look);
    p.frame(W / 2, H * 0.5, H * 0.42);
    spellIcon(p, c, f.icon);
  } else {
    const lead = p.leadW;
    p.leadW = lead * 0.78; realmScene(p, look); p.leadW = lead * 1.08;
    if (card.type === 1) { p.frame(W / 2, H * 0.5, H * 0.45); figBuilding(p, buildingPalette(card, c, look), f.kind); }
    else { p.frame(W / 2, H * 0.49, H * 0.46); figure(p, c, f, card); }
  }
  editionOver(p, look);
  p.lightUp({ strength: look.edition === 'Obsidian' ? 0.35 : 0.55 });
  return p.canvas;
}
function buildingPalette(card, c, look) {
  const n = card.name;
  return Object.assign({}, c, {
    stone: /bone|ossuary/i.test(n) ? '#efe7d4' : /shade|night/i.test(n) ? '#5a5070' : /ice|frost|igloo/i.test(n) ? '#e6f2fa' : look.stone,
    bones: /ossuary/i.test(n), eye: /reckoning|whispers|victor/i.test(n), haunted: /haunted|phantom/i.test(n), candy: /sugar/i.test(n), snug: /snug/i.test(n),
    ice: /sugar/i.test(n) ? '#f8e6f0' : '#eaf4fb', main: /cushion/i.test(n) ? '#f0a8c0' : c.main,
  });
}
function figure(p, c, f, card) {
  const plans = { hum: figHum, beast: figBeast, orb: figOrb, bird: figBird, serpent: figSerpent, brute: figBrute, ghost: figGhost, slime: figSlime, eye: figEye, eyewing: figEyewing, jinn: figJinn, tree: figTree, plant: figPlant, object: figObject, fish: figFish, spider: figSpider, mush: figMush, snowman: figSnowman };
  if (f.plan === 'slime' && /brain/i.test(card.name)) f.brain = true;
  if (f.kind === 'swatter' && /cracked/i.test(card.name)) f.cracked = true;
  if (f.kind === 'hand') { f.fire = /ember/i.test(card.name); if (/mummy/i.test(card.name)) { c = Object.assign({}, c, { main: '#e9dfc6' }); } }
  (plans[f.plan] || figOrb)(p, c, f);
}
/** what an edition lays over the finished glass */
function editionOver(p, look) {
  const g = p.g, W = p.w, H = p.h, r = p.rand;
  if (look.edition === 'Gilded') {
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(240,196,80,0.25)'; g.fillRect(0, 0, W, H); g.restore();
    for (let i = 0; i < 14; i++) p.glass(Shape.star(r() * W, r() * H, H * 0.022, H * 0.007, 4), '#fff4c0', { glow: 0.9, leadW: 0.7 });
  } else if (look.edition === 'Obsidian') {
    g.save(); g.globalCompositeOperation = 'soft-light'; const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(160,120,255,0.5)'); lg.addColorStop(1, 'rgba(40,20,80,0.5)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); g.restore();
  } else if (look.edition === 'Smoked') {
    g.save(); g.globalCompositeOperation = 'multiply'; const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(150,110,150,1)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); g.restore();
  } else if (look.edition === 'Frosted') {
    g.save(); for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) { const rg = g.createRadialGradient(x, y, 0, x, y, H * 0.45); rg.addColorStop(0, 'rgba(255,255,255,0.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1, H / 300);
    for (let i = 0; i < 26; i++) { const x = r() < 0.5 ? r() * W * 0.25 : W - r() * W * 0.25, y = r() < 0.5 ? r() * H * 0.25 : H - r() * H * 0.25, l = H * (0.02 + r() * 0.04); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }
    g.restore();
  } else if (look.edition === 'Mirror') {
    g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) { const x = W * (0.15 + i * 0.3 + r() * 0.1), lg = g.createLinearGradient(x, 0, x + W * 0.12, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(235,245,255,0.32)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + W * 0.12, 0); g.lineTo(x - W * 0.08, H); g.lineTo(x - W * 0.2, H); g.closePath(); g.fill(); }
    g.restore();
  }
}

/** a hero card's portrait: person from cast.json, form as in names.json */
function drawPortrait(person, form, W = 320, H = 320) {
  const seed = hashOf(person.name + '|' + form), p = new Pane(W, H, seed);
  const look = editionLook(REALM_LOOK[person.realm] || REALM_LOOK[5], form === 'Mirror' ? 'Mirror' : '');
  portrait(p, person, form, look);
  p.lightUp({ strength: 0.5, y: 0.3 });
  return p.canvas;
}

/** a lane's landscape: type 0..4 as the realms, 5 for none */
function drawLandscape(type, W = 300, H = 200, seed = 7) {
  const p = new Pane(W, H, seed + type * 101), look = Object.assign({}, type === 5 ? NONE_LOOK : REALM_LOOK[type], { edition: '' });
  p.leadW = Math.max(1.2, H / 90);
  realmScene(p, look, { horizon: 0.45, shard: 0.26 });
  p.lightUp({ strength: 0.45, vignette: 0.2 });
  return p.canvas;
}

/* ---------------------------------------------------------------- kept as small image files */

const Pictures = (() => {
  const made = new Map(), waiting = new Map(), queue = [];
  let busy = false;
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    const step = () => {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) {
        const { key, draw } = queue.shift();
        let canvas; try { canvas = draw(); } catch (e) { console.error('picture', key, e); canvas = null; }
        if (!canvas) { finish(key, ''); continue; }
        canvas.toBlob(blob => finish(key, blob ? URL.createObjectURL(blob) : canvas.toDataURL()), 'image/jpeg', 0.9);
      }
      if (queue.length) setTimeout(step, 0); else busy = false;
    };
    step();
  }
  function finish(key, url) { made.set(key, url); const ws = waiting.get(key) || []; waiting.delete(key); for (const w of ws) w(url); }
  /** the picture's address when it is ready: fn(url) is called (at once when it already is) */
  function want(key, draw, fn, first = false) {
    if (made.has(key)) { fn(made.get(key)); return; }
    if (waiting.has(key)) { waiting.get(key).push(fn); return; }
    waiting.set(key, [fn]);
    first ? queue.unshift({ key, draw }) : queue.push({ key, draw });
    pump();
  }
  return {
    want,
    card(card, fn, first) { want('c:' + card.id, () => drawCard(card), fn, first); },
    portrait(hero, person, fn, first) { want('h:' + hero.id, () => drawPortrait(person, hero.form), fn, first); },
    landscape(type, fn) { want('l:' + type, () => drawLandscape(type), fn, true); },
    /** an <img> that shows the picture when it is ready */
    img(kind, ...args) { const im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.className = 'pic'; im.draggable = false; this[kind](...args, url => { im.src = url; im.classList.add('ready'); }); return im; },
    /** the same, but the picture is only drawn once the <img> comes near the screen (for long lists) */
    lazy(kind, ...args) {
      const im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.className = 'pic'; im.draggable = false;
      const go = () => this[kind](...args, url => { im.src = url; im.classList.add('ready'); });
      if (typeof IntersectionObserver === 'undefined') { go(); return im; }
      if (!this._near) this._near = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { this._near.unobserve(e.target); e.target._go(); } }, { rootMargin: '500px' });
      im._go = go; this._near.observe(im);
      return im;
    },
    ready(key) { return made.has(key); },
  };
})();
