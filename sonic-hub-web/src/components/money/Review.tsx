/* To review: what no rule knew. Lines whose counterparty the bank named come grouped by it — one decision covers all
   their transactions, past and future; the few without one are decided one by one. A guess (the most common label of
   a payee, or the AI's for a line) is one tap to accept; "Change" or "Add labels" opens the same sheet as everywhere. */
import { useState } from 'react';
import { moneyApi, type CounterpartyGroup, type Txn } from '../../api/money';
import { dayWord, money, timeOf } from '../../lib/money';
import { useCounterparties, useRefresh, useReview } from './data';
import GroupSheet from './GroupSheet';
import { guessOf, txs, useLabelBook } from './labels';
import LineSheet from './LineSheet';
import { Pill } from './Picker';
import { toast } from './toast';

type Row = { g: CounterpartyGroup } | { t: Txn };

export default function Review() {
  const review = useReview(), groups = useCounterparties(), refresh = useRefresh(), book = useLabelBook();
  const [sheet, setSheet] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);
  if (!review.data) return null;
  const items = review.data;
  if (!items.length) {
    return (
      <div className="card mn-review">
        <div className="mn-head"><h2>To review</h2></div>
        <p className="mn-empty">Nothing to review. Every transaction has a category or is an internal transfer.</p>
      </div>
    );
  }

  const gs = groups.data ?? [];
  const singles = items.filter(t => !t.counterparty);
  const rows: Row[] = [...gs.map(g => ({ g })), ...singles.map(t => ({ t }))];
  const shown = all ? rows : rows.slice(0, 6);
  const guessed = items.filter(t => guessOf(t).size > 0).length;
  const parts = [gs.length ? `${gs.length} payee${gs.length === 1 ? '' : 's'}` : '', singles.length ? `${singles.length} single transaction${singles.length === 1 ? '' : 's'}` : '']
    .filter(Boolean).join(' · ');

  const act = async (key: string, f: () => Promise<unknown>, done: string | ((r: unknown) => string)) => {
    setBusy(key); setError('');
    try { const r = await f(); refresh(); toast(typeof done === 'string' ? done : done(r)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const open = (r: Row) => { if (book.ready) setSheet(r); };

  return (
    <div className="card mn-review">
      <div className="mn-head">
        <h2>To review <small>{items.length}</small></h2>
        {guessed > 0 && (
          <button type="button" className="mn-btn" disabled={busy !== null}
            onClick={() => act('all', moneyApi.confirmAll, r => { const n = (r as { updated: number }).updated; return `Accepted ${n} guess${n === 1 ? '' : 'es'}`; })}>
            Accept all guesses ({guessed})
          </button>
        )}
      </div>
      <p className="mn-rv-hint">{parts}. Decide once per payee and it applies to all their transactions.</p>
      {error && <p className="mn-error">{error}</p>}
      <ul className="mn-rv-list">
        {shown.map(row => {
          if ('g' in row) {
            const g = row.g;
            const out = (g.direction ?? (g.outCount ? 'OUT' : 'IN')) === 'OUT';
            const scope = g.scope ?? g.count;
            const amount = g.waitingAmount ?? (out ? -g.totalOut : g.totalIn);
            const guess = g.guessCategoryId && book.label(g.guessCategoryId) ? g.guessCategoryId : null;
            return (
              <li key={g.key} className={busy === g.key ? 'busy' : ''}>
                <div className="mn-rv">
                  <div className="mn-rv-main">
                    <b><span className="mn-rv-who">{out ? '→' : '←'}</span>{g.name}</b>
                    <small>{g.waiting} waiting{scope > g.waiting ? ` (of ${scope})` : ''} · latest {dayWord(g.lastAt)}</small>
                  </div>
                  <span className={`mn-amt${amount > 0 ? ' in' : ''}`}>{money(amount, 'VND', true)}</span>
                </div>
                <div className="mn-rv-act">
                  {guess ? (
                    <>
                      <span className="mn-guess">Guess <Pill book={book} id={guess} /></span>
                      <button type="button" className="mn-btn sm" disabled={busy !== null}
                        onClick={() => act(g.key, () => moneyApi.assign({ name: g.name, categoryId: guess, direction: out ? 'OUT' : 'IN' }), `Applied to ${txs(scope)} with ${g.name}`)}>
                        Yes, apply to {scope}
                      </button>
                      <button type="button" className="mn-link" onClick={() => open(row)}>Change</button>
                    </>
                  ) : (
                    <>
                      <span className="mn-muted">No guess yet</span>
                      <button type="button" className="mn-btn sm" onClick={() => open(row)}>Add labels</button>
                    </>
                  )}
                </div>
              </li>
            );
          }
          const t = row.t;
          const guess = book.sortIds(guessOf(t));
          return (
            <li key={t.id} className={busy === t.id ? 'busy' : ''}>
              <div className="mn-rv">
                <div className="mn-rv-main">
                  <b>{t.description || t.bankDescription || 'No description'}</b>
                  <small>{t.accountName} · {dayWord(t.occurredAt)} {timeOf(t.occurredAt)}</small>
                </div>
                <span className={`mn-amt${t.amount > 0 ? ' in' : ''}`}>{money(t.amount, t.currency, true)}</span>
              </div>
              <div className="mn-rv-act">
                {guess.length ? (
                  <>
                    <span className="mn-guess">Guess {guess.map(id => <Pill key={id} book={book} id={id} />)}</span>
                    <button type="button" className="mn-btn sm" disabled={busy !== null} onClick={() => act(t.id, () => moneyApi.confirm(t.id), 'Saved')}>Yes</button>
                    <button type="button" className="mn-link" onClick={() => open(row)}>Change</button>
                  </>
                ) : (
                  <>
                    <span className="mn-muted">No guess yet</span>
                    <button type="button" className="mn-btn sm" onClick={() => open(row)}>Add labels</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > shown.length && <button type="button" className="mn-more" onClick={() => setAll(true)}>Show all ({rows.length})</button>}
      {sheet && ('g' in sheet
        ? <GroupSheet group={sheet.g} onClose={() => setSheet(null)} />
        : <LineSheet txn={sheet.t} onClose={() => setSheet(null)} />)}
    </div>
  );
}
