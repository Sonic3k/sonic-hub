/* The desktop icons, top to bottom then the next column, as Windows lines them up; one click selects, a double click
   (or a tap) opens. Shortcuts carry the little arrow. */
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { DeskItem } from '../api';
import { Glyph } from '../glyphs';

const CELL: Record<string, { w: number; h: number; icon: number }> = {
  w98: { w: 75, h: 70, icon: 32 }, xp: { w: 78, h: 74, icon: 32 }, vista: { w: 80, h: 84, icon: 48 }, w7: { w: 80, h: 84, icon: 48 },
  w81: { w: 80, h: 84, icon: 48 }, w10: { w: 80, h: 86, icon: 48 }, w11: { w: 80, h: 86, icon: 48 },
};
const SYSTEM = new Set(['computer', 'documents', 'recycle', 'network', 'user-folder', 'control', 'heart-folder', 'sticky', 'folder', 'folder-pictures', 'folder-music']);
const isShortcut = (it: DeskItem) => !SYSTEM.has(it.glyph ?? '') && !/\.(docx?|txt|jpe?g|png|exe|pptx?|rar|zip|pdf|xlsx?)$/i.test(it.label);

export function DesktopIcons({ items, skin, height, onOpen }: { items: DeskItem[]; skin: string; height: number; onOpen: (it: DeskItem) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const cell = CELL[skin] ?? CELL.xp;
  const rows = Math.max(1, Math.floor((height - 6) / cell.h));
  const click = (it: DeskItem) => (e: MouseEvent) => {
    setSel(it.key);
    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') onOpen(it);
  };
  const key = (it: DeskItem) => (e: KeyboardEvent) => { if (e.key === 'Enter') onOpen(it); };
  return (
    <div className="dv-icons" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
      {items.map((it, i) => (
        <button type="button" key={it.key} className={`dv-icon ${sel === it.key ? 'sel' : ''}`}
          style={{ left: 2 + Math.floor(i / rows) * cell.w, top: 4 + (i % rows) * cell.h, width: cell.w - 4 }}
          onClick={click(it)} onDoubleClick={() => onOpen(it)} onKeyDown={key(it)} title={it.label}>
          <span className="dv-icon-img">
            <Glyph name={it.glyph} size={cell.icon} />
            {isShortcut(it) && <svg className="dv-sc" viewBox="0 0 10 10" aria-hidden="true"><rect x=".5" y=".5" width="9" height="9" fill="#fff" stroke="#777" /><path d="M3 7.5V5.2q0-1.8 1.8-1.8H7M5.6 2.2L7.2 3.4 5.6 4.6" fill="none" stroke="#1a4fd0" strokeWidth="1.3" /></svg>}
          </span>
          <span className="dv-icon-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
