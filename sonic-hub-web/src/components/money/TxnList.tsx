/* The month's transactions by day; tap one to fix it. "Select" picks several (a whole day in one tap) to put tags
   on or take them off together — "that evening was with friends". */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { moneyApi, type MoneyCategory, type Txn } from '../../api/money';
import { dayLabel, dayOf, money, monthName, timeOf, utc, vnd } from '../../lib/money';
import { useCategories, useRefresh, useTxns } from './data';
import EditSheet from './EditSheet';
import { FacetChips, tagText, useTagBook } from './tags';

export default function TxnList({ month, category, onClearCategory }: { month: string; category: string | null; onClearCategory: () => void }) {
  const [size, setSize] = useState(100);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [tagging, setTagging] = useState(false);
  const txns = useTxns(month, size), categories = useCategories();
  /* a transfer shows once: the other account's side is bookkeeping, already named on this row */
  const all = (txns.data?.content ?? []).filter(t => t.source !== 'SYSTEM');
  const cat = category ? (categories.data ?? []).find(c => c.id === category) : null;
  const rows = category ? all.filter(t => t.categoryId === category || (t.tags ?? []).some(x => x.id === category)) : all;

  useEffect(() => { setPicking(false); setPicked(new Set()); }, [month]);

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

  /* moves between own accounts carry no tags, so they are not picked */
  const pickable = (t: Txn) => t.kind !== 'TRANSFER';
  const flip = (ids: string[], on: boolean) => setPicked(p => { const n = new Set(p); ids.forEach(id => on ? n.add(id) : n.delete(id)); return n; });
  const stop = () => { setPicking(false); setPicked(new Set()); setTagging(false); };

  return (
    <div className="card mn-list">
      <div className="mn-head">
        <h2>{monthName(month)} transactions</h2>
        {cat && <button type="button" className="mn-chip on" onClick={onClearCategory}>{cat.icon} {cat.name} ✕</button>}
        <span className="mn-muted">{txns.data ? `${rows.length}${!category && txns.data.totalElements > all.length ? ` / ${txns.data.totalElements}` : ''} transaction${rows.length === 1 ? '' : 's'}` : ''}</span>
        {rows.length > 0 && (picking
          ? <button type="button" className="mn-link" onClick={stop}>Done</button>
          : <button type="button" className="mn-link" onClick={() => setPicking(true)}>Select</button>)}
      </div>
      {picking && <p className="mn-rv-hint">Tap transactions, or a whole day at its heading, then label them all at once.</p>}
      {!rows.length ? <p className="mn-empty">{txns.isLoading ? 'Loading…' : 'No transactions yet.'}</p> : days.map(g => {
        const ids = g.items.filter(pickable).map(t => t.id);
        const allOn = ids.length > 0 && ids.every(id => picked.has(id));
        return (
          <section key={g.day} className="mn-day">
            <h3>
              <span>{g.label}</span>
              {picking && ids.length > 0
                ? <button type="button" className="mn-day-pick" onClick={() => flip(ids, !allOn)}>{allOn ? 'Deselect day' : 'Select day'}</button>
                : g.out > 0 && <small>spent {vnd(g.out)}</small>}
            </h3>
            <ul>
              {g.items.map(t => {
                const on = picked.has(t.id), can = pickable(t);
                const more = (t.tags ?? []).filter(x => x.id !== t.categoryId);
                return (
                  <li key={t.id}>
                    <button type="button" className={`mn-tx ${t.status === 'REVIEW' ? 'review' : ''} ${picking ? 'picking' : ''} ${on ? 'picked' : ''}`}
                      disabled={picking && !can} aria-pressed={picking ? on : undefined}
                      onClick={() => picking ? flip([t.id], !on) : setEditing(t)}>
                      {picking
                        ? <span className={`mn-tick ${on ? 'on' : ''}`} aria-hidden="true">{on ? '✓' : ''}</span>
                        : <span className="mn-ic big">{t.kind === 'TRANSFER' ? '⇄' : t.categoryIcon ?? '❔'}</span>}
                      <span className="mn-tx-main">
                        <b>{t.description || t.bankDescription || '—'}</b>
                        <small>
                          <i className="mn-dot" style={{ background: 'var(--ink3)' }} />{t.accountName}
                          {t.counterparty && t.kind !== 'TRANSFER' && <>{' · '}{t.amount < 0 ? '→' : '←'} {t.counterparty}</>}
                          {' · '}{t.kind === 'TRANSFER' ? `transfer ${t.amount < 0 ? 'to' : 'from'} ${t.transferAccountName ?? 'another account'}` : t.categoryName ?? 'uncategorized'}
                          {t.status === 'REVIEW' && ' · to review'}
                          {' · '}{timeOf(t.occurredAt)}
                          {t.note && <em> · “{t.note}”</em>}
                        </small>
                        {more.length > 0 && (
                          <span className="mn-tags">
                            {more.map(x => <span key={x.id} className={`mn-tag ${x.main ? 'main' : ''} ${x.by === 'IMPLIED' ? 'implied' : ''}`}>{tagText(x)}</span>)}
                          </span>
                        )}
                      </span>
                      <span className={`mn-amt ${t.kind === 'TRANSFER' ? 'tr' : t.amount > 0 ? 'in' : ''}`}>{money(t.amount, t.currency, true)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {!category && txns.data && txns.data.totalElements > all.length && (
        <button type="button" className="mn-more" onClick={() => setSize(s => s + 100)}>Show more</button>
      )}
      {editing && <EditSheet txn={editing} onClose={() => setEditing(null)} />}
      {/* In <body>: the page's entrance animation leaves a transform on .page, which would trap a fixed element. */}
      {picking && createPortal(
        <div className="mn-selbar" role="toolbar" aria-label="Selected transactions">
          <span>{picked.size ? `${picked.size} selected` : 'Nothing selected'}</span>
          <button type="button" className="go" disabled={!picked.size} onClick={() => setTagging(true)}>Label</button>
          <button type="button" onClick={stop}>Done</button>
        </div>,
        document.body,
      )}
      {tagging && <TagSheet ids={[...picked]} lines={all.filter(t => picked.has(t.id))} onClose={() => setTagging(false)} onDone={stop} />}
    </div>
  );
}

/** Tags for the picked lines: chosen chips go on ("Add to") or come off ("Remove from") every one of them. */
function TagSheet({ ids, lines, onClose, onDone }: { ids: string[]; lines: Txn[]; onClose: () => void; onDone: () => void }) {
  const book = useTagBook(), categories = useCategories(), refresh = useRefresh();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const out = lines.some(t => t.amount < 0), inn = lines.some(t => t.amount > 0);
  const mains = (categories.data ?? []).filter((c: MoneyCategory) => c.kind !== 'ANY' && !c.archived && !c.system
    && ((out && c.kind === 'EXPENSE') || (inn && c.kind === 'INCOME')));
  /* how many of the picked lines already carry each tag — "3/5" on its chip */
  const count = (id: string) => lines.filter(t => (t.tags ?? []).some(x => x.id === id)).length;

  const go = async (mode: 'add' | 'remove') => {
    setBusy(true); setError('');
    try {
      const r = await moneyApi.tags({ ids, [mode]: [...chosen] });
      refresh();
      setDone(`${mode === 'add' ? 'Added' : 'Removed'}. ${r.updated} transaction${r.updated === 1 ? '' : 's'} changed.`);
      window.setTimeout(onDone, 900);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  const chip = (c: MoneyCategory) => {
    const n = count(c.id);
    return (
      <button key={c.id} type="button" className={`mn-pick-i ${chosen.has(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
        {tagText(c)}{n > 0 && <small className="mn-pick-n">{n}/{lines.length}</small>}
      </button>
    );
  };

  return createPortal(
    <div className="mn-sheet-wrap" onClick={onClose}>
      <div className="mn-sheet" role="dialog" aria-modal="true" aria-label="Label several transactions" onClick={e => e.stopPropagation()}>
        <div className="mn-sheet-head">
          <div><b>Label {ids.length} transaction{ids.length === 1 ? '' : 's'}</b><small>Pick labels, then add them to all of them or remove them from all of them.</small></div>
        </div>
        {book.others.map(f => (
          <div key={f.id}>
            <p className="mn-label">{f.name}</p>
            <FacetChips facet={f} book={book} chosen={chosen} implied={new Map()} onToggle={toggle} onCreated={id => setChosen(s => new Set(s).add(id))}
              count={count} of={lines.length} />
          </div>
        ))}
        <p className="mn-label">Category</p>
        <div className="mn-pick flat">{mains.map(chip)}</div>
        {error && <p className="mn-error">{error}</p>}
        {done && <p className="mn-imp-done">{done}</p>}
        <div className="mn-sheet-foot">
          <button type="button" className="mn-link danger" disabled={busy || !chosen.size} onClick={() => go('remove')}>Remove from {ids.length}</button>
          <span />
          <button type="button" className="mn-link" onClick={onClose}>Cancel</button>
          <button type="button" className="mn-btn" disabled={busy || !chosen.size} onClick={() => go('add')}>{busy ? 'Saving…' : `Add to ${ids.length}`}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
