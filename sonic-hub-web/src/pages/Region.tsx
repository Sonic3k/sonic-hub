import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import { fmt, useAllAlbums, useNotes, useTagStats } from '../lib/queries';
import PhotoGroups, { Sentinel, useViewer } from '../components/PhotoGroups';
import { PostRow } from './Home';

/** A region: everything that carries one tag — its albums, its writing, its photos. */
export default function Region() {
  const { name = '' } = useParams(), stats = useTagStats(), albums = useAllAlbums(), notes = useNotes();
  const tag = stats.data?.find(t => t.name === name);
  const inf = useInfiniteQuery({
    queryKey: ['region-photos', name], initialPageParam: 0, staleTime: 600_000,
    queryFn: ({ pageParam }) => hub.search({ tagNames: [name], sortBy: 'effectiveDate', sortDir: 'desc', page: pageParam, size: 60, inclPersons: true, inclTags: true }),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
  const items = inf.data?.pages.flatMap(p => p.content) ?? [], total = inf.data?.pages[0]?.totalElements ?? tag?.mediaCount ?? 0, viewer = useViewer(items);
  const A = (albums.data ?? []).filter(a => a.tags?.some(t => t.name === name)), N = (notes.data ?? []).filter(n => n.tags?.some(t => t.name === name));
  const more = useCallback(() => { if (inf.hasNextPage && !inf.isFetchingNextPage) inf.fetchNextPage(); }, [inf]);
  return (
    <div className="wrap page" key={name}>
      <div className="ptitle"><span className="rdot" style={{ background: tag?.color || 'var(--ink3)' }} /><h1>{name}</h1>
        <span>{fmt(total)} ảnh{A.length ? ` · ${A.length} album` : ''}{N.length ? ` · ${N.length} bài viết` : ''}</span>
        <Link className="sortbtn" to={`/photos?tag=${encodeURIComponent(name)}`}>Lọc trong kho ảnh →</Link></div>
      {A.length > 0 && <section className="block"><div className="hd"><h2>Album</h2></div><div className="albums grid-auto">{A.map(a => (
        <Link key={a.id} className="album" to={`/photos/albums/${a.id}`}><div className="cov">{a.thumbnailUrl ? <img src={cdn(a.thumbnailUrl, 400)} alt="" /> : <div className="ph" style={{ width: '100%', height: '100%' }} />}</div><b>{a.name}</b><span>{fmt(a.mediaCount ?? 0)} ảnh</span></Link>))}</div></section>}
      {N.length > 0 && <section className="block"><div className="hd"><h2>Bài viết</h2></div><div className="posts">{N.slice(0, 6).map(n => <PostRow key={n.id} n={n} />)}</div></section>}
      <section className="block"><div className="hd"><h2>Ảnh</h2><span>{fmt(total)}</span></div>
        {!inf.isLoading && !items.length && <div className="card empty">Vùng này chưa có ảnh.</div>}
        <PhotoGroups items={items} onOpen={viewer.open} /><Sentinel more={more} active={!!inf.hasNextPage} /></section>
      {viewer.element}
    </div>
  );
}
