/* ── Sounds, made with WebAudio: counters on a chart table, guns a long way off, a bosun's pipe for the results ── */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { } },
  noise(t0, dur, vol, f0, f1, type = 'bandpass', q = 0.9) {
    const c = this.ctx, n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  tone(f, t0, dur, vol = 0.07, type = 'triangle', f1 = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  knock(t0, vol, f = 190) { this.tone(f, t0, 0.11, vol, 'sine', f * 0.6); this.noise(t0, 0.025, vol * 0.6, 2600, 1100); },
  pipe(notes, vol = 0.05) { notes.forEach(([f, at, len]) => { this.tone(f, at, len, vol, 'sine'); this.tone(f * 2, at, len * 0.8, vol * 0.25, 'sine'); }); },
  play(name) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'pick': this.noise(0, 0.04, 0.03, 2200, 3000); break;
      case 'step': this.knock(0.12, 0.13); break;
      case 'sail': this.noise(0, 0.32, 0.035, 500, 900, 'bandpass', 2); this.knock(0.3, 0.09, 150); break;
      case 'fly': this.noise(0, 0.36, 0.05, 600, 2200, 'bandpass', 5); break;
      case 'mount': this.knock(0, 0.1, 240); this.knock(0.09, 0.12, 180); break;
      case 'gun': this.knock(0, 0.22, 110); this.noise(0, 0.2, 0.12, 900, 200, 'lowpass', 0.6); break;
      case 'strike': this.noise(0, 0.22, 0.07, 2600, 700, 'bandpass', 4); break;
      case 'boom': this.knock(0, 0.26, 85); this.noise(0.01, 0.34, 0.2, 1400, 140, 'lowpass', 0.5); break;
      case 'hero': this.pipe([[784, 0, 0.14], [988, 0.12, 0.14], [1175, 0.24, 0.3]]); break;
      case 'lock': this.tone(1320, 0, 0.07, 0.04, 'square'); this.tone(1320, 0.12, 0.07, 0.04, 'square'); break;
      case 'check': this.tone(660, 0, 0.12, 0.05, 'square'); this.tone(880, 0.13, 0.2, 0.05, 'square'); break;
      case 'no': this.tone(160, 0, 0.12, 0.05, 'sine'); break;
      case 'tick': this.noise(0, 0.03, 0.05, 3200, 2400); break;
      case 'card': this.noise(0, 0.12, 0.05, 1800, 4200, 'bandpass', 2); this.pipe([[1047, 0.1, 0.12], [1319, 0.2, 0.12], [1568, 0.3, 0.4]], 0.04); break;
      case 'win': this.pipe([[784, 0.2, 0.16], [784, 0.38, 0.16], [1047, 0.56, 0.2], [1319, 0.78, 0.2], [1568, 1.0, 0.6]]); break;
      case 'lose': this.pipe([[659, 0.2, 0.3], [587, 0.5, 0.3], [494, 0.8, 0.7]]); break;
      case 'draw': this.pipe([[659, 0.2, 0.25], [659, 0.5, 0.5]]); break;
    }
  },
};
