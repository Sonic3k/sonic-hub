/* The web browser of the machine: Internet Explorer's toolbar on the old ones, tabs from Firefox on; the bookmarks he
   had then; and the sites that live in Sonic Hub — his Facebook, the forums (V-Westlife, onthi.com), his journal as a
   blog — each shown as it stood at T. Sites outside open as they are today. */
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { hub } from '../../api/hub';
import { desk } from '../api';
import { atString, useMoment, utc, vnDate } from '../moment';
import { Glyph } from '../glyphs';
import { browserName, skinOf, useDesk } from '../pc/desk';
import { useNavClick } from '../skin';
import { useWinTitle } from '../pc/Window';
import { FacebookSite } from '../fb/Site';

interface Tab { id: number; hist: string[]; i: number }
const titleOf = (url: string) => url.startsWith('facebook.com') ? 'Facebook' : url.startsWith('forum/') ? 'Diễn đàn'
  : url.startsWith('blog') ? 'Nhật ký' : url === 'home' ? 'Trang chủ' : url.replace(/^https?:\/\//, '').split('/')[0];
const glyphOf = (url: string) => url.startsWith('facebook') ? 'fb' : url.startsWith('forum') ? 'forum' : url.startsWith('blog') ? 'blog' : 'globe-blue';

export function Browser({ url: start = 'home' }: { url?: string }) {
  const { ver, machine, os } = useDesk();
  const v = ver.browser ?? 'IE6';
  const click = useNavClick(skinOf(os), v.startsWith('IE'));
  const bookmarks = machine.items.filter(i => i.place === 'BOOKMARK');
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, hist: [start], i: 0 }]);
  const [cur, setCur] = useState(1);
  const tab = tabs.find(t => t.id === cur) ?? tabs[0];
  const url = tab.hist[tab.i];
  const edit = useCallback((f: (t: Tab) => Tab) => setTabs(ts => ts.map(t => (t.id === cur ? f(t) : t))), [cur]);
  const go = useCallback((u: string) => { click(); edit(t => ({ ...t, hist: [...t.hist.slice(0, t.i + 1), u], i: t.i + 1 })); }, [edit, click]);
  // what the page inside says it shows (Facebook's own links, a forum's address)
  const [shown, setShown] = useState<Record<string, string>>({});
  const report = useCallback((p: string) => setShown(s => (s[`${cur}:${url}`] === p ? s : { ...s, [`${cur}:${url}`]: p })), [cur, url]);
  const seen = shown[`${tab.id}:${url}`];
  const address = url.startsWith('facebook.com') ? `http://www.facebook.com${(seen ?? '').replace(/^\/facebook/, '').replace(/^\/messenger/, '/messages')}`
    : url.startsWith('forum/') ? seen ?? '' : url.startsWith('blog') ? 'Nhật ký — Sonic3k' : url.startsWith('http') ? url : url === 'home' ? 'about:home' : url;
  const openBookmark = (b: { app?: string | null; target?: string | null }) => {
    if (b.app === 'facebook') go('facebook.com/');
    else if (b.app === 'forum' && b.target) go(`forum/${b.target}`);
    else if (b.app === 'blog') go('blog');
    else if (b.app === 'link' && b.target) go(b.target);
  };
  const tabbed = v !== 'IE6';
  useWinTitle(`${titleOf(url)} - ${browserName(v)}`);
  const close = (id: number) => {
    const rest = tabs.filter(x => x.id !== id);
    setTabs(rest);
    if (id === cur) setCur(rest[rest.length - 1].id);
  };
  return (
    <div className={`dv-br dv-br-${v.toLowerCase()}`}>
      {tabbed && (
        <div className="dv-br-tabs">
          {tabs.map(t => (
            <div key={t.id} className={`dv-br-tab ${t.id === cur ? 'on' : ''}`} onClick={() => setCur(t.id)}>
              <Glyph name={glyphOf(t.hist[t.i])} size={14} />
              <span>{titleOf(t.hist[t.i])}</span>
              {tabs.length > 1 && <button type="button" onClick={e => { e.stopPropagation(); close(t.id); }} aria-label="Close tab">×</button>}
            </div>
          ))}
          <button type="button" className="dv-br-newtab" onClick={() => { const id = Math.max(...tabs.map(t => t.id)) + 1; setTabs(ts => [...ts, { id, hist: ['home'], i: 0 }]); setCur(id); }} aria-label="New tab">+</button>
        </div>
      )}
      <div className="dv-br-bar">
        <button type="button" aria-label="Back" disabled={tab.i === 0} onClick={() => edit(t => ({ ...t, i: Math.max(0, t.i - 1) }))}>◀</button>
        <button type="button" aria-label="Forward" disabled={tab.i >= tab.hist.length - 1} onClick={() => edit(t => ({ ...t, i: Math.min(t.hist.length - 1, t.i + 1) }))}>▶</button>
        <button type="button" aria-label="Home" onClick={() => go('home')}>⌂</button>
        {!tabbed && <span className="dv-br-label">Address</span>}
        <div className="dv-br-addr"><Glyph name={glyphOf(url)} size={14} /><span>{address}</span></div>
        {!tabbed && <span className="dv-br-go">Go</span>}
      </div>
      {bookmarks.length > 0 && (
        <div className="dv-br-marks">
          {!tabbed && <span className="dv-br-label">Links</span>}
          {bookmarks.map(b => <button type="button" key={b.key} onClick={() => openBookmark(b)}><Glyph name={b.glyph} label={b.label} size={14} />{b.label}</button>)}
        </div>
      )}
      <div className="dv-br-page" key={`${tab.id}:${tab.i}`}>
        {url === 'home' && <StartPage marks={bookmarks} open={openBookmark} />}
        {url.startsWith('facebook.com') && <FacebookSite path={url.startsWith('facebook.com/messages') ? `/messenger${url.slice('facebook.com/messages'.length)}` : `/facebook${url.slice('facebook.com'.length).replace(/\/$/, '')}`} onPath={report} />}
        {url.startsWith('forum/') && <ForumSite path={url.slice(6)} go={go} onAddress={report} />}
        {url.startsWith('blog') && <BlogSite id={url.split('/')[1]} go={go} />}
        {url.startsWith('http') && <Outside url={url} />}
      </div>
      <div className="dv-br-status">{tabbed ? '' : 'Done'}</div>
    </div>
  );
}

function StartPage({ marks, open }: { marks: { key: string; label: string; glyph?: string | null; app?: string | null; target?: string | null }[]; open: (b: { app?: string | null; target?: string | null }) => void }) {
  const { T } = useMoment();
  return (
    <div className="dv-br-start">
      <h2>{vnDate(T)}</h2>
      <div className="dv-br-tiles">
        {marks.map(b => <button type="button" key={b.key} onClick={() => open(b)}><Glyph name={b.glyph} label={b.label} size={40} /><span>{b.label}</span></button>)}
      </div>
    </div>
  );
}

function Outside({ url }: { url: string }) {
  return (
    <div className="dv-br-out">
      <div className="dv-br-outbar">Trang này nằm ngoài Sonic Hub. <a href={url} target="_blank" rel="noreferrer">Mở trong tab mới</a></div>
      <iframe src={url} title={url} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
    </div>
  );
}

/* ── the forums, as they stood at T ─────────────────────────────────────── */

export function ForumSite({ path, go, onAddress }: { path: string; go: (url: string) => void; onAddress?: (addr: string) => void }) {
  const { T, at } = useMoment();
  const forums = useQuery({ queryKey: ['forums'], queryFn: hub.forums, staleTime: 600_000 });
  const isThread = path.startsWith('t/');
  const key = isThread ? '' : path.split('/')[0];
  const forum = useQuery({ queryKey: ['forum', key], queryFn: () => hub.forum(key), enabled: !!key });
  const threads = useQuery({ queryKey: ['forum-threads', key, at], queryFn: () => hub.forumThreads(key, { page: 0, size: 100, at }), enabled: !!key });
  const [tid, post] = isThread ? path.slice(2).split('#') : [null, null];
  const thread = useQuery({ queryKey: ['forum-thread', tid], queryFn: () => hub.forumThread(tid!), enabled: !!tid });
  /* forum times are kept as the boards showed them, on Vietnam's clock (not UTC like chats): compare and show them as they are */
  const wall = atString(T), before = (iso?: string | null) => !iso || iso.slice(0, 16) <= wall;
  const day = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  const site = forums.data?.find(f => f.key === (isThread ? thread.data?.forumKey : key))?.url?.replace(/\/$/, '');
  useEffect(() => { if (site) onAddress?.(`${site}/forum/`); }, [site, onAddress]);
  if (isThread) {
    const t = thread.data;
    const posts = (t?.posts ?? []).filter(p => before(p.postedAt));
    return (
      <div className="dv-fo">
        <div className="dv-fo-head"><button type="button" onClick={() => t && go(`forum/${t.forumKey}`)}>{t?.forumName ?? '…'}</button> › {t?.title}</div>
        {posts.map(p => (
          <div key={p.id} className={`dv-fo-post ${post && String(p.sortOrder) === post ? 'hit' : ''}`}>
            <div className="dv-fo-who"><b>{p.authorNick}</b><small>{day(p.postedAt)}</small></div>
            <div className="dv-fo-body">{p.title && <h4>{p.title}</h4>}<div dangerouslySetInnerHTML={{ __html: p.contentHtml ?? '' }} /></div>
          </div>
        ))}
        {t && !posts.length && <div className="dv-ex-empty">Chủ đề này chưa có bài nào tới lúc này.</div>}
      </div>
    );
  }
  const list = (threads.data?.content ?? []).filter(t => before(t.startedAt));
  return (
    <div className="dv-fo">
      <div className="dv-fo-banner"><b>{forum.data?.name ?? key}</b><span>{forum.data?.description}</span></div>
      <div className="dv-fo-table">
        <div className="dv-fo-th"><span>Chủ đề</span><span>Trả lời</span><span>Bài cuối</span></div>
        {list.map(t => (
          <button type="button" key={t.id} className="dv-fo-tr" onClick={() => go(`forum/t/${t.id}`)}>
            <span><b>{t.title}</b><small>{t.starterNick}{t.board ? ` · ${t.board}` : ''}</small></span>
            <span>{Math.max(0, t.postCount - 1)}</span><span>{day(t.lastPostAt && before(t.lastPostAt) ? t.lastPostAt : t.startedAt)}</span>
          </button>
        ))}
        {threads.data && !list.length && <div className="dv-ex-empty">Diễn đàn chưa có chủ đề nào tới lúc này.</div>}
      </div>
    </div>
  );
}

/* ── his journal, as a blog ─────────────────────────────────────────────── */

export function BlogSite({ id, go }: { id?: string; go: (url: string) => void }) {
  const { T } = useMoment();
  const q = useQuery({ queryKey: ['notes-all'], queryFn: async () => {
    const first = await desk.notes(0);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => desk.notes(i + 1)));
    return [first, ...rest].flatMap(p => p.content);
  } });
  const list = useMemo(() => (q.data ?? []).map(n => ({ n, d: utc(n.writtenAt ?? n.publishedAt ?? n.createdAt) }))
    .filter(x => x.d && x.d.getTime() <= T.getTime()).sort((a, b) => b.d!.getTime() - a.d!.getTime()), [q.data, T]);
  const one = id ? list.find(x => x.n.id === id) : null;
  return (
    <div className="dv-blog">
      <header><button type="button" onClick={() => go('blog')}>Nhật ký</button></header>
      {one ? (
        <article className="dv-blog-post">
          <h1>{one.n.title || 'Không tiêu đề'}</h1><time>{vnDate(one.d)}</time>
          <div dangerouslySetInnerHTML={{ __html: one.n.content }} />
        </article>
      ) : list.map(({ n, d }) => (
        <button type="button" key={n.id} className="dv-blog-item" onClick={() => go(`blog/${n.id}`)}>
          <time>{vnDate(d)}</time><h3>{n.title || 'Không tiêu đề'}</h3><p>{(n.excerpt ?? n.content.replace(/<[^>]+>/g, ' ')).slice(0, 220)}</p>
        </button>
      ))}
      {q.data && !list.length && <div className="dv-ex-empty">Chưa có bài nào tới lúc này.</div>}
    </div>
  );
}
