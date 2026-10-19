/* The month's transactions by day; tap one to fix it. */
import { useMemo, useState } from 'react';
import type { Txn } from '../../api/money';
import { dayLabel, dayOf, money, monthName, timeOf, utc, vnd } from '../../lib/money';
import { useCategories, useTxns } from './data';
import EditSheet from './EditSheet';

export default function TxnList({ month, category, onClearCategory }: { month: string; category: string | null; onClearCategory: () => void }) {
  const [size, setSize] = useState(100);
  const [editing, setEditing] = useState<Txn | null>(null);
  const txns = useTxns(month, size), categories = useCategories();
  /* a transfer shows once: the other account's side is bookkeeping, already named on this row */
  const all = (txns.data?.content ?? []).filter(t => t.source !== 'SYSTEM');
  const cat = category ? (categories.data ?? []).find(c => c.id === category) : null;
  const rows = category ? all.filter(t => t.categoryId === category) : all;

  const days = useMemo(() => {
    const out: { day: string; label: string; items: Txn[]; out: number }[] = [];
    for (const t of rows) {
      const d = dayOf(utc(t.occurredAt));
      let g = out[out.length - 1];
      if (!g || g.day !== d) { g = { day: d, label: dayLabel(t.occurredAt), items: [], out: 0 }; out.push(g); }
      g.items.push(t);
      if (t.kind === 'EXPENSE' && t.amountVnd !== null) g.out -= t.amountVnd;
    }
    return out;
  }, [rows]);

  return (
    <div className="card mn-list">
      <div className="mn-head">
        <h2>Giao dịch {monthName(month).toLowerCase()}</h2>
        {cat && <button type="button" className="mn-chip on" onClick={onClearCategory}>{cat.icon} {cat.name} ✕</button>}
        <span className="mn-muted">{txns.data ? `${rows.length}${!category && txns.data.totalElements > all.length ? ` / ${txns.data.totalElements}` : ''} giao dịch` : ''}</span>
      </div>
      {!rows.length ? <p className="mn-empty">{txns.isLoading ? 'Đang tải…' : 'Chưa có giao dịch nào.'}</p> : days.map(g => (
        <section key={g.day} className="mn-day">
          <h3><span>{g.label}</span>{g.out > 0 && <small>chi {vnd(g.out)}</small>}</h3>
          <ul>
            {g.items.map(t => (
              <li key={t.id}>
                <button type="button" className={`mn-tx ${t.status === 'REVIEW' ? 'review' : ''}`} onClick={() => setEditing(t)}>
                  <span className="mn-ic big">{t.kind === 'TRANSFER' ? '⇄' : t.categoryIcon ?? '❔'}</span>
                  <span className="mn-tx-main">
                    <b>{t.description || t.bankDescription || '—'}</b>
                    <small>
                      <i className="mn-dot" style={{ background: 'var(--ink3)' }} />{t.accountName}
                      {t.counterparty && t.kind !== 'TRANSFER' && <>{' · '}{t.amount < 0 ? '→' : '←'} {t.counterparty}</>}
                      {' · '}{t.kind === 'TRANSFER' ? `chuyển ${t.amount < 0 ? 'sang' : 'từ'} ${t.transferAccountName ?? 'ví khác'}` : t.categoryName ?? 'chưa phân loại'}
                      {t.status === 'REVIEW' && ' · chờ xem'}
                      {' · '}{timeOf(t.occurredAt)}
                      {t.note && <em> · “{t.note}”</em>}
                    </small>
                  </span>
                  <span className={`mn-amt ${t.kind === 'TRANSFER' ? 'tr' : t.amount > 0 ? 'in' : ''}`}>{money(t.amount, t.currency, true)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!category && txns.data && txns.data.totalElements > all.length && (
        <button type="button" className="mn-more" onClick={() => setSize(s => s + 100)}>Xem thêm</button>
      )}
      {editing && <EditSheet txn={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
