/* Phần I — Lập lá số: grandma's own method for setting up a chart, the tables she copied, and the three places
   where her way differs from the common books (the chart page can switch between the two). */
import { useEffect } from 'react';
import { BRANCHES } from '../../mystic/tuvi/engine/names';
import { CUC, tuViPosition } from '../../mystic/tuvi/engine/chart';
import { useKb } from '../../mystic/tuvi/kb/load';
import phan1 from '../../mystic/tuvi/kb/phan1.json';

const POS: Record<number, [number, number]> = { 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 4: [2, 1], 9: [2, 4], 3: [3, 1], 10: [3, 4], 2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4] };
type Table = { cols: string[]; rows: (string | number)[][] };

function T({ t, serifCols = [] }: { t: Table; serifCols?: number[] }) {
  return (
    <div className="tv-table-wrap"><table className="tv-table">
      <thead><tr>{t.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k} className={serifCols.includes(k) ? 'serif' : ''}>{c}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

export default function Phan1() {
  const kb = useKb();
  useEffect(() => { document.title = 'Phần I · Lập lá số · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  useEffect(() => { if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView()); }, []);
  return (
    <div className="wrap page tv">
      <div className="ptitle"><h1>Phần I<small>Lập lá số tử vi — ghi chép của bà</small></h1></div>
      <p className="tv-sub">{phan1.source}</p>

      <div className="tv-step"><h3>Lục thập hoa giáp</h3><T t={phan1.hoaGiap as Table} serifCols={[1, 2, 3, 5]} /></div>
      {phan1.steps.map(s => (
        <div key={s.title} className="tv-step">
          <h3>{s.title}</h3>
          {'table' in s && s.table && <T t={s.table as Table} />}
          {s.lines?.map((l, i) => <p key={i}>{l}</p>)}
          {'note' in s && s.note && <p className="tv-note-bs" style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>Ghi chú của ứng dụng (không phải của bà): {s.note}</p>}
        </div>
      ))}

      <div className="tv-step">
        <h3>Vị trí của Tử Vi theo ngày sinh</h3>
        <p className="tv-muted" style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>Năm bảng của bà, vẽ lại trên lá số. Ứng dụng đã đối chiếu: cả 150 ngày trong năm bảng đều khớp với cách an Tử Vi mà máy dùng.</p>
        <div className="tv-mini">{([2, 3, 4, 5, 6] as const).map(n => {
          const days: Record<number, number[]> = {};
          for (let d = 1; d <= 30; d++) (days[tuViPosition(n, d)] ??= []).push(d);
          const name = Object.values(CUC).find(c => c.n === n)!.name;
          return (
            <div key={n} className="tv-mini-grid">
              {BRANCHES.map((b, i) => <div key={b} style={{ gridRow: POS[i][0], gridColumn: POS[i][1] }}><b>{b}</b>{(days[i] ?? []).join(' · ')}</div>)}
              <div className="c">{name}</div>
            </div>
          );
        })}</div>
      </div>

      <div className="tv-step">
        <h3>An Triệt Lộ</h3>
        <T t={{ cols: ['Tuổi (can)', 'Triệt ở giữa hai cung'], rows: phan1.triet }} />
      </div>

      <div className="tv-step">
        <h3>An Tuần, trung tinh, tiểu tinh, các vòng sao, tính hạn</h3>
        {!kb.data && <p className="tv-muted">Đang mở…</p>}
        {kb.data?.book.preface.map(l => <p key={l.id}>{l.text.replace(/\\-/g, '-').replace(/\\\)/g, ')')}</p>)}
      </div>

      <div className="tv-step" id="khac">
        <h3>Ba chỗ bà an khác sách phổ thông</h3>
        <p className="tv-muted" style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>Lá số mặc định an theo bà; nút «Theo sách» trên lá số đổi ba chỗ này sang cách của sách.</p>
        <div className="tv-diff">{phan1.differences.map(d => (
          <div key={d.what}><b>{d.what}</b><p><span className="tv-voice ba">Bà</span> {d.ba}</p><p><span className="tv-voice bs">Sách</span> {d.sach}</p></div>
        ))}</div>
      </div>
    </div>
  );
}
