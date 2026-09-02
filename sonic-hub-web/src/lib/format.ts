/* The API stores UTC as a naive LocalDateTime; the site reads it as UTC and
   shows it in Vietnam time, which is where every one of these photos was taken. */
export const TZ = 'Asia/Ho_Chi_Minh';

export function parseUtc(s: string | null | undefined): Date | null {
  if (!s) return null;
  // A bare date (LocalDate, e.g. firstMet) has no instant; pin it to midday so
  // it lands on the same calendar day in any zone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00Z');
  const d = new Date(/Z$|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = parseUtc(s);
  return d ? d.toLocaleDateString('vi-VN', { timeZone: TZ, ...opts }) : null;
}

export function fmtDateTime(s: string | null | undefined) {
  const d = parseUtc(s);
  return d ? d.toLocaleString('vi-VN', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
}

export function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function fmtDuration(sec: number | null | undefined) {
  if (!sec && sec !== 0) return null;
  const s = Math.round(sec);
  const m = Math.floor(s / 60), r = s % 60;
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

export const plural = (n: number | null | undefined, word: string) => n == null ? null : `${n.toLocaleString('vi-VN')} ${word}`;

/** "YYYY-MM" of a UTC timestamp, cut in Vietnam time; null when undated. */
export function monthKey(s: string | null | undefined): string | null {
  const d = parseUtc(s);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value, m = parts.find(p => p.type === 'month')?.value;
  return y && m ? `${y}-${m}` : null;
}

export const monthLabel = (year: number, month: number) => `Tháng ${month} ${year}`;

export const RELATIONSHIP: Record<string, string> = {
  CRUSH: 'Crush', GIRLFRIEND: 'Người yêu', EX: 'Người cũ', FRIEND: 'Bạn', ACQUAINTANCE: 'Quen', PEN_PAL: 'Bạn thư', ONLINE_FRIEND: 'Bạn mạng',
};
export const PLATFORM: Record<string, string> = {
  YAHOO: 'Yahoo! Messenger', FACEBOOK: 'Facebook', SMS: 'Tin nhắn SMS', ZALO: 'Zalo', TELEGRAM: 'Telegram', BLOG: 'Blog', OTHER: 'Khác',
};
export const relationLabel = (t: string | null | undefined) => (t ? RELATIONSHIP[t] ?? t : null);
export const platformLabel = (t: string | null | undefined) => (t ? PLATFORM[t] ?? t : null);
