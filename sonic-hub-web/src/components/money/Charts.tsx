/* Two charts, plain SVG/HTML in the portal's language:
   - spending by category: one series → one colour for every bar, value at the tip (no tooltip needed);
   - spending by month: emphasis form — the month being read in the accent, the others in context grey,
     a tooltip per column, and a table view one tap away. */
import { useState, type FocusEvent, type MouseEvent } from 'react';
import type { Line, MonthReport, TrendPoint } from '../../api/money';
import { compact, monthFull, monthShort, vnd } from '../../lib/money';

export function CategoryBars({ report, active, onPick }: { report?: MonthReport; active: string | null; onPick: (id: string | null) => void }) {
  if (!report) return <div className="card mn-cats mn-loading">Loading…</div>;
  const lines = report.expenses;
  const max = Math.max(1, ...lines.map(l => l.amount));
  const total = report.expense || 1;
  const keyOf = (l: Line) => l.categoryId ?? (l.code ? `code:${l.code}` : 'none');
  return (
    <div className="card mn-cats">
      <div className="mn-head"><h2>Spending by category</h2><span className="mn-muted">{vnd(report.expense)}</span></div>
      {!lines.length ? <p className="mn-empty">No spending this month yet.</p> : (
        <ul className="mn-bars">
          {lines.map(l => {
            const k = keyOf(l), on = active === k, clickable = !!l.categoryId && l.code !== 'tien-mat';
            return (
              <li key={k}>
                <button type="button" className={`mn-bar-row ${on ? 'on' : ''}`} onClick={() => onPick(on ? null : k)}
                  disabled={!clickable} title={clickable ? 'Show this category’s transactions' : undefined}>
                  <span className="mn-bar-n"><span className="mn-ic">{l.icon ?? '·'}</span>{l.name}</span>
                  <span className="mn-bar-t">
                    {l.amount > 0 && <i style={{ width: `calc((100% - 124px) * ${Math.max(0.015, l.amount / max).toFixed(4)})` }} />}
                    <b>{vnd(l.amount)}</b>
                    <small>{l.amount > 0 ? `${Math.round((l.amount / total) * 100)}%` : ''}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {report.incomes.length > 0 && (
        <>
          <div className="mn-head sub"><h3>Income</h3><span className="mn-muted">{vnd(report.income)}</span></div>
          <ul className="mn-inc">
            {report.incomes.map(l => <li key={l.categoryId ?? l.name}><span><span className="mn-ic">{l.icon ?? '·'}</span>{l.name}</span><b>{vnd(l.amount)}</b></li>)}
          </ul>
        </>
      )}
      {report.saved > 0 && <p className="mn-sub">Set aside (not counted as spending): <b>{vnd(report.saved)}</b></p>}
    </div>
  );
}

const W = 640, H = 210, PAD_L = 44, PAD_B = 26, PAD_T = 18;

/** Clean ticks: 0 and three steps of 1/2/2.5/5 × 10ⁿ. */
function ticks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 3, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

export function TrendChart({ trend, month, onPick }: { trend: TrendPoint[]; month: string; onPick: (m: string) => void }) {
  const [tip, setTip] = useState<{ i: number; x: number } | null>(null);
  const [table, setTable] = useState(false);
  if (!trend.length) return <div className="card mn-trend mn-loading">Loading…</div>;
  const ts = ticks(Math.max(...trend.map(t => t.expense)));
  const top = ts[ts.length - 1] || 1;
  const band = (W - PAD_L) / trend.length, bw = Math.min(24, band * 0.56);
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / top);
  const label = monthShort;
  const show = (i: number) => (e: MouseEvent<SVGElement> | FocusEvent<SVGElement>) => {
    const box = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect();
    const scale = box.width / W;
    const x = (PAD_L + band * i + band / 2) * scale;
    setTip({ i, x: Math.max(64, Math.min(box.width - 64, x)) });
  };
  const sel = trend.findIndex(t => t.month === month);

  return (
    <div className="card mn-trend">
      <div className="mn-head"><h2>Spending by month</h2><button type="button" className="mn-link" onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show table'}</button></div>
      {table ? (
        <table className="mn-table">
          <thead><tr><th>Month</th><th>Spent</th><th>Income</th><th>Net worth</th></tr></thead>
          <tbody>{[...trend].reverse().map(t => (
            <tr key={t.month} className={t.month === month ? 'on' : ''} onClick={() => onPick(t.month)}>
              <td>{monthFull(t.month)}</td><td>{vnd(t.expense)}</td><td>{vnd(t.income)}</td><td>{t.netWorth === null ? '—' : vnd(t.netWorth)}</td>
            </tr>))}</tbody>
        </table>
      ) : (
        <div className="mn-chart" onMouseLeave={() => setTip(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Spending by month">
            {ts.map(v => (
              <g key={v}>
                <line className="grid" x1={PAD_L} x2={W} y1={y(v)} y2={y(v)} />
                <text className="tick" x={PAD_L - 8} y={y(v) + 4} textAnchor="end">{compact(v)}</text>
              </g>
            ))}
            {trend.map((t, i) => {
              const cx = PAD_L + band * i + band / 2, h = Math.max(0, H - PAD_B - y(t.expense)), on = i === sel;
              const r = Math.min(4, bw / 2, h);
              const x0 = cx - bw / 2, yTop = H - PAD_B - h;
              const path = h <= 0 ? '' : `M${x0},${H - PAD_B} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + bw - r} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + r} V${H - PAD_B} Z`;
              return (
                <g key={t.month} className={`col ${on ? 'on' : ''} ${tip?.i === i ? 'hover' : ''}`}>
                  {path && <path d={path} />}
                  {on && t.expense > 0 && <text className="cap" x={cx} y={yTop - 6} textAnchor="middle">{compact(t.expense)}</text>}
                  <text className="tick" x={cx} y={H - 8} textAnchor="middle">{label(t.month)}</text>
                  <rect className="hit" x={PAD_L + band * i} y={0} width={band} height={H} tabIndex={0} role="button"
                    aria-label={`${monthFull(t.month)}: spent ${vnd(t.expense)}`}
                    onMouseMove={show(i)} onFocus={show(i)} onBlur={() => setTip(null)} onClick={() => onPick(t.month)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onPick(t.month); }} />
                </g>
              );
            })}
            <line className="axis" x1={PAD_L} x2={W} y1={H - PAD_B} y2={H - PAD_B} />
          </svg>
          {tip && trend[tip.i] && (
            <div className="mn-tip" style={{ left: tip.x }}>
              <span>{monthFull(trend[tip.i].month)}</span>
              <b>Spent {vnd(trend[tip.i].expense)}</b>
              <span>Income {vnd(trend[tip.i].income)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
