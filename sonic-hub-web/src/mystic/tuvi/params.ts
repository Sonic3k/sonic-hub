/* A chart as a link: the birth and the options live in the URL, so a chart can be opened again, bookmarked or sent. */
import type { BirthInput, ChartOptions } from './engine/chart';
import type { TuViProfile, TuViProfileInput } from '../../api/tuvi';

export interface ChartParams { name: string; input: BirthInput; options: ChartOptions }

const pad = (n: number) => String(n).padStart(2, '0');
const thisYear = () => new Date().getFullYear();

export function toSearch(p: ChartParams): string {
  const { input: i, options: o } = p, s = new URLSearchParams();
  if (p.name) s.set('n', p.name);
  s.set('g', i.gender);
  s.set('c', i.calendar === 'solar' ? 'd' : 'a');
  s.set('ngay', `${i.year}-${pad(i.month)}-${pad(i.day)}`);
  s.set('gio', i.calendar === 'solar' ? `${pad(i.hour)}:${pad(i.minute ?? 0)}` : String(i.hour));
  if (i.calendar === 'lunar' && i.leap) s.set('nhuan', '1');
  if (o.variant === 'sach') s.set('an', 'sach');
  if (o.leapMonth === 'split15') s.set('thangnhuan', '15');
  if (!o.tyNextDay) s.set('ty', 'cung-ngay');
  if (o.viewYear !== thisYear()) s.set('nam', String(o.viewYear));
  return s.toString();
}

export function fromSearch(sp: URLSearchParams): ChartParams | null {
  const d = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(sp.get('ngay') ?? '');
  if (!d) return null;
  const calendar = sp.get('c') === 'a' ? 'lunar' : 'solar';
  const g = sp.get('g') === 'nu' ? 'nu' : 'nam';
  const t = sp.get('gio') ?? '';
  let hour = 0, minute = 0;
  if (calendar === 'solar') { const m = /^(\d{1,2}):(\d{2})$/.exec(t); if (!m) return null; hour = +m[1]; minute = +m[2]; }
  else { hour = Number(t); if (!Number.isInteger(hour) || hour < 0 || hour > 11) return null; }
  const year = Number(sp.get('nam') ?? thisYear());
  return {
    name: sp.get('n') ?? '',
    input: { gender: g, calendar, year: +d[1], month: +d[2], day: +d[3], leap: sp.get('nhuan') === '1', hour, minute },
    options: { variant: sp.get('an') === 'sach' ? 'sach' : 'ba', leapMonth: sp.get('thangnhuan') === '15' ? 'split15' : 'same', tyNextDay: sp.get('ty') !== 'cung-ngay', viewYear: Number.isInteger(year) ? year : thisYear() },
  };
}

export const fromProfile = (p: TuViProfile, viewYear = thisYear()): ChartParams => ({
  name: p.name,
  input: { gender: p.gender, calendar: p.calendar, year: p.year, month: p.month, day: p.day, leap: p.leap, hour: p.hour, minute: p.minute ?? 0 },
  options: { variant: p.variant, leapMonth: p.leapRule, tyNextDay: p.tyNextDay, viewYear },
});

export const toProfileInput = (p: ChartParams, extra: { personId?: string | null; note?: string | null } = {}): TuViProfileInput => ({
  name: p.name.trim() || 'Không tên', gender: p.input.gender, calendar: p.input.calendar,
  year: p.input.year, month: p.input.month, day: p.input.day, leap: p.input.calendar === 'lunar' && !!p.input.leap,
  hour: p.input.hour, minute: p.input.calendar === 'solar' ? p.input.minute ?? 0 : null,
  variant: p.options.variant, leapRule: p.options.leapMonth, tyNextDay: p.options.tyNextDay,
  personId: extra.personId ?? null, note: extra.note ?? null,
});

export const chartHref = (p: ChartParams) => `/huyen-hoc/tu-vi/la-so?${toSearch(p)}`;
export const GIO = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'].map((n, i) => ({
  n, i, span: i === 0 ? '23–1 giờ' : `${2 * i - 1}–${2 * i + 1} giờ`,
}));
