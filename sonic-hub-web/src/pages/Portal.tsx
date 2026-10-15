/* Portal: the sites of their own that grew out of Sonic Hub — Huyền học (tử vi from grandma's notes) and Bóng đá
   (Fantasy). Each lives at its own address (VITE_MYSTIC_URL, VITE_FOOTBALL_URL); this page only points there. */
import { useEffect } from 'react';

interface Site { key: string; name: string; line: string; detail: string; url?: string; color: string; open: string }

export const PORTALS: Site[] = [
  {
    key: 'mystic', name: 'Huyền học', color: '--mystic', open: 'Mở Huyền học', url: import.meta.env.VITE_MYSTIC_URL,
    line: 'Tử vi theo ghi chép của bà: lập lá số, luận từng cung, vận hạn, đọc sách của bà.',
    detail: 'Mỗi người có thể có nhiều lá số; bản tóm tắt hiện ở trang người trong Angels. Chiêm tinh, nhân số học, Kinh Dịch, tarot — sắp có.',
  },
  {
    key: 'football', name: 'Bóng đá', color: '--football', open: 'Mở Fantasy Football', url: import.meta.env.VITE_FOOTBALL_URL,
    line: 'Fantasy Football: giải đấu, đội hình, bảng điểm.',
    detail: 'Trang quản lý giải và đội của Competition Fantasy.',
  },
];

const host = (u: string) => { try { return new URL(u).host; } catch { return u; } };

export default function Portal() {
  useEffect(() => { document.title = 'Portal · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  return (
    <div className="wrap page">
      <div className="ptitle"><h1>Portal</h1><span>những trang riêng của Sonic Hub</span></div>
      <div className="portals">
        {PORTALS.map(s => (
          <div key={s.key} className="card portal" style={{ ['--c' as string]: `var(${s.color})` }}>
            <h2><i />{s.name}</h2>
            <p>{s.line}</p>
            <p className="d">{s.detail}</p>
            {s.url
              ? <a className="go" href={s.url}>{s.open} →<small>{host(s.url)}</small></a>
              : <span className="go off">Chưa cấu hình địa chỉ ({s.key === 'mystic' ? 'VITE_MYSTIC_URL' : 'VITE_FOOTBALL_URL'})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalSide() {
  return (
    <>
      <h4>Portal</h4>
      {PORTALS.map(s => s.url
        ? <a key={s.key} href={s.url}><span className="dot" style={{ ['--c' as string]: `var(${s.color})` }} />{s.name}<small>↗</small></a>
        : <span key={s.key} className="off"><span className="dot" style={{ ['--c' as string]: `var(${s.color})` }} />{s.name}</span>)}
    </>
  );
}
