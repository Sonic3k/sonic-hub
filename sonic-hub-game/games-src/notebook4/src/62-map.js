/* ── Level select: the notebook's pages laid out as a grid of small cards ──
   Every page is open from the start; a tick marks the ones already cleared. */
function buildPageThumb(lv, w, h) {
  const rows = levelRows(lv), H = rows.length, Wt = rows[0].length;
  const [c, x] = mkCanvas(w, h);
  x.fillStyle = '#FFFEFA'; x.fillRect(0, 0, w, h);
  for (let px = 0; px < w; px++) for (let py = 0; py < h; py++) {
    const tx = Math.floor(px * Wt / w), ty = Math.floor(py * H / h), ch = rows[ty][tx];
    if (ch === '#' || ch === 'X' || ch === '?' || ch === '+') { x.fillStyle = ch === '#' ? '#B9A6EC' : '#5B36B0'; x.fillRect(px, py, 1, 1); }
  }
  x.fillStyle = '#5B36B0'; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
  return c;
}
function buildMapArt() { return paperSky(); }
class MapScreen {
  constructor(game) { this.game = game; this.t = 0; this.art = null; this.cur = 0; this.scroll = 0; this.thumbs = null; }
  get n() { return LEVELS.length; }
  layout() {
    const W = V.W, s = UI.s, cw = 70, ch = 58, gap = 8;
    const cols = Math.max(2, Math.floor((W - 16 + gap) / (cw + gap)));
    const x0 = Math.round((W - (cols * cw + (cols - 1) * gap)) / 2), y0 = 24 + 11 * s;
    return { cw, ch, gap, cols, x0, y0 };
  }
  cell(i) { const L = this.layout(); return { x: L.x0 + (i % L.cols) * (L.cw + L.gap), y: L.y0 + Math.floor(i / L.cols) * (L.ch + L.gap) - this.scroll, w: L.cw, h: L.ch }; }
  maxScroll() { const L = this.layout(); return Math.max(0, Math.ceil(this.n / L.cols) * (L.ch + L.gap) + L.y0 + 34 * UI.s - V.H); }
  enter(select) {
    if (!this.art) this.art = buildMapArt();
    if (!this.thumbs) this.thumbs = LEVELS.map(lv => buildPageThumb(lv, 62, 34));
    const g = this.game;
    const firstOpen = LEVELS.findIndex((lv, i) => !(g.save.levels[i + 1] || {}).done);
    this.cur = clamp(select !== undefined ? select : (firstOpen < 0 ? 0 : firstOpen), 0, this.n - 1);
    this.follow(true);
    g.audio.music('title');
  }
  follow(snap) {
    const c = this.cell(this.cur), top = 24 + 11 * UI.s, bottom = V.H - 36 * UI.s;
    let target = this.scroll;
    if (c.y < top) target = this.scroll - (top - c.y) - 4;
    if (c.y + c.h > bottom) target = this.scroll + (c.y + c.h - bottom) + 4;
    target = clamp(target, 0, this.maxScroll());
    this.scroll = snap ? target : lerp(this.scroll, target, 0.25);
  }
  move(d) { const n = clamp(this.cur + d, 0, this.n - 1); if (n !== this.cur) { this.cur = n; this.game.audio.sfx('map'); } }
  update(inp) {
    this.t++;
    const g = this.game, L = this.layout();
    if (inp.leftPressed) this.move(-1);
    if (inp.rightPressed) this.move(1);
    if (inp.upPressed) this.move(-L.cols);
    if (inp.downPressed) this.move(L.cols);
    this.follow(false);
    if (inp.confirm) { g.audio.sfx('confirm'); g.startLevel(this.cur + 1); return; }
    if (inp.backPressed || inp.pausePressed) { g.audio.sfx('back'); g.go('title'); return; }
    for (const tp of inp.taps) {
      if (this.backBox && tp.x <= this.backBox.x + this.backBox.w && tp.y <= this.backBox.y + this.backBox.h) { g.audio.sfx('back'); g.go('title'); return; }
      if (this.playBox && tp.x >= this.playBox.x && tp.x <= this.playBox.x + this.playBox.w && tp.y >= this.playBox.y && tp.y <= this.playBox.y + this.playBox.h) { g.audio.sfx('confirm'); g.startLevel(this.cur + 1); return; }
      for (let i = 0; i < this.n; i++) {
        const c = this.cell(i);
        if (tp.x >= c.x && tp.x <= c.x + c.w && tp.y >= c.y && tp.y <= c.y + c.h) {
          if (i === this.cur) { g.audio.sfx('confirm'); g.startLevel(i + 1); return; }
          this.cur = i; g.audio.sfx('map');
        }
      }
    }
  }
  draw(ctx) {
    const g = this.game, W = V.W, H = V.H, s = UI.s, t = this.t, S = g.save;
    for (let x = 0; x < W; x += 64) ctx.drawImage(this.art, x, 0);
    ctx.fillStyle = 'rgba(224,85,154,.35)'; ctx.fillRect(10, 0, 1, H);
    for (let i = 0; i < this.n; i++) {
      const c = this.cell(i);
      if (c.y + c.h < 0 || c.y > H) continue;
      const lv = LEVELS[i], st = S.levels[i + 1] || {}, on = i === this.cur;
      ctx.fillStyle = on ? '#5B36B0' : '#CFC3EE'; ctx.fillRect(c.x - 1, c.y - 1, c.w + 2, c.h + 2);
      ctx.fillStyle = '#FFFEFA'; ctx.fillRect(c.x, c.y, c.w, c.h);
      if (on) { ctx.fillStyle = '#5B36B0'; ctx.fillRect(c.x - 2, c.y - 2, c.w + 4, 1); ctx.fillRect(c.x - 2, c.y + c.h + 1, c.w + 4, 1); ctx.fillRect(c.x - 2, c.y - 2, 1, c.h + 4); ctx.fillRect(c.x + c.w + 1, c.y - 2, 1, c.h + 4); }
      ctx.drawImage(this.thumbs[i], c.x + 4, c.y + 19);
      drawText(ctx, String(lv.page || i + 1), c.x + 5, c.y + 5, on ? '#C2185B' : '#5B36B0', { scale: 1 });
      if (st.done) { ctx.fillStyle = '#2E9E5B'; for (let k = 0; k < 4; k++) ctx.fillRect(c.x + c.w - 14 + k, c.y + 7 + k, 2, 2); for (let k = 0; k < 7; k++) ctx.fillRect(c.x + c.w - 11 + k, c.y + 10 - k, 2, 2); }
    }
    // header
    const done = LEVELS.filter((lv, i) => (S.levels[i + 1] || {}).done).length;
    ctx.fillStyle = 'rgba(255,254,250,.96)'; ctx.fillRect(0, 0, W, 18 + 10 * s); ctx.fillStyle = '#CFC3EE'; ctx.fillRect(0, 18 + 10 * s, W, 1);
    this.backBox = { x: 0, y: 0, w: 16 + 12 * s, h: 14 * s };
    txt(ctx, '‹', 10, 7 + s, UIC.dim, 'left', s);
    txt(ctx, 'Chọn màn', 12 + 10 * s, 7 + s, UIC.ink, 'left', s);
    txt(ctx, done + '/' + this.n + ' màn', W - 8, 7 + s, UIC.gold, 'right', s);
    // footer: selected page + play
    const lv = LEVELS[this.cur], st = S.levels[this.cur + 1] || {};
    const pw = Math.min(W - 12, 300 * (s > 1 ? 1.2 : 1)), ph = 24 * s + 8, px = Math.round((W - pw) / 2), py = H - ph - 6;
    panel(ctx, px, py, pw, ph);
    const name = lv.name, ns = fitScale(name, pw - 70 * s, s);
    txt(ctx, name, px + 10, py + 5 + s, UIC.ink, 'left', ns);
    const sub = (st.done ? 'Tốt nhất ' + fmtTime(st.best) + '   ' : '') + (lv.coins ? lv.coins + ' xu' : '');
    if (sub) txt(ctx, sub, px + 10, py + 5 + 12 * s, UIC.dim, 'left', s);
    const bw = 44 * s, bh = 15 * s, bx = px + pw - bw - 8, by = py + (ph - bh) / 2;
    ctx.fillStyle = '#5B36B0'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = (t >> 4) % 2 ? '#7B55D0' : '#6A44C2'; ctx.fillRect(bx, by, bw, bh);
    drawText(ctx, 'Chơi', bx + bw / 2, by + (bh - 7 * s) / 2, '#FFFEFA', { scale: s, align: 'center' });
    this.playBox = { x: bx, y: by, w: bw, h: bh };
  }
}
function miniStarsTiny(ctx, stars, x, y) {
  for (let i = 0; i < 3; i++) { ctx.fillStyle = UIC.edge; ctx.fillRect(x + i * 5 - 1, y - 1, 5, 5); ctx.fillStyle = stars[i] ? '#E0A800' : '#EDE6FF'; ctx.fillRect(x + i * 5, y, 3, 3); }
}
