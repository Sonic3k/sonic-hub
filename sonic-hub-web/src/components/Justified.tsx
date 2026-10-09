/* The demo's justified gallery as a component: rows fill the width, every photo keeps its ratio. */
import { useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../types';
import { cdn, pic } from '../api/client';

const ratio = (m: MediaFile) => m.aspectRatio || (m.width && m.height ? m.width / m.height : 1.5);

export default function Justified({ items, rowHeight = 236, gap = 12, onOpen }: { items: MediaFile[]; rowHeight?: number; gap?: number; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null), [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const rows: { items: { m: MediaFile; i: number }[]; h: number }[] = [];
  if (w) {
    const tol = .25; let row: { m: MediaFile; i: number }[] = [], rr = 0;
    items.forEach((m, i) => {
      row.push({ m, i }); rr += ratio(m);
      const h = (w - gap * (row.length - 1)) / rr;
      if (h <= rowHeight * (1 - tol) || i === items.length - 1) { rows.push({ items: row, h: Math.min(h, i === items.length - 1 ? rowHeight : rowHeight * (1 + tol)) }); row = []; rr = 0; }
      else if (h <= rowHeight) { rows.push({ items: row, h }); row = []; rr = 0; }
    });
  }
  return (
    <div className="jg" ref={ref}>
      {rows.map((r, ri) => (
        <div key={ri} className="jg-row" style={{ display: 'flex', gap, marginBottom: ri === rows.length - 1 ? 0 : gap }}>
          {r.items.map(({ m, i }) => (
            <figure key={m.id} className="jg-item zoom" style={{ height: r.h, width: r.h * ratio(m), flex: '0 0 auto' }} onClick={() => onOpen(i)}>
              {pic(m) ? <img src={cdn(pic(m), r.h * ratio(m))} alt={m.caption ?? ''} loading="lazy" decoding="async" /> : <span className="jg-ph">{m.fileType === 'AUDIO' ? 'Ghi âm' : 'Thiệp Flash'}</span>}
              {m.fileType === 'FLASH' && <span className="jg-badge">▶ Flash</span>}
              {m.fileType === 'AUDIO' && <span className="jg-badge">♪ Ghi âm</span>}
              {m.fileType === 'VIDEO' && m.posterUrl && <span className="jg-badge">▶ Video</span>}
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}
