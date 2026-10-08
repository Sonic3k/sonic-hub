/* Angels — the people who passed through, each one a story. Same frame, a softer light. */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { hub, periodYears, randomLine } from '../api/hub';
import { cdn } from '../api/client';
import type { ChatMessage, Person } from '../types';
import { fmt, usePersons } from '../lib/queries';
import { dayMonthYear, longDay, timeOf } from '../lib/date';
import { fold } from '../lib/text';
import Justified from '../components/Justified';
import { Sentinel, useViewer } from '../components/PhotoGroups';
import PersonNumbers from '../components/PersonNumbers';

const T = 10 * 60_000;
const nameOf = (p: Person) => p.displayName || p.name;
const REL: Record<string, string> = { GIRLFRIEND: 'người yêu', EX: 'người cũ', EX_GIRLFRIEND: 'người yêu cũ', CRUSH: 'thầm thương', LOVER: 'người thương', FRIEND: 'bạn', CLOSE_FRIEND: 'bạn thân', FAMILY: 'gia đình' };
const rel = (r?: string | null) => (r ? REL[r] ?? r.toLowerCase().replace(/_/g, ' ') : '');
const startOf = (p: Person) => periodYears(p.period)?.[0] ?? 9999;
export const angelsOrdered = (all: Person[]) => all.filter(p => !p.isSelf).sort((a, b) => startOf(a) - startOf(b) || nameOf(a).localeCompare(nameOf(b)));

/** A face for a person: their avatar, else a photo they are in. */
function Face({ p, w }: { p: Person; w: number }) {
  const q = useQuery({ queryKey: ['face', p.id], enabled: !p.avatarUrl, staleTime: T, queryFn: async () => (await hub.search({ personId: p.id, size: 1, random: true, type: 'IMAGE' })).content[0] ?? null });
  const src = p.avatarUrl ? cdn(p.avatarUrl, w) : q.data ? cdn(q.data.thumbnailUrl ?? q.data.cdnUrl, w) : '';
  return src ? <img src={src} alt="" /> : <span className="letter-ph">{nameOf(p).slice(0, 1)}</span>;
}

function LineCard({ people, title = 'Một dòng tin nhắn' }: { people: Person[]; title?: string }) {
  const [n, setN] = useState(0), ids = people.map(p => p.id).join(',');
  const q = useQuery({ queryKey: ['line', ids, n], queryFn: () => randomLine(people), enabled: people.length > 0, staleTime: T });
  if (!people.length || (q.isSuccess && !q.data)) return null;
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}>
      <h3><i />{title}<button type="button" onClick={() => setN(v => v + 1)}>Đổi</button></h3>
      {q.data ? <><span className="bubble">{q.data.text}</span><div className="meta">{q.data.who} · {q.data.platform}{q.data.at ? ` · ${dayMonthYear(q.data.at)}` : ''}</div></> : <div className="meta">Đang lục lại…</div>}
    </div>
  );
}

/* ── the list ── */
export function AngelsIndex() {
  const persons = usePersons(), list = angelsOrdered(persons.data ?? []);
  const first = list.map(startOf).filter(y => y < 9999)[0];
  return (
    <div className="wrap page">
      <div className="ptitle"><h1>Những người đã đi qua</h1><span>{list.length} người{first ? ` · từ ${first}` : ''}</span></div>
      <section className="lanes">
        <div className="angels-list">
          {persons.isLoading && <div className="card empty">Đang mở…</div>}
          {list.map(p => (
            <Link key={p.id} className="arow" to={`/angels/${p.id}`}>
              <span className="ayrs">{p.period ?? ''}</span>
              <span className="amid"><b className="aname">{nameOf(p)}</b>{p.nickname && p.nickname !== nameOf(p) && <span className="anick">“{p.nickname}”</span>}
                <span className="arel">{[rel(p.relationshipType), p.song && `♪ ${p.song}`].filter(Boolean).join(' · ')}</span></span>
              <span className="aimg"><Face p={p} w={240} /></span>
            </Link>))}
        </div>
        <aside className="rail"><LineCard people={list} /></aside>
      </section>
    </div>
  );
}

/* ── one person, one story ── */
function ChapterPhotos({ personId, period, onOpen }: { personId: string; period?: string | null; onOpen: (id: string) => void }) {
  const yrs = periodYears(period);
  const q = useQuery({ queryKey: ['chapter-photos', personId, period], enabled: !!yrs, staleTime: T,
    queryFn: () => hub.search({ personId, from: `${yrs![0]}-01-01`, to: `${yrs![1] + 1}-01-01`, size: 5, random: true, type: 'IMAGE' }) });
  const items = q.data?.content ?? [];
  return items.length ? <div className="chapter-photos"><Justified items={items} rowHeight={190} gap={6} onOpen={(i) => onOpen(items[i].id)} /></div> : null;
}

export function PersonPage() {
  const { id = '' } = useParams(), persons = usePersons();
  const person = useQuery({ queryKey: ['person', id], queryFn: () => hub.person(id), staleTime: T });
  const facts = useQuery({ queryKey: ['facts', id], queryFn: () => hub.facts(id), staleTime: T });
  const episodes = useQuery({ queryKey: ['episodes', id], queryFn: () => hub.episodes(id), staleTime: T });
  const chapters = useQuery({ queryKey: ['chapters', id], queryFn: () => hub.chapters(id), staleTime: T });
  const traits = useQuery({ queryKey: ['traits', id], queryFn: () => hub.traits(id), staleTime: T });
  const archives = useQuery({ queryKey: ['archives', id], queryFn: () => hub.archives(id), staleTime: T });
  const rankings = useQuery({ queryKey: ['rankings', id], queryFn: () => hub.rankings(id), staleTime: T });
  const photos = useQuery({ queryKey: ['person-photos', id], staleTime: T, queryFn: () => hub.search({ personId: id, size: 30, sortBy: 'effectiveDate', sortDir: 'asc', inclPersons: true, inclTags: true }) });
  const items = photos.data?.content ?? [], viewer = useViewer(items);
  const openById = (mid: string) => { const i = items.findIndex(m => m.id === mid); if (i >= 0) viewer.open(i); };
  const p = person.data, order = angelsOrdered(persons.data ?? []), k = order.findIndex(x => x.id === id), prev = order[k - 1], next = order[k + 1];
  const platforms = [...new Set((archives.data ?? []).map(a => a.platform))];
  const chs = [...(chapters.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const eps = [...(episodes.data ?? [])].sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));
  // notes from the chat analysis read as a list in the story; the side card keeps the short facts
  const analysis = (facts.data ?? []).filter(f => f.source === 'analysis'), shortFacts = (facts.data ?? []).filter(f => f.source !== 'analysis');
  const notes = analysis.filter(f => f.category === 'analysis-note'), style = analysis.filter(f => f.category === 'analysis-style');
  const cover = p?.coverUrl || p?.bannerUrl || items.find(m => m.isFeatured)?.cdnUrl || items[0]?.cdnUrl;
  if (person.isLoading) return <div className="wrap page"><div className="card empty">Đang mở câu chuyện…</div></div>;
  if (!p) return <div className="wrap page"><Link className="back" to="/angels">← Angels</Link><h1>Không tìm thấy người này</h1></div>;
  const intro = p.howWeMet || p.bio;

  return (
    <div className="wrap page" key={id}>
      <section className="lanes">
        <article className="story">
          <Link className="back" to="/angels">← Angels</Link>
          {p.period && <p className="kicker">{p.period}</p>}
          <h1 className="story-name">{nameOf(p)}</h1>
          <p className="story-meta">{[p.alternativeName, p.nickname && p.nickname !== nameOf(p) ? `“${p.nickname}”` : '', rel(p.relationshipType), platforms.join(' · ')].filter(Boolean).join(' · ')}</p>
          {p.song && <p className="story-song">♪ {p.song}</p>}
          {cover && <figure className="cover"><img className="zoom" src={cdn(cover, 1440)} alt="" onClick={() => items[0] && viewer.open(Math.max(0, items.findIndex(m => m.cdnUrl === cover)))} /></figure>}
          {intro && <div className="prose story-intro">{intro.split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}</div>}

          {chs.map(c => (
            <section key={c.id} className={c.sentiment === 'gap' ? 'chapter gap' : 'chapter'}>
              {c.period && <div className="when">{c.period}</div>}
              {c.title && <h2>{c.title}</h2>}
              {c.summary && <div className="prose">{c.summary.split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}</div>}
              {c.sentiment !== 'gap' && <ChapterPhotos personId={id} period={c.period} onOpen={openById} />}
            </section>))}

          {(notes.length > 0 || style.length > 0) && <section className="block notes">
            {notes.length > 0 && <><div className="hd"><h2>Ghi chép</h2><span>{notes.length}</span></div>
              <ul className="prose">{notes.map(f => <li key={f.id}>{f.value}</li>)}</ul></>}
            {style.length > 0 && <><div className="hd"><h2>Cách hai người nói chuyện</h2></div>
              <ul className="prose">{style.map(f => <li key={f.id}>{f.value}</li>)}</ul></>}
          </section>}

          <PersonNumbers entries={rankings.data ?? []} name={nameOf(p)} />

          {eps.length > 0 && <section className="block"><div className="hd"><h2>Những khoảnh khắc</h2><span>{eps.length}</span></div>
            <ol className="episodes">{eps.map(e => (
              <li key={e.id} className={(e.importance ?? 0) >= 4 ? 'big' : ''}>
                <time>{e.occurredAt ? dayMonthYear(e.occurredAt) : ''}</time>
                <p>{e.summary}</p>{e.emotion && <span className="emo">{e.emotion}</span>}
              </li>))}</ol></section>}

          {items.length > 0 && <section className="block"><div className="hd"><h2>Ảnh cùng nhau</h2><span>{fmt(photos.data?.totalElements ?? items.length)}</span><Link to={`/photos?person=${id}`} style={{ ['--c' as string]: 'var(--angels)' }}>Xem tất cả</Link></div>
            <Justified items={items} rowHeight={180} gap={6} onOpen={viewer.open} /></section>}

          {!!archives.data?.length && <section className="block"><div className="hd"><h2>Tin nhắn</h2><span>{archives.data.length} kho</span></div>
            <div className="chatlist">{archives.data.map(a => (
              <Link key={a.id} className="card chatcard" to={`/angels/${id}/chat/${a.id}`}>
                <span className="plat">{a.platform}</span><b>{a.title || `${a.platform} với ${nameOf(p)}`}</b>
                <small>{fmt(a.messageCount)} tin nhắn{a.dateFrom ? ` · ${dayMonthYear(a.dateFrom)}${a.dateTo ? ` – ${dayMonthYear(a.dateTo)}` : ''}` : ''}</small>
              </Link>))}</div></section>}

          {!chs.length && !eps.length && !intro && <p className="hush-note">Câu chuyện này chưa được viết — ảnh và tin nhắn bên dưới là những gì đang có.</p>}
          <div className="pn">{prev ? <Link to={`/angels/${prev.id}`}><small>← Trước</small><b>{nameOf(prev)}</b></Link> : <span />}{next ? <Link to={`/angels/${next.id}`}><small>Tiếp theo →</small><b>{nameOf(next)}</b></Link> : <span />}</div>
        </article>
        <aside className="rail">
          <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Về {nameOf(p)}</h3>
            <dl className="facts">
              {p.firstMet && <div><dt>Gặp nhau</dt><dd>{dayMonthYear(p.firstMet)}</dd></div>}
              {p.dateOfBirth && <div><dt>Sinh nhật</dt><dd>{new Date(p.dateOfBirth).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}</dd></div>}
              {p.song && <div><dt>Bài hát</dt><dd>{p.song}</dd></div>}
              {shortFacts.slice(0, 8).map(f => <div key={f.id}><dt>{f.key || f.category}</dt><dd>{f.value}</dd></div>)}
              {p.totalMediaFiles != null && <div><dt>Ảnh</dt><dd>{fmt(p.totalMediaFiles)}</dd></div>}
            </dl></div>
          {!!traits.data?.length && <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Tính cách</h3>
            <div className="chips">{traits.data.map(t => <span key={t.id} className="chip" title={t.description ?? ''}>{t.trait}</span>)}</div></div>}
          <LineCard people={[p]} />
        </aside>
      </section>
      {viewer.element}
    </div>
  );
}

/* ── reading an old conversation ── */
export function ChatReader() {
  const { id = '', archiveId = '' } = useParams(), [q, setQ] = useState(''), [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const person = useQuery({ queryKey: ['person', id], queryFn: () => hub.person(id), staleTime: T });
  const archives = useQuery({ queryKey: ['archives', id], queryFn: () => hub.archives(id), staleTime: T });
  const a = archives.data?.find(x => x.id === archiveId), p = person.data;
  const inf = useInfiniteQuery({ queryKey: ['chat', archiveId, dq], initialPageParam: 0, staleTime: T,
    queryFn: ({ pageParam }) => hub.messages(id, archiveId, pageParam, 200, dq || undefined), getNextPageParam: (last) => (last.last ? undefined : last.number + 1) });
  const msgs = inf.data?.pages.flatMap(x => x.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? 0;
  const names = useMemo(() => [p?.name, p?.displayName, p?.nickname, p?.alternativeName].filter(Boolean).map(x => fold(x!)), [p]);
  /* who wrote it: the side stored at import time; guessing from the name only for messages that have none
     (a phone-book name, a number or a Facebook name rarely matches the name shown on the page) */
  const isThem = (m: ChatMessage) => (m.senderType ? m.senderType !== 'SELF' : names.some(n => fold(m.sender).includes(n) || n.includes(fold(m.sender))));
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  const mark = (text: string) => { if (!dq) return text; const i = fold(text).indexOf(fold(dq)); return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + dq.length)}</mark>{text.slice(i + dq.length)}</>; };
  return (
    <div className="wrap page transcript-page">
      <Link className="back" to={`/angels/${id}`}>← {p ? nameOf(p) : 'Angels'}</Link>
      <div className="ptitle"><h1>{a?.title || (a && p ? `${a.platform} với ${nameOf(p)}` : 'Tin nhắn')}</h1>
        <span>{a ? `${a.platform} · ${fmt(dq ? total : a.messageCount)} tin nhắn${dq ? ' khớp' : ''}` : ''}</span>
        <input className="finput" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm trong cuộc trò chuyện…" /></div>
      <div className="transcript">
        {inf.isLoading && <div className="card empty">Đang mở cuộc trò chuyện…</div>}
        {!inf.isLoading && !msgs.length && <div className="card empty">{dq ? 'Không có tin nhắn nào khớp.' : 'Kho này chưa có tin nhắn.'}</div>}
        {msgs.map((m, i) => {
          const day = (m.timestamp ?? '').slice(0, 10), prevM = msgs[i - 1], newDay = !prevM || (prevM.timestamp ?? '').slice(0, 10) !== day, them = isThem(m), cont = !newDay && prevM && prevM.sender === m.sender;
          return (
            <Fragment key={m.id}>
              {newDay && day && <div className="day-sep"><span>{longDay(+day.slice(0, 4), +day.slice(5, 7), +day.slice(8, 10))}</span></div>}
              <div className={`msg ${them ? 'them' : 'me'} ${cont ? 'cont' : ''}`}>
                {!cont && <span className="who">{m.sender}</span>}
                <p>{mark(m.content)}<time>{timeOf(m.timestamp)}</time></p>
              </div>
            </Fragment>);
        })}
        <Sentinel more={more} active={!!inf.hasNextPage} />
      </div>
    </div>
  );
}
