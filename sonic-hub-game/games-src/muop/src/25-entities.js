/* ── Entities ── each: {x,y,w,h,dead} + update(L) + draw(ctx, L, ox, oy); lights via light(L, out) */
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
class Ent {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.dead = false; this.t = 0; this.x0 = x; this.y0 = y; }
  get cx() { return this.x + this.w / 2; } get cy() { return this.y + this.h / 2; }
  update() { this.t++; } draw() {} light() {}
}
/* ─ Collectibles ─ */
class Firefly extends Ent {
  constructor(x, y, id) { super(x + 4, y + 4, 8, 8); this.id = id; this.ph = (x * 7 + y * 3) % 60; }
  update(L) {
    this.t++;
    if (L.stats.gotFly.has(this.id)) { this.dead = true; return; }
    if (overlap(this, L.player)) { L.collectFly(this); this.dead = true; }
  }
  draw(ctx, L, ox, oy) {
    const k = this.t + this.ph, bx = Math.round(this.x + 4 + Math.sin(k * 0.05) * 2 - ox), by = Math.round(this.y + 4 + Math.sin(k * 0.08) * 2 - oy);
    const pulse = 0.55 + 0.45 * Math.sin(k * 0.12);
    ctx.fillStyle = `rgba(255,236,120,${0.18 * pulse + 0.08})`; ctx.fillRect(bx - 3, by - 2, 7, 5); ctx.fillRect(bx - 2, by - 3, 5, 7);
    ctx.fillStyle = '#FFF6B0'; ctx.fillRect(bx - 1, by - 1, 2, 2);
    ctx.fillStyle = '#D8FF6A'; ctx.fillRect(bx, by, 1, 1);
    ctx.fillStyle = '#3A2A1E'; ctx.fillRect(bx - 2, by - 2, 1, 1);
    if ((k >> 3) % 2) { ctx.fillStyle = 'rgba(230,245,255,.8)'; ctx.fillRect(bx - 2, by - 3, 1, 1); ctx.fillRect(bx + 1, by - 3, 1, 1); }
  }
  light(L, out) { out.push([this.cx, this.cy, 18, 0]); }
}
class StarItem extends Ent {
  constructor(x, y, idx) { super(x + 2, y + 2, 12, 12); this.idx = idx; }
  update(L) {
    this.t++;
    if (L.stats.stars[this.idx]) { this.dead = true; return; }
    if (overlap(this, L.player)) { L.collectStar(this); this.dead = true; }
    if (this.t % 9 === 0) L.parts.spark(this.cx + (Math.random() - 0.5) * 14, this.cy + (Math.random() - 0.5) * 14, '#FFF3B0');
  }
  draw(ctx, L, ox, oy) {
    const f = ART.items.starSpin[(this.t >> 3) % 4];
    ctx.drawImage(f, Math.round(this.x - 0.5 - ox), Math.round(this.y - 1 + Math.sin(this.t * 0.06) * 2 - oy));
  }
  light(L, out) { out.push([this.cx, this.cy, 30, 1]); }
}
class HeartItem extends Ent {
  constructor(x, y) { super(x + 3, y + 4, 10, 9); }
  update(L) { this.t++; if (overlap(this, L.player)) { L.gainHeart(this); this.dead = true; } }
  draw(ctx, L, ox, oy) { ctx.drawImage(ART.items.heart, Math.round(this.x - ox), Math.round(this.y + Math.sin(this.t * 0.07) * 1.5 - oy)); }
  light(L, out) { out.push([this.cx, this.cy, 16, 0]); }
}
class KeyItem extends Ent {
  constructor(x, y, color) { super(x + 2, y + 5, 12, 7); this.color = color; this.held = false; this.used = false; this.fx = x; this.fy = y; }
  update(L) {
    this.t++;
    const p = L.player;
    if (!this.held && !this.used) { if (overlap(this, p)) L.pickKey(this); }
    else if (this.held) {
      // follow the cat like a little kite
      const n = L.heldKeys.indexOf(this);
      const tx = p.cx - p.face * (14 + n * 10) - this.w / 2, ty = p.y - 10 - n * 3 + Math.sin(this.t * 0.1) * 2;
      this.x = lerp(this.x, tx, 0.18); this.y = lerp(this.y, ty, 0.18);
    }
  }
  draw(ctx, L, ox, oy) {
    if (this.used) return;
    const s = this.color === 'gold' ? ART.items.keyGold : ART.items.keyTeal;
    ctx.drawImage(s, Math.round(this.x - ox), Math.round(this.y + (this.held ? 0 : Math.sin(this.t * 0.07) * 2) - oy));
  }
  light(L, out) { if (!this.used) out.push([this.cx, this.cy, 20, this.color === 'gold' ? 1 : 2]); }
}
/* ─ Checkpoint lantern & goal lantern ─ */
class Checkpoint extends Ent {
  constructor(x, y) { super(x + 2, y - 16, 12, 32); this.lit = false; }
  update(L) {
    this.t++;
    if (!this.lit && overlap(this, L.player)) L.activateCheckpoint(this);
    if (this.lit && this.t % 14 === 0) L.parts.ember(this.cx, this.y + 6);
  }
  draw(ctx, L, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    ctx.fillStyle = '#3A2A24'; ctx.fillRect(x + 5, y + 10, 3, 22);
    ctx.fillStyle = '#5A4236'; ctx.fillRect(x + 5, y + 10, 1, 22);
    ctx.fillStyle = '#3A2A24'; ctx.fillRect(x + 2, y + 30, 9, 2);
    ctx.fillRect(x + 3, y + 2, 7, 1);
    const glow = this.lit ? 0.75 + 0.25 * Math.sin(this.t * 0.2) : 0;
    ctx.fillStyle = this.lit ? mix('#FFB347', '#FFE9A0', glow) : '#4A3A44';
    ctx.fillRect(x + 3, y + 3, 7, 7);
    ctx.fillStyle = this.lit ? '#FFF6D0' : '#5E4C58'; ctx.fillRect(x + 5, y + 5, 3, 3);
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x + 2, y + 3, 1, 7); ctx.fillRect(x + 10, y + 3, 1, 7); ctx.fillRect(x + 3, y + 10, 7, 1); ctx.fillRect(x + 5, y, 3, 2);
    if (this.lit) { ctx.fillStyle = 'rgba(255,200,110,.22)'; ctx.fillRect(x - 3, y - 2, 19, 17); }
  }
  light(L, out) { out.push([this.cx, this.y + 6, this.lit ? 56 : 14, 1]); }
}
class Goal extends Ent {
  constructor(x, y) { super(x, y - 40, 16, 56); this.lit = false; this.litT = 0; }
  update(L) {
    this.t++;
    if (this.lit) { this.litT++; if (this.t % 5 === 0) L.parts.ember(this.x + 8 + (Math.random() - 0.5) * 10, this.y + 12); }
    else if (overlap(this, L.player) && L.state === 'run') L.reachGoal(this);
  }
  draw(ctx, L, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    // pole and arm
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x + 1, y + 8, 5, 48);
    ctx.fillStyle = '#6A4A3A'; ctx.fillRect(x + 2, y + 8, 3, 48);
    ctx.fillStyle = '#8A6450'; ctx.fillRect(x + 2, y + 8, 1, 48);
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x - 2, y + 52, 11, 4); ctx.fillRect(x + 3, y + 6, 12, 3);
    // lantern body
    const k = this.lit ? Math.min(1, this.litT / 30) : 0;
    const flick = this.lit ? 0.85 + 0.15 * Math.sin(this.t * 0.3) * Math.sin(this.t * 0.13) : 0;
    const body = this.lit ? mix('#E8603C', '#FFC76A', k * flick) : '#7A2E36';
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x + 6, y + 9, 13, 20);
    ctx.fillStyle = body; ctx.fillRect(x + 7, y + 11, 11, 16);
    ctx.fillStyle = this.lit ? mix(body, '#FFF4C8', 0.6 * k) : '#9A3E44'; ctx.fillRect(x + 9, y + 12, 7, 14);
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x + 6, y + 15, 13, 1); ctx.fillRect(x + 6, y + 22, 13, 1);
    ctx.fillStyle = '#F2C14E'; ctx.fillRect(x + 8, y + 9, 9, 2); ctx.fillRect(x + 8, y + 27, 9, 2);
    ctx.fillStyle = '#C8402E'; ctx.fillRect(x + 11, y + 29, 3, 5);   // tassel
    if (this.lit) {
      ctx.fillStyle = `rgba(255,190,90,${0.18 * k})`; ctx.fillRect(x - 6, y + 2, 37, 34);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 12, y + 17, 1, 3);
    }
  }
  light(L, out) { out.push([this.x + 12, this.y + 19, this.lit ? 90 : 26, 1]); }
}
/* ─ Mechanisms ─ */
class Spring extends Ent {
  constructor(x, y) { super(x + 1, y + 8, 14, 8); this.pressT = 0; }
  update(L) {
    this.t++; if (this.pressT > 0) this.pressT--;
    const p = L.player;
    if (p.vy >= 0 && overlap(p, { x: this.x, y: this.y - 2, w: this.w, h: 6 }) && p.bottom - p.vy <= this.y + 4) {
      p.y = this.y - p.h; p.vy = -PHYS.SPRING; p.springBoost = true; p.jumping = false; p.grounded = false; p.canDashAir = true; p.coyote = 0;
      this.pressT = 10; L.fx('spring', this);
    }
  }
  draw(ctx, L, ox, oy) {
    const s = this.pressT > 5 ? ART.items.spring1 : ART.items.spring0;
    ctx.drawImage(s, Math.round(this.x - 1 - ox), Math.round(this.y + 8 - s.height - oy));
  }
}
class DashCrystal extends Ent {
  constructor(x, y) { super(x + 2, y + 2, 12, 12); this.cool = 0; }
  update(L) {
    this.t++;
    if (this.cool > 0) { this.cool--; if (this.cool === 0) L.parts.burst(this.cx, this.cy, '#BFF4FF', 6); return; }
    const p = L.player;
    if (overlap(this, p) && !p.canDashAir && !p.grounded) { p.canDashAir = true; this.cool = 150; L.fx('crystal', this); }
  }
  draw(ctx, L, ox, oy) {
    const s = this.cool > 0 ? ART.items.crystalDim : ART.items.crystal;
    ctx.drawImage(s, Math.round(this.x + 1 - ox), Math.round(this.y + Math.sin(this.t * 0.08) * 2 - oy));
  }
  light(L, out) { if (this.cool <= 0) out.push([this.cx, this.cy, 26, 2]); }
}
class AbilityItem extends Ent {
  constructor(x, y, kind) { super(x + 1, y + 1, 14, 14); this.kind = kind; }
  update(L) {
    this.t++;
    if (L.game.save.abilities[this.kind]) { this.dead = true; return; }
    if (this.t % 6 === 0) L.parts.spark(this.cx + (Math.random() - 0.5) * 18, this.cy + (Math.random() - 0.5) * 18, '#FFFFFF');
    if (overlap(this, L.player)) { L.gainAbility(this.kind); this.dead = true; }
  }
  draw(ctx, L, ox, oy) {
    const s = this.kind === 'wall' ? ART.items.gloves : ART.items.boots;
    const y = Math.round(this.y + Math.sin(this.t * 0.06) * 3 - oy), x = Math.round(this.x - ox);
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x - 3, y - 2, s.width + 6, s.height + 4);
    ctx.drawImage(s, x, y);
  }
  light(L, out) { out.push([this.cx, this.cy, 40, 0]); }
}
const WARP_COL = { 1: '#B98CFF', 2: '#6CF0A0', 3: '#FFB060', 4: '#6CD8FF' };
class Warp extends Ent {
  constructor(x, y, n) { super(x + 2, y - 8, 12, 24); this.n = n; this.col = WARP_COL[n] || '#FFFFFF'; }
  update(L) {
    this.t++;
    const p = L.player;
    const inside = Math.abs(p.cx - this.cx) < 6 && Math.abs(p.cy - this.cy) < 10;
    if (!inside && L.warpBlock === this) L.warpBlock = null;
    if (inside && L.warpBlock !== this && L.state === 'run') L.startWarp(this);
    if (this.t % 7 === 0) L.parts.spark(this.cx + Math.cos(this.t * 0.2) * 7, this.cy + Math.sin(this.t * 0.2) * 11, this.col);
  }
  draw(ctx, L, ox, oy) {
    const cx = Math.round(this.cx - ox), cy = Math.round(this.cy - oy);
    ctx.fillStyle = rgba(this.col, 0.18); ctx.beginPath(); ctx.ellipse(cx, cy, 9, 13, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + this.t * 0.06;
      ctx.fillStyle = i % 2 ? this.col : '#FFFFFF';
      ctx.fillRect(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 12), 1, 2);
    }
    ctx.fillStyle = rgba(this.col, 0.5); ctx.fillRect(cx - 1, cy - 5 + ((this.t >> 2) % 10), 2, 2);
  }
  light(L, out) { out.push([this.cx, this.cy, 30, 3]); }
}
class Sign extends Ent {
  constructor(x, y, text) { super(x, y + 5, 16, 11); this.text = text; this.near = 0; }
  update(L) {
    this.t++;
    const p = L.player, close = Math.abs(p.cx - this.cx) < 18 && Math.abs(p.cy - this.cy) < 20;
    this.near = approach(this.near, close ? 1 : 0, 0.12);
    if (close) L.activeSign = this;
  }
  draw(ctx, L, ox, oy) { ctx.drawImage(ART.items.sign, Math.round(this.x - ox), Math.round(this.y - oy)); }
}
class Platform extends Ent {
  constructor(x, y, ax, ay, bx, by, theme) {
    super(x, y, 48, 8); this.ax = ax; this.ay = ay; this.bx = bx; this.by = by; this.theme = theme;
    const dist = Math.hypot(bx - ax, by - ay); this.period = Math.max(120, dist / 0.75 * 2); this.prevY = y; this.dx = 0; this.dy = 0;
    this.phase = 0;
  }
  step() {
    this.t++;
    const u = 0.5 - 0.5 * Math.cos((this.t / this.period) * Math.PI * 2);
    const nx = lerp(this.ax, this.bx, u), ny = lerp(this.ay, this.by, u);
    this.dx = nx - this.x; this.dy = ny - this.y; this.prevY = this.y; this.x = nx; this.y = ny;
  }
  update() {}
  draw(ctx, L, ox, oy) {
    const o = this.theme.oneway, x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x, y, 48, 8);
    ctx.fillStyle = o.mid; ctx.fillRect(x + 1, y + 1, 46, 5);
    ctx.fillStyle = o.top; ctx.fillRect(x + 1, y + 1, 46, 1);
    ctx.fillStyle = o.dark; ctx.fillRect(x + 1, y + 6, 46, 1);
    for (const k of [6, 23, 40]) { ctx.fillStyle = '#C8D0DC'; ctx.fillRect(x + k, y + 3, 2, 2); }
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x + 22, y + 8, 4, 2);
  }
}
/* ─ Enemies ─ */
class Enemy extends Ent {
  constructor(x, y, w, h, kind, opts) {
    super(x, y, w, h); this.kind = kind; this.vx = 0; this.vy = 0; this.dir = -1;
    this.stompable = opts.stomp; this.dashable = opts.dash; this.squash = 0; this.hp = 1; this.grav = opts.grav !== false;
  }
  die(L, how) {
    this.dying = how; this.squash = 24; this.stompable = false; this.dashable = false;
    L.parts.burst(this.cx, this.cy, '#FFFFFF', 8);
  }
  harms() { return !this.dying; }
  groundAhead(L, dir) {
    const w = L.world, tx = Math.floor((dir > 0 ? this.x + this.w + 1 : this.x - 1) / TILE), ty = Math.floor((this.y + this.h + 2) / TILE);
    return w.isSolid(tx, ty) || w.isOneWay(tx, ty);
  }
  wallAhead(L, dir) {
    const w = L.world, tx = Math.floor((dir > 0 ? this.x + this.w + 1 : this.x - 1) / TILE), ty = Math.floor((this.y + this.h / 2) / TILE);
    return w.isSolid(tx, ty) || w.spikeHit(dir > 0 ? this.x + this.w : this.x - 2, this.y, 2, this.h);
  }
  physics(L) {
    const w = L.world;
    this.vy = Math.min(this.vy + 0.35, 5);
    this.x += this.vx;
    const tx = Math.floor((this.vx > 0 ? this.x + this.w : this.x) / TILE);
    const ty0 = Math.floor(this.y / TILE), ty1 = Math.floor((this.y + this.h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (w.isSolid(tx, ty)) { this.x = this.vx > 0 ? tx * TILE - this.w : (tx + 1) * TILE; this.dir *= -1; this.vx = 0; break; }
    const pb = this.y + this.h;
    this.y += this.vy;
    this.onGround = false;
    const ty = Math.floor((this.y + this.h - 0.01) / TILE);
    const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.01) / TILE);
    if (this.vy > 0) for (let x = x0; x <= x1; x++) if (w.isSolid(x, ty) || (w.isOneWay(x, ty) && pb <= ty * TILE + 0.5)) { this.y = ty * TILE - this.h; this.vy = 0; this.onGround = true; break; }
    if (this.vy < 0) { const tyu = Math.floor(this.y / TILE); for (let x = x0; x <= x1; x++) if (w.isSolid(x, tyu)) { this.y = (tyu + 1) * TILE; this.vy = 0; break; } }
    if (this.y > w.ph + 40) this.dead = true;
  }
  update(L) {
    this.t++;
    if (this.dying) { this.squash--; if (this.dying === 'dash') { this.y -= 1.5; this.x += this.dir * 0.5; } if (this.squash <= 0) this.dead = true; return; }
    this.think(L);
  }
  sprite(L) { const fr = ART.enemies[L.theme.world][this.kind]; return fr[(this.t >> 3) % fr.length]; }
  draw(ctx, L, ox, oy) {
    const s = this.sprite(L), img = this.dir > 0 ? s.r : s.l;
    let x = Math.round(this.x + this.w / 2 - img.width / 2 - ox), y = Math.round(this.y + this.h - img.height - oy);
    if (this.dying === 'stomp') { ctx.drawImage(img, x - 1, y + Math.round(img.height * 0.55), img.width + 2, Math.round(img.height * 0.45)); return; }
    if (this.dying === 'dash') { ctx.globalAlpha = Math.max(0, this.squash / 24); ctx.drawImage(img, x, y); ctx.globalAlpha = 1; return; }
    ctx.drawImage(img, x, y);
  }
}
class Walker extends Enemy {
  constructor(x, y, world) { super(x + 1, y + 6, 14, 10, 'beetle', { stomp: true, dash: true }); this.speed = [0, 0.42, 0.52, 0.6][world]; }
  think(L) {
    if (this.onGround && (!this.groundAhead(L, this.dir) || this.wallAhead(L, this.dir))) this.dir *= -1;
    this.vx = this.dir * this.speed; this.physics(L);
  }
}
class Spiky extends Enemy {
  constructor(x, y, world) { super(x + 1, y + 4, 14, 12, 'burr', { stomp: false, dash: false }); this.speed = [0, 0.3, 0.38, 0.44][world]; }
  think(L) {
    if (this.onGround && (!this.groundAhead(L, this.dir) || this.wallAhead(L, this.dir))) this.dir *= -1;
    this.vx = this.dir * this.speed; this.physics(L);
  }
}
class Hopper extends Enemy {
  constructor(x, y) { super(x + 1, y + 6, 14, 10, 'frog', { stomp: true, dash: true }); this.wait = 50 + ((x * 13) % 40); }
  think(L) {
    const p = L.player;
    if (this.onGround) {
      this.vx = 0;
      if (--this.wait <= 0) {
        const near = Math.abs(p.cx - this.cx) < 160 && Math.abs(p.cy - this.cy) < 90;
        this.dir = near ? sgn(p.cx - this.cx) || this.dir : this.dir;
        if (!this.groundAhead(L, this.dir) && !near) this.dir *= -1;
        this.vy = -4.6; this.vx = this.dir * 1.1; this.wait = 70 + ((this.t * 7) % 30);
        L.fx('hop', this);
      }
    } else this.vx = this.dir * 1.1;
    this.physics(L);
  }
  sprite(L) { const fr = ART.enemies[L.theme.world].frog; return fr[this.onGround ? 0 : 1]; }
}
class Flyer extends Enemy {
  constructor(x, y) { super(x + 2, y + 4, 12, 8, 'bee', { stomp: true, dash: true, grav: false }); this.range = 40; this.dir = 1; }
  think(L) {
    const k = this.t * 0.02;
    const nx = this.x0 + Math.sin(k) * this.range;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx; this.y = this.y0 + Math.sin(this.t * 0.09) * 6;
  }
}
class Swooper extends Enemy {
  constructor(x, y) { super(x + 1, y + 4, 14, 8, 'bird', { stomp: true, dash: true, grav: false }); this.mode = 'hover'; this.cd = 0; this.hx = this.x; this.hy = this.y; }
  think(L) {
    const p = L.player;
    if (this.cd > 0) this.cd--;
    if (this.mode === 'hover') {
      this.x = this.hx + Math.sin(this.t * 0.03) * 10; this.y = this.hy + Math.sin(this.t * 0.07) * 3;
      this.dir = sgn(p.cx - this.cx) || this.dir;
      if (this.cd <= 0 && Math.abs(p.cx - this.cx) < 110 && p.cy > this.cy + 8 && p.cy - this.cy < 130) {
        this.mode = 'dive'; this.tx = p.cx; this.ty = p.cy; this.sx = this.x; this.sy = this.y; this.k = 0; L.fx('swoop', this);
      }
    } else if (this.mode === 'dive') {
      this.k += 1 / 55;
      const u = this.k;
      // a dip through the target and back up on the far side
      const ex = this.sx + (this.tx - this.sx) * 2;
      this.x = lerp(this.sx, ex, u) - this.w / 2 + (u === 0 ? 0 : 0);
      this.y = this.sy + Math.sin(u * Math.PI) * (this.ty - this.sy);
      this.dir = sgn(ex - this.sx) || this.dir;
      if (this.k >= 1) { this.mode = 'hover'; this.hx = this.x; this.hy = this.sy; this.cd = 80; }
    }
  }
}
class Turret extends Enemy {
  constructor(x, y, dir) { super(x, y, 16, 16, 'turret', { stomp: false, dash: false, grav: false }); this.dir = dir; this.cool = 60 + ((x / 16) % 3) * 30; this.charge = 0; }
  think(L) {
    const p = L.player;
    const near = Math.abs(p.cx - this.cx) < 15 * TILE && Math.abs(p.cy - this.cy) < 7 * TILE && sgn(p.cx - this.cx) === this.dir;
    if (this.charge > 0) { if (--this.charge === 0) { L.spawn(new Projectile(this.cx + this.dir * 8 - 3, this.cy - 3, this.dir * 1.9, L.theme.world)); L.fx('shoot', this); this.cool = 130; } return; }
    if (this.cool > 0) this.cool--;
    else if (near) this.charge = 30;
  }
  harms() { return false; }
  draw(ctx, L, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy), w3 = L.theme.world === 3;
    const base = w3 ? ['#5AA8D0', '#3A78A8', '#BDEBFF'] : ['#C98A5A', '#9A6440', '#F0C088'];
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = base[0]; ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = base[2]; ctx.fillRect(x + 1, y + 1, 14, 2);
    ctx.fillStyle = base[1]; ctx.fillRect(x + 1, y + 12, 14, 3);
    const hot = this.charge > 0 ? 1 - this.charge / 30 : 0;
    const eye = w3 ? mix('#1B3A5A', '#E8FFFF', hot) : mix('#4A2418', '#FFD27A', hot);
    const fx = this.dir > 0 ? x + 9 : x + 3;
    ctx.fillStyle = '#2B1A1F'; ctx.fillRect(fx, y + 5, 4, 2); ctx.fillRect(this.dir > 0 ? x + 11 : x + 1, y + 8, 4, 4);
    ctx.fillStyle = eye; ctx.fillRect(fx + 1, y + 5, 2, 1); ctx.fillRect(this.dir > 0 ? x + 12 : x + 2, y + 9, 2, 2);
  }
  light(L, out) { if (this.charge > 0) out.push([this.cx + this.dir * 6, this.cy + 2, 22, L.theme.world === 3 ? 2 : 1]); }
}
class Projectile extends Ent {
  constructor(x, y, vx, world) { super(x, y, 6, 6); this.vx = vx; this.world = world; }
  update(L) {
    this.t++; this.x += this.vx;
    const w = L.world, tx = Math.floor(this.cx / TILE), ty = Math.floor(this.cy / TILE);
    if (w.isSolid(tx, ty) || this.t > 400) { this.dead = true; L.parts.burst(this.cx, this.cy, this.world === 3 ? '#CFF4FF' : '#FFB347', 5); return; }
    if (this.t % 3 === 0) L.parts.trail(this.cx, this.cy, this.world === 3 ? '#9FE3F5' : '#FF8A3A');
    const p = L.player;
    if (overlap(this, p)) {
      if (p.dashT > 0) { this.dead = true; L.parts.burst(this.cx, this.cy, '#FFFFFF', 6); return; }
      L.hurtPlayer(sgn(this.vx)); this.dead = true;
    }
  }
  draw(ctx, L, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.world === 3) { ctx.fillStyle = '#E8FFFF'; ctx.fillRect(x, y + 2, 6, 2); ctx.fillStyle = '#6CC6EA'; ctx.fillRect(x + 1, y + 1, 4, 4); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 2, y + 2, 2, 1); }
    else { ctx.fillStyle = '#C8402E'; ctx.fillRect(x, y, 6, 6); ctx.fillStyle = '#FF8A3A'; ctx.fillRect(x + 1, y + 1, 4, 4); ctx.fillStyle = '#FFE9A0'; ctx.fillRect(x + 2, y + 2, 2, 2); }
  }
  light(L, out) { out.push([this.cx, this.cy, 20, this.world === 3 ? 2 : 1]); }
}
class Icicle extends Ent {
  constructor(x, y) { super(x + 4, y, 8, 14); this.state = 'hang'; this.k = 0; this.vy = 0; }
  update(L) {
    this.t++;
    const p = L.player;
    if (this.state === 'hang') {
      if (Math.abs(p.cx - this.cx) < 18 && p.y > this.y && p.y - this.y < 9 * TILE) { this.state = 'shake'; this.k = 26; L.fx('crack', this); }
    } else if (this.state === 'shake') { if (--this.k <= 0) this.state = 'fall'; }
    else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.35, 7); this.y += this.vy;
      const w = L.world;
      if (w.isSolid(Math.floor(this.cx / TILE), Math.floor((this.y + this.h) / TILE)) || this.y > w.ph) { this.state = 'gone'; this.k = 200; L.parts.burst(this.cx, this.y + this.h, '#E8FFFF', 8); L.fx('shatter', this); }
      if (overlap(this, p)) { L.hurtPlayer(sgn(p.cx - this.cx) || 1); this.state = 'gone'; this.k = 200; L.parts.burst(this.cx, this.y + this.h, '#E8FFFF', 8); }
    } else if (this.state === 'gone') { if (--this.k <= 0) { this.state = 'hang'; this.y = this.y0; this.vy = 0; } }
  }
  draw(ctx, L, ox, oy) {
    if (this.state === 'gone') return;
    const x = Math.round(this.x - ox + (this.state === 'shake' ? ((this.t >> 1) % 2 ? 1 : -1) : 0)), y = Math.round(this.y - oy);
    for (let i = 0; i < 14; i++) {
      const hw = Math.max(0, Math.floor((1 - i / 14) * 4));
      ctx.fillStyle = '#2E5A86'; ctx.fillRect(x + 4 - hw - 1, y + i, hw * 2 + 2, 1);
      ctx.fillStyle = i < 3 ? '#FFFFFF' : '#9FE3F5'; ctx.fillRect(x + 4 - hw, y + i, hw * 2, 1);
      ctx.fillStyle = '#E8FFFF'; if (hw > 0) ctx.fillRect(x + 4 - hw, y + i, 1, 1);
    }
  }
}
/* light-only decor */
class Glow extends Ent {
  constructor(x, y, kind, theme) { super(x, y, 16, 16); this.kind = kind; this.theme = theme; this.ph = (x + y) % 100; }
  draw(ctx, L, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy), k = this.t + this.ph;
    if (this.kind === 'torch') {
      ctx.fillStyle = '#3A2418'; ctx.fillRect(x + 6, y + 8, 4, 8); ctx.fillStyle = '#6E4428'; ctx.fillRect(x + 5, y + 7, 6, 2);
      const f = (k >> 2) % 3;
      ctx.fillStyle = '#FF6A2A'; ctx.fillRect(x + 6, y + 2 + f % 2, 4, 5);
      ctx.fillStyle = '#FFC24A'; ctx.fillRect(x + 7, y + 3 + (f === 2 ? 1 : 0), 2, 4);
      ctx.fillStyle = '#FFF6C8'; ctx.fillRect(x + 7, y + 5, 1, 2);
      if (k % 10 === 0) L.parts.ember(x + ox + 8, y + oy + 2);
    } else {
      // glowing mushrooms (cave) or crystals (crystal/tower)
      const cave = L.theme === THEMES.cave;
      const c1 = cave ? '#7FF0E0' : '#8FE6FF', c2 = cave ? '#3FB8B0' : '#C79BFF', stem = cave ? '#D8E8E0' : '#5A8AD0';
      const pul = 0.5 + 0.5 * Math.sin(k * 0.05);
      if (cave) {
        ctx.fillStyle = stem; ctx.fillRect(x + 4, y + 12, 2, 4); ctx.fillRect(x + 10, y + 10, 2, 6);
        ctx.fillStyle = c2; ctx.fillRect(x + 2, y + 10, 6, 3); ctx.fillRect(x + 8, y + 8, 6, 3);
        ctx.fillStyle = mix(c1, '#FFFFFF', pul * 0.4); ctx.fillRect(x + 3, y + 10, 4, 1); ctx.fillRect(x + 9, y + 8, 4, 1);
      } else {
        ctx.fillStyle = c2; ctx.fillRect(x + 4, y + 8, 3, 8); ctx.fillRect(x + 10, y + 10, 3, 6);
        ctx.fillStyle = c1; ctx.fillRect(x + 7, y + 5, 3, 11); ctx.fillStyle = mix(c1, '#FFFFFF', pul * 0.6); ctx.fillRect(x + 8, y + 5, 1, 8);
      }
    }
  }
  update() { this.t++; }
  light(L, out) { out.push([this.x + 8, this.y + 9, this.kind === 'torch' ? 58 + Math.sin(this.t * 0.3) * 3 : 34, this.kind === 'torch' ? 1 : 2]); }
}
