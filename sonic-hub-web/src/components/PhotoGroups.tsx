/* Photos grouped by month with sticky headers; a deep-linkable viewer (?p=<id>); endless scroll. */
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import type { MediaFile } from '../types';
import { monthLabel } from '../lib/date';
import Justified from './Justified';
import Viewer from './Viewer';

export default function PhotoGroups({ items, onOpen }: { items: MediaFile[]; onOpen: (i: number) => void }) {
  const groups = useMemo(() => {
    const g: { label: string; start: number; items: MediaFile[] }[] = [];
    items.forEach((m, i) => { const label = m.effectiveDate ? monthLabel(m.effectiveDate) : 'Không rõ ngày'; const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(m); else g.push({ label, start: i, items: [m] }); });
    return g;
  }, [items]);
  return <>{groups.map(g => <section key={g.label + g.start} className="pgroup"><div className="month">{g.label}<span>{g.items.length}</span></div><Justified items={g.items} rowHeight={200} gap={6} onOpen={(i) => onOpen(g.start + i)} /></section>)}</>;
}

export function useViewer(items: MediaFile[]) {
  const [sp, setSp] = useSearchParams(), p = sp.get('p'), idx = p ? items.findIndex(m => m.id === p) : -1;
  const single = useQuery({ queryKey: ['media', p], queryFn: () => hub.media(p!), enabled: !!p && idx < 0, staleTime: 600_000 });
  const with_ = (fn: (n: URLSearchParams) => void, replace: boolean) => { const n = new URLSearchParams(sp); fn(n); setSp(n, { replace }); };
  const list = idx >= 0 ? items : single.data ? [single.data] : [];
  const open = (i: number) => with_(n => n.set('p', items[i].id), false);
  const close = () => with_(n => n.delete('p'), true);
  const onIndex = (i: number) => { const id = list[i]?.id; if (id && id !== p) with_(n => n.set('p', id), true); };
  const element = p && list.length ? <Viewer key={idx >= 0 ? 'list' : 'single'} items={list} start={Math.max(0, idx)} onClose={close} onIndex={onIndex} /> : null;
  return { open, element };
}

/** Calls `more` when the sentinel scrolls into view. */
export function Sentinel({ more, active }: { more: () => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || !active) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) more(); }, { rootMargin: '800px' });
    io.observe(el); return () => io.disconnect();
  }, [active, more]);
  return <div ref={ref} className="sentinel">{active ? 'Đang tải thêm…' : ''}</div>;
}
