import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { fmt, usePersons, useTimeline } from '../lib/queries';
import { isoDay } from '../lib/date';
import PhotoGroups, { Sentinel, useViewer } from '../components/PhotoGroups';
import { YearChip } from '../components/Paper';
import { eraClass } from '../lib/era';

const T = 10 * 60_000;

export default function Photos() {
  const [sp, setSp] = useSearchParams(), tl = useTimeline(), persons = usePersons();
  const q = sp.get('q') ?? '', tag = sp.get('tag'), person = sp.get('person'), fav = sp.get('fav') === '1', type = sp.get('type') as 'IMAGE' | 'VIDEO' | null;
  const year = Number(sp.get('year')) || 0, month = Number(sp.get('month')) || 0, old = sp.get('sort') === 'old';
  /* a month filter shows files known to that month; this adds the ones known only to the year / season around it */
  const vague = !!month && sp.get('vague') === '1';
  const from = year ? (month ? isoDay(new Date(year, month - 1, 1)) : `${year}-01-01`) : undefined;
  const to = year ? (month ? isoDay(new Date(year, month, 1)) : `${year + 1}-01-01`) : undefined;
  const inf = useInfiniteQuery({
    queryKey: ['photos', q, tag, person, fav, type, year, month, old, vague], initialPageParam: 0, staleTime: T,
    queryFn: ({ pageParam }) => hub.search({ q: q || undefined, tagNames: tag ? [tag] : undefined, personId: person || undefined, favorite: fav || undefined, type: type || undefined, from, to, vague: vague || undefined, sortBy: 'effectiveDate', sortDir: old ? 'asc' : 'desc', page: pageParam, size: 90, inclPersons: true, inclTags: true }),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
  const items = inf.data?.pages.flatMap(p => p.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? 0, viewer = useViewer(items);
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k === 'year') n.delete('month'); n.delete('p'); setSp(n); };
  const who = person ? (persons.data ?? []).find(p => p.id === person) : undefined;
  const title = q ? `“${q}”` : who ? (who.displayName || who.name) : tag ? tag : year ? (month ? `Tháng ${month}, ${year}` : `Năm ${year}`) : fav ? 'Yêu thích' : type === 'VIDEO' ? 'Video' : 'Tất cả ảnh';
  const months = year ? (tl.data ?? []).filter(b => b.year === year && b.count > 0).sort((a, b) => a.month - b.month) : [];
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  const pills: [string, string][] = [];
  if (q) pills.push(['q', `Tìm: ${q}`]); if (who) pills.push(['person', who.displayName || who.name]); if (tag) pills.push(['tag', `Vùng: ${tag}`]); if (year) pills.push(['year', `${month ? `Tháng ${month}/` : ''}${year}`]);

  const plain = !q && !tag && !person && !fav && !type && !year;
  const years = [...new Set((tl.data ?? []).filter(b => b.count > 0 && b.year >= 1900).map(b => b.year))].sort((a, b) => b - a);
  const tools = <>
    <div className="seg">
      <a className={!type && !fav ? 'on' : ''} onClick={() => { const n = new URLSearchParams(sp); n.delete('type'); n.delete('fav'); n.delete('p'); setSp(n); }}>Tất cả</a>
      <a className={type === 'IMAGE' ? 'on' : ''} onClick={() => set('type', 'IMAGE')}>Ảnh</a>
      <a className={type === 'VIDEO' ? 'on' : ''} onClick={() => set('type', 'VIDEO')}>Video</a>
      <a className={fav ? 'on' : ''} onClick={() => set('fav', fav ? null : '1')}>Yêu thích</a>
    </div>
    <button type="button" className="sortbtn" onClick={() => set('sort', old ? null : 'old')}>{old ? 'Cũ nhất trước' : 'Mới nhất trước'} ⇅</button>
  </>;

  return (
    <div className="wrap page ph">
      {/* a year opens on a band of its era: the year set large, its months to step through */}
      {year ? <header className={`ph-band ${eraClass(year)}`}>
        <Link className="back" to="/photos">← Tất cả ảnh</Link>
        <div className="ph-band-top"><h1><b>{year}</b>{month ? <span>Tháng {month}</span> : null}</h1><span className="ph-n">{inf.isLoading ? 'Đang tải…' : `${fmt(total)} ${type === 'VIDEO' ? 'video' : 'mục'}`}</span>{tools}</div>
        {months.length > 0 && <div className="ph-months"><a className={!month ? 'on' : ''} onClick={() => set('month', null)}>Cả năm</a>{months.map(b => <a key={b.month} className={month === b.month ? 'on' : ''} onClick={() => set('month', String(b.month))}>Tháng {b.month}</a>)}{!!month && <a className={`more ${vague ? 'on' : ''}`} onClick={() => set('vague', vague ? null : '1')} title="Thêm những ảnh chỉ biết năm hoặc mùa">+ ảnh không rõ tháng</a>}</div>}
      </header>
        : <header className="ph-head"><h1>{title}</h1><span className="ph-n">{inf.isLoading ? 'Đang tải…' : `${fmt(total)} ${type === 'VIDEO' ? 'video' : 'mục'}`}</span>{tools}</header>}
      {pills.filter(([k]) => k !== 'year').length > 0 && <div className="pills">{pills.filter(([k]) => k !== 'year').map(([k, label]) => <button key={k} type="button" className="fpill" onClick={() => set(k, null)}>{label}<i>✕</i></button>)}</div>}
      {plain && years.length > 0 && <nav className="ph-years" aria-label="Các năm">{years.map(y => <Link key={y} to={`/photos?year=${y}`}><YearChip year={y} /></Link>)}</nav>}
      {!inf.isLoading && !items.length && <div className="card empty">Không có ảnh nào khớp. <Link to="/photos">Xem tất cả ảnh</Link></div>}
      <PhotoGroups items={items} onOpen={viewer.open} years={!year} />
      <Sentinel more={more} active={!!inf.hasNextPage} />
      {viewer.element}
    </div>
  );
}
