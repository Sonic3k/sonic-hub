/* ── UI helpers ── */
const UI = { s: 1 };
const UIC = { ink: '#FFF4DC', dim: '#B9A9CB', gold: '#FFC46B', out: '#1B1424', panel: 'rgba(24,16,34,.92)', edge: '#F6E7C8' };
function panel(ctx, x, y, w, h, fill) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = 'rgba(8,5,14,.55)'; ctx.fillRect(x + 2, y + h, w - 2, 2); ctx.fillRect(x + w, y + 2, 2, h - 2);
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
      ctx.fillStyle = '#FFF4C8'; ctx.fillRect(bx + s, by + (1 + fl) * s, 2 * s, 2 * s);
    }
    boxes.push({ x: cx - Math.max(w, 60 * s) / 2 - 12 * s, y: yy - 3 * s, w: Math.max(w, 60 * s) + 24 * s, h: lh, i });
  });
  return boxes;
}
function hit(boxes, taps) { for (const tp of taps) for (const b of boxes) if (tp.x >= b.x && tp.x <= b.x + b.w && tp.y >= b.y && tp.y <= b.y + b.h) return b; return null; }
function fmtTime(frames) { const s = Math.floor(frames / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function miniStars(ctx, stars, x, y, s = 1) {
  stars.forEach((on, i) => drawText(ctx, on ? '★' : '☆', x + i * 9 * s, y, on ? '#FFD84A' : '#8A7A9A', { scale: s, outline: UIC.out }));
}

/* ── Title ── */
function buildTitleArt() {
  const far = ridgeLayer(512, 120, { base: 70, waves: [[2, 20, 0.6, true], [5, 10, 2.0, true], [11, 4, 0.3, true]], cols: ['#5E3E86', '#553878', '#4A326C'], rim: '#7E5AA6', seed: 21 });
  const mid = ridgeLayer(512, 100, { base: 46, waves: [[2, 9, 1.2], [4, 6, 0.1], [9, 2, 2.0]], cols: ['#3C2A62', '#352556', '#2E204C'], rim: '#54407E', seed: 22 });
  const r = rng(5);
  for (let i = 0; i < 20; i++) { const x = Math.floor(r() * 512); const t0 = mid.top[x]; fillCircle(mid.b, x, t0 - 2, 2 + r() * 3, '#2E204C'); }
  return { sky: skyCanvas(['#120C2C', '#241646', '#46225E', '#7E3468', '#C4506A', '#EE8660', '#FFC680']), far: far.b.toCanvas(), mid: mid.b.toCanvas(), stars: makeStars(80, 3) };
}
class TitleScreen {
  constructor(game) { this.game = game; this.t = 0; this.sel = 0; this.art = buildTitleArt(); this.flies = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: 0.45 + Math.random() * 0.45, ph: i * 1.7 })); }
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
    drawStars(ctx, A.stars.map(st => ({ ...st, y: st.y * 0.55 })), t, 0);
    drawSun(ctx, W * 0.5, 196, '#FFD9A0', t, true);
    const px = (-t * 0.08) % 512;
    for (let x = px; x < W; x += 512) ctx.drawImage(A.far, Math.round(x), 118);
    for (let x = (-t * 0.18) % 512; x < W; x += 512) ctx.drawImage(A.mid, Math.round(x), 168);
    // foreground hill with the cat and a lantern waiting to be lit
    const hx = W * 0.74;
    ctx.fillStyle = '#1C1434';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 236); ctx.quadraticCurveTo(hx - 40, 214, hx + 10, 216); ctx.quadraticCurveTo(W - 30, 220, W, 232); ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = '#2A1F48'; ctx.fillRect(0, 250, W, 6);
    const catY = 216 - 17 + 1, catX = Math.round(hx - 22);
    const fr = ART.hero[(t >> 5) % 2 ? 'idle1' : 'idle0'];
    ctx.drawImage(fr.r, catX, catY);
    const k = t * 0.4, tipX = catX + 2, tipY = catY + 6 + fr.dy;
    ctx.fillStyle = '#FF7A2E'; ctx.fillRect(tipX - 1, tipY - 1 + (Math.sin(k) > 0.6 ? -1 : 0), 3, 3); ctx.fillStyle = '#FFF6C8'; ctx.fillRect(tipX, tipY, 1, 1);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,.14)'; ctx.beginPath(); ctx.arc(tipX, tipY, 7, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    const lx = Math.round(hx + 6);
    ctx.fillStyle = '#0E0A1C'; ctx.fillRect(lx + 2, 176, 3, 40); ctx.fillRect(lx + 2, 176, 12, 2); ctx.fillRect(lx + 8, 178, 10, 14);
    ctx.fillStyle = '#5A2A3E'; ctx.fillRect(lx + 9, 180, 8, 10);
    for (const f of this.flies) {
      const x = ((f.x * W + Math.sin(t * 0.01 + f.ph) * 30) % W + W) % W, y = f.y * H + Math.sin(t * 0.02 + f.ph) * 10, a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + f.ph));
      ctx.fillStyle = `rgba(255,226,120,${a * 0.35})`; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      ctx.fillStyle = `rgba(255,250,200,${a})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // logo
    const ls = Math.max(3, Math.min(6, Math.floor(W / 64)));
    const ly = 34 + (s > 1 ? 0 : 6);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,90,.10)'; ctx.beginPath(); ctx.ellipse(W / 2, ly + 22, 110, 40, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    drawText(ctx, 'MƯỚP', W / 2 + ls * 0.6, ly + ls * 0.6, '#8A2E4A', { scale: ls, align: 'center' });
    drawText(ctx, 'MƯỚP', W / 2, ly, '#FFE7B0', { scale: ls, align: 'center', outline: '#1B1424' });
    const sub = 'và Mười Hai Ngọn Đèn', ss = fitScale(sub, W - 20, 2);
    drawText(ctx, sub, W / 2, ly + 7 * ls + 12, '#FFD08A', { scale: ss, align: 'center', outline: '#1B1424' });
    const it = this.items();
    const my = ly + 7 * ls + 12 + 7 * ss + 18;
    this.boxes = menu(ctx, it.map(i => i[0]), this.sel, W / 2, my, t);
    if (this.confirmNew) txt(ctx, 'Chọn lần nữa để xóa tiến trình', W / 2, my + it.length * 13 * s + 4, '#FF9A8A', 'center', fitScale('Chọn lần nữa để xóa tiến trình', W - 16));
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
    ctx.fillStyle = 'rgba(10,6,20,.55)'; ctx.fillRect(0, 0, W, H);
    const touch = this.game.input.usingTouch;
    const rows = touch ? [
      ['◀ ▶', 'chạy (trượt ngón cái được)'], ['Nút tròn lớn', 'nhảy, giữ lâu để cao hơn'], ['Nút nhỏ', 'lướt (khi có giày gió)'], ['II', 'tạm dừng'], ['Bản đồ', 'mở trong màn mê cung'],
    ] : [
      ['← →  A D', 'chạy'], ['Z  Space  ↑', 'nhảy, giữ lâu để cao hơn'], ['X  Shift', 'lướt (khi có giày gió)'], ['M', 'bản đồ màn mê cung'], ['Esc  P', 'tạm dừng'],
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
    const tip = 'Mèo bám tường được từ thế giới 2. Mỗi màn giấu 3 ngôi sao.';
    for (const line of wrapText(tip, (pw - 24) / ks)) { drawText(ctx, line, px + 12, y, UIC.dim, { scale: ks, outline: UIC.out }); y += 11 * ks; }
    drawText(ctx, touch ? 'Chạm để quay lại' : 'Nhấn Z để quay lại', W / 2, py + ph - 14, UIC.dim, { align: 'center', outline: UIC.out });
  }
}
