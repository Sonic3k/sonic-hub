/* ── World map: the journey is one day — morning hills, sunset desert, aurora night ── */
const MAP_W = 1320;
const WORLD_NAMES = { 1: 'Đồi Nắng Sớm', 2: 'Hoang Mạc Chiều', 3: 'Đỉnh Cực Quang' };
const MAP_NODE_X = [70, 160, 255, 352, 470, 570, 670, 772, 900, 1000, 1098, 1222];
function mapGround(x) {
  const r1 = 196 + Math.sin(x * 0.018) * 10 + Math.sin(x * 0.047) * 4;
  const r2 = 204 + Math.sin(x * 0.012 + 1) * 8 + Math.sin(x * 0.033) * 3;
  const r3 = 190 + Math.sin(x * 0.02 + 2) * 14 - Math.max(0, 1 - Math.abs(x - 1222) / 90) * 36;
  const k12 = clamp((x - 400) / 80, 0, 1), k23 = clamp((x - 830) / 80, 0, 1);
  return lerp(lerp(r1, r2, k12), r3, k23);
}
function buildMapArt() {
  const H = VIEW_H, b = new PixBuf(MAP_W, H);
  const skies = [['#5AA8E8', '#83C3F0', '#B0DBF4', '#E4F1EE', '#F8EFCF'], THEMES.desert.sky, THEMES.snow.sky];
  const R = skies.map(s => ramp(s, 22));
  const zone = x => (x < 390 ? 0 : x < 470 ? (x - 390) / 80 : x < 820 ? 1 : x < 900 ? 1 + (x - 820) / 80 : 2);
  for (let x = 0; x < MAP_W; x++) {
    const z = zone(x), a = Math.floor(z), f = z - a;
    const col = R[a].map((c, i) => (f > 0 && R[a + 1] ? mix(c, R[a + 1][i], f) : c));
    for (let y = 0; y < H; y++) b.set(x, y, rampPick(col, y / (H - 1), x, y));
  }
  const sr = rng(9);
  for (let i = 0; i < 160; i++) { const x = 860 + sr() * 460, y = sr() * 140; if (sr() < 0.9) b.set(x, y, sr() < 0.3 ? '#FFFFFF' : '#AFC4F0'); }
  // far silhouettes per region
  const dz = (x, y) => { const z = zone(x), a = Math.floor(z), f = z - a; return f > bayer(x, y) ? a + 1 : a; };
  for (let x = 0; x < MAP_W; x++) {
    const z = zone(x);
    const far = 150 - (Math.abs(Math.sin(x * 0.01)) * 30 + Math.abs(Math.sin(x * 0.027 + 1)) * 14) * (z > 1.5 ? 1.6 : z > 0.5 ? 0.6 : 1);
    for (let y = Math.round(far); y < H; y++) b.set(x, y, ['#A6C6DE', '#8A3E70', '#34447A'][dz(x, y)]);
    if (z > 1.5 && far < 128) for (let y = Math.round(far); y < Math.round(far) + 4; y++) b.set(x, y, '#9FB2E0');
  }
  // ground band
  for (let x = 0; x < MAP_W; x++) {
    const g = Math.round(mapGround(x));
    const P = [['#7FCC4E', '#5AAA46', '#3E8A3E'], ['#F6C47C', '#DB8E52', '#B8663E'], ['#F2F6FF', '#AFC2EA', '#6E80B8']];
    for (let y = g; y < H; y++) { const cols = P[dz(x, y)]; b.set(x, y, y < g + 2 ? cols[0] : rampPick(cols.slice(1), (y - g) / 50, x, y)); }
  }
  // landmarks: trees, cave, cacti, temple, pines, tower
  const tr = rng(3);
  for (let i = 0; i < 16; i++) { const x = 20 + tr() * 360; propTree(b, Math.round(x), Math.round(mapGround(x)) + 1, tr, 0.6); }
  for (let i = 0; i < 9; i++) { const x = 480 + tr() * 320; propCactus(b, Math.round(x), Math.round(mapGround(x)) + 1, tr); }
  for (let i = 0; i < 18; i++) { const x = 900 + tr() * 400; if (Math.abs(x - 1222) > 30) propPine(b, Math.round(x), Math.round(mapGround(x)) + 1, tr, ['#1E2A4C', '#16203C', '#DDE8FA']); }
  const cx = MAP_NODE_X[3], cg = Math.round(mapGround(cx));
  fillCircle(b, cx + 16, cg + 4, 18, '#4E9A44'); fillCircle(b, cx + 12, cg - 2, 11, '#62AE50');   // hill with a cave mouth
  for (let y = -9; y <= 0; y++) for (let x = -6; x <= 6; x++) if (y > -4 || x * x + (y + 4) ** 2 < 30) b.set(cx + 20 + x, cg + y, y === -9 ? '#2B1A1F' : '#1B1422');
  const tx = MAP_NODE_X[7], tg = Math.round(mapGround(tx));
  for (let k = 0; k < 22; k++) for (let x = -24 + k; x <= 24 - k; x++) b.set(tx + x, tg - k, k % 4 === 0 ? '#B8663E' : '#D98E52');   // stepped temple
  for (let y = 0; y < 8; y++) for (let x = -3; x <= 3; x++) b.set(tx + x, tg - y, '#3A1A12');
  const px = MAP_NODE_X[11], pg = Math.round(mapGround(px));
  for (let y = 0; y < 70; y++) for (let x = -7; x <= 7; x++) { let c = x < -3 ? '#5C6294' : x > 3 ? '#3C426A' : '#4E5486'; if (y % 8 === 0) c = '#2A2E4C'; b.set(px + x, pg - y, c); }
  for (let x = -10; x <= 10; x++) for (let y = 70; y < 74; y++) b.set(px + x, pg - y, '#2A2E4C');
  return b.toCanvas();
}
class MapScreen {
  constructor(game) { this.game = game; this.t = 0; this.art = null; this.cur = 0; this.tok = { x: 0, y: 0, from: 0, to: 0, k: 1 }; this.camX = 0; this.lightAnim = null; }
  nodePos(i) { const x = MAP_NODE_X[i]; return { x, y: i === 11 ? mapGround(x) - 74 : mapGround(x) - 3 }; }
  enter(select) {
    if (!this.art) this.art = buildMapArt();
    const g = this.game;
    this.cur = clamp(select !== undefined ? select : Math.min(g.save.unlocked, 12) - 1, 0, 11);
    const p = this.nodePos(this.cur); this.tok = { x: p.x, y: p.y, from: this.cur, to: this.cur, k: 1 };
    this.camX = clamp(p.x - V.W / 2, 0, MAP_W - V.W);
    g.audio.music('title');
  }
  move(d) {
    const g = this.game, n = clamp(this.cur + d, 0, Math.min(g.save.unlocked, 12) - 1);
    if (n === this.cur || this.tok.k < 1) return;
    this.tok = { ...this.tok, from: this.cur, to: n, k: 0 }; this.cur = n; g.audio.sfx('map');
  }
  update(inp) {
    this.t++;
    const g = this.game;
    if (this.tok.k < 1) {
      this.tok.k = Math.min(1, this.tok.k + 0.05);
      const a = this.nodePos(this.tok.from), b = this.nodePos(this.tok.to), u = easeInOut(this.tok.k);
      this.tok.x = lerp(a.x, b.x, u); this.tok.y = Math.min(lerp(a.y, b.y, u), mapGround(this.tok.x) - 3);
      if (this.tok.to === 11 && u > 0.5) this.tok.y = lerp(a.y, b.y, u);
    }
    if (this.lightAnim) { this.lightAnim.t++; if (this.lightAnim.t > 90) this.lightAnim = null; }
    this.camX = lerp(this.camX, clamp(this.tok.x - V.W / 2, 0, MAP_W - V.W), 0.12);
    if (inp.leftPressed) this.move(-1);
    if (inp.rightPressed) this.move(1);
    if (inp.confirm && this.tok.k >= 1) { g.audio.sfx('confirm'); g.startLevel(this.cur + 1); return; }
    if (inp.backPressed || inp.pausePressed) { g.audio.sfx('back'); g.go('title'); return; }
    for (const tp of inp.taps) {
      if (this.playBox && tp.x >= this.playBox.x && tp.x <= this.playBox.x + this.playBox.w && tp.y >= this.playBox.y && tp.y <= this.playBox.y + this.playBox.h) { g.audio.sfx('confirm'); g.startLevel(this.cur + 1); return; }
      for (let i = 0; i < Math.min(g.save.unlocked, 12); i++) {
        const p = this.nodePos(i);
        if (Math.abs(tp.x + this.camX - p.x) < 16 && Math.abs(tp.y - p.y + 6) < 18) {
          if (i === this.cur && this.tok.k >= 1) { g.audio.sfx('confirm'); g.startLevel(i + 1); return; }
          this.tok = { ...this.tok, from: this.cur, to: i, k: 0 }; this.cur = i; g.audio.sfx('map');
        }
      }
      if (this.backBox && tp.x <= this.backBox.x + this.backBox.w && tp.y <= this.backBox.y + this.backBox.h) { g.audio.sfx('back'); g.go('title'); return; }
    }
  }
  draw(ctx) {
    const g = this.game, W = V.W, H = V.H, s = UI.s, t = this.t, ox = Math.round(this.camX);
    ctx.drawImage(this.art, ox, 0, W, H, 0, 0, W, H);
    // sunset sun and aurora live in the map sky too
    drawSun(ctx, 640 - ox, 170, '#FFE2A0', t, true);
    ctx.drawImage(this.art, 600 - 60, 150, 200, 106, 600 - 60 - ox, 150, 200, 106);
    if (ox + W > 840) drawAurora(ctx, t, -10, 0.9, x => clamp((x + ox - 860) / 160, 0, 1));
    const S = g.save, un = Math.min(S.unlocked, 12);
    // path
    for (let i = 0; i < 11; i++) {
      const a = this.nodePos(i), b = this.nodePos(i + 1), open = i + 1 < un;
      const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.floor(len / 6);
      for (let k = 1; k < n; k++) {
        const u = k / n, x = lerp(a.x, b.x, u), y = i === 10 ? lerp(a.y, b.y, u) : Math.min(lerp(a.y, b.y, u), mapGround(x) - 3);
        ctx.fillStyle = UIC.out; ctx.fillRect(Math.round(x - ox) - 1, Math.round(y) - 1, 4, 3);
        ctx.fillStyle = open ? '#FFF4DC' : 'rgba(255,244,220,.35)'; ctx.fillRect(Math.round(x - ox), Math.round(y), 2, 1);
      }
    }
    // lantern nodes
    for (let i = 0; i < 12; i++) {
      const p = this.nodePos(i), x = Math.round(p.x - ox), y = Math.round(p.y);
      if (x < -20 || x > W + 20) continue;
      const L = S.levels[i + 1] || {}, done = !!L.done, open = i < un, maze = (i + 1) % 4 === 0;
      const lit = done && !(this.lightAnim && this.lightAnim.i === i && this.lightAnim.t < 30);
      ctx.fillStyle = UIC.out; ctx.fillRect(x - 1, y - 16, 3, 16); ctx.fillRect(x - 5, y - 26, 11, 11);
      if (maze) { ctx.fillStyle = UIC.out; ctx.fillRect(x - 4, y - 2, 9, 3); ctx.fillStyle = '#7FE0D0'; ctx.fillRect(x - 3, y - 1, 7, 1); }
      const body = !open ? '#5A5068' : lit ? mix('#FFB347', '#FFF0B0', 0.5 + 0.5 * Math.sin(t * 0.08 + i)) : '#9A3E44';
      ctx.fillStyle = body; ctx.fillRect(x - 4, y - 25, 9, 9);
      ctx.fillStyle = lit ? '#FFF8D8' : open ? '#C8545A' : '#6E6480'; ctx.fillRect(x - 2, y - 23, 5, 5);
      if (lit) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,190,100,.18)'; ctx.beginPath(); ctx.arc(x, y - 20, 13, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      if (!open) { ctx.fillStyle = '#2B2238'; ctx.fillRect(x - 1, y - 22, 3, 3); }
      if (done) miniStarsTiny(ctx, L.stars || [], x - 6, y + 3);
    }
    if (this.lightAnim) { const p = this.nodePos(this.lightAnim.i); const k = this.lightAnim.t / 90; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,200,110,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x - ox, p.y - 20, 10 + k * 40, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    // cat token
    const moving = this.tok.k < 1, dir = this.tok.to >= this.tok.from ? 1 : -1;
    const fr = ART.hero[moving ? 'run' + ((t >> 2) % 4) : (t >> 5) % 2 ? 'idle1' : 'idle0'];
    ctx.drawImage(dir > 0 ? fr.r : fr.l, Math.round(this.tok.x - ox - (moving ? 9 : 20)), Math.round(this.tok.y - 17));
    if (!moving) { const by = Math.round(this.tok.y - 30 + Math.sin(t * 0.12) * 2); ctx.fillStyle = UIC.out; ctx.fillRect(Math.round(this.tok.x - ox) - 3, by - 1, 7, 5); ctx.fillStyle = UIC.gold; ctx.fillRect(Math.round(this.tok.x - ox) - 2, by, 5, 1); ctx.fillRect(Math.round(this.tok.x - ox) - 1, by + 1, 3, 1); ctx.fillRect(Math.round(this.tok.x - ox), by + 2, 1, 1); }
    // header
    const wld = Math.floor(this.cur / 4) + 1, totalStars = Object.values(S.levels).reduce((a, l) => a + (l.stars || []).filter(Boolean).length, 0);
    const hs = UI.s;
    panel(ctx, 4, 4, textWidth(WORLD_NAMES[wld], hs) + 16 + 14 * hs, 11 * hs + 6);
    this.backBox = { x: 0, y: 0, w: 16 + 12 * hs, h: 14 * hs };
    txt(ctx, '‹', 10, 7 + hs, UIC.dim, 'left', hs);
    txt(ctx, WORLD_NAMES[wld], 12 + 10 * hs, 7 + hs, UIC.ink, 'left', hs);
    const st = '★ ' + totalStars + '/36';
    txt(ctx, st, W - 8, 7 + hs, '#FFD84A', 'right', hs);
    // info panel
    const lv = LEVELS[this.cur], L = S.levels[this.cur + 1] || {};
    const pw = Math.min(W - 12, 300 * (s > 1 ? 1.2 : 1)), ph = 30 * s + 8, px = Math.round((W - pw) / 2), py = H - ph - 6;
    panel(ctx, px, py, pw, ph);
    const ns = fitScale(lv.name, pw - 110 * s, s);
    txt(ctx, String(this.cur + 1), px + 10, py + 6 + s, UIC.gold, 'left', s);
    txt(ctx, lv.name, px + 10 + (this.cur + 1 >= 10 ? 14 : 9) * s, py + 6 + s, UIC.ink, 'left', ns);
    const sub = (lv.maze ? 'Mê cung' : '') + (L.done ? (lv.maze ? '   ' : '') + 'Tốt nhất ' + fmtTime(L.best) : '');
    miniStars(ctx, L.stars || [false, false, false], px + 10, py + 6 + 13 * s, s);
    if (sub) txt(ctx, sub, px + 10 + 32 * s, py + 6 + 13 * s, UIC.dim, 'left', s);
    const bw = 44 * s, bh = 15 * s, bx = px + pw - bw - 8, by = py + (ph - bh) / 2;
    ctx.fillStyle = UIC.out; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = (t >> 4) % 2 ? '#E8A33A' : UIC.gold; ctx.fillRect(bx, by, bw, bh);
    drawText(ctx, 'Chơi', bx + bw / 2, by + (bh - 7 * s) / 2, '#2B1A1F', { scale: s, align: 'center' });
    this.playBox = { x: bx, y: by, w: bw, h: bh };
  }
}
function miniStarsTiny(ctx, stars, x, y) {
  for (let i = 0; i < 3; i++) { ctx.fillStyle = UIC.out; ctx.fillRect(x + i * 5 - 1, y - 1, 5, 5); ctx.fillStyle = stars[i] ? '#FFD84A' : '#5E5470'; ctx.fillRect(x + i * 5, y, 3, 3); }
}
