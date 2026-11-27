/* Stained glass, drawn in code. Every picture in the game is cut from pieces of coloured glass, set in lead and lit
   from behind: the cards' pictures, the women's portraits, the landscapes of the lanes and the Rose Window.

   A picture is made on a Pane. Pieces are laid in the order they are given, each cut and leaded on its own as a
   glazier sets them, so a piece laid later sits over the ones before it. Grisaille (the dark paint glaziers fire onto
   glass for eyes, folds, feathers) is painted over the pieces it belongs to, and the light behind comes on last.

   Shapes are polygons, arrays of [x, y]. A body plan works in its own units around a centre (see Pane.frame): one
   unit is a fraction of the picture's height, so a figure keeps its proportions at any size. */

const TAU = Math.PI * 2;
function glassRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashOf(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------------------------------------------------------------- colour */

function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); }
function toHsl(hex) {
  let [r, g, b] = hexRgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
/** lighter (+) or darker (−) by an amount of lightness */
function shade(hex, by) { const [h, s, l] = toHsl(hex); return fromHsl(h, s, l + by); }
/** the same colour turned round the wheel, more or less saturated, lighter or darker */
function tint(hex, dh = 0, ds = 0, dl = 0) { const [h, s, l] = toHsl(hex); return fromHsl(h + dh, s + ds, l + dl); }
function mix(a, b, t) { const p = hexRgb(a), q = hexRgb(b); return rgbHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); }
function rgba(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
/** a colour a little off the one asked, as no two pieces of hand-made glass are quite alike */
function jitter(hex, rand, amount = 1) { return tint(hex, (rand() - 0.5) * 10 * amount, (rand() - 0.5) * 0.08 * amount, (rand() - 0.5) * 0.08 * amount); }

/* ---------------------------------------------------------------- shapes */

const Shape = {
  ellipse(cx, cy, rx, ry, rot = 0, n = 44) {
    const out = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return out;
  },
  /** a closed curve through the points, smoothed (Catmull-Rom) */
  smooth(pts, per = 7, tension = 0.5) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const m1x = (p2[0] - p0[0]) * tension, m1y = (p2[1] - p0[1]) * tension, m2x = (p3[0] - p1[0]) * tension, m2y = (p3[1] - p1[1]) * tension;
        const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, d = t3 - t2;
        out.push([a * p1[0] + b * m1x + c * p2[0] + d * m2x, a * p1[1] + b * m1y + c * p2[1] + d * m2y]);
      }
    }
    return out;
  },
  /** an open curve through the points, smoothed, as a list of points (for painted lines) */
  curve(pts, per = 8) {
    if (pts.length < 3) return pts;
    const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, d = t3 - t2;
        out.push([a * p1[0] + b * (p2[0] - p0[0]) * 0.5 + c * p2[0] + d * (p3[0] - p1[0]) * 0.5, a * p1[1] + b * (p2[1] - p0[1]) * 0.5 + c * p2[1] + d * (p3[1] - p1[1]) * 0.5]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  },
  /** a limb: from one round end to another, each with its own radius */
  capsule(x1, y1, x2, y2, r1, r2 = r1, n = 12) {
    const a = Math.atan2(y2 - y1, x2 - x1), out = [];
    for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + (i / n) * Math.PI; out.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
    for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + (i / n) * Math.PI; out.push([x2 + Math.cos(t) * r2, y2 + Math.sin(t) * r2]); }
    return out;
  },
  rect(x, y, w, h, r = 0) {
    if (!r) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    r = Math.min(r, w / 2, h / 2);
    const out = [], corner = (cx, cy, a0) => { for (let i = 0; i <= 5; i++) { const a = a0 + (i / 5) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
    return out;
  },
  /** a ring's sector, between radii r1 < r2 and angles a0 < a1 (radians, 0 at three o'clock, clockwise on screen) */
  sector(cx, cy, r1, r2, a0, a1, n = 0) {
    n = n || Math.max(3, Math.ceil(((a1 - a0) / TAU) * 64));
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * r2, cy + Math.sin(a) * r2]); }
    if (r1 <= 0) out.push([cx, cy]);
    else for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]); }
    return out;
  },
  /** a pointed star or burst */
  star(cx, cy, r1, r2, points, rot = -Math.PI / 2) {
    const out = [];
    for (let i = 0; i < points * 2; i++) { const a = rot + (i / (points * 2)) * TAU, r = i % 2 ? r2 : r1; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  },
  bbox(poly) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of poly) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  },
  area(poly) { let a = 0; for (let i = 0, n = poly.length; i < n; i++) { const p = poly[i], q = poly[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; },
  centroid(poly) { let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } return [x / poly.length, y / poly.length]; },
  /** the part of a polygon on the left of the line through (px, py) going in direction ang */
  half(poly, px, py, ang) {
    const dx = Math.cos(ang), dy = Math.sin(ang), side = p => (p[0] - px) * dy - (p[1] - py) * dx, out = [];
    for (let i = 0, n = poly.length; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n], sp = side(p), sq = side(q);
      if (sp <= 0) out.push(p);
      if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  },
  /** the polygon cut in two along a line */
  cut(poly, px, py, ang) { return [Shape.half(poly, px, py, ang), Shape.half(poly, px, py, ang + Math.PI)].filter(p => p.length >= 3 && Shape.area(p) > 1); },
  /** the polygon cut into pieces about `size` across, along lines a glazier might choose */
  shatter(poly, rand, size, lean = 0, spread = 1.4) {
    const out = [], todo = [poly];
    while (todo.length) {
      const p = todo.pop(), [x0, y0, x1, y1] = Shape.bbox(p), w = x1 - x0, h = y1 - y0;
      if (Shape.area(p) < size * size * 0.9 || out.length + todo.length > 80) { out.push(p); continue; }
      const across = w > h ? Math.PI / 2 : 0, ang = across + lean + (rand() - 0.5) * spread;
      const [cx, cy] = Shape.centroid(p), parts = Shape.cut(p, cx + (rand() - 0.5) * w * 0.3, cy + (rand() - 0.5) * h * 0.3, ang);
      if (parts.length < 2) { out.push(p); continue; }
      todo.push(...parts);
    }
    return out;
  },
  /** pieces clipped to a convex window */
  clipTo(poly, convex) {
    let out = poly;
    for (let i = 0, n = convex.length; i < n && out.length >= 3; i++) {
      const a = convex[i], b = convex[(i + 1) % n];
      out = Shape.half(out, a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI);
    }
    return out;
  },
  /** a window: a rectangle whose top is a round arch, as most of the game's pictures are shaped */
  arched(x, y, w, h, rise = 0.32) {
    const out = [[x + w, y + h], [x, y + h]], r = w / 2, top = y + w * rise;
    out.push([x, top]);
    for (let i = 1; i < 24; i++) { const a = Math.PI + (i / 24) * Math.PI; out.push([x + r + Math.cos(a) * r, top + Math.sin(a) * (w * rise)]); }
    out.push([x + w, top]);
    return out;
  },
  translate(poly, dx, dy) { return poly.map(([x, y]) => [x + dx, y + dy]); },
};

/* ---------------------------------------------------------------- the glass's own look */

/** Grey tiles that are laid over a piece's colour: the streaks of rolled cathedral glass, the clouding of opalescent
 *  glass, the seeds (bubbles) of hand-blown glass. Made once, the first time a picture is drawn. */
const GLASS_TEX = {};
function glassTextures() {
  if (GLASS_TEX.ready) return GLASS_TEX;
  const S = 256, rand = glassRng(77);
  const lattice = (n) => { const v = []; for (let i = 0; i < n * n; i++) v.push(rand()); return v; };
  const noise = (gx, gy, octaves) => {
    const grids = []; for (let o = 0; o < octaves; o++) grids.push(lattice(4 << o));
    return (x, y) => {
      let sum = 0, amp = 1, norm = 0;
      for (let o = 0; o < octaves; o++) {
        const n = 4 << o, fx = (x / S) * n * gx % n, fy = (y / S) * n * gy % n, ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), g = grids[o];
        const at = (i, j) => g[((j % n) * n) + (i % n)];
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        sum += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy); norm += amp; amp *= 0.55;
      }
      return sum / norm;
    };
  };
  const tile = (fn) => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = Math.max(0, Math.min(255, Math.round(fn(x, y)))), i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  const streak = noise(1, 1, 4), streak2 = noise(1, 1, 3), mottle = noise(1, 1, 5);
  GLASS_TEX.streak = tile((x, y) => 128 + (streak(x * 0.25, y * 2.2) - 0.5) * 210 + (streak2(x, y) - 0.5) * 40);
  GLASS_TEX.mottle = tile((x, y) => 128 + (mottle(x, y) - 0.5) * 200);
  GLASS_TEX.ripple = tile((x, y) => 128 + Math.sin((y / S) * TAU * 9 + (streak(x, y) - 0.5) * 7) * 44 + (mottle(x, y) - 0.5) * 70);
  const seeds = []; for (let i = 0; i < 70; i++) seeds.push([rand() * S, rand() * S, 0.6 + rand() * 2.2]);
  GLASS_TEX.seedy = tile((x, y) => {
    let v = 128 + (mottle(x, y) - 0.5) * 60;
    for (const [sx, sy, r] of seeds) { const dx = Math.min(Math.abs(x - sx), S - Math.abs(x - sx)), dy = Math.min(Math.abs(y - sy), S - Math.abs(y - sy)), d = Math.hypot(dx, dy); if (d < r) v += 90 * (1 - d / r); else if (d < r + 1) v -= 30; }
    return v;
  });
  GLASS_TEX.ready = true;
  return GLASS_TEX;
}

const LEAD = '#2b2830';

/* ---------------------------------------------------------------- a pane being glazed */

class Pane {
  /** w, h in pixels; seed: the same seed always makes the same picture */
  constructor(w, h, seed = 1) {
    glassTextures();
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = Math.round(w); this.canvas.height = Math.round(h);
    this.g = this.canvas.getContext('2d');
    this.rand = glassRng(seed);
    this.leadW = Math.max(1.4, h / 105);       // the lead between pieces, in pixels
    this.leadColor = LEAD;
    this.leadShine = 'rgba(255,250,235,0.22)';
    this.frame(w / 2, h / 2, h / 2);
    this.flipX = false;
  }
  /** where a body plan's units are: (cx, cy) is its 0, 0 and one unit is s pixels */
  frame(cx, cy, s) { this.cx = cx; this.cy = cy; this.s = s; return this; }
  /** draws fn with its units centred on (x, y) of these, k times as large */
  at(x, y, k, fn) { const { cx, cy, s } = this; this.frame(this.X(x), this.Y(y), s * k); try { fn(); } finally { this.frame(cx, cy, s); } }
  X(x) { return this.cx + (this.flipX ? -x : x) * this.s; }
  Y(y) { return this.cy + y * this.s; }
  /** a polygon given in units, in pixels */
  map(poly) { return poly.map(([x, y]) => [this.X(x), this.Y(y)]); }
  /* the shapes, in units */
  E(x, y, rx, ry = rx, rot = 0, n = 44) { return this.map(Shape.ellipse(x, y, rx, ry, this.flipX ? -rot : rot, n)); }
  P(pts) { return this.map(pts); }
  S(pts, per = 7) { return this.map(Shape.smooth(pts, per)); }
  C(x1, y1, x2, y2, r1, r2 = r1) { return this.map(Shape.capsule(x1, y1, x2, y2, r1, r2)); }
  R(x, y, w, h, r = 0) { return this.map(Shape.rect(x, y, w, h, r)); }
  /** a sector of a ring, in units, angles in degrees with 0 straight up and going clockwise */
  A(x, y, r1, r2, d0, d1) {
    if (this.flipX) [d0, d1] = [-d1, -d0];
    const k = Math.PI / 180;
    return Shape.sector(this.X(x), this.Y(y), r1 * this.s, r2 * this.s, (d0 - 90) * k, (d1 - 90) * k);
  }
  path(poly) { const g = this.g; g.beginPath(); g.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]); g.closePath(); }

  /** one piece of glass, cut to the polygon (in pixels), set in lead.
   *  o: { tex: 'streak' | 'mottle' | 'ripple' | 'seedy', texAlpha, light: angle the light comes from, lead: false for
   *  none, leadW, edge: how dark the fired edge is, flat: no shading, glow: a little light from within } */
  glass(poly, color, o = {}) {
    if (!poly || poly.length < 3) return;
    const g = this.g, r = this.rand, [x0, y0, x1, y1] = Shape.bbox(poly), w = x1 - x0, h = y1 - y0;
    if (w < 0.5 || h < 0.5) return;
    g.save();
    this.path(poly); g.clip();
    if (o.alpha !== undefined) g.globalAlpha = o.alpha;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.max(4, Math.hypot(w, h) / 2);
    if (o.flat) g.fillStyle = color;
    else {
      const ang = o.light !== undefined ? o.light : -2.25 + (r() - 0.5) * 0.7;
      const lg = g.createLinearGradient(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, cx - Math.cos(ang) * rad, cy - Math.sin(ang) * rad);
      lg.addColorStop(0, shade(color, o.rise !== undefined ? o.rise : 0.13)); lg.addColorStop(0.5, color); lg.addColorStop(1, shade(color, o.fall !== undefined ? -o.fall : -0.15));
      g.fillStyle = lg;
    }
    g.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
    const tex = GLASS_TEX[o.tex || ['streak', 'mottle', 'ripple', 'streak', 'seedy'][Math.floor(r() * 5)]];
    if (o.texAlpha !== 0) {
      const pat = g.createPattern(tex, 'repeat');
      if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(x0 + r() * 256, y0 + r() * 256).rotate((o.grain !== undefined ? o.grain : (r() - 0.5) * 50)).scale(Math.max(0.35, this.h / 520) * (0.8 + r() * 0.5)));
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = (o.texAlpha !== undefined ? o.texAlpha : 0.62) * (o.alpha !== undefined ? o.alpha : 1);
      g.fillStyle = pat; g.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
      g.globalAlpha = o.alpha !== undefined ? o.alpha : 1; g.globalCompositeOperation = 'source-over';
    }
    if (o.glow) {
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      rg.addColorStop(0, rgba('#fffbe8', o.glow)); rg.addColorStop(1, rgba('#fffbe8', 0));
      g.fillStyle = rg; g.fillRect(x0, y0, w, h);
    }
    const edge = o.edge !== undefined ? o.edge : 0.26;
    if (edge > 0) {   // the edges of a piece fire darker: drawn inside it along the lead
      g.strokeStyle = rgba('#1a1420', edge); g.lineWidth = Math.min(w, h, this.leadW * 5.5); g.lineJoin = 'round';
      this.path(poly); g.stroke();
    }
    g.restore();
    if (o.lead !== false) this.lead(poly, o.leadW);
  }
  /** the lead came around a piece */
  lead(poly, w = this.leadW) {
    const g = this.g;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    this.path(poly); g.strokeStyle = this.leadColor; g.lineWidth = w; g.stroke();
    g.translate(-w * 0.14, -w * 0.16); this.path(poly); g.strokeStyle = this.leadShine; g.lineWidth = w * 0.26; g.stroke();
    g.restore();
  }
  /** a line of lead on its own, through points in pixels (a stem, a whisker set in lead) */
  leadLine(pts, w = this.leadW) {
    const g = this.g;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.strokeStyle = this.leadColor; g.lineWidth = w; g.stroke();
    g.restore();
  }
  /** a piece cut into smaller ones of nearby colours, as a large area of a window always is */
  pieces(poly, color, size, o = {}) {
    const parts = Shape.shatter(poly, this.rand, size, o.lean || 0, o.spread);
    for (const p of parts) this.glass(p, o.same ? color : jitter(color, this.rand, o.vary !== undefined ? o.vary : 1), o);
    return parts;
  }

  /* ---- grisaille: paint fired onto the glass */
  /** a painted line through points in units; w in units */
  stroke(pts, w, color = '#2a1d1a', alpha = 0.85, smooth = true) {
    const g = this.g, P = this.map(smooth ? Shape.curve(pts) : pts);
    g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(0.6, w * this.s);
    g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
    g.restore();
  }
  /** a painted shape, in units (already a polygon from E/S/P/C) */
  fill(poly, color = '#2a1d1a', alpha = 0.85) { const g = this.g; g.save(); g.globalAlpha = alpha; g.fillStyle = color; this.path(poly); g.fill(); g.restore(); }
  dot(x, y, r, color = '#2a1d1a', alpha = 0.9) { this.fill(this.E(x, y, r, r, 0, 16), color, alpha); }
  /** a soft shading painted inside a piece, darkest at (x, y): the matting a glass painter brushes on */
  matte(poly, x, y, r, alpha = 0.35, color = '#2a1d1a') {
    const g = this.g; g.save(); this.path(poly); g.clip();
    const X = this.X(x), Y = this.Y(y), rg = g.createRadialGradient(X, Y, 0, X, Y, r * this.s);
    rg.addColorStop(0, rgba(color, alpha)); rg.addColorStop(1, rgba(color, 0)); g.fillStyle = rg; g.fillRect(0, 0, this.w, this.h);
    g.restore();
  }
  /** an eye in grisaille: a white of glass is not needed, a dark almond with a glint reads at any size */
  eye(x, y, r, o = {}) {
    const look = o.look || 0;
    if (o.white) { this.glass(this.E(x, y, r * 1.35, r * (o.tall || 1.1)), o.white, { tex: 'mottle', texAlpha: 0.25, leadW: this.leadW * 0.7 }); }
    this.dot(x + look * r * 0.3, y, r * (o.white ? 0.62 : 1), o.color || '#22171a', 0.95);
    this.dot(x + look * r * 0.3 - r * 0.28, y - r * 0.32, r * 0.26, '#fff8ec', 0.9);
    if (o.lid) this.stroke([[x - r * 1.4, y - r * 0.6], [x, y - r * 1.25], [x + r * 1.4, y - r * 0.6]], r * 0.34, '#22171a', 0.85);
  }

  /** the light behind the window: a warm glow where the light is, the edges in shade */
  lightUp(o = {}) {
    const g = this.g, W = this.w, H = this.h, lx = (o.x !== undefined ? o.x : 0.42) * W, ly = (o.y !== undefined ? o.y : 0.32) * H;
    g.save();
    const rg = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * (o.reach || 0.8));
    rg.addColorStop(0, rgba(o.color || '#fff4d6', o.strength !== undefined ? o.strength : 0.55)); rg.addColorStop(0.55, rgba(o.color || '#fff4d6', (o.strength || 0.55) * 0.25)); rg.addColorStop(1, rgba(o.color || '#fff4d6', 0));
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply';
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, rgba('#5a4a58', 1 - (o.vignette !== undefined ? o.vignette : 0.32)));
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.restore();
  }
}
