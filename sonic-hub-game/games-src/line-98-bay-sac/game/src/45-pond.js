/* ── Đầm Sen ── the land of green: a lotus pond, seen from above.
   The board is eighty-one lily pads on still water, and the balls are flowers, each colour a flower with petals of
   its own. A ball to come is a closed bud. Koi pass under the pads. A line taken off scatters as petals. */
(() => {
  const BLOOM = ['#e0283f', '#f58a1c', '#f7d030', '#52b34a', '#3fb2ee', '#4350c8', '#b24fd6'];

  /** a ring of n petals about 0,0. o: { r0: where they start, len, wid, tip: 0 pointed … 1 round, rot, a, b: colour at the foot and at the tip, line } */
  function ring(c, n, o) {
    for (let k = 0; k < n; k++) {
      c.save(); c.rotate((o.rot || 0) + k * TAU / n);
      const r0 = o.r0 || .08, L = o.len, wd = o.wid, tip = o.tip || 0;
      c.beginPath(); c.moveTo(0, -r0); c.bezierCurveTo(wd, -r0 - (L - r0) * .22, wd * (.55 + tip * .6), -L * (.82 + tip * .16), 0, -L); c.bezierCurveTo(-wd * (.55 + tip * .6), -L * (.82 + tip * .16), -wd, -r0 - (L - r0) * .22, 0, -r0); c.closePath();
      c.fillStyle = linear(c, 0, -r0, 0, -L, [[0, o.a], [1, o.b]]); c.fill();
      c.strokeStyle = alpha(shade(o.a, .45), .55); c.lineWidth = .022; c.stroke();
      if (o.line) { c.strokeStyle = o.line; c.lineWidth = .03; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r0 - .04); c.lineTo(0, -L * .8); c.stroke(); }
      c.restore();
    }
  }
  const heart = (c, q, col, dots) => { c.fillStyle = radial(c, 0, 0, 0, q, [[0, tint(col, .5)], [1, shade(col, .12)]]); disc(c, 0, 0, q); c.fill(); if (dots) for (let k = 0; k < dots; k++) { const a = k * TAU / dots; c.fillStyle = shade(col, .35); disc(c, Math.cos(a) * q * .62, Math.sin(a) * q * .62, q * .11); c.fill(); } };
  const FLOWER = [
    c => { const col = BLOOM[0]; ring(c, 8, { len: .96, wid: .3, a: shade(col, .22), b: col }); ring(c, 8, { len: .72, wid: .25, rot: TAU / 16, a: col, b: tint(col, .3) }); ring(c, 6, { len: .44, wid: .18, a: tint(col, .35), b: tint(col, .6) }); heart(c, .17, '#f6c531', 7); },
    c => { const col = BLOOM[1]; ring(c, 14, { len: .92, wid: .19, tip: 1, a: shade(col, .2), b: col }); ring(c, 12, { len: .7, wid: .17, tip: 1, rot: .2, a: col, b: tint(col, .22) }); ring(c, 9, { len: .46, wid: .15, tip: 1, rot: .1, a: tint(col, .15), b: tint(col, .42) }); heart(c, .13, '#c85a0e', 0); },
    c => { const col = BLOOM[2]; ring(c, 16, { len: .97, wid: .1, a: shade(col, .12), b: tint(col, .3) }); ring(c, 12, { len: .68, wid: .1, rot: TAU / 32, a: col, b: tint(col, .5) }); heart(c, .27, '#f08a1a', 9); },
    c => { const col = BLOOM[3]; ring(c, 10, { len: .96, wid: .25, tip: .9, a: tint(col, .45), b: '#f4ffdc' });           // the seed head: a disc with its seeds showing
      c.fillStyle = radial(c, 0, 0, 0, .62, [[0, tint(col, .3)], [.75, col], [1, shade(col, .32)]]); disc(c, 0, 0, .6); c.fill(); c.strokeStyle = alpha(shade(col, .5), .7); c.lineWidth = .035; c.stroke();
      for (let k = 0; k < 7; k++) { const a = k * TAU / 6, d = k === 6 ? 0 : .36, x = Math.cos(a) * d, y = Math.sin(a) * d; c.fillStyle = shade(col, .45); disc(c, x, y, .1); c.fill(); c.fillStyle = '#e8f2b0'; disc(c, x - .02, y - .02, .055); c.fill(); } },
    c => { const col = BLOOM[4]; ring(c, 5, { len: 1, wid: .46, a: shade(col, .15), b: tint(col, .28), line: 'rgba(255,255,255,.5)' }); ring(c, 5, { len: .62, wid: .3, rot: TAU / 10, a: col, b: tint(col, .55) }); c.fillStyle = '#f7d030'; star(c, 0, 0, .25, 5, .5, TAU / 10); c.fill(); c.fillStyle = '#e89a14'; disc(c, 0, 0, .09); c.fill(); },
    c => { const col = BLOOM[5]; ring(c, 6, { len: .56, wid: .3, tip: 1, rot: TAU / 12, a: tint(col, .28), b: tint(col, .55) }); ring(c, 6, { len: 1, wid: .21, a: shade(col, .1), b: tint(col, .12), line: 'rgba(255,255,255,.75)' }); heart(c, .15, '#fff3c4', 0); c.fillStyle = '#f0b429'; disc(c, 0, 0, .07); c.fill(); },
    c => { const col = BLOOM[6]; ring(c, 10, { len: .94, wid: .25, a: shade(col, .12), b: '#f6cdf4' }); ring(c, 10, { len: .62, wid: .2, rot: TAU / 20, a: col, b: tint(col, .5) }); c.strokeStyle = '#f7d030'; c.lineWidth = .028; c.lineCap = 'round'; for (let k = 0; k < 14; k++) { const a = k * TAU / 14; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * .3, Math.sin(a) * .3); c.stroke(); } heart(c, .1, '#f0a414', 0); },
  ];
  /** a pad: a round leaf with a slit to its middle */
  function pad(c, x, y, q, slit, col) {
    const path = () => { c.beginPath(); c.moveTo(x, y); c.arc(x, y, q, slit + .16, slit + TAU - .16); c.closePath(); };
    c.save(); c.translate(q * .05, q * .09); path(); c.fillStyle = 'rgba(0,26,30,.34)'; c.fill(); c.restore();
    path(); c.fillStyle = radial(c, x, y, q * .05, q, [[0, tint(col, .2)], [.7, col], [1, shade(col, .28)]], x - q * .2, y - q * .25); c.fill();
    c.strokeStyle = alpha(shade(col, .5), .55); c.lineWidth = Math.max(.8, q * .035); c.lineJoin = 'round'; c.stroke();
    c.strokeStyle = alpha(tint(col, .55), .3); c.lineWidth = Math.max(.6, q * .022);
    for (let k = 1; k < 12; k++) { const a = slit + .16 + (TAU - .32) * k / 12; c.beginPath(); c.moveTo(x + Math.cos(a) * q * .12, y + Math.sin(a) * q * .12); c.lineTo(x + Math.cos(a) * q * .9, y + Math.sin(a) * q * .9); c.stroke(); }
  }

  /* koi: each a spine that bends as it swims; where it goes it decides a little at a time */
  const COAT = [['#fdf6ea', '#f0531f'], ['#f8a01c', '#fdf6ea'], ['#fdf6ea', '#1c1c22'], ['#f0531f', '#fdf6ea'], ['#f6c531', '#f0531f']];
  function koi(c, f, t) {
    const n = 12, pts = [], L = f.len, wag = t / 210 * f.speedK + f.ph;
    for (let i = 0; i <= n; i++) { const s = i / n, side = Math.sin(wag - s * 3.6) * L * .075 * (.25 + s), bx = f.x - Math.cos(f.a) * L * s - Math.sin(f.a) * side, by = f.y - Math.sin(f.a) * L * s + Math.cos(f.a) * side, wd = L * .13 * Math.pow(Math.sin(Math.PI * Math.min(1, s * .86 + .13)), .8) * (1 - s * .35); pts.push([bx, by, wd]); }
    const nrm = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
    const body = () => { c.beginPath(); for (let i = 0; i <= n; i++) { const m = nrm(i); c[i ? 'lineTo' : 'moveTo'](pts[i][0] + m[0] * pts[i][2], pts[i][1] + m[1] * pts[i][2]); } for (let i = n; i >= 0; i--) { const m = nrm(i); c.lineTo(pts[i][0] - m[0] * pts[i][2], pts[i][1] - m[1] * pts[i][2]); } c.closePath(); };
    c.save(); c.globalAlpha = .62;
    // fins and tail first, see-through
    c.fillStyle = alpha(f.coat[0], .6);
    for (const side of [-1, 1]) { const m = nrm(3), p = pts[3]; c.beginPath(); c.moveTo(p[0] + m[0] * p[2] * side, p[1] + m[1] * p[2] * side); c.lineTo(p[0] + m[0] * p[2] * 2.7 * side - Math.cos(f.a) * L * .13, p[1] + m[1] * p[2] * 2.7 * side - Math.sin(f.a) * L * .13); c.lineTo(pts[5][0] + m[0] * pts[5][2] * side, pts[5][1] + m[1] * pts[5][2] * side); c.fill(); }
    { const e = pts[n], m = nrm(n), dx = e[0] - pts[n - 1][0], dy = e[1] - pts[n - 1][1]; c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[0] + dx * 3 + m[0] * L * .13, e[1] + dy * 3 + m[1] * L * .13); c.lineTo(e[0] + dx * 1.6, e[1] + dy * 1.6); c.lineTo(e[0] + dx * 3 - m[0] * L * .13, e[1] + dy * 3 - m[1] * L * .13); c.closePath(); c.fill(); }
    body(); c.fillStyle = f.coat[0]; c.fill();
    c.save(); body(); c.clip(); c.fillStyle = f.coat[1];
    for (const [s, q] of f.patches) { const i = Math.round(s * n); disc(c, pts[i][0], pts[i][1], L * q); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(10,20,20,.8)'; for (const side of [-1, 1]) { const m = nrm(1); disc(c, pts[1][0] + m[0] * pts[1][2] * .6 * side, pts[1][1] + m[1] * pts[1][2] * .6 * side, L * .013); c.fill(); }
    c.restore();
  }

  place({
    id: 'pond', hue: '#2f9a55', colour: 3,
    name: { vi: 'Đầm Sen', en: 'The Lotus Pond' },
    tag: { vi: 'Tám mươi mốt lá súng trên mặt nước lặng, hoa nở mỗi màu một dáng, cá chép lượn bên dưới.', en: 'Eighty-one lily pads on still water, a flower of its own for each colour, koi passing underneath.' },
    dress: { ink: '#f2fff6', soft: 'rgba(214,246,226,.76)', panel: 'rgba(6,50,50,.56)', edge: 'rgba(190,255,224,.28)', accent: '#ffd0e6', num: '#f6fff8' },
    inks: BLOOM, frame: .022, ballR: .37,
    voice: { kind: 'drop', root: 261.63, scale: [0, 2, 4, 7, 9, 12, 14], wet: .36 },

    backdrop(c, w, h, box) {
      const r = rng(4501), u = Math.min(w, h);
      c.fillStyle = radial(c, w * .5, h * .46, u * .1, Math.hypot(w, h) * .62, [[0, '#1c8c7a'], [.5, '#10655f'], [1, '#083c44']]); c.fillRect(0, 0, w, h);
      wash(c, clouds(128, 51, '#03282e', 5, .55, 2.4), 0, 0, w, h, .5, 'multiply');
      wash(c, clouds(128, 52, '#8ff0d0', 5, .5, 2.8), 0, 0, w, h, .26, 'screen');
      // weed deep down, and light on the water
      for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(4,40,36,.2)'; blob(c, r() * w, r() * h, u * r.in(.05, .14), r, .3, 8); c.fill(); }
      for (let i = 0; i < 12; i++) glowAt(c, r() * w, r() * h, u * r.in(.05, .14), '#c9ffe9', r.in(.03, .09));
      // the great leaves of the lotus, round the edges
      const big = (x, y, q, col, seed) => {
        const s = rng(seed), path = () => blob(c, x, y, q, rng(seed), .07, 14);
        c.save(); c.translate(q * .06, q * .1); path(); c.fillStyle = 'rgba(0,24,28,.36)'; c.fill(); c.restore();
        path(); c.fillStyle = radial(c, x, y, q * .05, q * 1.05, [[0, tint(col, .22)], [.6, col], [1, shade(col, .3)]], x - q * .2, y - q * .25); c.fill();
        c.save(); path(); c.clip(); c.strokeStyle = alpha(tint(col, .6), .26); c.lineWidth = Math.max(1, q * .012);
        for (let k = 0; k < 18; k++) { const a = k * TAU / 18 + s() * .1; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .1) * q * .5, y + Math.sin(a + .1) * q * .5, x + Math.cos(a) * q * 1.1, y + Math.sin(a) * q * 1.1); c.stroke(); }
        c.fillStyle = alpha(shade(col, .5), .5); disc(c, x, y, q * .05); c.fill(); c.restore();
        path(); c.strokeStyle = alpha(shade(col, .55), .5); c.lineWidth = Math.max(1, q * .018); c.stroke();
      };
      const free = (x, y, q) => !box || x + q < box.x - 6 || x - q > box.x + box.w + 6 || y + q < box.y - 6 || y - q > box.y + box.h + 6;
      const spots2 = [];
      for (let i = 0; i < 60 && spots2.length < 11; i++) { const q = u * r.in(.07, .15), x = r.in(-.05, 1.05) * w, y = r.in(-.05, 1.05) * h; if (free(x, y, q * .7) && !spots2.some(p => Math.hypot(p[0] - x, p[1] - y) < (p[2] + q) * .8)) { spots2.push([x, y, q]); big(x, y, q, r.pick(['#3f9a50', '#4aa85a', '#35864a', '#58b066']), 500 + i); } }
      // a few flowers open among them, and buds
      spots2.filter(p => p[1] > h * .34).slice(0, 5).forEach((p, i) => { const q = p[2] * .5; c.save(); c.translate(p[0] + p[2] * .5, p[1] - p[2] * .2); c.fillStyle = 'rgba(0,24,28,.3)'; disc(c, q * .1, q * .14, q * .9); c.fill(); c.scale(q, q); c.rotate(i); FLOWER[[0, 6, 2, 0, 4][i]](c); c.restore(); });
      // reeds over a corner
      c.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const x0 = r.in(-.02, .16) * w, len = u * r.in(.25, .5), lean = r.in(.1, .6); c.strokeStyle = r.pick(['#1f5a34', '#2c7040', '#184a2c']); c.lineWidth = u * r.in(.006, .012); c.beginPath(); c.moveTo(x0, h + 10); c.quadraticCurveTo(x0 + len * lean * .3, h - len * .6, x0 + len * lean, h - len); c.stroke(); }
      grain(c, 0, 0, w, h, .2);
      c.fillStyle = radial(c, w / 2, h / 2, u * .34, Math.hypot(w, h) * .64, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,20,26,.5)']]); c.fillRect(0, 0, w, h);
    },
    air: {
      make(w, h) {
        const r = rng(5), fish = [], rings = [];
        for (let i = 0; i < 5; i++) fish.push({ x: r() * w, y: r() * h, a: r() * TAU, turn: 0, len: Math.min(w, h) * r.in(.11, .17), speed: r.in(20, 34), speedK: r.in(.8, 1.3), ph: r() * 9, coat: COAT[i % COAT.length], patches: [[.1, r.in(.05, .09)], [r.in(.3, .45), r.in(.06, .1)], [r.in(.6, .8), r.in(.04, .08)]] });
        for (let i = 0; i < 4; i++) rings.push({ x: r() * w, y: r() * h, age: r() * 4 });
        return { fish, rings };
      },
      draw(c, s, t, dt, w, h) {
        for (const f of s.fish) {
          f.turn += (Math.random() - .5) * 1.6 * dt; f.turn *= .985; f.a += f.turn * dt * 2;
          const m = f.len;                             // near an edge it turns back towards the middle
          if (f.x < -m || f.x > w + m || f.y < -m || f.y > h + m) { const home = Math.atan2(h / 2 - f.y, w / 2 - f.x); let d = home - f.a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; f.a += d * dt * 1.2; }
          f.x += Math.cos(f.a) * f.speed * dt; f.y += Math.sin(f.a) * f.speed * dt;
          koi(c, f, t);
        }
        for (const q of s.rings) {                     // a ring on the water, where something touched it
          q.age += dt; if (q.age > 4.2) { q.age = 0; q.x = Math.random() * w; q.y = Math.random() * h; }
          const u2 = q.age / 2.2; if (u2 < 1) { c.strokeStyle = `rgba(214,255,240,${.3 * (1 - u2)})`; c.lineWidth = 1.4; for (const k of [1, .62]) { c.beginPath(); c.ellipse(q.x, q.y, 46 * u2 * k + 3, 46 * u2 * k + 3, 0, 0, TAU); c.stroke(); } }
        }
      },
    },

    board(c, g) {
      const { S, pad: pd, cell } = g, r = rng(4502);
      // the water the pads lie on: a little darker, so the pond's own leaves stay out of the game
      c.fillStyle = 'rgba(2,34,40,.4)'; rr(c, 0, 0, S, S, cell * .5); c.fill();
      c.strokeStyle = 'rgba(190,255,230,.2)'; c.lineWidth = 1.5; rr(c, 1.5, 1.5, S - 3, S - 3, cell * .5); c.stroke();
      const greens = ['#3f9c52', '#48a65a', '#368e4c', '#52ae60', '#419a58'];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        pad(c, pd + (x + .5) * cell + r.in(-1, 1) * cell * .012, pd + (y + .5) * cell + r.in(-1, 1) * cell * .012, cell * r.in(.455, .485), r() * TAU, r.pick(greens));
      for (let i = 0; i < 16; i++) { const x = pd + (r.int(N) + r.in(.25, .75)) * cell, y = pd + (r.int(N) + r.in(.25, .75)) * cell, q = cell * r.in(.02, .04); c.fillStyle = 'rgba(230,255,250,.5)'; disc(c, x, y, q); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; disc(c, x - q * .3, y - q * .3, q * .32); c.fill(); }      // drops of water on the leaves
      grain(c, 0, 0, S, S, .14);
    },

    ball: (c, i, r) => { c.scale(r * 1.06, r * 1.06); FLOWER[i](c); },
    /** a ball to come is a bud: closed, in its colour, its green cup showing */
    seed(c, i, r) {
      const col = BLOOM[i], q = r * .4;
      c.fillStyle = 'rgba(0,26,30,.3)'; disc(c, q * .1, q * .16, q); c.fill();
      for (let k = 0; k < 3; k++) { c.save(); c.rotate(k * TAU / 3 + .4); c.fillStyle = '#4a9e50'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(q * .7, -q * .5, 0, -q * 1.3); c.quadraticCurveTo(-q * .7, -q * .5, 0, 0); c.fill(); c.restore(); }
      c.fillStyle = radial(c, 0, 0, 0, q, [[0, tint(col, .5)], [.7, col], [1, shade(col, .25)]], -q * .3, -q * .3); disc(c, 0, 0, q * .86); c.fill();
      c.strokeStyle = alpha(shade(col, .4), .7); c.lineWidth = Math.max(.8, q * .09); c.beginPath(); c.arc(q * .1, q * .1, q * .5, 3.3, 5.9); c.stroke(); c.beginPath(); c.arc(-q * .2, 0, q * .5, -.6, 1.4); c.stroke();
    },
    shadow: { a: .36, w: 1.04, h: 1.04, y: .1 },
    glow: null,
    pose(b, t, p) {
      const ph = b.phase * TAU;
      p.k = 1 + .02 * Math.sin(t / 950 + ph); p.rot = .06 * Math.sin(t / 1500 + ph * 2);
      if (b.moving) p.rot += b.roll * .5;
      if (b.picked) { const k = (t - b.pickT) / 1000; p.rot = k * .85; p.k = 1.1 + .045 * Math.sin(k * 5); p.lift = .03; }
    },
    /** round the pad of the flower that is picked, rings go out over the water */
    under(c, x, y, cell, dt) {
      for (let k = 0; k < 3; k++) { const u2 = ((dt / 1500) + k / 3) % 1; c.strokeStyle = `rgba(255,224,238,${.75 * (1 - u2)})`; c.lineWidth = Math.max(1.2, cell * .03 * (1 - u2 * .5)); disc(c, x, y, cell * (.4 + .34 * u2)); c.stroke(); }
    },
    leaveMs: 300,
    leave(b, u, p) { p.rot = u * 2.4; p.k = u < .2 ? 1 + .15 * (u / .2) : 1.15 * (1 - ease.in2((u - .2) / .8)); p.a = 1 - ease.in3(u); },
    trail(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y, col: 'rgba(220,255,244,.7)', size: cell * .15, grow: cell * .75, w: 1.4, life: .7, a: .7 }); },
    land(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y, col: 'rgba(220,255,244,.85)', size: cell * .3, grow: cell * .9, w: 2, life: .6 }); for (let k = 0; k < 4; k++) bit({ kind: 'drop', x, y, vx: (Math.random() - .5) * cell * 3, vy: -cell * (1.5 + Math.random() * 2), g: cell * 12, col: 'rgba(225,255,248,.85)', size: cell * .03, life: .4 }); },
    burst(x, y, i, cell) {
      const col = BLOOM[i];
      burstOf(11, x, y, a => { const v = cell * (1.2 + Math.random() * 2.2); return { kind: 'petal', col: Math.random() < .5 ? tint(col, .3) : col, col2: alpha(shade(col, .3), .5), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.6, rot: a + Math.PI / 2, spin: (Math.random() - .5) * 5, flip: 3 + Math.random() * 3, size: cell * (.1 + Math.random() * .06), life: .95 + Math.random() * .5, fade: .45 }; });
      bit({ kind: 'ring', under: true, x, y, col: 'rgba(220,255,244,.9)', size: cell * .3, grow: cell * 1.3, w: 2.2, life: .7 });
      bit({ kind: 'ring', under: true, x, y, col: 'rgba(220,255,244,.6)', size: cell * .2, grow: cell * 1.1, w: 1.4, life: .9, wait: .12 });
    },
    rise(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y, col: 'rgba(220,255,244,.75)', size: cell * .2, grow: cell * .8, w: 1.6, life: .55 }); },
  });
})();
