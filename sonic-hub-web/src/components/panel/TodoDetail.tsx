import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import FullScreenPanel from './FullScreenPanel'
import { TagChip, TYPE_COLOR } from '../card/Card'
import { useUpdateTodo, useDeleteTodo, useTags, useProjects } from '../../hooks'
import type { Todo } from '../../types'

const label = (text: string) => (
  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9a8a7a' }}>{text}</p>
)

interface Props { todo: Todo; onClose: () => void }

export default function TodoDetail({ todo, onClose }: Props) {
  const [title, setTitle]         = useState(todo.title)
  const [projectId, setProjectId] = useState(todo.projectId ?? '')
  const [tagIds, setTagIds]       = useState<Set<string>>(new Set(todo.tags.map(t => t.id)))
  const [dirty, setDirty]         = useState(false)

  const { data: tags     = [] } = useTags()
  const { data: projects = [] } = useProjects()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()

  useEffect(() => {
    setTitle(todo.title); setProjectId(todo.projectId ?? '')
    setTagIds(new Set(todo.tags.map(t => t.id))); setDirty(false)
  }, [todo.id])

  const toggleTag = (id: string) => {
    setTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setDirty(true)
  }

  const save = () => {
    if (!title.trim()) return
    updateTodo.mutate(
      { id: todo.id, data: { title, projectId: projectId || undefined, tagIds: [...tagIds] } },
      { onSuccess: () => setDirty(false) }
    )
  }

  return (
    <FullScreenPanel type="todo" onClose={onClose}>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <input value={title} autoFocus
          onChange={e => { setTitle(e.target.value); setDirty(true) }}
          className="w-full bg-transparent border-none outline-none font-heading font-semibold text-xl"
          style={{ color: '#1a1208', caretColor: TYPE_COLOR.todo }}
        />

        {projects.length > 0 && (
          <div>
            {label('Project')}
            <div className="flex flex-wrap gap-1.5">
              {[{ id: '', name: 'None', color: undefined }, ...projects].map(p => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setDirty(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border"
                  style={projectId === p.id
                    ? { background: (p.color || '#1a1208') + '20', color: p.color || '#1a1208', borderColor: (p.color || '#1a1208') + '50' }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  {p.color && <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            {label('Tags')}
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className="transition-all active:scale-95"
                  style={{ opacity: tagIds.has(tag.id) ? 1 : 0.4 }}>
                  <TagChip name={tag.name} color={tag.color} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#e8e0d4' }}>
          <button onClick={() => { if (confirm(`Delete "${todo.title}"?`)) { deleteTodo.mutate(todo.id); onClose() } }}
            className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#c0a090' }}>
            <Trash2 size={14} /> Delete
          </button>
          {dirty && (
            <button onClick={save} disabled={updateTodo.isPending}
              className="px-5 py-2 rounded-full text-sm font-semibold active:scale-95 disabled:opacity-50"
              style={{ background: TYPE_COLOR.todo, color: '#fff' }}>
              {updateTodo.isPending ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </FullScreenPanel>
  )
}
