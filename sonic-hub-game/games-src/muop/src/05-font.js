/* ── Pixel font ──
   Hand-drawn 5×7 font (variable width). Vietnamese works by NFD-decomposing each
   character into base glyph + combining marks, then stacking the marks in pixels. */
const FONT = (() => {
  const g = {};
  const def = (ch, rows) => { const r = rows.split('|'); g[ch] = { w: r[0].length, rows: r }; };
  // uppercase
  def('A', '.###.|#...#|#...#|#####|#...#|#...#|#...#'); def('B', '####.|#...#|#...#|####.|#...#|#...#|####.');
  def('C', '.###.|#...#|#....|#....|#....|#...#|.###.'); def('D', '####.|#...#|#...#|#...#|#...#|#...#|####.');
  def('E', '#####|#....|#....|####.|#....|#....|#####'); def('F', '#####|#....|#....|####.|#....|#....|#....');
  def('G', '.###.|#...#|#....|#.###|#...#|#...#|.####'); def('H', '#...#|#...#|#...#|#####|#...#|#...#|#...#');
  def('I', '###|.#.|.#.|.#.|.#.|.#.|###');                def('J', '....#|....#|....#|....#|#...#|#...#|.###.');
  def('K', '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#'); def('L', '#....|#....|#....|#....|#....|#....|#####');
  def('M', '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#'); def('N', '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#');
  def('O', '.###.|#...#|#...#|#...#|#...#|#...#|.###.'); def('P', '####.|#...#|#...#|####.|#....|#....|#....');
  def('Q', '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#'); def('R', '####.|#...#|#...#|####.|#.#..|#..#.|#...#');
  def('S', '.####|#....|#....|.###.|....#|....#|####.'); def('T', '#####|..#..|..#..|..#..|..#..|..#..|..#..');
  def('U', '#...#|#...#|#...#|#...#|#...#|#...#|.###.'); def('V', '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..');
  def('W', '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.'); def('X', '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#');
  def('Y', '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..'); def('Z', '#####|....#|...#.|..#..|.#...|#....|#####');
  def('\u0110', '.####.|.#...#|.#...#|###..#|.#...#|.#...#|.####.');
  def('O\u031B', '.###.#|#...##|#...#.|#...#.|#...#.|#...#.|.###..');
  def('U\u031B', '#...##|#...#.|#...#.|#...#.|#...#.|#...#.|.###..');
  // lowercase
  def('a', '.....|.....|.###.|....#|.####|#...#|.####'); def('b', '#....|#....|####.|#...#|#...#|#...#|####.');
  def('c', '....|....|.###|#...|#...|#...|.###');        def('d', '....#|....#|.####|#...#|#...#|#...#|.####');
  def('e', '.....|.....|.###.|#...#|#####|#....|.###.'); def('f', '..##|.#..|####|.#..|.#..|.#..|.#..');
  def('g', '.....|.....|.####|#...#|#...#|#...#|.####|....#|.###.');
  def('h', '#....|#....|####.|#...#|#...#|#...#|#...#'); def('i', '#|.|#|#|#|#|#'); def('\u0131', '.|.|#|#|#|#|#');
  def('j', '..#|...|..#|..#|..#|..#|..#|#.#|.#.');        def('k', '#...|#...|#..#|#.#.|##..|#.#.|#..#');
  def('l', '#.|#.|#.|#.|#.|#.|.#');                       def('m', '.....|.....|##.#.|#.#.#|#.#.#|#.#.#|#.#.#');
  def('n', '.....|.....|####.|#...#|#...#|#...#|#...#'); def('o', '.....|.....|.###.|#...#|#...#|#...#|.###.');
  def('p', '.....|.....|####.|#...#|#...#|#...#|####.|#....|#....');
  def('q', '.....|.....|.####|#...#|#...#|#...#|.####|....#|....#');
  def('r', '....|....|#.##|##..|#...|#...|#...');         def('s', '.....|.....|.####|#....|.###.|....#|####.');
  def('t', '.#..|.#..|####|.#..|.#..|.#..|..##');         def('u', '.....|.....|#...#|#...#|#...#|#...#|.####');
  def('v', '.....|.....|#...#|#...#|#...#|.#.#.|..#..'); def('w', '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.');
  def('x', '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#');
  def('y', '.....|.....|#...#|#...#|#...#|#...#|.####|....#|.###.');
  def('z', '.....|.....|#####|...#.|..#..|.#...|#####');
  def('\u0111', '....#.|...###|.####.|#...#.|#...#.|#...#.|.####.');
  def('o\u031B', '......|.....#|.###.#|#...#.|#...#.|#...#.|.###..');
  def('u\u031B', '......|.....#|#...##|#...#.|#...#.|#...#.|.####.');
  // digits
  def('0', '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.'); def('1', '.#.|##.|.#.|.#.|.#.|.#.|###');
  def('2', '.###.|#...#|....#|...#.|..#..|.#...|#####'); def('3', '####.|....#|....#|.###.|....#|....#|####.');
  def('4', '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.'); def('5', '#####|#....|####.|....#|....#|#...#|.###.');
  def('6', '.###.|#....|#....|####.|#...#|#...#|.###.'); def('7', '#####|....#|...#.|..#..|..#..|..#..|..#..');
  def('8', '.###.|#...#|#...#|.###.|#...#|#...#|.###.'); def('9', '.###.|#...#|#...#|.####|....#|....#|.###.');
  // punctuation & icons
  def(' ', '...|...|...|...|...|...|...');  def('.', '.|.|.|.|.|.|#');  def(',', '..|..|..|..|..|..|.#|#.|..');
  def(':', '.|.|.|#|.|.|#');                def(';', '..|..|..|.#|..|..|.#|#.|..');  def('!', '#|#|#|#|#|.|#');
  def('?', '.###.|#...#|....#|..##.|..#..|.....|..#..'); def('-', '....|....|....|####|....|....|....');
  def('+', '.....|..#..|..#..|#####|..#..|..#..|.....'); def('/', '....#|....#|...#.|..#..|.#...|#....|#....');
  def('(', '..#|.#.|#..|#..|#..|.#.|..#');  def(')', '#..|.#.|..#|..#|..#|.#.|#..');
  def('%', '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##'); def("'", '#|#|.|.|.|.|.');  def('"', '#.#|#.#|...|...|...|...|...');
  def('*', '.....|#.#.#|.###.|#####|.###.|#.#.#|.....'); def('<', '...#|..#.|.#..|#...|.#..|..#.|...#');
  def('>', '#...|.#..|..#.|...#|..#.|.#..|#...');        def('=', '....|....|####|....|####|....|....');
  def('_', '.....|.....|.....|.....|.....|.....|#####'); def('\u00b7', '.|.|.|#|.|.|.');
  def('\u00d7', '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#');
  def('\u2192', '.....|..#..|...#.|#####|...#.|..#..|.....'); def('\u2190', '.....|..#..|.#...|#####|.#...|..#..|.....');
  def('\u2191', '..#..|.###.|#.#.#|..#..|..#..|..#..|.....'); def('\u2193', '.....|..#..|..#..|..#..|#.#.#|.###.|..#..');
  def('\u2605', '...#...|..###..|#######|.#####.|..###..|.##.##.|.#...#.');
  def('\u2606', '...#...|..#.#..|###.###|.#...#.|..#.#..|.#.#.#.|.#...#.');
  def('\u2665', '.......|.##.##.|#######|#######|.#####.|..###..|...#...');
  def('\u2661', '.......|.##.##.|#..#..#|#.....#|.#...#.|..#.#..|...#...');
  def('\u2026', '.....|.....|.....|.....|.....|.....|#.#.#');
  def('\u2039', '...|..#|.#.|#..|.#.|..#|...'); def('\u203a', '...|#..|.#.|..#|.#.|#..|...');
  def('[', '##|#.|#.|#.|#.|#.|##'); def(']', '##|.#|.#|.#|.#|.#|##');
  def('&', '.##..|#..#.|.##..|.#...|#.#.#|#..#.|.##.#');
  const alias = { '\u2013': '-', '\u2014': '-', '\u201c': '"', '\u201d': '"', '\u2018': "'", '\u2019': "'" };
  const marks = {
    0x300: { k: 'tone', r: ['##.', '.##'] }, 0x301: { k: 'tone', r: ['.##', '##.'] },
    0x303: { k: 'tone', r: ['.#.#', '#.#.'] }, 0x309: { k: 'tone', r: ['##.', '..#', '.#.'] },
    0x302: { k: 'hat', r: ['.#.', '#.#'] }, 0x306: { k: 'hat', r: ['#..#', '.##.'] },
    0x323: { k: 'below', r: ['#'] },
  };
  return { g, alias, marks };
})();

const TEXT_PAD_TOP = 7, TEXT_PAD_BOT = 3;
function layoutText(str) {
  const s = String(str).normalize('NFD');
  const out = [];
  for (const chr of s) {
    const cp = chr.codePointAt(0);
    if (cp === 0x31B) { if (out.length) out[out.length - 1].horn = true; continue; }
    if (FONT.marks[cp]) { if (out.length) out[out.length - 1].marks.push(FONT.marks[cp]); continue; }
    out.push({ c: FONT.alias[chr] || chr, marks: [], horn: false });
  }
  const glyphs = [];
  let x = 0;
  for (const t of out) {
    let key = t.c;
    if (t.horn) key = t.c + '\u031B';
    if (key === 'i' && t.marks.some(m => m.k !== 'below')) key = '\u0131';
    const gl = FONT.g[key] || FONT.g[t.c] || FONT.g['?'];
    glyphs.push({ gl, x, marks: t.marks, upper: /[A-Z\u0110\u00c0-\u1ef9]/.test(t.c) && t.c === t.c.toUpperCase() && t.c !== t.c.toLowerCase() });
    x += gl.w + 1;
  }
  return { glyphs, w: Math.max(0, x - 1) };
}
function textWidth(str, scale = 1) { return layoutText(str).w * scale; }

const _textCache = new Map();
/* Renders text to a cached canvas. opts: {shadow, outline} colors. Returned canvas has the
   cap-top of the text at y = TEXT_PAD_TOP + 1 (the +1 is room for outline). */
function textCanvas(str, color, opts = {}) {
  const key = str + '\u0001' + color + '\u0001' + (opts.shadow || '') + '\u0001' + (opts.outline || '');
  let c = _textCache.get(key);
  if (c) return c;
  const L = layoutText(str);
  const W = L.w + 3, H = 7 + TEXT_PAD_TOP + TEXT_PAD_BOT + 3;
  const mask = new Uint8Array(W * H);
  const put = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = 1; };
  const oy = TEXT_PAD_TOP + 1, ox = 1;
  for (const gg of L.glyphs) {
    const { gl } = gg;
    gl.rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') put(ox + gg.x + rx, oy + ry); });
    const baseTop = gg.upper ? 0 : 2;
    let hatTop = null;
    const hat = gg.marks.find(m => m.k === 'hat'), tone = gg.marks.find(m => m.k === 'tone'), below = gg.marks.find(m => m.k === 'below');
    const drawMark = (m, bottomRow) => {
      const mw = m.r[0].length, top = bottomRow - m.r.length + 1;
      const mx = ox + gg.x + Math.floor((gl.w - mw) / 2) + (gg.gl.w >= 5 && m.r[0] === '.##' ? 1 : 0);
      m.r.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') put(mx + rx, oy + top + ry); });
      return top;
    };
    const circ = hat && hat.r[0] === '.#.', tilde = tone && tone.r[0] === '.#.#';
    if (hat && tone && circ && !tilde) {
      // Vietnamese convention: acute/grave/hook sit beside the circumflex, not on top
      const put2 = (m, x0, bottomRow) => { const top = bottomRow - m.r.length + 1; m.r.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') put(x0 + rx, oy + top + ry); }); };
      put2(hat, ox + gg.x + Math.max(0, Math.floor((gl.w - 5) / 2)), baseTop - 2);
      put2(tone, ox + gg.x + Math.max(3, gl.w - tone.r[0].length + 1), baseTop - 2);
    } else {
      if (hat) hatTop = drawMark(hat, baseTop - 2);
      if (tone) drawMark(tone, hatTop !== null ? hatTop - 2 : baseTop - 2);
    }
    if (below) drawMark(below, 8);
  }
  const [cv, x] = mkCanvas(W, H);
  const paint = (col, dx, dy) => {
    x.fillStyle = col;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (mask[y * W + xx]) x.fillRect(xx + dx, y + dy, 1, 1);
  };
  if (opts.outline) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) paint(opts.outline, dx, dy); }
  else if (opts.shadow) paint(opts.shadow, 1, 1);
  paint(color, 0, 0);
  if (_textCache.size > 400) _textCache.delete(_textCache.keys().next().value);
  _textCache.set(key, cv);
  return cv;
}
/* Draw text so that the cap-top sits at (x, y). align: 'left' | 'center' | 'right'. */
function drawText(ctx, str, x, y, color, opts = {}) {
  const s = opts.scale || 1;
  const c = textCanvas(str, color, opts);
  const w = (c.width - 3) * s;
  let dx = x;
  if (opts.align === 'center') dx = x - w / 2; else if (opts.align === 'right') dx = x - w;
  ctx.drawImage(c, Math.round(dx - s), Math.round(y - (TEXT_PAD_TOP + 1) * s), c.width * s, c.height * s);
  return w;
}
/* Wrap text into lines that fit maxW (in unscaled pixels). */
function wrapText(str, maxW) {
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
