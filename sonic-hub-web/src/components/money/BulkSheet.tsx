/* Several transactions at once ("that evening was with friends"): each label shows how many of them have it now;
   a tap adds it to all of them, a second tap removes it from all, a third leaves it as it was. */
import { useMemo, useState } from 'react';
import { moneyApi, type Txn } from '../../api/money';
import { useRefresh } from './data';
import { decided, dirOf, labelsOf, sameSet, txs, useLabelBook, type Dir } from './labels';
import { Pill, Sections, type Op } from './Picker';
import { Sheet, SheetFoot } from './Sheet';
import { toast } from './toast';

export default function BulkSheet({ lines, onClose, onDone }: { lines: Txn[]; onClose: () => void; onDone: () => void }) {
  const book = useLabelBook(), refresh = useRefresh();
  const N = lines.length;
  const dirs = [...new Set(lines.map(dirOf))] as Dir[];
  const [ops, setOps] = useState<Map<string, Op>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const now = useMemo(() => lines.map(t => book.normalize(labelsOf(t))), [lines, book]);
  const effNow = useMemo(() => now.map(s => book.effective(s)), [now, book]);
  const adds = book.sortIds([...ops].filter(([, o]) => o === 'add').map(([id]) => id));
  const rms = book.sortIds([...ops].filter(([, o]) => o === 'remove').map(([id]) => id));
  /* what each line will carry: removed ones go with their children; a category goes only where the money went its way */
  const next = now.map((s, i) => {
    const n = new Set(s);
    for (const id of rms) { n.delete(id); book.descendants(id).forEach(x => n.delete(x)); }
    for (const id of adds) { const c = book.label(id); if (c && book.kindOk(c, [dirOf(lines[i])])) n.add(id); }
    return book.normalize(n);
  });
  const effNext = next.map(s => book.effective(s));
  const before = (id: string) => effNow.filter(e => e.has(id)).length;
  const after = (id: string) => effNext.filter(e => e.has(id)).length;
  const changed = next.filter((s, i) => !sameSet(s, now[i])).length;
  const hasMain = (s: Set<string>) => [...s].some(book.isMain);
  const back = lines.filter((t, i) => decided(t) && hasMain(now[i]) && !hasMain(next[i])).length;
  const done = lines.filter((t, i) => !hasMain(now[i]) && hasMain(next[i]) && !decided(t)).length;
  const keep = new Set(effNow.flatMap(e => [...e]));

  const cycle = (id: string) => {
    const have = before(id);
    const order: (Op | undefined)[] = have === 0 ? [undefined, 'add'] : have === N ? [undefined, 'remove'] : [undefined, 'add', 'remove'];
    const nx = order[(order.indexOf(ops.get(id)) + 1) % order.length];
    const m = new Map(ops);
    if (nx) m.set(id, nx); else m.delete(id);
    if (nx === 'add') book.ancestors(id).forEach(a => { if (m.get(a) === 'remove') m.delete(a); });
    if (nx === 'remove') book.descendants(id).forEach(x => { if (m.get(x) === 'add') m.delete(x); });
    setOps(m);
  };

  const save = async () => {
    if (busy || !ops.size) return;
    setBusy(true); setError('');
    try {
      const remove = [...new Set(rms.flatMap(id => [id, ...book.descendants(id)]))];
      const r = await moneyApi.tags({ ids: lines.map(t => t.id), add: [...book.normalize(adds)], remove });
      refresh();
      toast(r.updated ? `Saved. ${r.updated} of ${N} changed` : 'Nothing changed');
      onDone();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <Sheet label={`Label ${txs(N)}`} onClose={onClose}>
      <div className="mn-sheet-head">
        <div>
          <b>Label {txs(N)}</b>
          <small>Tap a label once to add it to all {N}, again to remove it from all {N}, and a third time to leave it as it was. The small number shows how many have it now.</small>
        </div>
      </div>
      <Sections book={book} dirs={dirs} keep={keep} newKind={dirs.length === 1 && dirs[0] === 'in' ? 'INCOME' : 'EXPENSE'}
        chips={{ mode: 'bulk', N, before, after, ops, onCycle: cycle }}
        onCreated={id => setOps(m => new Map(m).set(id, 'add'))} />
      <p className="mn-bulk-sum">
        {adds.length || rms.length ? (
          <>
            {adds.length > 0 && <>Add {adds.map(id => <Pill key={id} book={book} id={id} />)}</>}
            {adds.length > 0 && rms.length > 0 && <span aria-hidden="true">·</span>}
            {rms.length > 0 && <>Remove {rms.map(id => <Pill key={id} book={book} id={id} kind="rm" />)}</>}
            <span aria-hidden="true">·</span>{changed} of {N} will change
          </>
        ) : 'Nothing changed yet.'}
      </p>
      {done > 0 && <p className="mn-sub">{txs(done)} {done === 1 ? 'gets a category and leaves' : 'get a category and leave'} To review.</p>}
      {back > 0 && <p className="mn-sub" style={{ color: 'var(--bad)' }}>{txs(back)} will have no category left and go back to To review.</p>}
      {error && <p className="mn-error">{error}</p>}
      <SheetFoot label={`Save for ${txs(N)}`} disabled={!ops.size} busy={busy} onSave={save} onCancel={onClose} />
    </Sheet>
  );
}
