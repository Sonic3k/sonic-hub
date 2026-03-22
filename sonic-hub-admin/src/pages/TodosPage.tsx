import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Modal, Select } from '../components/ui'
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from '../hooks/useTodos'
import { useProjects } from '../hooks/useProjects'
import { useTags } from '../hooks/useTags'
import type { TodoRequest } from '../types'
import clsx from 'clsx'

function TodoForm({ onSubmit, onClose, isLoading }: {
  onSubmit: (data: TodoRequest) => void
  onClose: () => void
  isLoading?: boolean
}) {
  const { data: projects = [] } = useProjects()
  const { data: tags = [] } = useTags()
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), projectId: projectId || undefined, tagIds: [...selectedTagIds] })
  }

  return (
    <Modal title="New Todo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?" autoFocus required />
        <Select label="Project" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        {tags.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all"
                  style={selectedTagIds.has(tag.id)
                    ? { background: tag.color + '22', borderColor: tag.color, color: tag.color }
                    : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color || '#94a3b8' }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading || !title.trim()}>
            {isLoading ? 'Saving...' : 'Create Todo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TodosPage() {
  const { data: todos = [], isLoading } = useTodos()
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const deleteTodo = useDeleteTodo()
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all')

  const filtered = todos.filter(t => {
    if (filter === 'open') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Todos</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {todos.filter(t => !t.done).length} remaining
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={14} />New Todo</Button>
      </div>

      <div className="flex gap-1.5 mb-6">
        {(['all', 'open', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === f ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>{f}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-white rounded-lg border border-slate-100 animate-pulse" />
        ))}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No todos here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(todo => (
            <div key={todo.id}
              className="group flex items-center gap-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 px-4 py-3 transition-all">
              <button
                onClick={() => toggleTodo.mutate(todo.id)}
                className={clsx(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                  todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-indigo-400'
                )}>
                {todo.done && <span className="text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <span className={clsx('text-sm text-slate-700', todo.done && 'line-through text-slate-400')}>
                  {todo.title}
                </span>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {todo.projectName && (
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      {todo.projectName}
                    </span>
                  )}
                  {todo.tags.map(tag => (
                    <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: tag.color + '18', color: tag.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="danger" size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteTodo.mutate(todo.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <TodoForm
          onSubmit={data => createTodo.mutate(data, { onSuccess: () => setShowCreate(false) })}
          onClose={() => setShowCreate(false)}
          isLoading={createTodo.isPending}
        />
      )}
    </div>
  )
}
