import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/angels';
import { cdn } from '../api/client';
import ArticleCard from '../components/ArticleCard';
import JustifiedGallery from '../components/gallery/JustifiedGallery';
import Lightbox from '../components/gallery/Lightbox';
import useLightboxRoute from '../hooks/useLightboxRoute';
import { relationLabel } from '../lib/format';

function H({ title, to, label }: { title: string; to: string; label: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
      <Link to={to} className="text-[13.5px] font-medium text-ink2 hover:text-accent">{label}</Link>
    </div>
  );
}

/* The front door: what was written last, a handful of photographs drawn at
   random from the whole archive, and the faces. Each block is a way in. */
export default function HomePage() {
  const latest = useQuery({ queryKey: ['articles', 'latest'], queryFn: () => api.articles({ size: 3 }) });
  const random = useQuery({ queryKey: ['media', 'random', 'home'], queryFn: () => api.search({ random: true, size: 14, type: 'IMAGE' }), staleTime: Infinity });
  const persons = useQuery({ queryKey: ['persons'], queryFn: api.persons, staleTime: 10 * 60_000 });

  const photos = useMemo(() => random.data?.content ?? [], [random.data]);
  const lb = useLightboxRoute(photos);
  const faces = useMemo(() => (persons.data ?? []).filter(p => !p.isSelf)
    .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || Number(!!b.isFavorite) - Number(!!a.isFavorite) || a.name.localeCompare(b.name, 'vi'))
    .slice(0, 8), [persons.data]);

  return (
    <div className="space-y-12">
      <section>
        <H title="Mới viết" to="/articles" label="Tất cả bài viết" />
        {latest.data?.content.length ? (
          <div className="grid gap-7 sm:grid-cols-2 sm:gap-x-6">
            {latest.data.content.map(a => <ArticleCard key={a.id} a={a} />)}
          </div>
        ) : <p className="text-[14.5px] text-ink2">{latest.isLoading ? 'Đang tải…' : 'Chưa có bài nào được đăng.'}</p>}
      </section>

      <section>
        <H title="Ngẫu nhiên từ kho ảnh" to="/photos" label="Vào kho ảnh" />
        {photos.length > 0
          ? <JustifiedGallery items={photos} onOpen={lb.open} rowHeight={150} />
          : <p className="text-[14.5px] text-ink2">{random.isLoading ? 'Đang tải…' : 'Chưa có ảnh.'}</p>}
      </section>

      {faces.length > 0 && (
        <section>
          <H title="Angels" to="/angels" label="Tất cả" />
          <div className="-mx-[18px] flex gap-5 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {faces.map(p => (
              <Link key={p.id} to={`/angels/${p.id}`} className="group w-[84px] shrink-0 text-center">
                <div className="mx-auto h-[72px] w-[72px] overflow-hidden rounded-full bg-raise">
                  {p.avatarUrl
                    ? <img src={cdn(p.avatarUrl, 320)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                    : <div className="flex h-full w-full items-center justify-center font-display text-xl font-bold text-ink2">{p.name.slice(0, 1)}</div>}
                </div>
                <div className="mt-2 truncate text-[13px] font-semibold group-hover:text-accent">{p.displayName || p.name}</div>
                <div className="truncate text-[11.5px] text-ink2">{relationLabel(p.relationshipType) ?? '\u00A0'}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {lb.index >= 0 && photos[lb.index] && <Lightbox items={photos} index={lb.index} onIndex={lb.goTo} onClose={lb.close} />}
    </div>
  );
}
