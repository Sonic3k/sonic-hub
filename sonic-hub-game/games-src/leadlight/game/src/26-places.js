/* The pictures of places and things outside the battle: the eight regions of the land as windows (the campaign map
   is laid over them), the two chests, the kiln. Drawn in the same glass as the cards, when first asked for. */

/** glass cut over a polygon, each piece coloured by where it lies: colour(x, y) for its centre */
function glazeBy(p, poly, size, colour, o = {}) {
  const parts = Shape.shatter(poly, p.rand, size, o.lean || 0, o.spread || 1.5, o.most || 400);
  for (const q of parts) { const [x, y] = Shape.centroid(q); p.glass(q, jitter(colour(x, y), p.rand, o.vary !== undefined ? o.vary : 0.7), o); }
  return parts;
}
/** a wavy edge across the width at height y: points left to right */
function ridge(p, y, amp, n, rough = 0.5, W = p.w) {
  const r = p.rand, pts = [];
  for (let i = 0; i <= n; i++) pts.push([(W * i) / n, y - Math.sin(i * 1.9 + r() * rough * 3) * amp - r() * amp * rough]);
  return Shape.curve(pts, 8);
}
const band = (p, top) => [[0, p.h + 2], ...top, [p.w, p.h + 2]];
/** a colour from a run of colours, by t from 0 to 1 */
function along(cols, t) { t = clampN(t, 0, 0.9999) * (cols.length - 1); const i = Math.floor(t); return mix(cols[i], cols[i + 1], t - i); }
function sky(p, cols, bottom, size = 0.16) {
  glazeBy(p, [[0, 0], [p.w, 0], [p.w, bottom], [0, bottom]], p.h * size, (x, y) => along(cols, y / bottom), { tex: 'streak', texAlpha: 0.45, edge: 0.15 });
}
function sun(p, x, y, r, col = '#fff1c0', rays = 0, rayCol = '#f6d27a') {
  if (rays) for (let i = 0; i < rays; i++) p.glass(Shape.sector(x, y, r * 1.25, r * 1.9, (i / rays) * TAU, ((i + 0.5) / rays) * TAU), jitter(rayCol, p.rand, 0.4), { tex: 'ripple', glow: 0.3, alpha: 0.9 });
  p.glass(Shape.ellipse(x, y, r, r), col, { glow: 0.85, tex: 'mottle' });
}
/** a tree's crown: overlapping rounds of leaves, each cut small */
function crown(p, x, y, rx, ry, cols, n = 7) {
  const r = p.rand;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.6, d = i ? 0.55 + r() * 0.2 : 0;
    const cx = x + Math.cos(a) * rx * d, cy = y + Math.sin(a) * ry * d * 0.8, k = i ? 0.5 + r() * 0.2 : 0.7;
    p.pieces(Shape.ellipse(cx, cy, rx * k, ry * k, r() * 0.6), cols[i % cols.length], Math.min(rx, ry) * 0.42, { tex: 'mottle', vary: 0.9 });
  }
}
function trunk(p, x, base, top, w, col) {
  p.pieces([[x - w, base], [x - w * 0.55, top], [x + w * 0.55, top], [x + w, base]], col, w * 1.6, { tex: 'streak', grain: 90, lean: Math.PI / 2, spread: 0.6 });
}
function pine(p, x, base, h, col, snow) {
  const w = h * 0.38;
  p.glass(Shape.rect(x - w * 0.08, base - h * 0.12, w * 0.16, h * 0.14), '#5a3f2e');
  for (let k = 0; k < 3; k++) {
    const y0 = base - h * 0.1 - k * h * 0.27, ww = w * (1 - k * 0.24);
    p.glass([[x - ww, y0], [x, y0 - h * 0.42], [x + ww, y0]], jitter(col, p.rand, 0.5), { tex: 'streak' });
    if (snow) p.glass([[x - ww * 0.42, y0 - h * 0.24], [x, y0 - h * 0.42], [x + ww * 0.42, y0 - h * 0.24], [x, y0 - h * 0.3]], '#f4f9fc', { tex: 'mottle', texAlpha: 0.3 });
  }
}
function windowPane(p, x, y, w, h, col = '#ffe39a') { p.glass(Shape.arched(x, y, w, h, 0.35), col, { glow: 0.85, tex: 'seedy', texAlpha: 0.3 }); }

const REGION_PAINT = [
  /* Oriel Treehouse: a house in the boughs of a great tree, summer all round */
  p => {
    const W = p.w, H = p.h;
    sky(p, ['#9fcbea', '#c4e0f2', '#f4ebcc'], H * 0.62);
    sun(p, W * 0.83, H * 0.17, H * 0.07);
    p.pieces(band(p, ridge(p, H * 0.6, H * 0.04, 6)), '#a6cf8a', H * 0.2, { tex: 'streak', vary: 0.6 });
    p.pieces(band(p, ridge(p, H * 0.74, H * 0.03, 5)), '#76b25c', H * 0.18, { tex: 'streak', vary: 0.7 });
    for (let i = 0; i < 26; i++) p.glass(Shape.ellipse(p.rand() * W, H * 0.8 + p.rand() * H * 0.18, H * 0.008, H * 0.008), ['#f3d25a', '#f2f0e6', '#e889a8'][i % 3], { leadW: p.leadW * 0.5 });
    trunk(p, W * 0.3, H * 1.02, H * 0.34, W * 0.045, '#8a5a36');
    p.glass([[W * 0.3, H * 0.5], [W * 0.17, H * 0.36], [W * 0.18, H * 0.34], [W * 0.31, H * 0.46]], '#7a4e2e');
    p.glass([[W * 0.3, H * 0.46], [W * 0.45, H * 0.3], [W * 0.46, H * 0.32], [W * 0.31, H * 0.5]], '#7a4e2e');
    crown(p, W * 0.3, H * 0.24, W * 0.19, H * 0.21, ['#4f9a4a', '#7cbf5a', '#5fa64e', '#a7d36a', '#e2b44a'], 9);
    // the house in the boughs
    const hx = W * 0.3, hy = H * 0.36;
    p.glass(Shape.rect(hx - W * 0.075, hy - H * 0.11, W * 0.15, H * 0.12), '#c08a52', { tex: 'streak', grain: 0 });
    p.glass([[hx - W * 0.095, hy - H * 0.105], [hx, hy - H * 0.21], [hx + W * 0.095, hy - H * 0.105]], '#3f7d7a', { tex: 'streak' });
    windowPane(p, hx - W * 0.045, hy - H * 0.085, W * 0.03, H * 0.05); windowPane(p, hx + W * 0.015, hy - H * 0.085, W * 0.03, H * 0.05);
    p.glass(Shape.rect(hx - W * 0.09, hy, W * 0.18, H * 0.014), '#6b4428');
    for (let k = 0; k < 6; k++) p.leadLine([[hx + W * 0.06, hy + k * H * 0.05], [hx + W * 0.085, hy + k * H * 0.05]], p.leadW * 0.8);
    p.leadLine([[hx + W * 0.06, hy], [hx + W * 0.06, hy + H * 0.27]], p.leadW * 0.7); p.leadLine([[hx + W * 0.085, hy], [hx + W * 0.085, hy + H * 0.27]], p.leadW * 0.7);
    crown(p, W * 0.86, H * 0.62, W * 0.08, H * 0.09, ['#5fa64e', '#7cbf5a', '#4f9a4a'], 5);
  },
  /* Glasshouse Green: lawns under a roof of glass */
  p => {
    const W = p.w, H = p.h;
    sky(p, ['#c9e7ee', '#e4f3ef', '#fbf4e2'], H * 0.6);
    p.pieces(band(p, ridge(p, H * 0.58, H * 0.025, 5)), '#9ccf8f', H * 0.2, { tex: 'streak', vary: 0.5 });
    // the glasshouse: a long arched hall of pale panes with its white ribs
    const gx = W * 0.5, gw = W * 0.62, top = H * 0.16, foot = H * 0.62;
    const hall = Shape.arched(gx - gw / 2, top, gw, foot - top, 0.42);
    glazeBy(p, hall, H * 0.09, (x, y) => mix('#dff3ee', '#bfe3dc', (y - top) / (foot - top)), { tex: 'ripple', texAlpha: 0.4, glow: 0.15 });
    const old = p.leadColor; p.leadColor = '#f4f7f2';
    for (let i = 1; i < 8; i++) { const x = gx - gw / 2 + (gw * i) / 8; p.leadLine([[x, foot], [x, top + (foot - top) * 0.42 * (1 - Math.pow((x - gx) / (gw / 2), 2)) - (foot - top) * 0.02]], p.leadW * 1.3); }
    for (let k = 1; k < 4; k++) { const y = top + (foot - top) * (0.35 + k * 0.16); p.leadLine([[gx - gw / 2, y], [gx + gw / 2, y]], p.leadW * 1.1); }
    p.leadColor = old;
    p.lead(hall, p.leadW * 1.6);
    // palms in it, and beside it
    const palm = (x, base, h, s = 1) => {
      p.glass([[x - h * 0.02, base], [x - h * 0.008, base - h], [x + h * 0.008, base - h], [x + h * 0.02, base]], '#8a6a46', { tex: 'streak', grain: 90 });
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42 * s; p.glass(Shape.capsule(x, base - h, x + Math.cos(a) * h * 0.42, base - h + Math.sin(a) * h * 0.3 + h * 0.08, h * 0.05, h * 0.01), jitter('#3f8a4e', p.rand, 0.8), { tex: 'streak' }); }
    };
    palm(gx - gw * 0.22, foot, H * 0.34); palm(gx + gw * 0.18, foot, H * 0.3); palm(W * 0.08, H * 0.74, H * 0.42); palm(W * 0.93, H * 0.72, H * 0.36);
    // the lawn, mown in stripes, and a bed of flowers
    const lawn = band(p, ridge(p, H * 0.66, H * 0.012, 4, 0.2));
    glazeBy(p, lawn, H * 0.12, (x, y) => (Math.floor((x / W) * 9 + (y / H) * 3) % 2 ? '#79b85e' : '#8ec96e'), { tex: 'streak', grain: 20 });
    for (let i = 0; i < 18; i++) p.glass(Shape.ellipse(W * (0.36 + i * 0.016), H * 0.69 + Math.sin(i) * H * 0.008, H * 0.011, H * 0.011), ['#ee7f6b', '#f4c05a', '#f2f0e6'][i % 3], { leadW: p.leadW * 0.5, glow: 0.2 });
    p.glass(Shape.ellipse(W * 0.22, H * 0.7, H * 0.05, H * 0.05), '#4f9a4a'); p.glass(Shape.ellipse(W * 0.78, H * 0.7, H * 0.05, H * 0.05), '#4f9a4a');
  },
  /* Sugarwork Quarter: streets of spun sugar and candied panes */
  p => {
    const W = p.w, H = p.h, r = p.rand;
    sky(p, ['#e9cfe0', '#f1e2ee', '#fbeedf'], H * 0.62);
    sun(p, W * 0.16, H * 0.16, H * 0.06, '#fff4d6');
    const cols = ['#e7a1b5', '#a8d8c4', '#f1dc8c', '#c7b2e0', '#f2b9a0', '#9cc7e6'];
    let x = -W * 0.02;
    while (x < W) {   // the far row of houses, roofs domed and pointed
      const w = W * (0.06 + r() * 0.05), h = H * (0.16 + r() * 0.16), y = H * 0.62 - h, c = cols[Math.floor(r() * cols.length)];
      p.glass(Shape.rect(x, y, w, h), shade(c, -0.04), { tex: 'streak', grain: 90 });
      if (r() < 0.5) p.glass(Shape.sector(x + w / 2, y + 1, 0, w * 0.52, Math.PI, TAU), shade(cols[Math.floor(r() * cols.length)], -0.08), { tex: 'ripple' });
      else p.glass([[x - w * 0.05, y + 1], [x + w / 2, y - h * 0.32], [x + w * 1.05, y + 1]], shade(cols[Math.floor(r() * cols.length)], -0.1), { tex: 'streak' });
      for (let k = 0; k < 2; k++) for (let j = 0; j < Math.floor(h / (H * 0.08)); j++) windowPane(p, x + w * (0.2 + k * 0.38), y + H * 0.03 + j * H * 0.075, w * 0.22, H * 0.045, r() < 0.4 ? '#fff0b8' : '#f8f4ee');
      x += w + W * 0.004;
    }
    // a tower with candied stripes
    const tx = W * 0.72, tw = W * 0.07;
    for (let k = 0; k < 7; k++) p.glass(Shape.rect(tx - tw / 2, H * 0.2 + k * H * 0.06, tw, H * 0.06), k % 2 ? '#f6eef2' : '#d9708e', { tex: 'streak', grain: 30 });
    p.glass([[tx - tw * 0.7, H * 0.2], [tx, H * 0.06], [tx + tw * 0.7, H * 0.2]], '#8fcbb4', { tex: 'ripple' });
    p.glass(Shape.ellipse(tx, H * 0.055, H * 0.014, H * 0.014), '#f6d27a', { glow: 0.6 });
    // the street of sugar stones
    glazeBy(p, band(p, ridge(p, H * 0.64, H * 0.01, 4, 0.2)), H * 0.07, (x, y) => ['#f2d7cf', '#efe0d8', '#e8c9c9', '#f4e6d6'][Math.floor(x * 7 / W + y * 11 / H) % 4], { tex: 'mottle', vary: 0.4 });
    for (let i = 0; i < 5; i++) { const lx = W * (0.1 + i * 0.2); p.glass(Shape.rect(lx - W * 0.003, H * 0.66, W * 0.006, H * 0.16), '#5a4a5e'); p.glass(Shape.ellipse(lx, H * 0.655, H * 0.022, H * 0.026), '#ffe39a', { glow: 0.9 }); }
  },
  /* Seaglass Shore: tide pools and bottle glass worn smooth by the sea */
  p => {
    const W = p.w, H = p.h, r = p.rand;
    sky(p, ['#b9e0ee', '#d9eff2', '#faf1dc'], H * 0.46);
    sun(p, W * 0.66, H * 0.14, H * 0.06, '#fff6d8');
    // a far headland with its lighthouse
    p.pieces([[W * 0.74, H * 0.47], [W * 0.82, H * 0.38], [W * 0.95, H * 0.36], [W * 1.02, H * 0.38], [W * 1.02, H * 0.47]], '#9a8a7a', H * 0.08, { tex: 'streak' });
    for (let k = 0; k < 4; k++) p.glass(Shape.rect(W * 0.885, H * 0.22 + k * H * 0.04, W * 0.03, H * 0.04), k % 2 ? '#c8463a' : '#f6f2ea', { tex: 'streak' });
    p.glass(Shape.rect(W * 0.878, H * 0.19, W * 0.044, H * 0.035), '#ffe39a', { glow: 0.9 });
    p.glass([[W * 0.872, H * 0.19], [W * 0.9, H * 0.16], [W * 0.928, H * 0.19]], '#3a4a5a');
    // the sea in bands, lighter toward the shore
    const sea = ['#2f7f96', '#3f98a8', '#5ab4b8', '#86cdc6', '#b4e2d6'];
    for (let k = 0; k < 5; k++) p.pieces(band(p, ridge(p, H * (0.46 + k * 0.055), H * 0.012, 7, 0.4)), sea[k], H * 0.12, { tex: 'ripple', vary: 0.5, texAlpha: 0.55 });
    const shore = band(p, ridge(p, H * 0.74, H * 0.03, 5, 0.6));
    p.pieces(shore, '#ecd9b0', H * 0.14, { tex: 'mottle', vary: 0.6 });
    for (let i = 0; i < 30; i++) p.glass(Shape.ellipse(r() * W, H * 0.8 + r() * H * 0.18, H * (0.008 + r() * 0.01), H * (0.006 + r() * 0.008), r() * 3), ['#9fd6c4', '#c8e8d8', '#8fbfa0', '#d6b07a', '#a8cfe6'][i % 5], { tex: 'mottle', texAlpha: 0.3, glow: 0.35, leadW: p.leadW * 0.6 });
    // rocks, and a parasol on the sand
    p.pieces([[0, H * 0.86], [W * 0.04, H * 0.66], [W * 0.13, H * 0.62], [W * 0.2, H * 0.78], [W * 0.17, H], [0, H]], '#8c8492', H * 0.08, { tex: 'streak' });
    const ux = W * 0.62, uy = H * 0.66;
    p.glass(Shape.rect(ux - W * 0.003, uy, W * 0.006, H * 0.2), '#6b5a4a');
    for (let i = 0; i < 6; i++) p.glass(Shape.sector(ux, uy + H * 0.02, 0, H * 0.13, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI), i % 2 ? '#f6f0e6' : '#d8574a', { tex: 'streak' });
  },
  /* Geode Hollows: a cavern lined with crystal that keeps the light */
  p => {
    const W = p.w, H = p.h, r = p.rand;
    glazeBy(p, [[0, 0], [W, 0], [W, H], [0, H]], H * 0.09, (x, y) => along(['#fbeef0', '#e6d0f2', '#b89ae0', '#7e64ae', '#56467a'], Math.hypot((x - W * 0.5) / W, (y - H * 0.52) / H) * 1.9), { tex: 'mottle', texAlpha: 0.4 });
    const rock = (poly, c) => p.pieces(poly, c, H * 0.09, { tex: 'streak', vary: 0.6, most: 200 });
    rock([[0, 0], [W * 0.2, 0], [W * 0.12, H * 0.34], [W * 0.08, H * 0.7], [W * 0.12, H], [0, H]], '#4e4068');
    rock([[W, 0], [W * 0.8, 0], [W * 0.88, H * 0.3], [W * 0.92, H * 0.66], [W * 0.88, H], [W, H]], '#4e4068');
    rock([[0, 0], [W, 0], [W, H * 0.05], [W * 0.62, H * 0.09], [W * 0.38, H * 0.08], [0, H * 0.05]], '#5a4a78');
    glazeBy(p, band(p, ridge(p, H * 0.86, H * 0.02, 6)), H * 0.07, (x, y) => ['#6a5890', '#7a68a0', '#5e4e84'][Math.floor(x * 9 / W) % 3], { tex: 'mottle' });
    p.glass(Shape.ellipse(W * 0.5, H * 0.9, W * 0.16, H * 0.035), '#8fd8dc', { tex: 'ripple', glow: 0.6 });
    // crystals: prisms with their points, set in clusters (points down where they hang from the roof)
    const crystal = (x, base, h, w, lean, col) => {
      const up = h > 0 ? 1 : -1; h = Math.abs(h);
      const tip = [x + lean * h, base - up * h], L = [x - w, base], R = [x + w, base];
      const ML = [x - w * 0.85 + lean * h * 0.72, base - up * h * 0.72], MR = [x + w * 0.85 + lean * h * 0.72, base - up * h * 0.72], C = [x + lean * h * 0.72, base - up * h * 0.72];
      p.glass([L, ML, C, [x, base]], shade(col, -0.08), { glow: 0.3, tex: 'ripple' });
      p.glass([[x, base], C, MR, R], shade(col, 0.06), { glow: 0.45, tex: 'ripple' });
      p.glass([ML, tip, C], shade(col, 0.12), { glow: 0.6, tex: 'mottle' });
      p.glass([C, tip, MR], shade(col, -0.02), { glow: 0.5, tex: 'mottle' });
    };
    const cluster = (cx, base, n, hMax, cols, down = false) => {
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) / n, h = hMax * (1 - Math.abs(off) * 1.2) * (0.7 + r() * 0.3);
        crystal(cx + off * hMax * 0.9, base, (down ? -1 : 1) * h, h * 0.13, off * 0.7 + (r() - 0.5) * 0.1, cols[k % cols.length]);
      }
    };
    cluster(W * 0.17, H * 0.98, 6, H * 0.42, ['#9a6ad0', '#b48ae0', '#c8a8ec']);
    cluster(W * 0.84, H * 0.98, 6, H * 0.4, ['#5fc0c8', '#8fd8dc', '#bfeaea']);
    cluster(W * 0.36, H * 0.92, 4, H * 0.16, ['#f0c0d8', '#e8a0c0']);
    cluster(W * 0.64, H * 0.92, 4, H * 0.18, ['#e8eef8', '#c9b2ec']);
    cluster(W * 0.22, H * 0.04, 5, H * 0.2, ['#c09ae8', '#9a6ad0'], true);
    cluster(W * 0.7, H * 0.07, 5, H * 0.17, ['#8fd8dc', '#c8e8f0'], true);
    for (let i = 0; i < 26; i++) p.glass(Shape.star(W * (0.18 + r() * 0.64), H * (0.14 + r() * 0.6), H * 0.012, H * 0.004, 4), '#ffffff', { glow: 0.9, leadW: 0.6 });
  },
  /* Frostpane Heights: high passes, the frost's own patterns, the aurora over them */
  p => {
    const W = p.w, H = p.h, r = p.rand;
    sky(p, ['#a9c6ea', '#c8daf2', '#e9f0f8'], H * 0.6);
    for (let k = 0; k < 3; k++) {   // the aurora: ribbons across the sky
      const pts = []; for (let i = 0; i <= 8; i++) pts.push([(W * i) / 8, H * (0.12 + k * 0.06) + Math.sin(i * 0.9 + k) * H * 0.04]);
      const top = Shape.curve(pts, 6), bottom = top.map(([x, y]) => [x, y + H * 0.035]).reverse();
      p.pieces([...top, ...bottom], ['#8fe0c4', '#b4a8ea', '#9fd8ee'][k], W * 0.08, { tex: 'ripple', glow: 0.4, alpha: 0.85, vary: 0.5 });
    }
    const peak = (x, base, w, h, c) => {
      p.glass([[x - w, base], [x, base - h], [x + w, base]], shade(c, -0.06), { tex: 'streak' });
      p.glass([[x, base - h], [x + w, base], [x + w * 0.2, base]], shade(c, -0.16), { tex: 'streak' });
      p.glass([[x - w * 0.3, base - h * 0.7], [x, base - h], [x + w * 0.32, base - h * 0.68], [x + w * 0.05, base - h * 0.6]], '#f8fbfd', { tex: 'mottle', texAlpha: 0.3 });
    };
    peak(W * 0.18, H * 0.62, W * 0.2, H * 0.38, '#b9d0e6'); peak(W * 0.52, H * 0.62, W * 0.24, H * 0.46, '#c6d8ec'); peak(W * 0.86, H * 0.62, W * 0.2, H * 0.34, '#b2cae2');
    glazeBy(p, band(p, ridge(p, H * 0.6, H * 0.03, 6)), H * 0.14, (x, y) => mix('#e8f2f9', '#c8dcee', (y - H * 0.6) / (H * 0.4)), { tex: 'mottle', texAlpha: 0.35 });
    for (const [x, h] of [[0.06, 0.3], [0.12, 0.24], [0.3, 0.2], [0.7, 0.22], [0.9, 0.3], [0.96, 0.24]]) pine(p, W * x, H * 0.96, H * h, '#2f6a6a', true);
    for (let i = 0; i < 24; i++) p.glass(Shape.star(r() * W, r() * H * 0.95, H * 0.014, H * 0.005, 6), '#ffffff', { glow: 0.7, leadW: 0.6 });
  },
  /* Silica Flats: white sand under the sun */
  p => {
    const W = p.w, H = p.h, r = p.rand;
    sky(p, ['#f3c98a', '#f8dfb0', '#fff3dc'], H * 0.56);
    sun(p, W * 0.5, H * 0.22, H * 0.09, '#fff6d6', 16, '#f8d48a');
    const mesa = (x, w, h, c) => p.pieces([[x - w, H * 0.56], [x - w * 0.8, H * 0.56 - h], [x + w * 0.7, H * 0.56 - h], [x + w, H * 0.56]], c, H * 0.06, { tex: 'streak', lean: 0, spread: 0.6 });
    mesa(W * 0.14, W * 0.1, H * 0.12, '#d0855a'); mesa(W * 0.86, W * 0.12, H * 0.16, '#c8764a'); mesa(W * 0.72, W * 0.05, H * 0.08, '#d89068');
    const dunes = ['#f0dcae', '#ead098', '#e2c284', '#f4e4c0'];
    for (let k = 0; k < 4; k++) p.pieces(band(p, ridge(p, H * (0.56 + k * 0.1), H * 0.05, 3, 0.9)), dunes[k], H * 0.16, { tex: 'streak', vary: 0.4, grain: 10 });
    const cactus = (x, base, h) => {
      p.glass(Shape.capsule(x, base, x, base - h, h * 0.09), '#5f8a4a', { tex: 'streak', grain: 90 });
      p.glass(Shape.capsule(x - h * 0.22, base - h * 0.45, x - h * 0.22, base - h * 0.7, h * 0.06), '#6a9452', { tex: 'streak', grain: 90 });
      p.glass(Shape.capsule(x - h * 0.22, base - h * 0.45, x, base - h * 0.45, h * 0.06), '#6a9452');
      p.glass(Shape.capsule(x + h * 0.2, base - h * 0.55, x + h * 0.2, base - h * 0.78, h * 0.06), '#6a9452', { tex: 'streak', grain: 90 });
      p.glass(Shape.capsule(x + h * 0.2, base - h * 0.55, x, base - h * 0.55, h * 0.06), '#6a9452');
    };
    cactus(W * 0.08, H * 0.92, H * 0.26); cactus(W * 0.94, H * 0.86, H * 0.2); cactus(W * 0.3, H * 0.7, H * 0.1);
    for (let i = 0; i < 14; i++) p.glass(Shape.ellipse(r() * W, H * 0.72 + r() * H * 0.26, H * 0.012, H * 0.006), '#fff8e6', { glow: 0.5, leadW: 0.6 });
  },
  /* Lampblack Wood: an old wood lit by lanterns */
  p => {
    const W = p.w, H = p.h, r = p.rand;
    sky(p, ['#44549c', '#6475ba', '#a2acdc'], H * 0.7, 0.18);
    p.glass(Shape.ellipse(W * 0.76, H * 0.18, H * 0.075, H * 0.075), '#f6efcf', { glow: 0.9, tex: 'mottle' });
    const halo = p.g.createRadialGradient(W * 0.76, H * 0.18, 0, W * 0.76, H * 0.18, H * 0.3); halo.addColorStop(0, 'rgba(255,248,220,0.35)'); halo.addColorStop(1, 'rgba(255,248,220,0)'); p.g.fillStyle = halo; p.g.fillRect(0, 0, W, H);
    for (let i = 0; i < 20; i++) p.glass(Shape.star(r() * W, r() * H * 0.45, H * 0.01, H * 0.004, 4), '#fdf8e6', { glow: 0.8, leadW: 0.5 });
    p.pieces(band(p, ridge(p, H * 0.62, H * 0.05, 6)), '#34506a', H * 0.2, { tex: 'streak', vary: 0.5 });
    for (const [x, h] of [[0.06, 0.62], [0.2, 0.5], [0.38, 0.56], [0.58, 0.48], [0.8, 0.6], [0.95, 0.5]]) pine(p, W * x, H * 0.74, H * h, '#25485a', false);
    glazeBy(p, band(p, ridge(p, H * 0.74, H * 0.03, 5)), H * 0.12, (x, y) => mix('#3d6a58', '#2c4c44', (y - H * 0.74) / (H * 0.26)), { tex: 'mottle', texAlpha: 0.4 });
    // the trunks in front, and the lanterns hung from them
    for (const x of [0.03, 0.27, 0.73, 0.98]) trunk(p, W * x, H * 1.02, -H * 0.02, W * 0.03, '#3a3346');
    const lantern = (x, y, s) => {
      const g = p.g, rg = g.createRadialGradient(x, y, 0, x, y, s * 3.2); rg.addColorStop(0, 'rgba(255,214,120,0.55)'); rg.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = rg; g.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
      p.leadLine([[x, y - s * 1.6], [x, y - s * 3]], p.leadW * 0.6);
      p.glass([[x - s * 0.6, y - s * 0.9], [x, y - s * 1.5], [x + s * 0.6, y - s * 0.9]], '#3a3346');
      p.glass(Shape.rect(x - s * 0.5, y - s * 0.9, s, s * 1.5), '#ffd27a', { glow: 0.95, tex: 'seedy', texAlpha: 0.3 });
      p.glass(Shape.rect(x - s * 0.6, y + s * 0.6, s * 1.2, s * 0.25), '#3a3346');
    };
    for (const [x, y, s] of [[0.06, 0.3, 1], [0.24, 0.46, 1.2], [0.31, 0.22, 0.9], [0.69, 0.38, 1.2], [0.76, 0.18, 0.9], [0.95, 0.44, 1]]) {
      lantern(W * x, H * y, H * 0.042 * s);
      const pool = p.g.createRadialGradient(W * x, H * 0.9, 0, W * x, H * 0.9, H * 0.16); pool.addColorStop(0, 'rgba(255,214,120,0.28)'); pool.addColorStop(1, 'rgba(255,214,120,0)'); p.g.fillStyle = pool; p.g.fillRect(0, H * 0.7, W, H * 0.3);
    }
    for (let i = 0; i < 16; i++) p.glass(Shape.ellipse(W * (0.1 + r() * 0.8), H * (0.78 + r() * 0.18), H * 0.008, H * 0.008), ['#8fe0c4', '#c8a8f0', '#ffe39a'][i % 3], { glow: 0.9, leadW: 0.5 });
    for (let i = 0; i < 8; i++) { const mx = W * (0.12 + r() * 0.76), my = H * (0.86 + r() * 0.1); p.glass(Shape.sector(mx, my, 0, H * 0.025, Math.PI, TAU), ['#7fd0c8', '#b49ae8'][i % 2], { glow: 0.7 }); p.glass(Shape.rect(mx - H * 0.005, my, H * 0.01, H * 0.022), '#e8e0d0'); }
  },
];

/** a region of the land as a window: k from 0, W × H in pixels */
function drawRegion(k, W = 1280, H = 800) {
  const p = new Pane(W, H, 4100 + k * 97);
  p.leadW = Math.max(2, Math.min(W, H) / 170);
  REGION_PAINT[k](p);
  p.lightUp({ strength: k === 7 ? 0.35 : 0.5, vignette: 0.28, x: 0.5, y: 0.35 });
  return p.canvas;
}

/** a chest of glass: kind 'normal' or 'premium' */
function drawChest(kind, W = 420, H = 320) {
  const p = new Pane(W, H, kind === 'premium' ? 77 : 55), prem = kind === 'premium', r = p.rand;
  p.leadW = Math.max(1.6, H / 110);
  const back = prem ? ['#d8cdf6', '#9c88dc', '#5a4a9a', '#3a2e6a'] : ['#fbe6b8', '#e8b46a', '#b8743a', '#7a4a26'];
  glazeBy(p, [[0, 0], [W, 0], [W, H], [0, H]], H * 0.16, (x, y) => along(back, Math.hypot((x - W / 2) / W, (y - H * 0.56) / H) * 1.5), { tex: 'streak', texAlpha: 0.4, edge: 0.15 });
  const cx = W / 2, cy = H * 0.58;
  for (let i = 0; i < 18; i++) { const a0 = (i / 18) * TAU, a1 = a0 + TAU / 110; p.glass(Shape.sector(cx, cy, H * 0.36, H * 0.6, a0, a1), prem ? '#e6dcff' : '#fff0c4', { tex: 'ripple', glow: 0.4, alpha: 0.5, edge: 0 }); }
  const x0 = W * 0.24, x1 = W * 0.76, seam = H * 0.53, bottom = H * 0.84, lidTop = H * 0.29;
  p.glass(Shape.ellipse(cx, bottom + H * 0.02, (x1 - x0) * 0.6, H * 0.04), prem ? '#2a2050' : '#4a2e1a', { alpha: 0.55, lead: false, flat: true });
  const wood = prem ? '#4a3a8c' : '#8a5430', wood2 = prem ? '#7a66c8' : '#c08a4c', metal = prem ? '#f0c95a' : '#e0b860';
  glazeBy(p, [[x0, seam], [x1, seam], [x1, bottom], [x0, bottom]], H * 0.08, (x, y) => (Math.floor((y - seam) / (H * 0.09)) % 2 ? wood : shade(wood, 0.05)), { tex: 'streak', grain: 0, vary: 0.35 });
  glazeBy(p, Shape.arched(x0, lidTop, x1 - x0, seam - lidTop, 0.42), H * 0.08, () => wood2, { tex: 'streak', grain: 0, vary: 0.35 });
  const strap = x => { p.glass(Shape.rect(x - W * 0.017, lidTop + (seam - lidTop) * 0.22, W * 0.034, bottom - lidTop - (seam - lidTop) * 0.22), metal, { tex: 'mottle', glow: 0.3 }); };
  strap(x0 + (x1 - x0) * 0.18); strap(x1 - (x1 - x0) * 0.18);
  p.glass(Shape.rect(x0 - W * 0.008, seam - H * 0.018, x1 - x0 + W * 0.016, H * 0.036), metal, { tex: 'mottle', glow: 0.3 });
  p.glass(Shape.rect(x0 - W * 0.008, bottom - H * 0.03, x1 - x0 + W * 0.016, H * 0.03), shade(metal, -0.12), { tex: 'mottle' });
  p.glass(Shape.rect(cx - W * 0.04, seam - H * 0.04, W * 0.08, H * 0.1, 3), metal, { glow: 0.4 });
  p.glass(Shape.ellipse(cx, seam + H * 0.005, H * 0.013, H * 0.019), '#2a2030');
  p.lead(Shape.arched(x0, lidTop, x1 - x0, seam - lidTop, 0.42), p.leadW * 1.8); p.lead([[x0, seam], [x1, seam], [x1, bottom], [x0, bottom]], p.leadW * 1.8);
  if (prem) for (const [x, y, c] of [[0.38, 0.42, '#e0405a'], [0.5, 0.36, '#40b0e0'], [0.62, 0.42, '#50c080']]) p.glass(Shape.star(W * x, H * y, H * 0.03, H * 0.016, 8), c, { glow: 0.55, tex: 'ripple' });
  else for (const x of [0.38, 0.62]) p.glass(Shape.ellipse(W * x, H * 0.42, H * 0.015, H * 0.015), metal, { glow: 0.4 });
  for (let i = 0; i < 10; i++) p.glass(Shape.star(W * (0.12 + r() * 0.76), H * (0.08 + r() * 0.24), H * 0.016, H * 0.006, 4), '#ffffff', { glow: 0.9, leadW: 0.6 });
  p.lightUp({ strength: 0.55, vignette: 0.3, y: 0.55 });
  return p.canvas;
}

/** the kiln: a beehive of brick with the fire showing in its mouth */
function drawKiln(W = 420, H = 320) {
  const p = new Pane(W, H, 31);
  p.leadW = Math.max(1.6, H / 110);
  glazeBy(p, [[0, 0], [W, 0], [W, H], [0, H]], H * 0.2, (x, y) => along(['#f6d6a0', '#e6a870', '#b8704a'], Math.hypot(x - W / 2, y - H * 0.6) / (W * 0.62)), { tex: 'streak', texAlpha: 0.4, edge: 0.15 });
  const cx = W / 2, base = H * 0.9, rw = W * 0.3, rh = H * 0.62;
  p.glass(Shape.rect(cx + rw * 0.35, base - rh * 1.12, rw * 0.22, rh * 0.4), '#8a4a32', { tex: 'streak', grain: 90 });
  const dome = Shape.arched(cx - rw, base - rh, rw * 2, rh, 0.75);
  glazeBy(p, dome, H * 0.07, (x, y) => ['#b8583a', '#c86a46', '#a84e34', '#d07a50'][Math.floor(x * 9 / W + y * 13 / H) % 4], { tex: 'mottle', vary: 0.5 });
  const mouth = Shape.arched(cx - rw * 0.34, base - rh * 0.48, rw * 0.68, rh * 0.48, 0.55);
  glazeBy(p, mouth, H * 0.06, (x, y) => mix('#ffe9a0', '#f08a30', (y - (base - rh * 0.48)) / (rh * 0.48)), { glow: 0.85, tex: 'ripple' });
  for (let i = 0; i < 5; i++) { const fx = cx + (i - 2) * rw * 0.12; p.glass([[fx - rw * 0.06, base], [fx, base - rh * (0.2 + (i % 2) * 0.1)], [fx + rw * 0.06, base]], i % 2 ? '#fff2b0' : '#ffb84a', { glow: 0.9 }); }
  p.glass(Shape.rect(cx - rw * 1.1, base, rw * 2.2, H * 0.06), '#6a4a3a', { tex: 'streak' });
  p.lightUp({ strength: 0.6, vignette: 0.3, y: 0.7 });
  return p.canvas;
}

/* kept as image files, as the cards are */
Pictures.region = function (k, wide, fn) { this.want('r:' + k + (wide ? 'w' : 't'), () => (wide ? drawRegion(k, 1280, 800) : drawRegion(k, 720, 1180)), fn); };
Pictures.chest = function (kind, fn) { this.want('chest:' + kind, () => drawChest(kind), fn); };
Pictures.kiln = function (fn) { this.want('kiln', () => drawKiln(), fn); };
