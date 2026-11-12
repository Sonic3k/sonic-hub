import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import type { Collection } from '../types';
import { fmt, useAlbums, useAllAlbums } from '../lib/queries';
import { matches } from '../lib/text';
import { eventLabel } from '../lib/date';
import PhotoGroups, { useViewer } from '../components/PhotoGroups';
import { YearChip } from '../components/Paper';

/** The cover of an album: its own, else the first one found among the albums inside it (a folder of albums has none of its own). */
function coverOf(a: Collection, all: Collection[], depth = 0): string | null {
  if (a.thumbnailUrl) return a.thumbnailUrl;
  if (depth > 4) return null;
  for (const c of all) if (c.parentId === a.id) { const u = coverOf(c, all, depth + 1); if (u) return u; }
  return null;
}
/** An album: its cover as the top of a small stack, its name, when it is from. */
export function AlbumCard({ a }: { a: Collection }) {
  const all = useAllAlbums(), cover = coverOf(a, all.data ?? []);
  return (
    <Link className="album stack" to={`/photos/albums/${a.id}`}>
      <div className="cov">{cover ? <img src={cdn(cover, 400)} alt="" loading="lazy" /> : <div className="ph" style={{ width: '100%', height: '100%' }} />}</div>
      <b>{a.name}</b><span>{[a.event ? eventLabel(a.event) : '', a.mediaCount ? `${fmt(a.mediaCount)} ảnh` : '', a.childrenCount ? `${a.childrenCount} album con` : ''].filter(Boolean).join(' · ')}</span>
    </Link>
  );
}

export function AlbumsIndex() {
  const top = useAlbums(), all = useAllAlbums(), [q, setQ] = useState('');
  const list = q.trim() ? (all.data ?? []).filter(a => a.parentId && matches(a.name, q.trim())) : top.data ?? [];
  return (
    <div className="wrap page ph">
      <header className="ph-head"><h1>Album</h1><span className="ph-n">{q.trim() ? `${list.length} kết quả` : `${list.length} album`}</span>
        <input className="finput" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm album…" /></header>
      {top.isLoading && <div className="card empty">Đang tải…</div>}
      <div className="albums grid-auto">{list.map(a => <AlbumCard key={a.id} a={a} />)}</div>
    </div>
  );
}

export function AlbumPage() {
  const { id = '' } = useParams(), all = useAllAlbums();
  const album = all.data?.find(a => a.id === id), children = (all.data ?? []).filter(a => a.parentId === id);
  const crumbs = useQuery({ queryKey: ['crumbs', id], queryFn: () => hub.breadcrumb(id), staleTime: 600_000 });
  const media = useQuery({ queryKey: ['album-media', id], queryFn: () => hub.albumMedia(id, 'asc'), staleTime: 600_000 });
  const items = media.data ?? [], viewer = useViewer(items);
  const trail = (crumbs.data ?? []).filter(c => c.parentId && c.id !== id);
  // the album's year: its own date, else the year of its first photo
  const albumYear = Number((album?.event?.date ?? items[0]?.effectiveDate ?? '').slice(0, 4)) || 0;
  return (
    <div className="wrap page ph" key={id}>
      <div className="crumbs"><Link to="/photos/albums">Album</Link>{trail.map(c => <span key={c.id}> / <Link to={`/photos/albums/${c.id}`}>{c.name}</Link></span>)}</div>
      <header className="ph-head album-head">
        {albumYear > 1900 && <YearChip year={albumYear} />}
        <h1>{album?.name ?? 'Album'}</h1><span className="ph-n">{[album?.event ? eventLabel(album.event) : '', (items.length || album?.mediaCount) ? `${fmt(items.length || album?.mediaCount || 0)} ảnh` : '', children.length ? `${children.length} album con` : ''].filter(Boolean).join(' · ')}</span>
        {!!album?.tags?.length && <div className="chips" style={{ marginLeft: 'auto' }}>{album.tags.map(t => <Link key={t.id} className="chip" to={`/tags/${encodeURIComponent(t.name)}`}>{t.name}</Link>)}</div>}</header>
      {album?.description && <p className="desc">{album.description}</p>}
      {children.length > 0 && <section className="block"><div className="hd"><h2>Album con</h2></div><div className="albums grid-auto">{children.map(a => <AlbumCard key={a.id} a={a} />)}</div></section>}
      {media.isLoading && <div className="card empty">Đang tải ảnh…</div>}
      {!media.isLoading && !items.length && !children.length && <div className="card empty">Album này chưa có ảnh.</div>}
      <div className="block"><PhotoGroups items={items} onOpen={viewer.open} /></div>
      {viewer.element}
    </div>
  );
}
