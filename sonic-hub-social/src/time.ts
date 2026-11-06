/* The moment the portal looks from (T) and how times read from it. T lives in the address (?at=2012-07-16T21:30,
   Vietnam wall-clock) so every link and Back keep it; without one the portal reads at the newest moment there is
   data for. Vietnam has one offset all year (UTC+7), so the arithmetic is plain. */
import { createContext, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';

const VN = 7 * 3600_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** An API time (UTC, no zone) as a Date. */
export function utc(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

/** The Vietnam wall-clock fields of a moment. */
export function vn(d: Date) {
  const x = new Date(d.getTime() + VN);
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth(), d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes(), wd: x.getUTCDay() };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2012-07-16T21:30", the Vietnam wall-clock of a moment, as ?at= and <input type=datetime-local> take it. */
export function atString(d: Date): string {
  const v = vn(d);
  return `${v.y}-${pad(v.mo + 1)}-${pad(v.d)}T${pad(v.h)}:${pad(v.mi)}`;
}

/** A Vietnam wall-clock string back to a moment. */
export function fromAt(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  const end = m[4] === undefined;   // a bare day reads at its end, as the API does
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], end ? 23 : +m[4], end ? 59 : +m[5], end ? 59 : 0) - VN);
}

export const clock = (d: Date) => {
  const v = vn(d), h = v.h % 12 || 12;
  return `${h}:${pad(v.mi)}${v.h < 12 ? 'am' : 'pm'}`;
};

const sameDay = (a: Date, b: Date) => { const x = vn(a), y = vn(b); return x.y === y.y && x.mo === y.mo && x.d === y.d; };

/** The way a post's time reads at T: "Just now", "5 mins", "3 hrs", "Yesterday at 9:30pm", "July 15 at 10:05pm",
 *  "July 15, 2012 at 10:05pm"; only as much as is known when the time is vague ("July 2012", "2012"). */
export function ago(iso: string | null | undefined, T: Date, precision?: string | null): string {
  const t = utc(iso);
  if (!t) return '';
  const v = vn(t), tv = vn(T);
  if (precision === 'YEAR' || precision === 'DECADE') return String(v.y);
  if (precision === 'MONTH' || precision === 'SEASON') return `${MONTHS[v.mo]} ${v.y}`;
  const day = `${MONTHS[v.mo]} ${v.d}${v.y === tv.y ? '' : `, ${v.y}`}`;
  if (precision === 'DAY') return day;
  const s = (T.getTime() - t.getTime()) / 1000;
  if (s >= 0 && s < 60) return 'Just now';
  if (s >= 0 && s < 3600) { const m = Math.floor(s / 60); return `${m} min${m > 1 ? 's' : ''}`; }
  if (s >= 0 && s < 86400 && sameDay(t, T)) { const h = Math.floor(s / 3600); return `${h} hr${h > 1 ? 's' : ''}`; }
  if (s >= 0 && sameDay(t, new Date(T.getTime() - 86400_000))) return `Yesterday at ${clock(t)}`;
  if (s >= 0 && s < 86400) { const h = Math.floor(s / 3600); return `${h} hr${h > 1 ? 's' : ''}`; }
  return `${day} at ${clock(t)}`;
}

/** "Sunday, July 15, 2012 at 10:05pm" — the full time, for a tooltip. */
export function full(iso: string | null | undefined, precision?: string | null): string {
  const t = utc(iso);
  if (!t) return '';
  const v = vn(t);
  if (precision === 'YEAR' || precision === 'DECADE') return String(v.y);
  if (precision === 'MONTH' || precision === 'SEASON') return `${MONTHS[v.mo]} ${v.y}`;
  const d = `${DAYS[v.wd]}, ${MONTHS[v.mo]} ${v.d}, ${v.y}`;
  return precision === 'DAY' ? d : `${d} at ${clock(t)}`;
}

/** A calendar date "2005-09-01" as the intro shows it, at the precision known: "2005", "September 2005", "September 1, 2005". */
export function dateText(d: string | null | undefined, precision?: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  if (precision === 'YEAR' || precision === 'DECADE') return String(y);
  if (precision === 'MONTH' || precision === 'SEASON') return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}

/** "June 2010" of an API time. */
export function monthYear(iso: string | null | undefined): string {
  const t = utc(iso);
  if (!t) return '';
  const v = vn(t);
  return `${MONTHS[v.mo]} ${v.y}`;
}

/** Messenger's list: "9:41pm" today, "Mon" this week, "Mar 11" this year, "3/11/19" before. */
export function short(iso: string | null | undefined, T: Date): string {
  const t = utc(iso);
  if (!t) return '';
  if (sameDay(t, T)) return clock(t);
  const v = vn(t), tv = vn(T);
  if (T.getTime() - t.getTime() < 6 * 86400_000 && T.getTime() >= t.getTime()) return DAYS[v.wd].slice(0, 3);
  if (v.y === tv.y) return `${MONTHS[v.mo].slice(0, 3)} ${v.d}`;
  return `${v.mo + 1}/${v.d}/${String(v.y).slice(2)}`;
}

/** A divider in a conversation: "Today 9:41pm", "Yesterday 9:41pm", "Mon 9:41pm", "Mar 11, 2019, 9:41pm". */
export function divider(iso: string | null | undefined, T: Date): string {
  const t = utc(iso);
  if (!t) return '';
  if (sameDay(t, T)) return clock(t);
  if (sameDay(t, new Date(T.getTime() - 86400_000))) return `Yesterday ${clock(t)}`;
  const v = vn(t);
  if (T.getTime() - t.getTime() < 6 * 86400_000 && T.getTime() >= t.getTime()) return `${DAYS[v.wd].slice(0, 3)} ${clock(t)}`;
  return `${MONTHS[v.mo].slice(0, 3)} ${v.d}, ${v.y}, ${clock(t)}`;
}

/** The time bar's own reading, Vietnamese style: "16/07/2012 · 21:30". */
export function barText(d: Date): string {
  const v = vn(d);
  return `${pad(v.d)}/${pad(v.mo + 1)}/${v.y} · ${pad(v.h)}:${pad(v.mi)}`;
}

/* ── T for the whole app ────────────────────────────────────────────────── */

export interface Moment { at: string | undefined; T: Date; latest: Date | null }
export const MomentContext = createContext<Moment>({ at: undefined, T: new Date(), latest: null });
export const useMoment = () => useContext(MomentContext);

/** The ?at= of the address, as the API takes it (undefined = the newest moment). */
export function useAtParam(): string | undefined {
  const [sp] = useSearchParams();
  return sp.get('at') ?? undefined;
}

/** A path with the current moment carried along. */
export function withAt(path: string, at: string | undefined): string {
  if (!at) return path;
  return `${path}${path.includes('?') ? '&' : '?'}at=${encodeURIComponent(at)}`;
}
