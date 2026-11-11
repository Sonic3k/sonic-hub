/* Music: the lists he kept through the years — the checkpoints of his music folders (2000 – 2017), then his Spotify
   playlists — and the door to his Spotify listening. A list reads with what it is, when each song came into it and,
   for a Spotify playlist, how much it was played. Everything is read here; it is written through the admin and importers. */
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '../api/client';
import { musicApi, type Filters, type Playlist, type Track } from '../api/music';
import { Facts, Stack } from '../components/music/Charts';
import { dmy, hours, num, whenText as when } from '../lib/music';
import { VIEWS, useLists, useOverview, useScope } from './Spotify';
import '../styles/music.css';

const T = 5 * 60_000;
const isSpotify = (l: Playlist) => l.key.startsWith('spotify-');
const byTime = (a: Playlist, b: Playlist) => (a.takenAt ?? '9').localeCompare(b.takenAt ?? '9') || a.title.localeCompare(b.title);
const KIND: Record<string, string> = { WINDOW: 'Bài mới của giai đoạn', FULL: 'Cả danh sách lúc đó', CURATED: 'Playlist' };

export function MusicIndex() {
  const lists = useLists(), ov = useOverview();
  const all = lists.data ?? [], sp = all.filter(isSpotify).sort(byTime), old = all.filter(l => !isSpotify(l)).sort(byTime);
  const years = (ov.data?.years ?? []).filter(y => y.total.ms >= 3_600_000), max = Math.max(1, ...years.map(y => y.total.ms)), t = ov.data?.total;
  return (
    <div className="wrap page mu" style={{ ['--c' as string]: 'var(--music)' }}>
      <div className="ptitle"><h1>Music</h1><span>những danh sách nhạc qua từng năm</span></div>
      <Link to="/music/spotify" className="card mu-door">
        <div>
          <h2><i />Spotify</h2>
          <p>Từng lượt nghe từ ngày anh mở Spotify ở Mỹ: nghe bài gì, từ playlist nào, trên máy nào, ở đâu, lúc mấy giờ.</p>
          {t && <p className="n"><b>{hours(t.ms)}</b> · {num(t.plays)} lượt nghe · {num(t.songs)} bài</p>}
          <span className="go">Mở Spotify →</span>
        </div>
        <div className="mu-door-y" aria-hidden="true">{years.map(y => <span key={y.year}><i style={{ height: `${Math.max(4, (y.total.ms / max) * 100)}%` }} /><small>{y.year.slice(2)}</small></span>)}</div>
      </Link>
      {lists.isLoading && <div className="card empty">Đang mở các danh sách…</div>}
      {sp.length > 0 && <section className="block">
        <div className="hd"><h2>Những năm Spotify</h2><span>playlist anh tự tạo, từ 2019</span></div>
        <div className="mu-lists">{sp.map(l => <ListCard key={l.key} l={l} />)}</div>
      </section>}
      {old.length > 0 && <section className="block">
        <div className="hd"><h2>Trước Spotify</h2><span>những thư mục nhạc anh lưu lại, 2000 – 2017</span></div>
        <div className="mu-lists">{old.map(l => <ListCard key={l.key} l={l} />)}</div>
      </section>}
    </div>
  );
}

function ListCard({ l }: { l: Playlist }) {
  return (
    <Link to={`/music/lists/${l.key}`} className="card mu-list">
      <b>{l.title}</b>
      <small>{isSpotify(l) ? dmy(l.takenAt) : when(l.when)} · {num(l.tracks)} bài{!isSpotify(l) ? ` · ${KIND[l.kind] ?? ''}` : ''}</small>
      {l.summary && <p>{l.summary}</p>}
    </Link>
  );
}

export function ListPage() {
  const { key = '' } = useParams(), q = useQuery({ queryKey: ['music-list', key], queryFn: () => musicApi.list(key), staleTime: T, enabled: !!key });
  const l = q.data, spotify = !!l && isSpotify(l);
  const f = useMemo<Filters>(() => ({ playlist: key }), [key]);
  const months = useQuery({ queryKey: ['sp-report', 'month', f], queryFn: () => musicApi.report('month', f), staleTime: T, enabled: spotify });
  const songs = useQuery({ queryKey: ['sp-report', 'song', f, 2000], queryFn: () => musicApi.report('song', f, { limit: 2000 }), staleTime: T, enabled: spotify });
  const [playing, setPlaying] = useState<Track | null>(null);
  const plays = useMemo(() => new Map((songs.data?.rows ?? []).filter(r => r.trackKey).map(r => [r.trackKey!, r])), [songs.data]);
  const buckets = useMemo(() => {
    const have = (months.data?.rows ?? []).map(r => r.key).sort(), out: string[] = [];
    if (!have.length) return out;
    for (let m = have[0]; m <= have[have.length - 1]; m = +m.slice(5, 7) === 12 ? `${+m.slice(0, 4) + 1}-01` : `${m.slice(0, 4)}-${String(+m.slice(5, 7) + 1).padStart(2, '0')}`) out.push(m);
    return out;
  }, [months.data]);
  if (q.isLoading) return <div className="wrap page mu"><div className="card empty">Đang mở danh sách…</div></div>;
  if (!l) return <div className="wrap page mu"><div className="card empty">Không tìm thấy danh sách này.</div></div>;
  const byMonth = new Map((months.data?.rows ?? []).map(r => [r.key, r.ms])), t = months.data?.total;
  const dated = l.entries.some(e => e.addedAt), counted = plays.size > 0, audio = l.entries.some(e => e.track?.hasAudio);
  return (
    <div className="wrap page mu" style={{ ['--c' as string]: 'var(--music)' }}>
      <div className="crumbs"><Link to="/music">Music</Link> / {spotify ? 'Playlist Spotify' : 'Danh sách'}</div>
      <div className="ptitle"><h1>{l.title}</h1><span>{spotify ? `tạo ngày ${dmy(l.takenAt)}` : when(l.when)}</span></div>
      {l.summary && <p className="mu-read">{l.summary}</p>}
      {l.eventId && <p className="mu-links"><Link to={`/memories/events/${l.eventId}`}>Sự kiện: {l.eventTitle} →</Link></p>}
      {spotify && <div className="mu-links">
        {l.spotifyId && <a href={`https://open.spotify.com/playlist/${l.spotifyId}`} target="_blank" rel="noreferrer">Mở trên Spotify ↗</a>}
        {!!t?.starts && <Link to={`/music/spotify?playlist=${l.key}`}>Xem mọi báo cáo của playlist này →</Link>}
      </div>}
      {spotify && !!t?.starts && <>
        <Facts items={[['Thời gian nghe', hours(t.ms)], ['Lượt nghe', num(t.plays)], ['Nghe từ', dmy(t.first)], ['đến', dmy(t.last)], ['Ngày có nghe', num(t.days)]]} />
        <section className="card mu-block">
          <div className="hd"><h2>Nghe theo tháng</h2><span>đọc từ từng phiên nghe</span></div>
          <Stack buckets={buckets} series={[{ key: '*', label: l.title, color: 'var(--music)' }]} value={b => byMonth.get(b) ?? 0} title={b => `Tháng ${+b.slice(5, 7)}/${b.slice(0, 4)}`}
            tick={b => (buckets.length <= 14 ? `T${+b.slice(5, 7)}` : b.endsWith('-01') ? b.slice(0, 4) : null)} height={190} />
        </section>
      </>}
      <section className="card mu-block">
        <div className="hd"><h2>Các bài</h2>{!spotify && l.sourceFolder && <span>{l.sourceFolder}</span>}</div>
        <div className="mu-scroll"><table className="mu-table mu-songs">
          <thead><tr><th>#</th><th>Bài</th>{dated && <th>Thêm ngày</th>}{counted && <th>Lượt nghe</th>}{counted && <th>Thời gian</th>}{audio && <th />}</tr></thead>
          <tbody>{l.entries.map((e, i) => { const x = e.track; if (!x) return null; const r = plays.get(x.key); return (
            <tr key={x.key} className={playing?.key === x.key ? 'on' : ''}>
              <td>{e.position ?? i + 1}</td>
              <td><b>{x.title}</b>{x.version && <em> ({x.version})</em>}<small>{x.artist?.name}{x.featuring ? ` · cùng ${x.featuring}` : ''}</small></td>
              {dated && <td>{dmy(e.addedAt)}</td>}
              {counted && <td>{r?.plays ? num(r.plays) : ''}</td>}{counted && <td>{r?.plays ? hours(r.ms) : ''}</td>}
              {audio && <td>{x.hasAudio && <button type="button" className="mu-play" aria-label={`Nghe ${x.title}`} onClick={() => setPlaying(playing?.key === x.key ? null : x)}>{playing?.key === x.key ? '■' : '▶'}</button>}</td>}
            </tr>); })}</tbody>
        </table></div>
      </section>
      {playing?.audioUrl && <div className="mu-player"><span><b>{playing.title}</b><small>{playing.artist?.name}</small></span>
        <audio controls autoPlay src={apiUrl(playing.audioUrl.replace(/^\/api/, ''))} onEnded={() => {
          const xs = l.entries.map(e => e.track).filter((x): x is Track => !!x?.hasAudio), i = xs.findIndex(x => x.key === playing.key);
          setPlaying(xs[i + 1] ?? null);
        }} />
        <button type="button" aria-label="Đóng" onClick={() => setPlaying(null)}>✕</button></div>}
    </div>
  );
}

/** The sidebar while in Music: the lists; inside Spotify, its views and years (each keeps the scope the page is in). */
export function MusicSide() {
  const loc = useLocation(), lists = useLists(), ov = useOverview(), s = useScope();
  const inSpotify = loc.pathname.startsWith('/music/spotify'), onPortal = loc.pathname === '/music/spotify';
  const all = lists.data ?? [], sp = all.filter(isSpotify).sort(byTime), old = all.filter(l => !isSpotify(l)).sort(byTime);
  const years = (ov.data?.years ?? []).filter(y => y.total.ms >= 3_600_000), max = Math.max(1, ...years.map(y => y.total.ms));
  const item = (l: Playlist) => <Link key={l.key} to={`/music/lists/${l.key}`} className={loc.pathname === `/music/lists/${l.key}` ? 'on' : ''}><span className="mu-side-t">{l.title}</span></Link>;
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
        {sp.length > 0 && <h4>Những năm Spotify</h4>}
        {sp.map(item)}
        {old.length > 0 && <h4>Trước Spotify</h4>}
        {old.map(item)}
      </>}
    </>
  );
}
