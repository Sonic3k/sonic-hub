import { useEffect, useState } from 'react';
import { cdn } from '../api/client';
import type { MediaFile } from '../types';
import { longDay, timeOf } from '../lib/date';

/** A photo taking over the sky: blurred copy of itself behind, filmstrip of its neighbours. */
export default function Viewer({ items, start, onClose }: { items: MediaFile[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start), m = items[i];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI(v => (v + 1) % items.length); if (e.key === 'ArrowLeft') setI(v => (v - 1 + items.length) % items.length); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [items.length, onClose]);
  if (!m) return null;
  const d = m.effectiveDate ?? '';
  return (
    <div className="viewer" role="dialog" aria-label="Xem ảnh" onClick={onClose}>
      <div className="v-bg" style={{ backgroundImage: `url(${cdn(m.cdnUrl, 640)})` }} />
      <figure onClick={e => e.stopPropagation()}>
        {m.fileType === 'VIDEO' ? <video src={m.cdnUrl} controls autoPlay /> : <img src={cdn(m.cdnUrl, 1920)} alt={m.caption ?? ''} />}
        <figcaption>{m.caption && <b>{m.caption}</b>}<span>{d ? `${timeOf(d)} · ${longDay(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10))}` : ''}</span></figcaption>
      </figure>
      {items.length > 1 && (
        <div className="v-strip" onClick={e => e.stopPropagation()}>
          {items.map((x, k) => <img key={x.id} src={cdn(x.thumbnailUrl ?? x.cdnUrl, 160)} alt="" className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}
        </div>
      )}
      <button type="button" className="v-close" onClick={onClose} aria-label="Đóng">✕</button>
    </div>
  );
}
