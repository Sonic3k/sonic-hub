/* The moment the portal is looking at: a day picked on the calendar of the header, or landed on with "Một ngày bất kỳ".
   The two home pages name it in their address (?y=2007&d=11-12); it is remembered for the visit and follows him into
   every section (the chip in the header, the machines' buttons). With nothing picked it is today's date in the latest
   year that has photos in this month — what "Hôm nay" has always opened on. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTimeline } from './queries';

export interface Moment { y: number; m: number; d: number }
interface MomentState {
  /** null while the library's years are still loading and nothing names a year */
  moment: Moment | null;
  /** a day was chosen (in the address or earlier in this visit), not just today's default */
  picked: boolean;
  /** go and look at this day: a home page keeps its mode, Ảnh / Ký ức / Nhật ký / Game / Music stay and show that time, any other page goes to Hôm nay */
  pick: (m: Moment) => void;
  /** back to today's default */
  clear: () => void;
}

const KEY = 'hub.moment';
const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (m: Moment) => `${m.y}-${pad(m.m)}-${pad(m.d)}`;
/** the moment as the machines and the API take it: that evening, Vietnam wall-clock */
export const atOf = (m: Moment) => `${isoOf(m)}T21:00`;
export const momentQuery = (m: Moment) => `?y=${m.y}&d=${m.m}-${m.d}`;
export const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
export const HOME_PATHS = ['/', '/timeline'];
/** Where a section shows a moment: the photo library opens its month; Ký ức and Nhật ký open their list, which goes
 *  to the moment's year by itself; Game and Music open on what he played and heard then; the timeline keeps its mode;
 *  anything else is Hôm nay. */
export function momentHref(path: string, m: Moment): string {
  if (path === '/timeline') return `/timeline${momentQuery(m)}`;
  if (/^\/(photos|tags)(\/|$)/.test(path)) return `/photos?year=${m.y}&month=${m.m}`;
  if (path.startsWith('/memories')) return '/memories';
  if (path.startsWith('/journal')) return '/journal';
  if (path.startsWith('/games')) return '/games';
  if (path.startsWith('/music')) return '/music';
  return `/${momentQuery(m)}`;
}

function read(): Moment | null {
  try {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionStorage.getItem(KEY) ?? '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  } catch { return null; }
}
function write(m: Moment | null) {
  try { if (m) sessionStorage.setItem(KEY, isoOf(m)); else sessionStorage.removeItem(KEY); } catch { /* storage is off: the address still carries it */ }
}

const Ctx = createContext<MomentState>({ moment: null, picked: false, pick: () => {}, clear: () => {} });
export const useMoment = () => useContext(Ctx);

export function MomentProvider({ children }: { children: ReactNode }) {
  const loc = useLocation(), [sp] = useSearchParams(), nav = useNavigate(), tl = useTimeline();
  const [stored, setStored] = useState<Moment | null>(read);
  const onHome = HOME_PATHS.includes(loc.pathname);
  const uy = onHome ? Number(sp.get('y')) || 0 : 0;
  const [um = 0, ud = 0] = onHome ? (sp.get('d') ?? '').split('-').map(n => Number(n) || 0) : [];
  const buckets = tl.data;

  const moment = useMemo<Moment | null>(() => {
    const now = new Date();
    const m = Math.min(12, Math.max(1, um || stored?.m || now.getMonth() + 1));
    let y = uy || stored?.y || 0;
    if (!y) {
      if (!buckets) return null;
      const years = [...new Set(buckets.map(b => b.year))].sort((a, b) => b - a);
      y = years.find(yr => buckets.some(b => b.year === yr && b.month === m && b.count > 0)) || years[0] || now.getFullYear();
    }
    const d = Math.min(daysIn(y, m), Math.max(1, ud || stored?.d || now.getDate()));
    return { y, m, d };
  }, [uy, um, ud, stored, buckets]);

  // a home page whose address names a day: that day is the one remembered
  useEffect(() => {
    if (!moment || !(uy || um)) return;
    if (!stored || isoOf(stored) !== isoOf(moment)) { write(moment); setStored(moment); }
  }, [moment, uy, um, stored]);

  const pick = useCallback((m: Moment) => {
    write(m); setStored(m);
    nav(momentHref(loc.pathname, m));
  }, [nav, loc.pathname]);
  const clear = useCallback(() => {
    write(null); setStored(null);
    nav(loc.pathname === '/timeline' ? '/timeline' : '/');
  }, [nav, loc.pathname]);

  const value = useMemo(() => ({ moment, picked: !!(stored || uy || um), pick, clear }), [moment, stored, uy, um, pick, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
