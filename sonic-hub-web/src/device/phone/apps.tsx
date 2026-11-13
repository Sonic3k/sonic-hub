/* The phone's programs, the same on the Nokia and the iPhone (each draws its own chrome around them): messages,
   the camera roll, the memories as notes, the calendar and the clock (both move T), the contacts, a browser, settings. */
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cdn, pic } from '../../api/client';
import { desk } from '../api';
import { clockText, dayAfter, useMoment, usedText, utc, viLong, vn, vnDate } from '../moment';
import { Glyph } from '../glyphs';
import { Chat } from '../apps/Chat';
import { BlogSite, ForumSite } from '../apps/Browser';
import { getSet, putSet } from '../apps/sets';
import { FacebookSite } from '../fb/Site';
import { chatScreen, usePhone } from './ctx';

const pad = (n: number) => String(n).padStart(2, '0');

/* ── a list the Nokia moves through with its keys, the iPhone by touch ─── */

export interface Row { key: string; title: ReactNode; sub?: ReactNode; icon?: ReactNode; right?: ReactNode }

export function useKeys(handler: (key: string) => void, deps: unknown[]) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      handler(e.key);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function List({ rows, onPick, empty }: { rows: Row[]; onPick: (i: number) => void; empty?: string }) {
  const { nokia } = usePhone();
  const [sel, setSel] = useState(0);
  useKeys(k => {
    if (!nokia || !rows.length) return;
    if (k === 'ArrowDown') setSel(s => (s + 1) % rows.length);
    else if (k === 'ArrowUp') setSel(s => (s - 1 + rows.length) % rows.length);
    else if (k === 'Enter') onPick(Math.min(sel, rows.length - 1));
  }, [nokia, rows.length, sel, onPick]);
  useEffect(() => {
    if (nokia) document.querySelector(`.ph-list [data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel, nokia]);
  if (!rows.length) return <div className="ph-empty">{empty ?? 'Trống'}</div>;
  return (
    <div className="ph-list">
      {rows.map((r, i) => (
        <button type="button" key={r.key} data-i={i} className={`ph-row ${nokia && i === sel ? 'on' : ''}`} onClick={() => { setSel(i); onPick(i); }}>
          {r.icon && <span className="ph-row-icon">{r.icon}</span>}
          <span className="ph-row-txt"><b>{r.title}</b>{r.sub && <small>{r.sub}</small>}</span>
          {r.right && <span className="ph-row-right">{r.right}</span>}
        </button>
      ))}
    </div>
  );
}

const Face = ({ url, name }: { url?: string | null; name: string }) =>
  <span className="ph-face">{url ? <img src={cdn(url, 160)} alt="" /> : (name || '?').slice(0, 1).toUpperCase()}</span>;

/* ── messages ───────────────────────────────────────────────────────────── */

export function Threads({ platform }: { platform: string }) {
  const { at, T } = useMoment();
  const { open } = usePhone();
  const q = useQuery({ queryKey: ['threads', platform, at], queryFn: () => desk.threads(platform, at!) });
  const list = q.data ?? [];
  if (q.isLoading) return <div className="ph-empty">…</div>;
  return <List empty="Chưa có tin nhắn nào." onPick={i => { const t = list[i]; const s = chatScreen(platform, t.archiveId, t.title); open(s.app, s.arg); }}
    rows={list.map(t => {
      const d = utc(t.last.at);
      const today = d && vnDate(d) === vnDate(T);
      return { key: t.archiveId, icon: <Face url={t.faces[0]?.avatarUrl} name={t.title} />, title: t.title,
        sub: `${t.last.fromMe ? 'Bạn: ' : ''}${t.last.text}`, right: d ? (today ? clockText(d, true) : vnDate(d).slice(0, 5)) : '' };
    })} />;
}

export function ThreadView({ archiveId, seq }: { archiveId: string; seq?: number | null }) {
  return <div className="ph-thread"><Chat archiveId={archiveId} variant="bubbles" focusSeq={seq ?? null} /></div>;
}

/** Names from the phone's conversations (the contacts as far as the messages tell). */
export function Contacts() {
  const { at } = useMoment();
  const { open } = usePhone();
  const qs = useQueries({ queries: ['SMS', 'ZALO'].map(p => ({ queryKey: ['threads', p, at], queryFn: () => desk.threads(p, at!) })) });
  const people = useMemo(() => {
    const seen = new Map<string, { name: string; platform: string; archiveId: string; avatar?: string | null }>();
    qs.forEach((q, i) => (q.data ?? []).forEach(t => {
      if (t.group || seen.has(t.title)) return;
      seen.set(t.title, { name: t.title, platform: i === 0 ? 'SMS' : 'ZALO', archiveId: t.archiveId, avatar: t.faces[0]?.avatarUrl });
    }));
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [qs]);
  return <List empty="Danh bạ trống." onPick={i => { const p = people[i]; open('thread', { platform: p.platform, archiveId: p.archiveId, title: p.name }); }}
    rows={people.map(p => ({ key: `${p.platform}:${p.archiveId}`, icon: <Face url={p.avatar} name={p.name} />, title: p.name, sub: p.platform === 'ZALO' ? 'Zalo' : 'SMS' }))} />;
}

/* ── photos ─────────────────────────────────────────────────────────────── */

export function Gallery() {
  const { T } = useMoment();
  const { open, nokia } = usePhone();
  const to = dayAfter(T);
  const q = useInfiniteQuery({
    queryKey: ['roll', to], initialPageParam: 0,
    queryFn: ({ pageParam }) => desk.cameraRoll(to, pageParam),
    getNextPageParam: p => (p.number + 1 < p.totalPages ? p.number + 1 : undefined),
  });
  const items = useMemo(() => (q.data?.pages ?? []).flatMap(p => p.content), [q.data]);
  const cols = nokia ? 3 : 4;
  const [sel, setSel] = useState(0);
  const show = (i: number) => {
    putSet('roll', items.map(m => ({ id: m.id, url: pic(m, true), thumb: pic(m), caption: m.caption ?? m.fileName, at: m.effectiveDate ?? null })));
    open('photo', { set: 'roll', index: i });
  };
  useKeys(k => {
    if (!nokia || !items.length) return;
    const n = items.length;
    if (k === 'ArrowRight') setSel(s => Math.min(n - 1, s + 1));
    else if (k === 'ArrowLeft') setSel(s => Math.max(0, s - 1));
    else if (k === 'ArrowDown') setSel(s => Math.min(n - 1, s + cols));
    else if (k === 'ArrowUp') setSel(s => Math.max(0, s - cols));
    else if (k === 'Enter') show(sel);
  }, [nokia, items, sel]);
  if (q.isLoading) return <div className="ph-empty">…</div>;
  if (!items.length) return <div className="ph-empty">Chưa có ảnh nào.</div>;
  let lastDay = '';
  return (
    <div className="ph-gallery" onScroll={e => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight > el.scrollHeight - 300 && q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
    }}>
      <div className={`ph-grid c${cols}`}>
        {items.map((m, i) => {
          const day = m.effectiveDate ? vnDate(utc(m.effectiveDate)) : '';
          const head = !nokia && day !== lastDay ? day : '';
          if (head) lastDay = day;
          return [
            head ? <div key={`h${i}`} className="ph-grid-day">{head}</div> : null,
            <button type="button" key={m.id} className={nokia && i === sel ? 'on' : ''} onClick={() => show(i)}>
              <img src={cdn(pic(m), 160)} alt="" loading="lazy" />
            </button>,
          ];
        })}
      </div>
    </div>
  );
}

export function PhotoView({ set, index = 0 }: { set: string; index?: number }) {
  const photos = getSet(set);
  const [i, setI] = useState(index);
  useKeys(k => {
    if (k === 'ArrowRight' || k === 'ArrowDown') setI(x => Math.min(photos.length - 1, x + 1));
    if (k === 'ArrowLeft' || k === 'ArrowUp') setI(x => Math.max(0, x - 1));
  }, [photos.length]);
  const p = photos[i];
  const [sx, setSx] = useState<number | null>(null);
  if (!p) return <div className="ph-empty" />;
  return (
    <div className="ph-photo" onTouchStart={e => setSx(e.touches[0].clientX)}
      onTouchEnd={e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (dx < -40) setI(x => Math.min(photos.length - 1, x + 1)); if (dx > 40) setI(x => Math.max(0, x - 1)); setSx(null); }}>
      <img key={p.id} src={cdn(p.url, 1280)} alt={p.caption ?? ''} />
      <div className="ph-photo-cap"><span>{p.at ? vnDate(utc(p.at)) : ''}</span><span>{i + 1}/{photos.length}</span></div>
      <button type="button" className="ph-photo-nav prev" onClick={() => setI(x => Math.max(0, x - 1))} disabled={i === 0} aria-label="Ảnh trước">‹</button>
      <button type="button" className="ph-photo-nav next" onClick={() => setI(x => Math.min(photos.length - 1, x + 1))} disabled={i >= photos.length - 1} aria-label="Ảnh sau">›</button>
    </div>
  );
}

/* ── memories ───────────────────────────────────────────────────────────── */

export function NotesList() {
  const { at } = useMoment();
  const { open, nokia } = usePhone();
  const [q, setQ] = useState('');
  const r = useInfiniteQuery({
    queryKey: ['phone-memories', at, q], initialPageParam: 0,
    queryFn: ({ pageParam }) => desk.memories(at!, q || undefined, pageParam, 40),
    getNextPageParam: p => (p.page + 1 < p.totalPages ? p.page + 1 : undefined),
  });
  const items = useMemo(() => (r.data?.pages ?? []).flatMap(p => p.items), [r.data]);
  return (
    <div className="ph-notes" onScroll={e => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight > el.scrollHeight - 300 && r.hasNextPage && !r.isFetchingNextPage) void r.fetchNextPage();
    }}>
      {!nokia && <div className="ph-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm kiếm" /></div>}
      {r.isLoading ? <div className="ph-empty">…</div>
        : <List empty="Chưa có ký ức nào tới lúc này." onPick={i => open('memory', { id: items[i].id })}
          rows={items.map(m => ({ key: m.id, title: m.title || (m.summary ?? '').slice(0, 60), sub: <>{vnDate(utc(m.at))}{m.title && m.summary ? ` · ${m.summary.slice(0, 80)}` : ''}</> }))} />}
    </div>
  );
}

export function MemoryView({ id }: { id: string }) {
  const { open } = usePhone();
  const q = useQuery({ queryKey: ['scene', id], queryFn: () => desk.scene(id), staleTime: Infinity });
  const sc = q.data;
  const mediaIds = sc?.windows.find(w => w.app === 'photos')?.mediaIds?.slice(0, 12) ?? [];
  const media = useQuery({ queryKey: ['media-set', mediaIds], queryFn: () => desk.mediaByIds(mediaIds), enabled: mediaIds.length > 0, staleTime: Infinity });
  const photos = media.data ?? [];
  if (q.isLoading) return <div className="ph-empty">…</div>;
  if (!sc) return <div className="ph-empty">Không mở được ký ức này.</div>;
  const sources = sc.windows.filter(w => w.app === 'chat' || w.app === 'word' || w.app === 'forum' || w.app === 'link');
  return (
    <div className="ph-memory">
      <h2>{sc.title || 'Ký ức'}</h2>
      <time>{viLong(utc(sc.at)!)}</time>
      {sc.summary && <p>{sc.summary}</p>}
      {photos.length > 0 && (
        <div className="ph-memory-photos">
          {photos.map((m, i) => <button type="button" key={m.id} onClick={() => {
            putSet(`mem:${id}`, photos.map(x => ({ id: x.id, url: pic(x, true), caption: x.caption ?? x.fileName, at: x.effectiveDate ?? null })));
            open('photo', { set: `mem:${id}`, index: i });
          }}><img src={cdn(pic(m), 320)} alt="" /></button>)}
        </div>
      )}
      {sources.length > 0 && <div className="ph-memory-src">
        {sources.map((w, i) => (
          <button type="button" key={i} onClick={() => {
            if (w.app === 'chat' && w.archiveId) { const s = chatScreen(w.platform ?? '', w.archiveId, (w.title ?? '').replace(/^[^·]+·\s*/, ''), w.seq); open(s.app, s.arg); }
            else if (w.app === 'word' && w.noteId) open('note', { noteId: w.noteId });
            else if (w.app === 'forum' && w.threadId) open('browser', { url: `forum/t/${w.threadId}${w.post != null ? `#${w.post}` : ''}` });
            else if (w.app === 'link' && w.url) window.open(w.url, '_blank', 'noreferrer');
          }}>
            <Glyph name={w.app === 'chat' ? (w.platform === 'YAHOO' ? 'im-smile' : w.platform === 'FACEBOOK' ? 'fb' : 'sms') : w.app === 'word' ? 'doc-blue' : w.app === 'forum' ? 'forum' : 'globe-blue'} size={22} />
            <span><b>{w.app === 'chat' ? 'Đoạn chat' : w.app === 'word' ? 'Bài viết' : w.app === 'forum' ? 'Diễn đàn' : 'Liên kết'}</b><small>{w.title}</small></span>
          </button>
        ))}
      </div>}
      <a className="ph-memory-pc" href={`/pc?scene=${id}`}>Mở trên máy tính của lúc đó</a>
    </div>
  );
}

export function NoteReader({ noteId }: { noteId: string }) {
  const q = useQuery({ queryKey: ['note', noteId], queryFn: () => desk.note(noteId) });
  const n = q.data;
  if (!n) return <div className="ph-empty">…</div>;
  const text = n.content ?? '';   // a note read on its own always comes with its text
  const html = /<\w+[^>]*>/.test(text) ? text : text.split(/\n{2,}/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('');
  return (
    <article className="ph-note">
      <h2>{n.title || 'Không tiêu đề'}</h2>
      <time>{vnDate(utc(n.writtenAt ?? n.publishedAt ?? n.createdAt))}</time>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

/* ── the calendar and the clock: both move T ────────────────────────────── */

export function CalendarView() {
  const { T, setAt } = usePhone();
  const t = vn(T);
  const [view, setView] = useState({ y: t.y, m: t.mo });
  const [sel, setSel] = useState(t.d);
  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const now = vn(new Date());
  const future = (d: number) => view.y > now.y || (view.y === now.y && (view.m > now.mo || (view.m === now.mo && d > now.d)));
  const month = (n: number) => setView(v => { const d = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const go = (d: number) => !future(d) && setAt(`${view.y}-${pad(view.m + 1)}-${pad(d)}T${pad(t.h)}:${pad(t.mi)}`);
  useKeys(k => {
    if (k === 'ArrowRight') setSel(s => Math.min(count, s + 1));
    else if (k === 'ArrowLeft') setSel(s => Math.max(1, s - 1));
    else if (k === 'ArrowDown') setSel(s => Math.min(count, s + 7));
    else if (k === 'ArrowUp') setSel(s => Math.max(1, s - 7));
    else if (k === 'Enter') go(sel);
  }, [count, sel, view]);
  return (
    <div className="ph-cal">
      <div className="ph-cal-head">
        <button type="button" onClick={() => month(-1)} aria-label="Tháng trước">‹</button>
        <b>Tháng {view.m + 1}, {view.y}</b>
        <button type="button" onClick={() => month(1)} aria-label="Tháng sau">›</button>
      </div>
      <div className="ph-cal-grid">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(w => <i key={w}>{w}</i>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => i + 1).map(d => (
          <button type="button" key={d} disabled={future(d)} onClick={() => go(d)}
            className={`${t.y === view.y && t.mo === view.m && t.d === d ? 'cur' : ''} ${sel === d ? 'sel' : ''}`}>{d}</button>
        ))}
      </div>
      <p className="ph-cal-note">Chạm vào một ngày để về ngày đó.</p>
    </div>
  );
}

export function ClockView() {
  const { T, setAt, data, machine } = usePhone();
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setTick(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const [base] = useState(() => Date.now());
  const shown = new Date(T.getTime() + (tick - base));
  const t = vn(T);
  const [day, setDay] = useState(`${t.y}-${pad(t.mo + 1)}-${pad(t.d)}`);
  const [time, setTime] = useState(`${pad(t.h)}:${pad(t.mi)}`);
  const byDays = (n: number) => { const x = vn(new Date(T.getTime() + n * 86400_000)); setAt(`${x.y}-${pad(x.mo + 1)}-${pad(x.d)}T${pad(x.h)}:${pad(x.mi)}`); };
  const phones = data.machines.filter(m => m.kind === 'PHONE');
  const random = () => {
    const from = Date.UTC(2006, 0, 1), x = vn(new Date(from + Math.random() * (Date.now() - from)));
    setAt(`${x.y}-${pad(x.mo + 1)}-${pad(x.d)}T${pad(19 + Math.floor(Math.random() * 4))}:${pad(Math.floor(Math.random() * 60))}`);
  };
  return (
    <div className="ph-clock">
      <div className="ph-clock-now"><b>{clockText(shown, true)}<small>:{pad(Math.floor(shown.getTime() / 1000) % 60)}</small></b><span>{viLong(T)}</span></div>
      <div className="ph-clock-go">
        <input type="date" value={day} max={new Date().toISOString().slice(0, 10)} onChange={e => setDay(e.target.value)} aria-label="Ngày" />
        <input type="time" value={time} onChange={e => setTime(e.target.value || '20:00')} aria-label="Giờ" />
        <button type="button" className="ph-primary" onClick={() => day && setAt(`${day}T${time}`)}>Đi tới</button>
      </div>
      <div className="ph-clock-quick">
        <button type="button" onClick={() => byDays(-1)}>−1 ngày</button>
        <button type="button" onClick={() => byDays(1)}>+1 ngày</button>
        <button type="button" onClick={random}>Ngẫu nhiên</button>
      </div>
      <h4>Các điện thoại đã dùng</h4>
      {phones.map(p => {
        const f = p.from ? vn(new Date(`${p.from}Z`)) : null;
        return (
          <button type="button" key={p.key} className={`ph-clock-phone ${p.key === machine.device.key ? 'cur' : ''}`}
            onClick={() => f && setAt(`${f.y}-${pad(f.mo + 1)}-${pad(f.d)}T20:00`)}>
            <Glyph name="phone" size={26} /><span><b>{p.name}</b><small>{usedText(p.from, p.to)}</small></span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsView() {
  const { machine, open, powerOff } = usePhone();
  return <List onPick={i => (i === 0 ? open('clock') : i === 2 ? powerOff() : undefined)} rows={[
    { key: 'time', icon: <Glyph name="clock" size={28} />, title: 'Ngày & giờ', sub: 'Đi tới một ngày khác' },
    { key: 'about', icon: <Glyph name="phone" size={28} />, title: machine.device.name, sub: `Dùng ${usedText(machine.device.from, machine.device.to)}` },
    { key: 'off', icon: <Glyph name="settings" size={28} />, title: 'Tắt máy', sub: 'Về Sonic Hub' },
  ]} />;
}

/* ── the browser ────────────────────────────────────────────────────────── */

export function PhoneBrowser({ url: start = 'home' }: { url?: string }) {
  const { data } = usePhone();
  const [url, setUrl] = useState(start);
  const marks = (data.computer?.items ?? []).filter(i => i.place === 'BOOKMARK');
  const go = (u: string) => setUrl(u);
  const pick = (b: { app?: string | null; target?: string | null }) => {
    if (b.app === 'facebook') go('facebook.com/');
    else if (b.app === 'forum' && b.target) go(`forum/${b.target}`);
    else if (b.app === 'blog') go('blog');
    else if (b.app === 'link' && b.target) window.open(b.target, '_blank', 'noreferrer');
  };
  const address = url === 'home' ? '' : url.startsWith('facebook.com') ? 'm.facebook.com' : url.startsWith('forum') ? 'diễn đàn' : url.startsWith('blog') ? 'nhật ký' : url;
  return (
    <div className="ph-br">
      <div className="ph-br-bar"><button type="button" onClick={() => go('home')} aria-label="Dấu trang">☆</button><span>{address || 'Tìm kiếm hoặc nhập địa chỉ'}</span></div>
      <div className="ph-br-page">
        {url === 'home' && <div className="ph-br-home">{marks.map(b => <button type="button" key={b.key} onClick={() => pick(b)}><Glyph name={b.glyph} label={b.label} size={44} /><span>{b.label}</span></button>)}</div>}
        {url.startsWith('facebook.com') && <FacebookSite path="/facebook" />}
        {url.startsWith('forum/') && <ForumSite path={url.slice(6)} go={go} />}
        {url.startsWith('blog') && <BlogSite id={url.split('/')[1]} go={go} />}
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="ph-empty">{text}</div>;
}
