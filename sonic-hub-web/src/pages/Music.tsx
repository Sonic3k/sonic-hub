/* Music: the lists he kept through the years — the checkpoints of his music folders (2000 – 2017), then his Spotify
   playlists — and the door to his Spotify listening. The page opens on the playlists he listened to most or, with a
   day picked on the calendar, on the music of that day: what Spotify heard, or the list he kept then. The folders of
   a period ("bài mới của giai đoạn") stand as tiles in the colour of their years and can be played from here, in a
   new order each time; the players he carried them on are shown beside them. A list reads with what it is, each
   song with its picture (its cover, its album's, else the default one), when it came into the list and, for a
   Spotify playlist, how much it was played and a way to open it on Spotify. With a day picked on the calendar a
   Spotify playlist is shown as it was that day: the songs it held then, the ones added later (faint) and the ones
   that had left. Everything is read here; it is written through the admin and importers. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cdn } from '../api/client';
import { musicApi, type Entry, type Filters, type Playlist, type Track } from '../api/music';
import { Facts, Stack } from '../components/music/Charts';
import Cover from '../components/music/Cover';
import { Print, YearGrid } from '../components/Paper';
import { dayMonthYear } from '../lib/date';
import { useDesk } from '../lib/desk';
import { eraClass } from '../lib/era';
import { deviceRange, listsAt } from '../lib/life';
import { isoOf, useMoment } from '../lib/moment';
import { dmy, hours, num, whenText as when } from '../lib/music';
import { player, shuffled, usePlayer, type PlayedFrom } from '../lib/player';
import { useGoTo } from '../lib/scroll';
import { VIEWS, useLists, useOverview, useScope } from './Spotify';
import '../styles/music.css';

const T = 5 * 60_000;
const isSpotify = (l: Playlist) => l.key.startsWith('spotify-');
const byTime = (a: Playlist, b: Playlist) => (a.takenAt ?? '9').localeCompare(b.takenAt ?? '9') || a.title.localeCompare(b.title);
const KIND: Record<string, string> = { WINDOW: 'Bài mới của giai đoạn', FULL: 'Cả danh sách lúc đó', CURATED: 'Playlist' };
const yearOf = (l: Playlist) => +(l.takenAt ?? '').slice(0, 4) || 0;
/** the years a folder of a period stands for ("2006 – 2008"), else the year a list was taken or made */
const yearsOf = (l: Playlist) => { const to = yearOf(l), from = +(l.windowFrom ?? '').slice(0, 4) || to; return l.kind === 'WINDOW' && from && from !== to ? `${from} – ${to}` : to ? `${to}` : ''; };
const listHref = (l: Pick<Playlist, 'key'>) => `/music/lists/${l.key}`;
const playable = (xs: (Track | null | undefined)[]) => xs.filter((x): x is Track => !!x?.hasAudio && !!x.audioUrl);
const PLAY = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
const OUT = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>;
const dayPart = (iso?: string | null) => (iso ?? '').slice(0, 10);
/** the day after: where a report's stretch ends (that day itself is not included) */
const dayAfter = (iso: string) => { const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** the day a song came into a list or left it: "khoảng" when it was worked out from his plays, not recorded by Spotify */
const dayOf = (iso?: string | null, approx?: boolean | null) => (iso ? <>{approx && <em>khoảng </em>}{dmy(iso)}</> : null);
const byAdded = (a: Entry, b: Entry) => dayPart(a.addedAt).localeCompare(dayPart(b.addedAt)) || (a.position ?? 0) - (b.position ?? 0);

/** Start a list playing: its songs that have a recording here, in a new order each time. */
function useListen() {
  const qc = useQueryClient();
  return async (l: Playlist) => {
    player.unlock();
    const d = await qc.fetchQuery({ queryKey: ['music-list', l.key], queryFn: () => musicApi.list(l.key), staleTime: T }).catch(() => null);
    const xs = shuffled(playable((d?.entries ?? []).map(e => e.track)));
    if (xs.length) player.play(xs[0], xs, { title: l.title, to: listHref(l) }); else player.stop();
  };
}
/** The button that starts a list: only where enough of its songs have a recording here to be worth listening to
 *  (his Spotify playlists of later years mostly have none yet). */
function Listen({ l, label }: { l: Playlist; label?: string }) {
  const listen = useListen();
  if (l.withAudio < 5) return null;
  return <button type="button" className={label ? 'mu-listen' : 'mu-play'} aria-label={`Nghe ${l.title}`} onClick={() => void listen(l)}>{PLAY}{label}</button>;
}

// ── the lists ────────────────────────────────────────────────────────────────

export function MusicIndex() {
  const lists = useLists(), ov = useOverview(), desk = useDesk(), loc = useLocation(), { moment, picked } = useMoment();
  const all = lists.data ?? [], sp = all.filter(isSpotify).sort(byTime), old = all.filter(l => !isSpotify(l)).sort(byTime);
  const windows = old.filter(l => l.kind === 'WINDOW'), full = old.filter(l => l.kind !== 'WINDOW');
  const years = (ov.data?.years ?? []).filter(y => y.total.ms >= 3_600_000).map(y => +y.year);
  const players = (desk.data?.machines ?? []).filter(d => d.kind === 'PLAYER' && d.photoUrl);
  const spYears = useMemo(() => { const m = new Map<number, Playlist[]>(); sp.forEach(l => m.set(yearOf(l), [...(m.get(yearOf(l)) ?? []), l])); return [...m.entries()].sort((a, b) => a[0] - b[0]); }, [sp]);
  // the top of the page: the music of the day picked — what Spotify heard that day, else the lists he kept then —
  // and with no day picked, the playlists he listened to most
  const iso = picked && moment ? isoOf(moment) : null;
  const day = useQuery({ queryKey: ['sp-day', iso], queryFn: () => musicApi.day(iso!), enabled: !!iso && iso >= '2018-12-29', staleTime: T });
  const heard = useMemo(() => {
    const by = new Map<string, { id: string; title: string; artist: string; cover?: string | null; ms: number }>();
    (day.data ?? []).forEach(p => { const x = by.get(p.songId) ?? { id: p.songId, title: p.title, artist: p.artist, cover: p.coverUrl, ms: 0 }; x.ms += p.ms; by.set(p.songId, x); });
    return [...by.values()].filter(x => x.ms >= 30_000).sort((a, b) => b.ms - a.ms).slice(0, 6);
  }, [day.data]);
  const dayList = useMemo(() => {
    const by = new Map<string, { key: string; title: string; ms: number }>();
    (day.data ?? []).forEach(p => { if (!p.playlistKey) return; const x = by.get(p.playlistKey) ?? { key: p.playlistKey, title: p.playlistTitle ?? p.playlistKey, ms: 0 }; x.ms += p.ms; by.set(p.playlistKey, x); });
    return [...by.values()].sort((a, b) => b.ms - a.ms)[0];
  }, [day.data]);
  const kept = iso && !heard.length ? listsAt(all, iso).slice(0, 3) : [];
  const most = useQuery({ queryKey: ['sp-report', 'playlist', {}, { limit: 8 }], queryFn: () => musicApi.report('playlist', {}, { limit: 8 }), staleTime: T, enabled: !iso || (!heard.length && !kept.length) });
  const top = (most.data?.rows ?? []).map(r => all.find(l => l.key === r.key)).filter((l): l is Playlist => !!l).slice(0, 3);
  const then = !!iso && (heard.length > 0 || kept.length > 0) && !!moment;
  useGoTo(loc.hash.slice(1), !lists.isLoading);

  return (
    <div className="wrap page mu">
      <header className="mm-head"><h1>Music</h1></header>
      {lists.isLoading && <p className="jn-wait">Đang mở các danh sách…</p>}

      {then && moment ? <section className={`mu-open then ${eraClass(moment.y)}`}>
        <div className="mu-open-hd"><h2>{heard.length ? 'Hôm đó anh nghe' : 'Lúc đó anh nghe'}</h2><span>{dayMonthYear(iso)}</span>
          {heard.length > 0 && <Link className="mu-open-go" to={`/music/spotify?y=${moment.y}&v=days&day=${iso}`}>Xem cả ngày</Link>}</div>
        {heard.length > 0 ? <div className="mu-heard">
          <ol>{heard.map(x => <li key={x.id}><Link to={`/music/spotify/song/${x.id}`}><Cover url={x.cover} /><span><b>{x.title}</b><small>{x.artist}</small></span></Link></li>)}</ol>
          {dayList && <Link className="mu-heard-from" to={listHref(dayList)}><small>Nghe từ playlist</small><b>{dayList.title}</b></Link>}
        </div> : <div className="mu-tiles wide">{kept.map(l => <ListTile key={l.key} l={l} plain />)}</div>}
      </section> : top.length > 0 && <section className="mu-open">
        <div className="mu-open-hd"><h2>Playlist anh nghe nhiều nhất</h2></div>
        <div className="mu-tiles">{top.map(l => <ListTile key={l.key} l={l} />)}</div>
      </section>}

      {old.length > 0 && <section className="mu-sec" id="truoc-spotify">
        <div className="mu-sec-hd"><h2>Trước Spotify</h2><span>những thư mục nhạc anh lưu lại, 2000 – 2017</span></div>
        <div className={`mu-old ${players.length ? '' : 'solo'}`}>
          <div>
            {windows.length > 0 && <><h3 className="mu-h">Bài mới của từng giai đoạn</h3>
              <div className="mu-tiles tapes">{windows.map(l => <ListTile key={l.key} l={l} bare />)}</div></>}
            {full.length > 0 && <><h3 className="mu-h">Cả danh sách lúc đó</h3>
              <div className="mu-rows">{full.map(l => <ListRow key={l.key} l={l} />)}</div></>}
          </div>
          {players.length > 0 && <aside className="mu-players">
            <h3 className="mu-h">Anh nghe trên</h3>
            {players.map((d, i) => <Print key={d.key} small src={cdn(d.photoUrl, 480)} ratio="4 / 3" caption={`${d.name} · ${deviceRange(d)}`}
              tilt={i === 0 ? -1.4 : undefined} tape={i === 0 ? -3 : undefined} />)}
          </aside>}
        </div>
      </section>}

      {sp.length > 0 && <section className="mu-sec" id="spotify">
        <div className="mu-sec-hd"><h2>Những năm Spotify</h2><span>playlist anh tự tạo, từ 2019</span></div>
        <div className="mu-door">
          <div>
            <h3><Link to="/music/spotify">Spotify</Link></h3>
            <p>Từng lượt nghe từ ngày anh mở Spotify ở Mỹ: nghe bài gì, từ playlist nào, trên máy nào, ở đâu, lúc mấy giờ.</p>
            <nav>{VIEWS.filter(v => v[0]).map(([k, n]) => <Link key={k} to={`/music/spotify?v=${k}`}>{n}</Link>)}</nav>
          </div>
          {years.length > 0 && <YearGrid years={years} href={y => `/music/spotify?y=${y}`} />}
        </div>
        {spYears.map(([y, ls]) => <section key={y} className={`mm-year ${eraClass(y)}`} id={`sp-${y}`}>
          <div className="mm-yh"><b>{y}</b></div>
          <div className="mu-rows">{ls.map(l => <ListRow key={l.key} l={l} />)}</div>
        </section>)}
      </section>}
    </div>
  );
}

/** A list as a tile in the colour of its years: the years large, its name, what it is (left out under a heading that
 *  already says it), a way to listen. */
function ListTile({ l, plain, bare }: { l: Playlist; plain?: boolean; bare?: boolean }) {
  const y = yearOf(l), spotify = isSpotify(l);
  return (
    <div className={`mu-tile ${plain || !y ? '' : eraClass(l.kind === 'WINDOW' ? +(l.windowFrom ?? '').slice(0, 4) || y : y)}`}>
      <Link to={listHref(l)}>
        <b>{yearsOf(l)}</b>
        <span>{l.title}</span>
        {!bare && <small>{spotify ? `tạo ngày ${dmy(l.takenAt)}` : KIND[l.kind] ?? ''}</small>}
        {l.summary && <p>{l.summary}</p>}
      </Link>
      <Listen l={l} label="Nghe" />
    </div>
  );
}

/** A list as a line: its day, its name, a word on it. */
function ListRow({ l }: { l: Playlist }) {
  const spotify = isSpotify(l);
  return (
    <div className="mu-row">
      <Link className="mm-line" to={listHref(l)}>
        <span className="mm-d">{spotify ? dmy(l.takenAt).slice(0, 5) : when(l.when)}</span>
        <span className="mm-b"><b>{l.title}</b>{l.summary ? <small className="mu-sum">{l.summary}</small> : l.deviceName ? <small>trên {l.deviceName}</small> : null}</span>
      </Link>
      <Listen l={l} />
    </div>
  );
}

// ── one list ─────────────────────────────────────────────────────────────────

export function ListPage() {
  const { key = '' } = useParams(), q = useQuery({ queryKey: ['music-list', key], queryFn: () => musicApi.list(key), staleTime: T, enabled: !!key });
  const lists = useLists(), desk = useDesk(), { now } = usePlayer(), { moment, picked } = useMoment();
  const l = q.data, spotify = !!l && isSpotify(l), dated = !!l && l.entries.some(e => e.addedAt);
  // A day picked on the calendar: a playlist that knows when each song came in is shown as it was that day (he can
  // still look at it as it is now). born = the day its first song went in.
  const iso = picked && moment ? isoOf(moment) : null, timed = spotify && dated && !!iso;
  const [asNow, setAsNow] = useState(false);
  useEffect(() => { setAsNow(false); }, [key, iso]);
  const then = timed && !asNow ? iso : null;
  const born = useMemo(() => (l ? [...l.entries, ...(l.removed ?? [])].map(e => dayPart(e.addedAt)).filter(Boolean).sort()[0] ?? '' : ''), [l]);
  const before = !!then && !!born && then < born;
  const f = useMemo<Filters>(() => ({ playlist: key, ...(then ? { to: dayAfter(then) } : {}) }), [key, then]);
  const months = useQuery({ queryKey: ['sp-report', 'month', f], queryFn: () => musicApi.report('month', f), staleTime: T, enabled: spotify && !before });
  const songs = useQuery({ queryKey: ['sp-report', 'song', f, 2000], queryFn: () => musicApi.report('song', f, { limit: 2000 }), staleTime: T, enabled: spotify && !before });
  const plays = useMemo(() => new Map((songs.data?.rows ?? []).filter(r => r.trackKey).map(r => [r.trackKey!, r])), [songs.data]);
  const buckets = useMemo(() => {
    const have = (months.data?.rows ?? []).map(r => r.key).sort(), out: string[] = [];
    if (!have.length) return out;
    for (let m = have[0]; m <= have[have.length - 1]; m = +m.slice(5, 7) === 12 ? `${+m.slice(0, 4) + 1}-01` : `${m.slice(0, 4)}-${String(+m.slice(5, 7) + 1).padStart(2, '0')}`) out.push(m);
    return out;
  }, [months.data]);
  // the playlist on the day picked: the songs it held, the ones added later, the ones that had left
  const at = useMemo(() => {
    if (!l || !then) return null;
    const all = [...l.entries, ...(l.removed ?? [])];
    const gone = all.filter(e => e.removedAt && dayPart(e.removedAt) <= then).sort((a, b) => dayPart(a.removedAt).localeCompare(dayPart(b.removedAt)) || byAdded(a, b));
    const later = all.filter(e => dayPart(e.addedAt) > then).sort(byAdded);
    const here = all.filter(e => dayPart(e.addedAt) <= then && !(e.removedAt && dayPart(e.removedAt) <= then)).sort(byAdded);
    return { here, later, gone };
  }, [l, then]);
  if (q.isLoading) return <div className="page mu"><div className="mu-body"><p className="jn-wait">Đang mở danh sách…</p></div></div>;
  if (!l) return <div className="page mu"><div className="mu-body"><Link className="back" to="/music">← Music</Link><h1>Không tìm thấy danh sách này</h1></div></div>;
  const byMonth = new Map((months.data?.rows ?? []).map(r => [r.key, r.ms])), t = months.data?.total;
  const left = l.removed ?? [], every = [...l.entries, ...left];
  const counted = plays.size > 0, queue = playable(l.entries.map(e => e.track)), audio = queue.length > 0, linked = every.some(e => e.track?.spotifyUrl);
  // a playlist of his carries the day its first song went in; Liked Songs has no day it was made; the rebuilt list is a state on a day
  const since = !spotify ? when(l.when) : l.spotifyId ? `tạo ngày ${dmy(l.takenAt)}` : dated ? `từ ${dmy(l.takenAt)}` : `tính đến ${dmy(l.takenAt)}`;
  const year = yearOf(l), from: PlayedFrom = { title: l.title, to: listHref(l) };
  const device = l.deviceKey ? desk.data?.machines.find(d => d.key === l.deviceKey) : undefined;
  // the lists before and after it in time, among its own kind (his folders, or his Spotify playlists)
  const order = (lists.data ?? []).filter(x => isSpotify(x) === spotify).sort(byTime), i = order.findIndex(x => x.key === l.key);
  const prev = i > 0 ? order[i - 1] : undefined, next = i >= 0 ? order[i + 1] : undefined;
  const cols = 3 + (dated ? 1 : 0) + (counted ? 2 : 0) + (linked ? 1 : 0) + (audio ? 1 : 0);
  /** a song of the list as a line: its number (none when it is not in the list at the time shown), its picture, what it
   *  is, when (the day it came in unless said otherwise), how much the list played it, its page on Spotify, play */
  const line = (e: Entry, n: number | null, o: { faint?: boolean; when?: ReactNode; uncounted?: boolean } = {}) => {
    const x = e.track; if (!x) return null;
    const r = o.uncounted ? undefined : plays.get(x.key), on = now?.key === x.key;
    return (
      <tr key={x.key} className={`${on ? 'on' : ''} ${o.faint ? 'faint' : ''}`}>
        <td>{n ?? ''}</td>
        <td className="cv"><Cover url={x.coverUrl} /></td>
        <td className="t">{x.spotifySongId ? <Link to={`/music/spotify/song/${x.spotifySongId}`}><b>{x.title}</b></Link> : <b>{x.title}</b>}{x.version && <em> ({x.version})</em>}
          <small>{x.artist?.name}{x.featuring ? ` · cùng ${x.featuring}` : ''}</small></td>
        {dated && <td className="d">{o.when ?? dayOf(e.addedAt, e.addedApprox)}</td>}
        {counted && <td>{r?.plays ? num(r.plays) : ''}</td>}{counted && <td className="ms">{r?.plays ? hours(r.ms) : ''}</td>}
        {linked && <td className="go">{x.spotifyUrl && <a className="mu-ext" href={x.spotifyUrl} target="_blank" rel="noreferrer" aria-label={`Mở ${x.title} trên Spotify`} title="Mở trên Spotify">{OUT}</a>}</td>}
        {audio && <td className="go">{x.hasAudio && x.audioUrl && <button type="button" className={`mu-play ${on ? 'on' : ''}`} aria-label={on ? `Dừng ${x.title}` : `Nghe ${x.title}`}
          onClick={() => player.toggle(x, queue, from)}>{on ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z" /></svg> : PLAY}</button>}</td>}
      </tr>);
  };
  const head = (date: string) => <thead><tr><th>#</th><th className="cv" /><th>Bài</th>{dated && <th>{date}</th>}{counted && <th>Lượt nghe</th>}{counted && <th className="ms">Thời gian</th>}{linked && <th>Spotify</th>}{audio && <th />}</tr></thead>;
  const sub = (text: string, note?: string) => <tr className="sub"><td colSpan={cols}>{text}{note && <small> · {note}</small>}</td></tr>;
  return (
    <div className="page mu">
      <header className={`mm-top mu-top ${year ? eraClass(l.kind === 'WINDOW' ? +(l.windowFrom ?? '').slice(0, 4) || year : year) : 'plain'}`}>
        <div className="mm-top-in">
          {year > 0 && <div className="mm-top-y"><b>{year}</b>{since !== String(year) && <span>{since}</span>}</div>}
          <div className="mm-top-t">
            <Link className="back" to="/music">← Music</Link>
            <span className="mm-k">{spotify ? 'Playlist Spotify' : KIND[l.kind] ?? 'Danh sách'}</span>
            <h1>{l.title}</h1>
            {l.summary && <p className="mu-dek">{l.summary}</p>}
            <div className="mu-acts">
              {audio && <button type="button" className="mu-btn main" onClick={() => { const xs = shuffled(queue); player.play(xs[0], xs, from); }}>{PLAY}Nghe</button>}
              {spotify && l.spotifyId && <a className="mu-btn" href={`https://open.spotify.com/playlist/${l.spotifyId}`} target="_blank" rel="noreferrer">Mở trên Spotify ↗</a>}
              {spotify && !!t?.starts && <Link className="mu-btn" to={`/music/spotify?playlist=${l.key}`}>Mọi báo cáo của playlist này</Link>}
              {l.eventId && <Link className="mu-btn" to={`/memories/events/${l.eventId}`}>Sự kiện: {l.eventTitle}</Link>}
            </div>
          </div>
          {device?.photoUrl && <Print className="mu-top-art" small src={cdn(device.photoUrl, 480)} ratio="4 / 3" caption={`${device.name} · ${deviceRange(device)}`} />}
        </div>
      </header>

      <div className="mu-body">
        {timed && moment && (then ? <div className={`mu-asof ${eraClass(moment.y)}`}>
          {before ? <><b>Ngày {dayMonthYear(then)} chưa có playlist này</b><span>Bài đầu tiên được thêm vào ngày {dmy(born)}.</span></>
            : <><b>Playlist vào ngày {dayMonthYear(then)}</b>
              {at && <span>{num(at.here.length)} bài{at.later.length > 0 && ` · ${num(at.later.length)} bài thêm sau đó`}{at.gone.length > 0 && ` · ${num(at.gone.length)} bài đã bỏ ra trước đó`}</span>}</>}
          <button type="button" onClick={() => setAsNow(true)}>Xem playlist bây giờ</button>
        </div> : <div className="mu-asof now">
          <span>Đang xem playlist như bây giờ.</span>
          <button type="button" onClick={() => setAsNow(false)}>Xem ngày {dmy(iso)}</button>
        </div>)}
        {!before && <>
          {spotify && !!t?.starts && <>
            <Facts items={[['Thời gian nghe', hours(t.ms)], ['Lượt nghe', num(t.plays)], ['Nghe từ', dmy(t.first)], ['đến', dmy(t.last)], ['Ngày có nghe', num(t.days)]]} />
            <section className="mu-block">
              <div className="hd"><h2>Nghe theo tháng</h2><span>{then ? `tính đến ${dmy(then)}` : 'đọc từ từng phiên nghe'}</span></div>
              <Stack buckets={buckets} series={[{ key: '*', label: l.title, color: 'var(--music)' }]} value={b => byMonth.get(b) ?? 0} title={b => `Tháng ${+b.slice(5, 7)}/${b.slice(0, 4)}`}
                tick={b => (buckets.length <= 14 ? `T${+b.slice(5, 7)}` : b.endsWith('-01') ? b.slice(0, 4) : null)} height={190} />
            </section>
          </>}
          <section className="mu-tracks">
            <div className="hd"><h2>Các bài</h2>{at ? <span>xếp theo ngày thêm vào</span> : !spotify && l.sourceFolder && <span>{l.sourceFolder}</span>}</div>
            <div className="mu-scroll"><table className="mu-table mu-songs mu-list">
              {head('Thêm ngày')}
              {at ? <tbody>
                {at.here.map((e, n) => line(e, n + 1))}
                {at.later.length > 0 && sub(`Thêm vào sau ngày ${dmy(then)}`)}
                {at.later.map(e => line(e, null, { faint: true, uncounted: true }))}
                {at.gone.length > 0 && sub(`Đã bỏ ra trước ngày ${dmy(then)}`, 'ngày suy ra từ lịch sử nghe')}
                {at.gone.map(e => line(e, null, { faint: true, when: <>{dmy(e.addedAt)}{'\u00a0'}– {dmy(e.removedAt)}</> }))}
              </tbody> : <tbody>{l.entries.map((e, n) => line(e, e.position ?? n + 1))}</tbody>}
            </table></div>
          </section>
          {!at && left.length > 0 && <section className="mu-tracks mu-left">
            <div className="hd"><h2>Từng có trong playlist</h2><span>Spotify không lưu những bài đã bỏ ra; ngày ở đây suy ra từ lịch sử nghe của anh</span></div>
            <div className="mu-scroll"><table className="mu-table mu-songs mu-list">
              {head('Trong playlist')}
              <tbody>{left.map(e => line(e, null, { when: <>{dmy(e.addedAt)}{'\u00a0'}– {dmy(e.removedAt)}</> }))}</tbody>
            </table></div>
          </section>}
        </>}
        <div className="pn">{prev ? <Link to={listHref(prev)}><small>← Trước đó</small><b>{prev.title}</b></Link> : <span />}
          {next ? <Link to={listHref(next)}><small>Sau đó →</small><b>{next.title}</b></Link> : <span />}</div>
      </div>
    </div>
  );
}

/** The sidebar while in Music: the lists; inside Spotify, its views and years (each keeps the scope the page is in). */
export function MusicSide() {
  const loc = useLocation(), lists = useLists(), ov = useOverview(), s = useScope();
  const inSpotify = loc.pathname.startsWith('/music/spotify'), onPortal = loc.pathname === '/music/spotify';
  const all = lists.data ?? [], sp = all.filter(isSpotify), old = all.filter(l => !isSpotify(l)).sort(byTime);
  const years = (ov.data?.years ?? []).filter(y => y.total.ms >= 3_600_000), max = Math.max(1, ...years.map(y => y.total.ms));
  const made = [...new Set(sp.map(yearOf))].filter(Boolean).sort((a, b) => a - b);
  return (
    <>
      <h4>Music</h4>
      <Link to="/music" className={loc.pathname === '/music' ? 'on' : ''}>Danh sách</Link>
      <Link to="/music/spotify" className={inSpotify && !s.view && onPortal ? 'on' : ''}><span className="dot" style={{ ['--c' as string]: 'var(--music)' }} />Spotify</Link>
      {inSpotify ? <>
        <h4>Spotify</h4>
        {VIEWS.filter(v => v[0]).map(([k, n]) => <Link key={k} to={s.to({ v: k })} className={onPortal && s.view === k ? 'on' : ''}>{n}</Link>)}
        {years.length > 0 && <h4>Năm</h4>}
        {years.map(y => <Link key={y.year} to={onPortal ? s.to({ y: y.year, m: null }) : `/music/spotify?y=${y.year}`} className={onPortal && (s.y ?? s.m?.slice(0, 4)) === y.year ? 'on' : ''}>{y.year}
          <span className="bar" style={{ ['--c' as string]: 'var(--music)' }}><b style={{ width: `${Math.round((y.total.ms / max) * 100)}%` }} /></span><small>{Math.round(y.total.ms / 3_600_000).toLocaleString('vi-VN')}h</small></Link>)}
      </> : <>
        {old.length > 0 && <h4>Trước Spotify</h4>}
        {old.map(l => <Link key={l.key} to={listHref(l)}><span className="mu-side-t">{l.title}</span></Link>)}
        {made.length > 0 && <h4>Playlist theo năm</h4>}
        <YearGrid years={made} href={y => `/music#sp-${y}`} />
      </>}
    </>
  );
}
