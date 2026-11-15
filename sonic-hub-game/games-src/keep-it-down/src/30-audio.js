/* ── Sounds: wood on felt, and a brass bell, synthesized with WebAudio ──
   The game is about noise, so the sounds say it too: a step is barely there, a shove is a knock, and taking something
   is the loudest thing on the table until a bell answers it. */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { } },
  /** a burst of filtered noise: a slide, a crack, a rattle */
  noise(t0, dur, vol, f0, f1, type = 'bandpass', q = 0.9) {
    const c = this.ctx, n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const k = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 1.6); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  tone(f, t0, dur, vol = 0.07, type = 'triangle', f1 = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  /** wood meeting wood: a low thump with a click on top */
  knock(t0, vol, f = 170) { this.tone(f, t0, 0.13, vol, 'sine', f * 0.55); this.noise(t0, 0.03, vol * 0.7, 2400, 900); },
  /** a small brass bell: a struck tone with the overtones a bell has, dying away */
  bell(t0, vol, f = 1320, len = 1.5) {
    for (const [ratio, amp, life] of [[0.5, 0.25, 1], [1, 1, 1], [1.19, 0.5, 0.75], [1.5, 0.4, 0.6], [2, 0.55, 0.5], [2.51, 0.28, 0.35], [3.01, 0.2, 0.25], [4.1, 0.12, 0.16]])
      this.tone(f * ratio, t0, len * life, vol * amp, 'sine');
    this.noise(t0, 0.02, vol * 0.5, 5200, 3000);
  },
  play(name) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'step': this.noise(0, 0.1, 0.035, 900 + Math.random() * 200, 420); break;
      case 'shove': this.noise(0, 0.09, 0.04, 900, 450); this.knock(0.07, 0.13, 190); break;
      case 'crush': this.knock(0.02, 0.22, 150); this.noise(0.03, 0.16, 0.2, 3200, 700, 'highpass', 0.5); this.knock(0.1, 0.12, 110); break;
      case 'break': this.knock(0.02, 0.26, 120); this.noise(0.03, 0.3, 0.24, 2600, 380, 'bandpass', 0.6); this.knock(0.13, 0.16, 90); break;
      case 'fall': this.knock(0.02, 0.3, 95); this.noise(0.04, 0.6, 0.22, 1500, 160, 'lowpass', 0.5); this.bell(0.05, 0.07, 392, 1.6); this.knock(0.24, 0.2, 70); break;
      case 'swing': this.noise(0, 0.28, 0.035, 500, 1400, 'bandpass', 6); this.knock(0.33, 0.17, 130); break;
      case 'slam': this.noise(0, 0.28, 0.035, 500, 1400, 'bandpass', 6); this.knock(0.33, 0.24, 120); this.noise(0.34, 0.14, 0.16, 3000, 800, 'highpass', 0.5); break;
      case 'bell': this.bell(0, 0.075); this.bell(0.2, 0.06); this.bell(0.4, 0.05); break;
      case 'strike': this.noise(0, 0.12, 0.09, 1400, 5200, 'bandpass', 1.6); this.knock(0.12, 0.24, 210); this.noise(0.13, 0.12, 0.14, 3400, 900, 'highpass', 0.5); break;
      case 'tick': this.noise(0, 0.03, 0.05, 3200, 2400); break;
      case 'lift': this.noise(0, 0.04, 0.03, 2000, 2800); break;
      case 'no': this.tone(170, 0, 0.12, 0.05, 'sine'); break;
      case 'win': [659, 784, 988, 1319].forEach((f, i) => this.bell(0.35 + i * 0.16, 0.05, f, 1.3)); break;
      case 'lose': [523, 440, 349].forEach((f, i) => this.bell(0.35 + i * 0.26, 0.05, f, 1.5)); break;
      case 'draw': [587, 587].forEach((f, i) => this.bell(0.3 + i * 0.3, 0.045, f, 1.2)); break;
    }
  },
};
