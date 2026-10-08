/* "Những con số" on a person's page: messages over the years, hours of the day, rank in the relationship sheets,
   Moments. Plain SVG, one hover readout per chart. */
import { useState, type MouseEvent } from 'react';
import type { PersonRanking } from '../types';
import { fmt } from '../lib/queries';

/* Validated categorical order (dataviz reference slots 1–3), fixed per platform. */
const PLATFORMS = [
  { i: 1, label: 'Facebook', color: '#2a78d6' },
  { i: 2, label: 'Yahoo', color: '#eb6834' },
  { i: 3, label: 'SMS', color: '#1baf7a' },
] as const;
const ACCENT = 'var(--angels)';
const PLATFORM_NAME: Record<string, string> = { facebook: 'Facebook', yahoo: 'Yahoo', sms: 'SMS', 'facebook-wall': 'tường FB' };

/* Sheet columns worth showing, with the meaning they had in the sheet. Anything else stays in the data. */
const METRICS: [string[], string, string?][] = [
  [['meet'], 'Gặp nhau', 'lần'],
  [['pic chung'], 'Ảnh chung'],
  [['pics'], 'Ảnh'],
  [['gifts (envelop)'], 'Quà'],
  [['music'], 'Nhạc'],
  [['call max', 'mobile max (m)'], 'Gọi lâu nhất', 'phút'],
  [['concert'], 'Concert'],
  [['travel'], 'Đi chơi xa'],
  [['year'], 'Quen từ năm', 'year'],
];

type Month = [string, number, number, number];
interface Activity {
  messages?: number; by_platform?: Record<string, number>; first?: string; last?: string;
  peak_month?: { month: string; messages: number }; peak_day?: { date: string; messages: number };
  longest_streak?: { days: number; from: string; to: string }; conversations?: number;
  started_by?: { self?: number; them?: number }; reply_median_s?: { self?: number; them?: number };
  monthly?: Month[]; hours?: number[];
}

const monthLabel = (ym?: string) => (ym && /^\d{4}-\d{2}/.test(ym) ? `${+ym.slice(5, 7)}/${ym.slice(0, 4)}` : ym ?? '');
const dayLabel = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${+d.slice(8, 10)}/${+d.slice(5, 7)}/${d.slice(0, 4)}` : d ?? '');
const periodLabel = (p: string) => (/^\d{4}\.\d{2}$/.test(p) ? `${+p.slice(5)}/${p.slice(0, 4)}` : /^\d{4}-\d{2}$/.test(p) ? monthLabel(p) : p);
const seconds = (s?: number) => (s == null ? '' : s < 60 ? `${Math.round(s)} giây` : `${Math.round(s / 60)} phút`);

/** Every month between the first and the last, empty ones included, so the gaps show. */
function allMonths(rows: Month[]): Month[] {
  if (!rows.length) return [];
  const by = new Map(rows.map(r => [r[0], r]));
  let [y, m] = rows[0][0].split('-').map(Number);
  const [y2, m2] = rows[rows.length - 1][0].split('-').map(Number);
  const out: Month[] = [];
  while (y < y2 || (y === y2 && m <= m2)) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    out.push(by.get(k) ?? [k, 0, 0, 0]);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

/** Where the readout sits: centred over the column, pinned to an edge near the sides. */
const tipStyle = (frac: number) => ({ left: `${frac * 100}%`, transform: `translateX(${frac < .2 ? 0 : frac > .8 ? -100 : -50}%)` });

/** Hover readout shared by the charts: which column the pointer is over. */
function useHover(count: number, left: number, width: number) {
  const [i, setI] = useState<number | null>(null);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * (left + width + 8) - left;
    setI(x < 0 || x > width ? null : Math.min(count - 1, Math.max(0, Math.floor((x / width) * count))));
  };
  return { i, onMove, onLeave: () => setI(null) };
}

function MonthsChart({ rows }: { rows: Month[] }) {
  const months = allMonths(rows);
  const W = 720, H = 150, L = 58, top = 8, n = months.length;   // L: room for the max label at phone size
  const max = Math.max(1, ...months.map(r => r[1] + r[2] + r[3]));
  const step = W / n, bw = Math.max(1, step - (step > 4 ? 2 : 0));
  const y = (v: number) => (v / max) * (H - top);
  const hover = useHover(n, L, W);
  const years = months.map((r, i) => [r[0].slice(0, 4), i] as const).filter(([, i]) => months[i][0].endsWith('-01') || i === 0);
  const every = Math.ceil(years.length / 9);
  const h = hover.i != null ? months[hover.i] : null;
  return (
    <figure className="nchart">
      <figcaption>Tin nhắn theo tháng
        <span className="legend">{PLATFORMS.map(p => <span key={p.i}><i style={{ background: p.color }} />{p.label}</span>)}</span>
      </figcaption>
      <div className="nchart-box">
        <svg viewBox={`0 0 ${L + W + 8} ${H + 22}`} role="img" aria-label="Số tin nhắn mỗi tháng" onMouseMove={hover.onMove} onMouseLeave={hover.onLeave}>
          <line x1={L} x2={L + W} y1={H} y2={H} className="axis" />
          <text x={L - 6} y={top + 4} className="tick" textAnchor="end">{fmt(max)}</text>
          <text x={L - 6} y={H} className="tick" textAnchor="end">0</text>
          {months.map((r, i) => {
            let base = H;
            return PLATFORMS.map(p => {
              const v = r[p.i]; if (!v) return null;
              const hh = Math.max(1, y(v)), yy = base - hh; base = yy - (step > 4 ? 1 : 0);
              return <rect key={`${i}-${p.i}`} x={L + i * step} y={yy} width={bw} height={hh} fill={p.color} opacity={hover.i == null || hover.i === i ? 1 : .45} />;
            });
          })}
          {years.filter((_, k) => k % every === 0).map(([yr, i]) => <text key={yr} x={L + i * step} y={H + 16} className="tick">{yr}</text>)}
        </svg>
        {h && (
          <div className="ntip" style={tipStyle((L + (hover.i! + .5) * step) / (L + W + 8))}>
            <b>{monthLabel(h[0])}</b> · {fmt(h[1] + h[2] + h[3])} tin
            {PLATFORMS.filter(p => h[p.i]).map(p => <span key={p.i}><i style={{ background: p.color }} />{p.label} {fmt(h[p.i])}</span>)}
          </div>)}
      </div>
    </figure>
  );
}

function HoursChart({ hours }: { hours: number[] }) {
  const W = 720, H = 90, L = 34, max = Math.max(1, ...hours), step = W / 24;
  const hover = useHover(24, L, W);
  const total = hours.reduce((a, b) => a + b, 0) || 1;
  return (
    <figure className="nchart">
      <figcaption>Giờ trong ngày</figcaption>
      <div className="nchart-box">
        <svg viewBox={`0 0 ${L + W + 8} ${H + 22}`} role="img" aria-label="Số tin nhắn theo giờ" onMouseMove={hover.onMove} onMouseLeave={hover.onLeave}>
          <line x1={L} x2={L + W} y1={H} y2={H} className="axis" />
          {hours.map((v, h) => {
            const hh = Math.max(v ? 1 : 0, (v / max) * (H - 6));
            return <rect key={h} x={L + h * step + 1} y={H - hh} width={step - 2} height={hh} rx={hh > 4 ? 2 : 0} fill={ACCENT} opacity={hover.i == null || hover.i === h ? 1 : .45} />;
          })}
          {[0, 6, 12, 18, 23].map(h => <text key={h} x={L + h * step + step / 2} y={H + 16} className="tick" textAnchor="middle">{h}h</text>)}
        </svg>
        {hover.i != null && (
          <div className="ntip" style={tipStyle((L + (hover.i + .5) * step) / (L + W + 8))}>
            <b>{hover.i}h – {hover.i + 1}h</b> · {fmt(hours[hover.i])} tin ({Math.round((hours[hover.i] / total) * 100)}%)
          </div>)}
      </div>
    </figure>
  );
}

function ChatActivity({ a, name }: { a: Activity; name: string }) {
  const sb = a.started_by ?? {}, sbTotal = (sb.self ?? 0) + (sb.them ?? 0);
  const plat = Object.entries(a.by_platform ?? {}).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
  return (
    <div className="ngroup">
      <dl className="nstats">
        {a.messages != null && <div><dt>Tin nhắn</dt><dd>{fmt(a.messages)}<small>{plat.map(([k, v]) => `${PLATFORM_NAME[k] ?? k} ${fmt(v)}`).join(' · ')}</small></dd></div>}
        {a.first && <div><dt>Từ – đến</dt><dd>{monthLabel(a.first)} – {monthLabel(a.last)}</dd></div>}
        {a.peak_month && <div><dt>Tháng nhiều nhất</dt><dd>{monthLabel(a.peak_month.month)}<small>{fmt(a.peak_month.messages)} tin</small></dd></div>}
        {a.peak_day && <div><dt>Ngày nhiều nhất</dt><dd>{dayLabel(a.peak_day.date)}<small>{fmt(a.peak_day.messages)} tin</small></dd></div>}
        {a.longest_streak && a.longest_streak.days > 1 && <div><dt>Liền nhau</dt><dd>{a.longest_streak.days} ngày<small>{dayLabel(a.longest_streak.from)} – {dayLabel(a.longest_streak.to)}</small></dd></div>}
        {sbTotal > 0 && <div><dt>Ai mở lời</dt><dd>{name} {Math.round(((sb.them ?? 0) / sbTotal) * 100)}%<small>{fmt(sbTotal)} cuộc trò chuyện</small></dd></div>}
        {a.reply_median_s?.self != null && <div><dt>Trả lời sau</dt><dd>anh {seconds(a.reply_median_s.self)}<small>{name} {seconds(a.reply_median_s.them)}</small></dd></div>}
      </dl>
      {!!a.monthly?.length && <MonthsChart rows={a.monthly} />}
      {a.hours?.length === 24 && <HoursChart hours={a.hours} />}
    </div>
  );
}

function RankHistory({ rows }: { rows: PersonRanking[] }) {
  const pts = rows.filter(r => r.rank != null);
  const W = 720, H = 120, L = 50, T = 14;
  const hover = useHover(pts.length, L, W);
  if (!pts.length) return null;
  const worst = Math.max(5, ...pts.map(r => r.rank!)), best = pts.reduce((b, r) => (r.rank! < b.rank! ? r : b), pts[0]);
  const last = pts[pts.length - 1];
  const x = (i: number) => L + (pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W);
  const y = (rank: number) => T + ((rank - 1) / Math.max(1, worst - 1)) * (H - T);
  const line = pts.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.rank!).toFixed(1)}`).join(' ');
  const h = hover.i != null ? pts[hover.i] : null;
  const latest = rows[rows.length - 1], m = (latest.metrics ?? {}) as Record<string, unknown>;
  const shown = METRICS.map(([keys, label, unit]) => {
    const v = keys.map(k => m[k]).find(v => typeof v === 'number' && v > 0) as number | undefined;
    return v ? { label, value: unit === 'year' ? String(v) : `${fmt(v)}${unit ? ` ${unit}` : ''}` } : null;
  }).filter(Boolean) as { label: string; value: string }[];
  return (
    <div className="ngroup">
      <dl className="nstats">
        <div><dt>Hạng gần nhất</dt><dd>#{last.rank}<small>trên {last.ranking.entryCount} người · {periodLabel(last.ranking.period)}</small></dd></div>
        <div><dt>Cao nhất</dt><dd>#{best.rank}<small>{periodLabel(best.ranking.period)}</small></dd></div>
        {last.points != null && <div><dt>Điểm</dt><dd>{fmt(Math.round(last.points))}</dd></div>}
        {shown.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
      </dl>
      <figure className="nchart">
        <figcaption>Thứ hạng trong bảng "sonic3k relationship" <span className="hint">{periodLabel(pts[0].ranking.period)} – {periodLabel(last.ranking.period)}</span></figcaption>
        <div className="nchart-box">
          <svg viewBox={`0 0 ${L + W + 8} ${H + 22}`} role="img" aria-label="Thứ hạng qua các lần cập nhật bảng" onMouseMove={hover.onMove} onMouseLeave={hover.onLeave}>
            <line x1={L} x2={L + W} y1={T} y2={T} className="grid" />
            <text x={L - 6} y={T + 4} className="tick" textAnchor="end">#1</text>
            <text x={L - 6} y={H + 4} className="tick" textAnchor="end">#{worst}</text>
            <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
            {pts.map((r, i) => <circle key={r.id} cx={x(i)} cy={y(r.rank!)} r={hover.i === i ? 5 : 3.5} fill={ACCENT} stroke="#fff" strokeWidth={2} />)}
            <text x={x(0)} y={H + 18} className="tick">{periodLabel(pts[0].ranking.period)}</text>
            <text x={x(pts.length - 1)} y={H + 18} className="tick" textAnchor="end">{periodLabel(last.ranking.period)}</text>
          </svg>
          {h && (
            <div className="ntip" style={tipStyle(x(hover.i!) / (L + W + 8))}>
              <b>{periodLabel(h.ranking.period)}</b> · hạng #{h.rank} / {h.ranking.entryCount}{h.points != null ? ` · ${fmt(Math.round(h.points))} điểm` : ''}
            </div>)}
        </div>
      </figure>
    </div>
  );
}

export default function PersonNumbers({ entries, name }: { entries: PersonRanking[]; name: string }) {
  const by = (board: string) => entries.filter(e => e.ranking.board === board && !e.ranking.variant)
    .sort((a, b) => (a.ranking.takenOn ?? a.ranking.period).localeCompare(b.ranking.takenOn ?? b.ranking.period));
  const act = by('chat-activity').pop(), rel = by('relationship'), moments = entries.filter(e => e.ranking.board === 'moments'), fba = by('fb-association');
  if (!act && !rel.length && !moments.length && !fba.length) return null;
  return (
    <section className="block numbers">
      <div className="hd"><h2>Những con số</h2></div>
      {act && <ChatActivity a={(act.metrics ?? {}) as Activity} name={name} />}
      {rel.length > 0 && <RankHistory rows={rel} />}
      {(moments.length > 0 || fba.length > 0) && (
        <div className="ngroup nchips">
          {moments.length > 0 && <p><span className="nlabel">Moments</span>{moments.map(e => <span key={e.id} className="chip">{periodLabel(e.period ?? '')}</span>)}</p>}
          {fba.length > 0 && <p><span className="nlabel">fb association</span>{fba.map(e => <span key={e.id} className="chip">#{e.rank} · {periodLabel(e.ranking.period)}</span>)}</p>}
        </div>)}
    </section>
  );
}
