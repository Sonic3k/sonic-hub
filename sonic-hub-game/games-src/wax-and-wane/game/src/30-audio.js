/* ── Sounds: a disc set down on the board, and small bells as the moons turn, synthesized with WebAudio ──
   A disc put down is a soft knock. Each moon that turns over rings one note, and the notes climb a scale as the turn
   runs along its line, so a long capture is heard as a run of bells: bright ones when the moons turn light, darker
   ones when they turn dark. */
const SFX = {
  ctx: null, on: true,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { /* no sound on this device */ } },
  /** a burst of filtered noise: the brush of a disc on the board */
  noise(t0, dur, vol, f0, f1, type = 'bandpass', q = 0.9) {
    const c = this.ctx, n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const k = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 1.6); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  tone(f, t0, dur, vol = 0.07, type = 'sine', f1 = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  /** a small bell: a struck tone with a few of the overtones a bell has, dying away */
  bell(t0, vol, f, len = 0.9) {
    for (const [ratio, amp, life] of [[1, 1, 1], [2.01, 0.42, 0.6], [2.98, 0.2, 0.38], [4.2, 0.1, 0.2]]) this.tone(f * ratio, t0, len * life, vol * amp);
  },
  /** a softer, woodier note for the moons that turn dark */
  chime(t0, vol, f, len = 0.5) { this.tone(f, t0, len, vol, 'triangle'); this.tone(f * 2, t0, len * 0.3, vol * 0.25); },
  /** the notes a run of turning moons climbs: five to the octave */
  note(i) { const steps = [0, 2, 4, 7, 9]; return Math.pow(2, (Math.floor(i / 5) * 12 + steps[i % 5]) / 12); },
  play(name, arg = 0) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (name) {
      case 'place': this.tone(190, 0, 0.14, 0.2, 'sine', 92); this.noise(0, 0.035, 0.1, 2600, 900); this.tone(520, 0, 0.05, 0.03, 'triangle'); break;
      // arg: { i: how far along its line, light: whether the moon turns light, at: seconds from now }
      case 'flip': { const i = Math.min(11, arg.i || 0); if (arg.light) this.bell(arg.at || 0, 0.05, 587.33 * this.note(i), 0.7); else this.chime(arg.at || 0, 0.075, 293.66 * this.note(i), 0.5); break; }
      case 'pass': this.tone(392, 0, 0.22, 0.05); this.tone(294, 0.16, 0.34, 0.05); break;
      case 'tick': this.noise(0, 0.03, 0.05, 3200, 2400); break;
      case 'pick': this.tone(880, 0, 0.09, 0.035, 'triangle'); break;
      case 'no': this.tone(165, 0, 0.13, 0.06, 'sine', 140); break;
      case 'start': [0, 2, 4, 5].forEach((n, i) => this.bell(i * 0.09, 0.04, 392 * this.note(n), 1.1)); break;
      case 'win': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(0.2 + i * 0.15, 0.06, f, 1.6)); break;
      case 'lose': [523.25, 440, 349.23, 293.66].forEach((f, i) => this.bell(0.2 + i * 0.22, 0.05, f, 1.5)); break;
      case 'draw': [587.33, 587.33, 783.99].forEach((f, i) => this.bell(0.2 + i * 0.26, 0.05, f, 1.3)); break;
    }
  },
};
const snd = (name, arg) => SFX.play(name, arg);
