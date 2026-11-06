/* The file browser: his photo library as folders (as it stood at T), his writings as documents, his Angels as folders
   of their own (photos, chats, memories), My Computer and the Recycle Bin. */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { desk } from '../api';
import { hub, isAngel, periodYears } from '../../api/hub';
import { cdn, pic } from '../../api/client';
import type { MediaFile } from '../../types';
import { dayAfter, useMoment, utc, vn, vnDate } from '../moment';
import { Glyph } from '../glyphs';
import { useWm } from '../pc/wm';
import { useDesk } from '../pc/desk';
import { useWinTitle } from '../pc/Window';
import { putSet, type ViewerPhoto } from './sets';

export type Loc = { view: 'computer' | 'folder' | 'documents' | 'angels' | 'angel' | 'recycle'; id?: string; name?: string };

const PLATFORM_GLYPH: Record<string, string> = { YAHOO: 'im-smile', FACEBOOK: 'fb', SMS: 'sms', ZALO: 'chat-blue' };
const toViewer = (m: MediaFile): ViewerPhoto => ({ id: m.id, url: pic(m, true), thumb: pic(m), caption: m.caption ?? m.fileName, at: m.effectiveDate ?? null });

export function Explorer({ start }: { start: Loc }) {
  const [hist, setHist] = useState<{ list: Loc[]; i: number }>({ list: [start], i: 0 });
  const loc = hist.list[hist.i];
  const go = (l: Loc) => setHist(h => ({ list: [...h.list.slice(0, h.i + 1), l], i: h.i + 1 }));
  const { os } = useDesk();
  const places: [string, string, Loc][] = [
    ['Pictures', 'folder-pictures', { view: 'folder' }], ['Documents', 'documents', { view: 'documents' }],
    ['Angels', 'heart-folder', { view: 'angels' }], [os === 'WIN10' || os === 'WIN11' || os === 'WIN81' ? 'This PC' : os === 'WINXP' || os === 'WIN98' ? 'My Computer' : 'Computer', 'computer', { view: 'computer' }],
    ['Recycle Bin', 'recycle', { view: 'recycle' }],
  ];
  const [crumbs, setCrumbs] = useState<{ id?: string; name: string }[]>([]);
  const title = loc.name ?? (loc.view === 'folder' ? 'Pictures' : loc.view === 'documents' ? 'Documents' : loc.view === 'angels' ? 'Angels'
    : loc.view === 'recycle' ? 'Recycle Bin' : places[3][0]);
  const [count, setCount] = useState(0);
  useWinTitle(title);
  return (
    <div className="dv-ex">
      <div className="dv-ex-bar">
        <button type="button" disabled={hist.i === 0} onClick={() => setHist(h => ({ ...h, i: h.i - 1 }))} aria-label="Back">◀</button>
        <button type="button" disabled={hist.i >= hist.list.length - 1} onClick={() => setHist(h => ({ ...h, i: h.i + 1 }))} aria-label="Forward">▶</button>
        <button type="button" disabled={loc.view !== 'folder' || crumbs.length < 2} onClick={() => {
          const up = crumbs[crumbs.length - 2];
          go(crumbs.length > 2 ? { view: 'folder', id: up.id, name: up.name } : { view: 'folder' });
        }} aria-label="Up">▲</button>
        <div className="dv-ex-addr"><Glyph name={loc.view === 'angels' || loc.view === 'angel' ? 'heart-folder' : loc.view === 'documents' ? 'documents' : 'folder'} size={16} />
          {loc.view === 'folder' && crumbs.length
            ? crumbs.map((c, i) => <span key={c.id ?? i}><button type="button" onClick={() => go(i === 0 ? { view: 'folder' } : { view: 'folder', id: c.id, name: c.name })}>{i === 0 ? 'D:\\' : c.name}</button>{i < crumbs.length - 1 && <i>›</i>}</span>)
            : <span>{title}</span>}
        </div>
      </div>
      <div className="dv-ex-main">
        <nav className="dv-ex-side">
          {places.map(([label, glyph, l]) => <button type="button" key={label} className={loc.view === l.view && !loc.id ? 'on' : ''} onClick={() => go(l)}><Glyph name={glyph} size={16} />{label}</button>)}
        </nav>
        <div className="dv-ex-view">
          {loc.view === 'computer' && <Computer go={go} />}
          {loc.view === 'folder' && <FolderView id={loc.id} go={go} onPath={setCrumbs} onCount={setCount} />}
          {loc.view === 'documents' && <Documents onCount={setCount} />}
          {loc.view === 'angels' && <Angels go={go} onCount={setCount} />}
          {loc.view === 'angel' && loc.id && <Angel id={loc.id} name={loc.name ?? ''} />}
          {loc.view === 'recycle' && <div className="dv-ex-empty">Recycle Bin is empty.</div>}
        </div>
      </div>
      <div className="dv-ex-status">{count ? `${count} objects` : ''}</div>
    </div>
  );
}

function Tile({ glyph, img, label, sub, onOpen }: { glyph?: string; img?: string | null; label: string; sub?: ReactNode; onOpen: () => void }) {
  return (
    <button type="button" className="dv-ex-tile" onDoubleClick={onOpen} onClick={e => { if ((e.nativeEvent as PointerEvent).pointerType === 'touch') onOpen(); }} title={label}>
      <span className="dv-ex-icon">{img ? <img src={img} alt="" loading="lazy" /> : <Glyph name={glyph} size={48} />}</span>
      <span className="dv-ex-label">{label}</span>{sub && <small>{sub}</small>}
    </button>
  );
}

function Computer({ go }: { go: (l: Loc) => void }) {
  return (
    <div className="dv-ex-groups">
      <h4>Hard Disk Drives</h4>
      <div className="dv-ex-grid">
        <Tile glyph="computer" label="Local Disk (C:)" sub="Documents" onOpen={() => go({ view: 'documents' })} />
        <Tile glyph="folder-pictures" label="Sonic3k box (D:)" sub="Pictures" onOpen={() => go({ view: 'folder' })} />
      </div>
      <h4>Folders</h4>
      <div className="dv-ex-grid">
        <Tile glyph="heart-folder" label="Angels" onOpen={() => go({ view: 'angels' })} />
        <Tile glyph="documents" label="Documents" onOpen={() => go({ view: 'documents' })} />
      </div>
    </div>
  );
}

function FolderView({ id, go, onPath, onCount }: { id?: string; go: (l: Loc) => void; onPath: (c: { id?: string; name: string }[]) => void; onCount: (n: number) => void }) {
  const { at, T } = useMoment();
  const { open } = useWm();
  const page = useQuery({ queryKey: ['folders', id ?? 'root', at], queryFn: () => desk.folders(at!, id) });
  const files = useQuery({ queryKey: ['files', id, dayAfter(T)], queryFn: () => desk.files(id!, dayAfter(T)), enabled: !!id });
  const list = useMemo(() => files.data?.content ?? [], [files.data]);
  useEffect(() => { if (page.data) onPath(page.data.path.map((p, i) => ({ id: i === 0 ? undefined : p.id, name: p.name }))); }, [page.data, onPath]);
  useEffect(() => onCount((page.data?.folders.length ?? 0) + list.length), [page.data, list, onCount]);
  if (page.isLoading) return <div className="dv-ex-empty">…</div>;
  if (page.isError) return <div className="dv-ex-empty">This folder is not available.</div>;
  const viewAll = (i: number) => {
    const set = putSet(`folder:${id}`, list.filter(m => m.fileType === 'IMAGE' || m.fileType === 'VIDEO').map(toViewer));
    const idx = set.findIndex(p => p.id === list[i].id);
    open({ app: 'viewer', arg: { set: `folder:${id}`, index: Math.max(0, idx) }, title: list[i].fileName });
  };
  return (
    <div className="dv-ex-grid">
      {page.data!.folders.map(f => <Tile key={f.id} glyph="folder" img={f.coverUrl ? cdn(f.coverUrl, 160) : null} label={f.name}
        sub={f.count ? `${f.count}` : undefined} onOpen={() => go({ view: 'folder', id: f.id, name: f.name })} />)}
      {list.map((m, i) => <Tile key={m.id} img={pic(m) ? cdn(pic(m), 160) : null} glyph={m.fileType === 'VIDEO' ? 'film' : m.fileType === 'AUDIO' ? 'music' : 'image'}
        label={m.fileName} onOpen={() => viewAll(i)} />)}
      {!page.data!.folders.length && !list.length && !files.isLoading && <div className="dv-ex-empty">This folder is empty.</div>}
    </div>
  );
}

function Documents({ onCount }: { onCount: (n: number) => void }) {
  const { T } = useMoment();
  const { open } = useWm();
  const q = useQuery({ queryKey: ['notes-all'], queryFn: async () => {
    const first = await desk.notes(0);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => desk.notes(i + 1)));
    return [first, ...rest].flatMap(p => p.content);
  } });
  const list = useMemo(() => (q.data ?? []).map(n => ({ n, d: utc(n.writtenAt ?? n.publishedAt ?? n.createdAt) }))
    .filter(x => x.d && x.d.getTime() <= T.getTime()).sort((a, b) => b.d!.getTime() - a.d!.getTime()), [q.data, T]);
  useEffect(() => onCount(list.length), [list, onCount]);
  if (q.isLoading) return <div className="dv-ex-empty">…</div>;
  if (!list.length) return <div className="dv-ex-empty">No documents yet.</div>;
  return (
    <div className="dv-ex-details">
      <div className="dv-ex-dh"><span>Name</span><span>Date modified</span><span>Type</span></div>
      {list.map(({ n, d }) => (
        <button type="button" key={n.id} className="dv-ex-drow" onDoubleClick={() => open({ app: 'word', arg: { noteId: n.id }, title: `${n.title || 'Không tiêu đề'}.doc` })}
          onClick={e => { if ((e.nativeEvent as PointerEvent).pointerType === 'touch') open({ app: 'word', arg: { noteId: n.id } }); }}>
          <span><Glyph name="doc-blue" size={16} />{n.title || 'Không tiêu đề'}.doc</span><span>{vnDate(d)}</span><span>{n.kind === 'ARTICLE' ? 'Article' : 'Document'}</span>
        </button>
      ))}
    </div>
  );
}

function Angels({ go, onCount }: { go: (l: Loc) => void; onCount: (n: number) => void }) {
  const { T } = useMoment();
  const q = useQuery({ queryKey: ['persons'], queryFn: desk.persons });
  const year = vn(T).y;
  const list = useMemo(() => (q.data ?? []).filter(isAngel).filter(p => { const r = periodYears(p.period); return !r || r[0] <= year; })
    .sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name, 'vi')), [q.data, year]);
  useEffect(() => onCount(list.length), [list, onCount]);
  if (q.isLoading) return <div className="dv-ex-empty">…</div>;
  return (
    <div className="dv-ex-grid">
      {list.map(p => <Tile key={p.id} glyph="heart-folder" img={p.avatarUrl ? cdn(p.avatarUrl, 160) : null} label={p.displayName || p.name}
        sub={p.period ?? undefined} onOpen={() => go({ view: 'angel', id: p.id, name: p.displayName || p.name })} />)}
    </div>
  );
}

function Angel({ id, name }: { id: string; name: string }) {
  const { T } = useMoment();
  const { open } = useWm();
  const { scene, openChat } = useDesk();
  const photos = useQuery({ queryKey: ['angel-photos', id, dayAfter(T)], queryFn: () => desk.photosOf(id, dayAfter(T)) });
  const chats = useQuery({ queryKey: ['angel-chats', id], queryFn: () => hub.archives(id) });
  const memories = useQuery({ queryKey: ['angel-memories', id], queryFn: () => hub.episodes(id) });
  const before = (iso?: string | null) => { const d = utc(iso); return !d || d.getTime() <= T.getTime(); };
  const ph = photos.data?.content ?? [];
  const ch = (chats.data ?? []).filter(a => a.messageCount > 0 && before(a.dateFrom));
  const mem = (memories.data ?? []).filter(e => e.occurredAt && before(e.occurredAt));

  return (
    <div className="dv-ex-groups">
      <h4>{name} · Ảnh ({ph.length}{photos.data && photos.data.totalElements > ph.length ? '+' : ''})</h4>
      <div className="dv-ex-grid">
        {ph.map((m, i) => <Tile key={m.id} img={cdn(pic(m), 160)} label={m.fileName} onOpen={() => {
          putSet(`person:${id}`, ph.map(toViewer));
          open({ app: 'viewer', arg: { set: `person:${id}`, index: i }, title: m.fileName });
        }} />)}
        {!ph.length && !photos.isLoading && <div className="dv-ex-empty">—</div>}
      </div>
      <h4>Trò chuyện</h4>
      <div className="dv-ex-grid">
        {ch.map(a => <Tile key={a.id} glyph={PLATFORM_GLYPH[a.platform] ?? 'chat-blue'} label={a.title || a.platform} sub={`${a.messageCount}`} onOpen={() => openChat(a.platform, a.id, name)} />)}
        {!ch.length && !chats.isLoading && <div className="dv-ex-empty">—</div>}
      </div>
      <h4>Ký ức</h4>
      <div className="dv-ex-grid">
        {mem.map(e => <Tile key={e.id} glyph="sticky" label={e.title || e.summary.slice(0, 40)} sub={vnDate(utc(e.occurredAt))} onOpen={() => scene(e.id)} />)}
        {!mem.length && !memories.isLoading && <div className="dv-ex-empty">—</div>}
      </div>
    </div>
  );
}
