/* The month's money, two views in the portal's language:
   - spending by label: one section at a time (Category, People, …); every transaction counts in full under each
     label it carries — a parent through its children — so the rows can add up to more than the month, while the
     month's total counts each transaction once. One series → one colour, the value at each bar's tip;
   - spending by month: emphasis form — the month being read in the accent, the others in context grey,
     a tooltip per column, and a table view one tap away. */
import { useState, type FocusEvent, type MouseEvent } from 'react';
import type { FacetSpend, LabelLine, MonthReport, TrendPoint } from '../../api/money';
import { compact, money, monthFull, monthName, monthShort, vnd } from '../../lib/money';
import { useTxns } from './data';
import { dirOf, labelsOf, txs, useLabelBook } from './labels';

export function LabelReport({ report, month, active, onPick }: { report?: MonthReport; month: string; active: string | null; onPick: (id: string | null) => void }) {
  const book = useLabelBook();
  const sample = useTxns(month, 100);
  const [secId, setSecId] = useState<string | null>(null);
  if (!report) return <div className="card mn-cats mn-loading">Loading…</div>;

  /* an API from before labels were counted one by one: the categories as they were */
  const facets: FacetSpend[] = report.byLabel?.length ? report.byLabel : [{
    facetId: book.main?.id ?? 'main', name: 'Category', main: true, unlabeled: 0, multi: 0,
    labels: report.expenses.map(l => ({ id: l.categoryId, name: l.name, icon: l.icon, parentId: null, amount: l.amount, count: l.count })),
  }];
  const sec = facets.find(f => f.facetId === secId) ?? facets.find(f => f.main) ?? facets[0];
  const total = report.expense;
  const count = report.expenses.reduce((n, l) => n + l.count, 0);
  const desc = (a: LabelLine, b: LabelLine) => b.amount - a.amount;
  const pool = sec.labels.filter(l => !(l.id && book.label(l.id)?.kind === 'INCOME'));
  const rows: { l: LabelLine; child: boolean }[] = [];
  for (const p of pool.filter(l => (!l.parentId || !pool.some(x => x.id === l.parentId)) && l.amount > 0).sort(desc)) {
    rows.push({ l: p, child: false });
    rows.push(...pool.filter(k => k.parentId === p.id && p.id && k.amount > 0).sort(desc).map(k => ({ l: k, child: true })));
  }
  const none = sec.unlabeled;
  const max = Math.max(1, none, ...rows.map(r => r.l.amount));
  const icons = rows.some(r => r.l.icon);
  const width = (a: number) => `calc((100% - 136px) * ${Math.max(0.015, a / max).toFixed(4)})`;
  const pct = (a: number) => (total > 0 && a > 0 ? `${Math.max(1, Math.round((a / total) * 100))}%` : '');

  let note = rows.some(r => r.child) ? 'A parent label includes its children. ' : '';
  note += 'A transaction with two labels counts under both, so the rows can add up to more than the total.';
  if (sec.multi > 0) {
    const inSec = (id: string) => book.secOf(id) === sec.facetId || (sec.main && book.isMain(id));
    const ex = (sample.data?.content ?? []).map(t => ({ t, ids: book.sortIds(book.normalize(labelsOf(t))).filter(inSec) }))
      .find(x => x.t.kind !== 'TRANSFER' && dirOf(x.t) === 'out' && x.ids.length >= 2);
    const name = ex ? ex.t.description || ex.t.bankDescription : null;
    note += ` This month ${sec.multi === 1 ? 'one transaction does' : `${sec.multi} transactions do`}`
      + `${ex && name ? `, e.g. ${name} (${ex.ids.map(id => book.label(id)?.name).join(' + ')})` : ''}.`;
  }

  const bar = ({ l, child }: { l: LabelLine; child: boolean }) => {
    const c = l.id ? book.label(l.id) : undefined;
    const clickable = !!l.id && c?.code !== 'tien-mat';
    const on = !!l.id && active === l.id;
    const inner = (
      <>
        <span className="mn-bar-n">
          {icons && <span className="mn-ic" aria-hidden="true">{l.icon}</span>}
          <span className="mn-bar-name">{l.name}{c?.archived ? ' (hidden)' : ''}</span>
        </span>
        <span className="mn-bar-t"><i style={{ width: width(l.amount) }} /><b>{vnd(l.amount)}</b><small>{pct(l.amount)}</small></span>
      </>
    );
    return (
      <li key={l.id ?? l.name}>
        {clickable
          ? <button type="button" className={`mn-bar-row${child ? ' child' : ''}${on ? ' on' : ''}`} aria-pressed={on} title={`Show ${txs(l.count)}`}
              onClick={() => onPick(on ? null : l.id)}>{inner}</button>
          : <div className={`mn-bar-row${child ? ' child' : ''}`}>{inner}</div>}
      </li>
    );
  };

  return (
    <div className="card mn-cats">
      <div className="mn-head"><h2>Spending by label</h2></div>
      <p className="mn-total"><b>{vnd(total)}</b><span>spent in {monthName(month)} · {txs(count)}, each counted once</span></p>
      <div className="seg mn-rsec" role="tablist" aria-label="View by section">
        {facets.map(f => (
          <button key={f.facetId} type="button" role="tab" aria-selected={f.facetId === sec.facetId} className={f.facetId === sec.facetId ? 'on' : ''}
            onClick={() => setSecId(f.facetId)}>{f.name}</button>
        ))}
      </div>
      {!rows.length && none <= 0 ? <p className="mn-empty">No spending this month yet.</p> : (
        <>
          <ul className={`mn-bars${icons ? ' has-ic' : ''}`}>
            {rows.map(bar)}
            {none > 0 && (
              <li>
                <div className="mn-bar-row none">
                  <span className="mn-bar-n">{icons && <span className="mn-ic" />}<span className="mn-bar-name">{sec.main ? 'No category' : `No ${sec.name.toLowerCase()} label`}</span></span>
                  <span className="mn-bar-t"><i style={{ width: width(none) }} /><b>{vnd(none)}</b><small>{pct(none)}</small></span>
                </div>
              </li>
            )}
          </ul>
          <p className="mn-note">{note}</p>
        </>
      )}
      {sec.main && report.incomes.length > 0 && (
        <>
          <div className="mn-head sub"><h3>Income</h3><span className="mn-muted">{money(report.income, 'VND', true)}</span></div>
          <ul className="mn-inc">
            {report.incomes.map(l => <li key={l.categoryId ?? l.name}><span><span className="mn-ic" aria-hidden="true">{l.icon ?? '·'}</span>{l.name}</span><b>{money(l.amount, 'VND', true)}</b></li>)}
          </ul>
        </>
      )}
      {(report.moved ?? 0) > 0 && <p className="mn-sub">Internal transfers {vnd(report.moved)}, not counted as spending.</p>}
      {report.saved > 0 && <p className="mn-sub">Set aside {vnd(report.saved)}, not counted as spending.</p>}
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
