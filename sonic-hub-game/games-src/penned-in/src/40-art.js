/* ── What the pens draw ──
   Every mark is built from its square's number, so a sheet looks hand-written (no two marks alike) and still comes out
   the same when it is drawn again. One square is U units wide in the board's own coordinates. */
const U = 100, NS = 'http://www.w3.org/2000/svg';
const svg = (name, attrs = {}, kids = []) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); for (const c of kids) e.appendChild(c); return e; };
const f1 = v => Math.round(v * 10) / 10;

/** a small repeatable source of wobble: values in [-1, 1) */
function wobble(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1; };
}

/** an X: two quick strokes, each bowed a little */
function xStrokes(cx, cy, seed) {
  const w = wobble(seed), r = 0.285 * U, j = a => w() * a * U;
  const stroke = (x1, y1, x2, y2) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -(y2 - y1), ny = x2 - x1, bow = w() * 0.055;
    return `M${f1(x1)} ${f1(y1)}Q${f1(mx + nx * bow)} ${f1(my + ny * bow)} ${f1(x2)} ${f1(y2)}`;
  };
  return [
    stroke(cx - r + j(0.035), cy - r + j(0.04), cx + r + j(0.04), cy + r + j(0.035)),
    stroke(cx + r + j(0.035), cy - r + j(0.04), cx - r + j(0.04), cy + r + j(0.035)),
  ];
}

/** an O: one loop from the top, counter-clockwise, running a little past where it began */
function oStroke(cx, cy, seed) {
  const w = wobble(seed + 7919);
  const rx = (0.275 + w() * 0.022) * U, ry = (0.3 + w() * 0.022) * U, tilt = w() * 0.35;
  const start = -Math.PI / 2 + 0.25 + w() * 0.2, sweep = -(Math.PI * 2 + 0.5 + w() * 0.12), steps = 8, shrink = 0.07 + w() * 0.02;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const at = (th, k) => { const s = 1 - shrink * k, x = rx * s * Math.cos(th), y = ry * s * Math.sin(th); return [cx + x * ct - y * st, cy + x * st + y * ct]; };
  const dv = (th, k) => { const s = 1 - shrink * k, x = -rx * s * Math.sin(th), y = ry * s * Math.cos(th); return [x * ct - y * st, x * st + y * ct]; };
  const dth = sweep / steps, a = 4 / 3 * Math.tan(dth / 4);
  let p = at(start, 0), d = `M${f1(p[0])} ${f1(p[1])}`;
  for (let i = 0; i < steps; i++) {
    const t1 = start + dth * i, t2 = t1 + dth, k1 = i / steps, k2 = (i + 1) / steps;
    const v1 = dv(t1, k1), v2 = dv(t2, k2), q = at(t2, k2);
    d += `C${f1(p[0] + a * v1[0])} ${f1(p[1] + a * v1[1])} ${f1(q[0] - a * v2[0])} ${f1(q[1] - a * v2[1])} ${f1(q[0])} ${f1(q[1])}`;
    p = q;
  }
  return [d];
}

const markStrokes = (side, cx, cy, seed) => (side === X ? xStrokes(cx, cy, seed) : oStroke(cx, cy, seed));
function markEl(side, cx, cy, seed) {
  const cls = side === X ? 'mk x' : 'mk o';
  return svg('g', { class: 'm' }, markStrokes(side, cx, cy, seed).map(d => svg('path', { class: cls, d })));
}

/** three passes of a highlighter over one square */
function highlightEl(cx, cy, seed, cls) {
  const w = wobble(seed + 104729), x0 = cx - U / 2, y0 = cy - U / 2, g = svg('g', { class: cls || 'now' });
  for (let i = 0; i < 3; i++) {
    const y = y0 + 21 + i * 29 + w() * 2, l = x0 + 8 + w() * 4, r = x0 + 92 + w() * 4;
    g.appendChild(svg('path', { d: `M${f1(i % 2 ? r : l)} ${f1(y)}L${f1(i % 2 ? l : r)} ${f1(y + w() * 3)}` }));
  }
  return g;
}

/** a rough ring drawn twice around one square: the mark that got penned in */
function scribbleEl(cx, cy, side, seed) {
  const w = wobble(seed + 31337), R = 0.6 * U, turns = 2.15, steps = 26;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const th = -2.2 + (Math.PI * 2 * turns * i) / steps, r = R * (1 + w() * 0.05 + (i / steps) * 0.09);
    const x = cx + r * Math.cos(th) * 1.04, y = cy + r * Math.sin(th) * 0.96;
    d += i === 0 ? `M${f1(x)} ${f1(y)}` : `L${f1(x)} ${f1(y)}`;
  }
  return svg('path', { class: 'scribble ' + (side === X ? 'x' : 'o'), d: smooth(d) });
}
/** a polyline through points turned into a soft curve (quadratics through the midpoints) */
function smooth(poly) {
  const pts = poly.slice(1).split('L').map(p => p.trim().split(' ').map(Number));
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += `Q${pts[i][0]} ${pts[i][1]} ${f1(mx)} ${f1(my)}`; }
  const last = pts[pts.length - 1];
  return d + `L${last[0]} ${last[1]}`;
}

/** the marker itself, held the way a right hand holds it; its tip is at the group's origin */
function penSprite() {
  const body = svg('g', { transform: 'rotate(-52)' }, [
    svg('path', { class: 'dark', d: 'M0 0L24 -8.5L24 8.5Z' }),
    svg('path', { d: 'M24 -10L50 -17L50 17L24 10Z', fill: '#dfe3e8' }),
    svg('rect', { x: 50, y: -21, width: 15, height: 42, rx: 2, fill: '#b4bac3' }),
    svg('rect', { class: 'ink', x: 65, y: -25, width: 178, height: 50, rx: 7 }),
    svg('rect', { x: 71, y: -19, width: 166, height: 7, rx: 3.5, fill: '#fff', opacity: 0.26 }),
    svg('rect', { x: 96, y: -15, width: 104, height: 30, rx: 2.5, fill: '#fffdf6', opacity: 0.94 }),
    svg('rect', { x: 106, y: -4, width: 60, height: 3, fill: '#9aa3ad' }),
    svg('rect', { x: 106, y: 4, width: 38, height: 3, fill: '#c4cad1' }),
    svg('rect', { class: 'dark', x: 243, y: -23, width: 15, height: 46, rx: 6 }),
  ]);
  const shade = svg('g', { transform: 'translate(15 20) rotate(-52)', opacity: 0.16 }, [svg('path', { d: 'M0 0L24 -10L65 -25H250Q258 -25 258 -17V17Q258 25 250 25H65L24 10Z', fill: '#000' })]);
  return svg('g', { class: 'pen-sprite' }, [svg('g', { transform: 'scale(.86)' }, [shade, body])]);
}

/** a small example sheet for the rules: marks as [row, col], optional dots, a highlighted square, an arrow, a ring */
function miniSheet(n, o) {
  const s = svg('svg', { viewBox: `-6 -6 ${n * U + 12} ${n * U + 12}`, 'aria-hidden': 'true' });
  for (let i = 1; i < n; i++) { s.appendChild(svg('line', { class: 'rule', x1: i * U, y1: 0, x2: i * U, y2: n * U })); s.appendChild(svg('line', { class: 'rule', x1: 0, y1: i * U, x2: n * U, y2: i * U })); }
  s.appendChild(svg('rect', { class: 'frame', x: 0, y: 0, width: n * U, height: n * U }));
  const c = ([r, col]) => [col * U + U / 2, r * U + U / 2];
  if (o.hl) { const [x, y] = c(o.hl); s.appendChild(svg('g', { class: 'hl' }, [highlightEl(x, y, 5)])); }
  for (const [side, list] of [[X, o.x || []], [O, o.o || []]]) list.forEach((p, i) => { const [x, y] = c(p); s.appendChild(markEl(side, x, y, p[0] * 31 + p[1] * 7 + i + n)); });
  for (const p of o.dots || []) { const [x, y] = c(p); s.appendChild(svg('circle', { class: 'dot', cx: x, cy: y, r: 9 })); }
  if (o.arrow) {
    const [x1, y1] = c(o.arrow[0]), [x2, y2] = c(o.arrow[1]), a = Math.atan2(y2 - y1, x2 - x1), tx = x2 - Math.cos(a) * 12, ty = y2 - Math.sin(a) * 12;
    const head = [a + 2.5, a - 2.5].map(h => `M${f1(tx)} ${f1(ty)}l${f1(Math.cos(h) * 30)} ${f1(Math.sin(h) * 30)}`).join('');
    s.appendChild(svg('path', { d: `M${f1(x1 + Math.cos(a) * 26)} ${f1(y1 + Math.sin(a) * 26)}L${f1(tx)} ${f1(ty)}${head}`, fill: 'none', stroke: '#5c5a56', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
  if (o.ring) { const [x, y] = c(o.ring[1]); s.appendChild(scribbleEl(x, y, o.ring[0], 3)); }
  return s;
}
