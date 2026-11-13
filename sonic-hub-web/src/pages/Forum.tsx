/* Old forums (onthi.com saved from the Web Archive, V-Westlife from its 2012 backup). A forum stands on a band in the
   colour of the years it lived, its boxes under it; threads are plain rows; a thread is read the way the forum showed
   it, who wrote at the left of what they wrote. Search goes through every post; the members say who they are among
   the people here. */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import type { Forum, ForumBoard, ForumMember, ForumPerson, ForumPostHit, ForumThread } from '../types';
import { dayMonthYear, longDay, timeOf } from '../lib/date';
import { fmt, usePersons } from '../lib/queries';
import { fold } from '../lib/text';
import { eraClass } from '../lib/era';
import { atOf, isoOf, useMoment } from '../lib/moment';
import { useDesk } from '../lib/desk';
import { Sentinel } from '../components/PhotoGroups';

const T = 10 * 60_000;
const nameOf = (p: ForumPerson) => p.displayName || p.name;
const useForums = () => useQuery({ queryKey: ['forums'], queryFn: hub.forums, staleTime: T });
/** "V-Westlife (westlifevn.net)" said short */
const shortName = (name: string) => name.replace(/\s*\(.*\)$/, '');
const yearsOf = (f: Forum) => { const a = (f.firstPostAt ?? '').slice(0, 4), b = (f.lastPostAt ?? '').slice(0, 4); return a ? (b && b !== a ? `${a} – ${b}` : a) : ''; };
const eraOf = (f?: Forum | null) => (f?.firstPostAt ? eraClass(+f.firstPostAt.slice(0, 4)) : '');
const PC = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.6" /><path d="M9 20h6M12 16v4" /></svg>;

/** Text with its web addresses made into links (a forum's own description names where the whole of it is kept). */
function linked(text: string): ReactNode[] {
  return text.split(/(https?:\/\/[^\s]+)/g).map((x, i) => (i % 2 ? <a key={i} href={x} target="_blank" rel="noreferrer">{x.replace(/^https?:\/\//, '')}</a> : x));
}

/** Boards under their top box: "Kỷ niệm - Ước mơ / Tâm sự - lưu bút" sits under "Kỷ niệm - Ước mơ". Biggest box first. */
export function boxesOf(boards: ForumBoard[]) {
  const by = new Map<string, { name: string; n: number; subs: { board: string; name: string; n: number }[] }>();
  for (const b of boards) {
    const [top, ...rest] = (b.board || 'Khác').split(' / ');
    const g = by.get(top) ?? { name: top, n: 0, subs: [] };
    g.n += b.threadCount;
    if (rest.length) g.subs.push({ board: b.board, name: rest.join(' / '), n: b.threadCount });
    by.set(top, g);
  }
  return [...by.values()].map(g => ({ ...g, subs: g.subs.sort((a, b) => b.n - a.n) })).sort((a, b) => b.n - a.n);
}

/** Who wrote: their picture when they are someone here, else the first letter of the nick. Square, like a forum's own. */
function Avatar({ p, nick, size = 40 }: { p?: ForumPerson | null; nick: string; size?: number }) {
  return <span className="fr-av" style={{ width: size, height: size }} title={p ? nameOf(p) : nick}>{p?.avatarUrl ? <img src={cdn(p.avatarUrl, size * 2)} alt="" loading="lazy" /> : <span>{nick.trim().slice(0, 1).toUpperCase()}</span>}</span>;
}

/* ── the forums ── */

export function ForumIndex() {
  const q = useForums(), { moment, picked } = useMoment();
  if (q.data?.length === 1) return <Navigate to={`/forum/${q.data[0].key}`} replace />;
  /* in the order of his life: onthi.com first, then V-Westlife */
  const forums = [...(q.data ?? [])].sort((a, b) => (a.firstPostAt ?? '').localeCompare(b.firstPostAt ?? ''));
  const iso = picked && moment ? isoOf(moment) : '';
  const alive = iso ? forums.filter(f => f.firstPostAt && f.lastPostAt && iso >= f.firstPostAt.slice(0, 10) && iso <= f.lastPostAt.slice(0, 10)) : [];
  return (
    <div className="wrap page fr">
      <header className="mm-head"><h1>Diễn đàn</h1></header>
      {q.isLoading && <p className="jn-wait">Đang mở…</p>}
      {q.data && !q.data.length && <p className="jn-wait">Chưa có diễn đàn nào.</p>}
      {moment && alive.map(f => <ThatDay key={f.key} f={f} at={atOf(moment)} iso={iso} />)}
      {forums.map(f => <ForumBlock key={f.key} f={f} />)}
    </div>
  );
}

/** With a day picked inside a forum's years: what was being talked about there that evening. */
function ThatDay({ f, at, iso }: { f: Forum; at: string; iso: string }) {
  const q = useQuery({ queryKey: ['forum-threads-at', f.key, at], queryFn: () => hub.forumThreads(f.key, { at, size: 6 }), staleTime: T });
  const desk = useDesk(), computer = desk.data?.computer?.device, rows = q.data?.content ?? [];
  if (!rows.length) return null;
  return (
    <section className={`fr-open ${eraOf(f)}`}>
      <div className="fr-open-hd"><h2>Hôm đó trên {shortName(f.name)}</h2><span>{dayMonthYear(iso)}</span>
        {computer && <a className="fr-go" href={`/pc?at=${encodeURIComponent(at)}`}>{PC}Bật {computer.name}</a>}</div>
      <ol className="fr-threads">{rows.map(t => <ThreadRow key={t.id} t={t} showBoard then />)}</ol>
    </section>
  );
}

function ForumBlock({ f }: { f: Forum }) {
  const boards = useQuery({ queryKey: ['forum-boards', f.key], queryFn: () => hub.forumBoards(f.key), staleTime: T });
  const me = usePersons().data?.find(p => p.isSelf);
  const mine = useQuery({ queryKey: ['person-forums', me?.id], queryFn: () => hub.personForums(me!.id).catch(() => []), enabled: !!me, staleTime: T });
  const here = mine.data?.find(x => x.forumKey === f.key), boxes = boxesOf(boards.data ?? []), to = `/forum/${f.key}`;
  return (
    <section className="fr-forum">
      <Link className={`fr-band ${eraOf(f)}`} to={to}><b>{yearsOf(f)}</b><strong>{f.name}</strong><i>Vào diễn đàn</i></Link>
      {f.description && <p className="fr-desc">{linked(f.description)}</p>}
      <p className="fr-doors">
        {here && me && <><span>Ở đây anh là {here.nicks}</span><Link to={`${to}?tab=posts&person=${me.id}`}>Bài của anh</Link></>}
        <Link to={`${to}?tab=members`}>Thành viên</Link>
      </p>
      {boxes.length > 0 && <div className="fr-boxes">{boxes.slice(0, 8).map(b => (
        <Link key={b.name} className="fr-box" to={`${to}?board=${encodeURIComponent(b.name)}`}>
          <b>{b.name}</b><span>{fmt(b.n)} thread</span>
          {b.subs.length > 0 && <small>{b.subs.map(s => s.name).join(' · ')}</small>}
        </Link>))}</div>}
      {boxes.length > 8 && <Link className="fr-more" to={to}>Và {boxes.length - 8} box khác</Link>}
    </section>
  );
}

/* ── one forum ── */

export function ForumPage() {
  const { key = '' } = useParams(), [sp, setSp] = useSearchParams();
  const board = sp.get('board') ?? '', tab = sp.get('tab') ?? '', sort = sp.get('sort') ?? '', qp = sp.get('q') ?? '', person = sp.get('person') ?? '';
  const [q, setQ] = useState(qp);
  useEffect(() => { setQ(qp); }, [qp]);
  useEffect(() => { const t = setTimeout(() => { if (q.trim() !== qp) set('q', q.trim()); }, 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const forum = useQuery({ queryKey: ['forum', key], queryFn: () => hub.forum(key), staleTime: T });
  const f = forum.data;
  const parts = board.split(' / ').filter(Boolean);
  return (
    <div className="wrap page fr">
      <div className={`fr-top ${eraOf(f)}`}>
        <Link className="back" to="/forum">← Diễn đàn</Link>
        <h1>{f && <b>{yearsOf(f)}</b>}<span>{f?.name ?? 'Diễn đàn'}</span></h1>
        {parts.length > 0 && <div className="fr-in">{parts.map((c, i) => <Fragment key={i}>{i > 0 && <span>›</span>}<a onClick={() => set('board', parts.slice(0, i + 1).join(' / '))}>{c}</a></Fragment>)}
          <a className="fr-all" onClick={() => set('board', '')}>Mọi box</a></div>}
        {f?.description && !board && !tab && !qp && <p>{linked(f.description)}</p>}
      </div>
      <div className="fr-tools">
        <div className="seg">
          <a className={tab === '' ? 'on' : ''} onClick={() => set('tab', '')}>Thread</a>
          <a className={tab === 'posts' ? 'on' : ''} onClick={() => set('tab', 'posts')}>Tìm trong bài</a>
          <a className={tab === 'members' ? 'on' : ''} onClick={() => set('tab', 'members')}>Thành viên</a>
        </div>
        {tab !== 'members' && <input className="finput" value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'posts' ? 'Tìm chữ trong mọi bài…' : 'Tìm tên thread…'} />}
        {tab === '' && <select className="fr-sel" value={sort} onChange={e => set('sort', e.target.value)} aria-label="Sắp xếp">
          <option value="">Mới trả lời</option><option value="started">Mới mở</option><option value="oldest">Cũ nhất</option><option value="posts">Nhiều bài nhất</option></select>}
      </div>
      {tab === 'members' ? <Members forumKey={key} /> : tab === 'posts' ? <PostSearch forumKey={key} q={qp} person={person} onClearPerson={() => set('person', '')} /> : <Threads forumKey={key} board={board} q={qp} sort={sort} />}
    </div>
  );
}

function Threads({ forumKey, board, q, sort }: { forumKey: string; board: string; q: string; sort: string }) {
  const inf = useInfiniteQuery({ queryKey: ['forum-threads', forumKey, board, q, sort], initialPageParam: 0, staleTime: T,
    queryFn: ({ pageParam }) => hub.forumThreads(forumKey, { board: board || undefined, q: q || undefined, sort: sort || undefined, page: pageParam, size: 40 }),
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.totalElements ? last.page + 1 : undefined) });
  const rows = inf.data?.pages.flatMap(p => p.content) ?? [];
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  if (inf.isLoading) return <p className="jn-wait">Đang mở…</p>;
  if (!rows.length) return <p className="jn-wait">{q ? 'Không có thread nào khớp.' : 'Chưa có thread nào.'}</p>;
  return (
    <>
      <ol className="fr-threads">{rows.map(t => <ThreadRow key={t.id} t={t} showBoard={!board} />)}</ol>
      <Sentinel more={more} active={!!inf.hasNextPage} />
    </>
  );
}

/** A thread in a list. The whole row opens it; the Angels who wrote in it are links of their own on top of that.
 *  `then`: the thread as it stood on a picked day, opened at the last post it had by then. */
function ThreadRow({ t, showBoard, then }: { t: ForumThread; showBoard: boolean; then?: boolean }) {
  const people = t.people.filter(p => !p.isSelf), me = t.people.some(p => p.isSelf);
  const boardName = showBoard ? (t.board ?? '').split(' / ').pop() : '';
  return (
    <li className="fr-row">
      <Avatar p={t.starter} nick={t.starterNick ?? '?'} />
      <div className="fr-row-b">
        <Link className="fr-row-t" to={`/forum/t/${t.id}${then && t.postCount > 1 ? `#n-${t.postCount - 1}` : ''}`}>{t.title}</Link>
        <small>{[t.starter ? nameOf(t.starter) : t.starterNick, boardName, dayMonthYear(t.startedAt)].filter(Boolean).join(' · ')}</small>
        {(people.length > 0 || me) && <span className="fr-who">{me && <em>có anh</em>}
          {people.slice(0, 6).map(p => <Link key={p.id} to={`/angels/${p.id}`}>{nameOf(p)}</Link>)}{people.length > 6 && <span>+{people.length - 6}</span>}</span>}
      </div>
      <div className="fr-row-n"><span><b>{fmt(t.postCount)}</b> bài</span>{t.lastPostAt && <small>{then ? `${timeOf(t.lastPostAt)} · ` : ''}{dayMonthYear(t.lastPostAt)}</small>}</div>
    </li>
  );
}

function mark(text: string, q: string) {
  if (!q) return text;
  const i = fold(text).indexOf(fold(q));
  return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/** Posts found (a search, or what one person wrote): who and when, in which thread, then the words. */
export function PostHits({ rows, q = '', showPerson = true }: { rows: ForumPostHit[]; q?: string; showPerson?: boolean }) {
  return (
    <ol className="fr-hits">{rows.map(h => (
      <li key={h.id}><Link className="fr-hit" to={`/forum/t/${h.threadId}#p-${h.id}`}>
        <small>{[showPerson ? (h.person ? nameOf(h.person) : h.authorNick) : '', dayMonthYear(h.postedAt)].filter(Boolean).join(' · ')}<b>{h.threadTitle}</b></small>
        <p>{mark(h.snippet, q)}</p>
      </Link></li>))}</ol>
  );
}

function PostSearch({ forumKey, q, person, onClearPerson }: { forumKey: string; q: string; person: string; onClearPerson: () => void }) {
  const who = useQuery({ queryKey: ['person', person], queryFn: () => hub.person(person), enabled: !!person, staleTime: T });
  const inf = useInfiniteQuery({ queryKey: ['forum-posts', forumKey, q, person], initialPageParam: 0, staleTime: T, enabled: !!q || !!person,
    queryFn: ({ pageParam }) => hub.forumPosts(forumKey, { q: q || undefined, personId: person || undefined, page: pageParam, size: 30 }),
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.totalElements ? last.page + 1 : undefined) });
  const rows = inf.data?.pages.flatMap(p => p.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? 0;
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  const of = person && <p className="fr-of">Bài của {who.data ? (who.data.isSelf ? 'anh' : who.data.displayName || who.data.name) : '…'}<button type="button" onClick={onClearPerson}>Bỏ lọc</button></p>;
  if (!q && !person) return <p className="jn-wait">Gõ vài chữ để tìm trong mọi bài (không cần dấu).</p>;
  if (inf.isLoading) return <>{of}<p className="jn-wait">Đang tìm…</p></>;
  if (!rows.length) return <>{of}<p className="jn-wait">Không có bài nào khớp.</p></>;
  return <>{of}{!!q && <p className="fr-count">{fmt(total)} bài khớp</p>}<PostHits rows={rows} q={q} showPerson={!person} /><Sentinel more={more} active={!!inf.hasNextPage} /></>;
}

/** What a member wrote under their name, made plain: no markup, no bare addresses of pictures, one run of text. */
const plainLine = (s?: string | null) => (s ?? '').replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function Members({ forumKey }: { forumKey: string }) {
  const m = useQuery({ queryKey: ['forum-members', forumKey], queryFn: () => hub.forumMembers(forumKey), staleTime: T });
  const [only, setOnly] = useState(true), [shown, setShown] = useState(80);
  const rows = (m.data ?? []).filter(x => !only || x.person);
  const more = useCallback(() => setShown(n => n + 120), []);
  const postsOf = (personId: string) => `/forum/${forumKey}?tab=posts&person=${personId}`;
  if (m.isLoading) return <p className="jn-wait">Đang mở…</p>;
  return (
    <>
      <label className="fr-only"><input type="checkbox" checked={only} onChange={e => { setOnly(e.target.checked); setShown(80); }} />Chỉ những người có trang ở đây</label>
      <ol className="fr-members">{rows.slice(0, shown).map(x => <MemberRow key={x.id} x={x} postsOf={postsOf} />)}</ol>
      <Sentinel more={more} active={shown < rows.length} />
    </>
  );
}

function MemberRow({ x, postsOf }: { x: ForumMember; postsOf: (personId: string) => string }) {
  const called = plainLine(x.displayName), said = plainLine(x.intro), groups = (x.awards ?? []).map(a => a.title).filter(Boolean);
  return (
    <li className="fr-member">
      <Avatar p={x.person} nick={x.nick} size={44} />
      <div>
        {x.person && !x.person.isSelf && nameOf(x.person) === x.nick ? <Link className="fr-nick" to={`/angels/${x.person.id}`}>{x.nick}</Link>
          : <><b>{x.nick}</b>{x.person && (x.person.isSelf ? <em>anh</em> : <Link to={`/angels/${x.person.id}`}>{nameOf(x.person)}</Link>)}</>}
        <small>{[called && called !== x.nick ? called : '', x.joinedAt ? `tham gia ${dayMonthYear(x.joinedAt)}` : ''].filter(Boolean).join(' · ')}</small>
        {said && <p>{said}</p>}
        {groups.length > 0 && <span className="fr-groups">{groups.slice(0, 3).map(g => <span key={g}>{g}</span>)}{groups.length > 3 && <i>+{groups.length - 3}</i>}</span>}
      </div>
      <div className="fr-member-n">{x.person && x.postCount > 0 ? <Link to={postsOf(x.person.id)}>{fmt(x.postCount)} bài đã lưu</Link> : `${fmt(x.postCount)} bài đã lưu`}</div>
    </li>
  );
}

/* ── one thread ── */

const PAGE = 80;

export function ForumThreadPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['forum-thread', id], queryFn: () => hub.forumThread(id), staleTime: T });
  const t = q.data, forums = useForums(), f = forums.data?.find(x => x.key === t?.forumKey);
  const [hash, setHash] = useState(() => location.hash.slice(1));
  useEffect(() => { const on = () => setHash(location.hash.slice(1)); addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  /* #n-12 = the post at place 12 of the thread (a memory links that way: post ids change when a thread is re-imported) */
  const at = useMemo(() => {
    if (!t || !hash) return -1;
    const m = /^n-(\d+)$/.exec(hash);
    return m ? t.posts.findIndex(x => x.sortOrder === +m[1]) : t.posts.findIndex(x => `p-${x.id}` === hash);
  }, [hash, t]);
  /* A long thread (some run to thousands of posts) is laid out a stretch at a time: from the top, or around the post
     asked for; more comes as the page is read down, earlier ones on request. */
  const [span, setSpan] = useState<[number, number]>([0, PAGE]);
  useEffect(() => { if (!t) return; const from = at > 0 ? Math.max(0, at - 5) : 0; setSpan([from, from + PAGE]); }, [t, at]);
  const target = t && at >= 0 ? `p-${t.posts[at].id}` : '';
  useEffect(() => {
    if (!t) return;
    if (!target) { window.scrollTo({ top: 0 }); return; }
    const go = () => document.getElementById(target)?.scrollIntoView({ block: 'start' });
    const timers = [setTimeout(go, 60), setTimeout(go, 700)];
    return () => timers.forEach(clearTimeout);
  }, [t, target]);
  /* a picture that is gone from its old address leaves no hole */
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const on = (e: Event) => { if (e.target instanceof HTMLImageElement) e.target.classList.add('gone'); };
    el.addEventListener('error', on, true);
    return () => el.removeEventListener('error', on, true);
  }, [t]);
  const more = useCallback(() => setSpan(([a, b]) => [a, b + PAGE]), []);
  const crumbs = useMemo(() => (t?.board ?? '').split(' / ').filter(Boolean), [t?.board]);
  if (q.isLoading) return <div className="wrap page fr fr-thread"><p className="jn-wait">Đang mở thread…</p></div>;
  if (!t) return <div className="wrap page fr fr-thread"><Link className="back" to="/forum">← Diễn đàn</Link><h1>Không tìm thấy thread này</h1></div>;
  const cap = (t.captured ?? [])[0], [from, to] = span, posts = t.posts.slice(from, to);
  return (
    <div className="wrap page fr fr-thread">
      <nav className="fr-crumbs" aria-label="Đường dẫn"><Link to="/forum">Diễn đàn</Link><span>›</span><Link className={`fr-crumb-f ${eraOf(f)}`} to={`/forum/${t.forumKey}`}>{shortName(t.forumName)}</Link>
        {crumbs.map((c, i) => <Fragment key={i}><span>›</span><Link to={`/forum/${t.forumKey}?board=${encodeURIComponent(crumbs.slice(0, i + 1).join(' / '))}`}>{c}</Link></Fragment>)}</nav>
      <h1>{t.title}</h1>
      <p className="fr-meta">{dayMonthYear(t.startedAt)}{t.lastPostAt && t.lastPostAt.slice(0, 10) !== (t.startedAt ?? '').slice(0, 10) ? ` – ${dayMonthYear(t.lastPostAt)}` : ''} · {fmt(t.postCount)} bài
        {cap && <> · {t.forumKey === 'onthi' ? 'lưu từ Web Archive' : 'bản backup'} {cap.slice(6, 8)}/{cap.slice(4, 6)}/{cap.slice(0, 4)}</>}</p>
      {from > 0 && <button type="button" className="fr-older" onClick={() => setSpan(([a, b]) => [Math.max(0, a - PAGE), b])}>↑ Những bài trước đó</button>}
      <ol className="fr-posts" ref={list}>{posts.map((p, k) => {
        const i = from + k, day = (p.postedAt ?? '').slice(0, 10), prev = t.posts[i - 1], newDay = !!day && (!prev || (prev.postedAt ?? '').slice(0, 10) !== day);
        const title = p.title && !/^Trả lời:/i.test(p.title) && i > 0 ? p.title : '';
        return (
          <Fragment key={p.id}>
            {(newDay || k === 0) && !!day && <li className="day-sep"><span>{longDay(+day.slice(0, 4), +day.slice(5, 7), +day.slice(8, 10))}</span></li>}
            <li id={`p-${p.id}`} className={`fr-post ${p.person?.isSelf ? 'me' : ''} ${target === `p-${p.id}` ? 'hit' : ''}`}>
              <div className="fr-by">
                <Avatar p={p.person} nick={p.authorNick} size={56} />
                <b>{p.authorNick}</b>
                {p.person && (p.person.isSelf ? <em>anh</em> : <Link to={`/angels/${p.person.id}`}>{nameOf(p.person)}</Link>)}
              </div>
              <div className="fr-body">
                <div className="fr-when"><time>{timeOf(p.postedAt)}</time><a href={`#p-${p.id}`}>#{i + 1}</a></div>
                {title && <h3>{title}</h3>}
                <div className="fr-content" dangerouslySetInnerHTML={{ __html: p.contentHtml || '' }} />
              </div>
            </li>
          </Fragment>);
      })}</ol>
      <Sentinel more={more} active={to < t.posts.length} />
    </div>
  );
}
