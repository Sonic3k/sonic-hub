/* ── The valley: painted once for the size of the window, and the lanterns going up over it ──
   #scene is the painting that stands still: the sky at the blue hour, the hills one behind another with mist
   between them, the iron bridge of the line, the shophouses lit along it, bamboo at the edges. #sky moves over it:
   lanterns sent up from the valley, the lanterns the game has lit (each square taken sends one up, in the colour of
   whoever took it, and it stays in the sky until the next game), a string of red lanterns across the top, and now
   and then a train crossing the bridge. #fx is above everything: the lanterns rising straight from the board. */
const Scene = {
  W: 0, H: 0, dpr: 1, seed: 20261124, bridgeY: 0, horizon: 0,
  float: [], kept: [], rising: [], sprites: null, string: null, train: { at: -1, next: 4000 }, raf: 0, last: 0, live: true,

  /** The painting, for the window as it is now. */
  paint() {
    const cv = $('#scene'), W = window.innerWidth, H = window.innerHeight, dpr = pixelRatio(2);
    this.W = W; this.H = H; this.dpr = dpr;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tall = H > W * 1.15, r = seeded(this.seed);
    const horizon = H * (tall ? 0.6 : 0.64); this.horizon = horizon;
    // the sky: night above, the last of the light low down behind the hills
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#0a1030'); sky.addColorStop(0.3, '#16204c'); sky.addColorStop(0.55, '#33295c'); sky.addColorStop(0.75, '#7a4468'); sky.addColorStop(0.9, '#d06a56'); sky.addColorStop(1, '#f4a466');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.68, horizon * 1.02, 0, W * 0.68, horizon, Math.max(W, H) * 0.55);
    sun.addColorStop(0, 'rgba(255, 196, 120, 0.55)'); sun.addColorStop(0.35, 'rgba(240, 120, 90, 0.18)'); sun.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    // stars, more of them higher up
    for (let i = 0; i < W * H / 4200; i++) {
      const y = Math.pow(r(), 1.8) * horizon * 0.75, x = r() * W, a = (1 - y / (horizon * 0.75)) * (0.25 + r() * 0.75);
      g.globalAlpha = a; g.fillStyle = r() < 0.15 ? '#ffe7c0' : '#e8eeff'; const s = r() < 0.06 ? 1.6 : 0.6 + r() * 0.7;
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      if (s > 1.5) { g.globalAlpha = a * 0.5; g.fillRect(x - 4, y - 0.3, 8, 0.6); g.fillRect(x - 0.3, y - 4, 0.6, 8); }
    }
    g.globalAlpha = 1;
    // long clouds catching the light from below
    for (let i = 0; i < 7; i++) {
      const cy = horizon * (0.38 + r() * 0.42), cx = r() * W, len = W * (0.25 + r() * 0.4), th = H * (0.012 + r() * 0.02);
      for (let k = 0; k < 14; k++) {
        const x = cx + (r() - 0.5) * len, y = cy + (r() - 0.5) * th * 2, rad = th * (1.5 + r() * 2.5), gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, cy > horizon * 0.65 ? 'rgba(255, 170, 140, 0.2)' : 'rgba(190, 150, 210, 0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(3.5, 1); g.translate(-x, -y); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore();
      }
    }
    // the hills, far to near, each darker, with mist lying between them
    const hills = [
      { base: horizon * 0.97, amp: H * 0.2, f: 1 / 260, top: '#8a6c98', bot: '#6a5482', rim: 'rgba(255, 190, 150, 0.45)', seed: 11 },
      { base: horizon * 1.04, amp: H * 0.16, f: 1 / 190, top: '#56456f', bot: '#3f3459', rim: 'rgba(255, 170, 140, 0.3)', seed: 23 },
      { base: horizon * 1.12, amp: H * 0.13, f: 1 / 150, top: '#2f2849', bot: '#231e3a', rim: 'rgba(255, 160, 130, 0.18)', seed: 37 },
      { base: horizon * 1.2, amp: H * 0.09, f: 1 / 110, top: '#1b1830', bot: '#141226', rim: 'rgba(255, 150, 120, 0.1)', seed: 41, trees: true },
    ];
    hills.forEach((hill, i) => {
      const n = noise1(this.seed + hill.seed), n2 = noise1(this.seed + hill.seed * 7), ys = [];
      for (let x = -10; x <= W + 10; x += 4) ys.push([x, hill.base - hill.amp * (0.55 + 0.45 * n(x * hill.f) + 0.18 * n2(x * hill.f * 4))]);
      const peak = Math.min(...ys.map(p => p[1])), gr = g.createLinearGradient(0, peak, 0, H);
      gr.addColorStop(0, hill.top); gr.addColorStop(0.5, hill.bot); gr.addColorStop(1, hill.bot);
      g.fillStyle = gr; g.beginPath(); g.moveTo(-10, H); for (const [x, y] of ys) g.lineTo(x, y); g.lineTo(W + 10, H); g.closePath(); g.fill();
      g.strokeStyle = hill.rim; g.lineWidth = 1.2; g.beginPath(); ys.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      if (hill.trees) {                                          // the near hill's woods: crowns along its line
        g.fillStyle = '#121022';
        for (const [x, y] of ys) if (r() < 0.55) { g.beginPath(); g.arc(x + r() * 4, y + 3, 3 + r() * 6, Math.PI, 0); g.fill(); }
      }
      const mist = g.createLinearGradient(0, hill.base - hill.amp * 0.4, 0, hill.base + H * 0.06);
      mist.addColorStop(0, 'rgba(240, 190, 200, 0)'); mist.addColorStop(0.6, `rgba(236, 186, 196, ${0.22 - i * 0.04})`); mist.addColorStop(1, 'rgba(240, 190, 200, 0)');
      g.fillStyle = mist; g.fillRect(0, hill.base - hill.amp * 0.4, W, hill.amp * 0.4 + H * 0.06);
    });
    // the line's iron bridge across the valley
    const by = Math.min(H * 0.9, horizon * 1.2 + H * 0.02); this.bridgeY = by;
    g.fillStyle = '#0f0c1c'; g.fillRect(0, by, W, Math.max(3, H * 0.006));
    g.strokeStyle = '#0f0c1c'; g.lineWidth = 1.6;
    const span = Math.max(70, W / 14);
    for (let x = -span; x < W + span; x += span) {
      g.beginPath(); g.moveTo(x, by); g.lineTo(x + span / 2, by - span * 0.22); g.lineTo(x + span, by); g.stroke();
      g.beginPath(); g.moveTo(x + span / 2, by - span * 0.22); g.lineTo(x + span / 2, by); g.stroke();
      g.fillRect(x + span / 2 - 2, by, 4, H - by);               // its piers, down into the town
    }
    g.beginPath(); g.moveTo(0, by - span * 0.22); g.lineTo(W, by - span * 0.22); g.stroke();
    // the shophouses along the old street, two rows of them, with their windows and signs lit
    const rows = [{ y: by + H * 0.035, h: [0.05, 0.1], col: '#1a1428', lit: 0.35, w: [34, 70] }, { y: H, h: [0.07, 0.15], col: '#110d1d', lit: 0.45, w: [44, 96] }];
    for (const row of rows) {
      let x = -20;
      while (x < W + 20) {
        const bw = row.w[0] + r() * (row.w[1] - row.w[0]), bh = H * (row.h[0] + r() * (row.h[1] - row.h[0])), top = row.y - bh;
        g.fillStyle = row.col; g.fillRect(x, top, bw - 2, row.y - top + 2);
        if (r() < 0.5) { g.beginPath(); g.moveTo(x - 3, top); g.lineTo(x + bw * 0.5, top - bh * 0.12); g.lineTo(x + bw + 1, top); g.closePath(); g.fill(); }
        const ww = Math.max(4, bw * 0.12), wh = Math.max(5, bh * 0.1);
        for (let wy = top + wh; wy < row.y - wh * 1.6; wy += wh * 2.1) for (let wx = x + ww * 0.8; wx < x + bw - ww * 1.5; wx += ww * 2) {
          if (r() > row.lit) continue;
          const warm = r(); g.fillStyle = warm < 0.7 ? '#ffc76e' : warm < 0.9 ? '#ff9a52' : '#ffe9b0';
          g.globalAlpha = 0.6 + r() * 0.4; g.fillRect(wx, wy, ww, wh); g.globalAlpha = 1;
        }
        if (r() < 0.35) {                                        // a shop sign, hung out over the street
          const sh = bh * (0.3 + r() * 0.3), sx = x + bw * (0.2 + r() * 0.5), sy = top + bh * 0.2, sc = ['#ff5b3a', '#ffcf5a', '#ff7a3c', '#ffe08a'][Math.floor(r() * 4)];
          const sg = g.createRadialGradient(sx + 4, sy + sh / 2, 0, sx + 4, sy + sh / 2, sh);
          sg.addColorStop(0, sc + '88'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(sx - sh, sy - sh * 0.5, sh * 2 + 8, sh * 2);
          g.fillStyle = sc; g.fillRect(sx, sy, Math.max(5, bw * 0.12), sh);
        }
        x += bw;
      }
    }
    // the warm haze the street gives off
    const haze = g.createLinearGradient(0, by - H * 0.08, 0, H);
    haze.addColorStop(0, 'rgba(255, 150, 80, 0)'); haze.addColorStop(0.6, 'rgba(255, 140, 70, 0.14)'); haze.addColorStop(1, 'rgba(255, 120, 60, 0.22)');
    g.fillStyle = haze; g.fillRect(0, by - H * 0.08, W, H - by + H * 0.08);
    // bamboo at the edges, close by and out of the light
    for (const side of [0, 1]) {
      const rr = seeded(this.seed + side * 99);
      for (let k = 0; k < (W > 700 ? 5 : 3); k++) {
        const x0 = side ? W - rr() * W * 0.07 : rr() * W * 0.07, lean = (side ? -1 : 1) * (0.03 + rr() * 0.08), wdt = 4 + rr() * 7;
        g.strokeStyle = '#0b1310'; g.lineWidth = wdt; g.beginPath(); g.moveTo(x0, H + 10); g.quadraticCurveTo(x0 + lean * H * 0.5, H * 0.5, x0 + lean * H, -10); g.stroke();
        for (let y = H; y > 0; y -= 40 + rr() * 50) {
          const t = 1 - y / H, x = x0 + lean * H * t * (1 + t * 0.2);
          g.fillStyle = '#0b1310';
          for (let l = 0; l < 3; l++) {
            const dir = (side ? -1 : 1) * (rr() < 0.7 ? 1 : -1), len = 20 + rr() * 34, a = (rr() - 0.3) * 0.9;
            g.save(); g.translate(x, y); g.rotate(a * dir + (dir < 0 ? Math.PI : 0)); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.16, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.14, 0, 0); g.fill(); g.restore();
          }
        }
      }
    }
    // a grain over everything, as on a print
    const grain = paperGrain(160, this.seed); g.globalAlpha = 0.35; g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    this.layout();
  },

  /** The lanterns over the valley, for the window as it is now. */
  layout() {
    const W = this.W, H = this.H, r = seeded(this.seed + 5), many = Math.round(Math.min(48, Math.max(18, W * H / 26000)));
    if (!this.sprites) this.sprites = { warm: [14, 22, 34].map((h, i) => skyLantern(h, 2, 3 + i)), side: [0, 1].map(s => [12, 20, 30].map((h, i) => skyLantern(h, s, 9 + i))), near: [0, 1].map(s => skyLantern(46, s, 21)) };
    this.float = Array.from({ length: many }, () => this.fresh(r, true));
    for (const k of this.kept) { k.x = Math.min(k.x, W - 10); }
    // the string of lanterns across the top, on a wide window
    this.string = W > 900 ? { lamps: Array.from({ length: Math.round(W / 120) }, (_, i) => ({ t: (i + 0.5) / Math.round(W / 120), ph: r() * TAU, sprite: roundLantern(30 + r() * 8, i) })) } : null;
    const sky = $('#sky'), fx = $('#fx'), dpr = pixelRatio(2);
    for (const c of [sky, fx]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }
    this.frame(performance.now(), true);
  },
  fresh(r, anywhere) {
    const z = Math.pow(r(), 1.6), H = this.H;
    return { x: r() * this.W, y: anywhere ? this.horizon * (0.15 + r() * 1.1) : this.horizon * (1.0 + r() * 0.25), z, v: 5 + z * 14 + r() * 4, ph: r() * TAU, sw: 4 + r() * 10, s: z < 0.35 ? 0 : z < 0.75 ? 1 : 2, fl: r() * TAU, h: H };
  },

  /** A lantern from the board: it rises from (x, y) on the page, and one of its colour joins the sky to stay. */
  release(x, y, side) {
    if (REDUCED) { this.keep(side); return; }
    this.rising.push({ x, y, side, t0: performance.now(), sway: (Math.random() - 0.5) * 2, ph: Math.random() * TAU });
    setTimeout(() => this.keep(side), 1800);
    this.wake();
  },
  keep(side) {
    const r = Math.random;
    this.kept.push({ side, x: this.W * (0.06 + r() * 0.88), y: this.horizon * (0.95 + r() * 0.15), stop: this.horizon * (0.06 + r() * 0.5), z: 0.45 + r() * 0.5, ph: r() * TAU, sw: 3 + r() * 6, fl: r() * TAU });
    this.wake();
  },
  /** a square taken back: the last of that side's lanterns to join the sky goes out */
  unkeep(side) { for (let i = this.kept.length - 1; i >= 0; i--) if (this.kept[i].side === side && this.kept[i].stop >= 0) { this.kept.splice(i, 1); return; } },
  /** the game's lanterns go on up and away: a new game starts with an empty sky */
  letGo() { for (const k of this.kept) k.stop = -80; },

  wake() { if (!this.raf && this.live) this.raf = requestAnimationFrame(t => this.tick(t)); },
  tick(now) {
    this.raf = 0;
    if (!this.live) return;
    if (now - this.last >= (this.rising.length ? 16 : 33)) { this.frame(now); this.last = now; }
    this.raf = requestAnimationFrame(t => this.tick(t));
  },
  frame(now, still) {
    const W = this.W, H = this.H, g = $('#sky').getContext('2d'), sp = this.sprites;
    if (!sp) return;
    const dt = still ? 0 : Math.min(0.1, (now - (this.prev || now)) / 1000); this.prev = now;
    g.clearRect(0, 0, W, H);
    const draw = (gc, s, x, y, scale, alpha) => { gc.globalAlpha = alpha; gc.drawImage(s.c, x - s.cx * scale, y - s.cy * scale, s.c.width * scale, s.c.height * scale); };
    // the lanterns going up from the valley, the far ones small and slow
    for (const f of this.float) {
      if (!REDUCED) { f.y -= f.v * dt; f.ph += dt * 0.6; f.fl += dt * 9; }
      if (f.y < -40) Object.assign(f, this.fresh(Math.random, false));
      const x = f.x + Math.sin(f.ph) * f.sw, fade = clamp01((this.horizon * 1.05 - f.y) / (H * 0.08)) * clamp01((f.y + 30) / (H * 0.25));
      draw(g, sp.warm[f.s], x, f.y, 0.6 + f.z * 0.6, (0.35 + f.z * 0.6) * fade * (0.88 + Math.sin(f.fl) * 0.12));
    }
    // the game's own: one for every square taken
    for (const k of this.kept) {
      if (!REDUCED) { k.y += (k.stop - k.y) * Math.min(1, dt * 0.35) - (k.stop < 0 ? 26 * dt : 0); k.ph += dt * 0.5; k.fl += dt * 8; }
      const x = k.x + Math.sin(k.ph) * k.sw;
      draw(g, sp.side[k.side][k.z > 0.75 ? 2 : k.z > 0.55 ? 1 : 0], x, k.y, 0.8 + k.z * 0.4, (0.75 + Math.sin(k.fl) * 0.1) * clamp01((k.y + 40) / 80));
    }
    this.kept = this.kept.filter(k => k.y > -60);
    // a train on the bridge
    const tr = this.train;
    if (!REDUCED && !still) {
      if (tr.at < 0) { tr.next -= dt * 1000; if (tr.next < 0) { tr.at = 0; tr.dir = Math.random() < 0.5 ? 1 : -1; } }
      else { tr.at += dt * (W + 400) / 9; if (tr.at > W + 400) { tr.at = -1; tr.next = 14000 + Math.random() * 16000; } }
    }
    if (tr.at >= 0) {
      const len = Math.max(90, W * 0.09), carH = Math.max(7, H * 0.012), y = this.bridgeY - carH - 1, x0 = tr.dir > 0 ? tr.at - 200 : W + 200 - tr.at - len * 2;
      g.globalAlpha = 1;
      for (let car = 0; car < 2; car++) {
        const x = x0 + car * (len + 4);
        g.fillStyle = '#1c2a4a'; g.fillRect(x, y, len, carH);
        g.fillStyle = '#e8eef8'; g.fillRect(x, y + carH * 0.62, len, carH * 0.14);
        g.fillStyle = '#ffd98a'; for (let wx = x + 6; wx < x + len - 8; wx += 11) g.fillRect(wx, y + carH * 0.18, 6, carH * 0.32);
      }
      const head = tr.dir > 0 ? x0 + len * 2 + 4 : x0, lg = g.createRadialGradient(head, y + carH / 2, 0, head, y + carH / 2, 40);
      lg.addColorStop(0, 'rgba(255, 240, 200, 0.6)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(head - 40, y - 30, 80, 70);
    }
    // the string of lanterns across the top
    if (this.string) {
      const sag = H * 0.05, pts = t => [t * W, -8 + 4 * sag * t * (1 - t)];
      g.globalAlpha = 0.9; g.strokeStyle = '#120c10'; g.lineWidth = 1.4; g.beginPath();
      for (let t = 0; t <= 1.001; t += 0.02) { const [x, y] = pts(t); t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      for (const l of this.string.lamps) {
        if (!REDUCED) l.ph += dt * 1.1;
        const [x, y] = pts(l.t), s = l.sprite;
        g.save(); g.translate(x, y); g.rotate(Math.sin(l.ph) * 0.05); g.globalAlpha = 0.95; g.drawImage(s.c, -s.cx, -s.top); g.restore();
      }
    }
    g.globalAlpha = 1;
    // straight from the board: the lanterns of squares just taken, rising over everything
    const fx = $('#fx').getContext('2d');
    fx.clearRect(0, 0, W, H);
    for (const l of this.rising) {
      const t = (now - l.t0) / 1000, y = l.y - (18 * t + 22 * t * t), x = l.x + Math.sin(l.ph + t * 1.4) * 10 * l.sway + t * 6 * l.sway;
      const a = clamp01(t * 3) * clamp01(1 - (t - 2.2) / 1.6), sc = (1 - clamp01(t / 4) * 0.5) * clamp01(0.4 + t * 2.5);
      draw(fx, sp.near[l.side], x, y, sc, a);
    }
    fx.globalAlpha = 1;
    this.rising = this.rising.filter(l => now - l.t0 < 3800);
  },
  /** stop moving while the page cannot be seen */
  pause(on) { this.live = !on; if (on) { cancelAnimationFrame(this.raf); this.raf = 0; } else { this.prev = performance.now(); this.wake(); } },
};
