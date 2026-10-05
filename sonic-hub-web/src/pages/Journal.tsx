import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cdn } from '../api/client';
import { excerptOf, noteDate, noteHref, readMinutes, useNotes } from '../lib/queries';
import { dayMonthYear, isoDay, monthLabel } from '../lib/date';
import { PostRow } from './Home';

export default function Journal() {
  const notes = useNotes(), [sp] = useSearchParams(), all = notes.data ?? [];
  const kind = sp.get('kind'), cat = sp.get('cat'), year = sp.get('year'), tag = sp.get('tag'), filtered = !!(kind || cat || year || tag);
  const list = all.filter(n => (!kind || n.kind === kind) && (!cat || n.category === cat) && (!year || noteDate(n).startsWith(year)) && (!tag || n.tags?.some(t => t.name === tag)));
  const featured = !filtered ? list.find(n => n.kind === 'ARTICLE') : undefined, rest = list.filter(n => n !== featured);
  const groups = useMemo(() => { const g: [string, typeof rest][] = []; rest.forEach(n => { const m = monthLabel(noteDate(n) || '1970-01'); const last = g[g.length - 1]; if (last && last[0] === m) last[1].push(n); else g.push([m, [n]]); }); return g; }, [rest]);
  const first = all.length ? noteDate(all[all.length - 1]).slice(0, 4) : '';
  /* writing calendar: the last 26 weeks, one square per day */
  const heat = useMemo(() => {
    const per: Record<string, number> = {}; all.forEach(n => { const d = noteDate(n).slice(0, 10); if (d) per[d] = (per[d] ?? 0) + 1; });
    const end = new Date(); return Array.from({ length: 182 }, (_, i) => { const d = new Date(end); d.setDate(end.getDate() - (181 - i)); return per[isoDay(d)] ?? 0; });
  }, [all]);
  const tags = useMemo(() => { const t: Record<string, number> = {}; all.forEach(n => n.tags?.forEach(x => { t[x.name] = (t[x.name] ?? 0) + 1; })); return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 14); }, [all]);
  const older = all.filter(n => Date.now() - new Date(noteDate(n)).getTime() > 30 * 864e5), [pick, setPick] = useState(0);
  const old = older.length ? older[(pick * 7919 + older.length) % older.length] : undefined;
  const seg = (v: string | null, label: string) => <Link className={kind === v || (!kind && !v) ? 'on' : ''} to={v ? `/journal?kind=${v}` : '/journal'}>{label}</Link>;

  return (
    <div className="wrap page">
      <div className="ptitle"><h1>{cat || tag || (year ? `Viết năm ${year}` : 'Nhật ký')}</h1><span>{list.length} bài{!filtered && first ? ` · từ ${first}` : ''}</span><div className="seg">{seg(null, 'Tất cả')}{seg('ARTICLE', 'Bài viết')}{seg('JOURNAL', 'Ghi chép')}</div></div>
      <section className="lanes">
        <div>
          {notes.isLoading && <div className="card empty">Đang mở nhật ký…</div>}
          {!notes.isLoading && !list.length && <div className="card empty">Chưa có bài nào ở đây.</div>}
          {featured && <Link className="card featured" to={noteHref(featured)}>
            {featured.coverMedia ? <img src={cdn(featured.coverMedia.cdnUrl, 900)} alt="" /> : <div className="ph" />}
            <div className="body"><span className="cat">Mới nhất{featured.category ? ` · ${featured.category}` : ''}</span><h3>{featured.title || 'Không tiêu đề'}</h3><p>{excerptOf(featured)}</p><span className="by">{dayMonthYear(noteDate(featured))} · {readMinutes(featured)} phút đọc</span></div>
          </Link>}
          {groups.map(([m, ps]) => <div key={m}><div className="month">{m}</div><div className="posts">{ps.map(n => <PostRow key={n.id} n={n} />)}</div></div>)}
        </div>
        <aside className="rail">
          <div className="card" style={{ ['--c' as string]: 'var(--journal)' }}><h3><i />Lịch viết · 6 tháng qua</h3>
            <div className="heat">{heat.map((v, i) => <i key={i} className={v > 2 ? 'l3' : v > 1 ? 'l2' : v > 0 ? 'l1' : ''} />)}</div>
            <div className="meta">{heat.filter(v => v > 0).length} ngày có viết</div></div>
          {tags.length > 0 && <div className="card" style={{ ['--c' as string]: 'var(--journal)' }}><h3><i />Thẻ</h3><div className="chips">{tags.map(([t, k]) => <Link key={t} className={`chip ${tag === t ? 'on' : ''}`} to={`/journal?tag=${encodeURIComponent(t)}`}>{t} · {k}</Link>)}</div></div>}
          {old && <div className="card" style={{ ['--c' as string]: 'var(--journal)' }}><h3><i />Đọc lại một bài cũ<button type="button" onClick={() => setPick(p => p + 1)}>Đổi</button></h3>
            <Link to={noteHref(old)} style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, lineHeight: 1.35 }}>{old.title || excerptOf(old, 60)}</Link><div className="meta">{dayMonthYear(noteDate(old))}</div></div>}
        </aside>
      </section>
    </div>
  );
}
