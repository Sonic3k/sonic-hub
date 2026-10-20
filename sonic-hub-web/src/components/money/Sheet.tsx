/* The one sheet: from the bottom on a phone, centred on a wide screen. Focus stays inside while it is open and goes
   back to what opened it; Escape first undoes what is being typed (onEscape), then closes. Every sheet ends with one
   button that says what it changes (SheetFoot). */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clearToast } from './toast';

export function Sheet({ label, onClose, onEscape, children }: {
  label: string; onClose: () => void;
  /** return true when Escape was used up (an input being typed closed) */
  onEscape?: () => boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const keys = useRef({ onClose, onEscape });
  keys.current = { onClose, onEscape };

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    clearToast();
    document.body.classList.add('mn-locked');
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      const sh = ref.current;
      if (!sh) return;
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;              // an input inside used it (a new label being typed)
        e.preventDefault();
        if (!keys.current.onEscape?.()) keys.current.onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = [...sh.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === sh || !sh.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !sh.contains(a))) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('mn-locked');
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="mn-sheet-wrap" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="mn-sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>{children}</div>
    </div>,
    document.body,
  );
}

/** The sheet's last row: what saving will do, Cancel, and the one button that says what it changes. */
export function SheetFoot({ note, label, disabled, busy, onSave, onCancel }: {
  note?: string; label: string; disabled?: boolean; busy?: boolean; onSave: () => void; onCancel?: () => void;
}) {
  return (
    <div className="mn-sheet-foot">
      <span className="mn-foot-note">{note}</span>
      {onCancel && <button type="button" className="mn-link" onClick={onCancel}>Cancel</button>}
      <button type="button" className="mn-btn" disabled={disabled || busy} onClick={onSave}>{busy ? 'Saving…' : label}</button>
    </div>
  );
}
