/* The frame every page shares: the header (the wordmark, the search, the machines; under it the menu in its groups
   and the day being looked at), a sidebar that follows the section, the page. On a phone the menu is a bar at the
   bottom: the first four sections, the rest behind "Thêm"; the section's sidebar opens as a sheet from "Lọc". */
import { Link, NavLink, Outlet, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { hub, randomDay } from '../api/hub';
import Search from './Search';
import MachineButtons from './Machines';
import MomentPicker from './MomentPicker';
import PlayerBar from './music/PlayerBar';
import { YearGrid } from './Paper';
import { Fragment, useEffect, useLayoutEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MoneySide } from '../pages/Money';
import { MemoriesSide } from '../pages/Memories';
import { GamesSide } from '../pages/Games';
import { MusicSide } from '../pages/Music';
import { isOwner } from './money/data';
import { counts, fmt, noteDate, useAlbums, useLibraryCounts, useNotes, usePersons, useRegions, useTimeline } from '../lib/queries';
import { HOME_PATHS, MomentProvider, momentHref, useMoment } from '../lib/moment';
import { angelsByYear, useMetYears } from '../lib/people';

interface Tab { n: string; to: string; c: string; end?: boolean }
/* The menu in its groups: time · what is kept · people · play and listen · the sites of their own (Huyền học, Bóng đá). */
const GROUPS: Tab[][] = [
  [{ n: 'Hôm nay', to: '/', c: '--ink', end: true }, { n: 'Dòng thời gian', to: '/timeline', c: '--ink' }],
  [{ n: 'Ảnh', to: '/photos', c: '--photo' }, { n: 'Ký ức', to: '/memories', c: '--memory' }, { n: 'Nhật ký', to: '/journal', c: '--journal' }],
  [{ n: 'Angels', to: '/angels', c: '--angels' }, { n: 'Diễn đàn', to: '/forum', c: '--forum' }],
  [{ n: 'Game', to: '/games', c: '--games' }, { n: 'Music', to: '/music', c: '--music' }],
  [{ n: 'Portal', to: '/portal', c: '--portal' }],
];
/* Only on the owner's own browser (set by opening /money once): visitors of the portal never see the money tab. */
const MONEY: Tab = { n: 'Money', to: '/money', c: '--money' };
/* the phone's bottom bar */
const BAR = ['/', '/photos', '/memories', '/journal'];
const inTab = (path: string, t: Tab) => (t.end ? path === t.to : path === t.to || path.startsWith(`${t.to}/`));

export default function Shell() {
  return <MomentProvider><Frame /></MomentProvider>;
}

function Frame() {
  const loc = useLocation(), tl = useTimeline(), { pick, picked, moment } = useMoment(), path = loc.pathname;
  const [more, setMore] = useState(false), [filters, setFilters] = useState(false);
  const inPortal = path.startsWith('/portal');
  /* pages with no sidebar: one thing being read (a note, a memory, a game, a list, a person and what hangs under them, a thread), and the Portal's two doors */
  const reading = /^\/(journal|memories)\/(?!events\/?$).+/.test(path) || /^\/games\/(?!series\/|play\/)[^/]+$/.test(path) || /^\/music\/lists\/[^/]+$/.test(path)
    || /^\/angels\/.+/.test(path) || /^\/forum\/t\//.test(path) || inPortal, inMemories = path.startsWith('/memories'), inJournal = path.startsWith('/journal'), inPhotos = /^\/(photos|tags)/.test(path), inAngels = path.startsWith('/angels'), inForum = path.startsWith('/forum');
  const inMoney = path.startsWith('/money'), inGames = path.startsWith('/games'), inMusic = path.startsWith('/music');
  const onHome = HOME_PATHS.includes(path);
  /* on a phone the sidebar is a sheet behind a button: on the pages that list things, not where one thing is read, played or chatted */
  const sheet = !onHome && !reading && path !== '/forum' && !/^\/games\/play\//.test(path);
  const groups = inMoney || isOwner() ? [...GROUPS.slice(0, -1), [...GROUPS[GROUPS.length - 1], MONEY]] : GROUPS, tabs = groups.flat();
  const current = tabs.find(t => inTab(path, t)) ?? (inPhotos ? tabs.find(t => t.to === '/photos') : undefined);
  /* the phone's bar: Dòng thời gian is the other way of looking at Hôm nay (the switch is on the page), so it lights Hôm nay */
  const beyond = current && !BAR.includes(current.to) && current.to !== '/timeline' ? current : null;
  useEffect(() => { setMore(false); setFilters(false); }, [path, loc.search]);
  /* A page opened from somewhere down a list starts at its own top. Going back is left to the browser, which returns
     to the place in the list; an address with a #place goes there by itself; a filter or a photo opened over the
     page (the address after the "?") keeps the page where it is. */
  const how = useNavigationType();
  useLayoutEffect(() => { if (how === 'PUSH' && !loc.hash) window.scrollTo(0, 0); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  const random = async () => {
    const years = Object.keys(counts(tl.data ?? [])).map(Number); if (!years.length) return;
    const y = years[Math.floor(Math.random() * years.length)], r = await randomDay(y, tl.data ?? []).catch(() => null);
    if (r) pick({ y, m: r.month, d: r.day });
  };
  // with a day picked, Ảnh opens at its month (Ký ức and Nhật ký go to its year by themselves)
  const dest = (t: Tab) => (picked && moment && t.to === '/photos' ? momentHref('/photos', moment) : t.to);
  const link = (t: Tab) => <NavLink key={t.to} to={dest(t)} end={t.end} className={({ isActive }) => (isActive || t === current ? 'on' : '')} style={{ ['--c' as string]: `var(${t.c})` }}>{t.n}</NavLink>;
  return (
    <>
      <header className="hd1">
        <Link className="wordmark" to="/">Sonic Hub</Link>
        <Search />
        <MachineButtons />
      </header>
      <div className="hd2">
        <nav className="nav" aria-label="Các mục của Sonic Hub">{groups.map((g, i) => <div key={i} className="nav-g">{g.map(link)}</div>)}</nav>
        <div className="hd2-tools">
          <MomentPicker onRandom={random} />
          <button className="rand" type="button" onClick={random}>Một ngày bất kỳ</button>
        </div>
      </div>
      <div className={`frame ${reading ? 'reading' : ''} ${onHome ? 'home' : ''}`} style={{ ['--sec' as string]: `var(${current?.c ?? '--ink'})` }}>
        {!onHome && <aside className={`side ${filters ? 'open' : ''}`} onClick={e => { if ((e.target as HTMLElement).closest('a')) setFilters(false); }}>
          {inJournal ? <JournalSide /> : inMemories ? <MemoriesSide /> : inPhotos ? <PhotosSide /> : inAngels ? <AngelsSide /> : inForum ? <ForumSide /> : inMoney ? <MoneySide /> : inGames ? <GamesSide /> : inMusic ? <MusicSide /> : null}
          <button type="button" className="side-x" onClick={() => setFilters(false)}>{inMoney ? 'Close' : 'Đóng'}</button>
        </aside>}
        <main><Outlet /></main>
      </div>
      {inMusic && <PlayerBar />}
      <nav className="tabbar" aria-label="Các mục của Sonic Hub">
        {tabs.filter(t => BAR.includes(t.to)).map(t => (t.to === '/' && path === '/timeline'
          ? <NavLink key={t.to} to={dest(t)} className="on" style={{ ['--c' as string]: `var(${t.c})` }}>{t.n}</NavLink> : link(t)))}
        <button type="button" className={`bar-more ${beyond || more ? 'on' : ''}`} style={{ ['--c' as string]: `var(${beyond?.c ?? '--ink'})` }} aria-expanded={more} onClick={() => setMore(v => !v)}>{beyond ? beyond.n : 'Thêm'}</button>
      </nav>
      {sheet && <button type="button" className="side-btn" aria-expanded={filters} onClick={() => setFilters(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg>{inMoney ? 'Filter' : inAngels ? 'Năm' : 'Lọc'}</button>}
      {filters && <div className="side-back" onClick={() => setFilters(false)} />}
      {more && <div className="more-back" onClick={() => setMore(false)}>
        <div className="more-sheet" role="dialog" aria-label="Tất cả các mục" onClick={e => e.stopPropagation()}>
          {groups.map((g, i) => <div key={i} className="more-g">{g.map(link)}</div>)}
        </div>
      </div>}
    </>
  );
}

function JournalSide() {
  const notes = useNotes(), [sp] = useSearchParams(), list = notes.data ?? [];
  const kind = sp.get('kind'), cat = sp.get('cat'), year = Number(sp.get('year'));
  const byCat: Record<string, number> = {}, byYear: Record<number, number> = {};
  list.forEach(n => { if (n.category) byCat[n.category] = (byCat[n.category] ?? 0) + 1; const y = Number(noteDate(n).slice(0, 4)); if (y) byYear[y] = (byYear[y] ?? 0) + 1; });
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a), tag = sp.get('tag');
  const tags: Record<string, number> = {}; list.forEach(n => n.tags?.forEach(x => { tags[x.name] = (tags[x.name] ?? 0) + 1; }));
  const k = (v: string) => list.filter(n => n.kind === v).length;
  return (
    <>
      <h4>Nhật ký</h4>
      <Link to="/journal" className={!kind && !cat && !year && !tag ? 'on' : ''}>Tất cả<small>{notes.data ? list.length : ''}</small></Link>
      {k('ARTICLE') > 0 && k('JOURNAL') > 0 && <>
        <Link to="/journal?kind=ARTICLE" className={kind === 'ARTICLE' ? 'on' : ''}>Bài viết<small>{k('ARTICLE')}</small></Link>
        <Link to="/journal?kind=JOURNAL" className={kind === 'JOURNAL' ? 'on' : ''}>Ghi chép<small>{k('JOURNAL')}</small></Link>
      </>}
      {Object.keys(byCat).length > 0 && <h4>Chuyên mục</h4>}
      {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([n, v]) => <Link key={n} to={`/journal?cat=${encodeURIComponent(n)}`} className={cat === n ? 'on' : ''}>{n}<small>{v}</small></Link>)}
      {years.length > 0 && <h4>Năm</h4>}
      <YearGrid years={years} active={year} href={y => `/journal?year=${y}`} />
      {Object.keys(tags).length > 0 && <h4>Thẻ</h4>}
      {Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => <Link key={t} to={`/journal?tag=${encodeURIComponent(t)}`} className={tag === t ? 'on' : ''}>{t}</Link>)}
    </>
  );
}

function PhotosSide() {
  const tl = useTimeline(), albums = useAlbums(), lib = useLibraryCounts(), regions = useRegions(12), persons = usePersons(), loc = useLocation(), [sp] = useSearchParams();
  const c = counts(tl.data ?? []), years = Object.keys(c).map(Number).sort((a, b) => b - a), total = Object.values(c).reduce((a, b) => a + b, 0);
  const y = Number(sp.get('year')), path = loc.pathname, plainAll = path === '/photos' && !sp.toString().replace(/(^|&)p=[^&]*/, '');
  const people = (persons.data ?? []).filter(p => !p.isSelf).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured)).slice(0, 8);
  return (
    <>
      <h4>Ảnh</h4>
      <Link to="/photos" className={plainAll ? 'on' : ''}>Tất cả ảnh<small>{tl.data ? fmt(total) : ''}</small></Link>
      <Link to="/photos/albums" className={path.startsWith('/photos/albums') ? 'on' : ''}>Album<small>{albums.data?.length ?? ''}</small></Link>
      <Link to="/photos?fav=1" className={sp.get('fav') === '1' ? 'on' : ''}>Yêu thích<small>{lib.data ? fmt(lib.data.fav) : ''}</small></Link>
      <Link to="/photos?type=VIDEO" className={sp.get('type') === 'VIDEO' ? 'on' : ''}>Video<small>{lib.data ? fmt(lib.data.vid) : ''}</small></Link>
      {years.length > 0 && <h4>Năm</h4>}
      <YearGrid years={years.filter(yr => yr >= 1900)} active={y} href={yr => `/photos?year=${yr}`} />
      {!!regions.data?.length && <h4>Vùng</h4>}
      {regions.data?.map(r => <Link key={r.id} to={`/tags/${encodeURIComponent(r.name)}`} className={path === `/tags/${encodeURIComponent(r.name)}` || decodeURIComponent(path) === `/tags/${r.name}` ? 'on' : ''}><span className="dot" style={{ ['--c' as string]: r.color || 'var(--ink3)' }} />{r.name}<small>{fmt(r.count)}</small></Link>)}
      {people.length > 0 && <h4>Người</h4>}
      {people.map(p => <Link key={p.id} to={`/photos?person=${p.id}`} className={sp.get('person') === p.id ? 'on' : ''}>{p.displayName || p.name}</Link>)}
    </>
  );
}

function AngelsSide() {
  const persons = usePersons(), { years } = useMetYears(), loc = useLocation(), { moment, picked } = useMoment();
  const blocks = angelsByYear(persons.data ?? [], years), ys = blocks.map(([y]) => y).filter(y => y > 0), n = blocks.reduce((a, [, ps]) => a + ps.length, 0);
  return (
    <>
      <h4>Angels</h4>
      <Link to="/angels" className={loc.pathname === '/angels' ? 'on' : ''}>Tất cả<small>{n > 0 ? n : ''}</small></Link>
      <Link to="/angels/rankings">Bảng xếp hạng</Link>
      {ys.length > 0 && <h4>Quen từ năm</h4>}
      <YearGrid years={ys} active={picked && moment ? moment.y : undefined} href={y => `/angels#y-${y}`} />
    </>
  );
}

function ForumSide() {
  const loc = useLocation(), [sp] = useSearchParams();
  const m = /^\/forum\/(?!t\/)([^/]+)/.exec(loc.pathname), forums = useQuery({ queryKey: ['forums'], queryFn: hub.forums, staleTime: 600_000 });
  const key = m?.[1] ?? '';
  const boards = useQuery({ queryKey: ['forum-boards', key], queryFn: () => hub.forumBoards(key), enabled: !!key, staleTime: 600_000 });
  const active = sp.get('board') ?? '', tab = sp.get('tab') ?? '';
  /* boards grouped under their top box: "Kỷ niệm - Ước mơ / Tâm sự - lưu bút" sits under "Kỷ niệm - Ước mơ" */
  const groups: Record<string, { n: number; subs: { board: string; name: string; n: number }[] }> = {};
  (boards.data ?? []).forEach(b => {
    const [top, ...rest] = (b.board || 'Khác').split(' / '), g = (groups[top] ??= { n: 0, subs: [] });
    g.n += b.threadCount;
    if (rest.length) g.subs.push({ board: b.board, name: rest.join(' / '), n: b.threadCount });
  });
  const total = (boards.data ?? []).reduce((a, b) => a + b.threadCount, 0);
  const to = (board: string) => `/forum/${key}${board ? `?board=${encodeURIComponent(board)}` : ''}`;
  return (
    <>
      <h4>Diễn đàn</h4>
      {[...(forums.data ?? [])].sort((a, b) => (a.firstPostAt ?? '').localeCompare(b.firstPostAt ?? '')).map(f => <Link key={f.key} to={`/forum/${f.key}`} className={f.key === key && !active && !tab ? 'on' : ''}>{f.name}<small>{fmt(f.threadCount)}</small></Link>)}
      {key && <Link to={`/forum/${key}?tab=members`} className={tab === 'members' ? 'on' : ''}>Thành viên</Link>}
      {total > 0 && <h4>Box</h4>}
      {Object.entries(groups).sort((a, b) => b[1].n - a[1].n).map(([top, g]) => (
        <Fragment key={top}>
          <Link to={to(top)} className={active === top ? 'on' : ''}>{top}<small>{g.n}</small></Link>
          {g.subs.sort((a, b) => b.n - a.n).map(s => <Link key={s.board} to={to(s.board)} className={`sub ${active === s.board ? 'on' : ''}`}>{s.name}<small>{s.n}</small></Link>)}
        </Fragment>))}
    </>
  );
}
