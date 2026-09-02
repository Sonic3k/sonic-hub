import { useEffect, useRef, useState } from 'react';

/** Width of a DOM element, live. Justified rows need the real pixel width, not a breakpoint. */
export default function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      setWidth(prev => (prev === w ? prev : w));
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
