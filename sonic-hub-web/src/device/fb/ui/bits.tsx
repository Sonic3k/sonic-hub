/* Small shared pieces: links that keep the moment, pictures of people, endless lists, the photo viewer. */
import { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent, useContext } from 'react';
import { createPortal } from 'react-dom';
import { LayerHost } from './layer';
import { Link, type LinkProps } from 'react-router-dom';
import { cdn, type Media, type Ref } from '../api';
import { useMoment, withAt } from '../time';
import { IClose, IGroup, INext, IPage, IPlay, IPrev } from './icons';

/** A link that keeps the moment the portal is looking from. */
export function L({ to, ...rest }: Omit<LinkProps, 'to'> & { to: string }) {
  const { at } = useMoment();
  return <Link to={withAt(to, at)} {...rest} />;
}

/** Where a profile lives in the portal: by handle when it has one. */
export const profilePath = (r: Pick<Ref, 'handle' | 'id' | 'key'>) => `/facebook/${encodeURIComponent(r.handle || r.id || r.key || '')}`;

/** A person's name as a link to their profile (plain text for one that is gone). */
export function Name({ r, className }: { r: Ref; className?: string }) {
  if (!r.id || r.state === 'gone' || r.kind === 'CHAT') return <span className={`nm ${className ?? ''}`}>{r.name}</span>;
  return <L className={`nm ${className ?? ''}`} to={profilePath(r)}>{r.name}{r.verified && <Verified />}</L>;
}

const Verified = () => (
  <svg className="verified" viewBox="0 0 16 16" width="12" height="12" aria-label="Verified"><circle cx="8" cy="8" r="8" fill="#4a86f7" /><path d="m4.6 8.2 2.2 2.2 4.6-4.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** The network's blank picture: head and shoulders on grey (a group or page has its own). */
function Blank({ r }: { r?: Pick<Ref, 'kind' | 'gender'> | null }) {
  if (r?.kind === 'GROUP' || r?.kind === 'CHAT') return <span className="blank blank-icon"><IGroup size={22} /></span>;
  if (r?.kind === 'PAGE') return <span className="blank blank-icon"><IPage size={22} /></span>;
  const f = r?.gender === 'FEMALE';
  return (
    <svg className="blank" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="100" height="100" fill="#dfe3ee" />
      {f && <path d="M27 58c-4-22 5-38 23-38s27 16 23 38c-6 3-40 3-46 0Z" fill="#fff" />}
      <circle cx="50" cy="40" r="17" fill="#fff" />
      <path d="M14 100c2-20 17-33 36-33s34 13 36 33Z" fill="#fff" />
    </svg>
  );
}

/** A profile picture: square in the network's style, round in Messenger's. */
export function Avatar({ r, size, round = false, link = true }: { r: Ref | null | undefined; size: number; round?: boolean; link?: boolean }) {
  const [bad, setBad] = useState(false);
  const pic = r?.avatarUrl && !bad
    ? <img src={cdn(r.avatarUrl, size)} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} />
    : <Blank r={r} />;
  const box = <span className={`av ${round ? 'round' : ''}`} style={{ width: size, height: size }}>{pic}</span>;
  if (!link || !r?.id || r.state === 'gone' || r.kind === 'CHAT') return box;
  return <L to={profilePath(r)} className="av-link" aria-label={r.name}>{box}</L>;
}

/** Loads the next page while the end of a list is still below the screen. */
export function Sentinel({ more, onMore }: { more: boolean; onMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!more || !ref.current) return undefined;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) onMore(); }, { rootMargin: '900px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [more, onMore]);
  return <div ref={ref} className="sentinel" aria-hidden="true" />;
}

/* ── The photo viewer ───────────────────────────────────────────────────── */

export interface Shown { items: Media[]; index: number; title?: ReactNode }

/** Photos one at a time over the page: arrows or ← → to move, Esc or the backdrop to close. */
export function Viewer({ shown, onClose }: { shown: Shown | null; onClose: () => void }) {
  const host = useContext(LayerHost);
  const [i, setI] = useState(shown?.index ?? 0);
  useEffect(() => { setI(shown?.index ?? 0); }, [shown]);
  const n = shown?.items.length ?? 0;
  const go = useCallback((d: number) => setI(x => (x + d + n) % n), [n]);
  useEffect(() => {
    if (!shown) return undefined;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', k);
    document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('no-scroll'); };
  }, [shown, go, onClose]);
  if (!shown || !n) return null;
  const m = shown.items[i];
  const stop = (e: MouseEvent) => e.stopPropagation();
  return createPortal(
    <div className="viewer" onClick={onClose} role="dialog" aria-label="Photo">
      <button className="viewer-x" type="button" onClick={onClose} aria-label="Close"><IClose size={22} /></button>
      <div className="viewer-stage" onClick={stop}>
        {m.type === 'VIDEO'
          ? <video src={m.url} poster={m.posterUrl ?? undefined} controls autoPlay playsInline />
          : <img src={cdn(m.url, 1920)} alt={m.caption ?? ''} />}
        {n > 1 && <>
          <button className="viewer-nav prev" type="button" onClick={() => go(-1)} aria-label="Previous"><IPrev size={26} /></button>
          <button className="viewer-nav next" type="button" onClick={() => go(1)} aria-label="Next"><INext size={26} /></button>
        </>}
      </div>
      {(m.caption || shown.title || n > 1) && (
        <div className="viewer-cap" onClick={stop}>
          {shown.title && <div className="viewer-title">{shown.title}</div>}
          {m.caption && <p>{m.caption}</p>}
          {n > 1 && <span className="viewer-count">{i + 1} of {n}</span>}
        </div>
      )}
    </div>, host ?? document.body);
}

/** One photo or video tile (a play mark on videos). */
export function Tile({ m, w, onOpen, more }: { m: Media; w: number; onOpen: () => void; more?: number }) {
  return (
    <button type="button" className="tile" onClick={onOpen}>
      <img src={cdn(m.type === 'VIDEO' ? m.posterUrl ?? m.url : m.url, w)} alt={m.caption ?? ''} loading="lazy" decoding="async" />
      {m.type === 'VIDEO' && <span className="tile-play"><IPlay size={26} /></span>}
      {!!more && <span className="tile-more">+{more}</span>}
    </button>
  );
}

/** The photos of a post laid out the way the network did: one big; two side by side; three or more with a large
 *  first one and the rest beside or under it; more than five end in "+N". */
export function MediaGrid({ media, onOpen }: { media: Media[]; onOpen: (i: number) => void }) {
  if (!media.length) return null;
  if (media.length === 1) {
    const m = media[0], r = m.width && m.height ? m.height / m.width : 0.75;
    return (
      <button type="button" className="grid-one" onClick={() => onOpen(0)} style={{ aspectRatio: `${1 / Math.min(Math.max(r, 0.5), 1.25)}` }}>
        <img src={cdn(m.type === 'VIDEO' ? m.posterUrl ?? m.url : m.url, 960)} alt={m.caption ?? ''} loading="lazy" decoding="async" />
        {m.type === 'VIDEO' && <span className="tile-play"><IPlay size={34} /></span>}
      </button>
    );
  }
  const first = media[0], tall = (first.height ?? 3) > (first.width ?? 4);
  const shown = media.slice(0, 5), extra = media.length - shown.length;
  const cls = media.length === 2 ? 'g2' : media.length === 3 ? (tall ? 'g3 tall' : 'g3') : media.length === 4 ? (tall ? 'g4 tall' : 'g4') : 'g5';
  return (
    <div className={`grid ${cls}`}>
      {shown.map((m, i) => <Tile key={`${m.id}-${i}`} m={m} w={i === 0 ? 640 : 320} onOpen={() => onOpen(i)} more={i === shown.length - 1 ? extra : 0} />)}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading"><span className="spin" />{label}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card empty">{children}</div>;
}
