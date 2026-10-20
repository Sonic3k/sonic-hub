/* The short confirmation after a save ("Saved for 3 transactions"): one at a time, gone after a moment. */
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

let current: { id: number; text: string } | null = null;
let timer = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

export function toast(text: string) {
  current = { id: Date.now(), text };
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { current = null; emit(); }, 2600);
  emit();
}

export function clearToast() {
  if (!current) return;
  window.clearTimeout(timer);
  current = null;
  emit();
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** Rendered once by the page, into <body> (the page's entrance animation would trap a fixed element). */
export function Toasts() {
  const t = useSyncExternalStore(subscribe, () => current);
  return createPortal(
    <div role="status" aria-live="polite">{t && <div key={t.id} className="mn-toast lb"><span>{t.text}</span></div>}</div>,
    document.body,
  );
}
