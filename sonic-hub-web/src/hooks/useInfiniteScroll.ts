import { useEffect, useRef } from 'react';

/** Calls `load` when the page scrolls near the bottom; one call in flight at a time. */
export default function useInfiniteScroll(load: () => unknown, opts: { threshold?: number; enabled?: boolean } = {}) {
  const { threshold = 800, enabled = true } = opts;
  const busy = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      if (busy.current) return;
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - threshold) return;
      busy.current = true;
      Promise.resolve(load()).finally(() => { busy.current = false; });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [load, threshold, enabled]);
}
