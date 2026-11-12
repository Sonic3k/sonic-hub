import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { DataProvider, turnOffTestShelf, useData } from './data';
import { Header } from './Header';
import Browse from './pages/Browse';
import GamePage, { Missing } from './pages/GamePage';
import Home from './pages/Home';

const SCROLL = 'sonic-hub-games.scroll';

/** Going back lands where the visitor was, however long the shelf: each screen's place is kept by its history entry,
 *  and survives leaving the portal for a game and returning. A new screen starts at its top. */
function useScrollMemory() {
  const loc = useLocation(), type = useNavigationType();
  const key = useRef(loc.key), places = useRef<Record<string, number>>({});
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
    key.current = loc.key;
    if (type === 'PUSH') { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
    if (type !== 'POP') return;
    const y = places.current[loc.key] ?? (() => { try { return JSON.parse(sessionStorage.getItem(SCROLL) ?? '{}')[loc.key]; } catch { return 0; } })();
    if (!y) return;
    // the shelf takes a frame or two to reach its full height: keep going until the place is reachable
    let tries = 0, frame = 0;
    const go = () => { window.scrollTo({ top: y, behavior: 'instant' }); if (Math.abs(window.scrollY - y) > 2 && tries++ < 30) frame = requestAnimationFrame(go); };
    go();
    return () => cancelAnimationFrame(frame);
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

function Layout() {
  useScrollMemory();
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
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
