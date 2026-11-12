import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { DataProvider, turnOffTestShelf, useData } from './data';
import { Header } from './Header';
import Browse from './pages/Browse';
import GamePage, { Missing } from './pages/GamePage';
import Home from './pages/Home';
import Player from './pages/Player';

const SCROLL = 'sonic-hub-games.scroll';

/** the name a screen's place is kept under: its history entry, or its address for the entry the tab was opened on
 *  (those all share one key, and must not hand their place to one another) */
const placeOf = (loc: { key: string; pathname: string; search: string }) => loc.key === 'default' ? `default ${loc.pathname}${loc.search}` : loc.key;
/** true when this document was opened by a link or a typed address, not by a reload or a step through history */
const arrivedFresh = () => {
  try { return (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'navigate'; } catch { return false; }
};

/** Going back lands where the visitor was, however long the shelf: each screen's place is kept by its history entry,
 *  and survives leaving the portal for a game and returning. A new screen starts at its top. */
function useScrollMemory() {
  const loc = useLocation(), type = useNavigationType();
  const key = useRef(placeOf(loc)), places = useRef<Record<string, number>>({}), first = useRef(true);
  useEffect(() => {
    try { history.scrollRestoration = 'manual'; places.current = JSON.parse(sessionStorage.getItem(SCROLL) ?? '{}'); } catch { /* nothing kept */ }
    const keep = () => {
      places.current[key.current] = window.scrollY;
      const ks = Object.keys(places.current);
      if (ks.length > 60) delete places.current[ks[0]];
      try { sessionStorage.setItem(SCROLL, JSON.stringify(places.current)); } catch { /* nothing kept */ }
    };
    let t = 0;
    const soon = () => { clearTimeout(t); t = window.setTimeout(keep, 120); };
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('pagehide', keep);
    return () => { window.removeEventListener('scroll', soon); window.removeEventListener('pagehide', keep); clearTimeout(t); };
  }, []);
  useLayoutEffect(() => {
    const id = placeOf(loc), opening = first.current;
    key.current = id; first.current = false;
    if (type === 'PUSH') { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
    if (type !== 'POP') return;
    // the router calls the first screen of a document a step through history; a fresh visit still starts at the top
    if (opening && arrivedFresh()) return;
    const y = places.current[id] ?? (() => { try { return JSON.parse(sessionStorage.getItem(SCROLL) ?? '{}')[id]; } catch { return 0; } })();
    if (!y) return;
    // the shelf takes a frame or two to reach its full height: keep going until the place is reachable
    let tries = 0, frame = 0;
    const go = () => { window.scrollTo({ top: y, behavior: 'instant' }); if (Math.abs(window.scrollY - y) > 2 && tries++ < 30) frame = requestAnimationFrame(go); };
    go();
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.key, type]);
}

function TestBar() {
  const { testCount } = useData();
  if (!testCount) return null;
  return (
    <div className="testbar">
      <span>Test shelf on: {testCount.toLocaleString('en-US')} sample entries with no games behind them.</span>
      <button type="button" onClick={turnOffTestShelf}>Turn off</button>
    </div>
  );
}

/** Above every screen, the player included, so a step back from a game played in the portal finds its place again. */
function Root() {
  useScrollMemory();
  return <Outlet />;
}

function Layout() {
  return (
    <>
      <TestBar />
      <Header />
      <main><Outlet /></main>
      <footer className="pool" aria-hidden="true">
        <div className="pool-glint" />
        {[0, 1, 2, 3, 4].map(i => <i key={i} className={`bub b${i}`} style={{ '--at': `${12 + i * 19}%` } as CSSProperties} />)}
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route element={<Root />}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="browse" element={<Browse kind="all" />} />
            <Route path="search" element={<Browse kind="search" />} />
            <Route path="group/:key" element={<Browse kind="group" />} />
            <Route path="machine/:key" element={<Browse kind="machine" />} />
            <Route path="series/:key" element={<Browse kind="series" />} />
            <Route path="tag/:key" element={<Browse kind="tag" />} />
            <Route path="favorites" element={<Browse kind="favorites" />} />
            <Route path="highlights" element={<Browse kind="highlights" />} />
            <Route path="game/:key" element={<GamePage />} />
            <Route path="*" element={<Missing />} />
          </Route>
          <Route path="play/:key" element={<Player />} />
          </Route>
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
