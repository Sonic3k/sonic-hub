/* One person's lá số: the chart, then grandma's sentences palace by palace, the luck periods, and an overview.
   Opened from a link (/huyen-hoc/tu-vi/la-so?…) or from a saved profile (/huyen-hoc/tu-vi/la-so/:id). */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ageIn, buildChart, canChiName, daiHanAt, tieuHanAt, type Chart } from '../../mystic/tuvi/engine/chart';
import { BRANCHES, STEMS } from '../../mystic/tuvi/engine/names';
import {
  VIEWS, branchOfView, chartSummary, hashOf, lineOf, principlesFor, readHan, readView, yearCanChi,
  type Group, type PalaceReading, type ReadingLine, type View,
} from '../../mystic/tuvi/engine/reading';
import { useKb, type FullKb } from '../../mystic/tuvi/kb/load';
import { fromProfile, fromSearch, toProfileInput, toSearch, type ChartParams } from '../../mystic/tuvi/params';
import { tuviApi } from '../../api/tuvi';
import { isOwner } from '../../components/money/data';
import { usePersons } from '../../lib/queries';
import Grid from './Grid';
import { AiBox, BoSung, Groups, type AiInput, type ToneFilter } from './Reading';

type Tab = 'cung' | 'han' | 'tong';
const thisYear = () => new Date().getFullYear();

export default function ChartPage() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const profile = useQuery({ queryKey: ['tuvi-profile', id], queryFn: () => tuviApi.profile(id!), enabled: !!id, retry: false });
  const kb = useKb();
  const params = useMemo<ChartParams | null>(() => {
    if (!id) return fromSearch(sp);
    if (!profile.data) return null;
    const p = fromProfile(profile.data);
    if (sp.get('an')) p.options.variant = sp.get('an') === 'sach' ? 'sach' : 'ba';
    return p;
  }, [id, profile.data, sp]);
  const year = Number(sp.get('nam')) || thisYear();
  const built = useMemo(() => {
    if (!params) return null;
    try { return { chart: buildChart(params.input, { ...params.options, viewYear: year }) }; }
    catch (e) { return { error: (e as Error).message }; }
  }, [params, year]);

  useEffect(() => { document.title = `${params?.name || 'Lá số'} · Tử vi · Sonic Hub`; return () => { document.title = 'Sonic Hub'; }; }, [params?.name]);

  if (id && profile.isLoading) return <div className="wrap page tv"><div className="card empty">Đang mở lá số…</div></div>;
  if (id && profile.isError) return <div className="wrap page tv"><div className="card empty">Không mở được lá số đã lưu. <Link className="tv-link" to="/huyen-hoc/tu-vi">Lập lá số mới</Link></div></div>;
  if (!params || !built) return <div className="wrap page tv"><div className="card empty">Thiếu ngày giờ sinh. <Link className="tv-link" to="/huyen-hoc/tu-vi">Lập lá số</Link></div></div>;
  if ('error' in built) return <div className="wrap page tv"><div className="card empty">{built.error} <Link className="tv-link" to="/huyen-hoc/tu-vi">Sửa ngày sinh</Link></div></div>;
  return <ChartView chart={built.chart!} params={params} profileId={id ?? null} kb={kb.data} kbError={kb.isError} sp={sp} setSp={setSp} year={year} />;
}

function ChartView({ chart, params, profileId, kb, kbError, sp, setSp, year }: {
  chart: Chart; params: ChartParams; profileId: string | null; kb?: FullKb; kbError: boolean;
  sp: URLSearchParams; setSp: ReturnType<typeof useSearchParams>[1]; year: number;
}) {
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v === null || v === '') n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const tab = (sp.get('xem') as Tab) || 'cung';
  const view = (VIEWS.includes(sp.get('cung') as View) ? sp.get('cung') : 'Mệnh') as View;
  const [hl, setHl] = useState<string | null>(null);
  const owner = isOwner();
  const nav = useNavigate();

  const readings = useMemo(() => (kb ? Object.fromEntries(VIEWS.map(v => [v, readView(chart, kb, v, year)])) as Record<View, PalaceReading> : null), [chart, kb, year]);
  const principles = useMemo(() => (kb ? principlesFor(chart, kb) : []), [chart, kb]);
  const chartKey = useMemo(() => toSearch({ ...params, name: '', options: { ...chart.options, viewYear: year } }), [params, chart.options, year]);
  const selected = branchOfView(chart, view);
  const hanMarks = useMemo(() => {
    const m: Record<number, string[]> = {}, d = daiHanAt(chart, ageIn(chart, year)), t = tieuHanAt(chart, year);
    if (d !== null) (m[d] ??= []).push('Đại hạn');
    (m[t.branch] ??= []).push(t.dong ? `Đồng hạn ${year}` : `Tiểu hạn ${year}`);
    return m;
  }, [chart, year]);

  const pick = (b: number) => {
    const role = chart.palaces[b].role;
    const n = new URLSearchParams(sp); n.set('cung', role); n.set('xem', 'cung'); setSp(n, { replace: true });
    requestAnimationFrame(() => document.getElementById('doc')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const onRef = (ref: string) => {
    setHl(ref);
    requestAnimationFrame(() => document.getElementById(`r-${ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const i = params.input;
  const birth = i.calendar === 'solar'
    ? `${i.day}/${i.month}/${i.year} dương lịch, ${String(i.hour).padStart(2, '0')}:${String(i.minute ?? 0).padStart(2, '0')}`
    : `${i.day}/${i.month}${i.leap ? ' nhuận' : ''} năm ${canChiName(chart.stem, chart.branch)} âm lịch, giờ ${BRANCHES[i.hour]}`;

  return (
    <div className="wrap page tv">
      <div className="tv-chart-head">
        <div>
          <h1>{params.name || 'Lá số tử vi'}</h1>
          <p>{i.gender === 'nam' ? 'Nam' : 'Nữ'} · sinh {birth} · {chart.amDuong} · {chart.napAm.name}</p>
        </div>
        <div className="acts">
          <div className="seg" title="Cách an mấy sao mà bà an khác sách phổ thông">
            <a className={chart.options.variant === 'ba' ? 'on' : ''} onClick={() => set('an', null)}>An theo bà</a>
            <a className={chart.options.variant === 'sach' ? 'on' : ''} onClick={() => set('an', 'sach')}>Theo sách</a>
          </div>
          <Link className="tv-btn ghost" to={profileId ? `/huyen-hoc/tu-vi?sua=${profileId}` : `/huyen-hoc/tu-vi?${toSearch(params)}`}>Sửa</Link>
          {owner && !profileId && <SaveButton params={params} onSaved={pid => nav(`/huyen-hoc/tu-vi/la-so/${pid}`, { replace: true })} />}
          {owner && profileId && <DeleteButton id={profileId} />}
        </div>
      </div>

      <Grid chart={chart} name={params.name} selected={tab === 'cung' ? selected : null} onSelect={pick} marks={tab === 'han' ? hanMarks : undefined} />

      <div className="tv-tabs" id="doc">
        <div className="seg">
          <a className={tab === 'cung' ? 'on' : ''} onClick={() => set('xem', null)}>Luận từng cung</a>
          <a className={tab === 'han' ? 'on' : ''} onClick={() => set('xem', 'han')}>Vận hạn</a>
          <a className={tab === 'tong' ? 'on' : ''} onClick={() => set('xem', 'tong')}>Tổng quan</a>
        </div>
        <span className="tv-voice ba">Lời bà</span><span className="tv-voice bs">Bổ sung — không phải của bà</span>
        <span className="tv-caution">Tử vi để tham khảo, chiêm nghiệm; câu nào nói về tai ách nên đọc như lời nhắc giữ gìn.</span>
      </div>

      {!kb && !kbError && <div className="card empty">Đang mở sách của bà…</div>}
      {kbError && <div className="card empty">Không tải được sách của bà.</div>}
      {kb && readings && tab === 'cung' && (
        <PalaceTab chart={chart} view={view} readings={readings} principles={principles} hl={hl} onRef={onRef}
          onView={v => set('cung', v === 'Mệnh' ? null : v)} profileId={profileId} chartKey={chartKey} year={year} />
      )}
      {kb && tab === 'han' && <HanTab chart={chart} kb={kb} year={year} setYear={y => set('nam', y === thisYear() ? null : String(y))} hl={hl} onRef={onRef}
        onPalace={b => pick(b)} profileId={profileId} chartKey={chartKey} />}
      {kb && readings && tab === 'tong' && <TongTab chart={chart} kb={kb} readings={readings} principles={principles} onPalace={pick} profileId={profileId} chartKey={chartKey} year={year} onRef={onRef} hl={hl} />}
    </div>
  );
}

const linesOf = (groups: Group[], palace: string): ReadingLine[] => groups.flatMap(g => g.matches.map(m => lineOf(m, palace)));
const aiInput = (chart: Chart, chartKey: string, scope: string, year: number, lines: ReadingLine[]): AiInput => {
  const capped = lines.slice(0, 400);
  return { scope, viewYear: year, chart: chartSummary(chart, year), lines: capped, inputHash: hashOf(`${chartKey}|${scope}|${capped.map(l => l.ref).join(',')}`) };
};

function PalaceTab({ chart, view, readings, principles, hl, onRef, onView, profileId, chartKey, year }: {
  chart: Chart; view: View; readings: Record<View, PalaceReading>; principles: ReturnType<typeof principlesFor>;
  hl: string | null; onRef: (r: string) => void; onView: (v: View) => void; profileId: string | null; chartKey: string; year: number;
}) {
  const [filter, setFilter] = useState<ToneFilter>('all');
  useEffect(() => { setFilter('all'); }, [view]);
  const r = readings[view], c = chart.palaces[r.branch];
  const main = c.stars.filter(s => s.kind === 'chinh'), rest = c.stars.filter(s => s.kind !== 'chinh');
  const lines = [...linesOf(r.ba, view), ...linesOf(r.boSung, view), ...(view === 'Mệnh' ? principles.map(p => ({ ref: p.id, palace: view, source: 'bo-sung' as const, text: `${p.title}: ${p.text}`, why: '' })) : [])];
  return (
    <>
      <div className="tv-strip">{VIEWS.map(v => (
        <button key={v} type="button" className={v === view ? 'on' : ''} onClick={() => onView(v)}>{v === 'Thân' ? `Thân (${chart.palaces[chart.than].role})` : v}<small>{readings[v].counts.ba}</small></button>
      ))}</div>
      <div className="tv-read">
        <div className="tv-read-main">
          <div className="tv-phead"><h3>{view === 'Thân' ? 'Thân' : `Cung ${view}`}</h3>
            <span>{STEMS[c.stem]} {BRANCHES[c.branch]} · đại hạn {c.daiHan[0]}–{c.daiHan[1]}{view !== 'Thân' && c.isThan ? ' · Thân cư ở đây' : ''}{view === 'Thân' ? ` · cư cung ${c.role}` : ''}</span></div>
          <div className="tv-pstars">
            {main.length ? main.map(s => <span key={s.id} className="main">{s.name}{s.level ? ` · ${({ M: 'miếu', V: 'vượng', D: 'đắc', B: 'bình', H: 'hãm' })[s.level]}` : ''}{s.hoa ? ` · ${s.hoa}` : ''}</span>) : <span className="main">Vô chính diệu</span>}
            {rest.filter(s => !['hoa_loc', 'hoa_quyen', 'hoa_khoa', 'hoa_ky'].includes(s.id)).map(s => <span key={s.id}>{s.name}{s.hoa ? ` · ${s.hoa}` : ''}</span>)}
            {chart.tuan.includes(c.branch) && <span>Tuần</span>}{chart.triet.includes(c.branch) && <span>Triệt</span>}
          </div>
          <div className="tv-filter">
            <span className="tv-voice ba">Lời bà · {r.counts.ba} câu</span>
            <div className="seg">
              <a className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tất cả</a>
              <a className={filter === 'cat' ? 'on' : ''} onClick={() => setFilter('cat')}>Tốt · {r.counts.cat}</a>
              <a className={filter === 'hung' ? 'on' : ''} onClick={() => setFilter('hung')}>Xấu · {r.counts.hung}</a>
            </div>
          </div>
          <Groups groups={r.ba} filter={filter} hlRef={hl} />
        </div>
        <div className="tv-read-side">
          <BoSung about={r.about} groups={r.boSung} principles={view === 'Mệnh' ? principles : undefined} />
          <AiBox input={aiInput(chart, chartKey, view, year, lines)} profileId={profileId} onRef={onRef} />
        </div>
      </div>
    </>
  );
}

function HanTab({ chart, kb, year, setYear, hl, onRef, onPalace, profileId, chartKey }: {
  chart: Chart; kb: FullKb; year: number; setYear: (y: number) => void; hl: string | null; onRef: (r: string) => void;
  onPalace: (b: number) => void; profileId: string | null; chartKey: string;
}) {
  const h = useMemo(() => readHan(chart, kb, year), [chart, kb, year]);
  const order = [...chart.palaces].sort((a, b) => a.daiHan[0] - b.daiHan[0]);
  const birthLunar = chart.lunar.year;
  const tieu = chart.palaces[h.tieu.branch], dai = h.dai ? chart.palaces[h.dai.branch] : null;
  const starsOf = (b: number) => chart.palaces[b].stars.filter(s => s.kind === 'chinh').map(s => s.name).join(', ') || 'vô chính diệu';
  const lines = [...(h.dai ? [...linesOf(h.dai.ba, `Đại hạn ${dai!.role}`), ...linesOf(h.dai.boSung, `Đại hạn ${dai!.role}`)] : []),
    ...linesOf(h.tieu.ba, `Tiểu hạn ${tieu.role}`), ...linesOf(h.tieu.boSung, `Tiểu hạn ${tieu.role}`),
    ...['dai_han', 'tieu_han'].map(k => kb.principles[k]).filter(Boolean).map(p => ({ ref: p.id, palace: 'Hạn', source: 'bo-sung' as const, text: `${p.title}: ${p.text}`, why: '' }))];
  return (
    <>
      <div className="tv-filter">
        <div className="tv-years">
          <button type="button" onClick={() => setYear(year - 1)} aria-label="Năm trước">‹</button>
          <b>{year} · {yearCanChi(year)}</b>
          <button type="button" onClick={() => setYear(year + 1)} aria-label="Năm sau">›</button>
        </div>
        <span>tuổi {h.age} (tuổi mụ)</span>
        {year !== thisYear() && <a className="tv-link" onClick={() => setYear(thisYear())} style={{ cursor: 'pointer' }}>Về năm nay</a>}
      </div>
      <div className="tv-dh">{order.map(c => (
        <button key={c.branch} type="button" className={h.dai?.branch === c.branch ? 'now' : ''} onClick={() => setYear(birthLunar + c.daiHan[0] - 1)} title={`Đại hạn ${c.daiHan[0]}–${c.daiHan[1]} tuổi tại cung ${c.role}`}>
          <b>{c.daiHan[0]}–{c.daiHan[1]}</b><span>{c.role}</span>
        </button>))}</div>
      <div className="tv-han">
        <div className="tv-han-col">
          <h3>{dai ? `Đại hạn ${h.dai!.from}–${h.dai!.to} · cung ${dai.role}` : 'Chưa vào đại hạn đầu'}</h3>
          {dai && <span>{STEMS[dai.stem]} {BRANCHES[dai.branch]} · {starsOf(dai.branch)} · <a className="tv-link" onClick={() => onPalace(dai.branch)} style={{ cursor: 'pointer' }}>luận cung này ›</a></span>}
          {h.dai && <><Groups groups={h.dai.ba} hlRef={hl} /><BoSung groups={h.dai.boSung} principles={kb.principles.dai_han ? [kb.principles.dai_han] : []} /></>}
        </div>
        <div className="tv-han-col">
          <h3>{h.tieu.dong ? `Đồng hạn ${year}` : `Tiểu hạn ${year}`} · cung {tieu.role}</h3>
          <span>{STEMS[tieu.stem]} {BRANCHES[tieu.branch]} · {starsOf(tieu.branch)} · <a className="tv-link" onClick={() => onPalace(tieu.branch)} style={{ cursor: 'pointer' }}>luận cung này ›</a></span>
          <Groups groups={h.tieu.ba} hlRef={hl} />
          <BoSung groups={h.tieu.boSung} principles={kb.principles.tieu_han ? [kb.principles.tieu_han] : []} />
          <div className="tv-k" style={{ marginTop: 18 }}>Hạn từng tháng (theo cách bà ghi: nguyệt nghịch, thời thuận)</div>
          <div className="tv-months">{h.months.map((b, m) => <div key={m}><b>Tháng {m + 1}</b>{chart.palaces[b].role}</div>)}</div>
        </div>
      </div>
      <div style={{ marginTop: 24 }}><AiBox wide input={aiInput(chart, chartKey, `han-${year}`, year, lines)} profileId={profileId} onRef={onRef} /></div>
    </>
  );
}

function TongTab({ chart, kb, readings, principles, onPalace, profileId, chartKey, year, onRef, hl }: {
  chart: Chart; kb: FullKb; readings: Record<View, PalaceReading>; principles: ReturnType<typeof principlesFor>;
  onPalace: (b: number) => void; profileId: string | null; chartKey: string; year: number; onRef: (r: string) => void; hl: string | null;
}) {
  const order = [...chart.palaces].sort((a, b) => ((a.branch - chart.menh + 12) % 12) - ((b.branch - chart.menh + 12) % 12));
  const keyViews: View[] = ['Mệnh', 'Thân', 'Phúc Đức', 'Quan Lộc', 'Tài Bạch', 'Phu Thê'];
  const lines = [...keyViews.flatMap(v => [...linesOf(readings[v].ba, v), ...linesOf(readings[v].boSung, v)]),
    ...principles.map(p => ({ ref: p.id, palace: 'Tổng quan', source: 'bo-sung' as const, text: `${p.title}: ${p.text}`, why: '' }))];
  const general = ['menh_chu', 'than_chu', 'tam_phuong', 'mieu_ham'].map(k => kb.principles[k]).filter(Boolean);
  return (
    <div className="tv-read">
      <div className="tv-read-main">
        <div className="tv-k" style={{ marginBottom: 8 }}>Mười hai cung — số câu của bà khớp với lá số</div>
        <div className="tv-table-wrap"><table className="tv-table">
          <thead><tr><th>Cung</th><th>Tại</th><th>Chính tinh</th><th>Câu của bà</th><th>Tốt</th><th>Xấu</th></tr></thead>
          <tbody>{order.map(c => { const r = readings[c.role as View]; return (
            <tr key={c.branch} style={{ cursor: 'pointer' }} onClick={() => onPalace(c.branch)}>
              <td><b>{c.role}</b>{c.isThan ? ' · Thân' : ''}</td><td>{STEMS[c.stem]} {BRANCHES[c.branch]}</td>
              <td>{c.stars.filter(s => s.kind === 'chinh').map(s => s.name).join(', ') || <span className="tv-muted">vô chính diệu</span>}</td>
              <td>{r.counts.ba}</td><td style={{ color: 'var(--cat)' }}>{r.counts.cat}</td><td style={{ color: 'var(--hung)' }}>{r.counts.hung}</td>
            </tr>); })}</tbody>
        </table></div>
        <div className="tv-k" style={{ margin: '24px 0 8px' }}>Mệnh — những câu về chính tinh thủ Mệnh</div>
        <Groups groups={readings['Mệnh'].ba.filter(g => g.inPalace).slice(0, 3)} limit={4} hlRef={hl} />
      </div>
      <div className="tv-read-side">
        <BoSung title="Bổ sung · cách đọc lá số này" groups={[]} principles={principles} />
        <BoSung title="Bổ sung · khái niệm" groups={[]} principles={general} />
        <AiBox input={aiInput(chart, chartKey, 'tong-quan', year, lines)} profileId={profileId} onRef={onRef} />
      </div>
    </div>
  );
}

function SaveButton({ params, onSaved }: { params: ChartParams; onSaved: (id: string) => void }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(params.name), [personId, setPersonId] = useState(''), [note, setNote] = useState('');
  const persons = usePersons(), qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => tuviApi.create(toProfileInput({ ...params, name }, { personId: personId || null, note: note.trim() || null })),
    onSuccess: p => { qc.invalidateQueries({ queryKey: ['tuvi-profiles'] }); onSaved(p.id); },
  });
  if (!open) return <button type="button" className="tv-btn son" onClick={() => setOpen(true)}>Lưu lá số</button>;
  return (
    <div className="mn-sheet-wrap" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="mn-sheet tv">
        <div className="mn-sheet-head"><b>Lưu lá số</b></div>
        <div className="tv-form" style={{ marginTop: 12 }}>
          <label className="tv-f"><span>Tên</span><input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
          <label className="tv-f"><span>Người trong Angels Islands (không bắt buộc)</span>
            <select value={personId} onChange={e => setPersonId(e.target.value)}><option value="">— không —</option>
              {(persons.data ?? []).map(p => <option key={p.id} value={p.id}>{p.displayName || p.name}</option>)}</select></label>
          <label className="tv-f"><span>Ghi chú</span><input value={note} onChange={e => setNote(e.target.value)} placeholder="ví dụ: giờ sinh theo lời mẹ kể" /></label>
        </div>
        {save.isError && <p className="tv-err">{(save.error as Error).message}</p>}
        <div className="mn-sheet-foot"><span className="tv-muted" style={{ fontSize: 12.5 }}>Lá số đã lưu chỉ hiện trên máy của chủ nhà.</span>
          <button type="button" className="tv-btn ghost" onClick={() => setOpen(false)}>Huỷ</button>
          <button type="button" className="tv-btn son" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</button></div>
      </div>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [ask, setAsk] = useState(false), nav = useNavigate(), qc = useQueryClient();
  const del = useMutation({ mutationFn: () => tuviApi.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tuvi-profiles'] }); nav('/huyen-hoc/tu-vi', { replace: true }); } });
  if (!ask) return <button type="button" className="tv-btn ghost" onClick={() => setAsk(true)}>Xoá</button>;
  return <span className="tv-row" style={{ alignItems: 'center' }}><span className="tv-muted" style={{ fontSize: 13 }}>Xoá lá số và các bài luận?</span>
    <button type="button" className="tv-btn son" disabled={del.isPending} onClick={() => del.mutate()}>Xoá</button>
    <button type="button" className="tv-btn ghost" onClick={() => setAsk(false)}>Không</button></span>;
}
