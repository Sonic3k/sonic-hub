import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../api/angels';
import JustifiedGallery from '../../components/gallery/JustifiedGallery';
import Lightbox from '../../components/gallery/Lightbox';
import useContainerWidth from '../../hooks/useContainerWidth';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';
import useLightboxRoute from '../../hooks/useLightboxRoute';
import { monthKey, monthLabel, plural } from '../../lib/format';
import type { MediaFile } from '../../types';
import PhotosNav from './PhotosNav';
import TimelineScrubber, { type MonthRef } from './TimelineScrubber';

const PAGE = 60;
const HEAD_OFFSET = 72;   // px from the top of the viewport where a month header "counts"

interface Section { key: string; label: string; items: MediaFile[] }

/* Every photograph, newest first, cut into months. The list is a window of
   pages that can grow at either end; the scrubber moves the window to the
   page a month begins on (its offset is the sum of the newer buckets), then
   scrolls to that month's header. */
export default function TimelinePage() {
  const indexQ = useQuery({ queryKey: ['timeline-index'], queryFn: api.timelineIndex, staleTime: 10 * 60_000 });

  const months = useMemo<MonthRef[]>(() => {
    let acc = 0;
    return (indexQ.data ?? []).map(b => {
      const m: MonthRef = { ...b, key: `${b.year}-${String(b.month).padStart(2, '0')}`, offset: acc };
      acc += b.count;
      return m;
    });
  }, [indexQ.data]);
  const total = useMemo(() => months.reduce((s, m) => s + m.count, 0), [months]);

  const [anchor, setAnchor] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const q = useInfiniteQuery({
    queryKey: ['media', 'timeline', anchor],
    queryFn: ({ pageParam }) => api.search({ page: pageParam, size: PAGE, sortBy: 'effectiveDate', sortDir: 'desc' }),
    initialPageParam: anchor,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
    getPreviousPageParam: first => (first.number > 0 ? first.number - 1 : undefined),
  });

  const items = useMemo<MediaFile[]>(() => {
    const seen = new Set<string>();
    return (q.data?.pages ?? []).flatMap(p => p.content).filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [q.data]);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    for (const m of items) {
      const key = monthKey(m.effectiveDate) ?? 'undated';
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, label: key === 'undated' ? 'Không rõ ngày' : monthLabel(Number(key.slice(0, 4)), Number(key.slice(5, 7))), items: [m] });
    }
    return out;
  }, [items]);

  /* ── grow downward ─────────────────────────────────────────────────────── */
  const loadNext = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) return q.fetchNextPage();
    return undefined;
  }, [q]);
  useInfiniteScroll(loadNext, { enabled: !!q.hasNextPage });

  /* ── grow upward, keeping what is on screen where it is ────────────────── */
  const topRef = useRef<HTMLDivElement>(null);
  const prepend = useRef<{ h: number; y: number } | null>(null);
  const loadPrev = useCallback(() => {
    if (!q.hasPreviousPage || q.isFetchingPreviousPage || prepend.current) return;
    prepend.current = { h: document.documentElement.scrollHeight, y: window.scrollY };
    q.fetchPreviousPage();
  }, [q]);

  useLayoutEffect(() => {
    if (!prepend.current || q.isFetchingPreviousPage) return;
    const { h, y } = prepend.current; prepend.current = null;
    window.scrollTo(0, y + (document.documentElement.scrollHeight - h));
  }, [q.data, q.isFetchingPreviousPage]);

  useEffect(() => {
    const el = topRef.current; if (!el || !q.hasPreviousPage) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) loadPrev(); }, { rootMargin: '400px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadPrev, q.hasPreviousPage]);

  /* ── which month is at the top of the screen ───────────────────────────── */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const heads = Array.from(document.querySelectorAll<HTMLElement>('[data-month]'));
      let best: string | null = null, bestTop = -Infinity;
      for (const h of heads) {
        const t = h.getBoundingClientRect().top;
        if (t <= HEAD_OFFSET + 8 && t > bestTop) { bestTop = t; best = h.dataset.month ?? null; }
      }
      setActive(best ?? heads[0]?.dataset.month ?? null);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [sections]);

  /* ── jump ──────────────────────────────────────────────────────────────── */
  const jump = useCallback((key: string) => {
    const m = months.find(x => x.key === key); if (!m) return;
    setTarget(key);
    setAnchor(Math.floor(m.offset / PAGE));
  }, [months]);

  useEffect(() => {
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-month="${target}"]`);
    if (!el) return;                                   // window not loaded yet; runs again when sections change
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEAD_OFFSET });
    setTarget(null);
  }, [target, sections]);

  const lb = useLightboxRoute(items);
  const { ref: colRef, width } = useContainerWidth<HTMLDivElement>();
  const offsetOf = useMemo(() => { const o = new Map<string, number>(); let n = 0; for (const s of sections) { o.set(s.key, n); n += s.items.length; } return o; }, [sections]);
  const span = months.length ? `${months[months.length - 1].year} → ${months[0].year}` : null;

  return (
    <div className="pr-8 md:pr-12">
      <PhotosNav />
      <h1 className="font-display text-[clamp(26px,5.5vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]">Dòng thời gian</h1>
      <p className="mt-2 text-[14px] text-ink2">{[plural(total || null, 'ảnh'), span].filter(Boolean).join(' · ') || '\u00A0'}</p>

      <div ref={colRef} className="mt-6">
        {q.hasPreviousPage && (
          <div ref={topRef} className="py-4 text-center text-[13px] text-ink2">{q.isFetchingPreviousPage ? 'Đang tải…' : 'Kéo lên để xem mới hơn'}</div>
        )}

        {sections.map(s => (
          <section key={s.key} className="mb-8">
            <h2 data-month={s.key} className="mb-3 flex items-baseline gap-2 font-display text-[19px] font-bold tracking-[-0.02em]">
              {s.label}<span className="text-[13px] font-medium text-ink2">{s.items.length}</span>
            </h2>
            {width > 0 && <JustifiedGallery items={s.items} width={width} onOpen={i => lb.open((offsetOf.get(s.key) ?? 0) + i)} />}
          </section>
        ))}

        {(q.isLoading || (target && !sections.length)) && <p className="py-10 text-center text-[13px] text-ink2">Đang tải…</p>}
        {q.isFetchingNextPage && <p className="py-6 text-center text-[13px] text-ink2">Đang tải thêm…</p>}
        {!q.isLoading && items.length === 0 && <p className="py-10 text-center text-[14px] text-ink2">Chưa có ảnh nào.</p>}
      </div>

      <TimelineScrubber months={months} activeKey={active} onJump={jump} />

      {lb.index >= 0 && items[lb.index] && (
        <Lightbox items={items} index={lb.index} onIndex={lb.goTo} onClose={lb.close} onReachEnd={loadNext} />
      )}
    </div>
  );
}
