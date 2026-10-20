/* One transaction, fixed in place: its tags facet by facet (or a move between own accounts), amount, account, day, note.
   A category is one tap by default; "＋ another category" lets a line count under two. The other facets take any number.
   A bottom sheet on the phone, a centred card on a wide screen. */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { moneyApi, type Txn, type TxnEdit } from '../../api/money';
import { money, utc } from '../../lib/money';
import { useCategories, useRefresh, useSummary } from './data';
import { FacetChips, tagText, useTagBook } from './tags';

const toInput = (s: string) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(utc(s));
  const g = (t: string) => p.find(x => x.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
};

const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));

export default function EditSheet({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const categories = useCategories(), summary = useSummary(), refresh = useRefresh(), book = useTagBook();
  /* the tags put on the line (implied ones follow by themselves) */
  /* tags is missing only while an older API is still being replaced */
  const tags = useMemo(() => txn.tags ?? (txn.categoryId ? [{ id: txn.categoryId, name: txn.categoryName ?? '', icon: txn.categoryIcon, facetId: null, main: true, by: txn.categorizedBy }] : []), [txn]);
  const initial = useMemo(() => new Set(txn.kind === 'TRANSFER' ? [] : tags.filter(x => x.by !== 'IMPLIED').map(x => x.id)), [txn, tags]);
  const [sel, setSel] = useState<Set<string>>(initial);
  const [multi, setMulti] = useState(() => tags.filter(x => x.main && x.by !== 'IMPLIED').length > 1);
  const [transferTo, setTransferTo] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(Math.abs(txn.amount)));
  const [accountId, setAccountId] = useState(txn.accountId);
  const [when, setWhen] = useState(toInput(txn.occurredAt));
  const [description, setDescription] = useState(txn.description ?? '');
  const [note, setNote] = useState(txn.note ?? '');
  const [remember, setRemember] = useState(txn.status === 'REVIEW' && !!txn.suggestedKeywords && !txn.counterparty);
  /* with a known counterparty the choice can cover all their lines, and give them a name */
  const [everyone, setEveryone] = useState(!!txn.counterparty && txn.status === 'REVIEW');
  const [ruleOff, setRuleOff] = useState<Set<string> | null>(null);   // tags left out of that rule (null: the default)
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const sign = txn.amount < 0 ? -1 : 1;
  const kind = sign > 0 ? 'INCOME' : 'EXPENSE';
  const cats = (categories.data ?? []).filter(c => c.kind !== 'ANY' && (sel.has(c.id) || (!c.archived && !c.system && c.kind === kind)));
  const accounts = (summary.data?.accounts ?? []).filter(a => !a.archived || a.id === txn.accountId);
  const editable = txn.source === 'NOTE' || txn.source === 'MANUAL';
  const implied = book.implied(sel);
  const mainSel = [...sel].filter(book.isMain);
  const decided = mainSel.length > 0 || [...implied.keys()].some(book.isMain);
  const moving = !!transferTo || (txn.kind === 'TRANSFER' && !decided);

  /* what "everyone with them" would give: the line's tags, without the ones about this one time unless picked */
  const ruleTags = [...sel].filter(id => (ruleOff ? !ruleOff.has(id) : !book.perTransaction(id)));
  const toggleRule = (id: string) => {
    const off = new Set(ruleOff ?? [...sel].filter(book.perTransaction));
    if (off.has(id)) off.delete(id); else off.add(id);
    setRuleOff(off);
  };

  const pickMain = (id: string) => {
    setTransferTo(null);
    setSel(s => {
      const n = new Set(s);
      if (multi) { if (n.has(id)) n.delete(id); else n.add(id); return n; }
      for (const x of s) if (book.isMain(x)) n.delete(x);
      n.add(id);
      return n;
    });
  };
  const toggle = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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
    const forAll = !!txn.counterparty && everyone;
    if (transferTo) { b.kind = 'TRANSFER'; b.transferAccountId = transferTo; }
    else if (txn.kind === 'TRANSFER') { if (decided) b.tagIds = [...sel]; }
    else if (!same(sel, initial) || (txn.status === 'REVIEW' && decided)) b.tagIds = [...sel];
    if (remember && txn.suggestedKeywords && !forAll && decided && !transferTo) { b.learnKeywords = txn.suggestedKeywords; b.ruleTagIds = ruleTags; }
    if (forAll && (decided || moving)) {
      b.learnCounterparty = true;
      if (!moving) b.ruleTagIds = ruleTags;
    }
    if (label.trim()) { b.label = label.trim(); delete b.description; }
    return moneyApi.update(txn.id, b);
  });

  const forAllTags = ruleTags.map(id => book.byId.get(id)).filter(Boolean);

  // Rendered into <body> so the overlay covers the whole screen (see the toast in QuickNote).
  return createPortal(
    <div className="mn-sheet-wrap" onClick={onClose}>
      <div className="mn-sheet" role="dialog" aria-modal="true" aria-label="Edit transaction" onClick={e => e.stopPropagation()}>
        <div className="mn-sheet-head">
          <div>
            <b>{txn.description || txn.bankDescription || 'Transaction'}</b>
            <small>
              {txn.accountName} · {txn.source === 'SEPAY' ? 'from the bank' : txn.source === 'STATEMENT' ? 'from a statement' : txn.source === 'NOTE' ? 'manual entry' : txn.source === 'RECONCILE' ? 'balance check' : txn.source.toLowerCase()}
              {txn.counterparty && <> · {sign < 0 ? '→' : '←'} {txn.counterparty}</>}
            </small>
          </div>
          <span className={`mn-amt ${txn.amount > 0 ? 'in' : ''}`}>{money(txn.amount, txn.currency, true)}</span>
        </div>
        {txn.bankDescription && txn.description && <p className="mn-sub">{txn.bankDescription}</p>}

        <div className="mn-facet-head">
          <p className="mn-label">Category</p>
          {!multi && mainSel.length > 0 && !transferTo && <button type="button" className="mn-link" onClick={() => setMulti(true)}>＋ another category</button>}
          {multi && <span className="mn-muted">pick several</span>}
        </div>
        <div className="mn-pick flat">
          {cats.map(c => {
            const on = !transferTo && sel.has(c.id), via = on || transferTo ? undefined : implied.get(c.id);
            return (
              <button key={c.id} type="button" className={`mn-pick-i ${on ? 'on' : via !== undefined ? 'implied' : ''}`}
                aria-pressed={on || via !== undefined} title={via !== undefined ? `Comes with ${via}` : undefined}
                onClick={() => { if (via === undefined) pickMain(c.id); }}>
                {tagText(c)}
              </button>
            );
          })}
        </div>
        {!moving && book.others.map(f => (
          <div key={f.id}>
            <p className="mn-label">{f.name}</p>
            <FacetChips facet={f} book={book} chosen={sel} implied={implied} onToggle={toggle}
              onCreated={id => setSel(s => new Set(s).add(id))} />
          </div>
        ))}

        <p className="mn-label">Or an internal transfer</p>
        <div className="mn-pick flat">
          {accounts.filter(a => a.id !== accountId).map(a => (
            <button key={a.id} type="button" className={`mn-pick-i ${transferTo === a.id || (!transferTo && !decided && txn.transferAccountName === a.name) ? 'on' : ''}`}
              onClick={() => setTransferTo(a.id)}>
              <i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{sign < 0 ? '→' : '←'} {a.name}
            </button>
          ))}
        </div>

        {txn.counterparty ? (
          <div className="mn-everyone">
            <label className="mn-remember"><input type="checkbox" checked={everyone} onChange={e => setEveryone(e.target.checked)} />
              <span>Apply to every transaction with <b>{txn.counterparty}</b>, past and future</span></label>
            {everyone && !moving && sel.size > 0 && (
              <div className="mn-pick flat mn-rule-tags" aria-label="Labels applied to every transaction">
                {[...sel].map(id => book.byId.get(id)).filter(c => !!c).map(c => (
                  <button key={c!.id} type="button" className={`mn-pick-i ${ruleTags.includes(c!.id) ? 'on' : ''}`}
                    disabled={book.isMain(c!.id)} onClick={() => toggleRule(c!.id)}
                    title={book.isMain(c!.id) ? 'The category always goes along' : ruleTags.includes(c!.id) ? 'Leave out: only for this one' : 'Apply this label too'}>
                    {tagText(c!)}
                  </button>
                ))}
              </div>
            )}
            <input className="mn-pick-label" value={label} maxLength={80} onChange={e => setLabel(e.target.value)}
              placeholder="Name (optional), e.g. Rent" />
          </div>
        ) : txn.status === 'REVIEW' && txn.suggestedKeywords && !transferTo && (
          <label className="mn-remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span>Remember: next time “{txn.suggestedKeywords}” is {forAllTags.length ? forAllTags.map(c => c!.name).join(' + ') : 'the same as this one'}</span></label>
        )}

        <div className="mn-form">
          <label>Amount<input inputMode="decimal" value={amount} disabled={!editable} onChange={e => setAmount(e.target.value)} /></label>
          <label>Account<select value={accountId} disabled={!editable} onChange={e => setAccountId(e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
          <label>When<input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /></label>
          <label>Description<input value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label className="wide">Note<input value={note} onChange={e => setNote(e.target.value)} placeholder="who with, what for…" /></label>
        </div>
        {!editable && <p className="mn-sub">Amount and account stay as the bank reported them.</p>}
        {error && <p className="mn-error">{error}</p>}
        <div className="mn-sheet-foot">
          <button type="button" className="mn-link danger" disabled={busy} onClick={() => { if (confirm('Delete this transaction?')) run(() => moneyApi.remove(txn.id)); }}>Delete</button>
          <span />
          <button type="button" className="mn-link" onClick={onClose}>Cancel</button>
          <button type="button" className="mn-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
