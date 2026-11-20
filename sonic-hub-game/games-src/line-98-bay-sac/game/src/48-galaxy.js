/* ── Ngân Hà ── the land of violet, and the end of the road: the Milky Way.
   The board is a chart of the sky ruled in light, and the balls are worlds, each colour a planet of its own. They
   hang a little off their squares, turning nothing but their light. A ball to come is a star not yet a planet;
   a line taken off collapses and goes out in a flash. */
(() => {
  const WORLD = ['#e2553d', '#f29a3a', '#f3d266', '#55bf6a', '#48c6ea', '#4f62e2', '#b565e6'];

  /** the dark side, the thin bright air at the edge, and the light on the near side: what makes a disc a world */
  function lit(c, col, q) {
    c.fillStyle = radial(c, .46, .5, .2, 1.45, [[0, 'rgba(6,2,26,.78)'], [.5, 'rgba(6,2,26,.32)'], [1, 'rgba(6,2,26,0)']]); c.fillRect(-1, -1, 2, 2);
    c.fillStyle = radial(c, -.38, -.42, 0, .8, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-1, -1, 2, 2);
    c.restore();
    disc(c, 0, 0, q); c.strokeStyle = alpha(tint(col, .55), .7); c.lineWidth = .04; c.stroke();
  }
  const globe = (c, col, q) => { c.fillStyle = radial(c, 0, 0, .05, q * 1.1, [[0, tint(col, .3)], [.6, col], [1, shade(col, .3)]], -q * .35, -q * .4); disc(c, 0, 0, q); c.fill(); c.save(); disc(c, 0, 0, q); c.clip(); };
  const band = (c, y, wd, col, q) => { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.ellipse(0, y - q * 1.5, q * 2.1, q * 1.5, 0, .7, Math.PI - .7); c.stroke(); };

  const DRAW = [
    c => {    // 0 the red one: deserts, craters, a white cap
      const col = WORLD[0], q = .86, r = rng(481); globe(c, col, q);
      c.fillStyle = alpha(shade(col, .35), .5); for (let i = 0; i < 5; i++) { blob(c, r.in(-.6, .6), r.in(-.5, .6), r.in(.16, .34), r, .35, 7); c.fill(); }
      for (const [x, y, s] of [[-.3, .14, .13], [.26, -.2, .09], [.14, .44, .1], [-.52, -.2, .06], [.5, .2, .07]]) { c.fillStyle = alpha(shade(col, .5), .6); disc(c, x, y, s); c.fill(); c.strokeStyle = alpha(tint(col, .5), .6); c.lineWidth = .025; c.beginPath(); c.arc(x, y, s, .6, 3.4); c.stroke(); }
      c.fillStyle = 'rgba(255,250,244,.9)'; c.beginPath(); c.ellipse(-.06, -.86, .5, .2, .1, 0, TAU); c.fill();
      lit(c, col, q);
    },
    c => {    // 1 the orange one: bands of storm, and the great spot
      const col = WORLD[1], q = .88; globe(c, col, q);
      [[-.62, .14, '#fde3b4'], [-.38, .16, shade(col, .25)], [-.14, .12, '#fbd49a'], [.08, .18, shade(col, .12)], [.34, .13, '#fde3b4'], [.58, .2, shade(col, .32)]].forEach(([y, wd, k]) => band(c, y, wd, alpha(k, .82), q));
      c.fillStyle = '#c8502a'; oval(c, .26, .2, .2, .11, -.1); c.fill(); c.strokeStyle = 'rgba(255,230,190,.7)'; c.lineWidth = .025; c.stroke();
      lit(c, col, q);
    },
    c => {    // 2 the yellow one: the ringed world
      const col = WORLD[2], q = .6, ringPart = (from, to) => { for (const [rx, wd, a] of [[1.0, .1, .9], [.84, .07, .6]]) { c.strokeStyle = alpha('#f6e2a8', a); c.lineWidth = wd; c.beginPath(); c.ellipse(0, 0, rx, rx * .3, -.36, from, to); c.stroke(); } };
      ringPart(Math.PI, TAU);                                                      // the far half of the ring
      globe(c, col, q);
      [[-.4, .1, '#fff0c0'], [-.16, .12, shade(col, .16)], [.1, .1, '#fbe6a6'], [.34, .12, shade(col, .22)]].forEach(([y, wd, k]) => band(c, y, wd, alpha(k, .75), q));
      lit(c, col, q);
      ringPart(0, Math.PI);                                                        // and the near half, across its face
    },
    c => {    // 3 the green one: land, sea, cloud
      const col = WORLD[3], q = .86, r = rng(483); globe(c, mix(col, '#1f8f9a', .55), q);
      c.fillStyle = col; for (let i = 0; i < 6; i++) { blob(c, r.in(-.6, .6), r.in(-.6, .6), r.in(.2, .4), r, .4, 8); c.fill(); }
      c.fillStyle = alpha(shade(col, .3), .5); for (let i = 0; i < 5; i++) { blob(c, r.in(-.5, .5), r.in(-.5, .5), r.in(.08, .16), r, .4, 6); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineCap = 'round'; for (const [y, wd, a0, a1] of [[-.4, .09, 1.0, 2.0], [.02, .07, .8, 1.5], [.36, .08, 1.5, 2.3]]) { c.lineWidth = wd; c.beginPath(); c.ellipse(0, y - q * 1.5, q * 2.1, q * 1.5, 0, a0, a1); c.stroke(); }
      lit(c, col, q);
    },
    c => {    // 4 the blue one: ice, with a moon
      const col = WORLD[4], q = .8; c.save(); c.translate(-.06, .04); globe(c, col, q);
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineCap = 'round'; c.lineWidth = .06; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-.1 + k * .09, .1 - k * .16, .5 - k * .04, .4 + k * .5, 1.9 + k * .5); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(0, -.78, .46, .16, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(.04, .8, .4, .13, 0, 0, TAU); c.fill();
      lit(c, col, q); c.restore();
      c.save(); c.translate(.76, -.6); sphere(c, .15, '#e8eef6', { core: .5, dark: .5 }); c.restore();
    },
    c => {    // 5 the indigo one: deep, banded faintly, a dark storm, a thin ring on edge
      const col = WORLD[5], q = .82; globe(c, col, q);
      [[-.5, .12, tint(col, .3)], [-.2, .08, shade(col, .22)], [.16, .14, tint(col, .2)], [.5, .1, shade(col, .3)]].forEach(([y, wd, k]) => band(c, y, wd, alpha(k, .6), q));
      c.fillStyle = alpha(shade(col, .6), .7); oval(c, -.24, .16, .2, .1, .1); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; oval(c, .3, -.3, .12, .04, .1); c.fill();
      lit(c, col, q);
      c.strokeStyle = 'rgba(210,220,255,.7)'; c.lineWidth = .035; c.beginPath(); c.ellipse(0, 0, .26, 1.0, .5, -1.0, 1.0); c.stroke(); c.beginPath(); c.ellipse(0, 0, .26, 1.0, .5, Math.PI - 1.0, Math.PI + 1.0); c.stroke();
    },
    c => {    // 6 the violet one: a world of mist, lit from inside
      const col = WORLD[6], q = .84; globe(c, col, q);
      c.lineCap = 'round'; for (const [k, colr] of [[0, '#ffc4f2'], [1, '#8fd8ff'], [2, '#ffe6fb']]) { c.strokeStyle = alpha(colr, .62); c.lineWidth = .12 - k * .025; c.beginPath(); for (let a = 0; a < 6.4; a += .2) { const d = .1 + a * .11; c.lineTo(Math.cos(a + k * 2.1) * d, Math.sin(a + k * 2.1) * d * .8); } c.stroke(); }
      c.fillStyle = radial(c, 0, 0, 0, .4, [[0, 'rgba(255,240,255,.75)'], [1, 'rgba(255,240,255,0)']]); c.fillRect(-1, -1, 2, 2);
      lit(c, col, q);
      twinkle(c, .74, -.66, .16, '#ffffff', .95); twinkle(c, -.78, .6, .1, '#ffe6fb', .9);
    },
  ];

  place({
    id: 'galaxy', hue: '#8a4fd8', colour: 6,
    name: { vi: 'Ngân Hà', en: 'The Milky Way' },
    tag: { vi: 'Cuối đường là trời sao: mỗi màu một hành tinh treo trên tấm bản đồ kẻ bằng ánh sáng.', en: 'The road ends among the stars: a planet for each colour, hung on a chart ruled in light.' },
    dress: { ink: '#f6efff', soft: 'rgba(230,218,255,.76)', panel: 'rgba(24,10,58,.56)', edge: 'rgba(214,184,255,.32)', accent: '#ffd98a', num: '#ffffff' },
    inks: WORLD, frame: .032, ballR: .4,
    voice: { kind: 'air', root: 220, scale: [0, 2, 4, 7, 9, 12, 14], wet: .5 },

    backdrop(c, w, h) {
      const r = rng(4801), u = Math.min(w, h);
      c.fillStyle = linear(c, 0, 0, w * .4, h, [[0, '#0a0520'], [.5, '#170b3c'], [1, '#26105a']]); c.fillRect(0, 0, w, h);
      // clouds of gas, each its own colour, laid one through another
      for (const [seed, col, a] of [[81, '#b23fd8', .5], [82, '#3f62e0', .42], [83, '#e0508f', .3], [84, '#2fb0c8', .22]]) wash(c, clouds(128, seed, col, 5, .55, 3), -w * .1, -h * .1, w * 1.2, h * 1.2, a, 'screen');
      // the river of stars, slanting across
      c.save(); c.translate(w / 2, h / 2); c.rotate(-.5);
      c.fillStyle = linear(c, 0, -u * .3, 0, u * .3, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(226,210,255,.2)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-w, -u * .3, w * 2, u * .6);
      for (let i = 0; i < w * h / 1500; i++) { const x = r.in(-1, 1) * w, y = (r() + r() + r() - 1.5) * u * .22; c.fillStyle = alpha('#ffffff', r.in(.25, .9)); c.fillRect(x, y, r.in(.6, 1.5), r.in(.6, 1.5)); }
      c.restore();
      for (let i = 0; i < w * h / 2200; i++) { const x = r() * w, y = r() * h, k = r(); c.fillStyle = alpha(k < .12 ? '#ffd9a8' : k < .24 ? '#a8d0ff' : '#ffffff', r.in(.3, .95)); disc(c, x, y, k > .96 ? 1.7 : r.in(.4, 1.1)); c.fill(); }
      for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h, q = u * r.in(.008, .016); glowAt(c, x, y, q * 4, r.pick(['#ffffff', '#ffd9a8', '#b8d4ff']), .5); twinkle(c, x, y, q * 2.2, '#ffffff', .9); }
      // a far galaxy, edge-on
      { const x = w * .9, y = h * .78, q = u * .07; c.save(); c.translate(x, y); c.rotate(-.5); glowAt(c, 0, 0, q, '#d8c4ff', .5); c.scale(1, .28); glowAt(c, 0, 0, q * 1.6, '#ffffff', .5); c.restore(); }
      grain(c, 0, 0, w, h, .12);
      c.fillStyle = radial(c, w / 2, h / 2, u * .36, Math.hypot(w, h) * .64, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(4,0,18,.55)']]); c.fillRect(0, 0, w, h);
    },
    air: {
      make(w, h) { const r = rng(4), stars = []; for (let i = 0; i < 46; i++) stars.push({ x: r() * w, y: r() * h, q: r.in(1.2, 3), ph: r() * 9, v: r.in(500, 1400), col: r.pick(['#ffffff', '#ffe4bd', '#c9dcff', '#f0d0ff']) }); return { stars, shot: { t: 3 + r() * 4, x: 0, y: 0, a: 0, life: 0 } }; },
      draw(c, s, t, dt, w, h) {
        for (const p of s.stars) { const a = .5 + .5 * Math.sin(t / p.v + p.ph); twinkle(c, p.x, p.y, p.q * (.55 + .45 * a), p.col, .2 + .75 * a * a); }
        const f = s.shot;                                  // now and then a star falls
        f.t -= dt;
        if (f.t <= 0 && f.life <= 0) { f.x = Math.random() * w * .8 + w * .2; f.y = Math.random() * h * .4; f.a = 2.5 + Math.random() * .5; f.life = .9; f.t = 5 + Math.random() * 7; }
        if (f.life > 0) {
          f.life -= dt; const v = Math.min(w, h) * 1.1; f.x += Math.cos(f.a) * v * dt; f.y += Math.sin(f.a) * v * dt;
          const L = Math.min(w, h) * .16, k = clamp(f.life / .9, 0, 1), g = c.createLinearGradient(f.x, f.y, f.x - Math.cos(f.a) * L, f.y - Math.sin(f.a) * L);
          g.addColorStop(0, `rgba(255,255,255,${.95 * Math.sin(k * Math.PI)})`); g.addColorStop(1, 'rgba(200,180,255,0)');
          c.strokeStyle = g; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x - Math.cos(f.a) * L, f.y - Math.sin(f.a) * L); c.stroke();
        }
      },
    },

    board(c, g) {
      const { S, pad, cell } = g, r = rng(4802), line = '#c9b0ff';
      // a pane of dark glass over the sky, so the worlds stand out from it
      rr(c, 0, 0, S, S, pad * .9); c.fillStyle = 'rgba(14,6,44,.82)'; c.fill();
      c.save(); rr(c, 0, 0, S, S, pad * .9); c.clip();
      c.fillStyle = radial(c, S / 2, S / 2, 0, S * .72, [[0, 'rgba(120,80,220,.2)'], [1, 'rgba(10,4,30,.2)']]); c.fillRect(0, 0, S, S);
      for (let i = 0; i < 90; i++) { c.fillStyle = alpha('#ffffff', r.in(.1, .5)); c.fillRect(r() * S, r() * S, r.in(.6, 1.3), r.in(.6, 1.3)); }
      c.restore();
      // the chart: ruled in light, a small star wherever two lines cross
      c.strokeStyle = alpha(line, .13); c.lineWidth = Math.max(3, cell * .1);
      for (let i = 0; i <= N; i++) { c.beginPath(); c.moveTo(pad + i * cell, pad); c.lineTo(pad + i * cell, S - pad); c.moveTo(pad, pad + i * cell); c.lineTo(S - pad, pad + i * cell); c.stroke(); }
      c.strokeStyle = alpha(line, .62); c.lineWidth = Math.max(1, cell * .022);
      for (let i = 0; i <= N; i++) { c.beginPath(); c.moveTo(pad + i * cell, pad); c.lineTo(pad + i * cell, S - pad); c.moveTo(pad, pad + i * cell); c.lineTo(S - pad, pad + i * cell); c.stroke(); }
      for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) { const px = pad + x * cell, py = pad + y * cell, rim = x === 0 || y === 0 || x === N || y === N; twinkle(c, px, py, cell * (rim ? .07 : .095), '#ffffff', rim ? .7 : .9); }
      // round the edge, the marks an instrument has: a fine double line, and ticks
      c.strokeStyle = alpha('#ffd98a', .8); c.lineWidth = Math.max(1, pad * .07); rr(c, pad * .28, pad * .28, S - pad * .56, S - pad * .56, pad * .7); c.stroke();
      c.strokeStyle = alpha('#ffd98a', .5); c.lineWidth = 1;
      for (let i = 0; i <= N * 4; i++) { const v = pad + i * cell / 4, L = i % 4 ? pad * .16 : pad * .3; c.beginPath(); c.moveTo(v, pad * .36); c.lineTo(v, pad * .36 + L); c.moveTo(v, S - pad * .36); c.lineTo(v, S - pad * .36 - L); c.moveTo(pad * .36, v); c.lineTo(pad * .36 + L, v); c.moveTo(S - pad * .36, v); c.lineTo(S - pad * .36 - L, v); c.stroke(); }
    },

    ball: (c, i, r) => { c.scale(r, r); DRAW[i](c); },
    /** a ball to come: a star, in the colour of the world it will be */
    seed(c, i, r) { glowAt(c, 0, 0, r * .8, WORLD[i], .9); twinkle(c, 0, 0, r * .52, tint(WORLD[i], .5), 1); twinkle(c, 0, 0, r * .3, '#ffffff', 1); },
    shadow: null,
    glow: { r: 1.75, a: .34 },
    pose(b, t, p) {
      const ph = b.phase * TAU;
      p.dy = .022 * Math.sin(t / 1100 + ph); p.rot = .035 * Math.sin(t / 1900 + ph * 2); p.glow = .85 + .15 * Math.sin(t / 700 + ph);
      if (b.picked) { const k = (t - b.pickT) / 1000; p.k = 1.1 + .04 * Math.sin(k * 5.2); p.dy = -.04 + .02 * Math.sin(k * 5.2); p.glow = 1.7; }
    },
    /** round the world that is picked, a moon goes */
    under(c, x, y, cell, dt) {
      const a = dt / 420, rx = cell * .5, ry = cell * .19, tilt = -.3;
      c.save(); c.translate(x, y - cell * .03); c.rotate(tilt);
      c.strokeStyle = 'rgba(255,217,138,.55)'; c.lineWidth = Math.max(1, cell * .02); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.stroke();
      glowAt(c, Math.cos(a) * rx, Math.sin(a) * ry, cell * .12, '#ffe6b0', .9); c.fillStyle = '#fff6dc'; disc(c, Math.cos(a) * rx, Math.sin(a) * ry, cell * .045); c.fill();
      c.restore();
    },
    leaveMs: 340,
    /** it falls in on itself */
    leave(b, u, p) { p.k = u < .55 ? 1 - .9 * ease.in3(u / .55) : .1 * (1 - (u - .55) / .45); p.glow = 1 + 3 * Math.sin(Math.min(1, u / .6) * Math.PI); p.a = u < .5 ? 1 : 1 - (u - .5) / .5; },
    trail(x, y, i, cell) { for (let k = 0; k < 3; k++) bit({ kind: 'star', add: true, x: x + (Math.random() - .5) * cell * .5, y: y + (Math.random() - .5) * cell * .5, col: Math.random() < .5 ? '#ffffff' : tint(WORLD[i], .4), size: cell * (.04 + Math.random() * .06), life: .5 + Math.random() * .4, wait: Math.random() * .08 }); },
    land(x, y, i, cell) { bit({ kind: 'ring', add: true, x, y, col: tint(WORLD[i], .4), size: cell * .3, grow: cell * 1.1, w: 1.6, life: .34, a: .8 }); },
    burst(x, y, i, cell) {
      const col = WORLD[i];
      bit({ kind: 'glow', add: true, x, y, col: '#ffffff', size: cell * .1, grow: cell * 4.6, life: .26, wait: .16, a: .95 });
      bit({ kind: 'ring', add: true, x, y, col: tint(col, .35), size: cell * .12, grow: cell * 2.6, w: Math.max(2, cell * .05), life: .46, wait: .18, a: .95 });
      burstOf(11, x, y, a => { const v = cell * (2.2 + Math.random() * 3.4); return { kind: Math.random() < .5 ? 'star' : 'streak', add: true, wait: .18, col: Math.random() < .5 ? '#ffffff' : tint(col, .35), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.4, size: cell * (.03 + Math.random() * .06), life: .5 + Math.random() * .45, fade: .6 }; });
    },
    rise(x, y, i, cell) { bit({ kind: 'glow', add: true, x, y, col: WORLD[i], size: cell * .2, grow: cell * 1.6, life: .42, a: .7 }); },
  });
})();
