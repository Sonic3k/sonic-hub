/* Ký ức: your own memories as the hub keeps them — a list through the years, and one memory with its photos.
   They are written and checked in the admin; here they are only read. */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub, periodYears } from '../api/hub';
import { cdn } from '../api/client';
import { fmt, usePersons } from '../lib/queries';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';
import { atOfMemory } from '../components/Machines';
import { eventLabel } from '../lib/date';
import type { Chapter, Episode, MediaFile } from '../types';

const T = 10 * 60_000;

/** the kinds of memory, as they read here */
export const KINDS: [string, string][] = [['TRIP', 'Chuyến đi'], ['MILESTONE', 'Cột mốc'], ['MOMENT', 'Khoảnh khắc'], ['CREATION', 'Sáng tác'], ['KEEPSAKE', 'Kỷ vật'], ['DOCUMENT', 'Giấy tờ'], ['PLACE', 'Nơi chốn']];
export const kindName = (k?: string | null) => KINDS.find(x => x[0] === k)?.[1] ?? '';
export const memoryHref = (e: { id: string }) => `/memories/${e.id}`;

const useSelf = () => usePersons().data?.find(p => p.isSelf);
/** all your memories, oldest first (undated ones last) */
export function useMemories() {
  const self = useSelf();
  return useQuery({
    queryKey: ['memories', self?.id], enabled: !!self, staleTime: T,
    queryFn: async () => (await hub.episodes(self!.id)).sort((a, b) => (a.occurredAt ?? '9999').localeCompare(b.occurredAt ?? '9999')),
  });
}
const useLifeChapters = () => {
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

// ── the list ─────────────────────────────────────────────────────────────────

export function MemoriesIndex() {
  const self = useSelf(), all = useMemories(), chapters = useLifeChapters(), persons = usePersons(), nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const kind = sp.get('kind'), chapterId = sp.get('chapter'), year = Number(sp.get('year')), tag = sp.get('tag'), person = sp.get('person'), q = sp.get('q') ?? '', newest = sp.get('sort') === 'new';
  const [typed, setTyped] = useState(q);
  const found = useQuery({ queryKey: ['memories-q', self?.id, q], enabled: !!self && !!q, staleTime: T, queryFn: () => hub.episodes(self!.id, { q }) });
  const chapter = chapters.data?.find(c => c.id === chapterId);
  const base = q ? found.data ?? [] : all.data ?? [];
  const list = base.filter(e => (!kind || e.kind === kind) && (!chapter || inChapter(e, chapter)) && (!year || yearOf(e) === year)
    && (!tag || e.tags?.some(t => t.name === tag)) && (!person || e.persons?.some(p => p.id === person)));
  const ordered = q ? list : newest ? [...list].reverse() : list;
  const groups = useMemo(() => {
    if (q) return [['', ordered]] as [string, Episode[]][];
    const g: [string, Episode[]][] = [];
    ordered.forEach(e => { const k = isNaN(yearOf(e)) ? 'Không rõ năm' : String(yearOf(e)); const last = g[g.length - 1]; if (last && last[0] === k) last[1].push(e); else g.push([k, [e]]); });
    return g;
  }, [ordered, q]);
  const set = (k: string, v: string | null) => setSp(prev => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; });
  const personName = (id: string) => { const p = persons.data?.find(x => x.id === id); return p ? p.displayName || p.name : ''; };
  const title = q ? `“${q}”` : chapter?.title || (kind && kindName(kind)) || tag || (person && personName(person)) || (year ? String(year) : 'Ký ức');
  const loading = all.isLoading || (!!q && found.isLoading);

  return (
    <div className="wrap page mem">
      <div className="ptitle"><h1>{title}</h1><span>{fmt(list.length)} ký ức{chapter?.period ? ` · ${chapter.period}` : ''}</span>
        <form className="msearch" onSubmit={ev => { ev.preventDefault(); set('q', typed.trim() || null); }}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input value={typed} onChange={ev => setTyped(ev.target.value)} placeholder="Tìm trong ký ức…" />
          {q && <button type="button" onClick={() => { setTyped(''); set('q', null); }}>×</button>}
        </form>
        {!q && <button type="button" className="sortbtn" onClick={() => set('sort', newest ? null : 'new')}>{newest ? 'Mới nhất trước' : 'Cũ nhất trước'} ⇅</button>}
      </div>
      {chapter?.summary && <p className="mem-lede">{chapter.summary}</p>}
      <section className="lanes">
        <div>
          {loading && <div className="card empty">Đang mở ký ức…</div>}
          {!loading && !list.length && <div className="card empty">{q ? 'Không thấy ký ức nào khớp.' : 'Chưa có ký ức nào ở đây.'}</div>}
          {groups.map(([y, es]) => <div key={y || 'q'}>{y && <div className="month">{y}</div>}<div className="posts">{es.map(e => <MemoryRow key={e.id} e={e} />)}</div></div>)}
        </div>
        <aside className="rail">
          <RandomCard />
          <Facets list={all.data ?? []} onTag={t => nav(`/memories?tag=${encodeURIComponent(t)}`)} />
        </aside>
      </section>
    </div>
  );
}

function MemoryRow({ e }: { e: Episode }) {
  const cover = e.media?.[0]?.url, n = e.media?.length ?? 0;
  const [story] = splitRoute(e.summary);
  const sub = e.title && story && story !== e.title ? story : '';
  return (
    <Link className="post" to={memoryHref(e)}>
      <div><span className="cat">{[kindName(e.kind), memoryWhen(e)].filter(Boolean).join(' · ')}</span><h4>{e.title || e.summary}</h4>{sub && <p>{sub}</p>}
        <span className="by">{[e.place, n ? `${n} ảnh` : '', e.persons?.length ? e.persons.map(p => p.displayName || p.name).join(', ') : ''].filter(Boolean).join(' · ')}</span></div>
      {cover ? <img src={cdn(cover, 240)} alt="" /> : <span className="noimg" />}
    </Link>
  );
}

function RandomCard() {
  const self = useSelf(), [n, setN] = useState(0);
  const r = useQuery({ queryKey: ['memory-random', self?.id, n], enabled: !!self, staleTime: Infinity, queryFn: () => hub.randomMemory(self!.id, 1, 'episode') });
  const e = r.data?.[0]?.episode;
  if (!e) return null;
  const cover = e.media?.[0]?.url;
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--memory)' }}><h3><i />Một ký ức bất kỳ<button type="button" onClick={() => setN(v => v + 1)}>Đổi</button></h3>
      <Link to={memoryHref(e)}>{cover && <img className="pic" src={cdn(cover, 400)} alt="" />}
        <b className="mem-rt">{e.title || e.summary}</b></Link>
      <div className="meta">{[kindName(e.kind), memoryWhen(e)].filter(Boolean).join(' · ')}</div></div>
  );
}

function Facets({ list, onTag }: { list: Episode[]; onTag: (t: string) => void }) {
  const persons = usePersons().data ?? [], [sp] = useSearchParams();
  const tags = useMemo(() => { const t: Record<string, number> = {}; list.forEach(e => e.tags?.forEach(x => { t[x.name] = (t[x.name] ?? 0) + 1; })); return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 16); }, [list]);
  const people = useMemo(() => { const c: Record<string, number> = {}; list.forEach(e => e.persons?.forEach(p => { c[p.id] = (c[p.id] ?? 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10); }, [list]);
  return (
    <>
      {people.length > 0 && <div className="card" style={{ ['--c' as string]: 'var(--memory)' }}><h3><i />Người trong ký ức</h3>
        <div className="chips">{people.map(([id, k]) => { const p = persons.find(x => x.id === id); return p && (
          <Link key={id} className={`pill ${sp.get('person') === id ? 'on' : ''}`} to={`/memories?person=${id}`}>{p.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : <span className="pill-ph" />}{p.displayName || p.name}<small>{k}</small></Link>); })}</div></div>}
      {tags.length > 0 && <div className="card" style={{ ['--c' as string]: 'var(--memory)' }}><h3><i />Thẻ</h3>
        <div className="chips">{tags.map(([t, k]) => <button key={t} type="button" className={`chip ${sp.get('tag') === t ? 'on' : ''}`} onClick={() => onTag(t)}>{t} · {k}</button>)}</div></div>}
    </>
  );
}

/** the sidebar while in Ký ức: kinds, the chapters of your life, the years */
export function MemoriesSide() {
  const all = useMemories(), chapters = useLifeChapters(), [sp] = useSearchParams(), list = all.data ?? [];
  const kind = sp.get('kind'), chapter = sp.get('chapter'), year = Number(sp.get('year')), any = kind || chapter || year || sp.get('tag') || sp.get('person') || sp.get('q');
  const byYear: Record<number, number> = {}; list.forEach(e => { const y = yearOf(e); if (y) byYear[y] = (byYear[y] ?? 0) + 1; });
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b), max = Math.max(1, ...Object.values(byYear));
  const chs = (chapters.data ?? []).filter(c => list.some(e => inChapter(e, c)));
  return (
    <>
      <h4>Ký ức</h4>
      <Link to="/memories" className={!any ? 'on' : ''}>Tất cả<small>{fmt(list.length)}</small></Link>
      {KINDS.map(([k, n]) => { const c = list.filter(e => e.kind === k).length; return c > 0 && <Link key={k} to={`/memories?kind=${k}`} className={kind === k ? 'on' : ''}>{n}<small>{c}</small></Link>; })}
      {chs.length > 0 && <h4>Giai đoạn</h4>}
      {chs.map(c => <Link key={c.id} to={`/memories?chapter=${c.id}`} className={`mem-ch ${chapter === c.id ? 'on' : ''}`}><span>{c.title || c.period}</span>{c.title && <small>{c.period}</small>}</Link>)}
      {years.length > 0 && <h4>Năm</h4>}
      {years.map(y => <Link key={y} to={`/memories?year=${y}`} className={y === year ? 'on' : ''} style={{ ['--c' as string]: 'var(--memory)' }}>{y}<span className="bar"><b style={{ width: `${Math.round(byYear[y] / max * 100)}%` }} /></span><small>{byYear[y]}</small></Link>)}
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

export function MemoryPage() {
  const { id } = useParams(), self = useSelf(), all = useMemories(), persons = usePersons();
  const q = useQuery({ queryKey: ['memory', id], enabled: !!self && !!id, staleTime: T, queryFn: () => hub.episode(self!.id, id!) });
  const e = q.data;
  // the photos as full files, so the viewer can say when and what each one is
  const files = useQuery({
    queryKey: ['memory-files', id], enabled: !!e?.media?.length, staleTime: T,
    queryFn: async () => (await Promise.all((e!.media ?? []).slice(0, 60).map(m => hub.media(m.id).catch(() => null)))).filter((m): m is MediaFile => !!m),
  });
  const [viewer, setViewer] = useState<number | null>(null);
  const list = all.data ?? [], i = e ? list.findIndex(x => x.id === e.id) : -1, prev = i > 0 ? list[i - 1] : undefined, next = i >= 0 ? list[i + 1] : undefined;
  const sameYear = e ? list.filter(x => x.id !== e.id && yearOf(x) === yearOf(e)).slice(0, 5) : [];

  if (q.isLoading || !self) return <div className="reader"><article className="article"><p className="empty">Đang mở ký ức…</p></article></div>;
  if (!e) return <div className="reader"><article className="article"><Link className="back" to="/memories">← Ký ức</Link><h1>Không tìm thấy ký ức này</h1></article></div>;

  const [story, route] = splitRoute(e.summary);
  const text = e.title && story === e.title ? '' : story;
  const photos: MediaFile[] = files.data?.length ? files.data : (e.media ?? []).map((m): MediaFile => ({ id: m.id, fileName: m.fileName, fileType: 'IMAGE', cdnUrl: m.url ?? '', caption: m.caption, width: m.width, height: m.height }));
  const avatar = (id: string) => persons.data?.find(p => p.id === id)?.avatarUrl;

  return (
    <div className="page mem">
      <div className="reader">
        <article className="article">
          <Link className="back" to="/memories">← Ký ức</Link><br />
          <span className="cat">{[kindName(e.kind), memoryWhen(e)].filter(Boolean).join(' · ') || 'Ký ức'}</span>
          <h1>{e.title || memoryWhen(e) || 'Ký ức'}</h1>
          {(e.place || e.persons?.length) && <div className="byline">
            {e.place && <span>{e.place}</span>}
            {e.place && !!e.persons?.length && <span className="sep">|</span>}
            {e.persons?.map(p => <span key={p.id} className="pill">{avatar(p.id) ? <img src={cdn(avatar(p.id), 80)} alt="" /> : <span className="pill-ph" />}{p.displayName || p.name}</span>)}
          </div>}
          <div className="mem-boot">
            <a href={`/pc?scene=${e.id}`}>Xem trên máy tính lúc đó</a>
            {atOfMemory(e) && <a href={`/phone?at=${encodeURIComponent(atOfMemory(e)!)}`}>Điện thoại lúc đó</a>}
          </div>
          {text && <div className="prose">{text.split(/\n+/).map((para, k) => <p key={k}>{para}</p>)}</div>}
          {route.length > 0 && <><h5 className="mem-h">Lộ trình</h5><ol className="mem-route">{route.map((leg, k) => <li key={k}>{leg}</li>)}</ol></>}
          {photos.length > 0 && <div className="mem-photos"><Justified items={photos} rowHeight={200} gap={8} onOpen={setViewer} /></div>}
          {!!e.sourceViews?.length && <><h5 className="mem-h">Còn lưu lại</h5><div className="mem-sources">{e.sourceViews.map((s, k) => <SourceQuote key={k} s={s} />)}</div></>}
          {(!!e.collections?.length || !!e.tags?.length) && <div className="endtags">
            {e.collections?.map(c => <Link key={c.id} className="chip" to={`/photos/albums/${c.id}`}>Album · {c.name}</Link>)}
            {e.tags?.map(t => <Link key={t.id} className="chip" to={`/memories?tag=${encodeURIComponent(t.name)}`}>{t.name}</Link>)}
          </div>}
          <div className="pn">{prev ? <Link to={memoryHref(prev)}><small>← Trước đó</small><b>{prev.title || prev.summary.slice(0, 60)}</b></Link> : <span />}
            {next ? <Link to={memoryHref(next)}><small>Sau đó →</small><b>{next.title || next.summary.slice(0, 60)}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          {sameYear.length > 0 && <div><h5>Cũng năm {yearOf(e)}</h5><nav className="mem-same">{sameYear.map(x => <Link key={x.id} to={memoryHref(x)}>{x.title || x.summary.slice(0, 60)}<small>{kindName(x.kind)}</small></Link>)}</nav></div>}
          {e.latitude != null && e.longitude != null && <div><h5>Ở đâu</h5><a className="mem-map" href={`https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=11/${e.latitude}/${e.longitude}`} target="_blank" rel="noreferrer">{e.place || `${e.latitude}, ${e.longitude}`} ↗</a></div>}
        </aside>
      </div>
      {viewer !== null && <Viewer items={photos} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
