/* "Cần xem lại": what no rule knew. Lines whose counterparty is known (the bank statement says who) come grouped
   by it — one decision covers all of that person's or shop's lines, old and new, and can rename them ("Tiền nhà").
   The few without a counterparty are decided one by one; that choice is remembered by its words. */
import { useState } from 'react';
import { moneyApi, type CounterpartyGroup, type MoneyCategory, type Txn } from '../../api/money';
import { dayLabel, money, short, timeOf } from '../../lib/money';
import { useCategories, useCounterparties, useRefresh, useReview, useSummary } from './data';

type Row = { g: CounterpartyGroup } | { t: Txn };

export default function Review() {
  const review = useReview(), groups = useCounterparties(), categories = useCategories(), summary = useSummary(), refresh = useRefresh();
  const [open, setOpen] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);
  const items = review.data ?? [];
  const gs = groups.data ?? [];
  const singles = items.filter(t => !t.counterparty);
  if (!items.length) return null;

  const rows: Row[] = [...gs.map(g => ({ g })), ...singles.map(t => ({ t }))];
  const shown = all ? rows : rows.slice(0, 6);
  const guessed = items.filter(t => t.categoryId).length;
  const live = (summary.data?.accounts ?? []).filter(a => !a.archived);
  const cats = (kind: 'EXPENSE' | 'INCOME') => (categories.data ?? []).filter((c: MoneyCategory) => !c.archived && !c.system && c.kind === kind);

  const act = async (key: string, f: () => Promise<unknown>) => {
    setBusy(key); setError('');
    try { await f(); setOpen(null); setLabel(''); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const toggle = (key: string) => { setOpen(open === key ? null : key); setLabel(''); };

  /* everyone with this name */
  const assign = (g: CounterpartyGroup, target: { categoryId?: string; transferAccountId?: string }) =>
    act(g.key, () => moneyApi.assign({ name: g.name, ...target, label: label.trim() || undefined }));
  /* one line, its words remembered */
  const pick = (t: Txn, c: MoneyCategory) => act(t.id, () => moneyApi.update(t.id, {
    categoryId: c.id, learnKeywords: remember && t.suggestedKeywords ? t.suggestedKeywords : undefined,
  }));
  const moveTo = (t: Txn, accountId: string) => act(t.id, () => moneyApi.update(t.id, { kind: 'TRANSFER', transferAccountId: accountId }));

  const labelInput = (
    <input className="mn-pick-label" value={label} maxLength={80} onChange={e => setLabel(e.target.value)}
      placeholder="Đặt tên (không bắt buộc), vd: Tiền nhà" />
  );

  return (
    <div className="card mn-review">
      <div className="mn-head">
        <h2>Cần xem lại <small>{items.length}</small></h2>
        {guessed > 0 && <button type="button" className="mn-btn" onClick={() => act('all', moneyApi.confirmAll)} disabled={busy !== null}>Đúng hết ({guessed})</button>}
      </div>
      {gs.length > 0 && (
        <p className="mn-rv-hint">
          {gs.length} người hoặc nơi nhận{singles.length ? ` · ${singles.length} giao dịch lẻ` : ''}. Chọn một lần cho mỗi người —
          áp cho mọi giao dịch với họ, cả cũ lẫn sau này.
        </p>
      )}
      {error && <p className="mn-error">{error}</p>}
      <ul className="mn-rv-list">
        {shown.map(row => {
          if ('g' in row) {
            const g = row.g;
            const kind = g.outCount > 0 ? 'EXPENSE' : 'INCOME';
            const amount = g.outCount && g.inCount ? `−${short(g.totalOut)} · +${short(g.totalIn)}` : g.outCount ? `−${short(g.totalOut)}` : `+${short(g.totalIn)}`;
            return (
              <li key={g.key} className={busy === g.key ? 'busy' : ''}>
                <div className="mn-rv">
                  <div className="mn-rv-main">
                    <b><span className="mn-rv-who">{g.outCount ? '→' : '←'}</span>{g.name}</b>
                    <small>
                      {g.waiting} giao dịch chờ{g.count > g.waiting ? ` (của ${g.count})` : ''} · gần nhất {dayLabel(g.lastAt)}
                      {g.sample ? ` · ${g.sample}` : ''}
                    </small>
                  </div>
                  <span className={`mn-amt ${g.outCount ? '' : 'in'}`}>{amount}</span>
                </div>
                <div className="mn-rv-act">
                  {g.guessCategoryId && g.guessCategoryName && (
                    <button type="button" className="mn-chip guess" title="Đúng rồi — cho mọi giao dịch với người này"
                      onClick={() => assign(g, { categoryId: g.guessCategoryId! })}>
                      {g.guessCategoryIcon} {g.guessCategoryName}?<span className="mn-check">✓</span>
                    </button>
                  )}
                  <button type="button" className={`mn-chip ${open === g.key ? 'on' : ''}`} onClick={() => toggle(g.key)}>
                    {g.guessCategoryId ? 'Khác' : 'Chọn hạng mục'}
                  </button>
                </div>
                {open === g.key && (
                  <div className="mn-pick">
                    {labelInput}
                    {cats(kind).map(c => (
                      <button key={c.id} type="button" className="mn-pick-i" onClick={() => assign(g, { categoryId: c.id })}><span>{c.icon}</span>{c.name}</button>
                    ))}
                    {live.some(a => !g.ownAccountIds.includes(a.id)) && <span className="mn-pick-sep">Hoặc là chuyển giữa ví của mình:</span>}
                    {live.filter(a => !g.ownAccountIds.includes(a.id)).map(a => (
                      <button key={a.id} type="button" className="mn-pick-i" onClick={() => assign(g, { transferAccountId: a.id })}>
                        <i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{g.outCount ? '→' : '←'} {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          }
          const t = row.t;
          const kind = t.amount > 0 ? 'INCOME' : 'EXPENSE';
          const others = live.filter(a => a.id !== t.accountId);
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
                <button type="button" className={`mn-chip ${open === t.id ? 'on' : ''}`} onClick={() => toggle(t.id)}>
                  {t.categoryId ? 'Khác' : 'Chọn hạng mục'}
                </button>
              </div>
              {open === t.id && (
                <div className="mn-pick">
                  {t.suggestedKeywords && (
                    <label className="mn-remember mn-pick-wide"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                      Nhớ: lần sau “{t.suggestedKeywords}” là hạng mục được chọn</label>
                  )}
                  {cats(kind).map(c => <button key={c.id} type="button" className="mn-pick-i" onClick={() => pick(t, c)}><span>{c.icon}</span>{c.name}</button>)}
                  {others.length > 0 && <span className="mn-pick-sep">Hoặc là chuyển giữa ví của mình:</span>}
                  {others.map(a => <button key={a.id} type="button" className="mn-pick-i" onClick={() => moveTo(t, a.id)}><i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{t.amount < 0 ? '→' : '←'} {a.name}</button>)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > shown.length && <button type="button" className="mn-more" onClick={() => setAll(true)}>Xem tất cả ({rows.length})</button>}
    </div>
  );
}
