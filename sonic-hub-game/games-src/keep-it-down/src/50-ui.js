/* ── The board on the page: laying it out, moving the pieces, showing where they may go ── */
const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** flip: the board is turned so that Dark sits at the bottom. pc: the piece standing on each square. */
const V = { flip: false, L: {}, pc: new Map() };

const colRow = s => (V.flip ? [7 - (s & 7), s >> 3] : [s & 7, 7 - (s >> 3)]);
const xy = s => { const [c, r] = colRow(s); return [c * U + 50, r * U + 50]; };
/** where on the screen a step in direction d goes, in squares */
const stepXY = d => { const v = [[0, -1], [0, 1], [1, 0], [-1, 0]][d]; return V.flip ? [-v[0], -v[1]] : v; };
/** the hinge of the Gate that stands on post s, and the way its leaf lies there */
const hinge = s => { const a = xy(s), b = xy(POST[s]); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
const quarter = (p, c) => (c[0] > p[0] ? (c[1] > p[1] ? 0 : 270) : (c[1] > p[1] ? 90 : 180));
const leafAngle = s => quarter(hinge(s), xy(s));
const leafAt = (s, cls) => { const p = hinge(s); return `<g transform="translate(${p[0]} ${p[1]}) rotate(${leafAngle(s)})"><path class="${cls}" transform="translate(${LEAF_IN} ${LEAF_IN})" d="${LEAF_PATH}"/></g>`; };

function buildBoard(flip) {
  V.flip = !!flip; V.pc.clear();
  const b = $('#board');
  b.setAttribute('viewBox', '0 0 800 800'); b.replaceChildren(); b.classList.remove('fade-out', 'mine');
  for (const name of ['grid', 'trace', 'under', 'pieces', 'fx', 'strike', 'over', 'cursor']) b.appendChild(V.L[name] = svg('g', { class: 'l-' + name }));
  let g = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) g += `<rect class="sq" x="${c * U}" y="${r * U}" width="${U}" height="${U}"/>`;
  for (let i = 1; i < 8; i++) g += `<path class="ln" d="M${i * U} 0V800M0 ${i * U}H800"/>`;
  for (const k of [3, 4, 59, 60]) { const [x, y] = xy(k); g += `<circle class="socket" cx="${x}" cy="${y}" r="33"/><circle class="socket in" cx="${x}" cy="${y}" r="25"/>`; }
  for (const home of [2, 5, 58, 61]) { const p = hinge(home); g += leafAt(home, 'post') + leafAt(POST[home], 'post') + `<circle class="pin" cx="${p[0]}" cy="${p[1]}" r="5.5"/>`; }
  V.L.grid.innerHTML = g;
}

function makePiece(p, s) {
  const kind = kindOf(p), side = sideOf(p), el = svg('g', { class: `pc k${kind} s${side}` });
  if (kind === GATE) { el.innerHTML = gateArt(side, leafAngle(s)); setAt(el, hinge(s)); }
  else { el.innerHTML = kind === RAM ? ramArt(side) : keepArt(side); setAt(el, xy(s)); }
  el.kind = kind; el.side = side;
  return el;
}
const setAt = (el, p, extra = '') => el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])})${extra}`);
const part = (el, cls) => el.querySelector('.' + cls);
/** pieces lower on the screen lie over the ones above them */
function restack() { [...V.pc.entries()].sort((a, b) => colRow(a[0])[1] - colRow(b[0])[1]).forEach(([, el]) => V.L.pieces.appendChild(el)); }

/** the board as position S has it, with nothing moving */
function placeAll(S) {
  V.pc.clear(); V.L.pieces.replaceChildren(); V.L.fx.replaceChildren();
  for (let s = 0; s < 64; s++) if (S.b[s]) V.pc.set(s, makePiece(S.b[s], s));
  restack(); markState(S);
}

/** What shows on a position without anyone asking: the Ram that was just shoved sits askew, a Keep that has heard
 *  something has its bell going, the last move leaves a trace, and a side that has lost stands back. */
function markState(S) {
  const loser = S.over && S.over.winner >= 0 ? S.over.loser : -1;
  for (const [s, el] of V.pc) {
    el.classList.toggle('lost', el.side === loser);
    if (el.kind === RAM) { const t = part(el, 'tilt'); if (s === S.koP && !S.over) t.setAttribute('transform', `rotate(${askew(s)})`); else t.removeAttribute('transform'); }
    else if (el.kind === KEEP) el.classList.remove('woken');
  }
  for (const k of wokenKeeps(S)) { const el = V.pc.get(k); if (el) el.classList.add('woken'); }
  const m = lastMove(S);
  let t = '';
  if (m >= 0 && m !== PASS_MOVE) {
    const kind = mKind(m), [x, y] = xy(mTo(m));
    if (kind === STRIKE) t = `<circle class="tr" cx="${x}" cy="${y}" r="27"/>`;
    else if (kind === SWING) t = leafAt(mFrom(m), 'tr');
    else { const [a, b] = xy(mFrom(m)); t = `<rect class="tr" x="${a - 31}" y="${b - 31}" width="62" height="62" rx="12"/>`; }
  }
  V.L.trace.innerHTML = t;
}
const askew = s => (((s * 7) & 1) ? 9 : -9);

/* ── movement ── */
const easeOut = t => 1 - Math.pow(1 - t, 3), easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
function tween(ms, step) {
  if (REDUCED) { step(1); return Promise.resolve(); }
  return new Promise(res => {
    const t0 = performance.now();
    const frame = now => { const t = Math.min(1, Math.max(0, (now - t0) / ms)); step(t); if (t < 1) requestAnimationFrame(frame); else res(); };
    requestAnimationFrame(frame);
  });
}
/** splinters flying off a piece that is taken */
function chips(p, side, n = 7) {
  if (REDUCED) return;
  const g = svg('g', { class: 'chips s' + side });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random(), d = 34 + Math.random() * 36, w = 5 + Math.random() * 7;
    g.appendChild(svg('rect', { x: f1(p[0] - w / 2), y: f1(p[1] - 2.5), width: f1(w), height: 5, rx: 1.2, style: `--dx:${f1(Math.cos(a) * d)}px;--dy:${f1(Math.sin(a) * d)}px;--r:${Math.round(Math.random() * 500 - 250)}deg` }));
  }
  V.L.fx.appendChild(g); setTimeout(() => g.remove(), 700);
}
/** a bell going: rings spreading out from a Keep */
function rings(s) {
  if (REDUCED) return;
  const [x, y] = xy(s), g = svg('g', { class: 'rings' });
  for (let i = 0; i < 3; i++) g.appendChild(svg('circle', { cx: x, cy: y, r: 30, style: `animation-delay:${i * 0.2}s` }));
  V.L.fx.appendChild(g); setTimeout(() => g.remove(), 1700);
}
/** how far a Ram can be pressed against what is behind it before there is nowhere left to go */
const slack = (S, anvil) => (anvil < 0 ? 18 : kindOf(S.b[anvil]) === RAM ? 36 : kindOf(S.b[anvil]) === KEEP ? 31 : 12);

/** Shows a move happening. ev comes from describe(), made on the position before the move; room is slack() for a crush. */
async function showMove(ev, room = 18) {
  const el = V.pc.get(ev.from), a = ev.what === 'pass' ? null : xy(ev.from), b = a && xy(ev.to);
  const lead = ev.lead || 0, go = (t, ease = easeOut) => lead + (1 - lead) * ease(t);   // a piece dragged part of the way starts from there
  switch (ev.what) {
    case 'step':
      V.pc.delete(ev.from); V.pc.set(ev.to, el); snd('step');
      await tween(170 - 90 * lead, t => setAt(el, mix(a, b, go(t))));
      break;
    case 'shove': {
      const v = V.pc.get(ev.to), c = xy(ev.pushedTo), tilt = part(v, 'tilt'), lean = askew(ev.pushedTo);
      V.pc.delete(ev.from); V.pc.set(ev.to, el); V.pc.set(ev.pushedTo, v); snd('shove');
      await tween(260, t => {                                  // the two blocks are 36 apart: after that they travel together
        const k = go(t) * 100, j = Math.max(0, k - 36) / 64;
        setAt(el, mix(a, b, k / 100)); setAt(v, mix(b, c, j)); tilt.setAttribute('transform', `rotate(${f1(lean * j)})`);
      });
      break;
    }
    case 'crush': case 'take': {
      const v = V.pc.get(ev.to), ux = (b[0] - a[0]) / 100, uy = (b[1] - a[1]) / 100, ram = v.kind === RAM;
      const touch = ram ? 36 : v.kind === KEEP ? 31 : 20, full = ram ? touch + room : touch;
      V.pc.delete(ev.from); V.pc.set(ev.to, el);
      snd(v.kind === KEEP ? 'fall' : ram ? 'crush' : 'break');
      const start = v.kind === GATE ? hinge(ev.to) : b;
      let burst = false;
      await tween(ram ? 340 : 420, t => {
        const k = go(t, ram ? easeOut : easeIO) * 100;
        setAt(el, mix(a, b, k / 100));
        if (k <= touch) return;
        if (!burst && k > full + 4) { burst = true; chips(b, sideOf(ev.victim), v.kind === KEEP ? 13 : 8); }
        if (ram) {                                             // pushed up against what is behind it, then squeezed flat
          const go = Math.min(k - touch, room), sq = k > full ? Math.max(0.04, 1 - (k - full) / (100 - full)) : 1, off = go + (1 - sq) * 32;
          setAt(v, [b[0] + ux * off, b[1] + uy * off], ` scale(${ux ? f1(sq * 100) / 100 : 1} ${uy ? f1(sq * 100) / 100 : 1})`);
          v.style.opacity = sq < 0.35 ? String(sq / 0.35) : '';
        } else {                                               // a Gate or a Keep stands where it is and gives way
          const q = (k - touch) / (100 - touch), sh = v.kind === KEEP ? Math.sin(q * 28) * 3 * (1 - q) : 0;
          setAt(v, [start[0] + sh, start[1]], v.kind === KEEP ? ` scale(${f1((1 - q * 0.75) * 100) / 100})` : '');
          v.style.opacity = String(Math.max(0, 1 - q * 1.25));
        }
      });
      v.remove();
      break;
    }
    case 'swing': case 'slam': {
      const v = ev.what === 'slam' ? V.pc.get(ev.to) : null, a0 = leafAngle(ev.from), p = hinge(ev.from);
      const turn = (a0 + 90) % 360 === quarter(p, xy(GATE_KEEP[ev.from])) ? -1 : 1;   // the way round that does not cross its Keep
      const rots = el.querySelectorAll('.rot'), tilt = part(el, 'tilt'), sh = part(el, 'sh');
      V.pc.delete(ev.from); V.pc.set(ev.to, el); V.L.pieces.appendChild(el);
      snd(v ? 'slam' : 'swing');
      let hit = false;
      await tween(440, t => {
        const k = easeIO(t), lift = Math.sin(Math.PI * k), ang = f1(a0 + turn * 180 * k);
        for (const r of rots) r.setAttribute('transform', `rotate(${ang})`);
        tilt.setAttribute('transform', `translate(0 ${f1(-9 * lift)})`); sh.setAttribute('transform', `translate(${f1(7 * lift)} ${f1(10 * lift)})`);
        if (v && k > 0.8) {
          if (!hit) { hit = true; chips(b, sideOf(ev.victim)); }
          const q = (k - 0.8) / 0.2; setAt(v, b, ` scale(${f1((1 - q) * 100) / 100})`); v.style.opacity = String(1 - q);
        }
      });
      tilt.removeAttribute('transform'); sh.removeAttribute('transform');
      if (v) v.remove();
      break;
    }
    case 'strike': {
      const v = V.pc.get(ev.to), ux = (b[0] - a[0]) / 100, uy = (b[1] - a[1]) / 100, ang = Math.atan2(uy, ux) * 180 / Math.PI;
      const bolt = svg('g', { class: 'bolt' }, [svg('path', { d: 'M-26 0H8' }), svg('path', { class: 'tip', d: 'M16 0L4 -6.5V6.5Z' })]);
      V.pc.delete(ev.to); V.L.fx.appendChild(bolt); snd('strike');
      await tween(130, t => setAt(bolt, mix(a, b, 0.18 + 0.72 * t), ` rotate(${f1(ang)})`));
      bolt.remove(); chips(b, sideOf(ev.victim), 9);
      await tween(230, t => { const k = easeOut(t); setAt(v, [b[0] + ux * 26 * k, b[1] + uy * 26 * k], ` rotate(${f1(70 * k)}) scale(${f1((1 - k * 0.6) * 100) / 100})`); v.style.opacity = String(1 - k); });
      v.remove();
      break;
    }
  }
  restack();
}

/* ── where a piece may go ── */
/** Marks every move of the piece on s, each in a group that knows its move. */
function showTargets(S, s) {
  const el = V.pc.get(s);
  let under = '', over = '';
  if (el) under += el.kind === GATE ? leafAt(s, 't-sel') : el.kind === KEEP ? ringMark(xy(s)[0], xy(s)[1], 46, 't-sel') : boxMark(xy(s)[0], xy(s)[1], 't-sel');
  for (const m of movesFrom(S, s)) {
    const ev = describe(S, m), [x, y] = xy(ev.to), open = `<g class="tg" data-m="${m}">`;
    if (ev.what === 'step') under += `${open}${dotMark(x, y)}</g>`;
    else if (ev.what === 'shove') { const p = xy(ev.pushedTo); over += `${open}${boxMark(x, y, 't-box')}${arrowMark(x, y, p[0], p[1], 't-arrow', 44, 26)}</g>`; }
    else if (ev.what === 'crush' || ev.what === 'take') {
      const d = stepXY(dirOf(ev.from, ev.to));
      over += open + (kindOf(ev.victim) === KEEP ? ringMark(x, y, 44, 't-box loud') : kindOf(ev.victim) === GATE ? leafAt(ev.to, 't-box loud') : boxMark(x, y, 't-box loud')) + anvilMark(x, y, d[0], d[1]);
      for (const k of ev.wakes) over += ringMark(xy(k)[0], xy(k)[1], 47, 't-wake');
      over += '</g>';
    } else if (ev.what === 'swing') under += `${open}${leafAt(ev.to, 't-leaf')}</g>`;
    else if (ev.what === 'slam') over += `${open}${leafAt(ev.to, 't-leaf loud')}${boxMark(x, y, 't-box loud')}</g>`;
    else if (ev.what === 'strike') over += `${open}${crossMark(x, y)}</g>`;
  }
  V.L.under.innerHTML = under; V.L.over.innerHTML = over;
  for (const [sq, p] of V.pc) p.classList.toggle('sel', sq === s);
}
function clearTargets() { V.L.under.replaceChildren(); V.L.over.replaceChildren(); for (const p of V.pc.values()) p.classList.remove('sel'); }
/** A Keep that may strike shows whom, without being asked. */
function showStrikes(S, on) {
  V.L.strike.innerHTML = on ? legalMoves(S).filter(m => mKind(m) === STRIKE).map(m => crossMark(...xy(mTo(m)))).join('') : '';
}
/** the mark for move m stands out (the pointer is on it, or a piece is being dragged that way) */
function setHot(m) { for (const g of document.querySelectorAll('#board .tg')) g.classList.toggle('hot', +g.dataset.m === m); }

/** the square under a pointer, or −1 */
function squareAt(ev) {
  const [x, y] = boardPoint(ev);
  if (x < 0 || y < 0 || x >= 800 || y >= 800) return -1;
  const c = Math.floor(x / U), r = Math.floor(y / U);
  return V.flip ? r * 8 + (7 - c) : (7 - r) * 8 + c;
}
function boardPoint(ev) { const r = $('#board').getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * 800, (ev.clientY - r.top) / r.height * 800]; }
/** a piece shakes its head */
function nudge(s) {
  const el = V.pc.get(s); snd('no');
  if (!el || REDUCED) return;
  el.classList.remove('no'); el.getBoundingClientRect(); el.classList.add('no'); setTimeout(() => el.classList.remove('no'), 320);
}
/** the square the keyboard is on */
function showCursor(s) {
  V.L.cursor.innerHTML = s < 0 ? '' : `<rect class="cur" x="${xy(s)[0] - 46}" y="${xy(s)[1] - 46}" width="92" height="92" rx="14"/>`;
}

/* ── the rules, each with a small board ── */
/** A corner of a board: w × h squares, a wall along one side ('t', 'b', 'r' or none), pieces and marks in its own coordinates. */
function scene(w, h, wall, pieces, marks = '', under = '') {
  const W = w * U, H = h * U, t = 30;
  let g = `<rect width="${W}" height="${H}" fill="url(#feltp)"/>`;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if ((r + c) % 2) g += `<rect class="sq" x="${c * U}" y="${r * U}" width="${U}" height="${U}"/>`;
  for (let i = 1; i < w; i++) g += `<path class="ln" d="M${i * U} 0V${H}"/>`;
  for (let i = 1; i < h; i++) g += `<path class="ln" d="M0 ${i * U}H${W}"/>`;
  g += under;
  for (const p of pieces) g += `<g class="pc k${p[0]} s${p[1]}${p[5] || ''}" transform="translate(${p[2]} ${p[3]})">${p[0] === RAM ? ramArt(p[1]) : p[0] === KEEP ? keepArt(p[1]) : gateArt(p[1], p[4])}</g>`;
  g += marks;
  if (wall === 'b') g += `<rect y="${H}" width="${W}" height="${t}" fill="url(#rimp)"/><path d="M0 ${H}H${W}" stroke="#2a180d" stroke-width="3"/><path d="M0 ${H + 2.5}H${W}" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>`;
  if (wall === 'r') g += `<rect x="${W}" width="${t}" height="${H}" fill="url(#rimp)"/><path d="M${W} 0V${H}" stroke="#2a180d" stroke-width="3"/><path d="M${W + 2.5} 0V${H}" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>`;
  if (wall === 't') g += `<rect y="${-t}" width="${W}" height="${t}" fill="url(#rimp)"/><path d="M0 0H${W}" stroke="#2a180d" stroke-width="3"/><path d="M0 2.500H${W}" stroke="#04121e" stroke-opacity=".3" stroke-width="5"/>`;
  return `<svg class="scene" viewBox="0 ${wall === 't' ? -t : 0} ${W + (wall === 'r' ? t : 0)} ${H + (wall === 'b' || wall === 't' ? t : 0)}" aria-hidden="true">${g}</svg>`;
}
function buildHelp() {
  const c = i => i * U + 50, L = LIGHT, D = DARK;
  const steps = [
    [scene(4, 2, 't', [[GATE, D, 100, 100, 180], [KEEP, D, c(1), c(0)], [KEEP, D, c(2), c(0)], [GATE, D, 300, 100, 270], [RAM, L, c(0), c(1)], [RAM, L, c(2), c(1)]]),
      '<b>Take both Keeps</b> on the other side to win. Each Keep has a Gate to guard it, and eight Rams go out to do the work. Light moves first.'],
    [scene(3, 3, '', [[RAM, L, c(1), c(1)]], '', [[1, 0], [0, 1], [2, 1], [1, 2]].map(p => dotMark(c(p[0]), c(p[1]))).join('')),
      'A <b>Ram</b> steps one square: forward, back or sideways.'],
    [scene(3, 2, '', [[RAM, L, c(0), c(0)], [RAM, D, c(1), c(0)], [RAM, D, c(0), c(1)], [RAM, L, c(2), c(1)]], boxMark(c(1), c(0), 't-box') + arrowMark(c(1), c(0), c(2), c(0), 't-arrow', 44, 26)),
      'Step into an enemy Ram and it is <b>shoved</b> one square on. A Ram that has just been shoved can’t shove straight back: it has to wait a turn.'],
    [scene(3, 2, 'r', [[RAM, L, c(1), c(0)], [RAM, D, c(2), c(0)], [RAM, L, c(0), c(1)], [RAM, D, c(1), c(1)], [RAM, D, c(2), c(1)]], boxMark(c(2), c(0), 't-box loud') + anvilMark(c(2), c(0), 1, 0) + boxMark(c(1), c(1), 't-box loud') + anvilMark(c(1), c(1), 1, 0)),
      '<b>No room behind it?</b> Then it is taken instead. The wall will do, and so will any piece, yours or theirs.'],
    [scene(3, 2, 't', [[KEEP, D, c(1), c(0)], [RAM, L, c(1), c(1)], [RAM, L, c(0), c(0), 0, ' dim']], ringMark(c(1), c(0), 44, 't-box loud') + anvilMark(c(1), c(0), 0, -1)),
      '<b>Gates and Keeps never budge</b>, but they fall the same way: push one that has something behind it. From the side, this Keep would stand: nothing is behind it there.'],
    [scene(3, 2, 'b', [[KEEP, L, c(1), c(1)], [GATE, L, 100, 100, 90], [RAM, D, c(1), c(0)]], `<g transform="translate(100 100) rotate(270)"><path class="t-leaf loud" transform="translate(${LEAF_IN} ${LEAF_IN})" d="${LEAF_PATH}"/></g>` + boxMark(c(1), c(0), 't-box loud')),
      'A <b>Gate</b> turns on its hinge between two posts: beside its Keep and in front of it. It takes a Ram that stands on the other post.'],
    [scene(3, 2, 'b', [[KEEP, L, c(1), c(1), 0, ' woken'], [RAM, D, c(0), c(1)], [RAM, D, c(2), c(0)]], crossMark(c(0), c(1))),
      'A <b>Keep</b> sleeps while Rams walk up to it. But take anything on a square next to it and <b>its bell rings</b>: on the very next move, and only then, it may strike that Ram off the board.'],
  ];
  $('#steps').innerHTML = steps.map(([art, text]) => `<div class="step">${art}<p>${text}</p></div>`).join('');
}
