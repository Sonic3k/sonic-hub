/* A window as the system of T draws it: title bar to drag (double-click to maximise), caption buttons, a corner to
   resize, its frame (XP's from Luna's own bitmaps). Apps inside can name their window (the folder, the page, the
   document they show). */
import { createContext, useContext, useEffect } from 'react';
import { Glyph } from '../glyphs';
import { useDrag, useWm, type AppDef, type Win } from './wm';

const WinCtx = createContext<Win | null>(null);
export const useWin = () => useContext(WinCtx);

/** The title of the window an app runs in, kept to what it shows. */
export function useWinTitle(title: string | null | undefined) {
  const win = useWin();
  const { setTitle } = useWm();
  const id = win?.id;
  useEffect(() => { if (id && title) setTitle(id, title); }, [id, title, setTitle]);
}

const Min = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 8h7" /></svg>;
const Max = () => <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" /></svg>;
const Restore = () => <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="3.2" width="5.3" height="5.3" /><path d="M3.2 3.2V1.5h5.3v5.3H6.8" /></svg>;
const Close = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" /></svg>;

export function Window({ win, def, small }: { win: Win; def: AppDef; small?: boolean }) {
  const { active, focus, close, minimize, toggleMax } = useWm();
  const move = useDrag(win, 'move'), size = useDrag(win, 'size');
  const on = active === win.id;
  const max = win.max || !!small;
  const style = max ? { zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };
  return (
    <section className={`dv-win dv-app-${win.app} ${on ? 'on' : ''} ${max ? 'max' : ''} ${win.min ? 'min' : ''}`} style={style}
      onPointerDownCapture={() => { if (!on) focus(win.id); }} aria-label={win.title}>
      <header className="dv-tb" onPointerDown={small ? undefined : move}
        onDoubleClick={e => { if (!small && !(e.target as HTMLElement).closest('button')) toggleMax(win.id); }}>
        {def.Title ? <def.Title win={win} on={on} fallback={<><Glyph name={win.glyph} label={win.title} size={16} className="dv-tb-icon" /><span className="dv-tt">{win.title}</span></>} />
          : <><Glyph name={win.glyph} label={win.title} size={16} className="dv-tb-icon" /><span className="dv-tt">{win.title}</span></>}
        <div className="dv-caps">
          <button type="button" className="dv-cap min" onClick={() => minimize(win.id)} aria-label="Minimize"><Min /></button>
          {!small && <button type="button" className="dv-cap max" onClick={() => toggleMax(win.id)} aria-label="Maximize">{max ? <Restore /> : <Max />}</button>}
          <button type="button" className="dv-cap close" onClick={() => close(win.id)} aria-label="Close"><Close /></button>
        </div>
      </header>
      <div className="dv-wb"><WinCtx.Provider value={win}>{def.render(win)}</WinCtx.Provider></div>
      {/* the frame's sides, for a theme that draws them with its own bitmaps (XP) */}
      <i className="dv-fr l" /><i className="dv-fr r" /><i className="dv-fr b" />
      {!max && <div className="dv-grip" onPointerDown={size} />}
    </section>
  );
}
