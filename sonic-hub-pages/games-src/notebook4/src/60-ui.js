/* ── UI helpers ── */
const UI = { s: 1 };
const UIC = { ink: '#3A2470', dim: '#8C7BB8', gold: '#C2185B', out: '#FFFEFA', panel: 'rgba(255,254,250,.97)', edge: '#5B36B0' };
function panel(ctx, x, y, w, h, fill) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = 'rgba(91,54,176,.18)'; ctx.fillRect(x + 2, y + h, w - 2, 2); ctx.fillRect(x + w, y + 2, 2, h - 2);
  ctx.fillStyle = fill || UIC.panel; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = UIC.edge;
  ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1); ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
}
function txt(ctx, s, x, y, col = UIC.ink, align = 'left', scale = UI.s) { return drawText(ctx, s, x, y, col, { scale, align, outline: UIC.out }); }
/* fit a string to maxW by lowering its scale */
function fitScale(s, maxW, want = UI.s) { let k = want; while (k > 1 && textWidth(s, k) > maxW) k--; return k; }
/* vertical menu; returns hit boxes for taps */
function menu(ctx, items, sel, cx, y, t) {
  const s = UI.s, lh = 13 * s, boxes = [];
  items.forEach((it, i) => {
    const on = i === sel, w = textWidth(it, s);
    const yy = y + i * lh;
    txt(ctx, it, cx, yy, on ? UIC.gold : UIC.ink, 'center');
    if (on) {
      const bx = Math.round(cx - w / 2 - 9 * s), by = yy + 1 * s, fl = (t >> 3) % 2;
      ctx.fillStyle = UIC.out; ctx.fillRect(bx - s, by - s, 6 * s, 7 * s);
      ctx.fillStyle = UIC.gold; ctx.fillRect(bx, by, 4 * s, 5 * s);
      ctx.fillStyle = '#FFFEFA'; ctx.fillRect(bx + s, by + (1 + fl) * s, 2 * s, 2 * s);
    }
    boxes.push({ x: cx - Math.max(w, 60 * s) / 2 - 12 * s, y: yy - 3 * s, w: Math.max(w, 60 * s) + 24 * s, h: lh, i });
  });
  return boxes;
}
function hit(boxes, taps) { for (const tp of taps) for (const b of boxes) if (tp.x >= b.x && tp.x <= b.x + b.w && tp.y >= b.y && tp.y <= b.y + b.h) return b; return null; }
function fmtTime(frames) { const s = Math.floor(frames / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function miniStars(ctx, stars, x, y, s = 1) {
  stars.forEach((on, i) => drawText(ctx, on ? '★' : '☆', x + i * 9 * s, y, on ? '#E0A800' : '#B9A9CB', { scale: s, outline: UIC.out }));
}

/* ── Title: an open notebook page ── */
function buildTitleArt() { return { sky: paperSky() }; }
class TitleScreen {
  constructor(game) { this.game = game; this.t = 0; this.sel = 0; this.art = buildTitleArt(); }
  items() {
    const g = this.game, has = g.hasProgress();
    const snd = 'Âm thanh: ' + (g.save.sfx ? 'bật' : 'tắt');
    return has ? [['Chơi tiếp', 'play'], ['Chơi lại từ đầu', 'new'], [snd, 'sound'], ['Cách chơi', 'howto']] : [['Bắt đầu', 'play'], [snd, 'sound'], ['Cách chơi', 'howto']];
  }
  act(a) {
    const g = this.game;
    if (a === 'play') { g.audio.sfx('confirm'); g.go('map'); }
    else if (a === 'new') { if (this.confirmNew) { g.resetSave(); g.audio.sfx('confirm'); g.go('map'); } else { this.confirmNew = true; g.audio.sfx('select'); } }
    else if (a === 'sound') { g.save.sfx = g.save.music = !g.save.sfx; g.applySound(); g.persist(); g.audio.sfx('select'); }
    else if (a === 'howto') { g.audio.sfx('confirm'); g.go('howto'); }
  }
  update(inp) {
    this.t++;
    const it = this.items();
    if (inp.upPressed) { this.sel = (this.sel + it.length - 1) % it.length; this.game.audio.sfx('select'); this.confirmNew = false; }
    if (inp.downPressed) { this.sel = (this.sel + 1) % it.length; this.game.audio.sfx('select'); this.confirmNew = false; }
    this.sel = Math.min(this.sel, it.length - 1);
    if (inp.confirm) this.act(it[this.sel][1]);
    const b = this.boxes && hit(this.boxes, inp.taps);
    if (b) { if (b.i !== this.sel) { this.sel = b.i; this.confirmNew = false; } this.act(it[b.i][1]); }
  }
  draw(ctx) {
    const A = this.art, t = this.t, W = V.W, H = V.H, s = UI.s;
    for (let x = 0; x < W; x += 64) ctx.drawImage(A.sky, x, 0);
    ctx.fillStyle = 'rgba(224,85,154,.35)'; ctx.fillRect(22, 0, 1, H);                 // the notebook's margin line
    // a strip of level along the bottom, scrolling like turning pages
    const gy = H - 34, I = '#5B36B0', I2 = '#9C86DA';
    ctx.fillStyle = I; ctx.fillRect(0, gy, W, 1);
    const off = (t * 0.5) % 96;
    for (let x = -off; x < W + 96; x += 96) {
      ctx.fillStyle = I; ctx.fillRect(Math.round(x) + 30, gy - 18, 1, 18); ctx.fillRect(Math.round(x) + 62, gy - 18, 1, 18); ctx.fillRect(Math.round(x) + 30, gy - 18, 33, 1);
      ctx.fillStyle = I2; for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(x) + 36 + k * 8, gy - 12 + k * 4, 3, 1);
      drawPaperBlock(ctx, T.BONUS, Math.round(x) + 76, gy - 44, t);
      ctx.fillStyle = I; ctx.fillRect(Math.round(x) + 8, gy - 36, 5, 8); ctx.fillStyle = '#FFFEFA'; ctx.fillRect(Math.round(x) + 9, gy - 35, 3, 6);
    }
    const fr = ART.hero['run' + ((t >> 3) % 4)];
    ctx.drawImage(fr.r, Math.round(W * 0.5 - 9), gy - 17);
    // logo
    const ls = Math.max(3, Math.min(6, Math.floor(W / 64)));
    const ly = 26 + (s > 1 ? 0 : 6);
    drawText(ctx, 'TÍM 4', W / 2 + ls * 0.6, ly + ls * 0.6, '#F2A6C8', { scale: ls, align: 'center' });
    drawText(ctx, 'TÍM 4', W / 2, ly, '#5B36B0', { scale: ls, align: 'center', outline: '#FFFEFA' });
    const sub = 'Mario 4 vẽ tay, dựng lại từ vở cũ', ss = fitScale(sub, W - 20, 2);
    drawText(ctx, sub, W / 2, ly + 7 * ls + 10, '#8C72D8', { scale: ss, align: 'center', outline: '#FFFEFA' });
    const it = this.items();
    const my = ly + 7 * ls + 10 + 7 * ss + 16;
    this.boxes = menu(ctx, it.map(i => i[0]), this.sel, W / 2, my, t);
    if (this.confirmNew) txt(ctx, 'Chọn lần nữa để xóa tiến trình', W / 2, my + it.length * 13 * s + 4, '#C2185B', 'center', fitScale('Chọn lần nữa để xóa tiến trình', W - 16));
    const hint = this.game.input.usingTouch ? 'Chạm để chọn' : '↑ ↓ chọn   Z / Enter xác nhận';
    drawText(ctx, hint, W / 2, H - 12, UIC.dim, { align: 'center', outline: UIC.out });
  }
}
/* ── How to play ── */
class HowToScreen {
  constructor(game) { this.game = game; this.t = 0; }
  update(inp) {
    this.t++;
    if (this.t > 10 && (inp.confirm || inp.backPressed || inp.pausePressed || inp.taps.length)) { this.game.audio.sfx('back'); this.game.go('title'); }
  }
  draw(ctx) {
    this.game.screens.title.draw(ctx);
    const W = V.W, H = V.H, s = UI.s;
    ctx.fillStyle = 'rgba(255,254,250,.6)'; ctx.fillRect(0, 0, W, H);
    const touch = this.game.input.usingTouch;
    const rows = touch ? [
      ['◀ ▶', 'chạy (trượt ngón cái được)'], ['Nút tròn lớn', 'nhảy, giữ lâu để cao hơn'], ['II', 'tạm dừng'],
    ] : [
      ['← →  A D', 'chạy'], ['Z  Space  ↑', 'nhảy, giữ lâu để cao hơn'], ['Esc  P', 'tạm dừng'],
    ];
    const pw = Math.min(W - 16, (touch ? 280 : 250) * (s > 1 ? 1.3 : 1)), ph = (rows.length * 12 + 58) * s * (s > 1 ? 0.62 : 1) + 20;
    const px = (W - pw) / 2, py = Math.max(6, (H - ph) / 2);
    panel(ctx, px, py, pw, ph);
    const ts = fitScale('Cách chơi', pw - 20, 2);
    drawText(ctx, 'Cách chơi', W / 2, py + 8, UIC.gold, { scale: ts, align: 'center', outline: UIC.out });
    let y = py + 8 + 7 * ts + 10;
    const ks = s > 1 && pw < 380 ? 1 : s;
    for (const [k, d] of rows) {
      drawText(ctx, k, px + 12, y, UIC.gold, { scale: ks, outline: UIC.out });
      drawText(ctx, d, px + 12 + 70 * ks, y, UIC.ink, { scale: ks, outline: UIC.out });
      y += 12 * ks;
    }
    y += 4;
    const tip = 'Mỗi trang vở là một màn. Nhảy lên đầu quái để hạ, riêng con có gai thì phải tránh. Húc khối có hình thoi để lấy xu. Đi vào cửa để sang cửa cùng cặp.';
    for (const line of wrapText(tip, (pw - 24) / ks)) { drawText(ctx, line, px + 12, y, UIC.dim, { scale: ks, outline: UIC.out }); y += 11 * ks; }
    drawText(ctx, touch ? 'Chạm để quay lại' : 'Nhấn Z để quay lại', W / 2, py + ph - 14, UIC.dim, { align: 'center', outline: UIC.out });
  }
}
