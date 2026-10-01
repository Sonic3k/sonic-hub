import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WarpProvider } from './cosmos/Warp';
import Portal from './pages/Portal';
import Section from './pages/Section';
import TagWorld from './pages/TagWorld';
import Arrival from './pages/Arrival';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <WarpProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Portal />} />
            <Route path="/s/:id" element={<Section />} />
            <Route path="/t/:name" element={<TagWorld />} />
            <Route path="/photos" element={<Arrival app="photos" />} />
            <Route path="/journal" element={<Arrival app="journal" />} />
            <Route path="/journal/:slug" element={<Arrival app="journal" />} />
            <Route path="/angels" element={<Arrival app="angels" />} />
            <Route path="/games" element={<Arrival app="games" />} />
            <Route path="/football" element={<Arrival app="football" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WarpProvider>
    </QueryClientProvider>
  );
}
