/* Going to a place on a page that is still filling in: the year a picked day falls in, on a list that loads late. */
import { useEffect } from 'react';

/** Brings the element with this id to the top once `ready`, and twice more as what loads above it settles —
 *  unless he has started moving through the page himself. Nothing happens while id is empty. */
export function useGoTo(id: string, ready = true) {
  useEffect(() => {
    if (!id || !ready) return;
    let moved = false;
    const on = () => { moved = true; };
    window.addEventListener('wheel', on, { passive: true }); window.addEventListener('touchmove', on, { passive: true }); window.addEventListener('keydown', on);
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = () => { if (!moved) document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); };
    go();
    const timers = [setTimeout(go, 800), setTimeout(go, 2200)];
    return () => { timers.forEach(clearTimeout); window.removeEventListener('wheel', on); window.removeEventListener('touchmove', on); window.removeEventListener('keydown', on); };
  }, [id, ready]);
}
