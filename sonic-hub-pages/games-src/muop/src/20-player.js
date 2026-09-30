/* ── Player physics (units: px and px/frame at 60 fps). Headless-safe. ──
   Max jump ≈ 4.6 tiles high, ≈ 6 tiles long at full run. Spring ≈ 8 tiles. */
const PHYS = {
  W: 10, H: 14,
  RUN: 2.3, ACC: 0.3, DEC: 0.42, TURN: 0.6, AIR_ACC: 0.21, AIR_DEC: 0.07, OVER_DEC: 0.05,
  ICE_ACC: 0.055, ICE_DEC: 0.02,
  JUMP: 6.4, CUT: 2.6, G_UP: 0.28, G: 0.5, APEX: 1.1, APEX_MUL: 0.55, MAX_FALL: 6.5,
  COYOTE: 6, BUFFER: 7,
  SLIDE: 1.35, WJ_X: 2.7, WJ_Y: 5.9, WJ_LOCK: 9, WALL_COYOTE: 5,
  DASH_V: 5.4, DASH_T: 10, DASH_CD: 14,
  STOMP: 4.4, STOMP_HOLD: 6.4, SPRING: 8.7,
};
class Player {
  constructor(x, y) { this.w = PHYS.W; this.h = PHYS.H; this.reset(x, y); }
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.face = 1;
    this.grounded = false; this.coyote = 0; this.buffer = 0; this.jumping = false; this.springBoost = false;
    this.wallDir = 0; this.wallCoyote = 0; this.wallCoyoteDir = 0; this.wallLock = 0; this.lockDir = 0; this.sliding = false;
    this.dashT = 0; this.dashDir = 1; this.dashCD = 0; this.canDashAir = true;
    this.platform = null; this.onIce = false; this.airVy = 0;
    this.inv = 0; this.hurtLock = 0; this.landT = 0; this.prevJump = true; this.prevDash = true;
    this.ctrlLock = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }

  colColumn(w, tx, y = this.y) {
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + this.h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) if (w.isSolid(tx, ty, true)) return true;
    return false;
  }
  colRow(w, ty, x = this.x) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + this.w - 0.001) / TILE);
    for (let tx = x0; tx <= x1; tx++) if (w.isSolid(tx, ty, true)) return true;
    return false;
  }
  boxFree(w, x, y) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + this.w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + this.h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (w.isSolid(tx, ty, true)) return false;
    return true;
  }
  touchWall(w, d) {
    const tx = d > 0 ? Math.floor((this.x + this.w + 0.5) / TILE) : Math.floor((this.x - 0.5) / TILE);
    const y0 = Math.floor((this.y + 3) / TILE), y1 = Math.floor((this.y + this.h - 4) / TILE);
    for (let ty = y0; ty <= y1; ty++) if (w.isSolid(tx, ty, true)) return true;
    return false;
  }
  moveX(w, dx, g) {
    if (!dx) return 0;
    const steps = Math.ceil(Math.abs(dx) / 4), s = dx / steps;
    for (let i = 0; i < steps; i++) {
      const ox = this.x;
      this.x += s;
      const tx = s > 0 ? Math.floor((this.x + this.w - 0.001) / TILE) : Math.floor(this.x / TILE);
      if (this.colColumn(w, tx)) {
        // dash breaks cracked blocks
        if (this.dashT > 0 && g && g.breakColumn(tx, this)) { if (!this.colColumn(w, tx)) continue; }
        // ledge assist while dashing: hop onto a lip up to 6px high
        if (this.dashT > 0) {
          let popped = false;
          for (let k = 1; k <= 6; k++) if (!this.colColumn(w, tx, this.y - k) && this.boxFree(w, this.x, this.y - k)) { this.y -= k; popped = true; break; }
          if (popped) continue;
        }
        this.x = s > 0 ? tx * TILE - this.w : (tx + 1) * TILE;
        if (Math.abs(this.x - ox) > 4.01) this.x = ox;
        return sgn(s);
      }
    }
    return 0;
  }
  moveY(w, dy, g) {
    const res = { landed: false, head: null, platform: null };
    if (!dy) return res;
    const steps = Math.ceil(Math.abs(dy) / 4), s = dy / steps;
    for (let i = 0; i < steps; i++) {
      const prevBottom = this.y + this.h;
      this.y += s;
      if (s > 0) {
        const ty = Math.floor((this.y + this.h - 0.001) / TILE);
        const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.001) / TILE);
        let hit = false;
        for (let tx = x0; tx <= x1; tx++) {
          if (w.isSolid(tx, ty, true) || (w.isOneWay(tx, ty) && prevBottom <= ty * TILE + 0.01)) { hit = true; break; }
        }
        if (hit) { this.y = ty * TILE - this.h; res.landed = true; return res; }
        for (const p of w.platforms) {
          if (this.x + this.w > p.x && this.x < p.x + p.w && prevBottom <= p.y + 0.6 && this.y + this.h >= p.y) {
            this.y = p.y - this.h; res.landed = true; res.platform = p; return res;
          }
        }
      } else {
        const ty = Math.floor(this.y / TILE);
        if (this.colRow(w, ty)) {
          // corner correction: slide around a ceiling corner we barely clip
          const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.001) / TILE);
          const leftSolid = w.isSolid(x0, ty, true), rightSolid = w.isSolid(x1, ty, true);
          let fixed = false;
          if (leftSolid && !rightSolid) {
            const ov = (x0 + 1) * TILE - this.x;
            if (ov <= 5 && this.boxFree(w, this.x + ov, this.y)) { this.x += ov; fixed = true; }
          } else if (rightSolid && !leftSolid) {
            const ov = this.x + this.w - x1 * TILE;
            if (ov <= 5 && this.boxFree(w, this.x - ov, this.y)) { this.x -= ov; fixed = true; }
          }
          if (fixed) continue;
          this.y = (ty + 1) * TILE;
          // which tile did the head hit? the one under the body centre, else the other
          const cxT = Math.floor(this.cx / TILE);
          res.head = w.isSolid(cxT, ty, true) ? [cxT, ty] : [leftSolid ? x0 : x1, ty];
          return res;
        }
      }
    }
    return res;
  }
  groundProbe(w) {
    const y = this.y + this.h + 0.5, ty = Math.floor(y / TILE);
    const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.001) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (w.isSolid(tx, ty, true)) return { tile: [tx, ty] };
      if (w.isOneWay(tx, ty) && Math.abs(this.y + this.h - ty * TILE) < 0.6) return { tile: [tx, ty] };
    }
    for (const p of w.platforms) if (this.x + this.w > p.x && this.x < p.x + p.w && Math.abs(this.y + this.h - p.y) < 0.8) return { platform: p };
    return null;
  }
  doJump(g) {
    this.vy = -PHYS.JUMP; this.coyote = 0; this.buffer = 0; this.jumping = true; this.springBoost = false;
    this.grounded = false; this.platform = null;
    if (g) g.fx('jump', this);
  }
  update(inp, w, g) {
    const P = PHYS, ab = g.abilities;
    if (this.inv > 0) this.inv--;
    if (this.hurtLock > 0) this.hurtLock--;
    if (this.wallLock > 0) this.wallLock--;
    if (this.dashCD > 0) this.dashCD--;
    if (this.landT > 0) this.landT--;
    if (this.ctrlLock > 0) this.ctrlLock--;
    // ride the platform we stood on
    if (this.platform) {
      const p = this.platform;
      if (this.x + this.w > p.x - 1 && this.x < p.x + p.w + 1 && Math.abs(this.y + this.h - p.prevY) < 1.5) {
        this.moveX(w, p.dx, g);
        const ny = p.y - this.h;
        if (p.dy < 0 && !this.boxFree(w, this.x, ny)) { /* squeezed: step off */ } else this.y = ny;
      } else this.platform = null;
    }
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (this.hurtLock > 0 || this.ctrlLock > 0) dir = 0;
    const jp = inp.jump && !this.prevJump;
    const dp = inp.dash && !this.prevDash;
    this.prevJump = inp.jump; this.prevDash = inp.dash;
    if (jp && this.ctrlLock <= 0) this.buffer = P.BUFFER; else if (this.buffer > 0) this.buffer--;
    if (this.grounded) { this.coyote = P.COYOTE; this.canDashAir = true; } else if (this.coyote > 0) this.coyote--;
    this.wallDir = 0;
    if (!this.grounded && ab.wall) { if (this.touchWall(w, 1)) this.wallDir = 1; else if (this.touchWall(w, -1)) this.wallDir = -1; }
    if (this.wallDir) { this.wallCoyote = P.WALL_COYOTE; this.wallCoyoteDir = this.wallDir; } else if (this.wallCoyote > 0) this.wallCoyote--;
    if (ab.dash && dp && this.dashCD <= 0 && this.dashT <= 0 && (this.grounded || this.canDashAir) && this.hurtLock <= 0) {
      this.dashDir = dir || this.face; this.dashT = P.DASH_T; this.dashCD = P.DASH_CD;
      if (!this.grounded) this.canDashAir = false;
      this.vy = 0; this.jumping = false; this.springBoost = false;
      g.fx('dash', this);
    }
    if (this.dashT > 0) {
      this.dashT--;
      this.vx = this.dashDir * P.DASH_V; this.vy = 0; this.face = this.dashDir;
      if (this.dashT === 0) this.vx = this.dashDir * P.RUN * 1.15;
      if (this.buffer > 0 && this.coyote > 0) { this.dashT = 0; this.vx = this.dashDir * P.RUN * 1.3; this.doJump(g); }
      else if (this.buffer > 0 && ab.wall && (this.wallDir || this.wallCoyote > 0)) { this.dashT = 0; }
    }
    if (this.dashT <= 0) {
      const over = Math.abs(this.vx) > P.RUN + 0.01;
      if (this.grounded) {
        if (dir) {
          if (over && sgn(this.vx) === dir) this.vx = approach(this.vx, dir * P.RUN, P.OVER_DEC * 3);
          else this.vx = approach(this.vx, dir * P.RUN, this.onIce ? P.ICE_ACC : this.vx * dir < 0 ? P.TURN : P.ACC);
        } else this.vx = approach(this.vx, 0, this.onIce ? P.ICE_DEC : P.DEC);
      } else {
        let acc = P.AIR_ACC;
        if (this.wallLock > 0 && dir === this.lockDir) acc *= 0.2;
        if (dir) {
          if (over && sgn(this.vx) === dir) this.vx = approach(this.vx, dir * P.RUN, P.OVER_DEC);
          else this.vx = approach(this.vx, dir * P.RUN, acc);
        } else this.vx = approach(this.vx, 0, P.AIR_DEC);
      }
      if (dir) this.face = dir;
      if (this.buffer > 0 && this.coyote > 0) this.doJump(g);
      else if (this.buffer > 0 && ab.wall && !this.grounded && (this.wallDir || this.wallCoyote > 0)) {
        const wd = this.wallDir || this.wallCoyoteDir;
        this.vx = -wd * P.WJ_X; this.vy = -P.WJ_Y; this.buffer = 0; this.wallCoyote = 0;
        this.jumping = true; this.springBoost = false; this.wallLock = P.WJ_LOCK; this.lockDir = wd; this.face = -wd;
        this.canDashAir = true;
        g.fx('walljump', this, wd);
      }
      if (this.jumping && !inp.jump && this.vy < -P.CUT) this.vy = -P.CUT;
      if (this.vy >= 0) { this.jumping = false; this.springBoost = false; }
      let gr = P.G;
      const hold = inp.jump || this.springBoost;
      if (this.vy < 0 && hold) gr = P.G_UP;
      if (!this.grounded && Math.abs(this.vy) < P.APEX && hold) gr *= P.APEX_MUL;
      this.vy += gr;
      this.sliding = false;
      if (this.wallDir && dir === this.wallDir && this.vy > 0) { this.sliding = true; if (this.vy > P.SLIDE) this.vy = P.SLIDE; }
      if (this.vy > P.MAX_FALL) this.vy = P.MAX_FALL;
    }
    if (g.wind) this.vx += g.wind * (this.grounded ? 0.45 : 1);
    const wasGrounded = this.grounded;
    if (this.moveX(w, this.vx, g)) { this.vx = 0; if (this.dashT > 0) this.dashT = 0; }
    const res = this.moveY(w, this.vy, g);
    if (res.head) {
      this.vy = Math.max(this.vy, 0.5);
      this.jumping = false; this.springBoost = false;
      g.bump(res.head[0], res.head[1], this);
    }
    if (!this.grounded && this.vy > this.airVy) this.airVy = this.vy;
    const probe = this.vy >= 0 ? this.groundProbe(w) : null;
    this.grounded = res.landed || !!probe;
    if (this.grounded) {
      if (res.landed && this.vy > 0) {
        // landing on a switch from above toggles it
        const ty = Math.floor((this.y + this.h + 0.5) / TILE);
        const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.001) / TILE);
        for (let tx = x0; tx <= x1; tx++) if (w.code(tx, ty) === T.SWITCH && this.airVy > 1.5) { g.hitSwitch(tx, ty, this); break; }
      }
      this.vy = 0;
      this.platform = res.platform || (probe && probe.platform) || null;
      if (!wasGrounded) { if (this.airVy > 2.5) { this.landT = 6; g.fx('land', this, this.airVy); } this.airVy = 0; }
      const ty = Math.floor((this.y + this.h + 0.5) / TILE);
      const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.001) / TILE);
      this.onIce = false;
      for (let tx = x0; tx <= x1; tx++) { if (w.isIce(tx, ty)) this.onIce = true; w.touchCrumble(tx, ty); }
    } else { this.platform = null; }
    w.updateGhosts(this);
  }
  /* safe spot to return to after a pit or spikes: fully on stable ground, no spikes nearby */
  isSafeSpot(w) {
    if (!this.grounded || this.platform || this.dashT > 0) return false;
    const ty = Math.floor((this.y + this.h + 0.5) / TILE);
    const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.001) / TILE);
    for (let tx = x0; tx <= x1; tx++) if (!w.isStable(tx, ty)) return false;
    if (w.spikeHit(this.x - 12, this.y - 10, this.w + 24, this.h + 12)) return false;
    return true;
  }
}
