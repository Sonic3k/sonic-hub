import { Link } from 'react-router-dom';
import { Folder } from 'lucide-react';
import { cdn } from '../api/client';
import { plural } from '../lib/format';
import type { Collection } from '../types';

/* A folder as a card: its cover, its name, what it holds. */
export default function FolderCard({ c }: { c: Collection }) {
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
