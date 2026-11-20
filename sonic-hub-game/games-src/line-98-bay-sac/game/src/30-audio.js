/* ── sound: every note is made here as it is needed; nothing is recorded ──
   A place has a voice (what its notes are made of) and a scale. Each of the seven colours has a note of its own in
   that scale, so a ball picked up is heard as well as seen, and a line taken off is a run of notes going up. */
const audio = (() => {
  let ac = null, out = null, echo = null, voice = { kind: 'blip', root: 330, scale: [0, 2, 4, 7, 9], wet: .1 };
  function wake() {
    if (!kept.sound) return false;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ac = new AC(); } catch (e) { return false; }
      const squash = ac.createDynamicsCompressor();
      squash.threshold.value = -16; squash.ratio.value = 5; squash.attack.value = .004; squash.release.value = .2;
      out = ac.createGain(); out.gain.value = .55; out.connect(squash); squash.connect(ac.destination);
      // a soft echo that a place can send its notes through, more or less
      const d = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
      d.delayTime.value = .29; fb.gain.value = .36; lp.type = 'lowpass'; lp.frequency.value = 2100;
      echo = ac.createGain(); echo.gain.value = 1; echo.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out);
    }
    if (ac.state === 'suspended') ac.resume();
    return true;
  }
  /** the pitch of step n of the place's scale (n may run past its end: the scale goes on an octave up) */
  function pitch(n) { const s = voice.scale, k = ((n % s.length) + s.length) % s.length, oct = Math.floor(n / s.length); return voice.root * Math.pow(2, (s[k] + 12 * oct) / 12); }

  /** one sound: an oscillator (or several partials) with a rise and a fall. All times in seconds from now + at. */
  function osc(f, at, o) {
    const t = ac.currentTime + at + .005, g = ac.createGain(), v = o.vol == null ? .2 : o.vol, a = o.attack || .004, d = o.decay || .25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d);
    let last = g;
    if (o.lp) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = o.q || .7; lp.frequency.setValueAtTime(o.lp, t); if (o.lpTo) lp.frequency.exponentialRampToValueAtTime(o.lpTo, t + a + d * .7); g.connect(lp); last = lp; }
    last.connect(out);
    const wet = o.wet == null ? voice.wet : o.wet;
    if (wet > 0) { const s = ac.createGain(); s.gain.value = wet; last.connect(s); s.connect(echo); }
    for (const [mult, share, type] of o.parts || [[1, 1, o.type || 'sine']]) {
      const w = ac.createOscillator(), pg = ac.createGain();
      w.type = type || o.type || 'sine'; pg.gain.value = share;
      w.frequency.setValueAtTime(f * mult * (o.from || 1), t);
      if (o.from) w.frequency.exponentialRampToValueAtTime(f * mult, t + (o.glide || .06));
      if (o.to) w.frequency.exponentialRampToValueAtTime(f * mult * o.to, t + a + d);
      w.connect(pg); pg.connect(g); w.start(t); w.stop(t + a + d + .05);
    }
  }
  /** a breath of noise: the knock of wood, the click of glass */
  function hiss(at, o) {
    const t = ac.currentTime + at + .005, len = Math.ceil(ac.sampleRate * (o.decay || .05)), buf = ac.createBuffer(1, len, ac.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    src.buffer = buf; f.type = o.type || 'bandpass'; f.frequency.value = o.f || 2000; f.Q.value = o.q || 1; g.gain.value = o.vol || .1;
    src.connect(f); f.connect(g); g.connect(out); src.start(t);
  }
  /** a note in the place's own voice */
  function note(f, at, vol, long) {
    const v = vol == null ? .2 : vol, L = long || 1;
    switch (voice.kind) {
      case 'blip': osc(f, at, { type: 'square', vol: v * .42, decay: .11 * L, lp: 2600, lpTo: 900 }); break;
      case 'bell': osc(f, at, { vol: v, decay: .95 * L, parts: [[1, 1], [2.76, .32], [5.4, .13], [.5, .22]] }); break;
      case 'wood': osc(f, at, { vol: v * 1.1, decay: .22 * L, parts: [[1, 1], [3.9, .22], [9.2, .06]] }); hiss(at, { f: 1400, vol: v * .22, decay: .025 }); break;
      case 'glass': osc(f * 2, at, { vol: v * .75, decay: .38 * L, attack: .002, parts: [[1, 1], [2.41, .34], [4.2, .12]] }); hiss(at, { f: 6000, vol: v * .28, decay: .012, type: 'highpass' }); break;
      case 'drop': osc(f, at, { vol: v * 1.05, decay: .3 * L, from: 1.7, glide: .05, parts: [[1, 1], [2, .16]] }); break;
      case 'bubble': osc(f, at, { vol: v, decay: .16 * L, to: 1.75, parts: [[1, 1], [2, .1]] }); break;
      case 'pluck': osc(f, at, { type: 'triangle', vol: v * 1.25, decay: .5 * L, lp: 3600, lpTo: 500, q: 2.2, parts: [[1, 1, 'triangle'], [2, .3, 'sawtooth']] }); break;
      default: osc(f, at, { vol: v * .9, attack: .03, decay: 1.1 * L, parts: [[1, 1], [2, .28], [3, .08]] });       // air
    }
  }
  const on = fn => (...a) => { if (wake()) try { fn(...a); } catch (e) { /* a sound that fails is only a silence */ } };
  return {
    wake,
    /** the place whose voice is to be heard from now on */
    place(v) { voice = v; },
    pick: on(colour => note(pitch(colour), 0, .22)),
    /** a ball on its way: one light tap a square, a little higher each time */
    step: on(k => { const f = pitch(7) * Math.pow(2, Math.min(k, 14) / 24); osc(f, 0, { type: voice.kind === 'blip' ? 'square' : 'sine', vol: .028, decay: .03, wet: 0, lp: 3000 }); }),
    land: on(() => { osc(110, 0, { vol: .16, decay: .09, to: .6, wet: 0 }); hiss(0, { f: 500, vol: .05, decay: .03, type: 'lowpass' }); }),
    /** ball i of n in a line being taken off */
    pop: on((colour, i, n) => { note(pitch(colour + i), 0, .2 + .012 * i); if (i === n - 1 && n > 5) { note(pitch(colour + i + 2), .07, .15, 1.3); note(pitch(colour + i + 4), .14, .13, 1.5); } }),
    grow: on(i => note(pitch(i * 2 - 7), 0, .07, .55)),
    cant: on(() => { osc(150, 0, { type: 'triangle', vol: .15, decay: .09, wet: 0 }); osc(112, .085, { type: 'triangle', vol: .15, decay: .13, wet: 0 }); }),
    tap: on(() => osc(660, 0, { vol: .05, decay: .04, wet: 0 })),
    over: on(() => { [6, 4, 2, 0, -3].forEach((n, i) => note(pitch(n), i * .17, .17, 1.3)); }),
    best: on(() => { [0, 2, 4, 7, 9].forEach((n, i) => note(pitch(n), i * .085, .17, 1.2)); note(pitch(11), .5, .2, 2); }),
    starUp: on(k => { [0, 2, 4].forEach((n, i) => note(pitch(n + k * 2 + 3), i * .07, .16, 1.2)); }),
    travel: on(i => osc(392 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16][i % 8] / 12), 0, { vol: .1, decay: .5, parts: [[1, 1], [2, .25], [3, .08]], wet: .3 })),
    open: on(() => { [0, 4, 7].forEach((n, i) => note(pitch(n), i * .06, .13, 1.4)); }),
  };
})();
