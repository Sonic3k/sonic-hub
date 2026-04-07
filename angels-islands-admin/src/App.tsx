import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './components/layout/AppLayout'
import PersonsPage from './pages/PersonsPage'
import PersonDetailPage from './pages/PersonDetailPage'
import CollectionsPage from './pages/CollectionsPage'
import MediaPage from './pages/MediaPage'
import TagsPage from './pages/TagsPage'
import MemoryPage from './pages/MemoryPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 30 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<PersonsPage />} />
            <Route path="persons/:id" element={<PersonDetailPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="memory" element={<MemoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
