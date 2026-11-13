/* Game: the shelf of games he played — by the machines of each period (each shelf opens on a band in the colour of
   its years, with the way into that machine), his own games on a shelf of their own, the series with their versions —
   and one game with when and on what he played it, his pictures and memories of it, the games he made from it, the
   videos to watch it again and, where it can be, the game itself. The shelf opens on the games he likes best or, with
   a day picked on the calendar, on what he was playing then. Other people's games he copied from the web to look at
   when he vibe-codes (kind REFERENCE) stand on a last shelf of their own, never among the periods. His numbered list
   of 100 games (2004) is the one sheet of squared paper here: it is his own handwriting. Everything is read here; it
   is written through the admin and game-shelf-src. */
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import { dayMonthYear, vnClock } from '../lib/date';
import { eraClass } from '../lib/era';
import { deviceRange, gamesAt } from '../lib/life';
import { useDesk } from '../lib/desk';
import { isoOf, useMoment } from '../lib/moment';
import Justified from '../components/Justified';
import Viewer from '../components/Viewer';
import type { DeskDevice, GameCard, GameDetail, GameMatch, GamePlay, GameTrace, MediaFile } from '../types';

const T = 10 * 60_000;
/** the memory that keeps his lists of games of 2004 (the homemade ones, the 50 sets, the numbered 100) */
const LIST_2004 = '/memories/82fa0730-5766-4112-837a-99ccaa86e340';
export const useGames = () => useQuery({ queryKey: ['games'], queryFn: hub.games, staleTime: T });
export const useGameSeries = () => useQuery({ queryKey: ['game-series'], queryFn: hub.gameSeries, staleTime: T });

/** The periods of the shelf, by the machines he had: a game sits in the period he first played it. Each takes the
 *  tint of the portal's era its years fall in, and names the machines that can be turned on from it. */
const ERAS: { key: string; name: string; from: string; to: string; range: string; tint: number; machines: string[] }[] = [
  { key: 'win98', name: 'PC Win 98', from: '', to: '2004-01-01', range: '1998 – 2003', tint: 2001, machines: ['pc-old'] },
  { key: 'xp', name: 'PC Win XP · Fujitsu', from: '2004-01-01', to: '2008-09-15', range: '2004 – 2008', tint: 2005, machines: ['pc-xp', 'pc-fujitsu'] },
  { key: 'hp', name: 'HP Pavilion', from: '2008-09-15', to: '2015-01-01', range: '2008 – 2014', tint: 2008, machines: ['pc-hp'] },
  { key: 'asus', name: 'Asus', from: '2015-01-01', to: '2019-09-24', range: '2015 – 2019', tint: 2013, machines: ['pc-asus'] },
  { key: 'us', name: 'Những năm ở Mỹ', from: '2019-09-24', to: '2023-01-01', range: '2019 – 2022', tint: 2018, machines: ['pc-thinkpad'] },
  { key: 'now', name: 'Từ 2023', from: '2023-01-01', to: '9999', range: '', tint: 2023, machines: ['pc-now'] },
];
const DEVICES: Record<string, string> = {
  'pc-old': 'PC Win 98', 'pc-school': 'PC trường Thống Nhất', 'pc-xp': 'PC Win XP', 'pc-fujitsu': 'Fujitsu FMV', 'pc-hp': 'HP Pavilion', 'pc-asus': 'Asus N56',
  'pc-thinkpad': 'Lenovo ThinkPad', 'pc-now': 'Laptop', 'phone-nokia': 'Nokia', 'phone-iphone6': 'iPhone 6s', 'phone-iphone11': 'iPhone 11', 'phone-iphone13': 'iPhone 13',
};
export const deviceName = (k?: string | null) => (k ? DEVICES[k] ?? k : '');
const REFERENCE = 'Tham khảo vibe code';
const KIND: Record<string, string> = { FAN: 'Fan game', HOMEMADE: 'Tự chế', REMAKE: 'Remake', REFERENCE };
const LINK: Record<string, string> = { WALKTHROUGH: 'Walkthrough', LONGPLAY: 'Longplay', WIKI: 'Wikipedia', MANUAL: 'Hướng dẫn', OFFICIAL: 'Trang chính thức', PLAY: 'Chơi', SOUNDTRACK: 'Nhạc', VIDEO: 'Video', OTHER: 'Link' };

/** the look of a game with no picture yet: the kind of machine or table it is played on */
const family = (p?: string | null) => !p ? 'plain' : /Notebook/.test(p) ? 'paper' : /Board|Cards/.test(p) ? 'table' : /Web/.test(p) ? 'web'
  : /Game Boy|DS|Switch|NES|SNES|3DS|Nintendo/.test(p) ? 'nin' : /Mobile/.test(p) ? 'mobile' : /DOS|Windows|PC|Arcade|Mega Drive|Age of Empires|Warcraft/.test(p) ? 'pc' : 'plain';
/** "~2004 – 2011" reads "khoảng 2004 – 2011"; "2007-05" reads "05/2007" */
const about = (t?: string | null) => (t ?? '').replace(/^~/, 'khoảng ').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1').replace(/\b(\d{4})-(\d{2})\b/g, '$2/$1');
/** "The Age of Kings, The Conquerors" as its versions; a comma inside brackets ("Collection (PC, 1997)") is not a cut */
const versionsOf = (v?: string | null) => (v ?? '').split(/,\s*(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
/** what he types to find a game, without accents or case */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const own = (g: GameCard) => g.kind === 'HOMEMADE' || g.kind === 'REMAKE';
/** someone else's game, kept to look at: not his, and not from any of his periods */
const ref = (g: GameCard) => g.kind === 'REFERENCE';
const isMine = (g: GameCard) => g.mine ?? (!!g.played || !!g.handName || own(g) || g.favorite || g.portal || g.machine);
/** an official game stands on a period's shelf when he played it then, wrote it in his 2004 lists, or it plays here */
const onShelf = (g: GameCard) => !ref(g) && (!!g.playFrom || !!g.handName || g.portal || g.machine);
/** the period he first played it in; a game numbered in his list of 100 (2004) is from the PC Win 98 years */
const eraOf = (g: GameCard) => { const t = g.handOrder && (!g.playFrom || g.playFrom >= '2004') ? '' : g.playFrom ?? ''; return ERAS.find(e => t >= e.from && t < e.to)?.key ?? 'win98'; };
const byPlay = (a: GameCard, b: GameCard) => (a.playFrom ?? '9').localeCompare(b.playFrom ?? '9') || (a.handOrder ?? 999) - (b.handOrder ?? 999) || a.title.localeCompare(b.title);
const byYear = (a: GameCard, b: GameCard) => (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999) || a.title.localeCompare(b.title);
/** the order the shelf reads in, for "previous / next" on a game; the games kept to look at only lead to one another */
const shelfOrder = (all: GameCard[], among?: GameCard) => {
  const mine = all.filter(isMine);
  if (among && ref(among)) return mine.filter(ref).sort(byYear);
  return [...ERAS.flatMap(e => mine.filter(g => !own(g) && onShelf(g) && eraOf(g) === e.key).sort(byPlay)), ...mine.filter(own).sort(byYear)];
};

/** An evening late in a machine's time, when everything he played on it is there: a month before it left (Vietnam
 *  clock); a machine he still has is turned on as it is now. */
function lateEvening(d: DeskDevice): string | undefined {
  if (!d.to) return undefined;
  return `${new Date(new Date(`${d.to}Z`).getTime() + 7 * 3600_000 - 30 * 86400_000).toISOString().slice(0, 10)}T21:00`;
}
const pcHref = (device: string, at?: string, open?: string) => `/${device.startsWith('phone') ? 'phone' : 'pc'}?${at ? `at=${encodeURIComponent(at)}&` : ''}device=${device}${open ? `&open=${encodeURIComponent(open)}` : ''}`;
const PC = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.6" /><path d="M9 20h6M12 16v4" /></svg>;

// ── the shelf ────────────────────────────────────────────────────────────────

export function GamesIndex() {
  const games = useGames(), desk = useDesk(), [sp] = useSearchParams(), { moment, picked } = useMoment();
  const [typed, setTyped] = useState('');
  const view = sp.get('view'), device = sp.get('device');
  const all = games.data ?? [], mine = all.filter(isMine), machines = desk.data?.machines ?? [];
  const needle = fold(typed.trim());
  const hit = (g: GameCard) => !needle || fold(`${g.title} ${g.handName ?? ''} ${g.series?.name ?? ''} ${g.platform ?? ''}`).includes(needle);
  const filtered = view === 'play' ? mine.filter(g => g.portal || g.machine)
    : view === 'homemade' ? mine.filter(own)
    : view === 'reference' ? mine.filter(ref)
    : view === 'favorite' ? mine.filter(g => g.favorite)
    : device ? mine.filter(g => g.devices?.includes(device)) : null;
  const title = view === 'play' ? 'Chơi được' : view === 'homemade' ? 'Game tự chế' : view === 'reference' ? REFERENCE : view === 'favorite' ? 'Yêu thích' : view === 'traces' ? 'Dấu vết' : device ? deviceName(device) : 'Game';
  const whole = !view && !device;
  const listed = mine.filter(g => g.handOrder).sort((a, b) => (a.handOrder ?? 0) - (b.handOrder ?? 0));
  // the top of the shelf: what he was playing on the day picked, else the ones he likes best
  const iso = picked && moment ? isoOf(moment) : null;
  const then = iso ? gamesAt(mine, iso).slice(0, 5) : [];
  const opener = then.length ? then : mine.filter(g => g.favorite && !ref(g)).sort(byPlay).slice(0, 5);
  const computer = then.length ? desk.data?.computer?.device : undefined;
  const shown = filtered ? [...filtered].filter(hit).sort(view === 'homemade' || view === 'reference' ? byYear : byPlay) : [];
  const turnedOn = device ? machines.find(d => d.key === device) : undefined;

  return (
    <div className="wrap page gm">
      <header className="mm-head">
        {!whole && <Link className="back gm-up" to="/games">← Kệ game</Link>}
        <h1>{title}</h1>
        {turnedOn && <span className="ph-n">{deviceRange(turnedOn)}</span>}
        {turnedOn && <a className="gm-go" href={pcHref(turnedOn.key, lateEvening(turnedOn))}>{PC}Bật {turnedOn.name}</a>}
        {view !== 'traces' && <label className="msearch">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input value={typed} onChange={ev => setTyped(ev.target.value)} placeholder="Tìm game…" />
          {typed && <button type="button" onClick={() => setTyped('')}>×</button>}
        </label>}
      </header>
      {games.isLoading && <p className="jn-wait">Đang mở kệ game…</p>}
      {view === 'traces' ? <Traces />
        : filtered ? (shown.length ? <div className="gm-grid">{shown.map(g => <GameBox key={g.key} g={g} />)}</div>
          : !games.isLoading && <p className="jn-wait">{needle ? 'Không thấy game nào khớp.' : 'Chưa có game nào ở đây.'}</p>)
        : <>
          {!needle && opener.length > 0 && <section className={`gm-open ${then.length && moment ? `then ${eraClass(moment.y)}` : ''}`}>
            <div className="gm-open-hd">
              <h2>{then.length ? 'Lúc đó anh đang chơi' : 'Game anh thích nhất'}</h2>
              {then.length > 0 && iso && <span>{dayMonthYear(iso)}</span>}
              {computer && iso && <a className="gm-go" href={`/pc?at=${encodeURIComponent(`${iso}T21:00`)}`}>{PC}Bật {computer.name}</a>}
            </div>
            <div className="gm-feat">{opener.map(g => <GameBox key={g.key} g={g} big />)}</div>
          </section>}
          {ERAS.map(e => {
            const gs = mine.filter(g => !own(g) && onShelf(g) && eraOf(g) === e.key && hit(g)).sort(byPlay);
            return gs.length > 0 && <div key={e.key}>
              <Shelf id={`shelf-${e.key}`} name={e.name} range={e.range} tint={e.tint} games={gs} machines={e.machines.map(k => machines.find(d => d.key === k)).filter((d): d is DeskDevice => !!d)} />
              {e.key === 'win98' && !needle && listed.length > 0 && <HandList games={listed} />}
            </div>;
          })}
          {mine.some(g => own(g) && hit(g)) && <Shelf name="Tự chế" note="game anh tự vẽ, tự làm" games={mine.filter(g => own(g) && hit(g)).sort(byYear)} />}
          {mine.some(g => ref(g) && hit(g)) && <Shelf name={REFERENCE} note="game của người khác, giữ lại để xem" games={mine.filter(g => ref(g) && hit(g)).sort(byYear)} />}
          {!!needle && !games.isLoading && !mine.some(hit) && <p className="jn-wait">Không thấy game nào khớp.</p>}
        </>}
    </div>
  );
}

/** One period of the shelf: a band in the colour of its years — the machine's name, its years, the way into it —
 *  then every game first played then. The two shelves that are not a period (his own games, the ones kept to look at)
 *  open on a plain band. */
function Shelf({ id, name, range, note, tint, games, machines = [] }: { id?: string; name: string; range?: string; note?: string; tint?: number; games: GameCard[]; machines?: DeskDevice[] }) {
  return (
    <section className="gm-shelf" id={id}>
      <header className={`gm-band ${tint ? eraClass(tint) : 'plain'}`}>
        <b>{name}</b>{range && <span>{range}</span>}{note && <span>{note}</span>}
        {machines.length > 0 && <span className="gm-band-go">{machines.map(d => <a key={d.key} href={pcHref(d.key, lateEvening(d))}>{PC}Bật {d.name}</a>)}</span>}
      </header>
      <div className="gm-grid">{games.map(g => <GameBox key={g.key} g={g} />)}</div>
    </section>
  );
}

/** His numbered list of 100 games (2004), on the squared paper it was written on: the names as he wrote them, his
 *  little drawings, each line leading to its game. */
function HandList({ games }: { games: GameCard[] }) {
  return (
    <section className="gm-hand">
      <div className="gm-hand-sheet">
        <h2>Danh sách 100 trò, 2004</h2>
        <ol>{games.map(g => <li key={g.key}><Link to={`/games/${g.key}`}>
          <i>{g.handOrder}</i>{g.iconUrl ? <img src={cdn(g.iconUrl, 96)} alt="" loading="lazy" /> : <span />}
          <span><b>{g.handName}</b><small>{g.title}</small></span>
        </Link></li>)}</ol>
        <Link className="gm-hand-more" to={LIST_2004}>Xem bản viết tay</Link>
      </div>
    </section>
  );
}

/** Every play that left something behind — a save, a score table with his name, a settings file, his own words — in
 *  the order it happened: what each game's page shows under "Những lần chơi", in one list, year by year. */
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
  if (q.isLoading) return <p className="jn-wait">Đang tìm dấu vết…</p>;
  return (
    <div className="gm-traces">
      {years.map(([y, ts]) => <section key={y} className={`mm-year ${eraClass(+y)}`}>
        <div className="mm-yh"><b>{y}</b></div>
        <ol className="gm-plays flat">{ts.map(({ gameKey, gameTitle, play: p }) => <li key={p.id}>
          <time>{about(playWhen(p))}</time>
          <div>
            <b><Link to={`/games/${gameKey}`}>{gameTitle}</Link></b>
            {p.deviceKey ? <span className="gm-via"><a href={pcHref(p.deviceKey, playAt(p))}>{p.deviceName || deviceName(p.deviceKey)}</a></span>
              : p.via ? <span className="gm-via">{p.via}</span> : null}
            <p>{p.evidence}</p>
          </div>
        </li>)}</ol>
      </section>)}
    </div>
  );
}

/** a game on the shelf: its picture (his little drawing, or a label when there is none), its name, when he played it */
export function GameBox({ g, ghost, big }: { g: GameCard; ghost?: boolean; big?: boolean }) {
  const sub = g.played ? about(g.played) : own(g) ? [g.releaseYear, g.platform].filter(Boolean).join(' · ') : g.handName ? 'Trước 2004' : g.platform ?? '';
  return (
    <Link className={`gm-box ${ghost ? 'ghost' : ''} ${big ? 'big' : ''}`} to={`/games/${g.key}`} title={g.title}>
      <span className="gm-art">
        {g.coverUrl ? <img src={cdn(g.coverUrl, big ? 640 : 360)} alt="" loading="lazy" />
          : g.iconUrl ? <span className="gm-draw"><img src={cdn(g.iconUrl, 160)} alt="" loading="lazy" /></span>
          : <span className={`gm-ph ${family(g.platform)}`}><small>{g.platform || (own(g) ? 'Tự chế' : '')}</small><span>{g.title}</span></span>}
        {ref(g) ? <em className="gm-tag ref">Tham khảo</em> : (g.portal || g.machine) && <em className="gm-tag">Chơi được</em>}
        {g.favorite && <em className="gm-fav" title="Yêu thích">♥</em>}
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
      {mine.some(ref) && <Link to="/games?view=reference" className={view === 'reference' ? 'on' : ''}>{REFERENCE}</Link>}
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
  if (q.isLoading) return <div className="wrap page gm"><p className="jn-wait">Đang mở series…</p></div>;
  if (!s) return <div className="wrap page gm"><header className="mm-head"><Link className="back gm-up" to="/games">← Kệ game</Link><h1>Không tìm thấy series này</h1></header></div>;
  const games = [...s.games].sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999) || byYear(a, b));
  const official = games.filter(g => !own(g)), made = games.filter(own);
  return (
    <div className="wrap page gm">
      <header className="mm-head"><Link className="back gm-up" to="/games">← Kệ game</Link><h1>{s.name}</h1></header>
      {s.summary && <p className="mm-lede">{s.summary}</p>}
      <div className="gm-grid">{official.map(g => <GameBox key={g.key} g={g} ghost={!isMine(g)} />)}</div>
      {made.length > 0 && <section className="gm-shelf gm-made">
        <header className="gm-band plain"><b>Tự chế</b><span>game anh làm từ series này</span></header>
        <div className="gm-grid">{made.map(g => <GameBox key={g.key} g={g} />)}</div>
      </section>}
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
/** a moment inside a play to start its machine at, in the evening as he would have played: the one the API gives (a day
 *  that machine was there), else the middle of what the play's date says */
function playAt(p: GamePlay): string {
  if (p.at) return p.at;
  const d = new Date(p.startAt.slice(0, 10) + 'T12:00:00Z');
  if (p.precision === 'YEAR') d.setUTCMonth(5, 15); else if (p.precision === 'MONTH') d.setUTCDate(15);
  const end = p.endAt ? new Date(p.endAt.slice(0, 10) + 'T12:00:00Z') : null;
  const t = end && d >= end ? new Date(p.startAt.slice(0, 10) + 'T12:00:00Z') : d;
  return `${t.toISOString().slice(0, 10)}T21:00`;
}

export function GamePage() {
  const { key } = useParams(), games = useGames();
  const q = useQuery({ queryKey: ['game', key], enabled: !!key, staleTime: T, queryFn: () => hub.game(key!) });
  const [viewer, setViewer] = useState<number | null>(null);
  const g = q.data;
  if (q.isLoading) return <div className="page gm"><div className="gm-wait"><p className="jn-wait">Đang mở game…</p></div></div>;
  if (!g) return <div className="page gm"><div className="gm-wait"><Link className="back" to="/games">← Game</Link><h1>Không tìm thấy game này</h1></div></div>;

  const order = shelfOrder(games.data ?? [], g), i = order.findIndex(x => x.key === g.key), prev = i > 0 ? order[i - 1] : undefined, next = i >= 0 ? order[i + 1] : undefined;
  const photos: MediaFile[] = g.media.filter(m => m.role !== 'ICON').map(m => ({ ...m.media, caption: m.label || m.media.caption }));
  const play = g.packages.filter(p => p.portal && p.hasFile !== false);
  const pageLinks = g.links.filter(l => l.kind === 'PLAY'), watch = g.links.filter(l => l.kind !== 'PLAY');
  const icon = g.iconUrl || g.media.find(m => m.role === 'ICON')?.media.cdnUrl;
  const ROM = new Set(['GBA', 'GB', 'GBC', 'SNES', 'NES', 'NDS']);
  const isRom = (k: string) => ROM.has(g.packages.find(p => p.key === k)?.engine ?? '');
  const title = (k: string) => g.packages.find(p => p.key === k)?.title ?? k;
  /** one way into each machine per package (the same machine twice when its two eras both had it); a folder of many
   *  games (Win Games) is one way into each machine, where its Start menu has them all */
  const once = g.spots.filter((s, i, all) => all.findIndex(x => x.deviceKey === s.deviceKey && x.packageKey === s.packageKey) === i);
  const many = new Set(once.map(s => s.deviceKey).filter(d => once.filter(x => x.deviceKey === d).length > 3));
  const spots = once.filter((s, i) => !many.has(s.deviceKey) || once.findIndex(x => x.deviceKey === s.deviceKey) === i);
  const meta = [KIND[g.kind], g.series?.name, g.platform, g.releaseYear, g.developer].filter(Boolean);
  const around = (games.data ?? []).filter(x => x.key !== g.key && isMine(x) && !own(x) && overlaps(x, g)).sort(byPlay).slice(0, 6);
  // the band at the top takes the colour of its years: for a game he made, the year he made it; else the year he first
  // played it — but a game of his list of 100 is from before 2004, whatever was found of it later
  const made = own(g) && g.releaseYear ? g.releaseYear : null;
  const listed = !made && !!g.handOrder && (!g.playFrom || g.playFrom >= '2004');
  const year = made ?? (listed || !g.playFrom ? null : +g.playFrom.slice(0, 4));
  const tint = year ?? (g.handName ? 2001 : null);
  const when = !listed && g.played ? about(g.played) : '';
  if (!year && !when && g.handName) meta.push('chơi trước 2004');

  return (
    <div className="page gm">
      <header className={`mm-top gm-top ${tint ? eraClass(tint) : 'plain'}`}>
        <div className="mm-top-in">
          {year ? <div className="mm-top-y"><b>{year}</b>{when && when !== String(year) && <span>{when}</span>}</div> : when ? <div className="mm-top-y"><span>{when}</span></div> : null}
          <div className="mm-top-t">
            <Link className="back" to="/games">← Game</Link>
            {meta.length > 0 && <span className="mm-k">{meta.join(' · ')}</span>}
            <h1>{g.title}</h1>
            {g.versions && <div className="gm-versions">{versionsOf(g.versions).map(v => <span key={v}>{v}</span>)}</div>}
            {g.summary && <p className="gm-dek">{g.summary}</p>}
            {(play.length > 0 || spots.length > 0 || pageLinks.length > 0) && <div className="gm-acts">
              {play.map(p => <Link key={p.key} className="gm-btn main" to={`/games/play/${p.key}`}>▶ Chơi ngay{play.length > 1 ? ` · ${p.title || p.engine}` : ''}</Link>)}
              {pageLinks.map(l => <a key={l.id} className="gm-btn main" href={l.url} target="_blank" rel="noreferrer">▶ {l.title || 'Chơi'}</a>)}
              {spots.map(s => <a key={s.packageKey + s.deviceKey + s.at} className="gm-btn"
                href={many.has(s.deviceKey) ? pcHref(s.deviceKey, s.at) : pcHref(s.deviceKey, s.at, `${isRom(s.packageKey) ? 'rom' : 'game'}:${s.packageKey}`)}>
                {PC}Mở trên {s.deviceName}{!many.has(s.deviceKey) && spots.filter(x => x.deviceKey === s.deviceKey).length > 1 ? ` · ${title(s.packageKey)}` : ''}</a>)}
            </div>}
          </div>
          {g.coverUrl ? <div className="gm-top-art"><img src={cdn(g.coverUrl, 720)} alt="" /></div>
            : icon ? <div className="gm-top-art draw"><img src={cdn(icon, 320)} alt="" /></div> : null}
        </div>
      </header>

      <div className="reader">
        <article className="article">
          {g.note && <p className="gm-said">“{g.note}”</p>}

          {g.plays.length > 0 && <><h2 className="gm-h">Những lần chơi</h2>
            <ol className="gm-plays">{g.plays.map(p => <li key={p.id}>
              <time>{about(playWhen(p))}</time>
              <div>
                {(p.deviceKey || p.via || p.version) && <b>{p.deviceKey ? <a href={pcHref(p.deviceKey, playAt(p))}>{p.deviceName || deviceName(p.deviceKey)}</a> : p.via || p.version}</b>}
                {p.deviceKey && (p.via || p.version) && <span className="gm-via">{[p.via, p.version].filter(Boolean).join(' · ')}</span>}
                {!p.deviceKey && p.via && p.version && <span className="gm-via">{p.version}</span>}
                {p.evidence && <p>{p.evidence}</p>}
                {p.note && <p className="gm-pnote">{p.note}</p>}
              </div>
            </li>)}</ol></>}

          {photos.length > 0 && <div className="gm-photos"><Justified items={photos} rowHeight={190} gap={8} onOpen={setViewer} /></div>}

          {g.hasMatches && <GameMatches gameKey={g.key} />}

          {g.memories.length > 0 && <><h2 className="gm-h">Ký ức</h2>
            <div className="gm-rows">{g.memories.map(m => <Link key={m.id} className="mm-line" to={`/memories/${m.id}`}>
              <span className="mm-d">{about(m.when)}</span>
              <span className="mm-b"><b>{m.title || m.summary}</b>{m.title && m.summary && <small className="gm-sum">{m.summary}</small>}</span>
              {m.coverUrl && <img src={cdn(m.coverUrl, 160)} alt="" loading="lazy" />}
            </Link>)}</div></>}

          {g.notes.length > 0 && <><h2 className="gm-h">Trong nhật ký</h2>
            <div className="gm-rows">{g.notes.map(n => <Link key={n.id} className="mm-line" to={n.slug ? `/journal/${n.slug}` : `/journal/id/${n.id}`}>
              <span className="mm-d">{n.writtenAt ? vnClock(n.writtenAt).slice(0, 10).split('-').reverse().join('/') : ''}</span>
              <span className="mm-b"><b>{n.title || 'Ghi chép'}</b>{n.excerpt && <small className="gm-sum">{n.excerpt}</small>}</span>
            </Link>)}</div></>}

          {g.basedOn && <><h2 className="gm-h">Bắt nguồn từ</h2><div className="gm-grid small"><GameBox g={g.basedOn} ghost={!isMine(g.basedOn)} /></div></>}
          {g.derived.length > 0 && <><h2 className="gm-h">Từ game này</h2><div className="gm-grid small">{g.derived.map(d => <GameBox key={d.key} g={d} />)}</div></>}

          {watch.length > 0 && <><h2 className="gm-h">Xem thêm</h2>
            <div className="gm-links">{watch.map(l => <a key={l.id} href={l.url} target="_blank" rel="noreferrer">
              <small>{LINK[l.kind] ?? l.kind}</small><b>{l.title || l.url}</b>{l.note && <span>{l.note}</span>}</a>)}</div></>}

          <div className="pn">{prev ? <Link to={`/games/${prev.key}`}><small>← Trước đó</small><b>{prev.title}</b></Link> : <span />}
            {next ? <Link to={`/games/${next.key}`}><small>Sau đó →</small><b>{next.title}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          {(g.handOrder || g.handName) && <Link className="gm-handnote" to={LIST_2004}>
            {icon && <img src={cdn(icon, 160)} alt="" />}
            <b>{g.handName}</b>
            <small>{g.handOrder ? `Số ${g.handOrder} trong danh sách 100 trò, 2004` : 'Trong danh sách trò chơi, 2004'}</small>
          </Link>}
          {g.seriesGames.length > 1 && <div><h5>{g.series?.name}</h5><nav className="mem-same gm-same">{g.seriesGames.map(x => x.key === g.key
            ? <span key={x.key} className="on">{x.title}<small>{about(x.played) || x.releaseYear || ''}</small></span>
            : <Link key={x.key} to={`/games/${x.key}`} className={isMine(x) ? '' : 'ghost'}>{x.title}<small>{about(x.played) || x.releaseYear || ''}</small></Link>)}</nav></div>}
          {around.length > 0 && <div><h5>Cùng thời</h5><nav className="mem-same gm-same">{around.map(x => <Link key={x.key} to={`/games/${x.key}`}>{x.title}<small>{about(x.played)}</small></Link>)}</nav></div>}
        </aside>
      </div>
      {viewer !== null && <Viewer items={photos} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
/** "Thứ Ba, 11/07/2017" from a wall-clock day */
const dayName = (day: string) => `${WEEKDAY[new Date(day + 'T12:00:00Z').getUTCDay()]}, ${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

/** The results kept for a game: one month at a time (the last one first), each day's matches in the order they were
 *  written down — the two sides, the games each took, the map. His own name stands out. */
function GameMatches({ gameKey }: { gameKey: string }) {
  const q = useQuery({ queryKey: ['game-matches', gameKey], staleTime: T, queryFn: () => hub.gameMatches(gameKey) });
  const [picked, setPicked] = useState<string | null>(null);
  const all = q.data ?? [];
  const months = useMemo(() => [...new Set(all.map(m => m.playedAt.slice(0, 7)))], [all]);
  const month = picked && months.includes(picked) ? picked : months[months.length - 1];
  const days = useMemo(() => {
    const by = new Map<string, GameMatch[]>();
    all.filter(m => m.playedAt.slice(0, 7) === month).forEach(m => { const d = m.playedAt.slice(0, 10); by.set(d, [...(by.get(d) ?? []), m]); });
    return [...by.entries()];
  }, [all, month]);
  if (q.isLoading) return <><h2 className="gm-h">Kết quả các kèo</h2><p className="jn-wait">Đang mở sổ kết quả…</p></>;
  if (!all.length) return null;
  const side = (ps: GameMatch['side1'], won: boolean, right?: boolean) => <span className={`gm-side${won ? ' won' : ''}${right ? ' r' : ''}`}>
    {ps.map((p, i) => <span key={i} className={p.self ? 'me' : ''}>{p.name}</span>)}</span>;
  return (
    <>
      <h2 className="gm-h">Kết quả các kèo</h2>
      <div className="gm-months">{months.map(m => <button key={m} type="button" className={m === month ? 'on' : ''} onClick={() => setPicked(m)}>{m.slice(5)}/{m.slice(0, 4)}</button>)}</div>
      <div className="gm-matches">{days.map(([day, ms]) => <section key={day}>
        <h6>{dayName(day)}</h6>
        {ms.map(m => { const a = m.score1 ?? 0, b = m.score2 ?? 0; return <div key={m.key} className="gm-match">
          <small><time>{m.playedAt.slice(11, 16)}</time>{[m.map, m.note].filter(Boolean).map(t => <span key={t}>{t}</span>)}</small>
          {side(m.side1, a > b)}<b>{a} – {b}</b>{side(m.side2, b > a, true)}
        </div>; })}
      </section>)}</div>
    </>
  );
}

/** two games played in the same stretch of years */
function overlaps(a: GameCard, b: GameDetail): boolean {
  if (!a.playFrom || !b.playFrom) return false;
  const aTo = a.playTo ?? a.playFrom, bTo = b.playTo ?? b.playFrom;
  const pad = (iso: string, d: number) => { const t = new Date(iso); t.setUTCMonth(t.getUTCMonth() + d); return t.toISOString(); };
  return a.playFrom < pad(bTo, 3) && pad(aTo, 3) > b.playFrom;
}
