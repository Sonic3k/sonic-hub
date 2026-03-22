import { useState } from 'react'
import EditModal from './EditModal'
import { useTags, useProjects } from '../../hooks/useBoard'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { todosApi } from '../../api'
import type { Todo } from '../../types'

interface Props { todo: Todo; onClose: () => void }

const field = "w-full bg-black/5 rounded px-3 py-2 text-sm outline-none border border-transparent focus:border-[#b8905a] transition-colors text-[#2a1e10] placeholder:text-[#b0997a]"
const label = "block text-[10px] font-semibold uppercase tracking-wider mb-1"

export default function EditTodoForm({ todo, onClose }: Props) {
  const [title, setTitle] = useState(todo.title)
  const [projectId, setProjectId] = useState(todo.projectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(todo.tags.map(t => t.id)))

  const { data: tags = [] } = useTags()
  const { data: projects = [] } = useProjects()

  const qc = useQueryClient()
  const updateTodo = useMutation({
    mutationFn: (data: { title: string; projectId?: string; tagIds?: string[] }) =>
      todosApi.update(todo.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); onClose() },
  })

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    updateTodo.mutate({ title: title.trim(), projectId: projectId || undefined, tagIds: [...selectedTagIds] })
  }

  return (
    <EditModal title="Edit Todo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={label} style={{ color: '#9a8a70' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={field}
            placeholder="Todo title..." autoFocus required />
        </div>

        {projects.length > 0 && (
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={field}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all"
                  style={selectedTagIds.has(tag.id)
                    ? { background: tag.color + '22', borderColor: tag.color, color: tag.color }
                    : { borderColor: 'rgba(0,0,0,.15)', color: '#9a8a70' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'rgba(0,0,0,.07)', color: '#6b5c44' }}>
            Cancel
          </button>
          <button type="submit" disabled={updateTodo.isPending || !title.trim()}
            className="px-4 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {updateTodo.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
