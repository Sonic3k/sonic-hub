import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { fmt, usePersons, useTimeline } from '../lib/queries';
import { isoDay } from '../lib/date';
import PhotoGroups, { Sentinel, useViewer } from '../components/PhotoGroups';

const T = 10 * 60_000;

export default function Photos() {
  const [sp, setSp] = useSearchParams(), tl = useTimeline(), persons = usePersons();
  const q = sp.get('q') ?? '', tag = sp.get('tag'), person = sp.get('person'), fav = sp.get('fav') === '1', type = sp.get('type') as 'IMAGE' | 'VIDEO' | null;
  const year = Number(sp.get('year')) || 0, month = Number(sp.get('month')) || 0, old = sp.get('sort') === 'old';
  const from = year ? (month ? isoDay(new Date(year, month - 1, 1)) : `${year}-01-01`) : undefined;
  const to = year ? (month ? isoDay(new Date(year, month, 1)) : `${year + 1}-01-01`) : undefined;
  const inf = useInfiniteQuery({
    queryKey: ['photos', q, tag, person, fav, type, year, month, old], initialPageParam: 0, staleTime: T,
    queryFn: ({ pageParam }) => hub.search({ q: q || undefined, tagNames: tag ? [tag] : undefined, personId: person || undefined, favorite: fav || undefined, type: type || undefined, from, to, sortBy: 'effectiveDate', sortDir: old ? 'asc' : 'desc', page: pageParam, size: 90, inclPersons: true, inclTags: true }),
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

  return (
    <div className="wrap page">
      <div className="ptitle">
        <h1>{title}</h1><span>{inf.isLoading ? 'Đang tải…' : `${fmt(total)} ${type === 'VIDEO' ? 'video' : 'mục'}`}</span>
        <div className="seg">
          <a className={!type && !fav ? 'on' : ''} onClick={() => { const n = new URLSearchParams(sp); n.delete('type'); n.delete('fav'); n.delete('p'); setSp(n); }}>Tất cả</a>
          <a className={type === 'IMAGE' ? 'on' : ''} onClick={() => set('type', 'IMAGE')}>Ảnh</a>
          <a className={type === 'VIDEO' ? 'on' : ''} onClick={() => set('type', 'VIDEO')}>Video</a>
          <a className={fav ? 'on' : ''} onClick={() => set('fav', fav ? null : '1')}>Yêu thích</a>
        </div>
        <button type="button" className="sortbtn" onClick={() => set('sort', old ? null : 'old')}>{old ? 'Cũ nhất trước' : 'Mới nhất trước'} ⇅</button>
      </div>
      {pills.length > 0 && <div className="pills">{pills.map(([k, label]) => <button key={k} type="button" className="fpill" onClick={() => set(k, null)}>{label}<i>✕</i></button>)}</div>}
      {months.length > 0 && <div className="mchips"><a className={!month ? 'on' : ''} onClick={() => set('month', null)}>Cả năm</a>{months.map(b => <a key={b.month} className={month === b.month ? 'on' : ''} onClick={() => set('month', String(b.month))}>Th {b.month}<small>{b.count}</small></a>)}</div>}
      {!inf.isLoading && !items.length && <div className="card empty">Không có ảnh nào khớp. <Link to="/photos">Xem tất cả ảnh</Link></div>}
      <PhotoGroups items={items} onOpen={viewer.open} />
      <Sentinel more={more} active={!!inf.hasNextPage} />
      {viewer.element}
    </div>
  );
}
