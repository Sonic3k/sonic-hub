/* SMS (as the phone suite on the computer showed them) and Zalo: the conversations of one app up to T, and one open. */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { desk } from '../api';
import { useMoment, utc, vnDate, clockText } from '../moment';
import { cdn } from '../fb/api';
import { Chat } from './Chat';

export function Messages({ platform, archiveId: start, seq }: { platform: string; archiveId?: string | null; seq?: number | null }) {
  const { at } = useMoment();
  const q = useQuery({ queryKey: ['threads', platform, at], queryFn: () => desk.threads(platform, at!) });
  const [open, setOpen] = useState<string | null>(start ?? null);
  const cur = open ?? q.data?.[0]?.archiveId ?? null;
  return (
    <div className={`dv-msg dv-msg-${platform.toLowerCase()}`}>
      <div className="dv-msg-list">
        {q.isLoading && <div className="dv-chat-empty">…</div>}
        {q.data && !q.data.length && <div className="dv-chat-empty">Chưa có tin nhắn nào.</div>}
        {q.data?.map(t => {
          const d = utc(t.last.at), face = t.faces[0];
          return (
            <button type="button" key={t.archiveId} className={`dv-msg-row ${t.archiveId === cur ? 'on' : ''}`} onClick={() => setOpen(t.archiveId)}>
              <span className="dv-msg-face">{face?.avatarUrl ? <img src={cdn(face.avatarUrl, 160)} alt="" /> : (t.title || '?').slice(0, 1)}</span>
              <span className="dv-msg-txt"><b>{t.title}</b><small>{t.last.fromMe ? 'Bạn: ' : ''}{t.last.text}</small></span>
              <time>{d ? (vnDate(d) === vnDate(new Date(Date.now())) ? clockText(d, true) : vnDate(d)) : ''}</time>
            </button>
          );
        })}
      </div>
      <div className="dv-msg-thread">
        {cur ? <Chat key={cur} archiveId={cur} variant="bubbles" focusSeq={cur === start ? seq : null} /> : <div className="dv-chat-empty" />}
      </div>
    </div>
  );
}
