import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/angels';
import { cdn } from '../../api/client';
import ArticleCard from '../../components/ArticleCard';
import { fmtDate, readingMinutes } from '../../lib/format';

/* One article: kicker, title, excerpt as standfirst, cover, the body as the
   editor wrote it, tags, then a few more from the same shelf. */
export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: a, isLoading, isError } = useQuery({ queryKey: ['article', slug], queryFn: () => api.article(slug!), enabled: !!slug, retry: false });
  const { data: more } = useQuery({ queryKey: ['articles', 'more', a?.category ?? ''], queryFn: () => api.articles({ size: 5, category: a?.category ?? undefined }), enabled: !!a });

  useEffect(() => { if (a?.title) document.title = `${a.title} — Sonic Hub`; return () => { document.title = 'Sonic Hub'; }; }, [a?.title]);

  if (isError) return (
    <div className="pt-2">
      <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em]">Không có bài này</h1>
      <p className="mt-3 text-ink2">Có thể bài chưa đăng, hoặc đường dẫn đã đổi. <Link to="/articles" className="text-accent underline underline-offset-[3px]">Về danh sách bài viết</Link>.</p>
    </div>
  );
  if (isLoading || !a) return <p className="pt-2 text-[13px] text-ink2">Đang tải…</p>;

  const mins = readingMinutes(a.content);
  const cover = a.coverMedia?.cdnUrl;
  const others = (more?.content ?? []).filter(x => x.id !== a.id).slice(0, 4);

  return (
    <article>
      <div className="text-[13.5px] font-semibold text-accent">
        {a.category ? <Link to={`/articles?c=${encodeURIComponent(a.category)}`} className="hover:underline">{a.category}</Link> : <Link to="/articles">Bài viết</Link>}
        <span className="font-normal text-ink2"> · {fmtDate(a.publishedAt || a.createdAt)}{mins ? ` · ${mins} phút đọc` : ''}</span>
      </div>
      <h1 className="mt-2.5 font-display text-[clamp(30px,7.2vw,46px)] font-extrabold leading-[1.12] tracking-[-0.03em]">{a.title || 'Không tiêu đề'}</h1>
      {a.excerpt && <p className="mt-3.5 max-w-[30em] text-[19px] font-medium leading-[1.45] text-ink2">{a.excerpt}</p>}

      {cover && (
        <figure className="mt-7">
          <img src={cdn(cover, 1400)} alt="" className="w-full rounded-[14px]" />
          {a.coverMedia?.caption && <figcaption className="mt-2.5 text-[13px] leading-relaxed text-ink2">{a.coverMedia.caption}</figcaption>}
        </figure>
      )}

      <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: a.content }} />

      {!!a.tags?.length && (
        <div className="mt-7 flex flex-wrap gap-3.5 text-[14.5px]">
          {a.tags.map(t => <span key={t.id} className="text-accent">#{t.name.replace(/\s+/g, '').toLowerCase()}</span>)}
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-10 border-t border-line pt-7">
          <h2 className="mb-5 font-display text-[20px] font-bold tracking-[-0.02em]">{a.category ? `Thêm về ${a.category}` : 'Bài khác'}</h2>
          <div className="grid gap-7 sm:grid-cols-2 sm:gap-x-6">
            {others.map(o => <ArticleCard key={o.id} a={o} />)}
          </div>
        </section>
      )}
    </article>
  );
}
