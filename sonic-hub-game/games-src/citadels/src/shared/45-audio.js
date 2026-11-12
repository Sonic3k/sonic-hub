/* ── Sounds: coins, cards, stone and bells, synthesized with WebAudio ── */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { } },
  tone(f, t0, dur, type = 'sine', vol = 0.12, slide = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(t0, dur, vol = 0.1, freq = 900, type = 'highpass') {
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = type; f.frequency.value = freq; g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  /* a struck bell: a few inharmonic partials that ring out */
  bell(f, t0 = 0, vol = 0.07, dur = 1.1) { [[1, 1], [2.76, 0.45], [5.4, 0.22], [0.5, 0.35]].forEach(([k, a]) => this.tone(f * k, t0, dur * (k < 1 ? 1.2 : 1 / Math.sqrt(k)), 'sine', vol * a)); },
  coin(t0 = 0, f = 2100) { this.tone(f, t0, 0.09, 'triangle', 0.05); this.tone(f * 1.5, t0 + 0.035, 0.14, 'sine', 0.035); this.noise(t0, 0.03, 0.03, 5000); },
  play(name, k) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'click': this.noise(0, 0.03, 0.05, 2500); break;
      case 'whoosh': this.noise(0, 0.18, 0.05, 1200); break;
      case 'card': this.noise(0, 0.08, 0.07, 1800); this.tone(660, 0.02, 0.06, 'triangle', 0.04); break;
      case 'draw': this.noise(0, 0.06, 0.05, 2600); this.tone(880, 0.01, 0.05, 'triangle', 0.03); break;
      case 'coin': this.coin(); break;
      case 'coins': for (let i = 0; i < Math.min(k || 3, 6); i++) this.coin(i * 0.06, 1900 + (i % 3) * 260); break;
      case 'pay': for (let i = 0; i < Math.min(k || 2, 5); i++) this.coin(i * 0.05, 1500 - i * 90); break;
      case 'build': this.noise(0, 0.14, 0.12, 300, 'lowpass'); this.tone(110, 0, 0.22, 'sine', 0.1, -30); this.tone(660, 0.12, 0.3, 'triangle', 0.05); this.tone(990, 0.2, 0.35, 'triangle', 0.04); break;
      case 'destroy': for (let i = 0; i < 6; i++) this.noise(i * 0.04, 0.12, 0.1, 500 + i * 160, i % 2 ? 'lowpass' : 'bandpass'); this.tone(90, 0, 0.4, 'sawtooth', 0.05, -40); break;
      case 'bell': this.bell(k || 660); break;
      case 'crown': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.07, 0.4, 'triangle', 0.06)); this.bell(1046, 0.28, 0.05, 0.8); break;
      case 'kill': this.tone(98, 0, 0.6, 'sawtooth', 0.06, -30); this.noise(0, 0.25, 0.08, 400, 'lowpass'); this.bell(220, 0.05, 0.05, 1.4); break;
      case 'steal': this.tone(1046, 0, 0.08, 'triangle', 0.05); this.tone(784, 0.06, 0.1, 'triangle', 0.05); this.noise(0.02, 0.1, 0.05, 2200); break;
      case 'magic': [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, i * 0.05, 0.22, 'sine', 0.04)); break;
      case 'seal': this.noise(0, 0.06, 0.08, 900, 'lowpass'); this.tone(196, 0, 0.12, 'square', 0.04, -40); break;
      case 'swap': this.tone(440, 0, 0.18, 'sine', 0.06, 220); this.tone(660, 0.12, 0.18, 'sine', 0.06, -220); break;
      case 'turn': this.bell(784, 0, 0.06, 0.9); this.tone(392, 0, 0.18, 'triangle', 0.06); this.tone(523, 0.12, 0.25, 'triangle', 0.06); break;
      case 'round': this.bell(392, 0, 0.08, 1.6); this.bell(523, 0.35, 0.06, 1.4); break;
      case 'bad': this.tone(196, 0, 0.18, 'sawtooth', 0.04, -40); break;
      case 'win': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.14, 0.6, 'triangle', 0.09)); this.bell(1046, 0.7, 0.06, 1.6); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, i * 0.28, 0.6, 'triangle', 0.09)); break;
    }
  },
};
