import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import AppLayout from './components/layout/AppLayout'
import TasksPage from './pages/TasksPage'
import TagsPage from './pages/TagsPage'
import ProjectsPage from './pages/ProjectsPage'
import TodosPage from './pages/TodosPage'
import ProblemsPage from './pages/ProblemsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 30 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<TasksPage />} />
            <Route path="todos" element={<TodosPage />} />
            <Route path="problems" element={<ProblemsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="tags" element={<TagsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
