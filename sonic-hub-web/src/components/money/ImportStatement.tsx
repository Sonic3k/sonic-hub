/* "Nhập sao kê": the .xlsx the bank's app exports (TPBank: Lịch sử giao dịch tài khoản). First what importing would
   do — nothing is written — then, on "Nhập", the new lines go in and the bank feed's lines get their counterparty. */
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
      <button type="button" className="mn-link mn-import" onClick={() => input.current?.click()}>＋ Nhập sao kê</button>
      <input ref={input} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={e => { const f = e.target.files?.[0]; if (f) read(f); }} />
      {file && createPortal(
        <div className="mn-sheet-wrap" onClick={close}>
          <div className="mn-sheet mn-imp-sheet" role="dialog" aria-modal="true" aria-label="Nhập sao kê" onClick={e => e.stopPropagation()}>
            <div className="mn-sheet-head">
              <div><b>Nhập sao kê</b><small>{file.name}</small></div>
            </div>
            {busy && !p && <p className="mn-sub">Đang đọc file…</p>}
            {error && <p className="mn-error">{error}</p>}
            {p && !result && (
              <>
                <p className="mn-imp-acc">
                  <b>{p.accountName}</b>{p.accountNumber ? ` ••${p.accountNumber.slice(-4)}` : ''}{p.period ? ` · ${p.period}` : ''}
                </p>
                <dl className="mn-imp">
                  <div><dt>Giao dịch trong file</dt><dd>{p.rows}</dd></div>
                  <div><dt>Thêm mới</dt><dd>{p.created}</dd></div>
                  <div><dt>Đã có từ ngân hàng</dt><dd>{p.matched}<small>{p.enriched ? `gắn thêm người nhận cho ${p.enriched}` : 'không đổi'}</small></dd></div>
                  {p.already > 0 && <div><dt>Đã nhập trước đây</dt><dd>{p.already}<small>bỏ qua</small></dd></div>}
                  <div><dt>Tự phân loại được</dt><dd>{p.categorized}</dd></div>
                  <div><dt>Chờ bạn chọn</dt><dd>{p.waiting}<small>theo từng người nhận</small></dd></div>
                </dl>
                <div className="mn-sheet-foot">
                  <span />
                  <button type="button" className="mn-link" onClick={close} disabled={busy}>Huỷ</button>
                  <button type="button" className="mn-btn" onClick={commit} disabled={busy || nothingNew}>
                    {busy ? 'Đang nhập…' : nothingNew ? 'Không có gì mới' : `Nhập ${p.created} giao dịch`}
                  </button>
                </div>
              </>
            )}
            {result && (
              <>
                <p className="mn-imp-done">
                  ✓ Đã thêm {result.created} giao dịch{result.enriched ? `, gắn người nhận cho ${result.enriched} giao dịch có sẵn` : ''}.
                </p>
                <p className="mn-sub">
                  {result.waiting
                    ? `${result.waiting} giao dịch chờ bạn chọn ở “Cần xem lại” — gom theo người nhận, mỗi người chọn một lần.`
                    : 'Tất cả đã được phân loại.'}
                </p>
                <div className="mn-sheet-foot"><span /><button type="button" className="mn-btn" onClick={close}>Xong</button></div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
