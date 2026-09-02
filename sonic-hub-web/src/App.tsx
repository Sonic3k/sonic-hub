import { Route, Routes } from 'react-router-dom';
import Shell from './components/layout/Shell';
import FolderPage from './pages/photos/FolderPage';
import TimelinePage from './pages/photos/TimelinePage';
import AngelsPage from './pages/angels/AngelsPage';
import PersonPage from './pages/angels/PersonPage';
import ChatReaderPage from './pages/angels/ChatReaderPage';
import Placeholder from './pages/Placeholder';
import HomePage from './pages/HomePage';
import ArticlesPage from './pages/articles/ArticlesPage';
import ArticlePage from './pages/articles/ArticlePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="/photos" element={<FolderPage />} />
        <Route path="/photos/timeline" element={<TimelinePage />} />
        <Route path="/photos/f/:id" element={<FolderPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/angels" element={<AngelsPage />} />
        <Route path="/angels/:id" element={<PersonPage tab="photos" />} />
        <Route path="/angels/:id/folders" element={<PersonPage tab="folders" />} />
        <Route path="/angels/:id/chats" element={<PersonPage tab="chats" />} />
        <Route path="/angels/:id/chats/:archiveId" element={<ChatReaderPage />} />
        <Route path="/games" element={<ArticlesPage fixedCategory="Game" title="Game" />} />
        <Route path="/football" element={<ArticlesPage fixedCategory="Bóng đá" title="Bóng đá" note="Football fantasy — mục này sẽ có phần riêng về các đội bóng. Hiện tại là bài viết gắn mục Bóng đá." />} />
        <Route path="*" element={<Placeholder title="Không có trang này" note="Đường dẫn không tồn tại." />} />
      </Route>
    </Routes>
  );
}
