/* The years as a constellation: one star per year, brighter when more happened. */
import { useEffect, useRef } from 'react';

const ZIG = [24, 52, 34, 62, 40, 22, 56, 30, 66, 44, 26, 58, 36, 64, 28, 50, 34, 60, 42, 30, 54];

export default function YearRail({ years, counts, active, onPick }: { years: number[]; counts: Record<number, number>; active: number; onPick: (y: number) => void }) {
  const box = useRef<HTMLDivElement>(null), line = useRef<SVGPolylineElement>(null), svg = useRef<SVGSVGElement>(null);
  const max = Math.max(1, ...years.map(y => counts[y] ?? 0));
  useEffect(() => {
    const draw = () => {
      const el = box.current; if (!el || !line.current || !svg.current) return;
      const r0 = el.getBoundingClientRect();
      svg.current.setAttribute('width', String(r0.width)); svg.current.setAttribute('height', String(el.scrollHeight));
      line.current.setAttribute('points', [...el.querySelectorAll<HTMLElement>('.yr-star')].map(s => { const r = s.getBoundingClientRect(); return `${(r.left - r0.left + r.width / 2).toFixed(1)},${(r.top - r0.top + r.height / 2).toFixed(1)}`; }).join(' '));
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(draw));
    addEventListener('resize', draw); document.fonts?.ready.then(draw);
    return () => { cancelAnimationFrame(id); removeEventListener('resize', draw); };
  }, [years.join(), active]);
  return (
    <nav className="year-rail" aria-label="Các năm">
      <div className="yr-in" ref={box}>
        <svg ref={svg} className="yr-links" aria-hidden="true">
          <defs><linearGradient id="yrl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B9A6FF" stopOpacity=".55" /><stop offset=".5" stopColor="#8BE7F0" stopOpacity=".35" /><stop offset="1" stopColor="#FFE1A0" stopOpacity=".5" /></linearGradient>
            <filter id="yrg"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <polyline ref={line} fill="none" stroke="url(#yrl)" strokeWidth="1" filter="url(#yrg)" />
        </svg>
        {years.map((y, i) => (
          <button key={y} type="button" className="yrb" aria-pressed={y === active} onClick={() => y !== active && onPick(y)}
            style={{ ['--x' as string]: ZIG[i % ZIG.length] + 'px', ['--w' as string]: ((counts[y] ?? 0) / max).toFixed(3), ['--i' as string]: i }}>
            <span className="yr-star" /><span className="yr-halo" /><span className="yr-full">{y}</span><span className="yr-short">'{String(y).slice(2)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
