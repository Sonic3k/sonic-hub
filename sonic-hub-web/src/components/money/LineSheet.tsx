/* One transaction: its labels section by section (or a move between own accounts) and, when the bank says who it was
   with, the same for every transaction with them, past and future. Nothing is saved until the button, and the button
   says how many transactions will change. */
import { useRef, useState } from 'react';
import { moneyApi, type Txn, type TxnEdit } from '../../api/money';
import { dayWord, money, timeOf, utc } from '../../lib/money';
import { useCounterpartyLines, useRefresh, useSummary } from './data';
import { decided, dirOf, guessOf, labelsOf, sameSet, systemMove, txs, useLabelBook } from './labels';
import { LabelText, ModeSeg, Sections, Wallets } from './Picker';
import { Sheet, SheetFoot } from './Sheet';
import { toast } from './toast';

const SOURCE: Record<string, string> = {
  SEPAY: 'from the bank', EMAIL: 'from the bank', STATEMENT: 'from a statement', NOTE: 'manual entry', MANUAL: 'manual entry', RECONCILE: 'balance check',
};

const toInput = (s: string) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(utc(s));
  const g = (x: string) => p.find(y => y.type === x)!.value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
};

export default function LineSheet({ txn: t, onClose }: { txn: Txn; onClose: () => void }) {
  const book = useLabelBook(), summary = useSummary(), refresh = useRefresh();
  const dir = dirOf(t), cp = t.counterparty, words = cp ? null : t.suggestedKeywords;
  const cpLines = useCounterpartyLines(cp);
  const accounts = (summary.data?.accounts ?? []).filter(a => !a.archived || a.id === t.accountId);
  const currentWallet = t.kind === 'TRANSFER' ? t.transferAccountId ?? accounts.find(a => a.name === t.transferAccountName)?.id ?? null : null;
  const waiting = !decided(t);
  const start = useRef<{ labels: Set<string>; sel: Set<string>; fromGuess: boolean } | null>(null);
  if (!start.current) {
    const labels = book.normalize(labelsOf(t)), guess = guessOf(t), fromGuess = waiting && guess.size > 0;
    start.current = { labels, sel: book.normalize([...labels, ...(fromGuess ? guess : [])]), fromGuess };
  }
  const title0 = t.description || t.bankDescription || '';

  const [mode, setMode] = useState<'label' | 'transfer'>(t.kind === 'TRANSFER' ? 'transfer' : 'label');
  const [sel, setSel] = useState<Set<string>>(start.current.sel);
  const [fromGuess, setFromGuess] = useState(start.current.fromGuess);
  const [wallet, setWallet] = useState<string | null>(currentWallet);
  const [rule, setRule] = useState(waiting && (!!cp || !!words));
  const [flip, setFlip] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [title, setTitle] = useState(title0);
  const [note, setNote] = useState(t.note ?? '');
  const editable = t.source === 'NOTE' || t.source === 'MANUAL';
  const [amount, setAmount] = useState(String(Math.abs(t.amount)));
  const [accountId, setAccountId] = useState(t.accountId);
  const [when, setWhen] = useState(() => toInput(t.occurredAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [del, setDel] = useState(false);
  const delTimer = useRef<number>();

  const scope = cp && cpLines.data ? cpLines.data.filter(x => dirOf(x) === dir && !systemMove(x)).length : null;
  const chosen = book.sortIds(book.normalize(sel));
  const ruleOn = (id: string) => book.carries(id) !== flip.has(id);
  const carried = chosen.filter(ruleOn);
  const many = rule && cp && (mode === 'transfer' || carried.length > 0) ? Math.max(1, scope ?? 1) : 1;
  const off = [...new Set(chosen.filter(id => !book.carries(id)).map(id => book.sections.find(s => s.id === book.secOf(id))?.name).filter(Boolean))];
  const keep = new Set([...sel, ...book.effective(sel)]);
  const footNote = mode === 'transfer' ? (wallet ? 'Not counted as spending or income' : 'Pick an account')
    : chosen.some(book.isMain) ? '' : 'No category yet, so it stays in To review';

  const toggle = (id: string) => {
    setSel(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (book.effective(n).has(id)) book.descendants(id).forEach(x => n.delete(x));   // a lit parent goes off with its children
      else { n.add(id); return book.normalize(n); }
      return n;
    });
    setFromGuess(false);
  };
  const flipRule = (id: string) => setFlip(f => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async () => {
    if (busy || (mode === 'transfer' && !wallet)) return;
    const b: TxnEdit = {};
    if (title.trim() !== title0.trim()) b.description = title.trim();
    if (note.trim() !== (t.note ?? '').trim()) b.note = note.trim();
    if (editable) {
      const n = Number(amount.replace(/[^\d.]/g, ''));
      if (n && n !== Math.abs(t.amount)) b.amount = (t.amount < 0 ? -1 : 1) * n;
      if (accountId !== t.accountId) b.accountId = accountId;
      if (when !== toInput(t.occurredAt)) b.occurredAt = `${when}:00+07:00`;
    }
    if (mode === 'transfer') {
      if (t.kind !== 'TRANSFER' || wallet !== currentWallet) b.kind = 'TRANSFER';
      b.transferAccountId = wallet!;                                        // also what a rule from this line moves money to
    } else if (t.kind === 'TRANSFER' || waiting || !sameSet(new Set(chosen), start.current!.labels)) {
      b.tagIds = chosen;                                                    // this line: exactly what is chosen
    }
    if (rule && cp) {
      if (mode === 'transfer') b.learnCounterparty = true;
      else if (carried.length) { b.learnCounterparty = true; b.ruleTagIds = carried; }
      if (name.trim()) { b.label = name.trim(); delete b.description; }
    } else if (rule && words) {
      if (mode === 'transfer') b.learnKeywords = words;
      else if (carried.length) { b.learnKeywords = words; b.ruleTagIds = carried; }
    }
    setBusy(true); setError('');
    try {
      await moneyApi.update(t.id, b);
      refresh();
      toast(many > 1 ? `Saved for ${txs(many)}` : 'Saved');
      onClose();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const remove = async () => {
    if (!del) { setDel(true); window.clearTimeout(delTimer.current); delTimer.current = window.setTimeout(() => setDel(false), 4000); return; }
    setBusy(true); setError('');
    try { await moneyApi.remove(t.id); refresh(); toast('Deleted'); onClose(); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <Sheet label="Label a transaction" onClose={onClose}>
      <div className="mn-sheet-head">
        <div>
          <b>{title0 || 'Transaction'}</b>
          <small>
            {t.accountName} · {SOURCE[t.source] ?? t.source.toLowerCase()}{cp ? ` · ${dir === 'out' ? '→' : '←'} ${cp}` : ''} · {timeOf(t.occurredAt)} {dayWord(t.occurredAt)}
          </small>
        </div>
        <span className={`mn-amt${dir === 'in' ? ' in' : ''}`}>{money(t.amount, t.currency, true)}</span>
      </div>
      {t.bankDescription && t.bankDescription !== title0 && <p className="mn-sub">{t.bankDescription}</p>}

      <ModeSeg dir={dir} mode={mode} onMode={m => { setMode(m); setFromGuess(false); }} />
      {fromGuess && <p className="mn-guess-note">Filled in from a guess. Save if it’s right, or tap to change it.</p>}
      {mode === 'label'
        ? <Sections book={book} dirs={[dir]} keep={keep} newKind={dir === 'out' ? 'EXPENSE' : 'INCOME'}
            chips={{ mode: 'pick', sel, onToggle: toggle }}
            onCreated={id => { setSel(s => book.normalize(new Set(s).add(id))); setFromGuess(false); }} />
        : <Wallets accounts={accounts.filter(a => !a.archived && a.id !== t.accountId)} dir={dir} value={wallet} onPick={id => { setWallet(id); setFromGuess(false); }} />}

      {(cp || words) && (
        <div className="mn-everyone">
          <label className="mn-remember">
            <input type="checkbox" checked={rule} onChange={e => setRule(e.target.checked)} />
            <span>{cp
              ? <>Apply to every transaction with <b>{cp}</b>{scope !== null ? ` (${scope})` : ''}, past and future</>
              : <>Remember: next time a transaction contains “{words}”, do the same</>}</span>
          </label>
          {rule && mode === 'label' && chosen.length > 0 && (
            <div className="mn-rule">
              <span className="mn-pick-cap">{cp ? `Labels that follow ${cp}` : 'Labels for next time'}</span>
              <div className="mn-pick flat">
                {chosen.map(id => {
                  const on = ruleOn(id), c = book.label(id);
                  return c && (
                    <button key={id} type="button" className={`mn-pick-i sm${on ? ' on' : ''}`} aria-pressed={on} onClick={() => flipRule(id)}>
                      {on && <span className="ok" aria-hidden="true">✓</span>}<LabelText c={c} />
                    </button>
                  );
                })}
              </div>
              {off.length > 0 && <p className="mn-sub">{off.join(' and ')} labels usually fit only this one, so they don’t follow by default. Tap one to change that.</p>}
            </div>
          )}
          {rule && cp && (
            <input className="mn-pick-label" value={name} maxLength={80} onChange={e => setName(e.target.value)}
              placeholder="Name them (optional), e.g. Morning coffee" aria-label="Name them (optional)" />
          )}
        </div>
      )}

      <div className="mn-form">
        <label>Amount<input inputMode="decimal" value={editable ? amount : Math.abs(t.amount).toLocaleString('en-US')} disabled={!editable} onChange={e => setAmount(e.target.value)} /></label>
        <label>Account<select value={accountId} disabled={!editable} onChange={e => setAccountId(e.target.value)}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
        <label>Description<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label>
        <label>Note<input value={note} maxLength={120} onChange={e => setNote(e.target.value)} placeholder="who with, what for…" /></label>
        {editable && <label className="wide">When<input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /></label>}
      </div>
      {!editable && <p className="mn-sub">Amount and account stay as the bank reported them.</p>}
      <p className="mn-del"><button type="button" className="mn-link danger" disabled={busy} onClick={remove}>{del ? 'Tap again to delete it' : 'Delete transaction'}</button></p>
      {error && <p className="mn-error">{error}</p>}
      <SheetFoot note={footNote} label={many > 1 ? `Save for ${txs(many)}` : 'Save'} disabled={mode === 'transfer' && !wallet} busy={busy}
        onSave={save} onCancel={onClose} />
    </Sheet>
  );
}
