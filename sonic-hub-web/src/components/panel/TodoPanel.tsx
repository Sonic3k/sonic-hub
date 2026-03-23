import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useUpdateTodo, useDeleteTodo, useTags, useProjects } from '../../hooks'
import type { Todo } from '../../types'

interface Props { todo: Todo; onClose: () => void }

export default function TodoPanel({ todo, onClose }: Props) {
  const [title, setTitle]       = useState(todo.title)
  const [projectId, setProjectId] = useState(todo.projectId ?? '')
  const [tagIds, setTagIds]     = useState<Set<string>>(new Set(todo.tags.map(t => t.id)))
  const [dirty, setDirty]       = useState(false)

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
    updateTodo.mutate({ id: todo.id, data: { title, projectId: projectId || undefined, tagIds: [...tagIds] } },
      { onSuccess: () => setDirty(false) })
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${todo.title}"?`)) return
    deleteTodo.mutate(todo.id, { onSuccess: onClose })
  }

  return (
    <div className="h-full flex flex-col border-l overflow-y-auto" style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
        <span className="text-xs font-medium" style={{ color: '#9a8a7a' }}>Todo detail</span>
        <div className="flex items-center gap-1">
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#c0a090' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-black/5" style={{ color: '#9a8a7a' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">
        <textarea
          value={title}
          onChange={e => { setTitle(e.target.value); setDirty(true) }}
          autoFocus rows={2}
          placeholder="Todo title..."
          className="w-full bg-transparent border-none outline-none resize-none text-[18px] font-heading font-semibold leading-snug"
          style={{ color: '#1a1208', caretColor: '#c17f3e', fontFamily: "'Nunito', sans-serif" }}
        />

        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Project</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setProjectId(''); setDirty(true) }}
                className="px-2.5 py-1 rounded-lg text-xs transition-all border"
                style={projectId === ''
                  ? { background: '#1a1208', color: '#faf8f5', borderColor: 'transparent' }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                None
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setDirty(true) }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                  style={projectId === p.id
                    ? { background: (p.color || '#c17f3e') + '20', color: p.color || '#c17f3e', borderColor: (p.color || '#c17f3e') + '50', fontWeight: 600 }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                  style={tagIds.has(tag.id)
                    ? { background: tag.color + '20', color: tag.color, borderColor: tag.color + '50', fontWeight: 600 }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <div className="flex-shrink-0 px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#e8e0d4' }}>
          <span className="text-xs" style={{ color: '#9a8a7a' }}>Unsaved changes</span>
          <button onClick={save} disabled={updateTodo.isPending}
            className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: '#c17f3e', color: '#fff' }}>
            {updateTodo.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
