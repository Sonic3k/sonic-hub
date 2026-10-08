/* The frame every page shares: top bar, a sidebar that follows context, the page. */
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { randomDay } from '../api/hub';
import Search from './Search';
import { useEffect } from 'react';
import { angelsOrdered } from '../pages/Angels';
import { cdn } from '../api/client';
import { counts, fmt, noteDate, useAlbums, useLibraryCounts, useNotes, usePersons, useRegions, useTimeline } from '../lib/queries';

const FOOTBALL = import.meta.env.VITE_FOOTBALL_URL;
const TABS: [string, string, string][] = [['Hôm nay', '/', '--photo'], ['Ảnh', '/photos', '--photo'], ['Nhật ký', '/journal', '--journal'], ['Angels', '/angels', '--angels'], ['Bóng đá', '/football', '--football'], ['Game', '/games', '--games']];

export default function Shell() {
  const loc = useLocation(), nav = useNavigate(), tl = useTimeline();
  const reading = /^\/journal\/.+/.test(loc.pathname), inJournal = loc.pathname.startsWith('/journal'), inPhotos = /^\/(photos|tags)/.test(loc.pathname), inAngels = loc.pathname.startsWith('/angels');
  /* Angels changes the light of the whole page, softly */
  useEffect(() => { document.body.classList.toggle('mood-angels', inAngels); }, [inAngels]);
  const random = async () => {
    const years = Object.keys(counts(tl.data ?? [])).map(Number); if (!years.length) return;
    const y = years[Math.floor(Math.random() * years.length)], r = await randomDay(y, tl.data ?? []).catch(() => null);
    if (r) nav(`/?y=${y}&d=${r.month}-${r.day}`);
  };
  return (
    <>
      <header className="top"><div className="top-in">
        <Link className="logo" to="/">Sonic Hub</Link>
        <Search />
        <nav className="tabs">{TABS.map(([n, to, c]) => to === '/football' && FOOTBALL
          ? <a key={to} href={FOOTBALL} style={{ ['--c' as string]: `var(${c})` }}><i />{n}</a>
          : <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')} style={{ ['--c' as string]: `var(${c})` }}><i />{n}</NavLink>)}</nav>
        <button className="rand" type="button" onClick={random}>Một ngày bất kỳ</button>
      </div></header>
      <div className={`frame ${reading ? 'reading' : ''}`}>
        <aside className="side">{inJournal ? <JournalSide /> : inPhotos ? <PhotosSide /> : inAngels ? <AngelsSide /> : <HomeSide />}</aside>
        <main><Outlet /></main>
      </div>
    </>
  );
}

function HomeSide() {
  const tl = useTimeline(), albums = useAlbums(), lib = useLibraryCounts(), regions = useRegions(), [sp] = useSearchParams();
  const c = counts(tl.data ?? []), years = Object.keys(c).map(Number).sort((a, b) => b - a), max = Math.max(1, ...Object.values(c));
  const total = Object.values(c).reduce((a, b) => a + b, 0), active = Number(sp.get('y'));
  return (
    <>
      <h4>Thư viện</h4>
      <Link className={!active ? 'on' : ''} to="/">Hôm nay</Link>
      <Link to="/photos">Tất cả ảnh<small>{fmt(total)}</small></Link>
      <Link to="/photos/albums">Album<small>{albums.data?.length ?? ''}</small></Link>
      <Link to="/photos?fav=1">Yêu thích<small>{lib.data ? fmt(lib.data.fav) : ''}</small></Link>
      <Link to="/photos?type=VIDEO">Video<small>{lib.data ? fmt(lib.data.vid) : ''}</small></Link>
      {years.length > 0 && <h4>Năm</h4>}
      {years.map(y => <Link key={y} to={`/?y=${y}`} className={y === active ? 'on' : ''}>{y}<span className="bar"><b style={{ width: `${Math.round(c[y] / max * 100)}%` }} /></span><small>{fmt(c[y])}</small></Link>)}
      {!!regions.data?.length && <h4>Vùng</h4>}
      {regions.data?.map(r => <Link key={r.id} to={`/tags/${encodeURIComponent(r.name)}`}><span className="dot" style={{ ['--c' as string]: r.color || 'var(--ink3)' }} />{r.name}<small>{fmt(r.count)}</small></Link>)}
    </>
  );
}

function JournalSide() {
  const notes = useNotes(), [sp] = useSearchParams(), list = notes.data ?? [];
  const kind = sp.get('kind'), cat = sp.get('cat'), year = Number(sp.get('year'));
  const byCat: Record<string, number> = {}, byYear: Record<number, number> = {};
  list.forEach(n => { if (n.category) byCat[n.category] = (byCat[n.category] ?? 0) + 1; const y = Number(noteDate(n).slice(0, 4)); if (y) byYear[y] = (byYear[y] ?? 0) + 1; });
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a), max = Math.max(1, ...Object.values(byYear));
  const k = (v: string) => list.filter(n => n.kind === v).length;
  return (
    <>
      <h4>Nhật ký</h4>
      <Link to="/journal" className={!kind && !cat && !year ? 'on' : ''}>Tất cả<small>{list.length}</small></Link>
      <Link to="/journal?kind=ARTICLE" className={kind === 'ARTICLE' ? 'on' : ''}>Bài viết<small>{k('ARTICLE')}</small></Link>
      <Link to="/journal?kind=JOURNAL" className={kind === 'JOURNAL' ? 'on' : ''}>Ghi chép<small>{k('JOURNAL')}</small></Link>
      {Object.keys(byCat).length > 0 && <h4>Chuyên mục</h4>}
      {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([n, v]) => <Link key={n} to={`/journal?cat=${encodeURIComponent(n)}`} className={cat === n ? 'on' : ''}>{n}<small>{v}</small></Link>)}
      {years.length > 0 && <h4>Năm</h4>}
      {years.map(y => <Link key={y} to={`/journal?year=${y}`} className={y === year ? 'on' : ''}>{y}<span className="bar" style={{ ['--c' as string]: 'var(--journal)' }}><b style={{ width: `${Math.round(byYear[y] / max * 100)}%` }} /></span><small>{byYear[y]}</small></Link>)}
    </>
  );
}

function PhotosSide() {
  const tl = useTimeline(), albums = useAlbums(), lib = useLibraryCounts(), regions = useRegions(12), persons = usePersons(), loc = useLocation(), [sp] = useSearchParams();
  const c = counts(tl.data ?? []), years = Object.keys(c).map(Number).sort((a, b) => b - a), max = Math.max(1, ...Object.values(c)), total = Object.values(c).reduce((a, b) => a + b, 0);
  const y = Number(sp.get('year')), path = loc.pathname, plainAll = path === '/photos' && !sp.toString().replace(/(^|&)p=[^&]*/, '');
  const people = (persons.data ?? []).filter(p => !p.isSelf).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured)).slice(0, 8);
  return (
    <>
      <h4>Thư viện</h4>
      <Link to="/photos" className={plainAll ? 'on' : ''}>Tất cả ảnh<small>{fmt(total)}</small></Link>
      <Link to="/photos/albums" className={path.startsWith('/photos/albums') ? 'on' : ''}>Album<small>{albums.data?.length ?? ''}</small></Link>
      <Link to="/photos?fav=1" className={sp.get('fav') === '1' ? 'on' : ''}>Yêu thích<small>{lib.data ? fmt(lib.data.fav) : ''}</small></Link>
      <Link to="/photos?type=VIDEO" className={sp.get('type') === 'VIDEO' ? 'on' : ''}>Video<small>{lib.data ? fmt(lib.data.vid) : ''}</small></Link>
      {years.length > 0 && <h4>Năm</h4>}
      {years.map(yr => <Link key={yr} to={`/photos?year=${yr}`} className={yr === y ? 'on' : ''}>{yr}<span className="bar"><b style={{ width: `${Math.round(c[yr] / max * 100)}%` }} /></span><small>{fmt(c[yr])}</small></Link>)}
      {!!regions.data?.length && <h4>Vùng</h4>}
      {regions.data?.map(r => <Link key={r.id} to={`/tags/${encodeURIComponent(r.name)}`} className={path === `/tags/${encodeURIComponent(r.name)}` || decodeURIComponent(path) === `/tags/${r.name}` ? 'on' : ''}><span className="dot" style={{ ['--c' as string]: r.color || 'var(--ink3)' }} />{r.name}<small>{fmt(r.count)}</small></Link>)}
      {people.length > 0 && <h4>Người</h4>}
      {people.map(p => <Link key={p.id} to={`/photos?person=${p.id}`} className={sp.get('person') === p.id ? 'on' : ''}>{p.displayName || p.name}</Link>)}
    </>
  );
}

function AngelsSide() {
  const persons = usePersons(), loc = useLocation(), list = angelsOrdered(persons.data ?? []);
  return (
    <>
      <h4>Angels</h4>
      <Link to="/angels" className={loc.pathname === '/angels' ? 'on' : ''}>Tất cả<small>{list.length}</small></Link>
      <Link to="/angels/rankings" className={loc.pathname === '/angels/rankings' ? 'on' : ''}>Bảng xếp hạng</Link>
      <h4>Theo thời gian</h4>
      {list.map(p => <Link key={p.id} to={`/angels/${p.id}`} className={`aside-person ${loc.pathname.startsWith(`/angels/${p.id}`) ? 'on' : ''}`}>
        {p.avatarUrl ? <img src={cdn(p.avatarUrl, 60)} alt="" /> : <span className="av-ph">{(p.displayName || p.name).slice(0, 1)}</span>}
        <span className="ap-n">{p.displayName || p.name}</span><small>{p.period ?? ''}</small></Link>)}
    </>
  );
}
