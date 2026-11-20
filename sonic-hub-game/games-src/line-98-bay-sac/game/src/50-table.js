/* ── the table: the board of the place being played at, and everything that moves on it ──
   The board itself (frame and squares) is painted once on its own canvas. Over it lies a second canvas that is
   painted anew every frame: the three to come, the balls, the bits that fly. A ball is painted once too, on a small
   sheet of its own for each colour, and only laid down each frame where it now is, at the size and tilt it now has.

   The table shows; it decides nothing. What a move did comes from the rules as a list (engine/rules.js), and show()
   plays that list: the ball goes along its way, a line goes, three come up. */
const table = (() => {
  const box = $('boardbox'), boardCv = $('board'), liveCv = $('live');
  let P = null, G = { S: 0, pad: 0, cell: 0 }, dpr = 1, live = null, game = null;
  let balls = [], seedsArt = [], glows = [], shade0 = null, artSize = 0;
  const shown = new Array(CELLS).fill(null);       // the ball shown on each square, or null
  let extra = [];                                  // balls shown that have no square just now: on their way, or being taken off
  let seeds = [];                                  // the three to come, as shown: { c, at, x, y, k }
  let picked = -1, cursor = -1, hover = -1, way = null, cursorOn = false, warm = null;      // warm: the ball the pointer rests on
  const on = { press() {}, drop() {} };
  const p = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, lift: 0, glow: 1, a: 1, k: 1 };

  const cx = x => G.pad + (x + .5) * G.cell, cy = y => G.pad + (y + .5) * G.cell;
  const xOf = at => at % N, yOf = at => (at - at % N) / N;
  const newBall = (c, at) => ({ c, x: xOf(at), y: yOf(at), k: 1, a: 1, sx: 1, sy: 1, rot: 0, lift: 0, picked: false, pickT: 0, phase: Math.random(), moving: false, roll: 0, gone: -1, sprout: 1, jolt: -1e9 });
  const quiet = () => anim.rushing();
  /** does fn after ms, in step with everything else that moves (and at once when the showing is cut short) */
  function later(ms, fn) { let did = false; return anim.run(1, () => { if (!did) { did = true; fn(); } }, { delay: ms }); }

  /* ── painting what does not change ── */
  function layout() {
    if (!P) return;
    const r = box.getBoundingClientRect();
    if (r.width < 10) return;
    dpr = DPR();
    const S = Math.round(r.width), pad = Math.round(S * P.frame), cell = (S - pad * 2) / N;
    G = { S, pad, cell, ox: r.left, oy: r.top };
    for (const cv of [boardCv, liveCv]) { cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr); }
    const c = boardCv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, S, S);
    c.save(); P.board(c, G); c.restore();
    live = liveCv.getContext('2d');
    art();
  }
  /** the balls of this place, each colour once, at the size they have here */
  function art() {
    const R = G.cell * P.ballR, q = G.cell * 1.8, px = Math.ceil(q * dpr);
    artSize = q; balls = []; seedsArt = []; glows = [];
    for (let i = 0; i < Lines.COLOURS; i++) {
      let [cv, c] = sheet(px, px);
      c.scale(dpr, dpr); c.translate(q / 2, q / 2); c.save(); P.ball(c, i, R); c.restore();
      if (kept.marks) mark(c, i, R);
      balls.push(cv);
      [cv, c] = sheet(px, px);
      c.scale(dpr, dpr); c.translate(q / 2, q / 2);
      if (P.seed) P.seed(c, i, R); else { c.scale(.36, .36); P.ball(c, i, R); }
      seedsArt.push(cv);
      if (P.glow) { [cv, c] = sheet(px, px); c.scale(dpr, dpr); glowAt(c, q / 2, q / 2, Math.min(q / 2, R * P.glow.r), P.inks[i], 1); glows.push(cv); }
    }
    const [sv, sc] = sheet(64, 64);
    sc.fillStyle = radial(sc, 32, 32, 0, 32, [[0, 'rgba(0,0,0,1)'], [.55, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); sc.fillRect(0, 0, 64, 64);
    shade0 = sv;
  }

  /* ── painting what does ── */
  function paint(c, b, t) {
    p.dx = p.dy = p.rot = p.lift = 0; p.sx = p.sy = p.glow = p.a = p.k = 1;
    P.pose(b, t, p);
    if (b.gone >= 0) (P.leave || leave)(b, b.gone, p);
    const jolt = anim.now() - b.jolt;
    if (jolt < 380) p.dx += Math.sin(jolt / 28) * .07 * (1 - jolt / 380);            // it could not go: a shake of the head
    const R = G.cell * P.ballR, k = b.k * p.k * (1 + .055 * ease.out2(b.warm || 0)), a = b.a * p.a, lift = (b.lift + p.lift) * G.cell, x = cx(b.x + p.dx), y = cy(b.y + p.dy);
    if (a <= .003 || k <= .003) return;
    if (P.shadow && shade0) {
      const s = P.shadow, near = 1 / (1 + lift / (R * 1.1));
      c.globalAlpha = s.a * a * near * Math.min(1, k * 1.2);
      const w = R * s.w * k * (1.15 - .15 * near) * 2, h = R * s.h * k * 2;
      c.drawImage(shade0, x - w / 2 + lift * .16, y + R * s.y * k - h / 2, w, h);
    }
    if (P.floor) P.floor(c, b, x, y, R, k, a * (1 / (1 + lift / R)), t);
    if (P.glow) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(P.glow.a * a * p.glow, 0, 1);
      const q = artSize * k; c.drawImage(glows[b.c], x - q / 2, y - lift - q / 2, q, q);
      c.globalCompositeOperation = 'source-over';
    }
    const sy = b.sy * p.sy;
    c.save();
    c.translate(x, y - lift + R * (1 - sy) * k); c.rotate(b.rot + p.rot);
    if (b.sprout < 1 && P.seed) {                      // a place whose balls to come look unlike its balls: the one fades as the other swells
      c.globalAlpha = a * (1 - b.sprout); const q = artSize * (1 + b.sprout * 1.4); c.drawImage(seedsArt[b.c], -q / 2, -q / 2, q, q);
      c.globalAlpha = a * Math.min(1, b.sprout * 1.8);
    } else c.globalAlpha = a;
    c.scale(k * b.sx * p.sx, k * sy);
    c.drawImage(balls[b.c], -artSize / 2, -artSize / 2, artSize, artSize);
    c.restore();
    c.globalAlpha = 1;
  }
  /** how a ball that was taken goes, where a place has no way of its own: it swells a little and is gone */
  function leave(b, u, q) { q.k = u < .28 ? 1 + .16 * ease.out2(u / .28) : 1.16 * (1 - ease.in2((u - .28) / .72)); q.a = u < .6 ? 1 : 1 - (u - .6) / .4; }

  function draw(t, dt) {
    if (!live || !P) return;
    const c = live, R = G.cell * P.ballR, accent = P.dress.accent;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, G.S, G.S);
    stepBits(dt); drawBits(c, true);
    // the square the keys are on
    if (cursorOn && cursor >= 0) {
      const m = G.cell * .07, x = G.pad + xOf(cursor) * G.cell + m, y = G.pad + yOf(cursor) * G.cell + m;
      c.strokeStyle = accent; c.lineWidth = Math.max(2, G.cell * .05); c.globalAlpha = .65 + .3 * Math.sin(t / 260);
      rr(c, x, y, G.cell - m * 2, G.cell - m * 2, G.cell * .16); c.stroke(); c.globalAlpha = 1;
    }
    // under the ball that is picked: a ring, so that it is clear whose turn it is to go even with the ball in the air
    if (picked >= 0 && shown[picked]) {
      const b = shown[picked], x = cx(b.x), y = cy(b.y), beat = .5 + .5 * Math.sin((t - b.pickT) / 190);
      if (P.under) P.under(c, x, y, G.cell, t - b.pickT, b.c);
      else { c.strokeStyle = accent; c.lineWidth = Math.max(1.5, G.cell * .035); c.globalAlpha = .5 + .35 * beat; oval(c, x, y + R * .86, R * (.88 + .08 * beat), R * (.3 + .03 * beat), 0); c.stroke(); c.globalAlpha = 1; }
    }
    // the way the picked ball would take to the square under the pointer
    if (way && way.length > 1) {
      for (let i = 1; i < way.length; i++) {
        const x = cx(xOf(way[i])), y = cy(yOf(way[i])), last = i === way.length - 1, wave = .5 + .5 * Math.sin(t / 150 - i * .9);
        c.fillStyle = accent; c.globalAlpha = last ? .9 : .28 + .4 * wave;
        disc(c, x, y, G.cell * (last ? .075 : .05)); c.fill();
        if (last) { c.strokeStyle = accent; c.lineWidth = Math.max(1.5, G.cell * .03); c.globalAlpha = .75; disc(c, x, y, G.cell * (.2 + .02 * wave)); c.stroke(); }
      }
      c.globalAlpha = 1;
    }
    if (kept.show === 'both' || kept.show === 'field') for (const s of seeds) {
      if (s.k <= 0) continue;
      const beat = 1 + .07 * Math.sin(t / 420 + s.at), q = artSize * s.k * beat, x = cx(s.x), y = cy(s.y) - (s.lift || 0) * G.cell;
      if (P.glow) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = P.glow.a * .5 * s.k; const g = artSize * .42 * beat; c.drawImage(glows[s.c], x - g / 2, y - g / 2, g, g); c.globalCompositeOperation = 'source-over'; }
      c.globalAlpha = Math.min(1, s.k) * .96; c.drawImage(seedsArt[s.c], x - q / 2, y - q / 2, q, q); c.globalAlpha = 1;
    }
    let top = null;
    for (let at = 0; at < CELLS; at++) {
      const b = shown[at]; if (!b) continue;
      const goal = b === warm ? 1 : 0;                   // the ball under the pointer swells a little, and settles when it is left
      if ((b.warm || 0) !== goal) b.warm = STILL.matches ? goal : clamp((b.warm || 0) + (goal ? 1 : -1) * dt * 9, 0, 1);
      if (b.picked) { top = b; continue; }
      paint(c, b, t);
    }
    if (top) paint(c, top, t);
    for (const b of extra) paint(c, b, t);
    if (P.over) P.over(c, G, t);
    drawBits(c, false);
  }

  /* ── what the rules' game is, laid on the table as it stands (no showing: a game come back to, a step taken back) ── */
  function lay(g, soft) {
    game = g; extra = []; way = null;
    for (let at = 0; at < CELLS; at++) {
      const c = g.board[at], b = shown[at];
      if (c < 0) { shown[at] = null; continue; }
      if (b && b.c === c && b.gone < 0) { b.x = xOf(at); b.y = yOf(at); b.k = 1; b.a = 1; b.sx = b.sy = 1; b.lift = 0; b.moving = false; b.picked = false; continue; }
      const nb = shown[at] = newBall(c, at);
      if (soft) { nb.k = .4; anim.run(240, u => { nb.k = lerp(.4, 1, ease.back(u)); }); }
    }
    picked = -1;
    seedsFrom(g, soft);
  }
  function seedsFrom(g, soft) {
    seeds = g.shown ? g.next.filter(n => g.board[n.at] < 0).map(n => ({ c: n.c, at: n.at, x: xOf(n.at), y: yOf(n.at), k: soft ? 0 : 1 })) : [];
    if (soft) seeds.forEach((s, i) => anim.run(260, u => { s.k = ease.back(u); }, { delay: 70 * i }));
  }

  /* ── showing what a move did ── */
  async function show(ev, hooks) {
    for (const e of ev) {
      if (e.type === 'move') await showMove(e);
      else if (e.type === 'clear') await showClear(e, hooks, ev[0].path[ev[0].path.length - 1]);
      else if (e.type === 'grow') await showGrow(e);
      else if (e.type === 'next') showNext(e, hooks);
    }
  }
  async function showMove(e) {
    const path = e.path, from = path[0], to = path[path.length - 1], steps = path.length - 1, b = shown[from] || newBall(e.colour, from);
    shown[from] = null; b.picked = false; b.moving = true; extra.push(b); picked = -1; way = null;
    let done = 0;
    await anim.run(clamp(100 + 46 * steps, 150, 520), u => {
      const d = u * steps, i = Math.min(steps - 1, Math.floor(d)), f = d - i;
      b.x = lerp(xOf(path[i]), xOf(path[i + 1]), f); b.y = lerp(yOf(path[i]), yOf(path[i + 1]), f); b.roll = d;
      for (; done < i + (f > .5 ? 1 : 0) && done < steps; done++) if (!quiet()) { audio.step(done); if (P.trail) P.trail(cx(xOf(path[done])), cy(yOf(path[done])), b.c, G.cell, done, path); }
    }, { ease: ease.io2 });
    b.x = xOf(to); b.y = yOf(to); b.moving = false; extra = extra.filter(o => o !== b); shown[to] = b;
    const hid = seeds.find(s => s.at === to); if (hid) hid.k = 0;                 // the small one it stopped on is under it now
    if (!quiet()) { audio.land(); if (P.land) P.land(cx(b.x), cy(b.y), b.c, G.cell); }
    anim.run(300, u => { const s = Math.exp(-5 * u) * Math.cos(u * 9); b.sy = 1 - .2 * s; b.sx = 1 + .13 * s; });
    await anim.wait(60);
  }
  async function showClear(e, hooks, last) {
    let longest = 0;
    e.groups.forEach((g, gi) => {
      const n = g.cells.length, from = e.by === 'move' && g.cells.includes(last) ? last : g.cells[0];
      const order = g.cells.slice().sort((a, b2) => Math.max(Math.abs(xOf(a) - xOf(from)), Math.abs(yOf(a) - yOf(from))) - Math.max(Math.abs(xOf(b2) - xOf(from)), Math.abs(yOf(b2) - yOf(from))) || a - b2);
      const start = gi * 140, gap = n > 6 ? 30 : 40;
      later(start, () => hooks.gain(g.points));
      order.forEach((at, j) => {
        const b = shown[at]; if (!b) return;
        later(start + j * gap, () => {
          shown[at] = null; extra.push(b); b.picked = false;
          if (!quiet()) { audio.pop(g.colour, j, n); P.burst(cx(b.x), cy(b.y), b.c, G.cell, n, G); }
          anim.run(P.leaveMs || 260, u => { b.gone = u; }).then(() => { extra = extra.filter(o => o !== b); });
        });
      });
      // what the line was worth, said where it stood
      let mx = 0, my = 0; for (const at of g.cells) { mx += xOf(at); my += yOf(at); }
      later(start + Math.min(n - 1, 3) * gap, () => { if (!quiet()) bit({ kind: 'text', text: '+' + g.points, x: clamp(cx(mx / n), G.cell, G.S - G.cell), y: clamp(cy(my / n), G.cell, G.S - G.cell), size: G.cell * (g.points > 12 ? .62 : .5), col: '#fffdf2', col2: alpha(shade(P.inks[g.colour], .55), .9), life: 1.05, fade: .35 }); });
      longest = Math.max(longest, start + (n - 1) * gap + (P.leaveMs || 260));
    });
    await anim.wait(longest + 40);
  }
  async function showGrow(e) {
    const moved = [];
    e.balls.forEach((nb, i) => {
      if (nb.from == null) return;
      // its square was taken by the ball that moved: it jumps out from under it to another
      let s = seeds.find(q => q.at === nb.from);
      if (!s) { s = { c: nb.c, at: nb.from, x: xOf(nb.from), y: yOf(nb.from), k: 1 }; seeds.push(s); }
      s.k = 1; s.at = nb.at;
      const x0 = s.x, y0 = s.y, x1 = xOf(nb.at), y1 = yOf(nb.at);
      moved.push(anim.run(clamp(140 + 26 * Math.hypot(x1 - x0, y1 - y0), 160, 360), u => { s.x = lerp(x0, x1, u); s.y = lerp(y0, y1, u); s.lift = Math.sin(u * Math.PI) * .55; }, { ease: ease.io2 }));
    });
    if (moved.length) await Promise.all(moved);
    e.balls.forEach((nb, i) => {
      later(i * 85, () => {
        seeds = seeds.filter(s => s.at !== nb.at);
        const b = shown[nb.at] = newBall(nb.c, nb.at);
        b.k = .36; b.sprout = 0;
        if (!quiet()) { audio.grow(i); if (P.rise) P.rise(cx(b.x), cy(b.y), b.c, G.cell); }
        anim.run(330, u => { b.k = lerp(.36, 1, ease.back(u)); b.sprout = clamp(u * 1.5, 0, 1); }).then(() => { b.k = 1; b.sprout = 1; });
      });
    });
    await anim.wait(2 * 85 + 330);
    seeds = [];
  }
  function showNext(e, hooks) {
    seeds = e.shown ? e.next.map(n => ({ c: n.c, at: n.at, x: xOf(n.at), y: yOf(n.at), k: 0 })) : [];
    seeds.forEach((s, i) => anim.run(300, u => { s.k = ease.back(u); }, { delay: 60 * i }));
    hooks.next(e.next);
  }

  /* ── picking, pointing ── */
  function pick(at, t) {
    if (picked >= 0 && shown[picked]) shown[picked].picked = false;
    picked = at; way = null;
    if (at >= 0 && shown[at]) { shown[at].picked = true; shown[at].pickT = STILL.matches ? 0 : t == null ? anim.now() : t; }
  }
  function jolt(at) { const b = shown[at]; if (b) b.jolt = anim.now(); }
  /** a square the ball cannot get to */
  function no(at) { bit({ kind: 'cross', x: cx(xOf(at)), y: cy(yOf(at)), size: G.cell * .13, w: Math.max(2, G.cell * .05), col: '#ff5a4d', life: .5, fade: .6, a: .95 }); }
  function point(at) {
    hover = at; warm = at >= 0 && shown[at] && !shown[at].picked ? shown[at] : null;
    way = picked >= 0 && at >= 0 && game && game.board[at] < 0 && !anim.busy() ? Lines.path(game, picked, at) : null;
    liveCv.style.cursor = at >= 0 && game && (game.board[at] >= 0 || way) ? 'pointer' : 'default';
  }
  function hit(e) {
    const r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * G.S - G.pad, y = (e.clientY - r.top) / r.height * G.S - G.pad;
    if (x < 0 || y < 0 || x >= G.cell * N || y >= G.cell * N) return -1;
    return Math.floor(y / G.cell) * N + Math.floor(x / G.cell);
  }
  let down = -1, dragged = false;
  box.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const at = hit(e); cursorOn = false; down = at; dragged = false;
    try { box.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that cannot be held is still a pointer */ }
    if (at >= 0) on.press(at);
    e.preventDefault(); box.focus({ preventScroll: true });
  });
  box.addEventListener('pointermove', e => {
    const at = hit(e);
    if (down >= 0 && at !== down && at >= 0) dragged = true;
    if (e.pointerType === 'mouse' || down >= 0) { if (at !== hover) point(at); }
  });
  box.addEventListener('pointerup', e => {
    const at = hit(e);
    if (down >= 0 && dragged && at >= 0 && at !== down) on.drop(at);       // a ball pressed, drawn to a square and let go
    down = -1; dragged = false;
    if (e.pointerType !== 'mouse') point(-1);
  });
  box.addEventListener('pointercancel', () => { down = -1; dragged = false; point(-1); });
  box.addEventListener('pointerleave', () => { if (down < 0) point(-1); });

  return {
    on, layout, draw, lay, show, pick, jolt, no, point,
    /** a place's table is set: its board painted, its balls made */
    set(placeDef) { P = placeDef; bits.length = 0; for (let i = 0; i < CELLS; i++) shown[i] = null; extra = []; seeds = []; picked = -1; way = null; layout(); },
    repaint() { if (P && G.S) art(); },
    picked: () => picked,
    /** what is shown on each square (for the scripts that check the table against the rules) */
    shownNow: () => shown.map(b => (b ? b.c : -1)),
    cursor: () => cursor,
    setCursor(at) { cursor = at; cursorOn = at >= 0; if (at >= 0) point(at); },
    geometry: () => G,
    /** a ball's picture, for the things beside the board that show one (the three to come, the rules) */
    ballArt: i => balls[i],
    /** the middle of a square, in the window's own measure */
    spot(at) { const r = box.getBoundingClientRect(); return [r.left + cx(xOf(at)) * r.width / G.S, r.top + cy(yOf(at)) * r.height / G.S]; },
    /** the game is over: the balls settle and pale, a row at a time */
    rest() { for (let at = 0; at < CELLS; at++) { const b = shown[at]; if (b) anim.run(520, u => { b.a = lerp(1, .58, u); b.k = lerp(1, .94, u); }, { delay: (xOf(at) + yOf(at)) * 34, ease: ease.out2 }); } seeds.forEach(s => anim.run(300, u => { s.k = 1 - u; })); },
    cheer(n) {      // bits thrown up from the whole board, when a best score falls
      for (let i = 0; i < n; i++) { const col = P.inks[i % 7]; bit({ kind: i % 3 ? 'petal' : 'star', x: Math.random() * G.S, y: G.S + 10, vx: (Math.random() - .5) * G.cell * 3, vy: -G.cell * (7 + Math.random() * 7), g: G.cell * 9, drag: .6, life: 1.6 + Math.random() * .9, wait: Math.random() * .5, size: G.cell * (.07 + Math.random() * .07), rot: Math.random() * TAU, spin: (Math.random() - .5) * 8, col, col2: tint(col, .4), fade: .3 }); }
    },
  };
})();
