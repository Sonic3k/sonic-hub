import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import clsx from 'clsx';
import { monthLabel } from '../../lib/format';
import type { TimelineBucket } from '../../types';

export interface MonthRef extends TimelineBucket { key: string; offset: number }

interface Props {
  months: MonthRef[];          // newest first
  activeKey: string | null;
  onJump: (key: string) => void;
}

interface YearBlock { year: number; count: number; months: MonthRef[] }

/* The rail on the right edge: every year gets height in proportion to how
   much was photographed in it, so a heavy year is easy to land on and a thin
   one still gets a label. Hovering names the month under the pointer; a
   click or a drag-release jumps there. */
export default function TimelineScrubber({ months, activeKey, onJump }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ y: number; key: string; label: string } | null>(null);
  const dragging = useRef(false);

  const years = useMemo<YearBlock[]>(() => {
    const out: YearBlock[] = [];
    for (const m of months) {
      const last = out[out.length - 1];
      if (last && last.year === m.year) { last.count += m.count; last.months.push(m); }
      else out.push({ year: m.year, count: m.count, months: [m] });
    }
    return out;
  }, [months]);

  const total = useMemo(() => months.reduce((s, m) => s + m.count, 0), [months]);
  const activeYear = activeKey ? Number(activeKey.slice(0, 4)) : null;

  /* Map a pointer y to the month whose share of the rail contains it. Blocks
     are laid out by the same proportional flex as the DOM, so read the DOM. */
  const monthAt = (clientY: number): MonthRef | null => {
    const rail = railRef.current; if (!rail) return null;
    const blocks = Array.from(rail.querySelectorAll<HTMLElement>('[data-year]'));
    for (const b of blocks) {
      const r = b.getBoundingClientRect();
      if (clientY < r.top || clientY > r.bottom) continue;
      const yb = years.find(y => String(y.year) === b.dataset.year); if (!yb) return null;
      const frac = (clientY - r.top) / Math.max(1, r.height);
      let acc = 0;
      for (const m of yb.months) { acc += m.count / yb.count; if (frac <= acc) return m; }
      return yb.months[yb.months.length - 1];
    }
    return null;
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const m = monthAt(e.clientY);
    const rail = railRef.current;
    if (!m || !rail) { setHover(null); return; }
    setHover({ y: e.clientY - rail.getBoundingClientRect().top, key: m.key, label: monthLabel(m.year, m.month) });
    if (dragging.current) onJump(m.key);
  };

  if (!months.length || total === 0) return null;

  return (
    <div
      ref={railRef}
      className="fixed bottom-6 right-1.5 top-28 z-20 flex w-9 select-none flex-col touch-none md:right-3 md:top-20 md:w-11"
      onPointerMove={onMove}
      onPointerLeave={() => { setHover(null); dragging.current = false; }}
      onPointerDown={e => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); onMove(e); const m = monthAt(e.clientY); if (m) onJump(m.key); }}
      onPointerUp={() => { dragging.current = false; }}
      role="navigation"
      aria-label="Nhảy tới năm"
    >
      {years.map(y => (
        <div
          key={y.year}
          data-year={y.year}
          className="relative flex min-h-[18px] items-start justify-end pr-1"
          style={{ flex: `${y.count} 1 0` }}
        >
          <span className={clsx(
            'text-[11px] font-semibold tabular-nums leading-none transition-colors',
            activeYear === y.year ? 'text-ink' : 'text-ink2/70 hover:text-ink2',
          )}>{y.year}</span>
          {/* month ticks, desktop only */}
          <div className="absolute inset-y-0 right-0 hidden w-1 flex-col md:flex">
            {y.months.map(m => (
              <span key={m.key} className={clsx('w-full', m.key === activeKey ? 'bg-ink' : 'bg-line')}
                style={{ flex: `${m.count} 1 0`, marginBottom: 1 }} />
            ))}
          </div>
        </div>
      ))}

      {hover && (
        <div
          className="pointer-events-none absolute right-full mr-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] font-semibold text-bg shadow-md"
          style={{ top: hover.y }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}
