/* ── Biển ── the land of blue: a shallow lagoon, seen from above through clear water.
   The board is a patch of sand; the balls are what lives on it, each colour a creature of its own: crab, starfish,
   scallop, turtle, jellyfish, sea urchin, shell. Sunlight comes down through the water in a moving net of light,
   over the sand and over the board alike. A ball to come is a bubble with its colour inside. */
(() => {
  const LIFE = ['#e64a3c', '#f58a1f', '#f4c92c', '#3fae58', '#3ac6ea', '#3b47b8', '#a852d6'];
  const dark = (c, path, col, wd) => { path(); c.strokeStyle = alpha(shade(col, .62), .75); c.lineWidth = wd || .05; c.lineJoin = 'round'; c.stroke(); };

  const DRAW = [
    c => {    // 0 the crab
      const col = LIFE[0], deep = shade(col, .28);
      c.lineCap = 'round'; c.strokeStyle = deep; c.lineWidth = .1;
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(s * .46, .12 + k * .13); c.quadraticCurveTo(s * (.8 + k * .04), .1 + k * .2, s * (.84 - k * .04), .44 + k * .16); c.stroke(); }
        c.beginPath(); c.moveTo(s * .44, -.14); c.quadraticCurveTo(s * .8, -.2, s * .68, -.56); c.stroke();                            // the arm
        c.save(); c.translate(s * .66, -.66); c.rotate(s * -.5); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, .25, .19, 0, 0, TAU); c.fill(); dark(c, () => { c.beginPath(); c.ellipse(0, 0, .25, .19, 0, 0, TAU); }, col, .045);
        c.fillStyle = shade(col, .7); c.beginPath(); c.moveTo(0, -.03); c.lineTo(s * -.04, -.26); c.lineTo(s * .16, -.2); c.closePath(); c.fill(); c.restore();     // the gap of the claw
      }
      const body = () => { c.beginPath(); c.ellipse(0, .12, .64, .46, 0, 0, TAU); };
      body(); c.fillStyle = radial(c, 0, .12, .05, .75, [[0, tint(col, .34)], [.6, col], [1, deep]], -.2, -.1); c.fill();
      c.fillStyle = alpha(tint(col, .5), .5); for (const [x, y, q] of [[-.26, .0, .07], [.2, -.06, .055], [.02, .26, .06], [.36, .22, .045], [-.38, .26, .04]]) { disc(c, x, y, q); c.fill(); }
      dark(c, body, col);
      for (const s of [-1, 1]) { c.strokeStyle = deep; c.lineWidth = .06; c.beginPath(); c.moveTo(s * .2, -.26); c.lineTo(s * .22, -.46); c.stroke(); c.fillStyle = '#fff'; disc(c, s * .22, -.5, .11); c.fill(); c.fillStyle = '#1a1420'; disc(c, s * .22, -.52, .055); c.fill(); }
    },
    c => {    // 1 the starfish
      const col = LIFE[1], path = () => star(c, 0, .03, .82, 5, .46);
      c.lineJoin = 'round'; path(); c.strokeStyle = shade(col, .5); c.lineWidth = .36; c.stroke();
      path(); c.strokeStyle = col; c.lineWidth = .26; c.stroke(); path(); c.fillStyle = col; c.fill();
      c.save(); path(); c.lineWidth = .26; c.clip();
      c.fillStyle = radial(c, 0, .03, 0, .9, [[0, tint(col, .45)], [.5, 'rgba(255,255,255,0)']]); c.fillRect(-1, -1, 2, 2); c.restore();
      c.fillStyle = tint(col, .62);
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; for (const d of [.26, .47, .66, .82]) { disc(c, Math.cos(a) * d, .03 + Math.sin(a) * d, .05 - d * .018); c.fill(); } }
      disc(c, 0, .03, .07); c.fill();
    },
    c => {    // 2 the scallop
      const col = LIFE[2], n = 7, a0 = Math.PI * 1.1, a1 = Math.PI * 1.9, cx = 0, cy = .46, R = 1.18;
      c.save(); c.translate(0, -.04); c.scale(.86, .86);
      c.beginPath(); c.moveTo(-.3, .78); c.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      for (let k = 0; k < n; k++) { const b0 = lerp(a0, a1, k / n), b1 = lerp(a0, a1, (k + 1) / n), bm = (b0 + b1) / 2; c.quadraticCurveTo(cx + Math.cos(bm) * R * 1.1, cy + Math.sin(bm) * R * 1.1, cx + Math.cos(b1) * R, cy + Math.sin(b1) * R); }
      c.lineTo(.3, .78); c.closePath();
      c.fillStyle = radial(c, 0, .7, .05, 1.5, [[0, shade(col, .28)], [.35, col], [.8, tint(col, .4)], [1, tint(col, .15)]]); c.fill();
      c.strokeStyle = alpha(shade(col, .62), .75); c.lineWidth = .055; c.lineJoin = 'round'; c.stroke();
      c.strokeStyle = alpha(shade(col, .45), .6); c.lineWidth = .04; c.lineCap = 'round';
      for (let k = 1; k < n; k++) { const b = lerp(a0, a1, k / n); c.beginPath(); c.moveTo(Math.cos(b) * .12, .7 + Math.sin(b) * .12); c.lineTo(cx + Math.cos(b) * R * .97, cy + Math.sin(b) * R * .97); c.stroke(); }
      c.fillStyle = shade(col, .2); rr(c, -.36, .66, .72, .2, .06); c.fill(); c.strokeStyle = alpha(shade(col, .62), .75); c.lineWidth = .045; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.4)'; oval(c, -.3, -.2, .16, .08, -.9); c.fill();
      c.restore();
    },
    c => {    // 3 the turtle
      const col = LIFE[3], limb = tint(col, .28);
      const flip = (x, y, rx, ry, rot) => { c.fillStyle = limb; oval(c, x, y, rx, ry, rot); c.fill(); dark(c, () => oval(c, x, y, rx, ry, rot), col, .04); };
      flip(-.62, -.34, .3, .14, .7); flip(.62, -.34, .3, .14, -.7); flip(-.52, .54, .2, .12, -.7); flip(.52, .54, .2, .12, .7);
      c.fillStyle = limb; c.beginPath(); c.moveTo(-.07, .7); c.lineTo(0, .92); c.lineTo(.07, .7); c.fill();
      c.fillStyle = limb; oval(c, 0, -.74, .2, .22, 0); c.fill(); dark(c, () => oval(c, 0, -.74, .2, .22, 0), col, .04);
      c.fillStyle = '#16201a'; disc(c, -.1, -.8, .035); c.fill(); disc(c, .1, -.8, .035); c.fill();
      const shell = () => { c.beginPath(); c.ellipse(0, .04, .56, .66, 0, 0, TAU); };
      shell(); c.fillStyle = radial(c, 0, .04, .05, .8, [[0, tint(col, .22)], [.55, shade(col, .1)], [1, shade(col, .42)]], -.2, -.24); c.fill();
      c.save(); shell(); c.clip(); c.strokeStyle = alpha(tint(col, .6), .55); c.lineWidth = .045;
      const hex = []; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; hex.push([Math.cos(a) * .26, .04 + Math.sin(a) * .3]); }
      c.beginPath(); hex.forEach((p, k) => c[k ? 'lineTo' : 'moveTo'](p[0], p[1])); c.closePath(); c.stroke();
      for (const p of hex) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] * 2.6, .04 + (p[1] - .04) * 2.6); c.stroke(); }
      c.restore();
      dark(c, shell, col, .055);
      c.fillStyle = 'rgba(255,255,255,.3)'; oval(c, -.2, -.3, .13, .07, -.6); c.fill();
    },
    c => {    // 4 the jellyfish
      const col = LIFE[4], n = 14, rim = () => { c.beginPath(); for (let k = 0; k <= n; k++) { const a0 = k * TAU / n, a1 = (k + .5) * TAU / n; if (!k) c.moveTo(Math.cos(a0) * .8, Math.sin(a0) * .8); c.quadraticCurveTo(Math.cos(a1) * .96, Math.sin(a1) * .96, Math.cos(a0 + TAU / n) * .8, Math.sin(a0 + TAU / n) * .8); } c.closePath(); };
      rim(); c.fillStyle = radial(c, 0, 0, .05, .95, [[0, 'rgba(255,255,255,.92)'], [.45, alpha(tint(col, .55), .82)], [.85, alpha(col, .8)], [1, alpha(shade(col, .2), .88)]]); c.fill();
      dark(c, rim, col, .04);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .022; for (let k = 0; k < n; k++) { const a = k * TAU / n; c.beginPath(); c.moveTo(Math.cos(a) * .44, Math.sin(a) * .44); c.lineTo(Math.cos(a) * .78, Math.sin(a) * .78); c.stroke(); }
      c.strokeStyle = '#ffd3ea'; c.lineWidth = .07;                                                      // the four rings it is known by
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + TAU / 8; c.beginPath(); c.arc(Math.cos(a) * .2, Math.sin(a) * .2, .13, a - 2.2, a + 2.2); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.65)'; oval(c, -.3, -.36, .16, .08, -.6); c.fill();
    },
    c => {    // 5 the sea urchin
      const col = LIFE[5], n = 30, r = rng(465);
      for (let k = 0; k < n; k++) { const a = k * TAU / n + r.in(-.04, .04), L = k % 2 ? .96 : .8, wd = .055; c.fillStyle = k % 2 ? col : shade(col, .25); c.beginPath(); c.moveTo(Math.cos(a - wd * 3) * .34, Math.sin(a - wd * 3) * .34); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + wd * 3) * .34, Math.sin(a + wd * 3) * .34); c.fill(); }
      c.strokeStyle = tint(col, .55); c.lineWidth = .03; c.lineCap = 'round'; for (let k = 1; k < n; k += 2) { const a = k * TAU / n; c.beginPath(); c.moveTo(Math.cos(a) * .7, Math.sin(a) * .7); c.lineTo(Math.cos(a) * .93, Math.sin(a) * .93); c.stroke(); }
      sphere(c, .5, shade(col, .12), { core: .35, dark: .5, gloss: .35 });
      c.fillStyle = tint(col, .62); for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; for (const d of [.16, .29, .4]) { disc(c, Math.cos(a) * d, Math.sin(a) * d, .032); c.fill(); } }
    },
    c => {    // 6 the shell
      const col = LIFE[6], body = () => { c.beginPath(); c.ellipse(-.02, 0, .84, .8, 0, 0, TAU); };
      body(); c.fillStyle = radial(c, 0, 0, .05, 1, [[0, tint(col, .55)], [.5, tint(col, .12)], [1, shade(col, .3)]], -.3, -.34); c.fill();
      c.save(); body(); c.clip();
      const spiral = (wd, colr) => { c.strokeStyle = colr; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); for (let a = 0; a <= 15.2; a += .15) { const q = .035 * Math.exp(a * .215); c.lineTo(-.05 + Math.cos(a + 1) * q, Math.sin(a + 1) * q); } c.stroke(); };
      spiral(.12, alpha(shade(col, .45), .75)); spiral(.04, alpha(tint(col, .75), .9));
      c.strokeStyle = alpha(shade(col, .3), .4); c.lineWidth = .025; for (let k = 0; k < 20; k++) { const a = k * TAU / 20; c.beginPath(); c.moveTo(Math.cos(a) * .6, Math.sin(a) * .6); c.lineTo(Math.cos(a) * .86, Math.sin(a) * .86); c.stroke(); }
      c.fillStyle = alpha(shade(col, .72), .7); c.beginPath(); c.ellipse(.6, .44, .34, .2, .7, 0, TAU); c.fill();              // its mouth
      c.restore();
      dark(c, body, col, .055);
      c.fillStyle = 'rgba(255,255,255,.5)'; oval(c, -.36, -.4, .16, .08, -.7); c.fill();
    },
  ];

  /* the net of light the sun makes through moving water: bright lines where the ripples gather it */
  let net = null;
  function netOfLight() {
    if (net) return net;
    const size = 160, [cv, c] = sheet(size, size), im = c.createImageData(size, size), r = rng(461), pts = [];
    for (let i = 0; i < 15; i++) pts.push([r() * size, r() * size]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let d1 = 1e9, d2 = 1e9;
      for (const p of pts) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const d = Math.hypot(x - p[0] - ox * size, y - p[1] - oy * size); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      const v = Math.pow(clamp(1 - (d2 - d1) / 15, 0, 1), 3.2), k = (y * size + x) * 4;
      im.data[k] = 255; im.data[k + 1] = 255; im.data[k + 2] = 236; im.data[k + 3] = v * 255;
    }
    c.putImageData(im, 0, 0);
    return (net = cv);
  }
  /* The net is laid twice, each time at its own size and with its own drift. To fill a whole window with it twice in
     every frame is the dearest thing any place does (where a browser paints without a graphics card, it alone halved
     the frames), and light through water is soft: so the two are laid once a frame on a picture a third as fine as the
     screen, and the window, and then the board, take what they need of that picture, enlarged. */
  const COARSE = 3;
  let lit = null, litC = null, litT = null, litW = 0, litH = 0, litD = 1;
  /** the light as it is at t, over the whole window. w, h: the window, d: the screen's points to one of the page's;
      whoever knows them says so (the air does), and the others are given the picture as it was last asked for */
  function field(t, w, h, d) {
    if (w) { litW = w; litH = h; litD = d || 1; } else if (!litW) { litW = window.innerWidth; litH = window.innerHeight; }
    const W = Math.max(1, Math.ceil(litW * litD / COARSE)), H = Math.max(1, Math.ceil(litH * litD / COARSE));
    if (!lit) [lit, litC] = sheet(W, H);
    if (lit.width !== W || lit.height !== H) { lit.width = W; lit.height = H; litT = null; }
    if (t === litT) return lit;
    litT = t;
    const c = litC, tile = netOfLight();
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    for (const [scale, vx, vy, k] of [[2.3, 9, 5, 1], [1.7, -7, 8, .75]]) {
      const p = c.createPattern(tile, 'repeat');
      p.setTransform(new DOMMatrix().scale(W / litW, H / litH).translate(t / 1000 * vx, t / 1000 * vy).scale(scale + Math.sin(t / 2600) * .06 * k));
      c.globalAlpha = k; c.fillStyle = p; c.fillRect(0, 0, W, H);
    }
    return lit;
  }
  /** lays the light over a rectangle of the window, as bright as a. ox, oy: where the canvas being painted on begins in
      the window. first: nothing has been painted on it yet, so the light need not be added to what is there, and it is
      the one that says how large the window is. hole: a part of the rectangle that is covered and need not be lit.
      Over the board the picture is enlarged as it is, unsmoothed: at that brightness, on sand, no eye can tell, and it
      is a third of the work */
  function light(c, t, ox, oy, w, h, a, first, hole) {
    const f = first ? field(t, w, h, c.getTransform().a) : field(t), qx = f.width / litW, qy = f.height / litH;
    c.save();
    if (hole) { c.beginPath(); c.rect(0, 0, w, h); c.rect(hole.x, hole.y, hole.w, hole.h); c.clip('evenodd'); }
    c.globalCompositeOperation = first ? 'source-over' : 'lighter'; c.globalAlpha = a; c.imageSmoothingEnabled = !!first; c.imageSmoothingQuality = 'low';
    c.drawImage(f, ox * qx, oy * qy, w * qx, h * qy, 0, 0, w, h);
    c.restore();
  }

  place({
    id: 'sea', hue: '#1f9fd2', colour: 4,
    name: { vi: 'Biển', en: 'The Sea' },
    tag: { vi: 'Vụng nước trong: nắng dệt lưới sáng trên cát, cua, sao biển và rùa con mỗi loài một màu.', en: 'A clear lagoon: the sun weaves a net of light on the sand, and crab, starfish and turtle each wear a colour.' },
    dress: { ink: '#f4fdff', soft: 'rgba(222,247,252,.8)', panel: 'rgba(4,58,92,.52)', edge: 'rgba(200,245,255,.34)', accent: '#fff0a8', num: '#ffffff' },
    inks: LIFE, frame: .04, ballR: .4,
    voice: { kind: 'bubble', root: 329.63, scale: [0, 2, 4, 7, 9, 12, 14], wet: .3 },

    backdrop(c, w, h, box) {
      const r = rng(4601), u = Math.min(w, h);
      c.fillStyle = radial(c, w * .5, h * .45, u * .1, Math.hypot(w, h) * .66, [[0, '#4fd0cf'], [.45, '#2aa9c9'], [1, '#126aa6']]); c.fillRect(0, 0, w, h);
      wash(c, clouds(128, 61, '#0b4f8a', 5, .55, 2.4), 0, 0, w, h, .42, 'multiply');
      wash(c, clouds(128, 62, '#d8fff0', 5, .5, 2.6), 0, 0, w, h, .3, 'screen');
      // sand showing through where it is shallow, ribbed by the tide
      for (let i = 0; i < 7; i++) { const x = r() * w, y = r() * h, q = u * r.in(.14, .3); c.save(); blob(c, x, y, q, rng(600 + i), .25, 9); c.clip(); c.fillStyle = 'rgba(244,228,180,.26)'; c.fillRect(x - q * 1.4, y - q * 1.4, q * 2.8, q * 2.8);
        c.strokeStyle = 'rgba(255,248,214,.22)'; c.lineWidth = 2; for (let k = -8; k < 9; k++) { c.beginPath(); for (let s = -q * 1.4; s <= q * 1.4; s += 12) c.lineTo(x + s, y + k * q * .16 + Math.sin(s / 34 + k) * 5); c.stroke(); } c.restore(); }
      const free = (x, y, q) => !box || x + q < box.x - 8 || x - q > box.x + box.w + 8 || y + q < box.y - 8 || y - q > box.y + box.h + 8;
      // heads of coral, and weed
      const coral = (x, y, q, col) => { const s = rng(Math.round(x * 3 + y)); c.fillStyle = 'rgba(0,30,60,.25)'; blob(c, x + q * .08, y + q * .12, q, rng(1), .2, 9); c.fill();
        for (let k = 0; k < 13; k++) { const a = s() * TAU, d = Math.sqrt(s()) * q * .72, rr2 = q * s.in(.2, .36), tone = mix(col, s.pick(['#ffffff', '#000000']), s.in(0, .2)); c.fillStyle = tone; blob(c, x + Math.cos(a) * d, y + Math.sin(a) * d, rr2, s, .22, 7); c.fill(); c.fillStyle = alpha(shade(col, .4), .4); for (let j = 0; j < 5; j++) { disc(c, x + Math.cos(a) * d + s.in(-.5, .5) * rr2, y + Math.sin(a) * d + s.in(-.5, .5) * rr2, rr2 * .08); c.fill(); } } };
      for (let i = 0, n = 0; i < 80 && n < 9; i++) { const q = u * r.in(.05, .1), x = r() * w, y = r() * h; if (!free(x, y, q)) continue; coral(x, y, q, r.pick(['#ff8f7a', '#f7a14a', '#e86a8e', '#b77ae0', '#ffc35a', '#6fd0b0'])); n++; }
      c.lineCap = 'round'; for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, len = u * r.in(.04, .09); if (!free(x, y, len)) continue; c.strokeStyle = alpha(r.pick(['#1f8a5a', '#2aa06a', '#157a52']), .75); c.lineWidth = u * .006; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + k * len * .5, y - len * .5, x + k * len * .34 + r.in(-4, 4), y - len); c.stroke(); } }
      grain(c, 0, 0, w, h, .16);
      c.fillStyle = radial(c, w / 2, h / 2, u * .34, Math.hypot(w, h) * .64, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,26,70,.5)']]); c.fillRect(0, 0, w, h);
    },
    air: {
      make(w, h) { const r = rng(6), out = []; for (let i = 0; i < 16; i++) out.push({ x: r() * w, y: r() * h, v: r.in(14, 34), q: r.in(2, 5.5), ph: r() * 9 }); return out; },
      draw(c, list, t, dt, w, h, box) {
        const m = box ? Math.round(box.w * .06) : 0;         // the board hides what is behind it, all but its round corners
        light(c, t, 0, 0, w, h, .2, true, box && { x: Math.round(box.x) + m, y: Math.round(box.y) + m, w: Math.round(box.w) - m * 2, h: Math.round(box.h) - m * 2 });
        for (const p of list) {       // bubbles going up
          p.y -= p.v * dt; p.x += Math.sin(t / 600 + p.ph) * 12 * dt;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          c.strokeStyle = 'rgba(230,252,255,.6)'; c.lineWidth = 1.1; disc(c, p.x, p.y, p.q); c.stroke(); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; disc(c, p.x - p.q * .36, p.y - p.q * .36, p.q * .2); c.fill();
        }
      },
    },
    over(c, g, t) { c.save(); rr(c, 0, 0, g.S, g.S, g.pad * 1.1); c.clip(); light(c, t, g.ox, g.oy, g.S, g.S, .12); c.restore(); },

    board(c, g) {
      const { S, pad, cell } = g, r = rng(4602);
      // a bank of sand
      rr(c, 0, 0, S, S, pad * 1.1); c.fillStyle = linear(c, 0, 0, S, S, [[0, '#dccd9c'], [1, '#c2ae7c']]); c.fill();
      c.save(); rr(c, 0, 0, S, S, pad * 1.1); c.clip();
      wash(c, clouds(96, 63, '#8f7a48', 5, .55, 2.2), 0, 0, S, S, .34, 'multiply');
      c.strokeStyle = 'rgba(255,250,222,.26)'; c.lineWidth = 1.6;                                           // ribs the tide left
      for (let k = 0; k < 40; k++) { const y0 = k * S / 38; c.beginPath(); for (let x = 0; x <= S; x += 10) c.lineTo(x, y0 + Math.sin(x / 46 + k * .7) * 4 + Math.sin(x / 17 + k) * 1.5); c.stroke(); }
      for (let i = 0; i < S * S / 240; i++) { c.fillStyle = r() < .55 ? 'rgba(90,70,30,.22)' : 'rgba(255,255,240,.4)'; c.fillRect(r() * S, r() * S, r.in(.8, 1.9), r.in(.8, 1.9)); }
      // the squares: each pressed a little into the sand
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = pad + x * cell, py = pad + y * cell, gap = cell * .045, q = cell - gap * 2, rad = cell * .16;
        rr(c, px + gap, py + gap, q, q, rad); c.fillStyle = 'rgba(112,88,40,.24)'; c.fill();
        c.save(); rr(c, px + gap, py + gap, q, q, rad); c.clip();
        c.strokeStyle = 'rgba(64,46,12,.5)'; c.lineWidth = cell * .08; rr(c, px + gap - cell * .03, py + gap - cell * .03, q + cell * .16, q + cell * .16, rad); c.stroke();            // shade under the upper and left lip
        c.strokeStyle = 'rgba(255,252,226,.62)'; c.lineWidth = cell * .055; rr(c, px + gap - cell * .13, py + gap - cell * .13, q + cell * .14, q + cell * .14, rad); c.stroke();        // light on the lower and right
        c.restore();
      }
      c.fillStyle = 'rgba(60,200,214,.17)'; c.fillRect(0, 0, S, S);                                          // seen through water
      wash(c, netOfLight(), 0, 0, S, S, .09, 'lighter');
      c.restore();
      // pebbles and bits of shell along the edge
      for (let i = 0; i < 150; i++) { const t = r() * 4, side = Math.floor(t), f = t - side, m = pad * r.in(.2, .7), x = side === 0 ? f * S : side === 1 ? S - m : side === 2 ? f * S : m, y = side === 0 ? m : side === 1 ? f * S : side === 2 ? S - m : f * S, q = pad * r.in(.1, .26), col = r.pick(['#f6efe0', '#cdbfa6', '#9fa6a8', '#e9b9a6', '#f2dcc0', '#7f8c8f', '#fff8ea']);
        c.fillStyle = 'rgba(60,40,10,.3)'; oval(c, x + q * .15, y + q * .22, q, q * .76, r() * 3); c.fill(); c.fillStyle = col; oval(c, x, y, q, q * r.in(.6, .85), r() * 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; disc(c, x - q * .3, y - q * .26, q * .28); c.fill(); }
      grain(c, 0, 0, S, S, .16);
    },

    ball: (c, i, r) => { c.scale(r, r); DRAW[i](c); },
    /** a ball to come: a bubble, its colour held inside */
    seed(c, i, r) {
      const q = r * .36;
      c.fillStyle = 'rgba(40,30,0,.2)'; oval(c, q * .2, q * .9, q * .8, q * .26, 0); c.fill();
      c.fillStyle = radial(c, 0, 0, 0, q, [[0, tint(LIFE[i], .2)], [.55, alpha(LIFE[i], .85)], [1, alpha(tint(LIFE[i], .5), .35)]]); disc(c, 0, 0, q); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1, q * .14); disc(c, 0, 0, q); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.95)'; disc(c, -q * .36, -q * .38, q * .22); c.fill();
    },
    shadow: { a: .3, w: 1.02, h: 1.02, y: .16 },
    glow: null,
    pose(b, t, p) {
      const ph = b.phase * TAU;                     // nothing under water is ever quite still
      p.dx = .014 * Math.sin(t / 1150 + ph); p.dy = .012 * Math.cos(t / 1400 + ph * 2); p.rot = .06 * Math.sin(t / 1700 + ph * 3);
      if (b.c === 4) p.k = 1 + .045 * Math.sin(t / 520 + ph);                                  // the jellyfish opens and closes
      if (b.moving) p.rot += Math.sin(b.roll * 3.2) * .22;
      if (b.picked) { const k = (t - b.pickT) / 1000; p.rot = Math.sin(k * 8.5) * .17; p.k = 1.08 + .05 * Math.sin(k * 8.5); p.lift = .05 + .02 * Math.sin(k * 4); if (b.c === 0) p.dx = Math.sin(k * 11) * .05; }
    },
    leaveMs: 300,
    leave(b, u, p) { p.rot = u * 3.2; p.k = 1 - ease.in2(u); p.a = 1 - ease.in3(u); p.lift = u * .2; },
    trail(x, y, i, cell) { for (let k = 0; k < 2; k++) bit({ kind: 'bubble', x: x + (Math.random() - .5) * cell * .4, y: y + (Math.random() - .5) * cell * .3, vy: -cell * (.5 + Math.random() * .8), sway: 6, swayBy: cell * .3, col: 'rgba(235,252,255,.9)', size: cell * (.035 + Math.random() * .04), life: .8 + Math.random() * .4, fade: .3 }); },
    land(x, y, i, cell) { burstOf(7, x, y + cell * .1, a => ({ kind: 'dot', under: true, col: 'rgba(246,232,190,.7)', vx: Math.cos(a) * cell * 1.1, vy: Math.sin(a) * cell * .8, drag: 3.5, size: cell * .05, grow: cell * .12, life: .5, a: .7 })); },
    burst(x, y, i, cell) {
      for (let k = 0; k < 9; k++) bit({ kind: 'bubble', x: x + (Math.random() - .5) * cell * .6, y: y + (Math.random() - .5) * cell * .5, vx: (Math.random() - .5) * cell * 1.4, vy: -cell * (.8 + Math.random() * 2.2), sway: 7, swayBy: cell * .4, drag: .6, col: Math.random() < .4 ? tint(LIFE[i], .55) : 'rgba(235,252,255,.95)', size: cell * (.04 + Math.random() * .07), life: .8 + Math.random() * .6, wait: Math.random() * .1, fade: .3 });
      burstOf(8, x, y, a => ({ kind: 'dot', under: true, col: 'rgba(246,232,190,.75)', vx: Math.cos(a) * cell * 1.6, vy: Math.sin(a) * cell * 1.3, drag: 3, size: cell * .06, grow: cell * .16, life: .6, a: .7 }));
      bit({ kind: 'star', x, y, col: '#ffffff', size: cell * .14, grow: cell * .9, life: .22, a: .9 });
    },
    rise(x, y, i, cell) { burstOf(6, x, y, a => ({ kind: 'dot', under: true, col: 'rgba(246,232,190,.7)', vx: Math.cos(a) * cell, vy: Math.sin(a) * cell * .8, drag: 3.5, size: cell * .04, grow: cell * .12, life: .45, a: .7 })); },
  });
})();
