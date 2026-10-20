/* "Import statement": the .xlsx the bank's app exports (TPBank: the account's transaction history). First what importing
   would do — nothing is written — then, on "Import", the new lines go in and the bank feed's lines get their counterparty. */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { moneyApi, type ImportSummary } from '../../api/money';
import { useRefresh } from './data';

export default function ImportStatement() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useRefresh();

  const read = async (f: File) => {
    setFile(f); setPreview(null); setResult(null); setError(''); setBusy(true);
    try { setPreview(await moneyApi.importPreview(f)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const commit = async () => {
    if (!file) return;
    setBusy(true); setError('');
    try { setResult(await moneyApi.importStatement(file)); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const close = () => {
    if (busy) return;
    setFile(null); setPreview(null); setResult(null); setError('');
    if (input.current) input.current.value = '';
  };
  const p = preview;
  const nothingNew = !!p && p.created === 0 && p.enriched === 0;

  return (
    <>
      <button type="button" className="mn-link mn-import" onClick={() => input.current?.click()}>＋ Import statement</button>
      <input ref={input} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={e => { const f = e.target.files?.[0]; if (f) read(f); }} />
      {file && createPortal(
        <div className="mn-sheet-wrap" onClick={close}>
          <div className="mn-sheet mn-imp-sheet" role="dialog" aria-modal="true" aria-label="Import statement" onClick={e => e.stopPropagation()}>
            <div className="mn-sheet-head">
              <div><b>Import statement</b><small>{file.name}</small></div>
            </div>
            {busy && !p && <p className="mn-sub">Reading the file…</p>}
            {error && <p className="mn-error">{error}</p>}
            {p && !result && (
              <>
                <p className="mn-imp-acc">
                  <b>{p.accountName}</b>{p.accountNumber ? ` ••${p.accountNumber.slice(-4)}` : ''}{p.period ? ` · ${p.period}` : ''}
                </p>
                <dl className="mn-imp">
                  <div><dt>Transactions in the file</dt><dd>{p.rows}</dd></div>
                  <div><dt>New</dt><dd>{p.created}</dd></div>
                  <div><dt>Already in from the bank</dt><dd>{p.matched}<small>{p.enriched ? `payee added to ${p.enriched}` : 'no change'}</small></dd></div>
                  {p.already > 0 && <div><dt>Imported before</dt><dd>{p.already}<small>skipped</small></dd></div>}
                  <div><dt>Categorized automatically</dt><dd>{p.categorized}</dd></div>
                  <div><dt>Waiting for you</dt><dd>{p.waiting}<small>grouped by payee</small></dd></div>
                </dl>
                <div className="mn-sheet-foot">
                  <span />
                  <button type="button" className="mn-link" onClick={close} disabled={busy}>Cancel</button>
                  <button type="button" className="mn-btn" onClick={commit} disabled={busy || nothingNew}>
                    {busy ? 'Importing…' : nothingNew ? 'Nothing new' : `Import ${p.created} transaction${p.created === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            )}
            {result && (
              <>
                <p className="mn-imp-done">
                  ✓ Added {result.created} transaction{result.created === 1 ? '' : 's'}{result.enriched ? `, and the payee to ${result.enriched} existing one${result.enriched === 1 ? '' : 's'}` : ''}.
                </p>
                <p className="mn-sub">
                  {result.waiting
                    ? `${result.waiting} transaction${result.waiting === 1 ? ' is' : 's are'} waiting in To review, grouped by payee. One choice per payee covers all their transactions.`
                    : 'Everything is categorized.'}
                </p>
                <div className="mn-sheet-foot"><span /><button type="button" className="mn-btn" onClick={close}>Done</button></div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
