/* The month's transactions by day; tap one to label it. "Select" picks several (a whole day in one tap) to label them
   all at once — "that evening was with friends". A label picked in the report shows only the lines carrying it. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Txn } from '../../api/money';
import { dayLabel, dayOf, money, monthName, timeOf, utc, vnd } from '../../lib/money';
import BulkSheet from './BulkSheet';
import { useSummary, useTxns } from './data';
import { decided, dirOf, guessOf, labelsOf, txs, useLabelBook } from './labels';
import LineSheet from './LineSheet';
import { LabelText, Pill } from './Picker';

export default function TxnList({ month, filter, onClearFilter }: { month: string; filter: string | null; onClearFilter: () => void }) {
  const book = useLabelBook(), summary = useSummary();
  const [size, setSize] = useState(100);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Map<string, Txn>>(new Map());
  const [tagging, setTagging] = useState(false);
  const txns = useTxns(month, size, filter);
  /* a transfer shows once: the other account's side is bookkeeping, already named on this row */
  const rows = useMemo(() => (txns.data?.content ?? []).filter(t => t.source !== 'SYSTEM'), [txns.data]);
  const f = filter ? book.label(filter) : null;
  const colors = new Map((summary.data?.accounts ?? []).map(a => [a.id, a.color]));
  const more = !!txns.data && txns.data.totalElements > txns.data.content.length;

  useEffect(() => { setPicking(false); setPicked(new Map()); setSize(100); }, [month]);

  const days = useMemo(() => {
    const out: { day: string; label: string; items: Txn[]; out: number }[] = [];
    for (const t of rows) {
      const d = dayOf(utc(t.occurredAt));
      let g = out[out.length - 1];
      if (!g || g.day !== d) { g = { day: d, label: dayLabel(t.occurredAt), items: [], out: 0 }; out.push(g); }
      g.items.push(t);
      if (t.kind === 'EXPENSE' && t.amountVnd !== null && t.amountVnd < 0) g.out -= t.amountVnd;
    }
    return out;
  }, [rows]);

  /* moves between own accounts carry no labels, so they are not picked */
  const pickable = (t: Txn) => t.kind !== 'TRANSFER';
  const flip = (lines: Txn[], on: boolean) => setPicked(p => { const n = new Map(p); lines.forEach(t => (on ? n.set(t.id, t) : n.delete(t.id))); return n; });
  const stop = () => { setPicking(false); setPicked(new Map()); setTagging(false); };
  /* the picked lines as they are now (a line picked under another filter stays picked) */
  const pickedLines = () => [...picked.values()].map(t => rows.find(x => x.id === t.id) ?? t);

  const icon = (t: Txn, labels: string[]) => {
    if (t.kind === 'TRANSFER') return '⇄';
    const m = labels.find(book.isMain);
    if (!m) return '❔';
    const c = book.label(m), p = book.parentOf(m);
    return c?.icon || (p ? book.label(p)?.icon : null) || '·';
  };

  const row = (t: Txn) => {
    const on = picked.has(t.id), dec = decided(t), move = t.kind === 'TRANSFER', dir = dirOf(t);
    const labels = move ? [] : book.sortIds(book.normalize(labelsOf(t)));
    const guess = move || dec ? [] : book.sortIds(guessOf(t));
    const sub: ReactNode[] = [<><i className="mn-dot" style={{ background: colors.get(t.accountId) ?? 'var(--ink3)' }} />{t.accountName}</>];
    if (t.counterparty && !move) sub.push(`${dir === 'out' ? '→' : '←'} ${t.counterparty}`);
    if (move) sub.push(`transfer ${dir === 'out' ? 'to' : 'from'} ${t.transferAccountName ?? 'another account'}`);
    if (!dec) sub.push(<span className="mn-wait">to review</span>);
    sub.push(timeOf(t.occurredAt));
    if (t.note) sub.push(<em>“{t.note}”</em>);
    return (
      <li key={t.id}>
        <button type="button" className={`mn-tx${dec ? '' : ' review'}${picking ? ' picking' : ''}${on ? ' picked' : ''}`}
          disabled={picking && !pickable(t)} aria-pressed={picking ? on : undefined}
          onClick={() => (picking ? flip([t], !on) : book.ready && setEditing(t))}>
          {picking
            ? <span className={`mn-tick${on ? ' on' : ''}`} aria-hidden="true">{on ? '✓' : ''}</span>
            : <span className="mn-ic big" aria-hidden="true">{icon(t, labels)}</span>}
          <span className="mn-tx-main">
            <b>{t.description || t.bankDescription || '—'}</b>
            <small>{sub.map((x, i) => <Piece key={i} sep={i > 0}>{x}</Piece>)}</small>
            {(labels.length > 0 || guess.length > 0) && (
              <span className="mn-tags">
                {labels.map(id => <Pill key={id} book={book} id={id} />)}
                {guess.map(id => <Pill key={`g-${id}`} book={book} id={id} kind="guess" />)}
              </span>
            )}
          </span>
          <span className={`mn-amt${move ? ' tr' : t.amount > 0 ? ' in' : ''}`}>{money(t.amount, t.currency, true)}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="card mn-list">
      <div className="mn-head">
        <h2>{monthName(month)} transactions</h2>
        {f && (
          <button type="button" className="mn-chip on" onClick={onClearFilter} aria-label={`Clear the ${f.name} filter`}>
            <LabelText c={f} /> <span aria-hidden="true">✕</span>
          </button>
        )}
        <span className="mn-muted">{txns.data ? (more ? `${rows.length} of ${txns.data.totalElements} transactions` : txs(rows.length)) : ''}</span>
        {rows.length > 0 && (picking
          ? <button type="button" className="mn-link" onClick={stop}>Done</button>
          : <button type="button" className="mn-link" onClick={() => setPicking(true)}>Select</button>)}
      </div>
      {f && <p className="mn-rv-hint">Showing <LabelText c={f} />{book.kids(f.id).length ? ' and its child labels' : ''}.</p>}
      {picking && <p className="mn-rv-hint">Tap transactions or a whole day, then label them all at once. Internal transfers can’t be picked because they take no labels.</p>}
      {!rows.length ? <p className="mn-empty">{txns.isLoading ? 'Loading…' : 'No transactions.'}</p> : days.map(g => {
        const can = g.items.filter(pickable);
        const allOn = can.length > 0 && can.every(t => picked.has(t.id));
        return (
          <div key={g.day} className="mn-day">
            <h3>
              <span>{g.label}</span>
              {picking && can.length > 0
                ? <button type="button" className="mn-day-pick" onClick={() => flip(can, !allOn)}>{allOn ? 'Deselect day' : 'Select day'}</button>
                : g.out > 0 && <small>spent {vnd(g.out)}</small>}
            </h3>
            <ul>{g.items.map(row)}</ul>
          </div>
        );
      })}
      {more && <button type="button" className="mn-more" onClick={() => setSize(s => s + 100)}>Show more</button>}
      {editing && <LineSheet txn={editing} onClose={() => setEditing(null)} />}
      {/* In <body>: the page's entrance animation leaves a transform on .page, which would trap a fixed element. */}
      {picking && createPortal(
        <div className="mn-selbar" role="toolbar" aria-label="Selected transactions">
          <span>{picked.size ? `${picked.size} selected` : 'Nothing selected'}</span>
          <button type="button" className="go" disabled={!picked.size || !book.ready} onClick={() => setTagging(true)}>Label</button>
          <button type="button" onClick={stop}>Done</button>
        </div>,
        document.body,
      )}
      {tagging && <BulkSheet lines={pickedLines()} onClose={() => setTagging(false)} onDone={stop} />}
    </div>
  );
}

/** One piece of a row's second line, with the dot between pieces. */
function Piece({ sep, children }: { sep: boolean; children: ReactNode }) {
  return <>{sep && <span aria-hidden="true">·</span>}{children}</>;
}
