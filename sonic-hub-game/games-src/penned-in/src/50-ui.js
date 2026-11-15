/* ── The sheet on screen ── */
const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const PAD = 8;

/** what is drawn right now: the sheet's size, its layers, and each square's mark */
const V = { n: 0, L: null, marks: new Map(), seed: 1 };
const center = cell => [(cell % V.n) * U + U / 2, Math.floor(cell / V.n) * U + U / 2];

function buildBoard(n) {
  const b = $('#board');
  V.n = n; V.marks = new Map(); V.seed = 1 + Math.floor(Math.random() * 9000);
  b.classList.remove('fade-out', 'mine');
  b.setAttribute('viewBox', `${-PAD} ${-PAD} ${n * U + PAD * 2} ${n * U + PAD * 2}`);
  const grid = svg('g');
  for (let i = 1; i < n; i++) {
    grid.appendChild(svg('line', { class: 'rule', x1: i * U, y1: 0, x2: i * U, y2: n * U }));
    grid.appendChild(svg('line', { class: 'rule', x1: 0, y1: i * U, x2: n * U, y2: i * U }));
  }
  grid.appendChild(svg('rect', { class: 'frame', x: 0, y: 0, width: n * U, height: n * U }));
  V.L = { hl: svg('g', { class: 'hl' }), marks: svg('g'), hints: svg('g', { class: 'hints' }), ghost: svg('g', { class: 'ghost' }), over: svg('g'), pen: penSprite() };
  b.replaceChildren(grid, V.L.hl, V.L.marks, V.L.hints, V.L.ghost, V.L.over, V.L.pen);
  $('#imprint').textContent = `Penned In · ${n} × ${n}`;
}

/** what is printed on the cutting mat: a frame, numbers along the left and bottom edges, two angle guides */
function drawMat() {
  const m = $('#mat');
  m.setAttribute('height', 0);   // measured without the mat's own last size, or it could never shrink
  const w = document.documentElement.clientWidth, h = Math.max(window.innerHeight, document.body.scrollHeight);
  m.setAttribute('width', w); m.setAttribute('height', h); m.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const label = (x, y, t, anchor) => { const e = svg('text', { x, y, 'text-anchor': anchor || 'start' }); e.textContent = t; return e; };
  const kids = [svg('rect', { x: 8.5, y: 8.5, width: w - 17, height: h - 17, rx: 14 })];
  for (let x = 149; x < w - 40; x += 150) kids.push(label(x + 6, h - 16, String(Math.round(x / 30))));
  for (let y = h - 151; y > 70; y -= 150) kids.push(label(16, y - 6, String(Math.round((h - y) / 30))));
  for (const [deg, at] of [[45, 64], [60, 100]]) {
    const a = (deg * Math.PI) / 180, len = Math.min((w - 20) / Math.cos(a), (h - 20) / Math.sin(a));
    kids.push(svg('line', { x1: 9, y1: h - 9, x2: f1(9 + Math.cos(a) * len), y2: f1(h - 9 - Math.sin(a) * len) }));
    kids.push(label(f1(9 + Math.cos(a) * at + 7), f1(h - 9 - Math.sin(a) * at + 4), deg + '°'));
  }
  m.replaceChildren(...kids);
}

/** a mark put on the sheet at once, already dry */
function putMark(side, cell) {
  const [x, y] = center(cell), g = markEl(side, x, y, V.seed + cell * 13 + side);
  V.L.marks.appendChild(g); V.marks.set(cell, g);
  return g;
}

/** A mark written stroke by stroke, the marker following its tip. Resolves when the pen lifts. */
function drawMark(side, cell, quiet) {
  const g = putMark(side, cell);
  if (REDUCED) return Promise.resolve();
  const paths = [...g.querySelectorAll('path')], pen = V.L.pen, durs = side === X ? [115, 115] : [290];
  for (const p of paths) { p._len = p.getTotalLength(); p.style.strokeDasharray = p._len; p.style.strokeDashoffset = p._len; }
  return new Promise(resolve => {
    let i = 0, t0 = null;
    const begin = () => { if (!quiet) SFX.play(side === X ? 'stroke' : 'loop'); requestAnimationFrame(frame); };
    const frame = t => {
      if (t0 === null) t0 = t;
      const p = paths[i], k = Math.min(1, (t - t0) / durs[i]), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      p.style.strokeDashoffset = p._len * (1 - e);
      const pt = p.getPointAtLength(p._len * e);
      pen.setAttribute('transform', `translate(${f1(pt.x)} ${f1(pt.y)})`);
      if (k < 1) return requestAnimationFrame(frame);
      p.style.strokeDasharray = ''; p.style.strokeDashoffset = '';
      if (++i < paths.length) { t0 = null; return setTimeout(begin, 55); }
      pen.setAttribute('class', 'pen-sprite ' + (side === X ? 'x' : 'o'));
      resolve();
    };
    const first = paths[0].getPointAtLength(0);
    pen.setAttribute('transform', `translate(${f1(first.x)} ${f1(first.y)})`);
    pen.setAttribute('class', 'pen-sprite on ' + (side === X ? 'x' : 'o'));
    setTimeout(begin, 70);
  });
}

function eraseMark(cell) {
  const g = V.marks.get(cell);
  if (!g) return;
  V.marks.delete(cell); g.classList.add('gone'); setTimeout(() => g.remove(), 260);
}

/** Yellow highlighter under the last mark of the side to move, a faint wash of its own colour under the other side's
 *  (on a full sheet that mark is hard to find, and it is where the rival writes from), pencil dots where the mover may write. */
function showTurn(S, dots) {
  V.L.ghost.replaceChildren();
  if (S.over) { V.L.hl.replaceChildren(); V.L.hints.replaceChildren(); return; }
  const h = S.head[S.turn], [x, y] = center(h), other = 1 - S.turn, h2 = S.head[other], [x2, y2] = center(h2);
  V.L.hl.replaceChildren(highlightEl(x2, y2, V.seed + h2, 'rest ' + (other === X ? 'x' : 'o')), highlightEl(x, y, V.seed + h));
  V.L.hints.replaceChildren(...(dots ? legalMoves(S).map(c => { const [cx, cy] = center(c); return svg('circle', { class: 'dot', cx, cy, r: 7 }); }) : []));
}

/** the mark about to be written, faint, with a pencil line from the last mark so the direction shows around a fingertip */
function showGhost(side, cell, from, line) {
  const [x, y] = center(cell), kids = [markEl(side, x, y, V.seed + cell * 13 + side)];
  if (line) {
    const [fx, fy] = center(from), a = Math.atan2(y - fy, x - fx);
    kids.push(svg('path', { class: 'aim', d: `M${f1(fx + Math.cos(a) * 44)} ${f1(fy + Math.sin(a) * 44)}L${f1(fx + Math.cos(a) * U * 2.3)} ${f1(fy + Math.sin(a) * U * 2.3)}` }));
  }
  V.L.ghost.replaceChildren(...kids);
}
const clearGhost = () => V.L && V.L.ghost.replaceChildren();

function nudge() {
  const h = V.L.hints;
  h.classList.remove('flash'); void h.getBoundingClientRect(); h.classList.add('flash');
}

/** the loser's last mark, ringed in the winner's colour */
function circleLoser(S, quiet) {
  const { winner, loser } = S.over, cell = S.head[loser], [x, y] = center(cell);
  const ring = scribbleEl(x, y, winner, V.seed + cell);
  ring.setAttribute('pathLength', '1'); ring.classList.add('live');
  V.L.hl.replaceChildren(); V.L.hints.replaceChildren(); V.L.over.replaceChildren(ring);
  if (!quiet) SFX.play('circle');
}

/** which square a pointer means: a mouse means the square it is on; a finger means the nearest square it may write in */
function squareAt(ev, legal) {
  const b = $('#board'), r = b.getBoundingClientRect(), vb = b.viewBox.baseVal;
  const x = vb.x + ((ev.clientX - r.left) / r.width) * vb.width, y = vb.y + ((ev.clientY - r.top) / r.height) * vb.height;
  if (ev.pointerType === 'mouse') {
    const c = Math.floor(x / U), row = Math.floor(y / U);
    if (c < 0 || row < 0 || c >= V.n || row >= V.n) return -1;
    return legal.includes(row * V.n + c) ? row * V.n + c : -1;
  }
  let best = -1, bd = 1.45 * U;
  for (const c of legal) { const [cx, cy] = center(c), d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; best = c; } }
  return best;
}

const penHtml = (side, who, on, busy) => `<div class="pen ${side === X ? 'x' : 'o'}${on ? ' on' : ''}${busy ? ' busy' : ''}"><i class="nib"></i><i class="neck"></i><div class="barrel"><span class="lab"><b>${MARK[side]}</b><em>${who}</em></span></div><i class="cap"></i></div>`;

function buildHelp() {
  const steps = [
    [miniSheet(4, { x: [[0, 0]], o: [[3, 3]] }), '<b>X</b> starts in the top-left corner and writes first. <b>O</b> starts in the bottom-right.'],
    [miniSheet(4, { x: [[0, 0], [1, 1]], o: [[3, 3], [3, 2]], hl: [1, 1], dots: [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]] }), 'On your turn, write your mark in an empty square <b>touching your own last mark</b>: any of the 8 around it.'],
    [miniSheet(4, { x: [[0, 3], [1, 2]], o: [[3, 3], [2, 2], [1, 1]], hl: [1, 2], arrow: [[1, 2], [2, 1]] }), 'Marks never come off, and they are in the way for both of you. But you can <b>slip diagonally</b> between two marks that touch only at a corner.'],
    [miniSheet(4, { x: [[1, 1], [0, 1], [0, 0]], o: [[3, 2], [2, 1], [1, 0]], ring: [O, [0, 0]] }), 'Your turn, and every square around your last mark is taken? You are <b>penned in</b> and you lose. There are no draws.'],
  ];
  $('#steps').replaceChildren(...steps.map(([pic, text]) => { const d = document.createElement('div'), p = document.createElement('p'); d.className = 'step'; p.innerHTML = text; d.append(pic, p); return d; }));
}
