import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, TouchEvent, TouchList, TransitionEvent, WheelEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/angels';
import { cdn } from '../../api/client';
import { fmtDateTime, fmtDuration, fmtSize } from '../../lib/format';
import type { MediaFile } from '../../types';
import './Lightbox.css';

/* Full-screen viewer, ported from Mushroom Hills. The photo owns the screen;
   chrome fades on idle and returns on any input. Controlled by the host: it
   receives the index and reports every change through onIndex. */

const IDLE_MS = 2600;
const IDLE_PLAY_MS = 1600;
const SLIDE_MS = 4200;
const SWIPE_COMMIT = 0.22;   // fraction of width needed to commit a slide
const DISMISS_PX = 120;
const MAX_ZOOM = 5;
const PRELOAD_AHEAD = 3;     // ask the host for more items this close to the end

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

interface Props {
  items: MediaFile[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onReachEnd?: () => void;
}

type Gesture =
  | { kind: 'pinch'; d0: number; z0: number }
  | { kind: 'pan' | 'swipe'; x0: number; y0: number; px: number; py: number; axis: 'x' | 'y' | null };

export default function Lightbox({ items, index: idx, onIndex, onClose, onReachEnd }: Props) {
  const count = items.length;
  const item = items[idx];

  const [chrome, setChrome] = useState(true);
  const [strip, setStrip] = useState(false);
  const [info, setInfo] = useState(false);
  const [help, setHelp] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fs, setFs] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState({ x: 0, y: 0, on: false });
  const [anim, setAnim] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<number | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const tapRef = useRef({ t: 0, x: 0, y: 0 });
  const dragRef = useRef({ x: 0, y: 0 });

  const zoomed = zoom > 1.01;
  const isVideo = item?.fileType === 'VIDEO';

  /* ── index ─────────────────────────────────────────────────────────────── */

  const go = useCallback((n: number) => {
    const next = clamp(n, 0, count - 1);
    setZoom(1); setPan({ x: 0, y: 0 });
    if (next !== idx) onIndex(next);
  }, [count, idx, onIndex]);

  const goPrev = useCallback(() => go(idx - 1), [go, idx]);
  const goNext = useCallback(() => go(idx + 1), [go, idx]);

  useEffect(() => { if (onReachEnd && idx >= count - PRELOAD_AHEAD) onReachEnd(); }, [idx, count, onReachEnd]);

  /* ── chrome idle ───────────────────────────────────────────────────────── */

  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setChrome(false), playing ? IDLE_PLAY_MS : IDLE_MS);
  }, [playing]);

  useEffect(() => { wake(); return () => clearTimeout(idleRef.current); }, [wake]);

  /* ── fullscreen ────────────────────────────────────────────────────────── */

  const toggleFs = useCallback(() => {
    const el = rootRef.current; if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);

  /* ── keyboard ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (help) { setHelp(false); return; }
        if (info) { setInfo(false); return; }
        if (zoomed) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
        onClose(); return;
      }
      if (e.key === 'ArrowLeft') { wake(); goPrev(); }
      else if (e.key === 'ArrowRight') { wake(); goNext(); }
      else if (e.key === 'Home') { wake(); go(0); }
      else if (e.key === 'End') { wake(); go(count - 1); }
      else if (e.key === ' ') { e.preventDefault(); wake(); setPlaying(p => !p); }
      else if (e.key === 'f' || e.key === 'F') toggleFs();
      else if (e.key === 'i' || e.key === 'I') { wake(); setInfo(v => !v); }
      else if (e.key === 't' || e.key === 'T') { wake(); setStrip(v => !v); }
      else if (e.key === '?') { wake(); setHelp(v => !v); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  /* ── body scroll lock (position-fixed so iOS keeps its place) ──────────── */

  useEffect(() => {
    const y = window.scrollY;
    const b = document.body;
    const kept = { position: b.style.position, top: b.style.top, width: b.style.width, overflow: b.style.overflow };
    b.style.position = 'fixed'; b.style.top = `-${y}px`; b.style.width = '100%'; b.style.overflow = 'hidden';
    return () => {
      b.style.position = kept.position; b.style.top = kept.top; b.style.width = kept.width; b.style.overflow = kept.overflow;
      window.scrollTo(0, y);
    };
  }, []);

  /* ── neighbour preload ─────────────────────────────────────────────────── */

  useEffect(() => {
    [idx - 1, idx + 1, idx + 2].forEach(i => {
      const m = items[i];
      if (!m || m.fileType !== 'IMAGE') return;
      const im = new Image(); im.src = cdn(m.cdnUrl, 1920);
    });
  }, [idx, items]);

  /* ── slideshow ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!playing || count < 2 || isVideo) return;
    const t = setTimeout(() => go(idx + 1 >= count ? 0 : idx + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, idx, count, go, isVideo]);

  useEffect(() => { if (playing) wake(); }, [playing, wake]);

  /* ── filmstrip keeps the current thumb centred ─────────────────────────── */

  useEffect(() => {
    if (!strip || !stripRef.current) return;
    stripRef.current.querySelector('[data-on="1"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [strip, idx]);

  /* ── gestures ──────────────────────────────────────────────────────────── */

  const setDragBoth = (d: { x: number; y: number; on: boolean }) => { dragRef.current = { x: d.x, y: d.y }; setDrag(d); };

  const commit = useCallback((dir: 1 | -1) => {
    const w = rootRef.current?.clientWidth || window.innerWidth;
    pendingRef.current = idx + dir;
    setAnim(true);
    setDragBoth({ x: -dir * w, y: 0, on: false });
  }, [idx]);

  const settle = useCallback(() => { setAnim(true); setDragBoth({ x: 0, y: 0, on: false }); }, []);

  const onTrackEnd = useCallback((e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;   // ignore the image's own transition
    setAnim(false);
    if (pendingRef.current != null) {
      const n = pendingRef.current; pendingRef.current = null;
      setDragBoth({ x: 0, y: 0, on: false });
      go(n);
    }
  }, [go]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    wake();
    if (isVideo && (e.target as HTMLElement).tagName === 'VIDEO') return;   // let the player have its controls
    if (e.touches.length === 2) { gestureRef.current = { kind: 'pinch', d0: dist(e.touches) || 1, z0: zoom }; return; }
    const t = e.touches[0];
    gestureRef.current = { kind: zoomed ? 'pan' : 'swipe', x0: t.clientX, y0: t.clientY, px: pan.x, py: pan.y, axis: null };
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const g = gestureRef.current; if (!g) return;
    if (g.kind === 'pinch') {
      if (e.touches.length !== 2) return;
      const z = clamp(g.z0 * (dist(e.touches) / g.d0), 1, MAX_ZOOM);
      setZoom(z); if (z <= 1.01) setPan({ x: 0, y: 0 });
      return;
    }
    const t = e.touches[0];
    const dx = t.clientX - g.x0, dy = t.clientY - g.y0;
    if (g.kind === 'pan') { setPan({ x: g.px + dx, y: g.py + dy }); return; }
    if (!g.axis && Math.hypot(dx, dy) > 10) g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (!g.axis) return;
    setAnim(false);
    if (g.axis === 'x') {
      const atEdge = (dx > 0 && idx === 0) || (dx < 0 && idx === count - 1);
      setDragBoth({ x: atEdge ? dx * 0.28 : dx, y: 0, on: true });
    } else {
      setDragBoth({ x: 0, y: Math.max(0, dy), on: true });
    }
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const g = gestureRef.current; gestureRef.current = null;
    if (!g || g.kind === 'pinch' || g.kind === 'pan') return;
    if (!g.axis) {
      /* a tap: double = zoom, single = toggle chrome */
      const t = e.changedTouches[0]; const now = Date.now(); const last = tapRef.current;
      if (now - last.t < 300 && Math.hypot(t.clientX - last.x, t.clientY - last.y) < 30) {
        tapRef.current = { t: 0, x: 0, y: 0 };
        if (!isVideo) { setZoom(z => (z > 1.01 ? 1 : 2.5)); setPan({ x: 0, y: 0 }); }
      } else {
        tapRef.current = { t: now, x: t.clientX, y: t.clientY };
        clearTimeout(idleRef.current);
        setChrome(c => !c);
      }
      return;
    }
    const w = rootRef.current?.clientWidth || window.innerWidth;
    const d = dragRef.current;
    if (g.axis === 'y') { if (d.y > DISMISS_PX) { onClose(); return; } settle(); return; }
    if (d.x < -w * SWIPE_COMMIT && idx < count - 1) { commit(1); return; }
    if (d.x > w * SWIPE_COMMIT && idx > 0) { commit(-1); return; }
    settle();
  };

  /* desktop: wheel zooms, drag pans once zoomed */
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (isVideo) return;
    if (!zoomed && !e.ctrlKey && Math.abs(e.deltaY) < 40) return;
    wake();
    const z = clamp(zoom * (e.deltaY < 0 ? 1.14 : 0.88), 1, MAX_ZOOM);
    setZoom(z); if (z <= 1.01) setPan({ x: 0, y: 0 });
  };

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!zoomed || e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, p0 = { x: pan.x, y: pan.y };
    const move = (m: globalThis.MouseEvent) => setPan({ x: p0.x + (m.clientX - x0), y: p0.y + (m.clientY - y0) });
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const onDoubleClick = () => { if (isVideo) return; setZoom(z => (z > 1.01 ? 1 : 2.5)); setPan({ x: 0, y: 0 }); };

  /* ── details: the list carries slim items; fetch the full record on demand ── */

  const detailQ = useQuery({ queryKey: ['media', item?.id], queryFn: () => api.media(item!.id), enabled: info && !!item, staleTime: 5 * 60_000 });
  const d = detailQ.data ?? item;

  const rows = useMemo<[string, string][]>(() => {
    if (!d) return [];
    const persons = (d.persons ?? []).map(p => p.nickname || p.name).filter(Boolean);
    const tags = (d.tags ?? []).map(t => t.name).filter(Boolean);
    const cam = d.imageDetail ? [d.imageDetail.cameraMake, d.imageDetail.cameraModel].filter(Boolean).join(' ') : '';
    const exp = d.imageDetail ? [
      d.imageDetail.focalLength ? `${d.imageDetail.focalLength}mm` : null,
      d.imageDetail.aperture ? `f/${d.imageDetail.aperture}` : null,
      d.imageDetail.exposureTime ? `${d.imageDetail.exposureTime}s` : null,
      d.imageDetail.iso ? `ISO ${d.imageDetail.iso}` : null,
    ].filter(Boolean).join(' · ') : '';
    const list: [string, string | null | undefined][] = [
      ['Chú thích', d.caption],
      ['Ngày', fmtDateTime(d.effectiveDate || d.dateTaken)],
      ['Người', persons.length ? persons.join(', ') : null],
      ['Chụp bởi', d.takenBy ? (d.takenBy.nickname || d.takenBy.name) : null],
      ['Máy', cam || null],
      ['Thông số', exp || null],
      ['Kích cỡ', d.width && d.height ? `${d.width} × ${d.height}` : null],
      ['Thời lượng', d.fileType === 'VIDEO' ? fmtDuration(d.durationSeconds) : null],
      ['Dung lượng', fmtSize(d.fileSize)],
      ['Tag', tags.length ? tags.join(', ') : null],
      ['Tệp', d.fileName],
    ];
    return list.filter((r): r is [string, string] => !!r[1]);
  }, [d]);

  if (!item) return null;

  const slides = [idx - 1, idx, idx + 1].filter(i => i >= 0 && i < count);
  const backdrop = 1 - Math.min(drag.y / 420, 0.72);
  const lift = drag.y > 0 ? 1 - Math.min(drag.y / 2200, 0.14) : 1;

  return (
    <div
      ref={rootRef}
      className={'lb' + (chrome ? ' lb--chrome' : '') + (info ? ' lb--info' : '') + (zoomed ? ' lb--zoom' : '') + (strip ? ' lb--strip' : '')}
      onMouseMove={wake}
      onWheel={onWheel}
    >
      <div className="lb__backdrop" style={{ opacity: backdrop }} />

      <div className="lb__stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}>
        <div className={'lb__track' + (anim ? ' is-anim' : '')} style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0) scale(${lift})` }} onTransitionEnd={onTrackEnd}>
          {slides.map(i => {
            const m = items[i]; const here = i === idx;
            return (
              <div key={m.id} className="lb__slide" style={{ left: `${(i - idx) * 100}%` }}>
                {m.fileType === 'VIDEO' ? (
                  here ? <video className="lb__video" src={m.cdnUrl} controls playsInline autoPlay preload="metadata" /> : null
                ) : (
                  <img
                    className="lb__img"
                    src={cdn(m.cdnUrl, 1920)}
                    alt=""
                    draggable={false}
                    style={here && zoomed ? { transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` } : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="lb__rail" aria-hidden="true"><span style={{ width: count > 1 ? `${((idx + 1) / count) * 100}%` : '100%' }} /></div>

      <div className="lb__top">
        <span className="lb__counter">{idx + 1} <i>/</i> {count}</span>
        <div className="lb__tools">
          <button className={'lb__btn' + (playing ? ' is-on' : '')} onClick={() => setPlaying(p => !p)} title="Trình chiếu (space)">{playing ? '❚❚' : '▶'}</button>
          <button className={'lb__btn' + (strip ? ' is-on' : '')} onClick={() => setStrip(s => !s)} title="Dải ảnh (T)">▤</button>
          <button className={'lb__btn' + (info ? ' is-on' : '')} onClick={() => setInfo(v => !v)} title="Chi tiết (I)">i</button>
          <button className="lb__btn lb__btn--fs" onClick={toggleFs} title="Toàn màn hình (F)">{fs ? '⤡' : '⤢'}</button>
          <button className="lb__btn lb__btn--close" onClick={onClose} title="Đóng (Esc)">✕</button>
        </div>
      </div>

      {playing && !isVideo && <div key={idx} className="lb__tick" style={{ animationDuration: `${SLIDE_MS}ms` }} />}

      {idx > 0 && <button className="lb__arrow lb__arrow--l" onClick={goPrev} title="Trước (←)">‹</button>}
      {idx < count - 1 && <button className="lb__arrow lb__arrow--r" onClick={goNext} title="Sau (→)">›</button>}

      <div className="lb__caption">
        <span className="lb__cap-title">{item.caption || fmtDateTime(item.effectiveDate) || item.fileName}</span>
        {zoomed && <span className="lb__cap-zoom">{Math.round(zoom * 100)}%</span>}
        <button className="lb__hint" onClick={() => setHelp(h => !h)} title="Phím tắt (?)">?</button>
      </div>

      {strip && (
        <div className="lb__strip" ref={stripRef}>
          {items.map((m, i) => (
            <button key={m.id} data-on={i === idx ? '1' : '0'} className={'lb__thumb' + (i === idx ? ' is-on' : '')} onClick={() => go(i)} aria-label={`Ảnh ${i + 1}`}>
              {m.fileType === 'VIDEO'
                ? <video src={`${m.cdnUrl}#t=0.5`} muted playsInline preload="metadata" />
                : <img src={cdn(m.cdnUrl, 320)} alt="" loading="lazy" draggable={false} />}
            </button>
          ))}
        </div>
      )}

      {info && (
        <div className="lb__panel">
          <div className="lb__panel-head"><span>Chi tiết</span><button className="lb__btn" onClick={() => setInfo(false)}>✕</button></div>
          <dl className="lb__rows">
            {rows.map(([k, v]) => <div key={k} className="lb__row"><dt>{k}</dt><dd>{v}</dd></div>)}
            {rows.length === 0 && <div className="lb__row lb__row--empty">{detailQ.isLoading ? 'Đang tải…' : 'Không có thông tin.'}</div>}
          </dl>
        </div>
      )}

      {help && (
        <div className="lb__help" onClick={() => setHelp(false)}>
          <div className="lb__help-card" onClick={e => e.stopPropagation()}>
            <h3>Phím tắt</h3>
            <ul>
              <li><span className="lb__keys"><kbd>←</kbd><kbd>→</kbd></span><span>Trước / sau</span></li>
              <li><span className="lb__keys"><kbd>Home</kbd><kbd>End</kbd></span><span>Đầu / cuối</span></li>
              <li><span className="lb__keys"><kbd>Space</kbd></span><span>Trình chiếu</span></li>
              <li><span className="lb__keys"><kbd>F</kbd></span><span>Toàn màn hình</span></li>
              <li><span className="lb__keys"><kbd>T</kbd></span><span>Dải ảnh</span></li>
              <li><span className="lb__keys"><kbd>I</kbd></span><span>Chi tiết</span></li>
              <li><span className="lb__keys"><kbd>Esc</kbd></span><span>Lùi ra</span></li>
              <li><span className="lb__keys"><kbd>2×</kbd></span><span>Zoom, kéo để di chuyển</span></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
