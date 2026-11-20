/* The shelf's back room: which games are picked out to stand in front of their kind. The game service keeps them,
   so a press here is all it takes, and the shelf follows at once. Nobody signs in, as everywhere on that service.
   No page of the shelf links here: it is reached by its address, /admin. */
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { gamePage, type Game } from '../catalog';
import { FRONT, useData, useHighlightControl } from '../data';
import { HighlightError } from '../highlights';
import { CloseIcon, SearchIcon } from '../icons';
import { search } from '../search';
import { groupOf } from '../taxonomy';
import { LineHead, Marked, liq, useSeen } from '../ui';
import { VirtualGrid } from '../VirtualGrid';
import { useTitle } from './GamePage';

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

interface LineProps { game: Game; upFront: boolean; busy: boolean; locked: boolean; query?: string; onPress: (g: Game) => void }
/** One game: the button that picks it out or drops it, what it is, and whether it is up front on the shelf as things stand. */
const PickLine = memo(function PickLine({ game, upFront, busy, locked, query, onPress }: LineProps) {
  return (
    <article className={`pickline ${liq(game)}${game.highlight ? ' on' : ''}`}>
      <button type="button" className="pick-btn" aria-pressed={game.highlight} aria-busy={busy} disabled={locked} onClick={() => onPress(game)}
        aria-label={`${game.highlight ? 'Highlighted' : 'Highlight'}: ${game.title}`}>
        <i className="pick-mark" aria-hidden="true" />{game.highlight ? 'Highlighted' : 'Highlight'}
      </button>
      <h3 className="row-name" lang={game.lang}><Link to={gamePage(game)}><Marked title={game.title} query={query} /></Link></h3>
      <span className="row-where">{groupOf(game.group).name}</span>
      <span className="pick-added">{game.added ? `On the shelf since ${day(game.added)}` : ''}</span>
      <span className="pick-front">{upFront ? 'Up front' : ''}</span>
    </article>
  );
});

export default function Admin() {
  const data = useData(), service = useHighlightControl();
  const [params, setParams] = useSearchParams();
  const group = params.get('group') ?? '', q = params.get('q') ?? '';
  const [saving, setSaving] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [pipe, seen] = useSeen<HTMLDivElement>();
  useTitle('Pick the highlights');
  // a room of the house, not a page of the shelf: search engines are asked to leave it out
  useEffect(() => {
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  // every real game as it stands on the shelf, kind by kind; the first of each kind are the ones up front
  const kinds = useMemo(() => data.groups.map(e => ({ group: e.group, games: e.games.filter(g => !g.test) })).filter(e => e.games.length), [data]);
  const upFront = useMemo(() => new Set(data.groups.flatMap(e => e.games.slice(0, FRONT))), [data]);
  const shown = useMemo(() => {
    const among = (g: Game) => !g.test && (!group || g.group === group);
    return q.trim() ? search(data.index, q, { among }).map(h => h.game) : kinds.flatMap(e => e.games).filter(among);
  }, [data, kinds, group, q]);

  // picked out in the service with no game on the shelf by that key: a game renamed or taken off since. They show
  // nowhere, so they are named here, where they can be dropped.
  const strays = useMemo(() => [...service.picked.keys()].filter(k => !data.byKey.has(k)).sort(), [service.picked, data]);

  const locked = service.state !== 'live' || saving !== null;
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace: true });
  };
  const change = useCallback(async (key: string, name: string, on: boolean) => {
    setSaving(key); setTrouble(null);
    try { await service.set(key, on); }
    catch (e) { setTrouble(e instanceof HighlightError ? (e.full ? e.message : `${e.message} “${name}” stays as it was.`) : `That did not go through. “${name}” stays as it was.`); }
    finally { setSaving(null); }
  }, [service.set]);
  const press = useCallback((g: Game) => { void change(g.key, g.title, !g.highlight); }, [change]);

  return (
    <div className="browse backroom liq-gold">
      <div className={`line${seen ? ' open' : ''}`}>
        <LineHead pipe={pipe} level={1} title="Pick the highlights" />
      </div>
      <div className="wrap">
        <p className="backroom-how">
          Every kind of game shows two games up front, large. Its highlights come first, the one picked last before the others.
          A kind with fewer than two highlights is filled up with its newest games.
        </p>
      </div>

      {service.state === 'off' && (
        <div className="wrap backroom-said" role="alert">
          <p>The game service did not answer, so nothing can be changed right now. The shelf stands as it was last heard.</p>
          <button type="button" className="see-all" onClick={service.ask}>Ask again</button>
        </div>
      )}
      {service.state === 'asking' && <p className="wrap backroom-said" role="status">Asking the game service which games are picked out.</p>}
      {trouble && <p className="wrap backroom-said" role="alert">{trouble}</p>}
      {strays.length > 0 && (
        <div className="wrap backroom-said">
          <p>Picked out, but the shelf has no game by {strays.length > 1 ? 'these keys' : 'this key'}:</p>
          {strays.map(k => <button type="button" key={k} className="see-all" disabled={locked} onClick={() => { void change(k, k, false); }}>Drop {k}</button>)}
        </div>
      )}

      <nav className="wrap chips" aria-label="Kinds of game">
        <ul>
          <li><button type="button" className={`chip${!group ? ' on' : ''}`} aria-pressed={!group} onClick={() => set({ group: '' })}>All kinds</button></li>
          {kinds.map(e => (
            <li key={e.group.key}>
              <button type="button" className={`chip liq-${e.group.liquid}${group === e.group.key ? ' on' : ''}`} aria-pressed={group === e.group.key}
                onClick={() => set({ group: group === e.group.key ? '' : e.group.key })}><i className="drop" aria-hidden="true" />{e.group.name}</button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="wrap backroom-find">
        <label className="find">
          <span className="sr-only">Find a game</span>
          <SearchIcon size={18} />
          <input type="search" placeholder="Find a game" autoComplete="off" autoCorrect="off" spellCheck={false} value={q} onChange={e => set({ q: e.target.value })} />
          {q && <button type="button" aria-label="Clear" onClick={() => set({ q: '' })}><CloseIcon size={15} /></button>}
        </label>
      </div>

      <div className="wrap shelf-body">
        {!shown.length ? (
          <div className="notice notice-in"><p className="notice-title">No game by that name</p><p>Try another name it goes by, or fewer words.</p></div>
        ) : (
          <VirtualGrid items={shown} view="list">
            {g => <PickLine game={g} upFront={upFront.has(g)} busy={saving === g.key} locked={locked} query={q.trim() || undefined} onPress={press} />}
          </VirtualGrid>
        )}
      </div>
    </div>
  );
}
