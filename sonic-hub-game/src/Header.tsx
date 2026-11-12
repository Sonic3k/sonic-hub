/* The bar that stays at the top of every screen: the way home, the search box that reaches every game on the shelf,
   the list of shelves, and the visitor's favorites. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { gamePage, type Game } from './catalog';
import { groupLink, machineLink, useData } from './data';
import { ChevronIcon, CloseIcon, Mark, SearchIcon, StarIcon } from './icons';
import { search, searchShelves } from './search';
import { useFavorites, useRecent } from './store';
import { groupOf, machineOf } from './taxonomy';
import { Marked, Picture, liq } from './ui';

const Brand = () => (
  <Link className="brand-link" to="/" aria-label="Sonic Hub Games, home"><Mark /><span className="brand-a">Sonic Hub</span><span className="brand-b">Games</span></Link>
);

/** closes whatever is open when the visitor presses Escape or points anywhere outside it */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc); };
  }, [open, close]);
  return ref;
}

function SearchBox() {
  const data = useData(), nav = useNavigate(), loc = useLocation(), [params] = useSearchParams();
  const pageQuery = loc.pathname === '/search' ? params.get('q') ?? '' : '';
  const [text, setText] = useState(pageQuery), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const favorites = useFavorites(), recent = useRecent();
  const box = useDismiss(open, () => setOpen(false));

  // the box shows what the results page is showing; on any other page it starts empty
  useEffect(() => { setText(pageQuery); setOpen(false); setActive(-1); }, [loc.pathname, pageQuery]);
  // "/" anywhere on the page puts the cursor in the box
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); input.current?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  const q = text.trim();
  const hits = useMemo(() => {
    if (!q) return [];
    const fav = new Set(favorites), rec = new Set(recent);
    return search(data.index, q, { limit: 7, boost: g => (fav.has(g.key) ? 10 : 0) + (rec.has(g.key) ? 8 : 0) }).map(h => h.game);
  }, [q, data, favorites, recent]);
  const shelves = useMemo(() => (q ? searchShelves(data.shelves, q) : []), [q, data]);
  const lately = useMemo(() => (q ? [] : recent.map(k => data.byKey.get(k)).filter((g): g is Game => !!g).slice(0, 5)), [q, recent, data]);

  const all = `/search?q=${encodeURIComponent(q)}`;
  const games = q ? hits : lately;
  const targets = [...games.map(gamePage), ...shelves.map(s => s.to), ...(q && hits.length ? [all] : [])];
  const go = (to: string) => { setOpen(false); input.current?.blur(); nav(to); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); setOpen(true);
      if (targets.length) setActive(a => (a + (e.key === 'ArrowDown' ? 1 : -1) + targets.length + (a < 0 && e.key === 'ArrowUp' ? 1 : 0)) % targets.length);
    } else if (e.key === 'Enter') {
      if (active >= 0 && targets[active]) go(targets[active]); else if (q) go(all);
    } else if (e.key === 'Escape') {
      if (open) setOpen(false); else { setText(''); input.current?.blur(); }
    }
  };

  const optionId = (i: number) => `search-option-${i}`;
  const game = (g: Game, i: number) => (
    <Link key={g.key} id={optionId(i)} role="option" aria-selected={active === i} className={`so so-game ${liq(g)}${active === i ? ' on' : ''}`} to={gamePage(g)} onClick={() => setOpen(false)}>
      <span className="so-pic"><Picture game={g} sizes="72px" bare /></span>
      <span className="so-name" lang={g.lang}><Marked title={g.title} query={q} /></span>
      <span className="so-note">{groupOf(g.group).name}</span>
      <span className="tag">{machineOf(g.machine).short}</span>
    </Link>
  );

  return (
    <div className="search" ref={box}>
      <div className="search-field">
      <label className="sr-only" htmlFor="search-input">Search all games</label>
      <span className="search-icon"><SearchIcon /></span>
      <input id="search-input" ref={input} type="search" role="combobox" aria-expanded={open} aria-controls="search-panel" aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? optionId(active) : undefined} placeholder="Search all games" autoComplete="off" autoCorrect="off" spellCheck={false}
        enterKeyHint="search" value={text} onChange={e => { setText(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
      {text
        ? <button type="button" className="search-clear" aria-label="Clear the search" onClick={() => { setText(''); setActive(-1); input.current?.focus(); }}><CloseIcon size={16} /></button>
        : <kbd className="search-key" aria-hidden="true">/</kbd>}
      </div>
      {open && (
        <div id="search-panel" className="search-panel" role="listbox" aria-label="Search results">
          {!q && lately.length > 0 && <p className="so-label">Recently played</p>}
          {!q && !lately.length && <p className="so-hint">Type any part of a name. A series, a machine or a kind of game works too.</p>}
          {games.map(game)}
          {q && !hits.length && (
            <div className="so-none">
              <p>No game matches “{q}”.</p>
              <p>Try another name it goes by, or fewer words.</p>
            </div>
          )}
          {shelves.length > 0 && <p className="so-label">Shelves</p>}
          {shelves.map((s, k) => {
            const i = games.length + k;
            return (
              <Link key={`${s.kind}:${s.key}`} id={optionId(i)} role="option" aria-selected={active === i} className={`so so-shelf${active === i ? ' on' : ''}`} to={s.to} onClick={() => setOpen(false)}>
                <span className="so-name">{s.name}</span>{s.note && <span className="so-note">{s.note}</span>}
              </Link>
            );
          })}
          {q && hits.length > 0 && (
            <Link id={optionId(targets.length - 1)} role="option" aria-selected={active === targets.length - 1} className={`so so-all${active === targets.length - 1 ? ' on' : ''}`} to={all}
              onClick={() => setOpen(false)}>See every match for “{q}”</Link>
          )}
        </div>
      )}
    </div>
  );
}

function ShelvesMenu({ id }: { id: string }) {
  const data = useData(), nav = useNavigate(), loc = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  useEffect(() => setOpen(false), [loc]);
  const random = () => nav(gamePage(data.games[Math.floor(Math.random() * data.games.length)]));
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="top-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>Shelves<ChevronIcon /></button>
      {open && (
        <div id={id} className="menu-panel">
          <section className="menu-kinds">
            <h2>Kinds of game</h2>
            <ul>{data.groups.map(({ group }) => <li key={group.key}><Link className={`liq-${group.liquid}`} to={groupLink(group.key)}><i className="drop" aria-hidden="true" />{group.name}</Link></li>)}</ul>
          </section>
          {data.machines.length > 1 && (
            <section>
              <h2>Machines</h2>
              <ul>{data.machines.map(m => <li key={m.key}><Link to={machineLink(m.key)}>{m.name}</Link></li>)}</ul>
            </section>
          )}
          <section>
            <h2>The whole shelf</h2>
            <ul>
              <li><Link to="/browse">All games, A to Z</Link></li>
              {data.games.some(g => g.highlight) && <li><Link to="/highlights">Highlights</Link></li>}
              <li><Link to="/favorites">Your favorites</Link></li>
              <li><button type="button" onClick={random}>A game at random</button></li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

const Actions = ({ id }: { id: string }) => (
  <nav className="top-actions" aria-label="Shelves and favorites">
    <ShelvesMenu id={id} />
    <Link className="top-btn" to="/favorites" aria-label="Your favorites"><StarIcon size={18} /><span className="top-btn-text">Favorites</span></Link>
  </nav>
);

/** On a wide screen everything sits in one bar that stays in place. On a phone only the search box stays: the name
 *  and the shelves scroll away with the page, so the box that reaches every game keeps the full width. */
export function Header() {
  return (
    <>
      <div className="brandbar"><Brand /><Actions id="shelves-panel-small" /></div>
      <header className="top">
        <div className="wrap top-in">
          <p className="brand"><Brand /></p>
          <SearchBox />
          <Actions id="shelves-panel" />
        </div>
      </header>
    </>
  );
}
