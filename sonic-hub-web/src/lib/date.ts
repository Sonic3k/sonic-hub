const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const longDay = (y: number, m: number, d: number) => cap(new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
export const dayMonthYear = (iso?: string | null) => (iso ? new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
export const monthLabel = (iso: string) => cap(new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }));
export const timeOf = (iso?: string | null) => (iso ? iso.slice(11, 16) : '');
export const yearOf = (iso?: string | null) => (iso ? Number(iso.slice(0, 4)) : NaN);
