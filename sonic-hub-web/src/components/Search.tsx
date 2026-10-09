/* Search everything from the top bar: people, regions, albums, writing, years, photos. */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn, pic } from '../api/client';
import { counts, excerptOf, noteHref, useAllAlbums, useNotes, usePersons, useTagStats, useTimeline } from '../lib/queries';
import { matches } from '../lib/text';

export default function Search() {
  const [q, setQ] = useState(''), [dq, setDq] = useState(''), [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null), nav = useNavigate(), loc = useLocation();
  const persons = usePersons(), notes = useNotes(), albums = useAllAlbums(), tags = useTagStats(), tl = useTimeline();
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.search]);
  useEffect(() => { const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const photos = useQuery({ queryKey: ['search-photos', dq], queryFn: () => hub.search({ q: dq, size: 8, type: 'IMAGE' }), enabled: dq.length >= 2, staleTime: 60_000 });
  const t = q.trim(), years = Object.keys(counts(tl.data ?? [])).map(Number);
  const P = t ? (persons.data ?? []).filter(p => !p.isSelf && (matches(p.name, t) || matches(p.displayName, t) || matches(p.nickname, t))).slice(0, 4) : [];
  const R = t ? (tags.data ?? []).filter(x => matches(x.name, t)).slice(0, 4) : [];
  const A = t ? (albums.data ?? []).filter(a => matches(a.name, t)).slice(0, 4) : [];
  const N = t ? (notes.data ?? []).filter(n => matches(n.title, t) || matches(n.excerpt, t)).slice(0, 4) : [];
  const Y = /^\d{4}$/.test(t) && years.includes(+t) ? [+t] : [];
  const ph = photos.data?.content ?? [], none = t.length >= 2 && !P.length && !R.length && !A.length && !N.length && !Y.length && !ph.length && !photos.isFetching;
  const submit = () => { if (t) nav(`/photos?q=${encodeURIComponent(t)}`); };
  return (
    <div className="search" ref={box}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Tìm ảnh, người, bài viết, năm…"
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); } }} />
      {open && t && (
        <div className="search-pop">
          {Y.map(y => <Link key={y} className="sr" to={`/?y=${y}`}><span className="sr-k">Năm</span><b>Ngày này năm {y}</b></Link>)}
          {P.length > 0 && <div className="sg"><h6>Người</h6>{P.map(p => <Link key={p.id} className="sr" to={`/photos?person=${p.id}`}>{p.avatarUrl ? <img className="sr-av" src={cdn(p.avatarUrl, 80)} alt="" /> : <span className="sr-av ph" />}<b>{p.displayName || p.name}</b><small>{p.period}</small></Link>)}</div>}
          {R.length > 0 && <div className="sg"><h6>Vùng</h6>{R.map(r => <Link key={r.id} className="sr" to={`/tags/${encodeURIComponent(r.name)}`}><span className="dot" style={{ background: r.color || 'var(--ink3)' }} /><b>{r.name}</b><small>{r.mediaCount} ảnh</small></Link>)}</div>}
          {A.length > 0 && <div className="sg"><h6>Album</h6>{A.map(a => <Link key={a.id} className="sr" to={`/photos/albums/${a.id}`}>{a.thumbnailUrl ? <img className="sr-th" src={cdn(a.thumbnailUrl, 80)} alt="" /> : <span className="sr-th ph" />}<b>{a.name}</b><small>{a.mediaCount ?? 0} ảnh</small></Link>)}</div>}
          {N.length > 0 && <div className="sg"><h6>Bài viết</h6>{N.map(n => <Link key={n.id} className="sr" to={noteHref(n)}><b>{n.title || excerptOf(n, 40)}</b><small>{(n.publishedAt ?? n.createdAt ?? '').slice(0, 4)}</small></Link>)}</div>}
          {ph.length > 0 && <div className="sg"><h6>Ảnh</h6><div className="sr-photos">{ph.map(m => <Link key={m.id} to={`/photos?q=${encodeURIComponent(t)}&p=${m.id}`}>{pic(m) ? <img src={cdn(pic(m), 120)} alt="" /> : <span className="sr-ph">▶</span>}</Link>)}</div>
            <button type="button" className="sr-all" onClick={submit}>Xem tất cả ảnh khớp “{t}” →</button></div>}
          {photos.isFetching && !ph.length && <p className="sr-note">Đang tìm ảnh…</p>}
          {none && <p className="sr-note">Không thấy gì khớp “{t}”.</p>}
        </div>
      )}
    </div>
  );
}
