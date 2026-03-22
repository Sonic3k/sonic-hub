import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BoardPage from './pages/BoardPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 30 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BoardPage />
    </QueryClientProvider>
  )
}
