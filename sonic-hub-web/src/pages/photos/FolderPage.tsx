import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronRight, Folder } from 'lucide-react';
import { api } from '../../api/angels';
import { cdn } from '../../api/client';
import JustifiedGallery from '../../components/gallery/JustifiedGallery';
import Lightbox from '../../components/gallery/Lightbox';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';
import useLightboxRoute from '../../hooks/useLightboxRoute';
import { plural } from '../../lib/format';
import type { Collection, MediaFile } from '../../types';

const PAGE = 60;
const byName = (a: Collection, b: Collection) => a.name.localeCompare(b.name, 'vi');

/* A folder is a place: sub-folders first, as cards, then its photographs in
   justified rows, oldest first so an album reads as the day happened.
   `/photos` is the root; `/photos/f/:id` is any folder beneath it. */
export default function FolderPage() {
  const { id } = useParams<{ id: string }>();

  const rootQ = useQuery({ queryKey: ['collections', 'root'], queryFn: api.rootCollection, staleTime: 10 * 60_000 });
  const folderQ = useQuery({ queryKey: ['collection', id], queryFn: () => api.collection(id!), enabled: !!id });
  const folder = id ? folderQ.data : rootQ.data;
  const folderId = folder?.id;

  const childrenQ = useQuery({ queryKey: ['collections', folderId, 'children'], queryFn: () => api.children(folderId!), enabled: !!folderId });
  const crumbQ = useQuery({ queryKey: ['breadcrumb', id], queryFn: () => api.breadcrumb(id!), enabled: !!id });

  const mediaQ = useInfiniteQuery({
    queryKey: ['media', 'folder', folderId],
    queryFn: ({ pageParam }) => api.search({ collectionId: folderId!, page: pageParam, size: PAGE, sortBy: 'effectiveDate', sortDir: 'asc' }),
    initialPageParam: 0,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
    enabled: !!folderId,
  });

  const items = useMemo<MediaFile[]>(() => {
    const seen = new Set<string>();
    return (mediaQ.data?.pages ?? []).flatMap(p => p.content).filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [mediaQ.data]);

  const loadMore = useCallback(() => {
    if (mediaQ.hasNextPage && !mediaQ.isFetchingNextPage) return mediaQ.fetchNextPage();
    return undefined;
  }, [mediaQ]);
  useInfiniteScroll(loadMore, { enabled: !!mediaQ.hasNextPage });

  const lb = useLightboxRoute(items);
  const children = useMemo(() => [...(childrenQ.data ?? [])].sort(byName), [childrenQ.data]);
  const total = mediaQ.data?.pages[0]?.totalElements ?? folder?.mediaCount ?? null;

  if ((id ? folderQ.isError : rootQ.isError)) {
    return <p className="pt-2 text-ink2">Không mở được thư mục này.</p>;
  }

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-1 text-[13px] text-ink2" aria-label="Đường dẫn">
        <Link to="/photos" className="hover:text-ink">Ảnh</Link>
        {(crumbQ.data ?? []).slice(0, -1).map(c => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            <Link to={`/photos/f/${c.id}`} className="hover:text-ink">{c.name}</Link>
          </span>
        ))}
        {id && crumbQ.data?.length ? <ChevronRight className="h-3.5 w-3.5 opacity-60" /> : null}
      </nav>

      <h1 className="mt-1 font-display text-[clamp(26px,5.5vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
        {id ? folder?.name ?? '\u00A0' : 'Ảnh'}
      </h1>
      <p className="mt-2 text-[14px] text-ink2">
        {[plural(children.length || folder?.childrenCount, 'thư mục'), plural(total, 'ảnh')].filter(Boolean).join(' · ') || '\u00A0'}
      </p>

      {children.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {children.map(c => <FolderCard key={c.id} c={c} />)}
        </div>
      )}

      <div className="mt-6">
        {items.length > 0 && <JustifiedGallery items={items} onOpen={lb.open} />}
        {mediaQ.isLoading && <p className="py-10 text-center text-[13px] text-ink2">Đang tải…</p>}
        {!mediaQ.isLoading && items.length === 0 && children.length === 0 && childrenQ.isSuccess && (
          <p className="py-10 text-center text-[14px] text-ink2">Thư mục trống.</p>
        )}
        {mediaQ.isFetchingNextPage && <p className="py-6 text-center text-[13px] text-ink2">Đang tải thêm…</p>}
      </div>

      {lb.index >= 0 && items[lb.index] && (
        <Lightbox items={items} index={lb.index} onIndex={lb.goTo} onClose={lb.close} onReachEnd={loadMore} />
      )}
    </div>
  );
}

function FolderCard({ c }: { c: Collection }) {
  const bits = [plural(c.childrenCount || null, 'thư mục'), plural(c.mediaCount ?? null, 'ảnh')].filter(Boolean);
  return (
    <Link to={`/photos/f/${c.id}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-raise">
        {c.thumbnailUrl
          ? <img src={cdn(c.thumbnailUrl, 640)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          : <div className="flex h-full w-full items-center justify-center text-ink2"><Folder className="h-8 w-8" strokeWidth={1.5} /></div>}
      </div>
      <div className="px-0.5 pt-2">
        <div className="truncate text-[14px] font-semibold leading-snug">{c.name}</div>
        <div className="text-[12.5px] text-ink2">{bits.join(' · ') || '\u00A0'}</div>
      </div>
    </Link>
  );
}
