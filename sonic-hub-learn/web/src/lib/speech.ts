/* Pronunciation: recorded audio when the content has it, otherwise the browser's voice. */

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
if (supported) speechSynthesis.onvoiceschanged = () => {};

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.slice(0, 2).toLowerCase();
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(prefix));
  const rank = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online/i.test(v.name) ? 0 : 10) +
    (/google us english|samantha|aria|jenny|ava|zoe|daniel/i.test(v.name) ? 0 : 3) +
    (v.lang.toLowerCase() === lang.toLowerCase() ? 0 : 1);
  return voices.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

let current: HTMLAudioElement | null = null;

export function speak(opts: { text?: string | null; lang?: string | null; audioUrl?: string | null }): void {
  if (opts.audioUrl) {
    current?.pause();
    current = new Audio(opts.audioUrl);
    void current.play().catch(() => {});
    return;
  }
  if (!supported || !opts.text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(opts.text);
  u.lang = opts.lang || 'en-US';
  u.rate = 0.95;
  const v = pickVoice(u.lang);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
