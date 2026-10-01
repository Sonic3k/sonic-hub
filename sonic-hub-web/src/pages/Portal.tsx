import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Scene from '../cosmos/Scene';
import { useWarp } from '../cosmos/Warp';
import { SECTIONS, tagTheme, yearTheme } from '../cosmos/themes';
import TopBar from '../components/TopBar';
import YearRail from '../components/YearRail';
import { SectionWorlds, TagWorlds } from '../components/Planets';
import Viewer from '../components/Viewer';
import { hub, dayOf, randomDay, peopleOfYear, tagWorlds } from '../api/hub';
import { cdn } from '../api/client';
import { shortDay, yearOf } from '../lib/date';

const H10 = 10 * 60_000;

export default function Portal() {
  const [sp, setSp] = useSearchParams(), warp = useWarp(), nav = useNavigate();
  const tl = useQuery({ queryKey: ['timeline'], queryFn: hub.timeline, staleTime: H10 });
  const persons = useQuery({ queryKey: ['persons'], queryFn: hub.persons, staleTime: H10 });
  const worlds = useQuery({ queryKey: ['tagworlds'], queryFn: () => tagWorlds(9), staleTime: H10 });
  const notes = useQuery({ queryKey: ['notes', 'recent'], queryFn: () => hub.notes({ size: 80 }), staleTime: H10 });

  const now = new Date(), buckets = tl.data ?? [];
  const counts = useMemo(() => { const c: Record<number, number> = {}; buckets.forEach(b => { c[b.year] = (c[b.year] ?? 0) + b.count; }); return c; }, [buckets]);
  const years = useMemo(() => Object.keys(counts).map(Number).sort((a, b) => b - a), [counts]);
  const thisMonth = now.getMonth() + 1;
  const fallbackYear = years.find(y => buckets.some(b => b.year === y && b.month === thisMonth && b.count > 0)) ?? years[0] ?? now.getFullYear();
  const year = Number(sp.get('y')) || fallbackYear;
  const [pm, pd] = (sp.get('d') ?? '').split('-').map(Number), isRandom = !!(pm && pd);
  const month = pm || thisMonth, day = pd || now.getDate();
  const theme = useMemo(() => yearTheme(year), [year]);
  const dayQ = useQuery({ queryKey: ['day', year, month, day], queryFn: () => dayOf(year, month, day), enabled: tl.isSuccess || tl.isError, staleTime: H10 });
  const [viewing, setViewing] = useState<number | null>(null);

  const items = dayQ.data?.items ?? [], scope = dayQ.data?.scope;
  const people = peopleOfYear(persons.data ?? [], year);
  const note = (notes.data?.content ?? []).find(n => yearOf(n.publishedAt ?? n.createdAt) === year);
  const ago = now.getFullYear() - year;

  const goYear = (y: number) => warp(() => setSp({ y: String(y) }), { tint: yearTheme(y).neb[0] });
  const goRandom = async () => {
    const r = await randomDay(year, buckets).catch(() => null);
    if (r) warp(() => setSp({ y: String(year), d: `${r.month}-${r.day}` }), { tint: theme.neb[1] });
  };
  const enterSection = (id: string) => warp(() => nav(`/s/${id}?y=${year}`), { tint: SECTIONS.find(s => s.id === id)?.planet.atmo });
  const enterTag = (name: string) => warp(() => nav(`/t/${encodeURIComponent(name)}?y=${year}`), { tint: tagTheme(name).neb[0] });

  const lede = scope === 'day' ? `${items.length} khoảnh khắc trong ngày${ago > 0 ? `, ${ago} năm trước` : ''}.`
    : scope === 'month' ? `Đúng ngày ấy không có tấm nào — đây là tháng ${month} năm ${year}.`
    : scope === 'year' ? `Tháng này năm ấy trống — vài khoảnh khắc của cả năm ${year}.`
    : dayQ.isError ? 'Chưa kết nối được kho ký ức.' : 'Đang tìm lại ngày ấy…';

  return (
    <>
      <Scene theme={theme} />
      <div className="ui portal">
        <TopBar onRandom={buckets.length ? goRandom : undefined} />
        <main className="portal-main" key={`${year}-${month}-${day}`}>
          <p className="eyebrow">{isRandom ? 'Một ngày bất kỳ' : `Hôm nay · ${shortDay(thisMonth, now.getDate())}`}</p>
          <h1>{isRandom ? <>{shortDay(month, day)} <span className="yr">{year}</span></> : <>Ngày này năm <span className="yr">{year}</span></>}</h1>
          <p className="lede">{lede}</p>
          {items.length > 0 && (
            <div className="strip">
              {items.slice(0, 6).map((m, k) => (
                <button type="button" key={m.id} className="shot" onClick={() => setViewing(k)} style={{ ['--k' as string]: k }}>
                  <img src={cdn(m.thumbnailUrl ?? m.cdnUrl, 320)} alt={m.caption ?? ''} loading="lazy" />
                  {m.fileType === 'VIDEO' && <i className="play" aria-hidden="true" />}
                  {k === 5 && items.length > 6 && <span className="plus">+{items.length - 6}</span>}
                </button>
              ))}
            </div>
          )}
          {(people.length > 0 || note) && (
            <div className="memory-row">
              {people.length > 0 && (
                <div className="mem">
                  <h3>Năm ấy có</h3>
                  <p>{people.map(p => p.displayName || p.name).join(', ')}</p>
                </div>
              )}
              {note && (
                <div className="mem">
                  <h3>{note.kind === 'ARTICLE' ? 'Bài viết năm ấy' : 'Trang nhật ký năm ấy'}</h3>
                  <p className="mem-title">{note.title || note.excerpt || note.content.replace(/<[^>]+>/g, '').slice(0, 80)}</p>
                </div>
              )}
            </div>
          )}
        </main>
        <SectionWorlds onEnter={enterSection} />
        <TagWorlds tags={worlds.data ?? []} onEnter={enterTag} />
        {years.length > 0 && <YearRail years={years} counts={counts} active={year} onPick={goYear} />}
        <p className="sky-name">Bầu trời {year} · {theme.name}</p>
      </div>
      {viewing !== null && <Viewer items={items} start={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
