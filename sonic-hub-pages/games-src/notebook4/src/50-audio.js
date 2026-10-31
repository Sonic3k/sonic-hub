/* ── Audio: every sound is synthesized. Songs are chord charts + a lead line (16 steps/bar). ── */
const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function noteFreq(n) { const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n); if (!m) return 0; return 440 * Math.pow(2, (NOTE_IDX[m[1]] + (+m[2] + 1) * 12 - 69) / 12); }
function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function chordMidi(name, oct) {
  const m = /^([A-G](?:#|b)?)(m?)(7?)$/.exec(name);
  const root = NOTE_IDX[m[1]] + (oct + 1) * 12;
  const third = m[2] ? 3 : 4;
  return [root, root + third, root + 7, root + 12];
}
const SONGS = {
  title: { bpm: 84, chords: ['F', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gm', 'C'], leadWave: 'triangle', leadVol: 0.5,
    lead: 'A4 - - - C5 - - - D5 - C5 - A4 - - -|G4 - - - - - - - C5 - D5 - - - . .|F5 - - - D5 - - - C5 - - - A4 - - -|C5 - - - - - - - . . . . A4 - C5 -|D5 - - - F5 - - - D5 - C5 - A4 - - -|C5 - - - A4 - - - G4 - F4 - - - . .|G4 - - - A4 - - - C5 - A4 - G4 - - -|F4 - - - - - - - - - - - . . . .',
    bass: 'R - - - - - - - 5 - - - - - - -', arp: '1 3 5 8 5 3 1 3 5 8 5 3 1 3 5 3', drums: '' },
  meadow: { bpm: 132, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], leadWave: 'square',
    lead: 'E5 - G5 - A5 - G5 - E5 - - - D5 - C5 -|E5 - - - C5 - A4 - C5 - D5 - E5 - - -|A5 - C6 - A5 - G5 - F5 - - - A5 - G5 -|G5 - A5 - G5 - D5 - B4 - D5 - - - . .|C6 - - - G5 - E5 - G5 - A5 - G5 - E5 -|A5 - - - E5 - C5 - D5 - E5 - C5 - A4 -|F5 - E5 - D5 - C5 - D5 - - - A4 - C5 -|D5 - - - - - - - . . G4 - A4 - B4 -',
    bass: 'R . . R . . 5 . R . . R 5 . 8 .', arp: '', drums: 'k . h . s . h . k k h . s . h h' },
  desert: { bpm: 116, chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Gm', 'Bb', 'A'], leadWave: 'square',
    lead: 'D5 - F5 - A5 - - - G5 - F5 - E5 - F5 -|D5 - - - - - A4 - D5 - E5 - F5 - - -|D5 - F5 - Bb5 - - - A5 - G5 - F5 - - -|E5 - C#5 - E5 - A5 - G5 - F5 - E5 - - -|A5 - - - F5 - D5 - F5 - A5 - D6 - - -|C6 - Bb5 - A5 - G5 - Bb5 - A5 - G5 - - -|F5 - G5 - F5 - D5 - F5 - - - Bb4 - D5 -|C#5 - - - E5 - - - A4 - - - . . . .',
    bass: 'R . R . 5 . R . R . R . 5 . 8 .', arp: '', drums: 'k . . h s . k . k . h . s . h .' },
  night: { bpm: 100, chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B'], leadWave: 'triangle', leadVol: 0.55,
    lead: 'B5 - - - G5 - - - E5 - - - F#5 - G5 -|E5 - - - - - - - G5 - - - A5 - - -|B5 - - - D6 - - - B5 - A5 - G5 - - -|F#5 - - - - - - - A5 - - - D5 - - -|G5 - - - B5 - - - E6 - - - D6 - B5 -|C6 - - - B5 - - - G5 - - - E5 - - -|A5 - - - C6 - - - B5 - A5 - G5 - - -|F#5 - - - - - - - D#5 - - - . . . .',
    bass: 'R - - - - - - - 5 - - - 8 - - -', arp: '1 5 8 5 3 5 8 5 1 5 8 5 3 5 8 5', drums: '. . h . . . h . . . h . . . h .' },
  maze: { bpm: 90, chords: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'E'], leadWave: 'triangle', leadVol: 0.55, echo: true,
    lead: 'A4 - - - . . E5 - . . C5 - - - . .|. . A4 - C5 - - - F5 - - - E5 - - -|D5 - - - . . F5 - A5 - - - G5 - F5 -|E5 - - - - - - - G#4 - - - B4 - - -|A5 - - - . . E5 - . . C6 - B5 - A5 -|F5 - - - A5 - - - C6 - - - A5 - - -|D6 - - - C6 - A5 - F5 - - - D5 - - -|E5 - - - - - - - . . . . . . . .',
    bass: 'R - - - - - - - - - - - 5 - - -', arp: '1 . 5 . 8 . 5 . 3 . 5 . 8 . 5 .', drums: 'k . . . . . . . . . h . . . . .' },
  tower: { bpm: 124, chords: ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G'], leadWave: 'square', echo: true,
    lead: 'C5 - Eb5 - G5 - C6 - Bb5 - G5 - Eb5 - G5 -|Ab5 - - - G5 - Eb5 - C5 - Eb5 - Ab5 - - -|G5 - - - Bb5 - G5 - Eb5 - - - Bb4 - Eb5 -|F5 - - - D5 - Bb4 - D5 - F5 - Bb5 - - -|C6 - - - G5 - - - Eb5 - G5 - C6 - D6 -|Eb6 - - - C6 - Ab5 - G5 - - - Eb5 - - -|F5 - Ab5 - C6 - Ab5 - F5 - C5 - Ab4 - C5 -|B4 - - - D5 - - - G5 - - - F5 - D5 -',
    bass: 'R . R R . R 5 . R . R R . R 8 .', arp: '1 5 8 5 1 5 8 5 1 5 8 5 1 5 8 5', drums: 'k . h k s . h . k . h k s . h h' },
};
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];

class Audio {
  constructor() { this.ctx = null; this.sfxOn = true; this.musicOn = true; this.song = null; this.want = null; this.timer = null; this.ducked = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
      this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.42 : 0; this.sfxBus.connect(this.master);
      this.musBus = c.createGain(); this.musBus.gain.value = this.musicOn ? 0.2 : 0; this.musBus.connect(this.master);
      this.echo = c.createDelay(1); this.echo.delayTime.value = 0.33;
      const fb = c.createGain(); fb.gain.value = 0.32; this.echo.connect(fb); fb.connect(this.echo);
      const wet = c.createGain(); wet.gain.value = 0.35; this.echo.connect(wet); wet.connect(this.musBus);
      const len = c.sampleRate * 0.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      const mk = duty => { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); return c.createPeriodicWave(re, im); };
      this.pulse25 = mk(0.25); this.pulse12 = mk(0.125);
      if (this.want) this.music(this.want, true);
    } catch (e) { this.ctx = null; }
  }
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? 0.42 : 0; }
  setMusic(on) { this.musicOn = on; if (this.musBus) this.musBus.gain.setTargetAtTime(on ? (this.ducked ? 0.06 : 0.2) : 0, this.ctx.currentTime, 0.05); }
  duck(on) { this.ducked = on; if (this.musBus && this.musicOn) this.musBus.gain.setTargetAtTime(on ? 0.05 : 0.2, this.ctx.currentTime, 0.2); }
  osc(type, f0, f1, t0, dur, vol, bus, curve = 'exp') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    if (type === 'pulse') o.setPeriodicWave(this.pulse25); else if (type === 'pulse12') o.setPeriodicWave(this.pulse12); else o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); else o.frequency.linearRampToValueAtTime(f1, t0 + dur); }
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t0); o.stop(t0 + dur + 0.02);
    return o;
  }
  noise(t0, dur, vol, type, f0, f1, bus, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(f0, t0); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  sfx(name, arg = 0) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime + 0.005, O = (...a) => this.osc(...a), N = (...a) => this.noise(...a);
    switch (name) {
      case 'jump': O('pulse', 290, 640, t, 0.13, 0.16); break;
      case 'walljump': O('pulse', 380, 760, t, 0.11, 0.15); N(t, 0.05, 0.12, 'highpass', 3000); break;
      case 'land': N(t, 0.06, 0.18, 'lowpass', 700); break;
      case 'dash': N(t, 0.2, 0.3, 'bandpass', 2400, 500, null, 2); O('triangle', 220, 110, t, 0.16, 0.12); break;
      case 'spring': O('sine', 180, 880, t, 0.28, 0.25, null, 'lin'); O('square', 360, 1400, t, 0.12, 0.05); break;
      case 'fly': { const f = midiFreq(81 + PENTA[Math.min(arg, PENTA.length - 1)]); O('triangle', f, 0, t, 0.07, 0.2); O('triangle', f * 1.5, 0, t + 0.05, 0.12, 0.16); break; }
      case 'box': O('pulse', 520, 0, t, 0.05, 0.12); [0, 4, 7].forEach((s, i) => O('triangle', midiFreq(84 + s), 0, t + 0.05 + i * 0.05, 0.1, 0.16)); break;
      case 'star': [0, 4, 7, 12, 16].forEach((s, i) => { O('triangle', midiFreq(79 + s), 0, t + i * 0.06, 0.22, 0.2); O('sine', midiFreq(91 + s), 0, t + i * 0.06, 0.18, 0.06); }); break;
      case 'heart': [0, 7, 12].forEach((s, i) => O('sine', midiFreq(76 + s), 0, t + i * 0.07, 0.2, 0.2)); break;
      case 'key': [0, 12, 19].forEach((s, i) => O('sine', midiFreq(84 + s), 0, t + i * 0.03, 0.5, 0.14)); O('triangle', midiFreq(72), 0, t, 0.3, 0.1); break;
      case 'door': O('sine', 140, 55, t, 0.3, 0.35); N(t, 0.25, 0.2, 'lowpass', 500); [0, 5, 9].forEach((s, i) => O('triangle', midiFreq(76 + s), 0, t + 0.12 + i * 0.06, 0.3, 0.14)); break;
      case 'checkpoint': [0, 4, 7, 12].forEach((s, i) => O('triangle', midiFreq(72 + s), 0, t + i * 0.07, 0.45, 0.16)); break;
      case 'switch': O('square', arg ? 300 : 600, arg ? 600 : 300, t, 0.12, 0.1); N(t, 0.04, 0.2, 'highpass', 2000); O('triangle', 880, 0, t + 0.08, 0.15, 0.12); break;
      case 'bonk': O('square', 150, 110, t, 0.07, 0.12); break;
      case 'break': N(t, 0.3, 0.35, 'lowpass', 1600, 300); O('square', 120, 60, t, 0.12, 0.12); break;
      case 'crumble': N(t, 0.35, 0.2, 'lowpass', 900, 200); break;
      case 'stomp': O('square', 520 * Math.pow(1.12, Math.min(arg, 6)), 170, t, 0.12, 0.16); N(t, 0.06, 0.15, 'lowpass', 1200); break;
      case 'hurt': O('pulse', 460, 150, t, 0.28, 0.2); O('square', 230, 90, t, 0.25, 0.08); break;
      case 'die': [0, -3, -7, -12].forEach((s, i) => O('pulse', midiFreq(72 + s), 0, t + i * 0.11, 0.14, 0.16)); break;
      case 'warp': O('sine', 300, 1600, t, 0.25, 0.18); O('sine', 1600, 300, t + 0.22, 0.25, 0.14); break;
      case 'lantern': [0, 4, 7, 11, 14].forEach((s, i) => O('triangle', midiFreq(69 + s), 0, t + i * 0.09, 1.2, 0.12)); N(t, 1.2, 0.05, 'highpass', 6000); break;
      case 'clear': {
        const mel = [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [84, 0.5], [79, 0.72], [84, 0.84]];
        mel.forEach(([m, d]) => { O('pulse', midiFreq(m), 0, t + 0.5 + d, 0.2, 0.14); O('triangle', midiFreq(m - 12), 0, t + 0.5 + d, 0.22, 0.14); });
        break;
      }
      case 'ability': [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => O('pulse', midiFreq(72 + s), 0, t + i * 0.08, 0.14, 0.12)); break;
      case 'secret': [0, 3, 6, 9, 12, 15].forEach((s, i) => O('triangle', midiFreq(76 + s), 0, t + i * 0.06, 0.12, 0.14)); break;
      case 'hop': O('sine', 300, 520, t, 0.08, 0.06); break;
      case 'swoop': N(t, 0.35, 0.1, 'bandpass', 800, 2400, null, 3); break;
      case 'shoot': O('square', 700, 200, t, 0.12, 0.07); N(t, 0.1, 0.08, 'bandpass', 1500); break;
      case 'crack': N(t, 0.08, 0.12, 'highpass', 3000); break;
      case 'shatter': N(t, 0.2, 0.15, 'highpass', 2500); O('triangle', 1760, 1200, t, 0.12, 0.05); break;
      case 'wind': N(t, 1.6, 0.12, 'bandpass', 400, 900, null, 0.8); break;
      case 'select': O('pulse', 660, 0, t, 0.05, 0.1); break;
      case 'confirm': O('pulse', 520, 0, t, 0.06, 0.12); O('pulse', 780, 0, t + 0.06, 0.1, 0.12); break;
      case 'back': O('pulse', 520, 0, t, 0.06, 0.1); O('pulse', 390, 0, t + 0.06, 0.08, 0.1); break;
      case 'map': O('triangle', 440, 660, t, 0.1, 0.12); break;
    }
  }
  /* ── music ── */
  music(name, force) {
    this.want = name;
    if (!this.ctx) return;
    if (this.song && this.song.name === name && !force) return;
    if (this.song) { this.song.stop = true; this.song = null; }
    if (!name) return;
    const def = SONGS[name];
    const parseBar = s => s.trim().split(/\s+/);
    const song = { name, def, bar: 0, step: 0, next: this.ctx.currentTime + 0.08, stop: false,
      lead: def.lead.split('|').map(parseBar), bass: parseBar(def.bass), arp: def.arp ? parseBar(def.arp) : null, drums: def.drums ? parseBar(def.drums) : null };
    this.song = song;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  }
  tick() {
    const s = this.song, c = this.ctx;
    if (!s || !c) return;
    const spb = 60 / s.def.bpm / 4;
    while (s.next < c.currentTime + 0.12) {
      this.playStep(s, s.next, spb);
      s.next += spb; s.step++;
      if (s.step >= 16) { s.step = 0; s.bar = (s.bar + 1) % s.lead.length; }
    }
  }
  playStep(s, t, spb) {
    const d = s.def, bus = this.musBus, st = s.step;
    const bar = s.lead[s.bar], tok = bar[st];
    const hold = arr => { let n = 1; while (st + n < arr.length && arr[st + n] === '-') n++; return n; };
    if (tok && tok !== '-' && tok !== '.') {
      const f = noteFreq(tok), dur = hold(bar) * spb * 0.95, v = (d.leadVol || 0.32);
      this.voice(d.leadWave === 'square' ? 'pulse' : 'triangle', f, t, dur, v * 0.55, bus, true);
      if (d.echo) this.voice(d.leadWave === 'square' ? 'pulse' : 'triangle', f, t, dur, v * 0.3, this.echo, false);
    }
    const chord = chordMidi(d.chords[s.bar], 2);
    const bt = s.bass[st];
    if (bt && bt !== '-' && bt !== '.') {
      const m = bt === 'R' ? chord[0] : bt === '5' ? chord[0] + 7 : chord[0] + 12;
      this.voice('triangle', midiFreq(m), t, hold(s.bass) * spb * 0.9, 0.9, bus, false);
    }
    if (s.arp) {
      const at = s.arp[st];
      if (at && at !== '-' && at !== '.') { const ch = chordMidi(d.chords[s.bar], 4), m = { 1: ch[0], 3: ch[1], 5: ch[2], 8: ch[3] }[at]; this.voice('pulse12', midiFreq(m), t, spb * 0.8, 0.13, bus, false); }
    }
    if (s.drums) {
      const dt = s.drums[st];
      if (dt === 'k') { this.osc('sine', 150, 42, t, 0.14, 0.9, bus); }
      else if (dt === 's') { this.noise(t, 0.12, 0.35, 'bandpass', 1800, 0, bus, 0.7); this.osc('triangle', 190, 120, t, 0.06, 0.25, bus); }
      else if (dt === 'h') { this.noise(t, 0.035, 0.18, 'highpass', 7000, 0, bus); }
    }
  }
  voice(type, f, t, dur, vol, bus, vib) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    if (type === 'pulse') o.setPeriodicWave(this.pulse25); else if (type === 'pulse12') o.setPeriodicWave(this.pulse12); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (vib && dur > 0.3) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(t + 0.15); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vol * 0.6, t + Math.min(0.12, dur * 0.5));
    g.gain.setValueAtTime(vol * 0.6, t + Math.max(0.01, dur - 0.04));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.06);
  }
}
