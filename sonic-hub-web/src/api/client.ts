import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const http = axios.create({ baseURL: `${API_URL}/api`, timeout: 30_000 });

/* Bunny resizes on the fly via ?width=. Snapping to a few buckets means the
   CDN caches a handful of variants per photo instead of one per viewport. */
export const IMG_WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;
export const snapWidth = (w: number) => IMG_WIDTHS.find(b => w <= b) ?? IMG_WIDTHS[IMG_WIDTHS.length - 1];

export function cdn(url: string | null | undefined, width?: number): string {
  if (!url) return '';
  const clean = url.split('?')[0];
  return width ? `${clean}?width=${snapWidth(width)}` : clean;
}
