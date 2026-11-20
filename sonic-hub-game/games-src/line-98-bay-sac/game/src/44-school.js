/* ── Sân Trường ── the land of yellow: a schoolyard at midday, seen from above.
   The balls are glass marbles, the board is drawn on the cement in chalk, and the shade of the tree by the wall
   moves over both. A marble that goes rolls; a line that is taken goes with the click of glass on glass. */
(() => {
  const GLASS = ['#e8373a', '#f5871f', '#f4c81f', '#34b356', '#2fb7e8', '#3b4fcf', '#b046d8'];
  const CHALK = '#fbf8ee';
  /* the shade of the leaves: soft dark patches, the same ones for the yard and for the board laid on it */
  const SHADE = (() => {
    const r = rng(4405), out = [];
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d = r() * .16; out.push({ x: .02 + Math.cos(a) * d, y: .16 + Math.sin(a) * d, q: r.in(.13, .2), ph: r() * TAU, a: .13 }); }          // the thick of the crown
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = .14 + Math.pow(r(), 1.4) * .34; out.push({ x: .02 + Math.cos(a) * d * .9, y: .16 + Math.sin(a) * d, q: r.in(.016, .042), ph: r() * TAU, a: r.in(.07, .13) }); }   // leaves at its edge, with light between
    return out;
  })();
  let shadeArt = null;
  function leafShade(c, t, ox, oy) {
    if (!shadeArt) { const [cv, k] = sheet(96, 96); k.fillStyle = radial(k, 48, 48, 0, 48, [[0, 'rgba(46,36,10,1)'], [.6, 'rgba(46,36,10,.7)'], [1, 'rgba(46,36,10,0)']]); k.fillRect(0, 0, 96, 96); shadeArt = cv; }
    const w = innerWidth, h = innerHeight, u = Math.min(w, h);
    for (const s of SHADE) { c.globalAlpha = s.a; const q = s.q * u * 2, x = s.x * w + Math.sin(t / 1900 + s.ph) * u * .014 - ox, y = s.y * h + Math.cos(t / 2300 + s.ph) * u * .01 - oy; c.drawImage(shadeArt, x - q / 2, y - q / 2, q, q); }
    c.globalAlpha = 1;
  }
  /** a path drawn in chalk: rough at the edges, and rubbed thin in places */
  function chalked(c, w, h, draw, a) {
    const [cv, k] = sheet(w, h), r = rng(Math.round(w * 7 + h));
    k.strokeStyle = CHALK; k.fillStyle = CHALK; k.lineCap = 'round'; k.lineJoin = 'round';
    draw(k, r);
    k.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < w * h / 26; i++) { k.globalAlpha = r.in(.25, .9); k.fillRect(r() * w, r() * h, r.in(.6, 1.8), r.in(.6, 1.8)); }
    c.save(); c.globalAlpha = a == null ? .9 : a; c.drawImage(cv, 0, 0); c.restore();
  }

  const BLADE = (c, len, wid, bend) => { c.beginPath(); c.moveTo(0, -len); c.bezierCurveTo(wid + bend, -len * .4, wid - bend, len * .4, 0, len); c.bezierCurveTo(-wid - bend, len * .4, -wid + bend, -len * .4, 0, -len); c.closePath(); };
  function marble(c, i, r) {
    const col = GLASS[i], dark = i === 5;
    c.save(); c.scale(r, r);
    // glass: pale and see-through at its edge, the colour gathered where the light comes out on the far side
    disc(c, 0, 0, .9);
    c.fillStyle = dark ? radial(c, 0, 0, .1, .95, [[0, tint(col, .2)], [.6, col], [1, shade(col, .5)]], -.3, -.3) : radial(c, 0, 0, .1, .98, [[0, alpha(tint(col, .82), .78)], [.62, alpha(tint(col, .5), .72)], [1, alpha(shade(col, .12), .9)]], .26, .3);
    c.fill();
    c.save(); disc(c, 0, 0, .9); c.clip();
    c.lineCap = 'round';
    const vane = (rot, len, wid, bend, fill) => { c.save(); c.rotate(rot); BLADE(c, len, wid, bend); c.fillStyle = fill; c.fill(); c.restore(); };
    if (i === 0) { vane(.5, .66, .2, .26, col); vane(.5 + Math.PI / 2, .6, .13, -.2, shade(col, .2)); vane(.5, .5, .06, .26, tint(col, .6)); }
    else if (i === 1) { for (let k = 0; k < 3; k++) { vane(k * TAU / 3 + .3, .62, .15, .22, k === 1 ? shade(col, .15) : col); vane(k * TAU / 3 + .3, .5, .04, .22, tint(col, .65)); } }
    else if (i === 2) { c.strokeStyle = col; c.lineWidth = .17; c.beginPath(); for (let a = 0; a < 9.5; a += .2) { const q = .07 + a * .066; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.stroke(); c.strokeStyle = tint(col, .7); c.lineWidth = .045; c.beginPath(); for (let a = 0; a < 9.5; a += .2) { const q = .07 + a * .066; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.stroke(); }
    else if (i === 3) { vane(-.5, .7, .3, .1, col); vane(-.5, .62, .13, .1, '#f6fff2'); vane(-.5, .5, .045, .1, shade(col, .25)); }
    else if (i === 4) { for (let k = 0; k < 4; k++) vane(k * TAU / 4 + .2, .66, .1, .3, k % 2 ? '#ffffff' : col); }
    else if (i === 5) { const q = rng(445); for (let k = 0; k < 26; k++) { c.fillStyle = alpha(q() < .3 ? '#ffd98a' : '#ffffff', q.in(.5, 1)); disc(c, q.in(-.7, .7), q.in(-.7, .7), q.in(.018, .05)); c.fill(); } c.strokeStyle = alpha('#9fb4ff', .7); c.lineWidth = .07; c.beginPath(); c.arc(.1, .1, .46, 2.4, 5.2); c.stroke(); }
    else { for (const [y, wd, colr] of [[-.42, .13, col], [-.12, .16, '#ffffff'], [.2, .16, col], [.5, .12, shade(col, .2)]]) { c.strokeStyle = colr; c.lineWidth = wd; c.beginPath(); c.ellipse(0, y - .5, 1.3, .62, 0, .5, Math.PI - .5); c.stroke(); } }
    // light gathers at the side away from the sun, inside the glass
    if (!dark) { c.fillStyle = radial(c, .34, .4, 0, .58, [[0, 'rgba(255,255,255,.62)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(-1, -1, 2, 2); }
    c.fillStyle = radial(c, 0, 0, .62, .92, [[0, 'rgba(0,0,0,0)'], [1, alpha(shade(col, .6), .42)]]); c.fillRect(-1, -1, 2, 2);
    c.restore();
    disc(c, 0, 0, .9); c.strokeStyle = alpha(shade(col, .62), .85); c.lineWidth = .045; c.stroke();
    // the sky in it: a bright patch with a soft edge, and a spark
    c.fillStyle = 'rgba(255,255,255,.9)'; c.save(); c.translate(-.38, -.44); c.rotate(-.7); rr(c, -.2, -.1, .4, .2, .09); c.fill(); c.restore();
    c.fillStyle = 'rgba(255,255,255,.55)'; oval(c, -.56, -.14, .05, .12, -.3); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)'; disc(c, .5, .52, .05); c.fill();
    c.restore();
  }
  /* the light a marble throws on the ground through itself: a small bright patch of its colour in its own shade */
  const spots = new Map();
  function spot(i, R) {
    const key = i + ':' + Math.round(R);
    if (!spots.has(key)) { const q = Math.ceil(R * 2), [cv, k] = sheet(q, q); k.fillStyle = radial(k, q / 2, q / 2, 0, q / 2, [[0, alpha(tint(GLASS[i], .6), .95)], [.4, alpha(tint(GLASS[i], .3), .55)], [1, alpha(GLASS[i], 0)]]); k.fillRect(0, 0, q, q); spots.set(key, cv); if (spots.size > 40) spots.delete(spots.keys().next().value); }
    return spots.get(key);
  }

  place({
    id: 'school', hue: '#e0a21a', colour: 2,
    name: { vi: 'Sân Trường', en: 'The Schoolyard' },
    tag: { vi: 'Giờ ra chơi: bàn kẻ phấn trên nền xi măng, bi ve lăn dưới bóng cây bàng.', en: 'Break time: a board chalked on the cement, glass marbles rolling under the shade of the tree.' },
    dress: { ink: '#3a3222', soft: 'rgba(58,50,34,.7)', panel: 'rgba(255,250,232,.74)', edge: 'rgba(90,70,20,.22)', accent: '#1f86d6', num: '#2e2819' },
    inks: GLASS, frame: .03, ballR: .37,
    voice: { kind: 'glass', root: 261.63, scale: [0, 2, 4, 7, 9, 12, 14], wet: .12 },

    backdrop(c, w, h, box) {
      const r = rng(4401), u = Math.min(w, h);
      c.fillStyle = linear(c, 0, 0, w, h, [[0, '#ded6b6'], [.6, '#d3caaa'], [1, '#c7bd9c']]); c.fillRect(0, 0, w, h);
      wash(c, clouds(128, 44, '#8f8566', 5, .55, 2.2), 0, 0, w, h, .3, 'multiply');
      wash(c, clouds(128, 45, '#fff6cf', 5, .5, 2.4), 0, 0, w, h, .5, 'soft-light');
      for (let i = 0; i < w * h / 900; i++) { c.fillStyle = r() < .5 ? 'rgba(70,60,40,.14)' : 'rgba(255,255,240,.2)'; c.fillRect(r() * w, r() * h, r.in(.8, 2), r.in(.8, 2)); }
      // the slabs the yard was poured in, and the cracks that came after
      const slab = u * .46; c.strokeStyle = 'rgba(80,70,48,.34)'; c.lineWidth = 2;
      for (let x = slab * .62; x < w; x += slab) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + r.in(-2, 2), h); c.stroke(); c.strokeStyle = 'rgba(255,255,240,.25)'; c.beginPath(); c.moveTo(x + 2, 0); c.lineTo(x + 2, h); c.stroke(); c.strokeStyle = 'rgba(80,70,48,.34)'; }
      for (let y = slab * .8; y < h; y += slab) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + r.in(-2, 2)); c.stroke(); }
      c.strokeStyle = 'rgba(70,60,40,.4)'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) { let x = r() * w, y = r() * h, a = r() * TAU; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 14; k++) { a += r.in(-.6, .6); x += Math.cos(a) * u * .02; y += Math.sin(a) * u * .02; c.lineTo(x, y); } c.stroke(); }
      // the foot of the yellow wall along the top, and its shade
      const wall = Math.min(46, h * .055);
      c.fillStyle = linear(c, 0, 0, 0, wall, [[0, '#f4c63e'], [1, '#e2a927']]); c.fillRect(0, 0, w, wall);
      wash(c, clouds(64, 46, '#b07a10', 4, .5, 2), 0, 0, w, wall, .3, 'multiply');
      c.fillStyle = '#8c8266'; c.fillRect(0, wall, w, Math.max(3, wall * .1));
      c.fillStyle = linear(c, 0, wall, 0, wall + u * .06, [[0, 'rgba(60,46,10,.3)'], [1, 'rgba(60,46,10,0)']]); c.fillRect(0, wall, w, u * .06);
      // what the children drew: a game of ô ăn quan, noughts and crosses, a sun
      chalked(c, w, h, (k, q) => {
        k.lineWidth = Math.max(2, u * .005);
        const ox = w > h ? w * .8 : w * .06, oy = w > h ? h * .74 : h * .82, cw = u * .042;        // ô ăn quan: two rows of five, a half round at each end
        k.save(); k.translate(ox, oy); k.rotate(-.12);
        for (let i = 0; i <= 5; i++) handLine(k, i * cw, 0, i * cw, cw * 2, q, 1.5), k.stroke();
        for (let j = 0; j <= 2; j++) handLine(k, 0, j * cw, cw * 5, j * cw, q, 1.5), k.stroke();
        k.beginPath(); k.arc(0, cw, cw, Math.PI / 2, Math.PI * 1.5); k.stroke(); k.beginPath(); k.arc(cw * 5, cw, cw, -Math.PI / 2, Math.PI / 2); k.stroke();
        for (let i = 0; i < 10; i++) for (let n = 0; n < 4; n++) { k.beginPath(); k.arc(cw * (i % 5 + .5) + q.in(-.28, .28) * cw, cw * (Math.floor(i / 5) + .5) + q.in(-.28, .28) * cw, cw * .07, 0, TAU); k.fill(); }
        k.restore();
        const sx = w > h ? w * .93 : w * .82, sy = w > h ? h * .5 : h * .9, sr = u * .03;                // a sun
        k.beginPath(); k.arc(sx, sy, sr, 0, TAU); k.stroke(); for (let i = 0; i < 9; i++) { const a = i * TAU / 9; handLine(k, sx + Math.cos(a) * sr * 1.4, sy + Math.sin(a) * sr * 1.4, sx + Math.cos(a) * sr * 2.1, sy + Math.sin(a) * sr * 2.1, q, 1); k.stroke(); }
        const tx = w > h ? w * .015 : w * .62, ty = w > h ? h * .5 : h * .955, tc = u * .028;          // noughts and crosses
        if (w > h) for (let i = 1; i < 3; i++) { handLine(k, tx + i * tc, ty, tx + i * tc, ty + tc * 3, q, 1.2); k.stroke(); handLine(k, tx, ty + i * tc, tx + tc * 3, ty + i * tc, q, 1.2); k.stroke(); }
        if (w > h) { k.beginPath(); k.arc(tx + tc * .5, ty + tc * .5, tc * .3, 0, TAU); k.stroke(); k.beginPath(); k.moveTo(tx + tc * 1.2, ty + tc * 1.2); k.lineTo(tx + tc * 1.8, ty + tc * 1.8); k.moveTo(tx + tc * 1.8, ty + tc * 1.2); k.lineTo(tx + tc * 1.2, ty + tc * 1.8); k.stroke(); k.beginPath(); k.arc(tx + tc * 2.5, ty + tc * 2.5, tc * .3, 0, TAU); k.stroke(); }
      }, .7);
      // leaves of the bàng tree, yellow and rust, where the wind left them
      for (let i = 0; i < 34; i++) { const x = r() * w, y = wall + r() * (h - wall), len = u * r.in(.022, .04), rot = r() * TAU, col = r.pick(['#e9b52a', '#d9861f', '#c8562a', '#f0cb4a', '#b8a03a']);
        if (box && x > box.x - len && x < box.x + box.w + len && y > box.y - len && y < box.y + box.h + len) continue;          // none where the game is played: a leaf there would be taken for a piece
        c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = 'rgba(50,40,10,.22)'; c.beginPath(); c.ellipse(len * .06, len * .1, len, len * .52, 0, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.moveTo(-len, 0); c.bezierCurveTo(-len * .4, -len * .7, len * .6, -len * .6, len, 0); c.bezierCurveTo(len * .6, len * .6, -len * .4, len * .7, -len, 0); c.fill();
        c.strokeStyle = alpha(shade(col, .4), .6); c.lineWidth = 1; c.beginPath(); c.moveTo(-len * 1.2, 0); c.lineTo(len * .9, 0); for (let k = -2; k <= 2; k++) { c.moveTo(k * len * .28, 0); c.lineTo(k * len * .28 + len * .2, -len * .34); c.moveTo(k * len * .28, 0); c.lineTo(k * len * .28 + len * .2, len * .34); } c.stroke(); c.restore(); }
      grain(c, 0, 0, w, h, .2);
    },
    air: {
      make(w, h) { const r = rng(3), out = []; for (let i = 0; i < 5; i++) out.push({ x: r() * w, y: r() * h, v: r.in(22, 40), ph: r() * 9, q: r.in(7, 12), col: r.pick(['#e9b52a', '#d9861f', '#f0cb4a']) }); return out; },
      draw(c, list, t, dt, w, h) {
        leafShade(c, t, 0, 0);
        for (const p of list) {       // a leaf coming down, now and then
          p.y += p.v * dt; p.x += Math.sin(t / 700 + p.ph) * 26 * dt;
          if (p.y > h + 20) { p.y = -20 - Math.random() * h * .8; p.x = Math.random() * w; }
          c.save(); c.translate(p.x, p.y); c.rotate(Math.sin(t / 500 + p.ph) * .9 + p.ph); c.scale(1, .35 + .65 * Math.abs(Math.sin(t / 420 + p.ph)));
          c.fillStyle = p.col; c.beginPath(); c.moveTo(-p.q, 0); c.quadraticCurveTo(0, -p.q * .7, p.q, 0); c.quadraticCurveTo(0, p.q * .7, -p.q, 0); c.fill(); c.restore();
        }
      },
    },
    /** the shade passes over the board and the marbles as it does over the yard */
    over(c, g, t) { c.save(); rr(c, 0, 0, g.S, g.S, 4); c.clip(); leafShade(c, t, g.ox, g.oy); c.restore(); },

    board(c, g) {
      const { S, pad, cell } = g;
      // the patch of yard the game is on: swept, a little lighter
      c.fillStyle = 'rgba(255,252,236,.2)'; rr(c, pad * .3, pad * .3, S - pad * .6, S - pad * .6, pad * .5); c.fill();
      chalked(c, S, S, (k, q) => {
        const thin = Math.max(1.6, cell * .04), thick = Math.max(2.6, cell * .075);
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= N; i++) {
          const rim = i === 0 || i === N, v = pad + i * cell;
          k.lineWidth = (rim ? thick : thin) * (pass ? .55 : 1); k.globalAlpha = pass ? .55 : .92;
          handLine(k, v + q.in(-1, 1), pad - (rim ? 0 : q.in(0, 5)), v + q.in(-1, 1), S - pad + (rim ? 0 : q.in(0, 5)), q, cell * .022, 12); k.stroke();
          handLine(k, pad - (rim ? 0 : q.in(0, 5)), v + q.in(-1, 1), S - pad + (rim ? 0 : q.in(0, 5)), v + q.in(-1, 1), q, cell * .022, 12); k.stroke();
        }
        k.globalAlpha = 1;
      }, .88);
    },

    ball: marble,
    shadow: { a: .42, w: .9, h: .34, y: .7 },
    glow: null,
    /** the patch of coloured light in a marble's shade */
    floor(c, b, x, y, R, k, a) { const q = R * 1.25 * k; c.globalAlpha = .8 * a; c.globalCompositeOperation = 'lighter'; c.drawImage(spot(b.c, R), x + R * .2 * k - q / 2, y + R * .74 * k - q * .3, q, q * .6); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; },
    pose(b, t, p) {
      if (b.moving) { p.rot = b.roll * 2.4; return; }
      if (!b.picked) return;
      const k = (t - b.pickT) / 1000;                 // held under a finger, ready to be flicked: it turns and shifts about
      p.rot = k * 3.4; p.dx = Math.cos(k * 6.5) * .028; p.dy = Math.sin(k * 6.5) * .02; p.lift = .03 + .02 * Math.sin(k * 6.5);
    },
    leaveMs: 230,
    leave(b, u, p) { p.k = u < .2 ? 1 + .12 * (u / .2) : 1.12 * (1 - ease.out2((u - .2) / .8)); p.a = 1 - ease.in2(u); p.rot = u * 4; },
    trail(x, y, i, cell) { bit({ kind: 'dot', under: true, x: x + (Math.random() - .5) * cell * .2, y: y + cell * .22, col: 'rgba(250,246,228,.75)', size: cell * .05, grow: cell * .22, life: .5, a: .55 }); },
    land(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y: y + cell * .2, col: 'rgba(250,246,228,.8)', size: cell * .16, grow: cell * .8, w: 1.6, life: .3 }); },
    burst(x, y, i, cell) {
      const col = GLASS[i];
      bit({ kind: 'star', x, y, col: '#ffffff', size: cell * .2, grow: cell * 1.6, life: .2, a: .95 });
      burstOf(8, x, y, a => { const v = cell * (2.4 + Math.random() * 3); return { kind: 'shard', col: tint(col, .25), col2: 'rgba(255,255,255,.85)', vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3, rot: Math.random() * TAU, spin: (Math.random() - .5) * 16, size: cell * (.045 + Math.random() * .05), life: .45 + Math.random() * .25, fade: .5 }; });
      bit({ kind: 'ring', under: true, x, y: y + cell * .1, col: 'rgba(250,246,228,.85)', size: cell * .2, grow: cell * 1.5, w: 2, life: .34 });
    },
    rise(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y: y + cell * .18, col: 'rgba(250,246,228,.7)', size: cell * .1, grow: cell * .9, w: 1.5, life: .3 }); },
  });
})();
