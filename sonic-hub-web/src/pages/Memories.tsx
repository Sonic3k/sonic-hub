/* Ký ức: your own memories as the hub keeps them — a list through the years, and one memory with its photos.
   They are written and checked in the admin; here they are only read. */
import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub, MEMORY_CARD, periodYears } from '../api/hub';
import { cdn } from '../api/client';
import { fmt, usePersons } from '../lib/queries';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';
import { atOfMemory } from '../components/Machines';
import { eventLabel } from '../lib/date';
import { EventsAround, useEvents } from './Events';
import type { Chapter, Episode, MediaFile } from '../types';
import { eraClass } from '../lib/era';
import { yearBlocks, yearsLabel } from '../lib/life';
import { useMoment } from '../lib/moment';
import { useGoTo } from '../lib/scroll';
import { HandNote, MachineTile, Print, YearGrid } from '../components/Paper';

const T = 10 * 60_000;

/** the kinds of memory, as they read here */
export const KINDS: [string, string][] = [['TRIP', 'Chuyến đi'], ['MILESTONE', 'Cột mốc'], ['MOMENT', 'Khoảnh khắc'], ['CREATION', 'Sáng tác'], ['KEEPSAKE', 'Kỷ vật'], ['DOCUMENT', 'Giấy tờ'], ['PLACE', 'Nơi chốn']];
export const kindName = (k?: string | null) => KINDS.find(x => x[0] === k)?.[1] ?? '';
export const memoryHref = (e: { id: string }) => `/memories/${e.id}`;

export const useSelf = () => usePersons().data?.find(p => p.isSelf);
/** all your memories, oldest first (undated ones last), each with what its card shows: cover photo, people, tags.
 *  Its albums, its sources and its event's title come with the single memory (hub.episode), not with this list. */
export function useMemories() {
  const self = useSelf();
  return useQuery({
    queryKey: ['memories', self?.id], enabled: !!self, staleTime: T,
    queryFn: async () => (await hub.episodes(self!.id, MEMORY_CARD)).sort((a, b) => (a.occurredAt ?? '9999').localeCompare(b.occurredAt ?? '9999')),
  });
}
export const useLifeChapters = () => {
  const self = useSelf();
  return useQuery({ queryKey: ['chapters', self?.id], enabled: !!self, staleTime: T, queryFn: async () => (await hub.chapters(self!.id)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) });
};

const yearOf = (e: Episode) => (e.occurredAt ? +e.occurredAt.slice(0, 4) : NaN);
const endYear = (e: Episode) => (e.endAt ? +e.endAt.slice(0, 4) : yearOf(e));
/** "Hè 1998", "1995", "08/1995", "15/07/2005 – 20/07/2005", as far as the date is known */
export function memoryWhen(e: Episode): string {
  if (!e.occurredAt) return '';
  const w = eventLabel({ date: e.occurredAt, precision: e.precision ?? 'DAY', approx: !!e.approx });
  if (!e.endAt || e.endAt.slice(0, 10) === e.occurredAt.slice(0, 10)) return w;
  if (e.precision === 'DAY' || !e.precision) return `${w} – ${eventLabel({ date: e.endAt, precision: 'DAY' })}`;
  return endYear(e) !== yearOf(e) ? `${w} – ${endYear(e)}` : w;
}
const inChapter = (e: Episode, c?: Chapter) => { const r = periodYears(c?.period); return !!r && yearOf(e) >= r[0] && yearOf(e) <= r[1]; };
/** the story and, for a trip, its legs ("Lộ trình: A (đi tàu); B (ở X).") */
function splitRoute(summary: string): [string, string[]] {
  const i = summary.indexOf('Lộ trình:');
  if (i < 0) return [summary, []];
  return [summary.slice(0, i).trim(), summary.slice(i + 9).replace(/\.\s*$/, '').split(';').map(s => s.trim()).filter(Boolean)];
}

/** when a memory was, short enough for a row: no hour, a stretch inside one month as "20 – 27/11/2007", a longer one by its first day */
export function memoryDay(e: Episode): string {
  const w = memoryWhen(e).replace(/^(~?)\d{1,2}h /, '$1').replace(/^(~?\d{2}\/\d{2}\/\d{4}) \d{2}:\d{2}(:\d{2})?/, '$1');
  const m = /^(~?)(\d{2})\/(\d{2})\/(\d{4}) – (\d{2})\/(\d{2})\/(\d{4})$/.exec(w);
  if (!m) return w;
  return m[3] === m[6] && m[4] === m[7] ? `${m[1]}${+m[2]} – ${+m[5]}/${m[6]}/${m[7]}` : `${m[1]}${m[2]}/${m[3]}/${m[4]}`;
}
const coverOf = (e: Episode) => e.media?.find(x => x.url && /\.(jpe?g|png|webp|gif|bmp)$/i.test(x.fileName))?.url ?? null;
const titleOf = (e: Episode) => e.title || e.summary;
const peopleOf = (e: Episode) => (e.persons?.length ? e.persons.map(p => p.displayName || p.name).join(', ') : '');

// ── the list ─────────────────────────────────────────────────────────────────

/* Year by year. In each year the memories that weigh most (and have a photo) are shown large, the rest as dated
   lines; what kind a memory is reads from a small coloured word, never from the shape of its card. With no filter
   the page opens on one memory brought back at random. */
export function MemoriesIndex() {
  const self = useSelf(), all = useMemories(), chapters = useLifeChapters(), persons = usePersons(), { moment, picked } = useMoment();
  const [sp, setSp] = useSearchParams();
  const kind = sp.get('kind'), chapterId = sp.get('chapter'), year = Number(sp.get('year')), tag = sp.get('tag'), person = sp.get('person'), q = sp.get('q') ?? '', newest = sp.get('sort') === 'new';
  const [typed, setTyped] = useState(q);
  const found = useQuery({ queryKey: ['memories-q', self?.id, q], enabled: !!self && !!q, staleTime: T, queryFn: () => hub.episodes(self!.id, { q, ...MEMORY_CARD }) });
  const chapter = chapters.data?.find(c => c.id === chapterId);
  const filtered = !!(kind || chapterId || year || tag || person || q);
  const base = q ? found.data ?? [] : all.data ?? [];
  const list = base.filter(e => (!kind || e.kind === kind) && (!chapter || inChapter(e, chapter)) && (!year || yearOf(e) === year)
    && (!tag || e.tags?.some(t => t.name === tag)) && (!person || e.persons?.some(p => p.id === person)));
  const ordered = q ? list : newest ? [...list].reverse() : list;
  // year by year (thin years run together); a search is one list, best match first
  const groups = useMemo(() => (q ? [{ years: [0], list: ordered }] : yearBlocks(ordered, yearOf)), [ordered, q]);
  const set = (k: string, v: string | null) => setSp(prev => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; });
  const personName = (id: string) => { const p = persons.data?.find(x => x.id === id); return p ? p.displayName || p.name : ''; };
  const title = q ? `“${q}”` : chapter?.title || (kind && kindName(kind)) || tag || (person && personName(person)) || (year ? `Ký ức năm ${year}` : 'Ký ức');
  const loading = all.isLoading || (!!q && found.isLoading);
  // a day was picked on the calendar: the list goes to its year (the nearest one that has memories)
  const yearsHere = groups.flatMap(g => g.years).filter(y => y > 0);
  const here = picked && moment && !filtered && yearsHere.length ? yearsHere.reduce((a, b) => (Math.abs(b - moment.y) < Math.abs(a - moment.y) ? b : a)) : 0;
  const hereBlock = here ? groups.find(g => g.years.includes(here))?.years[0] ?? 0 : 0;
  useGoTo(hereBlock ? `my${hereBlock}` : '');

  return (
    <div className="wrap page mm">
      <header className="mm-head"><h1>{title}</h1>{chapter?.period && <span className="ph-n">{chapter.period}</span>}
        <form className="msearch" onSubmit={ev => { ev.preventDefault(); set('q', typed.trim() || null); }}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input value={typed} onChange={ev => setTyped(ev.target.value)} placeholder="Tìm trong ký ức…" />
          {q && <button type="button" onClick={() => { setTyped(''); set('q', null); }}>×</button>}
        </form>
        {!q && <button type="button" className="sortbtn" onClick={() => set('sort', newest ? null : 'new')}>{newest ? 'Mới nhất trước' : 'Cũ nhất trước'} ⇅</button>}
      </header>
      {chapter?.summary && <p className="mm-lede">{chapter.summary}</p>}
      {loading && <p className="jn-wait">Đang mở ký ức…</p>}
      {!loading && !list.length && <p className="jn-wait">{q ? 'Không thấy ký ức nào khớp.' : 'Chưa có ký ức nào ở đây.'}</p>}
      {!filtered && !!all.data?.length && <Resurface list={all.data} />}
      {groups.map(g => <YearBlock key={g.years[0]} years={g.years} list={g.list} plain={!!q} here={g.years[0] === hereBlock} chapters={chapters.data ?? []} />)}
    </div>
  );
}

/** One year of memories: its weightiest ones large, the rest as lines. */
function YearBlock({ years, list, plain, here, chapters }: { years: number[]; list: Episode[]; plain: boolean; here: boolean; chapters: Chapter[] }) {
  const year = years[0];
  const feats = plain ? [] : list.filter(e => (e.importance ?? 0) >= 7 && e.title && coverOf(e)).sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)).slice(0, 3);
  const rest = list.filter(e => !feats.includes(e));
  // the stretches of life this year opens (a chapter is named once, in the year it begins)
  const opens = year > 0 ? chapters.filter(c => { const from = periodYears(c.period)?.[0]; return !!from && years.includes(from) && c.title; }) : [];
  return (
    <section id={year > 0 ? `my${year}` : undefined} className={`mm-year ${year > 0 ? eraClass(year) : ''} ${here ? 'here' : ''}`}>
      {!plain && <div className="mm-yh"><b>{year > 0 ? yearsLabel(years) : 'Không rõ năm'}</b>{opens.length > 0 && <span>{opens.map(c => <Link key={c.id} to={`/memories?chapter=${c.id}`}>{c.title}</Link>)}</span>}</div>}
      {feats.length > 0 && <div className={`mm-feats n${feats.length}`}>{feats.map(e => (
        <Link key={e.id} className="mm-feat" to={memoryHref(e)}>
          <img src={cdn(coverOf(e), 640)} alt="" loading="lazy" />
          <span className="mm-feat-t">
            <span className={`mm-k k-${e.kind ?? ''}`}>{[kindName(e.kind), memoryDay(e)].filter(Boolean).join(' · ')}</span>
            <b>{e.title}</b>
            <p>{splitRoute(e.summary)[0]}</p>
            {(e.place || peopleOf(e)) && <small>{[e.place, peopleOf(e)].filter(Boolean).join(' · ')}</small>}
          </span>
        </Link>))}</div>}
      <div className="mm-rows">{rest.map(e => <MemoryLine key={e.id} e={e} />)}</div>
    </section>
  );
}

export function MemoryLine({ e }: { e: Episode }) {
  const cover = coverOf(e);
  return (
    <Link className="mm-line" to={memoryHref(e)}>
      <span className="mm-d">{memoryDay(e)}</span>
      <span className="mm-b"><b>{titleOf(e)}</b><small>{e.kind && <i className={`k-${e.kind}`}>{kindName(e.kind)}</i>}{[e.place, peopleOf(e)].filter(Boolean).join(' · ')}</small></span>
      {cover && <img src={cdn(cover, 160)} alt="" loading="lazy" />}
    </Link>
  );
}

/** One memory brought back at random: the page's opening, and its one tilted print. */
function Resurface({ list }: { list: Episode[] }) {
  const [n, setN] = useState(0), last = useRef('');
  // drawn from the memories already here (asking the server for a random one takes as long as the whole list):
  // one with a photo and a title when there is one, and never the same one twice in a row
  const pool = useMemo(() => { const p = list.filter(x => x.title && coverOf(x)); return p.length ? p : list; }, [list]);
  const e = useMemo(() => {
    if (!pool.length) return undefined;
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && pool[i].id === last.current) i = (i + 1) % pool.length;
    last.current = pool[i].id;
    return pool[i];
  }, [pool, n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!e) return null;
  const cover = coverOf(e);
  return (
    <section className="mm-back">
      <div className="mm-back-hd"><h2>Một ký ức trở lại</h2><button type="button" onClick={() => setN(v => v + 1)}>Ký ức khác</button></div>
      <Link className={`mm-back-in ${cover ? '' : 'bare'}`} to={memoryHref(e)}>
        {cover && <Print src={cdn(cover, 640)} ratio="4 / 3" tilt={-1.2} tape={-4} />}
        <span className="mm-back-t">
          <span className={`mm-k k-${e.kind ?? ''}`}>{[kindName(e.kind), memoryDay(e)].filter(Boolean).join(' · ') || 'Ký ức'}</span>
          <b>{titleOf(e)}</b>
          {e.title && <p>{splitRoute(e.summary)[0]}</p>}
          {(e.place || peopleOf(e)) && <small>{[e.place, peopleOf(e)].filter(Boolean).join(' · ')}</small>}
        </span>
      </Link>
    </section>
  );
}

/** the sidebar while in Ký ức: kinds, the stretches of his life, the years, who and what they are about */
export function MemoriesSide() {
  const all = useMemories(), chapters = useLifeChapters(), persons = usePersons().data ?? [], [sp] = useSearchParams(), list = all.data ?? [], events = useEvents();
  const inEvents = useLocation().pathname.startsWith('/memories/events');
  const kind = sp.get('kind'), chapter = sp.get('chapter'), year = Number(sp.get('year')), tag = sp.get('tag'), person = sp.get('person'), any = kind || chapter || year || tag || person || sp.get('q');
  const years = [...new Set(list.map(yearOf).filter(y => y > 0))].sort((a, b) => a - b);
  const chs = (chapters.data ?? []).filter(c => list.some(e => inChapter(e, c)));
  const tags = useMemo(() => { const t: Record<string, number> = {}; list.forEach(e => e.tags?.forEach(x => { t[x.name] = (t[x.name] ?? 0) + 1; })); return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 14); }, [list]);
  const people = useMemo(() => { const c: Record<string, number> = {}; list.forEach(e => e.persons?.forEach(p => { c[p.id] = (c[p.id] ?? 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10); }, [list]);
  return (
    <>
      <h4>Ký ức</h4>
      <Link to="/memories" className={!any && !inEvents ? 'on' : ''}>Tất cả<small>{all.data ? fmt(list.length) : ''}</small></Link>
      <Link to="/memories/events" className={inEvents ? 'on' : ''}>Sự kiện<small>{events.data ? fmt(events.data.length) : ''}</small></Link>
      {KINDS.map(([k, n]) => { const c = list.filter(e => e.kind === k).length; return c > 0 && <Link key={k} to={`/memories?kind=${k}`} className={kind === k ? 'on' : ''}><i className={`kdot k-${k}`} />{n}<small>{c}</small></Link>; })}
      {years.length > 0 && <h4>Năm</h4>}
      <YearGrid years={years} active={year} href={y => `/memories?year=${y}`} />
      {chs.length > 0 && <h4>Giai đoạn</h4>}
      {chs.map(c => <Link key={c.id} to={`/memories?chapter=${c.id}`} className={`mem-ch ${chapter === c.id ? 'on' : ''}`}><span>{c.title || c.period}</span>{c.title && <small>{c.period}</small>}</Link>)}
      {people.length > 0 && <h4>Người</h4>}
      {people.map(([id]) => { const p = persons.find(x => x.id === id); return p && <Link key={id} to={`/memories?person=${id}`} className={person === id ? 'on' : ''}>{p.displayName || p.name}</Link>; })}
      {tags.length > 0 && <h4>Thẻ</h4>}
      {tags.map(([t]) => <Link key={t} to={`/memories?tag=${encodeURIComponent(t)}`} className={tag === t ? 'on' : ''}>{t}</Link>)}
    </>
  );
}

// ── one memory ───────────────────────────────────────────────────────────────

const PLATFORM: Record<string, string> = { YAHOO: 'Yahoo', FACEBOOK: 'Facebook', SMS: 'SMS', ZALO: 'Zalo', OTHER: 'Thư' };
const stamp = (iso?: string | null) => (iso ? `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}/${iso.slice(0, 4)}${iso.length > 11 && iso.slice(11, 16) !== '00:00' ? ` ${iso.slice(11, 16)}` : ''}` : '');
/** where a memory is told: the words as they were written, and a link to the thread / the chat / the note around them */
function SourceQuote({ s }: { s: import('../types').MemorySource }) {
  const href = s.kind === 'FORUM' && s.threadId ? `/forum/t/${s.threadId}${s.position != null ? `#n-${s.position}` : ''}`
    : s.kind === 'CHAT' && s.archiveId && s.archivePersonId ? `/angels/${s.archivePersonId}/chat/${s.archiveId}${s.position != null ? `?at=${s.position}` : ''}`
    : s.kind === 'NOTE' && s.noteId ? (s.noteSlug ? `/journal/${s.noteSlug}` : `/journal/id/${s.noteId}`) : null;
  const where = s.kind === 'FORUM' ? [s.forumName || 'Diễn đàn', s.threadTitle].filter(Boolean).join(' · ')
    : s.kind === 'CHAT' ? [PLATFORM[s.archivePlatform ?? ''] ?? s.archivePlatform, s.archivePersonName && `với ${s.archivePersonName}`].filter(Boolean).join(' ')
    : s.kind === 'NOTE' ? s.noteTitle || 'Ghi chép' : s.url || '';
  const meta = [s.author, stamp(s.saidAt)].filter(Boolean).join(' · ');
  const body = <>{s.excerpt && <blockquote>{s.excerpt}</blockquote>}<span className="mem-src-meta">{meta && <b>{meta}</b>}{where}</span></>;
  if (href) return <Link className={`mem-src ${s.kind.toLowerCase()}`} to={href}>{body}</Link>;
  if (s.kind === 'LINK' && s.url) return <a className="mem-src link" href={s.url} target="_blank" rel="noreferrer">{body}</a>;
  return <div className={`mem-src ${s.kind.toLowerCase()}`}>{body}</div>;
}
/** words someone really said or wrote, quoted in a memory's title: at least two of them */
const quoted = (s?: string | null) => { const q = /(?:^|[\s(:])[“"']([^”"']{6,48})[”"'](?=$|[\s).,;!?])/.exec(s ?? '')?.[1]; return q && q.trim().includes(' ') ? q.trim() : null; };

/* A memory opens on the paper of its era, its year set large; then what happened, where it went (a trip's legs), the
   photos, and the words that are still kept about it. Beside it: the machines of then, what else was going on. */
export function MemoryPage() {
  const { id } = useParams(), self = useSelf(), all = useMemories(), persons = usePersons();
  const q = useQuery({ queryKey: ['memory', id], enabled: !!self && !!id, staleTime: T, queryFn: () => hub.episode(self!.id, id!) });
  const e = q.data;
  // the photos as full files, so the viewer can say when and what each one is
  const files = useQuery({
    queryKey: ['memory-files', id], enabled: !!e?.media?.length, staleTime: T,
    queryFn: () => hub.episodeMedia(self!.id, id!),
  });
  const [viewer, setViewer] = useState<number | null>(null);
  const list = all.data ?? [], i = e ? list.findIndex(x => x.id === e.id) : -1, prev = i > 0 ? list[i - 1] : undefined, next = i >= 0 ? list[i + 1] : undefined;
  const sameYear = e ? list.filter(x => x.id !== e.id && yearOf(x) === yearOf(e)).slice(0, 5) : [];

  if (q.isLoading || !self) return <div className="page mm"><div className="reader"><article className="article"><p className="empty">Đang mở ký ức…</p></article></div></div>;
  if (!e) return <div className="page mm"><div className="reader"><article className="article"><Link className="back" to="/memories">← Ký ức</Link><h1>Không tìm thấy ký ức này</h1></article></div></div>;

  const [story, route] = splitRoute(e.summary);
  const text = e.title && story === e.title ? '' : story;
  const photos: MediaFile[] = files.data?.length ? files.data : (e.media ?? []).map((m): MediaFile => ({ id: m.id, fileName: m.fileName, fileType: 'IMAGE', cdnUrl: m.url ?? '', caption: m.caption, width: m.width, height: m.height }));
  const avatar = (id: string) => persons.data?.find(p => p.id === id)?.avatarUrl;
  const y = yearOf(e) || 0, era = y ? eraClass(y) : '', at = atOfMemory(e), said = quoted(e.title);

  return (
    <div className="page mm">
      <header className={`mm-top ${era}`}><div className="mm-top-in">
        {y > 0 && <div className="mm-top-y"><b>{y}</b><span>{memoryDay(e)}</span></div>}
        <div className="mm-top-t">
          <Link className="back" to="/memories">← Ký ức</Link>
          <span className="mm-k">{kindName(e.kind) || 'Ký ức'}{!y && memoryWhen(e) ? ` · ${memoryWhen(e)}` : ''}</span>
          <h1>{e.title || memoryWhen(e) || 'Ký ức'}</h1>
          {(e.place || !!e.persons?.length) && <div className="mm-meta">
            {e.place && <span>{e.place}</span>}
            {e.persons?.map(p => <span key={p.id} className="pill">{avatar(p.id) ? <img src={cdn(avatar(p.id), 80)} alt="" /> : <span className="pill-ph" />}{p.displayName || p.name}</span>)}
          </div>}
        </div>
      </div></header>
      <div className="reader">
        <article className="article">
          {/* on a narrow screen the machines come first (beside the text there is no room) */}
          <div className={`mm-boot top ${era}`}>
            <MachineTile label="Mở trên máy tính lúc đó" href={`/pc?scene=${e.id}`} />
            {at && <MachineTile label="Điện thoại lúc đó" href={`/phone?at=${encodeURIComponent(at)}`} phone />}
          </div>
          {text && <div className="prose">{text.split(/\n+/).map((para, k) => <p key={k}>{para}</p>)}</div>}
          {route.length > 0 && <><h5 className="mem-h">Lộ trình</h5><ol className="mem-route">{route.map((leg, k) => <li key={k}>{leg}</li>)}</ol></>}
          {photos.length > 0 && <div className="mem-photos"><Justified items={photos} rowHeight={200} gap={8} onOpen={setViewer} /></div>}
          {!!e.sourceViews?.length && <><h5 className="mem-h">Còn lưu lại</h5><div className="mem-sources">{e.sourceViews.map((s, k) => <SourceQuote key={k} s={s} />)}</div></>}
          {(!!e.collections?.length || !!e.tags?.length || !!e.lifeEventId) && <div className="endtags">
            {e.lifeEventId && <Link className="chip" to={`/memories/events/${e.lifeEventId}`}>Sự kiện · {e.lifeEventTitle || 'xem'}</Link>}
            {e.collections?.map(c => <Link key={c.id} className="chip" to={`/photos/albums/${c.id}`}>Album · {c.name}</Link>)}
            {e.tags?.map(t => <Link key={t.id} className="chip" to={`/memories?tag=${encodeURIComponent(t.name)}`}>{t.name}</Link>)}
          </div>}
          <div className="pn">{prev ? <Link to={memoryHref(prev)}><small>← Trước đó</small><b>{prev.title || prev.summary.slice(0, 60)}</b></Link> : <span />}
            {next ? <Link to={memoryHref(next)}><small>Sau đó →</small><b>{next.title || next.summary.slice(0, 60)}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          <div className={`mm-boot ${era}`}>
            <MachineTile label="Mở trên máy tính lúc đó" href={`/pc?scene=${e.id}`} />
            {at && <MachineTile label="Điện thoại lúc đó" href={`/phone?at=${encodeURIComponent(at)}`} phone />}
          </div>
          {said && <div className={era}><HandNote>{said}</HandNote></div>}
          <EventsAround at={e.occurredAt} />
          {sameYear.length > 0 && <div><h5>Cũng năm {yearOf(e)}</h5><nav className="mem-same">{sameYear.map(x => <Link key={x.id} to={memoryHref(x)}>{x.title || x.summary.slice(0, 60)}<small>{kindName(x.kind)}</small></Link>)}</nav></div>}
          {e.latitude != null && e.longitude != null && <div><h5>Ở đâu</h5><a className="mem-map" href={`https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=11/${e.latitude}/${e.longitude}`} target="_blank" rel="noreferrer">{e.place || `${e.latitude}, ${e.longitude}`} ↗</a></div>}
        </aside>
      </div>
      {viewer !== null && <Viewer items={photos} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
