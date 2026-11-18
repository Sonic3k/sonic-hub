/* Portal: the sites of their own that grew out of Sonic Hub — Huyền học (tử vi from grandma's notes), Bóng đá
   (Fantasy), Hidden Palace (the things he is curious about, with their numbers: sonic-hidden-palace) and Nơi chốn
   (the places of his life rebuilt in 3D: sonic-hub-world). Each lives at its own address (VITE_MYSTIC_URL,
   VITE_FOOTBALL_URL, VITE_PALACE_URL, VITE_WORLD_URL); this page only points there: a door each, in its site's
   colour with a drawing of what is behind it (the twelve houses of a tử vi chart, a pitch, a palace on its cliff,
   the plan of a home).
   The old networks (Facebook, Yahoo…) are no longer a site here: they open inside the machines (/pc, /phone). */
import { useEffect, useState, type ReactNode } from 'react';

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

/* a palace on its cliff: the dome between two towers, the arcade, the falls down the rock */
const PALACE = (
  <svg viewBox="0 0 220 200" aria-hidden="true">
    <path d="M18 199 38 122l22-18h100l20 16 22 79" /><path d="M56 104V92h108v12" /><rect x="78" y="58" width="64" height="34" />
    <path d="M84 58a26 26 0 0 1 52 0" /><path d="M110 32V20" /><circle cx="110" cy="16" r="3.5" />
    <rect x="61" y="46" width="13" height="46" /><path d="M58 46l9.5-20L77 46" /><rect x="146" y="46" width="13" height="46" /><path d="M143 46l9.5-20L162 46" />
    <path d="M88 92V80a5 5 0 0 1 10 0v12M105 92V80a5 5 0 0 1 10 0v12M122 92V80a5 5 0 0 1 10 0v12" />
    <path d="M151 104v62M156 104v44" />
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
  {
    key: 'palace', name: 'Hidden Palace', open: 'Mở Hidden Palace', url: import.meta.env.VITE_PALACE_URL, env: 'VITE_PALACE_URL', mark: PALACE,
    line: 'Những điều đáng tò mò, có số liệu đi kèm: mô hình Hệ Mặt Trời, bảng xếp hạng Eurovision từ 2004.',
    detail: 'Song ngữ Việt – Anh. Sinh học trực quan, lịch sử, thời tiết qua các năm: sắp có.',
  },
];

const host = (u: string) => { try { return new URL(u).host; } catch { return u; } };

/* ── Nơi chốn: the door knows what is behind it ──
   sonic-hub-world publishes its list of places at /places.json (with CORS). The door reads it: it names the places
   that are there, draws the plan of the first, and is a way in only when the site has answered. */
const WORLD_URL = (import.meta.env.VITE_WORLD_URL ?? 'https://sonic-hub-world-production.up.railway.app').replace(/\/+$/, '');
interface Plan { box: [number, number]; rooms: [number, number, number, number][] }
interface Place { id: string; title: string; years: { from: number; to: number } | null; plan: Plan | null }
/* the plan drawn until the site has answered: flat 507, the first place built */
const HOME: Plan = { box: [1260, 860], rooms: [[120, 0, 525, 280], [645, 184, 70, 96], [657, 0, 70, 174], [727, 0, 413, 280], [255, 292, 275, 438], [560, 292, 700, 438], [120, 292, 125, 198], [120, 502, 125, 228], [255, 752, 439, 108], [0, 18, 98, 256], [1162, 8, 98, 256]] };
const planMark = (p: Plan) => (
  <svg viewBox={`-6 -6 ${p.box[0] + 12} ${p.box[1] + 12}`} aria-hidden="true">
    {p.rooms.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} vectorEffect="non-scaling-stroke" />)}
  </svg>
);
const span = (p: Place) => (p.years ? (p.years.to > p.years.from ? ` (${p.years.from}–${p.years.to})` : ` (${p.years.from})`) : '');

function WorldDoor() {
  /* undefined: still asking · null: no answer · a list: what is there */
  const [places, setPlaces] = useState<Place[] | null | undefined>(undefined);
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${WORLD_URL}/places.json`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { places?: Place[] }) => setPlaces(Array.isArray(d.places) ? d.places : null))
      .catch(() => { if (!ac.signal.aborted) setPlaces(null); });
    return () => ac.abort();
  }, []);
  const there = places && places.length > 0 ? places : null;
  const body = <>
    <span className="pt-face">{planMark(there?.find(p => p.plan)?.plan ?? HOME)}<b>Nơi chốn</b></span>
    <span className="pt-t">
      <span className="pt-l">Những nơi đã sống, đã học, đã đi qua, dựng lại bằng 3D để bước vào đi lại.</span>
      <span className="pt-d">{there ? `Đang có: ${there.map(p => p.title + span(p)).join(', ')}. ` : ''}Trường học, đường quanh nhà, homestay: sắp có.</span>
      {there ? <span className="pt-go"><i>Mở Nơi chốn</i><small>{host(WORLD_URL)}</small></span>
        : places === null ? <span className="pt-off">Chưa mở được ({host(WORLD_URL)})</span>
        : <span className="pt-off" aria-hidden="true">&nbsp;</span>}
    </span>
  </>;
  return there ? <a className="pt-door pt-world" href={WORLD_URL}>{body}</a> : <div className="pt-door pt-world">{body}</div>;
}

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
        <WorldDoor />
      </div>
    </div>
  );
}
