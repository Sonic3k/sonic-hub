/* The network's frame: the blue bar with search and the owner, then the page. */
import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { social, type Ref } from '../api';
import { useMoment, withAt } from '../time';
import { Avatar, L, profilePath } from '../ui/bits';
import { IBell, IChat, IFriends, ISearch } from '../ui/icons';
import { MeContext } from './PostCard';

const KIND: Record<string, string> = { GROUP: 'Group', PAGE: 'Page' };

function Search() {
  const { at } = useMoment();
  const nav = useNavigate();
  const [q, setQ] = useState(''), [open, setOpen] = useState(false), [debounced, setDebounced] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 220); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const hits = useQuery({ queryKey: ['search', debounced, at], queryFn: () => social.search(debounced, at), enabled: debounced.length >= 2 });
  const pick = (r: Ref) => { setOpen(false); setQ(''); nav(withAt(profilePath(r), at)); };
  return (
    <div className="fb-search" ref={box}>
      <input value={q} placeholder="Search" onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' && hits.data?.[0]) pick(hits.data[0]); if (e.key === 'Escape') setOpen(false); }} />
      <span className="fb-search-ico"><ISearch size={14} /></span>
      {open && debounced.length >= 2 && (
        <div className="fb-search-drop">
          {hits.data?.length === 0 && <div className="fb-search-none">No results for “{debounced}”</div>}
          {hits.data?.map(r => (
            <button type="button" key={r.id ?? r.name} onClick={() => pick(r)}>
              <Avatar r={r} size={32} link={false} />
              <span><b>{r.name}</b><small>{KIND[r.kind] ?? (r.state === 'locked' ? 'Profile' : 'Person')}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FbShell() {
  const { at } = useMoment();
  const home = useQuery({ queryKey: ['home', at], queryFn: () => social.home(at) });
  const me = home.data?.me ?? null;
  return (
    <MeContext.Provider value={me}>
      <div className="fb">
        <header className="fb-bar">
          <div className="fb-bar-in">
            <L to="/facebook" className="fb-mark" aria-label="News Feed"><svg viewBox="0 0 24 24" width="24" height="24"><rect width="24" height="24" rx="4" fill="#fff" /><circle cx="12" cy="12" r="6.4" fill="none" stroke="#3b5998" strokeWidth="2.6" /><circle cx="12" cy="12" r="1.9" fill="#3b5998" /></svg></L>
            <Search />
            <nav className="fb-nav">
              {me && <L to={profilePath(me)} className="fb-me"><Avatar r={me} size={24} link={false} /><span>{me.name.split(' ').slice(-1)[0]}</span></L>}
              <L to="/facebook" className="fb-home-link">Home</L>
              <span className="fb-ico" title="Friend Requests"><IFriends size={20} /></span>
              <L to="/messenger" className="fb-ico" title="Messages"><IChat size={20} /></L>
              <span className="fb-ico" title="Notifications"><IBell size={20} /></span>
            </nav>
          </div>
        </header>
        <main className="fb-main"><Outlet /></main>
      </div>
    </MeContext.Provider>
  );
}
