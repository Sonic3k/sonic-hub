/* ── Sounds: tiny synthesized cues, all generated with WebAudio ── */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { } },
  tone(f, t0, dur, type = 'sine', vol = 0.12, slide = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(t0, dur, vol = 0.1, hp = 900) {
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  play(name) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'click': this.tone(1400, 0, 0.04, 'square', 0.03); break;
      case 'ok': this.tone(880, 0, 0.09, 'triangle', 0.1); this.tone(1320, 0.07, 0.12, 'triangle', 0.08); break;
      case 'bad': this.tone(220, 0, 0.16, 'square', 0.05, -80); break;
      case 'delete': this.noise(0, 0.16, 0.12, 1800); this.tone(500, 0, 0.12, 'triangle', 0.05, -300); break;
      case 'lock': this.tone(300, 0, 0.05, 'square', 0.06); this.tone(180, 0.05, 0.08, 'square', 0.06); break;
      case 'pin': this.tone(1046, 0, 0.08, 'sine', 0.1); this.tone(1568, 0.05, 0.14, 'sine', 0.08); break;
      case 'coin': [988, 1318].forEach((f, i) => this.tone(f, i * 0.07, 0.14, 'square', 0.05)); break;
      case 'msg': this.tone(1175, 0, 0.12, 'sine', 0.12); this.tone(1568, 0.12, 0.2, 'sine', 0.1); break;
      case 'buzz': for (let i = 0; i < 8; i++) this.tone(70 + (i % 2) * 18, i * 0.06, 0.07, 'sawtooth', 0.07); break;
      case 'month': this.noise(0, 0.32, 0.06, 2500); this.tone(523, 0.12, 0.16, 'triangle', 0.06); this.tone(784, 0.22, 0.24, 'triangle', 0.06); break;
      case 'record': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, i * 0.09, 0.3, 'triangle', 0.1)); break;
      case 'party': [659, 784, 988, 784, 1175].forEach((f, i) => this.tone(f, i * 0.08, 0.18, 'square', 0.045)); break;
      case 'over': [392, 330, 262].forEach((f, i) => this.tone(f, i * 0.22, 0.4, 'triangle', 0.1)); break;
    }
  },
};
