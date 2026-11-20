/* ── Nhà, 1998 ── the family computer: grey raised squares, seven shiny balls, numbers that glow.
   Where the journey starts, and the one place that is meant to look like what it remembers: a board as programs of
   those years drew them, on a desktop the colour desktops were, shaded the way 256 colours had to be. */
place({
  id: 'home', hue: '#168f8a', colour: null,
  name: { vi: 'Nhà, 1998', en: 'Home, 1998' },
  tag: { vi: 'Chiếc máy tính của cả nhà: bàn cờ xám, những viên bi bóng loáng, con số sáng đèn.', en: 'The family computer: a grey board, shiny balls, numbers in lamps.' },
  dress: { ink: '#eafcff', soft: 'rgba(214,246,250,.7)', panel: 'rgba(4,14,18,.82)', edge: 'rgba(140,220,226,.32)', accent: '#59e3f2', num: '#7deeff' },
  inks: ['#e8262c', '#f08a16', '#f2d21c', '#1fb14a', '#1fc2e0', '#2f52dc', '#c03ad8'],
  frame: .026, ballR: .385, lamps: true,
  voice: { kind: 'blip', root: 261.63, scale: [0, 2, 4, 5, 7, 9, 11], wet: .04 },

  backdrop(c, w, h) {
    // a gradient the old way: few colours, and between them the checkered patterns that stood in for the shades missing
    const px = 3, cols = Math.ceil(w / px), rows = Math.ceil(h / px), [cv, k] = sheet(cols, rows), im = k.createImageData(cols, rows);
    const tones = ['#052b33', '#07414a', '#0a5a60', '#0e7374', '#128a86'].map(rgb), bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const dx = (x / cols - .5) * (w / h > 1 ? w / h : 1), dy = (y / rows - .46) * (h / w > 1 ? h / w : 1);
      const v = clamp(1.02 - Math.hypot(dx, dy) * 1.25, 0, .999) * (tones.length - 1), lo = Math.floor(v), t = tones[v - lo > (bayer[(y & 3) * 4 + (x & 3)] + .5) / 16 ? lo + 1 : lo], i = (y * cols + x) * 4;
      im.data[i] = t[0]; im.data[i + 1] = t[1]; im.data[i + 2] = t[2]; im.data[i + 3] = 255;
    }
    k.putImageData(im, 0, 0);
    c.imageSmoothingEnabled = false; c.drawImage(cv, 0, 0, cols * px, rows * px); c.imageSmoothingEnabled = true;
    // the glass of the screen: faint lines across, darker towards the corners
    c.fillStyle = 'rgba(0,10,14,.13)'; for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
    c.fillStyle = radial(c, w / 2, h * .46, Math.min(w, h) * .3, Math.hypot(w, h) * .62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,8,12,.5)']]); c.fillRect(0, 0, w, h);
  },
  air: null,

  board(c, g) {
    const { S, pad, cell } = g, e = Math.max(1.5, cell * .045);
    // the window's edge: raised, light from the upper left
    c.fillStyle = '#c3c3c3'; rr(c, 0, 0, S, S, 3); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, S, e); c.fillRect(0, 0, e, S);
    c.fillStyle = '#6f6f6f'; c.fillRect(0, S - e, S, e); c.fillRect(S - e, 0, e, S);
    c.fillStyle = '#dedede'; c.fillRect(e, e, S - e * 2, e * .6); c.fillRect(e, e, e * .6, S - e * 2);
    // sunk: the field the squares sit in
    c.fillStyle = '#555'; c.fillRect(pad - e, pad - e, S - (pad - e) * 2, S - (pad - e) * 2);
    c.fillStyle = '#f4f4f4'; c.fillRect(pad - e, S - pad, S - (pad - e) * 2, e); c.fillRect(S - pad, pad - e, e, S - (pad - e) * 2);
    c.fillStyle = '#1c1c1c'; c.fillRect(pad, pad, cell * N, cell * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = pad + x * cell, py = pad + y * cell, gap = Math.max(.5, cell * .012), q = cell - gap * 2;
      c.fillStyle = linear(c, px, py, px + q, py + q, [[0, '#d2d2d2'], [1, '#bdbdbd']]); c.fillRect(px + gap, py + gap, q, q);
      c.fillStyle = '#fbfbfb'; c.fillRect(px + gap, py + gap, q, e); c.fillRect(px + gap, py + gap, e, q);
      c.fillStyle = '#7b7b7b'; c.fillRect(px + gap, py + gap + q - e, q, e); c.fillRect(px + gap + q - e, py + gap, e, q);
      c.fillStyle = '#e6e6e6'; c.beginPath(); c.moveTo(px + gap + q - e, py + gap); c.lineTo(px + gap + q, py + gap); c.lineTo(px + gap + q - e, py + gap + e); c.fill();     // where light edge meets dark, cut on the slant
      c.beginPath(); c.moveTo(px + gap, py + gap + q - e); c.lineTo(px + gap + e, py + gap + q - e); c.lineTo(px + gap, py + gap + q); c.fill();
    }
    grain(c, 0, 0, S, S, .1);
  },

  ball(c, i, r) {
    const col = this.inks[i];
    sphere(c, r, col, { core: .42, dark: .5, rim: .5, gloss: 1 });
    // the window the light comes from, small and sharp, as rendered balls of those years had it
    c.save(); disc(c, 0, 0, r); c.clip();
    c.fillStyle = 'rgba(255,255,255,.2)'; oval(c, r * .34, r * .5, r * .34, r * .13, -.5); c.fill();
    c.strokeStyle = alpha(shade(col, .65), .5); c.lineWidth = Math.max(1, r * .05); disc(c, 0, 0, r - c.lineWidth / 2); c.stroke();
    c.restore();
  },
  shadow: { a: .34, w: .82, h: .22, y: .9 },
  glow: null,
  /** on the map: one grey square of its board, and a ball on it */
  emblem(c, r) {
    const q = r * 1.5, e = r * .12;
    c.save(); c.translate(0, r * .18); c.transform(1, 0, -.28, .62, 0, 0);
    c.fillStyle = '#c6c6c6'; c.fillRect(-q, -q, q * 2, q * 2); c.fillStyle = '#fbfbfb'; c.fillRect(-q, -q, q * 2, e); c.fillRect(-q, -q, e, q * 2); c.fillStyle = '#787878'; c.fillRect(-q, q - e, q * 2, e); c.fillRect(q - e, -q, e, q * 2);
    c.restore();
    c.translate(0, -r * .22); this.ball(c, 4, r * .86);
  },
  pose: hopPose({ ms: 600, high: .15, flat: .24 }),

  burst(x, y, i, cell) {
    const col = this.inks[i];
    burstOf(9, x, y, a => { const v = cell * (2.6 + Math.random() * 2.4); return { kind: 'square', col: Math.random() < .3 ? '#ffffff' : col, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3.2, life: .42 + Math.random() * .2, size: cell * (.035 + Math.random() * .035), fade: .5 }; });
    bit({ kind: 'ring', x, y, col: '#ffffff', size: cell * .2, grow: cell * 1.5, w: 2, life: .26, a: .8 });
  },
  rise(x, y, i, cell) { bit({ kind: 'ring', x, y, col: tint(this.inks[i], .4), size: cell * .12, grow: cell * 1.1, w: 1.5, life: .28, a: .7, under: true }); },
});
