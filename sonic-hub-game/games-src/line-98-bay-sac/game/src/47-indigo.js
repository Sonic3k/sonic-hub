/* ── Chàm ── the land of indigo: cloth dyed in the highlands, the pattern drawn in wax before the dye.
   The board is a panel of that cloth with its squares marked in running stitch and its border embroidered; the
   balls are balls of wound and embroidered thread, each colour with a pattern of its own. A ball that goes leaves
   its way sewn behind it for a moment; a line that is taken comes unwound. */
(() => {
  const YARN = ['#e4473f', '#f58d27', '#f5cb30', '#45b45c', '#3fb9e8', '#6b7de8', '#b85ad8'];
  const WAX = '#d3dbff', FLOSS = ['#e4473f', '#ff7fae', '#ffd23f', '#5ac86a', '#fbf7ee'], THREAD = '#fbf7ee';

  /* the four things drawn in wax, each inside a square of side q about 0,0 */
  const MOTIF = [
    (c, q) => { for (const k of [.9, .62, .34]) { c.beginPath(); c.moveTo(0, -q * k); c.lineTo(q * k, 0); c.lineTo(0, q * k); c.lineTo(-q * k, 0); c.closePath(); c.stroke(); } c.beginPath(); c.arc(0, 0, q * .08, 0, TAU); c.fill(); },
    (c, q) => { for (const s of [-1, 1]) { c.beginPath(); for (let a = 0; a < 11; a += .25) { const d = q * .045 * a; c.lineTo(s * q * .42 + Math.cos(a * s + (s < 0 ? Math.PI : 0)) * d, Math.sin(a * s + (s < 0 ? Math.PI : 0)) * d); } c.stroke(); } },
    (c, q) => { c.beginPath(); c.moveTo(-q * .8, 0); c.lineTo(q * .8, 0); c.moveTo(0, -q * .8); c.lineTo(0, q * .8); c.stroke(); for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.strokeRect(x * q * .5 - q * .2, y * q * .5 - q * .2, q * .4, q * .4); c.beginPath(); c.arc(x * q * .5, y * q * .5, q * .05, 0, TAU); c.fill(); } },
    (c, q) => { for (let k = 0; k < 8; k++) { const a = k * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * q * .2, Math.sin(a) * q * .2); c.lineTo(Math.cos(a) * q * .86, Math.sin(a) * q * .86); c.stroke(); c.beginPath(); c.moveTo(Math.cos(a) * q * .86, Math.sin(a) * q * .86); c.lineTo(Math.cos(a + TAU / 16) * q * .56, Math.sin(a + TAU / 16) * q * .56); c.lineTo(Math.cos(a + TAU / 8) * q * .86, Math.sin(a + TAU / 8) * q * .86); c.stroke(); } c.beginPath(); c.arc(0, 0, q * .12, 0, TAU); c.stroke(); },
  ];
  /** the weave of the cloth: fine threads over and under, barely seen */
  function weave(c, x, y, w, h, a) {
    const [cv, k] = sheet(6, 6);
    k.fillStyle = 'rgba(255,255,255,.5)'; k.fillRect(0, 0, 3, 1); k.fillRect(3, 3, 3, 1); k.fillStyle = 'rgba(0,0,0,.5)'; k.fillRect(1, 1, 1, 2); k.fillRect(4, 4, 1, 2);
    c.save(); c.globalAlpha = a; c.fillStyle = c.createPattern(cv, 'repeat'); c.fillRect(x, y, w, h); c.restore();
  }
  /** a band of embroidered teeth along a line from x0,y0, `len` long, `t` thick; turned: running down instead of across */
  function teeth(c, x0, y0, len, t, turned, seed) {
    const r = rng(seed), n = Math.max(4, Math.round(len / (Math.abs(t) * 1.15))), step = len / n;
    c.save(); c.translate(x0, y0); if (turned) { c.rotate(Math.PI / 2); c.scale(1, -1); }
    for (let k = 0; k < n; k++) {
      const col = FLOSS[(k + (seed % 3)) % 4], x = k * step;
      c.fillStyle = col; c.beginPath(); c.moveTo(x + step * .08, t * .9); c.lineTo(x + step / 2, t * .12); c.lineTo(x + step * .92, t * .9); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,30,.28)'; c.lineWidth = Math.max(.6, Math.abs(t) * .04);                           // the stitches that fill it lie side by side
      for (let j = 1; j < 5; j++) { const f = j / 5; c.beginPath(); c.moveTo(x + lerp(step * .08, step / 2, f), t * lerp(.9, .12, f)); c.lineTo(x + lerp(step * .92, step / 2, f), t * lerp(.9, .12, f)); c.stroke(); }
      c.fillStyle = FLOSS[4]; c.beginPath(); c.arc(x + step, t * .34 + r.in(-.5, .5), Math.abs(t) * .07, 0, TAU); c.fill();
    }
    c.restore();
  }

  function ballOfThread(c, i, r) {
    const col = YARN[i];
    c.save(); c.scale(r, r);
    sphere(c, .9, col, { core: .26, dark: .44, rim: .3 });
    c.save(); disc(c, 0, 0, .9); c.clip();
    // wound thread: it lies in close turns, all one way
    c.strokeStyle = alpha(tint(col, .6), .22); c.lineWidth = .022;
    for (let k = -8; k <= 8; k++) { c.beginPath(); c.ellipse(0, k * .12 - .9, 1.4, .9, 0, .25, Math.PI - .25); c.stroke(); }
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = THREAD; c.fillStyle = THREAD; c.lineWidth = .065;
    const second = i === 1 || i === 2 ? '#c8402c' : i === 0 ? '#ffd23f' : i === 3 ? '#ffe680' : i === 6 ? '#ffd0ec' : '#ffd23f';
    if (i === 0) { for (const rot of [0, Math.PI / 4]) { c.save(); c.rotate(rot); c.strokeRect(-.42, -.42, .84, .84); c.restore(); } c.fillStyle = second; star(c, 0, 0, .2, 4, .45); c.fill(); }
    else if (i === 1) { for (let k = 0; k < 12; k++) { c.save(); c.rotate(k * TAU / 12); c.beginPath(); c.ellipse(0, -.36, .09, .26, 0, 0, TAU); c.stroke(); c.restore(); } c.fillStyle = second; disc(c, 0, 0, .1); c.fill(); }
    else if (i === 2) { [.62, .42, .22].forEach((q, k) => { c.strokeStyle = k === 1 ? second : THREAD; c.beginPath(); c.moveTo(0, -q); c.lineTo(q, 0); c.lineTo(0, q); c.lineTo(-q, 0); c.closePath(); c.stroke(); }); }
    else if (i === 3) { for (let k = 0; k < 3; k++) { c.save(); c.rotate(k * TAU / 6 + .26); for (const o of [-.1, .1]) { c.beginPath(); c.moveTo(-.8, o); c.lineTo(.8, o); c.stroke(); } c.restore(); } c.fillStyle = second; disc(c, 0, 0, .09); c.fill(); }
    else if (i === 4) { for (const q of [.2, .42, .64]) { disc(c, 0, 0, q); c.stroke(); } c.strokeStyle = second; for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * .2, Math.sin(a) * .2); c.lineTo(Math.cos(a) * .64, Math.sin(a) * .64); c.stroke(); } }
    else if (i === 5) { for (let k = 0; k < 6; k++) { c.save(); c.rotate(k * TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -.68); c.moveTo(-.16, -.56); c.lineTo(0, -.4); c.lineTo(.16, -.56); c.stroke(); c.restore(); } c.fillStyle = second; disc(c, 0, 0, .09); c.fill(); }
    else { for (const [rot, colr] of [[0, THREAD], [Math.PI, second]]) { c.strokeStyle = colr; c.beginPath(); for (let a = 0; a < 7.2; a += .2) { const q = .05 + a * .095; c.lineTo(Math.cos(a + rot) * q, Math.sin(a + rot) * q); } c.stroke(); } }
    // the thread turns with the ball: the pattern darkens towards the edge
    c.fillStyle = radial(c, 0, 0, .5, .92, [[0, 'rgba(0,0,0,0)'], [1, alpha(shade(col, .65), .5)]]); c.fillRect(-1, -1, 2, 2);
    c.fillStyle = radial(c, -.3, -.36, 0, .6, [[0, 'rgba(255,255,255,.26)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-1, -1, 2, 2);
    c.restore();
    disc(c, 0, 0, .9); c.strokeStyle = alpha(shade(col, .62), .85); c.lineWidth = .05; c.stroke();
    c.restore();
  }

  place({
    id: 'indigo', hue: '#4250c0', colour: 5,
    name: { vi: 'Chàm', en: 'Indigo' },
    tag: { vi: 'Tấm vải chàm vùng cao vẽ sáp ong: bi là những quả bóng chỉ thêu, đi tới đâu khâu đường tới đó.', en: 'Highland cloth, wax-drawn and dyed indigo: the balls are balls of embroidered thread, and sew their way as they go.' },
    dress: { ink: '#f4f1ff', soft: 'rgba(226,228,255,.76)', panel: 'rgba(16,20,66,.6)', edge: 'rgba(214,220,255,.3)', accent: '#ffd23f', num: '#ffffff' },
    inks: YARN, frame: .05, ballR: .385,
    voice: { kind: 'pluck', root: 196, scale: [0, 3, 5, 7, 10, 12, 15], wet: .22 },

    backdrop(c, w, h) {
      const r = rng(4701), u = Math.min(w, h);
      c.fillStyle = linear(c, 0, 0, w, h, [[0, '#232c80'], [.5, '#1a2168'], [1, '#12174e']]); c.fillRect(0, 0, w, h);
      wash(c, clouds(128, 71, '#060a30', 5, .55, 2.2), 0, 0, w, h, .5, 'multiply');
      wash(c, clouds(128, 72, '#5a6ae0', 5, .5, 2.4), 0, 0, w, h, .3, 'screen');
      // the pattern drawn in wax: it kept the dye off, so it stayed the colour of the cloth; where the wax cracked, dye got in
      const T = u * .23, cols = Math.ceil(w / T) + 1, rows = Math.ceil(h / T) + 1, ox = (w - cols * T) / 2, oy = (h - rows * T) / 2;
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = ox + (i + .5) * T, y = oy + (j + .5) * T;
        c.save(); c.translate(x, y); c.rotate(r.in(-.015, .015));
        c.strokeStyle = alpha(WAX, r.in(.24, .36)); c.fillStyle = alpha(WAX, .3); c.lineWidth = Math.max(1.4, u * .0036);
        MOTIF[(i + j * 3) % 4](c, T * .4);
        c.strokeStyle = alpha(WAX, .16); c.lineWidth = Math.max(1, u * .002); c.strokeRect(-T * .47, -T * .47, T * .94, T * .94);
        c.restore();
      }
      c.strokeStyle = 'rgba(18,22,80,.5)'; c.lineWidth = 1;                                              // the cracks
      for (let i = 0; i < 70; i++) { let x = r() * w, y = r() * h, a = r() * TAU; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { a += r.in(-.9, .9); x += Math.cos(a) * u * .012; y += Math.sin(a) * u * .012; c.lineTo(x, y); } c.stroke(); }
      weave(c, 0, 0, w, h, .1);
      // how the cloth hangs: long soft folds
      c.save(); c.globalCompositeOperation = 'soft-light';
      for (let i = -2; i < 8; i++) { const x = i * w * .19 + r.in(-20, 20); c.fillStyle = linear(c, x, 0, x + w * .19, 0, [[0, 'rgba(0,0,20,.4)'], [.5, 'rgba(210,220,255,.34)'], [1, 'rgba(0,0,20,.4)']]); c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w * .19, 0); c.lineTo(x + w * .19 + h * .12, h); c.lineTo(x + h * .12, h); c.closePath(); c.fill(); }
      c.restore();
      // the embroidered hems, top and bottom
      const band = Math.max(18, u * .04);
      for (const y of [0, h - band * 1.5]) { c.fillStyle = '#0b0e36'; c.fillRect(0, y, w, band * 1.5); teeth(c, 0, y + band * .25, w, band, false, y ? 5 : 2); c.strokeStyle = FLOSS[4]; c.lineWidth = Math.max(1.2, band * .06); c.setLineDash([band * .2, band * .16]); c.beginPath(); c.moveTo(0, y + band * .14); c.lineTo(w, y + band * .14); c.moveTo(0, y + band * 1.36); c.lineTo(w, y + band * 1.36); c.stroke(); c.setLineDash([]); }
      grain(c, 0, 0, w, h, .18);
      c.fillStyle = radial(c, w / 2, h / 2, u * .34, Math.hypot(w, h) * .64, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(4,4,30,.55)']]); c.fillRect(0, 0, w, h);
    },
    air: {      // loose ends of thread, adrift
      make(w, h) { const r = rng(8), out = []; for (let i = 0; i < 12; i++) out.push({ x: r() * w, y: r() * h, vx: r.in(-6, 6), vy: r.in(-9, -3), rot: r() * TAU, spin: r.in(-.5, .5), len: r.in(7, 16), col: r.pick(FLOSS), ph: r() * 9 }); return out; },
      draw(c, list, t, dt, w, h) {
        c.lineCap = 'round';
        for (const p of list) {
          p.x += (p.vx + Math.sin(t / 1500 + p.ph) * 5) * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
          if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; } if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = .34 + .2 * Math.sin(t / 900 + p.ph); c.strokeStyle = p.col; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(-p.len, 0); c.bezierCurveTo(-p.len * .3, -p.len * .7, p.len * .3, p.len * .7, p.len, 0); c.stroke(); c.restore();
        }
      },
    },

    board(c, g) {
      const { S, pad, cell } = g, r = rng(4702);
      // the border: black cloth, embroidered
      c.fillStyle = '#0a0d34'; rr(c, 0, 0, S, S, pad * .3); c.fill();
      const t = pad * .78, m = pad * .11;
      teeth(c, pad, m, S - pad * 2, t, false, 1); teeth(c, pad, S - m, S - pad * 2, -t, false, 2);
      teeth(c, m, pad, S - pad * 2, t, true, 3); teeth(c, S - m, pad, S - pad * 2, -t, true, 4);
      for (const [x, y] of [[pad / 2, pad / 2], [S - pad / 2, pad / 2], [pad / 2, S - pad / 2], [S - pad / 2, S - pad / 2]]) { c.fillStyle = FLOSS[2]; star(c, x, y, pad * .34, 8, .5); c.fill(); c.fillStyle = FLOSS[0]; star(c, x, y, pad * .2, 4, .4, TAU / 8); c.fill(); c.fillStyle = FLOSS[4]; disc(c, x, y, pad * .06); c.fill(); }
      // the field: two indigos, square by square, as pieced cloth
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { c.fillStyle = (x + y) % 2 ? '#262f8c' : '#202878'; c.fillRect(pad + x * cell, pad + y * cell, cell + .5, cell + .5); }
      c.save(); c.beginPath(); c.rect(pad, pad, cell * N, cell * N); c.clip();
      wash(c, clouds(96, 73, '#070a34', 5, .55, 2.2), pad, pad, cell * N, cell * N, .34, 'multiply');
      // wax-drawn, very faint: a small mark in every other square
      c.strokeStyle = alpha(WAX, .1); c.fillStyle = alpha(WAX, .1); c.lineWidth = Math.max(1, cell * .028); c.lineCap = 'round';
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 0) { c.save(); c.translate(pad + (x + .5) * cell, pad + (y + .5) * cell); MOTIF[(x * 2 + y) % 4](c, cell * .3); c.restore(); }
      weave(c, pad, pad, cell * N, cell * N, .16);
      c.restore();
      // the squares, marked in running stitch
      c.strokeStyle = 'rgba(4,6,40,.5)'; c.lineWidth = Math.max(1.4, cell * .05);
      for (let i = 0; i <= N; i++) { c.beginPath(); c.moveTo(pad + i * cell, pad); c.lineTo(pad + i * cell, S - pad); c.moveTo(pad, pad + i * cell); c.lineTo(S - pad, pad + i * cell); c.stroke(); }
      c.strokeStyle = 'rgba(244,244,255,.86)'; c.lineWidth = Math.max(1.3, cell * .034); c.lineCap = 'round'; c.setLineDash([cell * .1, cell * .1]);
      for (let i = 0; i <= N; i++) { c.lineDashOffset = r() * cell * .1; c.beginPath(); c.moveTo(pad + i * cell, pad + cell * .06); c.lineTo(pad + i * cell, S - pad - cell * .06); c.moveTo(pad + cell * .06, pad + i * cell); c.lineTo(S - pad - cell * .06, pad + i * cell); c.stroke(); }
      c.setLineDash([]);
      c.strokeStyle = FLOSS[2]; c.lineWidth = Math.max(1.3, cell * .036);                              // a cross-stitch where they meet
      for (let y = 1; y < N; y++) for (let x = 1; x < N; x++) { const px = pad + x * cell, py = pad + y * cell, q = cell * .055; c.beginPath(); c.moveTo(px - q, py - q); c.lineTo(px + q, py + q); c.moveTo(px + q, py - q); c.lineTo(px - q, py + q); c.stroke(); }
      grain(c, 0, 0, S, S, .16);
    },

    ball: ballOfThread,
    shadow: { a: .46, w: .9, h: .26, y: .88 },
    glow: null,
    pose(b, t, p) {
      if (b.moving) { p.rot = b.roll * 1.7; return; }
      if (!b.picked) return;
      const ms = 700, u = ((t - b.pickT) % ms) / ms;
      hop(u, .14, .1, p); p.rot = (t - b.pickT) / 1000 * 1.3;
    },
    leaveMs: 320,
    leave(b, u, p) { p.rot = u * 7; p.k = 1 - ease.in2(u); p.a = u < .7 ? 1 : 1 - (u - .7) / .3; },
    /** the way it went, sewn: two stitches a square, which fade */
    trail(x, y, i, cell, k, path) {
      const a = path[k], b = path[k + 1]; if (b == null) return;
      const dx = (b % N) - (a % N), dy = Math.floor(b / N) - Math.floor(a / N), rot = Math.atan2(dy, dx);
      for (const f of [.22, .72]) bit({ kind: 'dash', under: true, x: x + dx * cell * f, y: y + dy * cell * f, rot, col: THREAD, size: cell * .14, w: Math.max(2, cell * .055), life: 1.7, fade: .4, fadeIn: .04 });
    },
    land(x, y, i, cell) { for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + TAU / 8; bit({ kind: 'cross', under: true, x: x + Math.cos(a) * cell * .4, y: y + Math.sin(a) * cell * .4, col: FLOSS[2], size: cell * .05, w: Math.max(1.5, cell * .04), life: .6, fade: .5 }); } },
    burst(x, y, i, cell) {
      const col = YARN[i];
      burstOf(10, x, y, a => { const v = cell * (1.6 + Math.random() * 2.6); return { kind: 'thread', col: Math.random() < .35 ? THREAD : col, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.8, rot: Math.random() * TAU, spin: (Math.random() - .5) * 12, curl: .5 + Math.random(), size: cell * (.12 + Math.random() * .1), w: Math.max(1.6, cell * .045), life: .7 + Math.random() * .4, fade: .5 }; });
      for (let k = 0; k < 4; k++) bit({ kind: 'cross', x: x + (Math.random() - .5) * cell * .9, y: y + (Math.random() - .5) * cell * .9, col: FLOSS[k % 3], size: cell * .06, w: Math.max(1.6, cell * .045), rot: Math.random(), life: .6, wait: Math.random() * .15, fade: .6 });
    },
    rise(x, y, i, cell) { for (let k = 0; k < 4; k++) { const a = k * TAU / 4; bit({ kind: 'cross', under: true, x: x + Math.cos(a) * cell * .36, y: y + Math.sin(a) * cell * .36, col: THREAD, size: cell * .045, w: Math.max(1.4, cell * .035), life: .5, fade: .5 }); } },
  });
})();
