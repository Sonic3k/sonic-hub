/* A shelf of any length drawn at the cost of one screenful: only the rows in and near the window exist in the page,
   each cell placed by arithmetic. The page keeps its real height, so the scrollbar, "back to where I was" and jumping
   to a letter all behave as if every game were there. */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Game } from './catalog';
import type { View } from './shelf';

export interface GridHandle {
  /** bring the game at `index` to the top of the window, `clear` px below it (the bars that stay in place) */
  scrollTo(index: number, clear: number): void;
}
interface Props {
  items: Game[];
  view: View;
  children: (game: Game, index: number) => ReactNode;
}

const GAP = 18, MIN = 164, NARROW_MIN = 150, LIST_ROW = 46, NEAR = 700;
/** a tile's height for its width: the picture keeps its shape, the words below take a fixed block (see .tile in styles.css) */
export const tileHeight = (width: number) => Math.round((width - 16) * 0.625) + 16 + 84;

export const VirtualGrid = forwardRef<GridHandle, Props>(function VirtualGrid({ items, view, children }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);

  const list = view === 'list', narrow = width < 520;
  const gap = list ? 0 : narrow ? 12 : GAP;
  const cols = list ? 1 : Math.max(2, Math.floor((width + gap) / ((narrow ? NARROW_MIN : MIN) + gap)));
  const cellW = width ? (width - gap * (cols - 1)) / cols : 0;
  const cellH = list ? LIST_ROW : tileHeight(cellW);
  const rowH = cellH + (list ? 0 : gap + 6);
  const rows = Math.ceil(items.length / cols);

  useLayoutEffect(() => {
    const node = el.current!;
    const ro = new ResizeObserver(() => setWidth(node.clientWidth));
    ro.observe(node); setWidth(node.clientWidth);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!width) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = el.current!.getBoundingClientRect();
      const first = Math.max(0, Math.floor((-rect.top - NEAR) / rowH));
      const last = Math.min(rows, Math.ceil((-rect.top + window.innerHeight + NEAR) / rowH));
      setRange(r => (r[0] === first && r[1] === last ? r : [first, last]));
    };
    const soon = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
    return () => { window.removeEventListener('scroll', soon); window.removeEventListener('resize', soon); if (frame) cancelAnimationFrame(frame); };
  }, [width, rowH, rows]);

  useImperativeHandle(ref, () => ({
    scrollTo(index, clear) {
      const rect = el.current!.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top + Math.floor(index / cols) * rowH - clear - 14, behavior: 'instant' });
    },
  }), [cols, rowH]);

  const cells: ReactNode[] = [];
  for (let i = range[0] * cols, end = Math.min(items.length, range[1] * cols); i < end; i++) {
    const x = (i % cols) * (cellW + gap), y = Math.floor(i / cols) * rowH;
    cells.push(<div className="vcell" role="listitem" key={items[i].key} style={{ transform: `translate(${x}px, ${y}px)`, width: cellW, height: cellH }}>{children(items[i], i)}</div>);
  }
  return <div className={`vgrid vgrid-${view}`} role="list" ref={el} style={{ height: Math.max(0, rows * rowH - (list ? 0 : gap + 6)) }}>{cells}</div>;
});
