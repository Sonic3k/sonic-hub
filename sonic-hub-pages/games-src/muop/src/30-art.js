/* ── Art: sprites ──
   Sprites are drawn as character maps and get an automatic 1px outline, which keeps the
   whole cast consistent. '.' is transparent; every other char maps through a palette. */
function spriteFrom(rows, pal, outline, noOutline = '') {
  const h = rows.length, w = rows[0].length;
  const [c, x] = mkCanvas(w, h);
  const img = x.createImageData(w, h);
  const d = img.data;
  const set = (i, hex, a = 255) => { const [r, g, b] = hexRgb(hex); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a; };
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const ch = rows[y][xx];
    if (ch !== '.' && ch !== ' ' && pal[ch]) set(y * w + xx, pal[ch]);
  }
  if (outline) {
    const filled = (xx, y) => { if (xx < 0 || y < 0 || xx >= w || y >= h) return false; const ch = rows[y][xx]; return ch !== '.' && ch !== ' ' && !noOutline.includes(ch); };
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const ch = rows[y][xx];
      if (ch !== '.' && ch !== ' ') continue;
      if (filled(xx - 1, y) || filled(xx + 1, y) || filled(xx, y - 1) || filled(xx, y + 1)) set(y * w + xx, outline);
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}
function flipH(src) {
  const [c, x] = mkCanvas(src.width, src.height);
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}
function tintCanvas(src, color, alpha = 1) {
  const [c, x] = mkCanvas(src.width, src.height);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
/* compose rows: paint `layers` (each {rows, dx, dy}) onto a blank w×h grid of chars */
function composeRows(w, h, layers) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const L of layers) {
    L.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const X = x + (L.dx || 0), Y = y + (L.dy || 0);
        if (X >= 0 && Y >= 0 && X < w && Y < h) g[Y][X] = ch;
      }
    });
  }
  return g.map(r => r.join(''));
}

/* ── Hero: Mướp, a ginger tabby whose tail tip carries the last spark ── */
const PAL_HERO = { f: '#F2913D', s: '#C8622B', c: '#FFE8C6', e: '#231A2E', w: '#FFFFFF', p: '#F6A3B6', n: '#D9577A', b: '#3F82EA', B: '#2A58B2', t: '#F2913D' };
const HERO_OUT = '#2B1A1F';
const HERO_UPPER = [
  '..................',
  '.....f......f.....',
  '.....fpf..fpf.....',
  '.....fffsfffff....',
  '....ffsfffsffff...',
  '....fffffffffff...',
  '....fffffffewff...',
  '....fffffffeeff...',
  '..t.ffffffffcccn..',
  '..t..ffffffcccc...',
  '..t...bbbbbbbB....',
  '..t..sfffffccc....',
  '...t.ssffffccc....',
  '....tsssfffcc.....',
  '.....ssffffff.....',
];
const HERO_LEGS = {
  stand: ['.....ff...ff......', '.....cc...cc......'],
  run0: ['....ff......ff....', '...cc........cc...'],
  run1: ['......ff..ff......', '......cc..cc......'],
  run2: ['.....ff....ff.....', '....cc......cc....'],
  run3: ['.......ffff.......', '.......cccc.......'],
  jump: ['.....ff....ff.....', '......c.....c.....'],
  fall: ['....f.......f.....', '...cc.......cc....'],
  land: ['....fff...fff.....', '....ccc...ccc.....'],
  wall: ['.....ff...ff......', '......c....c......'],
};
/* tail tip position per upper offset, so the spark can follow the sprite */
const HERO_TAIL_TIP = { x: 2, y: 7 };
function buildHero() {
  const W = 18, H = 18;
  const up = (dy, extra = []) => [{ rows: HERO_UPPER, dy }, ...extra];
  const legs = (k, dy = 15) => ({ rows: HERO_LEGS[k], dy });
  const blinkRows = HERO_UPPER.map((r, i) => (i === 6 ? r.replace('ew', 'ff') : i === 7 ? r.replace('ee', 'ss') : r));
  const hurtRows = HERO_UPPER.map((r, i) => (i === 6 ? r.replace('ew', 'sf') : i === 7 ? r.replace('ee', 'fs') : r));
  const def = {
    idle0: [legs('stand'), ...up(0)],
    idle1: [legs('stand'), ...up(1)],
    blink: [legs('stand'), { rows: blinkRows, dy: 0 }],
    run0: [legs('run0'), ...up(0)],
    run1: [legs('run1'), ...up(-1)],
    run2: [legs('run2'), ...up(0)],
    run3: [legs('run3'), ...up(-1)],
    jump: [legs('jump', 14), ...up(-1)],
    fall: [legs('fall', 15), ...up(0)],
    land: [legs('land', 15), ...up(2)],
    wall: [legs('wall', 15), ...up(0)],
    hurt: [legs('fall', 15), { rows: hurtRows, dy: 0 }],
    dash: [legs('run0', 14), ...up(-1)],
  };
  const frames = {};
  for (const [k, layers] of Object.entries(def)) {
    const rows = composeRows(W, H, layers);
    const r = spriteFrom(rows, PAL_HERO, HERO_OUT);
    frames[k] = { r, l: flipH(r), dy: (layers.find(L => L.rows === HERO_UPPER || L.rows === blinkRows || L.rows === hurtRows) || { dy: 0 }).dy };
  }
  return frames;
}

/* ── Cast: enemies (one silhouette per role, re-coloured per world) ── */
const ENEMY_ROWS = {
  beetle: [[
    '................',
    '.....aaaaa......',
    '...aaahhaaaa....',
    '..aaahaaakkaa...',
    '..akkaaaaakkaa..',
    '.aakkaaaaaaaaa..',
    '.aaaaaakkaaaakkk',
    '.AAAAAAkkAAAkkwe',
    '..AAAAAAAAAAkkkk',
    '...l..l...l.....',
    '..l..l...l......',
  ], [
    '................',
    '.....aaaaa......',
    '...aaahhaaaa....',
    '..aaahaaakkaa...',
    '..akkaaaaakkaa..',
    '.aakkaaaaaaaaa..',
    '.aaaaaakkaaaakkk',
    '.AAAAAAkkAAAkkwe',
    '..AAAAAAAAAAkkkk',
    '...l...l...l....',
    '....l...l...l...',
  ]],
  frog: [[
    '................',
    '..........ww.ww.',
    '.........wwewwe.',
    '....aaaaaaaaaaa.',
    '..aaaaaaaaaaaaa.',
    '.aaahaaaaaaakkk.',
    '.aaaaaaaaaaaaaa.',
    '.AAaaaaabbbbbbb.',
    '.AAAAAabbbbbbbb.',
    '..AAAA.AA...AA..',
    '.AAA....AA...AA.',
  ], [
    '..........ww.ww.',
    '.........wwewwe.',
    '....aaaaaaaaaaa.',
    '..aaaaaaaaaaaaa.',
    '.aaahaaaaaaakkk.',
    '.aaaaaaaaaaaaaa.',
    '.AAaaaaabbbbbbb.',
    '.AAAAAabbbbbbbb.',
    'AAAAA....AAA....',
    'AA..........AA..',
    'A............AA.',
  ]],
  bee: [[
    '....ww..........',
    '...wwww.ww......',
    '....wwwwwww.....',
    '.....aakkaaa....',
    '...kaakkaakkaa..',
    '..kaakkaakkaawe.',
    '..kAAkkAAkkAAkk.',
    '...AAkkAAkkAAA..',
    '.....AAAAAAA....',
    '................',
  ], [
    '................',
    '................',
    '..wwwwwww.......',
    '...wwwaakkaaa...',
    '...kaakkaakkaa..',
    '..kaakkaakkaawe.',
    '..kAAkkAAkkAAkk.',
    '...AAkkAAkkAAA..',
    '.....AAAAAAA....',
    '................',
  ]],
  burr: [[
    '.....k...k......',
    '..k..kk.kk..k...',
    '...kaaaaaaaak...',
    '.kkaahaaaaaaakk.',
    '...aahaaaaaaaa..',
    'kkaaaaaaaaawaekk',
    '..aaaaaaaaaaaa..',
    'kkAaaaaaaaaaaAkk',
    '..AAAaaaaaaAAA..',
    '.kkAAAAAAAAAAkk.',
    '...k.kkAAkk.k...',
    '.....k....k.....',
  ], [
    '......k...k.....',
    '...k..kk.kk..k..',
    '...kaaaaaaaak...',
    '.kkaahaaaaaaakk.',
    '...aahaaaaaaaa..',
    'kkaaaaaaaaaweakk',
    '..aaaaaaaaaaaa..',
    'kkAaaaaaaaaaaAkk',
    '..AAAaaaaaaAAA..',
    '.kkAAAAAAAAAAkk.',
    '...k.kkAAkk.k...',
    '....k....k......',
  ]],
  bird: [[
    '................',
    '...........aaa..',
    '..........aawabb',
    '..aaaa...aaaaa..',
    '.aAAAAa.aaaaa...',
    'aAAAAAAaaaaaa...',
    '.....AAAAaaa....',
    '......AAAAa.....',
    '.......bb.b.....',
    '................',
  ], [
    '.aa.............',
    '.aAa.......aaa..',
    '..aAAa....aawabb',
    '...aAAa..aaaaa..',
    '....aAAaaaaaa...',
    '.....aAAaaaaa...',
    '......AAAAaaa...',
    '.......AAAAa....',
    '........bb.b....',
    '................',
  ]],
};
const WORLD_ENEMY_PAL = {
  1: {
    beetle: { a: '#E4473C', A: '#A92A2E', h: '#FF9A8A', k: '#2B1A1F', w: '#FFFFFF', e: '#2B1A1F', l: '#2B1A1F' },
    frog: { a: '#6CC24A', A: '#3E8C3A', h: '#B4F08A', k: '#2B1A1F', w: '#FFFFFF', e: '#2B1A1F', b: '#E4F5B0' },
    bee: { a: '#FFCE3A', A: '#E09A1E', k: '#2B1A1F', w: '#E8F6FF', e: '#2B1A1F' },
    burr: { a: '#A8703E', A: '#7A4A2A', h: '#D8A070', k: '#F2D49A', w: '#FFFFFF', e: '#2B1A1F' },
    bird: { a: '#4A4466', A: '#2E2A44', w: '#FFFFFF', b: '#F2B84A' },
  },
  2: {
    beetle: { a: '#2FA89A', A: '#1D6E66', h: '#8FE8D8', k: '#F2C14E', w: '#FFFFFF', e: '#2B1A1F', l: '#2B1A1F' },
    frog: { a: '#E8A04A', A: '#B0652C', h: '#FFD08A', k: '#6A2E22', w: '#FFFFFF', e: '#2B1A1F', b: '#FFE8B8' },
    bee: { a: '#A77BFF', A: '#6E48C8', k: '#2B1A3A', w: '#FFE8F4', e: '#2B1A1F' },
    burr: { a: '#5E9E5E', A: '#3C6E44', h: '#9ED88A', k: '#F4E8C8', w: '#FF7AA8', e: '#2B1A1F' },
    bird: { a: '#6E4A6E', A: '#4A2E4A', w: '#FFFFFF', b: '#F0A08A' },
  },
  3: {
    beetle: { a: '#8FD0F5', A: '#4E8CC8', h: '#E8F8FF', k: '#FFFFFF', w: '#FFFFFF', e: '#1B2340', l: '#1B2340' },
    frog: { a: '#EAF2FF', A: '#A8BCE0', h: '#FFFFFF', k: '#5A6E9A', w: '#FFFFFF', e: '#1B2340', b: '#FFFFFF' },
    bee: { a: '#F2F4FF', A: '#AEBBE8', k: '#6A7ACB', w: '#CFE8FF', e: '#1B2340' },
    burr: { a: '#BFE8FF', A: '#78B8E8', h: '#FFFFFF', k: '#E8F8FF', w: '#FFFFFF', e: '#1B2340' },
    bird: { a: '#E8ECF8', A: '#A8B0CE', w: '#FFD84A', b: '#F2C14E' },
  },
};
const WORLD_OUTLINE = { 1: '#2B1A1F', 2: '#2E1626', 3: '#141A33' };
function buildEnemies() {
  const out = {};
  for (const wld of [1, 2, 3]) {
    out[wld] = {};
    for (const [k, frames] of Object.entries(ENEMY_ROWS)) {
      const pal = WORLD_ENEMY_PAL[wld][k];
      out[wld][k] = frames.map(rows => {
        const r = spriteFrom(rows, pal, WORLD_OUTLINE[wld]);
        return { r, l: flipH(r) };
      });
    }
  }
  return out;
}

/* ── Items & props ── */
const ITEM_ROWS = {
  star: ['.....y.....', '....yyy....', '....yhy....', 'yyyyyhyyyyy', '.yyyyyyyyo.', '..yyyyyyo..', '..yyyoyyo..', '.yyo...yyo.', '.yo.....yo.'],
  heart: ['.rr...rr.', 'rhrr.rrrr', 'rhrrrrrrr', 'rrrrrrrrR', '.rrrrrrR.', '..rrrrR..', '...rRR...', '....R....'],
  key: ['.yyy.......', 'yhyyy......', 'yy.yyyyyyyy', 'yyyyy..y.yy', '.yyy...y..y'],
  spring0: ['..gggggggggggg..', '.gGGGGGGGGGGGGg.', '....m......m....', '...m........m...', '....m......m....', '...m........m...', '..bbbbbbbbbbbb..', '.bBBBBBBBBBBBBb.'],
  spring1: ['..gggggggggggg..', '.gGGGGGGGGGGGGg.', '...m........m...', '..bbbbbbbbbbbb..', '.bBBBBBBBBBBBBb.'],
  sign: ['.wwwwwwwwwwwwww.', 'wWWWWWWWWWWWWWWw', 'wWkkWkkkWkkWWWWw', 'wWWWWWWWWWWWWWWw', 'wWkkkWkkWkkkWWWw', 'wWWWWWWWWWWWWWWw', '.wwwwwwwwwwwwww.', '.......pp.......', '.......pp.......', '.......pp.......', '......pppp......'],
  gloves: ['..w.......w..', '.aa..w.w..aa.', 'aaaa.a.a.aaaa', 'aaaaaaaaaaaaa', '.aa.aaaaa.aa.', '...aaaaaaa...', '..aaaaaaaaa..', '..aaaahaaaa..', '..aaaaaaaaa..', '...AaaaaaA...', '....AAAAA....'],
  boots: ['...aaaaa.....', '...aaahaa....', '...aaaaaa....', '...aaaaaa....', '...aaaaaa....', '..aaaaaaaaa..', '.aaaaaaaaaaaa', '.AAAAAAAAAAAA', '..w..w...w...'],
  crystal: ['.....h.....', '....hhh....', '...hhaaa...', '..hhaaaaa..', '.hhaaaaaaa.', 'haaaaaaaaaA', '.aaaaaaaaA.', '..aaaaaaA..', '...aaaAA...', '....aAA....', '.....A.....'],
};
const ITEM_PAL = {
  star: { y: '#FFD84A', h: '#FFF7C8', o: '#E89A2A' },
  heart: { r: '#F0506E', h: '#FFB0C0', R: '#B02A48' },
  keyGold: { y: '#FFC93A', h: '#FFF2B0' },
  keyTeal: { y: '#3FD6C8', h: '#C8FFF8' },
  spring: { g: '#F05A5A', G: '#B8323A', m: '#C8D0DC', b: '#6A7390', B: '#454C66' },
  sign: { w: '#B77B45', W: '#D9A066', k: '#8A5530', p: '#7A4A2A' },
  gloves: { a: '#F6A3B6', A: '#D9577A', h: '#FFE0E8', w: '#FFFFFF' },
  boots: { a: '#7A6CF0', A: '#4E40B8', h: '#C8C0FF', w: '#E8F8FF' },
  crystal: { a: '#6FE8FF', A: '#2F9CC8', h: '#E8FFFF' },
};
function buildItems() {
  const I = {};
  const mk = (rows, pal, out = '#2B1A1F') => spriteFrom(rows, pal, out);
  I.star = mk(ITEM_ROWS.star, ITEM_PAL.star, '#5A3410');
  // spin frames: squash the star horizontally
  I.starSpin = [1, 0.66, 0.34, 0.66].map((s, i) => {
    const w = Math.max(3, Math.round(I.star.width * s));
    const [c, x] = mkCanvas(I.star.width, I.star.height);
    let src = i === 2 ? I.star : I.star;
    x.drawImage(src, Math.floor((I.star.width - w) / 2), 0, w, I.star.height);
    return c;
  });
  I.heart = mk(ITEM_ROWS.heart, ITEM_PAL.heart, '#4A1424');
  I.keyGold = mk(ITEM_ROWS.key, ITEM_PAL.keyGold, '#5A3410');
  I.keyTeal = mk(ITEM_ROWS.key, ITEM_PAL.keyTeal, '#0E3A40');
  I.spring0 = mk(ITEM_ROWS.spring0, ITEM_PAL.spring, '#2A2030');
  I.spring1 = mk(ITEM_ROWS.spring1, ITEM_PAL.spring, '#2A2030');
  I.sign = mk(ITEM_ROWS.sign, ITEM_PAL.sign, '#3A2014');
  I.gloves = mk(ITEM_ROWS.gloves, ITEM_PAL.gloves, '#3A1420');
  I.boots = mk(ITEM_ROWS.boots, ITEM_PAL.boots, '#1E1648');
  I.crystal = mk(ITEM_ROWS.crystal, ITEM_PAL.crystal, '#0E3A58');
  I.crystalDim = tintCanvas(I.crystal, '#6FE8FF', 0.35);
  return I;
}
