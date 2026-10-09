import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub, dayOf, peopleOfYear, randomLine } from '../api/hub';
import { cdn, pic } from '../api/client';
import type { MediaFile, Person } from '../types';
import { counts, excerptOf, fmt, noteDate, noteHref, readMinutes, useAlbums, useNotes, usePersons, useRegions, useTimeline } from '../lib/queries';
import { dayMonthYear, isoDay, longDay, yearOf } from '../lib/date';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';

const T = 10 * 60_000, FOOTBALL = import.meta.env.VITE_FOOTBALL_URL;
const nameOf = (p: Person) => p.displayName || p.name;

export default function Home() {
  const [sp] = useSearchParams(), tl = useTimeline(), persons = usePersons(), notes = useNotes(), albums = useAlbums(), regions = useRegions();
  const buckets = tl.data ?? [], c = counts(buckets), years = Object.keys(c).map(Number).sort((a, b) => b - a), now = new Date();
  const [pm, pd] = (sp.get('d') ?? '').split('-').map(Number), month = pm || now.getMonth() + 1, day = pd || now.getDate();
  const year = Number(sp.get('y')) || years.find(y => buckets.some(b => b.year === y && b.month === month && b.count > 0)) || years[0] || now.getFullYear();
  const ready = tl.isSuccess || tl.isError;
  const dayQ = useQuery({ queryKey: ['day', year, month, day], queryFn: () => dayOf(year, month, day), enabled: ready, staleTime: T });
  const monthQ = useQuery({ queryKey: ['month', year, month], enabled: ready, staleTime: T,
    queryFn: () => hub.search({ from: isoDay(new Date(year, month - 1, 1)), to: isoDay(new Date(year, month, 1)), size: 13, sortBy: 'effectiveDate', sortDir: 'asc' }) });
  const [viewer, setViewer] = useState<{ items: MediaFile[]; i: number } | null>(null);

  const items = dayQ.data?.items ?? [], scope = dayQ.data?.scope, people = peopleOfYear(persons.data ?? [], year);
  const yearNote = (notes.data ?? []).find(n => yearOf(noteDate(n)) === year);
  const otherYears = years.filter(y => y !== year && buckets.some(b => b.year === y && b.month === month && b.count > 0)).slice(0, 9);
  const monthCount = buckets.find(b => b.year === year && b.month === month)?.count ?? 0;
  const written = notes.data ?? [], featured = written.find(n => n.kind === 'ARTICLE') ?? written[0], rest = written.filter(n => n !== featured).slice(0, 3);
  const kicker = scope === 'day' ? `Ngày này năm ${year}` : scope === 'month' ? `Tháng này năm ${year}` : `Năm ${year}`;
  const title = scope === 'day' ? longDay(year, month, day) : scope === 'month' ? `Tháng ${month}, ${year}` : `Năm ${year}`;

  return (
    <div className="wrap page" key={`${year}-${month}-${day}`}>
      <section className="focus">
        <div className="card today">
          {items[0] ? <div className="img zoom" onClick={() => setViewer({ items, i: 0 })}><img src={cdn(pic(items[0], true), 1280)} alt={items[0].caption ?? ''} /><span className="badge">{items.length} ảnh{yearNote ? ' · 1 trang viết' : ''}</span></div>
            : <div className="img ph">{dayQ.isLoading || !ready ? 'Đang tìm lại ngày ấy…' : 'Chưa có ảnh'}</div>}
          <div className="body">
            <p className="kicker">{kicker}</p>
            <h1>{title}</h1>
            <p>{items[0]?.caption || (yearNote ? `${yearNote.title || 'Một trang viết'} — ${excerptOf(yearNote, 90)}` : scope === 'day' ? `${items.length} khoảnh khắc trong ngày.` : 'Ngày ấy không có tấm nào, đây là quanh thời điểm đó.')}</p>
            <div className="row">
              {items.length > 1 && <div className="thumbs">{items.slice(1, 5).map((m, k) => <img key={m.id} className="zoom" src={cdn(pic(m), 160)} alt="" onClick={() => setViewer({ items, i: k + 1 })} />)}</div>}
              {people.slice(0, 2).map(p => <span key={p.id} className="pill">{p.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : null}{nameOf(p)}</span>)}
            </div>
          </div>
        </div>
        <div className="years">
          <div className="hd"><h2>Tháng này các năm</h2><Link to="/photos" style={{ ['--c' as string]: 'var(--photo)' }}>Tất cả</Link></div>
          {otherYears.map(y => <YearCard key={y} year={y} month={month} count={buckets.find(b => b.year === y && b.month === month)?.count ?? 0} />)}
        </div>
      </section>

      <section className="lanes">
        <div>
          <div className="block">
            <div className="hd"><h2>Tháng {month}, {year}</h2><span>{fmt(monthCount)} ảnh</span><Link to={`/photos?year=${year}&month=${month}`} style={{ ['--c' as string]: 'var(--photo)' }}>Mở trong kho ảnh</Link></div>
            {monthQ.data?.content.length ? <Justified items={monthQ.data.content} rowHeight={168} gap={8} onOpen={(i) => setViewer({ items: monthQ.data!.content, i })} /> : <div className="card empty">Tháng này chưa có ảnh.</div>}
          </div>
          {featured && <div className="block">
            <div className="hd"><h2>Viết gần đây</h2><span>{written.length} bài</span><Link to="/journal">Vào Nhật ký</Link></div>
            <Link className="card featured" to={noteHref(featured)}>
              {featured.coverMedia ? <img src={cdn(pic(featured.coverMedia, true), 900)} alt="" /> : <div className="ph" />}
              <div className="body"><span className="cat">{featured.category || (featured.kind === 'ARTICLE' ? 'Bài viết' : 'Ghi chép')}</span><h3>{featured.title || 'Không tiêu đề'}</h3><p>{excerptOf(featured)}</p><span className="by">{dayMonthYear(noteDate(featured))} · {readMinutes(featured)} phút đọc</span></div>
            </Link>
            <div className="posts" style={{ marginTop: 16 }}>{rest.map(n => <PostRow key={n.id} n={n} />)}</div>
          </div>}
        </div>
        <aside className="rail">
          <ChatCard people={people.length ? people : (persons.data ?? []).filter(p => !p.isSelf)} />
          <RandomPhoto onOpen={(m) => setViewer({ items: [m], i: 0 })} />
          {FOOTBALL && <div className="card" style={{ ['--c' as string]: 'var(--football)' }}><h3><i />Bóng đá</h3><a href={FOOTBALL} style={{ fontWeight: 600 }}>Mở Fantasy Football →</a></div>}
        </aside>
      </section>

      {!!albums.data?.length && <section><div className="hd"><h2>Album</h2><span>{albums.data.length} album</span><Link to="/photos/albums" style={{ ['--c' as string]: 'var(--photo)' }}>Tất cả album</Link></div>
        <div className="albums">{albums.data.slice(0, 6).map(a => <Link key={a.id} className="album" to={`/photos/albums/${a.id}`}><div className="cov">{a.thumbnailUrl ? <img src={cdn(a.thumbnailUrl, 400)} alt="" /> : <div className="ph" style={{ width: '100%', height: '100%' }} />}</div><b>{a.name}</b><span>{fmt(a.mediaCount ?? 0)} ảnh</span></Link>)}</div></section>}

      <section className="duo">
        <div><div className="hd"><h2>Angels</h2><span>{(persons.data ?? []).filter(p => !p.isSelf).length} người</span><Link to="/angels" style={{ ['--c' as string]: 'var(--angels)' }}>Vào Angels</Link></div>
          <div className="people">{(persons.data ?? []).filter(p => !p.isSelf).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured)).slice(0, 6).map(p => (
            <Link key={p.id} className="person" to={`/angels/${p.id}`}>{p.avatarUrl ? <img src={cdn(p.avatarUrl, 200)} alt="" /> : <span className="letter-ph">{nameOf(p).slice(0, 1)}</span>}<b>{nameOf(p)}</b><span>{p.period ?? ''}</span></Link>))}</div></div>
        {!!regions.data?.length && <div><div className="hd"><h2>Vùng</h2><span>theo tag</span></div>
          <div className="regions">{regions.data.map(r => <Link key={r.id} className="region" to={`/tags/${encodeURIComponent(r.name)}`} style={{ paddingLeft: 12 }}><span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: r.color || 'var(--ink3)' }} />{r.name}<small>{fmt(r.count)}</small></Link>)}</div></div>}
      </section>
      {viewer && <Viewer items={viewer.items} start={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  );
}

function YearCard({ year, month, count }: { year: number; month: number; count: number }) {
  const q = useQuery({ queryKey: ['yearcover', year, month], staleTime: T,
    queryFn: async () => (await hub.search({ from: isoDay(new Date(year, month - 1, 1)), to: isoDay(new Date(year, month, 1)), size: 1, random: true, type: 'IMAGE' })).content[0] ?? null });
  return (
    <Link className={`ycard ${q.data ? '' : 'ph'}`} to={`/?y=${year}`}>
      {pic(q.data) && <img src={cdn(pic(q.data), 400)} alt="" />}<b>{year}</b><span>{fmt(count)} ảnh</span>
    </Link>
  );
}

export function PostRow({ n }: { n: import('../types').Note }) {
  return (
    <Link className="post" to={noteHref(n)}>
      <div><span className="cat">{n.category || (n.kind === 'ARTICLE' ? 'Bài viết' : 'Ghi chép')}</span><h4>{n.title || 'Không tiêu đề'}</h4><p>{excerptOf(n)}</p><span className="by">{dayMonthYear(noteDate(n))} · {readMinutes(n)} phút đọc</span></div>
      {pic(n.coverMedia) ? <img src={cdn(pic(n.coverMedia), 240)} alt="" /> : <span className="noimg" />}
    </Link>
  );
}

function ChatCard({ people }: { people: Person[] }) {
  const ids = people.map(p => p.id).join(','), [n, setN] = useState(0);
  const q = useQuery({ queryKey: ['line', ids, n], queryFn: () => randomLine(people), enabled: people.length > 0, staleTime: T });
  if (!people.length || (q.isSuccess && !q.data)) return null;
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}>
      <h3><i />Một dòng tin nhắn<button type="button" onClick={() => setN(v => v + 1)}>Đổi</button></h3>
      {q.data ? <><span className="bubble">{q.data.text}</span><div className="meta">{q.data.who} · {q.data.platform}{q.data.at ? ` · ${dayMonthYear(q.data.at)}` : ''}</div></> : <div className="meta">Đang lục lại…</div>}
    </div>
  );
}

function RandomPhoto({ onOpen }: { onOpen: (m: MediaFile) => void }) {
  const [n, setN] = useState(0), q = useQuery({ queryKey: ['randomphoto', n], queryFn: async () => (await hub.search({ random: true, size: 1, type: 'IMAGE' })).content[0] ?? null, staleTime: T });
  if (q.isSuccess && !q.data) return null;
  const m = q.data, d = m?.effectiveDate;
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--photo)' }}>
      <h3><i />Một tấm ngẫu nhiên<button type="button" onClick={() => setN(v => v + 1)}>Đổi</button></h3>
      {m ? <><img className="pic zoom" src={cdn(pic(m), 480)} alt="" onClick={() => onOpen(m)} /><div className="meta">{[m.caption, d ? dayMonthYear(d) : ''].filter(Boolean).join(' · ')}</div></> : <div className="pic ph" />}
    </div>
  );
}
