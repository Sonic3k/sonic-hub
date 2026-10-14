import { reduceMotion } from './motion';

export type SwipeDir = 'left' | 'right' | 'up';

export interface SwipeOptions {
  /** dx, dy and how far toward a decision (0–1) — for painting stamps. */
  onDrag?: (dx: number, dy: number, progress: number) => void;
  onSwipe?: (dir: SwipeDir) => void;
  onTap?: () => void;
  enabled?: () => boolean;
  allowUp?: boolean;
}

/**
 * A card that follows the finger with a slight tilt, flings out past a distance or speed threshold
 * and springs back otherwise. Returns fling() for buttons and keys, and a cleanup.
 */
export function makeSwipeable(el: HTMLElement, { onDrag, onSwipe, onTap, enabled = () => true, allowUp = true }: SwipeOptions = {}) {
  type State = { x: number; y: number; dx: number; dy: number; moved: boolean; vx: number; vy: number; lx: number; ly: number; lt: number; id: number };
  let s: State | null = null;
  let raf = 0;
  let gone = false;
  const apply = () => {
    raf = 0;
    if (!s) return;
    el.style.transform = `translate3d(${s.dx}px, ${s.dy}px, 0) rotate(${s.dx * 0.05}deg)`;
    const w = el.offsetWidth || 300;
    onDrag?.(s.dx, s.dy, Math.min(1, Math.abs(s.dx) / (w * 0.3)));
  };
  el.style.touchAction = 'none';

  const down = (e: PointerEvent) => {
    if (gone || !enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest('button, a, input')) return;
    e.preventDefault();
    const now = performance.now();
    s = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: now, id: e.pointerId };
    el.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
  };
  const move = (e: PointerEvent) => {
    if (!s || e.pointerId !== s.id) return;
    s.dx = e.clientX - s.x;
    s.dy = e.clientY - s.y;
    if (!s.moved && Math.hypot(s.dx, s.dy) > 6) s.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - s.lt);
    s.vx = 0.8 * ((e.clientX - s.lx) / dt) + 0.2 * s.vx;
    s.vy = 0.8 * ((e.clientY - s.ly) / dt) + 0.2 * s.vy;
    s.lx = e.clientX;
    s.ly = e.clientY;
    s.lt = now;
    if (s.moved && !raf) raf = requestAnimationFrame(apply);
  };
  const fling = (dir: SwipeDir, from: { dx: number; dy: number } = { dx: 0, dy: 0 }, then?: () => void) => {
    if (gone) return;
    gone = true;
    const tx = dir === 'right' ? innerWidth * 1.2 : dir === 'left' ? -innerWidth * 1.2 : from.dx;
    const ty = dir === 'up' ? -innerHeight : from.dy + 40;
    el.style.transition = reduceMotion() ? 'none' : 'transform .32s cubic-bezier(.3,.6,.4,1), opacity .32s';
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${dir === 'up' ? 0 : (dir === 'right' ? 1 : -1) * 18}deg)`;
    el.style.opacity = '0';
    setTimeout(() => (then ? then() : onSwipe?.(dir)), reduceMotion() ? 0 : 260);
  };
  const release = (e: PointerEvent) => {
    if (!s || e.pointerId !== s.id) return;
    const st = s;
    s = null;
    cancelAnimationFrame(raf);
    raf = 0;
    if (!st.moved) {
      el.style.transform = '';
      onTap?.();
      return;
    }
    const w = el.offsetWidth || 300;
    const h = el.offsetHeight || 400;
    let dir: SwipeDir | null = null;
    if (st.dx > w * 0.3 || (st.vx > 0.55 && st.dx > 30)) dir = 'right';
    else if (st.dx < -w * 0.3 || (st.vx < -0.55 && st.dx < -30)) dir = 'left';
    else if (allowUp && (st.dy < -h * 0.22 || (st.vy < -0.55 && st.dy < -30)) && Math.abs(st.dy) > Math.abs(st.dx)) dir = 'up';
    if (!dir) {
      el.style.transition = reduceMotion() ? 'none' : 'transform .42s cubic-bezier(.2,1.5,.4,1)';
      el.style.transform = '';
      onDrag?.(0, 0, 0);
      return;
    }
    fling(dir, st);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  return {
    /** Throws the card out programmatically (rating buttons); `then` replaces onSwipe. */
    fling: (dir: SwipeDir, then?: () => void) => fling(dir, undefined, then),
    destroy() {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', release);
      el.removeEventListener('pointercancel', release);
    },
  };
}
