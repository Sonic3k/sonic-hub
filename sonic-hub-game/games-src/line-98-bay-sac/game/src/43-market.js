/* ── Chợ Quê ── the land of orange: a country market in the late afternoon.
   The balls are fruit laid out on a tray of smoked bamboo, each colour a fruit of its own: strawberry, orange, mango,
   watermelon, blueberry, mangosteen, dragon fruit. (The Lines 98 of the house had a skin of fruit on a basket for
   a while; this is that memory painted anew, not that skin.) */
(() => {
  const FRUIT = ['#e3342f', '#f7861c', '#f8cc2a', '#3f9f47', '#4b9be6', '#5a3f9e', '#d23fae'];
  const LEAF = '#4f9a3a';
  const leaf = (c, x, y, len, rot, col) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col || LEAF; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * .5, -len * .34, len, 0); c.quadraticCurveTo(len * .5, len * .34, 0, 0); c.fill(); c.strokeStyle = alpha(shade(col || LEAF, .4), .7); c.lineWidth = len * .05; c.beginPath(); c.moveTo(len * .08, 0); c.lineTo(len * .86, 0); c.stroke(); c.restore(); };
  const shine = (c, x, y, rx, ry, rot, a) => { c.fillStyle = `rgba(255,255,255,${a})`; oval(c, x, y, rx, ry, rot); c.fill(); };
  const edge = (c, path, col) => { path(); c.strokeStyle = alpha(shade(col, .6), .55); c.lineWidth = .05; c.lineJoin = 'round'; c.stroke(); };

  const DRAW = [
    c => {    // 0 strawberry
      const col = FRUIT[0], body = () => { c.beginPath(); c.moveTo(0, -.56); c.bezierCurveTo(.5, -.92, 1.04, -.44, .78, .1); c.bezierCurveTo(.6, .5, .26, .82, 0, .92); c.bezierCurveTo(-.26, .82, -.6, .5, -.78, .1); c.bezierCurveTo(-1.04, -.44, -.5, -.92, 0, -.56); c.closePath(); };
      body(); c.fillStyle = radial(c, 0, 0, .05, 1.15, [[0, tint(col, .3)], [.5, col], [1, shade(col, .42)]], -.3, -.35); c.fill();
      c.save(); body(); c.clip();
      for (let row = 0; row < 6; row++) for (let k = -3; k <= 3; k++) { const x = k * .3 + (row % 2 ? .15 : 0), y = -.42 + row * .25; c.fillStyle = 'rgba(120,20,16,.35)'; oval(c, x, y + .02, .05, .07, 0); c.fill(); c.fillStyle = '#ffe9a0'; oval(c, x, y, .034, .052, 0); c.fill(); }
      shine(c, -.34, -.28, .2, .11, -.6, .5); c.restore();
      edge(c, body, col);
      for (const a of [-2.5, -1.95, -1.57, -1.2, -.65]) leaf(c, 0, -.56, .5, a, '#3f9a3a');
      c.fillStyle = '#6fbf4a'; disc(c, 0, -.58, .09); c.fill();
    },
    c => {    // 1 orange
      const col = FRUIT[1], r = rng(431);
      c.save(); c.translate(0, .06); sphere(c, .86, col, { core: .36, dark: .36, rim: .4 });
      c.save(); disc(c, 0, 0, .86); c.clip();
      for (let i = 0; i < 70; i++) { const a = r() * TAU, d = Math.sqrt(r()) * .82, x = Math.cos(a) * d, y = Math.sin(a) * d; c.fillStyle = r() < .5 ? 'rgba(160,70,0,.22)' : 'rgba(255,230,170,.3)'; disc(c, x, y, .022); c.fill(); }
      shine(c, -.32, -.36, .2, .12, -.6, .5); c.restore();
      edge(c, () => disc(c, 0, 0, .86), col);
      c.fillStyle = '#5a7f2a'; star(c, .04, -.8, .1, 5, .5); c.fill();
      c.restore();
      leaf(c, .06, -.76, .62, -.5, '#4f9a3a');
    },
    c => {    // 2 mango
      const col = FRUIT[2], body = () => { c.beginPath(); c.moveTo(-.2, -.78); c.bezierCurveTo(.5, -.92, .98, -.3, .86, .3); c.bezierCurveTo(.78, .66, .5, .86, .3, .86); c.bezierCurveTo(-.3, .94, -.9, .5, -.88, -.06); c.bezierCurveTo(-.86, -.5, -.6, -.72, -.2, -.78); c.closePath(); };
      body(); c.fillStyle = radial(c, 0, 0, .05, 1.2, [[0, tint(col, .42)], [.5, col], [1, shade(col, .28)]], -.3, -.3); c.fill();
      c.save(); body(); c.clip();
      c.fillStyle = radial(c, .5, -.42, 0, .8, [[0, 'rgba(240,96,40,.7)'], [1, 'rgba(240,96,40,0)']]); c.fillRect(-1, -1, 2, 2);          // the red cheek the sun gave it
      c.fillStyle = radial(c, -.6, .5, 0, .6, [[0, 'rgba(150,190,60,.4)'], [1, 'rgba(150,190,60,0)']]); c.fillRect(-1, -1, 2, 2);
      const r = rng(432); for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(140,80,10,.3)'; disc(c, r.in(-.7, .7), r.in(-.6, .7), .018); c.fill(); }
      shine(c, -.36, -.3, .22, .12, -.7, .5); c.restore();
      edge(c, body, col);
      c.strokeStyle = '#6a4a22'; c.lineWidth = .09; c.lineCap = 'round'; c.beginPath(); c.moveTo(-.2, -.78); c.lineTo(-.26, -.98); c.stroke();
    },
    c => {    // 3 watermelon
      const col = FRUIT[3];
      c.save(); c.translate(0, .05); sphere(c, .88, shade(col, .2), { core: .3, dark: .4, rim: .35 });
      c.save(); disc(c, 0, 0, .88); c.clip();
      c.strokeStyle = '#a9dc7c'; c.lineJoin = 'round';
      for (const k of [-.84, -.5, -.17, .17, .5, .84]) { c.lineWidth = .1 * (1 - Math.abs(k) * .45); c.globalAlpha = .82; c.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12, y = -.9 + 1.8 * t, bulge = Math.sin(t * Math.PI), x = k * 1.1 * bulge + (i % 2 ? .035 : -.035); c[i ? 'lineTo' : 'moveTo'](x, y); } c.stroke(); }
      c.globalAlpha = 1; shine(c, -.34, -.38, .22, .12, -.6, .42); c.restore();
      edge(c, () => disc(c, 0, 0, .88), col);
      c.restore();
      c.strokeStyle = '#6a8f3a'; c.lineWidth = .07; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -.82); c.bezierCurveTo(.02, -1.02, .22, -1.0, .2, -.86); c.stroke();
    },
    c => {    // 4 blueberry
      const col = FRUIT[4];
      c.save(); c.translate(0, .04); sphere(c, .84, col, { core: .3, dark: .46, rim: .3 });
      c.save(); disc(c, 0, 0, .84); c.clip();
      c.fillStyle = radial(c, -.2, -.2, 0, .9, [[0, 'rgba(206,232,255,.55)'], [.6, 'rgba(206,232,255,.16)'], [1, 'rgba(206,232,255,0)']]); c.fillRect(-1, -1, 2, 2);            // the bloom on its skin
      c.restore();
      edge(c, () => disc(c, 0, 0, .84), col);
      c.fillStyle = shade(col, .55); star(c, .1, -.34, .3, 5, .56, .3); c.fill();                                 // the crown where the flower was
      c.fillStyle = shade(col, .75); disc(c, .1, -.34, .12); c.fill();
      c.strokeStyle = alpha(tint(col, .5), .7); c.lineWidth = .03; star(c, .1, -.34, .3, 5, .56, .3); c.stroke();
      shine(c, -.42, -.36, .13, .08, -.6, .4);
      c.restore();
    },
    c => {    // 5 mangosteen
      const col = FRUIT[5];
      c.save(); c.translate(0, .1); sphere(c, .82, col, { core: .26, dark: .5, rim: .5, gloss: .55 });
      edge(c, () => disc(c, 0, 0, .82), col);
      c.restore();
      for (const a of [0, 1, 2, 3]) { c.save(); c.translate(0, -.6); c.rotate(a * TAU / 4 + .5); c.fillStyle = '#8fc45a'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(.3, -.1, .46, .14, .42, .36); c.bezierCurveTo(.2, .4, .02, .26, 0, 0); c.fill(); c.strokeStyle = 'rgba(40,80,20,.5)'; c.lineWidth = .03; c.stroke(); c.restore(); }
      c.fillStyle = '#6f9a3c'; rr(c, -.09, -.92, .18, .34, .06); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-.07, -.9, .05, .28);
    },
    c => {    // 6 dragon fruit
      const col = FRUIT[6], body = () => { c.beginPath(); c.ellipse(0, .06, .7, .84, 0, 0, TAU); };
      const scale = (x, y, rot, len) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = linear(c, 0, 0, len, 0, [[0, col], [.5, tint(col, .12)], [1, '#7fc04a']]); c.beginPath(); c.moveTo(0, -len * .42); c.quadraticCurveTo(len * .8, -len * .42, len, 0); c.quadraticCurveTo(len * .6, len * .3, 0, len * .42); c.closePath(); c.fill(); c.strokeStyle = alpha(shade(col, .5), .5); c.lineWidth = .025; c.stroke(); c.restore(); };
      for (const [x, y, rot] of [[-.6, .2, 2.5], [.6, .2, .64], [-.56, -.34, 3.5], [.56, -.34, -.36], [0, -.74, -1.57], [-.26, -.66, -2.1], [.26, -.66, -1.05]]) scale(x, y, rot, .46);
      body(); c.fillStyle = radial(c, 0, .06, .05, 1.05, [[0, tint(col, .34)], [.55, col], [1, shade(col, .38)]], -.26, -.3); c.fill();
      edge(c, body, col);
      for (const [x, y, rot] of [[-.3, .34, 2.2], [.34, .3, .9], [0, -.06, 1.57], [-.36, -.2, 2.9], [.34, -.24, .2], [0, .62, 1.57]]) scale(x, y, rot, .34);
      shine(c, -.26, -.4, .14, .08, -.5, .4);
    },
  ];

  place({
    id: 'market', hue: '#e9781c', colour: 1,
    name: { vi: 'Chợ Quê', en: 'Country Market' },
    tag: { vi: 'Mẹt tre hun khói bày trái cây chín, nắng xiên qua mái bạt.', en: 'Ripe fruit on a tray of smoked bamboo, the sun slanting in under the awning.' },
    dress: { ink: '#fff6e6', soft: 'rgba(255,236,206,.78)', panel: 'rgba(74,36,10,.56)', edge: 'rgba(255,214,150,.34)', accent: '#ffd15c', num: '#fff3d6' },
    inks: FRUIT, frame: .042, ballR: .4,
    voice: { kind: 'wood', root: 220, scale: [0, 2, 4, 7, 9, 12, 14], wet: .1 },

    backdrop(c, w, h) {
      const r = rng(4301), u = Math.min(w, h);
      c.fillStyle = linear(c, 0, 0, w * .3, h, [[0, '#f3b765'], [.5, '#e99547'], [1, '#c96a2c']]); c.fillRect(0, 0, w, h);
      // a mat of woven sedge under everything
      c.save(); c.globalAlpha = .2; c.lineWidth = u * .012;
      for (let i = -h; i < w + h; i += u * .03) { c.strokeStyle = (Math.round(i / (u * .03)) % 2) ? '#8a4a16' : '#fbd89a'; c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h * .2, h); c.stroke(); }
      c.restore();
      wash(c, clouds(96, 43, '#fff0b8', 4, .55, 2.6), 0, 0, w, h, .5, 'soft-light');
      // banana leaves under the corners of the tray
      const frond = (x, y, len, rot, col) => { c.save(); c.translate(x, y); c.rotate(rot);
        c.fillStyle = 'rgba(60,20,0,.22)'; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(len * .5, -len * .26 + 8, len, 8); c.quadraticCurveTo(len * .5, len * .26 + 8, 0, 8); c.fill();
        c.fillStyle = linear(c, 0, -len * .2, 0, len * .2, [[0, tint(col, .14)], [.5, col], [1, shade(col, .22)]]); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * .5, -len * .27, len, 0); c.quadraticCurveTo(len * .5, len * .27, 0, 0); c.fill();
        c.strokeStyle = alpha(tint(col, .5), .6); c.lineWidth = Math.max(1.5, len * .012); c.beginPath(); c.moveTo(len * .02, 0); c.lineTo(len * .97, 0); c.stroke();
        c.strokeStyle = alpha(shade(col, .4), .4); c.lineWidth = 1; for (let k = 1; k < 16; k++) { const t = k / 16, x0 = len * t, wd = len * .135 * Math.sin(t * Math.PI) * 1.9; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + len * .04, -wd); c.moveTo(x0, 0); c.lineTo(x0 + len * .04, wd); c.stroke(); }
        c.restore(); };
      frond(-u * .1, h * .92, u * .95, -.5, '#3f8a3c'); frond(w + u * .08, h * .1, u * .9, 2.5, '#4a973f'); frond(w * .62, h + u * .12, u * .8, -.25, '#357a38'); frond(-u * .12, h * .22, u * .7, .3, '#57a044');
      // baskets of what the stall sells, at the corners
      const basket = (x, y, q, cols) => { c.fillStyle = 'rgba(60,20,0,.28)'; disc(c, x + q * .06, y + q * .1, q); c.fill(); c.fillStyle = '#7a4a22'; disc(c, x, y, q); c.fill(); c.strokeStyle = '#a8713a'; c.lineWidth = q * .08; disc(c, x, y, q * .93); c.stroke(); c.strokeStyle = 'rgba(40,20,5,.4)'; c.lineWidth = 1; for (let k = 0; k < 28; k++) { const a = k * TAU / 28; c.beginPath(); c.moveTo(x + Math.cos(a) * q * .86, y + Math.sin(a) * q * .86); c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); c.stroke(); }
        const q2 = rng(Math.round(x + y)); for (let k = 0; k < 16; k++) { const a = q2() * TAU, d = Math.sqrt(q2()) * q * .68, col = q2.pick(cols), rr2 = q * q2.in(.17, .23); c.save(); c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); c.fillStyle = 'rgba(40,10,0,.3)'; disc(c, rr2 * .12, rr2 * .16, rr2); c.fill(); sphere(c, rr2, col, { core: .34, dark: .36, gloss: .3 }); c.restore(); } };
      basket(w * .94, h * .9, u * .15, ['#f7861c', '#f89a2c', '#f2761c']); basket(w * .04, h * .06, u * .13, ['#e3342f', '#d23fae', '#e9584a']); if (w > h) basket(w * .97, h * .42, u * .1, ['#f8cc2a', '#f4b81e']);
      // the awning's shade along the top, cut in scallops, and the sun in patches
      c.fillStyle = 'rgba(90,30,0,.2)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, u * .07); for (let x = w; x > -u * .1; x -= u * .11) c.arc(x - u * .055, u * .07, u * .055, 0, Math.PI); c.closePath(); c.fill();
      for (let i = 0; i < 14; i++) glowAt(c, r() * w, r() * h, u * r.in(.06, .16), '#fff2c0', r.in(.06, .16));
      grain(c, 0, 0, w, h, .24);
      c.fillStyle = radial(c, w / 2, h / 2, u * .35, Math.hypot(w, h) * .64, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(70,24,0,.42)']]); c.fillRect(0, 0, w, h);
    },
    air: {      // motes of dust in the slanting sun
      make(w, h) { const r = rng(9), out = []; for (let i = 0; i < 22; i++) out.push({ x: r() * w, y: r() * h, vx: r.in(2, 7), vy: r.in(-3, 3), q: r.in(.8, 2), ph: r() * 9 }); return out; },
      draw(c, list, t, dt, w, h) { for (const p of list) { p.x += p.vx * dt; p.y += (p.vy + Math.sin(t / 1300 + p.ph) * 4) * dt; if (p.x > w + 5) p.x = -5; if (p.y < -5) p.y = h + 5; if (p.y > h + 5) p.y = -5; c.fillStyle = `rgba(255,244,200,${.2 + .3 * (.5 + .5 * Math.sin(t / 700 + p.ph * 3))})`; disc(c, p.x, p.y, p.q); c.fill(); } },
    },

    board(c, g) {
      const { S, pad, cell } = g, r = rng(4302);
      c.fillStyle = '#2c1a0c'; rr(c, pad * .5, pad * .5, S - pad, S - pad, pad * .3); c.fill();
      // the weave: every square two strips one way and two the other, over and under
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = pad + x * cell, py = pad + y * cell, gap = Math.max(.7, cell * .02), q = (cell - gap * 2) / 2;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const bx = px + gap + i * q, by = py + gap + j * q, across = (i + j) % 2 === 0, tone = mix('#7b4d26', '#93622f', r());
          for (let k = 0; k < 3; k++) {
            const t0 = k / 3, sx = across ? bx : bx + q * t0, sy = across ? by + q * t0 : by, sw = across ? q : q / 3, sh = across ? q / 3 : q, col = mix(tone, k === 1 ? '#96673a' : '#71482a', .3);
            c.fillStyle = across ? linear(c, sx, sy, sx, sy + sh, [[0, tint(col, .12)], [.5, col], [1, shade(col, .22)]]) : linear(c, sx, sy, sx + sw, sy, [[0, tint(col, .12)], [.5, col], [1, shade(col, .22)]]);
            c.fillRect(sx + .3, sy + .3, sw - .6, sh - .6);
          }
          // a strip dips under its neighbours at both ends, so it is darker there and lightest where it rides over
          c.fillStyle = across ? linear(c, bx, by, bx + q, by, [[0, 'rgba(22,8,0,.5)'], [.3, 'rgba(22,8,0,0)'], [.5, 'rgba(255,230,180,.1)'], [.7, 'rgba(22,8,0,0)'], [1, 'rgba(22,8,0,.5)']]) : linear(c, bx, by, bx, by + q, [[0, 'rgba(22,8,0,.5)'], [.3, 'rgba(22,8,0,0)'], [.5, 'rgba(255,230,180,.1)'], [.7, 'rgba(22,8,0,0)'], [1, 'rgba(22,8,0,.5)']]);
          c.fillRect(bx, by, q, q);
        }
      }
      // squares told apart by a darker seam
      c.strokeStyle = 'rgba(24,10,2,.62)'; c.lineWidth = Math.max(1.2, cell * .035);
      for (let i = 0; i <= N; i++) { c.beginPath(); c.moveTo(pad + i * cell, pad); c.lineTo(pad + i * cell, S - pad); c.moveTo(pad, pad + i * cell); c.lineTo(S - pad, pad + i * cell); c.stroke(); }
      c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = linear(c, 0, 0, S, S, [[0, 'rgba(255,236,170,.6)'], [.55, 'rgba(255,220,150,.05)'], [1, 'rgba(40,10,0,.5)']]); c.fillRect(pad, pad, cell * N, cell * N); c.restore();
      // the rim: four canes of bamboo, bound at the corners
      const cane = (x, y, len, vertical) => { c.save(); c.translate(x, y); if (vertical) { c.rotate(Math.PI / 2); c.scale(1, -1); }
        c.fillStyle = linear(c, 0, 0, 0, pad, [[0, '#f0c877'], [.3, '#d9a54e'], [.75, '#a8732c'], [1, '#6f4718']]); rr(c, 0, 0, len, pad, pad * .45); c.fill();
        c.fillStyle = 'rgba(255,248,210,.4)'; c.fillRect(pad * .5, pad * .16, len - pad, pad * .1);
        const q = rng(Math.round(x * 3 + y + len)); for (let k = 1; k < 7; k++) { const nx = len * (k / 7) + q.in(-8, 8); c.fillStyle = 'rgba(70,40,8,.6)'; c.fillRect(nx, 0, Math.max(1.5, pad * .07), pad); c.fillStyle = 'rgba(255,240,190,.35)'; c.fillRect(nx + Math.max(1.5, pad * .07), 0, 1, pad); }
        c.restore(); };
      cane(0, 0, S, false); cane(0, S - pad, S, false); cane(0, 0, S, true); cane(S - pad, 0, S, true);
      for (const [x, y] of [[0, 0], [S - pad, 0], [0, S - pad], [S - pad, S - pad]]) { c.fillStyle = '#3a2210'; rr(c, x - 1, y - 1, pad + 2, pad + 2, pad * .3); c.fill(); c.strokeStyle = '#8a5a2a'; c.lineWidth = Math.max(1, pad * .1); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + pad * (.14 + k * .24), y); c.lineTo(x + pad * (.14 + k * .24), y + pad); c.stroke(); } }
      grain(c, 0, 0, S, S, .2);
    },

    ball: (c, i, r) => { c.scale(r, r); DRAW[i](c); },
    shadow: { a: .46, w: .92, h: .28, y: .86 },
    glow: null,
    pose(b, t, p) {
      if (b.moving) p.rot = Math.sin(b.roll * 2.2) * .14;
      if (!b.picked) return;
      const ms = 640, u = ((t - b.pickT) % ms) / ms;
      hop(u, .16, .16, p); p.rot = Math.sin((t - b.pickT) / ms * TAU) * .13;
    },
    leave(b, u, p) { p.k = u < .22 ? 1 + .22 * ease.out2(u / .22) : 1.22 * (1 - ease.in2((u - .22) / .78)); p.sy = 1 - .3 * Math.sin(Math.min(1, u / .3) * Math.PI); p.sx = 1 + .25 * Math.sin(Math.min(1, u / .3) * Math.PI); p.a = u < .55 ? 1 : 1 - (u - .55) / .45; },
    land(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y: y + cell * .3, col: 'rgba(255,230,170,.6)', size: cell * .16, grow: cell * .9, w: 1.5, life: .28 }); },
    burst(x, y, i, cell) {
      const col = FRUIT[i];
      burstOf(11, x, y, a => { const v = cell * (2.2 + Math.random() * 3); return { kind: 'drop', col: Math.random() < .35 ? tint(col, .45) : col, vx: Math.cos(a) * v, vy: Math.sin(a) * v - cell * 1.6, g: cell * 11, drag: 1.4, life: .5 + Math.random() * .28, size: cell * (.035 + Math.random() * .04), fade: .35 }; });
      for (let k = 0; k < 3; k++) bit({ kind: 'leaf', x, y, vx: (Math.random() - .5) * cell * 4, vy: -cell * (2 + Math.random() * 2), g: cell * 8, drag: 1.2, rot: Math.random() * TAU, spin: (Math.random() - .5) * 9, col: LEAF, size: cell * .09, life: .8, fade: .4 });
      bit({ kind: 'ring', x, y, col: tint(col, .5), size: cell * .2, grow: cell * 1.6, w: 2.5, life: .3, a: .8 });
    },
    rise(x, y, i, cell) { bit({ kind: 'ring', under: true, x, y: y + cell * .28, col: 'rgba(255,230,170,.55)', size: cell * .1, grow: cell * .9, w: 1.5, life: .3 }); },
  });
})();
