/* Giấc mơ: what he dreamt, a day at a time (the night's dreams, and a nap's). A dream did not happen, so it stays apart from Ký ức: its page sets
   the dream as he told it, and under it, ruled off, what it calls up in his waking life — the one part that is real —
   then the real events it calls up. Written from what he tells Claude, corrected in the admin; here only read. */
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import type { Dream } from '../types';
import { eraClass } from '../lib/era';
import { useMoment } from '../lib/moment';
import { useGoTo } from '../lib/scroll';
import { dreamDay, dreamHref, dreamName } from '../lib/dreams';
import { YearGrid } from '../components/Paper';
import { EventsAround, eventHref, eventWhen } from './Events';

const T = 10 * 60_000;
const yearOf = (d: Dream) => +d.dreamtOn.slice(0, 4);
const nameOf = (p: { name: string; displayName?: string | null }) => p.displayName || p.name;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Thứ Hai, 23 tháng 11" */
const dayLine = (iso: string) => cap(new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }));
const paragraphs = (text?: string | null) => (text ?? '').split(/\n+/).filter(p => p.trim()).map((p, k) => <p key={k}>{p}</p>);

/** every dream, the newest day first, each with who is in it and the events it calls up (its texts come with the dream) */
export function useDreams() {
  return useQuery({ queryKey: ['dreams'], staleTime: T, queryFn: () => hub.dreams({ inclPersons: true, inclEvents: true }) });
}

// ── the list ─────────────────────────────────────────────────────────────────

/* Year by year, the newest first: each dream a dated line with its opening, so the log reads down like the notebook
   it is. A search is one list, the best match first. */
export function DreamsIndex() {
  const all = useDreams(), { moment, picked } = useMoment();
  const [sp, setSp] = useSearchParams();
  const year = Number(sp.get('year')), person = sp.get('person'), q = sp.get('q') ?? '';
  const [typed, setTyped] = useState(q);
  const found = useQuery({ queryKey: ['dreams-q', q], enabled: !!q, staleTime: T, queryFn: () => hub.dreams({ q, inclPersons: true, inclEvents: true }) });
  const base = q ? found.data ?? [] : all.data ?? [];
  const list = base.filter(d => (!year || yearOf(d) === year) && (!person || d.persons?.some(p => p.id === person)));
  const groups = useMemo(() => {
    if (q) return [{ y: 0, list }];
    const g: { y: number; list: Dream[] }[] = [];
    list.forEach(d => { const y = yearOf(d), last = g[g.length - 1]; if (last && last.y === y) last.list.push(d); else g.push({ y, list: [d] }); });
    return g;
  }, [list, q]);
  const set = (k: string, v: string | null) => setSp(prev => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; });
  const who = person ? (all.data ?? []).flatMap(d => d.persons ?? []).find(p => p.id === person) : undefined;
  const title = q ? `“${q}”` : who ? `Giấc mơ có ${nameOf(who)}` : year ? `Giấc mơ năm ${year}` : 'Giấc mơ';
  const filtered = !!(year || person || q), loading = all.isLoading || (!!q && found.isLoading);
  // a day was picked on the calendar: the list goes to its year (the nearest one that has dreams)
  const here = picked && moment && !filtered && groups.length ? groups.reduce((a, b) => (Math.abs(b.y - moment.y) < Math.abs(a.y - moment.y) ? b : a)).y : 0;
  useGoTo(here ? `dy${here}` : '');

  return (
    <div className="wrap page mm dr">
      <header className="mm-head"><h1>{title}</h1>
        <form className="msearch" onSubmit={ev => { ev.preventDefault(); set('q', typed.trim() || null); }}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input value={typed} onChange={ev => setTyped(ev.target.value)} placeholder="Tìm trong giấc mơ…" />
          {q && <button type="button" onClick={() => { setTyped(''); set('q', null); }}>×</button>}
        </form>
      </header>
      {loading && <p className="jn-wait">Đang mở…</p>}
      {!loading && !list.length && <p className="jn-wait">{q ? 'Không thấy giấc mơ nào khớp.' : 'Chưa có giấc mơ nào ở đây.'}</p>}
      {groups.map(g => (
        <section key={g.y} id={g.y ? `dy${g.y}` : undefined} className={`mm-year ${g.y ? eraClass(g.y) : ''} ${g.y === here ? 'here' : ''}`}>
          {g.y > 0 && <div className="mm-yh"><b>{g.y}</b></div>}
          <div className="mm-rows">{g.list.map(d => <DreamLine key={d.id} d={d} />)}</div>
        </section>))}
    </div>
  );
}

/** A dream as a dated line: the day, its title and opening, who is in it, what it calls up. */
export function DreamLine({ d }: { d: Dream }) {
  const meta = [(d.persons ?? []).map(nameOf).join(', '), (d.events ?? []).map(e => `gợi về ${e.title}`).join(', ')].filter(Boolean);
  return (
    <Link className="mm-line dr-line" to={dreamHref(d)}>
      <span className="mm-d">{dreamDay(d.dreamtOn)}</span>
      <span className="mm-b">
        <b>{dreamName(d)}</b>
        {d.title && d.lead && <span className="dr-lead">{d.lead}</span>}
        {meta.length > 0 && <small>{meta.map(x => <span key={x}>{x}</span>)}</small>}
      </span>
    </Link>
  );
}

/** the sidebar while in Giấc mơ: the years, and who comes up in the dreams (the most often first) */
export function DreamsSide() {
  const all = useDreams(), [sp] = useSearchParams(), list = all.data ?? [];
  const year = Number(sp.get('year')), person = sp.get('person'), any = year || person || sp.get('q');
  const years = [...new Set(list.map(yearOf))].sort((a, b) => a - b);
  const people = useMemo(() => {
    const seen = new Map<string, { p: NonNullable<Dream['persons']>[number]; n: number }>();
    list.forEach(d => d.persons?.forEach(p => { const x = seen.get(p.id); if (x) x.n++; else seen.set(p.id, { p, n: 1 }); }));
    return [...seen.values()].sort((a, b) => b.n - a.n).slice(0, 12).map(x => x.p);
  }, [list]);
  return (
    <>
      <h4>Giấc mơ</h4>
      <Link to="/dreams" className={!any ? 'on' : ''}>Tất cả</Link>
      {years.length > 0 && <h4>Năm</h4>}
      <YearGrid years={years} active={year} href={y => `/dreams?year=${y}`} />
      {people.length > 0 && <h4>Người trong mơ</h4>}
      {people.map(p => <Link key={p.id} to={`/dreams?person=${p.id}`} className={person === p.id ? 'on' : ''}>{nameOf(p)}</Link>)}
    </>
  );
}

// ── one dream ────────────────────────────────────────────────────────────────

/* A dream opens on the paper of its year, the day under it. Then the dream as he told it; ruled off below it, what
   it calls up in his waking life; the real events it calls up; the other dreams of that day. Beside it: what was going
   on in his life that day. */
export function DreamPage() {
  const { id } = useParams(), all = useDreams();
  const q = useQuery({ queryKey: ['dream', id], enabled: !!id, staleTime: T, queryFn: () => hub.dream(id!) });
  const d = q.data;
  if (q.isLoading) return <div className="page mm dr"><div className="reader"><article className="article"><p className="empty">Đang mở…</p></article></div></div>;
  if (!d) return <div className="page mm dr"><div className="reader"><article className="article"><Link className="back" to="/dreams">← Giấc mơ</Link><h1>Không tìm thấy giấc mơ này</h1></article></div></div>;

  // the dreams in the order they came: day after day, and within a day as he told them
  const list = all.data ?? [];
  const chrono = [...list].sort((a, b) => a.dreamtOn.localeCompare(b.dreamtOn) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const i = chrono.findIndex(x => x.id === d.id), older = i > 0 ? chrono[i - 1] : undefined, newer = i >= 0 ? chrono[i + 1] : undefined;
  const sameDay = chrono.filter(x => x.dreamtOn === d.dreamtOn && x.id !== d.id);
  const y = +d.dreamtOn.slice(0, 4);

  return (
    <div className="page mm dr">
      <header className={`mm-top ${eraClass(y)}`}><div className="mm-top-in">
        <div className="mm-top-y"><b>{y}</b><span>{dayLine(d.dreamtOn)}</span></div>
        <div className="mm-top-t">
          <Link className="back" to="/dreams">← Giấc mơ</Link>
          <span className="mm-k">Giấc mơ</span>
          <h1>{d.title || 'Giấc mơ'}</h1>
          {!!d.persons?.length && <div className="mm-meta">
            {d.persons.map(p => <Link key={p.id} className="pill" to={`/angels/${p.id}`}>{p.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : <span className="pill-ph" />}{nameOf(p)}</Link>)}
          </div>}
        </div>
      </div></header>
      <div className="reader">
        <article className="article">
          <div className="prose">{paragraphs(d.content)}</div>
          {d.associations && <section className="dr-wake"><h5>Ngoài đời</h5>{paragraphs(d.associations)}</section>}
          {!!d.events?.length && <><h5 className="mem-h">Gợi về</h5>
            <nav className="mem-same">{d.events.map(e => <Link key={e.id} to={eventHref(e)}>{e.title}<small>{eventWhen({ when: e.when ?? '' })}</small></Link>)}</nav></>}
          {sameDay.length > 0 && <><h5 className="mem-h">Cùng ngày hôm đó</h5>
            <nav className="mem-same">{sameDay.map(x => <Link key={x.id} to={dreamHref(x)}>{dreamName(x)}</Link>)}</nav></>}
          <div className="pn">{older ? <Link to={dreamHref(older)}><small>← Trước đó · {dreamDay(older.dreamtOn)}</small><b>{dreamName(older)}</b></Link> : <span />}
            {newer ? <Link to={dreamHref(newer)}><small>Sau đó · {dreamDay(newer.dreamtOn)} →</small><b>{dreamName(newer)}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          <EventsAround at={`${d.dreamtOn}T07:00:00`} />
        </aside>
      </div>
    </div>
  );
}
