import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/layout/Shell';
import FolderPage from './pages/photos/FolderPage';
import TimelinePage from './pages/photos/TimelinePage';
import AngelsPage from './pages/angels/AngelsPage';
import PersonPage from './pages/angels/PersonPage';
import ChatReaderPage from './pages/angels/ChatReaderPage';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/photos" replace />} />
        <Route path="/photos" element={<FolderPage />} />
        <Route path="/photos/timeline" element={<TimelinePage />} />
        <Route path="/photos/f/:id" element={<FolderPage />} />
        <Route path="/articles" element={<Placeholder title="Bài viết" note="Chưa có bài nào. Mục này sẽ đọc từ Journal (kind = ARTICLE, đã đăng)." />} />
        <Route path="/angels" element={<AngelsPage />} />
        <Route path="/angels/:id" element={<PersonPage tab="photos" />} />
        <Route path="/angels/:id/folders" element={<PersonPage tab="folders" />} />
        <Route path="/angels/:id/chats" element={<PersonPage tab="chats" />} />
        <Route path="/angels/:id/chats/:archiveId" element={<ChatReaderPage />} />
        <Route path="/games" element={<Placeholder title="Game" note="Chưa có gì ở đây." />} />
        <Route path="/football" element={<Placeholder title="Bóng đá" note="Football fantasy. Chưa có gì ở đây." />} />
        <Route path="*" element={<Placeholder title="Không có trang này" note="Đường dẫn không tồn tại." />} />
      </Route>
    </Routes>
  );
}
