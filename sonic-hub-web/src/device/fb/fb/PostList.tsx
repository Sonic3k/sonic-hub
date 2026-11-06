/* A list of posts read page by page as the end comes near. */
import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PostPage } from '../api';
import { Empty, Loading, Sentinel } from '../ui/bits';
import PostCard from './PostCard';

export default function PostList({ qkey, load, empty }: { qkey: unknown[]; load: (before: string | null) => Promise<PostPage>; empty: string }) {
  const q = useInfiniteQuery({
    queryKey: qkey, initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => load(pageParam),
    getNextPageParam: last => last.next ?? undefined,
  });
  const more = useCallback(() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }, [q]);
  if (q.isLoading) return <Loading />;
  if (q.isError) return <Empty>{(q.error as Error).message}</Empty>;
  const items = q.data?.pages.flatMap(p => p.items) ?? [];
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <>
      {items.map(p => <PostCard key={p.id} p={p} />)}
      <Sentinel more={!!q.hasNextPage} onMore={more} />
      {q.isFetchingNextPage && <Loading />}
      {!q.hasNextPage && items.length > 3 && <div className="list-end">Nothing older.</div>}
    </>
  );
}
