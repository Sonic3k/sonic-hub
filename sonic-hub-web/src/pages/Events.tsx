/* Sự kiện: the clear frames of a life — a trip, a concert, a move. Memories come back at random; an event says
   where a moment sits: what was going on then and what came next. Written in the admin; here they are only read. */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import { fmt } from '../lib/queries';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';
import type { LifeEvent, LifeEventMoney, MediaFile } from '../types';

const T = 10 * 60_000;
/** the kinds of event, as they read here */
const KINDS: Record<string, string> = { TRIP: 'Chuyến đi', CONCERT: 'Concert', SHOW: 'Show', MILESTONE: 'Cột mốc', PURCHASE: 'Mua sắm', WORK: 'Công việc',
  STUDY: 'Học tập', GATHERING: 'Gặp gỡ', CELEBRATION: 'Kỷ niệm', MOVE: 'Chuyển nhà', SPORT: 'Thể thao' };
export const eventKind = (k?: string | null) => (k ? KINDS[k] ?? '' : '');
export const eventHref = (e: { id: string }) => `/memories/events/${e.id}`;
/** "16/02/2023 – 20/02/2023", "02/2023", "2023" ("~" kept) */
/** an event's days on one short line: "16 – 17/11/2019", "29/10 – 13/11/2011", "14/03/2019"; anything known less finely as eventWhen writes it */
export function eventDays(e: Pick<LifeEvent, 'when'>): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: → (\d{4})-(\d{2})-(\d{2}))?$/.exec(e.when);
  if (!m) return eventWhen(e);
  const [, y1, m1, d1, y2, m2, d2] = m;
  if (!y2) return `${d1}/${m1}/${y1}`;
  if (y1 !== y2) return `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
  return m1 === m2 ? `${+d1} – ${+d2}/${m2}/${y2}` : `${d1}/${m1} – ${d2}/${m2}/${y2}`;
}
export function eventWhen(e: Pick<LifeEvent, 'when'>): string {
  return e.when.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, y, m, d) => `${d}/${m}/${y}`).replace(/(\d{4})-(\d{2})(?!\/)/g, (_, y, m) => `${m}/${y}`).replace(' → ', ' – ');
}
export const spent = (m: LifeEventMoney[]) => m.filter(x => x.out > 0).map(x => `${fmt(Math.round(x.out))} ${x.currency}`).join(' · ');

export function useEvents() {
  return useQuery({ queryKey: ['events'], staleTime: T, queryFn: () => hub.events() });
}

export function EventsIndex() {
  const all = useEvents();
  const list = all.data ?? [];
  const groups = useMemo(() => {
    const g: [string, LifeEvent[]][] = [];
    [...list].sort((a, b) => a.startAt.localeCompare(b.startAt)).forEach(e => {
      const y = e.startAt.slice(0, 4), last = g[g.length - 1];
      if (last && last[0] === y) last[1].push(e); else g.push([y, [e]]);
    });
    return g;
  }, [list]);
  const title = (id?: string | null) => list.find(e => e.id === id)?.title;
  return (
    <div className="wrap page mem">
      <div className="ptitle"><h1>Sự kiện</h1><span>{fmt(list.length)} sự kiện</span></div>
      <section className="lanes">
        <div>
          {all.isLoading && <div className="card empty">Đang mở…</div>}
          {!all.isLoading && !list.length && <div className="card empty">Chưa có sự kiện nào.</div>}
          {groups.map(([y, es]) => <div key={y}><div className="month">{y}</div><div className="posts">{es.map(e => (
            <Link key={e.id} className="post" to={eventHref(e)}>
              <div><span className="cat">{[eventKind(e.kind), eventWhen(e)].filter(Boolean).join(' · ')}</span><h4>{e.title}</h4>
                {e.summary && <p>{e.summary}</p>}
                <span className="by">{[e.place, e.parentId && title(e.parentId) ? `thuộc ${title(e.parentId)}` : '', e.memories ? `${e.memories} ký ức` : '', e.albums ? `${e.albums} album` : '', spent(e.money)].filter(Boolean).join(' · ')}</span></div>
              {e.coverUrl ? <img src={cdn(e.coverUrl, 240)} alt="" /> : <span className="noimg" />}
            </Link>))}</div></div>)}
        </div>
        <aside className="rail"><NowCard list={list} /></aside>
      </section>
    </div>
  );
}

/** today, as the events see it: what you are in now and what comes next */
function NowCard({ list }: { list: LifeEvent[] }) {
  const now = new Date().toISOString().slice(0, 19);
  const cur = list.filter(e => e.startAt <= now && e.endExclusive > now), next = list.filter(e => e.startAt > now).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  if (!cur.length && !next) return null;
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--memory)' }}><h3><i />Bây giờ</h3>
      <nav className="mem-same">
        {cur.map(e => <Link key={e.id} to={eventHref(e)}>{e.title}<small>{eventWhen(e)}</small></Link>)}
        {next && <Link to={eventHref(next)}>{next.title}<small>Sắp tới · {eventWhen(next)}</small></Link>}
      </nav>
    </div>
  );
}

export function EventPage() {
  const { id } = useParams(), all = useEvents();
  const q = useQuery({ queryKey: ['event', id], enabled: !!id, staleTime: T, queryFn: () => hub.event(id!) });
  const e = q.data;
  // the photos of its albums (the first 60, oldest first)
  const albumIds = (e?.albumList ?? []).map(a => a.id).join(',');
  const photos = useQuery({
    queryKey: ['event-photos', id, albumIds], enabled: !!albumIds, staleTime: T,
    queryFn: async () => {
      const lists = await Promise.all((e!.albumList).slice(0, 8).map(a => hub.albumMedia(a.id, 'asc').catch(() => [] as MediaFile[])));
      const seen = new Set<string>();
      return lists.flat().filter(m => (m.fileType === 'IMAGE' || m.fileType === 'VIDEO') && !seen.has(m.id) && (seen.add(m.id), true)).slice(0, 60);
    },
  });
  const [viewer, setViewer] = useState<number | null>(null);
  const list = [...(all.data ?? [])].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const i = e ? list.findIndex(x => x.id === e.id) : -1, prev = i > 0 ? list[i - 1] : undefined, next = i >= 0 ? list[i + 1] : undefined;
  if (q.isLoading) return <div className="reader"><article className="article"><p className="empty">Đang mở…</p></article></div>;
  if (!e) return <div className="reader"><article className="article"><Link className="back" to="/memories/events">← Sự kiện</Link><h1>Không tìm thấy sự kiện này</h1></article></div>;
  return (
    <div className="page mem">
      <div className="reader">
        <article className="article">
          <Link className="back" to="/memories/events">← Sự kiện</Link><br />
          <span className="cat">{[eventKind(e.kind), eventWhen(e)].filter(Boolean).join(' · ')}</span>
          <h1>{e.title}</h1>
          {(e.place || e.persons.length > 0) && <div className="byline">
            {e.place && <span>{e.place}</span>}
            {e.place && e.persons.length > 0 && <span className="sep">|</span>}
            {e.persons.map(p => <Link key={p.id} className="pill" to={`/angels/${p.id}`}>{p.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : <span className="pill-ph" />}{p.name}</Link>)}
          </div>}
          {e.summary && <div className="prose">{e.summary.split(/\n+/).map((p, k) => <p key={k}>{p}</p>)}</div>}
          {photos.data && photos.data.length > 0
            ? <div className="mem-photos"><Justified items={photos.data} rowHeight={190} gap={8} onOpen={setViewer} /></div>
            : e.coverUrl && <img src={cdn(e.coverUrl, 1200)} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 12, margin: '12px 0' }} />}
          {e.parent && <p className="meta">Thuộc <Link to={eventHref(e.parent)}>{e.parent.title}</Link> ({eventWhen(e.parent)})</p>}
          {e.childEvents.length > 0 && <><h5 className="mem-h">Bao gồm</h5><nav className="mem-same">{e.childEvents.map(c => <Link key={c.id} to={eventHref(c)}>{c.title}<small>{eventWhen(c)}</small></Link>)}</nav></>}
          {e.memoryList.length > 0 && <><h5 className="mem-h">Ký ức</h5><nav className="mem-same">{e.memoryList.map(m => <Link key={m.id} to={`/memories/${m.id}`}>{m.title || m.summary?.slice(0, 80)}<small>{m.when?.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1')}</small></Link>)}</nav></>}
          {e.transactionList.length > 0 && <><h5 className="mem-h">Chi tiêu{spent(e.money) ? ` · ${spent(e.money)}` : ''}</h5>
            <nav className="mem-same">{e.transactionList.map(t => <Link key={t.id} to={`/money?txn=${t.id}`}>{t.description || t.payeeName || t.category || '—'}<small>{t.occurredAt.slice(8, 10)}/{t.occurredAt.slice(5, 7)}/{t.occurredAt.slice(0, 4)} · {fmt(Math.round(t.amount))} {t.currency}</small></Link>)}</nav></>}
          <div className="pn">{prev ? <Link to={eventHref(prev)}><small>← Trước đó</small><b>{prev.title}</b></Link> : <span />}
            {next ? <Link to={eventHref(next)}><small>Sau đó →</small><b>{next.title}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          {e.albumList.length > 0 && <div><h5>Ảnh</h5><nav className="mem-same">{e.albumList.map(a => <Link key={a.id} to={`/photos/albums/${a.id}`}>{a.name}<small>{a.mediaCount ? `${fmt(a.mediaCount)} ảnh` : ''}</small></Link>)}</nav></div>}
          {e.latitude != null && e.longitude != null && <div><h5>Ở đâu</h5><a className="mem-map" href={`https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=11/${e.latitude}/${e.longitude}`} target="_blank" rel="noreferrer">{e.place || `${e.latitude}, ${e.longitude}`} ↗</a></div>}
        </aside>
      </div>
      {viewer !== null && photos.data && <Viewer items={photos.data} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

/** on a memory: the event it is in at that moment, and the next one */
export function EventsAround({ at }: { at?: string | null }) {
  const q = useQuery({ queryKey: ['events-at', at], enabled: !!at, staleTime: T, queryFn: () => hub.eventsAt(at!) });
  const d = q.data;
  if (!d || (!d.current.length && !d.next)) return null;
  return (
    <div><h5>Lúc đó</h5><nav className="mem-same">
      {d.current.map(e => <Link key={e.id} to={eventHref(e)}>{e.title}<small>{eventWhen(e)}</small></Link>)}
      {d.next && <Link to={eventHref(d.next)}>{d.next.title}<small>Sắp tới · {eventWhen(d.next)}</small></Link>}
    </nav></div>
  );
}
