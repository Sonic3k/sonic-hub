/* The clock's time machine: the calendar of T's month, the time, a day back or ahead, a day at random, back to now,
   and the computers he had (each opens on its first day, or at T when he had it then too). Changing to another
   machine's time reboots into it. */
import { useState } from 'react';
import { cdn } from '../../api/client';
import { clockText, usedText, viLong, vn } from '../moment';
import { Glyph } from '../glyphs';
import { computersAt, useDesk, useTick } from './desk';

const pad = (n: number) => String(n).padStart(2, '0');
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function TimeMachine({ onClose }: { onClose: () => void }) {
  const { T, at: atNow, setAt, data, machine } = useDesk();
  const tick = useTick(T, 1000);
  const t = vn(T), now = vn(new Date());
  const [view, setView] = useState({ y: t.y, m: t.mo });
  const [day, setDay] = useState({ y: t.y, m: t.mo, d: t.d });
  const [time, setTime] = useState(`${pad(t.h)}:${pad(t.mi)}`);
  const go = (at: string, device?: string) => { setAt(at, device); onClose(); };
  const alsoNow = new Set(computersAt(data.machines, T).map(m => m.key));
  const at = (y: number, m: number, d: number, hm: string) => `${y}-${pad(m + 1)}-${pad(d)}T${hm}`;
  const byDays = (n: number) => { const x = vn(new Date(T.getTime() + n * 86400_000)); go(at(x.y, x.mo, x.d, `${pad(x.h)}:${pad(x.mi)}`)); };
  const random = () => {
    const from = Date.UTC(2003, 0, 1), to = Date.now();
    const x = vn(new Date(from + Math.random() * (to - from)));
    go(at(x.y, x.mo, x.d, `${pad(19 + Math.floor(Math.random() * 4))}:${pad(Math.floor(Math.random() * 60))}`));
  };
  const month = (n: number) => setView(v => { const d = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const future = (d: number) => view.y > now.y || (view.y === now.y && (view.m > now.mo || (view.m === now.mo && d > now.d)));
  const years: number[] = [];
  for (let y = now.y; y >= 1998; y--) years.push(y);
  const computers = data.machines.filter(m => m.kind !== 'PHONE');
  return (
    <div className="dv-time" onClick={e => e.stopPropagation()} role="dialog" aria-label="Cỗ máy thời gian">
      <div className="dv-time-now">
        <b>{clockText(tick, true)}<small>:{pad(Math.floor(tick.getTime() / 1000) % 60)}</small></b>
        <span>{viLong(T)}</span>
      </div>
      <div className="dv-time-cal">
        <div className="dv-time-mh">
          <button type="button" onClick={() => month(-1)} aria-label="Tháng trước">‹</button>
          <span>Tháng {view.m + 1}</span>
          <select value={view.y} onChange={e => setView(v => ({ ...v, y: +e.target.value }))} aria-label="Năm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => month(1)} aria-label="Tháng sau">›</button>
        </div>
        <div className="dv-time-grid">
          {WD.map(w => <i key={w}>{w}</i>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: count }, (_, i) => i + 1).map(d => {
            const sel = day.y === view.y && day.m === view.m && day.d === d;
            const isT = t.y === view.y && t.mo === view.m && t.d === d;
            return <button type="button" key={d} disabled={future(d)} className={`${sel ? 'sel' : ''} ${isT ? 'cur' : ''}`}
              onClick={() => setDay({ y: view.y, m: view.m, d })} onDoubleClick={() => go(at(view.y, view.m, d, time))}>{d}</button>;
          })}
        </div>
        <div className="dv-time-go">
          <input type="time" value={time} onChange={e => setTime(e.target.value || '20:00')} aria-label="Giờ" />
          <button type="button" className="dv-time-primary" onClick={() => go(at(day.y, day.m, day.d, time))}>Đi tới {day.d}/{day.m + 1}/{day.y}</button>
        </div>
        <div className="dv-time-quick">
          <button type="button" onClick={() => byDays(-1)}>−1 ngày</button>
          <button type="button" onClick={() => byDays(1)}>+1 ngày</button>
          <button type="button" onClick={random}>Ngày ngẫu nhiên</button>
          <button type="button" onClick={() => go(at(now.y, now.mo, now.d, `${pad(now.h)}:${pad(now.mi)}`))}>Bây giờ</button>
        </div>
      </div>
      <div className="dv-time-machines">
        <h4>Các máy tính đã dùng</h4>
        {computers.map(m => {
          const f = m.from ? vn(new Date(`${m.from}Z`)) : null;
          const cur = m.key === machine.device.key, same = !cur && alsoNow.has(m.key);
          return (
            <button type="button" key={m.key} className={cur ? 'cur' : ''} disabled={!f && !same}
              onClick={() => (same ? go(atNow, m.key) : f && go(at(f.y, f.mo, f.d, '20:00'), m.key))}>
              <span className="dv-time-ph">{m.photoUrl ? <img src={cdn(m.photoUrl, 160)} alt="" /> : <Glyph name="computer" size={30} />}</span>
              <span><b>{m.name}</b><small>{usedText(m.from, m.to)}{same ? ' · có cùng lúc này' : ''}</small></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
