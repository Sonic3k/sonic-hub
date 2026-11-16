/* The few sounds a place makes, made here (no recordings). Call only from a tap or a click: browsers allow sound
   to start nowhere else. A device without sound stays silent and nothing else changes. */
let audio;

/** a spread chord, note after note (frequencies in Hz) */
export function chord(notes = [261.63, 329.63, 392.0, 493.88, 523.25]) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime + 0.02;
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), o2 = audio.createOscillator(), g = audio.createGain(), t = t0 + i * 0.11;
      o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.001;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
      o.connect(g); o2.connect(g); g.connect(audio.destination); o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
    });
  } catch { /* no sound on this device */ }
}
