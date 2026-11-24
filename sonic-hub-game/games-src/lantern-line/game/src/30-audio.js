/* ── Sounds: bamboo, paper catching light, and bells, synthesized with WebAudio ──
   A line is a strip of bamboo laid down: a small dry knock. A square taken is paper catching the light, a soft
   breath and a bell, and the bells of a run of squares climb the five notes of the scale one after another. */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { /* no sound here */ } },
  /** a burst of filtered noise */
  noise(t0, dur, vol, f0, f1, type = 'bandpass', q = 0.9) {
    const c = this.ctx, n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const k = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 1.5); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  tone(f, t0, dur, vol = 0.07, type = 'sine', f1 = 0, attack = 0.006) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  /** a small bell: a struck tone with a bell's overtones, dying away */
  bell(t0, f, vol, len = 1.6) {
    for (const [ratio, amp, life] of [[1, 1, 1], [2.01, 0.42, 0.6], [2.76, 0.28, 0.42], [4.07, 0.14, 0.26], [0.5, 0.18, 0.8]]) this.tone(f * ratio, t0, len * life, vol * amp, 'sine', 0, 0.003);
  },
  /** the five notes of the scale, climbing: the bell of the k-th square of a run */
  note(k) { const steps = [0, 2, 4, 7, 9]; return 523.25 * Math.pow(2, (steps[k % 5] + 12 * Math.floor(k / 5)) / 12); },
  play(name, k = 0) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'draw': { const f = 380 + Math.random() * 60; this.tone(f, 0, 0.09, 0.12, 'triangle', f * 0.7); this.noise(0, 0.035, 0.09, 2600, 1400); this.tone(f * 2.3, 0.004, 0.05, 0.03, 'sine'); break; }
      case 'take': this.noise(0, 0.32, 0.05, 500, 2600, 'bandpass', 1.2); this.tone(150, 0.02, 0.32, 0.12, 'sine', 70); this.bell(0.06, this.note(Math.min(k, 9)), 0.06); break;
      case 'double': this.noise(0, 0.36, 0.06, 500, 2800, 'bandpass', 1.2); this.tone(140, 0.02, 0.36, 0.14, 'sine', 66); this.bell(0.05, this.note(k), 0.06); this.bell(0.15, this.note(k + 1), 0.055); break;
      case 'start': [0, 1, 2, 3].forEach(i => this.bell(i * 0.11, this.note(i), 0.035, 1.2)); this.tone(98, 0, 1.4, 0.06, 'sine', 92, 0.02); break;
      case 'win': [0, 1, 2, 3, 4, 5, 7].forEach((n, i) => this.bell(i * 0.1, this.note(n), 0.045, 1.6)); this.tone(110, 0, 0.5, 0.18, 'sine', 55); this.tone(110, 0.42, 0.5, 0.14, 'sine', 55); break;
      case 'lose': [4, 2, 1, 0].forEach((n, i) => this.bell(i * 0.16, this.note(n) / 2, 0.04, 1.4)); break;
      case 'stamp': this.tone(120, 0, 0.22, 0.32, 'sine', 48); this.noise(0, 0.12, 0.22, 900, 200, 'lowpass', 0.7); this.noise(0.02, 0.05, 0.08, 3000, 1500); break;
      case 'no': this.tone(180, 0, 0.12, 0.08, 'triangle', 150); break;
    }
  },
};
