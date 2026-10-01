import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Scene from '../cosmos/Scene';
import { useWarp } from '../cosmos/Warp';
import { tagTheme } from '../cosmos/themes';
import TopBar from '../components/TopBar';
import WarpGate from '../components/WarpGate';
import Viewer from '../components/Viewer';
import { hub } from '../api/hub';
import { cdn } from '../api/client';

const H10 = 10 * 60_000;

/** A tag is a place: its own planet, its own sky, the moments that live there. */
export default function TagWorld() {
  const { name = '' } = useParams(), [sp] = useSearchParams(), warp = useWarp(), nav = useNavigate();
  const year = sp.get('y'), theme = useMemo(() => tagTheme(name), [name]);
  const shots = useQuery({ queryKey: ['tag', name, 'shots'], queryFn: () => hub.search({ tagNames: [name], random: true, size: 18 }), staleTime: H10 });
  const tags = useQuery({ queryKey: ['tags'], queryFn: hub.tags, staleTime: H10 });
  const tag = tags.data?.find(t => t.name.toLowerCase() === name.toLowerCase());
  const notes = useQuery({ queryKey: ['tag', name, 'notes'], queryFn: () => hub.notes({ tagId: tag!.id, size: 6 }), enabled: !!tag, staleTime: H10 });
  const [v, setV] = useState<number | null>(null), items = shots.data?.content ?? [], total = shots.data?.totalElements ?? 0;
  return (
    <>
      <Scene theme={theme} />
      <div className="ui tagworld">
        <TopBar />
        <main className="tw-main" key={name}>
          <Link className="back" to={year ? `/?y=${year}` : '/'}>← Vũ trụ</Link>
          <p className="eyebrow">Vùng</p>
          <h1>{name}</h1>
          <p className="lede">{shots.isLoading ? 'Đang hạ cánh…' : `${total} khoảnh khắc sống ở đây · bầu trời ${theme.name}`}</p>
          <div className="mosaic wide">{items.slice(0, 9).map((m, k) => <button type="button" key={m.id} className="shot" style={{ ['--k' as string]: k }} onClick={() => setV(k)}><img src={cdn(m.thumbnailUrl ?? m.cdnUrl, 320)} alt="" loading="lazy" /></button>)}</div>
          {!!notes.data?.content.length && <ul className="lumlist">{notes.data.content.map(n => <li key={n.id}><b>{n.title || 'Không tiêu đề'}</b><small>{(n.excerpt || n.content.replace(/<[^>]+>/g, '')).slice(0, 90)}</small></li>)}</ul>}
          <WarpGate label={`Mở vùng ${name}`} hint="toàn bộ ảnh của vùng này" onWarp={() => warp(() => nav(`/photos?tag=${encodeURIComponent(name)}`), { tint: theme.neb[0] })} />
        </main>
      </div>
      {v !== null && <Viewer items={items} start={v} onClose={() => setV(null)} />}
    </>
  );
}
