/* T on the devices: the ?at= of the address (Vietnam wall-clock), the same reading as the Facebook pages use. */
export { atString, fromAt, utc, vn, MomentContext, useMoment } from './fb/time';
import { atString, fromAt, vn } from './fb/time';

const pad = (n: number) => String(n).padStart(2, '0');
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** T from the address, or now. */
export function momentOf(at: string | null | undefined): Date {
  return (at ? fromAt(at) : null) ?? new Date();
}

/** The day after T (Vietnam), as the library search takes "to" (exclusive): everything up to the end of T's day. */
export function dayAfter(T: Date): string {
  const v = vn(new Date(T.getTime() + 86400_000));
  return `${v.y}-${pad(v.mo + 1)}-${pad(v.d)}`;
}

/** The portal's home page on T's day — where the machine goes when it is shut down. */
export function portalAt(T: Date): string {
  const v = vn(T);
  return `/?y=${v.y}&d=${v.mo + 1}-${v.d}`;
}

/** "8:35 PM" */
export function clockText(T: Date, h24 = false): string {
  const v = vn(T);
  if (h24) return `${pad(v.h)}:${pad(v.mi)}`;
  return `${v.h % 12 || 12}:${pad(v.mi)} ${v.h < 12 ? 'AM' : 'PM'}`;
}

/** "8/22/2011" (the Windows tray date of his machines, US format as they were set) */
export function trayDate(T: Date): string {
  const v = vn(T);
  return `${v.mo + 1}/${v.d}/${v.y}`;
}

/** "Monday, August 22, 2011" */
export function longDate(T: Date): string {
  const v = vn(T);
  return `${DAYS[v.wd]}, ${MONTHS[v.mo]} ${v.d}, ${v.y}`;
}

/** "22/08/2011" */
export function vnDate(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`) : iso;
  const v = vn(d);
  return `${pad(v.d)}/${pad(v.mo + 1)}/${v.y}`;
}

/** A moment moved by days / months, keeping the wall-clock time. */
export function shift(T: Date, days: number, months = 0): Date {
  if (!months) return new Date(T.getTime() + days * 86400_000);
  const v = vn(T);
  return new Date(Date.UTC(v.y, v.mo + months, Math.min(v.d, 28), v.h, v.mi) - 7 * 3600_000);
}

export { atString as toAt };

export const VI_DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "Thứ Hai, ngày 22 tháng 8 năm 2011" */
export function viLong(T: Date): string {
  const v = vn(T);
  return `${VI_DAYS[v.wd]}, ngày ${v.d} tháng ${v.mo + 1} năm ${v.y}`;
}

/** A machine's years of use: "2009 – 2014", "9/2019 – 2022", "2023 – nay" (to is exclusive: its day before counts). */
export function usedText(from?: string | null, to?: string | null): string {
  const one = (d: Date, end: boolean) => {
    const v = vn(d);
    return (end ? v.mo === 11 && v.d === 31 : v.mo === 0 && v.d === 1) ? `${v.y}` : `${v.mo + 1}/${v.y}`;
  };
  const f = from ? new Date(/Z$/.test(from) ? from : `${from}Z`) : null;
  const t = to ? new Date(new Date(/Z$/.test(to) ? to : `${to}Z`).getTime() - 86400_000) : null;
  return `${f ? one(f, false) : '…'} – ${t ? one(t, true) : 'nay'}`;
}
