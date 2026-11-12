/* ── Particles ── */
class Particles {
  constructor() { this.a = []; }
  add(x, y, vx, vy, life, col, size = 1, g = 0, front = false) { if (this.a.length < 700) this.a.push({ x, y, vx, vy, life, max: life, col, size, g, front }); }
  dust(x, y, n, col = '#FFFFFF') { for (let i = 0; i < n; i++) this.add(x + (Math.random() - 0.5) * 8, y - Math.random() * 2, (Math.random() - 0.5) * 1.4, -Math.random() * 0.8, 14 + Math.random() * 10, col, Math.random() < 0.4 ? 2 : 1, 0.02); }
  spark(x, y, col) { this.add(x, y, (Math.random() - 0.5) * 0.3, -0.2 - Math.random() * 0.3, 20 + Math.random() * 14, col, 1, 0); }
  burst(x, y, col, n = 10) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 0.8 + Math.random() * 1.8; this.add(x, y, Math.cos(a) * s, Math.sin(a) * s - 0.5, 18 + Math.random() * 14, col, Math.random() < 0.3 ? 2 : 1, 0.06); } }
  ember(x, y) { this.add(x + (Math.random() - 0.5) * 3, y, (Math.random() - 0.5) * 0.4, -0.4 - Math.random() * 0.5, 26 + Math.random() * 20, Math.random() < 0.5 ? '#FFC24A' : '#FF7A2E', 1, -0.004); }
  trail(x, y, col) { this.add(x, y, 0, 0, 12, col, 2, 0); }
  update() {
    const a = this.a;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
      if (p.life <= 0) { a[i] = a[a.length - 1]; a.pop(); }
    }
  }
  draw(ctx, ox, oy, front) {
    for (const p of this.a) {
      if (!!p.front !== front) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = k < 0.3 ? k / 0.3 : 1;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
const LIGHT_TINT = ['#FFF4C8', '#FFC46B', '#8FE6FF', '#D8B8FF'];

/* ── Level ── */
class Level {
  constructor(game, def) {
    this.game = game; this.def = def;
    this.world = new World(def);
    this.theme = THEMES[def.theme];
    this.parts = new Particles();
    this.ents = []; this.enemies = []; this.enemySpawns = []; this.heldKeys = [];
    this.stats = { time: 0, flies: 0, fliesTotal: 0, gotFly: new Set(), stars: [false, false, false], deaths: 0 };
    this.hearts = 3; this.maxHearts = 3;
    this.state = 'run'; this.stateT = 0; this.cardT = 0; this.hitstop = 0; this.shake = 0;
    this.signs = def.signs || []; this.activeSign = null; this.signShown = null; this.signT = 0;
    this.revealed = new Set();
    this.windT = 0; this.windNow = 0;
    this.spawnAll();
    const W = this.world;
    this.player = new Player(this.start.x, this.start.y);
    this.checkpoint = { x: this.start.x, y: this.start.y, snap: W.snapshot(), keys: [] };
    this.safe = { x: this.start.x, y: this.start.y };
    this.cam = { x: 0, y: 0, look: 0 };
    this.snapCamera();
    this.scarf = Array.from({ length: 6 }, () => ({ x: this.player.cx, y: this.player.y + 8 }));
    this.runPhase = 0; this.blinkT = 120;
    this.seen = new Uint8Array(W.w * W.h);
    this.art = { terrain: paintTerrain(W, this.theme), props: paintProps(W, this.theme, def.id * 101), bg: buildBackground(def.theme) };
    this.fakeRegions = this.findFakeRegions();
    this.stars = makeStars(90, def.id * 7);
    this.light = mkCanvas(1, 1);
  }
  get abilities() { return this.game.save.abilities; }
  get wind() { return this.windNow; }
  spawnAll() {
    const W = this.world, th = this.theme;
    let starIdx = 0, signIdx = 0;
    const warps = {};
    for (const { ch, x, y } of W.ents) {
      const px = x * TILE, py = y * TILE;
      switch (ch) {
        case 'P': this.start = { x: px + 3, y: py + TILE - PHYS.H }; break;
        case 'o': this.ents.push(new Firefly(px, py, x + ',' + y)); this.stats.fliesTotal++; break;
        case '*': this.ents.push(new StarItem(px, py, starIdx++)); break;
        case 'h': this.ents.push(new HeartItem(px, py)); break;
        case 'k': this.ents.push(new KeyItem(px, py, 'gold')); break;
        case 'j': this.ents.push(new KeyItem(px, py, 'teal')); break;
        case 'F': this.ents.push(new Checkpoint(px, py)); break;
        case 'G': this.goal = new Goal(px, py); this.ents.push(this.goal); break;
        case 's': this.ents.push(new Spring(px, py)); break;
        case 'd': this.ents.push(new DashCrystal(px, py)); break;
        case 'W': this.ents.push(new AbilityItem(px, py, this.def.ability)); break;
        case '~': this.ents.push(new Sign(px, py, this.signs[signIdx++] || '')); break;
        case 'L': this.ents.push(new Glow(px, py, 'torch', th)); break;
        case 'c': this.ents.push(new Glow(px, py, 'glow', th)); break;
        case 'i': this.ents.push(new Icicle(px, py)); break;
        case 'm': case 'n': {
          let mx = x, my = y;
          if (ch === 'm') { let k = x + 1; while (k < W.w && W.rows[y][k] !== ':') k++; if (k >= W.w) { k = x - 1; while (k >= 0 && W.rows[y][k] !== ':') k--; } mx = k; }
          else { let k = y - 1; while (k >= 0 && W.rows[k][x] !== ':') k--; if (k < 0) { k = y + 1; while (k < W.h && W.rows[k][x] !== ':') k++; } my = k; }
          const p = new Platform(px, py, px, py, mx * TILE, my * TILE, th);
          W.platforms.push(p); this.ents.push(p);
          break;
        }
        case '1': case '2': case '3': case '4': (warps[ch] = warps[ch] || []).push(new Warp(px, py, +ch)); break;
        case 'e': case 'f': case 'q': case 'g': case 'y': case 'r': case 'R': this.enemySpawns.push({ ch, px, py }); break;
      }
    }
    for (const k in warps) { const [a, b] = warps[k]; if (a && b) { a.pair = b; b.pair = a; this.ents.push(a, b); } }
    this.spawnEnemies();
    if (!this.start) this.start = { x: 32, y: 32 };
  }
  spawnEnemies() {
    const wld = this.theme.world;
    this.enemies = this.enemySpawns.map(({ ch, px, py }) => {
      switch (ch) {
        case 'e': return new Walker(px, py, wld);
        case 'g': return new Spiky(px, py, wld);
        case 'f': return new Hopper(px, py);
        case 'q': return new Flyer(px, py);
        case 'y': return new Swooper(px, py);
        case 'r': return new Turret(px, py, -1);
        case 'R': return new Turret(px, py, 1);
      }
    });
  }
  spawn(e) { this.ents.push(e); }
  findFakeRegions() {
    const W = this.world, reg = new Map(); let id = 0;
    for (let i = 0; i < W.tiles.length; i++) {
      if (W.tiles[i] !== T.FAKE || reg.has(i)) continue;
      const st = [i]; id++;
      while (st.length) { const j = st.pop(); if (reg.has(j) || W.tiles[j] !== T.FAKE) continue; reg.set(j, id); const x = j % W.w; st.push(j - W.w, j + W.w); if (x > 0) st.push(j - 1); if (x < W.w - 1) st.push(j + 1); }
    }
    return reg;
  }
  /* ─ events from player / entities ─ */
  fx(name, a, b) {
    const P = this.parts, S = this.game.audio;
    const p = this.player;
    switch (name) {
      case 'jump': P.dust(p.cx, p.bottom, 4); S.sfx('jump'); break;
      case 'walljump': P.dust(p.cx + b * 5, p.cy + 4, 5); S.sfx('walljump'); break;
      case 'land': P.dust(p.cx, p.bottom, Math.min(8, 2 + b | 0)); S.sfx('land'); break;
      case 'dash': P.burst(p.cx, p.cy, '#CFE8FF', 6); S.sfx('dash'); this.shake = Math.max(this.shake, 2); break;
      case 'spring': P.dust(a.cx, a.y, 6); S.sfx('spring'); break;
      case 'crystal': P.burst(a.cx, a.cy, '#9FF0FF', 12); S.sfx('crystal'); break;
      case 'hop': if (this.onScreen(a)) S.sfx('hop'); break;
      case 'swoop': if (this.onScreen(a)) S.sfx('swoop'); break;
      case 'shoot': if (this.onScreen(a)) S.sfx('shoot'); break;
      case 'crack': if (this.onScreen(a)) S.sfx('crack'); break;
      case 'shatter': if (this.onScreen(a)) S.sfx('shatter'); break;
    }
  }
  onScreen(e) { return e.x + e.w > this.cam.x - 16 && e.x < this.cam.x + V.W + 16 && e.y + e.h > this.cam.y - 16 && e.y < this.cam.y + V.H + 16; }
  bump(tx, ty, p) {
    const W = this.world, c = W.code(tx, ty), i = W.idx(tx, ty);
    this.bumpAnim = { i, t: 8 };
    if (c === T.BONUS) {
      W.tiles[i] = T.USED;
      for (let k = 0; k < 3; k++) {
        const id = 'box' + i + ':' + k;
        if (!this.stats.gotFly.has(id)) { this.stats.gotFly.add(id); this.stats.flies++; this.stats.fliesTotal = Math.max(this.stats.fliesTotal, this.stats.flies); }
      }
      this.parts.burst(tx * TILE + 8, ty * TILE - 2, '#FFF3A0', 12);
      this.game.audio.sfx('box'); this.flyCombo(3);
    } else if (c === T.BONUS_HEART) {
      W.tiles[i] = T.USED;
      this.ents.push(new HeartItem(tx * TILE, (ty - 1) * TILE));
      this.game.audio.sfx('box');
    } else if (c === T.BREAK) { this.breakTile(tx, ty); }
    else if (c === T.SWITCH) this.hitSwitch(tx, ty, p);
    else this.game.audio.sfx('bonk');
    // enemies standing on the bumped tile get knocked out
    for (const e of this.enemies) if (!e.dying && e.stompable && Math.abs(e.cx - (tx * TILE + 8)) < 14 && Math.abs(e.y + e.h - ty * TILE) < 3) e.die(this, 'dash');
  }
  breakTile(tx, ty) {
    const W = this.world; W.tiles[W.idx(tx, ty)] = T.EMPTY;
    const a = this.theme.alt;
    for (let k = 0; k < 8; k++) this.parts.add(tx * TILE + 4 + (k % 4) * 3, ty * TILE + 4 + (k >> 2) * 6, (Math.random() - 0.5) * 3, -1.5 - Math.random() * 2, 40, k % 2 ? a.a : a.line, 2, 0.2);
    this.game.audio.sfx('break'); this.shake = Math.max(this.shake, 3);
  }
  breakColumn(tx, p) {
    const W = this.world;
    const y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + p.h - 0.001) / TILE);
    let broke = false;
    for (let ty = y0; ty <= y1; ty++) if (W.code(tx, ty) === T.BREAK) { this.breakTile(tx, ty); broke = true; }
    return broke;
  }
  hitSwitch(tx, ty, p) {
    if (this.world.toggleSwitch(p)) {
      this.game.audio.sfx('switch'); this.shake = Math.max(this.shake, 2);
      this.switchFlash = 14;
      this.parts.burst(tx * TILE + 8, ty * TILE + 8, this.world.sw ? '#9DB4F2' : '#FFE08A', 14);
    }
  }
  flyCombo(n = 1) {
    const now = this.stats.time;
    this.combo = now - (this.comboT || -999) < 70 ? (this.combo || 0) + n : 0;
    this.comboT = now;
  }
  collectFly(f) {
    this.stats.gotFly.add(f.id); this.stats.flies++;
    this.flyCombo();
    this.game.audio.sfx('fly', Math.min(this.combo || 0, 14));
    this.parts.burst(f.cx, f.cy, '#FFF3A0', 5);
  }
  collectStar(s) {
    this.stats.stars[s.idx] = true;
    this.game.audio.sfx('star');
    this.parts.burst(s.cx, s.cy, '#FFE066', 22); this.hitstop = 6;
    this.toast = { text: '★ ' + this.stats.stars.filter(Boolean).length + '/3', t: 90 };
  }
  gainHeart(h) {
    this.hearts = Math.min(this.maxHearts, this.hearts + 1);
    this.game.audio.sfx('heart'); this.parts.burst(h.cx, h.cy, '#FF9AB0', 10);
  }
  pickKey(k) {
    k.held = true; this.heldKeys.push(k);
    this.game.audio.sfx('key'); this.parts.burst(k.cx, k.cy, k.color === 'gold' ? '#FFE08A' : '#9FFFF0', 12);
    this.toast = { text: k.color === 'gold' ? 'Chìa vàng' : 'Chìa ngọc', t: 80 };
  }
  tryDoors() {
    const p = this.player, W = this.world;
    if (!this.heldKeys.length) return;
    const x0 = Math.floor((p.x - 2) / TILE), x1 = Math.floor((p.x + p.w + 2) / TILE);
    const y0 = Math.floor((p.y - 2) / TILE), y1 = Math.floor((p.y + p.h + 2) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = W.code(tx, ty);
      if (c !== T.DOOR_GOLD && c !== T.DOOR_TEAL) continue;
      const color = c === T.DOOR_GOLD ? 'gold' : 'teal';
      const k = this.heldKeys.find(k => k.color === color);
      if (!k) continue;
      k.held = false; k.used = true; this.heldKeys.splice(this.heldKeys.indexOf(k), 1);
      const group = W.doorGroup(tx, ty);
      for (const i of group) {
        W.tiles[i] = T.EMPTY;
        const gx = (i % W.w) * TILE, gy = ((i / W.w) | 0) * TILE;
        this.parts.burst(gx + 8, gy + 8, color === 'gold' ? '#FFD84A' : '#5FF0DC', 8);
      }
      this.game.audio.sfx('door'); this.shake = Math.max(this.shake, 3);
      return;
    }
  }
  activateCheckpoint(c) {
    for (const e of this.ents) if (e instanceof Checkpoint && e !== c && e.lit) e.current = false;
    c.lit = true; c.current = true;
    this.checkpoint = { x: c.x + 1, y: c.y + 32 - PHYS.H, snap: this.world.snapshot(), keys: this.heldKeys.slice(), usedKeys: this.ents.filter(e => e instanceof KeyItem && e.used) };
    this.hearts = this.maxHearts;
    this.game.audio.sfx('checkpoint');
    this.parts.burst(c.cx, c.y + 6, '#FFC46B', 16);
    this.toast = { text: 'Đã thắp đèn lưu', t: 80 };
  }
  gainAbility(kind) {
    this.game.save.abilities[kind] = true; this.game.persist();
    this.game.audio.sfx('ability');
    this.state = 'banner'; this.stateT = 0; this.banner = kind;
    this.parts.burst(this.player.cx, this.player.cy, '#FFFFFF', 24);
  }
  hurtPlayer(dir) {
    const p = this.player;
    if (p.inv > 0 || this.state !== 'run') return;
    this.hearts--;
    this.game.audio.sfx('hurt');
    this.hitstop = 5; this.shake = 5;
    this.stats.hits = (this.stats.hits || 0) + 1;
    if (this.hearts <= 0) { this.die(); return; }
    p.inv = 90; p.hurtLock = 14; p.vx = (dir || -p.face) * 2.4; p.vy = -3.6; p.dashT = 0; p.jumping = false;
    this.parts.burst(p.cx, p.cy, '#FFFFFF', 8);
  }
  hazard() {
    if (this.state !== 'run') return;
    this.hearts--;
    this.game.audio.sfx('hurt');
    this.shake = 5;
    if (this.hearts <= 0) { this.die(); return; }
    this.state = 'hazard'; this.stateT = 0;
  }
  die() {
    this.state = 'dying'; this.stateT = 0; this.stats.deaths++;
    const p = this.player; p.vx = 0; p.vy = -5; p.dashT = 0;
    this.game.audio.sfx('die'); this.game.audio.duck(true);
  }
  respawn() {
    const p = this.player, cp = this.checkpoint, W = this.world;
    W.restore(cp.snap);
    // keys: held-at-checkpoint stay held; everything else returns to where it was found
    for (const e of this.ents) if (e instanceof KeyItem) {
      if (cp.keys.includes(e)) { e.held = true; e.used = false; }
      else if (cp.usedKeys && cp.usedKeys.includes(e)) { e.used = true; e.held = false; }
      else { e.held = false; e.used = false; e.x = e.x0; e.y = e.y0; }
    }
    this.heldKeys = cp.keys.slice();
    this.ents = this.ents.filter(e => !(e instanceof Projectile));
    this.spawnEnemies();
    p.reset(cp.x, cp.y); p.inv = 60;
    this.hearts = this.maxHearts; this.safe = { x: cp.x, y: cp.y };
    this.snapCamera();
    this.state = 'run'; this.stateT = 0; this.game.audio.duck(false);
    this.iris = { t: 0, dir: 1 };
  }
  startWarp(w) {
    this.state = 'warp'; this.stateT = 0; this.warpFrom = w; this.warpTo = w.pair;
    this.game.audio.sfx('warp');
  }
  reachGoal(g) {
    this.state = 'clear'; this.stateT = 0; g.lit = true;
    const p = this.player; p.vx = 0; p.dashT = 0;
    this.game.audio.sfx('lantern'); this.game.audio.music(null);
    this.parts.burst(g.x + 12, g.y + 18, '#FFE08A', 30);
  }
  /* ─ camera ─ */
  snapCamera() {
    const p = this.player;
    this.cam.x = p.cx - V.W / 2; this.cam.y = p.bottom - V.H * 0.62; this.cam.look = 0;
    this.clampCam();
  }
  clampCam() {
    const W = this.world;
    this.cam.x = W.pw <= V.W ? (W.pw - V.W) / 2 : clamp(this.cam.x, 0, W.pw - V.W);
    this.cam.y = W.ph <= V.H ? (W.ph - V.H) / 2 : clamp(this.cam.y, 0, W.ph - V.H);
  }
  updateCamera() {
    const p = this.player, c = this.cam;
    const want = Math.abs(p.vx) > 0.6 ? p.face * 42 : c.look;
    c.look = approach(c.look, want, 1.2);
    const tx = p.cx - V.W / 2 + c.look;
    let ty = c.y;
    if (p.grounded || p.sliding) ty = p.bottom - V.H * 0.62;
    if (p.cy - c.y < V.H * 0.3) ty = p.cy - V.H * 0.3;
    if (p.bottom - c.y > V.H * 0.78) ty = p.bottom - V.H * 0.78;
    c.x = lerp(c.x, tx, 0.14);
    c.y = lerp(c.y, ty, p.vy > 4 ? 0.2 : 0.09);
    // never let the cat leave the middle band horizontally
    c.x = clamp(c.x, p.cx - V.W * 0.72, p.cx - V.W * 0.28);
    this.clampCam();
  }
  /* ─ update ─ */
  update(inp) {
    this.stateT++; this.cardT++;
    if (this.toast && --this.toast.t <= 0) this.toast = null;
    if (this.switchFlash > 0) this.switchFlash--;
    if (this.bumpAnim && --this.bumpAnim.t <= 0) this.bumpAnim = null;
    if (this.iris) { this.iris.t++; if (this.iris.t > 30) this.iris = null; }
    if (this.shake > 0) this.shake *= 0.85; if (this.shake < 0.3) this.shake = 0;
    this.ambient();
    this.parts.update();
    if (this.hitstop > 0) { this.hitstop--; return; }
    const p = this.player, W = this.world;
    switch (this.state) {
      case 'banner':
        if (this.stateT > 40 && (inp.jumpPressed || inp.confirm)) { this.state = 'run'; p.prevJump = true; }
        return;
      case 'hazard':
        if (this.stateT === 16) { p.reset(this.safe.x, this.safe.y); p.inv = 70; this.snapCamera(); }
        if (this.stateT >= 30) this.state = 'run';
        return;
      case 'dying':
        if (this.stateT > 24) { p.vy += 0.3; p.y += p.vy; }
        if (this.stateT === 80) this.iris = { t: 0, dir: -1 };
        if (this.stateT >= 110) this.respawn();
        return;
      case 'warp': {
        const a = this.warpFrom, b = this.warpTo;
        if (this.stateT < 14) { p.x = lerp(p.x, a.cx - p.w / 2, 0.3); p.y = lerp(p.y, a.cy - p.h / 2, 0.3); }
        if (this.stateT === 14) { p.x = b.cx - p.w / 2; p.y = b.y + b.h - p.h - 2; p.vx = 0; p.vy = 0; this.warpBlock = b; this.snapCamera(); this.parts.burst(b.cx, b.cy, b.col, 16); }
        if (this.stateT >= 26) this.state = 'run';
        return;
      }
      case 'clear': {
        const g = this.goal;
        p.vx = 0; p.vy = Math.min(p.vy + 0.5, 6);
        p.moveY(W, p.vy, this); if (p.groundProbe(W)) { p.grounded = true; p.vy = 0; }
        if (this.stateT === 1) this.game.audio.sfx('clear');
        if (this.stateT % 3 === 0) { const a = Math.random() * 6.28; this.parts.add(g.x + 12 + Math.cos(a) * 30, g.y + 18 + Math.sin(a) * 30, -Math.cos(a) * 0.6, -Math.sin(a) * 0.6, 40, '#FFE9A0', 1, 0); }
        this.updateCamera();
        if (this.stateT >= 170) this.game.levelComplete(this);
        return;
      }
    }
    // ── running ──
    this.stats.time++;
    if (this.cardT < 70) { /* title card on screen: still playable */ }
    this.updateWind();
    for (const pl of W.platforms) pl.step();
    p.update(inp, W, this);
    W.stepTiles(i => { const x = (i % W.w) * TILE, y = ((i / W.w) | 0) * TILE; for (let k = 0; k < 4; k++) this.parts.add(x + 2 + k * 3, y + 8, (Math.random() - 0.5), 0.5 + Math.random(), 40, this.theme.alt.a, 3, 0.2); this.game.audio.sfx('crumble'); });
    W.restoreCrumbles(p);
    this.tryDoors();
    this.activeSign = null;
    for (const e of this.ents) e.update(this);
    for (const e of this.enemies) {
      e.update(this);
      if (e.dying || e.dead) continue;
      if (!overlap(p, e)) continue;
      const falling = p.vy > 0 || p.airVy > 0.5;
      if (e.stompable && falling && p.bottom - Math.max(p.vy, 1) <= e.y + e.h * 0.6 + 2) {
        e.die(this, 'stomp');
        p.vy = -(inp.jump ? PHYS.STOMP_HOLD : PHYS.STOMP); p.jumping = true; p.canDashAir = true; p.airVy = 0;
        this.hitstop = 3; this.shake = Math.max(this.shake, 2);
        this.game.audio.sfx('stomp', this.stompChain = (p.grounded ? 0 : (this.stompChain || 0) + 1));
      } else if (p.dashT > 0 && e.dashable) { e.die(this, 'dash'); this.game.audio.sfx('stomp', 2); this.hitstop = 3; }
      else if (e.harms()) this.hurtPlayer(sgn(p.cx - e.cx) || -p.face);
    }
    if (p.grounded) this.stompChain = 0;
    this.enemies = this.enemies.filter(e => !e.dead);
    this.ents = this.ents.filter(e => !e.dead);
    if (this.state !== 'run') return;
    // hazards
    if (W.spikeHit(p.x + 1, p.y + 1, p.w - 2, p.h - 1)) { this.hazard(); return; }
    if (p.y > W.ph + 8) { this.hazard(); return; }
    if (p.isSafeSpot(W)) { this.safe.x = p.x; this.safe.y = p.y; }
    // fake walls reveal when entered
    const cx = Math.floor(p.cx / TILE), cy = Math.floor(p.cy / TILE), ri = this.fakeRegions.get(W.idx(cx, cy));
    if (ri && !this.revealed.has(ri)) { this.revealed.add(ri); this.game.audio.sfx('secret'); }
    // explored map for mazes
    if (this.def.maze && this.stats.time % 6 === 0) {
      for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 10; x <= cx + 10; x++) if (x >= 0 && y >= 0 && x < W.w && y < W.h) this.seen[y * W.w + x] = 1;
    }
    this.updateCamera();
    // run animation phase & scarf
    this.runPhase += Math.abs(p.vx) * 0.55;
    if (--this.blinkT < -6) this.blinkT = 120 + Math.floor(Math.random() * 160);
  }
  updateWind() {
    const wd = this.def.wind;
    if (!wd) { this.windNow = 0; return; }
    this.windT++;
    const ph = this.windT % wd.period;
    const warn = ph > wd.period - 50;
    const on = ph < wd.dur;
    const target = on ? wd.force * wd.dir : 0;
    this.windNow = approach(this.windNow, target, 0.01);
    this.windWarn = warn;
    if ((on || warn) && Math.random() < (on ? 0.9 : 0.25)) {
      const x = wd.dir > 0 ? this.cam.x - 4 : this.cam.x + V.W + 4;
      this.parts.add(x, this.cam.y + Math.random() * V.H, wd.dir * (4 + Math.random() * 3), (Math.random() - 0.5) * 0.3, 90, on ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)', 1, 0, true);
    }
    if (ph === 0) this.game.audio.sfx('wind');
  }
  ambient() {
    const kind = this.theme.particles, c = this.cam, t = this.stats.time;
    const rx = () => c.x + Math.random() * V.W, ry = () => c.y + Math.random() * V.H;
    if (kind === 'petals' && t % 18 === 0) this.parts.add(rx(), c.y - 4, 0.3 + Math.random() * 0.4, 0.35 + Math.random() * 0.3, 400, Math.random() < 0.5 ? '#FFB8C8' : '#FFFFFF', 1, 0, Math.random() < 0.3);
    if (kind === 'dust' && t % 10 === 0) this.parts.add(rx(), ry(), 0.2 + Math.random() * 0.3, -0.05, 160, 'rgba(255,220,170,.55)', 1, 0);
    if (kind === 'snow' && t % 3 === 0) this.parts.add(rx() + 40, c.y - 4, -0.35 - Math.random() * 0.3, 0.45 + Math.random() * 0.4, 520, '#FFFFFF', Math.random() < 0.25 ? 2 : 1, 0, Math.random() < 0.35);
    if (kind === 'spores' && t % 14 === 0) this.parts.add(rx(), ry(), (Math.random() - 0.5) * 0.2, -0.12, 240, '#7FF0E0', 1, 0);
    if (kind === 'motes' && t % 12 === 0) this.parts.add(rx(), ry(), (Math.random() - 0.5) * 0.15, -0.1, 260, Math.random() < 0.5 ? '#8FE6FF' : '#D8B8FF', 1, 0);
  }
  /* ─ render ─ */
  draw(ctx) {
    const W = this.world, th = this.theme, t = this.stats.time + this.stateT;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake * 2 : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake * 2 : 0;
    const ox = Math.round(this.cam.x + sx), oy = Math.round(this.cam.y + sy);
    this.drawBackground(ctx, ox, oy, t);
    blitWorld(ctx, this.art.props, ox, oy);
    blitWorld(ctx, this.art.terrain.canvas, ox, oy);
    this.drawFake(ctx, ox, oy);
    this.drawDynamicTiles(ctx, ox, oy, t);
    for (const e of this.ents) if (!(e instanceof Projectile)) e.draw(ctx, this, ox, oy);
    for (const e of this.enemies) e.draw(ctx, this, ox, oy);
    this.drawPlayer(ctx, ox, oy);
    for (const e of this.ents) if (e instanceof Projectile) e.draw(ctx, this, ox, oy);
    this.parts.draw(ctx, ox, oy, false);
    this.drawLighting(ctx, ox, oy);
    this.parts.draw(ctx, ox, oy, true);
    if (this.state === 'hazard') { const k = this.stateT < 16 ? this.stateT / 16 : 1 - (this.stateT - 16) / 14; ctx.fillStyle = `rgba(10,6,16,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, V.W, V.H); }
    if (this.state === 'warp') { const k = 1 - Math.abs(this.stateT - 14) / 14; ctx.fillStyle = rgba(this.warpFrom.col, clamp(k, 0, 1) * 0.8); ctx.fillRect(0, 0, V.W, V.H); }
    if (this.switchFlash) { ctx.fillStyle = `rgba(255,255,255,${this.switchFlash / 60})`; ctx.fillRect(0, 0, V.W, V.H); }
    const irisK = this.state === 'dying' && this.stateT > 80 ? (this.stateT - 80) / 30 : this.iris && this.iris.dir > 0 ? 1 - this.iris.t / 30 : 0;
    if (irisK > 0) drawIris(ctx, this.player.cx - ox, this.player.cy - oy, 1 - irisK);
  }
  drawBackground(ctx, ox, oy, t) {
    const bg = this.art.bg, th = this.theme, W = this.world;
    for (let x = 0; x < V.W; x += 64) ctx.drawImage(bg.sky, x, 0);
    const lift = Math.max(0, W.ph - V.H - oy);           // how far above the level floor the camera is
    if (th === THEMES.meadow) drawSun(ctx, V.W - 86, 40 + lift * 0.02, '#FFF6D8', t);
    if (th === THEMES.desert) drawSun(ctx, V.W * 0.62, 148 + lift * 0.05, '#FFE2A0', t, true);
    if (th === THEMES.snow) { drawStars(ctx, this.stars, t, lift * 0.02); drawMoon(ctx, V.W - 70, 36 + lift * 0.02); drawAurora(ctx, t, lift * 0.03, 1); }
    for (const L of bg.layers) {
      if (L.tile) {
        const px = ((-ox * L.p) % 256 + 256) % 256 - 256, py = ((-oy * L.p) % 256 + 256) % 256 - 256;
        for (let yy = py; yy < V.H; yy += 256) for (let xx = px; xx < V.W; xx += 256) ctx.drawImage(L.c, xx, yy);
      } else {
        const drift = L.drift ? t * 0.05 * L.drift : 0;
        const px = ((-(ox * L.p + drift)) % 512 + 512) % 512 - 512;
        const y = Math.round(L.y + lift * L.p * 0.6);
        for (let xx = px; xx < V.W; xx += 512) ctx.drawImage(L.c, Math.round(xx), y);
        if (L.fill && y + L.c.height < V.H) { ctx.fillStyle = L.fill; ctx.fillRect(0, y + L.c.height, V.W, V.H - y - L.c.height); }
      }
    }
    if (!th.outdoor) { ctx.fillStyle = rgba(th.sky[0], 0.35); ctx.fillRect(0, 0, V.W, V.H); }
  }
  drawFake(ctx, ox, oy) {
    const fk = this.art.terrain.fake;
    if (!fk) return;
    const W = this.world;
    const x0 = Math.max(0, Math.floor(ox / TILE)), x1 = Math.min(W.w - 1, Math.floor((ox + V.W) / TILE));
    const y0 = Math.max(0, Math.floor(oy / TILE) - 1), y1 = Math.min(W.h - 1, Math.floor((oy + V.H) / TILE));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const r = this.fakeRegions.get(W.idx(tx, ty));
      if (!r) continue;
      ctx.globalAlpha = this.revealed.has(r) ? 0.35 : 1;
      ctx.drawImage(fk, tx * TILE, ty * TILE - 2, TILE, TILE + 2, tx * TILE - ox, ty * TILE - 2 - oy, TILE, TILE + 2);
    }
    ctx.globalAlpha = 1;
  }
  drawDynamicTiles(ctx, ox, oy, t) {
    const W = this.world, th = this.theme;
    const x0 = Math.max(0, Math.floor(ox / TILE)), x1 = Math.min(W.w - 1, Math.floor((ox + V.W) / TILE));
    const y0 = Math.max(0, Math.floor(oy / TILE)), y1 = Math.min(W.h - 1, Math.floor((oy + V.H) / TILE));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * W.w + tx, c = W.tiles[i];
      if (c < T.CRUMBLE || c === T.FAKE || c === T.ALT || c === T.TURRET) continue;
      let x = tx * TILE - ox, y = ty * TILE - oy;
      if (this.bumpAnim && this.bumpAnim.i === i) y -= Math.round(Math.sin((this.bumpAnim.t / 8) * Math.PI) * 4);
      drawTileBlock(ctx, c, x, y, th, W, i, t);
    }
  }
  drawPlayer(ctx, ox, oy) {
    const p = this.player, H = ART.hero;
    if (this.state === 'warp' && this.stateT > 6 && this.stateT < 22) return;
    if (p.inv > 0 && this.state === 'run' && (p.inv >> 2) % 2 === 0) return;
    let f = 'idle0', face = p.face;
    if (this.state === 'dying') f = 'hurt';
    else if (this.state === 'clear' && this.stateT > 30) f = (this.stateT >> 4) % 2 ? 'idle0' : 'jump';
    else if (p.dashT > 0) f = 'dash';
    else if (p.hurtLock > 0) f = 'hurt';
    else if (!p.grounded) { if (p.sliding) { f = 'wall'; face = p.wallDir; } else f = p.vy < -0.6 ? 'jump' : 'fall'; }
    else if (p.landT > 0) f = 'land';
    else if (Math.abs(p.vx) > 0.25) f = 'run' + ((this.runPhase / 5 | 0) % 4);
    else f = this.blinkT < 0 ? 'blink' : (this.stats.time >> 5) % 2 ? 'idle1' : 'idle0';
    const fr = H[f];
    const img = face > 0 ? fr.r : fr.l;
    const sx = Math.round(p.x - (face > 0 ? 4 : 3) - ox), sy = Math.round(p.bottom - 17 - oy);
    // scarf: trails from the back of the neck
    const ax = p.x + (face > 0 ? 2 : 8), ay = p.bottom - 17 + 11 + fr.dy;
    const sc = this.scarf;
    sc[0].x = ax; sc[0].y = ay;
    const t = this.stats.time + this.stateT;
    for (let i = 1; i < sc.length; i++) {
      const a = sc[i - 1];
      const tx = a.x - face * 1.4 - clamp(p.vx, -3, 3) * 0.55, ty = a.y + 0.9 - clamp(p.vy, -5, 5) * 0.3 + Math.sin(t * 0.22 + i * 0.9) * 0.35;
      sc[i].x = lerp(sc[i].x, tx, 0.42); sc[i].y = lerp(sc[i].y, ty, 0.42);
      const dx = sc[i].x - a.x, dy = sc[i].y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > 2.6) { sc[i].x = a.x + dx / d * 2.6; sc[i].y = a.y + dy / d * 2.6; }
    }
    const pts = [];
    for (let i = 1; i < sc.length; i++) {
      const a = sc[i - 1], b = sc[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let k = 0; k < n; k++) pts.push([Math.round(lerp(a.x, b.x, k / n) - ox), Math.round(lerp(a.y, b.y, k / n) - oy), i]);
    }
    ctx.fillStyle = '#2B1A1F';
    for (const [x, y, i] of pts) ctx.fillRect(x - 1, y - 1, i >= sc.length - 1 ? 3 : 4, i >= sc.length - 1 ? 3 : 4);
    for (const [x, y, i] of pts) { ctx.fillStyle = i % 2 ? '#3F82EA' : '#2E62C4'; ctx.fillRect(x, y, i >= sc.length - 1 ? 1 : 2, i >= sc.length - 1 ? 1 : 2); }
    ctx.drawImage(img, sx, sy);
    // the spark on the tail tip
    const tipX = face > 0 ? sx + 2 : sx + 15, tipY = sy + 6 + fr.dy;
    const k = t * 0.4;
    ctx.fillStyle = '#FF7A2E'; ctx.fillRect(tipX - 1, tipY - 1 + (Math.sin(k) > 0.6 ? -1 : 0), 3, 3);
    ctx.fillStyle = '#FFC24A'; ctx.fillRect(tipX, tipY - 1, 1, 2);
    ctx.fillStyle = '#FFF6C8'; ctx.fillRect(tipX, tipY, 1, 1);
    if (t % 9 === 0 && this.state === 'run') this.parts.ember(tipX + ox, tipY + oy - 2);
    this.tailLight = [tipX + ox, tipY + oy];
  }
  drawLighting(ctx, ox, oy) {
    const dark = this.def.dark !== undefined ? this.def.dark : this.theme.dark;
    const lights = [];
    const tl = this.tailLight || [this.player.cx, this.player.cy];
    lights.push([tl[0], tl[1], dark > 0 ? 84 + Math.sin(this.stats.time * 0.2) * 2 : 30, 1]);
    for (const e of this.ents) if (e.light && e.x > ox - 100 && e.x < ox + V.W + 100 && e.y > oy - 100 && e.y < oy + V.H + 100) e.light(this, lights);
    for (const e of this.enemies) if (e.light) e.light(this, lights);
    if (dark > 0) {
      let [lc, lx] = this.light;
      if (lc.width !== V.W || lc.height !== V.H) { this.light = mkCanvas(V.W, V.H); [lc, lx] = this.light; }
      lx.globalCompositeOperation = 'source-over';
      lx.clearRect(0, 0, V.W, V.H);
      lx.fillStyle = rgba(this.theme.sky[0], dark); lx.fillRect(0, 0, V.W, V.H);
      lx.globalCompositeOperation = 'destination-out';
      for (const [x, y, r] of lights) {
        const X = Math.round(x - ox), Y = Math.round(y - oy);
        if (X < -r || X > V.W + r || Y < -r || Y > V.H + r) continue;
        for (const [rr, a] of [[1, 0.35], [0.78, 0.45], [0.55, 0.75]]) { lx.globalAlpha = a; lx.beginPath(); lx.arc(X, Y, r * rr, 0, 6.2832); lx.fill(); }
      }
      lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over';
      ctx.drawImage(lc, 0, 0);
    }
    // warm bloom on light sources (all levels, subtle outdoors)
    ctx.globalCompositeOperation = 'lighter';
    const bloomA = dark > 0 ? 0.16 : 0.08;
    for (const [x, y, r, tint] of lights) {
      if (r < (dark > 0 ? 20 : 50)) continue;
      const X = Math.round(x - ox), Y = Math.round(y - oy);
      if (X < -r || X > V.W + r || Y < -r || Y > V.H + r) continue;
      ctx.fillStyle = rgba(LIGHT_TINT[tint || 0], bloomA);
      ctx.beginPath(); ctx.arc(X, Y, r * 0.42, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, r * 0.22, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
function blitWorld(ctx, img, ox, oy) {
  const sx = Math.max(0, ox), sy = Math.max(0, oy);
  const w = Math.min(img.width - sx, V.W - (sx - ox)), h = Math.min(img.height - sy, V.H - (sy - oy));
  if (w > 0 && h > 0) ctx.drawImage(img, sx, sy, w, h, sx - ox, sy - oy, w, h);
}
function drawIris(ctx, cx, cy, k) {
  const R = Math.hypot(V.W, V.H) * k;
  ctx.fillStyle = '#0B0812';
  ctx.beginPath(); ctx.rect(0, 0, V.W, V.H); ctx.arc(cx, cy, Math.max(0, R), 0, 6.2832, true); ctx.fill();
}
function drawSun(ctx, x, y, col, t, big) {
  const r = big ? 34 : 13;
  for (const [k, a] of [[2.6, 0.08], [1.9, 0.12], [1.4, 0.18]]) { ctx.fillStyle = rgba(col, a + Math.sin(t * 0.02) * 0.015); ctx.beginPath(); ctx.arc(x, y, r * k, 0, 6.2832); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  if (big) { ctx.fillStyle = '#FFF4D0'; ctx.beginPath(); ctx.arc(x - 6, y - 8, r * 0.55, 0, 6.2832); ctx.fill(); }
}
function drawStars(ctx, stars, t, lift) {
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * 0.03 + s.ph);
    ctx.fillStyle = rgba(s.b > 0.7 ? '#FFFFFF' : '#BFD4FF', 0.35 + tw * 0.6);
    ctx.fillRect(Math.round(s.x * V.W), Math.round(s.y * V.H + lift), s.s, s.s);
  }
}
function drawMoon(ctx, x, y) {
  ctx.fillStyle = 'rgba(200,220,255,.10)'; ctx.beginPath(); ctx.arc(x, y, 26, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#EEF3FF'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#D0DAF2'; ctx.fillRect(x - 4, y - 3, 3, 2); ctx.fillRect(x + 3, y + 2, 2, 2); ctx.fillRect(x - 1, y + 5, 2, 1);
}
function drawAurora(ctx, t, lift, strength, fadeX) {
  const cols = ['#3DFFB0', '#3DD6FF', '#9B6BFF'];
  for (let b = 0; b < 3; b++) {
    const base = 34 + b * 16 + lift;
    for (let x = 0; x < V.W; x += 2) {
      const y = base + Math.sin(x * 0.012 + t * 0.006 + b * 1.7) * 14 + Math.sin(x * 0.031 - t * 0.011 + b) * 5;
      const a = (0.5 + 0.5 * Math.sin(x * 0.02 + t * 0.01 + b * 2)) * 0.22 * strength * (fadeX ? fadeX(x) : 1);
      if (a < 0.02) continue;
      for (let k = 0; k < 4; k++) { ctx.fillStyle = rgba(cols[b], a * (1 - k / 4)); ctx.fillRect(x, Math.round(y + k * 6), 2, 6); }
    }
  }
}
const ICON_SUN = ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'];
const ICON_MOON = ['..###.', '.##...', '##....', '##....', '##....', '.##...', '..###.'];
function drawIcon(ctx, rows, x, y, col) { ctx.fillStyle = col; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') ctx.fillRect(x + i, y + j, 1, 1); }); }
/* dynamic tiles: crumble, breakable, boxes, switch, sun/moon blocks, doors */
function drawTileBlock(ctx, c, x, y, th, W, i, t) {
  const a = th.alt, O = '#2B1A1F';
  const bevel = (base, hi, lo) => { ctx.fillStyle = O; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = base; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = hi; ctx.fillRect(x + 1, y + 1, 14, 2); ctx.fillRect(x + 1, y + 1, 2, 14); ctx.fillStyle = lo; ctx.fillRect(x + 1, y + 13, 14, 2); ctx.fillRect(x + 13, y + 1, 2, 14); };
  switch (c) {
    case T.CRUMBLE: {
      const s = W.crumble.get(i);
      if (s && s.state === 1) { if (s.pendingRestore) { ctx.globalAlpha = 0.3; } else return; }
      const jig = s && s.state === 0 ? ((t >> 1) % 2 ? 1 : -1) : 0;
      ctx.save(); ctx.translate(jig, 0);
      bevel(a.a, a.top, a.b);
      ctx.fillStyle = a.line; ctx.fillRect(x + 4, y + 4, 1, 4); ctx.fillRect(x + 5, y + 8, 3, 1); ctx.fillRect(x + 8, y + 9, 1, 4); ctx.fillRect(x + 10, y + 3, 1, 3); ctx.fillRect(x + 11, y + 6, 2, 1);
      ctx.restore(); ctx.globalAlpha = 1; break;
    }
    case T.BREAK:
      bevel(a.b, a.a, a.line);
      ctx.fillStyle = a.line; for (let k = 0; k < 10; k++) { ctx.fillRect(x + 3 + k, y + 3 + k, 1, 1); ctx.fillRect(x + 12 - k, y + 3 + k, 1, 1); }
      break;
    case T.BONUS: case T.BONUS_HEART: {
      bevel('#C8823E', '#F2B866', '#8A4E24');
      const g = 0.5 + 0.5 * Math.sin(t * 0.1);
      ctx.fillStyle = O; ctx.fillRect(x + 5, y + 4, 6, 8);
      ctx.fillStyle = c === T.BONUS ? mix('#FFB347', '#FFF2A0', g) : mix('#F05A7A', '#FFC0D0', g); ctx.fillRect(x + 6, y + 5, 4, 6);
      ctx.fillStyle = O; ctx.fillRect(x + 7, y + 3, 2, 1); ctx.fillRect(x + 7, y + 12, 2, 1);
      break;
    }
    case T.USED: bevel('#7A6458', '#9A8274', '#5A463E'); ctx.fillStyle = '#5A463E'; ctx.fillRect(x + 5, y + 5, 6, 6); break;
    case T.SWITCH: {
      const moon = W.sw === 1;
      bevel(moon ? '#3E5AAE' : '#D89A2E', moon ? '#7E9AE8' : '#FFD26A', moon ? '#27397A' : '#9A6420');
      if (!moon) drawIcon(ctx, ICON_SUN, x + 4, y + 4, '#FFFFFF'); else drawIcon(ctx, ICON_MOON, x + 5, y + 4, '#FFFFFF');
      break;
    }
    case T.SUN: case T.MOON: {
      const on = (c === T.SUN) === (W.sw === 0);
      const cols = c === T.SUN ? ['#F2C14E', '#FFE7A0', '#B8862E'] : ['#5A7BD8', '#A8C0F8', '#34509E'];
      if (on) {
        bevel(cols[0], cols[1], cols[2]);
        if (c === T.SUN) drawIcon(ctx, ICON_SUN, x + 4, y + 4, cols[1]); else drawIcon(ctx, ICON_MOON, x + 5, y + 4, cols[1]);
      } else {
        ctx.fillStyle = rgba(cols[0], 0.12); ctx.fillRect(x + 1, y + 1, 14, 14);
        ctx.fillStyle = rgba(cols[0], 0.8);
        for (let k = 0; k < 16; k += 3) { ctx.fillRect(x + k, y, 2, 1); ctx.fillRect(x + k, y + 15, 2, 1); ctx.fillRect(x, y + k, 1, 2); ctx.fillRect(x + 15, y + k, 1, 2); }
      }
      break;
    }
    case T.DOOR_GOLD: case T.DOOR_TEAL: {
      const g = c === T.DOOR_GOLD, cols = g ? ['#E0A83A', '#FFD978', '#8A5A1A'] : ['#2FB8AA', '#8FF0E4', '#16706A'];
      bevel(cols[0], cols[1], cols[2]);
      ctx.fillStyle = cols[2]; ctx.fillRect(x + 7, y + 1, 2, 14);
      ctx.fillStyle = cols[1]; ctx.fillRect(x + 3, y + 3, 1, 1); ctx.fillRect(x + 12, y + 3, 1, 1); ctx.fillRect(x + 3, y + 12, 1, 1); ctx.fillRect(x + 12, y + 12, 1, 1);
      const up = W.code(i % W.w, ((i / W.w) | 0) - 1) === c, dn = W.code(i % W.w, ((i / W.w) | 0) + 1) === c;
      if (up !== dn || (!up && !dn)) { if (!up) { ctx.fillStyle = O; ctx.fillRect(x + 6, y + 5, 4, 4); ctx.fillRect(x + 7, y + 9, 2, 3); ctx.fillStyle = cols[1]; ctx.fillRect(x + 7, y + 6, 2, 2); } }
      break;
    }
  }
}
