/* The desktop icons, top to bottom then the next column, as Windows lines them up; one click selects, a double click
   (or a tap) opens. Shortcuts carry the little arrow — the system's own when its files have come. */
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { DeskItem } from '../api';
import { useAssets } from '../assets';
import { Glyph } from '../glyphs';
import { ICON_FOLDER, iconFiles, iconSet } from '../skin';

/** The grid Windows lines the icons up on (the icon, and where the first one sits), measured on his screenshots: XP on
 *  the family PC (6/8/2007), Vista (21/3/2009) and 7 (1/8/2013) on the HP; the systems' own spacing for the rest. */
const CELL: Record<string, { w: number; h: number; icon: number; top: number }> = {
  w98: { w: 75, h: 75, icon: 32, top: 2 }, xp: { w: 75, h: 75, icon: 32, top: 1 }, vista: { w: 75, h: 110, icon: 48, top: 0 },
  w7: { w: 75, h: 108, icon: 48, top: 4 }, w81: { w: 75, h: 108, icon: 48, top: 4 }, w10: { w: 76, h: 100, icon: 48, top: 2 },
  w11: { w: 76, h: 100, icon: 48, top: 2 },
};
/** the Fujitsu's icons stood further apart than XP's own spacing (his screenshot of 4/8/2007) */
const CELL_OF: Record<string, { w: number; h: number; icon: number; top: number }> = { 'pc-fujitsu': { w: 78, h: 82, icon: 32, top: 1 } };
const SYSTEM = new Set(['computer', 'documents', 'recycle', 'network', 'user-folder', 'control', 'heart-folder', 'sticky', 'folder', 'folder-pictures', 'folder-music']);
/** a shortcut carries the arrow — but not an icon cut from his screenshot, which still has the mark it had there */
const isShortcut = (it: DeskItem) => !SYSTEM.has(it.glyph ?? '') && !(it.glyph ?? '').startsWith('cut:') && !/\.(docx?|txt|jpe?g|png|exe|pptx?|rar|zip|pdf|xlsx?)$/i.test(it.label);

/** A name may break after an underscore, as Windows broke "EXCLUSIVE_Shane Filan" under its icon. */
const breakable = (label: string) => label.replace(/_(?=\S)/g, '_\u200b');

export function DesktopIcons({ items, skin, device, height, onOpen }: {
  items: DeskItem[]; skin: string; device?: string; height: number; onOpen: (it: DeskItem) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const cell = CELL_OF[device ?? ''] ?? CELL[skin] ?? CELL.xp;
  const rows = Math.max(1, Math.floor((height - cell.top + 2) / cell.h));
  const click = (it: DeskItem) => (e: MouseEvent) => {
    setSel(it.key);
    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') onOpen(it);
  };
  const key = (it: DeskItem) => (e: KeyboardEvent) => { if (e.key === 'Enter') onOpen(it); };
  return (
    <div className="dv-icons" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
      {items.map((it, i) => (
        <button type="button" key={it.key} className={`dv-icon ${sel === it.key ? 'sel' : ''}`}
          style={{ left: Math.floor(i / rows) * cell.w, top: cell.top + (i % rows) * cell.h, width: cell.w }}
          onClick={click(it)} onDoubleClick={() => onOpen(it)} onKeyDown={key(it)} title={it.label}>
          <span className="dv-icon-img">
            <Glyph name={it.glyph} label={it.label} size={cell.icon} />
            {isShortcut(it) && <ShortcutArrow skin={skin} device={device} size={cell.icon} />}
          </span>
          <span className="dv-icon-label">{breakable(it.label)}</span>
        </button>
      ))}
    </div>
  );
}

/** the machines whose shortcuts carried a mark of their own: the Fujitsu's small green one (his screenshots of 2007) */
const OWN_ARROW: Record<string, string> = { 'pc-fujitsu': 'fujitsu/shortcut' };

/** The arrow of a shortcut: the machine's own mark, else the system's overlay (as big as the icon, the arrow in its
 *  corner), or a drawn one. */
function ShortcutArrow({ skin, device, size }: { skin: string; device?: string; size: number }) {
  const mine = useAssets('machines');
  const own = OWN_ARROW[device ?? ''] ? mine.a(`${OWN_ARROW[device ?? '']}-32.png`) : undefined;
  const folder = ICON_FOLDER[skin];
  const { a, map } = useAssets(folder ?? 'xp');
  const files = folder ? iconFiles(map, 'icon/shortcut-arrow-overlay', size) : null;
  if (own) return <img className="dv-sc-own" src={own} width={size} height={size} alt="" draggable={false} />;
  if (files) {
    return <img className="dv-sc-own" src={a(files.one)} srcSet={iconSet(files, a)} width={size} height={size} alt="" draggable={false} />;
  }
  return <svg className="dv-sc" viewBox="0 0 10 10" aria-hidden="true"><rect x=".5" y=".5" width="9" height="9" fill="#fff" stroke="#777" /><path d="M3 7.5V5.2q0-1.8 1.8-1.8H7M5.6 2.2L7.2 3.4 5.6 4.6" fill="none" stroke="#1a4fd0" strokeWidth="1.3" /></svg>;
}
