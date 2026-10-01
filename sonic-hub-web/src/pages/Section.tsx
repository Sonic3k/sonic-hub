import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Scene from '../cosmos/Scene';
import PlanetCanvas from '../cosmos/PlanetCanvas';
import { useWarp } from '../cosmos/Warp';
import { SECTIONS, yearTheme } from '../cosmos/themes';
import TopBar from '../components/TopBar';
import WarpGate from '../components/WarpGate';
import Viewer from '../components/Viewer';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import { longDay } from '../lib/date';

const FOOTBALL = import.meta.env.VITE_FOOTBALL_URL as string | undefined;
const PAGES = ((import.meta.env.VITE_PAGES_URL as string | undefined) ?? '').replace(/\/$/, '');
const H10 = 10 * 60_000;

export default function Section() {
  const { id = 'photos' } = useParams(), [sp] = useSearchParams(), warp = useWarp(), nav = useNavigate();
  const year = Number(sp.get('y')) || 2010, theme = useMemo(() => yearTheme(year), [year]);
  const def = SECTIONS.find(s => s.id === id) ?? SECTIONS[0];
  const [size, setSize] = useState(() => Math.min(innerWidth * .27, innerHeight * .56));
  useEffect(() => { const r = () => setSize(Math.min(innerWidth * .27, innerHeight * .56)); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);

  const go = (path: string) => warp(() => nav(path), { tint: def.planet.atmo });
  const out = (url: string) => warp(() => { location.href = url; }, { tint: def.planet.atmo });
  const gate: Record<string, () => void> = {
    photos: () => go('/photos'), journal: () => go('/journal'), angels: () => go('/angels'),
    football: () => (FOOTBALL ? out(FOOTBALL) : go('/football')), games: () => go('/games'),
  };

  return (
    <>
      <Scene theme={theme} showPlanet={false} dim={.12} />
      <div className="ui section">
        <TopBar />
        <div className="sec-planet" style={{ ['--s' as string]: size + 'px' }}><PlanetCanvas spec={def.planet} size={size} /></div>
        <main className="sec-main" key={id}>
          <Link className="back" to={`/?y=${year}`}>← Vũ trụ {year}</Link>
          <p className="eyebrow">Hành tinh</p>
          <h1>{def.label}</h1>
          <p className="lede">{def.tagline}</p>
          {id === 'photos' && <PhotosTeaser />}
          {id === 'journal' && <JournalTeaser onOpen={(slug) => go(`/journal/${slug}`)} />}
          {id === 'angels' && <AngelsTeaser />}
          {id === 'football' && <p className="prose">Đội hình, điểm số và bảng xếp hạng nằm ở trang Fantasy Football riêng. Cổng warp bên dưới dẫn thẳng sang đó.</p>}
          {id === 'games' && <GamesTeaser pages={PAGES} />}
          <WarpGate label={id === 'football' ? 'Sang Fantasy Football' : `Vào ${def.label}`} hint={id === 'journal' ? 'không gian đọc thực thụ' : id === 'photos' ? 'toàn bộ album và ảnh' : undefined} onWarp={gate[id]} />
        </main>
      </div>
    </>
  );
}

function PhotosTeaser() {
  const shots = useQuery({ queryKey: ['teaser', 'photos'], staleTime: H10, queryFn: async () => {
    const f = await hub.search({ featured: true, random: true, size: 10 }); return f.content.length >= 6 ? f.content : (await hub.search({ random: true, size: 10 })).content; } });
  const albums = useQuery({ queryKey: ['albums'], queryFn: hub.albums, staleTime: H10 });
  const [v, setV] = useState<number | null>(null), items = shots.data ?? [];
  return (
    <>
      <div className="mosaic">{items.slice(0, 7).map((m, k) => <button type="button" key={m.id} className="shot" style={{ ['--k' as string]: k }} onClick={() => setV(k)}><img src={cdn(m.thumbnailUrl ?? m.cdnUrl, 320)} alt="" loading="lazy" /></button>)}</div>
      {!!albums.data?.length && <ul className="lumlist">{albums.data.slice(0, 5).map(a => <li key={a.id}><b>{a.name}</b><small>{a.mediaCount ?? 0} ảnh{a.childrenCount ? ` · ${a.childrenCount} album con` : ''}</small></li>)}</ul>}
      {v !== null && <Viewer items={items} start={v} onClose={() => setV(null)} />}
    </>
  );
}

function JournalTeaser({ onOpen }: { onOpen: (slug: string) => void }) {
  const q = useQuery({ queryKey: ['teaser', 'journal'], staleTime: H10, queryFn: async () => {
    const a = await hub.notes({ kind: 'ARTICLE', status: 'PUBLISHED', size: 5 }); return a.content.length ? a.content : (await hub.notes({ size: 5 })).content; } });
  return (
    <ul className="lumlist articles">
      {(q.data ?? []).map(n => {
        const d = n.publishedAt ?? n.createdAt ?? '';
        return (
          <li key={n.id}>
            <button type="button" onClick={() => n.slug && onOpen(n.slug)} disabled={!n.slug}>
              <b>{n.title || 'Không tiêu đề'}</b>
              <small>{d ? longDay(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10)) : ''}{n.category ? ` · ${n.category}` : ''}</small>
              {(n.excerpt || n.content) && <span>{(n.excerpt || n.content.replace(/<[^>]+>/g, '')).slice(0, 140)}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AngelsTeaser() {
  const q = useQuery({ queryKey: ['persons'], queryFn: hub.persons, staleTime: H10 });
  const list = (q.data ?? []).filter(p => !p.isSelf).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured)).slice(0, 8);
  return (
    <div className="faces">
      {list.map((p, k) => (
        <div key={p.id} className="face" style={{ ['--k' as string]: k }}>
          <span className="face-img">{p.avatarUrl ? <img src={cdn(p.avatarUrl, 320)} alt="" /> : <i>{(p.displayName || p.name).slice(0, 1)}</i>}</span>
          <b>{p.displayName || p.name}</b>{p.period && <small>{p.period}</small>}
        </div>
      ))}
    </div>
  );
}

function GamesTeaser({ pages }: { pages: string }) {
  const games = [{ name: 'Mướp và Mười Hai Ngọn Đèn', note: 'Platformer tự làm', url: pages ? `${pages}/game-muop.html` : '' }];
  return <ul className="lumlist">{games.map(g => <li key={g.name}>{g.url ? <a href={g.url}><b>{g.name}</b><small>{g.note}</small></a> : <><b>{g.name}</b><small>{g.note}</small></>}</li>)}</ul>;
}
