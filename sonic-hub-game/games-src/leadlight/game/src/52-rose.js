/* The Rose Window: the wheel of every attack. A needle of brass sweeps the window's rim, one turn in the time the
   player's hero and the table allow (the original's TimeFor1Spin, times the table's SpinFactor), starting from the
   top; where it stands when the player taps is the result. On her own attack the window shows where a hit and a
   critical lie; when she defends, where a block and a counter lie. What counts is the needle as it was drawn when
   she tapped, as in the original, which read it on the frame of the tap. */

const Rose = (() => {
  let base = null;
  const canvas = () => $('#rose-canvas');
  function window0(S) {
    const p = new Pane(S, S, 4242), c = S / 2, R = S * 0.47;
    p.leadW = S / 160;
    const g = p.g; g.clearRect(0, 0, S, S);
    for (let i = 0; i < 32; i++) p.glass(Shape.sector(c, c, R * 0.8, R, (i / 32) * TAU, ((i + 1) / 32) * TAU), i % 2 ? '#3a3448' : '#4a4258', { tex: 'ripple', edge: 0.3 });
    const petals = ['#be3a5e', '#e2a62e', '#2f62b4', '#3f7d52', '#d6773a', '#8f78d2'];
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * TAU, a1 = ((i + 1) / 12) * TAU;
      p.glass(Shape.sector(c, c, R * 0.42, R * 0.8, a0, a1), petals[i % 6], { tex: 'streak', glow: 0.15 });
      const a = (a0 + a1) / 2;
      p.glass(Shape.ellipse(c + Math.cos(a) * R * 0.61, c + Math.sin(a) * R * 0.61, R * 0.08, R * 0.08), '#fff0c4', { glow: 0.6, tex: 'mottle' });
    }
    for (let i = 0; i < 8; i++) p.glass(Shape.sector(c, c, R * 0.16, R * 0.42, (i / 8) * TAU + 0.2, ((i + 1) / 8) * TAU + 0.2), i % 2 ? '#f4dc9a' : '#f8e8bc', { tex: 'ripple', glow: 0.3 });
    p.glass(Shape.ellipse(c, c, R * 0.16, R * 0.16), '#c98a2e', { tex: 'mottle', glow: 0.4 });
    p.lightUp({ x: 0.5, y: 0.45, strength: 0.4, vignette: 0.1 });
    // round the corners off: only the window remains
    g.save(); g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(c, c, R + S * 0.012, 0, TAU); g.fill(); g.restore();
    g.save(); g.strokeStyle = '#2b2830'; g.lineWidth = S * 0.024; g.beginPath(); g.arc(c, c, R + S * 0.004, 0, TAU); g.stroke(); g.restore();
    return p.canvas;
  }
  const ang = f => -Math.PI / 2 + f * TAU;
  function frame(g, S, zones, attacking, at, settled) {
    const c = S / 2, R = S * 0.47;
    g.clearRect(0, 0, S, S);
    g.drawImage(base, 0, 0);
    const band = (from, to, color, glow) => {
      if (to <= from) return;
      g.save(); g.beginPath(); g.arc(c, c, R * 0.985, ang(from), ang(to)); g.arc(c, c, R * 0.8, ang(to), ang(from), true); g.closePath();
      g.fillStyle = color; g.shadowColor = glow; g.shadowBlur = S * 0.03; g.fill();
      g.lineWidth = S * 0.008; g.strokeStyle = '#2b2830'; g.shadowBlur = 0; g.stroke(); g.restore();
    };
    band(zones.hit[0], zones.hit[1], attacking ? 'rgba(255,206,92,0.92)' : 'rgba(110,170,240,0.92)', attacking ? '#ffd870' : '#8ec0ff');
    band(zones.crit[0], zones.crit[1], 'rgba(226,58,84,0.95)', '#ff6a7a');
    // the needle, with the blur of its sweep behind it
    const a = ang(at);
    if (!settled) {
      g.save(); g.beginPath(); g.moveTo(c, c); g.arc(c, c, R * 0.96, a - 0.9, a); g.closePath();
      const gr = g.createRadialGradient(c, c, R * 0.2, c, c, R); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,240,200,0.28)');
      g.fillStyle = gr; g.fill(); g.restore();
    }
    g.save(); g.translate(c, c); g.rotate(a);
    g.beginPath(); g.moveTo(-R * 0.1, -S * 0.016); g.lineTo(R * 0.98, 0); g.lineTo(-R * 0.1, S * 0.016); g.closePath();
    g.fillStyle = '#e6c06a'; g.strokeStyle = '#2b2830'; g.lineWidth = S * 0.007; g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, S * 0.032, 0, TAU); g.fillStyle = '#c99a3a'; g.fill(); g.stroke();
    g.restore();
  }
  /** spins the window for one attack. zones: from wheelZones. attacking: the player's own attack. auto: the
   *  window stops by itself. Resolves to 'Hit' | 'Crit' | 'Miss'. */
  function spin({ zones, attacking, auto, title }) {
    const cv = canvas(), g = cv.getContext('2d'), S = cv.width;
    if (!base) base = window0(S);
    const ov = $('#rose'), say = $('#rose-say'), hint = $('#rose-hint');
    say.textContent = title || (attacking ? 'Strike' : 'Defend');
    hint.textContent = auto ? 'The Rose Window stops by itself' : (attacking ? 'Tap to stop: gold strikes, red strikes twice as hard' : 'Tap to stop: blue blocks, red strikes back');
    for (const old of $$('.res', ov)) old.remove();
    ov.classList.add('on');
    const period = Math.max(0.05, zones.spin) * 1000;
    let t0 = null, shown = 0, done = false, raf = 0;
    return new Promise(resolve => {
      const tick = now => {
        if (done) return;
        if (t0 === null) t0 = now;
        shown = ((now - t0) / period) % 1;
        frame(g, S, zones, attacking, shown, false);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const stop = e => {
        if (done || t0 === null) return;
        if (e) { e.preventDefault(); e.stopPropagation(); }
        done = true; cancelAnimationFrame(raf);
        const at = shown, result = wheelResult(zones, at);
        frame(g, S, zones, attacking, at, true);
        cleanup();
        const words = attacking ? { Hit: 'Hit!', Crit: 'Critical!', Miss: 'Miss' } : { Hit: 'Blocked!', Crit: 'Countered!', Miss: 'Struck' };
        $('#rose-in').append(h('div.res', words[result]));
        setTimeout(() => { ov.classList.remove('on'); resolve(result); }, 750);
      };
      const key = e => { if (e.key === ' ' || e.key === 'Enter') stop(e); };
      const cleanup = () => { ov.removeEventListener('pointerdown', stop); removeEventListener('keydown', key); };
      ov.addEventListener('pointerdown', stop);
      addEventListener('keydown', key);
      if (auto) setTimeout(() => stop(null), 500 + Math.random() * 1100);
    });
  }
  return { spin };
})();
