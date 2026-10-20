/* Picking labels, one look for "any number of these": every section's labels as chips, a parent and its children
   together as a family, "＋" to make a new label right there. The same chips everywhere; for several lines at once
   each chip cycles add → remove → as it was, and shows how many of them have it. */
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { moneyApi, type MoneyCategory } from '../../api/money';
import type { Dir, LabelBook } from './labels';

export const LabelText = ({ c }: { c: { icon: string | null; name: string } }) =>
  <>{c.icon && <span className="li" aria-hidden="true">{c.icon}</span>}{c.name}</>;

/** A label on a line or in a sentence; "guess" is the AI's, waiting to be confirmed; "rm" is about to come off. */
export function Pill({ book, id, kind }: { book: LabelBook; id: string; kind?: 'guess' | 'rm' }) {
  const c = book.label(id);
  if (!c) return null;
  return <span className={`mn-tag${book.isMain(id) ? ' main' : ''}${kind ? ` ${kind}` : ''}`}><LabelText c={c} />{kind === 'guess' ? '?' : ''}</span>;
}

export type Op = 'add' | 'remove';

export type Chips =
  | { mode: 'pick'; sel: Set<string>; onToggle: (id: string) => void }
  | { mode: 'bulk'; N: number; before: (id: string) => number; after: (id: string) => number; ops: Map<string, Op>; onCycle: (id: string) => void };

export function Sections({ book, dirs, chips, keep, newKind, onCreated }: {
  book: LabelBook; dirs: Dir[]; chips: Chips;
  /** hidden labels that are in use still show */
  keep: Set<string>;
  /** the kind a new Category label gets */
  newKind: 'EXPENSE' | 'INCOME';
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const eff = chips.mode === 'pick' ? book.effective(chips.sel) : new Set<string>();

  const chip = (c: MoneyCategory) => {
    if (chips.mode === 'bulk') {
      const { N } = chips, b = chips.before(c.id), a = chips.after(c.id), op = chips.ops.get(c.id);
      const cls = op === 'add' ? ' will-add' : op === 'remove' ? ' will-rm' : b === N ? ' on' : b > 0 ? ' some' : '';
      const pressed = op === 'add' ? true : op === 'remove' ? false : b === N ? true : b > 0 ? 'mixed' as const : false;
      const mark = op === 'add' ? '＋' : op === 'remove' ? '−' : b === N ? '✓' : '';
      return (
        <button key={c.id} type="button" data-id={c.id} className={`mn-pick-i${cls}`} aria-pressed={pressed} onClick={() => chips.onCycle(c.id)}>
          {mark && <span className="ok" aria-hidden="true">{mark}</span>}<LabelText c={c} />
          {(b > 0 || a !== b) && <small>{a !== b ? `${b}→${a}` : b}/{N}</small>}
        </button>
      );
    }
    const on = chips.sel.has(c.id), auto = !on && eff.has(c.id);
    const via = auto ? book.sortIds([...chips.sel].filter(x => x !== c.id && book.effective([x]).has(c.id))).map(x => book.label(x)?.name).join(', ') : '';
    return (
      <button key={c.id} type="button" data-id={c.id} className={`mn-pick-i${on ? ' on' : auto ? ' auto' : ''}`} aria-pressed={on || auto}
        title={auto ? `Included because ${via} is picked. Tap to clear it and its children.` : undefined} onClick={() => chips.onToggle(c.id)}>
        {on && <span className="ok" aria-hidden="true">✓</span>}<LabelText c={c} />{auto && <small>auto</small>}
      </button>
    );
  };
  const fam = (list: MoneyCategory[]) => list.map(p => {
    const ks = book.kids(p.id, keep);
    return ks.length
      ? <span key={p.id} className="fam">{chip(p)}<span className="fam-sep" aria-hidden="true">›</span>{ks.map(chip)}</span>
      : chip(p);
  });

  const create = async (secId: string, main: boolean) => {
    const n = name.trim();
    if (!n) { setAdding(null); return; }
    if (busy) return;
    setBusy(true); setError('');
    try {
      const c = await moneyApi.createTag({ name: n, facetId: secId, kind: main ? newKind : undefined });
      await qc.invalidateQueries({ queryKey: ['money', 'categories'] });
      qc.invalidateQueries({ queryKey: ['money', 'facets'] });
      onCreated(c.id);
      setAdding(null); setName('');
      window.requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-id="${c.id}"]`)?.focus());
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div ref={root}>
      {book.sections.map(sec => (
        <div key={sec.id}>
          <div className="mn-facet-head">
            <p className="mn-label">{sec.name}</p>
            {sec.main && chips.mode === 'pick' && <span className="mn-muted">at least 1</span>}
          </div>
          <div className="mn-pick flat">
            {sec.main && dirs.length > 1
              ? <>{fam(book.tops(sec.id, ['out'], keep))}<span className="mn-pick-sep">Income</span>{fam(book.tops(sec.id, ['in'], keep))}</>
              : fam(book.tops(sec.id, dirs, keep))}
            {adding === sec.id ? (
              <input className="mn-pick-new" autoFocus value={name} maxLength={40} disabled={busy} autoComplete="off"
                placeholder="New label, then Enter" aria-label={`New label in ${sec.name}`}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); create(sec.id, sec.main); }
                  if (e.key === 'Escape') { e.preventDefault(); setAdding(null); setName(''); }
                }}
                onBlur={() => window.setTimeout(() => { if (!name.trim()) setAdding(a => (a === sec.id ? null : a)); }, 150)} />
            ) : (
              <button type="button" className="mn-pick-i new" aria-label={`Add a label to ${sec.name}`} title="Add a label"
                onClick={() => { setAdding(sec.id); setName(''); setError(''); }}>＋</button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="mn-error">{error}</p>}
    </div>
  );
}

/** One of a few accounts, for a move between own accounts: radio pills, a different look from label chips on purpose. */
export function Wallets({ accounts, dir, value, onPick }: {
  accounts: { id: string; name: string; color: string | null }[]; dir: Dir; value: string | null; onPick: (id: string) => void;
}) {
  return (
    <>
      <p className="mn-label" style={{ marginTop: 18 }}>{dir === 'out' ? 'Moved to' : 'Moved from'}</p>
      <div className="mn-radios" role="radiogroup" aria-label="Account">
        {accounts.map(a => (
          <button key={a.id} type="button" role="radio" aria-checked={value === a.id} className={`mn-radio${value === a.id ? ' on' : ''}`} onClick={() => onPick(a.id)}>
            <span className="rd" aria-hidden="true" /><i className="mn-dot" style={{ background: a.color ?? 'var(--ink3)' }} />{a.name}
          </button>
        ))}
      </div>
      <p className="mn-sub">An internal transfer isn’t spending or income, so it takes no labels and stays out of reports.</p>
    </>
  );
}

/** Expense (or Income) | Internal transfer: the one either-or choice. */
export function ModeSeg({ dir, mode, onMode }: { dir: Dir; mode: 'label' | 'transfer'; onMode: (m: 'label' | 'transfer') => void }) {
  return (
    <div className="seg mn-mode" role="radiogroup" aria-label="Transaction type">
      <button type="button" role="radio" aria-checked={mode === 'label'} className={mode === 'label' ? 'on' : ''} onClick={() => onMode('label')}>
        {dir === 'out' ? 'Expense' : 'Income'}
      </button>
      <button type="button" role="radio" aria-checked={mode === 'transfer'} className={mode === 'transfer' ? 'on' : ''} onClick={() => onMode('transfer')}>
        Internal transfer
      </button>
    </div>
  );
}
