import { Link } from 'react-router-dom';
import { cdn } from '../api/client';
import { fmtDate } from '../lib/format';
import type { Article } from '../types';

/* Cover first, then the words. No excerpt, no problem: the card just gets shorter. */
export default function ArticleCard({ a }: { a: Article }) {
  const cover = a.coverMedia?.cdnUrl;
  return (
    <Link to={`/articles/${a.slug}`} className="group block">
      {cover ? (
        <div className="mb-3 aspect-[16/10] overflow-hidden rounded-xl bg-raise">
          <img src={cdn(cover, 800)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
      ) : (
        <div className="mb-3 h-px bg-line" />
      )}
      {a.category && <div className="text-[13px] font-semibold text-accent">{a.category}</div>}
      <h3 className="mt-1.5 font-display text-[22px] font-bold leading-[1.22] tracking-[-0.02em] group-hover:text-accent">{a.title || 'Không tiêu đề'}</h3>
      {a.excerpt && <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink2">{a.excerpt}</p>}
      <div className="mt-2 text-[13px] text-ink2">{fmtDate(a.publishedAt || a.createdAt)}</div>
    </Link>
  );
}
