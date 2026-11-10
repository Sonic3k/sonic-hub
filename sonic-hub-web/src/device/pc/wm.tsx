/* The window manager: which windows are open, where, in what order; dragging, resizing, minimising, maximising. */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentType, type PointerEvent as RPE, type ReactNode } from 'react';

export interface WinSpec {
  app: string; arg?: Record<string, unknown>; title?: string; glyph?: string;
  w?: number; h?: number; x?: number; y?: number; max?: boolean; dock?: 'right';
}
export interface Win {
  id: string; key: string; app: string; arg: Record<string, unknown>; title: string; glyph: string;
  x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean;
}
export interface AppDef {
  title: (arg: Record<string, unknown>) => string; glyph: string; w: number; h: number;
  render: (win: Win) => ReactNode;
  /** what the title bar shows instead of the icon and title, when the program drew its own (fallback: the usual) */
  Title?: ComponentType<{ win: Win; on: boolean; fallback: ReactNode }>;
}

interface Wm {
  wins: Win[]; active: string | null; area: { w: number; h: number }; scale: number;
  open: (spec: WinSpec) => void; close: (id: string) => void; focus: (id: string) => void;
  minimize: (id: string) => void; toggleMax: (id: string) => void; setTitle: (id: string, title: string) => void;
  place: (id: string, g: Partial<Pick<Win, 'x' | 'y' | 'w' | 'h'>>) => void; closeAll: () => void; minimizeAll: () => void;
}
const Ctx = createContext<Wm | null>(null);
export const useWm = () => useContext(Ctx)!;

/** scale: how much the screen is enlarged on the page (an old 800×600 screen shown bigger), so a drag follows the pointer */
/** dockInset: room kept on the right for the gadgets, so a window docked right (the buddy list) sits beside them;
 *  docked, a window stands as tall as the screen allows unless it asks for a height (his buddy list did) */
export function WmProvider({ apps, area, scale = 1, dockInset = 0, children }: {
  apps: Record<string, AppDef>; area: { w: number; h: number }; scale?: number; dockInset?: number; children: ReactNode;
}) {
  const [wins, setWins] = useState<Win[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const z = useRef(10), seq = useRef(0);

  const winsRef = useRef(wins);
  winsRef.current = wins;
  const cascade = useRef(0);

  const open = useCallback((spec: WinSpec) => {
    const def = apps[spec.app];
    if (!def) return;
    const arg = spec.arg ?? {};
    const { seq: _seq, ...same } = arg;   // a chat opened at another line is still the same window
    const key = `${spec.app}:${JSON.stringify(same)}`;
    const found = winsRef.current.find(w => w.key === key);
    if (found) {
      const zz = ++z.current;
      setActive(found.id);
      setWins(ws => ws.map(w => w.id === found.id ? { ...w, min: false, z: zz } : w));
      return;
    }
    const n = cascade.current++ % 8, small = area.w < 760;
    const w = Math.min(spec.w ?? def.w, area.w - 16), h = Math.min(spec.h ?? def.h, area.h - 16);
    const dockRight = spec.dock === 'right' && !small;
    const x = dockRight ? area.w - w - 10 - dockInset : spec.x ?? Math.max(8, Math.min(48 + n * 28 + (area.w > 1200 ? 120 : 0), area.w - w - 8));
    const y = dockRight ? 4 : spec.y ?? Math.max(6, Math.min(24 + n * 26, area.h - h - 8));
    const win: Win = { id: `w${++seq.current}`, key, app: spec.app, arg, title: spec.title ?? def.title(arg), glyph: spec.glyph ?? def.glyph,
      x, y, w, h: dockRight ? Math.min(area.h - 8, spec.h ?? area.h) : h, z: ++z.current, min: false, max: spec.max ?? small };
    winsRef.current = [...winsRef.current, win];
    setActive(win.id);
    setWins(ws => [...ws, win]);
  }, [apps, area.w, area.h, dockInset]);

  const close = useCallback((id: string) => { winsRef.current = winsRef.current.filter(w => w.id !== id); setWins(ws => ws.filter(w => w.id !== id)); }, []);
  const focus = useCallback((id: string) => {
    const zz = ++z.current;
    setActive(id);
    setWins(ws => ws.map(w => w.id === id ? { ...w, min: false, z: zz } : w));
  }, []);
  const minimize = useCallback((id: string) => { setActive(null); setWins(ws => ws.map(w => w.id === id ? { ...w, min: true } : w)); }, []);
  const toggleMax = useCallback((id: string) => { const zz = ++z.current; setWins(ws => ws.map(w => w.id === id ? { ...w, max: !w.max, z: zz } : w)); }, []);
  const setTitle = useCallback((id: string, title: string) => setWins(ws => ws.map(w => w.id === id && w.title !== title ? { ...w, title } : w)), []);
  const place = useCallback((id: string, g: Partial<Pick<Win, 'x' | 'y' | 'w' | 'h'>>) => setWins(ws => ws.map(w => w.id === id ? { ...w, ...g } : w)), []);
  const closeAll = useCallback(() => { winsRef.current = []; cascade.current = 0; setWins([]); }, []);

  const minimizeAll = useCallback(() => { setActive(null); setWins(ws => ws.map(w => ({ ...w, min: true }))); }, []);
  const value = useMemo(() => ({ wins, active, area, scale, open, close, focus, minimize, toggleMax, setTitle, place, closeAll, minimizeAll }),
    [wins, active, area, scale, open, close, focus, minimize, toggleMax, setTitle, place, closeAll, minimizeAll]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Drag a window by its title bar, or resize it by its corner; the pointer is captured so a fast move can't escape. */
export function useDrag(win: Win, mode: 'move' | 'size') {
  const { place, focus, area, scale } = useWm();
  return (e: RPE<HTMLElement>) => {
    if (e.button !== 0 || win.max) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    focus(win.id);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, { x, y, w, h } = win;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale, dy = (ev.clientY - sy) / scale;
      if (mode === 'move') place(win.id, { x: Math.min(Math.max(x + dx, 40 - w), area.w - 40), y: Math.min(Math.max(y + dy, 0), area.h - 24) });
      else place(win.id, { w: Math.max(260, w + dx), h: Math.max(160, h + dy) });
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
}
