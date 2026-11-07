/* The files the machines use that are not his own — a program's skin, its emoticons and sounds — kept on the server
   as assets of a folder (GET /api/desk/assets?folder=yahoo), each by the name it has there ("skin/images/online.png").
   Until they have come (or when one is missing) a part shows nothing rather than a stand-in. */
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { get } from '../api/client';

interface AssetOut { url: string; fileName: string; width?: number | null; height?: number | null }

export type AssetMap = Record<string, { url: string; w?: number | null; h?: number | null }>;

const load = async (folder: string): Promise<AssetMap> => {
  const list = await get<AssetOut[]>('/desk/assets', { folder });
  return Object.fromEntries(list.map(a => [a.fileName, { url: a.url.split('?')[0], w: a.width, h: a.height }]));
};

/** The assets of a folder by name; a(name) is the file's address (undefined until known). */
export function useAssets(folder: string) {
  const q = useQuery({ queryKey: ['desk-assets', folder], queryFn: () => load(folder), staleTime: Infinity, gcTime: Infinity, retry: 1 });
  const map = q.data;
  const a = useCallback((name: string) => map?.[name]?.url, [map]);
  return { a, map, ready: !!map };
}

/** A sound of a folder, played once (a browser may refuse before the page was clicked; then it stays silent). */
export function play(url: string | undefined, volume = 0.8) {
  if (!url) return;
  try {
    const au = new Audio(url);
    au.volume = volume;
    void au.play().catch(() => undefined);
  } catch { /* no audio here */ }
}
