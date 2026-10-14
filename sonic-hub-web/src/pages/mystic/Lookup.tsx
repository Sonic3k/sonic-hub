/* Tra cứu: find words anywhere in grandma's notebook, or ask what she wrote about a combination of stars in a palace. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PALACES, STARS, findTarget, type Target } from '../../mystic/tuvi/engine/names';
import { useKb } from '../../mystic/tuvi/kb/load';
import { fold } from '../../lib/text';

export default function Lookup() {
  const kb = useKb(), [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const picked = (sp.get('sao') ?? '').split(',').filter(Boolean);
  const palace = sp.get('cung') ?? '';
  const [starQ, setStarQ] = useState('');
  useEffect(() => { document.title = 'Tra cứu · Tử vi · Sonic Hub'; return () => { document.title = 'Sonic Hub'; }; }, []);
  useEffect(() => { const t = setTimeout(() => { const n = new URLSearchParams(sp); if (q.trim()) n.set('q', q.trim()); else n.delete('q'); setSp(n, { replace: true }); }, 300); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const setList = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const toggle = (id: string) => setList('sao', (picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id]).join(','));

  const hits = useMemo(() => {
    const needle = fold(sp.get('q') ?? '').trim();
    if (!kb.data || needle.length < 2) return [];
    const out: { e: string; line: number; id: number; sec: string; text: string }[] = [];
    for (const e of kb.data.entries) for (const p of e.paras) if (fold(p.text).includes(needle)) out.push({ e: e.name, line: e.line, id: p.id, sec: p.sec?.join(' · ') ?? '', text: p.text });
    return out;
  }, [kb.data, sp]);
  const combo = useMemo(() => {
    if (!kb.data || !picked.length) return [];
    const t = palace ? findTarget(palace) as Target : null;
    return kb.data.rules.filter(r => picked.every(id => r.stars.has(id)) && (!t || r.at.includes('*') || r.at.some(a => findTarget(a) === t)));
  }, [kb.data, picked.join(','), palace]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (text: string) => {
    const needle = fold(sp.get('q') ?? '').trim(); if (!needle) return text;
    const f = fold(text), i = f.indexOf(needle); if (i < 0) return text;
    return <>{text.slice(0, i)}<mark>{text.slice(i, i + needle.length)}</mark>{text.slice(i + needle.length)}</>;
  };
  const starList = STARS.filter(s => !starQ || fold(s.name).includes(fold(starQ)) || s.aliases?.some(a => fold(a).includes(fold(starQ))));
  return (
    <div className="wrap page tv">
      <div className="ptitle"><h1>Tra cứu<small>trong sách của bà</small></h1></div>
      <div className="tv-read">
        <div className="tv-read-main">
          <div className="tv-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm chữ: «con nuôi», «xuất ngoại», «Tử Phủ»…" autoFocus /></div>
          {!kb.data && <div className="card empty">Đang mở sách của bà…</div>}
          {(sp.get('q') ?? '').length >= 2 && kb.data && <div className="tv-k" style={{ marginBottom: 10 }}>{hits.length} đoạn có chữ này</div>}
          {hits.slice(0, 120).map(h => (
            <Link key={h.id} className="tv-hit" to={`/huyen-hoc/tu-vi/sach/${h.line}#p${h.id}`}>
              <small>{h.e}{h.sec ? ` · cung ${h.sec}` : ''}</small><p>{mark(h.text.replace(/^[-*]\s*/, ''))}</p>
            </Link>))}
          {picked.length > 0 && kb.data && (
            <>
              <div className="hd" style={{ marginTop: 28 }}><h2>Bà viết gì về {picked.map(id => STARS.find(s => s.id === id)?.name).join(' + ')}{palace ? ` ở cung ${palace}` : ''}</h2><span>{combo.length} câu</span></div>
              {!combo.length && <div className="tv-empty">Không có câu nào nói tới đủ các sao này{palace ? ' ở cung này' : ''}.</div>}
              {combo.slice(0, 200).map(r => (
                <Link key={r.id} className="tv-hit" to={`/huyen-hoc/tu-vi/sach/${r.entry}#p${r.para}`}>
                  <small>{kb.data!.entryName[r.entry!]} · {r.at.map(a => (a === '*' ? 'mọi cung' : a)).join(', ')}</small>
                  <p>{r.ctx ? `(${r.ctx}) ` : ''}{r.text}</p>
                </Link>))}
            </>
          )}
        </div>
        <div className="tv-read-side">
          <div className="tv-card">
            <h2>Tra theo tổ hợp sao</h2>
            <p>Chọn vài sao (và một cung nếu muốn) để xem mọi câu bà viết có đủ các sao ấy.</p>
            <select value={palace} onChange={e => setList('cung', e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--line)', padding: '0 10px', marginBottom: 10 }}>
              <option value="">Mọi cung</option>{[...PALACES, 'Thân', 'Hạn'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={starQ} onChange={e => setStarQ(e.target.value)} placeholder="Lọc tên sao…" style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--line)', padding: '0 10px' }} />
            <div className="tv-pick">{starList.map(s => <button key={s.id} type="button" className={picked.includes(s.id) ? 'on' : ''} onClick={() => toggle(s.id)}>{s.name}</button>)}</div>
            {picked.length > 0 && <button type="button" className="tv-link" onClick={() => setList('sao', '')}>Bỏ chọn</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
