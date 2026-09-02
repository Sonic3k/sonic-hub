import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/* The open photo lives in the URL as ?p=<id>: Back closes the viewer, a refresh
   reopens the same photo, and a link to it can be shared. Opening pushes one
   history entry; stepping between photos replaces it so Back always closes. */
export default function useLightboxRoute<T extends { id: string }>(items: T[]) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const pushed = useRef(false);
  const [index, setIndex] = useState(-1);
  const pid = params.get('p');

  useEffect(() => {
    if (!pid) { setIndex(-1); pushed.current = false; return; }
    const i = items.findIndex(x => x.id === pid);
    if (i >= 0) setIndex(i);
  }, [pid, items]);

  const write = useCallback((id: string | null, replace: boolean) => {
    const next = new URLSearchParams(params);
    if (id) next.set('p', id); else next.delete('p');
    setParams(next, { replace });
  }, [params, setParams]);

  const open = useCallback((i: number) => {
    const it = items[i]; if (!it) return;
    setIndex(i); pushed.current = true; write(it.id, false);
  }, [items, write]);

  const goTo = useCallback((i: number) => {
    const it = items[i]; if (!it) return;
    setIndex(i); write(it.id, true);
  }, [items, write]);

  const close = useCallback(() => {
    setIndex(-1);
    if (pushed.current) { pushed.current = false; navigate(-1); }
    else write(null, true);
  }, [navigate, write]);

  return { index, pending: !!pid && index < 0, open, goTo, close };
}
