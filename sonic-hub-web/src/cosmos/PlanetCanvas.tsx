import { useEffect, useRef } from 'react';
import { paintPlanet, type PlanetSpec } from './planet';

/** A planet as a UI element. `size` is the body diameter in CSS px; ring and glow spill around it. */
export default function PlanetCanvas({ spec, size, className }: { spec: PlanetSpec; size: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const dpr = Math.min(2, devicePixelRatio || 1), painted = paintPlanet(spec, Math.round(size / 2 * dpr)), cv = ref.current!;
    cv.width = painted.width; cv.height = painted.height; cv.style.width = painted.width / dpr + 'px'; cv.style.height = painted.height / dpr + 'px';
    cv.getContext('2d')!.drawImage(painted, 0, 0);
  }, [JSON.stringify(spec), size]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
