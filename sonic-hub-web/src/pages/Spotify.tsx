/* Spotify: his listening, one stream at a time — every stream of his extended streaming history, with the song, the
   list it came from, the machine, where he was and the hour. One scope (a stretch of time, and any of: an artist, an
   album, a list, a machine, a place) cuts every view the same way, so any question is a scope plus a view. */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '../api/client';
import { musicApi, type Filters, type Group, type Report, type Row } from '../api/music';
import { Bars, Facts, Legend, Punch, Stack, YearDays, type BarRow, type Serie } from '../components/music/Charts';
import { CONTEXT, DEVICE, END, PALETTE, PLACE, REST, SHUFFLE, START, WEEKDAY, clock, dmy, hours, my, num, whenText } from '../lib/music';
import '../styles/music.css';

const T = 5 * 60_000;
export const VIEWS: [string, string][] = [['', 'Tổng quan'], ['songs', 'Bài hát'], ['artists', 'Nghệ sĩ'], ['albums', 'Album'], ['playlists', 'Playlist'],
  ['hours', 'Giờ nghe'], ['devices', 'Thiết bị'], ['places', 'Nơi nghe'], ['how', 'Cách nghe'], ['days', 'Từng ngày']];
type Bucket = 'year' | 'month' | 'day' | 'hour' | 'weekday';
const pad = (n: number) => String(n).padStart(2, '0');
const nextMonth = (m: string) => (+m.slice(5, 7) === 12 ? `${+m.slice(0, 4) + 1}-01` : `${m.slice(0, 4)}-${pad(+m.slice(5, 7) + 1)}`);
const monthName = (m: string) => `Tháng ${+m.slice(5, 7)}/${m.slice(0, 4)}`;

export const useOverview = () => useQuery({ queryKey: ['sp-overview'], queryFn: musicApi.overview, staleTime: T });
export const useLists = () => useQuery({ queryKey: ['music-lists'], queryFn: musicApi.lists, staleTime: T });
const useReport = (group: Group, f: Filters, o: { by?: Bucket; sort?: string; limit?: number } = {}, enabled = true) =>
  useQuery({ queryKey: ['sp-report', group, f, o], queryFn: () => musicApi.report(group, f, o), staleTime: T, enabled });

/** The scope the address holds: y / m = a year or a month, then artist, album, playlist, device, place, ctx. */
export function useScope() {
  const [sp] = useSearchParams();
  return useMemo(() => {
    const y = /^\d{4}$/.test(sp.get('y') ?? '') ? sp.get('y')! : null, m = /^\d{4}-\d{2}$/.test(sp.get('m') ?? '') ? sp.get('m')! : null;
    const f: Filters = {};
    if (m) { f.from = m; f.to = nextMonth(m); } else if (y) { f.from = y; f.to = String(+y + 1); }
    for (const k of ['artist', 'album', 'playlist', 'device', 'place'] as const) { const v = sp.get(k); if (v) f[k] = v; }
    const ctx = sp.get('ctx'); if (ctx) f.context = ctx;
    /** this scope with some of it changed (null drops a part); the picked day never travels */
    const to = (patch: Record<string, string | null>) => {
      const n = new URLSearchParams(sp); n.delete('day');
      for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') n.delete(k); else n.set(k, v); }
      const s = n.toString();
      return s ? `/music/spotify?${s}` : '/music/spotify';
    };
    return { y, m, f, view: sp.get('v') ?? '', to, day: sp.get('day'), bucket: (m ? 'day' : 'month') as Bucket, narrowed: Object.keys(f).some(k => k !== 'from' && k !== 'to') };
  }, [sp]);
}
type Scope = ReturnType<typeof useScope>;

// ── how each side of a stream is named and where a line of it leads ───────────
const NAMES: Partial<Record<Group, Record<string, string>>> = { device: DEVICE, place: PLACE, context: CONTEXT, start: START, end: END, shuffle: SHUFFLE };
function nameOf(group: Group, r: { key: string; label?: string | null }): string {
  if (group === 'playlist') return r.key ? r.label ?? r.key : 'Ngoài playlist';
  if (group === 'album') return r.key || 'Không rõ album';
  if (group === 'weekday') return WEEKDAY[+r.key] ?? r.key;
  if (group === 'hour') return `${+r.key}h`;
  return NAMES[group]?.[r.key] ?? r.label ?? r.key ?? '';
}
function linkOf(group: Group, r: Row, s: Scope): string | undefined {
  if (group === 'song') return `/music/spotify/song/${r.key}`;
  if (group === 'artist') return s.to({ artist: r.key, v: null });
  if (group === 'album') return r.key ? s.to({ album: r.key, artist: r.sub ?? null, v: null }) : undefined;
  if (group === 'playlist') return r.key ? s.to({ playlist: r.key, v: null }) : undefined;
  if (group === 'device') return s.to({ device: r.key, v: null });
  if (group === 'place') return s.to({ place: r.key, v: null });
  if (group === 'context') return s.to({ ctx: r.key, v: null });
  return undefined;
}
const bars = (group: Group, rep: Report | undefined, s: Scope): BarRow[] => (rep?.rows ?? []).map(r => ({
  key: `${r.key}|${r.sub ?? ''}`, label: nameOf(group, r) + (r.version ? ` (${r.version})` : ''), sub: group === 'song' || group === 'album' ? r.sub : null,
  ms: r.ms, plays: r.plays, to: linkOf(group, r, s),
}));

// ── blocks ───────────────────────────────────────────────────────────────────

function Block({ title, hint, more, children }: { title: string; hint?: string; more?: [string, string]; children: React.ReactNode }) {
  return (
    <section className="card mu-block">
      <div className="hd" style={{ ['--c' as string]: 'var(--music)' }}><h2>{title}</h2>{hint && <span>{hint}</span>}{more && <Link to={more[1]}>{more[0]}</Link>}</div>
      {children}
    </section>
  );
}

/** One side ranked, as bars. */
function Breakdown({ s, group, title, hint, limit = 10, sort, more, metric = 'ms', numbered }: {
  s: Scope; group: Group; title: string; hint?: string; limit?: number; sort?: string; more?: [string, string]; metric?: 'ms' | 'plays'; numbered?: boolean;
}) {
  const q = useReport(group, s.f, { limit, sort: sort ?? (metric === 'plays' ? 'plays' : 'ms') });
  return <Block title={title} hint={hint} more={more}>{q.isLoading ? <p className="mu-none">Đang đếm…</p> : <Bars rows={bars(group, q.data, s)} metric={metric} numbered={numbered} />}</Block>;
}

/** The buckets of a stretch with none missing, so a quiet month still has its place. */
function fill(by: Bucket, have: string[], f: Filters): string[] {
  if (by === 'hour') return Array.from({ length: 24 }, (_, i) => pad(i));
  if (by === 'weekday') return ['1', '2', '3', '4', '5', '6', '7'];
  if (!have.length) return [];
  const a = [...have].sort(), out: string[] = [];
  if (by === 'year') { for (let y = +a[0]; y <= +a[a.length - 1]; y++) out.push(String(y)); return out; }
  if (by === 'month') { for (let m = a[0]; m <= a[a.length - 1]; m = nextMonth(m)) out.push(m); return out; }
  const m = f.from && f.from.length === 7 ? f.from : a[0].slice(0, 7), n = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${m}-${pad(i + 1)}`);
}

/** One side over time: columns stacked by its biggest lines, the rest as one. */
function Timeline({ s, f, group, by, title, hint, limit = 6, onPick, picked, half }: {
  s: Scope; f?: Filters; group: Group; by: Bucket; title: string; hint?: string; limit?: number; onPick?: (bucket: string) => void; picked?: string | null;
  /** it sits in half a row */ half?: boolean;
}) {
  const q = useReport(group, f ?? s.f, { by, limit });
  const data = useMemo(() => {
    const rep = q.data; if (!rep) return null;
    const cell = new Map<string, number>(), total = new Map<string, number>();
    for (const p of rep.series ?? []) { if (p.key === null) total.set(p.bucket, p.ms); else cell.set(`${p.bucket}|${p.key}`, p.ms); }
    let buckets = fill(by, [...total.keys()], f ?? s.f);
    if (by === 'month' || by === 'year') {          // a stray stream years before he really started would stretch the axis
      const floor = Math.max(...buckets.map(b => total.get(b) ?? 0)) * 0.004;
      while (buckets.length > 1 && (total.get(buckets[0]) ?? 0) < floor) buckets = buckets.slice(1);
      while (buckets.length > 1 && (total.get(buckets[buckets.length - 1]) ?? 0) < floor) buckets = buckets.slice(0, -1);
    }
    const flat = ['year', 'month', 'day', 'hour', 'weekday', 'punch'].includes(group);
    const series: Serie[] = flat ? [{ key: '*', label: 'Tất cả', color: 'var(--music)' }] : rep.rows.map((r, i) => ({
      key: r.key, label: nameOf(group, r), color: group === 'playlist' && !r.key ? '#B9B1A3' : PALETTE[i % PALETTE.length], to: linkOf(group, r, s),
    }));
    const sum = (b: string) => rep.rows.reduce((a, r) => a + (cell.get(`${b}|${r.key}`) ?? 0), 0);
    const rest = flat ? 0 : buckets.reduce((a, b) => a + Math.max(0, (total.get(b) ?? 0) - sum(b)), 0);
    if (rest > 0) series.push({ key: '~', label: 'Còn lại', color: REST });
    const value = (b: string, k: string) => (k === '*' ? total.get(b) ?? 0 : k === '~' ? Math.max(0, (total.get(b) ?? 0) - sum(b)) : cell.get(`${b}|${k}`) ?? 0);
    const totals = new Map(rep.rows.map(r => [r.key, r.ms])); totals.set('~', rest);
    return { buckets, series, value, totals, flat };
  }, [q.data, by, group, f, s]);
  const tick = (b: string, i: number) => by === 'month' ? (data && data.buckets.length <= 14 ? `T${+b.slice(5, 7)}` : b.endsWith('-01') ? b.slice(0, 4) : null)
    : by === 'day' ? (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : null) : by === 'hour' ? (i % 3 === 0 ? `${i}h` : null) : by === 'weekday' ? WEEKDAY[+b] : b;
  const name = (b: string) => by === 'month' ? monthName(b) : by === 'day' ? dmy(b) : by === 'hour' ? `${+b}h – ${+b + 1}h` : by === 'weekday' ? WEEKDAY[+b] : b;
  return (
    <Block title={title} hint={hint}>
      {q.isLoading || !data ? <p className="mu-none">Đang đếm…</p> : <>
        <Stack buckets={data.buckets} series={data.series} value={data.value} title={name} tick={tick} onPick={onPick} picked={picked} height={half ? 200 : 230} />
        {!data.flat && <Legend series={data.series} total={k => data.totals.get(k) ?? 0} />}
      </>}
    </Block>
  );
}

function Heat({ s }: { s: Scope }) {
  const q = useReport('punch', s.f);
  return <Block title="Giờ trong tuần" hint="giờ tại nơi anh ở lúc đó">{q.isLoading ? <p className="mu-none">Đang đếm…</p> : <Punch rows={q.data?.rows ?? []} />}</Block>;
}

// ── the page ─────────────────────────────────────────────────────────────────

export default function Spotify() {
  const s = useScope(), ov = useOverview(), lists = useLists(), nav = useNavigate();
  const total = useReport('year', s.f, {});
  const years = (ov.data?.years ?? []).filter(y => y.total.ms >= 3_600_000);
  const listTitle = (k: string) => lists.data?.find(l => l.key === k)?.title ?? k;
  const pills: [string, string, string][] = [];           // [what, value, the param it drops]
  if (s.f.artist) pills.push(['Nghệ sĩ', s.f.artist, 'artist']);
  if (s.f.album) pills.push(['Album', s.f.album, 'album']);
  if (s.f.playlist) pills.push(['Playlist', listTitle(s.f.playlist), 'playlist']);
  if (s.f.device) pills.push(['Thiết bị', DEVICE[s.f.device] ?? s.f.device, 'device']);
  if (s.f.place) pills.push(['Nơi nghe', PLACE[s.f.place] ?? s.f.place, 'place']);
  if (s.f.context) pills.push(['Cách mở', CONTEXT[s.f.context] ?? s.f.context, 'ctx']);
  const t = total.data?.total, view = VIEWS.find(v => v[0] === s.view) ?? VIEWS[0];
  const pickMonth = (b: string) => nav(s.to(s.m ? { v: 'days', y: b.slice(0, 4), m: null, day: null } : { m: b, y: null }) + (s.m ? `&day=${b}` : ''));
  return (
    <div className="wrap page mu" style={{ ['--c' as string]: 'var(--music)' }}>
      <div className="crumbs"><Link to="/music">Music</Link> / Spotify</div>
      <div className="ptitle"><h1>{view[0] ? view[1] : 'Spotify'}</h1><span>{s.m ? monthName(s.m) : s.y ?? 'từ 2019 đến nay'}</span></div>
      <div className="mchips mu-views">{VIEWS.map(([k, n]) => <Link key={k} to={s.to({ v: k || null })} className={s.view === k ? 'on' : ''}>{n}</Link>)}</div>
      <div className="mchips mu-years">
        <Link to={s.to({ y: null, m: null })} className={!s.y && !s.m ? 'on' : ''}>Tất cả</Link>
        {years.map(y => <Link key={y.year} to={s.to({ y: y.year, m: null })} className={(s.y ?? s.m?.slice(0, 4)) === y.year ? 'on' : ''}>{y.year}<small>{hours(y.total.ms)}</small></Link>)}
      </div>
      {(pills.length > 0 || s.m) && <div className="pills">
        {s.m && <Link className="fpill" to={s.to({ m: null, y: s.m.slice(0, 4) })}>{monthName(s.m)}<i>✕</i></Link>}
        {pills.map(([k, v, p]) => <Link key={p} className="fpill" to={s.to({ [p]: null })}>{k}: {v}<i>✕</i></Link>)}
        {s.f.playlist && <Link className="mu-go" to={`/music/lists/${s.f.playlist}`}>Xem danh sách này →</Link>}
      </div>}
      {t && <Facts items={[['Thời gian nghe', hours(t.ms)], ['Lượt nghe', num(t.plays), 'từ 30 giây trở lên'], ['Bài hát', num(t.songs)], ['Nghệ sĩ', num(t.artists)], ['Ngày có nghe', num(t.days)]]} />}
      {t && t.starts === 0 ? <div className="card empty">Không có lượt nghe nào trong phạm vi này.</div>
        : s.view === 'songs' ? <Songs s={s} />
        : s.view === 'artists' ? <Breakdown s={s} group="artist" title="Nghệ sĩ" hint="theo thời gian nghe" limit={150} numbered />
        : s.view === 'albums' ? <Breakdown s={s} group="album" title="Album" hint="theo thời gian nghe" limit={150} numbered />
        : s.view === 'playlists' ? <Playlists s={s} onPick={pickMonth} />
        : s.view === 'hours' ? <>
          <Heat s={s} />
          <Timeline s={s} group="device" by="hour" title="Giờ trong ngày" hint="màu = thiết bị" limit={7} />
          <Timeline s={s} group="context" by="weekday" title="Thứ trong tuần" hint="màu = cách mở nhạc" />
        </>
        : s.view === 'devices' ? <>
          <Timeline s={s} group="device" by={s.bucket} title={s.m ? 'Theo ngày' : 'Theo tháng'} hint="màu = thiết bị" limit={8} onPick={pickMonth} />
          <Breakdown s={s} group="device" title="Thiết bị" limit={20} />
        </>
        : s.view === 'places' ? <>
          <Timeline s={s} group="place" by={s.bucket} title={s.m ? 'Theo ngày' : 'Theo tháng'} hint="màu = nơi anh ở" limit={8} onPick={pickMonth} />
          <Breakdown s={s} group="place" title="Nơi nghe" hint="theo dòng thời gian của anh, không theo mạng đang nối" limit={20} />
        </>
        : s.view === 'how' ? <>
          <Timeline s={s} group="context" by={s.bucket} title="Nhạc đến từ đâu" hint="đọc từ từng phiên nghe" onPick={pickMonth} />
          <div className="mu-two">
            <Breakdown s={s} group="context" title="Cách mở nhạc" />
            <Breakdown s={s} group="shuffle" title="Shuffle" />
          </div>
          <div className="mu-two">
            <Breakdown s={s} group="start" title="Bài bắt đầu thế nào" metric="plays" sort="starts" />
            <Breakdown s={s} group="end" title="Bài kết thúc thế nào" metric="plays" sort="starts" />
          </div>
        </>
        : s.view === 'days' ? <Days s={s} />
        : <>
          <Timeline s={s} group="playlist" by={s.bucket} title={s.m ? 'Theo ngày' : 'Theo tháng'} hint="màu = playlist" onPick={pickMonth} />
          <div className="mu-two">
            <Breakdown s={s} group="song" title="Bài nghe nhiều nhất" metric="plays" numbered more={['Tất cả bài hát', s.to({ v: 'songs' })]} />
            {s.f.artist ? <Breakdown s={s} group="album" title="Album" more={['Tất cả album', s.to({ v: 'albums' })]} />
              : <Breakdown s={s} group="artist" title="Nghệ sĩ" numbered more={['Tất cả nghệ sĩ', s.to({ v: 'artists' })]} />}
          </div>
          <div className="mu-two">
            <Heat s={s} />
            <div className="mu-col">
              <Breakdown s={s} group="device" title="Thiết bị" limit={6} more={['Chi tiết', s.to({ v: 'devices' })]} />
              <Breakdown s={s} group="place" title="Nơi nghe" limit={5} more={['Chi tiết', s.to({ v: 'places' })]} />
            </div>
          </div>
          {!s.y && !s.m && !s.narrowed && <YearsTable />}
        </>}
    </div>
  );
}

function YearsTable() {
  const ov = useOverview(), years = (ov.data?.years ?? []).filter(y => y.total.ms >= 3_600_000);
  return (
    <Block title="Từng năm">
      <div className="mu-scroll"><table className="mu-table">
        <thead><tr><th>Năm</th><th>Thời gian</th><th>Lượt nghe</th><th>Bài nghe nhiều nhất</th><th>Nghệ sĩ</th><th>Playlist</th></tr></thead>
        <tbody>{years.map(y => (
          <tr key={y.year}>
            <td><Link to={`/music/spotify?y=${y.year}`}><b>{y.year}</b></Link></td><td>{hours(y.total.ms)}</td><td>{num(y.total.plays)}</td>
            <td>{y.topSong && <Link to={`/music/spotify/song/${y.topSong.key}`}>{y.topSong.label}<small> · {y.topSong.sub} · {num(y.topSong.plays)} lượt</small></Link>}</td>
            <td>{y.topArtist && <Link to={`/music/spotify?y=${y.year}&artist=${encodeURIComponent(y.topArtist.key)}`}>{y.topArtist.key}<small> · {hours(y.topArtist.ms)}</small></Link>}</td>
            <td>{y.topPlaylist && <Link to={`/music/lists/${y.topPlaylist.key}`}>{y.topPlaylist.label}<small> · {hours(y.topPlaylist.ms)}</small></Link>}</td>
          </tr>))}</tbody>
      </table></div>
    </Block>
  );
}

function Songs({ s }: { s: Scope }) {
  const [metric, setMetric] = useState<'plays' | 'ms'>('plays'), [q, setQ] = useState(''), [n, setN] = useState(100);
  const rep = useReport('song', { ...s.f, q: q.trim().length >= 2 ? q.trim() : undefined }, { limit: n, sort: metric });
  const rows = rep.data?.rows ?? [];
  return (
    <section className="card mu-block">
      <div className="hd" style={{ ['--c' as string]: 'var(--music)' }}><h2>Bài hát</h2>
        <div className="seg mu-seg"><a className={metric === 'plays' ? 'on' : ''} onClick={() => setMetric('plays')}>Lượt nghe</a><a className={metric === 'ms' ? 'on' : ''} onClick={() => setMetric('ms')}>Thời gian</a></div>
        <input className="finput" placeholder="Tìm bài, nghệ sĩ, album…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {rep.isLoading ? <p className="mu-none">Đang đếm…</p> : <>
        <div className="mu-scroll"><table className="mu-table mu-songs">
          <thead><tr><th>#</th><th>Bài</th><th>Lượt nghe</th><th>Thời gian</th><th>Lần đầu</th><th>Lần cuối</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.key}>
              <td>{i + 1}</td>
              <td><Link to={`/music/spotify/song/${r.key}`}><b>{r.label}</b>{r.version && <em> ({r.version})</em>}</Link><small>{r.sub}</small></td>
              <td>{num(r.plays)}</td><td>{hours(r.ms)}</td><td>{dmy(r.first)}</td><td>{dmy(r.last)}</td>
            </tr>))}</tbody>
        </table></div>
        {rows.length >= n && n < 2000 && <button type="button" className="mu-more" onClick={() => setN(n * 5)}>Xem thêm</button>}
        {!rows.length && <p className="mu-none">Không có bài nào.</p>}
      </>}
    </section>
  );
}

function Playlists({ s, onPick }: { s: Scope; onPick: (b: string) => void }) {
  const lists = useLists(), rep = useReport('playlist', s.f, { limit: 200 });
  const by = new Map((rep.data?.rows ?? []).map(r => [r.key, r]));
  const mine = (lists.data ?? []).filter(l => l.key.startsWith('spotify-')).sort((a, b) => (by.get(b.key)?.ms ?? 0) - (by.get(a.key)?.ms ?? 0) || (a.takenAt ?? '').localeCompare(b.takenAt ?? ''));
  const out = by.get('');
  return (
    <>
      <Timeline s={s} group="playlist" by={s.bucket} title={s.m ? 'Theo ngày' : 'Theo tháng'} hint="màu = playlist" limit={8} onPick={onPick} />
      <Block title="Các playlist của anh" hint="Spotify không ghi bài phát ra từ playlist nào; con số ở đây đọc từ từng phiên nghe">
        <div className="mu-scroll"><table className="mu-table">
          <thead><tr><th>Playlist</th><th>Tạo ngày</th><th>Số bài</th><th>Thời gian nghe</th><th>Lượt nghe</th><th>Nghe từ</th><th>đến</th></tr></thead>
          <tbody>
            {mine.map(l => { const r = by.get(l.key); return (
              <tr key={l.key} className={r ? '' : 'dim'}>
                <td><Link to={`/music/lists/${l.key}`}><b>{l.title}</b></Link></td><td>{dmy(l.takenAt)}</td><td>{num(l.tracks)}</td>
                <td>{r ? <Link to={s.to({ playlist: l.key, v: null })}>{hours(r.ms)}</Link> : '—'}</td><td>{r ? num(r.plays) : '—'}</td><td>{my(r?.first)}</td><td>{my(r?.last)}</td>
              </tr>); })}
            {out && <tr><td>Ngoài playlist<small> · album, nghệ sĩ, bài lẻ</small></td><td /><td /><td><Link to={s.to({ v: 'how' })}>{hours(out.ms)}</Link></td><td>{num(out.plays)}</td><td>{my(out.first)}</td><td>{my(out.last)}</td></tr>}
          </tbody>
        </table></div>
      </Block>
    </>
  );
}

function Days({ s }: { s: Scope }) {
  const nav = useNavigate(), ov = useOverview();
  const best = [...(ov.data?.years ?? [])].sort((a, b) => b.total.ms - a.total.ms)[0]?.year;
  const year = s.y ?? s.m?.slice(0, 4) ?? best ?? '2020';
  const f = useMemo(() => ({ ...s.f, from: year, to: String(+year + 1) }), [s.f, year]);
  const rep = useReport('day', f), day = s.day && s.day.startsWith(year) ? s.day : null;
  const top = [...(rep.data?.rows ?? [])].sort((a, b) => b.ms - a.ms).slice(0, 8);
  return (
    <>
      <Block title={`Từng ngày của ${year}`} hint="bấm vào một ngày để xem từng bài">
        {rep.isLoading ? <p className="mu-none">Đang đếm…</p> : <YearDays year={+year} rows={rep.data?.rows ?? []} picked={day} onPick={d => nav(`${s.to({ v: 'days', y: year, m: null })}&day=${d}`)} />}
        {top.length > 0 && <p className="mu-topdays">Nghe nhiều nhất: {top.map((r, i) => <span key={r.key}>{i > 0 && ' · '}<Link to={`${s.to({ v: 'days', y: year, m: null })}&day=${r.key}`}>{dmy(r.key)}</Link> ({hours(r.ms)})</span>)}</p>}
      </Block>
      {day && <DayList day={day} />}
    </>
  );
}

function DayList({ day }: { day: string }) {
  const q = useQuery({ queryKey: ['sp-day', day], queryFn: () => musicApi.day(day), staleTime: T });
  const rows = q.data ?? [], ms = rows.reduce((a, r) => a + r.ms, 0);
  return (
    <Block title={`Ngày ${dmy(day)}`} hint={rows.length ? `${num(rows.length)} lượt phát · ${hours(ms)}` : undefined}>
      {q.isLoading ? <p className="mu-none">Đang mở…</p> : !rows.length ? <p className="mu-none">Ngày này không có lượt nghe nào.</p> : (
        <div className="mu-scroll"><table className="mu-table mu-day">
          <thead><tr><th>Giờ</th><th>Bài</th><th>Nghe</th><th>Từ</th><th>Máy</th><th>Bắt đầu</th><th>Kết thúc</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i} className={r.ms < 30000 ? 'dim' : ''}>
              <td>{r.at.slice(11, 16)}</td>
              <td><Link to={`/music/spotify/song/${r.songId}`}><b>{r.title}</b>{r.version && <em> ({r.version})</em>}</Link><small>{r.artist}</small></td>
              <td>{clock(r.ms)}</td>
              <td>{r.playlistKey ? <Link to={`/music/lists/${r.playlistKey}`}>{r.playlistTitle}</Link> : r.context === 'ALBUM' ? `Album ${r.album ?? ''}` : CONTEXT[r.context ?? ''] ?? ''}</td>
              <td>{DEVICE[r.device ?? ''] ?? r.device}</td><td>{START[r.start ?? ''] ?? r.start}</td><td>{END[r.end ?? ''] ?? r.end}</td>
            </tr>))}</tbody>
        </table></div>)}
    </Block>
  );
}

// ── one song ─────────────────────────────────────────────────────────────────

export function SongPage() {
  const { id = '' } = useParams(), q = useQuery({ queryKey: ['sp-song', id], queryFn: () => musicApi.song(id), staleTime: T, enabled: !!id });
  const s = useScope(), f = useMemo<Filters>(() => ({ song: id }), [id]), scope = useMemo(() => ({ ...s, f }), [s, f]);
  const g = q.data;
  if (q.isLoading) return <div className="wrap page mu"><div className="card empty">Đang mở bài hát…</div></div>;
  if (!g) return <div className="wrap page mu"><div className="card empty">Không tìm thấy bài này.</div></div>;
  const t = g.total, sid = g.tracks[0]?.spotifyId, rec = g.recording;
  return (
    <div className="wrap page mu mu-song" style={{ ['--c' as string]: 'var(--music)' }}>
      <div className="crumbs"><Link to="/music">Music</Link> / <Link to="/music/spotify">Spotify</Link> / <Link to="/music/spotify?v=songs">Bài hát</Link></div>
      <div className="ptitle"><h1>{g.title}{g.version && <small> ({g.version})</small>}</h1><span><Link to={`/music/spotify?artist=${encodeURIComponent(g.artist)}`}>{g.artist}</Link></span></div>
      {g.assessment && <p className="mu-read">{g.assessment}</p>}
      <Facts items={[['Lượt nghe', num(t.plays), 'từ 30 giây trở lên'], ['Thời gian nghe', hours(t.ms)], ['Lần đầu', dmy(t.first) || '—'], ['Lần cuối', dmy(t.last) || '—'],
        ['Tự chọn', num(g.picked), 'anh bấm vào chính bài này'], ['Bấm qua', num(g.passed), `trên ${num(t.starts)} lần phát`], ['Nghe hết', num(g.finished)]]} />
      <div className="mu-links">
        {sid && <a href={`https://open.spotify.com/track/${sid}`} target="_blank" rel="noreferrer">Mở trên Spotify ↗</a>}
        {rec?.hasAudio && rec.audioUrl && <audio controls preload="none" src={apiUrl(rec.audioUrl.replace(/^\/api/, ''))} />}
        {rec?.firstHeard && <span>Bắt đầu nghe: {whenText(rec.firstHeard)}</span>}
      </div>
      {t.starts > 0 && <>
        <Timeline s={scope} group="playlist" by="month" title="Theo tháng" hint="màu = playlist" />
        <div className="mu-two">
          <Breakdown s={scope} group="playlist" title="Phát ra từ đâu" metric="plays" />
          <Breakdown s={scope} group="device" title="Thiết bị" metric="plays" />
        </div>
        <div className="mu-two">
          <Timeline s={scope} group="hour" by="hour" title="Giờ trong ngày" half />
          <Breakdown s={scope} group="place" title="Nơi nghe" metric="plays" />
        </div>
      </>}
      <div className="mu-two">
        {g.lists.length > 0 && <Block title="Trong các danh sách">
          <ul className="mu-plain">{g.lists.map(l => <li key={l.key}><Link to={`/music/lists/${l.key}`}>{l.title}</Link>{l.addedAt && <small>thêm ngày {dmy(l.addedAt)}</small>}</li>)}</ul>
        </Block>}
        {g.tracks.length > 1 && <Block title="Các bản trên Spotify" hint="cùng một bài, phát hành ở nhiều nơi">
          <ul className="mu-plain">{g.tracks.map(x => <li key={x.spotifyId}><a href={`https://open.spotify.com/track/${x.spotifyId}`} target="_blank" rel="noreferrer">{x.name}</a><small>{x.album ?? ''} · {num(x.plays)} lượt</small></li>)}</ul>
        </Block>}
      </div>
    </div>
  );
}
