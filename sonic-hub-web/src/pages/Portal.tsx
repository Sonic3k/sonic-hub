/* The portal shell — the approved demo, live: top bar, room dock, year constellation,
   the room on stage, search, reading room, photo viewer; the sky behind it all. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sky, setFragments } from '../cosmos/sky';
import { hub, dayOf, randomDay, peopleOfYear, tagWorlds } from '../api/hub';
import { cdn } from '../api/client';
import { yearOf } from '../lib/date';
import { hashString } from '../lib/rng';
import type { MediaFile } from '../types';
import { Icon } from '../components/Icons';
import Viewer from '../components/Viewer';
import { AngelsRoom, FantasyRoom, GamesRoom, HomeRoom, JournalRoom, PhotosRoom, RegionRoom, type Go } from '../rooms/Rooms';

const ROOMS = [{ id: 'home', label: 'Hôm nay' }, { id: 'photos', label: 'Ảnh' }, { id: 'journal', label: 'Nhật ký' }, { id: 'angels', label: 'Angels' }, { id: 'fantasy', label: 'Bóng đá' }, { id: 'games', label: 'Game' }];
const ZIG = [24, 52, 34, 62, 40, 22, 56, 30, 66, 44, 26, 58, 36, 64, 28, 50, 34, 60, 42, 30, 54];
const H10 = 10 * 60_000;
type V = CSSProperties & Record<string, string | number>;

export default function Portal() {
  const { room: roomParam, tag = '' } = useParams(), loc = useLocation(), [sp] = useSearchParams(), nav = useNavigate();
  const room = loc.pathname.startsWith('/t/') ? 'region' : (roomParam && ROOMS.some(r => r.id === roomParam) ? roomParam : 'home');

  /* ── data ── */
  const tl = useQuery({ queryKey: ['timeline'], queryFn: hub.timeline, staleTime: H10 });
  const persons = useQuery({ queryKey: ['persons'], queryFn: hub.persons, staleTime: H10 });
  const notes = useQuery({ queryKey: ['notes', 'all'], queryFn: () => hub.notes({ size: 100 }), staleTime: H10 });
  const albums = useQuery({ queryKey: ['albums'], queryFn: hub.albums, staleTime: H10 });
  const regions = useQuery({ queryKey: ['regions'], queryFn: () => tagWorlds(12), staleTime: H10 });
  const buckets = tl.data ?? [], now = new Date(), thisMonth = now.getMonth() + 1;
  const counts = useMemo(() => { const c: Record<number, number> = {}; buckets.forEach(b => { c[b.year] = (c[b.year] ?? 0) + b.count; }); return c; }, [buckets]);
  const years = useMemo(() => Object.keys(counts).map(Number).sort((a, b) => b - a), [counts]);
  const fallback = years.find(y => buckets.some(b => b.year === y && b.month === thisMonth && b.count > 0)) ?? years[0] ?? now.getFullYear();
  const year = Number(sp.get('y')) || fallback;
  const [pm, pd] = (sp.get('d') ?? '').split('-').map(Number), isRandom = !!(pm && pd), month = pm || thisMonth, day = pd || now.getDate();
  const ready = tl.isSuccess || tl.isError;
  const dayQ = useQuery({ queryKey: ['day', year, month, day], queryFn: () => dayOf(year, month, day), enabled: ready && room === 'home', staleTime: H10 });
  const yearQ = useQuery({ queryKey: ['year', year], queryFn: () => hub.search({ from: `${year}-01-01`, to: `${year + 1}-01-01`, size: 90, sortBy: 'effectiveDate', sortDir: 'asc' }), enabled: ready, staleTime: H10 });
  const regionQ = useQuery({ queryKey: ['region', tag], queryFn: () => hub.search({ tagNames: [tag], random: true, size: 48 }), enabled: room === 'region' && !!tag, staleTime: H10 });
  const tagList = useQuery({ queryKey: ['tags'], queryFn: hub.tags, staleTime: H10, enabled: room === 'region' });
  const tagId = tagList.data?.find(t => t.name.toLowerCase() === tag.toLowerCase())?.id;
  const regionNotes = useQuery({ queryKey: ['region-notes', tagId], queryFn: () => hub.notes({ tagId, size: 12 }), enabled: !!tagId, staleTime: H10 });

  /* ── the sky ── */
  const canvas = useRef<HTMLCanvasElement>(null), frags = useRef<HTMLDivElement>(null), stage = useRef<HTMLElement>(null), firstSky = useRef(true);
  useEffect(() => { document.body.classList.add('pt'); if (canvas.current) Sky.start(canvas.current); }, []);
  const skyKey = room === 'region' ? `t:${tag}` : `y:${year}`;
  useEffect(() => {
    const hue = room === 'region' ? (hashString(tag) % 120) - 60 : (year - 2017) * 4;
    document.documentElement.style.setProperty('--hue', hue + 'deg');
    if (firstSky.current) firstSky.current = false; else Sky.warp();
  }, [skyKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const fragSrcs = useMemo(() => {
    const pool: MediaFile[] = room === 'region' ? regionQ.data?.content ?? [] : room === 'home' && dayQ.data?.items.length ? dayQ.data.items : yearQ.data?.content ?? [];
    return pool.filter(m => m.fileType !== 'VIDEO').map(m => cdn(m.thumbnailUrl ?? m.cdnUrl, 320));
  }, [room, regionQ.data, dayQ.data, yearQ.data]);
  const fragKey = fragSrcs.slice(0, 9).join('|');
  useEffect(() => { if (fragSrcs.length) setFragments(frags.current, room === 'home' ? fragSrcs : [...fragSrcs].sort(() => Math.random() - .5)); }, [fragKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { stage.current?.scrollTo({ top: 0 }); }, [room, tag]);

  /* ── navigation ── */
  const q = (y = year) => `?y=${y}`;
  const [viewer, setViewer] = useState<{ items: MediaFile[]; i: number } | null>(null), [reading, setReading] = useState<string | null>(null), [searching, setSearching] = useState(false);
  const go: Go = {
    room: (id) => nav(id === 'home' ? `/${q()}` : `/r/${id}${q()}`),
    year: (y) => nav(`${room === 'region' ? `/r/photos` : loc.pathname}${q(y)}`),
    region: (name) => nav(`/t/${encodeURIComponent(name)}${q()}`),
    view: (items, i) => setViewer({ items, i }),
    read: (p) => setReading(p),
    leave: (to, external) => {
      Sky.warp(); document.body.classList.add('leaving');
      setTimeout(() => { if (external) location.href = to; else { nav(to); document.body.classList.remove('leaving'); } }, 700);
    },
  };
  const random = async () => { const r = await randomDay(year, buckets).catch(() => null); if (r) nav(`/${q()}&d=${r.month}-${r.day}`); };

  /* ── keyboard: quiet, nothing on screen ── */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(true); return; }
      if (e.key === 'Escape') { setSearching(false); setReading(null); return; }
      if (searching || viewer || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '/') { e.preventDefault(); setSearching(true); }
      if (/^[1-6]$/.test(e.key)) go.room(ROOMS[+e.key - 1].id);
      const i = years.indexOf(year);
      if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); go.year(years[i - 1]); }
      if (e.key === 'ArrowDown' && i >= 0 && i < years.length - 1) { e.preventDefault(); go.year(years[i + 1]); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });

  const notesAll = notes.data?.content ?? [], people = peopleOfYear(persons.data ?? [], year);
  const note = notesAll.find(n => yearOf(n.publishedAt ?? n.createdAt) === year);
  const totals = { photos: Object.values(counts).reduce((a, b) => a + b, 0), notes: notes.data?.totalElements ?? 0, persons: (persons.data ?? []).filter(p => !p.isSelf).length };

  return (
    <>
      <div className="cosmos" aria-hidden="true">
        <canvas ref={canvas} id="stars" />
        <div className="nebula"><div className="neb a"><i /></div><div className="neb b"><i /></div><div className="neb c"><i /></div><div className="neb d"><i /></div></div>
        <div className="frags" ref={frags} />
        <div className="limb" />
      </div>
      <div className="glow" aria-hidden="true" />

      <header className="bar">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); go.room('home'); }}>sonic hub</a>
        <button type="button" className="search" onClick={() => setSearching(true)}><Icon name="search" /><span className="lbl">Tìm một kỷ niệm…</span></button>
        <button type="button" className="random" onClick={random} disabled={!buckets.length}><Icon name="dice" /><span className="lbl">Một ngày bất kỳ</span></button>
      </header>
      <nav className="dock" aria-label="Các phòng">
        {ROOMS.map((r, i) => <button key={r.id} type="button" style={{ '--i': i } as V} aria-current={room === r.id} onClick={() => go.room(r.id)}><Icon name={r.id} /><span className="lbl">{r.label}</span></button>)}
      </nav>
      {years.length > 0 && <Constellation years={years} counts={counts} active={room === 'region' ? -1 : year} onPick={go.year} />}

      <main className="stage" ref={stage}>
        <div className="room" key={`${room}:${tag}:${year}:${month}-${day}`}>
          {room === 'home' && <HomeRoom year={year} month={month} day={day} isRandom={isRandom} scope={dayQ.data?.scope} items={dayQ.data?.items ?? []} loading={dayQ.isLoading || !ready} people={people} note={note} totals={totals} regions={regions.data ?? []} go={go} />}
          {room === 'photos' && <PhotosRoom year={year} count={counts[year] ?? 0} albums={albums.data ?? []} items={yearQ.data?.content ?? []} go={go} />}
          {room === 'journal' && <JournalRoom year={year} notes={notesAll} go={go} />}
          {room === 'angels' && <AngelsRoom year={year} persons={persons.data ?? []} go={go} />}
          {room === 'fantasy' && <FantasyRoom year={year} go={go} />}
          {room === 'games' && <GamesRoom go={go} />}
          {room === 'region' && <RegionRoom name={tag} total={regionQ.data?.totalElements ?? 0} items={regionQ.data?.content ?? []} notes={regionNotes.data?.content ?? []} go={go} />}
        </div>
      </main>

      {searching && <Search years={years} go={go} onClose={() => setSearching(false)} data={{ persons: persons.data ?? [], notes: notesAll, albums: albums.data ?? [], regions: (regions.data ?? []).map(r => r.name) }} goYear={(y) => nav(`/${q(y)}`)} />}
      <div className={`reader ${reading ? 'open' : ''}`} onClick={() => setReading(null)}>
        <div className="reader-box">{reading && <div className="wormhole"><i /><i /><i /><div className="in"><b>{reading}</b><p>Một phòng đọc riêng, phục dựng đúng thời đó.<br />Sẽ mở ở đây.</p></div></div>}</div>
      </div>
      {viewer && <Viewer items={viewer.items} start={viewer.i} onClose={() => setViewer(null)} />}
    </>
  );
}

/* The years as a constellation (demo): zigzag stars, a glowing thread through them. */
function Constellation({ years, counts, active, onPick }: { years: number[]; counts: Record<number, number>; active: number; onPick: (y: number) => void }) {
  const inner = useRef<HTMLDivElement>(null), line = useRef<SVGPolylineElement>(null), svg = useRef<SVGSVGElement>(null);
  const max = Math.max(1, ...years.map(y => counts[y] ?? 0));
  useEffect(() => {
    const draw = () => {
      const el = inner.current; if (!el || !svg.current || !line.current) return;
      const r0 = el.getBoundingClientRect(); svg.current.setAttribute('width', String(r0.width)); svg.current.setAttribute('height', String(el.scrollHeight));
      line.current.setAttribute('points', [...el.querySelectorAll('.star')].map(s => { const r = s.getBoundingClientRect(); return `${(r.left - r0.left + r.width / 2).toFixed(1)},${(r.top - r0.top + r.height / 2).toFixed(1)}`; }).join(' '));
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(draw)); addEventListener('resize', draw); document.fonts?.ready.then(draw);
    el2(inner.current, active);
    return () => { cancelAnimationFrame(id); removeEventListener('resize', draw); };
  }, [years.join(), active]);
  return (
    <nav className="years" aria-label="Các năm">
      <div className="years-in" ref={inner}>
        <svg className="links" ref={svg}>
          <defs><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B9A6FF" stopOpacity=".55" /><stop offset=".5" stopColor="#8BE7F0" stopOpacity=".35" /><stop offset="1" stopColor="#FFE1A0" stopOpacity=".5" /></linearGradient>
            <filter id="cg" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <polyline ref={line} fill="none" stroke="url(#cl)" strokeWidth="1" filter="url(#cg)" strokeLinejoin="round" />
        </svg>
        {years.map((y, i) => (
          <button key={y} type="button" data-year={y} aria-pressed={y === active} onClick={() => y !== active && onPick(y)}
            style={{ '--x': ZIG[i % ZIG.length] + 'px', '--w': ((counts[y] ?? 0) / max).toFixed(3), '--i': i } as V}>
            <span className="star" /><span className="halo" /><span className="full">{y}</span><span className="short">'{String(y).slice(2)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
const el2 = (root: HTMLElement | null, y: number) => root?.querySelector<HTMLElement>(`[data-year="${y}"]`)?.scrollIntoView({ block: 'nearest' });

/* Search: people, writing, years, albums, regions — a plain list in the void (demo). */
function Search({ years, data, go, goYear, onClose }: { years: number[]; data: { persons: { name: string; displayName?: string | null; period?: string | null }[]; notes: { title?: string | null; publishedAt?: string | null; createdAt?: string | null }[]; albums: { id: string; name: string; mediaCount?: number | null }[]; regions: string[] }; go: Go; goYear: (y: number) => void; onClose: () => void }) {
  const [v, setV] = useState(''), [sel, setSel] = useState(0);
  const index = useMemo(() => [
    ...data.persons.filter(p => p.period).map(p => ({ n: p.displayName || p.name, d: `Angels · ${p.period}`, run: () => go.room('angels') })),
    ...data.notes.filter(n => n.title).map(n => ({ n: n.title!, d: `Nhật ký · ${yearOf(n.publishedAt ?? n.createdAt) || ''}`, run: () => go.room('journal') })),
    ...years.map(y => ({ n: String(y), d: `Ngày này năm ${y}`, run: () => goYear(y) })),
    ...data.albums.map(a => ({ n: a.name, d: `Album · ${a.mediaCount ?? 0} ảnh`, run: () => go.leave(`/photos?album=${a.id}`) })),
    ...data.regions.map(r => ({ n: r, d: 'Vùng', run: () => go.region(r) })),
  ], [data, years]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = index.filter(i => !v.trim() || (i.n + ' ' + i.d).toLowerCase().includes(v.trim().toLowerCase())).slice(0, 8);
  const pick = (i: number) => { const h = hits[i]; if (h) { onClose(); h.run(); } };
  return (
    <div className="palette open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette-box">
        <input type="search" autoFocus placeholder="Tìm người, năm, bài viết, album, vùng…" value={v} onChange={e => { setV(e.target.value); setSel(0); }}
          onKeyDown={e => { if (e.key === 'Enter') pick(sel); if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(hits.length - 1, s + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); } }} />
        <ul>{hits.length ? hits.map((h, i) => <li key={h.d + h.n} className={i === sel ? 'sel' : ''} onClick={() => pick(i)}><span>{h.n}</span><small>{h.d}</small></li>) : <li><small>Không tìm thấy</small></li>}</ul>
      </div>
    </div>
  );
}
