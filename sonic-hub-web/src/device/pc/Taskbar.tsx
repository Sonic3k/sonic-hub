/* The taskbar of the machine: Start, the pinned programs and the open windows (buttons with titles up to Vista,
   icons from 7 on, centred on 11), the tray with its clock — T, running on; a click on it opens the time machine. */
import type { DeskItem } from '../api';
import { useAssets } from '../assets';
import { clockText, trayDate } from '../moment';
import { Glyph, Mark } from '../glyphs';
import { useWm, type Win } from './wm';
import { skinOf, showsDate, useDesk, useTick } from './desk';
import { specOf } from './registry';

/** The program a window belongs to on a taskbar of icons: chats with Yahoo, every folder with Explorer. */
const groupOf = (app: string, arg: Record<string, unknown>, glyph?: string | null) =>
  app === 'im' ? 'yahoo' : app === 'messages' ? `messages:${String(arg.platform ?? 'SMS')}` : app === 'browser' ? `browser:${glyph ?? ''}` : app;

export function Taskbar({ startOpen, timeOpen, onStart, onClock }: { startOpen: boolean; timeOpen: boolean; onStart: () => void; onClock: () => void }) {
  const { machine, os, ver, T, openItem } = useDesk();
  const skin = skinOf(os);
  const { wins, active, focus, minimize, minimizeAll } = useWm();
  const tick = useTick(T, 10_000);
  const icons = skin === 'w7' || skin === 'w81' || skin === 'w10' || skin === 'w11';
  const pins = machine.items.filter(i => i.place === 'TASKBAR');
  const toggle = (w: Win) => { if (active === w.id && !w.min) minimize(w.id); else focus(w.id); };
  const yahooOn = wins.some(w => w.app === 'yahoo' || w.app === 'im') || machine.items.some(i => i.place === 'STARTUP' && i.app === 'yahoo');
  const laptop = machine.device.kind === 'LAPTOP';

  const art = useStartArt(skin);
  const start = (
    <button type="button" className={`dv-start ${startOpen ? 'on' : ''}`} onClick={e => { e.stopPropagation(); onStart(); }} aria-label="Start">
      {skin === 'w98' ? <>{art ? <img className="dv-start-flag" src={art} alt="" /> : <Mark size={16} color="#000" />}<b>Start</b></>
        : skin === 'xp' ? <>{art ? <img className="dv-start-flag" src={art} alt="" /> : <Mark size={18} />}<i>start</i></>
        : skin === 'vista' || skin === 'w7' ? (art ? <span className="dv-orb real" style={{ backgroundImage: `url("${art}")` }} /> : <span className="dv-orb"><Mark size={20} /></span>)
        : skin === 'w81' && art ? <span className="dv-flat" style={{ backgroundImage: `url("${art}")` }} />
        : (skin === 'w10' || skin === 'w11') && art ? <span className={`dv-logo11 ${skin}`} style={{ WebkitMaskImage: `url("${art}")`, maskImage: `url("${art}")` }} />
        : <Mark size={skin === 'w11' ? 20 : 17} color={skin === 'w11' ? '#0067c0' : '#fff'} />}
    </button>
  );

  let apps;
  if (icons) {
    const groups = new Map<string, { pin?: DeskItem; wins: Win[] }>();
    for (const p of pins) {
      const s = specOf(p, os, ver);
      const g = s === 'time' ? `pin:${p.key}` : groupOf(s.app, s.arg ?? {}, p.glyph);
      if (!groups.has(g)) groups.set(g, { pin: p, wins: [] });
    }
    for (const w of wins) {
      const g = groupOf(w.app, w.arg, w.glyph);
      if (!groups.has(g)) groups.set(g, { wins: [] });
      groups.get(g)!.wins.push(w);
    }
    apps = [...groups.entries()].map(([g, { pin, wins: ws }]) => {
      const on = ws.some(w => w.id === active && !w.min);
      const top = ws.slice().sort((a, b) => b.z - a.z)[0];
      return (
        <button type="button" key={g} className={`dv-tk ${ws.length ? 'run' : ''} ${on ? 'on' : ''} ${ws.length > 1 ? 'many' : ''}`}
          title={top?.title ?? pin?.label} onClick={() => top ? toggle(top) : pin && openItem(pin)}>
          <Glyph name={pin?.glyph ?? top?.glyph} label={pin?.label ?? top?.title} size={skin === 'w7' || skin === 'w81' ? 32 : 24} />
        </button>
      );
    });
  } else {
    apps = <>
      {pins.length > 0 && <div className="dv-ql">{pins.map(p => <button type="button" key={p.key} title={p.label} onClick={() => openItem(p)}><Glyph name={p.glyph} label={p.label} size={16} /></button>)}</div>}
      {wins.map(w => (
        <button type="button" key={w.id} className={`dv-tb-btn ${w.id === active && !w.min ? 'on' : ''}`} onClick={() => toggle(w)} title={w.title}>
          <Glyph name={w.glyph} label={w.title} size={16} /><span>{w.title}</span>
        </button>
      ))}
    </>;
  }

  return (
    <footer className="dv-task" onClick={e => e.stopPropagation()}>
      {skin !== 'w11' && start}
      {skin === 'w10' && <div className="dv-search" onClick={onStart}><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.6" /><path d="M10 10l4.5 4.5" /></svg><span>Type here to search</span></div>}
      <div className="dv-task-apps">{skin === 'w11' && start}{apps}</div>
      <div className="dv-tray">
        {yahooOn && <span className="dv-tray-i" title="Yahoo! Messenger"><Glyph name="im-smile" size={16} /></span>}
        <span className="dv-tray-i" title="Network">{laptop ? <Wifi /> : <Net />}</span>
        <span className="dv-tray-i" title="Volume"><Speaker /></span>
        {laptop && skin !== 'w98' && skin !== 'xp' && <span className="dv-tray-i" title="Battery"><Battery /></span>}
        <button type="button" className={`dv-clock ${timeOpen ? 'on' : ''}`} onClick={e => { e.stopPropagation(); onClock(); }} title="Cỗ máy thời gian">
          <span>{clockText(tick)}</span>{showsDate(os) && <small>{trayDate(tick)}</small>}
        </button>
        {(skin === 'w7' || skin === 'w10' || skin === 'w11' || skin === 'w81') && <button type="button" className="dv-showdesk" onClick={minimizeAll} aria-label="Show desktop" />}
      </div>
    </footer>
  );
}

/** The picture Start was drawn with: 98's flag, XP's, the orb of Vista and 7 (normal, lit, pressed one above another),
 *  8.1's button, the flat logo of 10 and 11. */
function useStartArt(skin: string) {
  const w98 = useAssets('w98'), xp = useAssets('xp'), w7 = useAssets('w7'), w11 = useAssets('w11');
  switch (skin) {
    case 'w98': return w98.a('logo/flag.svg');
    case 'xp': return xp.a('icon/windows-logo-32.png');
    case 'vista': case 'w7': return w7.a('start/orb-96.png');
    case 'w81': return w7.a('start/flat-6801.png');
    default: return w11.a('logo/logo.svg');
  }
}

const Speaker = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" className="f" /><path d="M11 5.5q1.6 2.5 0 5M12.8 3.8q2.8 4.2 0 8.4" /></svg>;
const Wifi = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6q6.5-5.5 13 0M3.8 8.6q4.2-3.6 8.4 0M6 11.1q2-1.6 4 0" /><circle cx="8" cy="13.2" r="1.1" className="f" /></svg>;
const Net = () => <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="7" height="5.5" /><rect x="7.5" y="7.5" width="7" height="5.5" /><path d="M5 8v3h2.5" /></svg>;
const Battery = () => <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4.5" width="12" height="7" rx="1" /><rect x="3" y="6" width="7.5" height="4" className="f" /><path d="M14.5 6.8v2.4" /></svg>;
