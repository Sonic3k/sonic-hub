const DAY_MS = 86_400_000;

/** Offset of `tz` from UTC at the given instant, in ms. */
function tzOffsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant of a local wall-clock time in `tz`. */
export function zonedTime(year: number, month: number, day: number, hour: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour);
  const offset = tzOffsetMs(new Date(guess), tz);
  return new Date(guess - offset);
}

function ymd(at: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

export interface DayClock {
  timezone: string;
  rolloverHour: number;
}

/** The learning day an instant belongs to (YYYY-MM-DD); a day runs from rolloverHour to rolloverHour. */
export function learningDay(at: Date, clock: DayClock): string {
  return ymd(new Date(at.getTime() - clock.rolloverHour * 3_600_000), clock.timezone);
}

/** When a learning day starts and ends (UTC instants). */
export function learningDayBounds(day: string, clock: DayClock): { start: Date; end: Date } {
  const [y, m, d] = day.split('-').map(Number);
  const start = zonedTime(y, m, d, clock.rolloverHour, clock.timezone);
  const next = new Date(Date.UTC(y, m - 1, d) + DAY_MS);
  const end = zonedTime(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), clock.rolloverHour, clock.timezone);
  return { start, end };
}

/** Whole days from `at` until the start of local date `date` (negative when past). */
export function daysUntil(date: string, at: Date, clock: DayClock): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = zonedTime(y, m, d, 0, clock.timezone);
  return Math.floor((target.getTime() - at.getTime()) / DAY_MS);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  return t.toISOString().slice(0, 10);
}
