/* ── The board on the page: the painted canvas, the moons moving on it, and a button over every square ──
   The canvas shows the board and its discs. Over it lies a grid of sixty-four buttons that show nothing of their
   own except what the moment adds: a star where a disc may go, and a ring round the last disc put down. While the
   pointer is on a square a disc may go on, the canvas shows that disc half there, and every moon it would turn
   starts to turn. */
const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const easeOut = t => 1 - Math.pow(1 - t, 3), easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const DISC_SHARE = 0.86;        // how much of a square a disc fills

const View = {
  canvas: null, g: null, base: null, P: null, dpr: 1, size: 0,
  disc: new Int8Array(64),      // what stands on each square, as it is shown
  acts: [],                     // discs on the move: { s, kind: 'drop' | 'turn' | 'swell', t0, dur, from, to, angle }
  raf: 0, after: null, cells: [], input: null, hover: -1, pressed: false, quiet: false,
  peek: null,                   // the move the pointer is on: { to, me, flips, t0 }

  init() {
    this.canvas = $('#board'); this.g = this.canvas.getContext('2d'); this.base = canvasOf(1, 1);
    const box = $('#cells');
    for (let s = 0; s < 64; s++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cell'; b.dataset.s = s; b.tabIndex = s === 27 ? 0 : -1; b.style.setProperty('--i', (s * 5) % 7);
      box.appendChild(b); this.cells.push(b);
    }
    const at = ev => { const r = box.getBoundingClientRect(), c = Math.floor((ev.clientX - r.left) / r.width * 8), w = Math.floor((ev.clientY - r.top) / r.height * 8); return c < 0 || c > 7 || w < 0 || w > 7 ? -1 : w * 8 + c; };
    box.addEventListener('pointerdown', ev => {
      if (ev.button > 0 || !this.input) return;
      this.pressed = true; try { box.setPointerCapture(ev.pointerId); } catch (e) { /* a pointer that cannot be held */ }
      this.preview(at(ev));
    });
    box.addEventListener('pointermove', ev => { if (this.pressed || ev.pointerType === 'mouse') this.preview(at(ev)); });
    box.addEventListener('pointerup', ev => {
      if (!this.pressed) return;
      this.pressed = false; const s = at(ev);
      if (ev.pointerType !== 'mouse') this.preview(-1);
      if (s >= 0) this.choose(s);
    });
    box.addEventListener('pointercancel', () => { this.pressed = false; this.preview(-1); });
    box.addEventListener('pointerleave', () => { if (!this.pressed) this.preview(-1); });
    box.addEventListener('click', ev => { if (ev.detail === 0 && ev.target.dataset.s !== undefined) this.choose(+ev.target.dataset.s); });   // the keyboard's Enter or space; the pointer is dealt with above
    box.addEventListener('focusin', ev => { if (ev.target.dataset.s !== undefined && ev.target.matches(':focus-visible')) this.preview(+ev.target.dataset.s); });
    box.addEventListener('focusout', () => { if (!this.pressed) this.preview(-1); });
    box.addEventListener('keydown', ev => {
      const s = +ev.target.dataset.s, step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[ev.key];
      if (!step || Number.isNaN(s)) return;
      const t = s + step;
      if (t < 0 || t > 63 || (Math.abs(step) === 1 && (t >> 3) !== (s >> 3))) return;
      ev.preventDefault(); this.cells[s].tabIndex = -1; this.cells[t].tabIndex = 0; this.cells[t].focus();
    });
  },

  /** paints the board again at the size its box has now; again: even if that is the size it was painted at (its
   *  colours have changed). A board that is out of sight is painted when it is next looked at. */
  fit(again) {
    if (again) this.size = 0;
    const size = Math.round($('#boardbox').clientWidth), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (!size || (size === this.size && dpr === this.dpr)) return;
    this.size = size; this.dpr = dpr;
    this.P = paintBoard(this.base, size, dpr, true);
    this.canvas.width = this.base.width; this.canvas.height = this.base.height;
    Moons.make(this.P.cell * DISC_SHARE * dpr);
    const box = $('#cells');
    box.style.left = box.style.top = this.P.frame + 'px'; box.style.width = box.style.height = this.P.field + 'px';
    this.draw(performance.now());
  },

  /** the board as a position has it, with nothing moving */
  set(squares) { this.acts = []; this.peek = null; this.disc.set(squares); this.settle(); this.draw(performance.now()); },
  settle() { if (this.after) { const f = this.after; this.after = null; f(); } },

  still(s, disc, D, lift = 0, scale = 1, alpha = 1) {
    const g = this.g, P = this.P, x = P.x0 + ((s & 7) + 0.5) * P.cell, y = P.y0 + ((s >> 3) + 0.5) * P.cell, k = 1 + lift;
    g.globalAlpha = alpha * (1 - lift * 0.16);
    g.drawImage(Moons.shadow, x - D * 0.61 + D * 0.05 * k, y - D * 0.61 + D * 0.09 * k, D * 1.22, D * 1.22);
    g.globalAlpha = alpha;
    g.drawImage(Moons.face(disc, s), x - D * scale / 2, y - D * scale / 2, D * scale, D * scale);
    g.globalAlpha = 1;
  },
  draw(now) {
    const g = this.g, P = this.P;
    if (!P) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.base, 0, 0); g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const D = P.cell * DISC_SHARE, moving = new Set(this.acts.map(a => a.s)), peek = this.peek;
    let live = false;
    if (peek) for (const s of peek.flips) moving.add(s);
    for (let s = 0; s < 64; s++) if (this.disc[s] && !moving.has(s)) this.still(s, this.disc[s], D);
    if (peek) {                                                  // the move under the pointer, begun but not made
      const k = REDUCED ? 1 : easeOut(clamp01((now - peek.t0) / 170)), px = peek.to & 7, py = peek.to >> 3;
      if (k < 1) live = true;
      for (const s of peek.flips) {
        const x = P.x0 + ((s & 7) + 0.5) * P.cell, y = P.y0 + ((s >> 3) + 0.5) * P.cell;
        g.drawImage(Moons.shadow, x - D * 0.61 + D * 0.05, y - D * 0.61 + D * 0.09, D * 1.22, D * 1.22);
        drawMoon(g, x, y, D, Moons.face(3 - peek.me, s), Moons.face(peek.me, s), 0.3 * k, Math.atan2((s >> 3) - py, (s & 7) - px));
      }
      this.still(peek.to, peek.me, D, 0, 1, 0.66 * k);
    }
    for (const a of this.acts) {
      const t = (now - a.t0) / a.dur;
      if (t < 0) { live = true; if (a.from) this.still(a.s, a.from, D); continue; }
      if (t >= 1) { a.done = true; this.disc[a.s] = a.to; this.still(a.s, a.to, D); continue; }
      live = true;
      const x = P.x0 + ((a.s & 7) + 0.5) * P.cell, y = P.y0 + ((a.s >> 3) + 0.5) * P.cell;
      if (a.kind === 'drop') {                                   // set down from a little above the board
        const e = easeOut(t); this.still(a.s, a.to, D, 2.6 * (1 - e), 1 + 0.4 * (1 - e), clamp01(t * 5));
      } else if (a.kind === 'swell') {                           // a disc of the side that won
        const up = Math.sin(Math.PI * t); this.still(a.s, a.to, D, up * 1.2, 1 + 0.1 * up);
      } else {                                                   // turned over: the new face crosses it from the side the move came from
        const p = easeIO(t), up = Math.sin(Math.PI * p), k = 1 + up * 1.8, d = D * (1 + 0.15 * up);
        g.globalAlpha = 1 - up * 0.2; g.drawImage(Moons.shadow, x - D * 0.61 + D * 0.05 * k, y - D * 0.61 + D * 0.09 * k, D * 1.22, D * 1.22); g.globalAlpha = 1;
        drawMoon(g, x, y, d, Moons.face(a.from, a.s), Moons.face(a.to, a.s), p, a.angle);
      }
    }
    this.acts = this.acts.filter(a => !a.done);
    if (live) this.raf = requestAnimationFrame(t => this.draw(t)); else { this.raf = 0; this.settle(); }
  },
  kick() { if (!this.raf) this.raf = requestAnimationFrame(t => this.draw(t)); },

  /** Shows a move happening: ev comes from describe() or playMove(). Comes back when the last moon has turned. */
  show(ev) {
    if (ev.pass || !this.P) return Promise.resolve();
    const me = ev.side + 1, cx = ev.to & 7, cy = ev.to >> 3, now = performance.now();
    this.acts = this.acts.filter(a => a.kind !== 'swell'); this.peek = null;
    if (REDUCED) { this.disc[ev.to] = me; for (const s of ev.flips) this.disc[s] = me; this.say('place'); this.draw(now); return Promise.resolve(); }
    this.acts.push({ s: ev.to, kind: 'drop', t0: now, dur: 250, from: 0, to: me });
    this.say('place');
    for (const line of ev.lines) line.forEach((s, i) => {
      const wait = 190 + i * 88;
      this.acts.push({ s, kind: 'turn', t0: now + wait, dur: 440, from: 3 - me, to: me, angle: Math.atan2((s >> 3) - cy, (s & 7) - cx) });
      this.say('flip', { i, light: me === 2, at: wait / 1000 + 0.1 });
    });
    return new Promise(res => { this.after = res; this.kick(); });
  },
  /** the winner's discs rise and settle, in a wave from one corner */
  cheer(disc) {
    if (REDUCED || !this.P) return;
    const now = performance.now();
    for (let s = 0; s < 64; s++) if (this.disc[s] === disc) this.acts.push({ s, kind: 'swell', t0: now + 350 + ((s & 7) + (s >> 3)) * 70, dur: 520, from: disc, to: disc });
    this.kick();
  },
  say(name, arg) { if (!this.quiet) snd(name, arg); },

  /* ── a person's move ── */
  /** input: { side, legal: [squares], flips(s): the squares a disc on s would turn, pick(s), miss(s) }, or null */
  setInput(input) {
    this.input = input; this.preview(-1);
    this.cells.forEach((b, s) => b.classList.toggle('can', !!input && input.legal.includes(s)));
  },
  preview(s) {
    if (!this.input || !this.input.legal.includes(s)) s = -1;
    if (s === this.hover) return;
    this.hover = s;
    for (const b of this.cells) b.classList.remove('ghost');
    this.peek = s < 0 ? null : { to: s, me: this.input.side + 1, flips: this.input.flips(s), t0: performance.now() };
    if (s >= 0) this.cells[s].classList.add('ghost');
    if (this.raf) return;
    if (s < 0) this.draw(performance.now()); else this.kick();
  },
  choose(s) {
    const input = this.input;
    if (!input) return;
    if (input.legal.includes(s)) { this.preview(-1); input.pick(s); }
    else if (!this.disc[s]) {
      const box = $('#cells'); box.classList.remove('nudge'); void box.offsetWidth; box.classList.add('nudge'); setTimeout(() => box.classList.remove('nudge'), 520);
      input.miss(s);
    }
  },
  /** a ring round the disc put down last, and what each square holds, said in words for whoever cannot see it */
  mark(S) {
    const last = lastDisc(S), legal = this.input ? this.input.legal : [];
    this.cells.forEach((b, s) => {
      b.classList.toggle('last', s === last);
      b.setAttribute('aria-label', sqName(s) + ', ' + (S.b[s] ? SIDE[S.b[s] - 1] : 'empty') + (legal.includes(s) ? ', a move' : '') + (s === last ? ', played last' : ''));
    });
  },
};
/** the square of the last disc put down in a game, or −1 */
function lastDisc(S) { for (let i = S.history.length - 1; i >= 0; i--) if (S.history[i] !== PASS_MOVE) return S.history[i]; return -1; }

/* ── small boards for the rules ── */
/** A piece of the board, cols × rows squares, painted onto a canvas w wide (CSS pixels). discs: [[col, row, 1 | 2]].
 *  more: { stars: [[col, row]], ghost: [col, row, disc], rings: [[col, row]], corner: true when its top left is the board's } */
function paintScene(canvas, w, cols, rows, discs, more = {}) {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1), cell = w / cols, h = cell * rows, rand = rngOf(cols * 31 + rows * 7 + discs.length);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const wash = g.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, tone(PAL.field, PAL.fieldHi, 0.35)); wash.addColorStop(1, tone(PAL.field, PAL.fieldLo, 0.3));
  g.fillStyle = wash; g.fillRect(0, 0, w, h);
  texture(g, 'mottle', 0, 0, w, h, { alpha: 0.4, scale: 0.9 }); texture(g, 'grain', 0, 0, w, h, { alpha: 0.24, mode: 'overlay' });
  for (let i = more.corner ? 1 : 0; i <= cols; i++) handLine(g, i * cell, 0, i * cell, h, ink(PAL.gold, 0.8), 1.2, rand, { wander: 0.4 });
  for (let i = more.corner ? 1 : 0; i <= rows; i++) handLine(g, 0, i * cell, w, i * cell, ink(PAL.gold, 0.8), 1.2, rand, { wander: 0.4 });
  if (more.corner) { g.fillStyle = PAL.lacquer; g.fillRect(0, 0, w, 5); g.fillRect(0, 0, 5, h); g.fillStyle = PAL.gold; g.fillRect(5, 5, w, 1.6); g.fillRect(5, 5, 1.6, h); }
  const D = cell * 0.82, px = Math.round(D * dpr), dark = paintFace(px, false, 2), light = paintFace(px, true, 2), shadow = paintShadow(Math.round(px * 1.2));
  const centre = (c, r) => [(c + 0.5) * cell + (more.corner ? 2.5 : 0), (r + 0.5) * cell + (more.corner ? 2.5 : 0)];
  for (const [c, r, disc] of discs) {
    const [x, y] = centre(c, r);
    g.drawImage(shadow, x - D * 0.61 + D * 0.05, y - D * 0.61 + D * 0.09, D * 1.22, D * 1.22); g.drawImage(disc === 2 ? light : dark, x - D / 2, y - D / 2, D, D);
  }
  for (const [c, r] of more.stars || []) { const [x, y] = centre(c, r); starPath(g, x, y, cell * 0.17, 0.2, 1); g.fillStyle = PAL.goldHi; g.fill(); }
  if (more.ghost) { const [x, y] = centre(more.ghost[0], more.ghost[1]); g.globalAlpha = 0.62; g.drawImage(more.ghost[2] === 2 ? light : dark, x - D / 2, y - D / 2, D, D); g.globalAlpha = 1; }
  for (const [c, r] of more.rings || []) { const [x, y] = centre(c, r); g.strokeStyle = PAL.goldHi; g.lineWidth = 2; g.shadowColor = 'rgba(251,230,168,.9)'; g.shadowBlur = 7; g.beginPath(); g.arc(x, y, D * 0.52, 0, TAU); g.stroke(); g.shadowBlur = 0; }
}
