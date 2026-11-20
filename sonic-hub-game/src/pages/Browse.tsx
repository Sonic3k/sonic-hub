/* A shelf read in full: a group, a machine, a series, a tag, the favorites, the highlights, every match of a search,
   or simply everything. One screen serves them all, and it is laid out the same whatever the shelf holds: under the
   shelf's pipe the games that stand up front and the tank, as on the front page; behind them the rest of the shelf
   as tiles. Wading through a long shelf needs the same tools whichever shelf it is: narrow it (chips, filters, a box
   that finds within the shelf), order it, jump to a letter, and switch to a plain list when names matter more than
   pictures. They come when the shelf no longer fits in the window, which is a matter of the screen and not of a
   number of games written here. */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Game } from '../catalog';
import { FRONT, frontOf, useData } from '../data';
import { CloseIcon, ListIcon, SearchIcon, TilesIcon, UpIcon } from '../icons';
import { LETTERS, anyFilter, letterOf, narrow, readFilters, withFilters, type Filters, type Sort } from '../shelf';
import { useFavorites, useRecent } from '../store';
import { groupOf, langName, machineOf, tagName, type Liquid } from '../taxonomy';
import { Front, LineHead, Row, Tile, useSeen } from '../ui';
import { VirtualGrid, gridShape, type GridHandle } from '../VirtualGrid';
import { Missing, useTitle } from './GamePage';

export type ShelfKind = 'group' | 'machine' | 'series' | 'tag' | 'all' | 'search' | 'favorites' | 'highlights';
interface ShelfOf { title: string; liquid: Liquid; base: Game[]; whole?: boolean; group?: string }

/** a letter rail is worth its place once the shelf behind the front runs to this many windows */
const RAIL_WINDOWS = 3;
const SORT_NAME: Record<Sort, string> = { relevance: 'Best match', az: 'A to Z', new: 'Newest on the shelf', year: 'Year, newest first' };

/** The room a shelf has on this screen: how wide its tiles can run and how tall the window is, kept current. It is
 *  read from an element of its own that nothing on the page narrows, so what is decided from it cannot change it. */
function useRoom(): [(node: HTMLDivElement | null) => void, { w: number; h: number }] {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!node) return;
    const read = () => setRoom(r => { const w = node.clientWidth, h = window.innerHeight; return r.w === w && r.h === h ? r : { w, h }; });
    const ro = new ResizeObserver(read);
    ro.observe(node); window.addEventListener('resize', read); read();
    return () => { ro.disconnect(); window.removeEventListener('resize', read); };
  }, [node]);
  return [setNode, room];
}

export default function Browse({ kind }: { kind: ShelfKind }) {
  const data = useData(), { key = '' } = useParams(), [params, setParams] = useSearchParams();
  const favKeys = useFavorites(), recent = useRecent();
  const favs = useMemo(() => new Set(favKeys), [favKeys]);
  const f = readFilters(params);
  const grid = useRef<GridHandle>(null), bar = useRef<HTMLDivElement>(null);
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const [probe, room] = useRoom();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searching = kind === 'search' && !!f.q.trim();

  const shelf = useMemo((): ShelfOf | null => {
    switch (kind) {
      case 'group': { const e = data.groups.find(g => g.group.key === key); return e ? { title: e.group.name, liquid: e.group.liquid, base: e.games, group: e.group.key } : null; }
      case 'machine': { const m = data.machines.find(x => x.key === key); return m ? { title: machineOf(key).name, liquid: 'ice', base: data.games.filter(g => g.machine === key) } : null; }
      case 'series': { const base = data.games.filter(g => g.series === key); return base.length ? { title: key, liquid: groupOf(base[0].group).liquid, base } : null; }
      case 'tag': { const base = data.games.filter(g => g.tags.includes(key)); return base.length ? { title: tagName(key), liquid: 'ice', base } : null; }
      case 'favorites': return { title: 'Your favorites', liquid: 'ice', base: favKeys.map(k => data.byKey.get(k)).filter((g): g is Game => !!g) };
      case 'highlights': return { title: 'Highlights', liquid: 'gold', base: data.games.filter(g => g.highlight) };
      case 'search': return { title: searching ? `Matches for “${f.q.trim()}”` : 'All games', liquid: 'ice', base: data.games, whole: true };
      default: return { title: 'All games', liquid: 'ice', base: data.games, whole: true };
    }
    // the search title follows what was typed
  }, [kind, key, data, favKeys, searching, f.q]);
  useTitle(shelf ? shelf.title : 'Not found');

  // a filter that makes no sense on this shelf is ignored rather than obeyed
  const fx: Filters = useMemo(() => ({ ...f, group: shelf?.group ? '' : f.group, machine: kind === 'machine' ? '' : f.machine, sub: shelf?.group || f.group ? f.sub : '', fav: kind === 'favorites' ? false : f.fav }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, shelf, kind]);

  const list = useMemo(() => {
    if (!shelf) return [];
    const rec = new Set(recent);
    return narrow(shelf.base, !!shelf.whole, fx, { index: data.index, favorites: favs, boost: g => (favs.has(g.key) ? 10 : 0) + (rec.has(g.key) ? 8 : 0) });
  }, [shelf, fx, data, favs, recent]);

  // on a search, the tools describe what the typed words match, not the whole shelf
  const matched = useMemo(() => {
    if (!shelf) return [];
    if (!searching) return shelf.base;
    return narrow(shelf.base, !!shelf.whole, { ...fx, group: '', sub: '', machine: '', lang: '', players: '', touch: false, fav: false, sort: 'relevance' }, { index: data.index, favorites: favs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf, searching, fx.q, data, favs]);

  // what this shelf can be narrowed by: only what is really on it
  const facets = useMemo(() => {
    const base = matched;
    const uniq = <T,>(xs: T[]) => [...new Set(xs)];
    const inGroup = shelf?.group ?? fx.group;
    return {
      groups: shelf?.group ? [] : uniq(base.map(g => g.group)).map(groupOf).sort((a, b) => data.groups.findIndex(x => x.group.key === a.key) - data.groups.findIndex(x => x.group.key === b.key)),
      subs: inGroup ? groupOf(inGroup).subs.filter(s => base.some(g => g.group === inGroup && g.sub === s.key)) : [],
      // a filter that is already on stays in its list, so it can always be seen and taken off
      machines: kind === 'machine' ? [] : data.machines.filter(m => m.key === fx.machine || base.some(g => g.machine === m.key)),
      langs: uniq([...base.map(g => g.lang), ...(fx.lang ? [fx.lang] : [])]).sort(),
      together: base.some(g => g.players > 1), phone: base.some(g => g.inputs.includes('touch')),
    };
  }, [shelf, matched, fx.group, fx.machine, fx.lang, kind, data]);

  // Up front: the games the front page shows for this shelf (a search has none: its best matches come first). They
  // stay where they are while the shelf behind them is narrowed, so nothing above the tools moves under a finger.
  const front = useMemo(() => (!shelf || searching ? [] : kind === 'favorites' ? shelf.base.slice(0, FRONT) : frontOf(shelf.base)), [shelf, searching, kind]);
  const narrowed = anyFilter(fx) || (kind !== 'search' && !!fx.q.trim());
  // behind them, the rest of the shelf; once narrowed, everything that matches, the games up front among it
  const rest = useMemo(() => (narrowed || !front.length ? list : list.filter(g => !front.includes(g))), [list, front, narrowed]);

  // How long the shelf behind the front is, in windows, at the size its tiles take on this screen. The tools for
  // wading come once it no longer fits in one window, and stay while anything is narrowed.
  const behind = searching ? matched.length : (shelf?.base.length ?? 0) - front.length;
  const shape = gridShape(room.w, 'tiles');
  const windows = room.w && room.h ? (Math.ceil(behind / shape.cols) * shape.rowH) / room.h : 0;
  const long = windows > 1 || narrowed;

  const sort: Sort = fx.sort || (fx.q.trim() ? 'relevance' : 'az');
  const railed = sort === 'az' && !fx.q.trim() && windows >= RAIL_WINDOWS;
  const letters = useMemo(() => {
    if (!railed) return null;
    const first = new Map<string, number>();
    rest.forEach((g, i) => { const l = letterOf(g); if (!first.has(l)) first.set(l, i); });
    return first;
  }, [rest, railed]);

  if (!shelf) return <Missing />;

  const set = (patch: Partial<Record<keyof Filters, string | boolean>>) => setParams(withFilters(params, patch), { replace: true });
  const clear = () => setParams(withFilters(new URLSearchParams(), { q: kind === 'search' ? f.q : '', view: f.view }), { replace: true });
  /** the height of everything that stays at the top of the window, so a jump lands below it */
  const clearTop = () => (document.querySelector<HTMLElement>('.top')?.offsetHeight ?? 0) + (bar.current?.offsetHeight ?? 0);
  // nothing to show behind the front: because nothing matches, or because the shelf itself is empty
  const none = !rest.length && (narrowed || searching || !front.length);
  const mixed = !shelf.group && !fx.group;
  const marked = fx.q.trim() || undefined;

  return (
    <div className={`browse liq-${shelf.liquid}`}>
      <div className="room" ref={probe} aria-hidden="true" />
      <div className={`line${seen ? ' open' : ''}`}>
        <LineHead pipe={pipe} level={1} title={shelf.title} />
        <Front games={front} favs={favs} />
      </div>

      {long && (facets.groups.length > 1 || facets.subs.length > 0) && (
        <nav className="wrap chips" aria-label={shelf.group || fx.group ? 'Kinds within this group' : 'Kinds of game'}>
          {facets.groups.length > 1 && (
            <ul>
              <li><button type="button" className={`chip${!fx.group ? ' on' : ''}`} aria-pressed={!fx.group} onClick={() => set({ group: '', sub: '' })}>All kinds</button></li>
              {facets.groups.map(g => <li key={g.key}><button type="button" className={`chip liq-${g.liquid}${fx.group === g.key ? ' on' : ''}`} aria-pressed={fx.group === g.key} onClick={() => set({ group: fx.group === g.key ? '' : g.key, sub: '' })}><i className="drop" aria-hidden="true" />{g.name}</button></li>)}
            </ul>
          )}
          {facets.subs.length > 0 && (
            <ul>
              <li><button type="button" className={`chip${!fx.sub ? ' on' : ''}`} aria-pressed={!fx.sub} onClick={() => set({ sub: '' })}>All {groupOf(shelf.group ?? fx.group).name}</button></li>
              {facets.subs.map(s => <li key={s.key}><button type="button" className={`chip${fx.sub === s.key ? ' on' : ''}`} aria-pressed={fx.sub === s.key} onClick={() => set({ sub: fx.sub === s.key ? '' : s.key })}>{s.name}</button></li>)}
            </ul>
          )}
        </nav>
      )}

      {long && <div className="wrap filters">
        <button type="button" className={`chip filter-toggle${anyFilter(fx) ? ' set' : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)}>Filters</button>
        <div className={`filters-more${filtersOpen ? ' open' : ''}`}>
          {facets.machines.length > 1 && (
            <select className="pick" aria-label="Machine" value={fx.machine} onChange={e => set({ machine: e.target.value })}>
              <option value="">Any machine</option>{facets.machines.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
            </select>
          )}
          {facets.together && (
            <select className="pick" aria-label="Players" value={fx.players} onChange={e => set({ players: e.target.value })}>
              <option value="">Any number of players</option><option value="1">One player</option><option value="2">Two or more on one device</option>
            </select>
          )}
          {facets.langs.length > 1 && (
            <select className="pick" aria-label="Language" value={fx.lang} onChange={e => set({ lang: e.target.value })}>
              <option value="">Any language</option>{facets.langs.map(l => <option key={l} value={l}>{langName(l)}</option>)}
            </select>
          )}
          {facets.phone && <label className="check"><input type="checkbox" checked={fx.touch} onChange={e => set({ touch: e.target.checked })} /><span>Plays on a phone</span></label>}
          {kind !== 'favorites' && favKeys.length > 0 && <label className="check"><input type="checkbox" checked={fx.fav} onChange={e => set({ fav: e.target.checked })} /><span>My favorites</span></label>}
          {narrowed && <button type="button" className="link-btn" onClick={clear}>Clear filters</button>}
        </div>
        <div className="filters-end">
          <select className="pick" aria-label="Order" value={sort} onChange={e => set({ sort: e.target.value === (fx.q.trim() ? 'relevance' : 'az') ? '' : e.target.value })}>
            {(['relevance', 'az', 'new', 'year'] as Sort[]).filter(x => x !== 'relevance' || fx.q.trim()).map(x => <option key={x} value={x}>{SORT_NAME[x]}</option>)}
          </select>
          <div className="view" role="group" aria-label="Show as">
            <button type="button" className={fx.view === 'tiles' ? 'on' : ''} aria-pressed={fx.view === 'tiles'} onClick={() => set({ view: 'tiles' })} aria-label="Tiles" title="Tiles"><TilesIcon size={18} /></button>
            <button type="button" className={fx.view === 'list' ? 'on' : ''} aria-pressed={fx.view === 'list'} onClick={() => set({ view: 'list' })} aria-label="List" title="List"><ListIcon size={18} /></button>
          </div>
        </div>
      </div>}

      {(kind !== 'search' || letters) && long && (
        <div className="wade" ref={bar}>
          <div className="wrap wade-in">
            {kind !== 'search' && (
              <label className="find">
                <span className="sr-only">Find in {shelf.title}</span>
                <SearchIcon size={18} />
                <input type="search" placeholder={`Find in ${shelf.title}`} autoComplete="off" autoCorrect="off" spellCheck={false} value={f.q} onChange={e => set({ q: e.target.value })} />
                {f.q && <button type="button" aria-label="Clear" onClick={() => set({ q: '' })}><CloseIcon size={15} /></button>}
              </label>
            )}
            {letters && (
              <nav className="letters" aria-label="Jump to a letter">
                {LETTERS.map(l => <button type="button" key={l} disabled={!letters.has(l)} onClick={() => grid.current?.scrollTo(letters.get(l)!, clearTop())}>{l}</button>)}
              </nav>
            )}
            <button type="button" className="wade-top" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} aria-label="Back to the top" title="Back to the top"><UpIcon /></button>
          </div>
        </div>
      )}

      {(none || rest.length > 0) && <div className={`wrap shelf-body${long ? ' long' : ''}`}>
        {none ? (
          <div className="notice notice-in">
            {kind === 'favorites' && !narrowed
              ? <><p className="notice-title">No favorites yet</p><p>Star a game and it will wait for you here.</p><Link className="btn btn-play" to="/">See all games</Link></>
              : !narrowed && !searching
              ? <><p className="notice-title">Nothing on this shelf yet</p><Link className="btn btn-play" to="/">See all games</Link></>
              : <><p className="notice-title">Nothing here matches</p><p>{fx.q.trim() && !anyFilter(fx) ? 'Try another name it goes by, or fewer words.' : 'Loosen a filter to see more.'}</p>{narrowed && <button type="button" className="btn btn-steel" onClick={clear}>Clear filters</button>}</>}
          </div>
        ) : (
          <VirtualGrid ref={grid} items={rest} view={fx.view}>
            {g => (fx.view === 'list'
              ? <Row game={g} fav={favs.has(g.key)} mixed={mixed} query={marked} />
              : <Tile game={g} fav={favs.has(g.key)} mixed={mixed} query={marked} />)}
          </VirtualGrid>
        )}
      </div>}
    </div>
  );
}
