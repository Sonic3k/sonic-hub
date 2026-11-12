/* ── Sounds: drums, horns and steel, synthesized with WebAudio ── */
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
      case 'quill': this.noise(0, 0.09, 0.05, 3500); break;
      case 'coin': [1318, 1760].forEach((f, i) => this.tone(f, i * 0.06, 0.12, 'triangle', 0.06)); break;
      case 'bad': this.tone(196, 0, 0.18, 'sawtooth', 0.04, -40); break;
      case 'drum': [0, 0.18, 0.36, 0.48].forEach(t => { this.tone(70, t, 0.22, 'sine', 0.35, -30); this.noise(t, 0.08, 0.08, 400, 'lowpass'); }); break;
      case 'horn': this.tone(196, 0, 0.9, 'sawtooth', 0.05); this.tone(294, 0.05, 0.85, 'sawtooth', 0.035); this.tone(392, 0.5, 0.6, 'triangle', 0.04); break;
      case 'clash': for (let i = 0; i < 4; i++) { this.noise(i * 0.09, 0.12, 0.12, 3000); this.tone(1200 + i * 230, i * 0.09, 0.15, 'square', 0.02); } break;
      case 'age': [262, 330, 392, 523, 659].forEach((f, i) => this.tone(f, i * 0.12, 0.5, 'triangle', 0.08)); this.tone(131, 0, 1.2, 'sawtooth', 0.03); break;
      case 'win': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.14, 0.6, 'triangle', 0.09)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, i * 0.28, 0.6, 'triangle', 0.09)); break;
    }
  },
};
