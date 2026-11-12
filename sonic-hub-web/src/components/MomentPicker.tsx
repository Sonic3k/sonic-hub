/* The day the portal is looking at, on the header: a chip that opens a calendar. The year first (each one in the
   tint of its era), the month (the ones with photos stand out), then the day; days when something of his was going
   on carry a dot. Picking a day goes to it at once. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { daysIn, useMoment, type Moment } from '../lib/moment';
import { eraClass } from '../lib/era';
import { useTimeline } from '../lib/queries';
import { useEvents } from '../pages/Events';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const FINE = new Set(['DAY', 'HOUR', 'MINUTE', 'SECOND']);

export default function MomentPicker({ onRandom }: { onRandom: () => void }) {
  const { moment, picked, pick, clear } = useMoment(), loc = useLocation();
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.search]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  if (!moment) return <div className="mpick"><span className="mchip wait" /></div>;
  return (
    <div className="mpick" ref={box}>
      <button type="button" className={`mchip ${eraClass(moment.y)} ${open ? 'open' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(o => !o)} title="Chọn ngày để xem">
        <b>{moment.y}</b><span>{moment.d} tháng {moment.m}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" /></svg>
      </button>
      {open && <>
        <div className="mcal-back" onClick={() => setOpen(false)} />
        <Calendar moment={moment} picked={picked} onPick={m => { setOpen(false); pick(m); }}
          onToday={() => { setOpen(false); clear(); }} onRandom={() => { setOpen(false); onRandom(); }} />
      </>}
    </div>
  );
}

function Calendar({ moment, picked, onPick, onToday, onRandom }: { moment: Moment; picked: boolean; onPick: (m: Moment) => void; onToday: () => void; onRandom: () => void }) {
  const tl = useTimeline(), events = useEvents();
  const [view, setView] = useState({ y: moment.y, m: moment.m }), [years, setYears] = useState(false);
  const now = new Date(), thisYear = now.getFullYear();
  const buckets = tl.data ?? [];
  const monthsWith = useMemo(() => new Set(buckets.filter(b => b.count > 0).map(b => `${b.year}-${b.month}`)), [buckets]);
  // (a few files carry a broken date: years that are not years are left out)
  const yearsWith = useMemo(() => new Set(buckets.filter(b => b.count > 0 && b.year >= 1900 && b.year <= thisYear).map(b => b.year)), [buckets, thisYear]);
  // every year since 1990, and the earlier ones the library has something from
  const yearList = useMemo(() => {
    const early = [...yearsWith].filter(y => y < 1990).sort((a, b) => a - b);
    return [...early, ...Array.from({ length: thisYear - 1990 + 1 }, (_, i) => 1990 + i)];
  }, [yearsWith, thisYear]);
  // days of the month in view inside one of his events (a trip, a gathering) known to the day
  const busy = useMemo(() => {
    const s = new Set<number>(), pad = (n: number) => String(n).padStart(2, '0');
    const m0 = `${view.y}-${pad(view.m)}-01`, m1 = `${view.y}-${pad(view.m)}-${pad(daysIn(view.y, view.m))}`;
    (events.data ?? []).forEach(e => {
      if (!e.precision || !FINE.has(e.precision)) return;
      const a = e.startAt.slice(0, 10), b = e.endExclusive.slice(0, 10);
      if (a > m1 || b <= m0) return;
      for (let d = 1; d <= daysIn(view.y, view.m); d++) { const day = `${view.y}-${pad(view.m)}-${pad(d)}`; if (day >= a && day < b) s.add(d); }
    });
    return s;
  }, [events.data, view]);

  const n = daysIn(view.y, view.m), lead = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7;
  const step = (dy: number) => setView(v => ({ ...v, y: Math.min(thisYear, Math.max(yearList[0] ?? 1990, v.y + dy)) }));
  return (
    <div className="mcal" role="dialog" aria-label="Chọn ngày để xem">
      <div className="mcal-top">
        <button type="button" className="mcal-step" onClick={() => step(-1)} aria-label="Năm trước">‹</button>
        <button type="button" className={`mcal-year ${eraClass(view.y)}`} onClick={() => setYears(v => !v)} aria-expanded={years} title="Chọn năm">{view.y}</button>
        <button type="button" className="mcal-step" onClick={() => step(1)} aria-label="Năm sau">›</button>
      </div>
      {years
        ? <div className="mcal-years">{yearList.map(y => (
            <button key={y} type="button" className={`${eraClass(y)} ${y === view.y ? 'on' : ''} ${yearsWith.has(y) ? '' : 'thin'}`} onClick={() => { setView(v => ({ ...v, y })); setYears(false); }}>{y}</button>))}</div>
        : <>
          <div className="mcal-months" aria-label="Tháng">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <button key={m} type="button" className={`${m === view.m ? 'on' : ''} ${monthsWith.has(`${view.y}-${m}`) ? '' : 'thin'}`} onClick={() => setView(v => ({ ...v, m }))} aria-label={`Tháng ${m}`}>{m}</button>))}</div>
          <div className="mcal-days">
            {WEEKDAYS.map(w => <i key={w}>{w}</i>)}
            {Array.from({ length: lead }, (_, i) => <span key={`_${i}`} />)}
            {Array.from({ length: n }, (_, i) => i + 1).map(d => {
              const on = view.y === moment.y && view.m === moment.m && d === moment.d, today = view.m === now.getMonth() + 1 && d === now.getDate();
              return <button key={d} type="button" className={`${on ? 'on' : ''} ${today ? 'today' : ''} ${busy.has(d) ? 'busy' : ''}`} onClick={() => onPick({ y: view.y, m: view.m, d })}
                aria-label={`${d} tháng ${view.m}, ${view.y}`} aria-pressed={on}>{d}</button>;
            })}
          </div>
        </>}
      <div className="mcal-foot">
        {picked && <button type="button" onClick={onToday}>Về hôm nay</button>}
        <button type="button" onClick={onRandom}>Một ngày bất kỳ</button>
      </div>
    </div>
  );
}
