/* Music: the lists he kept through the years — the checkpoints of his music folders (2000 – 2017), then his Spotify
   playlists — and the door to his Spotify listening. The page opens on the playlists he listened to most or, with a
   day picked on the calendar, on the music of that day: what Spotify heard, or the list he kept then. The folders of
   a period ("bài mới của giai đoạn") stand as tiles in the colour of their years and can be played from here, in a
   new order each time; the players he carried them on are shown beside them. A list reads with what it is, when each
   song came into it and, for a Spotify playlist, how much it was played. Everything is read here; it is written
   through the admin and importers. */
import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cdn } from '../api/client';
import { musicApi, type Filters, type Playlist, type Track } from '../api/music';
import { Facts, Stack } from '../components/music/Charts';
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
    const by = new Map<string, { id: string; title: string; artist: string; ms: number }>();
    (day.data ?? []).forEach(p => { const x = by.get(p.songId) ?? { id: p.songId, title: p.title, artist: p.artist, ms: 0 }; x.ms += p.ms; by.set(p.songId, x); });
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
          <ol>{heard.map(x => <li key={x.id}><Link to={`/music/spotify/song/${x.id}`}><b>{x.title}</b><small>{x.artist}</small></Link></li>)}</ol>
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
              <div className="mu-tiles tapes">{windows.map(l => <ListTile key={l.key} l={l} />)}</div></>}
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

/** A list as a tile in the colour of its years: the years large, its name, what it is, a way to listen. */
function ListTile({ l, plain }: { l: Playlist; plain?: boolean }) {
  const y = yearOf(l), spotify = isSpotify(l);
  return (
    <div className={`mu-tile ${plain || !y ? '' : eraClass(l.kind === 'WINDOW' ? +(l.windowFrom ?? '').slice(0, 4) || y : y)}`}>
      <Link to={listHref(l)}>
        <b>{yearsOf(l)}</b>
        <span>{l.title}</span>
        <small>{spotify ? `tạo ngày ${dmy(l.takenAt)}` : KIND[l.kind] ?? ''}</small>
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
        <span className="mm-b"><b>{l.title}</b>{l.summary ? <small className="mu-sum">{l.summary}</small>
          : <small>{[KIND[l.kind], l.deviceName].filter(Boolean).join(' · ')}</small>}</span>
      </Link>
      <Listen l={l} />
    </div>
  );
}

// ── one list ─────────────────────────────────────────────────────────────────

export function ListPage() {
  const { key = '' } = useParams(), q = useQuery({ queryKey: ['music-list', key], queryFn: () => musicApi.list(key), staleTime: T, enabled: !!key });
  const lists = useLists(), desk = useDesk(), { now } = usePlayer();
  const l = q.data, spotify = !!l && isSpotify(l);
  const f = useMemo<Filters>(() => ({ playlist: key }), [key]);
  const months = useQuery({ queryKey: ['sp-report', 'month', f], queryFn: () => musicApi.report('month', f), staleTime: T, enabled: spotify });
  const songs = useQuery({ queryKey: ['sp-report', 'song', f, 2000], queryFn: () => musicApi.report('song', f, { limit: 2000 }), staleTime: T, enabled: spotify });
  const plays = useMemo(() => new Map((songs.data?.rows ?? []).filter(r => r.trackKey).map(r => [r.trackKey!, r])), [songs.data]);
  const buckets = useMemo(() => {
    const have = (months.data?.rows ?? []).map(r => r.key).sort(), out: string[] = [];
    if (!have.length) return out;
    for (let m = have[0]; m <= have[have.length - 1]; m = +m.slice(5, 7) === 12 ? `${+m.slice(0, 4) + 1}-01` : `${m.slice(0, 4)}-${String(+m.slice(5, 7) + 1).padStart(2, '0')}`) out.push(m);
    return out;
  }, [months.data]);
  if (q.isLoading) return <div className="page mu"><div className="mu-body"><p className="jn-wait">Đang mở danh sách…</p></div></div>;
  if (!l) return <div className="page mu"><div className="mu-body"><Link className="back" to="/music">← Music</Link><h1>Không tìm thấy danh sách này</h1></div></div>;
  const byMonth = new Map((months.data?.rows ?? []).map(r => [r.key, r.ms])), t = months.data?.total;
  const dated = l.entries.some(e => e.addedAt), counted = plays.size > 0, queue = playable(l.entries.map(e => e.track)), audio = queue.length > 0;
  // a playlist of his carries the day its first song went in; Liked Songs has no day it was made; the rebuilt list is a state on a day
  const since = !spotify ? (l.kind === 'WINDOW' ? `bài mới của ${when(l.when)}` : when(l.when)) : l.spotifyId ? `tạo ngày ${dmy(l.takenAt)}` : dated ? `từ ${dmy(l.takenAt)}` : `tính đến ${dmy(l.takenAt)}`;
  const year = yearOf(l), from: PlayedFrom = { title: l.title, to: listHref(l) };
  const device = l.deviceKey ? desk.data?.machines.find(d => d.key === l.deviceKey) : undefined;
  // the lists before and after it in time, among its own kind (his folders, or his Spotify playlists)
  const order = (lists.data ?? []).filter(x => isSpotify(x) === spotify).sort(byTime), i = order.findIndex(x => x.key === l.key);
  const prev = i > 0 ? order[i - 1] : undefined, next = i >= 0 ? order[i + 1] : undefined;
  return (
    <div className="page mu">
      <header className={`mm-top mu-top ${year ? eraClass(l.kind === 'WINDOW' ? +(l.windowFrom ?? '').slice(0, 4) || year : year) : 'plain'}`}>
        <div className="mm-top-in">
          {year > 0 && <div className="mm-top-y"><b>{year}</b><span>{since}</span></div>}
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
        {spotify && !!t?.starts && <>
          <Facts items={[['Thời gian nghe', hours(t.ms)], ['Lượt nghe', num(t.plays)], ['Nghe từ', dmy(t.first)], ['đến', dmy(t.last)], ['Ngày có nghe', num(t.days)]]} />
          <section className="mu-block">
            <div className="hd"><h2>Nghe theo tháng</h2><span>đọc từ từng phiên nghe</span></div>
            <Stack buckets={buckets} series={[{ key: '*', label: l.title, color: 'var(--music)' }]} value={b => byMonth.get(b) ?? 0} title={b => `Tháng ${+b.slice(5, 7)}/${b.slice(0, 4)}`}
              tick={b => (buckets.length <= 14 ? `T${+b.slice(5, 7)}` : b.endsWith('-01') ? b.slice(0, 4) : null)} height={190} />
          </section>
        </>}
        <section className="mu-tracks">
          <div className="hd"><h2>Các bài</h2>{!spotify && l.sourceFolder && <span>{l.sourceFolder}</span>}</div>
          <div className="mu-scroll"><table className="mu-table mu-songs">
            <thead><tr><th>#</th><th>Bài</th>{dated && <th>Thêm ngày</th>}{counted && <th>Lượt nghe</th>}{counted && <th>Thời gian</th>}{audio && <th />}</tr></thead>
            <tbody>{l.entries.map((e, n) => { const x = e.track; if (!x) return null; const r = plays.get(x.key), on = now?.key === x.key; return (
              <tr key={x.key} className={on ? 'on' : ''}>
                <td>{e.position ?? n + 1}</td>
                <td><b>{x.title}</b>{x.version && <em> ({x.version})</em>}<small>{x.artist?.name}{x.featuring ? ` · cùng ${x.featuring}` : ''}</small></td>
                {dated && <td>{dmy(e.addedAt)}</td>}
                {counted && <td>{r?.plays ? num(r.plays) : ''}</td>}{counted && <td>{r?.plays ? hours(r.ms) : ''}</td>}
                {audio && <td>{x.hasAudio && x.audioUrl && <button type="button" className={`mu-play ${on ? 'on' : ''}`} aria-label={on ? `Dừng ${x.title}` : `Nghe ${x.title}`}
                  onClick={() => player.toggle(x, queue, from)}>{on ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z" /></svg> : PLAY}</button>}</td>}
              </tr>); })}</tbody>
          </table></div>
        </section>
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
