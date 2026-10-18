const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const longDay = (y: number, m: number, d: number) => cap(new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
export const dayMonthYear = (iso?: string | null) => (iso ? new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
/** a moment's date: an import that only knew the month marks it with second :01, only the year with :02 */
export const momentDate = (iso?: string | null) => (!iso ? '' : iso.slice(17, 19) === '01' ? monthLabel(iso) : iso.slice(17, 19) === '02' ? iso.slice(0, 4) : dayMonthYear(iso));
export const monthLabel = (iso: string) => cap(new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }));
export const timeOf = (iso?: string | null) => (iso ? iso.slice(11, 16) : '');
export const yearOf = (iso?: string | null) => (iso ? Number(iso.slice(0, 4)) : NaN);

/* ── Event dates: how far the moment is known decides how it reads ── */
import type { EventDate } from '../types';
const SEASON: Record<number, string> = { 3: 'Xuân', 6: 'Hè', 9: 'Thu', 12: 'Đông' };
/** "14/05/2007 09:12", "08/1995", "Hè 1998", "1993", "Thập niên 70", with "~" when it is a guess */
export function eventLabel(e?: EventDate | null): string {
  if (!e?.date) return '';
  const d = e.date, y = +d.slice(0, 4), m = +d.slice(5, 7), day = `${d.slice(8, 10)}/${d.slice(5, 7)}/${y}`;
  const t = {
    DECADE: `Thập niên ${String(y).slice(2, 3)}0${y >= 2000 ? ` (${y})` : ''}`, YEAR: `${y}`,
    SEASON: `${SEASON[m] ?? ''} ${m === 12 ? `${y}–${y + 1}` : y}`.trim(), MONTH: `${d.slice(5, 7)}/${y}`, DAY: day,
    HOUR: `${+d.slice(11, 13)}h ${day}`, MINUTE: `${day} ${d.slice(11, 16)}`, SECOND: `${day} ${d.slice(11, 19)}`,
  }[e.precision] ?? day;
  return (e.approx ? '~' : '') + t;
}
/** Group heading in a photo list: a month, or — for a file known only to its season, year or decade — that span. */
export function groupLabel(m: { effectiveDate?: string | null; event?: EventDate | null }): string {
  const e = m.event;
  if (e?.date && (e.precision === 'YEAR' || e.precision === 'DECADE' || e.precision === 'SEASON')) return `${eventLabel({ ...e, approx: false })} · không rõ ${e.precision === 'SEASON' ? 'tháng' : 'ngày'}`;
  return m.effectiveDate ? monthLabel(m.effectiveDate) : 'Không rõ ngày';
}
