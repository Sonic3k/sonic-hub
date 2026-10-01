/* Hyperspace jump between any two places in the universe. The overlay streaks the stars
   out from the center, the destination swaps in behind a flash, then the stars decelerate
   into the new sky. Used for: changing year, random day, tag worlds, warp gates. */
import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';

interface WarpOpts { tint?: string; duration?: number }
const Ctx = createContext<(go: () => void, o?: WarpOpts) => void>((go) => go());
export const useWarp = () => useContext(Ctx);

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function WarpProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null), busy = useRef(false);
  const warp = useCallback((go: () => void, o: WarpOpts = {}) => {
    const cv = ref.current; if (!cv || busy.current) { go(); return; }
    busy.current = true;
    const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.display = 'block';
    const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tint = o.tint ?? '#B9A6FF', D = reduce ? 420 : (o.duration ?? 1350), cx = W / 2, cy = H * .48, maxR = Math.hypot(W, H) * .6;
    const ps = Array.from({ length: reduce ? 0 : 560 }, () => ({ a: Math.random() * Math.PI * 2, r: 4 + Math.random() * maxR * .55, w: .5 + Math.random() * 1.6, c: Math.random() < .25 ? tint : '#FFFFFF' }));
    const root = document.documentElement; root.dataset.warp = 'in';
    const t0 = performance.now(); let swapped = false;
    const step = (now: number) => {
      // rAF timestamps can precede t0 (frame start < call time): clamp, or Math.pow(negative, frac) → NaN
      const p = Math.max(0, Math.min(1, (now - t0) / D));
      ctx.clearRect(0, 0, W, H);
      const cover = p < .42 ? Math.pow(p / .42, 1.6) : p < .58 ? 1 : 1 - Math.pow((p - .58) / .42, .8);
      ctx.fillStyle = `rgba(3,2,14,${(cover * .94).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * (.25 + p * .6));
      glow.addColorStop(0, tint + Math.round(Math.min(1, cover) * 110).toString(16).padStart(2, '0')); glow.addColorStop(1, tint + '00');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      const speed = p < .5 ? Math.pow(p / .5, 2.2) : Math.pow(1 - (p - .5) / .5, 1.6);
      for (const s of ps) {
        const r1 = s.r * (1 + speed * 7 + p * 2), r0 = r1 - (8 + speed * 260) * (s.r / maxR + .25);
        const x0 = cx + Math.cos(s.a) * Math.max(0, r0), y0 = cy + Math.sin(s.a) * Math.max(0, r0), x1 = cx + Math.cos(s.a) * r1, y1 = cy + Math.sin(s.a) * r1;
        ctx.strokeStyle = s.c; ctx.globalAlpha = Math.min(1, .25 + speed) * (p < .9 ? 1 : (1 - p) * 10); ctx.lineWidth = s.w * (1 + speed);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (p > .44 && p < .62) { const fl = 1 - Math.abs(p - .53) / .09; ctx.fillStyle = `rgba(255,255,255,${(fl * .55).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      if (!swapped && p >= .46) { swapped = true; go(); root.dataset.warp = 'out'; }
      if (p < 1) requestAnimationFrame(step);
      else { cv.style.display = 'none'; delete root.dataset.warp; busy.current = false; }
    };
    requestAnimationFrame(step);
  }, []);
  return <Ctx.Provider value={warp}>{children}<canvas ref={ref} className="warp-layer" aria-hidden="true" /></Ctx.Provider>;
}
