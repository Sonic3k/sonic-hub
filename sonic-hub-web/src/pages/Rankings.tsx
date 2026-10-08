/* Angels › Bảng xếp hạng — ten years of the "sonic3k relationship" sheet in one place: where everyone stood at each
   update, who each month was about (Moments), the real message counts, and the fb association lists. */
import { Fragment, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import type { Person, RankingDetail, RankingEntry } from '../types';
import { fmt, usePersons } from '../lib/queries';
import { fold } from '../lib/text';

const T = 10 * 60_000;
const TOP = 12;        // lanes in the rank chart
const SHOWN = 20;      // rows before "show everyone"
const TOP_LONG = 10;   // "longest in the top ten"
/* Validated categorical slots 1–6 (dataviz reference), given to the top six of the latest update — by person, so a
   colour never moves to someone else when another update is picked. Names sit next to the lines (relief rule). */
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const CONTEXT = '#D6C2BD';
const PLATFORMS = [
  { keys: ['facebook', 'facebook-wall'], label: 'Facebook', color: '#2a78d6' },
  { keys: ['yahoo'], label: 'Yahoo', color: '#eb6834' },
  { keys: ['sms'], label: 'SMS', color: '#1baf7a' },
] as const;
/* fb association: one pink ramp, darker = higher (lightness falls monotonically; ink text, white on the darkest). */
const HEAT: [number, string, string][] = [[3, '#B8304F', '#fff'], [8, '#EF5B78', 'var(--ink)'], [14, '#F49AAE', 'var(--ink)'], [19, '#F9C3CF', 'var(--ink)'], [999, '#FDE7EC', 'var(--ink)']];
const TABS = [['rank', 'Thứ hạng'], ['moments', 'Moments'], ['messages', 'Tin nhắn'], ['fb', 'fb association']] as const;
type Tab = typeof TABS[number][0];

const useBoard = (board: string, metrics = false) =>
  useQuery({ queryKey: ['ranking-board', board, metrics], queryFn: () => hub.rankingBoard(board, metrics), staleTime: T });

const periodLabel = (p?: string | null) => (!p ? '' : /^\d{4}[.-]\d{2}$/.test(p) ? `${+p.slice(5, 7)}/${p.slice(0, 4)}` : p);
const monthLabel = (iso?: unknown) => (typeof iso === 'string' && /^\d{4}-\d{2}/.test(iso) ? `${+iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const keyOf = (e: RankingEntry) => e.personId ?? `~${e.label.trim().toLowerCase()}`;
const nameOf = (e: RankingEntry) => e.personName || e.label;
const timeOf = (r: RankingDetail) => Date.parse(r.takenOn ?? `${r.period.slice(0, 4)}-${r.period.slice(5, 7) || '01'}-01`);
const short = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** Phones get their own chart geometry: the SVG scales down to the screen, so lanes and marks must start larger. */
function useNarrow(px = 640) {
  const q = `(max-width: ${px}px)`;
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q), f = () => setN(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [q]);
  return n;
}
/** Where a readout sits: centred over the column, pinned to an edge near the sides. */
const tipStyle = (frac: number) => ({ left: `${frac * 100}%`, transform: `translateX(${frac < .2 ? 0 : frac > .8 ? -100 : -50}%)` });

interface Row { key: string; personId?: string | null; name: string; nick: string; rank: number; points?: number | null; note?: string | null }
interface Snap { id: string; period: string; label: string; t: number; rows: Row[]; at: Map<string, Row> }

/** The relationship lists, oldest first; variants (a re-scored copy) stay on the person pages only. */
function snapsOf(board?: RankingDetail[]): Snap[] {
  return (board ?? []).filter(r => !r.variant).sort((a, b) => timeOf(a) - timeOf(b) || a.period.localeCompare(b.period)).map(r => {
    const rows = r.entries.filter(e => e.rank != null)
      .map(e => ({ key: keyOf(e), personId: e.personId, name: nameOf(e), nick: e.label, rank: e.rank!, points: e.points, note: e.note }))
      .sort((a, b) => a.rank - b.rank);
    return { id: r.id, period: r.period, label: periodLabel(r.period), t: timeOf(r), rows, at: new Map(rows.map(x => [x.key, x])) };
  });
}

function Face({ p, name }: { p?: Person; name: string }) {
  return <span className="rk-face">{p?.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : <span className={p ? 'letter-ph' : 'letter-ph off'}>{name.slice(0, 1)}</span>}</span>;
}

function Who({ personId, name, children, className = 'rk-n' }: { personId?: string | null; name: string; children?: ReactNode; className?: string }) {
  return (
    <span className="rk-who">
      {personId ? <Link className={className} to={`/angels/${personId}`} onClick={e => e.stopPropagation()}>{name}</Link> : <span className={className}>{name}</span>}
      {children}
    </span>
  );
}

export default function RankingsPage() {
  const [sp, setSp] = useSearchParams();
  const tab: Tab = TABS.find(([k]) => k === sp.get('tab'))?.[0] ?? 'rank';
  const persons = usePersons();
  const byId = useMemo(() => new Map((persons.data ?? []).map(p => [p.id, p])), [persons.data]);
  const rel = useBoard('relationship');
  const snaps = useMemo(() => snapsOf(rel.data), [rel.data]);
  const set = (k: string, v?: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const first = snaps[0], last = snaps[snaps.length - 1];
  return (
    <div className="wrap page rk">
      <Link className="back" to="/angels">← Angels</Link>
      <div className="ptitle"><h1>Bảng xếp hạng</h1>
        <span>{first ? `sonic3k relationship · ${snaps.length} lần cập nhật · ${first.label} – ${last.label}` : ''}</span>
        <nav className="seg">{TABS.map(([k, n]) => <a key={k} className={tab === k ? 'on' : ''} onClick={() => set('tab', k === 'rank' ? undefined : k)}>{n}</a>)}</nav>
      </div>
      {tab === 'rank' && <RankTab snaps={snaps} loading={rel.isLoading} byId={byId} picked={sp.get('p')} onPick={p => set('p', p)} />}
      {tab === 'moments' && <MomentsTab />}
      {tab === 'messages' && <MessagesTab byId={byId} />}
      {tab === 'fb' && <FbTab />}
    </div>
  );
}

/* ── Thứ hạng ─────────────────────────────────────────────────────────────── */

function RankTab({ snaps, loading, byId, picked, onPick }: { snaps: Snap[]; loading: boolean; byId: Map<string, Person>; picked: string | null; onPick: (p: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const colors = useMemo(() => new Map(snaps.length ? snaps[snaps.length - 1].rows.slice(0, SERIES.length).map((r, k) => [r.key, SERIES[k]] as const) : []), [snaps]);
  if (loading) return <div className="card empty">Đang mở bảng…</div>;
  if (!snaps.length) return <div className="card empty">Chưa có bảng xếp hạng nào.</div>;
  const k = snaps.findIndex(s => s.period === picked), at = k >= 0 ? k : snaps.length - 1;
  const snap = snaps[at], prev = snaps[at - 1], lit = hovered ?? pinned;
  const pick = (i: number) => onPick(snaps[i].period), pin = (key: string) => setPinned(v => (v === key ? null : key));
  const rows = all ? snap.rows : snap.rows.slice(0, SHOWN), max = Math.max(1, snap.rows[0]?.points ?? 1);
  return (
    <section className="lanes">
      <div className="rk-main">
        <BumpChart snaps={snaps} at={at} colors={colors} lit={lit} onPick={pick} onLit={setHovered} onPin={pin} />
        <div className="rk-bar">
          <SnapPicker snaps={snaps} at={at} onPick={pick} />
          <span className="rk-count">{snap.rows.length} người · {snap.rows.filter(r => r.personId).length} người có trang riêng</span>
        </div>
        <ol className="rk-board">
          {rows.map(r => {
            const was = prev?.at.get(r.key);
            return <BoardRow key={r.key} r={r} was={was} isNew={!!prev && !was} max={max} p={r.personId ? byId.get(r.personId) : undefined}
              snaps={snaps} at={at} lit={lit === r.key} color={colors.get(r.key)} onLit={setHovered} onPin={pin} />;
          })}
        </ol>
        {snap.rows.length > SHOWN && <button type="button" className="rk-more" onClick={() => setAll(v => !v)}>{all ? 'Thu gọn' : `Xem cả ${snap.rows.length} người`}</button>}
      </div>
      <aside className="rail">
        <MoversCard snap={snap} prev={prev} />
        <LongestCard snaps={snaps} />
        <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Về bảng này</h3>
          <p className="rk-about">Bảng anh tự chấm điểm cho từng người, cập nhật {snaps.length} lần từ {snaps[0].label} đến {snaps[snaps.length - 1].label}. Điểm cộng từ nhiều cột: gặp nhau, quà, nhạc, concert, đi chơi xa… Hạng giữ nguyên số trong sheet.</p>
          <p className="rk-about">Số tin nhắn ghi trong sheet chỉ là ước lượng nên không hiện ở đây — số đếm thật nằm ở tab Tin nhắn.</p>
        </div>
      </aside>
    </section>
  );
}

function BumpChart({ snaps, at, colors, lit, onPick, onLit, onPin }: {
  snaps: Snap[]; at: number; colors: Map<string, string>; lit: string | null; onPick: (i: number) => void; onLit: (k: string | null) => void; onPin: (k: string) => void;
}) {
  const narrow = useNarrow(), k = narrow ? 1.7 : 1;
  const W = narrow ? 520 : 720, L = narrow ? 64 : 40, R = narrow ? 250 : 150, TOPPAD = narrow ? 52 : 30, LANE = narrow ? 40 : 24, B = narrow ? 58 : 34;
  const H = TOPPAD + (TOP - 1) * LANE;
  const t0 = snaps[0].t, t1 = snaps[snaps.length - 1].t, span = Math.max(1, t1 - t0);
  const x = (t: number) => L + ((t - t0) / span) * W;
  const y = (rank: number) => TOPPAD + (rank - 1) * LANE;
  const [hover, setHover] = useState<number | null>(null);
  /* everyone who reached the top TOP at least once: [snapshot index, rank] where they were inside it */
  const people = useMemo(() => {
    const m = new Map<string, { key: string; pts: [number, number][] }>();
    snaps.forEach((s, i) => s.rows.forEach(r => { if (r.rank <= TOP) { const v = m.get(r.key) ?? { key: r.key, pts: [] }; v.pts.push([i, r.rank]); m.set(r.key, v); } }));
    return [...m.values()];
  }, [snaps]);
  const path = (pts: [number, number][]) => pts.map(([i, rk], j) => `${j > 0 && pts[j - 1][0] === i - 1 ? 'L' : 'M'}${x(snaps[i].t).toFixed(1)},${y(rk).toFixed(1)}`).join('');
  const nearest = (e: MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect(), px = ((e.clientX - box.left) / box.width) * (L + W + R);
    if (px < L - 12 || px > L + W + 12) return null;
    const t = t0 + ((px - L) / W) * span;
    return snaps.reduce((best, s, i) => (Math.abs(s.t - t) < Math.abs(snaps[best].t - t) ? i : best), 0);
  };
  const y0 = new Date(t0).getFullYear(), y1 = new Date(t1).getFullYear();
  const years = Array.from({ length: y1 - y0 }, (_, k) => y0 + 1 + k).filter(yr => (yr - y0) % 2 === 1 || y1 - y0 <= 6);
  const order = (key: string) => (key === lit ? 3 : colors.has(key) ? 2 : 1);
  const lines = [...people].sort((a, b) => order(a.key) - order(b.key));
  const latest = snaps[snaps.length - 1].rows.filter(r => r.rank <= TOP);
  const ax = x(snaps[at].t), here = snaps[at].rows.filter(r => r.rank <= TOP);
  const h = hover != null ? snaps[hover] : null;
  return (
    <figure className="nchart rk-bump">
      <figcaption>Top {TOP} qua {snaps.length} lần cập nhật <span className="hint">bấm vào một mốc để xem cả bảng lúc đó</span></figcaption>
      <div className="nchart-box">
        <svg viewBox={`0 0 ${L + W + R} ${H + B}`} role="img" aria-label="Thứ hạng của từng người qua các lần cập nhật bảng"
          onMouseMove={e => setHover(nearest(e))} onMouseLeave={() => { setHover(null); onLit(null); }} onClick={e => { const i = nearest(e); if (i != null) onPick(i); }}>
          {Array.from({ length: TOP }, (_, k) => <line key={k} x1={L} x2={L + W} y1={y(k + 1)} y2={y(k + 1)} className="rk-lane" />)}
          {[1, 6, TOP].map(rk => <text key={rk} x={L - 10 * k} y={y(rk) + 4 * k} className="tick" textAnchor="end">#{rk}</text>)}
          {years.map(yr => <text key={yr} x={x(Date.parse(`${yr}-01-01`))} y={H + 24 * k} className="tick" textAnchor="middle">{yr}</text>)}
          <line x1={ax} x2={ax} y1={TOPPAD - 12 * k} y2={H + 8 * k} className="rk-at" strokeWidth={1.25 * k} />
          <text x={ax} y={TOPPAD - 17 * k} className="rk-at-label" textAnchor={at < 2 ? 'start' : at > snaps.length - 3 ? 'end' : 'middle'}>{snaps[at].label}</text>
          {hover != null && hover !== at && <line x1={x(snaps[hover].t)} x2={x(snaps[hover].t)} y1={TOPPAD - 8 * k} y2={H + 8 * k} className="rk-hover" />}
          {lines.map(pp => {
            const c = colors.get(pp.key), on = lit === pp.key, d = path(pp.pts);
            return (
              <g key={pp.key} opacity={lit != null && !on ? .22 : 1} onMouseEnter={() => onLit(pp.key)} onMouseLeave={() => onLit(null)}>
                <path d={d} fill="none" stroke={c ?? (on ? 'var(--ink2)' : CONTEXT)} strokeWidth={(on ? 3.5 : c ? 2.5 : 1.75) * k} strokeLinejoin="round" strokeLinecap="round" />
                {(c || on) && pp.pts.map(([i, rk]) => <circle key={i} cx={x(snaps[i].t)} cy={y(rk)} r={(on ? 3.5 : 2.5) * k} fill={c ?? 'var(--ink2)'} />)}
                <path d={d} fill="none" stroke="transparent" strokeWidth={12 * k} className="rk-hit" />
              </g>);
          })}
          {here.map(r => <circle key={r.key} cx={ax} cy={y(r.rank)} r={4.5 * k} fill={colors.get(r.key) ?? (lit === r.key ? 'var(--ink2)' : CONTEXT)} stroke="#fff" strokeWidth={2 * k}
            opacity={lit != null && lit !== r.key ? .3 : 1} />)}
          {latest.map(r => (
            <g key={r.key} className="rk-lab-g" onMouseEnter={() => onLit(r.key)} onMouseLeave={() => onLit(null)} onClick={e => { e.stopPropagation(); onPin(r.key); }}>
              <text x={L + W + 12 * k} y={y(r.rank) + 4 * k} className={`rk-lab${lit === r.key ? ' on' : ''}`}>{short(r.name)}</text>
            </g>))}
        </svg>
        {h && (
          <div className="ntip rk-tip" style={tipStyle(x(h.t) / (L + W + R))}>
            <b>{h.label}</b>{h.rows.slice(0, 5).map(r => <span key={r.key}>#{r.rank} {r.name}</span>)}
          </div>)}
      </div>
    </figure>
  );
}

function SnapPicker({ snaps, at, onPick }: { snaps: Snap[]; at: number; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const years = useMemo(() => {
    const m = new Map<string, [number, string][]>();
    snaps.forEach((s, i) => { const yr = s.period.slice(0, 4); m.set(yr, [...(m.get(yr) ?? []), [i, `T${+s.period.slice(5, 7)}`]]); });
    return [...m.entries()];
  }, [snaps]);
  return (
    <div className="rk-pick">
      <button type="button" className="rk-step" disabled={at <= 0} onClick={() => onPick(at - 1)} aria-label="Lần cập nhật trước">‹</button>
      <div className="rk-pick-in">
        <button type="button" className="sortbtn rk-pick-btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
          <b>{snaps[at].label}</b><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {open && <>
          <div className="rk-backdrop" onClick={() => setOpen(false)} />
          <div className="rk-menu">{years.map(([yr, list]) => (
            <div key={yr} className="rk-menu-y"><span>{yr}</span>
              <div>{list.map(([i, m]) => <button key={i} type="button" className={i === at ? 'on' : ''} onClick={() => { onPick(i); setOpen(false); }}>{m}</button>)}</div>
            </div>))}
          </div>
        </>}
      </div>
      <button type="button" className="rk-step" disabled={at >= snaps.length - 1} onClick={() => onPick(at + 1)} aria-label="Lần cập nhật sau">›</button>
    </div>
  );
}

function BoardRow({ r, was, isNew, max, p, snaps, at, lit, color, onLit, onPin }: {
  r: Row; was?: Row; isNew: boolean; max: number; p?: Person; snaps: Snap[]; at: number; lit: boolean; color?: string; onLit: (k: string | null) => void; onPin: (k: string) => void;
}) {
  const d = was ? was.rank - r.rank : 0;
  const delta = isNew ? <span className="rk-d new">mới</span> : !was ? <span className="rk-d" />
    : d > 0 ? <span className="rk-d up" title={`#${was.rank} → #${r.rank}`}>▲{d}</span>
    : d < 0 ? <span className="rk-d down" title={`#${was.rank} → #${r.rank}`}>▼{-d}</span> : <span className="rk-d">–</span>;
  const sub = [fold(r.nick) !== fold(r.name) ? r.nick : '', r.note ?? ''].filter(Boolean);
  return (
    <li className={`rk-row${lit ? ' on' : ''}`} onMouseEnter={() => onLit(r.key)} onMouseLeave={() => onLit(null)} onClick={() => onPin(r.key)}>
      <span className="rk-r">{r.rank}</span>
      {delta}
      <Face p={p} name={r.name} />
      <Who personId={r.personId} name={r.name}>
        {sub.length > 0 && <small>{sub.map((s, k) => <Fragment key={k}>{k ? ' · ' : ''}{r.note && k === sub.length - 1 ? <i>{s}</i> : s}</Fragment>)}</small>}
      </Who>
      <span className="rk-pts"><b>{r.points != null ? fmt(Math.round(r.points)) : ''}</b><i style={{ width: `${Math.max(2, ((r.points ?? 0) / max) * 100)}%` }} /></span>
      <Spark snaps={snaps} at={at} k={r.key} color={color} />
    </li>
  );
}

/** One person's rank across every update, on a shared scale (#1 at the top, #40 and below on the floor). */
function Spark({ snaps, at, k, color }: { snaps: Snap[]; at: number; k: string; color?: string }) {
  const W = 100, H = 28, MAXR = 40, t0 = snaps[0].t, span = Math.max(1, snaps[snaps.length - 1].t - t0);
  const x = (t: number) => 2 + ((t - t0) / span) * (W - 4), y = (rk: number) => 3 + ((Math.min(rk, MAXR) - 1) / (MAXR - 1)) * (H - 6);
  let d = '';
  snaps.forEach((s, i) => { const r = s.at.get(k); if (r) d += `${i > 0 && snaps[i - 1].at.has(k) ? 'L' : 'M'}${x(s.t).toFixed(1)},${y(r.rank).toFixed(1)}`; });
  const here = snaps[at].at.get(k);
  return (
    <svg className="rk-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line x1={0} x2={W} y1={H - 1} y2={H - 1} className="rk-spark-floor" />
      <path d={d} fill="none" stroke={color ?? 'var(--ink3)'} strokeWidth={1.5} strokeLinejoin="round" />
      {here && <circle cx={x(snaps[at].t)} cy={y(here.rank)} r={3} fill={color ?? 'var(--ink2)'} stroke="#fff" strokeWidth={1.5} />}
    </svg>
  );
}

function MoversCard({ snap, prev }: { snap: Snap; prev?: Snap }) {
  const head = <h3><i />Lần cập nhật {snap.label}</h3>;
  if (!prev) return <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}>{head}<p className="rk-about">Lần đầu tiên của bảng: {snap.rows.length} người.</p></div>;
  const moved = snap.rows.flatMap(r => { const w = prev.at.get(r.key); return w && w.rank !== r.rank ? [{ r, w, d: w.rank - r.rank }] : []; });
  const up = moved.filter(m => m.d > 0).sort((a, b) => b.d - a.d || a.r.rank - b.r.rank).slice(0, 3);
  const down = moved.filter(m => m.d < 0).sort((a, b) => a.d - b.d || a.r.rank - b.r.rank).slice(0, 3);
  const fresh = snap.rows.filter(r => !prev.at.has(r.key)), gone = prev.rows.filter(r => !snap.at.has(r.key));
  const names = (rs: Row[]) => `${rs.slice(0, 4).map(r => r.name).join(', ')}${rs.length > 4 ? ` và ${rs.length - 4} người khác` : ''}`;
  const mv = (m: { r: Row; w: Row; d: number }) => (
    <span key={m.r.key}><em>{m.r.name}</em><small><b className={m.d > 0 ? 'up' : ''}>{m.d > 0 ? `▲${m.d}` : `▼${-m.d}`}</b> · #{m.w.rank} → #{m.r.rank}</small></span>);
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}>{head}
      <dl className="facts rk-moves">
        <div><dt>So với</dt><dd>{prev.label}</dd></div>
        {up.length > 0 && <div><dt>Lên hạng</dt><dd>{up.map(mv)}</dd></div>}
        {down.length > 0 && <div><dt>Xuống hạng</dt><dd>{down.map(mv)}</dd></div>}
        {fresh.length > 0 && <div><dt>Mới vào</dt><dd>{names(fresh)}</dd></div>}
        {gone.length > 0 && <div><dt>Rời bảng</dt><dd>{names(gone)}</dd></div>}
        {!moved.length && !fresh.length && !gone.length && <div><dt>Thay đổi</dt><dd>Không ai đổi hạng.</dd></div>}
      </dl>
    </div>
  );
}

function LongestCard({ snaps }: { snaps: Snap[] }) {
  const top = useMemo(() => {
    const m = new Map<string, { r: Row; n: number }>();
    snaps.forEach(s => s.rows.forEach(r => { if (r.rank <= TOP_LONG) m.set(r.key, { r, n: (m.get(r.key)?.n ?? 0) + 1 }); }));
    return [...m.values()].sort((a, b) => b.n - a.n || a.r.rank - b.r.rank).slice(0, 8);
  }, [snaps]);
  return (
    <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Lâu nhất trong top {TOP_LONG}</h3>
      <ol className="rk-long">{top.map(({ r, n }) => (
        <li key={r.key}><Who personId={r.personId} name={r.name} className="rk-ln" /><span className="bar"><b style={{ width: `${(n / snaps.length) * 100}%` }} /></span><small>{n}/{snaps.length}</small></li>))}
      </ol>
    </div>
  );
}

/* ── Moments ──────────────────────────────────────────────────────────────── */

function MomentsTab() {
  const q = useBoard('moments');
  const [lit, setLit] = useState<string | null>(null);
  const entries = useMemo(() => (q.data ?? []).flatMap(r => r.entries), [q.data]);
  const years = useMemo(() => {
    type Year = { whole?: RankingEntry; months: (RankingEntry | undefined)[] };
    const m = new Map<string, Year>();
    entries.forEach(e => {
      const p = e.period ?? '', yr = p.slice(0, 4), mo = /^\d{4}-\d{2}$/.test(p) ? +p.slice(5, 7) : 0;
      const v: Year = m.get(yr) ?? { months: Array<RankingEntry | undefined>(12).fill(undefined) };
      if (mo) v.months[mo - 1] = e; else v.whole = e;
      m.set(yr, v);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);
  const most = useMemo(() => {
    const m = new Map<string, { e: RankingEntry; n: number }>();
    entries.forEach(e => m.set(keyOf(e), { e, n: (m.get(keyOf(e))?.n ?? 0) + 1 }));
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [entries]);
  if (q.isLoading) return <div className="card empty">Đang mở Moments…</div>;
  if (!entries.length) return <div className="card empty">Chưa có Moments.</div>;
  const cell = (e: RankingEntry, m?: number) => {
    const k = keyOf(e), cls = `rk-mcell${e.personId ? '' : ' ext'}${m ? '' : ' whole'}${lit === k ? ' on' : ''}`;
    const body = m ? <span>{nameOf(e)}</span> : <>{nameOf(e)}<small>cả năm</small></>;
    const props = { className: cls, 'data-m': m || undefined, title: `${nameOf(e)} · ${m ? `${m}/${(e.period ?? '').slice(0, 4)}` : e.period}`, onMouseEnter: () => setLit(k), onMouseLeave: () => setLit(null) };
    return e.personId ? <Link key={m ?? 0} to={`/angels/${e.personId}`} {...props}>{body}</Link> : <span key={m ?? 0} {...props}>{body}</span>;
  };
  return (
    <section>
      <div className="rk-main">
        <p className="rk-lede">Mỗi tháng một người — {entries.length} tháng ghi lại từ {years[0][0]} đến {years[years.length - 1][0]}. Rê chuột vào một tên để thấy hết những tháng của người đó.</p>
        <div className="rk-mgrid">
          <div className="rk-mhead"><span />{Array.from({ length: 12 }, (_, i) => <span key={i}>T{i + 1}</span>)}</div>
          {years.map(([yr, v]) => (
            <div key={yr} className="rk-myear"><b>{yr}</b>
              {v.whole ? cell(v.whole) : v.months.map((e, i) => (e ? cell(e, i + 1) : <span key={i + 1} className="rk-mcell empty" />))}
            </div>))}
        </div>
      </div>
      <aside className="rail rk-cards">
        <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Nhiều tháng nhất</h3>
          <ol className="rk-long">{most.map(({ e, n }) => (
            <li key={keyOf(e)} onMouseEnter={() => setLit(keyOf(e))} onMouseLeave={() => setLit(null)}>
              <Who personId={e.personId} name={nameOf(e)} className="rk-ln" /><span className="bar"><b style={{ width: `${(n / most[0].n) * 100}%` }} /></span><small>{n} tháng</small></li>))}
          </ol>
        </div>
        <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Về Moments</h3>
          <p className="rk-about">Trang Moments trong file mới nhất của bảng: mỗi tháng anh ghi tên một người — tháng đó là về ai. Năm 2001 và 2004 chỉ ghi một người cho cả năm; những tháng trống là chưa ghi.</p>
        </div>
      </aside>
    </section>
  );
}

/* ── Tin nhắn ─────────────────────────────────────────────────────────────── */

function MessagesTab({ byId }: { byId: Map<string, Person> }) {
  const q = useBoard('chat-activity', true);
  const list = q.data?.[q.data.length - 1];
  const rows = useMemo(() => (list?.entries ?? []).filter(e => e.rank != null).sort((a, b) => a.rank! - b.rank!).map(e => {
    const m = (e.metrics ?? {}) as Record<string, unknown>, bp = (m.by_platform ?? {}) as Record<string, number>;
    return { e, parts: PLATFORMS.map(p => p.keys.reduce((s, k) => s + (bp[k] ?? 0), 0)), first: monthLabel(m.first), last: monthLabel(m.last) };
  }), [list]);
  if (q.isLoading) return <div className="card empty">Đang đếm tin nhắn…</div>;
  if (!rows.length) return <div className="card empty">Chưa có số liệu tin nhắn.</div>;
  const max = Math.max(1, ...rows.map(r => r.parts.reduce((a, b) => a + b, 0)));
  const totals = PLATFORMS.map((_, i) => rows.reduce((s, r) => s + r.parts[i], 0)), all = totals.reduce((a, b) => a + b, 0);
  return (
    <section className="lanes">
      <div className="rk-main">
        <figure className="nchart rk-msghead">
          <figcaption>{list?.title ?? 'Tin nhắn'}<span className="legend">{PLATFORMS.map(p => <span key={p.label}><i style={{ background: p.color }} />{p.label}</span>)}</span></figcaption>
        </figure>
        <ol className="rk-msgs">{rows.map(({ e, parts, first, last }) => {
          const p = e.personId ? byId.get(e.personId) : undefined, total = parts.reduce((a, b) => a + b, 0);
          return (
            <li key={e.id} className="rk-mrow">
              <span className="rk-r">{e.rank}</span>
              <Face p={p} name={nameOf(e)} />
              <Who personId={e.personId} name={nameOf(e)}>{first && <small>{first} – {last}</small>}</Who>
              <span className="rk-mbars">
                <span className="rk-mbar" style={{ width: `${Math.max(1, (total / max) * 100)}%` }}>{PLATFORMS.map((pl, i) => parts[i] > 0 && <i key={pl.label} style={{ flexGrow: parts[i], background: pl.color }} />)}</span>
                <small>{PLATFORMS.map((pl, i) => (parts[i] ? `${pl.label} ${fmt(parts[i])}` : '')).filter(Boolean).join(' · ')}</small>
              </span>
              <b className="rk-total">{fmt(total)}</b>
            </li>);
        })}</ol>
      </div>
      <aside className="rail">
        <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Tổng cộng</h3>
          <dl className="facts">
            <div><dt>Tin nhắn</dt><dd>{fmt(all)}</dd></div>
            {PLATFORMS.map((pl, i) => <div key={pl.label}><dt>{pl.label}</dt><dd>{fmt(totals[i])}</dd></div>)}
            <div><dt>Số người</dt><dd>{rows.length}</dd></div>
          </dl>
        </div>
        <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Về số liệu này</h3>
          <p className="rk-about">Đếm từ các cuộc trò chuyện đã nhập vào Sonic Hub, không phải số ước lượng trong sheet. Thiếu tin nhắn không có nghĩa là không liên lạc — nhiều đoạn chat đã không được lưu lại.</p>
        </div>
      </aside>
    </section>
  );
}

/* ── fb association ───────────────────────────────────────────────────────── */

function FbTab() {
  const q = useBoard('fb-association');
  const lists = useMemo(() => [...(q.data ?? [])].sort((a, b) => timeOf(a) - timeOf(b)), [q.data]);
  const rows = useMemo(() => {
    const m = new Map<string, { e: RankingEntry; ranks: (number | undefined)[] }>();
    lists.forEach((l, i) => l.entries.forEach(e => {
      const k = keyOf(e), v = m.get(k) ?? { e, ranks: Array(lists.length).fill(undefined) };
      v.ranks[i] = e.rank ?? undefined; m.set(k, v);
    }));
    const latest = (v: { ranks: (number | undefined)[] }) => { for (let i = v.ranks.length - 1; i >= 0; i--) if (v.ranks[i] != null) return (lists.length - 1 - i) * 1000 + v.ranks[i]!; return 1e9; };
    return [...m.values()].sort((a, b) => latest(a) - latest(b));
  }, [lists]);
  if (q.isLoading) return <div className="card empty">Đang mở fb association…</div>;
  if (!lists.length) return <div className="card empty">Chưa có danh sách fb association.</div>;
  const heat = (rk?: number) => { const h = HEAT.find(([lim]) => (rk ?? 999) <= lim)!; return { background: h[1], color: h[2] }; };
  return (
    <section className="lanes">
      <div className="rk-main">
        <p className="rk-lede">{lists.length} lần xếp hạng, mỗi lần {lists[0].entries.length} người — ô càng đậm là hạng càng cao.</p>
        <div className="rk-fbwrap">
          <table className="rk-fb">
            <thead><tr><th />{lists.map(l => <th key={l.id}>{periodLabel(l.period)}</th>)}</tr></thead>
            <tbody>{rows.map(({ e, ranks }) => (
              <tr key={keyOf(e)}>
                <th>{e.personId ? <Link to={`/angels/${e.personId}`}>{nameOf(e)}</Link> : <span className="ext">{nameOf(e)}</span>}</th>
                {ranks.map((rk, i) => (rk != null ? <td key={i} style={heat(rk)}>{rk}</td> : <td key={i} className="none" />))}
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="rail">
        <div className="card" style={{ ['--c' as string]: 'var(--angels)' }}><h3><i />Về fb association</h3>
          <p className="rk-about">Các danh sách "fb association" trong file mới nhất của bảng: {lists.map(l => periodLabel(l.period)).join(', ')}. Người chưa có trang riêng hiện chữ nhạt.</p>
        </div>
      </aside>
    </section>
  );
}
