/* Dates and durations in Vietnamese, the way the desk shows them. */

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function todayLabel(d = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 4 || h >= 18) return 'Chào buổi tối';
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  return 'Chào buổi chiều';
}

/** "10 phút", "3 giờ", "ngày mai", "6 ngày", "2 tháng" — how long until an ISO time. */
export function untilLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const diff = Date.parse(iso) - now;
  if (diff < 45 * MINUTE) return `${Math.max(1, Math.round(diff / MINUTE))} phút`;
  if (diff < 20 * HOUR) return `${Math.round(diff / HOUR)} giờ`;
  const days = Math.round(diff / DAY);
  if (days <= 1) return 'ngày mai';
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${Math.round(days / 365)} năm`;
}

/** "14/10" from "2026-10-14". */
export function dayLabel(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${d}/${m}`;
}

export function dayOfMonth(day: string): number {
  return Number(day.split('-')[2]);
}
