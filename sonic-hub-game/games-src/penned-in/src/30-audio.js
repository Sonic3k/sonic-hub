/* ── Sounds: felt tip on paper, synthesized with WebAudio ── */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { } },
  /** a stroke: filtered noise that swells and dies, its pitch sliding a little like a tip dragged across paper */
  scratch(t0, dur, vol, f0, f1) {
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const k = i / n; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.pow(k, 0.7)); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  tone(f, t0, dur, vol = 0.07, type = 'triangle') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(name) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'stroke': this.scratch(0, 0.11, 0.11, 2600 + Math.random() * 500, 1900); break;
      case 'loop': this.scratch(0, 0.27, 0.1, 2100, 2900 + Math.random() * 400); break;
      case 'circle': this.scratch(0, 0.5, 0.1, 1800, 3000); break;
      case 'tick': this.scratch(0, 0.035, 0.06, 3600, 3200); break;
      case 'no': this.tone(180, 0, 0.12, 0.05, 'sine'); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25 + i * 0.11, 0.5)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.25 + i * 0.2, 0.6)); break;
    }
  },
};
