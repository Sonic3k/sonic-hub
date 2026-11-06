/* Facebook and its Messenger as a site inside a browser (or a phone app): the pages of the Social Media portal, run in
   a router of their own so links move within the window, and the address they reach is reported to the address bar.
   The site scrolls in its own box; the photo viewer opens over that box, not over the whole screen. */
import { useEffect, useState } from 'react';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import FbShell from './fb/FbShell';
import Home from './fb/Home';
import Profile from './fb/Profile';
import PostPage from './fb/PostPage';
import Friendship from './fb/Friendship';
import Messenger from './messenger/Messenger';
import { LayerHost } from './ui/layer';

function Report({ onPath }: { onPath?: (path: string) => void }) {
  const loc = useLocation();
  useEffect(() => { onPath?.(loc.pathname); }, [loc.pathname, onPath]);
  return null;
}

/** path: "/facebook/…" or "/messenger/…" */
export function FacebookSite({ path, onPath }: { path: string; onPath?: (path: string) => void }) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  return (
    <div className="fbx-site">
      <LayerHost.Provider value={layer}>
        <div className="fbx-scroll">
          <div className="fbx">
            <MemoryRouter key={path} initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Report onPath={onPath} />
              <Routes>
                <Route path="/facebook" element={<FbShell />}>
                  <Route index element={<Home />} />
                  <Route path="post/:id" element={<PostPage />} />
                  <Route path="friendship/:a/:b" element={<Friendship />} />
                  <Route path=":ref" element={<Profile />} />
                  <Route path=":ref/photos/:albumId" element={<Profile />} />
                  <Route path=":ref/:tab" element={<Profile />} />
                </Route>
                <Route path="/messenger" element={<Messenger />} />
                <Route path="/messenger/:id" element={<Messenger />} />
                <Route path="*" element={<Navigate to="/facebook" replace />} />
              </Routes>
            </MemoryRouter>
          </div>
        </div>
        <div className="fbx fbx-layer" ref={setLayer} />
      </LayerHost.Provider>
    </div>
  );
}
