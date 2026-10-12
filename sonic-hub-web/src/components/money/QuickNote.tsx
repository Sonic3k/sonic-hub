/* "Ghi nhanh": one line, understood while typing, Enter writes it down. Recent notes come back as one-tap chips. */
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { moneyApi, type Chip, type MoneyCategory, type Txn } from '../../api/money';
import { dayOf, guess, money, noteTime, parseNote, short } from '../../lib/money';
import { useCategories, useChips, useRefresh, useRules, useSummary } from './data';

type Toast = { txn: Txn; text: string } | null;

export default function QuickNote() {
  const summary = useSummary(), categories = useCategories(), rules = useRules(), chips = useChips(), refresh = useRefresh();
  const [text, setText] = useState('');
  const [catOverride, setCatOverride] = useState<string | null>(null);
  const [accOverride, setAccOverride] = useState<string | null>(null);
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [picker, setPicker] = useState<'cat' | 'acc' | 'date' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();

  const accounts = summary.data?.accounts ?? [];
  const live = accounts.filter(a => !a.archived);
  const cash = live.find(a => a.mode === 'POOL') ?? live[0];
  const p = useMemo(() => parseNote(text, accounts), [text, accounts]);
  const sign = p.amount !== null && p.amount > 0 ? 1 : -1;
  const accountId = accOverride ?? p.accountId ?? cash?.id ?? null;
  const account = live.find(a => a.id === accountId);
  const date = dateOverride ?? p.date;
  const g = useMemo(() => guess(p.text, sign, rules.data ?? [], categories.data ?? [], live, accountId),
    [p.text, sign, rules.data, categories.data, live, accountId]);
  const chosen = catOverride ? (categories.data ?? []).find(c => c.id === catOverride) ?? null : g?.kind === 'category' ? g.category : null;
  const today = dayOf(new Date()), yesterday = dayOf(new Date(Date.now() - 86_400_000));

  const reset = () => { setText(''); setCatOverride(null); setAccOverride(null); setDateOverride(null); setPicker(null); setError(''); };

  const show = (txn: Txn, label: string) => {
    window.clearTimeout(timer.current);
    setToast({ txn, text: label });
    timer.current = window.setTimeout(() => setToast(null), 6000);
  };

  const save = async (b: { text: string; amount: number; accountId?: string | null; occurredAt?: string; categoryId?: string }, label: string) => {
    setBusy(true); setError('');
    try {
      const txn = await moneyApi.note(b);
      show(txn, label);
      refresh();
      return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (p.amount === null || busy) return;
    const transfer = !catOverride && g?.kind === 'transfer';
    const ok = await save({
      text: p.text, amount: p.amount, accountId, occurredAt: noteTime(date),
      categoryId: transfer ? undefined : chosen?.id,
    }, `${chosen ? `${chosen.icon ?? ''} ${chosen.name}` : transfer ? `↔ ${g.account.name}` : 'Đã ghi'} · ${money(p.amount, account?.currency, true)}`);
    if (ok) { reset(); input.current?.focus(); }
  };

  const tapChip = (c: Chip) => save({ text: c.text, amount: c.amount, accountId: c.accountId, categoryId: c.categoryId ?? undefined },
    `${c.categoryIcon ?? ''} ${c.text} · ${money(c.amount, undefined, true)}`);

  const undo = async () => {
    if (!toast) return;
    try { await moneyApi.remove(toast.txn.id); setToast(null); refresh(); } catch (e) { setError((e as Error).message); }
  };

  const kind = sign > 0 ? 'INCOME' : 'EXPENSE';
  const pickable = (categories.data ?? []).filter((c: MoneyCategory) => !c.archived && c.kind === kind && !c.system);

  return (
    <div className="card mn-quick">
      <label className="mn-label" htmlFor="mn-q">Ghi nhanh</label>
      <form className="mn-q-row" onSubmit={e => { e.preventDefault(); submit(); }}>
        <input id="mn-q" ref={input} className="mn-q-input" value={text} autoComplete="off" enterKeyHint="done"
          onChange={e => { setText(e.target.value); if (!e.target.value) reset(); }}
          placeholder="cafe 35k · grab 52k momo · hôm qua 200k quà" />
        <button className="mn-q-go" type="submit" disabled={p.amount === null || busy}>Ghi</button>
      </form>

      {p.amount !== null ? (
        <div className="mn-q-preview">
          <span className={`mn-q-amt ${sign > 0 ? 'in' : ''}`}>{money(p.amount, account?.currency, true)}</span>
          <button type="button" className={`mn-chip ${picker === 'cat' ? 'on' : ''}`} onClick={() => setPicker(picker === 'cat' ? null : 'cat')}>
            {chosen ? <>{chosen.icon} {chosen.name}</> : g?.kind === 'transfer' && !catOverride ? <>↔ {g.account.name}</> : <span className="mn-muted">Chọn hạng mục</span>}
          </button>
          <button type="button" className={`mn-chip ${picker === 'acc' ? 'on' : ''}`} onClick={() => setPicker(picker === 'acc' ? null : 'acc')}>
            <i className="mn-dot" style={{ background: account?.color ?? 'var(--ink3)' }} />{account?.name ?? 'Tài khoản'}
          </button>
          <button type="button" className={`mn-chip ${picker === 'date' ? 'on' : ''}`} onClick={() => setPicker(picker === 'date' ? null : 'date')}>
            {!date || date === today ? 'Hôm nay' : date === yesterday ? 'Hôm qua' : `${+date.slice(8)}/${+date.slice(5, 7)}`}
          </button>
        </div>
      ) : (
        <p className="mn-q-hint"><b>k</b> nghìn · <b>tr</b> triệu · thêm <b>momo</b>, <b>tm</b>, <b>tp</b>, <b>tcb</b> để chọn ví · <b>hôm qua</b>, <b>12/10</b> để lùi ngày · <b>+</b> là tiền vào</p>
      )}

      {picker === 'cat' && p.amount !== null && (
        <div className="mn-pick">
          {pickable.map(c => (
            <button key={c.id} type="button" className={`mn-pick-i ${chosen?.id === c.id ? 'on' : ''}`} onClick={() => { setCatOverride(c.id); setPicker(null); input.current?.focus(); }}>
              <span>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>
      )}
      {picker === 'acc' && p.amount !== null && (
        <div className="mn-pick">
          {live.map(a => (
            <button key={a.id} type="button" className={`mn-pick-i ${a.id === accountId ? 'on' : ''}`} onClick={() => { setAccOverride(a.id); setPicker(null); input.current?.focus(); }}>
              <i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{a.name}
            </button>
          ))}
        </div>
      )}
      {picker === 'date' && p.amount !== null && (
        <div className="mn-pick">
          <input type="date" className="mn-date" max={today} value={date ?? today}
            onChange={e => { setDateOverride(e.target.value || null); setPicker(null); input.current?.focus(); }} />
        </div>
      )}

      {error && <p className="mn-error">{error}</p>}

      {!!chips.data?.length && (
        <div className="mn-q-chips" aria-label="Ghi lại một chạm">
          {chips.data.map(c => (
            <button key={`${c.text}-${c.amount}-${c.accountId}`} type="button" className="mn-qc" disabled={busy} onClick={() => tapChip(c)}>
              {c.categoryIcon && <span>{c.categoryIcon}</span>}{c.text}<b>{short(c.amount)}</b>
            </button>
          ))}
        </div>
      )}

      {/* In <body>: the page's entrance animation leaves a transform on .page, which would trap a fixed element. */}
      {toast && createPortal(
        <div className="mn-toast" role="status">
          <span>Đã ghi · {toast.text}</span>
          <button type="button" onClick={undo}>Hoàn tác</button>
        </div>,
        document.body,
      )}
    </div>
  );
}
