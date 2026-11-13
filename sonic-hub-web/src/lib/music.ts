/* Music: how numbers, moments and the sides of a stream read. */
const nf = (n: number, d = 0) => n.toLocaleString('vi-VN', { maximumFractionDigits: d, minimumFractionDigits: d });
export const num = (n: number) => nf(n);
/** time played: "1.567 giờ", "3,5 giờ", "12 phút" */
export function hours(ms: number): string {
  const h = ms / 3_600_000;
  if (h >= 10) return `${nf(Math.round(h))} giờ`;
  if (h >= 1) return `${nf(h, 1)} giờ`;
  const m = Math.round(ms / 60_000);
  return m >= 1 ? `${m} phút` : ms > 0 ? 'dưới 1 phút' : '0';
}
/** for an axis: "1.200h", "45p" */
export const hoursShort = (ms: number) => (ms >= 3_600_000 ? `${nf(Math.round(ms / 3_600_000))}h` : ms > 0 ? `${Math.round(ms / 60_000)}p` : '0');
export const dmy = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
export const my = (iso?: string | null) => (iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
export const clock = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export const DEVICE: Record<string, string> = {
  THINKPAD: 'ThinkPad X1', WINDOWS: 'Laptop Windows', WORK_PC: 'Máy công ty ở Mỹ', WORK_LAPTOP: 'Máy công ty, thời ở Cebu', ASUS: 'Asus N56',
  IPHONE_6S: 'iPhone 6s', IPHONE_11: 'iPhone 11', IPHONE_13: 'iPhone 13 Pro', IPHONE: 'iPhone', IPAD: 'iPad', ANDROID: 'Android', WEB: 'Web player', OTHER: 'Khác',
};
export const PLACE: Record<string, string> = { 'US-CA': 'California, Mỹ', VN: 'Việt Nam', PH: 'Cebu, Philippines', SG: 'Singapore', HK: 'Hồng Kông', TH: 'Thái Lan', MY: 'Malaysia' };
export const CONTEXT: Record<string, string> = { PLAYLIST: 'Theo playlist', ALBUM: 'Mở cả album', ARTIST: 'Mở theo nghệ sĩ', LOOSE: 'Bài lẻ' };
export const START: Record<string, string> = {
  trackdone: 'Bài trước hết, tự chuyển', fwdbtn: 'Bấm next', clickrow: 'Tự chọn bài', playbtn: 'Bấm play', appload: 'Mở app', backbtn: 'Bấm lùi',
  remote: 'Điều khiển từ máy khác', trackerror: 'Bài trước lỗi', unknown: 'Không rõ',
};
export const END: Record<string, string> = {
  trackdone: 'Nghe hết bài', fwdbtn: 'Bấm next', endplay: 'Chuyển bài hoặc dừng', logout: 'Thoát app', 'unexpected-exit-while-paused': 'Tắt app lúc đang tạm dừng',
  'unexpected-exit': 'App tắt đột ngột', backbtn: 'Bấm lùi', remote: 'Điều khiển từ máy khác', trackerror: 'Bài lỗi', unknown: 'Không rõ',
};
export const SHUFFLE: Record<string, string> = { true: 'Shuffle', false: 'Theo thứ tự', '': 'Không rõ' };
export const WEEKDAY = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
/** the colours of the lines of a chart, in the order they are given; the last one is for "everything else" */
export const PALETTE = ['#A2418F', '#2E7FD6', '#E9A100', '#23A35E', '#EF5B78', '#0E9AA7', '#7B61FF', '#D9480F'];
export const REST = '#D0D6D2';
/** a moment as the API words it: "2005 → 2008" reads "2005 – 2008"; "~2014-12" reads "khoảng 12/2014"; "2015-07-31" reads "31/07/2015" */
export const whenText = (t?: string | null) => (t ?? '').replace(/^~/, 'khoảng ').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1').replace(/\b(\d{4})-(\d{2})\b/g, '$2/$1').replace(' → ', ' – ');
