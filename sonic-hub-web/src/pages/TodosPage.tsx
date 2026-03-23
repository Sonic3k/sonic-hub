import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTodos, useCreateTodo } from '../hooks'
import TodoCard from '../components/card/TodoCard'
import TodoDetail from '../components/panel/TodoDetail'
import MasonryGrid, { MasonryItem } from '../components/card/MasonryGrid'
import type { Todo } from '../types'

export default function TodosPage() {
  const [filter, setFilter]         = useState<'open' | 'all' | 'done'>('open')
  const [fullScreen, setFullScreen] = useState<Todo | null>(null)
  const [newTitle, setNewTitle]     = useState('')
  const [adding, setAdding]         = useState(false)

  const { data: todos = [], isLoading } = useTodos()
  const createTodo = useCreateTodo()

  const visible = todos.filter(t =>
    filter === 'all' ? true : filter === 'open' ? !t.done : t.done)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTodo.mutate({ title: newTitle.trim() },
      { onSuccess: () => { setNewTitle(''); setAdding(false) } })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4' }}>
        <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Todos</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
          style={{ background: '#7a9a6a', color: '#fff' }}>
          <Plus size={14} strokeWidth={2.5} /> New
        </button>
      </div>

      <div className="flex gap-1 px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
        {(['open', 'all', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors"
            style={filter === f ? { background: '#1a1208', color: '#faf8f5' } : { background: 'transparent', color: '#9a8a7a' }}>
            {f}
          </button>
        ))}
      </div>

      {adding && (
        <form onSubmit={handleCreate}
          className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
          style={{ background: '#fff', borderColor: '#e8e0d4' }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#7a9a6a' }} />
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="What needs doing..."
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            className="flex-1 text-sm bg-transparent outline-none border-none"
            style={{ color: '#1a1208', caretColor: '#7a9a6a' }} />
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <MasonryGrid>
            {[...Array(4)].map((_, i) => (
              <MasonryItem key={i}>
                <div className="h-16 rounded-2xl animate-pulse" style={{ background: '#ede9e3' }} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        ) : visible.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: '#b0a090' }}>
              {filter === 'done' ? 'Nothing done yet' : 'All clear! ✨'}
            </p>
          </div>
        ) : (
          <MasonryGrid>
            {visible.map(todo => (
              <MasonryItem key={todo.id}>
                <TodoCard todo={todo} onFullScreen={setFullScreen} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        )}
      </div>

      {fullScreen && <TodoDetail todo={fullScreen} onClose={() => setFullScreen(null)} />}
    </div>
  )
}
