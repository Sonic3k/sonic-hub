/* Messenger at the moment: the conversations that had begun by then, newest first, and each one up to that moment. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { attachmentUrl, social, type Attachment, type Message, type Ref, type Thread } from '../api';
import { divider, full, short, useMoment, utc } from '../time';
import { Avatar, L, Loading, profilePath } from '../ui/bits';
import { IBack, IFile, IInfo, ISearch } from '../ui/icons';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function Faces({ faces, size }: { faces: Ref[]; size: number }) {
  if (faces.length < 2) return <Avatar r={faces[0]} size={size} round link={false} />;
  const s = Math.round(size * 0.68);
  return (
    <span className="faces" style={{ width: size, height: size }}>
      <span className="f1"><Avatar r={faces[1]} size={s} round link={false} /></span>
      <span className="f2"><Avatar r={faces[0]} size={s} round link={false} /></span>
    </span>
  );
}

function Inbox({ threads, active, T }: { threads: Thread[]; active?: string; T: Date }) {
  const [q, setQ] = useState('');
  const list = threads.filter(t => !q || fold(t.title).includes(fold(q)));
  return (
    <aside className="ms-list">
      <div className="ms-list-head"><h1>Messenger</h1></div>
      <label className="ms-search"><ISearch size={14} /><input placeholder="Search Messenger" value={q} onChange={e => setQ(e.target.value)} /></label>
      <div className="ms-rows">
        {list.map(t => (
          <L key={t.archiveId} to={`/messenger/${t.archiveId}`} className={`ms-row ${t.archiveId === active ? 'on' : ''}`}>
            <Faces faces={t.faces} size={50} />
            <span className="ms-row-main">
              <span className="ms-row-top"><b>{t.title}</b><small>{short(t.last.at, T)}</small></span>
              <span className="ms-row-last">{t.last.fromMe ? 'You: ' : t.last.sender ? `${t.last.sender}: ` : ''}{t.last.text}</span>
            </span>
          </L>
        ))}
        {!list.length && <p className="muted pad">{threads.length ? 'No conversation by that name.' : 'No conversations had begun at this moment.'}</p>}
      </div>
    </aside>
  );
}

/* ── One conversation ───────────────────────────────────────────────────── */

const SENT: Record<string, string> = { PHOTO: 'Photo', GIF: 'GIF', STICKER: 'Sticker', VIDEO: 'Video', AUDIO: 'Voice message', FILE: 'File', LINK: 'Link' };

function Att({ a, mine }: { a: Attachment; mine: boolean }) {
  const [bad, setBad] = useState(false);
  if (a.type === 'LINK') return a.url ? <a className={`ms-bubble link ${mine ? 'me' : ''}`} href={a.url} target="_blank" rel="noopener noreferrer">{a.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}</a> : null;
  if (!a.hasFile || bad) return <span className="ms-missing">{SENT[a.type] ?? 'Attachment'}{a.fileName ? ` · ${a.fileName}` : ''}</span>;
  const src = attachmentUrl(a.id);
  switch (a.type) {
    case 'PHOTO': case 'GIF': return <a href={src} target="_blank" rel="noopener noreferrer" className="ms-photo"><img src={src} alt="" loading="lazy" onError={() => setBad(true)} /></a>;
    case 'STICKER': return <img className="ms-sticker" src={src} alt="sticker" loading="lazy" onError={() => setBad(true)} />;
    case 'VIDEO': return <video className="ms-video" src={src} controls preload="none" playsInline />;
    case 'AUDIO': return <audio className="ms-audio" src={src} controls preload="none" />;
    default: return <a className={`ms-bubble file ${mine ? 'me' : ''}`} href={src} target="_blank" rel="noopener noreferrer"><IFile size={16} />{a.fileName ?? 'File'}</a>;
  }
}

/** Messages of one sender in a row, close in time: one name above, one picture beside the last. */
interface Run { from: Message[]; mine: boolean; key: string }

function runs(items: Message[]): (Run | { divider: string; at: string } | { system: Message })[] {
  const out: (Run | { divider: string; at: string } | { system: Message })[] = [];
  let prevAt: number | null = null;
  for (const m of items) {
    const t = utc(m.at)?.getTime() ?? null;
    if (t !== null && (prevAt === null || t - prevAt > 60 * 60_000)) out.push({ divider: m.at!, at: m.at! });
    if (t !== null) prevAt = t;
    if (m.system) { out.push({ system: m }); continue; }
    const last = out[out.length - 1];
    const who = m.fromMe ? 'me' : m.from?.id ?? m.sender;
    if (last && 'from' in last && last.key === who && t !== null && utc(last.from[last.from.length - 1].at)!.getTime() > t - 10 * 60_000) last.from.push(m);
    else out.push({ from: [m], mine: m.fromMe, key: who });
  }
  return out;
}

function Bubble({ m, pos }: { m: Message; pos: string }) {
  const rx = m.reactions;
  const hasText = !!m.text && m.text.trim().length > 0;
  return (
    <div className={`ms-msg ${m.fromMe ? 'me' : ''}`} title={full(m.at, m.precision === 'DAY' ? 'DAY' : null)}>
      {hasText && <div className={`ms-bubble ${m.fromMe ? 'me' : ''} ${pos} ${/^\p{Extended_Pictographic}{1,3}$/u.test(m.text!.trim()) ? 'emoji' : ''}`}>{m.text}</div>}
      {m.attachments.map(a => <Att key={a.id} a={a} mine={m.fromMe} />)}
      {!hasText && !m.attachments.length && SENT[m.kind] && <span className="ms-missing">{SENT[m.kind]}</span>}
      {rx.length > 0 && (
        <span className="ms-rx" title={rx.map(r => `${r.emoji} ${r.name}`).join('\n')}>
          {[...new Set(rx.map(r => r.emoji))].slice(0, 3).join('')}{rx.length > 1 && <small>{rx.length}</small>}
        </span>
      )}
    </div>
  );
}

function Conversation({ id, onInfo }: { id: string; onInfo: () => void }) {
  const { at, T } = useMoment();
  const head = useQuery({ queryKey: ['thread', id, at], queryFn: () => social.thread(id, at) });
  const pages = useInfiniteQuery({
    queryKey: ['messages', id, at], initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => social.messages(id, at, pageParam),
    getNextPageParam: last => (last.hasMore ? last.oldestSeq : undefined),
  });
  const scroller = useRef<HTMLDivElement>(null), top = useRef<HTMLDivElement>(null);
  const keep = useRef<{ h: number; t: number } | null>(null), stuck = useRef(true);
  const items = (pages.data?.pages ?? []).slice().reverse().flatMap(p => p.items);

  // first page: stand at the bottom; older pages: keep the reader where they were
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keep.current) { el.scrollTop = el.scrollHeight - keep.current.h + keep.current.t; keep.current = null; }
    else if (stuck.current) el.scrollTop = el.scrollHeight;
  }, [items.length]);
  useEffect(() => { stuck.current = true; }, [id, at]);

  const older = useCallback(() => {
    const el = scroller.current;
    if (!pages.hasNextPage || pages.isFetchingNextPage || !el) return;
    keep.current = { h: el.scrollHeight, t: el.scrollTop };
    stuck.current = false;
    pages.fetchNextPage();
  }, [pages]);
  useEffect(() => {
    const el = top.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) older(); }, { root: scroller.current, rootMargin: '400px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [older, items.length]);

  const d = head.data;
  const members = new Map((d?.members ?? []).map(m => [m.sender, m]));
  return (
    <section className="ms-thread">
      <header className="ms-thread-head">
        <L to="/messenger" className="ms-back" aria-label="Conversations"><IBack size={20} /></L>
        {d && <>
          {d.counterpart?.id ? <L to={profilePath(d.counterpart)} className="ms-head-face"><Avatar r={d.counterpart} size={36} round link={false} /></L>
            : <Faces faces={d.members.filter(m => !m.me).slice(0, 2).map(m => m.ref)} size={36} />}
          <div className="ms-head-title"><b>{d.title}</b><small>{d.group ? `${d.members.length} people` : d.counterpart?.state === 'gone' ? 'This account is no longer on Messenger' : 'Messenger'}</small></div>
        </>}
        <button type="button" className="ms-info-btn" onClick={onInfo} aria-label="Conversation details"><IInfo size={20} /></button>
      </header>
      <div className="ms-scroll" ref={scroller} onScroll={e => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        <div ref={top} className="ms-top">{pages.isFetchingNextPage ? <Loading label="" /> : pages.hasNextPage ? null : items.length > 0 && <span className="ms-start">The start of the conversation</span>}</div>
        {pages.isLoading && <Loading />}
        {runs(items).map((r, i) => {
          if ('divider' in r) return <div key={`d${i}`} className="ms-divider">{divider(r.divider, T)}</div>;
          if ('system' in r) return <div key={r.system.id} className="ms-system">{r.system.text}</div>;
          const m0 = r.from[0], who = m0.from, member = members.get(m0.sender);
          const label = member?.nickname || who?.name || m0.sender;
          return (
            <div key={`${m0.id}`} className={`ms-run ${r.mine ? 'me' : ''}`}>
              {!r.mine && <span className="ms-run-face"><Avatar r={who ?? { id: null, key: null, handle: null, platform: 'FACEBOOK', kind: 'USER', state: 'active', name: m0.sender, avatarUrl: null, gender: null, verified: false }} size={28} round /></span>}
              <div className="ms-run-body">
                {!r.mine && d?.group && <span className="ms-run-name">{label}</span>}
                {r.from.map((m, j) => <Bubble key={m.id} m={m} pos={r.from.length === 1 ? 'solo' : j === 0 ? 'first' : j === r.from.length - 1 ? 'last' : 'mid'} />)}
              </div>
            </div>
          );
        })}
        {pages.isSuccess && !items.length && <p className="muted pad center">Nothing said yet at this moment.</p>}
      </div>
      <div className="ms-compose"><span>Type a message…</span></div>
    </section>
  );
}

function Info({ id, onClose }: { id: string; onClose: () => void }) {
  const { at } = useMoment();
  const head = useQuery({ queryKey: ['thread', id, at], queryFn: () => social.thread(id, at) });
  const d = head.data;
  if (!d) return <aside className="ms-info" />;
  return (
    <aside className="ms-info">
      <button type="button" className="ms-info-close" onClick={onClose} aria-label="Close"><IBack size={18} /></button>
      <div className="ms-info-top">
        {d.counterpart ? <Avatar r={d.counterpart} size={80} round /> : <Faces faces={d.members.filter(m => !m.me).slice(0, 2).map(m => m.ref)} size={80} />}
        <h2>{d.title}</h2>
        <small className="muted">{d.messageCount.toLocaleString('en-US')} messages by this moment</small>
      </div>
      {d.group && (
        <div className="ms-members">
          <h4>{d.members.length} People</h4>
          {d.members.map(m => (
            <div key={m.sender} className="ms-member">
              <Avatar r={m.ref} size={32} round />
              <span><b>{m.me ? 'You' : m.ref.name}</b>{(m.nickname || m.admin) && <small>{[m.nickname, m.admin ? 'Admin' : ''].filter(Boolean).join(' · ')}</small>}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export default function Messenger() {
  const { id } = useParams();
  const { at, T } = useMoment();
  const [info, setInfo] = useState(true);
  const threads = useQuery({ queryKey: ['threads', at], queryFn: () => social.threads(at) });
  return (
    <div className={`ms ${id ? 'has-thread' : ''} ${info ? 'with-info' : ''}`}>
      {threads.isLoading ? <aside className="ms-list"><Loading /></aside> : <Inbox threads={threads.data ?? []} active={id} T={T} />}
      {id ? <Conversation key={id} id={id} onInfo={() => setInfo(x => !x)} /> : (
        <section className="ms-thread ms-none">
          <p>{threads.data?.length ? 'Pick a conversation.' : ''}</p>
        </section>
      )}
      {id && info && <Info id={id} onClose={() => setInfo(false)} />}
    </div>
  );
}

