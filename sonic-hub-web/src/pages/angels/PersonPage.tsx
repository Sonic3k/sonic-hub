import { useCallback, useMemo } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { MessageSquare, Music } from 'lucide-react';
import { api } from '../../api/angels';
import { cdn } from '../../api/client';
import FolderCard from '../../components/FolderCard';
import JustifiedGallery from '../../components/gallery/JustifiedGallery';
import Lightbox from '../../components/gallery/Lightbox';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';
import useLightboxRoute from '../../hooks/useLightboxRoute';
import { fmtDate, platformLabel, plural, relationLabel } from '../../lib/format';
import type { MediaFile } from '../../types';

const PAGE = 60;
type Tab = 'photos' | 'folders' | 'chats';

/* One person. The header is theirs — banner, portrait, the song, how we met —
   and the tabs are the three kinds of trace that survive: photographs, the
   folders they were filed in, and the conversations. */
export default function PersonPage({ tab }: { tab: Tab }) {
  const { id } = useParams<{ id: string }>();
  const { data: p, isError } = useQuery({ queryKey: ['person', id], queryFn: () => api.person(id!), enabled: !!id, staleTime: 5 * 60_000 });

  if (isError) return <p className="pt-2 text-ink2">Không tìm thấy người này.</p>;

  const name = p?.displayName || p?.name || '\u00A0';
  const banner = p?.bannerUrl || p?.coverUrl;
  const sub = [p?.displayName && p.displayName !== p.name ? p.name : null, p?.nickname ? `“${p.nickname}”` : null,
    relationLabel(p?.relationshipType), p?.period].filter(Boolean).join(' · ');

  const TABS: { key: Tab; to: string; label: string; n?: number | null }[] = [
    { key: 'photos',  to: `/angels/${id}`,         label: 'Ảnh',      n: p?.totalMediaFiles },
    { key: 'folders', to: `/angels/${id}/folders`, label: 'Thư mục',  n: p?.totalCollections },
    { key: 'chats',   to: `/angels/${id}/chats`,   label: 'Chat',     n: p?.totalChatArchives },
  ];

  return (
    <div>
      <Link to="/angels" className="text-[13px] text-ink2 hover:text-ink">Angels</Link>

      <header className="mt-2">
        {banner && (
          <div className="aspect-[21/9] overflow-hidden rounded-2xl bg-raise sm:aspect-[3/1]">
            <img src={cdn(banner, 1600)} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className={clsx('flex items-end gap-4', banner ? '-mt-10 px-4 sm:-mt-12' : 'mt-2')}>
          <div className={clsx('shrink-0 overflow-hidden rounded-full bg-raise', banner ? 'h-20 w-20 border-4 border-bg sm:h-24 sm:w-24' : 'h-20 w-20')}>
            {p?.avatarUrl && <img src={cdn(p.avatarUrl, 320)} alt="" className="h-full w-full object-cover" />}
          </div>
        </div>
        <div className={clsx('mt-3', banner && 'px-4')}>
          <h1 className="font-display text-[clamp(26px,6vw,40px)] font-extrabold leading-[1.1] tracking-[-0.03em]">{name}</h1>
          {sub && <p className="mt-1.5 text-[14px] text-ink2">{sub}</p>}
          {(p?.song || p?.howWeMet || p?.firstMet) && (
            <dl className="mt-4 space-y-1.5 text-[14px]">
              {p.song && <div className="flex items-start gap-2"><Music className="mt-0.5 h-4 w-4 shrink-0 text-ink2" strokeWidth={1.75} /><dd>{p.song}</dd></div>}
              {(p.howWeMet || p.firstMet) && (
                <div className="flex items-start gap-2"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-ink2" strokeWidth={1.75} />
                  <dd>{[p.firstMet ? fmtDate(p.firstMet) : null, p.howWeMet].filter(Boolean).join(' — ')}</dd></div>
              )}
            </dl>
          )}
          {p?.bio && <p className="mt-4 max-w-[36em] whitespace-pre-line text-[15.5px] leading-[1.7]">{p.bio}</p>}
        </div>
      </header>

      <nav className="mt-8 flex gap-5 border-b border-line text-[14px] font-medium text-ink2">
        {TABS.map(t => (
          <NavLink key={t.key} to={t.to} end className={({ isActive }) => clsx('-mb-px flex items-baseline gap-1.5 border-b-2 pb-2.5 transition-colors hover:text-ink',
            isActive ? 'border-ink text-ink' : 'border-transparent')}>
            {t.label}{t.n != null && <span className="text-[12px] text-ink2">{t.n}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5">
        {id && tab === 'photos' && <PersonPhotos personId={id} />}
        {id && tab === 'folders' && <PersonFolders personId={id} />}
        {id && tab === 'chats' && <PersonChats personId={id} />}
      </div>
    </div>
  );
}

function PersonPhotos({ personId }: { personId: string }) {
  const q = useInfiniteQuery({
    queryKey: ['media', 'person', personId],
    queryFn: ({ pageParam }) => api.search({ personId, page: pageParam, size: PAGE, sortBy: 'effectiveDate', sortDir: 'desc' }),
    initialPageParam: 0,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
  });
  const items = useMemo<MediaFile[]>(() => {
    const seen = new Set<string>();
    return (q.data?.pages ?? []).flatMap(p => p.content).filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [q.data]);
  const loadMore = useCallback(() => (q.hasNextPage && !q.isFetchingNextPage ? q.fetchNextPage() : undefined), [q]);
  useInfiniteScroll(loadMore, { enabled: !!q.hasNextPage });
  const lb = useLightboxRoute(items);

  return (
    <div>
      {items.length > 0 && <JustifiedGallery items={items} onOpen={lb.open} />}
      {q.isLoading && <p className="py-10 text-center text-[13px] text-ink2">Đang tải…</p>}
      {!q.isLoading && items.length === 0 && <p className="py-10 text-center text-[14px] text-ink2">Chưa có ảnh nào.</p>}
      {q.isFetchingNextPage && <p className="py-6 text-center text-[13px] text-ink2">Đang tải thêm…</p>}
      {lb.index >= 0 && items[lb.index] && <Lightbox items={items} index={lb.index} onIndex={lb.goTo} onClose={lb.close} onReachEnd={loadMore} />}
    </div>
  );
}

function PersonFolders({ personId }: { personId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['collections', 'person', personId], queryFn: () => api.personCollections(personId) });
  const list = useMemo(() => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [data]);
  if (isLoading) return <p className="py-10 text-center text-[13px] text-ink2">Đang tải…</p>;
  if (!list.length) return <p className="py-10 text-center text-[14px] text-ink2">Chưa có thư mục nào.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map(c => <FolderCard key={c.id} c={c} />)}
    </div>
  );
}

function PersonChats({ personId }: { personId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['chat-archives', personId], queryFn: () => api.chatArchives(personId) });
  const list = useMemo(() => [...(data ?? [])].sort((a, b) => (a.dateFrom ?? '').localeCompare(b.dateFrom ?? '')), [data]);
  if (isLoading) return <p className="py-10 text-center text-[13px] text-ink2">Đang tải…</p>;
  if (!list.length) return <p className="py-10 text-center text-[14px] text-ink2">Chưa có cuộc trò chuyện nào được lưu.</p>;
  return (
    <ul className="divide-y divide-line">
      {list.map(a => {
        const range = a.dateFrom && a.dateTo
          ? `${fmtDate(a.dateFrom, { month: 'numeric', year: 'numeric' })} → ${fmtDate(a.dateTo, { month: 'numeric', year: 'numeric' })}` : null;
        return (
          <li key={a.id}>
            <Link to={`/angels/${personId}/chats/${a.id}`} className="flex items-baseline justify-between gap-4 py-3.5 hover:text-accent">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold">{a.title || platformLabel(a.platform)}</div>
                <div className="text-[13px] text-ink2">{[platformLabel(a.platform), range].filter(Boolean).join(' · ')}</div>
              </div>
              <span className="shrink-0 text-[13px] tabular-nums text-ink2">{plural(a.messageCount ?? null, 'tin')}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
