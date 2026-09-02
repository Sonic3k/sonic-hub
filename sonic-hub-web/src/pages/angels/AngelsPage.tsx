import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/angels';
import { cdn } from '../../api/client';
import { relationLabel } from '../../lib/format';
import type { Person } from '../../types';

const rank = (p: Person) => (p.isFeatured ? 0 : p.isFavorite ? 1 : 2);

/* Everyone who is not me. Featured faces first, then favourites, then the
   rest by name — a wall of portraits, each one a door. */
export default function AngelsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['persons'], queryFn: api.persons, staleTime: 10 * 60_000 });
  const people = useMemo(() => (data ?? []).filter(p => !p.isSelf)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi')), [data]);

  return (
    <div>
      <h1 className="font-display text-[clamp(28px,6.5vw,42px)] font-extrabold leading-[1.1] tracking-[-0.03em]">Angels</h1>
      <p className="mt-3 max-w-[32em] text-[15px] leading-relaxed text-ink2">
        {isLoading ? '\u00A0' : `${people.length} người. Ảnh, thư mục và những cuộc trò chuyện còn giữ được với mỗi người.`}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {people.map(p => (
          <Link key={p.id} to={`/angels/${p.id}`} className="group block">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-raise">
              {p.avatarUrl
                ? <img src={cdn(p.avatarUrl, 640)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                : <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-ink2">{p.name.slice(0, 1)}</div>}
            </div>
            <div className="px-0.5 pt-2.5">
              <div className="truncate font-display text-[16px] font-bold tracking-[-0.01em]">{p.displayName || p.name}</div>
              <div className="truncate text-[13px] text-ink2">{[relationLabel(p.relationshipType), p.period].filter(Boolean).join(' · ') || '\u00A0'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
