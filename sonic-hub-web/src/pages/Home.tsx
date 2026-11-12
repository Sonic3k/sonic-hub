/* Hôm nay: the day being looked at — today's date in a year of his, or any day picked on the header's calendar.
   The page brings up what the hub holds around that day, and only what it holds: the photos, what happened, the
   stretch of life it falls in, the machines he had, what he was playing and listening to, what was being said on
   the forums, what he wrote. Paper and ink are those of the day's era. */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub, dayOf } from '../api/hub';
import { musicApi } from '../api/music';
import { cdn, pic } from '../api/client';
import type { DeskMemory, LifeEvent, MediaFile } from '../types';
import { excerptOf, noteDate, noteHref, readMinutes, useNotes, useTimeline } from '../lib/queries';
import { dayMonthYear, eventLabel, isoDay, longDay } from '../lib/date';
import { atOf, isoOf, useMoment, type Moment } from '../lib/moment';
import { eraClass } from '../lib/era';
import { chaptersAt, deviceRange, eventsOnDay, gamesAt, listsAt, notesNear } from '../lib/life';
import { kindName, useLifeChapters, useMemories, useSelf } from './Memories';
import { eventDays, useEvents } from './Events';
import { useGames } from './Games';
import { useLists } from './Spotify';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';
import { HandNote, MachineTile, ModeSwitch, Print, Rows, SameDay, Tile, type DayCard, type Row } from '../components/Paper';

const T = 10 * 60_000;
const FINE = new Set(['DAY', 'HOUR', 'MINUTE', 'SECOND']);
/** how far from the day something still counts as around it */
const NEAR = 200 * 86400_000;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ratioOf = (m: MediaFile) => Math.min(16 / 9, Math.max(4 / 5, m.aspectRatio || (m.width && m.height ? m.width / m.height : 1.5)));
/** a memory's date as far as it is known, never finer than the day ("12/11/2007", "11/2007", "2007") */
const memoryDate = (e: DeskMemory) => (e.at ? eventLabel({ date: e.at, precision: !e.precision || FINE.has(e.precision) ? 'DAY' : (e.precision as 'MONTH') }) : '');
/** words someone really wrote or said, when a title or a caption quotes them */
const quoted = (s?: string | null) => { const q = /(?:^|[\s(:])[“"']([^”"']{6,48})[”"'](?=$|[\s).,;!?])/.exec(s ?? '')?.[1]; return q && q.trim().includes(' ') ? q.trim() : null; };

export default function Home() {
  const { moment } = useMoment();
  if (!moment) return <div className="hm"><p className="hm-wait">Đang tìm lại ngày ấy…</p></div>;
  return <Today key={isoOf(moment)} moment={moment} />;
}

function Today({ moment }: { moment: Moment }) {
  const { y, m, d } = moment, iso = isoOf(moment), at = atOf(moment), { pick } = useMoment();
  const self = useSelf(), tl = useTimeline(), notes = useNotes(), chapters = useLifeChapters(), games = useGames(), lists = useLists(), events = useEvents(), memories = useMemories();
  const dayQ = useQuery({ queryKey: ['day', y, m, d], queryFn: () => dayOf(y, m, d), staleTime: T });
  const desk = useQuery({ queryKey: ['desk-at', at], queryFn: () => hub.deskAt(at), staleTime: T });
  const around = useQuery({ queryKey: ['events-at', at], queryFn: () => hub.eventsAt(at), staleTime: T });
  const upTo = useQuery({ queryKey: ['memories-upto', at], queryFn: () => hub.memoriesUpTo(at), staleTime: T });
  const plays = useQuery({ queryKey: ['sp-day', iso], queryFn: () => musicApi.day(iso), enabled: iso >= '2018-12-29', staleTime: T });
  const forums = useQuery({ queryKey: ['forums'], queryFn: hub.forums, staleTime: T });
  const alive = (forums.data ?? []).filter(f => f.firstPostAt && f.lastPostAt && f.firstPostAt.slice(0, 10) <= iso && iso <= f.lastPostAt.slice(0, 10));
  const threads = useQuery({ queryKey: ['forum-at', alive.map(f => f.key).join(','), at], enabled: alive.length > 0, staleTime: T,
    queryFn: async () => (await Promise.all(alive.map(async f => ({ forum: f, thread: (await hub.forumThreads(f.key, { at, size: 1 })).content[0] })))).filter(x => x.thread) });
  const monthQ = useQuery({ queryKey: ['month', y, m], staleTime: T,
    queryFn: () => hub.search({ from: isoDay(new Date(y, m - 1, 1)), to: isoDay(new Date(y, m, 1)), size: 18, sortBy: 'effectiveDate', sortDir: 'asc' }) });
  const [viewer, setViewer] = useState<{ items: MediaFile[]; i: number } | null>(null);

  // ── the photos: one of them on the table, the rest beside and under it
  const scope = dayQ.data?.scope, all = dayQ.data?.items ?? [];
  const lead = all.find(x => x.isFavorite && pic(x)) ?? all.find(x => pic(x));
  const photos = lead ? [lead, ...all.filter(x => x !== lead)] : all;
  // up to six others sit beside it; more than that, four beside and the rest in rows under
  const others = photos.slice(1), beside = (others.length <= 6 ? others : others.slice(0, 4)).filter(x => pic(x)), rest = others.length <= 6 ? [] : others.slice(4);
  const open = (i: number) => setViewer({ items: photos, i });

  // ── what happened: his own memories of the day, the last ones before it, the events around
  const own = (list?: DeskMemory[]) => (list ?? []).filter(e => e.personId === self?.id);
  const today = own(desk.data?.day.memories), story = today[0];
  const going = (around.data?.current ?? []).filter(e => e.precision && FINE.has(e.precision));
  const frame = !story ? going[0] : undefined;
  const rows = useMemo<Row[]>(() => {
    const out: (Row & { sort: string })[] = [], t = new Date(iso).getTime();
    const near = (d?: string | null) => !!d && Math.abs(new Date(d.slice(0, 10)).getTime() - t) <= NEAR;
    const ev = (e: LifeEvent | null | undefined) => { if (e && e.id !== frame?.id && (near(e.startAt) || near(e.endAt))) out.push({ key: `e${e.id}`, sort: e.startAt, when: eventDays(e), title: e.title, to: `/memories/events/${e.id}` }); };
    ev(around.data?.previous);
    going.forEach(ev);
    own(upTo.data?.items).filter(e => e.id !== story?.id && (e.title || e.summary) && near(e.at)).slice(0, 4)
      .forEach(e => out.push({ key: `m${e.id}`, sort: e.at ?? '', when: memoryDate(e), title: e.title || `${(e.summary ?? '').slice(0, 72)}…`, to: `/memories/${e.id}` }));
    today.slice(1).forEach(e => out.push({ key: `t${e.id}`, sort: e.at ?? iso, when: memoryDate(e), title: e.title || `${(e.summary ?? '').slice(0, 72)}…`, to: `/memories/${e.id}` }));
    ev(around.data?.next);
    const seen = new Set<string>(story?.title ? [story.title] : []);
    return out.sort((a, b) => a.sort.localeCompare(b.sort)).filter(r => (seen.has(r.title) ? false : (seen.add(r.title), true)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [around.data, upTo.data, desk.data, self?.id]);

  // ── the stretch of life, the machines, what the sections hold from then
  const life = chaptersAt(chapters.data ?? [], y, m);
  const computer = desk.data?.computer?.device, phone = desk.data?.phone?.device;
  const playing = gamesAt(games.data ?? [], iso).slice(0, 3);
  const heard = useMemo(() => {
    const by = new Map<string, { title: string; ms: number }>();
    (plays.data ?? []).forEach(p => { const k = `${p.title}|${p.artist}`, x = by.get(k) ?? { title: p.title, ms: 0 }; x.ms += p.ms; by.set(k, x); });
    return [...by.values()].sort((a, b) => b.ms - a.ms).slice(0, 3).map(x => x.title);
  }, [plays.data]);
  const kept = listsAt(lists.data ?? [], iso).slice(0, 2);
  const wrote = notesNear(notes.data ?? [], iso, 1)[0];
  const note = quoted(story?.title) ?? quoted(lead?.caption);

  // ── the same day in other years: memories and events on it, then the years with photos this month
  const cards = useMemo<DayCard[]>(() => {
    const md = iso.slice(5), out: DayCard[] = [];
    (memories.data ?? []).filter(e => e.occurredAt && e.title && e.occurredAt.slice(5, 10) === md && +e.occurredAt.slice(0, 4) !== y && (!e.precision || FINE.has(e.precision)))
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)).forEach(e => out.push({ year: +e.occurredAt!.slice(0, 4), title: e.title! }));
    eventsOnDay(events.data ?? [], m, d, y).forEach(e => out.push({ year: +e.startAt.slice(0, 4), title: e.title }));
    const seen = new Set<number>();
    return out.filter(c => (seen.has(c.year) ? false : (seen.add(c.year), true))).slice(0, 3).sort((a, b) => a.year - b.year);
  }, [memories.data, events.data, iso, y, m, d]);
  const years = useMemo(() => [...new Set((tl.data ?? []).filter(b => b.month === m && b.count > 0 && b.year !== y && b.year > 1900).map(b => b.year))]
    .filter(yr => !cards.some(c => c.year === yr)).sort((a, b) => a - b), [tl.data, m, y, cards]);

  const now = new Date(), isToday = m === now.getMonth() + 1 && d === now.getDate();
  const weekday = cap(new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long' }));
  const monthName = `tháng ${m}, ${y}`;

  return (
    <div className="hm page">
      <section className="hm-open">
        <div className="hm-when">
          <p>{isToday ? (y === now.getFullYear() ? `Hôm nay · ${weekday}` : `Ngày này năm ${y}`) : weekday}</p>
          <h1>{d} tháng {m}</h1>
          <ModeSwitch />
        </div>
        <SameDay moment={moment} cards={cards} years={years} onPick={pick} />
      </section>

      <section className={`era ${eraClass(y)}`}>
        <div className="era-in">
          <div className="era-left">
            <div className="era-year"><b>{y}</b><span>{longDay(y, m, d)}</span></div>
            {life.map(c => <Link key={c.id} className="ch" to={`/memories?chapter=${c.id}`}><b>{c.title || c.period}</b>{c.title && <span>{c.period}</span>}</Link>)}
            {note && <HandNote>{note}</HandNote>}
            {(computer || phone) && <div className="era-machines">
              {computer && <MachineTile name={computer.name} range={deviceRange(computer)} href={`/pc?at=${encodeURIComponent(at)}`} photo={computer.photoUrl ? cdn(computer.photoUrl, 640) : null} />}
              {phone && <MachineTile name={phone.name} range={deviceRange(phone)} href={`/phone?at=${encodeURIComponent(at)}`} phone />}
            </div>}
          </div>

          <div className="era-right">
            {dayQ.isLoading && <p className="hm-wait">Đang tìm lại ngày ấy…</p>}
            {lead && <div>
              {scope && scope !== 'day' && <p className="hm-hint">Ngày này không có ảnh. Đây là vài tấm của {scope === 'month' ? monthName : `năm ${y}`}.</p>}
              <div className={`ov ${story || frame || beside.length ? '' : 'solo'}`}>
                <Print className="lead" src={cdn(pic(lead, true), 960)} alt={lead.caption ?? ''} ratio={String(ratioOf(lead))} tilt={-1} tape={-4} onClick={() => open(0)}
                  caption={lead.caption || (scope === 'day' ? dayMonthYear(iso) : lead.effectiveDate ? dayMonthYear(lead.effectiveDate) : undefined)} />
                {(story || frame || beside.length > 0) && <div className="lead-side">
                  {story && <Story label={kindName(story.kind) || 'Ký ức'} title={story.title || 'Ngày hôm đó'} text={story.summary} place={story.place} to={`/memories/${story.id}`} />}
                  {frame && <Story label="Đang diễn ra" title={frame.title} text={frame.summary} place={frame.place} when={eventDays(frame)} to={`/memories/events/${frame.id}`} />}
                  {beside.length > 0 && <div className="thumbs4">{beside.map(x => <button key={x.id} type="button" className="zoom" onClick={() => open(photos.indexOf(x))}><img src={cdn(pic(x), 320)} alt={x.caption ?? ''} loading="lazy" /></button>)}</div>}
                </div>}
              </div>
              {rest.length > 0 && <div className="hm-rest"><Justified items={rest} rowHeight={128} gap={8} onOpen={i => open(i + 5)} /></div>}
            </div>}
            {!lead && !dayQ.isLoading && (story || frame) && <div className="lead-side alone">
              {story && <Story label={kindName(story.kind) || 'Ký ức'} title={story.title || 'Ngày hôm đó'} text={story.summary} place={story.place} to={`/memories/${story.id}`} />}
              {frame && <Story label="Đang diễn ra" title={frame.title} text={frame.summary} place={frame.place} when={eventDays(frame)} to={`/memories/events/${frame.id}`} />}
            </div>}

            {rows.length > 0 && <div><h2 className="hm-h">Quanh ngày này</h2><Rows rows={rows} /></div>}

            <div className="tiles">
              {playing.length > 0 && <Tile label="Game" to={playing.length === 1 ? `/games/${playing[0].key}` : '/games'}>{playing.map(g => g.title).join(', ')}</Tile>}
              {heard.length > 0
                ? <Tile label="Nghe hôm đó" to={`/music/spotify?y=${y}&v=days&day=${iso}`}>{heard.join(', ')}</Tile>
                : kept.length > 0 && <Tile label="Music" to={kept.length === 1 ? `/music/lists/${kept[0].key}` : '/music'}>{kept.map(p => p.title).join(', ')}</Tile>}
              {(threads.data ?? []).map(({ forum, thread }) => <Tile key={forum.key} label={forum.name.replace(/\s*\(.*\)$/, '')} to={`/forum/t/${thread.id}`}>{thread.title}</Tile>)}
              {wrote && <Tile label={`Nhật ký · ${dayMonthYear(noteDate(wrote))}`} to={noteHref(wrote)}>{wrote.title || 'Không tiêu đề'}</Tile>}
            </div>
          </div>
        </div>
      </section>

      {!!monthQ.data?.content.length && <section className="hm-month">
        <div className="hm-month-hd"><h2>{cap(monthName)}</h2><Link to={`/photos?year=${y}&month=${m}`}>Mở trong kho ảnh</Link></div>
        <Justified items={monthQ.data.content} rowHeight={168} gap={8} onOpen={i => setViewer({ items: monthQ.data!.content, i })} />
      </section>}
      {viewer && <Viewer items={viewer.items} start={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  );
}

/** What the day was: a memory of his, or the event it sits in. */
function Story({ label, title, text, place, when, to }: { label: string; title: string; text?: string | null; place?: string | null; when?: string; to: string }) {
  return (
    <Link className="daycard" to={to}>
      <span className="daycard-k">{[label, when, place].filter(Boolean).join(' · ')}</span>
      <b>{title}</b>
      {text && <p>{text}</p>}
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
