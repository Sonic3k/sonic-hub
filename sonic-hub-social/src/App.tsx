import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { social } from './api';
import { fromAt, MomentContext, useAtParam, utc } from './time';
import TimeBar from './ui/TimeBar';
import Launcher from './Launcher';
import FbShell from './fb/FbShell';
import Home from './fb/Home';
import Profile from './fb/Profile';
import PostPage from './fb/PostPage';
import Friendship from './fb/Friendship';
import Messenger from './messenger/Messenger';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60_000 } } });

/** T for everything under it: the ?at= of the address, or the newest moment there is data for. */
function Moment({ children }: { children: ReactNode }) {
  const at = useAtParam();
  const range = useQuery({ queryKey: ['range'], queryFn: social.range });
  const latest = utc(range.data?.latest);
  const T = (at ? fromAt(at) : null) ?? latest ?? new Date();
  return <MomentContext.Provider value={{ at, T, latest }}>{children}</MomentContext.Provider>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Moment>
          <TimeBar />
          <Routes>
            <Route index element={<Launcher />} />
            <Route path="facebook" element={<FbShell />}>
              <Route index element={<Home />} />
              <Route path="post/:id" element={<PostPage />} />
              <Route path="friendship/:a/:b" element={<Friendship />} />
              <Route path=":ref" element={<Profile />} />
              <Route path=":ref/photos/:albumId" element={<Profile />} />
              <Route path=":ref/:tab" element={<Profile />} />
            </Route>
            <Route path="messenger" element={<Messenger />} />
            <Route path="messenger/:id" element={<Messenger />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Moment>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
