/* Nhật ký: what he wrote, under the year it was written. A note is led by its day and its opening words (most of
   them are named after their date); the year at the left stays in view with the months that have writing. With no
   filter the page opens on one old note, pulled out at random to read again. */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cdn, pic } from '../api/client';
import type { Note } from '../types';
import { excerptOf, firstLine, noteDate, noteHref, textOf, readMinutes, useNotes } from '../lib/queries';
import { dayMonthYear } from '../lib/date';
import { eraClass } from '../lib/era';
import { useMoment } from '../lib/moment';
import { useGoTo } from '../lib/scroll';

/** a note named only after its day ("Sonic note · 9/4/2016") has nothing to add to the date beside it */
const namedByDate = (n: Note) => !n.title || /^Sonic note\b/i.test(n.title);
const authorOf = (n: Note) => n.authorPersonName || n.authorName || '';

export default function Journal() {
  const notes = useNotes(), [sp] = useSearchParams(), all = notes.data ?? [], { moment, picked } = useMoment();
  const kind = sp.get('kind'), cat = sp.get('cat'), year = sp.get('year'), tag = sp.get('tag'), filtered = !!(kind || cat || year || tag);
  const list = all.filter(n => (!kind || n.kind === kind) && (!cat || n.category === cat) && (!year || noteDate(n).startsWith(year)) && (!tag || n.tags?.some(t => t.name === tag)));
  // newest first, year by year
  const years = useMemo(() => {
    const g: [number, Note[]][] = [];
    list.forEach(n => { const y = +noteDate(n).slice(0, 4) || 0, last = g[g.length - 1]; if (last && last[0] === y) last[1].push(n); else g.push([y, [n]]); });
    return g;
  }, [list]);
  // a different page each day, and another one on asking
  const older = all.filter(n => Date.now() - new Date(noteDate(n)).getTime() > 30 * 864e5), [turn, setTurn] = useState(() => Math.floor(Date.now() / 864e5));
  const old = !filtered && older.length ? older[(turn * 7919 + older.length) % older.length] : undefined;
  // a day was picked on the calendar: the list goes to its year (the nearest one that has writing)
  const here = picked && moment && !filtered && years.length ? years.reduce((a, b) => (Math.abs(b[0] - moment.y) < Math.abs(a[0] - moment.y) ? b : a))[0] : 0;
  useGoTo(here ? `jy${here}` : '');
  const seg = (v: string | null, label: string) => <Link className={kind === v || (!kind && !v) ? 'on' : ''} to={v ? `/journal?kind=${v}` : '/journal'}>{label}</Link>;

  return (
    <div className="wrap page jn">
      <header className="jn-head"><h1>{cat || tag || (year ? `Viết năm ${year}` : 'Nhật ký')}</h1>{all.some(n => n.kind === 'ARTICLE') && all.some(n => n.kind === 'JOURNAL') && <div className="seg">{seg(null, 'Tất cả')}{seg('ARTICLE', 'Bài viết')}{seg('JOURNAL', 'Ghi chép')}</div>}</header>
      {notes.isLoading && <p className="jn-wait">Đang mở nhật ký…</p>}
      {!notes.isLoading && !list.length && <p className="jn-wait">Chưa có bài nào ở đây. <Link to="/journal">Xem tất cả</Link></p>}

      {old && <section className="jn-again">
        <div className="jn-again-hd"><h2>Đọc lại một trang cũ</h2><button type="button" onClick={() => setTurn(t => t + 1)}>Trang khác</button></div>
        <Link className="jn-sheet" to={noteHref(old)}>
          <span>{dayMonthYear(noteDate(old))}{!namedByDate(old) ? ` · ${old.title}` : ''}</span>
          <p>{textOf(old).slice(0, 330).replace(/\s+\S*$/, '')}…</p>
          <i>Đọc tiếp</i>
        </Link>
      </section>}

      {years.map(([y, ns]) => {
        const months = new Set(ns.map(n => +noteDate(n).slice(5, 7)));
        return (
          <section key={y} id={`jy${y}`} className={`jn-year ${eraClass(y)} ${y === here ? 'here' : ''}`}>
            <div className="jn-yl">
              <b>{y}</b>
              <div className="jn-months" aria-label={`Các tháng có viết trong năm ${y}`}>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => months.has(m)
                ? <a key={m} href={`#jm${y}-${m}`} onClick={e => { e.preventDefault(); document.getElementById(`jm${y}-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{m}</a>
                : <span key={m}>{m}</span>)}</div>
            </div>
            <div className="jn-list">{ns.map((n, i) => { const m = +noteDate(n).slice(5, 7), first = i === 0 || +noteDate(ns[i - 1]).slice(5, 7) !== m; return <Entry key={n.id} n={n} id={first ? `jm${y}-${m}` : undefined} />; })}</div>
          </section>);
      })}
    </div>
  );
}

/** One thing written: its day, then its title — or, for a note named after its date, its opening words. */
export function Entry({ n, id }: { n: Note; id?: string }) {
  const d = noteDate(n), byDate = namedByDate(n), cover = pic(n.coverMedia);
  const lead = byDate ? firstLine(n, 120) : '', rest = byDate ? textOf(n).slice(lead.replace(/…$/, '').length).trim().slice(0, 190) : excerptOf(n, 200);
  const meta = [authorOf(n), n.series && !byDate ? n.series : '', n.category, `${readMinutes(n)} phút đọc`].filter(Boolean).join(' · ');
  return (
    <Link className="jn-row" to={noteHref(n)} id={id}>
      <span className="jn-d"><b>{+d.slice(8, 10) || ''}</b><i>tháng {+d.slice(5, 7) || ''}</i></span>
      <span className="jn-b">
        <b>{byDate ? lead : n.title}</b>
        {rest && <span>{rest}</span>}
        <small>{meta}</small>
      </span>
      {cover && <img src={cdn(cover, 240)} alt="" loading="lazy" />}
    </Link>
  );
}
