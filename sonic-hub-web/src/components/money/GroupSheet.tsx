/* Everyone with one name the bank gave: one choice for all their transactions, future ones too. In each section where
   a label is picked it replaces their old labels; sections left alone keep theirs. */
import { useState } from 'react';
import { moneyApi, type CounterpartyGroup, type Txn } from '../../api/money';
import { dayOf, dayShort, money, timeOf, utc } from '../../lib/money';
import { useCounterpartyLines, useRefresh, useSummary } from './data';
import { decided, dirOf, labelsOf, systemMove, txs, useLabelBook, type Dir } from './labels';
import { ModeSeg, Pill, Sections, Wallets } from './Picker';
import { Sheet, SheetFoot } from './Sheet';
import { toast } from './toast';

const FEW = 5;

export default function GroupSheet({ group: g, onClose }: { group: CounterpartyGroup; onClose: () => void }) {
  const book = useLabelBook(), summary = useSummary(), refresh = useRefresh();
  const lines = useCounterpartyLines(g.name);
  const dir: Dir = (g.direction ?? (g.outCount ? 'OUT' : 'IN')) === 'OUT' ? 'out' : 'in';
  const covered = (lines.data ?? []).filter(x => dirOf(x) === dir && !systemMove(x));
  const n = lines.data ? covered.length : g.scope ?? g.count;
  const total = lines.data ? covered.reduce((s, x) => s + x.amount, 0) : g.waitingAmount ?? 0;
  const guess = g.guessCategoryId && book.label(g.guessCategoryId) ? g.guessCategoryId : null;

  const [mode, setMode] = useState<'label' | 'transfer'>('label');
  const [sel, setSel] = useState<Set<string>>(() => new Set(guess ? [guess] : []));
  const [fromGuess, setFromGuess] = useState(!!guess);
  const [wallet, setWallet] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosen = book.sortIds(book.normalize(sel));
  const own = new Set([...(g.ownAccountIds ?? []), ...covered.map(x => x.accountId)]);
  const wallets = (summary.data?.accounts ?? []).filter(a => !a.archived && !own.has(a.id));
  const keep = new Set([...sel, ...book.effective(sel)]);
  const footNote = mode === 'transfer' ? (wallet ? 'Not counted as spending or income' : 'Pick an account')
    : chosen.some(book.isMain) ? '' : chosen.length ? 'No category yet, so they stay in To review' : 'Pick at least one label';

  const toggle = (id: string) => {
    setSel(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (book.effective(next).has(id)) book.descendants(id).forEach(x => next.delete(x));
      else { next.add(id); return book.normalize(next); }
      return next;
    });
    setFromGuess(false);
  };

  const save = async () => {
    if (busy || (mode === 'transfer' ? !wallet : !chosen.length)) return;
    setBusy(true); setError('');
    try {
      await moneyApi.assign({
        name: g.name, direction: dir === 'out' ? 'OUT' : 'IN', label: name.trim() || undefined,
        ...(mode === 'transfer' ? { transferAccountId: wallet! } : { tagIds: chosen }),
      });
      refresh();
      toast(`Applied to ${txs(n)} with ${g.name}`);
      onClose();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const now = (x: Txn) => x.kind === 'TRANSFER'
    ? <span className="mn-tag">⇄ {dirOf(x) === 'out' ? 'to' : 'from'} {x.transferAccountName ?? 'another account'}</span>
    : <>{book.sortIds(book.normalize(labelsOf(x))).map(id => <Pill key={id} book={book} id={id} />)}{!decided(x) && <span className="mn-wait">to review</span>}</>;
  const shown = all ? covered : covered.slice(0, FEW);

  return (
    <Sheet label={`Label every transaction with ${g.name}`} onClose={onClose}>
      <div className="mn-sheet-head">
        <div>
          <b><span className="mn-rv-who">{dir === 'out' ? '→' : '←'}</span>{g.name}</b>
          <small>{txs(n)} · one choice for all of them, future ones too</small>
        </div>
        <span className={`mn-amt${total > 0 ? ' in' : ''}`}>{money(total, 'VND', true)}</span>
      </div>
      {!lines.data ? <p className="mn-sub">{lines.isError ? 'Their transactions couldn’t be loaded.' : 'Loading their transactions…'}</p> : (
        <>
          <ul className="mn-mini">
            {shown.map(x => (
              <li key={x.id}>
                <span>{dayShort(dayOf(utc(x.occurredAt)))} {timeOf(x.occurredAt)}</span>
                <span className="mn-mini-t"><span>{x.description || x.bankDescription || '—'}</span>{now(x)}</span>
                <b>{money(x.amount, x.currency, true)}</b>
              </li>
            ))}
          </ul>
          {covered.length > shown.length && <button type="button" className="mn-link mn-mini-more" onClick={() => setAll(true)}>Show all {covered.length}</button>}
        </>
      )}

      <ModeSeg dir={dir} mode={mode} onMode={m => { setMode(m); setFromGuess(false); }} />
      {fromGuess && <p className="mn-guess-note">Filled in from a guess. Apply if it’s right, or tap to change it.</p>}
      {mode === 'label'
        ? <Sections book={book} dirs={[dir]} keep={keep} newKind={dir === 'out' ? 'EXPENSE' : 'INCOME'}
            chips={{ mode: 'pick', sel, onToggle: toggle }}
            onCreated={id => { setSel(s => book.normalize(new Set(s).add(id))); setFromGuess(false); }} />
        : <Wallets accounts={wallets} dir={dir} value={wallet} onPick={id => { setWallet(id); setFromGuess(false); }} />}
      {mode === 'label' && covered.some(x => labelsOf(x).size > 0 || x.kind === 'TRANSFER') && (
        <p className="mn-sub">In each section where you pick a label, it replaces the old labels on all {txs(n)}. Sections you leave alone keep their labels.</p>
      )}
      <div className="mn-everyone">
        <input className="mn-pick-label" value={name} maxLength={80} onChange={e => setName(e.target.value)}
          placeholder="Name them (optional), e.g. Bubble tea" aria-label="Name them (optional)" />
      </div>
      {error && <p className="mn-error">{error}</p>}
      <SheetFoot note={footNote} label={`Apply to ${txs(n)}`} busy={busy} onSave={save} onCancel={onClose}
        disabled={mode === 'transfer' ? !wallet : !chosen.length} />
    </Sheet>
  );
}
