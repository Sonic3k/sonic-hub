/* ── The board on the page: laying it out, painting it, showing a line drawn and a square lit, and taking a line from
   a hand ──
   One canvas. What does not change in a game (the indigo paper, the bamboo frame, the guide marks where lines may
   go) is painted once for the board's size into View.base; the rest is painted over it every frame while anything
   moves: the squares taken, glowing; the lines, as bamboo strips; the knots where they meet; the line under a
   finger or the pointer; the ties that mark the lines of the turn before and the turn now. */
const View = {
  n: 5, size: 0, dpr: 1, m: 0, c: 0, w: 0, r: 0, base: null, sp: null,
  S: null, by: new Int8Array(112).fill(-1), tLine: new Float64Array(112), tSq: new Float64Array(49), sqSide: new Int8Array(49).fill(-1),
  hot: -1, cursor: -1, input: null, quiet: false, marks: [new Set(), new Set()], last: -1, raf: 0, until: 0, runs: 0,

  /** Lays the board out for the size it now has on the page, and paints what stays. */
  fit(n, force) {
    const box = $('#boardbox'), css = box.clientWidth;
    if (!css || (!force && this.base && (!n || n === this.n) && css === this.css && Math.abs(pixelRatio(2.5) - this.dpr) < 0.01)) return;
    if (n) this.n = n;
    const dpr = pixelRatio(2.5), size = Math.round(css * dpr), N = this.n;
    const cv = $('#board'); cv.width = size; cv.height = size;
    this.size = size; this.dpr = dpr; this.css = css;
    this.m = size * (N === 5 ? 0.095 : 0.078);                    // from the edge of the canvas to the outer dots
    this.c = (size - 2 * this.m) / N;                             // from one dot to the next
    this.w = Math.max(3, this.c * (N === 5 ? 0.125 : 0.14));      // a strip's thickness
    this.r = Math.max(2.6, this.c * 0.088);                       // a knot's
    const c = this.c, w = this.w, len = c - this.r * 0.6;
    const strips = [0, 1, 2].map(k => bambooStrip(len, w, 31 + k * 17, k % 2));
    this.sp = { across: strips, down: strips.map(turned), knot: knot(this.r), lit: [litSquare(Math.ceil(c), 0, 5), litSquare(Math.ceil(c), 1, 6)], glow: [glowOf(c, 0), glowOf(c, 1)], len };
    this.base = this.paintBase();
    this.draw(performance.now());
  },
  /** dot (x, y) on the canvas */
  at(x, y) { return [this.m + x * this.c, this.m + y * this.c]; },
  paintBase() {
    const size = this.size, N = this.n, b = canvasOf(size, size), g = b.getContext('2d');
    const pole = Math.max(7, size * 0.03), inset = pole * 0.62, paperX = inset, paperW = size - inset * 2;
    // a shadow under the whole frame
    g.save(); g.shadowColor = 'rgba(3, 5, 22, 0.7)'; g.shadowBlur = size * 0.03; g.shadowOffsetY = size * 0.012; g.fillStyle = '#101838'; g.fillRect(paperX + 2, paperX + 2, paperW - 4, paperW - 4); g.restore();
    // the paper: indigo, dyed unevenly, with its fibres
    const sheet = paperSheet(paperW, paperW, ['#1d2a5c', '#4b5d9c', '#0e1838'], 77, 1.2);
    g.drawImage(sheet, paperX, paperX);
    const light = g.createLinearGradient(0, paperX, 0, paperX + paperW);   // the light of the street, from below
    light.addColorStop(0, 'rgba(10, 14, 40, 0.28)'); light.addColorStop(0.55, 'rgba(0,0,0,0)'); light.addColorStop(1, 'rgba(255, 150, 80, 0.16)');
    g.fillStyle = light; g.fillRect(paperX, paperX, paperW, paperW);
    const vig = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(4, 6, 24, 0.45)');
    g.fillStyle = vig; g.fillRect(paperX, paperX, paperW, paperW);
    // where lines may go: a row of small marks between every two dots, as a maker pencils the frame out
    g.fillStyle = 'rgba(214, 226, 255, 0.2)';
    const marks = (x1, y1, x2, y2) => { for (let k = 1; k < 6; k++) { const t = k / 6; g.beginPath(); g.arc(lerp(x1, x2, t), lerp(y1, y2, t), Math.max(0.9, this.c * 0.012), 0, TAU); g.fill(); } };
    for (let y = 0; y <= N; y++) for (let x = 0; x < N; x++) { const [x1, y1] = this.at(x, y), [x2] = this.at(x + 1, y); marks(x1, y1, x2, y1); }
    for (let y = 0; y < N; y++) for (let x = 0; x <= N; x++) { const [x1, y1] = this.at(x, y), [, y2] = this.at(x, y + 1); marks(x1, y1, x1, y2); }
    // the frame: four poles of bamboo, lashed where they cross
    const lenP = size, top = bambooPole(lenP, pole, 3), bottom = bambooPole(lenP, pole, 5), left = bambooPole(lenP, pole, 7), right = bambooPole(lenP, pole, 9);
    const at = inset - pole / 2;
    g.save(); g.shadowColor = 'rgba(3, 5, 22, 0.55)'; g.shadowBlur = pole * 0.8; g.shadowOffsetY = pole * 0.3;
    g.drawImage(top, 0, at); g.drawImage(bottom, 0, size - at - pole);
    for (const [img, x] of [[left, at], [right, size - at - pole]]) { g.save(); g.translate(x + pole, 0); g.rotate(Math.PI / 2); g.drawImage(img, 0, 0); g.restore(); }
    g.restore();
    for (const [x, y] of [[inset, inset], [size - inset, inset], [inset, size - inset], [size - inset, size - inset]]) lashing(g, x, y, pole * 1.15);
    return b;
  },

  /** Shows position S as it stands, with nothing moving. */
  set(S) {
    this.S = S; this.by.fill(-1); this.tLine.fill(0); this.tSq.fill(0); this.sqSide.fill(-1); this.hot = -1;
    const T = newGame(S.n);
    for (const m of S.history) { this.by[m] = T.turn; make(T, m); }
    for (let s = 0; s < S.owner.length; s++) this.sqSide[s] = S.owner[s];
    this.mark(S); this.dirty();
  },
  /** The ties on the lines of the last two turns: the turn now and the one before it. */
  mark(S) {
    this.marks = [new Set(), new Set()]; this.last = S.history.length ? S.history[S.history.length - 1] : -1;
    const T = newGame(S.n), turns = []; let cur = [];
    for (const m of S.history) { const side = T.turn; cur.push(m); if (!make(T, m)) { turns.push({ side, lines: cur }); cur = []; } }
    if (cur.length) turns.push({ side: T.turn, lines: cur });
    for (const t of turns.slice(-2)) for (const m of t.lines) this.marks[t.side].add(m);
  },

  /** Shows a move being made (ev from describe(), made on the position before it). Resolves once the strip is down;
   *  the squares it takes go on lighting after that, and their lanterns go up. run: how many squares the side has
   *  taken this turn before this line, for the bells. */
  show(ev, S) {
    const now = performance.now(), m = ev.m;
    this.S = S; this.by[m] = ev.side; this.tLine[m] = now;
    this.mark(S);
    if (!this.quiet) SFX.play('draw');
    ev.took.forEach((s, i) => {
      this.sqSide[s] = ev.side; this.tSq[s] = now + 130 + i * 60;
      setTimeout(() => { const [x, y] = this.pageOf(s); Scene.release(x, y, ev.side); }, 420 + i * 80);
    });
    if (ev.took.length && !this.quiet) setTimeout(() => SFX.play(ev.took.length > 1 ? 'double' : 'take', this.runs), 120);
    this.runs = ev.took.length ? this.runs + ev.took.length : 0;
    this.hot = -1; this.until = now + 2700; this.dirty();         // the strip, the squares, and the last line's glow
    return sleep(REDUCED ? 60 : 190);
  },
  /** the middle of square s, on the page */
  pageOf(s) {
    const rect = $('#board').getBoundingClientRect(), k = rect.width / this.size, N = this.n, [x, y] = this.at(s % N + 0.5, Math.floor(s / N) + 0.5);
    return [rect.left + x * k, rect.top + y * k];
  },

  dirty() { if (!this.raf) this.raf = requestAnimationFrame(t => { this.raf = 0; this.draw(t); if (t < this.until || this.hot >= 0 || this.cursor >= 0) this.later(); }); },
  later() { if (!this.raf) this.raf = requestAnimationFrame(t => { this.raf = 0; this.draw(t); if (t < this.until || this.hot >= 0 || this.cursor >= 0) this.later(); }); },
  draw(now) {
    const S = this.S, cv = $('#board'), g = cv.getContext('2d');
    if (!this.base || !S || S.n !== this.n) return;
    const N = this.n, c = this.c, sp = this.sp, geo = S.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.size, this.size);
    g.drawImage(this.base, 0, 0);
    // the squares taken, lit, each catching with a flash
    const glows = [];
    for (let s = 0; s < N * N; s++) {
      const side = this.sqSide[s]; if (side < 0) continue;
      const t = this.tSq[s] ? (now - this.tSq[s]) / 560 : 1; if (t < 0) continue;
      const [x, y] = this.at(s % N, Math.floor(s / N)), k = easeOut(t);
      g.globalAlpha = k; g.drawImage(sp.lit[side], x, y, c, c);
      glows.push([x + c / 2, y + c / 2, side, t < 1 ? 1 + 1.6 * Math.sin(Math.PI * clamp01(t)) : 1]);
    }
    g.globalAlpha = 1;
    // a square the line under the hand would take: a hint of its light
    const hot = this.hot >= 0 && !S.line[this.hot] ? this.hot : -1;
    if (hot >= 0) for (const s of [geo.lineSq[2 * hot], geo.lineSq[2 * hot + 1]]) if (s >= 0 && S.sides[s] === 3) { const [x, y] = this.at(s % N, Math.floor(s / N)); g.globalAlpha = 0.32; g.drawImage(sp.lit[S.turn], x, y, c, c); }
    g.globalAlpha = 1;
    if (glows.length) {
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, side, k] of glows) { const gs = sp.glow[side], d = gs.width * (0.9 + 0.25 * (k - 1)); g.globalAlpha = Math.min(1, 0.42 * k); g.drawImage(gs, x - d / 2, y - d / 2, d, d); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    // the lines: bamboo strips, each laid down from its middle out
    const line = (m, alpha, grow = 1) => {
      const a = geo.lineDot[2 * m], D = N + 1, ax = a % D, ay = Math.floor(a / D), across = m < geo.across, [x, y] = this.at(ax, ay);
      const set = across ? sp.across : sp.down, s = set[m % 3], len = sp.len * grow, off = (c - len) / 2;
      g.globalAlpha = alpha;
      if (across) g.drawImage(s.c, x + off - s.pad, y - this.w / 2 - s.pad, len + s.pad * 2, s.c.height);
      else g.drawImage(s.c, x - this.w / 2 - s.pad, y + off - s.pad, s.c.width, len + s.pad * 2);
    };
    for (let m = 0; m < geo.lines; m++) {
      if (!S.line[m]) continue;
      const t = this.tLine[m] ? (now - this.tLine[m]) / 170 : 1;
      line(m, clamp01(t * 2.5), t >= 1 ? 1 : 0.35 + 0.65 * easeBack(t));
    }
    if (hot >= 0) line(hot, 0.55);
    g.globalAlpha = 1;
    // the ties on the lines of the turn before and the turn now, the last line's glowing
    for (const side of [0, 1]) for (const m of this.marks[side]) {
      if (!S.line[m]) continue;
      const a = geo.lineDot[2 * m], b = geo.lineDot[2 * m + 1], D = N + 1, [x1, y1] = this.at(a % D, Math.floor(a / D)), [x2, y2] = this.at(b % D, Math.floor(b / D));
      const x = (x1 + x2) / 2, y = (y1 + y2) / 2, across = m < geo.across, last = m === this.last, rr = this.w * (last ? 0.78 : 0.6);
      if (last) { const fresh = now - this.tLine[m] < 2600, pulse = REDUCED || !fresh ? 0.6 : 0.55 + 0.25 * Math.sin(now / 260), gl = g.createRadialGradient(x, y, 0, x, y, this.c * 0.42); gl.addColorStop(0, side ? `rgba(255, 214, 110, ${pulse})` : `rgba(255, 120, 80, ${pulse})`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(x - this.c / 2, y - this.c / 2, this.c, this.c); }
      g.fillStyle = LAMP[side].tie; g.strokeStyle = 'rgba(40, 8, 4, 0.55)'; g.lineWidth = Math.max(0.8, this.w * 0.12);
      g.beginPath(); g.ellipse(x, y, across ? rr * 0.55 : rr, across ? rr : rr * 0.55, 0, 0, TAU); g.fill(); g.stroke();
    }
    // the knots
    const k = sp.knot, kh = k.width / 2;
    for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) { const [px, py] = this.at(x, y); g.drawImage(k, px - kh, py - kh); }
    // the keyboard's line
    if (this.cursor >= 0 && !S.line[this.cursor]) {
      const a = geo.lineDot[2 * this.cursor], b = geo.lineDot[2 * this.cursor + 1], D = N + 1, [x1, y1] = this.at(a % D, Math.floor(a / D)), [x2, y2] = this.at(b % D, Math.floor(b / D));
      g.strokeStyle = '#ffe7a3'; g.lineWidth = Math.max(2, this.w * 0.35); g.setLineDash([this.w * 0.8, this.w * 0.6]);
      g.strokeRect(Math.min(x1, x2) - this.w, Math.min(y1, y2) - this.w, Math.abs(x2 - x1) + this.w * 2, Math.abs(y2 - y1) + this.w * 2); g.setLineDash([]);
    }
  },

  /* ── a hand on the board ── */
  /** The line nearest a point on the page that is still to be drawn: a side of the square the point is in. −1 if none. */
  lineAtPoint(clientX, clientY) {
    const S = this.S; if (!S) return -1;
    const rect = $('#board').getBoundingClientRect(), k = this.size / rect.width, px = (clientX - rect.left) * k, py = (clientY - rect.top) * k;
    const N = this.n, u = (px - this.m) / this.c, v = (py - this.m) / this.c;
    if (u < -0.7 || v < -0.7 || u > N + 0.7 || v > N + 0.7) return -1;
    const x0 = Math.max(0, Math.min(N - 1, Math.floor(u))), y0 = Math.max(0, Math.min(N - 1, Math.floor(v))), geo = S.g, D = N + 1;
    const near = [[x0 + N * y0, Math.abs(v - y0)], [x0 + N * (y0 + 1), Math.abs(v - y0 - 1)], [geo.across + x0 + D * y0, Math.abs(u - x0)], [geo.across + x0 + 1 + D * y0, Math.abs(u - x0 - 1)]];
    let best = -1, d = 0.68;
    for (const [m, dist] of near) if (!S.line[m] && dist < d) { d = dist; best = m; }
    return best;
  },
  /** the line beside line `from` in a direction (dx, dy), for the arrow keys */
  step(from, dx, dy) {
    const S = this.S, N = this.n, geo = S.g, D = N + 1, mid = m => { const a = geo.lineDot[2 * m], b = geo.lineDot[2 * m + 1]; return [(a % D + b % D) / 2, (Math.floor(a / D) + Math.floor(b / D)) / 2]; };
    const [fx, fy] = from >= 0 ? mid(from) : [N / 2, N / 2 - 0.5];
    let best = -1, score = Infinity;
    for (let m = 0; m < geo.lines; m++) {
      if (S.line[m] || m === from) continue;
      const [x, y] = mid(m), vx = x - fx, vy = y - fy, along = vx * dx + vy * dy, side = Math.abs(vx * dy - vy * dx);
      if (along <= 0.01 || side > along * 1.8) continue;
      const sc = along + side * 1.6; if (sc < score) { score = sc; best = m; }
    }
    return best;
  },
};

/* the hand: a pointer shows the line it is on; a press shows it too, and letting go draws it */
(() => {
  const box = () => $('#boardbox');
  let down = -1;
  const may = () => !!View.input && !!View.S && !View.S.over;
  const hover = m => { if (m !== View.hot) { View.hot = m; box().classList.toggle('can', m >= 0); View.dirty(); } };
  window.addEventListener('pointermove', e => {
    if (!may()) { if (View.hot >= 0) hover(-1); return; }
    if (e.pointerType !== 'mouse' && down < 0) return;
    hover(View.lineAtPoint(e.clientX, e.clientY));
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (!may() || !e.target.closest || !e.target.closest('#boardbox')) return;
    down = e.pointerId; View.cursor = -1; hover(View.lineAtPoint(e.clientX, e.clientY));
    if (e.pointerType !== 'mouse') e.preventDefault();
  });
  const up = e => {
    if (down < 0 || e.pointerId !== down) return;
    down = -1;
    const m = View.lineAtPoint(e.clientX, e.clientY);
    if (e.pointerType !== 'mouse') hover(-1);
    if (may() && m >= 0) { const pick = View.input; View.input = null; hover(-1); pick(m); }
  };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', e => { if (e.pointerId === down) { down = -1; hover(-1); } });
  document.addEventListener('pointerleave', () => hover(-1));
  window.addEventListener('blur', () => hover(-1));
  box().addEventListener('keydown', e => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!may()) return;
    if (dir) { e.preventDefault(); const m = View.step(View.cursor, dir[0], dir[1]); if (m >= 0) { View.cursor = m; View.hot = m; View.dirty(); } }
    else if ((e.key === 'Enter' || e.key === ' ') && View.cursor >= 0 && !View.S.line[View.cursor]) { e.preventDefault(); const pick = View.input, m = View.cursor; View.input = null; View.hot = -1; pick(m); }
  });
  box().addEventListener('blur', () => { View.cursor = -1; View.hot = -1; View.dirty(); });
})();
