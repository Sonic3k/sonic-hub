import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Portal from './pages/Portal';
import Arrival from './pages/Arrival';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/r/:room" element={<Portal />} />
          <Route path="/t/:tag" element={<Portal />} />
          <Route path="/photos" element={<Arrival app="photos" />} />
          <Route path="/journal" element={<Arrival app="journal" />} />
          <Route path="/journal/:slug" element={<Arrival app="journal" />} />
          <Route path="/angels" element={<Arrival app="angels" />} />
          <Route path="/games" element={<Arrival app="games" />} />
          <Route path="/football" element={<Arrival app="football" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
