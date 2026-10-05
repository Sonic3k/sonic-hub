import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import type { Collection } from '../types';
import { fmt, useAlbums, useAllAlbums } from '../lib/queries';
import { matches } from '../lib/text';
import PhotoGroups, { useViewer } from '../components/PhotoGroups';

function AlbumCard({ a }: { a: Collection }) {
  return (
    <Link className="album" to={`/photos/albums/${a.id}`}>
      <div className="cov">{a.thumbnailUrl ? <img src={cdn(a.thumbnailUrl, 400)} alt="" /> : <div className="ph" style={{ width: '100%', height: '100%' }} />}</div>
      <b>{a.name}</b><span>{fmt(a.mediaCount ?? 0)} ảnh{a.childrenCount ? ` · ${a.childrenCount} album con` : ''}</span>
    </Link>
  );
}

export function AlbumsIndex() {
  const top = useAlbums(), all = useAllAlbums(), [q, setQ] = useState('');
  const list = q.trim() ? (all.data ?? []).filter(a => a.parentId && matches(a.name, q.trim())) : top.data ?? [];
  return (
    <div className="wrap page">
      <div className="ptitle"><h1>Album</h1><span>{q.trim() ? `${list.length} kết quả` : `${list.length} album`}</span>
        <input className="finput" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm album…" /></div>
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
  return (
    <div className="wrap page" key={id}>
      <div className="crumbs"><Link to="/photos/albums">Album</Link>{trail.map(c => <span key={c.id}> / <Link to={`/photos/albums/${c.id}`}>{c.name}</Link></span>)}</div>
      <div className="ptitle"><h1>{album?.name ?? 'Album'}</h1><span>{fmt(items.length || album?.mediaCount || 0)} ảnh{children.length ? ` · ${children.length} album con` : ''}</span>
        {!!album?.tags?.length && <div className="chips" style={{ marginLeft: 'auto' }}>{album.tags.map(t => <Link key={t.id} className="chip" to={`/tags/${encodeURIComponent(t.name)}`}>{t.name}</Link>)}</div>}</div>
      {album?.description && <p className="desc">{album.description}</p>}
      {children.length > 0 && <section className="block"><div className="hd"><h2>Album con</h2></div><div className="albums grid-auto">{children.map(a => <AlbumCard key={a.id} a={a} />)}</div></section>}
      {media.isLoading && <div className="card empty">Đang tải ảnh…</div>}
      {!media.isLoading && !items.length && !children.length && <div className="card empty">Album này chưa có ảnh.</div>}
      <div className="block"><PhotoGroups items={items} onOpen={viewer.open} /></div>
      {viewer.element}
    </div>
  );
}
