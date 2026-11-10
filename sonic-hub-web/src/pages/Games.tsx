/* Game: the shelf of games he played — by the machines of each period, his own games on a shelf of their own, the series
   with their versions — and one game with when and on what he played it, his pictures and memories of it, the games he
   made from it, the videos to watch it again and, where it can be, the game itself. Everything is read here; it is
   written through the admin and game-shelf-src. */
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';
import type { GameCard, GameDetail, GamePlay, GameTrace, MediaFile } from '../types';

const T = 10 * 60_000;
/** the memory that keeps his lists of games of 2004 (the homemade ones, the 50 sets, the numbered 100) */
const LIST_2004 = '/memories/82fa0730-5766-4112-837a-99ccaa86e340';
export const useGames = () => useQuery({ queryKey: ['games'], queryFn: hub.games, staleTime: T });
export const useGameSeries = () => useQuery({ queryKey: ['game-series'], queryFn: hub.gameSeries, staleTime: T });

/** The periods of the shelf, by the machines he had: a game sits in the period he first played it. */
const ERAS: { key: string; name: string; from: string; to: string; range: string }[] = [
  { key: 'win98', name: 'PC Win 98', from: '', to: '2004-01-01', range: '1998 – 2003' },
  { key: 'xp', name: 'PC Win XP · Fujitsu', from: '2004-01-01', to: '2008-09-15', range: '2004 – 2008' },
  { key: 'hp', name: 'HP Pavilion', from: '2008-09-15', to: '2015-01-01', range: '2008 – 2014' },
  { key: 'asus', name: 'Asus', from: '2015-01-01', to: '2019-09-24', range: '2015 – 2019' },
  { key: 'us', name: 'Những năm ở Mỹ', from: '2019-09-24', to: '2023-01-01', range: '2019 – 2022' },
  { key: 'now', name: 'Từ 2023', from: '2023-01-01', to: '9999', range: '' },
];
const DEVICES: Record<string, string> = {
  'pc-old': 'PC Win 98', 'pc-school': 'PC trường Thống Nhất', 'pc-xp': 'PC Win XP', 'pc-fujitsu': 'Fujitsu FMV', 'pc-hp': 'HP Pavilion', 'pc-asus': 'Asus N56',
  'pc-thinkpad': 'Lenovo ThinkPad', 'pc-now': 'Laptop', 'phone-nokia': 'Nokia', 'phone-iphone6': 'iPhone 6s', 'phone-iphone11': 'iPhone 11', 'phone-iphone13': 'iPhone 13',
};
export const deviceName = (k?: string | null) => (k ? DEVICES[k] ?? k : '');
const KIND: Record<string, string> = { FAN: 'Fan game', HOMEMADE: 'Tự chế', REMAKE: 'Remake' };
const LINK: Record<string, string> = { WALKTHROUGH: 'Walkthrough', LONGPLAY: 'Longplay', WIKI: 'Wikipedia', MANUAL: 'Hướng dẫn', OFFICIAL: 'Trang chính thức', PLAY: 'Chơi', SOUNDTRACK: 'Nhạc', VIDEO: 'Video', OTHER: 'Link' };

/** the look of a game with no picture yet: the kind of machine or table it is played on */
const family = (p?: string | null) => !p ? 'plain' : /Notebook/.test(p) ? 'paper' : /Board|Cards/.test(p) ? 'table' : /Web/.test(p) ? 'web'
  : /Game Boy|DS|Switch|NES|SNES|3DS|Nintendo/.test(p) ? 'nin' : /Mobile/.test(p) ? 'mobile' : /DOS|Windows|PC|Arcade|Mega Drive|Age of Empires|Warcraft/.test(p) ? 'pc' : 'plain';
/** "~2004 – 2011" reads "khoảng 2004 – 2011"; "2007-05" reads "05/2007" */
const about = (t?: string | null) => (t ?? '').replace(/^~/, 'khoảng ').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1').replace(/\b(\d{4})-(\d{2})\b/g, '$2/$1');
const own = (g: GameCard) => g.kind === 'HOMEMADE' || g.kind === 'REMAKE';
const isMine = (g: GameCard) => g.mine ?? (!!g.played || !!g.handName || own(g) || g.favorite || g.portal || g.machine);
/** an official game stands on a period's shelf when he played it then, wrote it in his 2004 lists, or it plays here */
const onShelf = (g: GameCard) => !!g.playFrom || !!g.handName || g.portal || g.machine;
/** the period he first played it in; a game numbered in his list of 100 (2004) is from the PC Win 98 years */
const eraOf = (g: GameCard) => { const t = g.handOrder && (!g.playFrom || g.playFrom >= '2004') ? '' : g.playFrom ?? ''; return ERAS.find(e => t >= e.from && t < e.to)?.key ?? 'win98'; };
const byPlay = (a: GameCard, b: GameCard) => (a.playFrom ?? '9').localeCompare(b.playFrom ?? '9') || (a.handOrder ?? 999) - (b.handOrder ?? 999) || a.title.localeCompare(b.title);
const byYear = (a: GameCard, b: GameCard) => (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999) || a.title.localeCompare(b.title);
/** the order the shelf reads in, for "previous / next" on a game */
const shelfOrder = (all: GameCard[]) => {
  const mine = all.filter(isMine);
  return [...ERAS.flatMap(e => mine.filter(g => !own(g) && onShelf(g) && eraOf(g) === e.key).sort(byPlay)), ...mine.filter(own).sort(byYear)];
};

// ── the shelf ────────────────────────────────────────────────────────────────

export function GamesIndex() {
  const games = useGames(), series = useGameSeries(), [sp] = useSearchParams();
  const view = sp.get('view'), device = sp.get('device');
  const all = games.data ?? [], mine = all.filter(isMine);
  const filtered = view === 'play' ? mine.filter(g => g.portal || g.machine)
    : view === 'homemade' ? mine.filter(own)
    : view === 'favorite' ? mine.filter(g => g.favorite)
    : device ? mine.filter(g => g.devices?.includes(device)) : null;
  const title = view === 'play' ? 'Chơi được' : view === 'homemade' ? 'Game tự chế' : view === 'favorite' ? 'Yêu thích' : view === 'traces' ? 'Dấu vết' : device ? deviceName(device) : 'Game';
  const listed = mine.filter(g => g.handOrder).sort((a, b) => (a.handOrder ?? 0) - (b.handOrder ?? 0));

  return (
    <div className="wrap page games">
      <div className="ptitle"><h1>{title}</h1></div>
      <section className="lanes">
        <div>
          {games.isLoading && <div className="card empty">Đang mở kệ game…</div>}
          {view === 'traces' ? <Traces /> : filtered ? (filtered.length ? <div className="g-grid">{[...filtered].sort(view === 'homemade' ? byYear : byPlay).map(g => <GameBox key={g.key} g={g} />)}</div>
            : !games.isLoading && <div className="card empty">Chưa có game nào ở đây.</div>)
            : <>
              {ERAS.map(e => { const gs = mine.filter(g => !own(g) && onShelf(g) && eraOf(g) === e.key).sort(byPlay); return gs.length > 0 && <Shelf key={e.key} name={e.name} range={e.range} games={gs} />; })}
              {mine.some(own) && <Shelf name="Tự chế" range="" games={mine.filter(own).sort(byYear)} to="/games?view=homemade" />}
            </>}
        </div>
        <aside className="rail">
          {!!series.data?.length && <div className="card g-series-card" style={{ ['--c' as string]: 'var(--games)' }}><h3><i />Series</h3>
            {series.data.map(s => <Link key={s.key} to={`/games/series/${s.key}`}>{s.coverUrl ? <img src={cdn(s.coverUrl, 120)} alt="" /> : <span className="g-ph-s" />}<span>{s.name}</span></Link>)}</div>}
          {listed.length > 0 && <div className="card g-hand-card" style={{ ['--c' as string]: 'var(--games)' }}><h3><i />Danh sách 100 trò, 2004</h3>
            {listed.map(g => <Link key={g.key} to={`/games/${g.key}`}><b>{g.handOrder}</b>{g.iconUrl && <img src={cdn(g.iconUrl, 64)} alt="" />}<span className="hand">{g.handName}</span><small>{g.title}</small></Link>)}</div>}
        </aside>
      </section>
    </div>
  );
}

/** Every play that left something behind — a save, a score table with his name, a settings file, his own words — in
 *  the order it happened: what each game's page shows under "Những lần chơi", in one list. */
function Traces() {
  const q = useQuery({ queryKey: ['game-traces'], queryFn: hub.gameTraces, staleTime: T });
  const years = useMemo(() => {
    const out: [string, GameTrace[]][] = [];
    for (const t of q.data ?? []) {
      const y = t.play.startAt.slice(0, 4), last = out[out.length - 1];
      if (last && last[0] === y) last[1].push(t); else out.push([y, [t]]);
    }
    return out;
  }, [q.data]);
  if (q.isLoading) return <div className="card empty">Đang tìm dấu vết…</div>;
  return (
    <div className="g-traces">
      {years.map(([y, ts]) => <section key={y}>
        <h5 className="mem-h">{y}</h5>
        <ol className="g-plays">{ts.map(({ gameKey, gameTitle, play: p }) => <li key={p.id}>
          <time>{playWhen(p)}</time>
          <div>
            <b><Link to={`/games/${gameKey}`}>{gameTitle}</Link></b>
            {p.deviceKey ? <span className="g-via"><a href={pcHref(p.deviceKey, playAt(p))}>{p.deviceName || deviceName(p.deviceKey)}</a></span>
              : p.via ? <span className="g-via">{p.via}</span> : null}
            <p>{p.evidence}</p>
          </div>
        </li>)}</ol>
      </section>)}
    </div>
  );
}

function Shelf({ name, range, games, to }: { name: string; range: string; games: GameCard[]; to?: string }) {
  return (
    <section className="g-shelf">
      <div className="hd" style={{ ['--c' as string]: 'var(--games)' }}><h2>{name}</h2>{range && <span>{range}</span>}{to && <Link to={to}>Xem hết</Link>}</div>
      <div className="g-board"><div className="g-row">{games.map(g => <GameBox key={g.key} g={g} />)}</div></div>
    </section>
  );
}

/** a game on the shelf: its picture (or his hand-drawn icon), its name, when he played it */
export function GameBox({ g, ghost }: { g: GameCard; ghost?: boolean }) {
  const sub = (g.played && about(g.played)) ?? (own(g) ? [g.releaseYear, g.platform].filter(Boolean).join(' · ') : g.handName ? 'Trước 2004' : g.platform ?? '');
  return (
    <Link className={`g-box ${ghost ? 'ghost' : ''}`} to={`/games/${g.key}`} title={g.title}>
      <span className="g-art">
        {g.coverUrl ? <img src={cdn(g.coverUrl, 360)} alt="" loading="lazy" />
          : g.iconUrl ? <span className="g-paper"><img className="g-icon" src={cdn(g.iconUrl, 160)} alt="" loading="lazy" /></span>
          : <span className={`g-ph ${family(g.platform)}`}><small>{g.platform || (own(g) ? 'Tự chế' : '')}</small><span>{g.title}</span></span>}
        {(g.portal || g.machine) && <em className="g-tag">Chơi được</em>}
        {g.favorite && <em className="g-fav" title="Yêu thích">♥</em>}
      </span>
      <b>{g.title}</b><small>{sub}</small>
    </Link>
  );
}

/** the sidebar while in Game: the shelf and its views, the series, the machines */
export function GamesSide() {
  const games = useGames(), series = useGameSeries(), loc = useLocation(), [sp] = useSearchParams();
  const mine = (games.data ?? []).filter(isMine), view = sp.get('view'), device = sp.get('device'), path = loc.pathname;
  const devices = useMemo(() => { const s = new Set<string>(); mine.forEach(g => g.devices?.forEach(d => s.add(d))); return Object.keys(DEVICES).filter(d => s.has(d)); }, [mine]);
  const shelf = path === '/games' && !view && !device;
  return (
    <>
      <h4>Game</h4>
      <Link to="/games" className={shelf ? 'on' : ''}>Kệ game</Link>
      {mine.some(g => g.portal || g.machine) && <Link to="/games?view=play" className={view === 'play' ? 'on' : ''}>Chơi được</Link>}
      <Link to="/games?view=homemade" className={view === 'homemade' ? 'on' : ''}>Tự chế</Link>
      <Link to="/games?view=favorite" className={view === 'favorite' ? 'on' : ''}>Yêu thích</Link>
      <Link to="/games?view=traces" className={view === 'traces' ? 'on' : ''}>Dấu vết</Link>
      {!!series.data?.length && <h4>Series</h4>}
      {series.data?.map(s => <Link key={s.key} to={`/games/series/${s.key}`} className={path === `/games/series/${s.key}` ? 'on' : ''}>{s.name}</Link>)}
      {devices.length > 0 && <h4>Chơi trên</h4>}
      {devices.map(d => <Link key={d} to={`/games?device=${d}`} className={device === d ? 'on' : ''}>{deviceName(d)}</Link>)}
    </>
  );
}

// ── a series ─────────────────────────────────────────────────────────────────

export function GameSeriesPage() {
  const { key } = useParams();
  const q = useQuery({ queryKey: ['game-series', key], enabled: !!key, staleTime: T, queryFn: () => hub.gameSeriesOne(key!) });
  const s = q.data;
  if (q.isLoading) return <div className="wrap page"><div className="card empty">Đang mở series…</div></div>;
  if (!s) return <div className="wrap page"><Link className="back" to="/games">← Game</Link><h1>Không tìm thấy series này</h1></div>;
  const games = [...s.games].sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999) || byYear(a, b));
  const official = games.filter(g => !own(g)), made = games.filter(own);
  return (
    <div className="wrap page games">
      <Link className="back" to="/games">← Game</Link>
      <div className="ptitle"><h1>{s.name}</h1></div>
      {s.summary && <p className="g-lede">{s.summary}</p>}
      <div className="g-grid">{official.map(g => <GameBox key={g.key} g={g} ghost={!isMine(g)} />)}</div>
      {made.length > 0 && <><div className="hd g-sub"><h2>Tự chế</h2></div><div className="g-grid">{made.map(g => <GameBox key={g.key} g={g} />)}</div></>}
    </div>
  );
}

// ── one game ─────────────────────────────────────────────────────────────────

/** "05/2007 – 03/2008", "~2002 – 2004", "22/11/1998" — as far as the dates are known */
export function playWhen(p: Pick<GamePlay, 'startAt' | 'endAt' | 'precision' | 'approx'>): string {
  const f = (iso: string, prec: string) => prec === 'YEAR' || prec === 'DECADE' ? iso.slice(0, 4)
    : prec === 'MONTH' || prec === 'SEASON' ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const start = f(p.startAt, p.precision);
  let end = '';
  if (p.endAt && p.endAt.slice(0, 10) !== p.startAt.slice(0, 10)) end = f(p.endAt, p.precision === 'YEAR' ? 'YEAR' : p.endAt.slice(8, 10) === '01' ? 'MONTH' : 'DAY');
  return (p.approx ? '~' : '') + (end && end !== start ? `${start} – ${end}` : start);
}
/** a moment inside a play to start its machine at, in the evening as he would have played */
function playAt(p: GamePlay): string {
  const d = new Date(p.startAt.slice(0, 10) + 'T12:00:00Z');
  if (p.precision === 'YEAR') d.setUTCMonth(5, 15); else if (p.precision === 'MONTH') d.setUTCDate(15);
  const end = p.endAt ? new Date(p.endAt.slice(0, 10) + 'T12:00:00Z') : null;
  const t = end && d >= end ? new Date(p.startAt.slice(0, 10) + 'T12:00:00Z') : d;
  return `${t.toISOString().slice(0, 10)}T21:00`;
}
const pcHref = (device: string, at: string, open?: string) => `/${device.startsWith('phone') ? 'phone' : 'pc'}?at=${encodeURIComponent(at)}&device=${device}${open ? `&open=${encodeURIComponent(open)}` : ''}`;

export function GamePage() {
  const { key } = useParams(), games = useGames();
  const q = useQuery({ queryKey: ['game', key], enabled: !!key, staleTime: T, queryFn: () => hub.game(key!) });
  const [viewer, setViewer] = useState<number | null>(null);
  const g = q.data;
  if (q.isLoading) return <div className="reader"><article className="article"><p className="empty">Đang mở game…</p></article></div>;
  if (!g) return <div className="reader"><article className="article"><Link className="back" to="/games">← Game</Link><h1>Không tìm thấy game này</h1></article></div>;

  const order = shelfOrder(games.data ?? []), i = order.findIndex(x => x.key === g.key), prev = i > 0 ? order[i - 1] : undefined, next = i >= 0 ? order[i + 1] : undefined;
  const photos: MediaFile[] = g.media.filter(m => m.role !== 'ICON').map(m => ({ ...m.media, caption: m.label || m.media.caption }));
  const play = g.packages.filter(p => p.portal && p.hasFile !== false);
  const pageLinks = g.links.filter(l => l.kind === 'PLAY'), watch = g.links.filter(l => l.kind !== 'PLAY');
  const icon = g.media.find(m => m.role === 'ICON')?.media;
  const ROM = new Set(['GBA', 'GB', 'GBC', 'SNES', 'NES', 'NDS']);
  const isRom = (k: string) => ROM.has(g.packages.find(p => p.key === k)?.engine ?? '');
  const title = (k: string) => g.packages.find(p => p.key === k)?.title ?? k;
  /** one way into each machine per package (the same machine twice when its two eras both had it); a folder of many
   *  games (Win Games) is one way into each machine, where its Start menu has them all */
  const once = g.spots.filter((s, i, all) => all.findIndex(x => x.deviceKey === s.deviceKey && x.packageKey === s.packageKey) === i);
  const many = new Set(once.map(s => s.deviceKey).filter(d => once.filter(x => x.deviceKey === d).length > 3));
  const spots = once.filter((s, i) => !many.has(s.deviceKey) || once.findIndex(x => x.deviceKey === s.deviceKey) === i);
  const meta = [g.series?.name, g.platform, g.releaseYear, g.developer].filter(Boolean);
  const around = (games.data ?? []).filter(x => x.key !== g.key && isMine(x) && !own(x) && overlaps(x, g)).sort(byPlay).slice(0, 6);

  return (
    <div className="page games">
      <div className="reader">
        <article className="article g-article">
          <Link className="back" to="/games">← Game</Link><br />
          <span className="cat">{KIND[g.kind] ? [KIND[g.kind], ...meta].join(' · ') : meta.join(' · ')}</span>
          <h1>{g.title}</h1>
          {g.versions && <div className="g-versions">{g.versions.split(/,\s*/).map(v => <span key={v} className="chip">{v}</span>)}</div>}
          {g.summary && <p className="dek">{g.summary}</p>}
          {g.note && <blockquote className="g-note">“{g.note}”</blockquote>}

          {(play.length > 0 || spots.length > 0 || pageLinks.length > 0) && <div className="g-play">
            {play.map(p => <Link key={p.key} className="g-btn main" to={`/games/play/${p.key}`}>▶ Chơi ngay{play.length > 1 ? ` · ${p.title || p.engine}` : ''}</Link>)}
            {spots.map(s => <a key={s.packageKey + s.deviceKey + s.at} className="g-btn"
              href={many.has(s.deviceKey) ? pcHref(s.deviceKey, s.at) : pcHref(s.deviceKey, s.at, `${isRom(s.packageKey) ? 'rom' : 'game'}:${s.packageKey}`)}>
              Mở trên {s.deviceName}{!many.has(s.deviceKey) && spots.filter(x => x.deviceKey === s.deviceKey).length > 1 ? ` · ${title(s.packageKey)}` : ''}</a>)}
            {pageLinks.map(l => <a key={l.id} className="g-btn main" href={l.url} target="_blank" rel="noreferrer">▶ {l.title || 'Chơi'}</a>)}
          </div>}

          {g.plays.length > 0 && <><h5 className="mem-h">Những lần chơi</h5>
            <ol className="g-plays">{g.plays.map(p => <li key={p.id}>
              <time>{playWhen(p)}</time>
              <div>
                {(p.deviceKey || p.via || p.version) && <b>{p.deviceKey ? <a href={pcHref(p.deviceKey, playAt(p))}>{p.deviceName || deviceName(p.deviceKey)}</a> : p.via || p.version}</b>}
                {p.deviceKey && (p.via || p.version) && <span className="g-via">{[p.via, p.version].filter(Boolean).join(' · ')}</span>}
                {!p.deviceKey && p.via && p.version && <span className="g-via">{p.version}</span>}
                {p.evidence && <p>{p.evidence}</p>}
                {p.note && <p className="g-pnote">{p.note}</p>}
              </div>
            </li>)}</ol></>}

          {photos.length > 0 && <div className="mem-photos"><Justified items={photos} rowHeight={190} gap={8} onOpen={setViewer} /></div>}

          {g.memories.length > 0 && <><h5 className="mem-h">Ký ức</h5>
            <div className="posts g-mems">{g.memories.map(m => <Link key={m.id} className="post" to={`/memories/${m.id}`}>
              <div><span className="cat">{about(m.when)}</span><h4>{m.title || m.summary}</h4>{m.title && m.summary && <p>{m.summary}</p>}</div>
              {m.coverUrl ? <img src={cdn(m.coverUrl, 240)} alt="" /> : <span className="noimg" />}
            </Link>)}</div></>}

          {g.basedOn && <><h5 className="mem-h">Bắt nguồn từ</h5><div className="g-grid small"><GameBox g={g.basedOn} ghost={!isMine(g.basedOn)} /></div></>}
          {g.derived.length > 0 && <><h5 className="mem-h">Từ game này</h5><div className="g-grid small">{g.derived.map(d => <GameBox key={d.key} g={d} />)}</div></>}

          {watch.length > 0 && <><h5 className="mem-h">Xem thêm</h5>
            <div className="g-links">{watch.map(l => <a key={l.id} href={l.url} target="_blank" rel="noreferrer">
              <small>{LINK[l.kind] ?? l.kind}</small><b>{l.title || l.url}</b>{l.note && <span>{l.note}</span>}</a>)}</div></>}

          <div className="pn">{prev ? <Link to={`/games/${prev.key}`}><small>← Trước đó</small><b>{prev.title}</b></Link> : <span />}
            {next ? <Link to={`/games/${next.key}`}><small>Sau đó →</small><b>{next.title}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          {(g.handOrder || g.handName) && <Link className="g-handnote" to={LIST_2004}>
            {(g.iconUrl || icon) && <img src={cdn(g.iconUrl || icon?.cdnUrl, 160)} alt="" />}
            <span className="hand">{g.handName}</span>
            <small>{g.handOrder ? `Số ${g.handOrder} trong danh sách 100 trò, 2004` : 'Trong danh sách trò chơi, 2004'}</small>
          </Link>}
          {g.seriesGames.length > 1 && <div><h5>{g.series?.name}</h5><nav className="mem-same g-same">{g.seriesGames.map(x => x.key === g.key
            ? <span key={x.key} className="on">{x.title}<small>{about(x.played) || x.releaseYear || ''}</small></span>
            : <Link key={x.key} to={`/games/${x.key}`} className={isMine(x) ? '' : 'ghost'}>{x.title}<small>{about(x.played) || x.releaseYear || ''}</small></Link>)}</nav></div>}
          {around.length > 0 && <div><h5>Cùng thời</h5><nav className="mem-same g-same">{around.map(x => <Link key={x.key} to={`/games/${x.key}`}>{x.title}<small>{about(x.played)}</small></Link>)}</nav></div>}
        </aside>
      </div>
      {viewer !== null && <Viewer items={photos} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

/** two games played in the same stretch of years */
function overlaps(a: GameCard, b: GameDetail): boolean {
  if (!a.playFrom || !b.playFrom) return false;
  const aTo = a.playTo ?? a.playFrom, bTo = b.playTo ?? b.playFrom;
  const pad = (iso: string, d: number) => { const t = new Date(iso); t.setUTCMonth(t.getUTCMonth() + d); return t.toISOString(); };
  return a.playFrom < pad(bTo, 3) && pad(aTo, 3) > b.playFrom;
}
