import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Shell from './components/Shell';
import Home from './pages/Home';
import Journal from './pages/Journal';
import Post from './pages/Post';
import Soon from './pages/Soon';
import Photos from './pages/Photos';
import { AlbumPage, AlbumsIndex } from './pages/Albums';
import Region from './pages/Region';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="journal" element={<Journal />} />
            <Route path="journal/id/:id" element={<Post />} />
            <Route path="journal/:slug" element={<Post />} />
            <Route path="photos" element={<Photos />} />
            <Route path="photos/albums" element={<AlbumsIndex />} />
            <Route path="photos/albums/:id" element={<AlbumPage />} />
            <Route path="tags/:name" element={<Region />} />
            <Route path="angels" element={<Soon title="Angels" line="Mỗi người một câu chuyện — đang được thiết kế ở bước tiếp theo." />} />
            <Route path="games" element={<Soon title="Game" line="Kệ game — đang được thiết kế ở bước tiếp theo." />} />
            <Route path="football" element={<Soon title="Bóng đá" line="Chưa cấu hình địa chỉ trang Fantasy (VITE_FOOTBALL_URL)." />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
