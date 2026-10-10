/* Old forums (onthi.com saved from the Web Archive, V-Westlife from its 2012 backup): threads by board, a thread read like the forum showed it,
   search through every post, the members and who they are among the people here. */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import type { ForumPerson, ForumPostHit, ForumThread } from '../types';
import { dayMonthYear, longDay, timeOf } from '../lib/date';
import { fmt } from '../lib/queries';
import { fold } from '../lib/text';
import { Sentinel } from '../components/PhotoGroups';

const T = 10 * 60_000;
const nameOf = (p: ForumPerson) => p.displayName || p.name;
const yearSpan = (a?: string | null, b?: string | null) => (a ? (b && b.slice(0, 4) !== a.slice(0, 4) ? `${a.slice(0, 4)}–${b.slice(0, 4)}` : a.slice(0, 4)) : '');

export function ForumIndex() {
  const q = useQuery({ queryKey: ['forums'], queryFn: hub.forums, staleTime: T });
  if (q.data?.length === 1) return <Navigate to={`/forum/${q.data[0].key}`} replace />;
  return (
    <div className="wrap page">
      <div className="ptitle"><h1>Diễn đàn</h1><span>{q.data ? `${q.data.length} diễn đàn` : 'Đang tải…'}</span></div>
      {q.data && !q.data.length && <div className="card empty">Chưa có diễn đàn nào.</div>}
      <div className="forum-cards">{q.data?.map(f => (
        <Link key={f.key} className="card forum-card" to={`/forum/${f.key}`}>
          <b>{f.name}</b><small>{yearSpan(f.firstPostAt, f.lastPostAt)} · {fmt(f.threadCount)} thread · {fmt(f.postCount)} bài</small>
          {f.description && <p>{f.description}</p>}
        </Link>))}</div>
    </div>
  );
}

function Who({ p, nick, size = 36 }: { p?: ForumPerson | null; nick: string; size?: number }) {
  const av = p?.avatarUrl ? <img src={cdn(p.avatarUrl, size * 2)} alt="" style={{ width: size, height: size }} /> : <span className="fav-ph" style={{ width: size, height: size }}>{nick.slice(0, 1).toUpperCase()}</span>;
  return p && !p.isSelf ? <Link className="fwho" to={`/angels/${p.id}`} title={nameOf(p)}>{av}</Link> : <span className="fwho" title={p ? nameOf(p) : nick}>{av}</span>;
}

export function ForumPage() {
  const { key = '' } = useParams(), [sp, setSp] = useSearchParams();
  const board = sp.get('board') ?? '', tab = sp.get('tab') ?? '', sort = sp.get('sort') ?? '', qp = sp.get('q') ?? '', person = sp.get('person') ?? '';
  const [q, setQ] = useState(qp);
  useEffect(() => { setQ(qp); }, [qp]);
  useEffect(() => { const t = setTimeout(() => { if (q.trim() !== qp) set('q', q.trim()); }, 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const forum = useQuery({ queryKey: ['forum', key], queryFn: () => hub.forum(key), staleTime: T });
  const f = forum.data;
  const boards = useQuery({ queryKey: ['forum-boards', key], queryFn: () => hub.forumBoards(key), staleTime: T });
  return (
    <div className="wrap page forum">
      <div className="ptitle"><h1>{f?.name ?? 'Diễn đàn'}{board && <small className="fboard"> / {board}</small>}</h1>
        <span>{f ? `${yearSpan(f.firstPostAt, f.lastPostAt)} · ${fmt(f.threadCount)} thread · ${fmt(f.postCount)} bài · ${fmt(f.memberCount)} thành viên` : ''}</span></div>
      {f?.description && !board && !tab && !qp && <p className="fdesc">{f.description}</p>}
      <div className="ftools">
        <div className="seg">
          <a className={tab === '' ? 'on' : ''} onClick={() => set('tab', '')}>Thread</a>
          <a className={tab === 'posts' ? 'on' : ''} onClick={() => set('tab', 'posts')}>Tìm trong bài</a>
          <a className={tab === 'members' ? 'on' : ''} onClick={() => set('tab', 'members')}>Thành viên</a>
        </div>
        {tab !== 'members' && <input className="finput" value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'posts' ? 'Tìm chữ trong mọi bài…' : 'Tìm tên thread…'} />}
        {tab === '' && <select className="fsort fboardsel" value={board} onChange={e => set('board', e.target.value)}>
          <option value="">Mọi box</option>{(boards.data ?? []).map(x => <option key={x.board} value={x.board}>{x.board || 'Khác'} ({x.threadCount})</option>)}</select>}
        {tab === '' && <select className="fsort" value={sort} onChange={e => set('sort', e.target.value)}>
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
  const rows = inf.data?.pages.flatMap(p => p.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? 0;
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  if (inf.isLoading) return <div className="card empty">Đang tải…</div>;
  if (!rows.length) return <div className="card empty">{q ? 'Không có thread nào khớp.' : 'Chưa có thread nào.'}</div>;
  return (
    <>
      <p className="fcount">{fmt(total)} thread</p>
      <ol className="fthreads">{rows.map(t => <ThreadRow key={t.id} t={t} showBoard={!board} />)}</ol>
      <Sentinel more={more} active={!!inf.hasNextPage} />
    </>
  );
}

function ThreadRow({ t, showBoard }: { t: ForumThread; showBoard: boolean }) {
  const people = t.people.filter(p => !p.isSelf), me = t.people.some(p => p.isSelf);
  return (
    <li>
      <Link className="ftrow" to={`/forum/t/${t.id}`}>
        <Who p={t.starter} nick={t.starterNick ?? '?'} />
        <div className="ftmain">
          <b>{t.title}</b>
          <small>{[t.starter ? nameOf(t.starter) : t.starterNick, showBoard ? t.board : '', dayMonthYear(t.startedAt)].filter(Boolean).join(' · ')}</small>
          {(people.length > 0 || me) && <span className="ftpeople">{me && <em>có anh</em>}{people.slice(0, 6).map(p => <span key={p.id}>{nameOf(p)}</span>)}{people.length > 6 && <span>+{people.length - 6}</span>}</span>}
        </div>
        <div className="ftnum"><b>{fmt(t.postCount)}</b><small>bài</small>{t.lastPostAt && <small>{dayMonthYear(t.lastPostAt)}</small>}</div>
      </Link>
    </li>
  );
}

function mark(text: string, q: string) {
  if (!q) return text;
  const i = fold(text).indexOf(fold(q));
  return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export function PostHits({ rows, q = '', showPerson = true }: { rows: ForumPostHit[]; q?: string; showPerson?: boolean }) {
  return (
    <ol className="fhits">{rows.map(h => (
      <li key={h.id}><Link to={`/forum/t/${h.threadId}#p-${h.id}`}>
        <small>{[showPerson ? (h.person ? nameOf(h.person) : h.authorNick) : '', dayMonthYear(h.postedAt), h.threadTitle].filter(Boolean).join(' · ')}</small>
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
  const chip = person && <p className="fcount"><span className="chip">bài của {who.data ? who.data.displayName || who.data.name : '…'} <a onClick={onClearPerson}>✕</a></span></p>;
  if (!q && !person) return <div className="card empty">Gõ vài chữ để tìm trong mọi bài (không cần dấu).</div>;
  if (inf.isLoading) return <>{chip}<div className="card empty">Đang tìm…</div></>;
  if (!rows.length) return <>{chip}<div className="card empty">Không có bài nào khớp.</div></>;
  return <>{chip}<p className="fcount">{fmt(total)} bài</p><PostHits rows={rows} q={q} showPerson={!person} /><Sentinel more={more} active={!!inf.hasNextPage} /></>;
}

function Members({ forumKey }: { forumKey: string }) {
  const m = useQuery({ queryKey: ['forum-members', forumKey], queryFn: () => hub.forumMembers(forumKey), staleTime: T });
  const [only, setOnly] = useState(true);
  const rows = (m.data ?? []).filter(x => !only || x.person);
  if (m.isLoading) return <div className="card empty">Đang tải…</div>;
  return (
    <>
      <label className="fonly"><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} /> Chỉ người có trên trang này ({(m.data ?? []).filter(x => x.person).length})</label>
      <div className="fmembers">{rows.map(x => (
        <div key={x.id} className="card fmember">
          <Who p={x.person} nick={x.nick} size={44} />
          <div>
            <b>{x.nick}</b>{x.person && <> · {x.person.isSelf ? <span>anh</span> : <Link to={`/angels/${x.person.id}`}>{nameOf(x.person)}</Link>}</>}
            <small>{[x.displayName && x.displayName !== x.nick ? `“${x.displayName}”` : '', x.joinedAt ? `tham gia ${dayMonthYear(x.joinedAt)}` : '', `${fmt(x.postCount)} bài đã lưu`].filter(Boolean).join(' · ')}</small>
            {x.intro && <p>{x.intro.length > 220 ? `${x.intro.slice(0, 220)}…` : x.intro}</p>}
            {!!x.awards?.length && <p className="fawards">{x.awards.map(a => a.title).join(' · ')}</p>}
          </div>
        </div>))}</div>
    </>
  );
}

export function ForumThreadPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['forum-thread', id], queryFn: () => hub.forumThread(id), staleTime: T });
  const t = q.data;
  const [hash, setHash] = useState(() => location.hash.slice(1));
  useEffect(() => { const on = () => setHash(location.hash.slice(1)); addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  useEffect(() => { if (t && hash) document.getElementById(hash)?.scrollIntoView({ block: 'center' }); else window.scrollTo({ top: 0 }); }, [t, hash]);
  const crumbs = useMemo(() => (t?.board ?? '').split(' / ').filter(Boolean), [t?.board]);
  if (q.isLoading) return <div className="wrap page"><div className="card empty">Đang mở thread…</div></div>;
  if (!t) return <div className="wrap page"><Link className="back" to="/forum">← Diễn đàn</Link><h1>Không tìm thấy thread này</h1></div>;
  const cap = (t.captured ?? [])[0];
  return (
    <div className="wrap page forum fthread">
      <div className="fcrumbs"><Link to={`/forum/${t.forumKey}`}>{t.forumName}</Link>{crumbs.map((c, i) => <Fragment key={i}><span>›</span><Link to={`/forum/${t.forumKey}?board=${encodeURIComponent(crumbs.slice(0, i + 1).join(' / '))}`}>{c}</Link></Fragment>)}</div>
      <h1>{t.title}</h1>
      <p className="fmeta">{fmt(t.postCount)} bài · {dayMonthYear(t.startedAt)}{t.lastPostAt && t.lastPostAt.slice(0, 10) !== (t.startedAt ?? '').slice(0, 10) ? ` – ${dayMonthYear(t.lastPostAt)}` : ''}
        {cap && <> · {t.forumKey === 'onthi' ? 'lưu từ Web Archive' : 'bản backup'} {cap.slice(6, 8)}/{cap.slice(4, 6)}/{cap.slice(0, 4)}</>}</p>
      <ol className="fposts">{t.posts.map((p, i) => {
        const day = (p.postedAt ?? '').slice(0, 10), prev = t.posts[i - 1], newDay = !!day && (!prev || (prev.postedAt ?? '').slice(0, 10) !== day);
        const title = p.title && !/^Trả lời:/i.test(p.title) && i > 0 ? p.title : '';
        return (
          <Fragment key={p.id}>
            {newDay && i > 0 && <li className="day-sep"><span>{longDay(+day.slice(0, 4), +day.slice(5, 7), +day.slice(8, 10))}</span></li>}
            <li id={`p-${p.id}`} className={`fpost ${p.person?.isSelf ? 'me' : ''} ${hash === `p-${p.id}` ? 'hit' : ''}`}>
              <Who p={p.person} nick={p.authorNick} size={40} />
              <div className="fbody">
                <div className="fhead"><b>{p.authorNick}</b>{p.person && !p.person.isSelf && <Link to={`/angels/${p.person.id}`}>{nameOf(p.person)}</Link>}<time>{i === 0 ? `${dayMonthYear(p.postedAt)} · ` : ''}{timeOf(p.postedAt)}</time><a className="fnum" href={`#p-${p.id}`}>#{i + 1}</a></div>
                {title && <h3>{title}</h3>}
                <div className="fcontent" dangerouslySetInnerHTML={{ __html: p.contentHtml || '' }} />
              </div>
            </li>
          </Fragment>);
      })}</ol>
    </div>
  );
}
