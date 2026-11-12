/* ── Sounds: steel, shields and spells, synthesized with WebAudio ── */
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
  play(name) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'click': this.noise(0, 0.03, 0.05, 2500); break;
      case 'whoosh': this.noise(0, 0.18, 0.05, 1200); break;
      case 'card': this.noise(0, 0.08, 0.07, 1800); this.tone(660, 0.02, 0.06, 'triangle', 0.04); break;
      case 'draw': this.noise(0, 0.06, 0.05, 2600); this.tone(880, 0.01, 0.05, 'triangle', 0.03); break;
      case 'hit': this.noise(0, 0.12, 0.14, 700); this.tone(140, 0, 0.18, 'square', 0.06, -60); break;
      case 'shield': this.tone(520, 0, 0.22, 'triangle', 0.07, -80); this.tone(1240, 0, 0.12, 'square', 0.02); this.noise(0, 0.05, 0.06, 3000); break;
      case 'break': for (let i = 0; i < 5; i++) this.noise(i * 0.035, 0.09, 0.09, 2400 + i * 300); this.tone(300, 0, 0.25, 'sawtooth', 0.035, -180); break;
      case 'raise': this.tone(330, 0, 0.12, 'triangle', 0.06); this.tone(495, 0.08, 0.16, 'triangle', 0.06); break;
      case 'heal': [523, 784].forEach((f, i) => this.tone(f, i * 0.07, 0.25, 'sine', 0.07)); break;
      case 'turn': this.tone(392, 0, 0.18, 'triangle', 0.07); this.tone(523, 0.12, 0.25, 'triangle', 0.07); break;
      case 'magic': [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, i * 0.05, 0.22, 'sine', 0.04)); break;
      case 'fire': this.noise(0, 0.6, 0.16, 500, 'lowpass'); this.tone(90, 0, 0.6, 'sawtooth', 0.05, -40); break;
      case 'roar': this.tone(110, 0, 0.55, 'sawtooth', 0.07, -40); this.tone(165, 0.02, 0.5, 'sawtooth', 0.04, -50); this.noise(0, 0.4, 0.08, 400, 'lowpass'); break;
      case 'steal': this.tone(1046, 0, 0.08, 'triangle', 0.05); this.tone(784, 0.06, 0.1, 'triangle', 0.05); this.noise(0.02, 0.1, 0.05, 2200); break;
      case 'vanish': this.noise(0, 0.4, 0.06, 900, 'lowpass'); this.tone(660, 0, 0.4, 'sine', 0.04, -420); break;
      case 'swap': this.tone(440, 0, 0.18, 'sine', 0.06, 220); this.tone(660, 0.12, 0.18, 'sine', 0.06, -220); break;
      case 'bad': this.tone(196, 0, 0.18, 'sawtooth', 0.04, -40); break;
      case 'win': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.14, 0.6, 'triangle', 0.09)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, i * 0.28, 0.6, 'triangle', 0.09)); break;
    }
  },
};
