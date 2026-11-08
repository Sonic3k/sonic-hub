/* What the screen showed when the machine was left alone, as each Windows did: the stars flying by on Windows 98, the
   pictures going by one after another on XP (the logo floating about when there were none), the slow-moving photos of
   Vista and Windows 7, and on 8.1, 10 and 11 the lock screen with its clock, its pictures taking turns. The pictures
   are the machine's own (its screensaver rows); the mouse or a key brings the desktop back (a click or a key from a
   lock screen). */
import { useEffect, useRef, useState } from 'react';
import type { Machine, Wallpaper as Wp } from '../api';
import { clockText, longDate } from '../moment';
import { Mark } from '../glyphs';
import { useAssets } from '../assets';
import { Wallpaper } from '../wallpapers';
import { useTick } from './desk';

export type SaverKind = 'stars' | 'slides' | 'logo' | 'photos' | 'lock';

export function saverKind(skin: string, m: Machine): SaverKind {
  if (skin === 'w98') return 'stars';
  if (skin === 'xp') return m.screen?.length ? 'slides' : 'logo';
  if (skin === 'vista' || skin === 'w7') return 'photos';
  return 'lock';
}

/** Left alone this long, the machine goes to its screensaver (?idle=<seconds> to change it). */
export const IDLE_MS = (() => {
  const s = Number(new URLSearchParams(window.location.search).get('idle'));
  return s > 0 ? s * 1000 : 60_000;
})();

export function Screensaver({ kind, machine, skin, T, onWake }: { kind: SaverKind; machine: Machine; skin: string; T: Date; onWake: () => void }) {
  const pics = machine.screen?.length ? machine.screen : [kind === 'lock' ? machine.lock ?? machine.wallpaper : machine.wallpaper].filter((w): w is Wp => !!w);
  const at = useRef<{ x: number; y: number } | null>(null);

  // a screensaver goes at the first real move of the mouse; a lock screen waits for a click or a key. Nothing under
  // it gets the key or the click that wakes it (it goes on the click, so the press and release both land here).
  useEffect(() => {
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const wake = (e: Event) => { stop(e); onWake(); };
    const move = (e: PointerEvent) => {
      if (kind === 'lock' || e.pointerType === 'touch') return;
      if (!at.current) { at.current = { x: e.clientX, y: e.clientY }; return; }
      if (Math.abs(e.clientX - at.current.x) + Math.abs(e.clientY - at.current.y) > 6) onWake();
    };
    const opts = { capture: true, passive: false } as const;
    window.addEventListener('keydown', wake, opts);
    window.addEventListener('pointerdown', stop, opts);
    window.addEventListener('click', wake, opts);
    window.addEventListener('wheel', wake, opts);
    window.addEventListener('pointermove', move, opts);
    return () => {
      window.removeEventListener('keydown', wake, opts);
      window.removeEventListener('pointerdown', stop, opts);
      window.removeEventListener('click', wake, opts);
      window.removeEventListener('wheel', wake, opts);
      window.removeEventListener('pointermove', move, opts);
    };
  }, [kind, onWake]);

  return (
    <div className={`dv-saver dv-saver-${kind}`} onClick={e => e.stopPropagation()} role="presentation">
      {kind === 'stars' && <Stars />}
      {kind === 'logo' && <FloatingLogo />}
      {kind === 'slides' && <Slides pics={pics} every={7000} fit="FIT" />}
      {kind === 'photos' && <Slides pics={pics} every={8000} moving />}
      {kind === 'lock' && <Lock pics={pics} T={T} mid={skin === 'w11'} />}
    </div>
  );
}

/** The pictures one after another, each fading into the next; the slide after the current one is already loading. */
function Slides({ pics, every, fit, moving }: { pics: Wp[]; every: number; fit?: 'FIT'; moving?: boolean }) {
  const [i, setI] = useState(0);
  const n = pics.length;
  useEffect(() => {
    if (n < 2) return;
    const id = window.setInterval(() => setI(x => (x + 1) % n), every);
    return () => window.clearInterval(id);
  }, [n, every]);
  if (!n) return null;
  const shown = [...new Set([(i + n - 1) % n, i, (i + 1) % n])];
  return (
    <>
      {shown.map(k => (
        <div key={k} className={`dv-slide ${k === i ? 'on' : ''} ${moving ? `kb kb${k % 4}` : ''}`} style={moving ? { animationDuration: `${every * 2}ms` } : undefined}>
          <Wallpaper wp={fit ? { ...pics[k], fit, color: '#000' } : pics[k]} />
        </div>
      ))}
    </>
  );
}

function Lock({ pics, T, mid }: { pics: Wp[]; T: Date; mid: boolean }) {
  const now = useTick(T, 5000);
  return (
    <div className="dv-lock">
      <Slides pics={pics} every={12000} />
      <div className={`dv-lock-time ${mid ? 'mid' : ''}`}>
        <b>{clockText(now, true)}</b>
        <span>{longDate(now).replace(/, \d{4}$/, '')}</span>
      </div>
    </div>
  );
}

/** Windows 98's Starfield: stars coming at you from the middle of the screen. */
function Stars() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    const W = (cv.width = cv.offsetWidth), H = (cv.height = cv.offsetHeight);
    const stars = Array.from({ length: 260 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff';
      for (const s of stars) {
        s.z -= dt * 0.32;
        if (s.z <= 0.02) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
        const px = W / 2 + (s.x / s.z) * W * 0.5, py = H / 2 + (s.y / s.z) * H * 0.5;
        if (px < 0 || px > W || py < 0 || py > H) { s.z = 0; continue; }
        const r = Math.max(1, (1 - s.z) * 3);
        g.fillRect(px, py, r, r);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="dv-stars" />;
}

/** XP's own screensaver when there were no pictures: the logo turning up here and there on black (its own once the
 *  files have come). */
function FloatingLogo() {
  const xp = useAssets('xp');
  const flag = xp.a('icon/windows-logo-48.png'), word = xp.a('logo/wordmark-white.svg');
  const [p, setP] = useState({ x: 30, y: 30, k: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setP(o => ({ x: 6 + Math.random() * 62, y: 8 + Math.random() * 70, k: o.k + 1 })), 5000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div key={p.k} className="dv-xplogo" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
      {flag && word ? <span className="dv-lxp-logo"><img src={flag} alt="" /><img src={word} alt="" /></span> : <><Mark size={64} /><b>Sonic3k</b><sup>xp</sup></>}
    </div>
  );
}
