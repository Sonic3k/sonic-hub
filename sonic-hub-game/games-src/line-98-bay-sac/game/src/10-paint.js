/* ── the paintbox: what every place and the map are painted with ── */

/** a sheet to paint on that is not on the page: [canvas, its context] */
function sheet(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return [c, c.getContext('2d')];
}
/** makes a canvas on the page as large as its box, in the screen's own dots; returns [context, width, height] in CSS pixels */
function fit(canvas, dpr) {
  const r = canvas.getBoundingClientRect(), d = dpr || DPR(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (canvas.width !== Math.round(w * d) || canvas.height !== Math.round(h * d)) { canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
  const c = canvas.getContext('2d');
  c.setTransform(d, 0, 0, d, 0, 0);
  return [c, w, h];
}

/* paths */
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function disc(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function oval(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
/** a star of n points; inner is how far in the notches go, as a share of r */
function star(c, x, y, r, n, inner, rot) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (rot || 0) + i * Math.PI / n - Math.PI / 2, q = i % 2 ? r * inner : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath();
}
/** a closed shape with a soft, uneven edge: a pebble, a pond, a patch of colour */
function blob(c, x, y, r, rnd, wob, n) {
  n = n || 9; const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, q = r * (1 + (rnd() - .5) * 2 * (wob == null ? .18 : wob)); pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  smooth(c, pts, true);
}
/** a smooth line through points (closed: back to the first) */
function smooth(c, pts, closed) {
  const n = pts.length; c.beginPath();
  if (closed) {
    const m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2], s = m(n - 1);
    c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const q = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
    c.closePath();
  } else {
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    c.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
/** a line as a hand draws it: not quite straight, not quite even */
function handLine(c, x1, y1, x2, y2, rnd, amp, steps) {
  steps = steps || Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 26)); const pts = [];
  const nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= steps; i++) { const t = i / steps, o = (i === 0 || i === steps ? .4 : 1) * (rnd() - .5) * 2 * amp; pts.push([lerp(x1, x2, t) + nx / len * o, lerp(y1, y2, t) + ny / len * o]); }
  smooth(c, pts, false);
}

/* fills */
function radial(c, x, y, r0, r1, stops, fx, fy) {
  const g = c.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, r0, x, y, r1);
  for (const [at, col] of stops) g.addColorStop(at, col);
  return g;
}
function linear(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [at, col] of stops) g.addColorStop(at, col);
  return g;
}
/** a soft round glow of one colour, fading to nothing */
function glowAt(c, x, y, r, col, a) {
  c.save(); c.globalAlpha = a == null ? 1 : a;
  c.fillStyle = radial(c, x, y, 0, r, [[0, alpha(col, 1)], [.35, alpha(col, .5)], [1, alpha(col, 0)]]);
  c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
/** a four-pointed twinkle */
function twinkle(c, x, y, r, col, a) {
  c.save(); c.globalAlpha = a == null ? 1 : a; c.fillStyle = col || '#fff'; c.beginPath();
  const k = r * .16;
  c.moveTo(x, y - r); c.quadraticCurveTo(x + k, y - k, x + r, y); c.quadraticCurveTo(x + k, y + k, x, y + r); c.quadraticCurveTo(x - k, y + k, x - r, y); c.quadraticCurveTo(x - k, y - k, x, y - r);
  c.fill(); c.restore();
}

/* ── texture: grain like gouache on paper, and soft uneven tone like clouds ── */
const GRAIN = (() => {
  const size = 192, [cv, c] = sheet(size, size), im = c.createImageData(size, size), r = rng(98);
  for (let i = 0; i < size * size; i++) { const v = r() < .5 ? 0 : 255, a = Math.pow(r(), 2.2) * 110; im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = a; }
  c.putImageData(im, 0, 0);
  return cv;
})();
/** lays grain over a part of a painting. amount: 0..1, how strongly; clip to a path first if it is not to go everywhere */
function grain(c, x, y, w, h, amount, scale) {
  c.save();
  c.globalAlpha = amount; c.globalCompositeOperation = 'overlay';
  const p = c.createPattern(GRAIN, 'repeat'), s = scale || 1;
  if (p.setTransform) p.setTransform(new DOMMatrix().scale(s, s));
  c.fillStyle = p; c.fillRect(x, y, w, h);
  c.restore();
}
/** A small picture of soft, uneven tone (several sizes of smooth noise laid together), to be stretched over
 *  something: mottled cement, a nebula, water that is not all one colour. Values 0..1 go from see-through to `col`.
 *  wrap: it can be laid side by side with itself without a seam. */
function clouds(size, seed, col, octaves, gain, contrast, wrap) {
  const [cv, c] = sheet(size, size), im = c.createImageData(size, size), p = rgb(col), r = rng(seed);
  const layers = [];
  for (let o = 0, cells = 4; o < (octaves || 4); o++, cells *= 2) {
    const g = new Float32Array((cells + 1) * (cells + 1));
    for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) g[j * (cells + 1) + i] = wrap && (i === cells || j === cells) ? g[(j % cells) * (cells + 1) + (i % cells)] : r();
    layers.push([cells, g]);
  }
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 1, sum = 0;
    for (const [cells, g] of layers) {
      const fx = x / size * cells, fy = y / size * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy), w = cells + 1;
      v += amp * lerp(lerp(g[iy * w + ix], g[iy * w + ix + 1], tx), lerp(g[(iy + 1) * w + ix], g[(iy + 1) * w + ix + 1], tx), ty);
      sum += amp; amp *= gain || .5;
    }
    v = clamp((v / sum - .5) * (contrast || 1.6) + .5, 0, 1);
    const k = (y * size + x) * 4; im.data[k] = p[0]; im.data[k + 1] = p[1]; im.data[k + 2] = p[2]; im.data[k + 3] = v * 255;
  }
  c.putImageData(im, 0, 0);
  return cv;
}
/** stretches such a picture over a rectangle, in whatever way of laying colour on colour is asked for */
function wash(c, tex, x, y, w, h, a, mode) {
  c.save(); c.globalAlpha = a == null ? 1 : a; if (mode) c.globalCompositeOperation = mode;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(tex, x, y, w, h); c.restore();
}

/** A round thing lit from the upper left: body colour, a darker side away from the light, and (gloss > 0) a bright
 *  spot where the light strikes. Most of the places' balls start from this. */
function sphere(c, r, col, o) {
  o = o || {};
  const lx = -r * .34, ly = -r * .4;
  c.fillStyle = radial(c, 0, 0, r * .05, r * 1.12, [[0, tint(col, o.core == null ? .34 : o.core)], [.48, col], [.86, shade(col, o.dark == null ? .42 : o.dark)], [1, shade(col, (o.dark == null ? .42 : o.dark) + .16)]], lx, ly);
  disc(c, 0, 0, r); c.fill();
  if (o.rim) {                                   // light coming back up from the ground, along the lower edge
    c.save(); disc(c, 0, 0, r); c.clip();
    c.fillStyle = radial(c, r * .25, r * .62, 0, r * .95, [[0, alpha(tint(col, .55), o.rim)], [1, alpha(col, 0)]]);
    c.fillRect(-r, -r, r * 2, r * 2); c.restore();
  }
  if (o.gloss) {
    c.save(); c.globalAlpha = o.gloss;
    c.fillStyle = radial(c, lx, ly, 0, r * .46, [[0, 'rgba(255,255,255,.95)'], [.4, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(-r, -r, r * 2, r * 2);
    c.fillStyle = 'rgba(255,255,255,.95)'; oval(c, lx * 1.02, ly * 1.02, r * .15, r * .095, -.6); c.fill();
    c.restore();
  }
}

/* the marks that can be put on the balls, one to a colour, for eyes that find colours hard to tell apart */
function mark(c, i, r) {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = 'rgba(255,255,255,.94)'; c.strokeStyle = 'rgba(20,16,40,.55)'; c.lineWidth = Math.max(1, r * .09);
  const q = r * .44;
  if (i === 0) disc(c, 0, 0, q * .78);
  else if (i === 1) { c.beginPath(); c.moveTo(0, -q); c.lineTo(q * .95, q * .72); c.lineTo(-q * .95, q * .72); c.closePath(); }
  else if (i === 2) rr(c, -q * .78, -q * .78, q * 1.56, q * 1.56, q * .16);
  else if (i === 3) { c.beginPath(); c.moveTo(0, -q * 1.08); c.lineTo(q * .86, 0); c.lineTo(0, q * 1.08); c.lineTo(-q * .86, 0); c.closePath(); }
  else if (i === 4) star(c, 0, 0, q * 1.12, 5, .46);
  else if (i === 5) { const a = q * .36; c.beginPath(); c.moveTo(-a, -q); c.lineTo(a, -q); c.lineTo(a, -a); c.lineTo(q, -a); c.lineTo(q, a); c.lineTo(a, a); c.lineTo(a, q); c.lineTo(-a, q); c.lineTo(-a, a); c.lineTo(-q, a); c.lineTo(-q, -a); c.lineTo(-a, -a); c.closePath(); }
  else { c.beginPath(); c.moveTo(0, q * .95); c.bezierCurveTo(-q * 1.5, -q * .1, -q * .7, -q * 1.25, 0, -q * .45); c.bezierCurveTo(q * .7, -q * 1.25, q * 1.5, -q * .1, 0, q * .95); c.closePath(); }
  c.stroke(); c.fill(); c.restore();
}
