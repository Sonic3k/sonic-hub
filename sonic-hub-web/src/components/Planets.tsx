import PlanetCanvas from '../cosmos/PlanetCanvas';
import { SECTIONS, tagTheme } from '../cosmos/themes';

/** The big sections, standing as worlds along the bottom of the sky. */
export function SectionWorlds({ onEnter }: { onEnter: (id: string) => void }) {
  return (
    <nav className="worlds" aria-label="Các mục lớn">
      {SECTIONS.map((s, i) => (
        <button key={s.id} type="button" className="world" style={{ ['--k' as string]: i }} onClick={() => onEnter(s.id)}>
          <span className="world-body"><PlanetCanvas spec={s.planet} size={78} /></span>
          <b>{s.label}</b>
        </button>
      ))}
    </nav>
  );
}

/** Tag regions as small distant worlds. Each one is its own scene when you warp in. */
export function TagWorlds({ tags, onEnter }: { tags: { id: string; name: string; count: number }[]; onEnter: (name: string) => void }) {
  if (!tags.length) return null;
  return (
    <section className="tagworlds" aria-label="Các vùng">
      <h2 className="sec">Các vùng</h2>
      <div className="tw-list">
        {tags.map(t => (
          <button key={t.id} type="button" className="tw" onClick={() => onEnter(t.name)}>
            <PlanetCanvas spec={tagTheme(t.name).planet} size={34} />
            <span><b>{t.name}</b><small>{t.count}</small></span>
          </button>
        ))}
      </div>
    </section>
  );
}
