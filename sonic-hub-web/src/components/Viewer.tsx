/* Look at one photo properly: the photo, its neighbours, and what is known about it. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cdn } from '../api/client';
import type { MediaFile } from '../types';
import { longDay, timeOf } from '../lib/date';

export default function Viewer({ items, start, onClose, onIndex }: { items: MediaFile[]; start: number; onClose: () => void; onIndex?: (i: number) => void }) {
  const [i, setI] = useState(Math.max(0, Math.min(start, items.length - 1))), [info, setInfo] = useState(() => innerWidth > 1100), x0 = useRef<number | null>(null);
  const m = items[i], go = (d: number) => setI(v => (v + d + items.length) % items.length);
  useEffect(() => { onIndex?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'i') setInfo(v => !v); };
    addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [items.length, onClose]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return null;
  const d = m.effectiveDate ?? '', cam = m.imageDetail, camLine = [[cam?.cameraMake, cam?.cameraModel].filter(Boolean).join(' '), cam?.lensModel].filter(Boolean).join(' · ');
  const exp = [cam?.aperture && `ƒ/${cam.aperture}`, cam?.shutterSpeed && `${cam.shutterSpeed}s`, cam?.iso && `ISO ${cam.iso}`, cam?.focalLength && `${cam.focalLength}mm`].filter(Boolean).join(' · ');
  /* portal: an ancestor with a transform (page entrance animation) would otherwise trap position: fixed */
  return createPortal(
    <div className={`viewer ${info ? 'with-info' : ''}`} role="dialog" aria-label="Xem ảnh">
      <div className="v-bg" style={{ backgroundImage: `url(${cdn(m.thumbnailUrl ?? m.cdnUrl, 640)})` }} />
      <div className="v-stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={(e) => { x0.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0.current = null; }}>
        {m.fileType === 'VIDEO' ? <video key={m.id} src={m.cdnUrl} controls autoPlay /> : <img key={m.id} src={cdn(m.cdnUrl, 1920)} alt={m.caption ?? ''} />}
        {items.length > 1 && <><button type="button" className="v-nav prev" onClick={() => go(-1)} aria-label="Ảnh trước">‹</button><button type="button" className="v-nav next" onClick={() => go(1)} aria-label="Ảnh sau">›</button></>}
      </div>
      <div className="v-top">
        <span className="v-count">{items.length > 1 ? `${i + 1} / ${items.length}` : ''}</span>
        <a className="v-btn" href={m.cdnUrl} target="_blank" rel="noreferrer" title="Mở ảnh gốc">↗</a>
        <button type="button" className={`v-btn ${info ? 'on' : ''}`} onClick={() => setInfo(v => !v)} title="Thông tin (i)">i</button>
        <button type="button" className="v-btn" onClick={onClose} title="Đóng (Esc)">✕</button>
      </div>
      {info && (
        <aside className="v-info">
          {m.caption && <p className="vi-cap">{m.caption}</p>}
          {d && <div className="vi-row"><span>Thời gian</span><b>{longDay(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10))} · {timeOf(d)}</b></div>}
          {!!m.persons?.length && <div className="vi-row"><span>Người</span><b>{m.persons.map(p => <Link key={p.id} to={`/photos?person=${p.id}`} onClick={onClose}>{p.displayName || p.name}</Link>)}</b></div>}
          {!!m.tags?.length && <div className="vi-row"><span>Vùng</span><b className="vi-tags">{m.tags.map(t => <Link key={t.id} to={`/tags/${encodeURIComponent(t.name)}`} onClick={onClose} className="chip">{t.name}</Link>)}</b></div>}
          {m.displayedAddress && <div className="vi-row"><span>Nơi chụp</span><b>{m.displayedAddress}</b></div>}
          {(camLine || exp) && <div className="vi-row"><span>Máy ảnh</span><b>{camLine}{exp && <small>{exp}</small>}</b></div>}
          <div className="vi-row"><span>Tệp</span><b>{m.fileName}{m.width && m.height ? <small>{m.width} × {m.height}</small> : null}</b></div>
        </aside>
      )}
      {items.length > 1 && <div className="v-strip">{items.slice(Math.max(0, i - 12), i + 13).map((x) => { const k = items.indexOf(x); return <img key={x.id} src={cdn(x.thumbnailUrl ?? x.cdnUrl, 120)} alt="" className={k === i ? 'on' : ''} onClick={() => setI(k)} />; })}</div>}
    </div>,
    document.body,
  );
}
