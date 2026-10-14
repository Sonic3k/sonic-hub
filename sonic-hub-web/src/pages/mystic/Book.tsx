/* Grandma's notebook, readable as she wrote it: every star's entry, paragraph by paragraph, in her words.
   Under each paragraph, on request, how it was digitized — the condition the app checks against a chart. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LEVEL_NAME, STARS, STAR_BY_ID, type Level, type StarDef } from '../../mystic/tuvi/engine/names';
import { useKb, type BookEntry, type BookPara, type FullKb } from '../../mystic/tuvi/kb/load';
import type { Rule } from '../../mystic/tuvi/engine/reading';

const GROUPS: { title: string; pick: (s: StarDef) => boolean }[] = [
  { title: '14 chính tinh', pick: s => s.kind === 'chinh' },
  { title: 'Lục cát · Tứ hóa · Lộc Mã', pick: s => ['van_xuong', 'van_khuc', 'ta_phu', 'huu_bat', 'thien_khoi', 'thien_viet', 'hoa_loc', 'hoa_quyen', 'hoa_khoa', 'hoa_ky', 'loc_ton', 'thien_ma'].includes(s.id) },
  { title: 'Lục sát', pick: s => ['kinh_duong', 'da_la', 'hoa_tinh', 'linh_tinh', 'dia_khong', 'dia_kiep'].includes(s.id) },
  { title: 'Tuần · Triệt', pick: s => s.kind === 'khong' },
  { title: 'Vòng Lộc Tồn (Bác Sĩ)', pick: s => s.ring === 'loc' },
  { title: 'Vòng Thái Tuế', pick: s => s.ring === 'tue' },
  { title: 'Vòng Tràng Sinh', pick: s => s.ring === 'sinh' },
];
const strip = (t: string) => t.replace(/^[-*•+]\s*/, '');
const firstTrait = (e: BookEntry) => e.paras.find(p => /^Tính cách/i.test(p.text))?.text.replace(/^Tính cách\s*[:-]?\s*/i, '') ?? strip(e.paras.find(p => p.kind !== 'meta')?.text ?? '');

export function BookIndex() {
  const kb = useKb();
  useEffect(() => { document.title = 'Sách của bà · Tử vi · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  if (!kb.data) return <div className="wrap page tv"><div className="card empty">{kb.isError ? 'Không tải được sách của bà.' : 'Đang mở sách của bà…'}</div></div>;
  const k = kb.data, shown = new Set<number>();
  const rest = STARS.filter(s => !GROUPS.some(g => g.pick(s)));
  const card = (s: StarDef) => {
    const e = k.entryOfStar.get(s.id);
    if (!e) return k.starAbout[s.id] || s.source === 'bo-sung'
      ? <div key={s.id} className="tv-entry-card missing"><b>{s.name}</b><p>Bà chưa viết mục này.</p><small>Có phần bổ sung trong lá số</small></div> : null;
    if (shown.has(e.line)) return null;
    shown.add(e.line);
    return (
      <Link key={s.id} className="tv-entry-card" to={`/huyen-hoc/tu-vi/sach/${e.line}`}>
        <b>{e.name}</b><p>{firstTrait(e)}</p><small>{e.paras.length} đoạn · {k.rules.filter(r => r.entry === e.line).length} câu luận</small>
      </Link>
    );
  };
  return (
    <div className="wrap page tv">
      <div className="ptitle"><h1>Sách của bà<small>{k.book.source.title}</small></h1></div>
      <p className="tv-sub">{k.entries.length} mục sao, viết dở năm 2011. <b>Lời bà giữ nguyên</b> — chỉ sửa những chữ bị lỗi khi chuyển phông chữ cũ. {k.book.source.note}</p>
      <div className="tv-row" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        <Link className="tv-btn ghost" to="/huyen-hoc/tu-vi/phan-1">Phần I · Lập lá số</Link>
        <Link className="tv-btn ghost" to="/huyen-hoc/tu-vi/tra-cuu">Tìm trong sách</Link>
      </div>
      {GROUPS.map(g => (
        <section key={g.title}>
          <div className="hd tv-sec-h"><h2>{g.title}</h2></div>
          <div className="tv-bookgrid">{STARS.filter(g.pick).map(card)}</div>
        </section>
      ))}
      <section><div className="hd tv-sec-h"><h2>Các sao khác</h2></div><div className="tv-bookgrid">{rest.map(card)}</div></section>
    </div>
  );
}

export function BookEntryPage() {
  const { line = '' } = useParams(), loc = useLocation();
  const kb = useKb();
  const e = kb.data?.entryByLine.get(Number(line));
  const hash = Number(loc.hash.replace('#p', '')) || null;
  useEffect(() => { if (e) document.title = `${e.name} · Sách của bà · Sonic Hub`; return () => { document.title = 'Sonic Hub'; }; }, [e]);
  useEffect(() => { if (hash) requestAnimationFrame(() => document.getElementById(`p${hash}`)?.scrollIntoView({ block: 'center' })); }, [hash, e]);
  if (!kb.data) return <div className="wrap page tv"><div className="card empty">{kb.isError ? 'Không tải được sách của bà.' : 'Đang mở sách của bà…'}</div></div>;
  if (!e) return <div className="wrap page tv"><div className="card empty">Không có mục này. <Link className="tv-link" to="/huyen-hoc/tu-vi/sach">Về mục lục</Link></div></div>;
  return <Entry k={kb.data} e={e} hash={hash} />;
}

function Entry({ k, e, hash }: { k: FullKb; e: BookEntry; hash: number | null }) {
  const idx = k.entries.indexOf(e), prev = k.entries[idx - 1], next = k.entries[idx + 1];
  const stars = (e.stars ?? [e.star]).map(id => STAR_BY_ID[id]).filter(Boolean);
  const head: BookPara[] = [], body: BookPara[] = [];
  let started = false;
  for (const p of e.paras) { if (!started && p.kind === 'meta') head.push(p); else { started = true; body.push(p); } }
  const sections = useMemo(() => {
    const out: { sec: string; paras: BookPara[] }[] = [];
    for (const p of body) {
      const label = p.sec ? p.sec.join(' · ') : '';
      if (!out.length || out[out.length - 1].sec !== label) out.push({ sec: label, paras: [] });
      out[out.length - 1].paras.push(p);
    }
    return out;
  }, [e]); // eslint-disable-line react-hooks/exhaustive-deps
  const supp = stars.map(s => ({ s, about: k.starAbout[s.id], rules: k.supplement.filter(r => r.star === s.id) })).filter(x => x.about || x.rules.length);
  return (
    <div className="wrap page tv">
      <div className="ptitle"><h1 style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>{e.name}</h1><span>mục {idx + 1}/{k.entries.length} · <Link className="tv-link" to="/huyen-hoc/tu-vi/sach">mục lục</Link></span></div>
      <div className="tv-entry">
        <div className="tv-entry-text">
          {(head.length > 0 || stars.some(s => s.bright)) && (
            <div className="tv-meta">
              {head.map(p => <div key={p.id} id={`p${p.id}`}>{strip(p.text)}</div>)}
              {stars.map(s => s.bright && (
                <div key={s.id} className="tv-bright">{stars.length > 1 && <span className="B">{s.name}</span>}
                  {(['M', 'V', 'D', 'B', 'H'] as Level[]).filter(l => s.bright?.[l]?.length).map(l => <span key={l} className={l}>{LEVEL_NAME[l]}: {s.bright![l]!.join(' ')}</span>)}</div>
              ))}
            </div>
          )}
          {sections.map((s, i) => (
            <div key={i}>
              {s.sec && <div className="tv-psec">Cung {s.sec}</div>}
              {s.paras.map(p => <Para key={p.id} id={p.id} text={strip(p.text)} rules={k.rulesByPara.get(p.id) ?? []} hl={hash === p.id} />)}
            </div>
          ))}
          <div className="tv-pn">
            {prev ? <Link to={`/huyen-hoc/tu-vi/sach/${prev.line}`}>‹ {prev.name}</Link> : <span />}
            {next ? <Link to={`/huyen-hoc/tu-vi/sach/${next.line}`}>{next.name} ›</Link> : <span />}
          </div>
        </div>
        <div className="tv-aside">
          <div className="tv-card" style={{ padding: '14px 16px' }}>
            <span className="tv-voice ba">Lời bà</span>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink2)', lineHeight: 1.55 }}>Mỗi đoạn được tách thành câu luận có điều kiện để so với lá số. Bấm số «câu luận» dưới đoạn để xem máy hiểu thế nào; đoạn nào có ghi chú «cần xem lại» là chỗ máy phải đoán ý bà.</p>
          </div>
          {supp.map(x => (
            <aside key={x.s.id} className="tv-bs">
              <h4><span className="tv-voice bs">Bổ sung · {x.s.name}</span></h4>
              <small>Kiến thức tử vi phổ thông — không phải ghi chép của bà.</small>
              {x.about && <p>{x.about}</p>}
              {x.rules.map(r => <div key={r.id} className="bsl">{r.text}<small>{r.at.join(', ')}</small></div>)}
            </aside>
          ))}
        </div>
      </div>
    </div>
  );
}

function Para({ id, text, rules, hl }: { id: number; text: string; rules: Rule[]; hl: boolean }) {
  const [open, setOpen] = useState(false);
  const review = rules.filter(r => r.review).length;
  return (
    <div className={`tv-para ${hl ? 'hl' : ''}`} id={`p${id}`}>
      <p>{text}
        {rules.length > 0
          ? <button type="button" className="n" onClick={() => setOpen(o => !o)}>{rules.length} câu luận{review ? ` · ${review} cần xem lại` : ''}</button>
          : <span className="n none">không luận</span>}
      </p>
      {open && (
        <div className="tv-para-rules">{rules.map(r => (
          <div key={r.id} className="tv-rule">
            <em>«{r.ctx ? `(${r.ctx}) ` : ''}{r.text}»</em> — ở {r.at.map(t => (t === '*' ? 'mọi cung' : t)).join(', ')} · {({ cat: 'tốt', hung: 'xấu', mixed: 'tốt xấu lẫn', trung: 'mô tả' })[r.tone]}
            <br /><code>{r.when ?? 'không viết được điều kiện — chỉ giữ lời'}</code>
            {r.review && <><br /><b>Ghi chú:</b> {r.review}</>}
          </div>))}</div>
      )}
    </div>
  );
}
