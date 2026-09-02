import { useMemo } from 'react';
import type { MediaFile } from '../types';

/* Flickr-style justified rows: fill each row to a target height, then scale
   the row so it spans the full width exactly. The last row keeps the target
   height unless it is nearly full, so a lone photo never balloons. */

export interface Placed<T> { item: T; w: number; h: number }
export interface Row<T> { tiles: Placed<T>[]; h: number }

export function aspectOf(m: MediaFile): number {
  if (m.width && m.height) return m.width / m.height;
  if (m.aspectRatio && m.aspectRatio > 0) return m.aspectRatio;
  return 4 / 3;
}

export function justify<T>(items: T[], aspect: (t: T) => number, width: number, targetH: number, gap: number, lastRowFillMin = 0.8): Row<T>[] {
  if (!width || items.length === 0) return [];
  const rows: Row<T>[] = [];
  let cur: T[] = [];
  let curW = 0;                       // width of row at target height, without gaps

  const flush = (last: boolean) => {
    if (!cur.length) return;
    const gaps = gap * (cur.length - 1);
    const avail = width - gaps;
    let h = (avail / curW) * targetH;
    if (last && h > targetH && curW / avail < lastRowFillMin) h = targetH;   // sparse last row: keep natural size
    const tiles: Placed<T>[] = cur.map(item => ({ item, w: aspect(item) * h, h }));
    // absorb rounding so the row is pixel-exact
    if (!(last && h === targetH)) {
      const sum = tiles.reduce((s, t) => s + t.w, 0);
      tiles[tiles.length - 1].w += avail - sum;
    }
    rows.push({ tiles, h });
    cur = []; curW = 0;
  };

  for (const it of items) {
    const w = Math.max(0.2, aspect(it)) * targetH;
    if (cur.length && curW + w + gap * cur.length > width) {
      // Overshooting or stopping short: take whichever lands nearer the edge,
      // so rows shrink and grow around the target instead of only growing.
      const under = width - (curW + gap * (cur.length - 1));
      const over = curW + w + gap * cur.length - width;
      if (over < under) { cur.push(it); curW += w; flush(false); continue; }
      flush(false);
    }
    cur.push(it); curW += w;
  }
  flush(true);
  return rows;
}

/** Target row height by viewport: taller rows on wide screens, denser on phones. */
export function rowHeightFor(width: number) {
  if (width < 480) return 150;
  if (width < 900) return 210;
  if (width < 1400) return 280;
  return 340;
}

export default function useJustifiedLayout(items: MediaFile[], width: number, gap = 4, targetH?: number) {
  return useMemo(() => justify(items, aspectOf, width, targetH ?? rowHeightFor(width), gap), [items, width, gap, targetH]);
}
