/* Tử vi's front page: the birth form, grandma's book, and the charts kept for the family (owner only). */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leapOfYear, type BirthInput } from '../../mystic/tuvi/engine/chart';
import { lunarMonthLength } from '../../mystic/tuvi/engine/lunar';
import { STARS } from '../../mystic/tuvi/engine/names';
import { useKb } from '../../mystic/tuvi/kb/load';
import { GIO, chartHref, fromProfile, fromSearch, toProfileInput, type ChartParams } from '../../mystic/tuvi/params';
import { tuviApi, type TuViProfile } from '../../api/tuvi';
import { get } from '../../api/client';
import { isOwner } from '../../components/money/data';
import { usePersons } from '../../lib/queries';

const thisYear = () => new Date().getFullYear();
const blank = (): ChartParams => ({ name: '', input: { gender: 'nam', calendar: 'solar', year: 1990, month: 1, day: 1, hour: 12, minute: 0 }, options: { variant: 'ba', leapMonth: 'same', tyNextDay: true, viewYear: thisYear() } });

export default function TuViHome() {
  const [sp] = useSearchParams();
  const editId = sp.get('sua');
  const editing = useQuery({ queryKey: ['tuvi-profile', editId], queryFn: () => tuviApi.profile(editId!), enabled: !!editId });
  const initial = useMemo(() => (editId ? (editing.data ? fromProfile(editing.data) : null) : fromSearch(sp) ?? blank()), [editId, editing.data, sp]);
  useEffect(() => { document.title = 'Tử vi · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  return (
    <div className="wrap page tv">
      <div className="ptitle"><h1>Tử vi<small>theo ghi chép của bà</small></h1></div>
      <div className="tv-home">
        <div className="tv-card">
          <h2>{editId ? 'Sửa lá số' : 'Lập lá số'}</h2>
          <p>An sao theo đúng phần «Lập lá số» bà viết. Ngày âm lịch tính theo lịch Việt Nam (múi giờ +7).</p>
          {initial ? <BirthForm key={editId ?? sp.toString()} initial={initial} profile={editing.data ?? null} /> : <div className="tv-muted">Đang mở…</div>}
        </div>
        <BookCard />
      </div>
      {isOwner() && <Saved />}
    </div>
  );
}

function BirthForm({ initial, profile }: { initial: ChartParams; profile: TuViProfile | null }) {
  const [p, setP] = useState<ChartParams>(initial);
  const [personId, setPersonId] = useState(profile?.personId ?? '');
  const nav = useNavigate(), qc = useQueryClient(), persons = usePersons();
  const i = p.input;
  const setI = (patch: Partial<BirthInput>) => setP(x => ({ ...x, input: { ...x.input, ...patch } }));
  const setO = (patch: Partial<ChartParams['options']>) => setP(x => ({ ...x, options: { ...x.options, ...patch } }));
  const solar = i.calendar === 'solar';
  const leap = !solar ? leapOfYear(i.year) : 0;
  const maxDay = solar ? new Date(Date.UTC(i.year, i.month, 0)).getUTCDate() : (lunarMonthLength(i.month, i.year, !!i.leap) || 30);
  const error = !Number.isInteger(i.year) || i.year < 1900 || i.year > 2100 ? 'Năm sinh từ 1900 đến 2100.'
    : i.day > maxDay ? `Tháng này chỉ có ${maxDay} ngày.`
      : !solar && i.leap && leap !== i.month ? (leap ? `Năm ${i.year} chỉ nhuận tháng ${leap}.` : `Năm ${i.year} không có tháng nhuận.`) : '';
  const update = useMutation({
    mutationFn: () => tuviApi.update(profile!.id, toProfileInput(p, { personId: personId || null, note: profile!.note })),
    onSuccess: r => { qc.invalidateQueries({ queryKey: ['tuvi-profiles'] }); qc.invalidateQueries({ queryKey: ['tuvi-profile', r.id] }); nav(`/huyen-hoc/tu-vi/la-so/${r.id}`); },
  });
  /* a person in Angels Islands: their name and birthday fill the form */
  const pickPerson = async (id: string) => {
    setPersonId(id);
    if (!id) return;
    const d = await get<{ name: string; displayName?: string | null; birthDay?: number | null; birthMonth?: number | null; birthYear?: number | null }>(`/persons/${id}`).catch(() => null);
    if (!d) return;
    setP(x => ({ ...x, name: d.displayName || d.name, input: { ...x.input, calendar: 'solar', leap: false, ...(d.birthDay ? { day: d.birthDay } : {}), ...(d.birthMonth ? { month: d.birthMonth } : {}), ...(d.birthYear ? { year: d.birthYear } : {}) } }));
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (error) return;
    if (profile) update.mutate(); else nav(chartHref(p));
  };
  const nums = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  return (
    <form className="tv-form" onSubmit={submit}>
      <label className="tv-f"><span>Họ tên</span><input value={p.name} onChange={e => setP(x => ({ ...x, name: e.target.value }))} placeholder="không bắt buộc" /></label>
      {!!persons.data?.length && (
        <label className="tv-f"><span>Hoặc lấy từ người trong Angels Islands</span>
          <select value={personId} onChange={e => pickPerson(e.target.value)}><option value="">— chọn người —</option>
            {persons.data.map(x => <option key={x.id} value={x.id}>{x.displayName || x.name}</option>)}</select></label>
      )}
      <div className="tv-f half"><span>Giới tính</span>
        <div className="seg"><a className={i.gender === 'nam' ? 'on' : ''} onClick={() => setI({ gender: 'nam' })}>Nam</a><a className={i.gender === 'nu' ? 'on' : ''} onClick={() => setI({ gender: 'nu' })}>Nữ</a></div></div>
      <div className="tv-f half"><span>Ngày sinh theo</span>
        <div className="seg">
          <a className={solar ? 'on' : ''} onClick={() => setI({ calendar: 'solar', leap: false, hour: 12, minute: 0 })}>Dương lịch</a>
          <a className={!solar ? 'on' : ''} onClick={() => setI({ calendar: 'lunar', hour: 6 })}>Âm lịch</a>
        </div></div>
      <label className="tv-f third"><span>Ngày</span><select value={i.day} onChange={e => setI({ day: +e.target.value })}>{nums(1, solar ? 31 : 30).map(n => <option key={n}>{n}</option>)}</select></label>
      <label className="tv-f third"><span>Tháng</span><select value={i.month} onChange={e => setI({ month: +e.target.value })}>{nums(1, 12).map(n => <option key={n}>{n}</option>)}</select></label>
      <label className="tv-f third"><span>Năm</span><input type="number" inputMode="numeric" value={i.year} onChange={e => setI({ year: +e.target.value })} min={1900} max={2100} /></label>
      {!solar && (
        <label className="tv-f tv-check" style={{ flexDirection: 'row' }}>
          <input type="checkbox" checked={!!i.leap} onChange={e => setI({ leap: e.target.checked })} disabled={!leap && !i.leap} />
          Tháng nhuận {leap ? <span className="tv-muted">(năm {i.year} nhuận tháng {leap})</span> : <span className="tv-muted">(năm {i.year} không nhuận)</span>}
        </label>
      )}
      {solar
        ? <label className="tv-f half"><span>Giờ sinh</span><input type="time" value={`${String(i.hour).padStart(2, '0')}:${String(i.minute ?? 0).padStart(2, '0')}`}
            onChange={e => { const [h, m] = e.target.value.split(':').map(Number); if (Number.isInteger(h)) setI({ hour: h, minute: m || 0 }); }} required /></label>
        : <label className="tv-f half"><span>Giờ sinh</span><select value={i.hour} onChange={e => setI({ hour: +e.target.value })}>{GIO.map(g => <option key={g.i} value={g.i}>Giờ {g.n} ({g.span})</option>)}</select></label>}
      <div className="tv-f half"><span>&nbsp;</span>{solar && <span className="tv-muted" style={{ fontSize: 12.5, paddingTop: 10 }}>= giờ {GIO[Math.floor(((i.hour) + 1) / 2) % 12].n}</span>}</div>

      <details className="tv-more">
        <summary>Tuỳ chọn an sao</summary>
        <div className="tv-more-in">
          <div className="tv-opt"><span className="tv-k">Mấy sao bà an khác sách</span>
            <div className="seg"><a className={p.options.variant === 'ba' ? 'on' : ''} onClick={() => setO({ variant: 'ba' })}>Theo bà</a><a className={p.options.variant === 'sach' ? 'on' : ''} onClick={() => setO({ variant: 'sach' })}>Theo sách</a></div>
            <small>Hỏa Tinh – Linh Tinh, Tứ Hóa tuổi Canh, Thiên Phúc tuổi Quý. <Link className="tv-link" to="/huyen-hoc/tu-vi/phan-1#khac">Xem chỗ khác</Link></small></div>
          <div className="tv-opt"><span className="tv-k">Sinh tháng nhuận</span>
            <select value={p.options.leapMonth} onChange={e => setO({ leapMonth: e.target.value as 'same' | 'split15' })} style={{ height: 38, borderRadius: 8, border: '1px solid var(--line)', padding: '0 10px' }}>
              <option value="same">Tính như tháng đó</option><option value="split15">Từ ngày 16 tính sang tháng sau</option></select>
            <small className="tv-note-bs">Bà không ghi cách tính — đây là tuỳ chọn của ứng dụng.</small></div>
          <div className="tv-opt"><span className="tv-k">Sinh từ 23 giờ đến 24 giờ</span>
            <select value={p.options.tyNextDay ? '1' : '0'} onChange={e => setO({ tyNextDay: e.target.value === '1' })} style={{ height: 38, borderRadius: 8, border: '1px solid var(--line)', padding: '0 10px' }}>
              <option value="1">Giờ Tý của ngày hôm sau</option><option value="0">Giờ Tý của chính ngày đó</option></select>
            <small className="tv-note-bs">Bà không ghi cách tính — đây là tuỳ chọn của ứng dụng.</small></div>
        </div>
      </details>
      <div className="tv-form-foot">
        <button type="submit" className="tv-btn son" disabled={!!error || update.isPending}>{profile ? (update.isPending ? 'Đang lưu…' : 'Lưu và mở lá số') : 'Lập lá số'}</button>
        {error && <span className="tv-err">{error}</span>}
        {update.isError && <span className="tv-err">{(update.error as Error).message}</span>}
      </div>
    </form>
  );
}

function BookCard() {
  const kb = useKb();
  const mains = STARS.filter(s => s.kind === 'chinh');
  const paras = kb.data?.entries.reduce((n, e) => n + e.paras.length, 0);
  const tuVi = kb.data?.entryOfStar.get('tu_vi');
  const quote = tuVi?.paras.find(p => p.text.includes('ngôi Đế cực'))?.text.replace(/^-\s*/, '');
  return (
    <div className="tv-card tv-book-card">
      <span className="tv-voice ba">Sách của bà</span>
      <h2 style={{ marginTop: 8 }}>Luận Tử Vi</h2>
      <p>Bà viết dở năm 2011: phần lập lá số, rồi từng sao, luận ở từng cung. Mọi câu đều được số hoá để so với lá số — giữ nguyên lời bà.</p>
      {kb.data && <div className="tv-stats"><div><b>{kb.data.entries.length}</b><span>mục sao</span></div><div><b>{paras?.toLocaleString('vi-VN')}</b><span>đoạn</span></div><div><b>{kb.data.rules.length.toLocaleString('vi-VN')}</b><span>câu luận</span></div></div>}
      {quote && <blockquote>{quote}<small>— mục Tử Vi</small></blockquote>}
      <div className="tv-chips">{mains.map(s => <Link key={s.id} className="tv-chip" to={kb.data?.entryOfStar.get(s.id) ? `/huyen-hoc/tu-vi/sach/${kb.data.entryOfStar.get(s.id)!.line}` : '/huyen-hoc/tu-vi/sach'}>{s.name}</Link>)}</div>
      <div className="tv-row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
        <Link className="tv-btn ghost" to="/huyen-hoc/tu-vi/sach">Đọc sách của bà</Link>
        <Link className="tv-btn ghost" to="/huyen-hoc/tu-vi/tra-cuu">Tra cứu</Link>
        <Link className="tv-btn ghost" to="/huyen-hoc/tu-vi/phan-1">Phần I · An sao</Link>
      </div>
      <div className="tv-legend">
        <p><span className="tv-voice ba">Lời bà</span> — nguyên văn của bà, kiểu chữ có chân, vạch son bên trái. Không câu nào bị viết lại.</p>
        <p><span className="tv-voice bs">Bổ sung</span> — kiến thức tử vi phổ thông và luận giải của AI, luôn tách riêng, ghi rõ không phải của bà.</p>
      </div>
    </div>
  );
}

function Saved() {
  const q = useQuery({ queryKey: ['tuvi-profiles'], queryFn: tuviApi.profiles, staleTime: 60_000, retry: false });
  if (q.isError || !q.data?.length) return null;
  return (
    <section className="tv-saved">
      <div className="hd"><h2>Lá số đã lưu</h2><span>{q.data.length}</span></div>
      <div className="tv-saved-list">{q.data.map(p => (
        <Link key={p.id} className="tv-saved-item" to={`/huyen-hoc/tu-vi/la-so/${p.id}`}>
          <b>{p.name}</b>
          <small>{p.gender === 'nam' ? 'Nam' : 'Nữ'} · {p.day}/{p.month}/{p.year}{p.calendar === 'lunar' ? ' âm lịch' : ''}{p.personName && p.personName !== p.name ? ` · ${p.personName}` : ''}</small>
        </Link>))}</div>
    </section>
  );
}
