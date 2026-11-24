/* ── The campaign's pictures: a chart of the Moon, a picture of each of its seas, and a likeness for everyone met there ──
   The places of the campaign are seas of the Moon, by the names they have on any map of it. Each has a picture of
   its own (SCENES), which stands behind the board when a game is played there, a colour for its people and a colour
   for its board (LOOK). The map is the Moon itself: the part a player has reached is in the light, the rest still
   in the dark. Until an opponent is given a picture, a cameo stands in for her: her outline against a moon. */
const World = (() => {
  /** her: the colour of a place's people, on cards and chips. deep: the dark of the same. field: the wash of its
   *  board, as PAL.field / fieldHi / fieldLo. stars: whether the twinkling stars are let out over its sky. at: where
   *  it lies on the Moon's face, east to the right and north up, the disc's radius being 1. tag: on which side of its
   *  mark on the map its name is written (t above, tl above and to the left, b below, r to the right). */
  const LOOK = {
    nectar:      { her: '#f2b56b', deep: '#7a3b2e', field: ['#9a4f3c', '#c0694a', '#6b2f28'], stars: false, at: [0.62, -0.3], tag: 'b' },
    tranquility: { her: '#7fd0bd', deep: '#134a52', field: ['#1b7273', '#2c958b', '#104f57'], stars: true, at: [0.45, 0.07], tag: 't' },
    dreams:      { her: '#b9a4ee', deep: '#33276b', field: ['#5a4396', '#7a61b8', '#3a2a6e'], stars: true, at: [0.25, 0.55], tag: 'r' },
    cold:        { her: '#9fe3e0', deep: '#0f3f52', field: ['#226a86', '#3690a6', '#12465e'], stars: true, at: [0.02, 0.85], tag: 'r' },
    clouds:      { her: '#f6c9a8', deep: '#5a4a86', field: ['#7a5a98', '#9a78b4', '#523a70'], stars: false, at: [-0.17, -0.4], tag: 'b' },
    showers:     { her: '#9db4ff', deep: '#17245e', field: ['#2c4f9a', '#4670bc', '#1b3470'], stars: true, at: [-0.29, 0.47], tag: 'b' },
    rainbows:    { her: '#8fe0b8', deep: '#14564a', field: ['#1f7f62', '#2fa57c', '#125444'], stars: false, at: [-0.46, 0.72], tag: 'tl' },
    storms:      { her: '#c9b6ff', deep: '#23203f', field: ['#6e2f52', '#93496f', '#481a36'], stars: false, at: [-0.79, 0.2], tag: 'b' },
  };
  const lookOf = scene => LOOK[scene] || LOOK.tranquility;

  /* ── what the pictures are made of ── */
  function wash(g, w, h, stops, rand, slant = -0.03) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    for (const [at, colour] of stops) grad.addColorStop(at, colour);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    brushOver(g, -40, 0, w + 80, h, rand, { count: Math.round(50 + h / 10), tall: 0.07, alpha: 0.11, pick: t => skyAt(stops, t), slant });
    texture(g, 'mottle', 0, 0, w, h, { alpha: 0.2, scale: Math.max(1.6, w / 420) });
  }
  function starsIn(g, w, h, rand, count, depth = 0.6, gold = 0.25) {
    for (let i = 0; i < count; i++) {
      const y = Math.pow(rand(), 1.6) * h * depth, x = rand() * w, far = 1 - y / (h * depth + 1), r = (0.4 + Math.pow(rand(), 3) * 1.2) * Math.max(0.8, Math.min(w, h) / 600);
      g.fillStyle = ink(rand() < gold ? PAL.goldHi : '#fdf8e8', (0.25 + rand() * 0.7) * clamp01(far + 0.2));
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }
  function sparkle(g, x, y, r, colour = PAL.goldHi, a = 0.9) {
    const halo = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
    halo.addColorStop(0, ink(colour, 0.34)); halo.addColorStop(1, ink(colour, 0));
    g.fillStyle = halo; g.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    starPath(g, x, y, r, 0.13, 0.62); g.fillStyle = ink('#fffdf2', a); g.fill();
  }
  function glow(g, x, y, r, colour, a = 0.6) {
    const s = g.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, ink(colour, a)); s.addColorStop(0.4, ink(colour, a * 0.35)); s.addColorStop(1, ink(colour, 0));
    g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /** a moon in the sky: lit: how much of it is light (1 full), the light coming from `from` (0: from the right) */
  function skyMoon(g, x, y, d, lit = 1, from = 0, halo = '#fff3cf') {
    glow(g, x, y, d * 1.9, halo, lit < 1 ? 0.3 : 0.42);
    const px = Math.max(48, Math.min(512, Math.round(d * 2))), face = paintFace(px, true, 6);
    if (lit >= 0.999) { g.drawImage(face, x - d / 2, y - d / 2, d, d); return; }
    g.save(); g.globalAlpha = 0.13; g.drawImage(face, x - d / 2, y - d / 2, d, d); g.restore();   // the rest of it, by earthlight
    g.save(); g.translate(x, y); g.rotate(from + Math.PI); phasePath(g, d * 0.5, lit); g.clip(); g.rotate(-from - Math.PI);
    g.drawImage(face, -d / 2, -d / 2, d, d); g.restore();
  }
  /** Water from `top` down: a wash from far to near, broad strokes along it, and under each light a path of glints.
   *  lights: [[x, colour, strength]] */
  function sea(g, w, h, top, far, near, rand, lights = [], calm = 1) {
    g.save(); g.beginPath(); g.rect(0, top, w, h - top); g.clip();
    const grad = g.createLinearGradient(0, top, 0, h);
    grad.addColorStop(0, far); grad.addColorStop(1, near);
    g.fillStyle = grad; g.fillRect(0, top, w, h - top);
    brushOver(g, -20, top, w + 40, h - top, rand, { count: Math.round(34 + w / 30), tall: 0.05 / calm, alpha: 0.16, pick: t => [far, near, clamp01(t + (rand() - 0.5) * 0.5)] });
    for (const [lx, colour, strength] of lights) {
      const n = Math.round(46 * strength);
      for (let i = 0; i < n; i++) {
        const t = Math.pow(rand(), 0.8), y = top + t * (h - top), spread = (h - top) * (0.05 + t * 0.34) * (0.6 + strength * 0.4), len = spread * (0.3 + rand() * 0.9);
        const x = lx + (rand() - 0.5) * spread * 2;
        g.fillStyle = ink(colour, (0.16 + rand() * 0.5) * (1 - t * 0.55));
        g.beginPath(); g.ellipse(x, y, len / 2, Math.max(0.7, (h - top) * 0.006 * (0.5 + t * 1.6)), 0, 0, TAU); g.fill();
      }
    }
    texture(g, 'streak', 0, top, w, h - top, { alpha: 0.18, scale: 2.2 });
    g.restore();
    // where sea meets sky: a line of haze
    const haze = g.createLinearGradient(0, top - h * 0.02, 0, top + h * 0.03);
    haze.addColorStop(0, ink('#ffffff', 0)); haze.addColorStop(0.5, ink('#ffffff', 0.2)); haze.addColorStop(1, ink('#ffffff', 0));
    g.fillStyle = haze; g.fillRect(0, top - h * 0.02, w, h * 0.05);
  }
  /** A line of hills or peaks standing on `base`: its outline wanders by a field of noise. peak: how tall, as a
   *  share of h; sharp: 0 rolling … 1 jagged. from, to: the stretch of the picture it covers (0…1). */
  function ridge(g, w, h, base, peak, colour, rand, { sharp = 0.3, from = 0, to = 1, lit = '', seed = 3, fall = 0.5 } = {}) {
    const n = 96, field = noiseField(n, 5, 4, seed * 53 + 7), pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = (from + t * (to - from)) * w, v = field[i % n], edge = Math.min(1, Math.min(t, 1 - t) / fall);
      const tall = (sharp ? lerp(v, Math.abs(v - 0.5) * 2, sharp) : v) * peak * h * smooth(clamp01(edge));
      pts.push([x, base - tall]);
    }
    const shape = new Path2D();
    shape.moveTo(pts[0][0], base + 2);
    for (const [x, y] of pts) shape.lineTo(x, y);
    shape.lineTo(pts[n][0], base + 2); shape.closePath();
    g.fillStyle = colour; g.fill(shape);
    if (lit) {   // the side the light falls on
      g.save(); g.clip(shape);
      const s = g.createLinearGradient(0, base - peak * h, 0, base);
      s.addColorStop(0, ink(lit, 0.7)); s.addColorStop(0.62, ink(lit, 0));
      g.fillStyle = s; g.fillRect(from * w, base - peak * h, (to - from) * w, peak * h);
      texture(g, 'streak', from * w, base - peak * h, (to - from) * w, peak * h + 4, { alpha: 0.25, scale: 1.4, angle: 1.1 });
      g.restore();
    }
    return pts;
  }
  const grain = (g, w, h) => texture(g, 'grain', 0, 0, w, h, { alpha: 0.2, mode: 'overlay', scale: 1 });

  /* ── the eight seas ── each paints a picture w × h (CSS pixels) that reads as wide as a banner and as tall as a phone */
  const SCENES = {
    /* the last of the afternoon over an orchard shore: warm water, blossom overhead */
    nectar(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.7;
      wash(g, w, h, [[0, '#453d86'], [0.26, '#8a5a9c'], [0.5, '#dc8478'], [0.66, '#f4b571'], [0.76, '#fde2a6'], [1, '#f6c07a']], rand);
      starsIn(g, w, h, rand, Math.round(w * h / 16000), 0.3);
      glow(g, w * 0.34, H, Math.max(w, h) * 0.5, '#fff0c0', 0.75);
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(w * 0.34, H - u * 0.045, u * 0.05, 0, TAU); g.fill();
      for (let i = 0; i < 4; i++) cloudStreak(g, rand() * w, H * (0.5 + rand() * 0.36), w * (0.22 + rand() * 0.22), u * 0.02, rand, i % 2 ? '#ffd9a8' : '#f2a78f', 0.34 + rand() * 0.2);
      ridge(g, w, h, H, 0.085, '#a0638f', rand, { seed: 11, from: 0.52, to: 1.06, lit: '#f6b98a' });
      ridge(g, w, h, H, 0.05, '#b97a92', rand, { seed: 12, from: -0.05, to: 0.3, lit: '#fbd0a0' });
      sea(g, w, h, H, '#f3c27a', '#b05f45', rand, [[w * 0.34, '#fff4cf', 1.2]]);
      // orchard boughs from both upper corners, in blossom
      for (const [x0, dir] of [[-u * 0.04, 1], [w + u * 0.04, -1]]) {
        const r2 = rngOf(dir > 0 ? 71 : 72);
        for (let b = 0; b < 4; b++) {
          let x = x0, y = h * (0.02 + b * 0.075) + r2() * u * 0.03, a = (dir > 0 ? 0.25 : Math.PI - 0.25) + (r2() - 0.5) * 0.5;
          const len = u * (0.28 + r2() * 0.3), steps = 9;
          for (let s = 0; s < steps; s++) {
            const nx = x + Math.cos(a) * len / steps, ny = y + Math.sin(a) * len / steps + u * 0.004 * s;
            handLine(g, x, y, nx, ny, '#4a2a3a', Math.max(1.2, u * 0.012 * (1 - s / steps)), r2, { wander: 1, step: 8 });
            for (let k = 0; k < 4 + s; k++) {
              const px = nx + (r2() - 0.5) * u * 0.09, py = ny + (r2() - 0.5) * u * 0.07, pr = u * (0.006 + r2() * 0.011);
              g.fillStyle = ink(r2() < 0.55 ? '#ffe9ee' : r2() < 0.5 ? '#ffc9d6' : '#fff7e2', 0.75 + r2() * 0.25);
              g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
            }
            x = nx; y = ny; a += (r2() - 0.5) * 0.5;
          }
        }
      }
      for (let i = 0; i < Math.round(w / 24); i++) {   // petals on the air
        const x = rand() * w, y = rand() * h * 0.86, r = u * (0.004 + rand() * 0.006);
        g.save(); g.translate(x, y); g.rotate(rand() * TAU); g.fillStyle = ink('#fff0f2', 0.5 + rand() * 0.4);
        g.beginPath(); g.ellipse(0, 0, r * 1.7, r, 0, 0, TAU); g.fill(); g.restore();
      }
    },
    /* dusk on flat water: the moon low, a long pier with its lamps lit early */
    tranquility(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.68;
      wash(g, w, h, [[0, '#13244f'], [0.3, '#2a437f'], [0.52, '#6470a8'], [0.64, '#c79aa6'], [0.7, '#f3c093'], [1, '#2c958b']], rand);
      starsIn(g, w, h, rand, Math.round(w * h / 7000), 0.5);
      for (let i = 0; i < 5; i++) sparkle(g, (i + 0.2 + rand() * 0.6) / 5 * w, (0.05 + rand() * 0.32) * h, u * (0.008 + rand() * 0.009));
      const mx = w * 0.7, my = H - u * 0.17;
      skyMoon(g, mx, my, u * 0.21, 1, 0);
      for (let i = 0; i < 4; i++) cloudStreak(g, rand() * w, H * (0.6 + rand() * 0.32), w * (0.2 + rand() * 0.25), u * 0.016, rand, i % 2 ? '#f6c9a4' : '#b9a0c6', 0.3 + rand() * 0.2);
      ridge(g, w, h, H, 0.04, '#3c3f7c', rand, { seed: 21, from: 0.3, to: 1.05 });
      sea(g, w, h, H, '#3fa093', '#0e4650', rand, [[mx, '#fff3cf', 1.3]], 1.6);
      // the pier, out from the left, and its lamps
      const py = H + (h - H) * 0.3, end = w * 0.5;
      g.fillStyle = '#0c1c3a'; g.fillRect(-2, py, end, Math.max(2.5, u * 0.012));
      for (let x = w * 0.03; x < end; x += u * 0.085) {
        g.fillRect(x, py, Math.max(1.5, u * 0.006), (h - py) * (0.3 + 0.2 * rand()));
        if (Math.round(x / (u * 0.085)) % 2 === 0) {
          const top = py - u * 0.075;
          g.fillRect(x, top, Math.max(1.2, u * 0.004), py - top);
          glow(g, x + 1, top, u * 0.07, '#ffd98a', 0.85); g.fillStyle = '#fff3c9'; g.beginPath(); g.arc(x + 1, top, u * 0.008, 0, TAU); g.fill(); g.fillStyle = '#0c1c3a';
          for (let k = 0; k < 7; k++) { g.fillStyle = ink('#ffd98a', 0.4 * rand() + 0.12); g.beginPath(); g.ellipse(x + (rand() - 0.5) * u * 0.02, py + u * 0.03 + k * u * 0.014, u * 0.012, u * 0.003, 0, 0, TAU); g.fill(); }
          g.fillStyle = '#0c1c3a';
        }
      }
    },
    /* night on a lake under mist: lights drifting up off the water, a young moon */
    dreams(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.66;
      wash(g, w, h, [[0, '#121642'], [0.3, '#26286e'], [0.52, '#4b3f94'], [0.66, '#8a70b6'], [0.7, '#b79cc8'], [1, '#1c1b55']], rand);
      starsIn(g, w, h, rand, Math.round(w * h / 5200), 0.6, 0.15);
      for (let i = 0; i < 6; i++) sparkle(g, (i + 0.2 + rand() * 0.6) / 6 * w, (0.04 + rand() * 0.4) * h, u * (0.007 + rand() * 0.009), '#e7dcff');
      skyMoon(g, w * 0.24, h * 0.2, u * 0.13, 0.26, 0, '#d9ccff');
      ridge(g, w, h, H, 0.06, '#2a2466', rand, { seed: 31, from: -0.05, to: 0.5 });
      ridge(g, w, h, H, 0.09, '#241f5c', rand, { seed: 32, from: 0.45, to: 1.05, sharp: 0.2 });
      for (let i = 0; i < 9; i++) { const x = w * (0.5 + rand() * 0.48), y = H - h * (0.008 + rand() * 0.05); g.fillStyle = ink('#ffe7a8', 0.75); g.fillRect(x, y, Math.max(1, u * 0.004), Math.max(1, u * 0.005)); }   // windows on the far shore
      sea(g, w, h, H, '#5b4fa6', '#141446', rand, [[w * 0.24, '#d9ccff', 0.5]], 1.4);
      for (let i = 0; i < 6; i++) {   // mist, lying in bands
        const y = H + (rand() - 0.35) * h * 0.1, x = rand() * w, len = w * (0.35 + rand() * 0.5), fade = g.createLinearGradient(x - len / 2, 0, x + len / 2, 0);
        fade.addColorStop(0, ink('#e9defa', 0)); fade.addColorStop(0.5, ink('#e9defa', 0.24 + rand() * 0.14)); fade.addColorStop(1, ink('#e9defa', 0));
        g.fillStyle = fade; g.beginPath(); g.ellipse(x, y, len / 2, h * (0.012 + rand() * 0.02), 0, 0, TAU); g.fill();
      }
      const n = Math.round(10 + w / 46);   // the lights: each with its glow, and its glint on the water below
      for (let i = 0; i < n; i++) {
        const x = rand() * w, lift = Math.pow(rand(), 1.3), y = H + h * 0.05 - lift * h * 0.5, r = u * (0.006 + rand() * 0.012) * (1.3 - lift * 0.6), c = rand() < 0.7 ? '#ffe9b0' : '#f6d0ff';
        glow(g, x, y, r * 7, c, 0.6); g.fillStyle = ink('#fffbe8', 0.95); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        if (lift < 0.5) { g.fillStyle = ink(c, 0.3); g.beginPath(); g.ellipse(x, H + (h - H) * (0.1 + lift * 0.7), r * 2.2, r * 0.5, 0, 0, TAU); g.fill(); }
      }
    },
    /* the far north: ice on dark water, peaks in snow, and the sky alight */
    cold(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.7;
      wash(g, w, h, [[0, '#061426'], [0.34, '#0b2c46'], [0.58, '#16566a'], [0.7, '#7fc4c0'], [0.72, '#bfe9df'], [1, '#0b3148']], rand);
      starsIn(g, w, h, rand, Math.round(w * h / 4200), 0.62, 0.1);
      // the aurora: curtains hung along a slow wave, each a fall of thin upright rays, brightest along its lower hem
      g.save(); g.globalCompositeOperation = 'screen';
      for (const [y0, amp, colour, tall, a] of [[0.36, 0.07, '#5dffa8', 0.36, 0.55], [0.25, 0.05, '#4fe6d6', 0.27, 0.4], [0.42, 0.04, '#c58cff', 0.2, 0.24]]) {
        const ph = rand() * TAU, k = 1.1 + rand() * 0.8, step = Math.max(2, u * 0.005);
        for (let x = -10; x < w + 10; x += step) {
          const t = x / w, y = h * (y0 + amp * Math.sin(t * TAU * k + ph) + amp * 0.45 * Math.sin(t * TAU * k * 2.3 + ph * 2));
          const fold = 0.3 + 0.7 * Math.pow(Math.sin(t * 23 + ph) * 0.5 + 0.5, 2) * (0.6 + 0.4 * Math.sin(t * 71 + ph * 3)), len = h * tall * (0.5 + 0.5 * fold);
          const ray = g.createLinearGradient(0, y - len, 0, y + len * 0.12);
          ray.addColorStop(0, ink(colour, 0)); ray.addColorStop(0.8, ink(colour, a * fold)); ray.addColorStop(0.93, ink('#eafff4', a * fold * 0.85)); ray.addColorStop(1, ink(colour, 0));
          g.fillStyle = ray; g.fillRect(x, y - len, step + 0.6, len * 1.12);
        }
      }
      g.restore();
      for (let i = 0; i < 5; i++) sparkle(g, (i + 0.2 + rand() * 0.6) / 5 * w, (0.04 + rand() * 0.3) * h, u * (0.007 + rand() * 0.008), '#e6fff6');
      ridge(g, w, h, H, 0.2, '#3a6f8e', rand, { seed: 41, sharp: 0.78, from: -0.05, to: 0.62, lit: '#f4ffff' });
      ridge(g, w, h, H, 0.14, '#4a86a2', rand, { seed: 42, sharp: 0.72, from: 0.5, to: 1.06, lit: '#f8ffff' });
      sea(g, w, h, H, '#2b7d8c', '#061c30', rand, [[w * 0.46, '#8dffc9', 0.45]]);
      const r2 = rngOf(47);   // floes: the near ones large
      for (let i = 0; i < Math.round(7 + w / 90); i++) {
        const t = Math.pow(r2(), 0.75), y = H + (h - H) * (0.08 + t * 0.9), fw = u * (0.035 + t * 0.2) * (0.6 + r2()), fh = fw * (0.14 + r2() * 0.08), x = r2() * w;
        g.fillStyle = '#0a2a40'; g.beginPath(); g.ellipse(x + fw * 0.03, y + fh * 0.55, fw * 0.52, fh * 0.6, 0, 0, TAU); g.fill();
        g.beginPath();
        for (let k = 0; k <= 9; k++) { const a = k / 9 * TAU, rr = 0.82 + r2() * 0.3; if (k) g.lineTo(x + Math.cos(a) * fw * 0.5 * rr, y + Math.sin(a) * fh * 0.5 * rr); else g.moveTo(x + fw * 0.5 * rr, y); }
        g.closePath(); g.fillStyle = tone('#e9fbfb', '#a9dce0', r2() * 0.6); g.fill();
      }
    },
    /* above the weather at first light: a sea of cloud, peaks standing out of it, balloons riding over */
    clouds(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.6;
      wash(g, w, h, [[0, '#2f4f9a'], [0.3, '#6f95cf'], [0.5, '#b7c3de'], [0.62, '#f6cba6'], [0.7, '#ffe9c4'], [1, '#e9b6a6']], rand);
      glow(g, w * 0.72, H, Math.max(w, h) * 0.55, '#fff3c4', 0.8);
      g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(w * 0.72, H - u * 0.02, u * 0.045, 0, TAU); g.fill();
      for (let i = 0; i < 5; i++) cloudStreak(g, rand() * w, h * (0.14 + rand() * 0.36), w * (0.24 + rand() * 0.3), u * 0.016, rand, i % 2 ? '#fff0da' : '#f6c7ae', 0.4 + rand() * 0.25);
      ridge(g, w, h, H + h * 0.06, 0.3, '#5a5290', rand, { seed: 51, sharp: 0.85, from: 0.02, to: 0.36, lit: '#ffd9b0', fall: 0.42 });
      ridge(g, w, h, H + h * 0.08, 0.2, '#6c629c', rand, { seed: 52, sharp: 0.85, from: 0.5, to: 0.86, lit: '#ffe2bc', fall: 0.42 });
      const cu = Math.max(24, u * 0.085);
      cloudBank(g, w, h, H, cu * 0.9, rand, '#fff6e0', '#f0cfc0', '#c9a9c2');
      cloudBank(g, w, h, H + (h - H) * 0.3, cu * 1.3, rand, '#fff1d6', '#e3b9c0', '#a78bb8');
      cloudBank(g, w, h, H + (h - H) * 0.64, cu * 1.8, rand, '#ffe6cc', '#c99ab8', '#7d6aa6');
      const r2 = rngOf(57);   // balloons
      for (let i = 0; i < 4; i++) {
        const x = w * (0.12 + i * 0.22 + r2() * 0.1), y = h * (0.16 + r2() * 0.3), r = u * (0.022 + r2() * 0.03), c = ['#d9645a', '#f0b040', '#5a6fc0', '#e88aa0'][i];
        g.strokeStyle = 'rgba(60,50,90,.6)'; g.lineWidth = Math.max(0.7, r * 0.05); g.beginPath(); g.moveTo(x - r * 0.5, y + r * 0.8); g.lineTo(x - r * 0.16, y + r * 1.7); g.moveTo(x + r * 0.5, y + r * 0.8); g.lineTo(x + r * 0.16, y + r * 1.7); g.stroke();
        g.fillStyle = '#4a3a5a'; g.fillRect(x - r * 0.2, y + r * 1.7, r * 0.4, r * 0.3);
        g.beginPath(); g.moveTo(x, y + r * 1.25); g.bezierCurveTo(x - r * 1.5, y + r * 0.2, x - r * 1.05, y - r * 1.1, x, y - r * 1.1); g.bezierCurveTo(x + r * 1.05, y - r * 1.1, x + r * 1.5, y + r * 0.2, x, y + r * 1.25); g.closePath();
        const sh = g.createLinearGradient(x - r, y, x + r, y); sh.addColorStop(0, tone(c, '#402050', 0.35)); sh.addColorStop(0.55, c); sh.addColorStop(1, tone(c, '#fff3d0', 0.45));
        g.fillStyle = sh; g.fill();
        g.strokeStyle = 'rgba(255,246,220,.5)'; g.lineWidth = Math.max(0.7, r * 0.07); g.beginPath(); g.ellipse(x, y, r * 0.42, r * 1.12, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
      }
    },
    /* a clear night on the ridge: stars falling in their dozens, the observatory dark against them */
    showers(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.72;
      wash(g, w, h, [[0, '#060a26'], [0.34, '#0f1a4c'], [0.6, '#1c2c6e'], [0.72, '#3d4690'], [0.74, '#5a5fa6'], [1, '#0a1238']], rand);
      starsIn(g, w, h, rand, Math.round(w * h / 2600), 0.7, 0.2);
      for (let i = 0; i < 7; i++) sparkle(g, (i + 0.2 + rand() * 0.6) / 7 * w, (0.04 + rand() * 0.44) * h, u * (0.007 + rand() * 0.009));
      // every one of them falls away from one point of the sky
      const rx = w * 0.82, ry = -h * 0.12, n = Math.round(13 + w / 70);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.56 + rand() * 0.36), d0 = u * (0.25 + rand() * 1.1), len = u * (0.08 + rand() * 0.22), x1 = rx + Math.cos(a) * d0, y1 = ry + Math.sin(a) * d0, x2 = x1 + Math.cos(a) * len, y2 = y1 + Math.sin(a) * len;
        if (y2 > H - h * 0.03) continue;
        const trail = g.createLinearGradient(x1, y1, x2, y2), warm = rand() < 0.4;
        trail.addColorStop(0, ink('#ffffff', 0)); trail.addColorStop(0.75, ink(warm ? '#ffd9a0' : '#cfe0ff', 0.6)); trail.addColorStop(1, ink('#ffffff', 0.95));
        g.strokeStyle = trail; g.lineWidth = Math.max(1, u * (0.0025 + rand() * 0.003)); g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        glow(g, x2, y2, u * 0.02, warm ? '#ffcf8a' : '#dfeaff', 0.8);
      }
      const pts = ridge(g, w, h, H, 0.12, '#0b1034', rand, { seed: 61, sharp: 0.35 });
      const at = pts[Math.round(pts.length * 0.26)], dr = u * 0.045;   // the dome on the ridge, its slit open
      g.fillStyle = '#0b1034'; g.fillRect(at[0] - dr, at[1] - dr * 0.5, dr * 2, dr * 1.2); g.beginPath(); g.arc(at[0], at[1] - dr * 0.5, dr, Math.PI, 0); g.fill();
      g.fillStyle = '#ffd98a'; g.beginPath(); g.moveTo(at[0] + dr * 0.1, at[1] - dr * 0.5); g.arc(at[0], at[1] - dr * 0.5, dr * 0.96, -Math.PI * 0.42, -Math.PI * 0.3); g.closePath(); g.fill();
      sea(g, w, h, H, '#27337c', '#060a26', rand, [[w * 0.5, '#cfe0ff', 0.35]]);
    },
    /* after rain over a round bay: the bow standing in the last of the shower, cliffs either side */
    rainbows(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.68;
      wash(g, w, h, [[0, '#28407e'], [0.3, '#3f78a8'], [0.52, '#7fc3c8'], [0.66, '#d6f0d8'], [0.7, '#fdf3cc'], [1, '#2a9a94']], rand);
      glow(g, w * 0.2, H, Math.max(w, h) * 0.5, '#fff6cc', 0.7);
      // the shower still falling on the far side
      g.save(); g.globalAlpha = 0.22; g.strokeStyle = '#eaf6ff'; g.lineWidth = Math.max(0.8, u * 0.002);
      for (let i = 0; i < Math.round(w / 6); i++) { const x = w * (0.55 + rand() * 0.5), y = rand() * H, l = u * (0.03 + rand() * 0.05); g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.28, y + l); g.stroke(); }
      g.restore();
      for (let i = 0; i < 4; i++) cloudStreak(g, w * (0.4 + rand() * 0.6), h * (0.06 + rand() * 0.24), w * (0.3 + rand() * 0.3), u * 0.04, rand, '#5f7fa8', 0.34 + rand() * 0.2);
      // the bow: seven bands, and a fainter second one outside it the other way round
      const cx = w * 0.56, cy = H + u * 0.06, R = Math.min(Math.max(w * 0.4, u * 0.62), H * 0.94), band = R * 0.022, hues = ['#e66a6a', '#f0a04e', '#f2d862', '#7fd07a', '#58b8d8', '#5a78d6', '#9a70d0'];
      g.save(); g.beginPath(); g.rect(0, 0, w, H); g.clip();
      hues.forEach((c, i) => { g.strokeStyle = ink(c, 0.62); g.lineWidth = band * 1.12; g.beginPath(); g.arc(cx, cy, R - i * band, Math.PI, TAU); g.stroke(); });
      hues.forEach((c, i) => { g.strokeStyle = ink(c, 0.2); g.lineWidth = band * 1.3; g.beginPath(); g.arc(cx, cy, R * 1.2 + i * band * 1.2, Math.PI, TAU); g.stroke(); });
      texture(g, 'streak', 0, 0, w, H, { alpha: 0.2, scale: 1.6, angle: 0.4 });
      g.restore();
      ridge(g, w, h, H, 0.2, '#2f5d6e', rand, { seed: 71, sharp: 0.5, from: -0.08, to: 0.3, lit: '#fff0c0', fall: 0.7 });
      ridge(g, w, h, H, 0.15, '#3b7080', rand, { seed: 72, sharp: 0.45, from: 0.74, to: 1.08, lit: '#d8f4e4', fall: 0.7 });
      sea(g, w, h, H, '#9fe0cf', '#177f86', rand, [[w * 0.2, '#fff8d8', 1], [cx - R * 0.8, '#f2d862', 0.3], [cx + R * 0.82, '#e66a6a', 0.25]], 1.3);
    },
    /* the weather that never lifts: black cloud, a fork of lightning, a big sea, and one light kept burning */
    storms(g, w, h, rand) {
      const u = Math.min(w, h), H = h * 0.66;
      wash(g, w, h, [[0, '#0a0b1c'], [0.3, '#191b38'], [0.52, '#2c2d54'], [0.64, '#54508a'], [0.68, '#8a82c0'], [1, '#12142c']], rand, 0.06);
      // cloud: heavy masses from the top, torn underneath
      const n = 128, field = noiseField(n, 4, 5, 83), pic = canvasOf(n, n), pg = pic.getContext('2d'), img = pg.createImageData(n, n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = clamp01((field[y * n + x] - 0.34 - (y / n) * 0.34) / 0.2), i = (y * n + x) * 4, shade = 0.5 + field[(y * n + ((x + 9) % n))] * 0.5;
        img.data[i] = 22 * shade + 16; img.data[i + 1] = 22 * shade + 16; img.data[i + 2] = 48 * shade + 28; img.data[i + 3] = Math.round(smooth(v) * 240);
      }
      pg.putImageData(img, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(pic, -w * 0.05, -h * 0.04, w * 1.1, H * 1.12);
      // lightning: a main stroke and its branches
      const bolt = (x, y, len, a, width, depth) => {
        let px = x, py = y; const steps = 8 + Math.floor(rand() * 5);
        for (let s = 0; s < steps; s++) {
          const nx = px + Math.cos(a) * len / steps + (rand() - 0.5) * len * 0.11, ny = py + Math.sin(a) * len / steps;
          g.strokeStyle = 'rgba(203,188,255,.3)'; g.lineWidth = width * 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
          g.strokeStyle = '#fbf8ff'; g.lineWidth = width; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
          if (depth && rand() < 0.3) bolt(nx, ny, len * (0.2 + rand() * 0.25), a + (rand() < 0.5 ? -1 : 1) * (0.4 + rand() * 0.5), width * 0.55, depth - 1);
          px = nx; py = ny; width *= 0.94;
        }
      };
      const bx = w * 0.3, by = h * 0.1;
      glow(g, bx, by + H * 0.3, Math.max(w, h) * 0.42, '#b9a7ff', 0.4);
      bolt(bx, by, H * 0.78, Math.PI * 0.53, Math.max(1.2, u * 0.006), 2);
      bolt(w * 0.86, h * 0.06, H * 0.4, Math.PI * 0.6, Math.max(0.9, u * 0.0035), 1);
      // the sea: swells in rows, each with foam along its crest
      g.fillStyle = '#12142c'; g.fillRect(0, H, w, h - H);
      for (let row = 0; row < 7; row++) {
        const t = row / 6, y = H + (h - H) * (0.02 + t * 0.92), amp = u * (0.012 + t * 0.045), len = u * (0.22 + t * 0.5), ph = rand() * TAU, body = tone('#3a3d6c', '#0c0e24', t * 0.8);
        g.beginPath(); g.moveTo(-10, h + 10);
        for (let x = -10; x <= w + 10; x += 6) g.lineTo(x, y + Math.sin(x / len * TAU + ph) * amp + Math.sin(x / len * TAU * 2.7 + ph * 1.7) * amp * 0.3);
        g.lineTo(w + 10, h + 10); g.closePath(); g.fillStyle = body; g.fill();
        g.strokeStyle = ink('#d9d2ff', 0.2 + t * 0.4); g.lineWidth = Math.max(0.8, u * (0.0018 + t * 0.004));
        for (let x = -10; x <= w + 10; x += len) {
          const x0 = x + (len / TAU) * (Math.PI / 2 - ph % TAU) % len;
          g.beginPath(); for (let k = -0.16; k <= 0.16; k += 0.02) { const xx = x0 + k * len, yy = y + Math.sin(xx / len * TAU + ph) * amp + Math.sin(xx / len * TAU * 2.7 + ph * 1.7) * amp * 0.3 - 1; if (k === -0.16) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
          g.stroke();
        }
      }
      // the last light, on its rock, and its beam
      const lx = w * 0.8, ly = H + (h - H) * 0.08, lh = u * 0.2, lw = u * 0.026;
      g.fillStyle = '#0a0b1c'; g.beginPath(); g.ellipse(lx, ly + u * 0.012, u * 0.1, u * 0.03, 0, Math.PI, 0); g.fill();
      const beam = g.createLinearGradient(lx, 0, lx - w * 0.6, 0); beam.addColorStop(0, 'rgba(255,240,190,.5)'); beam.addColorStop(1, 'rgba(255,240,190,0)');
      g.fillStyle = beam; g.beginPath(); g.moveTo(lx, ly - lh); g.lineTo(lx - w * 0.62, ly - lh - u * 0.1); g.lineTo(lx - w * 0.62, ly - lh + u * 0.08); g.closePath(); g.fill();
      g.fillStyle = '#e9e4f6'; g.beginPath(); g.moveTo(lx - lw, ly); g.lineTo(lx - lw * 0.62, ly - lh); g.lineTo(lx + lw * 0.62, ly - lh); g.lineTo(lx + lw, ly); g.closePath(); g.fill();
      g.fillStyle = '#8a3040'; for (const k of [0.25, 0.62]) { g.beginPath(); const a = lerp(lw, lw * 0.62, k), b = lerp(lw, lw * 0.62, k + 0.16); g.moveTo(lx - a, ly - lh * k); g.lineTo(lx - b, ly - lh * (k + 0.16)); g.lineTo(lx + b, ly - lh * (k + 0.16)); g.lineTo(lx + a, ly - lh * k); g.closePath(); g.fill(); }
      g.fillStyle = '#1a1a34'; g.fillRect(lx - lw * 0.8, ly - lh - lw * 0.9, lw * 1.6, lw * 0.9); g.beginPath(); g.moveTo(lx - lw * 0.9, ly - lh - lw * 0.9); g.lineTo(lx, ly - lh - lw * 1.9); g.lineTo(lx + lw * 0.9, ly - lh - lw * 0.9); g.closePath(); g.fill();
      glow(g, lx, ly - lh - lw * 0.45, u * 0.09, '#fff0b8', 0.95); g.fillStyle = '#fff8dc'; g.fillRect(lx - lw * 0.5, ly - lh - lw * 0.75, lw, lw * 0.6);
      // rain, driven across everything
      g.save(); g.globalAlpha = 0.16; g.strokeStyle = '#dcd6ff'; g.lineWidth = Math.max(0.7, u * 0.0016);
      for (let i = 0; i < Math.round(w * h / 2600); i++) { const x = rand() * w * 1.1, y = rand() * h, l = u * (0.02 + rand() * 0.035); g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.45, y + l); g.stroke(); }
      g.restore();
    },
  };
  /** The picture of a place, painted onto a canvas w × h (CSS pixels). The same place at the same size is painted once
   *  and kept. */
  const kept = new Map(), KEEP_PX = 14e6;
  function scene(canvas, id, w, h, dpr = 1) {
    const key = `${id}:${Math.round(w)}x${Math.round(h)}@${dpr}`;
    let pic = kept.get(key);
    if (pic) { kept.delete(key); kept.set(key, pic); }                       // the one looked at last is the last to go
    else {
      pic = canvasOf(w * dpr, h * dpr);
      const g = pic.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      (SCENES[id] || SCENES.tranquility)(g, w, h, rngOf(1883 + id.length * 97 + id.charCodeAt(0)));
      grain(g, w, h);
      kept.set(key, pic);
      let held = 0; for (const p of kept.values()) held += p.width * p.height;
      for (const [k, p] of kept) { if (held <= KEEP_PX || k === key) break; held -= p.width * p.height; kept.delete(k); }
    }
    canvas.width = pic.width; canvas.height = pic.height; canvas.getContext('2d').drawImage(pic, 0, 0);
  }

  /* ── the map: the Moon's face as an old chart has it, and the light that has reached across it ── */
  /* the seas, as blots of wash: [x, y, rx, ry, turn]; the first of each group is the one the campaign goes to */
  const MARIA = [
    [0.57, -0.27, 0.13, 0.12, 0], [0.5, 0.12, 0.2, 0.15, -0.5], [0.74, -0.12, 0.13, 0.19, 0.2], [0.8, 0.28, 0.1, 0.13, 0.3],   // Nectaris, Tranquillitatis, Fecunditatis, Crisium
    [0.27, 0.46, 0.17, 0.16, 0], [0.36, 0.63, 0.1, 0.05, -0.5], [0.06, 0.22, 0.07, 0.06, 0],                                    // Serenitatis, Somniorum, Vaporum
    [0, 0.84, 0.48, 0.045, 0], [-0.24, 0.52, 0.27, 0.23, 0], [-0.4, 0.71, 0.08, 0.06, 0.6],                                     // Frigoris, Imbrium, Iridum
    [-0.22, -0.36, 0.2, 0.15, 0.3], [-0.55, -0.41, 0.1, 0.1, 0], [-0.4, -0.17, 0.13, 0.1, 0],                                   // Nubium, Humorum, Cognitum
    [-0.7, 0.24, 0.24, 0.42, 0.25], [-0.5, 0.05, 0.2, 0.2, 0],                                                                  // Procellarum
  ];
  const CRATERS = [[-0.144, -0.686, 0.035, 1], [-0.339, 0.167, 0.03, 0.6], [-0.61, 0.141, 0.018, 0.5], [-0.674, 0.402, 0.016, 0.7], [-0.101, 0.784, 0.03, 0], [0.34, -0.55, 0.03, 0], [0.1, -0.8, 0.04, 0], [0.62, 0.52, 0.025, 0], [-0.05, -0.2, 0.028, 0], [0.2, -0.3, 0.02, 0]];
  const Chart = {
    base: null, size: 0, way: [],
    /** the places in the order they are crossed: a dotted road is drawn from each to the next */
    road(scenes) { this.way = scenes; this.base = null; },
    /** the whole face in the light: painted once for a size */
    face(px) {
      if (this.base && this.size === px) return this.base;
      const c = canvasOf(px, px), g = c.getContext('2d'), R = px * 0.5, rand = rngOf(1651), r = R * 0.985;
      g.save(); handCircle(g, R, R, r, rand, 0.003); g.clip();
      const body = g.createRadialGradient(R * 1.3, R * 0.7, r * 0.1, R, R, r * 1.15);
      body.addColorStop(0, '#fffaea'); body.addColorStop(0.55, '#f1e6c8'); body.addColorStop(1, '#cdbb92');
      g.fillStyle = body; g.fillRect(0, 0, px, px);
      texture(g, 'mottle', 0, 0, px, px, { alpha: 0.5, scale: Math.max(1, px / 300) });
      // the seas: each a blot of wash with an edge that wanders, laid on in thin coats so that it has no hard rim
      MARIA.forEach(([x, y, rx, ry, turn], n) => {
        const rr = rngOf(311 + n * 17), k = [2 + Math.floor(rr() * 2), 4 + Math.floor(rr() * 3), 7 + Math.floor(rr() * 4)], ph = [rr() * TAU, rr() * TAU, rr() * TAU];
        g.save(); g.translate(R + x * r, R - y * r); g.rotate(-turn);
        for (const [grow, a] of [[1.15, 0.09], [1.08, 0.13], [1.01, 0.19], [0.93, 0.2], [0.82, 0.18], [0.66, 0.14]]) {
          g.beginPath();
          for (let i = 0; i <= 96; i++) {
            const an = i / 96 * TAU, wob = 1 + 0.1 * Math.sin(an * k[0] + ph[0]) + 0.06 * Math.sin(an * k[1] + ph[1]) + 0.035 * Math.sin(an * k[2] + ph[2]);
            const px2 = Math.cos(an) * rx * r * grow * wob, py2 = Math.sin(an) * ry * r * grow * wob;
            if (i) g.lineTo(px2, py2); else g.moveTo(px2, py2);
          }
          g.closePath(); g.fillStyle = ink('#66768f', a); g.fill();
        }
        g.restore();
      });
      texture(g, 'streak', 0, 0, px, px, { alpha: 0.2, scale: Math.max(0.8, px / 360), angle: 0.5 });
      // the bright craters and their rays, then the ordinary ones
      for (const [x, y, cr, rays] of CRATERS) {
        const cx = R + x * r, cy = R - y * r, rr = cr * r;
        if (rays) for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + rand(), len = rr * (5 + rand() * 9) * rays; handLine(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(a) * len, cy + Math.sin(a) * len, 'rgba(255,252,238,.4)', Math.max(1, rr * 0.4), rand, { wander: 1.2, step: 9 }); }
        g.fillStyle = rays ? 'rgba(255,253,244,.95)' : 'rgba(120,112,98,.22)'; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(96,84,60,.55)'; g.lineWidth = Math.max(0.8, rr * 0.16); g.beginPath(); g.arc(cx, cy, rr, Math.PI * 0.1, Math.PI * 1.1); g.stroke();
        g.strokeStyle = 'rgba(255,254,246,.8)'; g.beginPath(); g.arc(cx, cy, rr, Math.PI * 1.15, Math.PI * 1.95); g.stroke();
      }
      for (let i = 0; i < 70; i++) { const a = rand() * TAU, d = Math.sqrt(rand()) * r * 0.96, cr = r * (0.004 + rand() * 0.012); g.strokeStyle = 'rgba(96,84,60,.34)'; g.lineWidth = Math.max(0.6, cr * 0.3); g.beginPath(); g.arc(R + Math.cos(a) * d, R + Math.sin(a) * d, cr, 0, TAU); g.stroke(); }
      // the road: dots of ink from each place to the next, each stretch bowed a little as a pen would draw it
      for (let i = 1; i < this.way.length; i++) {
        const [ax, ay] = lookOf(this.way[i - 1]).at, [bx, by] = lookOf(this.way[i]).at, x1 = R + ax * r, y1 = R - ay * r, x2 = R + bx * r, y2 = R - by * r;
        const len = Math.hypot(x2 - x1, y2 - y1), bow = len * 0.12 * (i % 2 ? 1 : -1), mx = (x1 + x2) / 2 - (y2 - y1) / len * bow, my = (y1 + y2) / 2 + (x2 - x1) / len * bow, n = Math.max(3, Math.round(len / (r * 0.034)));
        for (let k = 1; k < n; k++) {
          const t = k / n, x = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * mx + t * t * x2, y = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * my + t * t * y2;
          if (Math.min(Math.hypot(x - x1, y - y1), Math.hypot(x - x2, y - y2)) < r * 0.075) continue;   // the mark of a place stands at each end
          g.fillStyle = 'rgba(108,66,30,.62)'; g.beginPath(); g.arc(x + (rand() - 0.5) * r * 0.004, y + (rand() - 0.5) * r * 0.004, Math.max(1, r * 0.0062), 0, TAU); g.fill();
        }
      }
      const limb = g.createRadialGradient(R, R, r * 0.62, R, R, r * 1.02);
      limb.addColorStop(0, 'rgba(110,86,44,0)'); limb.addColorStop(1, 'rgba(110,86,44,.42)');
      g.fillStyle = limb; g.fillRect(0, 0, px, px);
      texture(g, 'grain', 0, 0, px, px, { alpha: 0.28, mode: 'overlay', scale: Math.max(0.6, px / 500) });
      g.restore();
      g.strokeStyle = 'rgba(126,100,52,.7)'; g.lineWidth = Math.max(1, R * 0.008); handCircle(g, R, R, r, rngOf(1651), 0.003); g.stroke();
      this.base = c; this.size = px;
      return c;
    },
    /** The map on a canvas `size` across (CSS pixels): the face, and over it the dark as far as `edge` has it.
     *  edge: 1 the whole face dark … −1 the whole face lit; the light comes on from the east. */
    paint(canvas, size, dpr, edge) {
      const px = Math.round(size * dpr);
      if (canvas.width !== px || canvas.height !== px) { canvas.width = px; canvas.height = px; }
      const g = canvas.getContext('2d'), c = px / 2, D = Math.round(px * 0.88), R = D / 2;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, px, px);
      const halo = g.createRadialGradient(c, c, R * 0.92, c, c, px * 0.5);
      halo.addColorStop(0, 'rgba(255,244,214,.34)'); halo.addColorStop(0.5, 'rgba(255,244,214,.09)'); halo.addColorStop(1, 'rgba(255,244,214,0)');
      g.fillStyle = halo; g.fillRect(0, 0, px, px);
      // the ring an old chart sets its moon in: a tick to every five degrees, a longer one to every thirty, a star at each quarter
      g.strokeStyle = 'rgba(232,195,111,.5)'; g.lineWidth = Math.max(1, px * 0.0016);
      g.beginPath(); g.arc(c, c, R * 1.062, 0, TAU); g.stroke();
      for (let k = 0; k < 72; k++) {
        const a = k / 72 * TAU, long = k % 6 === 0, r1 = R * 1.062, r2 = R * (long ? 1.1 : 1.08);
        if (k % 18 === 0) { starPath(g, c + Math.cos(a) * R * 1.098, c + Math.sin(a) * R * 1.098, R * 0.03, 0.3, 1); g.fillStyle = 'rgba(251,230,168,.9)'; g.fill(); continue; }
        g.strokeStyle = `rgba(232,195,111,${long ? 0.75 : 0.42})`; g.beginPath(); g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2); g.stroke();
      }
      g.drawImage(this.face(D), c - R, c - R);
      if (edge > -0.999) {
        g.save(); g.translate(c, c);
        // the dark, laid on in thin coats so that its edge is soft, all of it on the far side of the edge: the Moon's own
        // night, lit a little by the Earth, with the seas still to be made out in it
        for (const [off, a] of [[0, 0.2], [-0.012, 0.2], [-0.024, 0.22], [-0.036, 0.24], [-0.048, 0.26], [-0.06, 0.28]]) {
          const e = Math.max(-1, Math.min(1, edge + off));
          phasePath(g, R * 0.986, Math.acos(-e) / Math.PI);
          g.fillStyle = `rgba(16,23,66,${a})`; g.fill();
        }
        g.restore();
      }
    },
    /** where a place stands on a map `size` across: [x, y] from its top left */
    spot(scene, size) { const [x, y] = lookOf(scene).at, R = size * 0.88 / 2 * 0.985; return [size / 2 + x * R, size / 2 - y * R]; },
    /** how far east or west a place lies, as the edge of the light counts it */
    reach(scene) { const [x, y] = lookOf(scene).at; return x / Math.sqrt(1 - y * y); },
  };

  /* ── a likeness: her outline against a moon, as on a cameo ── */
  /* The profile faces left. Points are in a box 100 wide and 130 tall, the eye near (40, 50). */
  const PROFILE = 'M46 14 C36 14 29 21 28 32 C27.5 37 27 41 26 45 C25 49 21 52 19.5 55.5 C19 57 20.5 58 22.5 58.5 C22 60 21.5 61 22.3 62.5 C22.8 63.5 22.8 64 22.2 65 C21.8 66 22.6 67 23.8 67.3 C23.2 69 23 70.5 24 72.5 C25 74.5 28 75.5 32 75.5 C35 75.5 37 76 38 78 C39.5 82 39 88 37 93 C32 97 22 100 14 106 C8 111 6 120 6 131 L94 131 C94 120 92 110 86 104 C78 98 68 96 64 92 C61 88 61 80 63 74 C70 66 74 56 74 44 C74 26 62 14 46 14 Z';
  /* hair, by name: what is added round the head. Each is a path in the same box. */
  const HAIR = {
    bun: 'M28 34 C26 20 38 8 54 9 C70 10 80 22 79 40 C78.5 52 74 62 68 70 C70 58 68 46 60 38 C52 31 40 30 28 34 Z M72 20 C80 14 92 18 92 29 C92 39 82 44 74 38 C78 32 77 25 72 20 Z',
    chignon: 'M27 35 C25 20 38 8 54 9 C71 10 80 24 78 42 C77 52 73 60 68 68 C70 56 68 46 60 39 C52 32 40 31 27 35 Z M74 44 C84 42 92 50 90 60 C88 69 78 72 71 66 C76 60 77 52 74 44 Z',
    updo: 'M27 34 C25 18 36 2 54 2 C72 2 82 18 80 38 C79 50 75 60 68 68 C70 56 68 46 60 39 C52 32 40 30 27 34 Z',
    ponytail: 'M28 34 C26 20 38 8 54 9 C70 10 79 22 78 38 C77.5 48 74 58 68 68 C70 56 68 46 60 39 C52 32 40 30 28 34 Z M74 24 C86 22 96 32 95 48 C94 64 90 82 96 100 C86 92 82 76 82 60 C82 48 80 36 74 24 Z',
    braid: 'M28 34 C26 20 38 8 54 9 C70 10 79 22 78 38 C77.5 48 74 58 68 68 C70 56 68 46 60 39 C52 32 40 30 28 34 Z M70 52 C78 52 82 60 79 67 C84 70 85 78 80 83 C84 88 83 96 78 99 C80 104 78 111 73 113 C70 108 70 102 73 98 C68 94 68 86 72 82 C67 77 68 69 72 66 C68 62 68 56 70 52 Z',
    plait: 'M27 34 C25 19 37 7 54 8 C70 9 80 21 79 38 C78 49 74 59 68 68 C70 56 68 46 60 39 C52 32 40 30 27 34 Z M30 22 C40 10 62 8 74 20 C66 15 58 15 52 19 C46 14 37 16 30 22 Z',
    long: 'M28 34 C26 20 38 8 54 9 C72 10 82 24 82 44 C82 66 90 88 96 108 C84 110 70 106 66 94 C62 88 62 80 64 74 C70 66 71 54 66 44 C60 34 42 30 28 34 Z',
    wave: 'M28 34 C26 20 38 8 54 9 C72 10 83 24 82 42 C81 54 88 60 86 72 C84 82 92 90 90 104 C80 104 70 100 66 94 C62 88 62 80 64 74 C70 66 71 54 66 44 C60 34 42 30 28 34 Z',
    bob: 'M28 34 C26 20 38 8 54 9 C72 10 84 24 83 46 C82.5 58 82 68 80 78 C74 80 66 78 63 74 C70 66 71 54 66 44 C60 34 42 30 28 34 Z',
    crop: 'M28 33 C27 20 39 10 54 11 C68 12 77 22 76 36 C75.5 44 73 50 70 56 C70 48 66 42 60 38 C52 32 40 30 28 33 Z',
    curls: 'M27 36 C22 30 24 20 32 16 C34 8 46 4 54 8 C64 3 76 9 78 20 C87 24 88 36 82 42 C88 50 85 62 77 66 C76 72 70 76 66 72 C70 62 70 52 65 44 C59 35 42 31 27 36 Z',
  };
  /* what she wears on her head or at her ear: drawn in gold, or in the dark of her outline */
  const TRIM = {
    earring: g => { g.fillStyle = PAL.goldHi; g.beginPath(); g.arc(60.5, 66.5, 1.9, 0, TAU); g.fill(); g.beginPath(); g.arc(60.5, 71.4, 1.3, 0, TAU); g.fill(); },
    comb: g => { g.strokeStyle = PAL.goldHi; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.arc(66, 24, 9, Math.PI * 1.15, Math.PI * 1.8); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(60 + k * 4, 17 - Math.sin(k) * 1.5); g.lineTo(61.5 + k * 4, 25); g.stroke(); } },
    band: g => { g.strokeStyle = PAL.goldHi; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(31, 26); g.quadraticCurveTo(52, 12, 76, 30); g.stroke(); },
    flower: g => { g.fillStyle = PAL.goldHi; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.ellipse(70 + Math.cos(a) * 4, 30 + Math.sin(a) * 4, 3.2, 2, a, 0, TAU); g.fill(); } g.fillStyle = '#fffdf2'; g.beginPath(); g.arc(70, 30, 1.8, 0, TAU); g.fill(); },
    glasses: g => { g.strokeStyle = PAL.goldHi; g.lineCap = 'round'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(27.6, 42.5); g.quadraticCurveTo(26.4, 47, 27.8, 51.5); g.stroke(); g.lineWidth = 1.1; g.beginPath(); g.moveTo(28, 44.6); g.lineTo(58, 41.6); g.stroke(); },   // seen from the side: the rim of a lens before the eye, an arm back to the ear
    hat: (g, dark) => { g.fillStyle = dark; g.beginPath(); g.ellipse(50, 22, 44, 6.5, -0.08, 0, TAU); g.fill(); g.beginPath(); g.moveTo(30, 22); g.bezierCurveTo(30, 2, 74, -2, 76, 20); g.closePath(); g.fill(); g.strokeStyle = PAL.goldHi; g.lineWidth = 2.4; g.beginPath(); g.moveTo(30.5, 18); g.quadraticCurveTo(52, 12, 76, 17); g.stroke(); },
    cap: (g, dark) => { g.fillStyle = dark; g.beginPath(); g.moveTo(27, 30); g.bezierCurveTo(26, 8, 78, 4, 80, 30); g.closePath(); g.fill(); g.beginPath(); g.ellipse(22, 31, 16, 3.5, 0.12, 0, TAU); g.fill(); g.strokeStyle = PAL.goldHi; g.lineWidth = 2; g.beginPath(); g.moveTo(28, 29); g.quadraticCurveTo(54, 24, 80, 29); g.stroke(); },
    scarf: (g, dark) => { g.fillStyle = dark; g.beginPath(); g.moveTo(34, 78); g.bezierCurveTo(44, 86, 62, 86, 70, 76); g.bezierCurveTo(76, 86, 72, 96, 60, 99); g.bezierCurveTo(48, 100, 36, 96, 32, 88); g.closePath(); g.fill(); g.strokeStyle = PAL.goldHi; g.lineWidth = 1.8; g.beginPath(); g.moveTo(35, 82); g.bezierCurveTo(46, 90, 62, 89, 70, 80); g.stroke(); },
    shawl: (g, dark) => { g.fillStyle = dark; g.beginPath(); g.moveTo(2, 131); g.bezierCurveTo(4, 106, 24, 94, 40, 95); g.bezierCurveTo(62, 90, 94, 100, 98, 131); g.closePath(); g.fill(); g.strokeStyle = PAL.goldHi; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(8, 122); g.bezierCurveTo(14, 104, 30, 98, 40, 99); g.bezierCurveTo(60, 95, 84, 102, 92, 121); g.stroke(); g.beginPath(); g.moveTo(40, 99); g.lineTo(37, 112); g.stroke(); },
    hood: (g, dark) => { g.fillStyle = dark; g.beginPath(); g.moveTo(30, 30); g.bezierCurveTo(30, 2, 86, 0, 88, 40); g.bezierCurveTo(90, 66, 82, 92, 92, 112); g.lineTo(60, 100); g.bezierCurveTo(66, 84, 74, 60, 70, 44); g.bezierCurveTo(64, 28, 44, 24, 30, 30); g.closePath(); g.fill(); g.strokeStyle = PAL.goldHi; g.lineWidth = 1.8; g.beginPath(); g.moveTo(31, 29); g.bezierCurveTo(46, 23, 64, 29, 70, 44); g.stroke(); },
  };
  /** something of a place, small, for the sky behind one of its people */
  const MOTIF = {
    nectar(g, w, h, rand) { for (let i = 0; i < 22; i++) { const x = rand() * w, y = rand() * h * 0.8, r = w * (0.012 + rand() * 0.016); g.save(); g.translate(x, y); g.rotate(rand() * TAU); g.fillStyle = ink(rand() < 0.5 ? '#ffe3ea' : '#fff3df', 0.5 + rand() * 0.4); g.beginPath(); g.ellipse(0, 0, r * 1.7, r, 0, 0, TAU); g.fill(); g.restore(); } },
    tranquility(g, w, h, rand) { for (let i = 0; i < 26; i++) { const y = h * (0.62 + rand() * 0.2), len = w * (0.08 + rand() * 0.3); g.fillStyle = ink('#bdf3e6', 0.1 + rand() * 0.2); g.beginPath(); g.ellipse(rand() * w, y, len / 2, Math.max(0.8, h * 0.004), 0, 0, TAU); g.fill(); } },
    dreams(g, w, h, rand) { for (let i = 0; i < 9; i++) { const x = rand() * w, y = h * (0.06 + rand() * 0.66), r = w * (0.012 + rand() * 0.014); glow(g, x, y, r * 6, rand() < 0.7 ? '#ffe9b0' : '#f6d0ff', 0.55); g.fillStyle = 'rgba(255,251,232,.95)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } },
    cold(g, w, h, rand) {
      g.save(); g.globalCompositeOperation = 'screen';
      for (const [y0, colour, a] of [[0.3, '#5dffa8', 0.5], [0.16, '#4fe6d6', 0.34]]) { const ph = rand() * TAU; for (let x = 0; x < w; x += 2) { const t = x / w, y = h * (y0 + 0.07 * Math.sin(t * TAU * 1.3 + ph)), fold = 0.3 + 0.7 * Math.pow(Math.sin(t * 19 + ph) * 0.5 + 0.5, 2), len = h * 0.24 * (0.5 + 0.5 * fold), ray = g.createLinearGradient(0, y - len, 0, y + len * 0.1); ray.addColorStop(0, ink(colour, 0)); ray.addColorStop(0.85, ink(colour, a * fold)); ray.addColorStop(1, ink(colour, 0)); g.fillStyle = ray; g.fillRect(x, y - len, 2.4, len * 1.1); } }
      g.restore();
    },
    clouds(g, w, h, rand) { for (let i = 0; i < 5; i++) cloudStreak(g, rand() * w, h * (0.08 + rand() * 0.62), w * (0.5 + rand() * 0.5), h * 0.022, rand, i % 2 ? '#ffe9cf' : '#f6bfae', 0.34 + rand() * 0.2); },
    showers(g, w, h, rand) {
      for (let i = 0; i < 7; i++) { const x = w * (0.1 + rand() * 0.95), y = h * (0.03 + rand() * 0.55), len = w * (0.14 + rand() * 0.2), x2 = x - len * 0.72, y2 = y + len * 0.7, trail = g.createLinearGradient(x, y, x2, y2); trail.addColorStop(0, 'rgba(255,255,255,0)'); trail.addColorStop(1, 'rgba(236,243,255,.95)'); g.strokeStyle = trail; g.lineWidth = Math.max(1, w * 0.007); g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); glow(g, x2, y2, w * 0.035, '#dfeaff', 0.8); }
    },
    rainbows(g, w, h) { const hues = ['#e66a6a', '#f0a04e', '#f2d862', '#7fd07a', '#58b8d8', '#5a78d6', '#9a70d0'], R = w * 0.78, band = w * 0.02; hues.forEach((c, i) => { g.strokeStyle = ink(c, 0.6); g.lineWidth = band * 1.1; g.beginPath(); g.arc(w * 0.5, h * 0.78, R - i * band, Math.PI, TAU); g.stroke(); }); },
    storms(g, w, h, rand) {
      g.save(); g.globalAlpha = 0.24; g.strokeStyle = '#dcd6ff'; g.lineWidth = Math.max(0.8, w * 0.004);
      for (let i = 0; i < 46; i++) { const x = rand() * w * 1.1, y = rand() * h, l = h * (0.03 + rand() * 0.05); g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.45, y + l); g.stroke(); }
      g.restore();
      let x = w * (0.74 + rand() * 0.16), y = 0; g.lineCap = 'round';
      for (let k = 0; k < 9; k++) { const nx = x + (rand() - 0.62) * w * 0.12, ny = y + h * 0.06; g.strokeStyle = 'rgba(203,188,255,.35)'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); g.strokeStyle = '#fbf8ff'; g.lineWidth = Math.max(1, w * 0.009); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny; }
    },
  };
  const faces = new Map();
  /** Her likeness on a canvas w × h (CSS pixels). o: the opponent as the campaign has her (scene: her place's;
   *  look: her hair and what she wears, in words). dim: she will not play yet. */
  function face(canvas, o, scene, w, h, dpr = 1, dim = false) {
    const key = `${o.id}:${Math.round(w)}x${Math.round(h)}@${dpr}:${dim ? 1 : 0}`;
    let pic = faces.get(key);
    if (!pic) {
      pic = canvasOf(w * dpr, h * dpr);
      const g = pic.getContext('2d'), L = lookOf(scene), seed = Array.from(o.id).reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0, rand = rngOf(seed);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // behind her: the sky of her place in two tones, a few stars
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, tone(L.deep, '#0a0f2c', 0.45)); sky.addColorStop(0.62, L.deep); sky.addColorStop(1, tone(L.deep, L.her, 0.42));
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      brushOver(g, -10, 0, w + 20, h, rand, { count: 26, tall: 0.09, alpha: 0.13, pick: t => [L.deep, L.her, t * 0.5], slant: -0.2 });
      for (let i = 0; i < 16; i++) { g.fillStyle = ink('#fdf8e8', 0.25 + rand() * 0.6); g.beginPath(); g.arc(rand() * w, rand() * h * 0.6, 0.5 + rand() * 1.1, 0, TAU); g.fill(); }
      if (MOTIF[scene]) MOTIF[scene](g, w, h, rand);
      // her moon
      const d = Math.min(w * 0.92, h * 0.7), mx = w * (0.5 + (rand() - 0.5) * 0.06), my = h * 0.4;
      glow(g, mx, my, d * 0.95, '#fff3cf', 0.4);
      const px = Math.max(64, Math.min(360, Math.round(d * dpr)));
      g.drawImage(paintFace(px, true, 1 + (seed % 4)), mx - d / 2, my - d / 2, d, d);
      // herself, in the dark of her place, with a line of light down the profile
      const k = Math.min(w / 100, h / 132) * 1.02, dark = tone(L.deep, '#070a20', 0.62), ox = w / 2 - 50 * k + w * 0.02, oy = h - 131 * k;
      g.save(); g.translate(ox, oy); g.scale(k, k);
      const words = String(o.look || '').split(/\s+/), hair = HAIR[words[0]] || HAIR.bob, worn = words.slice(1).filter(t => TRIM[t]);
      for (const t of worn) if (t === 'hood') TRIM[t](g, dark);
      g.fillStyle = dark; g.fill(new Path2D(hair)); g.fill(new Path2D(PROFILE));
      g.strokeStyle = ink(L.her, 0.85); g.lineWidth = 1.1; g.lineJoin = 'round';
      g.save(); g.beginPath(); g.rect(0, 10, 44, 122); g.clip(); g.stroke(new Path2D(PROFILE)); g.restore();
      for (const t of worn) if (t !== 'hood') TRIM[t](g, dark);
      g.restore();
      // the foot of the card darkens, for her name to stand on
      const foot = g.createLinearGradient(0, h * 0.58, 0, h);
      foot.addColorStop(0, ink('#070a20', 0)); foot.addColorStop(1, ink('#070a20', 0.72));
      g.fillStyle = foot; g.fillRect(0, h * 0.58, w, h * 0.42);
      texture(g, 'grain', 0, 0, w, h, { alpha: 0.22, mode: 'overlay' });
      if (dim) { g.fillStyle = 'rgba(12,16,44,.5)'; g.fillRect(0, 0, w, h); }
      if (faces.size > 30) faces.delete(faces.keys().next().value);
      faces.set(key, pic);
    }
    canvas.width = pic.width; canvas.height = pic.height; canvas.getContext('2d').drawImage(pic, 0, 0);
  }

  /* ── the sign of each place, for the map and wherever a place is named small ── */
  const SIGN = {
    nectar: '<path d="M12 3.5c3.2 4.2 5.5 7.3 5.5 10.3a5.5 5.5 0 0 1-11 0c0-3 2.3-6.1 5.5-10.3Z"/>',
    tranquility: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3.5 9c2.8-2 5.7 2 8.5 0s5.7 2 8.5 0M3.5 14c2.8-2 5.7 2 8.5 0s5.7 2 8.5 0M6 19c2-1.3 4 1.3 6 0s4 1.3 6 0"/>',
    dreams: '<path d="M14.5 3.5a8.5 8.5 0 1 0 6 13.8A7.2 7.2 0 0 1 14.5 3.5Z"/><path d="M18 5.2l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z"/>',
    cold: '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6.5l-2-2M12 6.5l2-2M12 17.5l-2 2M12 17.5l2 2M7.2 9.3l-2.7.7M7.2 9.3l-.7-2.7M16.8 14.7l2.7-.7M16.8 14.7l.7 2.7M16.8 9.3l2.7.7M16.8 9.3l.7-2.7M7.2 14.7l-2.7-.7M7.2 14.7l-.7 2.7"/>',
    clouds: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96 6 6 0 0 1 11.5 1.3A3.9 3.9 0 0 1 17.5 18.5Z"/>',
    showers: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M20 4L9 15M14 4l-4 4M20 10l-4 4"/><path d="M6.5 13.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z"/>',
    rainbows: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 18a9 9 0 0 1 18 0M6.5 18a5.5 5.5 0 0 1 11 0M10 18a2 2 0 0 1 4 0"/>',
    storms: '<path d="M13.5 2.5L5.5 13.5h5.2l-1.5 8 8.3-11.5h-5.3Z"/>',
  };
  const sign = scene => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SIGN[scene] || SIGN.tranquility}</svg>`;

  return { LOOK, lookOf, scene, Chart, face, sign, HAIR, TRIM };
})();
