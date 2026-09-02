import { useMemo } from 'react';
import { Heart, Play } from 'lucide-react';
import { cdn } from '../../api/client';
import useContainerWidth from '../../hooks/useContainerWidth';
import useJustifiedLayout from '../../hooks/useJustifiedLayout';
import { fmtDuration } from '../../lib/format';
import type { MediaFile } from '../../types';

interface Props {
  items: MediaFile[];
  onOpen: (index: number) => void;
  gap?: number;
  /** Known container width. Pass it when many galleries share one column so
      rows are laid out on first render (no post-mount height jump). */
  width?: number;
  /** Target row height; defaults to a viewport-based value. */
  rowHeight?: number;
}

/* Rows of photographs at their own proportions. The grid holds no colour of
   its own: hairline gaps, no borders, no hover chrome — only the favourite
   heart, and only when it is true. */
export default function JustifiedGallery({ items, onOpen, gap = 4, width: given, rowHeight }: Props) {
  const { ref, width: measured } = useContainerWidth<HTMLDivElement>();
  const width = given ?? measured;
  const rows = useJustifiedLayout(items, width, gap, rowHeight);
  const indexOf = useMemo(() => new Map(items.map((m, i) => [m.id, i])), [items]);
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

  return (
    <div ref={ref} className="w-full">
      {rows.map((row, ri) => (
        <div key={ri} className="flex" style={{ height: row.h, gap, marginBottom: gap }}>
          {row.tiles.map(t => (
            <Tile key={t.item.id} m={t.item} w={t.w} h={t.h} dpr={dpr} onClick={() => onOpen(indexOf.get(t.item.id) ?? 0)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Tile({ m, w, h, dpr, onClick }: { m: MediaFile; w: number; h: number; dpr: number; onClick: () => void }) {
  const video = m.fileType === 'VIDEO';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={m.caption || m.fileName}
      className="relative block overflow-hidden rounded-[2px] bg-raise text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ width: w, height: h, flex: 'none' }}
    >
      {video ? (
        <video src={`${m.cdnUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : (
        <img src={cdn(m.cdnUrl, w * dpr)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
      {video && (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          <Play className="h-3 w-3 fill-white" />{fmtDuration(m.durationSeconds)}
        </span>
      )}
      {m.isFavorite && <Heart className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 fill-[#E11D48] text-[#E11D48] drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]" />}
    </button>
  );
}
