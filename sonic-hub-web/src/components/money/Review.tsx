/* "Cần xem lại": what no rule knew. The guess (AI or a rule) is one tap; another category is two, and it is
   remembered for next time unless that box is unticked. */
import { useState } from 'react';
import { moneyApi, type MoneyCategory, type Txn } from '../../api/money';
import { dayLabel, money, timeOf } from '../../lib/money';
import { useCategories, useRefresh, useReview, useSummary } from './data';

export default function Review() {
  const review = useReview(), categories = useCategories(), summary = useSummary(), refresh = useRefresh();
  const [open, setOpen] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);
  const items = review.data ?? [];
  const shown = all ? items : items.slice(0, 5);
  if (!items.length) return null;

  const act = async (id: string, f: () => Promise<unknown>) => {
    setBusy(id); setError('');
    try { await f(); setOpen(null); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const pick = (t: Txn, c: MoneyCategory) => act(t.id, () => moneyApi.update(t.id, {
    categoryId: c.id, learnKeywords: remember && t.suggestedKeywords ? t.suggestedKeywords : undefined,
  }));
  const moveTo = (t: Txn, accountId: string) => act(t.id, () => moneyApi.update(t.id, { kind: 'TRANSFER', transferAccountId: accountId }));
  const guessed = items.filter(t => t.categoryId).length;

  return (
    <div className="card mn-review">
      <div className="mn-head">
        <h2>Cần xem lại <small>{items.length}</small></h2>
        <label className="mn-remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Nhớ cho lần sau</label>
        {guessed > 0 && <button type="button" className="mn-btn" onClick={() => act('all', moneyApi.confirmAll)} disabled={busy !== null}>Đúng hết ({guessed})</button>}
      </div>
      {error && <p className="mn-error">{error}</p>}
      <ul className="mn-rv-list">
        {shown.map(t => {
          const kind = t.amount > 0 ? 'INCOME' : 'EXPENSE';
          const cats = (categories.data ?? []).filter(c => !c.archived && !c.system && c.kind === kind);
          const others = (summary.data?.accounts ?? []).filter(a => !a.archived && a.id !== t.accountId);
          return (
            <li key={t.id} className={busy === t.id ? 'busy' : ''}>
              <div className="mn-rv">
                <div className="mn-rv-main">
                  <b>{t.description || t.bankDescription || 'Không có nội dung'}</b>
                  <small>{t.accountName} · {dayLabel(t.occurredAt)} {timeOf(t.occurredAt)}{t.bankDescription && t.description ? ` · ${t.bankDescription}` : ''}</small>
                </div>
                <span className={`mn-amt ${t.amount > 0 ? 'in' : ''}`}>{money(t.amount, t.currency, true)}</span>
              </div>
              <div className="mn-rv-act">
                {t.categoryId ? (
                  <button type="button" className="mn-chip guess" onClick={() => act(t.id, () => moneyApi.confirm(t.id))} title="Đúng rồi">
                    {t.categoryIcon} {t.categoryName}{t.categorizedBy === 'AI' ? '?' : ''}<span className="mn-check">✓</span>
                  </button>
                ) : <span className="mn-muted">Chưa đoán được</span>}
                <button type="button" className={`mn-chip ${open === t.id ? 'on' : ''}`} onClick={() => setOpen(open === t.id ? null : t.id)}>
                  {t.categoryId ? 'Khác' : 'Chọn hạng mục'}
                </button>
              </div>
              {open === t.id && (
                <div className="mn-pick">
                  {cats.map(c => <button key={c.id} type="button" className="mn-pick-i" onClick={() => pick(t, c)}><span>{c.icon}</span>{c.name}</button>)}
                  {others.length > 0 && <span className="mn-pick-sep">Chuyển giữa ví của mình:</span>}
                  {others.map(a => <button key={a.id} type="button" className="mn-pick-i" onClick={() => moveTo(t, a.id)}><i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{t.amount < 0 ? '→' : '←'} {a.name}</button>)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > shown.length && <button type="button" className="mn-more" onClick={() => setAll(true)}>Xem tất cả {items.length}</button>}
    </div>
  );
}
