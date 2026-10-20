/* Manage labels: sections, parents and children. Renaming, moving a label inside a parent, hiding, adding a label, a
   child label or a section — each change applies everywhere right away. */
import { Fragment, useState, type KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { moneyApi, type MoneyCategory } from '../../api/money';
import { useCategories } from './data';
import { useLabelBook, type Section } from './labels';
import { LabelText } from './Picker';
import { Sheet, SheetFoot } from './Sheet';
import { toast } from './toast';

type Kind = 'EXPENSE' | 'INCOME' | 'ANY';
type Edit = { id: string; name: string; icon: string; parent: string };
type Adding = { sec: string; kind: Kind; parent: string | null; name: string; icon: string };

export default function LabelTree({ onClose }: { onClose: () => void }) {
  const book = useLabelBook(), categories = useCategories(), qc = useQueryClient();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [adding, setAdding] = useState<Adding | null>(null);
  const [addingSec, setAddingSec] = useState(false);
  const [secName, setSecName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /* a section's "Follows the payee" shows the new state at once, before the change comes back */
  const [carry, setCarry] = useState<Record<string, boolean>>({});

  const run = async (f: () => Promise<unknown>, done: string) => {
    if (busy) return false;
    setBusy(true); setError('');
    try {
      await f();
      await qc.invalidateQueries({ queryKey: ['money'] });   // lines and reports follow a moved label
      toast(done);
      return true;
    } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  };

  /* an example family for the rules below: a parent and its first child, as they are named now */
  const fam = book.main ? book.live(book.main.id).filter(p => !book.parentOf(p.id)).map(p => ({ p, k: book.kids(p.id)[0] })).find(x => x.k) : undefined;

  const startEdit = (c: MoneyCategory) => { setAdding(null); setError(''); setEdit({ id: c.id, name: c.name, icon: c.icon ?? '', parent: book.parentOf(c.id) ?? '' }); };
  const startNew = (sec: string, kind: Kind, parent: string | null) => { setEdit(null); setError(''); setAdding({ sec, kind, parent, name: '', icon: '' }); };

  const saveEdit = async () => {
    if (!edit) return;
    const c = book.label(edit.id), name = edit.name.trim();
    if (!c || !name) return;
    const body: { name: string; icon: string; impliesIds?: string[] } = { name, icon: edit.icon.trim() };
    const parentNow = book.parentOf(c.id) ?? '';
    if (edit.parent !== parentNow && !book.kids(c.id).length) {
      const others = c.impliesIds.filter(x => book.secOf(x) !== book.secOf(c.id));   // what it brings from other sections stays
      body.impliesIds = [...others, ...(edit.parent ? [edit.parent] : [])];
    }
    if (await run(() => moneyApi.updateTag(c.id, body), 'Label saved')) setEdit(null);
  };

  const saveNew = async () => {
    if (!adding) return;
    const name = adding.name.trim();
    if (!name) return;
    const sec = book.sections.find(s => s.id === adding.sec);
    const siblings = adding.parent ? book.kids(adding.parent) : book.live(adding.sec).filter(l => !book.parentOf(l.id) && l.kind === adding.kind);
    const sortOrder = Math.max(adding.parent ? book.label(adding.parent)?.sortOrder ?? 0 : 0, ...siblings.map(x => x.sortOrder)) + 1;
    const ok = await run(() => moneyApi.createTag({
      name, icon: adding.icon.trim() || undefined, facetId: adding.sec, sortOrder,
      kind: sec?.main && adding.kind !== 'ANY' ? adding.kind : undefined, impliesIds: adding.parent ? [adding.parent] : undefined,
    }), `Added “${name}”`);
    if (ok) setAdding(null);
  };

  const addSection = async () => {
    const name = secName.trim();
    if (!name) return;
    if (await run(() => moneyApi.createFacet({ name, perTransaction: true }), `Added section “${name}”`)) { setAddingSec(false); setSecName(''); }
  };

  const onEscape = () => {
    if (adding) { setAdding(null); return true; }
    if (edit) { setEdit(null); return true; }
    if (addingSec) { setAddingSec(false); return true; }
    return false;
  };
  const enter = (f: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); f(); } };

  const fields = (d: { name: string; icon: string }, set: (x: { name: string; icon: string }) => void, placeholder: string | undefined, save: () => void) => (
    <div className="tr-fields">
      <input className="tr-ic" value={d.icon} maxLength={8} placeholder="🙂" aria-label="Icon (optional)" onChange={e => set({ ...d, icon: e.target.value })} onKeyDown={enter(save)} />
      <input className="tr-name" autoFocus value={d.name} maxLength={40} placeholder={placeholder} aria-label="Label name" onChange={e => set({ ...d, name: e.target.value })} onKeyDown={enter(save)} />
    </div>
  );

  const editRow = (c: MoneyCategory) => {
    const hasKids = book.kids(c.id).length > 0;
    const parents = book.live(book.secOf(c.id) ?? '').filter(p => !book.parentOf(p.id) && p.id !== c.id && p.kind === c.kind);
    return (
      <li key={c.id} className={`tr-edit${book.parentOf(c.id) ? ' kid' : ''}`}>
        {fields(edit!, x => setEdit({ ...edit!, ...x }), undefined, saveEdit)}
        <label className="tr-parent">Inside
          <select value={edit!.parent} disabled={hasKids} onChange={e => setEdit({ ...edit!, parent: e.target.value })}>
            <option value="">Nothing, top level</option>
            {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        {hasKids && <p className="mn-sub" style={{ margin: 0 }}>This label has child labels, so it stays at the top level.</p>}
        <div className="tr-act">
          <button type="button" className="mn-link danger" disabled={hasKids || busy} title={hasKids ? 'Hide its child labels first' : undefined}
            onClick={async () => { if (await run(() => moneyApi.updateTag(c.id, { archived: true }), `Hid “${c.name}”`)) setEdit(null); }}>Hide</button>
          <span />
          <button type="button" className="mn-link" onClick={() => setEdit(null)}>Cancel</button>
          <button type="button" className="mn-btn sm" disabled={busy || !edit!.name.trim()} onClick={saveEdit}>Save</button>
        </div>
      </li>
    );
  };

  const newRow = () => (
    <li key="new" className={`tr-edit${adding!.parent ? ' kid' : ''}`}>
      {fields(adding!, x => setAdding({ ...adding!, ...x }), adding!.parent ? `Child of ${book.label(adding!.parent)?.name ?? ''}` : 'New label name', saveNew)}
      <div className="tr-act">
        <span />
        <button type="button" className="mn-link" onClick={() => setAdding(null)}>Cancel</button>
        <button type="button" className="mn-btn sm" disabled={busy || !adding!.name.trim()} onClick={saveNew}>Add</button>
      </div>
    </li>
  );

  const row = (c: MoneyCategory, kid: boolean) => edit?.id === c.id ? editRow(c) : (
    <li key={c.id} className={`tr-row${kid ? ' kid' : ''}`}>
      <span className="tr-n"><LabelText c={c} /></span>
      <small className="tr-c">{c.uses ?? 0}</small>
      {!kid && <button type="button" className="mn-link quiet" onClick={() => startNew(book.secOf(c.id)!, c.kind, c.id)}>＋ Child label</button>}
      <button type="button" className="mn-link" onClick={() => startEdit(c)}>Edit</button>
    </li>
  );

  const carryBox = (sec: Section) => (
    <label className="mn-remember tr-carry" title="When you apply labels to every transaction with a payee, labels from this section go along">
      <input type="checkbox" checked={carry[sec.id] ?? sec.carry} disabled={sec.main || busy}
        onChange={async e => {
          const on = e.target.checked;
          setCarry(c => ({ ...c, [sec.id]: on }));
          await run(() => moneyApi.updateFacet(sec.id, { perTransaction: !on }), on ? `${sec.name} labels follow the payee` : `${sec.name} labels stay on one transaction`);
          setCarry(c => { const n = { ...c }; delete n[sec.id]; return n; });
        }} />
      <span>Follows the payee</span>
    </label>
  );

  const liveSecs = new Set(book.sections.map(s => s.id));
  const hidden = (categories.data ?? []).filter(c => c.archived && !c.system && liveSecs.has(book.secOf(c.id) ?? ''));

  return (
    <Sheet label="Manage labels" onClose={onClose} onEscape={onEscape}>
      <div className="mn-sheet-head">
        <div>
          <b>Manage labels</b>
          <small>Sections are just headings. A child label counts toward its parent, and a transaction can carry many labels. The numbers show how many transactions carry each label.</small>
        </div>
      </div>
      <div className="mn-rules tr-rules">
        <ul>
          <li><b>Tap a label to turn it on, tap again to turn it off.</b> Pick as many as you like. Nothing is saved until you press the button at the bottom, and that button says how many transactions will change.</li>
          {fam && <li><b>A child label counts toward its parent.</b> Pick {fam.k.icon ? `${fam.k.icon} ` : ''}{fam.k.name} and {fam.p.icon ? `${fam.p.icon} ` : ''}{fam.p.name} is included automatically. Pick {fam.p.name} on its own when you don’t need the detail.</li>}
          <li><b>A transaction leaves To review once it has a category,</b> or once it’s marked as an internal transfer.</li>
          <li><b>An internal transfer is the one either-or choice.</b> Moving money between your own accounts isn’t spending or income, so it takes no labels and stays out of reports.</li>
          <li><b>Reports add up by label.</b> Total spending counts each transaction once, and each label adds up every transaction that carries it.</li>
        </ul>
      </div>

      {book.sections.map(sec => (sec.main ? [['EXPENSE', 'spending'], ['INCOME', 'income']] as [Kind, string][] : [['ANY', '']] as [Kind, string][]).map(([kind, cap]) => (
        <div key={`${sec.id}-${kind}`} className="tr-sec">
          <div className="tr-head">
            <p className="mn-label">{sec.name}{cap ? ` · ${cap}` : ''}</p>
            {kind !== 'INCOME' && carryBox(sec)}
          </div>
          <ul className="tr">
            {book.live(sec.id).filter(l => !book.parentOf(l.id) && l.kind === kind).map(p => (
              <Fragment key={p.id}>
                {row(p, false)}
                {book.kids(p.id).map(k => row(k, true))}
                {adding?.parent === p.id && newRow()}
              </Fragment>
            ))}
            {adding && !adding.parent && adding.sec === sec.id && adding.kind === kind && newRow()}
          </ul>
          <button type="button" className="mn-link tr-add" onClick={() => startNew(sec.id, kind, null)}>＋ New label{cap ? ` (${cap})` : ''}</button>
        </div>
      )))}

      {hidden.length > 0 && (
        <div className="tr-sec">
          <p className="mn-label">Hidden</p>
          <ul className="tr">
            {hidden.map(c => (
              <li key={c.id} className="tr-row off">
                <span className="tr-n"><LabelText c={c} /></span>
                <small className="tr-c">{book.sections.find(s => s.id === book.secOf(c.id))?.name}</small>
                <button type="button" className="mn-link" disabled={busy} onClick={() => run(() => moneyApi.updateTag(c.id, { archived: false }), `“${c.name}” is back`)}>Show</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {addingSec ? (
        <div className="tr-newsec">
          <input className="mn-pick-label" autoFocus value={secName} maxLength={40} placeholder="New section name, e.g. Projects" aria-label="New section name"
            onChange={e => setSecName(e.target.value)} onKeyDown={enter(addSection)} />
          <button type="button" className="mn-btn sm" disabled={busy || !secName.trim()} onClick={addSection}>Add section</button>
          <button type="button" className="mn-link" onClick={() => setAddingSec(false)}>Cancel</button>
        </div>
      ) : (
        <p className="tr-newsec-link"><button type="button" className="mn-link" onClick={() => { setAddingSec(true); setSecName(''); }}>＋ New section</button></p>
      )}
      {error && <p className="mn-error">{error}</p>}
      <SheetFoot note="Changes here apply everywhere right away." label="Done" onSave={onClose} />
    </Sheet>
  );
}
