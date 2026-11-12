/* What a visitor's own browser remembers: the games they marked as favorites and the ones they opened lately.
   Nothing leaves the browser; there are no accounts. */
import { useSyncExternalStore } from 'react';

const FAVORITES = 'sonic-hub-games.favorites', RECENT = 'sonic-hub-games.recent', LAST = 'sonic-hub-games.last';
const KEEP_RECENT = 24;

function listStore(key: string) {
  let cache: string[] | null = null;
  const subs = new Set<() => void>();
  const read = (): string[] => {
    if (cache) return cache;
    try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); cache = Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; }
    catch { cache = []; }
    return cache!;
  };
  const write = (next: string[]) => {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* a browser that keeps nothing: it lasts until the page closes */ }
    subs.forEach(f => f());
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === key) { cache = null; subs.forEach(f => f()); } });
  return { read, write, subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; } };
}

const fav = listStore(FAVORITES), recent = listStore(RECENT);

// the first version of the portal remembered one game only: carry it over
try {
  const last = localStorage.getItem(LAST);
  if (last) { if (!recent.read().includes(last)) recent.write([last, ...recent.read()]); localStorage.removeItem(LAST); }
} catch { /* nothing to carry */ }

export const toggleFavorite = (key: string) => fav.write(fav.read().includes(key) ? fav.read().filter(k => k !== key) : [key, ...fav.read()]);
export const rememberPlayed = (key: string) => recent.write([key, ...recent.read().filter(k => k !== key)].slice(0, KEEP_RECENT));

/** keys of the favorites, newest first */
export const useFavorites = (): string[] => useSyncExternalStore(fav.subscribe, fav.read, fav.read);
/** keys of the games opened lately, latest first */
export const useRecent = (): string[] => useSyncExternalStore(recent.subscribe, recent.read, recent.read);
