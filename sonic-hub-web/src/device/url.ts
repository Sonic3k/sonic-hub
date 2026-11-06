/* The machines keep their state in the address (?at=, ?scene=) without a router of their own, so the sites shown
   inside them (Facebook) can run their own. Back and Forward move through the moments visited. */
import { useCallback, useEffect, useState } from 'react';

export function useUrlParams(): [URLSearchParams, (p: Record<string, string>, replace?: boolean) => void] {
  const [sp, setSp] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const on = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const set = useCallback((p: Record<string, string>, replace = false) => {
    const next = new URLSearchParams(p);
    const url = `${window.location.pathname}${next.toString() ? `?${next}` : ''}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
    setSp(next);
  }, []);
  return [sp, set];
}
