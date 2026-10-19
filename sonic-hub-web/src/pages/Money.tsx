/* Tiền — the everyday side of the finance module: note in one line, check what the bank feed could not place,
   see the month. Bank transactions arrive by themselves (SePay); the back office is the admin's Finance page. */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { monthName, monthOf, shiftMonth, timeOf, utc, vnd } from '../lib/money';
import { markOwner, useReport, useSummary, useTrend } from '../components/money/data';
import QuickNote from '../components/money/QuickNote';
import Review from '../components/money/Review';
import Overview from '../components/money/Overview';
import { CategoryBars, TrendChart } from '../components/money/Charts';
import TxnList from '../components/money/TxnList';
import ImportStatement from '../components/money/ImportStatement';

export default function Money() {
  const [sp, setSp] = useSearchParams();
  const now = monthOf();
  const month = /^\d{4}-\d{2}$/.test(sp.get('m') ?? '') ? sp.get('m')! : now;
  const [category, setCategory] = useState<string | null>(null);
  const report = useReport(month), trend = useTrend();
  useEffect(() => { markOwner(); document.title = 'Tiền · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  useEffect(() => { setCategory(null); }, [month]);
  const go = (m: string) => setSp(m === now ? {} : { m }, { replace: true });
  const r = report.data;

  return (
    <div className="wrap page mn" style={{ ['--c' as string]: 'var(--money)' }}>
      <div className="ptitle">
        <h1>Tiền</h1>
        <span>{monthName(month)}</span>
        <div className="seg mn-months">
          <a href="#" onClick={e => { e.preventDefault(); go(shiftMonth(month, -1)); }} aria-label="Tháng trước">‹</a>
          <a href="#" className={month === now ? 'on' : ''} onClick={e => { e.preventDefault(); go(now); }}>Tháng này</a>
          <a href="#" onClick={e => { e.preventDefault(); if (month < now) go(shiftMonth(month, 1)); }} aria-label="Tháng sau" aria-disabled={month >= now}>›</a>
        </div>
        <ImportStatement />
      </div>

      <div className="mn-top">
        <div className="mn-col"><QuickNote /><Review /></div>
        <div className="mn-col"><Overview report={r} month={month} trend={trend.data ?? []} /></div>
      </div>
      {!!r?.gaps.length && (
        <div className="card mn-gaps">
          <b>⚠ Số dư ngân hàng không khớp</b>
          {r.gaps.map(g => (
            <p key={`${g.accountId}-${g.at}`}>{g.accountName}: lệch {vnd(g.missing, true)} trước giao dịch lúc {timeOf(g.at)} {utc(g.at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} — có thể thiếu một giao dịch (phí, hoặc webhook bị lỡ).</p>
          ))}
        </div>
      )}
      <div className="mn-two">
        <CategoryBars report={r} active={category} onPick={setCategory} />
        <TrendChart trend={trend.data ?? []} month={month} onPick={go} />
      </div>
      <TxnList month={month} category={category} onClearCategory={() => setCategory(null)} />
    </div>
  );
}

/** The sidebar while in Tiền: months (the trend as a list) and where the money sits. */
export function MoneySide() {
  const trend = useTrend(), summary = useSummary(), [sp] = useSearchParams();
  const now = monthOf(), active = sp.get('m') ?? now;
  const months = [...(trend.data ?? [])].reverse();
  const max = Math.max(1, ...months.map(m => m.expense));
  const accounts = (summary.data?.accounts ?? []).filter(a => !a.archived && a.mode !== 'POOL');
  return (
    <>
      <h4>Tháng</h4>
      {months.map(m => (
        <Link key={m.month} to={m.month === now ? '/money' : `/money?m=${m.month}`} className={m.month === active ? 'on' : ''}>
          {+m.month.slice(5)}/{m.month.slice(2, 4)}
          <span className="bar" style={{ ['--c' as string]: 'var(--money)' }}><b style={{ width: `${Math.round((m.expense / max) * 100)}%` }} /></span>
          <small>{m.expense >= 1e6 ? `${(m.expense / 1e6).toFixed(1).replace('.', ',')}tr` : `${Math.round(m.expense / 1000)}k`}</small>
        </Link>
      ))}
      {accounts.length > 0 && <h4>Tài khoản</h4>}
      {accounts.map(a => (
        <Link key={a.id} to="/money">
          <span className="dot" style={{ ['--c' as string]: a.color ?? 'var(--ink3)' }} />{a.name}
          <small>{a.balanceVnd === null ? '—' : a.balanceVnd >= 1e6 ? `${(a.balanceVnd / 1e6).toFixed(1).replace('.', ',')}tr` : `${Math.round(a.balanceVnd / 1000)}k`}</small>
        </Link>
      ))}
      {summary.data && <p className="mn-side-note">Tổng: <b>{vnd(summary.data.netWorthVnd)}</b>{summary.data.lastFeedAt && <><br />SePay lần cuối: {timeOf(summary.data.lastFeedAt)}</>}</p>}
    </>
  );
}
