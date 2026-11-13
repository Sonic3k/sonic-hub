/* Angels — the people who passed through. The list is cut by the year he came to know each of them, the faces of a
   year side by side; a person's page is their story, opened on the paper of that year; an old conversation is read
   as a transcript. */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { hub, periodYears, randomLine } from '../api/hub';
import { cdn, pic } from '../api/client';
import type { ChatAttachment, ChatMessage, Chapter, MysticBrief, Person } from '../types';
import { fmt, usePersons } from '../lib/queries';
import { dayMonthYear, longDay, momentDate, timeOf, vnClock } from '../lib/date';
import { fold, matches } from '../lib/text';
import { eraClass } from '../lib/era';
import { atOf, useMoment } from '../lib/moment';
import { useDesk } from '../lib/desk';
import { useGoTo } from '../lib/scroll';
import { angelsByYear, angelsInOrder, metYear, nameOf, useMetYears, useMoments, type MomentOf } from '../lib/people';
import Justified from '../components/Justified';
import { YearChip } from '../components/Paper';
import { Sentinel, useViewer } from '../components/PhotoGroups';
import { PostHits } from './Forum';
import PersonNumbers from '../components/PersonNumbers';
import { Attachment, AttachmentGallery, Lightbox, type Shown } from '../components/ChatAttachments';
import { kindName, memoryHref, memoryWhen } from './Memories';
import { isOwner } from '../components/money/data';

const T = 10 * 60_000;
/* ANGEL is not written out: these pages are the Angels. OTHER marks someone who is not one. */
const REL: Record<string, string> = { ANGEL: '', OTHER: 'khác', FRIEND: 'bạn', FAMILY: 'gia đình' };
const rel = (r?: string | null) => (r ? REL[r] ?? r.toLowerCase().replace(/_/g, ' ') : '');
const nickOf = (p: Person) => (p.nickname && p.nickname !== nameOf(p) ? p.nickname : '');
const PC = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.6" /><path d="M9 20h6M12 16v4" /></svg>;

type Faced = { id?: string; name: string; displayName?: string | null; avatarUrl?: string | null };
/** A face: the person's avatar; with none, a photo they are in (asked for only once the face comes near the screen);
 *  with none of those either, the first letter of their name on a quiet tile. */
export function Face({ p, w = 240 }: { p: Faced; w?: number }) {
  const ref = useRef<HTMLSpanElement>(null), [near, setNear] = useState(false), lacks = !p.avatarUrl && !!p.id;
  useEffect(() => {
    const el = ref.current;
    if (!lacks || near || !el) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [lacks, near]);
  const q = useQuery({ queryKey: ['face', p.id], enabled: lacks && near, staleTime: T, queryFn: async () => (await hub.search({ personId: p.id!, size: 1, random: true, type: 'IMAGE' })).content[0] ?? null });
  const src = p.avatarUrl ? cdn(p.avatarUrl, w) : q.data ? cdn(pic(q.data), w) : '';
  return src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <span ref={ref} className="an-letter">{(p.displayName || p.name).trim().slice(0, 1).toUpperCase()}</span>;
}

/** One of them in the list: the face, the name, the nick. `chip` shows the year on the face (search results, out of their place in the roll). */
function PersonCard({ p, year, chip }: { p: Person; year?: number; chip?: boolean }) {
  const nick = nickOf(p);
  return (
    <Link className="an-card" to={`/angels/${p.id}`}>
      <span className="an-face"><Face p={p} /></span>
      <b>{nameOf(p)}</b>
      {nick && <small>{nick}</small>}
      {chip && !!year && <YearChip year={year} />}
    </Link>
  );
}

/** A portrait as a small print with the name written under it. One of them on a page may be tilted and taped. */
function FacePrint({ p, name, to, tilt, tape }: { p?: Person; name: string; to?: string; tilt?: number; tape?: number }) {
  const body = <>
    {tape !== undefined && <span className="tape" aria-hidden="true" style={{ transform: `rotate(${tape}deg)` }} />}
    <Face p={p ?? { name }} w={320} />
    <span className="print-cap">{name}</span>
  </>;
  const cls = 'print print-s captioned an-print', st = tilt ? { transform: `rotate(${tilt}deg)` } : undefined;
  return to ? <Link className={cls} style={st} to={to}>{body}</Link> : <span className={cls} style={st}>{body}</span>;
}

/* ── the list ── */

/** What the list opens on. With a day picked: who that month was about (his Moments sheet) and who he came to know
 *  that year. Otherwise: who this month was about, year after year. */
function Opener({ all, years }: { all: Person[]; years: Map<string, number> }) {
  const { moment, picked } = useMoment(), moments = useMoments(), desk = useDesk();
  const byId = useMemo(() => new Map(all.map(p => [p.id, p])), [all]);
  const to = (x: MomentOf) => (x.personId ? `/angels/${x.personId}` : undefined), who = (x: MomentOf) => (x.personId ? byId.get(x.personId) : undefined);
  if (picked && moment) {
    const of = moments.find(x => x.year === moment.y && (x.month === moment.m || x.month === 0));
    const met = angelsInOrder(all, years).filter(p => metYear(p, years) === moment.y);
    if (!of && !met.length) return null;
    const computer = desk.data?.computer?.device;
    return (
      <section className={`an-open then ${eraClass(moment.y)}`}>
        <div className="an-open-hd"><h2>Tháng {moment.m} năm {moment.y}</h2>
          {computer && <a className="an-go" href={`/pc?at=${encodeURIComponent(atOf(moment))}`}>{PC}Bật {computer.name}</a>}</div>
        <div className="an-then">
          {of && <div className="an-then-of">
            <FacePrint p={who(of)} name={of.name} to={to(of)} tilt={-2} tape={3} />
            <p>Trong Moments, {of.month ? 'tháng này' : `cả năm ${of.year}`} anh ghi tên {of.personId ? <Link to={`/angels/${of.personId}`}>{of.name}</Link> : <b>{of.name}</b>}.</p>
          </div>}
          {met.length > 0 && <div className="an-then-met"><h3>Quen trong năm {moment.y}</h3>
            <div className="an-grid">{met.map(p => <PersonCard key={p.id} p={p} />)}</div></div>}
        </div>
      </section>
    );
  }
  const month = new Date().getMonth() + 1, list = moments.filter(x => x.month === month);
  if (!list.length) return null;
  return (
    <section className="an-open">
      <div className="an-open-hd"><h2>Tháng {month} những năm trước</h2><Link to="/angels/rankings?tab=moments">Moments</Link></div>
      <div className="an-months" style={{ ['--n' as string]: list.length }}>{list.map((x, i) => (
        <div key={x.year} className="an-mo">
          <YearChip year={x.year} />
          <FacePrint p={who(x)} name={x.name} to={to(x)} tilt={i === 0 ? -2 : undefined} tape={i === 0 ? 3 : undefined} />
        </div>))}</div>
    </section>
  );
}

export function AngelsIndex() {
  const persons = usePersons(), { years, ready } = useMetYears(), loc = useLocation(), [q, setQ] = useState('');
  const all = useMemo(() => persons.data ?? [], [persons.data]);
  const blocks = useMemo(() => angelsByYear(all, years), [all, years]);
  const t = q.trim(), loading = persons.isLoading || !ready;
  const found = t ? blocks.flatMap(([y, ps]) => ps.filter(p => matches(p.name, t) || matches(p.displayName, t) || matches(p.nickname, t)).map(p => ({ y, p }))) : [];
  /* #y-2009: a year of the sidebar */
  useGoTo(t ? '' : loc.hash.slice(1), !loading);
  /* with no year known at all (the sheets could not be read) the roll is just everyone, with no turns */
  const dated = blocks.some(([y]) => y > 0);
  return (
    <div className="wrap page an">
      <header className="mm-head"><h1>Những người đã đi qua</h1>
        <label className="msearch">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên hoặc nick…" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Xoá">×</button>}
        </label>
        <Link className="sortbtn" to="/angels/rankings">Bảng xếp hạng</Link>
      </header>
      {loading ? <p className="jn-wait">Đang mở…</p>
        : t ? (found.length ? <div className="an-grid">{found.map(({ y, p }) => <PersonCard key={p.id} p={p} year={y} chip />)}</div> : <p className="jn-wait">Không thấy ai tên như vậy.</p>)
        : <>
          <Opener all={all} years={years} />
          {/* one roll of faces, a tile where each year begins */}
          <div className="an-grid an-roll">{blocks.map(([y, ps]) => (
            <Fragment key={y}>
              {dated && <h2 id={`y-${y}`} className={`an-turn ${y ? eraClass(y) : ''}`}>{y ? <b>{y}</b> : <span>Chưa rõ năm</span>}</h2>}
              {ps.map(p => <PersonCard key={p.id} p={p} year={y} />)}
            </Fragment>))}</div>
        </>}
    </div>
  );
}

/* ── one person, one story ── */

function ChapterPhotos({ personId, period, onOpen }: { personId: string; period?: string | null; onOpen: (id: string) => void }) {
  const yrs = periodYears(period);
  const q = useQuery({ queryKey: ['chapter-photos', personId, period], enabled: !!yrs, staleTime: T,
    queryFn: () => hub.search({ personId, from: `${yrs![0]}-01-01`, to: `${yrs![1] + 1}-01-01`, size: 5, random: true, type: 'IMAGE' }) });
  const items = q.data?.content ?? [];
  return items.length ? <div className="an-ch-photos"><Justified items={items} rowHeight={190} gap={6} onOpen={(i) => onOpen(items[i].id)} /></div> : null;
}

/** One line they really wrote, pulled from the old chats: the page's words in the school hand. */
function LineCard({ p }: { p: Person }) {
  const [n, setN] = useState(0);
  const q = useQuery({ queryKey: ['line', p.id, n], queryFn: () => randomLine([p]), staleTime: T });
  if (q.isSuccess && !q.data) return null;
  return (
    <div className="an-line">
      <h5>Một dòng tin nhắn<button type="button" onClick={() => setN(v => v + 1)}>Dòng khác</button></h5>
      {q.data ? <><blockquote className="an-said">{q.data.text}</blockquote><small>{[q.data.who, q.data.platform, q.data.at ? dayMonthYear(vnClock(q.data.at)) : ''].filter(Boolean).join(' · ')}</small></>
        : <small>Đang lục lại…</small>}
    </div>
  );
}

const CONTACT_ORDER = ['PHONE', 'YAHOO', 'FACEBOOK', 'SMS', 'ZALO'];
const CONTACT_LABEL: Record<string, string> = { PHONE: 'Điện thoại', YAHOO: 'Yahoo', FACEBOOK: 'Facebook', SMS: 'SMS', ZALO: 'Zalo', TELEGRAM: 'Telegram', BLOG: 'Blog', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', OTHER: 'Khác' };
const PLATFORM: Record<string, string> = { facebook: 'Facebook', 'facebook-wall': 'Tường Facebook', yahoo: 'Yahoo', sms: 'SMS', zalo: 'Zalo', skype: 'Skype' };
const platformName = (s: string) => PLATFORM[s.toLowerCase()] ?? s;
const paras = (t: string) => t.split(/\n{2,}/).map((x, i) => <p key={i}>{x}</p>);
/** "Yahoo · Tommy" filed under Yahoo is just "Tommy" */
const chatTitle = (title: string, platform: string) => (title.toLowerCase().startsWith(`${platform.toLowerCase()} · `) ? title.slice(platform.length + 3) : title);

export function PersonPage() {
  const { id = '' } = useParams(), persons = usePersons(), { years } = useMetYears();
  const person = useQuery({ queryKey: ['person', id], queryFn: () => hub.person(id), staleTime: T });
  const facts = useQuery({ queryKey: ['facts', id], queryFn: () => hub.facts(id), staleTime: T });
  const episodes = useQuery({ queryKey: ['episodes', id], queryFn: () => hub.episodes(id), staleTime: T });
  const chapters = useQuery({ queryKey: ['chapters', id], queryFn: () => hub.chapters(id), staleTime: T });
  const traits = useQuery({ queryKey: ['traits', id], queryFn: () => hub.traits(id), staleTime: T });
  const archives = useQuery({ queryKey: ['archives', id], queryFn: () => hub.archives(id), staleTime: T });
  const rankings = useQuery({ queryKey: ['rankings', id], queryFn: () => hub.rankings(id), staleTime: T });
  const chatStats = useQuery({ queryKey: ['chat-stats', id], queryFn: () => hub.chatStats(id), staleTime: T });
  const writings = useQuery({ queryKey: ['writings', id], queryFn: () => hub.notes({ authorId: id, size: 50 }), staleTime: T });
  const forums = useQuery({ queryKey: ['person-forums', id], queryFn: () => hub.personForums(id).catch(() => []), staleTime: T });
  const forumPosts = useQuery({ queryKey: ['person-forum-posts', id], queryFn: () => hub.personForumPosts(id, 0, 8).catch(() => null), staleTime: T, enabled: !!forums.data?.length });
  /* his own memories this person is in */
  const me = persons.data?.find(x => x.isSelf);
  const shared = useQuery({ queryKey: ['memories-with', me?.id, id], enabled: !!me && me.id !== id, staleTime: T,
    queryFn: async () => (await hub.episodes(me!.id, { withPersonId: id })).sort((a, b) => (a.occurredAt ?? '9999').localeCompare(b.occurredAt ?? '9999')) });
  const photos = useQuery({ queryKey: ['person-photos', id], staleTime: T, queryFn: () => hub.search({ personId: id, size: 30, sortBy: 'effectiveDate', sortDir: 'asc', inclPersons: true, inclTags: true }) });
  const items = photos.data?.content ?? [], viewer = useViewer(items);
  const openById = (mid: string) => { const i = items.findIndex(m => m.id === mid); if (i >= 0) viewer.open(i); };
  const p = person.data, order = angelsInOrder(persons.data ?? [], years), k = order.findIndex(x => x.id === id), prev = k > 0 ? order[k - 1] : undefined, next = k >= 0 ? order[k + 1] : undefined;
  const owner = isOwner();
  /* the list of chapters: open beside a wide page; on a phone it waits behind its title, so the story starts near the top */
  const [toc, setToc] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 861px)').matches);
  const chs = [...(chapters.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const eps = [...(episodes.data ?? [])].sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));
  // notes from the chat analysis read as a list in the story; the side keeps the short facts
  const analysis = (facts.data ?? []).filter(f => f.source === 'analysis'), shortFacts = (facts.data ?? []).filter(f => f.source !== 'analysis');
  const notes = analysis.filter(f => f.category === 'analysis-note'), style = analysis.filter(f => f.category === 'analysis-style');
  if (person.isLoading) return <div className="page an"><div className="an-wait"><p className="jn-wait">Đang mở câu chuyện…</p></div></div>;
  if (!p) return <div className="page an"><div className="an-wait"><Link className="back" to="/angels">← Angels</Link><h1>Không tìm thấy người này</h1></div></div>;

  const y = metYear(p, years), intro = p.howWeMet || p.bio, wide = p.coverUrl || p.bannerUrl;
  const portrait = p.avatarUrl || (wide ? '' : pic(items.find(m => m.isFeatured), true) || pic(items[0], true));
  const chats = [...(archives.data ?? [])].sort((a, b) => b.messageCount - a.messageCount);
  const kicker = [rel(p.relationshipType), p.period].filter(Boolean).join(' · ');
  const meta = [nickOf(p) && `“${nickOf(p)}”`, p.alternativeName, p.song && `♪ ${p.song}`].filter(Boolean) as string[];
  const hasNumbers = !!(rankings.data?.length || chatStats.data?.messages);
  /* is anything known for the "Về …" list at the side */
  const known = !!(p.firstMet || p.dateOfBirth || p.birthMonth || p.birthYear || p.song || shortFacts.length || (owner && (p.birthTime || p.birthPlace)));
  /* A story can be told more than once: the long read of the chats first, then what the forum shows of them and the
     earlier summary of the chats, period by period. Each run after the first says where it is from. */
  const forumName = (key: string) => forums.data?.find(f => f.forumKey === key)?.forumName.replace(/\s*\(.*\)$/, '');
  const runs: { key: string; label: string; items: Chapter[] }[] = [];
  for (const c of chs) {
    const key = c.source ?? '', last = runs[runs.length - 1];
    if (last && last.key === key) last.items.push(c);
    else runs.push({ key, label: !runs.length ? '' : key === 'analysis' ? 'Tóm tắt theo tin nhắn' : forumName(key) ? `Trên ${forumName(key)}` : '', items: [c] });
  }
  /* the parts of this page, for the way through it at the side (and under the name on a narrow screen) */
  const parts = [
    chs.length > 0 && ['chuyen', 'Câu chuyện'], hasNumbers && ['con-so', 'Những con số'], eps.length > 0 && ['khoanh-khac', 'Những khoảnh khắc'],
    !!shared.data?.length && ['ky-uc', 'Trong ký ức của anh'], items.length > 0 && ['anh', 'Ảnh cùng nhau'], !!writings.data?.content.length && ['bai-viet', 'Bài viết'],
    !!forums.data?.length && ['dien-dan', 'Trên diễn đàn'], chats.length > 0 && ['tin-nhan', 'Tin nhắn'],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="page an" key={id}>
      <header className={`mm-top an-top ${y ? `dated ${eraClass(y)}` : 'plain'}`}>
        <div className="mm-top-in">
          {y > 0 && <div className="mm-top-y"><b>{y}</b><span>Quen từ</span></div>}
          <div className="mm-top-t">
            <Link className="back" to={y ? `/angels#y-${y}` : '/angels'}>← Angels</Link>
            {kicker && <span className="mm-k">{kicker}</span>}
            <h1>{nameOf(p)}</h1>
            {meta.length > 0 && <div className="mm-meta">{meta.map(x => <span key={x}>{x}</span>)}</div>}
            <div className="an-acts">
              {chats.length === 1 && <Link className="an-btn main" to={`/angels/${id}/chat/${chats[0].id}`}>Đọc tin nhắn</Link>}
              {chats.length > 1 && <a className="an-btn main" href="#tin-nhan">Đọc tin nhắn</a>}
              {items.length > 0 && <Link className="an-btn" to={`/photos?person=${id}`}>Xem ảnh</Link>}
            </div>
          </div>
          {portrait && <figure className="an-top-face"><span className="tape" aria-hidden="true" /><img src={cdn(portrait, 480)} alt="" /></figure>}
        </div>
      </header>
      {parts.length > 1 && <nav className="an-jump" aria-label="Các phần của trang">{parts.map(([k2, n]) => <a key={k2} href={`#${k2}`}>{n}</a>)}<a href="#thong-tin">Thông tin</a></nav>}
      <div className="reader">
        <article className="article">
          {wide && <figure className="an-cover"><img src={cdn(wide, 1440)} alt="" onClick={() => items[0] && viewer.open(Math.max(0, items.findIndex(m => pic(m, true) === wide)))} /></figure>}
          {intro && <div className="prose an-intro">{paras(intro)}</div>}

          {chs.length > 0 && <div id="chuyen" className="an-story">
            {chs.length > 3 && <details className="an-toc" open={toc} onToggle={e => setToc((e.currentTarget as HTMLDetailsElement).open)}>
              <summary>Các chương</summary>
              <div className="an-toc-in">{runs.map(r => (
                <div key={r.key}>{r.label && <h3>{r.label}</h3>}
                  <ol>{r.items.map(c => <li key={c.id}><a href={`#ch-${c.id}`}><span>{c.period}</span><b>{c.title || 'Không tên'}</b></a></li>)}</ol></div>))}</div>
            </details>}
            {runs.map(r => (
              <div key={r.key} className="an-run">
                {r.label && <h2 className="an-h">{r.label}</h2>}
                {r.items.map(c => (
                  <section key={c.id} id={`ch-${c.id}`} className={c.sentiment === 'gap' ? 'an-ch gap' : 'an-ch'}>
                    {c.period && <span className="an-when">{c.period}</span>}
                    {c.title && <h3>{c.title}</h3>}
                    {c.summary && <div className="prose">{paras(c.summary)}</div>}
                    {c.sentiment !== 'gap' && <ChapterPhotos personId={id} period={c.period} onOpen={openById} />}
                  </section>))}
              </div>))}
          </div>}

          {notes.length > 0 && <><h2 className="an-h">Ghi chép</h2><ul className="an-notes">{notes.map(f => <li key={f.id}>{f.value}</li>)}</ul></>}
          {style.length > 0 && <><h2 className="an-h">Cách hai người nói chuyện</h2><ul className="an-notes">{style.map(f => <li key={f.id}>{f.value}</li>)}</ul></>}

          {hasNumbers && <div id="con-so" className="an-part"><PersonNumbers entries={rankings.data ?? []} name={nameOf(p)} activity={chatStats.data} /></div>}

          {eps.length > 0 && <><h2 className="an-h" id="khoanh-khac">Những khoảnh khắc</h2>
            <ol className="an-eps">{eps.map(e => (
              <li key={e.id} className={(e.importance ?? 0) >= 4 ? 'big' : ''}>
                <time>{momentDate(e.occurredAt)}</time>
                <p>{e.summary}{e.emotion && <i>{e.emotion}</i>}</p>
              </li>))}</ol></>}

          {!!shared.data?.length && <><h2 className="an-h" id="ky-uc">Trong ký ức của anh</h2>
            <div className="an-rows">{shared.data.map(e => (
              <Link key={e.id} className="mm-line" to={memoryHref(e)}>
                <span className="mm-d">{memoryWhen(e)}</span>
                <span className="mm-b"><b>{e.title || e.summary}</b>{e.kind && <small><i className={`k-${e.kind}`}>{kindName(e.kind)}</i></small>}</span>
              </Link>))}</div></>}

          {items.length > 0 && <><h2 className="an-h" id="anh">Ảnh cùng nhau<Link to={`/photos?person=${id}`}>Xem tất cả</Link></h2>
            <Justified items={items} rowHeight={180} gap={6} onOpen={viewer.open} /></>}

          {!!writings.data?.content.length && <><h2 className="an-h" id="bai-viet">Bài viết</h2>
            <div className="an-rows">{[...writings.data.content].sort((a, b) => (a.writtenAt ?? a.createdAt ?? '').localeCompare(b.writtenAt ?? b.createdAt ?? '')).map(w => (
              <Link key={w.id} className="mm-line" to={w.slug ? `/journal/${w.slug}` : `/journal/id/${w.id}`}>
                <span className="mm-d">{dayMonthYear(vnClock(w.writtenAt ?? w.createdAt))}</span>
                <span className="mm-b"><b>{w.title || 'Không tiêu đề'}</b>{w.series && <small>{w.series}</small>}</span>
              </Link>))}</div></>}

          {!!forums.data?.length && <><h2 className="an-h" id="dien-dan">Trên diễn đàn{forums.data.map(f => <Link key={f.forumKey} className="forum" to={`/forum/${f.forumKey}?tab=posts&person=${id}`}>Mọi bài ở {f.forumName.replace(/\s*\(.*\)$/, '')}</Link>)}</h2>
            <p className="an-note">{forums.data.map(f => `${f.nicks}${f.firstAt ? `, ${dayMonthYear(f.firstAt)} – ${dayMonthYear(f.lastAt)}` : ''}`).join(' · ')}</p>
            {forumPosts.data && <PostHits rows={forumPosts.data.content} showPerson={false} />}</>}

          {chats.length > 0 && <><h2 className="an-h" id="tin-nhan">Tin nhắn</h2>
            <div className="an-rows">{chats.map(a => (
              <Link key={a.id} className="mm-line an-chatrow" to={`/angels/${id}/chat/${a.id}`}>
                <span className="mm-d">{platformName(a.platform)}</span>
                <span className="mm-b"><b>{a.title ? chatTitle(a.title, platformName(a.platform)) : `Với ${nameOf(p)}`}</b>
                  {a.dateFrom && <small>{dayMonthYear(vnClock(a.dateFrom))}{a.dateTo ? ` – ${dayMonthYear(vnClock(a.dateTo))}` : ''}</small>}</span>
                <small className="an-n">{fmt(a.messageCount)} tin</small>
              </Link>))}</div></>}

          {!chs.length && !eps.length && !intro && <p className="an-note">Câu chuyện này chưa được viết.</p>}
          <div className="pn">{prev ? <Link to={`/angels/${prev.id}`}><small>← Trước</small><b>{nameOf(prev)}</b></Link> : <span />}{next ? <Link to={`/angels/${next.id}`}><small>Tiếp theo →</small><b>{nameOf(next)}</b></Link> : <span />}</div>
        </article>
        <aside className="aside" id="thong-tin">
          {known && <div><h5>Về {nameOf(p)}</h5>
            <dl className="facts">
              {p.firstMet && <div><dt>Gặp nhau</dt><dd>{dayMonthYear(p.firstMet)}</dd></div>}
              {p.dateOfBirth ? <div><dt>Sinh nhật</dt><dd>{dayMonthYear(p.dateOfBirth)}</dd></div>
                : (p.birthMonth || p.birthYear) ? <div><dt>Sinh nhật</dt><dd>{[p.birthDay && p.birthMonth ? `${p.birthDay} tháng ${p.birthMonth}` : '', p.birthYear ? `năm ${p.birthYear}` : ''].filter(Boolean).join(', ')}</dd></div> : null}
              {owner && p.birthTime && <div><dt>Giờ sinh</dt><dd>{p.birthTime}{p.birthTimeApprox ? ' (ước chừng)' : ''}</dd></div>}
              {owner && p.birthPlace && <div><dt>Nơi sinh</dt><dd>{p.birthPlace}</dd></div>}
              {p.song && <div><dt>Bài hát</dt><dd>{p.song}</dd></div>}
              {shortFacts.slice(0, 8).map(f => <div key={f.id}><dt>{f.key || f.category}</dt><dd>{f.value}</dd></div>)}
            </dl></div>}
          {owner && <MysticBriefs personId={id} />}
          {!!p.contacts?.length && <div><h5>Liên hệ</h5>
            <dl className="facts">{CONTACT_ORDER.flatMap(c => p.contacts!.filter(x => x.platform === c)).concat(p.contacts.filter(c => !CONTACT_ORDER.includes(c.platform))).map(c => (
              <div key={c.id}><dt>{CONTACT_LABEL[c.platform] ?? c.platform}</dt>
                <dd>{c.platform === 'PHONE' ? <a href={`tel:${c.identifier}`}>{c.identifier}</a> : c.platform === 'FACEBOOK' && !/\s/.test(c.identifier) ? <a href={`https://www.facebook.com/${c.identifier}`} target="_blank" rel="noreferrer">{c.displayName || c.identifier}</a> : c.identifier}
                  {c.notes && <small>{c.notes}</small>}</dd></div>))}</dl></div>}
          {!!traits.data?.length && <div><h5>Tính cách</h5>
            <div className="an-traits">{traits.data.map(t => <span key={t.id} title={t.description ?? ''}>{t.trait}</span>)}</div></div>}
          <LineCard p={p} />
          {parts.length > 1 && <nav className="an-here" aria-label="Các phần của trang"><h5>Trong trang này</h5>{parts.map(([k2, n]) => <a key={k2} href={`#${k2}`}>{n}</a>)}</nav>}
        </aside>
      </div>
      {viewer.element}
    </div>
  );
}

/** What Huyền học has read for this person, one brief per discipline (owner only: it is read from their birth time).
 *  The source's lines keep its typeface (grandma's notes for Tử vi, the book for Nhân số học); the added ones are
 *  marked as such. */
function MysticBriefs({ personId }: { personId: string }) {
  const q = useQuery({ queryKey: ['mystic-briefs', personId], queryFn: () => hub.mysticBriefs(personId).catch(() => [] as MysticBrief[]), staleTime: T });
  return <>{(q.data ?? []).map(b => (
    <div key={b.discipline} className="card mystic-brief" style={{ ['--c' as string]: 'var(--mystic)' }}>
      <h3><i />{b.title}{b.profileLabel && <small>{b.profileLabel}</small>}</h3>
      <dl className="facts">{b.facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
      {b.lines.map((l, i) => <p key={i} className={`mystic-line ${l.layer}`}><span>{voiceOf(b.discipline, l)}</span>{l.text}</p>)}
      {b.url && <a className="go" href={b.url}>{b.discipline === 'tuvi' ? 'Mở lá số ở Huyền học →' : 'Mở hồ sơ ở Huyền học →'}</a>}
    </div>))}</>;
}

/** whose words a line of a brief is: grandma's (Tử vi), the book's or a summary of it (Nhân số học), or added */
function voiceOf(discipline: string, l: MysticBrief['lines'][number]): string {
  if (discipline === 'tuvi') return l.layer === 'primary' ? 'Lời bà' : 'Bổ sung — không phải của bà';
  if (l.layer === 'added') return 'Luận thêm — không phải lời sách';
  return l.source?.startsWith('Tóm lược') ? 'Tóm lược sách' : 'Lời sách';
}

/* ── reading an old conversation ── */
export function ChatReader() {
  const { id = '', archiveId = '' } = useParams(), [q, setQ] = useState(''), [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const person = useQuery({ queryKey: ['person', id], queryFn: () => hub.person(id), staleTime: T });
  const archives = useQuery({ queryKey: ['archives', id], queryFn: () => hub.archives(id), staleTime: T });
  const a = archives.data?.find(x => x.id === archiveId), p = person.data;
  const [sp, setSp] = useSearchParams(), media = sp.get('tab') === 'media', [shown, setShown] = useState<Shown | null>(null);
  /* ?at=548 opens the conversation at message seq 548 (a memory quoting it links here): start on its page, earlier pages on demand */
  const at = Number(sp.get('at')) || 0;
  const pos = useQuery({ queryKey: ['chat-pos', archiveId, at], enabled: !!at, staleTime: T, queryFn: () => hub.messagePosition(id, archiveId, at).catch(() => ({ index: 0 })) });
  const start = at && !dq ? Math.floor((pos.data?.index ?? 0) / 200) : 0;
  const inf = useInfiniteQuery({ queryKey: ['chat', archiveId, dq, start], initialPageParam: start, staleTime: T, enabled: !at || !!dq || pos.isSuccess,
    queryFn: ({ pageParam }) => hub.messages(id, archiveId, pageParam, 200, dq || undefined), getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
    getPreviousPageParam: (first) => (first.number > 0 ? first.number - 1 : undefined) });
  const msgs = inf.data?.pages.flatMap(x => x.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? 0;
  const jumped = useRef(false);
  useEffect(() => { if (!at || dq || jumped.current || !msgs.some(m => m.seq === at)) return; jumped.current = true; document.getElementById(`m-${at}`)?.scrollIntoView({ block: 'center' }); }, [msgs, at, dq]);
  const closeShown = useCallback(() => setShown(null), []);
  const tab = (m: boolean) => { const n = new URLSearchParams(sp); if (m) n.set('tab', 'media'); else n.delete('tab'); setSp(n, { replace: true }); };
  /* what came with each page of messages, one request per 100 ids */
  const attPages = useQueries({ queries: (inf.data?.pages ?? []).map(pg => ({ queryKey: ['chat-att', archiveId, dq, pg.number], staleTime: T,
    queryFn: () => hub.chatAttachments(id, archiveId, pg.content.map(m => m.id)).catch(() => [] as ChatAttachment[]) })) });
  const atts = useMemo(() => {
    const by = new Map<string, ChatAttachment[]>();
    for (const x of attPages) for (const y of x.data ?? []) { const l = by.get(y.messageId); if (l) l.push(y); else by.set(y.messageId, [y]); }
    return by;
  }, [attPages]);
  const names = useMemo(() => [p?.name, p?.displayName, p?.nickname, p?.alternativeName].filter(Boolean).map(x => fold(x!)), [p]);
  /* who wrote it: the side stored at import time; guessing from the name only for messages that have none
     (a phone-book name, a number or a Facebook name rarely matches the name shown on the page) */
  const isThem = (m: ChatMessage) => (m.senderType ? m.senderType !== 'SELF' : names.some(n => fold(m.sender).includes(n) || n.includes(fold(m.sender))));
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  const mark = (text: string) => { if (!dq) return text; const i = fold(text).indexOf(fold(dq)); return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + dq.length)}</mark>{text.slice(i + dq.length)}</>; };
  const span = a?.dateFrom ? `${dayMonthYear(vnClock(a.dateFrom))}${a.dateTo ? ` – ${dayMonthYear(vnClock(a.dateTo))}` : ''}` : '';
  return (
    <div className="wrap page an an-chat">
      <header className="an-chat-top">
        <Link className="back" to={`/angels/${id}`}>← {p ? nameOf(p) : 'Angels'}</Link>
        <h1>{a?.title ? chatTitle(a.title, platformName(a.platform)) : p ? `Với ${nameOf(p)}` : 'Tin nhắn'}</h1>
        <p>{a ? [platformName(a.platform), dq ? `${fmt(total)} tin nhắn khớp` : span].filter(Boolean).join(' · ') : ''}</p>
        <div className="an-chat-tools">
          <div className="seg"><a className={media ? '' : 'on'} onClick={() => tab(false)}>Tin nhắn</a><a className={media ? 'on' : ''} onClick={() => tab(true)}>Ảnh &amp; file</a></div>
          {!media && <input className="finput" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm trong cuộc trò chuyện…" />}
        </div>
      </header>
      {media ? <AttachmentGallery personId={id} archiveId={archiveId} onOpen={setShown} /> : <div className="transcript">
        {inf.isLoading && <p className="jn-wait">Đang mở cuộc trò chuyện…</p>}
        {!inf.isLoading && !msgs.length && <p className="jn-wait">{dq ? 'Không có tin nhắn nào khớp.' : 'Kho này chưa có tin nhắn.'}</p>}
        {inf.hasPreviousPage && <button type="button" className="older" onClick={() => inf.fetchPreviousPage()} disabled={inf.isFetchingPreviousPage}>{inf.isFetchingPreviousPage ? 'Đang mở…' : '↑ Tin nhắn trước đó'}</button>}
        {msgs.map((m, i) => {
          /* stored in UTC, read on Vietnam's clock; a line known only to its day shows no time */
          const ts = vnClock(m.timestamp), day = ts.slice(0, 10), prevM = msgs[i - 1], newDay = !prevM || vnClock(prevM.timestamp).slice(0, 10) !== day, them = isThem(m), cont = !newDay && prevM && prevM.sender === m.sender;
          const att = atts.get(m.id) ?? [], text = !!m.content?.trim() || !att.length, time = m.timePrecision === 'DAY' ? '' : timeOf(ts);
          return (
            <Fragment key={m.id}>
              {newDay && day && <div className="day-sep"><span>{longDay(+day.slice(0, 4), +day.slice(5, 7), +day.slice(8, 10))}</span></div>}
              <div id={m.seq != null ? `m-${m.seq}` : undefined} className={`msg ${them ? 'them' : 'me'} ${cont ? 'cont' : ''} ${at && m.seq === at && !dq ? 'hit' : ''}`}>
                {!cont && <span className="who">{m.sender}</span>}
                {text && <p>{mark(m.content)}{time && <time>{time}</time>}</p>}
                {att.length > 0 && <div className="atts">{att.map(x => <Attachment key={x.id} a={x} onOpen={setShown} />)}
                  {!text && time && <time>{time}</time>}</div>}
              </div>
            </Fragment>);
        })}
        <Sentinel more={more} active={!!inf.hasNextPage} />
      </div>}
      <Lightbox shown={shown} onClose={closeShown} />
    </div>
  );
}
