/* Portal: the sites of their own that grew out of Sonic Hub — Huyền học (tử vi from grandma's notes) and Bóng đá
   (Fantasy). Each lives at its own address (VITE_MYSTIC_URL, VITE_FOOTBALL_URL); this page only points there: two
   doors, each in its site's colour with a drawing of what is behind it (the twelve houses of a tử vi chart, a pitch).
   The old networks (Facebook, Yahoo…) are no longer a site here: they open inside the machines (/pc, /phone). */
import { useEffect, type ReactNode } from 'react';

interface Site { key: string; name: string; line: string; detail: string; url?: string; open: string; env: string; mark: ReactNode }

/* a lá số: twelve houses around the middle */
const CHART = (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <rect x="1" y="1" width="198" height="198" /><rect x="50.5" y="50.5" width="99" height="99" />
    <path d="M50.5 1v49.5M100 1v49.5M149.5 1v49.5M50.5 149.5V199M100 149.5V199M149.5 149.5V199M1 50.5h49.5M1 100h49.5M1 149.5h49.5M149.5 50.5H199M149.5 100H199M149.5 149.5H199" />
  </svg>
);
/* a pitch from above */
const PITCH = (
  <svg viewBox="0 0 300 200" aria-hidden="true">
    <rect x="1" y="1" width="298" height="198" /><path d="M150 1v198" /><circle cx="150" cy="100" r="30" />
    <rect x="1" y="45" width="48" height="110" /><rect x="1" y="75" width="18" height="50" /><rect x="251" y="45" width="48" height="110" /><rect x="281" y="75" width="18" height="50" />
  </svg>
);

const PORTALS: Site[] = [
  {
    key: 'mystic', name: 'Huyền học', open: 'Mở Huyền học', url: import.meta.env.VITE_MYSTIC_URL, env: 'VITE_MYSTIC_URL', mark: CHART,
    line: 'Tử vi theo ghi chép của bà: lập lá số, luận từng cung, vận hạn, đọc sách của bà.',
    detail: 'Mỗi người có thể có nhiều lá số; bản tóm tắt hiện ở trang người trong Angels. Chiêm tinh, nhân số học, Kinh Dịch, tarot: sắp có.',
  },
  {
    key: 'football', name: 'Bóng đá', open: 'Mở Fantasy Football', url: import.meta.env.VITE_FOOTBALL_URL, env: 'VITE_FOOTBALL_URL', mark: PITCH,
    line: 'Fantasy Football: giải đấu, đội hình, bảng điểm.',
    detail: 'Trang quản lý giải và đội của Competition Fantasy.',
  },
];

const host = (u: string) => { try { return new URL(u).host; } catch { return u; } };

export default function Portal() {
  useEffect(() => { document.title = 'Portal · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  return (
    <div className="wrap page pt">
      <header className="mm-head"><h1>Portal</h1><span className="ph-n">những trang riêng của Sonic Hub</span></header>
      <div className="pt-doors">
        {PORTALS.map(s => {
          const body = <>
            <span className="pt-face">{s.mark}<b>{s.name}</b></span>
            <span className="pt-t">
              <span className="pt-l">{s.line}</span>
              <span className="pt-d">{s.detail}</span>
              {s.url ? <span className="pt-go"><i>{s.open}</i><small>{host(s.url)}</small></span> : <span className="pt-off">Chưa cấu hình địa chỉ ({s.env})</span>}
            </span>
          </>;
          return s.url ? <a key={s.key} className={`pt-door pt-${s.key}`} href={s.url}>{body}</a> : <div key={s.key} className={`pt-door pt-${s.key}`}>{body}</div>;
        })}
      </div>
    </div>
  );
}
