import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn, pic } from '../api/client';
import type { MediaFile } from '../types';
import { excerptOf, noteDate, noteHref, plain, readMinutes, useNotes, usePersons } from '../lib/queries';
import { addDays, dayMonthYear, isoDay } from '../lib/date';
import Viewer from '../components/Viewer';

const T = 10 * 60_000;

export default function Post() {
  const { slug, id } = useParams(), persons = usePersons(), notes = useNotes();
  const q = useQuery({ queryKey: ['note', slug ?? id], queryFn: () => (slug ? hub.noteBySlug(slug) : hub.noteById(id!)), staleTime: T });
  const n = q.data, date = n ? noteDate(n) : '', day = date ? new Date(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) : null;
  const same = useQuery({ queryKey: ['sameday', date.slice(0, 10)], enabled: !!day, staleTime: T, queryFn: () => hub.search({ from: isoDay(day!), to: isoDay(addDays(day!, 1)), size: 6, type: 'IMAGE' }) });
  const prose = useRef<HTMLDivElement>(null), article = useRef<HTMLElement>(null);
  const [toc, setToc] = useState<{ id: string; text: string }[]>([]), [active, setActive] = useState(''), [progress, setProgress] = useState(0);
  const [viewer, setViewer] = useState<{ items: MediaFile[]; i: number } | null>(null);

  /* outline from the article's own headings */
  useLayoutEffect(() => {
    const hs = [...(prose.current?.querySelectorAll('h2') ?? [])];
    hs.forEach((h, i) => { h.id = `s${i + 1}`; });
    setToc(hs.map(h => ({ id: h.id, text: h.textContent ?? '' })));
  }, [n?.id]);
  /* reading progress + the section in view */
  useEffect(() => {
    const on = () => {
      const a = article.current; if (!a) return;
      const r = a.getBoundingClientRect(), total = a.offsetHeight - innerHeight + 160;
      setProgress(Math.max(0, Math.min(100, (-r.top + 100) / total * 100)));
      const cur = [...(prose.current?.querySelectorAll('h2') ?? [])].filter(h => h.getBoundingClientRect().top < 140).pop();
      setActive(cur?.id ?? '');
    };
    on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on);
  }, [n?.id]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug, id]);

  const text = n ? plain(n.content) : '';
  const self = (persons.data ?? []).find(p => p.isSelf);
  const mentioned = useMemo(() => (persons.data ?? []).filter(p => !p.isSelf && [p.name, p.displayName].some(x => x && x.length > 1 && text.includes(x))), [persons.data, text]);
  const all = notes.data ?? [], idx = n ? all.findIndex(x => x.id === n.id) : -1, newer = idx > 0 ? all[idx - 1] : undefined, older = idx >= 0 ? all[idx + 1] : undefined;
  const sameYear = n ? all.filter(x => x.id !== n.id && noteDate(x).slice(0, 4) === date.slice(0, 4)).slice(0, 3) : [];

  if (q.isLoading) return <div className="reader"><article className="article"><p className="empty">Đang mở bài…</p></article></div>;
  if (!n) return <div className="reader"><article className="article"><Link className="back" to="/journal">← Nhật ký</Link><h1>Không tìm thấy bài này</h1></article></div>;

  return (
    <div className="page">
      <div className="progress" style={{ width: `${progress}%` }} />
      <div className="reader">
        <article className="article" ref={article}>
          <Link className="back" to="/journal">← Nhật ký</Link><br />
          <span className="cat">{n.category || (n.kind === 'ARTICLE' ? 'Bài viết' : 'Ghi chép')}</span>
          <h1>{n.title || dayMonthYear(date)}</h1>
          {n.excerpt && <p className="dek">{n.excerpt}</p>}
          <div className="byline">{self?.avatarUrl && <img src={cdn(self.avatarUrl, 80)} alt="" />}<b>{self ? self.displayName || self.name : 'Sonic'}</b><span className="sep">|</span><span>{dayMonthYear(date)}</span><span className="sep">|</span><span>{readMinutes(n)} phút đọc</span></div>
          {n.coverMedia && <figure className="cover"><img className="zoom" src={cdn(pic(n.coverMedia, true), 1440)} alt="" onClick={() => setViewer({ items: [n.coverMedia!], i: 0 })} />{n.coverMedia.caption && <figcaption>{n.coverMedia.caption}</figcaption>}</figure>}
          <div className="prose" ref={prose} dangerouslySetInnerHTML={{ __html: n.content }} />
          {!!n.tags?.length && <div className="endtags">{n.tags.map(t => <Link key={t.id} className="chip" to={`/journal?tag=${encodeURIComponent(t.name)}`}>{t.name}</Link>)}</div>}
          <div className="pn">{older ? <Link to={noteHref(older)}><small>← Bài trước</small><b>{older.title || excerptOf(older, 50)}</b></Link> : <span />}{newer ? <Link to={noteHref(newer)}><small>Bài sau →</small><b>{newer.title || excerptOf(newer, 50)}</b></Link> : <span />}</div>
        </article>
        <aside className="aside">
          {toc.length > 1 && <div><h5>Trong bài</h5><nav className="toc">{toc.map(t => <a key={t.id} href={`#${t.id}`} className={active === t.id ? 'on' : ''} onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }); }}>{t.text}</a>)}</nav></div>}
          {!!same.data?.content.length && <div><h5>Ảnh ngày {dayMonthYear(date)}</h5><div className="sameday">{same.data.content.map((m, i) => <img key={m.id} className="zoom" src={cdn(pic(m), 200)} alt="" onClick={() => setViewer({ items: same.data!.content, i })} />)}</div></div>}
          {mentioned.length > 0 && <div><h5>Nhắc đến</h5><div className="chips">{mentioned.map(p => <span key={p.id} className="pill">{p.avatarUrl ? <img src={cdn(p.avatarUrl, 80)} alt="" /> : null}{p.displayName || p.name}</span>)}</div></div>}
        </aside>
      </div>
      {sameYear.length > 0 && <div className="after"><div className="hd"><h2>Cùng năm {date.slice(0, 4)}</h2><Link to={`/journal?year=${date.slice(0, 4)}`}>Tất cả bài</Link></div>
        <div className="cards3">{sameYear.map(x => <Link key={x.id} className="card mini" to={noteHref(x)}>{pic(x.coverMedia) ? <img src={cdn(pic(x.coverMedia, true), 600)} alt="" /> : <div className="ph" style={{ aspectRatio: '16/10' }} />}<div><span className="cat">{x.category || 'Bài viết'}</span><h4>{x.title || excerptOf(x, 50)}</h4><div className="by" style={{ marginTop: 6 }}>{dayMonthYear(noteDate(x))}</div></div></Link>)}</div></div>}
      {viewer && <Viewer items={viewer.items} start={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  );
}
