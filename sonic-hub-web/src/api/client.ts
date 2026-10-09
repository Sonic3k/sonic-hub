const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

type Params = Record<string, string | number | boolean | string[] | undefined | null>;

function qs(params?: Params): string {
  if (!params) return '';
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach(x => u.append(k, x)); else u.append(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const apiUrl = (path: string) => `${API}/api${path}`;

export async function get<T>(path: string, params?: Params): Promise<T> {
  const r = await fetch(`${API}/api${path}${qs(params)}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json() as Promise<T>;
}

/* Bunny resizes on the fly via ?width=; snapping to a few widths keeps the CDN cache small. */
const WIDTHS = [160, 320, 640, 960, 1280, 1920];
export function cdn(url: string | null | undefined, width?: number): string {
  if (!url) return '';
  const clean = url.split('?')[0];
  if (!width) return clean;
  const w = WIDTHS.find(b => width * (window.devicePixelRatio > 1 ? 1.5 : 1) <= b) ?? 1920;
  return `${clean}?width=${w}`;
}

/* The picture of a media file: its thumbnail, or with full the file itself (cdn() sizes either). A Flash card or a
   recording is shown by its poster (none without one: ''); a video with a poster by that. */
export function pic(m: { fileType?: string; cdnUrl?: string | null; thumbnailUrl?: string | null; posterUrl?: string | null } | null | undefined, full = false): string {
  if (!m) return '';
  if (m.fileType === 'FLASH' || m.fileType === 'AUDIO') return m.posterUrl ?? '';
  if (m.fileType === 'VIDEO' && m.posterUrl) return full ? m.posterUrl : m.thumbnailUrl ?? m.posterUrl;
  return (full ? m.cdnUrl : m.thumbnailUrl ?? m.cdnUrl) ?? '';
}
