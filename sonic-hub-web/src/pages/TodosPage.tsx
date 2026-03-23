import { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useTodos, useCreateTodo, useToggleTodo } from '../hooks'
import TodoPanel from '../components/panel/TodoPanel'
import type { Todo } from '../types'

export default function TodosPage() {
  const [selected, setSelected] = useState<Todo | null>(null)
  const [filter, setFilter]     = useState<'open' | 'all' | 'done'>('open')
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)

  const { data: todos = [], isLoading } = useTodos()
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()

  const visible = todos.filter(t =>
    filter === 'all' ? true : filter === 'open' ? !t.done : t.done
  )

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTodo.mutate({ title: newTitle.trim() }, { onSuccess: () => { setNewTitle(''); setAdding(false) } })
  }

  return (
    <div className="flex h-full relative">
      <div className={`flex flex-col overflow-hidden transition-all
        ${selected ? 'hidden md:flex md:flex-1' : 'flex flex-1'}`}>

        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: '#e8e0d4' }}>
          <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Todos</h1>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
            style={{ background: '#c17f3e', color: '#fff' }}>
            <Plus size={14} strokeWidth={2.5} /> New
          </button>
        </div>

        <div className="flex gap-1 px-4 md:px-6 py-2 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          {(['open','all','done'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors"
              style={filter === f ? { background: '#1a1208', color: '#faf8f5' } : { background: 'transparent', color: '#9a8a7a' }}>
              {f}
            </button>
          ))}
        </div>

        {adding && (
          <form onSubmit={handleCreate}
            className="flex items-center gap-3 px-4 md:px-6 py-3 border-b bg-white flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#d8d0c8' }} />
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs doing..."
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: '#1a1208', caretColor: '#c17f3e' }} />
          </form>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-4 md:px-6 pt-4 space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: '#ede9e3' }} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm" style={{ color: '#b0a090' }}>
                {filter === 'done' ? 'Nothing done yet' : 'All clear! ✨'}
              </p>
            </div>
          ) : visible.map(todo => {
            const isSel = selected?.id === todo.id
            return (
              <div key={todo.id} onClick={() => setSelected(isSel ? null : todo)}
                className="flex items-center gap-3 px-4 md:px-6 py-3 cursor-pointer transition-colors active:bg-orange-50"
                style={{
                  background: isSel ? '#f0e8de' : 'transparent',
                  borderLeft: isSel ? '3px solid #c17f3e' : '3px solid transparent',
                }}>
                <button onClick={e => { e.stopPropagation(); toggleTodo.mutate(todo.id) }}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-90 transition-colors"
                  style={{ borderColor: todo.done ? '#7a9a6a' : '#c8bdb0', background: todo.done ? '#7a9a6a' : 'transparent' }}>
                  {todo.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                </button>
                <span className="flex-1 text-sm font-medium"
                  style={{ color: todo.done ? '#b0a090' : '#1a1208', textDecoration: todo.done ? 'line-through' : 'none' }}>
                  {todo.title}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {todo.projectName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: '#f0e8de', color: '#8a6a4a' }}>{todo.projectName}</span>
                  )}
                  {todo.tags.slice(0,2).map(tag => (
                    <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: tag.color + '20', color: tag.color }}>{tag.name}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="absolute inset-0 md:static md:inset-auto flex flex-col z-10" style={{ background: '#faf8f5' }}>
          <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#c17f3e' }}>
              <ArrowLeft size={16} /> Todos
            </button>
          </div>
          <TodoPanel key={selected.id} todo={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
