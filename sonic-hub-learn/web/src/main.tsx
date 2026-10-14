import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { NoteCard } from './components/Bits';
import { Screen } from './components/Screen';
import { Course, Courses } from './screens/Courses';
import { Exam } from './screens/Exam';
import { Flash } from './screens/Flash';
import { Home } from './screens/Home';
import { Learn, StartSession } from './screens/Learn';
import { Lesson } from './screens/Lesson';
import './styles/onthi.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function NotFound() {
  return (
    <Screen>
      <NoteCard
        action={
          <Link className="btn" to="/">
            Về trang chính
          </Link>
        }
      >
        Không có trang này.
      </NoteCard>
    </Screen>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/course/:key" element={<Course />} />
          <Route path="/lesson/:id" element={<Lesson />} />
          <Route path="/learn/daily" element={<Learn kind="daily" />} />
          <Route path="/learn/lesson/:lessonId" element={<StartSession kind="lesson" />} />
          <Route path="/learn/course/:key" element={<StartSession kind="course" />} />
          <Route path="/learn/weak" element={<StartSession kind="weak" />} />
          <Route path="/session/:sessionId" element={<Learn kind="session" />} />
          <Route path="/flash" element={<Flash />} />
          <Route path="/flash/:key" element={<Flash />} />
          <Route path="/flash/:key/:sessionId" element={<Flash />} />
          <Route path="/exam/:key" element={<Exam />} />
          <Route path="/exam/:key/:sessionId" element={<Exam />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// Installable app shell (the study data always comes fresh from the API).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
