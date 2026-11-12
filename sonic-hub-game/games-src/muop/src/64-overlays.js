/* ── HUD + in-level overlays ── */
function drawHUD(ctx, L) {
  const s = UI.s, H = ART.items.heart;
  for (let i = 0; i < L.maxHearts; i++) {
    const x = 6 + i * (H.width + 2) * s, y = 6;
    if (i < L.hearts) ctx.drawImage(H, x, y, H.width * s, H.height * s);
    else { ctx.globalAlpha = 0.35; ctx.drawImage(tintCanvas(H, '#1B1424'), x, y, H.width * s, H.height * s); ctx.globalAlpha = 1; }
  }
  let x = 6 + L.maxHearts * (H.width + 2) * s + 6 * s;
  ctx.fillStyle = 'rgba(255,236,120,.3)'; ctx.fillRect(x, 7 + s, 5 * s, 5 * s);
  ctx.fillStyle = '#FFF6B0'; ctx.fillRect(x + s, 8 + s, 3 * s, 3 * s);
  x += 7 * s;
  x += txt(ctx, String(L.stats.flies), x, 7 + s, UIC.ink, 'left', s) + 8 * s;
  miniStars(ctx, L.stats.stars, x, 7 + s, s);
  x += 30 * s;
  for (const k of L.heldKeys) { const img = k.color === 'gold' ? ART.items.keyGold : ART.items.keyTeal; ctx.drawImage(img, x, 8, img.width * s, img.height * s); x += (img.width + 3) * s; }
  if (L.def.maze || L.world.platforms === null) {}
  if (L.toast) { const a = Math.min(1, L.toast.t / 20); ctx.globalAlpha = a; txt(ctx, L.toast.text, V.W / 2, 24 * s, UIC.gold, 'center', s); ctx.globalAlpha = 1; }
  if (L.def.maze && !L.game.input.usingTouch && L.stats.time < 600) txt(ctx, 'M: bản đồ', V.W - 8, 7 + s, UIC.dim, 'right', s);
  if (L.windWarn || L.windNow) { const k = 0.5 + 0.5 * Math.sin(L.windT * 0.3); ctx.globalAlpha = L.windNow ? 0.9 : k; txt(ctx, L.def.wind.dir < 0 ? '« gió' : 'gió »', V.W / 2, V.H - 16 * s, '#DDF4FF', 'center', s); ctx.globalAlpha = 1; }
}
function drawTitleCard(ctx, L) {
  const t = L.cardT;
  if (t > 150) return;
  const a = t < 20 ? t / 20 : t > 120 ? (150 - t) / 30 : 1, s = UI.s;
  ctx.globalAlpha = a;
  const name = L.def.name, ns = fitScale(name, V.W - 40, s + 1);
  txt(ctx, 'Màn ' + L.def.id + (L.def.maze ? '  ·  mê cung' : ''), V.W / 2, V.H * 0.28, UIC.gold, 'center', s);
  txt(ctx, name, V.W / 2, V.H * 0.28 + 12 * s, UIC.ink, 'center', ns);
  ctx.globalAlpha = 1;
}
function drawSign(ctx, L) {
  const sg = L.activeSign;
  if (sg) { L.signShown = sg; L.signT = Math.min(1, L.signT + 0.15); } else L.signT = Math.max(0, L.signT - 0.15);
  if (!L.signShown || L.signT <= 0) return;
  const s = UI.s, maxW = Math.min(V.W - 24, 260 * s) / s;
  const lines = wrapText(L.signShown.text, maxW - 12);
  const w = Math.min(V.W - 16, (Math.max(...lines.map(l => textWidth(l))) + 16) * s), h = (lines.length * 11 + 10) * s;
  const x = Math.round((V.W - w) / 2), y = Math.round(18 * s + 8);
  ctx.globalAlpha = L.signT;
  panel(ctx, x, y, w, h, 'rgba(58,36,24,.94)');
  lines.forEach((ln, i) => txt(ctx, ln, V.W / 2, y + 6 * s + i * 11 * s, '#FFEFD2', 'center', s));
  ctx.globalAlpha = 1;
}
function drawBanner(ctx, L) {
  const s = UI.s, k = Math.min(1, L.stateT / 20);
  ctx.fillStyle = `rgba(10,6,20,${0.55 * k})`; ctx.fillRect(0, 0, V.W, V.H);
  const wall = L.banner === 'wall';
  const title = wall ? 'Móng Vuốt' : 'Giày Gió';
  const body = wall ? 'Nhảy vào tường rồi giữ hướng để bám trượt. Nhấn nhảy để bật khỏi tường.' : (L.game.input.usingTouch ? 'Nhấn nút lướt để phóng ngang, cả trên không. Chạm đất hoặc pha lê để lướt lại.' : 'Nhấn X hoặc Shift để phóng ngang, cả trên không. Chạm đất hoặc pha lê để lướt lại.');
  const pw = Math.min(V.W - 16, 280 * s * 0.8 + 40), lines = wrapText(body, (pw - 24) / s);
  const ph = (lines.length * 11 + 40) * s, px = (V.W - pw) / 2, py = (V.H - ph) / 2;
  ctx.globalAlpha = k;
  panel(ctx, px, py, pw, ph);
  const img = wall ? ART.items.gloves : ART.items.boots;
  ctx.drawImage(img, V.W / 2 - img.width * s / 2, py + 6 * s, img.width * s, img.height * s);
  txt(ctx, title, V.W / 2, py + 20 * s, UIC.gold, 'center', s);
  lines.forEach((ln, i) => txt(ctx, ln, V.W / 2, py + 32 * s + i * 11 * s, UIC.ink, 'center', s));
  ctx.globalAlpha = 1;
}
/* pause menu */
class PauseMenu {
  constructor(game) { this.game = game; this.sel = 0; this.t = 0; }
  items() {
    const g = this.game;
    return [['Tiếp tục', 'resume'], ['Về đèn lưu', 'checkpoint'], ['Chơi lại màn', 'restart'], ['Âm thanh: ' + (g.save.sfx ? 'bật' : 'tắt'), 'sound'], ['Nhạc: ' + (g.save.music ? 'bật' : 'tắt'), 'music'], ['Về bản đồ', 'map']];
  }
  update(inp) {
    this.t++;
    const g = this.game, it = this.items();
    if (inp.upPressed) { this.sel = (this.sel + it.length - 1) % it.length; g.audio.sfx('select'); }
    if (inp.downPressed) { this.sel = (this.sel + 1) % it.length; g.audio.sfx('select'); }
    let a = null;
    if (inp.confirm) a = it[this.sel][1];
    if (inp.pausePressed || inp.backPressed) a = 'resume';
    const b = this.boxes && hit(this.boxes, inp.taps);
    if (b) { this.sel = b.i; a = it[b.i][1]; }
    if (!a) return;
    const L = g.level;
    if (a === 'resume') { g.paused = null; g.audio.sfx('back'); g.audio.duck(false); }
    else if (a === 'checkpoint') { g.paused = null; g.audio.duck(false); L.hearts = 1; L.die(); L.stats.deaths--; }
    else if (a === 'restart') { g.paused = null; g.audio.sfx('confirm'); g.startLevel(L.def.id); }
    else if (a === 'sound') { g.save.sfx = !g.save.sfx; g.applySound(); g.persist(); g.audio.sfx('select'); }
    else if (a === 'music') { g.save.music = !g.save.music; g.applySound(); g.persist(); }
    else if (a === 'map') { g.paused = null; g.audio.duck(false); g.go('map', L.def.id - 1); }
  }
  draw(ctx) {
    const s = UI.s, it = this.items();
    ctx.fillStyle = 'rgba(10,6,20,.6)'; ctx.fillRect(0, 0, V.W, V.H);
    const pw = Math.min(V.W - 20, 170 * s), ph = (it.length * 13 + 30) * s, px = (V.W - pw) / 2, py = Math.max(4, (V.H - ph) / 2);
    panel(ctx, px, py, pw, ph);
    const L = this.game.level;
    txt(ctx, L.def.name, V.W / 2, py + 7 * s, UIC.gold, 'center', fitScale(L.def.name, pw - 16, s));
    txt(ctx, fmtTime(L.stats.time) + '   đom đóm ' + L.stats.flies + '/' + L.stats.fliesTotal, V.W / 2, py + 18 * s, UIC.dim, 'center', fitScale('0:00   đom đóm 00/00', pw - 12, s));
    this.boxes = menu(ctx, it.map(i => i[0]), this.sel, V.W / 2, py + 32 * s, this.t);
  }
}
/* maze automap: only what the cat has seen */
function drawAutomap(ctx, L, t) {
  const W = L.world, s = UI.s;
  ctx.fillStyle = 'rgba(8,6,16,.86)'; ctx.fillRect(0, 0, V.W, V.H);
  const k = Math.max(1, Math.floor(Math.min((V.W - 20) / W.w, (V.H - 36) / W.h)));
  const mw = W.w * k, mh = W.h * k, mx = Math.round((V.W - mw) / 2), my = Math.round((V.H - mh) / 2) + 6;
  for (let ty = 0; ty < W.h; ty++) for (let tx = 0; tx < W.w; tx++) {
    const i = ty * W.w + tx;
    if (!L.seen[i]) continue;
    const c = W.tiles[i];
    let col = null;
    if (isGroundCode(c) && !(c === T.FAKE && !L.revealed.has(L.fakeRegions.get(i)))) col = '#6E6488';
    else if (c === T.FAKE) col = '#6E6488';
    if (c === T.EMPTY || c === T.ONEWAY || (c >= T.SPIKE_U && c <= T.SPIKE_R)) col = c === T.ONEWAY ? '#9A8E74' : c >= T.SPIKE_U && c <= T.SPIKE_R ? '#C86070' : '#241C34';
    if (c === T.DOOR_GOLD) col = '#FFC93A'; if (c === T.DOOR_TEAL) col = '#3FD6C8';
    if (c === T.SUN) col = W.sw === 0 ? '#F2C14E' : '#6A5A30'; if (c === T.MOON) col = W.sw === 1 ? '#6A8AE8' : '#2E3A60';
    if (c === T.SWITCH) col = '#FFFFFF';
    if (c === T.CRUMBLE || c === T.BREAK || c === T.BONUS || c === T.USED || c === T.TURRET || c === T.ALT) col = '#8A7E9E';
    if (col) { ctx.fillStyle = col; ctx.fillRect(mx + tx * k, my + ty * k, k, k); }
  }
  const dot = (x, y, col, big) => { const X = mx + Math.floor(x / TILE) * k, Y = my + Math.floor(y / TILE) * k, r = big ? Math.max(2, k) : Math.max(1, k - 1); ctx.fillStyle = UIC.out; ctx.fillRect(X - 1, Y - 1, r + 2, r + 2); ctx.fillStyle = col; ctx.fillRect(X, Y, r, r); };
  for (const e of L.ents) {
    const tx = Math.floor(e.cx / TILE), ty = Math.floor(e.cy / TILE);
    if (!L.seen[ty * W.w + tx]) continue;
    if (e instanceof KeyItem && !e.used && !e.held) dot(e.cx, e.cy, e.color === 'gold' ? '#FFD84A' : '#5FF0DC', true);
    else if (e instanceof Goal) dot(e.x + 12, e.y + 20, '#FF9A4A', true);
    else if (e instanceof Warp) dot(e.cx, e.cy, e.col, false);
    else if (e instanceof StarItem) dot(e.cx, e.cy, '#FFF3B0', false);
    else if (e instanceof Checkpoint) dot(e.cx, e.y + 20, e.lit ? '#FFC46B' : '#9A6A5A', false);
  }
  if ((t >> 3) % 2) dot(L.player.cx, L.player.cy, '#FFFFFF', true);
  txt(ctx, 'Bản đồ ' + L.def.name, V.W / 2, 6, UIC.gold, 'center', fitScale('Bản đồ ' + L.def.name, V.W - 10, s));
  txt(ctx, L.game.input.usingTouch ? 'Chạm để đóng' : 'M để đóng', V.W / 2, V.H - 10 - 7 * (s - 1), UIC.dim, 'center', 1);
}
/* ── Level clear tally ── */
class ClearScreen {
  constructor(game) { this.game = game; this.t = 0; }
  enter(L, firstTime, newStars) { this.L = L; this.t = 0; this.first = firstTime; this.newStars = newStars; }
  update(inp) {
    this.t++;
    if (this.t > 50 && (inp.confirm || inp.taps.length)) { this.game.audio.sfx('confirm'); this.game.afterClear(this.L); }
  }
  draw(ctx) {
    const L = this.L, s = UI.s, t = this.t;
    L.draw(ctx);
    ctx.fillStyle = `rgba(10,6,20,${Math.min(0.62, t / 40)})`; ctx.fillRect(0, 0, V.W, V.H);
    const pw = Math.min(V.W - 20, 190 * s), ph = 96 * s, px = (V.W - pw) / 2, py = Math.max(4, (V.H - ph) / 2);
    const k = easeOut(Math.min(1, t / 24));
    ctx.save(); ctx.translate(0, (1 - k) * 20); ctx.globalAlpha = k;
    panel(ctx, px, py, pw, ph);
    txt(ctx, 'Đèn đã thắp', V.W / 2, py + 7 * s, UIC.gold, 'center', fitScale('Đèn đã thắp', pw - 16, s + (s === 1 ? 1 : 0)));
    txt(ctx, L.def.name, V.W / 2, py + 22 * s, UIC.dim, 'center', fitScale(L.def.name, pw - 16, s));
    const rows = [['Thời gian', fmtTime(L.stats.time)], ['Đom đóm', L.stats.flies + '/' + L.stats.fliesTotal], ['Lần ngã', String(L.stats.deaths)]];
    rows.forEach(([a, b], i) => { if (t < 30 + i * 12) return; txt(ctx, a, px + 12, py + (36 + i * 12) * s, UIC.ink, 'left', s); txt(ctx, b, px + pw - 12, py + (36 + i * 12) * s, UIC.ink, 'right', s); });
    if (t > 66) { txt(ctx, 'Sao', px + 12, py + 72 * s, UIC.ink, 'left', s); miniStars(ctx, L.stats.stars, px + pw - 12 - 25 * s, py + 72 * s, s); }
    if (t > 50 && (t >> 4) % 2) txt(ctx, this.game.input.usingTouch ? 'Chạm để tiếp tục' : 'Z để tiếp tục', V.W / 2, py + ph + 6, UIC.dim, 'center', 1);
    ctx.restore();
  }
}
/* ── Ending: every lantern on the map lights, one by one ── */
class EndingScreen {
  constructor(game) { this.game = game; this.t = 0; }
  enter() { this.t = 0; this.map = this.game.screens.map; if (!this.map.art) this.map.art = buildMapArt(); this.game.audio.music('title'); }
  update(inp) {
    this.t++;
    if (this.t % 26 === 0 && this.t / 26 <= 12) this.game.audio.sfx('fly', this.t / 26);
    if (this.t > 420 && (inp.confirm || inp.taps.length)) { this.game.audio.sfx('confirm'); this.game.go('map', 11); }
  }
  draw(ctx) {
    const s = UI.s, t = this.t, M = this.map, W = V.W, H = V.H;
    const pan = clamp((t - 30) / 330, 0, 1), ox = Math.round(easeInOut(pan) * (MAP_W - W));
    ctx.drawImage(M.art, ox, 0, W, H, 0, 0, W, H);
    drawAurora(ctx, t, -6, 1.3);
    for (let i = 0; i < 12; i++) {
      const p = M.nodePos(i), x = Math.round(p.x - ox), y = Math.round(p.y);
      const on = t > 26 * (i + 1);
      ctx.fillStyle = UIC.out; ctx.fillRect(x - 1, y - 16, 3, 16); ctx.fillRect(x - 5, y - 26, 11, 11);
      ctx.fillStyle = on ? mix('#FFB347', '#FFF0B0', 0.5 + 0.5 * Math.sin(t * 0.08 + i)) : '#9A3E44'; ctx.fillRect(x - 4, y - 25, 9, 9);
      if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,190,100,.22)'; ctx.beginPath(); ctx.arc(x, y - 20, 16, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    }
    const S = this.game.save, stars = Object.values(S.levels).reduce((a, l) => a + (l.stars || []).filter(Boolean).length, 0);
    const time = Object.values(S.levels).reduce((a, l) => a + (l.best || 0), 0);
    if (t > 330) {
      const a = Math.min(1, (t - 330) / 40);
      ctx.fillStyle = `rgba(8,6,20,${0.5 * a})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      const l1 = 'Mười hai ngọn đèn đã sáng.';
      txt(ctx, l1, W / 2, H * 0.3, UIC.gold, 'center', fitScale(l1, W - 20, s + 1));
      txt(ctx, 'Cảm ơn bạn đã chơi cùng Mướp.', W / 2, H * 0.3 + 22 * s, UIC.ink, 'center', fitScale('Cảm ơn bạn đã chơi cùng Mướp.', W - 20, s));
      txt(ctx, '★ ' + stars + '/36     tổng thời gian ' + fmtTime(time), W / 2, H * 0.3 + 38 * s, UIC.dim, 'center', fitScale('★ 36/36     tổng thời gian 00:00', W - 20, s));
      if (stars < 36) txt(ctx, 'Còn ' + (36 - stars) + ' ngôi sao đang trốn đâu đó.', W / 2, H * 0.3 + 52 * s, UIC.dim, 'center', fitScale('Còn 36 ngôi sao đang trốn đâu đó.', W - 20, s));
      ctx.globalAlpha = 1;
    }
  }
}
