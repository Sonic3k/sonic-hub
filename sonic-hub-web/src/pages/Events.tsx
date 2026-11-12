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
import { eraClass } from '../lib/era';
import { yearBlocks, yearsLabel } from '../lib/life';

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

/* The events year by year, as dated lines: when, what, where — the ones with a story (memories filed under them) a
   little heavier. */
export function EventsIndex() {
  const all = useEvents();
  const list = all.data ?? [];
  const groups = useMemo(() => yearBlocks([...list].sort((a, b) => a.startAt.localeCompare(b.startAt)), e => +e.startAt.slice(0, 4)), [list]);
  const title = (id?: string | null) => list.find(e => e.id === id)?.title;
  return (
    <div className="wrap page mm">
      <header className="mm-head"><h1>Sự kiện</h1></header>
      {all.isLoading && <p className="jn-wait">Đang mở…</p>}
      {!all.isLoading && !list.length && <p className="jn-wait">Chưa có sự kiện nào.</p>}
      <NowCard list={list} />
      {groups.map(({ years, list: es }) => (
        <section key={years[0]} className={`mm-year ${eraClass(years[0])}`}>
          <div className="mm-yh"><b>{yearsLabel(years)}</b></div>
          <div className="mm-rows">{es.map(e => (
            <Link key={e.id} className={`mm-line ${e.memories ? 'told' : ''}`} to={eventHref(e)}>
              <span className="mm-d">{eventDays(e)}</span>
              <span className="mm-b"><b>{e.title}</b><small>{eventKind(e.kind) && <i>{eventKind(e.kind)}</i>}{[e.place, e.parentId && title(e.parentId) ? `thuộc ${title(e.parentId)}` : '', spent(e.money)].filter(Boolean).join(' · ')}</small></span>
              {e.coverUrl && <img src={cdn(e.coverUrl, 160)} alt="" loading="lazy" />}
            </Link>))}</div>
        </section>))}
    </div>
  );
}

/** today, as the events see it: what you are in now and what comes next */
function NowCard({ list }: { list: LifeEvent[] }) {
  const now = new Date().toISOString().slice(0, 19);
  const cur = list.filter(e => e.startAt <= now && e.endExclusive > now), next = list.filter(e => e.startAt > now).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  if (!cur.length && !next) return null;
  return (
    <section className="mm-now"><h2>Bây giờ</h2>
      <div className="mm-rows">
        {cur.map(e => <Link key={e.id} className="mm-line" to={eventHref(e)}><span className="mm-d">{eventDays(e)}</span><span className="mm-b"><b>{e.title}</b></span></Link>)}
        {next && <Link className="mm-line" to={eventHref(next)}><span className="mm-d">{eventDays(next)}</span><span className="mm-b"><b>{next.title}</b><small><i>Sắp tới</i></small></span></Link>}
      </div>
    </section>
  );
}

/* An event opens like a memory: on the paper of its era, its year set large. */
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
  if (q.isLoading) return <div className="page mm"><div className="reader"><article className="article"><p className="empty">Đang mở…</p></article></div></div>;
  if (!e) return <div className="page mm"><div className="reader"><article className="article"><Link className="back" to="/memories/events">← Sự kiện</Link><h1>Không tìm thấy sự kiện này</h1></article></div></div>;
  const y = +e.startAt.slice(0, 4);
  return (
    <div className="page mm">
      <header className={`mm-top ${eraClass(y)}`}><div className="mm-top-in">
        <div className="mm-top-y"><b>{y}</b><span>{eventDays(e)}</span></div>
        <div className="mm-top-t">
          <Link className="back" to="/memories/events">← Sự kiện</Link>
          <span className="mm-k">{eventKind(e.kind) || 'Sự kiện'}</span>
          <h1>{e.title}</h1>
          {(e.place || e.persons.length > 0) && <div className="mm-meta">
            {e.place && <span>{e.place}</span>}
            {e.persons.map(p => <Link key={p.id} className="pill" to={`/angels/${p.id}`}>{p.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : <span className="pill-ph" />}{p.name}</Link>)}
          </div>}
        </div>
      </div></header>
      <div className="reader">
        <article className="article">
          {e.summary && <div className="prose">{e.summary.split(/\n+/).map((p, k) => <p key={k}>{p}</p>)}</div>}
          {photos.data && photos.data.length > 0
            ? <div className="mem-photos"><Justified items={photos.data} rowHeight={190} gap={8} onOpen={setViewer} /></div>
            : e.coverUrl && <img className="mm-cover" src={cdn(e.coverUrl, 1200)} alt="" />}
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
