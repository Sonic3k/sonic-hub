/* What came with a chat message: photos, stickers, videos, recordings, files, links — and the archive's gallery of them. */
import { Fragment, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import type { ChatAttachment } from '../types';
import { fmt } from '../lib/queries';
import { longDay, timeOf } from '../lib/date';
import { Sentinel } from './PhotoGroups';

export type Shown = { src: string; name: string };

const LOST: Record<ChatAttachment['type'], string> = {
  PHOTO: 'Ảnh không còn file', GIF: 'GIF không còn file', STICKER: 'Sticker không còn file', VIDEO: 'Video không còn file',
  AUDIO: 'Ghi âm không còn file', FILE: 'Tệp không còn file', LINK: 'Liên kết',
};
const isPicture = (a: ChatAttachment) => a.type === 'PHOTO' || a.type === 'GIF' || a.type === 'STICKER';

/** "facebook.com/photo.php?…" — the address without the scheme, cut to a readable length. */
export const shortUrl = (u: string, max = 48) => {
  const s = u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

function Lost({ a }: { a: ChatAttachment }) {
  return (
    <span className="att-lost">{LOST[a.type]}{a.fileName ? <small>{a.fileName}</small> : null}
      {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer">{shortUrl(a.url, 36)}</a>}</span>
  );
}

/** A picture that falls back to the muted note when its file does not load. */
function Pic({ a, className, onOpen }: { a: ChatAttachment; className: string; onOpen?: (s: Shown) => void }) {
  const [bad, setBad] = useState(false), src = hub.attachmentUrl(a.id);
  if (bad) return <Lost a={a} />;
  return <img className={className} src={src} alt={a.fileName ?? ''} loading="lazy" decoding="async" onError={() => setBad(true)}
    onClick={onOpen ? () => onOpen({ src, name: a.fileName ?? '' }) : undefined} />;
}

/** One attachment inside a message. */
export function Attachment({ a, onOpen }: { a: ChatAttachment; onOpen: (s: Shown) => void }) {
  if (a.type === 'LINK') {
    const u = a.url ?? '';
    return u ? <a className="att-link" href={u} target="_blank" rel="noopener noreferrer" title={u}>{shortUrl(u)}</a> : <Lost a={a} />;
  }
  if (!a.hasFile) return <Lost a={a} />;
  const src = hub.attachmentUrl(a.id);
  switch (a.type) {
    case 'PHOTO': case 'GIF': return <Pic a={a} className="att-photo" onOpen={onOpen} />;
    case 'STICKER': return <Pic a={a} className="att-sticker" />;
    case 'VIDEO': return <video className="att-video" src={src} controls preload="none" playsInline />;
    case 'AUDIO': return <audio className="att-audio" src={src} controls preload="none" />;
    default: return <a className="att-file" href={src} target="_blank" rel="noopener noreferrer">{a.fileName || 'Tệp đính kèm'}</a>;
  }
}

/** The full picture over the page; Esc or a click closes it. */
export function Lightbox({ shown, onClose }: { shown: Shown | null; onClose: () => void }) {
  useEffect(() => {
    if (!shown) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [shown, onClose]);
  if (!shown) return null;
  /* on body: the page's enter animation makes its own stacking context, which would keep this under the top bar */
  return createPortal(
    <div className="att-lightbox" onClick={onClose} role="dialog" aria-label={shown.name || 'Ảnh'}>
      <img src={shown.src} alt={shown.name} />
      {shown.name && <span>{shown.name}</span>}
    </div>, document.body);
}

const FILTERS: { key: string; label: string; type?: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'media', label: 'Ảnh & video', type: 'PHOTO,GIF,VIDEO' },
  { key: 'sticker', label: 'Sticker', type: 'STICKER' },
  { key: 'file', label: 'File & ghi âm', type: 'FILE,AUDIO' },
  { key: 'link', label: 'Liên kết', type: 'LINK' },
];

/** Every attachment of one archive, newest first, under the day it was sent. */
export function AttachmentGallery({ personId, archiveId, onOpen }: { personId: string; archiveId: string; onOpen: (s: Shown) => void }) {
  const [f, setF] = useState('media'), type = FILTERS.find(x => x.key === f)?.type;
  const inf = useInfiniteQuery({ queryKey: ['chat-att-all', archiveId, f], initialPageParam: 0, staleTime: 10 * 60_000,
    queryFn: ({ pageParam }) => hub.chatAttachmentsAll(personId, archiveId, { page: pageParam, size: 60, type, order: 'desc' }),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1) });
  const items = inf.data?.pages.flatMap(p => p.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? 0;
  const days: { day: string; items: ChatAttachment[] }[] = [];
  for (const a of items) {
    const d = (a.timestamp ?? '').slice(0, 10), last = days[days.length - 1];
    if (last && last.day === d) last.items.push(a); else days.push({ day: d, items: [a] });
  }
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  return (
    <div className="att-gallery">
      <div className="att-filters">
        <div className="seg">{FILTERS.map(x => <a key={x.key} className={f === x.key ? 'on' : ''} onClick={() => setF(x.key)}>{x.label}</a>)}</div>
        {inf.data && <span>{fmt(total)} mục</span>}
      </div>
      {inf.isLoading && <div className="card empty">Đang mở…</div>}
      {inf.isError && <div className="card empty">Không tải được.</div>}
      {inf.isSuccess && !items.length && <div className="card empty">Không có gì ở đây.</div>}
      {days.map(g => (
        <Fragment key={g.day || 'none'}>
          <div className="day-sep"><span>{g.day ? longDay(+g.day.slice(0, 4), +g.day.slice(5, 7), +g.day.slice(8, 10)) : 'Không rõ ngày'}</span></div>
          <div className="att-grid">{g.items.map(a => (
            <div key={a.id} className={`att-cell ${isPicture(a) || a.type === 'VIDEO' ? 'pic' : 'row'} ${a.senderType === 'SELF' ? 'me' : 'them'}`}
              title={`${a.senderType === 'SELF' ? 'Mình' : 'Họ'} · ${timeOf(a.timestamp)}`}>
              <Attachment a={a} onOpen={onOpen} />
            </div>))}</div>
        </Fragment>))}
      <Sentinel more={more} active={!!inf.hasNextPage} />
    </div>
  );
}
