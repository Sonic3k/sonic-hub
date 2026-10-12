/* One transaction, fixed in place: category (or a move between own accounts), amount, account, day, note.
   A bottom sheet on the phone, a centred card on a wide screen. */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { moneyApi, type Txn, type TxnEdit } from '../../api/money';
import { money, utc } from '../../lib/money';
import { useCategories, useRefresh, useSummary } from './data';

const toInput = (s: string) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(utc(s));
  const g = (t: string) => p.find(x => x.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
};

export default function EditSheet({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const categories = useCategories(), summary = useSummary(), refresh = useRefresh();
  const [categoryId, setCategoryId] = useState<string | null>(txn.kind === 'TRANSFER' ? null : txn.categoryId);
  const [transferTo, setTransferTo] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(Math.abs(txn.amount)));
  const [accountId, setAccountId] = useState(txn.accountId);
  const [when, setWhen] = useState(toInput(txn.occurredAt));
  const [description, setDescription] = useState(txn.description ?? '');
  const [note, setNote] = useState(txn.note ?? '');
  const [remember, setRemember] = useState(txn.status === 'REVIEW' && !!txn.suggestedKeywords);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const sign = txn.amount < 0 ? -1 : 1;
  const kind = sign > 0 ? 'INCOME' : 'EXPENSE';
  const cats = (categories.data ?? []).filter(c => c.id === txn.categoryId || (!c.archived && !c.system && c.kind === kind));
  const accounts = (summary.data?.accounts ?? []).filter(a => !a.archived || a.id === txn.accountId);
  const editable = txn.source === 'NOTE' || txn.source === 'MANUAL';

  const run = async (f: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await f(); refresh(); onClose(); } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const save = () => run(() => {
    const b: TxnEdit = { description, note };
    const n = Number(amount.replace(/[^\d.]/g, ''));
    if (editable && n && n !== Math.abs(txn.amount)) b.amount = sign * n;
    if (editable && accountId !== txn.accountId) b.accountId = accountId;
    if (when !== toInput(txn.occurredAt)) b.occurredAt = `${when}:00+07:00`;
    if (transferTo) { b.kind = 'TRANSFER'; b.transferAccountId = transferTo; }
    else if (categoryId && (categoryId !== txn.categoryId || txn.status === 'REVIEW' || txn.kind === 'TRANSFER')) {
      b.categoryId = categoryId;
      if (remember && txn.suggestedKeywords) b.learnKeywords = txn.suggestedKeywords;
    }
    return moneyApi.update(txn.id, b);
  });

  // Rendered into <body> so the overlay covers the whole screen (see the toast in QuickNote).
  return createPortal(
    <div className="mn-sheet-wrap" onClick={onClose}>
      <div className="mn-sheet" role="dialog" aria-modal="true" aria-label="Sửa giao dịch" onClick={e => e.stopPropagation()}>
        <div className="mn-sheet-head">
          <div>
            <b>{txn.description || txn.bankDescription || 'Giao dịch'}</b>
            <small>{txn.accountName} · {txn.source === 'SEPAY' ? 'từ ngân hàng' : txn.source === 'NOTE' ? 'ghi tay' : txn.source === 'RECONCILE' ? 'chốt số dư' : txn.source.toLowerCase()}</small>
          </div>
          <span className={`mn-amt ${txn.amount > 0 ? 'in' : ''}`}>{money(txn.amount, txn.currency, true)}</span>
        </div>
        {txn.bankDescription && txn.description && <p className="mn-sub">{txn.bankDescription}</p>}

        <p className="mn-label">Hạng mục</p>
        <div className="mn-pick flat">
          {cats.map(c => (
            <button key={c.id} type="button" className={`mn-pick-i ${categoryId === c.id && !transferTo ? 'on' : ''}`} onClick={() => { setCategoryId(c.id); setTransferTo(null); }}>
              <span>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>
        <p className="mn-label">Hoặc là chuyển giữa ví của mình</p>
        <div className="mn-pick flat">
          {accounts.filter(a => a.id !== accountId).map(a => (
            <button key={a.id} type="button" className={`mn-pick-i ${transferTo === a.id || (!transferTo && !categoryId && txn.transferAccountName === a.name) ? 'on' : ''}`}
              onClick={() => { setTransferTo(a.id); setCategoryId(null); }}>
              <i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{sign < 0 ? '→' : '←'} {a.name}
            </button>
          ))}
        </div>
        {txn.status === 'REVIEW' && txn.suggestedKeywords && !transferTo && (
          <label className="mn-remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Nhớ: lần sau “{txn.suggestedKeywords}” là hạng mục này</label>
        )}

        <div className="mn-form">
          <label>Số tiền<input inputMode="decimal" value={amount} disabled={!editable} onChange={e => setAmount(e.target.value)} /></label>
          <label>Tài khoản<select value={accountId} disabled={!editable} onChange={e => setAccountId(e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
          <label>Lúc<input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /></label>
          <label>Nội dung<input value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label className="wide">Ghi chú<input value={note} onChange={e => setNote(e.target.value)} placeholder="đi với ai, vì sao…" /></label>
        </div>
        {!editable && <p className="mn-sub">Số tiền và tài khoản của giao dịch từ ngân hàng giữ nguyên như ngân hàng báo.</p>}
        {error && <p className="mn-error">{error}</p>}
        <div className="mn-sheet-foot">
          <button type="button" className="mn-link danger" disabled={busy} onClick={() => { if (confirm('Xoá giao dịch này?')) run(() => moneyApi.remove(txn.id)); }}>Xoá</button>
          <span />
          <button type="button" className="mn-link" onClick={onClose}>Huỷ</button>
          <button type="button" className="mn-btn" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
