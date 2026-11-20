/* ── the map: eight places and the road between them ──
   A sheet painted in gouache: the night sky at the top, clouds under it, then mountains, fields, a river, the sea
   and a town. The road starts at the house and climbs through the seven lands in the order of the rainbow, to end
   among the stars. Any place can be gone to at any time; the traveller walks the road to it.

   The sheet is painted once for the window's size (mapart). What moves (the markers of the places, the traveller,
   clouds, lights) is painted every frame over it (maplive). Each place also has a button laid over its marker, so
   that the map can be used with keys and read by a screen reader. */
const atlas = (() => {
  const artCv = $('mapart'), liveCv = $('maplive'), spots = $('spots');
  const on = { play() {} };
  let w = 0, h = 0, tall = true, pts = [], R = 30, skyY = 0, road = [], marks = [], here = 0, walker = { x: 0, y: 0, hop: 0, going: false }, clouds2 = [], twinks = [], glints = [], lamps = [], seaSide = 1;

  /* ── where things are ── */
  function place_points() {
    const P = [];
    if (tall) {
      const top = clamp(h * .17, 124, 168), bottom = h - clamp(h * .27, 190, 226), step = (bottom - top) / 7, L = clamp(w * .27, 84, w * .33), Rr = w - L;
      for (let i = 0; i < 8; i++) P.push([i % 2 ? Rr : L + (i === 0 ? w * .06 : 0), bottom - step * i]);
      P[7] = [w * .76, top - step * .1];
      skyY = lerp(P[7][1], P[6][1], .6);
    } else if (h < 520) {         // low and wide (a phone on its side): the sky is a strip, and the last two places lean back to the left of the buttons
      skyY = clamp(h * .31, 104, 160);
      const xs = [.07, .185, .3, .415, .53, .78], ys = [.8, .6, .82, .6, .8, .66];
      for (let i = 0; i < 6; i++) P.push([w * xs[i], h * ys[i]]);
      P.push([w * .69, skyY + R * 1.9], [w * .56, Math.max(skyY * .5, R + 30)]);
    } else {
      skyY = clamp(h * .3, 200, 280);
      const xs = [.085, .215, .345, .475, .6, .85], ys = [.8, .58, .81, .58, .8, .57];
      for (let i = 0; i < 6; i++) P.push([w * xs[i], h * ys[i]]);
      P.push([w * .64, skyY + R * 2.5], [w * .85, skyY * .5]);
    }
    return P;
  }
  /** a smooth road through the places: many short steps, and for each place the step it stands on */
  function lay_road() {
    road = []; const at = [];
    const get = i => pts[clamp(i, 0, 7)];
    for (let i = 0; i < 7; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      at.push(road.length);
      for (let s = 0; s < 26; s++) {
        const t = s / 26, t2 = t * t, t3 = t2 * t;
        road.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    at.push(road.length); road.push(pts[7].slice());
    road.at = at;
  }

  /* ── the sheet ── */
  const INK = '#2a2440';
  /** a shape cut from paper and laid on the sheet: its colour, and a little shade under its lower edge */
  function cut(c, path, col, lift) {
    c.save(); c.translate(0, lift == null ? 2.5 : lift); path(); c.fillStyle = 'rgba(30,22,60,.2)'; c.fill(); c.restore();
    path(); c.fillStyle = col; c.fill();
  }
  function paint() {
    const [c] = fit(artCv, Math.min(DPR(), 2)), r = rng(1998), u = Math.min(w, h);
    c.clearRect(0, 0, w, h);
    // the land: far and pale under the clouds, near and warm at the bottom
    c.fillStyle = linear(c, 0, skyY, 0, h, [[0, '#c9dcd3'], [.22, '#d7e3bd'], [.6, '#e8e2b0'], [1, '#f0dca6']]); c.fillRect(0, 0, w, h);
    const tex = clouds(96, 7, '#6f8f4e', 4, .55, 2.2);
    wash(c, tex, 0, skyY, w, h - skyY, .2, 'multiply');
    wash(c, clouds(96, 11, '#fff3c4', 4, .5, 2.4), 0, skyY, w, h - skyY, .35, 'soft-light');

    // fields: patches of green and gold, each a little different
    const greens = ['#a9c77a', '#bdd08a', '#93b96d', '#cdd88f', '#dcd78a', '#e6cf7c', '#b7cf9d'];
    for (let i = 0; i < (tall ? 26 : 34); i++) {
      const x = r.in(-.05, 1.05) * w, y = skyY + r.in(.12, 1) * (h - skyY), q = u * r.in(.06, .15), col = r.pick(greens);
      c.save(); c.globalAlpha = r.in(.5, .9); cut(c, () => blob(c, x, y, q, rng(i * 7 + 3), .22, 8), col, 2); c.restore();
      if (r() < .45) {          // furrows
        c.save(); blob(c, x, y, q, rng(i * 7 + 3), .22, 8); c.clip(); c.strokeStyle = alpha(shade(col, .25), .35); c.lineWidth = 1.2; const a = r.in(-.6, .6);
        for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(x - q * 1.3, y + k * q * .22 + Math.tan(a) * -q * 1.3); c.lineTo(x + q * 1.3, y + k * q * .22 + Math.tan(a) * q * 1.3); c.stroke(); }
        c.restore();
      }
    }

    // the sea, on the side the sea place is on
    const sp = pts[5]; seaSide = sp[0] > w / 2 ? 1 : -1;
    const sky = skyY;
    const coast = []; const seaTop = sp[1] - u * (tall ? .2 : .34), seaBot = sp[1] + u * (tall ? .2 : .5), inX = sp[0] - seaSide * u * (tall ? .3 : .26);
    const edge = seaSide > 0 ? w + 30 : -30;
    coast.push([edge, seaTop - u * .05]);
    for (let i = 0; i <= 8; i++) { const t = i / 8, bulge = Math.sin(t * Math.PI); coast.push([lerp(edge, inX, Math.pow(bulge, .75)) + r.in(-1, 1) * u * .025, lerp(seaTop, seaBot, t)]); }
    coast.push([edge, seaBot + u * .05]);
    const seaPath = () => smooth(c, coast, true);
    c.save(); c.translate(0, 0); seaPath(); c.strokeStyle = '#f4ead0'; c.lineWidth = u * .028; c.lineJoin = 'round'; c.stroke(); c.restore();      // the sand
    seaPath(); c.fillStyle = linear(c, inX, 0, edge, 0, [[0, '#7fd3d2'], [.35, '#4fb6d0'], [1, '#2f86c2']]); c.fill();
    c.save(); seaPath(); c.clip();
    wash(c, clouds(64, 21, '#1f5fa8', 3, .5, 2), Math.min(inX, edge), seaTop - 40, Math.abs(edge - inX), seaBot - seaTop + 80, .32, 'multiply');
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = u * .012; seaPath(); c.stroke();                  // the foam along the shore
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6; c.lineCap = 'round';
    for (let i = 0; i < 22; i++) { const x = lerp(inX, edge, r.in(.15, .95)), y = r.in(seaTop, seaBot), q = u * r.in(.012, .022); c.beginPath(); c.moveTo(x - q, y); c.quadraticCurveTo(x - q / 2, y - q * .7, x, y); c.quadraticCurveTo(x + q / 2, y - q * .7, x + q, y); c.stroke(); }
    c.restore();
    glints = []; for (let i = 0; i < 9; i++) glints.push([lerp(inX, edge, r.in(.3, .9)), r.in(seaTop + u * .05, seaBot - u * .05), r()]);
    // an island with a palm, a boat
    const ix = sp[0] + seaSide * u * (tall ? .06 : .12), iy = sp[1] + u * (tall ? .12 : .2);
    cut(c, () => blob(c, ix, iy, u * .03, rng(5), .2, 7), '#f1e2b4', 2); cut(c, () => blob(c, ix - 1, iy - 2, u * .018, rng(6), .25, 6), '#8fbf6a', 1.5);

    // the river: down from the mountains, past the pond, to the sea
    const mp = pts[6], pond = pts[4], mouth = [inX + seaSide * u * .03, sp[1] + u * .1];
    const wind = (A, B, bends, sway, seed) => { const q = rng(seed), out = [], n = bends * 6, nx = -(B[1] - A[1]), ny = B[0] - A[0], len = Math.hypot(nx, ny) || 1; for (let i = 0; i <= n; i++) { const t = i / n, o = Math.sin(t * Math.PI * bends + q() * .6) * sway * Math.sin(t * Math.PI); out.push([lerp(A[0], B[0], t) + nx / len * o, lerp(A[1], B[1], t) + ny / len * o]); } return out; };
    const riv = wind([mp[0] - u * .1, skyY + u * .16], [pond[0] + R * 1.2, pond[1] - R * 1.6], 2.4, u * .05, 301).concat(wind([pond[0] + R * 2.2, pond[1] + R * .4], mouth, 1.6, u * .04, 302).slice(1));
    c.lineCap = 'round'; c.lineJoin = 'round';
    smooth(c, riv, false); c.strokeStyle = 'rgba(244,234,208,.85)'; c.lineWidth = u * .026; c.stroke();
    smooth(c, riv, false); c.strokeStyle = '#6cc4d2'; c.lineWidth = u * .016; c.stroke();
    smooth(c, riv, false); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.1; c.setLineDash([5, 9]); c.stroke(); c.setLineDash([]);

    // the pond of the green land
    cut(c, () => blob(c, pond[0], pond[1] + R * .2, R * 2.5, rng(41), .16, 9), '#2f9d8d', 3);
    c.save(); blob(c, pond[0], pond[1] + R * .2, R * 2.5, rng(41), .16, 9); c.clip();
    c.fillStyle = radial(c, pond[0], pond[1], 0, R * 2.6, [[0, 'rgba(160,236,214,.55)'], [1, 'rgba(20,90,100,.25)']]); c.fillRect(pond[0] - R * 3, pond[1] - R * 3, R * 6, R * 6);
    for (let i = 0; i < 12; i++) { const a = r() * TAU, d = R * r.in(1.25, 2.2), x = pond[0] + Math.cos(a) * d, y = pond[1] + R * .2 + Math.sin(a) * d * .9, q = R * r.in(.16, .3);
      c.fillStyle = r.pick(['#5fbf6a', '#7fcf78', '#4aa85e']); c.beginPath(); c.moveTo(x, y); c.arc(x, y, q, a + .5, a + TAU - .2); c.closePath(); c.fill();
      if (r() < .4) { c.fillStyle = r.pick(['#ffd0e4', '#fff3f7', '#ff9fc4']); disc(c, x + q * .2, y - q * .2, q * .36); c.fill(); } }
    c.restore();

    // trees
    const tree = (x, y, q, col) => { c.fillStyle = 'rgba(30,22,60,.16)'; oval(c, x + q * .2, y + q * .9, q * .8, q * .22, 0); c.fill(); c.fillStyle = '#7a5a3c'; c.fillRect(x - q * .1, y + q * .3, q * .2, q * .6); cut(c, () => disc(c, x, y, q), col, 1.5); c.fillStyle = 'rgba(255,255,255,.16)'; disc(c, x - q * .3, y - q * .3, q * .45); c.fill(); };
    const treeTop = Math.max(skyY + u * .24, pts[6][1] + R * 2.4);
    for (let i = 0; i < (tall ? 34 : 48); i++) { const x = r() * w, y = treeTop + r() * (h - treeTop); if (pts.some(p => Math.hypot(p[0] - x, p[1] - y) < R * 2.2) || (Math.abs(x - sp[0]) < u * .3 && Math.abs(y - sp[1]) < u * .3 && (x - inX) * seaSide > -u * .03)) continue; tree(x, y, u * r.in(.012, .021), r.pick(['#5fa66a', '#7fb86a', '#4d9462', '#8cc279'])); }

    // houses, by the handful, about the places of the town
    const house = (x, y, q, wall, roof, lit) => {
      c.fillStyle = 'rgba(30,22,60,.18)'; oval(c, x + q * .15, y + q * .55, q * .95, q * .2, 0); c.fill();
      c.fillStyle = wall; c.fillRect(x - q * .7, y - q * .2, q * 1.4, q * .75);
      c.fillStyle = roof; c.beginPath(); c.moveTo(x - q * .92, y - q * .16); c.lineTo(x, y - q * .92); c.lineTo(x + q * .92, y - q * .16); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(x - q * .92, y - q * .16); c.lineTo(x, y - q * .92); c.lineTo(x, y - q * .16); c.closePath(); c.fill();
      c.fillStyle = lit ? '#ffe9a0' : alpha(INK, .55); c.fillRect(x - q * .18, y + q * .05, q * .36, q * .36);
    };
    const town = (cx0, cy0, n, seed, walls, roofs, spread) => { const q = rng(seed); for (let i = 0; i < n; i++) { const a = q() * TAU, d = R * q.in(1.5, spread || 2.9); house(cx0 + Math.cos(a) * d, cy0 + Math.sin(a) * d * .8 + R * .2, u * q.in(.016, .024), q.pick(walls), q.pick(roofs), q() < .3); } };
    town(pts[0][0], pts[0][1], 6, 61, ['#f6ecd2', '#efe0c0'], ['#c8643c', '#b5502e', '#d67a48']);
    town(pts[1][0], pts[1][1], 9, 62, ['#f2dcb0', '#e9c98a', '#f6e6c4'], ['#8a3b32', '#a84a34', '#73302c'], 3.1);
    town(pts[2][0], pts[2][1], 6, 63, ['#f6ecd2', '#f3d9a8'], ['#e08a3a', '#c96f2c', '#eda04a']);
    town(pts[3][0], pts[3][1], 4, 64, ['#f6d86a', '#f2cc52'], ['#b5502e', '#c8643c']);
    // the lantern street's strings of lights (they glow on the moving sheet)
    lamps = []; { const q = rng(71), p1 = pts[1]; for (let s = 0; s < 3; s++) { const x0 = p1[0] - R * 2.6, x1 = p1[0] + R * 2.6, y0 = p1[1] - R * 1.5 + s * R * 1.5 + q.in(-4, 4); c.strokeStyle = alpha(INK, .5); c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(p1[0], y0 + R * .5, x1, y0); c.stroke();
      for (let k = 1; k < 8; k++) { const t = k / 8, x = lerp(x0, x1, t), y = y0 + R * .5 * (1 - Math.pow(2 * t - 1, 2)) * .5 + 3; if (Math.hypot(x - p1[0], y - p1[1]) < R * 1.25) continue; lamps.push([x, y, q.pick(['#ff5a4d', '#ffb347', '#ff7a59', '#ffd166']), q()]); } } }
    // market awnings
    { const q = rng(73), p2 = pts[2]; for (let i = 0; i < 4; i++) { const x = p2[0] + (i - 1.5) * R * 1.05, y = p2[1] + R * 2.9 + q.in(-3, 3), ww = R * .9, hh = R * .42; c.fillStyle = 'rgba(30,22,60,.18)'; c.fillRect(x - ww / 2 + 2, y + 3, ww, hh); for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#fff6e0' : ['#f58a1f', '#e2573a', '#f2a93b', '#f58a1f'][i]; c.fillRect(x - ww / 2 + k * ww / 4, y, ww / 4, hh); } } }
    // the school's flag
    { const p3 = pts[3], x = p3[0] + R * 1.9, y = p3[1] - R * .6; c.strokeStyle = alpha(INK, .7); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y + R * 1.1); c.lineTo(x, y - R * .5); c.stroke(); c.fillStyle = '#e23b3f'; c.fillRect(x, y - R * .5, R * .55, R * .36); c.fillStyle = '#f6cf2e'; star(c, x + R * .275, y - R * .32, R * .1, 5, .45); c.fill(); }

    // the night sky
    c.fillStyle = linear(c, 0, 0, 0, sky, [[0, '#17123c'], [.55, '#2b1f66'], [1, '#5a3a8c']]); c.fillRect(0, 0, w, sky + 2);
    wash(c, clouds(96, 31, '#a04fd0', 4, .55, 2.6), 0, 0, w, sky, .4, 'screen');
    wash(c, clouds(96, 33, '#2f6fd8', 4, .55, 2.6), 0, 0, w, sky, .28, 'screen');
    glowAt(c, pts[7][0], pts[7][1], R * 4.2, '#c98bff', .34);
    for (let i = 0; i < Math.round(w * sky / 2400); i++) { const x = r() * w, y = r() * sky * .96, q = r(); c.fillStyle = alpha(q < .15 ? '#ffe9b0' : '#ffffff', r.in(.35, .95)); disc(c, x, y, q < .08 ? 1.5 : r.in(.5, 1.1)); c.fill(); }
    twinks = []; for (let i = 0; i < 16; i++) twinks.push([r() * w, r() * sky * .86, r.in(2.5, 5), r()]);
    // the clouds between sky and land: scalloped, in three rows, thinning to mist over the far country
    const row = (y, q, col, seed, lightCol) => { const s = rng(seed); const path = () => { c.beginPath(); c.moveTo(-q, y + q * 1.5); let x = -q * s(); while (x < w + q) { const rr2 = q * s.in(.75, 1.35); c.arc(x + rr2, y, rr2, Math.PI, 0); x += rr2 * 2 * s.in(.72, .92); } c.lineTo(w + q, y + q * 1.5); c.closePath(); };
      c.save(); c.translate(0, -2.5); path(); c.fillStyle = lightCol; c.fill(); c.restore(); path(); c.fillStyle = col; c.fill(); };
    row(sky - u * .03, u * .03, '#7f6fbd', 81, 'rgba(255,255,255,.28)');
    row(sky - u * .006, u * .036, '#b3a6de', 82, 'rgba(255,255,255,.5)');
    row(sky + u * .022, u * .042, '#e6e0f5', 83, 'rgba(255,255,255,.9)');
    c.fillStyle = linear(c, 0, sky + u * .03, 0, sky + u * .2, [[0, '#e6e0f5'], [.3, 'rgba(230,224,245,.7)'], [1, 'rgba(230,224,245,0)']]); c.fillRect(0, sky + u * .03, w, u * .17);

    // mountains: far ridges pale, near ones deep indigo, the highest about the indigo land
    const ridge = (base, height, col, seed, peakAt, jag) => {
      const q = rng(seed), p = [[-20, base + u * .08]];
      for (let x = -20; x <= w + 20; x += u * .045) { const near = Math.exp(-Math.pow((x - peakAt) / (u * .42), 2)); p.push([x, base - height * (.25 + .75 * near) * (.55 + .45 * q()) - (q() < .3 ? jag : 0)]); }
      p.push([w + 20, base + u * .08]);
      const path = () => { c.beginPath(); p.forEach((v, i) => c[i ? 'lineTo' : 'moveTo'](v[0], v[1])); c.closePath(); }, fade = k => linear(c, 0, base - height, 0, base + u * .08, [[0, k], [.62, k], [1, alpha(k, 0)]]);
      c.save(); c.translate(0, 3); path(); c.fillStyle = fade('#1e163c'); c.globalAlpha = .2; c.fill(); c.restore();
      path(); c.fillStyle = fade(col); c.fill();
      return p;
    };
    const mBase = Math.max(sky + u * .13, mp[1] + R * .3);
    ridge(mBase - u * .05, u * .17, '#a7b3dc', 3, mp[0] - u * .22, u * .01);
    ridge(mBase - u * .012, u * .16, '#7482c8', 4, mp[0] + u * .14, u * .015);
    const front = ridge(mBase + u * .04, u * .15, '#4652ac', 5, mp[0], u * .02);
    c.save(); c.beginPath(); front.forEach((v, i) => c[i ? 'lineTo' : 'moveTo'](v[0], v[1])); c.closePath(); c.clip();
    c.fillStyle = linear(c, 0, mBase - u * .12, 0, mBase + u * .02, [[0, 'rgba(255,255,255,.2)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(0, mBase - u * .2, w, u * .3);
    c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1.1;                                              // terraces
    for (let k = 1; k < 7; k++) { c.beginPath(); for (let x = -20; x <= w + 20; x += 14) c.lineTo(x, mBase + u * (.02 - k * .019) + Math.sin(x / 37 + k * 1.7) * 4); c.stroke(); }
    c.restore();

    // the road
    const roadPath = () => { c.beginPath(); road.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    roadPath(); c.strokeStyle = 'rgba(42,36,64,.28)'; c.lineWidth = R * .34; c.stroke();
    roadPath(); c.strokeStyle = '#fff6dc'; c.lineWidth = R * .24; c.stroke();
    roadPath(); c.strokeStyle = alpha('#c8442d', .9); c.lineWidth = Math.max(1.6, R * .06); c.setLineDash([R * .16, R * .2]); c.stroke(); c.setLineDash([]);

    // the compass, where there is room for it
    { const x = tall ? w * .14 : w * .05 + R, y = tall ? lerp(pts[6][1], pts[4][1], .56) : h * .47, q = R * (tall ? .78 : .95); c.save(); c.translate(x, y); c.rotate(-.18); c.globalAlpha = .82;
      c.strokeStyle = alpha(INK, .55); c.lineWidth = 1.2; disc(c, 0, 0, q); c.stroke(); disc(c, 0, 0, q * .82); c.stroke();
      for (let k = 0; k < 8; k++) { c.rotate(TAU / 8); c.fillStyle = k % 2 ? alpha(INK, .7) : '#c8442d'; c.beginPath(); c.moveTo(0, -q * (k % 2 ? 1.08 : .62)); c.lineTo(q * .13, 0); c.lineTo(-q * .13, 0); c.closePath(); c.fill(); }
      c.fillStyle = '#fff6dc'; disc(c, 0, 0, q * .12); c.fill(); c.restore(); }

    grain(c, 0, 0, w, h, .22);
    c.fillStyle = radial(c, w / 2, h / 2, Math.min(w, h) * .45, Math.hypot(w, h) * .62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(22,14,50,.3)']]); c.fillRect(0, 0, w, h);

    // what drifts over the land
    clouds2 = []; for (let i = 0; i < (tall ? 4 : 5); i++) clouds2.push({ x: r() * w, y: sky + u * .2 + r() * (h - sky - u * .5), q: u * r.in(.035, .06), v: r.in(4, 9) });
  }

  /* ── the markers ── */
  function emblems() {
    const d = Math.min(DPR(), 2), q = R * 3.2, px = Math.ceil(q * d);
    marks = PLACES.map(P => {
      const [cv, c] = sheet(px, px);
      c.scale(d, d); c.translate(q / 2, q / 2);
      // the plate it stands on
      c.fillStyle = 'rgba(30,22,60,.3)'; oval(c, 0, R * .74, R * 1.06, R * .44, 0); c.fill();
      c.fillStyle = shade(P.hue, .34); oval(c, 0, R * .6, R, R * .46, 0); c.fill();
      c.fillStyle = linear(c, 0, R * .1, 0, R * .9, [[0, tint(P.hue, .3)], [1, P.hue]]); oval(c, 0, R * .5, R, R * .46, 0); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1.2, R * .05); oval(c, 0, R * .5, R * .86, R * .37, 0); c.stroke();
      c.translate(0, -R * .12);
      c.save(); if (P.emblem) P.emblem(c, R * .78); else P.ball(c, P.colour, R * .78); c.restore();
      if (kept.marks && P.colour != null) mark(c, P.colour, R * .78);
      return cv;
    });
  }
  function buttons() {
    spots.innerHTML = '';
    PLACES.forEach((P, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'spot'; b.style.left = pts[i][0] + 'px'; b.style.top = pts[i][1] + 'px';
      b.style.width = b.style.height = R * 2.7 + 'px'; b.style.margin = `${-R * 1.35}px 0 0 ${-R * 1.35}px`;
      b.setAttribute('aria-label', tr(P.name)); b.setAttribute('aria-current', String(i === here));
      b.addEventListener('click', () => { audio.wake(); if (i === here && !walker.going) on.play(P.id); else go(i, true); });
      b.addEventListener('dblclick', () => on.play(P.id));
      spots.appendChild(b);
    });
  }
  function layout() {
    const r = mapEl.getBoundingClientRect();
    if (r.width < 10) return;
    w = Math.round(r.width); h = Math.round(r.height); tall = w < h * 1.1;
    R = clamp(Math.min(w, h) * (tall ? .068 : .052), 21, 40);
    pts = place_points();
    lay_road(); paint(); emblems(); buttons();
    fit(liveCv, Math.min(DPR(), 2));
    if (!walker.going) { walker.x = pts[here][0]; walker.y = pts[here][1]; }
  }

  /* ── the ticket: the place the traveller stands at ── */
  function ticket() {
    const P = PLACES[here], pk = placeKept(P.id), wd = W();
    $('ticket').style.setProperty('--hue', P.hue);
    $('tk-no').textContent = P.no === 0 ? wd.startStop : wd.stop(P.no) + (P.colour != null ? ' · ' + wd.colours[P.colour] : '');
    $('tk-name').textContent = tr(P.name); $('tk-tag').textContent = tr(P.tag);
    $('tk-stars').innerHTML = ui.stars(starsFor(pk.best)); $('tk-best').textContent = String(pk.best);
    $('tk-go').textContent = pk.game ? wd.resume : wd.play;
    const note = $('tk-note'); note.hidden = !pk.game; if (pk.game) note.textContent = wd.inPlay(pk.game.score);
    const [c, sw, sh] = fit($('stamp'));
    c.clearRect(0, 0, sw, sh); c.save(); c.translate(sw / 2, sh / 2);
    c.fillStyle = radial(c, 0, 0, sw * .1, sw * .5, [[0, tint(P.hue, .55)], [1, tint(P.hue, .12)]]); disc(c, 0, 0, sw * .47); c.fill();
    c.strokeStyle = alpha(P.hue, .9); c.lineWidth = 1.5; c.setLineDash([3, 3.5]); disc(c, 0, 0, sw * .47); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(30,22,60,.2)'; oval(c, 0, sw * .27, sw * .22, sw * .06, 0); c.fill();
    c.save(); if (P.emblem) P.emblem(c, sw * .29); else P.ball(c, P.colour, sw * .29); c.restore();
    if (kept.marks && P.colour != null) mark(c, P.colour, sw * .29);
    c.restore();
    spots.querySelectorAll('.spot').forEach((b, i) => b.setAttribute('aria-current', String(i === here)));
  }
  /** the rainbow under the title: a colour for each land where 100 points were made */
  function bow() {
    const el = $('bow'), lands = PLACES.filter(P => P.colour != null).sort((a, b) => a.colour - b.colour); let lit = 0;
    if (!el.firstChild) el.innerHTML = '<svg viewBox="0 0 120 62" aria-hidden="true">' + lands.map((P, k) => { const q = 55 - k * 5.6; return `<path style="--c:${RAINBOW[P.colour]}" d="M${60 - q} 60A${q} ${q} 0 0 1 ${60 + q} 60"/>`; }).join('') + '</svg>';
    el.querySelectorAll('path').forEach((band, k) => { const ok = placeKept(lands[k].id).best >= STARS[0]; if (ok) lit++; band.classList.toggle('lit', ok); });       // a band newly lit comes on slowly: the page's own transition
    el.setAttribute('aria-label', W().bow(lit)); el.title = lit === 7 ? W().bowDone : W().bowHint;
    return lit;
  }

  /* ── walking the road ── */
  function go(i, walk) {
    if (i === here && !walker.going) return;
    const from = here; here = i; kept.at = PLACES[i].id; keep(); ticket();
    if (!walk || STILL.matches) { walker.x = pts[i][0]; walker.y = pts[i][1]; walker.going = false; return; }
    const a = road.at[from], b = road.at[i], steps = Math.abs(b - a);
    walker.going = true; audio.travel(i);
    const token = walker.token = (walker.token || 0) + 1;
    anim.run(clamp(260 + steps * 5.5, 320, 1100), u => {
      if (walker.token !== token) return;
      const f = a + (b - a) * u, k = clamp(Math.floor(f), 0, road.length - 2), t = f - k;
      walker.x = lerp(road[k][0], road[k + 1][0], t); walker.y = lerp(road[k][1], road[k + 1][1], t); walker.hop = Math.abs(Math.sin(f * .42)) * (1 - Math.pow(2 * u - 1, 6));
    }, { ease: ease.io2 }).then(() => { if (walker.token === token) { walker.going = false; walker.hop = 0; walker.x = pts[i][0]; walker.y = pts[i][1]; } });
  }

  function draw(t, dt) {
    const d = Math.min(DPR(), 2), c = liveCv.getContext('2d');
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
    // stars that brighten and dim, glints on the sea, the lantern street's lights
    for (const s of twinks) twinkle(c, s[0], s[1], s[2] * (.6 + .4 * Math.sin(t / 700 + s[3] * 9)), '#fff6d8', .35 + .6 * (.5 + .5 * Math.sin(t / 900 + s[3] * 20)));
    for (const g of glints) { const a = Math.max(0, Math.sin(t / 600 + g[2] * 30)); if (a > .5) twinkle(c, g[0], g[1], 3.5 * a, '#ffffff', (a - .5) * 1.6); }
    c.globalCompositeOperation = 'lighter';
    for (const l of lamps) { const a = .55 + .35 * Math.sin(t / 420 + l[3] * 12); glowAt(c, l[0], l[1], R * .34, l[2], a * .8); }
    c.globalCompositeOperation = 'source-over';
    for (const l of lamps) { c.fillStyle = l[2]; disc(c, l[0], l[1], Math.max(1.6, R * .075)); c.fill(); }
    // clouds over the land, and their shade
    for (const cl of clouds2) {
      cl.x += cl.v * dt; if (cl.x - cl.q * 3 > w) cl.x = -cl.q * 3;
      const puff = (ox, oy, a, col) => { c.fillStyle = col; c.globalAlpha = a; let x = cl.x + ox; for (let k = 0; k < 4; k++) { const rr2 = cl.q * [.55, .8, .68, .5][k]; disc(c, x, cl.y + oy - rr2 * .3, rr2); c.fill(); x += rr2 * 1.15; } c.fillRect(cl.x + ox - cl.q * .4, cl.y + oy - cl.q * .12, cl.q * 2.9, cl.q * .42); };
      puff(cl.q * .5, cl.q * 1.5, .1, '#1e163c'); puff(0, 0, .9, '#fffdf6'); c.globalAlpha = 1;
    }
    // the places
    for (let i = 0; i < PLACES.length; i++) {
      const P = PLACES[i], p = pts[i], sel = i === here, bob = Math.sin(t / 620 + i * 1.3) * R * .045, k = sel ? 1.14 + .03 * Math.sin(t / 300) : 1, q = R * 3.2 * k;
      if (sel) { c.strokeStyle = '#fff6dc'; c.lineWidth = Math.max(2, R * .09); c.globalAlpha = .55 + .4 * Math.sin(t / 300); oval(c, p[0], p[1] + R * .5 * k, R * 1.22 * k, R * .58 * k, 0); c.stroke(); c.globalAlpha = 1; }
      c.drawImage(marks[i], p[0] - q / 2, p[1] - q / 2 + bob * (sel ? 1.6 : 1), q, q);
      // its name, and the stars won there
      const best = placeKept(P.id).best, n = starsFor(best), night = p[1] < skyY, ly = p[1] + R * 1.36 * k;
      c.font = `600 ${clamp(R * .5, 12.5, 17)}px Fraunces, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.lineJoin = 'round';
      c.lineWidth = 4; c.strokeStyle = night ? 'rgba(23,18,60,.75)' : 'rgba(255,248,226,.92)'; c.strokeText(tr(P.name), p[0], ly);
      c.fillStyle = night ? '#fff6dc' : INK; c.fillText(tr(P.name), p[0], ly);
      if (best > 0 || n) for (let s = 0; s < 3; s++) { c.fillStyle = s < n ? '#f0b21e' : (night ? 'rgba(255,255,255,.25)' : 'rgba(42,36,64,.2)'); c.strokeStyle = night ? 'rgba(23,18,60,.6)' : 'rgba(255,248,226,.9)'; c.lineWidth = 2; star(c, p[0] + (s - 1) * R * .44, ly + clamp(R * .5, 12.5, 17) + R * .34, R * .19, 5, .46); c.stroke(); c.fill(); }
    }
    // the traveller: a white ball with a little flag
    { const x = walker.x - (walker.going ? 0 : R * 1.02), y = walker.y + (walker.going ? 0 : R * .56) - walker.hop * R * .5, q = R * .3, wob = walker.going ? 0 : Math.sin(t / 380) * 1.2;
      c.fillStyle = 'rgba(30,22,60,.3)'; oval(c, x, y + q * .95 + walker.hop * R * .5, q * .9, q * .3, 0); c.fill();
      c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - q * 2.5 + wob); c.stroke();
      c.fillStyle = '#e23b3f'; c.beginPath(); c.moveTo(x, y - q * 2.5 + wob); c.lineTo(x + q * 1.15, y - q * 2.1 + wob); c.lineTo(x, y - q * 1.7 + wob); c.closePath(); c.fill();
      c.save(); c.translate(x, y); sphere(c, q, '#f4f0e6', { core: .7, dark: .28, gloss: .9 }); c.restore(); }
  }

  return {
    on, layout, draw, go,
    start(id) { here = Math.max(0, PLACES.findIndex(P => P.id === id)); layout(); ticket(); bow(); },
    /** names, stars and the rainbow read again: a language changed, a game was played */
    refresh() { ticket(); bow(); spots.querySelectorAll('.spot').forEach((b, i) => b.setAttribute('aria-label', tr(PLACES[i].name))); },
    place: () => PLACES[here],
    /** where a place is, in the window */
    spot(id) { const i = Math.max(0, PLACES.findIndex(P => P.id === id)), r = mapEl.getBoundingClientRect(); return [r.left + pts[i][0], r.top + pts[i][1]]; },
    key(k) {
      const step = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 0;
      if (step) { go(clamp(here + step, 0, 7), true); const b = spots.children[here]; if (b) b.focus({ preventScroll: true }); return true; }      // the keys are on the map now: Enter goes in
      if (k === 'Enter' || k === ' ') { if (document.activeElement && document.activeElement.closest('button, a') && !document.activeElement.classList.contains('spot')) return false; on.play(PLACES[here].id); return true; }
      return false;
    },
  };
})();
