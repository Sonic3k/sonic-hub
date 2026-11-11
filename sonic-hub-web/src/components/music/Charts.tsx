/* The few shapes every report is drawn with: ranked bars, columns stacked over time, the week by the hour, a year by
   the day. They only draw; the pages decide what is counted. */
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { hours, hoursShort, num, WEEKDAY } from '../../lib/music';

export interface BarRow { key: string; label: string; sub?: string | null; ms: number; plays: number; to?: string; color?: string; note?: string }

/** Lines ranked by time played or by plays, each with its bar; a line with `to` is a link. */
export function Bars({ rows, metric = 'ms', numbered = false, empty = 'Chưa có gì ở đây.' }: { rows: BarRow[]; metric?: 'ms' | 'plays'; numbered?: boolean; empty?: string }) {
  const max = Math.max(1, ...rows.map(r => r[metric]));
  if (!rows.length) return <p className="mu-none">{empty}</p>;
  return (
    <ol className={`mu-bars ${numbered ? 'numbered' : ''}`}>
      {rows.map((r, i) => {
        const body = (
          <>
            {numbered && <span className="mu-rank">{i + 1}</span>}
            <span className="mu-bar-n"><b>{r.label}</b>{r.sub && <small>{r.sub}</small>}</span>
            <span className="mu-bar-t"><i style={{ width: `${Math.max(1.5, (r[metric] / max) * 100)}%`, background: r.color }} /></span>
            <span className="mu-bar-v"><b>{metric === 'ms' ? hours(r.ms) : num(r.plays)}</b><small>{r.note ?? (metric === 'ms' ? `${num(r.plays)} lượt` : hours(r.ms))}</small></span>
          </>
        );
        return <li key={r.key}>{r.to ? <Link className="mu-bar-row" to={r.to}>{body}</Link> : <div className="mu-bar-row">{body}</div>}</li>;
      })}
    </ol>
  );
}

export interface Serie { key: string; label: string; color: string; to?: string }
const PAD_L = 48, PAD_B = 22, PAD_T = 8;

/** Clean ticks: 0 and three or four steps of 1/2/2.5/5 × 10ⁿ. */
function ticks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 3, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Columns over time (or over the hours of a day), each stacked by the series given, bottom first. */
export function Stack({ buckets, series, value, title, tick, height = 230, onPick, picked }: {
  buckets: string[]; series: Serie[]; value: (bucket: string, key: string) => number;
  /** what a bucket is called in the tooltip */ title: (bucket: string) => string;
  /** the label under a bucket (none = no label there) */ tick: (bucket: string, i: number) => string | null;
  height?: number; onPick?: (bucket: string) => void; picked?: string | null;
}) {
  /* drawn at the width it has on the page (one unit = one pixel), so its text keeps its size on a phone or in half a row */
  const box = useRef<HTMLDivElement>(null), [W, setW] = useState(960);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => setW(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [tip, setTip] = useState<{ i: number; x: number } | null>(null);
  if (!buckets.length) return <p className="mu-none" ref={box as never}>Không có lượt nghe nào trong khoảng này.</p>;
  const H = W < 520 ? Math.min(height, 190) : height, totals = buckets.map(b => series.reduce((a, s) => a + value(b, s.key), 0));
  const hr = 3_600_000, top = Math.max(...totals), ts = ticks(top / hr).map(t => t * hr), ceil = ts[ts.length - 1] || 1;
  const band = (W - PAD_L) / buckets.length, bw = Math.max(1.4, Math.min(34, band * 0.8));
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / ceil);
  const show = (i: number) => (e: MouseEvent<SVGElement>) => {
    const r = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect();
    const x = (PAD_L + band * i + band / 2) * (r.width / W);
    setTip({ i, x: Math.max(Math.min(96, r.width / 2), Math.min(r.width - 96, x)) });
  };
  const at = tip ? buckets[tip.i] : null;
  return (
    <div className="mu-chart" ref={box} onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {ts.map(v => <g key={v}><line className="grid" x1={PAD_L} x2={W} y1={y(v)} y2={y(v)} /><text className="tick" x={PAD_L - 8} y={y(v) + 4} textAnchor="end">{hoursShort(v)}</text></g>)}
        {buckets.map((b, i) => {
          const cx = PAD_L + band * i + band / 2; let acc = 0;
          const label = tick(b, i);
          return (
            <g key={b} className={`col ${tip?.i === i ? 'hover' : ''} ${picked === b ? 'on' : ''}`}>
              {series.map(s => {
                const v = value(b, s.key); if (v <= 0) return null;
                const y1 = y(acc + v), h = y(acc) - y1; acc += v;
                return <rect key={s.key} x={cx - bw / 2} y={y1} width={bw} height={Math.max(0.6, h)} fill={s.color} />;
              })}
              {label && <text className="tick" x={cx} y={H - 6} textAnchor="middle">{label}</text>}
              <rect className="hit" x={PAD_L + band * i} y={0} width={band} height={H - PAD_B} onMouseMove={show(i)} onClick={() => onPick?.(b)} style={{ cursor: onPick ? 'pointer' : 'default' }} />
            </g>
          );
        })}
        <line className="axis" x1={PAD_L} x2={W} y1={H - PAD_B} y2={H - PAD_B} />
      </svg>
      {tip && at && (
        <div className="mu-tip" style={{ left: tip.x }}>
          <span>{title(at)}</span>
          <b>{hours(totals[tip.i])}</b>
          {series.length > 1 && series.map(s => ({ s, v: value(at, s.key) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5)
            .map(({ s, v }) => <span key={s.key} className="l"><i style={{ background: s.color }} />{s.label}<em>{hours(v)}</em></span>)}
        </div>
      )}
    </div>
  );
}

/** What the colours of a stacked chart stand for; a series with `to` is a link (to that line alone). */
export function Legend({ series, total }: { series: Serie[]; total?: (key: string) => number }) {
  return (
    <ul className="mu-legend">
      {series.map(s => {
        const body = <><i style={{ background: s.color }} />{s.label}{total && <small>{hours(total(s.key))}</small>}</>;
        return <li key={s.key}>{s.to ? <Link to={s.to}>{body}</Link> : <span>{body}</span>}</li>;
      })}
    </ul>
  );
}

/** The week by the hour: seven rows of twenty-four cells, darker = more time played. rows = keys "weekday-hour". */
export function Punch({ rows }: { rows: { key: string; ms: number }[] }) {
  const m = new Map(rows.map(r => [r.key, r.ms])), max = Math.max(1, ...rows.map(r => r.ms)), min = rows.length >= 168 ? Math.min(...rows.map(r => r.ms)) : 0;
  const cell = (d: number, h: number) => m.get(`${d}-${String(h).padStart(2, '0')}`) ?? 0;
  return (
    <div className="mu-punch" role="img" aria-label="Giờ nghe theo thứ trong tuần">
      <span />{Array.from({ length: 24 }, (_, h) => <span key={h} className="h">{h % 3 === 0 ? h : ''}</span>)}
      {[1, 2, 3, 4, 5, 6, 7].map(d => [
        <span key={`d${d}`} className="d">{WEEKDAY[d]}</span>,
        ...Array.from({ length: 24 }, (_, h) => {
          const v = cell(d, h), a = v <= 0 ? 0 : 0.1 + 0.9 * Math.pow((v - min) / Math.max(1, max - min), 0.8);
          return <i key={`${d}-${h}`} title={`${WEEKDAY[d]}, ${h}h: ${hours(v)}`} style={{ background: v > 0 ? `color-mix(in srgb, var(--music) ${Math.round(a * 100)}%, #fff)` : undefined }} />;
        }),
      ])}
    </div>
  );
}

/** A year by the day (weeks run left to right, Monday on top), darker = more time played; a day can be picked. */
export function YearDays({ year, rows, picked, onPick }: { year: number; rows: { key: string; ms: number }[]; picked?: string | null; onPick: (day: string) => void }) {
  const m = new Map(rows.map(r => [r.key, r.ms])), max = Math.max(1, ...rows.map(r => r.ms));
  const first = new Date(Date.UTC(year, 0, 1)), offset = (first.getUTCDay() + 6) % 7;
  const days: string[] = [];
  for (let d = new Date(first); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  const months = Array.from({ length: 12 }, (_, i) => Math.floor((offset + days.findIndex(d => +d.slice(5, 7) === i + 1)) / 7));
  return (
    <div className="mu-year">
      <div className="mu-year-m">{months.map((w, i) => <span key={i} style={{ gridColumn: w + 1 }}>T{i + 1}</span>)}</div>
      <div className="mu-year-g">
        {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
        {days.map(d => {
          const v = m.get(d) ?? 0, a = v <= 0 ? 0 : 0.12 + 0.88 * Math.pow(v / max, 0.6);
          return <button type="button" key={d} className={picked === d ? 'on' : ''} title={`${d.slice(8, 10)}/${d.slice(5, 7)}: ${hours(v)}`} onClick={() => onPick(d)}
            style={{ background: v > 0 ? `color-mix(in srgb, var(--music) ${Math.round(a * 100)}%, #fff)` : undefined }} />;
        })}
      </div>
    </div>
  );
}

/** A few numbers side by side. */
export function Facts({ items }: { items: [string, ReactNode, string?][] }) {
  return <dl className="mu-facts">{items.map(([k, v, hint]) => <div key={k}><dt>{k}</dt><dd>{v}</dd>{hint && <small>{hint}</small>}</div>)}</dl>;
}
