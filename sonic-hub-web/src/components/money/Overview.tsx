/* The month in a few numbers: what went out (the one big figure), what is left of the budget, what came in, and
   where the money sits — each balance editable in place (the monthly balance check). */
import { useState } from 'react';
import { moneyApi, type MoneyAccount, type MonthReport, type TrendPoint } from '../../api/money';
import { money, monthName, monthOf, vnd } from '../../lib/money';
import { useRefresh, useSummary } from './data';

export default function Overview({ report, month, trend }: { report?: MonthReport; month: string; trend: TrendPoint[] }) {
  const summary = useSummary(), refresh = useRefresh();
  const [budgetEdit, setBudgetEdit] = useState<string | null>(null);
  const current = month === monthOf();
  if (!report) return <div className="card mn-ov mn-loading">Loading…</div>;

  const base = current ? report.prevExpenseToDate : report.prevExpense;
  const delta = base && base > 0 ? Math.round(((report.expense - base) / base) * 100) : null;
  const b = report.budget;
  const used = b && b.limit > 0 ? Math.min(1, b.spent / b.limit) : 0;
  const over = !!b && b.remaining < 0;
  const i = trend.findIndex(t => t.month === month);
  const worth = summary.data?.netWorthVnd ?? null, prevWorth = i > 0 ? trend[i - 1].netWorth : null;

  const saveBudget = async () => {
    const v = Number((budgetEdit ?? '').replace(/\D/g, ''));
    await moneyApi.setBudget(v);
    setBudgetEdit(null); refresh();
  };

  return (
    <div className="card mn-ov">
      <p className="mn-label">Spent in {monthName(month)}</p>
      <p className="mn-hero">{vnd(report.expense)}</p>
      <p className="mn-delta">
        {delta === null ? (current ? 'Nothing from last month to compare with yet.' : '')
          : <><b className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%</b> {current ? 'vs. this point last month' : 'vs. last month'}</>}
      </p>

      {b ? (
        <div className={`mn-budget ${over ? 'over' : ''}`}>
          <div className="mn-budget-top">
            <span>{over ? '⚠ Over budget' : 'Left to spend'}</span>
            <b>{vnd(Math.abs(b.remaining))}</b>
          </div>
          <div className="mn-meter" role="meter" aria-valuemin={0} aria-valuemax={b.limit} aria-valuenow={b.spent} aria-label="Budget used">
            <i style={{ width: `${Math.round(used * 100)}%` }} />
          </div>
          <p className="mn-sub">
            {vnd(b.spent)} / {vnd(b.limit)}
            {current && b.perDay !== null && !over && <> · ≈ {vnd(b.perDay)}/day · {b.daysLeft} {b.daysLeft === 1 ? 'day' : 'days'} left</>}
            <button type="button" className="mn-link" onClick={() => setBudgetEdit(String(b.limit))}>Edit</button>
          </p>
        </div>
      ) : budgetEdit === null && (
        <button type="button" className="mn-link mn-setbudget" onClick={() => setBudgetEdit('')}>+ Set a monthly budget for flexible spending</button>
      )}
      {budgetEdit !== null && (
        <form className="mn-inline" onSubmit={e => { e.preventDefault(); saveBudget(); }}>
          <input inputMode="numeric" autoFocus value={budgetEdit} onChange={e => setBudgetEdit(e.target.value)} placeholder="8000000" />
          <button type="submit" className="mn-btn">Save</button>
          <button type="button" className="mn-link" onClick={() => setBudgetEdit(null)}>Cancel</button>
        </form>
      )}

      <dl className="mn-kpis">
        <div><dt>Income</dt><dd>{vnd(report.income)}</dd></div>
        <div><dt>Net</dt><dd className={report.net < 0 ? 'neg' : ''}>{vnd(report.net)}</dd></div>
        {report.saved > 0 && <div><dt>Saved</dt><dd>{vnd(report.saved)}</dd></div>}
      </dl>

      <Accounts accounts={summary.data?.accounts ?? []} onSaved={refresh} worth={worth}
        change={prevWorth !== null && worth !== null && current ? worth - prevWorth : null} />
    </div>
  );
}

function Accounts({ accounts, onSaved, worth, change }: { accounts: MoneyAccount[]; onSaved: () => void; worth: number | null; change: number | null }) {
  const [edit, setEdit] = useState<{ id: string; value: string } | null>(null);
  const [error, setError] = useState('');
  const live = accounts.filter(a => !a.archived && a.mode !== 'POOL');
  const save = async () => {
    if (!edit) return;
    try { await moneyApi.setBalance(edit.id, Number(edit.value.replace(/[^\d.-]/g, ''))); setEdit(null); setError(''); onSaved(); }
    catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="mn-accts">
      <div className="mn-accts-head">
        <p className="mn-label">Where the money is</p>
        <div><b>{vnd(worth)}</b>{change !== null && <small>{change >= 0 ? '+' : '−'}{vnd(Math.abs(change))} since the end of last month</small>}</div>
      </div>
      <ul>
        {live.map(a => (
          <li key={a.id}>
            <i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />
            <span className="mn-acc-n">{a.name}</span>
            {edit?.id === a.id ? (
              <form className="mn-inline" onSubmit={e => { e.preventDefault(); save(); }}>
                <input inputMode="decimal" autoFocus value={edit.value} onChange={e => setEdit({ id: a.id, value: e.target.value })} />
                <button type="submit" className="mn-btn">Set</button>
              </form>
            ) : (
              <button type="button" className="mn-acc-v" title={a.mode === 'FEED' ? 'Balance from the bank' : 'Tap to set the current balance'}
                onClick={() => a.mode !== 'FEED' && setEdit({ id: a.id, value: a.balance !== null ? String(a.balance) : '' })}>
                {a.balance === null ? <span className="mn-muted">{a.mode === 'FEED' ? 'waiting for SePay' : 'set balance'}</span> : money(a.balance, a.currency)}
                {a.currency !== 'VND' && a.balanceVnd !== null && <small>≈ {vnd(a.balanceVnd)}</small>}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mn-error">{error}</p>}
    </div>
  );
}
