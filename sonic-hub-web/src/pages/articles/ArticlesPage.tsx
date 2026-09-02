import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../../api/angels';
import ArticleCard from '../../components/ArticleCard';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';
import type { Article } from '../../types';

interface Props {
  /** A section is the same list pinned to one category. */
  fixedCategory?: string;
  title?: string;
  note?: string;
}

/* Published articles, newest first. /articles filters by ?c=; /games and
   /football are the same page pinned to their category, so a section can be
   empty without being a different thing. */
export default function ArticlesPage({ fixedCategory, title, note }: Props) {
  const [params, setParams] = useSearchParams();
  const category = fixedCategory ?? params.get('c') ?? undefined;

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.categories, staleTime: 5 * 60_000, enabled: !fixedCategory });

  const q = useInfiniteQuery({
    queryKey: ['articles', category ?? ''],
    queryFn: ({ pageParam }) => api.articles({ page: pageParam, size: 20, category }),
    initialPageParam: 0,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
  });
  const items = useMemo<Article[]>(() => (q.data?.pages ?? []).flatMap(p => p.content), [q.data]);
  const loadMore = useCallback(() => (q.hasNextPage && !q.isFetchingNextPage ? q.fetchNextPage() : undefined), [q]);
  useInfiniteScroll(loadMore, { enabled: !!q.hasNextPage });

  const pick = (c?: string) => { const next = new URLSearchParams(params); if (c) next.set('c', c); else next.delete('c'); setParams(next, { replace: true }); };

  return (
    <div>
      <h1 className="font-display text-[clamp(28px,6.5vw,42px)] font-extrabold leading-[1.1] tracking-[-0.03em]">{title ?? 'Bài viết'}</h1>
      {note && <p className="mt-3 max-w-[32em] text-[15px] leading-relaxed text-ink2">{note}</p>}

      {!fixedCategory && !!categories?.length && (
        <div className="-mx-[18px] mt-5 flex gap-4 overflow-x-auto whitespace-nowrap px-[18px] text-[14px] font-medium text-ink2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => pick()} className={clsx('transition-colors hover:text-ink', !category && 'text-accent hover:text-accent')}>Tất cả</button>
          {categories.map(c => (
            <button key={c} onClick={() => pick(c)} className={clsx('transition-colors hover:text-ink', category === c && 'text-accent hover:text-accent')}>{c}</button>
          ))}
        </div>
      )}

      <div className="mt-7 grid gap-8 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-9">
        {items.map(a => <ArticleCard key={a.id} a={a} />)}
      </div>

      {q.isLoading && <p className="py-10 text-center text-[13px] text-ink2">Đang tải…</p>}
      {!q.isLoading && items.length === 0 && (
        <p className="py-10 text-[15px] text-ink2">{fixedCategory ? 'Chưa có bài nào ở mục này.' : 'Chưa có bài nào được đăng.'}</p>
      )}
      {q.isFetchingNextPage && <p className="py-6 text-center text-[13px] text-ink2">Đang tải thêm…</p>}
    </div>
  );
}
