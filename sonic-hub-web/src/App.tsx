import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/layout/Shell';
import FolderPage from './pages/photos/FolderPage';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/photos" replace />} />
        <Route path="/photos" element={<FolderPage />} />
        <Route path="/photos/f/:id" element={<FolderPage />} />
        <Route path="/articles" element={<Placeholder title="Bài viết" note="Chưa có bài nào. Mục này sẽ đọc từ Journal (kind = ARTICLE, đã đăng)." />} />
        <Route path="/angels" element={<Placeholder title="Angels" note="Những người từng quen. Đang dựng." />} />
        <Route path="/games" element={<Placeholder title="Game" note="Chưa có gì ở đây." />} />
        <Route path="/football" element={<Placeholder title="Bóng đá" note="Football fantasy. Chưa có gì ở đây." />} />
        <Route path="*" element={<Placeholder title="Không có trang này" note="Đường dẫn không tồn tại." />} />
      </Route>
    </Routes>
  );
}
