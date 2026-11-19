/* ── Paint: the hand in the pictures ──
   Everything on the page that looks painted is painted here, on canvases, when the page opens: the sky, the board,
   the moons. Nothing is a photograph and nothing is fetched. A picture is built the way gouache goes on: a flat
   wash, broad strokes of nearly the same colour over it, a little grain, and lines put in by a hand that is not
   quite steady. The random numbers come from a seed, so the same picture is painted every time. */
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t, clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t), smooth = t => t * t * (3 - 2 * t);
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
/** a colour between two, as css; a: how opaque */
function tone(c1, c2, t, a = 1) {
  const p = rgb(c1), q = rgb(c2);
  return `rgba(${Math.round(lerp(p[0], q[0], t))},${Math.round(lerp(p[1], q[1], t))},${Math.round(lerp(p[2], q[2], t))},${a})`;
}
const ink = (hex, a = 1) => { const p = rgb(hex); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
/* a browser a few years old draws no rounded rectangle: there the board's corners come out square */
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/** Soft noise that repeats at its edges: size × size numbers from 0 to 1. cells: how many lumps across at the
 *  coarsest; octaves: finer lumps laid over them; sx: how much longer than tall the lumps are. */
function noiseField(size, cells, octaves, seed, sx = 1) {
  const out = new Float32Array(size * size); let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const nx = Math.max(1, Math.round(cells / sx)), ny = cells, rand = rngOf(seed + o * 101), grid = new Float32Array(nx * ny);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let y = 0; y < size; y++) {
      const fy = y / size * ny, y0 = Math.floor(fy), ty = smooth(fy - y0), ya = (y0 % ny) * nx, yb = ((y0 + 1) % ny) * nx;
      for (let x = 0; x < size; x++) {
        const fx = x / size * nx, x0 = Math.floor(fx), tx = smooth(fx - x0), xa = x0 % nx, xb = (x0 + 1) % nx;
        out[y * size + x] += amp * lerp(lerp(grid[ya + xa], grid[ya + xb], tx), lerp(grid[yb + xa], grid[yb + xb], tx), ty);
      }
    }
    total += amp; amp *= 0.5; cells *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
/** A field as a grey picture to lay over paint (overlay, soft-light, multiply). contrast: how far from mid grey. */
function greyTile(field, size, contrast = 1) {
  const c = canvasOf(size, size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let i = 0; i < field.length; i++) { const v = Math.round(clamp01(0.5 + (field[i] - 0.5) * contrast) * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}
/** the three textures everything is finished with: made once, the first time one is wanted */
const TEX = {
  made: null,
  get() {
    if (this.made) return this.made;
    const grain = noiseField(128, 48, 2, 11), rand = rngOf(5);
    for (let i = 0; i < grain.length; i++) grain[i] = clamp01(grain[i] * 0.55 + rand() * 0.45);   // tooth of the paper
    this.made = {
      grain: greyTile(grain, 128, 1.1),
      mottle: greyTile(noiseField(256, 3, 5, 23), 256, 2.1),                                     // where the wash pooled
      streak: greyTile(noiseField(256, 40, 3, 37, 14), 256, 2.4),                                // the drag of the brush
    };
    return this.made;
  },
};
/** Lays a texture over whatever the context is clipped to. scale: how big its lumps come out; angle: which way
 *  the brush went; mode and alpha: how it mixes with what is there. */
function texture(g, name, x, y, w, h, { alpha = 0.3, mode = 'soft-light', scale = 1, angle = 0, shift = 0 } = {}) {
  const p = g.createPattern(TEX.get()[name], 'repeat');
  p.setTransform(new DOMMatrix().translateSelf(shift * 37, shift * 61).rotateSelf(angle * 180 / Math.PI).scaleSelf(scale, scale));
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = mode; g.fillStyle = p; g.fillRect(x, y, w, h); g.restore();
}

/** A line drawn by hand from one point to another: it wanders a little and swells and thins as it goes.
 *  width: how thick in the middle of its range; wander: how far off the ruler it strays; sway: how much the width changes. */
function handLine(g, x1, y1, x2, y2, color, width, rand, { wander = 0.6, sway = 0.35, step = 14 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / step)), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const left = [], right = []; let off = (rand() - 0.5) * wander, wide = width * (1 + (rand() - 0.5) * sway);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x1, x2, t), y = lerp(y1, y2, t);
    off = off * 0.72 + (rand() - 0.5) * wander * 0.9; wide = wide * 0.7 + width * (1 + (rand() - 0.5) * sway * 2) * 0.3;
    const ease = Math.min(1, Math.min(t, 1 - t) * n * 0.9 + 0.35);                      // a line starts and ends lightly
    left.push([x + nx * (off + wide * ease / 2), y + ny * (off + wide * ease / 2)]); right.push([x + nx * (off - wide * ease / 2), y + ny * (off - wide * ease / 2)]);
  }
  g.beginPath(); g.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i <= n; i++) g.lineTo(left[i][0], left[i][1]);
  for (let i = n; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath(); g.fillStyle = color; g.fill();
}
/** A circle drawn by hand: its radius breathes a little on the way round. Leaves the path open for fill or stroke. */
function handCircle(g, cx, cy, r, rand, wobble = 0.012) {
  const n = Math.max(24, Math.round(r * 0.9)), k1 = 1 + Math.floor(rand() * 2), k2 = 3 + Math.floor(rand() * 2), p1 = rand() * TAU, p2 = rand() * TAU;
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, rr = r * (1 + wobble * (Math.sin(a * k1 + p1) * 0.6 + Math.sin(a * k2 + p2) * 0.4));
    if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}
/** A star of four points, the long way up and down: the kind an old chart marks its bright stars with. */
function starPath(g, x, y, r, waist = 0.16, squash = 0.72) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * waist : i % 4 === 0 ? r : r * squash;
    if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}
/** Broad strokes of nearly the same colour laid over a wash, all one way: what makes a flat colour look painted.
 *  pick(t): the colour for a stroke at height t (0 top, 1 bottom) as [hexA, hexB, mix]. */
function brushOver(g, x, y, w, h, rand, { count = 60, tall = 0.06, alpha = 0.1, pick, slant = 0 }) {
  for (let i = 0; i < count; i++) {
    const t = rand(), cy = y + t * h, th = h * tall * (0.4 + rand()), cx = x + rand() * w, tw = w * (0.25 + rand() * 0.6), c = pick(clamp01(t + (rand() - 0.5) * 0.08));
    g.save(); g.translate(cx, cy); g.rotate(slant + (rand() - 0.5) * 0.05);
    const grad = g.createLinearGradient(-tw / 2, 0, tw / 2, 0), col = tone(c[0], c[1], c[2], 1);
    grad.addColorStop(0, tone(c[0], c[1], c[2], 0)); grad.addColorStop(0.2 + rand() * 0.2, col); grad.addColorStop(0.6 + rand() * 0.2, col); grad.addColorStop(1, tone(c[0], c[1], c[2], 0));
    g.globalAlpha = alpha * (0.5 + rand()); g.fillStyle = grad;
    g.beginPath(); g.ellipse(0, 0, tw / 2, th / 2, 0, 0, TAU); g.fill();
    g.restore();
  }
}
