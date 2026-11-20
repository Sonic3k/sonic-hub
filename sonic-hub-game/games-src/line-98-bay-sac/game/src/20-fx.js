/* ── movement: things that change over a stretch of time, and the small bits that fly ── */

/* Everything that moves on the table is one of these: a stretch of time and what to do at each moment of it. What
   happened in the game is already settled when its showing begins, so the showing can always be cut short: a
   player who clicks while balls are still coming up is not kept waiting (hurry), and sees at once how things stand. */
const anim = (() => {
  let list = [], now = 0, rushing = false;
  /** runs step(0..1) over `ms`; resolves when done. o: { ease, delay } */
  function run(ms, step, o) {
    o = o || {};
    if (STILL.matches) ms *= o.keep ? 1 : .001;
    if (rushing || ms <= 0) { step(1); return Promise.resolve(); }
    return new Promise(done => list.push({ t0: now + (o.delay || 0) * (STILL.matches ? .001 : 1), ms, step, ease: o.ease || ease.lin, done }));
  }
  const wait = ms => run(ms, () => {});
  function tick(t) {
    now = t;
    if (!list.length) return;
    const running = list; list = [];
    for (const a of running) {
      if (t < a.t0) { list.push(a); continue; }
      const p = clamp((t - a.t0) / a.ms, 0, 1);
      a.step(a.ease(p));
      if (p >= 1) a.done(); else list.push(a);
    }
  }
  /** everything still moving jumps to its end, and whatever starts before calm() ends at once too */
  function hurry() {
    rushing = true;
    for (let guard = 0; list.length && guard < 50; guard++) { const running = list; list = []; for (const a of running) { a.step(1); a.done(); } }
  }
  function calm() { rushing = false; }
  return { run, wait, tick, hurry, calm, busy: () => list.length > 0, rushing: () => rushing, now: () => now };
})();

/* ── the small bits: what a ball leaves behind, what it turns into, the points it wins ──
   One list for the whole table. Each bit has a place, a speed, an age and a kind (how it is drawn); `under` ones
   are drawn beneath the balls (rings on water, stitches on cloth), the others over them. Sizes are in CSS pixels
   of the board, so a place gives them as shares of a square. */
const bits = [];
function bit(o) {
  if (bits.length > 700) return null;
  const b = { x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, age: 0, life: .6, wait: 0, size: 4, grow: 0, rot: 0, spin: 0, col: '#fff', kind: 'dot', a: 1, under: false, add: false, fadeIn: 0, fade: 1 };
  for (const k in o) b[k] = o[k];
  bits.push(b);
  return b;
}
function stepBits(dt) {
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    if (b.wait > 0) { b.wait -= dt; continue; }
    b.age += dt;
    if (b.age >= b.life) { bits.splice(i, 1); continue; }
    if (b.drag) { const k = Math.exp(-b.drag * dt); b.vx *= k; b.vy *= k; }
    b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt; b.size += b.grow * dt;
    if (b.sway) b.x += Math.sin(b.age * b.sway + b.rot) * b.swayBy * dt;
  }
}
function drawBits(c, under) {
  for (const b of bits) {
    if (b.under !== under || b.wait > 0) continue;
    const t = b.age / b.life;
    let a = b.a * (b.fadeIn && t < b.fadeIn ? t / b.fadeIn : 1) * (t > 1 - b.fade ? (1 - t) / b.fade : 1);
    if (a <= .004 || b.size <= 0) continue;
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    if (b.add) c.globalCompositeOperation = 'lighter';
    c.translate(b.x, b.y);
    const s = b.size;
    switch (b.kind) {
      case 'dot': c.fillStyle = b.col; disc(c, 0, 0, s); c.fill(); break;
      case 'glow': c.fillStyle = radial(c, 0, 0, 0, s, [[0, alpha(b.col, 1)], [.4, alpha(b.col, .45)], [1, alpha(b.col, 0)]]); c.fillRect(-s, -s, s * 2, s * 2); break;
      case 'ring': c.strokeStyle = b.col; c.lineWidth = b.w || 2; disc(c, 0, 0, s); c.stroke(); break;
      case 'shard': c.rotate(b.rot); c.fillStyle = b.col; c.beginPath(); c.moveTo(-s, s * .6); c.lineTo(s * .2, -s); c.lineTo(s, s * .5); c.closePath(); c.fill();
        if (b.col2) { c.fillStyle = b.col2; c.beginPath(); c.moveTo(-s, s * .6); c.lineTo(s * .2, -s); c.lineTo(s * .05, s * .1); c.closePath(); c.fill(); } break;
      case 'square': c.rotate(b.rot); c.fillStyle = b.col; c.fillRect(-s, -s, s * 2, s * 2); break;
      case 'petal': c.rotate(b.rot); c.scale(1, .55 + .45 * Math.abs(Math.cos(b.age * (b.flip || 5) + b.rot))); c.fillStyle = b.col;
        c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * .9, -s * .1, 0, s); c.quadraticCurveTo(-s * .9, -s * .1, 0, -s); c.fill();
        if (b.col2) { c.strokeStyle = b.col2; c.lineWidth = Math.max(.6, s * .12); c.beginPath(); c.moveTo(0, -s * .7); c.lineTo(0, s * .8); c.stroke(); } break;
      case 'star': twinkle(c, 0, 0, s, b.col, 1); break;
      case 'streak': { const v = Math.hypot(b.vx, b.vy) || 1, L = Math.min(s * 5, v * .05) + s; c.strokeStyle = b.col; c.lineWidth = s; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-b.vx / v * L, -b.vy / v * L); c.stroke(); break; }
      case 'drop': { const v = Math.hypot(b.vx, b.vy) || 1; c.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2); c.fillStyle = b.col; const L = 1 + Math.min(1.6, v * .004);
        c.beginPath(); c.moveTo(0, -s * L); c.quadraticCurveTo(s, s * .2, 0, s); c.quadraticCurveTo(-s, s * .2, 0, -s * L); c.fill(); break; }
      case 'bubble': c.strokeStyle = b.col; c.lineWidth = Math.max(1, s * .16); disc(c, 0, 0, s); c.stroke(); c.fillStyle = alpha('#ffffff', .16); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; disc(c, -s * .36, -s * .38, s * .2); c.fill(); break;
      case 'thread': c.rotate(b.rot); c.strokeStyle = b.col; c.lineWidth = b.w || 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-s, 0); c.bezierCurveTo(-s * .3, -s * (b.curl || .8), s * .3, s * (b.curl || .8), s, 0); c.stroke(); break;
      case 'cross': c.rotate(b.rot); c.strokeStyle = b.col; c.lineWidth = b.w || 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, s); c.moveTo(s, -s); c.lineTo(-s, s); c.stroke(); break;
      case 'dash': c.rotate(b.rot); c.strokeStyle = b.col; c.lineWidth = b.w || 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); break;
      case 'leaf': c.rotate(b.rot + Math.sin(b.age * 3 + b.rot) * .6); c.scale(1, .5 + .5 * Math.abs(Math.sin(b.age * (b.flip || 2.4) + b.rot))); c.fillStyle = b.col;
        c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * .7, s, 0); c.quadraticCurveTo(0, s * .7, -s, 0); c.fill(); break;
      case 'text': { const up = ease.out3(clamp(t * 2.2, 0, 1)), k = lerp(.5, 1, ease.back(clamp(t * 3.5, 0, 1)));
        c.scale(k, k); c.font = `600 ${s}px Fraunces, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineJoin = 'round'; c.lineWidth = Math.max(3, s * .2); c.strokeStyle = b.col2 || 'rgba(20,16,40,.7)'; c.strokeText(b.text, 0, -up * s * .9); c.fillStyle = b.col; c.fillText(b.text, 0, -up * s * .9); break; }
    }
    c.restore();
  }
}
/** n bits thrown out from a point, evenly round or within a spread; `make(angle, i)` gives what is particular to each */
function burstOf(n, x, y, make) { for (let i = 0; i < n; i++) { const a = (i + Math.random() * .8) / n * TAU; bit(Object.assign({ x, y }, make(a, i))); } }
