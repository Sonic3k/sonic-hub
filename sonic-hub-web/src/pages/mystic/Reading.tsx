/* How a reading is shown. Grandma's sentences: her words in her typeface, a bar for good / bad, the reason each one
   applies, the paragraph it comes from, and — when the machine had to interpret her — how it read her.
   "Bổ sung" (not hers) always sits apart, in its own box and the plain UI typeface. */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Group, Match, Principle, ReadingLine } from '../../mystic/tuvi/engine/reading';
import { tuviApi, type AiReading, type AiRequest } from '../../api/tuvi';
import { isOwner } from '../../components/money/data';

const TONE_NAME = { cat: 'tốt', hung: 'xấu', mixed: 'tốt xấu lẫn', trung: 'mô tả' } as const;
export type ToneFilter = 'all' | 'cat' | 'hung';

export function Line({ m, hl, id }: { m: Match; hl?: boolean; id?: string }) {
  const [open, setOpen] = useState(false);
  const r = m.rule;
  return (
    <div className={`tv-line t-${r.tone} ${hl ? 'hl' : ''}`} id={id} title={TONE_NAME[r.tone]}>
      <p>{r.ctx && <span className="ctx">{r.ctx}</span>}{r.text}</p>
      <div className="tv-why">
        {m.why.map((w, i) => <span key={i}>{w}</span>)}
        {r.entry !== undefined && <span><Link to={`/huyen-hoc/tu-vi/sach/${r.entry}#p${r.para}`}>đoạn {r.para}</Link></span>}
        {r.review && <span><button type="button" onClick={() => setOpen(o => !o)}>{open ? 'ẩn cách hiểu' : 'cách máy hiểu câu này'}</button></span>}
      </div>
      {open && r.review && <div className="tv-review"><b>Cần người nhà xem lại:</b> {r.review}<code>{r.when}</code></div>}
    </div>
  );
}

export function Groups({ groups, filter = 'all', limit = 6, hlRef, entryLink = true }: { groups: Group[]; filter?: ToneFilter; limit?: number; hlRef?: string | null; entryLink?: boolean }) {
  const [openAll, setOpenAll] = useState<Record<string, boolean>>({});
  const shown = groups.map(g => ({ ...g, matches: g.matches.filter(m => filter === 'all' || m.rule.tone === filter || m.rule.tone === 'mixed') })).filter(g => g.matches.length);
  if (!shown.length) return <div className="tv-empty">{filter === 'all' ? 'Không có câu nào trong ghi chép của bà khớp với cung này.' : 'Không có câu nào thuộc loại này.'}</div>;
  return (
    <>
      {shown.map(g => {
        const all = openAll[g.key] || g.matches.some(m => m.rule.id === hlRef);
        const list = all ? g.matches : g.matches.slice(0, limit);
        return (
          <section key={g.key} className="tv-group">
            <div className="tv-gh"><b>{g.name}</b><span>{g.inPalace ? 'tại cung' : 'từ cung khác chiếu, hội'} · {g.matches.length} câu</span>
              {entryLink && g.entry !== undefined && <Link to={`/huyen-hoc/tu-vi/sach/${g.entry}`}>Mục {g.name} ›</Link>}</div>
            <div className="tv-lines">{list.map(m => <Line key={m.rule.id} m={m} hl={m.rule.id === hlRef} id={`r-${m.rule.id}`} />)}</div>
            {!all && g.matches.length > limit && <button type="button" className="tv-morebtn" onClick={() => setOpenAll(o => ({ ...o, [g.key]: true }))}>Xem thêm {g.matches.length - limit} câu</button>}
          </section>
        );
      })}
    </>
  );
}

export function BoSung({ about, groups, principles, title = 'Bổ sung' }: { about?: string; groups: Group[]; principles?: Principle[]; title?: string }) {
  const lines = groups.flatMap(g => g.matches.map(m => ({ g, m })));
  if (!about && !lines.length && !principles?.length) return null;
  return (
    <aside className="tv-bs">
      <h4><span className="tv-voice bs">{title}</span></h4>
      <small>Kiến thức tử vi phổ thông — không phải ghi chép của bà.</small>
      {about && <p>{about}</p>}
      {lines.map(({ g, m }) => <div key={m.rule.id} className="bsl">{m.rule.text}<small>{g.name} · {m.why.join(' · ')}</small></div>)}
      {principles?.map(p => <div key={p.id} className="pr"><b>{p.title}</b><p>{p.text}</p></div>)}
    </aside>
  );
}

// ── AI ───────────────────────────────────────────────────────────────────────

export interface AiInput { scope: string; viewYear: number; inputHash: string; chart: string; lines: ReadingLine[] }

/** An AI reading of one scope. Its first layer may only retell grandma's matched lines (each idea cites them);
 *  the second is labelled as added. Owner only: it calls a paid model. */
export function AiBox({ input, profileId, onRef, wide }: { input: AiInput; profileId: string | null; onRef: (ref: string) => void; wide?: boolean }) {
  const qc = useQueryClient();
  const owner = isOwner();
  const status = useQuery({ queryKey: ['tuvi-status'], queryFn: tuviApi.status, enabled: owner, staleTime: 600_000, retry: false });
  const stored = useQuery({ queryKey: ['tuvi-readings', profileId], queryFn: () => tuviApi.readings(profileId!), enabled: owner && !!profileId, staleTime: 60_000 });
  const [fresh, setFresh] = useState<AiReading | null>(null);
  const mine = fresh && fresh.scope === input.scope && fresh.viewYear === input.viewYear ? fresh
    : stored.data?.find(r => r.scope === input.scope && r.viewYear === input.viewYear) ?? null;
  const gen = useMutation({
    mutationFn: () => tuviApi.generate({ profileId, ...input } as AiRequest),
    onSuccess: r => { setFresh(r); if (profileId) qc.invalidateQueries({ queryKey: ['tuvi-readings', profileId] }); },
  });
  const refs = useMemo(() => new Set(input.lines.map(l => l.ref)), [input.lines]);
  if (!owner) return null;
  const ready = status.data?.ai;
  const baLines = input.lines.filter(l => l.source === 'ba').length;
  return (
    <div className={`tv-ai ${wide ? 'wide' : ''}`}>
      <h4><span className="tv-voice ai">AI luận giải</span></h4>
      {!mine && <p>AI đọc {baLines} câu của bà đã khớp và viết thành bài: phần đầu chỉ tóm lược lời bà, mỗi ý dẫn về câu gốc; phần sau là luận giải thêm, ghi rõ không phải của bà.</p>}
      {mine && <AiOut r={mine} refs={refs} onRef={onRef} />}
      {mine && mine.inputHash !== input.inputHash && <p className="tv-ai-caution">Lá số hoặc ghi chép đã đổi từ lúc viết bài này.</p>}
      {status.isError && <p className="tv-err">Không mở được AI (cần quyền chủ nhà).</p>}
      {status.data && !ready && <p className="tv-muted">AI chưa được bật trên máy chủ (thiếu ANTHROPIC_API_KEY).</p>}
      {ready && (
        <button type="button" className="tv-btn" disabled={gen.isPending || !baLines} onClick={() => gen.mutate()}>
          {gen.isPending ? <><span className="tv-spin" />Đang viết… (khoảng một phút)</> : mine ? 'Viết lại' : 'Nhờ AI luận giải'}
        </button>
      )}
      {gen.isError && <p className="tv-err">{(gen.error as Error).message}</p>}
      {!profileId && ready && <p className="tv-ai-caution">Lá số chưa lưu nên bài luận sẽ không được giữ lại.</p>}
    </div>
  );
}

function AiOut({ r, refs, onRef }: { r: AiReading; refs: Set<string>; onRef: (ref: string) => void }) {
  const sections = r.content?.sections ?? [];
  return (
    <div className="tv-ai-out">
      <div className="tv-ai-lbl"><span className="tv-voice ba">Tóm lược lời bà</span><span className="tv-voice bs">Luận thêm — không phải của bà</span></div>
      {sections.map((s, i) => (
        <div key={i} className="tv-ai-sec">
          <h5>{s.title}</h5>
          {s.ba?.map((b, k) => {
            const ok = (b.refs ?? []).filter(x => refs.has(x));
            /* an idea that cites none of her lines is not shown as hers */
            if (!ok.length) return <p key={`b${k}`} className="tv-ai-them">{b.text}</p>;
            return <p key={`b${k}`} className="tv-ai-ba">{b.text}<sup>{ok.map((x, n) => <a key={x} onClick={() => onRef(x)} title={x}>[{n + 1}]</a>)}</sup></p>;
          })}
          {s.them?.map((t, k) => <p key={`t${k}`} className="tv-ai-them">{t.text}</p>)}
        </div>
      ))}
      {r.content?.caution && <p className="tv-ai-caution">{r.content.caution}</p>}
      <div className="tv-ai-meta"><span>{r.model}</span>{r.createdAt && <span>{new Date(r.createdAt + (r.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}</div>
    </div>
  );
}
