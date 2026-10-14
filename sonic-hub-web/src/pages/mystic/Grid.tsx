/* The lá số drawn the classic way: twelve palaces around a centre, Tỵ at the top left, Dần at the bottom left. */
import { BRANCHES, LEVEL_MARK, STEMS, mod12 } from '../../mystic/tuvi/engine/names';
import { canChiName, type Chart } from '../../mystic/tuvi/engine/chart';
import { khongWeight } from '../../mystic/tuvi/engine/reading';
import { GIO } from '../../mystic/tuvi/params';

/** branch → [row, column] of the 4×4 board */
const POS: Record<number, [number, number]> = { 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 4: [2, 1], 9: [2, 4], 3: [3, 1], 10: [3, 4], 2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4] };
const ROLE_SHORT: Record<string, string> = { 'Phúc Đức': 'Phúc Đức', 'Điền Trạch': 'Điền Trạch', 'Quan Lộc': 'Quan Lộc', 'Nô Bộc': 'Nô Bộc', 'Thiên Di': 'Thiên Di', 'Tật Ách': 'Tật Ách', 'Tài Bạch': 'Tài Bạch', 'Tử Tức': 'Tử Tức', 'Phu Thê': 'Phu Thê', 'Huynh Đệ': 'Huynh Đệ', 'Phụ Mẫu': 'Phụ Mẫu', 'Mệnh': 'Mệnh' };
const HOA_SHORT: Record<string, string> = { 'Hóa Lộc': 'Lộc', 'Hóa Quyền': 'Quyền', 'Hóa Khoa': 'Khoa', 'Hóa Kỵ': 'Kỵ' };
const HOA_IDS = new Set(['hoa_loc', 'hoa_quyen', 'hoa_khoa', 'hoa_ky']);

export const triOf = (b: number) => [b, mod12(b + 4), mod12(b + 6), mod12(b + 8)];

/** marks: labels put on palaces (the đại hạn and tiểu hạn of the year being read) */
export default function Grid({ chart, name, selected, onSelect, marks = {} }: { chart: Chart; name: string; selected: number | null; onSelect: (b: number) => void; marks?: Record<number, string[]> }) {
  const tri = selected === null ? [] : triOf(selected);
  const variant = new Set(chart.variantStars);
  const { input: i } = chart;
  const solar = `${String(chart.solar[0]).padStart(2, '0')}/${String(chart.solar[1]).padStart(2, '0')}/${chart.solar[2]}`;
  const clock = i.calendar === 'solar' ? `${String(i.hour).padStart(2, '0')}:${String(i.minute ?? 0).padStart(2, '0')}` : '';
  return (
    <div className="tv-grid" role="grid" aria-label="Lá số tử vi">
      {chart.palaces.map(c => {
        const [r, col] = POS[c.branch];
        const main = c.stars.filter(s => s.kind === 'chinh');
        /* a Hóa shows as a tag on the star it transforms, not as a star of its own */
        const minor = c.stars.filter(s => s.kind === 'phu' && !s.ring && !HOA_IDS.has(s.id));
        const rings = c.stars.filter(s => s.ring).map(s => s.name);
        const good = [...minor.filter(s => s.tone === 'cat'), ...minor.filter(s => s.tone === 'trung')];
        const bad = minor.filter(s => s.tone === 'hung');
        const w = khongWeight(chart, c.branch);
        const cls = ['tv-cell', selected === c.branch ? 'sel' : tri.includes(c.branch) ? 'tri' : '', marks[c.branch] ? 'marked' : ''].join(' ');
        return (
          <button key={c.branch} type="button" className={cls} style={{ gridRow: r, gridColumn: col }} onClick={() => onSelect(c.branch)}
            aria-pressed={selected === c.branch} aria-label={`Cung ${c.role} tại ${BRANCHES[c.branch]}`}>
            <div className="tv-ch"><b>{ROLE_SHORT[c.role] ?? c.role}</b>{c.isThan && <em className="than">THÂN</em>}<span>{STEMS[c.stem]} {BRANCHES[c.branch]}</span></div>
            {(w.tuan || w.triet || marks[c.branch]) && <div className="tv-tags">
              {marks[c.branch]?.map(m => <i key={m} className="tv-tag han">{m}</i>)}
              {w.tuan && <i className="tv-tag" title={`Tuần — ${w.tuan}/10 phần (theo bà: dương tam thất, âm nhị bát)`}>Tuần</i>}
              {w.triet && <i className="tv-tag" title={`Triệt — ${w.triet}/10 phần (theo bà: dương tam thất, âm nhị bát)`}>Triệt</i>}</div>}
            <div className="tv-main">
              {main.length ? main.map(s => (
                <span key={s.id} className="tv-star">{s.name}{s.level && <i className={s.level}>{LEVEL_MARK[s.level]}</i>}{s.hoa && <em className={`tv-hoa ${s.hoa === 'Hóa Kỵ' ? 'ky' : ''}`}>{HOA_SHORT[s.hoa]}</em>}</span>
              )) : <span className="tv-vcd">vô chính diệu</span>}
            </div>
            <div className="tv-minor">
              {[good, bad].map((list, k) => (
                <div key={k}>{list.map(s => (
                  <span key={s.id} className={`t-${s.tone ?? 'trung'} ${variant.has(s.id) ? 'var' : ''}`} title={variant.has(s.id) ? 'An theo cách của bà — sách phổ thông an khác' : undefined}>
                    {s.name}{s.hoa ? ` (${HOA_SHORT[s.hoa]})` : ''}
                  </span>))}</div>
              ))}
            </div>
            <div className="tv-foot"><span className="ring">{rings.join(' · ')}</span><span className="dh">{c.daiHan[0]}</span></div>
          </button>
        );
      })}
      <div className="tv-center">
        <h2>{name || 'Lá số'}</h2>
        <dl>
          <dt>Dương lịch</dt><dd>{solar}{clock && ` · ${clock}`}</dd>
          <dt>Âm lịch</dt><dd>{chart.lunar.day}/{chart.lunar.month}{chart.lunar.leap ? ' (nhuận)' : ''} năm {canChiName(chart.stem, chart.branch)}</dd>
          <dt>Giờ</dt><dd>{GIO[chart.hour].n} ({GIO[chart.hour].span})</dd>
          <dt>Âm dương</dt><dd>{chart.amDuong}</dd>
          <dt>Mệnh</dt><dd>{chart.napAm.name}</dd>
          <dt>Cục</dt><dd>{chart.cuc.name}</dd>
          <dt>Mệnh chủ</dt><dd>{chart.menhChu}</dd>
          <dt>Thân chủ</dt><dd>{chart.thanChu}</dd>
          <dt>Thân cư</dt><dd>{chart.palaces[chart.than].role}</dd>
        </dl>
        <p className="tv-mini-info">{chart.lunar.day}/{chart.lunar.month} {canChiName(chart.stem, chart.branch)} · giờ {GIO[chart.hour].n}<br />{chart.amDuong} · {chart.napAm.name}<br />{chart.cuc.name}</p>
        {(chart.notes.length > 0 || chart.options.variant === 'sach') && (
          <p className="notes"><b>Không phải ghi chép của bà:</b> {[...(chart.options.variant === 'sach' ? ['An Hỏa Linh, Tứ Hóa tuổi Canh, Thiên Phúc tuổi Quý theo sách phổ thông.'] : []), ...chart.notes].join(' ')}</p>
        )}
      </div>
    </div>
  );
}
