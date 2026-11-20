/* ── Phố Đèn Lồng ── the land of red: an old street on a festival night.
   The balls are silk lanterns, each colour a lantern of its own shape, lit from inside. They sway a little on a
   board of dark lacquered wood, and one that is taken off is let go: it rises and goes out among sparks. */
(() => {
  const SILK = ['#f2463c', '#ff9330', '#ffd541', '#63d46c', '#46c9f2', '#6272f4', '#cc70f4'];
  const WOOD = '#3a171a';

  /* the seven shapes, each a path about 0,0 within a circle of radius 1 (the caps and the tassel are added after) */
  const SHAPES = [
    c => { c.beginPath(); c.ellipse(0, 0, .82, .74, 0, 0, TAU); },                                                                    // 0 red: the round one
    c => { c.beginPath(); c.moveTo(0, -.8); c.bezierCurveTo(.62, -.8, .62, .8, 0, .8); c.bezierCurveTo(-.62, .8, -.62, -.8, 0, -.8); },    // 1 orange: the tall one
    c => { star(c, 0, .02, .9, 5, .5); },                                                                                              // 2 yellow: the star of the mid-autumn night
    c => { c.beginPath(); c.moveTo(0, -.84); c.quadraticCurveTo(.5, -.52, .84, 0); c.quadraticCurveTo(.5, .52, 0, .84); c.quadraticCurveTo(-.5, .52, -.84, 0); c.quadraticCurveTo(-.5, -.52, 0, -.84); },   // 3 green: the diamond
    c => { c.beginPath(); c.ellipse(0, 0, .92, .52, 0, 0, TAU); },                                                                    // 4 blue: the flat one
    c => { rr(c, -.56, -.76, 1.12, 1.52, .26); },                                                                                      // 5 indigo: the drum
    c => { c.beginPath(); c.moveTo(0, .78); c.bezierCurveTo(-.5, .78, -1.0, .3, -.86, -.34); c.quadraticCurveTo(-.52, -.2, -.44, -.62); c.quadraticCurveTo(-.18, -.42, 0, -.86); c.quadraticCurveTo(.18, -.42, .44, -.62); c.quadraticCurveTo(.52, -.2, .86, -.34); c.bezierCurveTo(1.0, .3, .5, .78, 0, .78); },   // 6 violet: the lotus
  ];
  const HALF = [.74, .8, .78, .84, .52, .76, .8];          // how far each reaches up and down, for where its caps go

  function lantern(c, i, r) {
    const col = SILK[i], h = HALF[i];
    c.save(); c.scale(r, r);
    // the tassel, behind the body
    c.strokeStyle = shade(col, .2); c.lineWidth = .05; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, h + .2); c.stroke();
    c.fillStyle = col; c.beginPath(); c.moveTo(-.07, h + .16); c.lineTo(.07, h + .16); c.lineTo(.1, h + .42); c.lineTo(-.1, h + .42); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-.07, h + .16, .14, .05);
    // the silk, lit from within: nearly white where the flame is, the colour itself further out, deep at the edge
    SHAPES[i](c);
    c.fillStyle = radial(c, 0, .08, .05, 1, [[0, tint(col, .86)], [.3, tint(col, .42)], [.66, col], [1, shade(col, .32)]]); c.fill();
    c.save(); SHAPES[i](c); c.clip();
    // the ribs the silk is stretched over
    c.strokeStyle = alpha(shade(col, .55), .5); c.lineWidth = .028;
    if (i === 2) { for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; c.beginPath(); c.moveTo(0, .02); c.lineTo(Math.cos(a) * .9, .02 + Math.sin(a) * .9); c.stroke(); c.beginPath(); c.moveTo(0, .02); c.lineTo(Math.cos(a + TAU / 10) * .45, .02 + Math.sin(a + TAU / 10) * .45); c.stroke(); } }
    else if (i === 5) { for (const y of [-.42, -.14, .14, .42]) { c.beginPath(); c.moveTo(-.6, y); c.lineTo(.6, y); c.stroke(); } }
    else if (i === 6) { for (const [x1, x2] of [[-.44, -.3], [.44, .3], [0, 0]]) { c.beginPath(); c.moveTo(x1, -.62); c.quadraticCurveTo(x2 * 1.2, .1, x2 * .4, .78); c.stroke(); } }
    else for (const k of [-.66, -.33, 0, .33, .66]) { c.beginPath(); c.moveTo(0, -h); c.bezierCurveTo(k * 1.5, -h * .6, k * 1.5, h * .6, 0, h); c.stroke(); }
    // paper has grain; and the light falls off towards the foot
    c.fillStyle = linear(c, 0, -1, 0, 1, [[0, 'rgba(255,255,255,.16)'], [.45, 'rgba(255,255,255,0)'], [1, alpha(shade(col, .6), .28)]]); c.fillRect(-1, -1, 2, 2);
    c.restore();
    SHAPES[i](c); c.strokeStyle = alpha(shade(col, .5), .7); c.lineWidth = .035; c.stroke();
    // caps of dark wood, top and bottom, and the loop it hangs by
    const cap = (y, wd) => { c.fillStyle = '#2a1512'; rr(c, -wd, y - .07, wd * 2, .14, .05); c.fill(); c.fillStyle = '#d9a441'; c.fillRect(-wd * .86, y - .02, wd * 1.72, .035); };
    if (i !== 2) { cap(-h, i === 4 ? .34 : i === 5 ? .44 : .24); cap(h, i === 4 ? .3 : i === 5 ? .44 : .2); }
    c.strokeStyle = '#2a1512'; c.lineWidth = .045; c.beginPath(); c.arc(0, -h - .12, .08, 0, TAU); c.stroke();
    c.restore();
  }

  place({
    id: 'lantern', hue: '#d7352e', colour: 0,
    name: { vi: 'Phố Đèn Lồng', en: 'Lantern Street' },
    tag: { vi: 'Đêm hội phố cổ: mỗi màu một dáng đèn, ăn được hàng thì thả đèn bay.', en: 'A festival night in the old town: each colour a lantern of its own, and a line taken is let go into the sky.' },
    dress: { ink: '#fff1dc', soft: 'rgba(255,226,192,.74)', panel: 'rgba(52,12,20,.6)', edge: 'rgba(255,196,128,.3)', accent: '#ffc65e', num: '#ffe6b0' },
    inks: SILK, frame: .034, ballR: .4,
    voice: { kind: 'bell', root: 293.66, scale: [0, 2, 4, 7, 9, 12, 14], wet: .32 },

    backdrop(c, w, h) {
      const r = rng(4201), u = Math.min(w, h);
      c.fillStyle = linear(c, 0, 0, 0, h, [[0, '#0f0926'], [.4, '#241036'], [.78, '#4a1630'], [1, '#6a2028']]); c.fillRect(0, 0, w, h);
      wash(c, clouds(96, 42, '#ff6a3c', 4, .55, 2.4), 0, h * .35, w, h * .65, .22, 'screen');
      // the moon
      { const mx = w - u * .08, my = u * .14 + 8; glowAt(c, mx, my, u * .2, '#ffe7b8', .3); c.fillStyle = '#fff3d2'; disc(c, mx, my, u * .04); c.fill();
        c.fillStyle = 'rgba(214,180,120,.35)'; disc(c, mx - u * .011, my + u * .007, u * .011); c.fill(); disc(c, mx + u * .014, my - u * .012, u * .007); c.fill(); }
      for (let i = 0; i < 70; i++) { c.fillStyle = alpha('#ffffff', r.in(.2, .7)); disc(c, r() * w, r() * h * .5, r.in(.4, 1.1)); c.fill(); }
      // far lights out of focus
      for (let i = 0; i < 26; i++) { const x = r() * w, y = h * r.in(.2, 1), q = u * r.in(.02, .07); c.fillStyle = alpha(r.pick(['#ff7a45', '#ffc24a', '#ff4d5a', '#ffd98a']), r.in(.04, .12)); disc(c, x, y, q); c.fill(); }
      // roofs of the old street, either side, dark against the glow
      const roofs = (side) => {
        let y = h * .34;
        for (let k = 0; k < 7; k++) {
          const wd = u * r.in(.16, .26), ht = u * r.in(.1, .15), x0 = side < 0 ? -wd * .25 : w + wd * .25, x1 = x0 + side * -wd, dark = mix('#160a1c', '#2a1020', k / 7);
          c.fillStyle = dark; c.beginPath(); c.moveTo(x0, y + ht * 1.2); c.lineTo(x0, y); c.quadraticCurveTo(lerp(x0, x1, .55), y - ht * .12, x1 - side * -wd * .06, y - ht * .34); c.quadraticCurveTo(lerp(x0, x1, .8), y + ht * .1, lerp(x0, x1, .86), y + ht * .2); c.lineTo(lerp(x0, x1, .86), y + ht * 1.2); c.closePath(); c.fill();
          for (let j = 0; j < 2; j++) if (r() < .7) { const wx = lerp(x0, x1, r.in(.2, .66)), wy = y + ht * r.in(.36, .7); c.fillStyle = alpha(r.pick(['#ffcf6a', '#ff9a4a', '#ffe6a6']), r.in(.5, .9)); c.fillRect(wx, wy, u * .014, u * .02); glowAt(c, wx + u * .007, wy + u * .01, u * .05, '#ffb45a', .22); }
          y += ht * r.in(.82, 1.05);
        }
      };
      roofs(-1); roofs(1);
      // strings of small lanterns across the street
      for (let s = 0; s < 4; s++) {
        const y0 = h * (.05 + s * .07) + r.in(-6, 6), sag = u * r.in(.03, .07), tilt = r.in(-.03, .03) * h;
        c.strokeStyle = 'rgba(20,10,20,.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-10, y0); c.quadraticCurveTo(w / 2, y0 + sag * 2 + tilt, w + 10, y0 + tilt * 2); c.stroke();
        const n = Math.round(w / (u * .085));
        for (let k = 1; k < n; k++) { const t = k / n, x = lerp(-10, w + 10, t), y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2 + tilt) + t * t * (y0 + tilt * 2), col = r.pick(SILK), q = u * r.in(.009, .014);
          glowAt(c, x, y + q, q * 5, col, .5); c.fillStyle = tint(col, .25); oval(c, x, y + q * 1.2, q * .8, q, 0); c.fill(); c.fillStyle = tint(col, .8); oval(c, x, y + q * 1.2, q * .3, q * .5, 0); c.fill(); }
      }
      grain(c, 0, 0, w, h, .2);
      c.fillStyle = radial(c, w / 2, h * .5, u * .3, Math.hypot(w, h) * .62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(8,2,16,.55)']]); c.fillRect(0, 0, w, h);
    },
    air: {
      make(w, h) { const r = rng(7), out = []; for (let i = 0; i < 34; i++) out.push({ x: r() * w, y: r() * h, v: r.in(6, 20), q: r.in(1, 2.6), ph: r() * 9, col: r.pick(['#ffb347', '#ffd98a', '#ff7a45', '#fff0c0']) }); return out; },
      draw(c, list, t, dt, w, h) {
        c.globalCompositeOperation = 'lighter';
        for (const p of list) {
          p.y -= p.v * dt; p.x += Math.sin(t / 900 + p.ph) * 9 * dt;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          const a = .35 + .5 * (.5 + .5 * Math.sin(t / 380 + p.ph * 4));
          glowAt(c, p.x, p.y, p.q * 5, p.col, a * .5); c.fillStyle = alpha('#fff4d0', a); disc(c, p.x, p.y, p.q * .5); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      },
    },

    board(c, g) {
      const { S, pad, cell } = g, r = rng(4202);
      // the frame: red lacquer, a line of gold let into it
      c.fillStyle = linear(c, 0, 0, S, S, [[0, '#8a1f1d'], [.5, '#6b1517'], [1, '#4a0d12']]); rr(c, 0, 0, S, S, pad * .7); c.fill();
      c.strokeStyle = 'rgba(255,220,150,.26)'; c.lineWidth = 1; rr(c, .5, .5, S - 1, S - 1, pad * .7); c.stroke();
      c.strokeStyle = '#d9a441'; c.lineWidth = Math.max(1, pad * .09); rr(c, pad * .42, pad * .42, S - pad * .84, S - pad * .84, pad * .32); c.stroke();
      // the boards: dark wood, no two quite alike
      c.fillStyle = '#1c0a0d'; c.fillRect(pad, pad, cell * N, cell * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = pad + x * cell, py = pad + y * cell, gap = Math.max(.6, cell * .018), q = cell - gap * 2, tone = mix(WOOD, '#4a2220', r());
        c.fillStyle = linear(c, px, py, px, py + q, [[0, tint(tone, .06)], [1, shade(tone, .12)]]); rr(c, px + gap, py + gap, q, q, cell * .06); c.fill();
        c.save(); rr(c, px + gap, py + gap, q, q, cell * .06); c.clip();
        c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = .8;
        for (let k = 0; k < 5; k++) { const yy = py + q * r(); c.beginPath(); c.moveTo(px, yy); c.bezierCurveTo(px + q * .3, yy + r.in(-3, 3), px + q * .7, yy + r.in(-3, 3), px + cell, yy + r.in(-2, 2)); c.stroke(); }
        c.strokeStyle = 'rgba(255,214,170,.1)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + gap + 2, py + gap + 1); c.lineTo(px + gap + q - 2, py + gap + 1); c.stroke();
        c.restore();
      }
      // the light the lanterns throw gathers in the middle of the board
      c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = radial(c, S / 2, S / 2, 0, S * .68, [[0, 'rgba(255,170,90,.55)'], [1, 'rgba(40,0,20,.5)']]); c.fillRect(pad, pad, cell * N, cell * N); c.restore();
      // gold corners
      c.strokeStyle = '#e8b858'; c.lineWidth = Math.max(1.2, pad * .1); c.lineCap = 'round';
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const x = sx > 0 ? pad * .42 : S - pad * .42, y = sy > 0 ? pad * .42 : S - pad * .42; c.beginPath(); c.moveTo(x + sx * pad * 1.5, y); c.lineTo(x, y); c.lineTo(x, y + sy * pad * 1.5); c.stroke(); }
      grain(c, 0, 0, S, S, .16);
    },

    ball: (c, i, r) => { c.translate(0, -r * .1); lantern(c, i, r); },
    shadow: { a: .42, w: .8, h: .2, y: 1.12 },
    glow: { r: 2.5, a: .5 },
    pose(b, t, p) {
      const ph = b.phase * TAU;
      p.rot = Math.sin(t / 1050 + ph) * .045;
      p.glow = .82 + .18 * Math.sin(t / 310 + ph * 3) * Math.sin(t / 170 + ph);
      if (b.moving) p.rot += Math.sin(b.roll * 2.6) * .12;
      if (b.picked) { const k = (t - b.pickT) / 1000; p.lift = .1 + .035 * Math.sin(k * 5.2); p.rot = Math.sin(k * 5.2) * .16; p.glow = 1.5; }
    },
    leaveMs: 520,
    /** let go: it rises, and its light goes out */
    leave(b, u, p) { p.lift = ease.in2(u) * 1.15; p.dx = Math.sin(u * 5 + b.phase * 6) * .05 * u; p.k = 1 - .25 * u; p.a = u < .45 ? 1 : 1 - (u - .45) / .55; p.glow = 1.8 * (1 - u); p.rot = Math.sin(u * 7) * .1; },
    trail(x, y, i, cell) { for (let k = 0; k < 2; k++) bit({ kind: 'glow', add: true, x: x + (Math.random() - .5) * cell * .3, y: y + (Math.random() - .5) * cell * .3, vy: -cell * (.3 + Math.random() * .5), col: SILK[i], size: cell * (.07 + Math.random() * .06), life: .55 + Math.random() * .3, a: .8 }); },
    land(x, y, i, cell) { burstOf(5, x, y + cell * .2, a => ({ kind: 'glow', add: true, col: '#ffd98a', vx: Math.cos(a) * cell * 1.2, vy: Math.sin(a) * cell * .5 - cell * .4, drag: 3, size: cell * .05, life: .4 })); },
    burst(x, y, i, cell) {
      const col = SILK[i];
      bit({ kind: 'glow', add: true, x, y, col: tint(col, .4), size: cell * .5, grow: cell * 1.4, life: .34, a: .75 });
      for (let k = 0; k < 9; k++) bit({ kind: 'streak', add: true, x: x + (Math.random() - .5) * cell * .5, y: y + (Math.random() - .3) * cell * .4, vx: (Math.random() - .5) * cell * 1.6, vy: -cell * (1.2 + Math.random() * 2.6), g: -cell * .6, drag: 1.1, col: Math.random() < .5 ? '#ffe2a0' : tint(col, .3), size: Math.max(1.2, cell * .028), life: .6 + Math.random() * .5, wait: Math.random() * .12, fade: .6 });
      for (let k = 0; k < 4; k++) bit({ kind: 'glow', add: true, x: x + (Math.random() - .5) * cell * .4, y, vx: (Math.random() - .5) * cell, vy: -cell * (.6 + Math.random()), sway: 5, swayBy: cell * .4, col, size: cell * (.05 + Math.random() * .05), life: .9 + Math.random() * .5, a: .9 });
    },
    rise(x, y, i, cell) { bit({ kind: 'glow', add: true, x, y, col: SILK[i], size: cell * .25, grow: cell * 1.3, life: .4, a: .6 }); },
  });
})();
