/* The catalogue once loaded and laid out (arrange.ts), handed to every screen. Which games are picked out comes from
   the game service and is laid over the catalogue here, so every screen reads one list. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { arrange, takeStock, type Data } from './arrange';
import { NO_PICKS, fetchCatalog, type Game, type Picked } from './catalog';
import { fetchHighlights, keepHighlights, keptHighlights, samePicks, setHighlight } from './highlights';

export { BEHIND, FRONT, frontOf, groupLink, machineLink, seriesLink, tagLink, type Data } from './arrange';

const TEST = 'sonic-hub-games.test';
/** The size of the test shelf asked for with ?test=N, remembered until the tab closes or it is turned off. */
export function testShelfSize(): number {
  try {
    const asked = new URLSearchParams(location.search).get('test');
    if (asked !== null) { const n = Math.max(0, Math.min(20000, Math.floor(Number(asked)) || 0)); if (n) sessionStorage.setItem(TEST, String(n)); else sessionStorage.removeItem(TEST); }
    return Number(sessionStorage.getItem(TEST)) || 0;
  } catch { return 0; }
}
export function turnOffTestShelf() {
  try { sessionStorage.removeItem(TEST); } catch { /* nothing kept */ }
  const u = new URL(location.href); u.searchParams.delete('test'); location.replace(u.pathname + u.search);
}

/** The highlights as the game service has them, and the two things the shelf's back room does with them. */
export interface HighlightControl {
  /** asking: not heard from the service yet; live: as it has them now; off: it did not answer */
  state: 'asking' | 'live' | 'off';
  /** every key picked out, also one the shelf has no game for (a game renamed or taken off since) */
  picked: Picked;
  /** asks the service again */
  ask(): void;
  /** picks a game out or drops it; the shelf follows once the service has answered. Rejects with a HighlightError. */
  set(game: string, on: boolean): Promise<void>;
}

const Ctx = createContext<Data | null>(null);
const HighlightCtx = createContext<HighlightControl | null>(null);
export const useData = (): Data => useContext(Ctx)!;
export const useHighlightControl = (): HighlightControl => useContext(HighlightCtx)!;

/** how long a browser that has never heard the highlights waits for them before it shows the shelf without */
const FIRST_WAIT = 1200;
const pause = (ms: number) => new Promise<void>(done => setTimeout(done, ms));

export function DataProvider({ children }: { children: ReactNode }) {
  const [real, setReal] = useState<Game[] | null>(null);
  const [failed, setFailed] = useState(false);
  const kept = useRef(keptHighlights());
  const [heard, setHeard] = useState<{ state: HighlightControl['state']; picked: Picked }>({ state: 'asking', picked: kept.current ?? NO_PICKS });
  const testCount = useRef(testShelfSize()).current;

  /** settles either way: a service that does not answer leaves the shelf as it stands */
  const ask = useCallback((): Promise<void> => {
    setHeard(h => (h.state === 'asking' ? h : { ...h, state: 'asking' }));
    return fetchHighlights().then(
      picked => setHeard(h => ({ state: 'live', picked: samePicks(h.picked, picked) ? h.picked : picked })),
      () => setHeard(h => ({ ...h, state: 'off' })),
    );
  }, []);
  const set = useCallback(async (game: string, on: boolean) => {
    const since = await setHighlight(game, on);
    setHeard(h => { const picked = new Map(h.picked); if (since) picked.set(game, since); else picked.delete(game); return { ...h, state: 'live', picked }; });
  }, []);
  // what the service said last, or the back room just changed, is what the next visit starts from
  useEffect(() => { if (heard.state === 'live') keepHighlights(heard.picked); }, [heard]);

  const load = useCallback(() => {
    setFailed(false);
    // asked alongside the catalogue. A browser that heard them before shows the shelf at once and follows if they changed
    const asked = ask();
    Promise.all([fetchCatalog(), kept.current ? null : Promise.race([asked, pause(FIRST_WAIT)])]).then(([games]) => setReal(games), () => setFailed(true));
  }, [ask]);
  useEffect(load, [load]);

  const stock = useMemo(() => (real ? takeStock(real, testCount) : null), [real, testCount]);
  const data = useMemo(() => (stock ? arrange(stock, heard.picked) : null), [stock, heard.picked]);
  const control = useMemo((): HighlightControl => ({ state: heard.state, picked: heard.picked, ask: () => { void ask(); }, set }), [heard, ask, set]);

  if (failed) return (
    <div className="notice">
      <p>The list of games did not load.</p>
      <button type="button" className="btn btn-steel" onClick={load}>Try again</button>
    </div>
  );
  if (!data) return <div className="notice" aria-busy="true"><p>Loading the shelf</p></div>;
  return <HighlightCtx.Provider value={control}><Ctx.Provider value={data}>{children}</Ctx.Provider></HighlightCtx.Provider>;
}
