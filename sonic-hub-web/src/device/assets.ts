/* The files the machines use that are not his own — a program's skin, its emoticons and sounds — kept on the server
   as assets of a folder (GET /api/desk/assets?folder=yahoo), each by the name it has there ("skin/images/online.png").
   Until they have come (or when one is missing) a part shows nothing rather than a stand-in. Pictures and sounds can
   be fetched ahead (preload.ts), so a screen has them when it opens. */
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { get } from '../api/client';

interface AssetOut { url: string; fileName: string; width?: number | null; height?: number | null }

export type AssetMap = Record<string, { url: string; w?: number | null; h?: number | null }>;

/** A folder's files by name (the query every part shares: ['desk-assets', folder]). */
const load = async (folder: string): Promise<AssetMap> => {
  const list = await get<AssetOut[]>('/desk/assets', { folder });
  return Object.fromEntries(list.map(a => [a.fileName, { url: a.url.split('?')[0], w: a.width, h: a.height }]));
};
export const assetsQuery = (folder: string) => ({ queryKey: ['desk-assets', folder], queryFn: () => load(folder), staleTime: Infinity, gcTime: Infinity, retry: 1 });

/** The assets of a folder by name; a(name) is the file's address (undefined until known). */
export function useAssets(folder: string) {
  const q = useQuery(assetsQuery(folder));
  const map = q.data;
  const a = useCallback((name: string) => map?.[name]?.url, [map]);
  return { a, map, ready: !!map };
}

/* pictures asked for ahead: kept (so the browser keeps them decoded) and asked for once */
const pictures = new Map<string, HTMLImageElement>();
export function preloadImages(urls: (string | undefined)[]) {
  for (const u of urls) {
    if (!u || pictures.has(u)) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = u;
    pictures.set(u, im);
  }
}

/* sounds loaded ahead, played from what is loaded */
const sounds = new Map<string, HTMLAudioElement>();
export function preloadSound(url: string | undefined) {
  if (!url || sounds.has(url)) return;
  try {
    const au = new Audio();
    au.preload = 'auto';
    au.src = url;
    au.load();
    sounds.set(url, au);
  } catch { /* no audio here */ }
}

/** A sound of a folder, played once — the loaded one when it is free, else a fresh one (a browser may refuse before
 *  the page was clicked; then it stays silent). */
export function play(url: string | undefined, volume = 0.8) {
  if (!url) return;
  try {
    const ready = sounds.get(url);
    const au = ready && ready.paused ? ready : new Audio(url);
    if (au === ready) au.currentTime = 0;
    au.volume = volume;
    void au.play().catch(() => undefined);
  } catch { /* no audio here */ }
}
