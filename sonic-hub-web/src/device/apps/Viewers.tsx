/* Looking at things: the picture viewer, the word processor (his writings), Notepad and the sticky note (a memory's
   words), and the list of memories up to T. */
import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { desk } from '../api';
import { cdn, pic } from '../../api/client';
import { useMoment, utc, vnDate } from '../moment';
import { Glyph } from '../glyphs';
import { useDesk, viewerName } from '../pc/desk';
import { useWinTitle } from '../pc/Window';
import { getSet, putSet, type ViewerPhoto } from './sets';

export function PhotoViewer({ set, index = 0, mediaIds }: { set?: string; index?: number; mediaIds?: string[] }) {
  const fetched = useQueries({ queries: (mediaIds ?? []).map(id => ({ queryKey: ['media', id], queryFn: () => desk.media(id) })) });
  const fromIds: ViewerPhoto[] = fetched.flatMap(q => q.data ? [{ id: q.data.id, url: pic(q.data, true), caption: q.data.caption ?? q.data.fileName, at: q.data.effectiveDate ?? null }] : []);
  const photos = mediaIds ? fromIds : getSet(set ?? '');
  const [i, setI] = useState(index);
  const cur = photos[Math.min(i, photos.length - 1)];
  const { os } = useDesk();
  useWinTitle(cur ? `${cur.caption ?? ''} - ${viewerName(os)}` : null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setI(x => Math.min(x + 1, photos.length - 1)); if (e.key === 'ArrowLeft') setI(x => Math.max(x - 1, 0)); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [photos.length]);
  if (!cur) return <div className="dv-pv"><div className="dv-pv-img" /></div>;
  return (
    <div className="dv-pv">
      <div className="dv-pv-img"><img key={cur.id} src={cdn(cur.url, 1280)} alt={cur.caption ?? ''} /></div>
      <div className="dv-pv-bar">
        <span className="dv-pv-cap">{cur.caption}{cur.at ? ` · ${vnDate(utc(cur.at))}` : ''}</span>
        <div className="dv-pv-btns">
          <button type="button" onClick={() => setI(x => Math.max(x - 1, 0))} disabled={i <= 0} aria-label="Previous">◀</button>
          <span>{i + 1} / {photos.length}</span>
          <button type="button" onClick={() => setI(x => Math.min(x + 1, photos.length - 1))} disabled={i >= photos.length - 1} aria-label="Next">▶</button>
        </div>
      </div>
    </div>
  );
}

/** The gadget slide show and anything else that has photos of the day: into the viewer. */
export const viewDay = (photos: { id: string; url: string; caption?: string | null; at?: string | null }[]) =>
  putSet('day', photos.map(p => ({ id: p.id, url: p.url, caption: p.caption, at: p.at })));

export function Word({ noteId }: { noteId?: string }) {
  const { os } = useDesk();
  const q = useQuery({ queryKey: ['note', noteId], queryFn: () => desk.note(noteId!), enabled: !!noteId });
  const n = q.data;
  useWinTitle(!noteId ? 'Document1 - Microsoft Word' : n ? `${n.title || 'Không tiêu đề'} - Microsoft Word` : null);
  const ribbon = os === 'WIN98' || os === 'WINXP' ? 'classic' : 'ribbon';
  const html = n?.content && /<\w+[^>]*>/.test(n.content) ? n.content : (n?.content ?? '').split(/\n{2,}/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('');
  return (
    <div className={`dv-word dv-word-${ribbon}`}>
      {ribbon === 'classic'
        ? <div className="dv-word-menu">{['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Window', 'Help'].map(m => <span key={m}>{m}</span>)}</div>
        : <div className="dv-word-tabs">{['File', 'Home', 'Insert', 'Page Layout', 'References', 'Review', 'View'].map((m, k) => <span key={m} className={k === 1 ? 'on' : ''}>{m}</span>)}</div>}
      <div className="dv-word-tools"><span className="dv-word-font">Times New Roman</span><span className="dv-word-size">12</span><b>B</b><i>I</i><u>U</u></div>
      <div className="dv-word-desk">
        <article className="dv-word-page">
          {noteId && q.isLoading ? <p>…</p> : <>
            {n?.title && <h1>{n.title}</h1>}
            {n && <div className="dv-word-meta">{[n.authorPersonName || n.authorName, vnDate(utc(n.writtenAt ?? n.publishedAt ?? n.createdAt))].filter(Boolean).join(' · ')}</div>}
            <div className="dv-word-text" dangerouslySetInnerHTML={{ __html: html }} />
          </>}
        </article>
      </div>
      <div className="dv-word-status">Page 1 · Words: {(n?.content ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length}</div>
    </div>
  );
}

export function Notepad({ text, sticky }: { text?: string; sticky?: boolean }) {
  if (sticky) return <div className="dv-sticky"><div className="dv-sticky-text">{text}</div></div>;
  return (
    <div className="dv-notepad">
      <div className="dv-word-menu">{['File', 'Edit', 'Format', 'View', 'Help'].map(m => <span key={m}>{m}</span>)}</div>
      <textarea readOnly value={text ?? ''} spellCheck={false} />
    </div>
  );
}

export function Memories() {
  const { at } = useMoment();
  const { scene } = useDesk();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const r = useQuery({ queryKey: ['desk-memories', at, q, page], queryFn: () => desk.memories(at!, q || undefined, page, 40) });
  return (
    <div className="dv-mem">
      <div className="dv-mem-top">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Tìm trong ký ức…" />
        <span>{r.data ? `${r.data.total} ký ức tới lúc này` : ''}</span>
      </div>
      <div className="dv-mem-list">
        {r.data?.items.map(m => (
          <button type="button" key={m.id} className="dv-mem-row" onClick={() => scene(m.id)}>
            <Glyph name="sticky" size={24} />
            <span className="dv-mem-txt"><b>{m.title || (m.summary ?? '').slice(0, 60)}</b><small>{(m.summary ?? '').slice(0, 140)}</small></span>
            <time>{vnDate(utc(m.at))}</time>
          </button>
        ))}
        {r.data && !r.data.items.length && <div className="dv-ex-empty">Chưa có ký ức nào tới lúc này.</div>}
      </div>
      {r.data && r.data.totalPages > 1 && (
        <div className="dv-mem-pages">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
          <span>{page + 1} / {r.data.totalPages}</span>
          <button type="button" disabled={page >= r.data.totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}
    </div>
  );
}
