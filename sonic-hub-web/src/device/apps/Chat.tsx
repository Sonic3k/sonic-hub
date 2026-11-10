/* One conversation up to T, for any chat app: Yahoo's lines ("Name: text"), or bubbles (SMS, Zalo, Messenger on a
   phone). Older messages load when scrolled to the top; a message asked for (a memory's line) is shown highlighted. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { desk, type Message } from '../api';
import { clockText, useMoment, utc, vnDate } from '../moment';
import { attachmentUrl, cdn } from '../fb/api';
import { isBuzz, YmText } from './yahoo/ui';

/* Yahoo-era emoticons as typed; the longest codes first so ":((" isn't read as ":(" */
const EMO: [string, string][] = [
  [':-))', '😆'], [':))', '😆'], ['=))', '🤣'], [':((', '😭'], ['=D>', '👏'], [':-)', '🙂'], [':)', '🙂'], [':-(', '🙁'], [':(', '🙁'],
  [';;)', '😉'], [';)', '😉'], [':D', '😄'], [':-D', '😄'], [':P', '😛'], [':p', '😛'], [':-P', '😛'], [':x', '😍'], [':X', '😍'], [':-*', '😘'],
  [':*', '😘'], ['B-)', '😎'], [':-?', '🤔'], ['8-|', '🙄'], [':-O', '😮'], [':O', '😮'], ['X(', '😠'], [':">', '😊'], [':-$', '🤐'],
  ['=((', '💔'], ['<:-P', '🥳'], ['^:)^', '🙇'], [':-h', '👋'], ['@};-', '🌹'], ['(:|', '🥱'], [':-ss', '😬'], ['#:-S', '😅'], ['>:)', '😈'],
  ['<3', '❤️'], [':|', '😐'], ['^^', '😊'], ['^_^', '😊'],
];
const EMO_RE = new RegExp(EMO.map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const EMO_MAP = Object.fromEntries(EMO);
export const emoticons = (s: string) => s.replace(EMO_RE, m => EMO_MAP[m] ?? m);

const SENT: Record<string, string> = { PHOTO: 'đã gửi một ảnh', VIDEO: 'đã gửi một video', STICKER: 'sticker', AUDIO: 'tin nhắn thoại', FILE: 'đã gửi một tệp', GIF: 'GIF' };

/** grouped: Messenger 9's way — the name on a line of its own, then that person's lines under it. */
export function Chat({ archiveId, variant, focusSeq, meName, grouped }: {
  archiveId: string; variant: 'yahoo' | 'bubbles'; focusSeq?: number | null; meName?: string; grouped?: boolean;
}) {
  const { at } = useMoment();
  const q = useInfiniteQuery({
    queryKey: ['chat', archiveId, at],
    queryFn: ({ pageParam }) => desk.messages(archiveId, at!, pageParam ?? null, 60),
    initialPageParam: null as number | null,
    getNextPageParam: p => (p.hasMore ? p.oldestSeq : undefined),
    enabled: !!archiveId,
  });
  const items = useMemo(() => (q.data?.pages ?? []).slice().reverse().flatMap(p => p.items), [q.data]);
  const box = useRef<HTMLDivElement>(null), keep = useRef<{ h: number; t: number } | null>(null), first = useRef(true);

  // stay where the eye was when older messages arrive above; start at the bottom (or at the asked line)
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (keep.current) { el.scrollTop = el.scrollHeight - keep.current.h + keep.current.t; keep.current = null; return; }
    if (first.current && items.length) {
      first.current = false;
      const hit = focusSeq != null ? el.querySelector<HTMLElement>(`[data-seq="${focusSeq}"]`) : null;
      if (hit) el.scrollTop = hit.offsetTop - el.clientHeight / 3; else el.scrollTop = el.scrollHeight;
    }
  }, [items, focusSeq]);
  useEffect(() => { first.current = true; }, [archiveId, at]);
  const onScroll = () => {
    const el = box.current;
    if (!el || el.scrollTop > 60 || !q.hasNextPage || q.isFetchingNextPage) return;
    keep.current = { h: el.scrollHeight, t: el.scrollTop };
    void q.fetchNextPage();
  };

  if (!archiveId) return <div className="dv-chat-empty">Không còn lưu cuộc trò chuyện nào.</div>;
  if (q.isLoading) return <div className="dv-chat-empty">Đang tải…</div>;
  if (q.isError) return <div className="dv-chat-empty">Không mở được cuộc trò chuyện.</div>;
  if (!items.length) return <div className="dv-chat-empty">Chưa có tin nhắn nào tới lúc này.</div>;

  let lastDay = '', lastWho = '';
  return (
    <div className={`dv-chat dv-chat-${variant}`} ref={box} onScroll={onScroll}>
      {q.hasNextPage && <div className="dv-chat-more">{q.isFetchingNextPage ? 'Đang tải…' : '…'}</div>}
      {items.map((m: Message) => {
        const d = utc(m.at), day = d ? vnDate(d) : '';
        const divider = day && day !== lastDay ? day : '';
        if (divider) lastDay = day;
        const text = m.text ? (variant === 'yahoo' ? m.text : emoticons(m.text)) : SENT[m.kind] ?? '';
        const who = m.fromMe ? (meName ?? m.sender) : (m.nickname || m.from?.name || m.sender);
        const photos = m.attachments.filter(a => (a.type === 'PHOTO' || a.type === 'GIF' || a.type === 'STICKER') && (a.hasFile || a.url));
        const head = !grouped || divider || who !== lastWho;
        lastWho = m.system ? '' : who;
        return (
          <Fragment key={m.id}>
            {divider && <div className="dv-chat-day">{divider}</div>}
            {m.system ? <div className="dv-chat-sys">{text}</div>
              : variant === 'yahoo'
                ? <div className={`dv-ym-line ${m.fromMe ? 'me' : 'them'} ${grouped ? 'grouped' : ''} ${m.seq === focusSeq ? 'hit' : ''}`} data-seq={m.seq} title={d ? clockText(d) : undefined}>
                    {head && <b>{who}:</b>}{grouped ? null : ' '}{isBuzz(m.text) ? <span className="ym-buzz">BUZZ!!!</span> : <span><YmText text={text} /></span>}
                    {photos.map(a => <img key={a.id} src={a.hasFile ? attachmentUrl(a.id) : cdn(a.url, 320)} alt="" loading="lazy" />)}
                  </div>
                : <div className={`dv-bub-row ${m.fromMe ? 'me' : 'them'} ${m.seq === focusSeq ? 'hit' : ''}`} data-seq={m.seq}>
                    <div className="dv-bub" title={d ? clockText(d) : undefined}>
                      {!m.fromMe && <small>{who}</small>}
                      {text && <span>{text}</span>}
                      {photos.map(a => <img key={a.id} src={a.hasFile ? attachmentUrl(a.id) : cdn(a.url, 320)} alt="" loading="lazy" />)}
                    </div>
                  </div>}
          </Fragment>
        );
      })}
    </div>
  );
}
