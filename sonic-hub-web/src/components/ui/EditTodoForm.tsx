import { useState } from 'react'
import EditModal from './EditModal'
import { useTags, useProjects } from '../../hooks/useBoard'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { todosApi } from '../../api'
import type { Todo } from '../../types'

interface Props { todo: Todo; onClose: () => void }

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
    <EditModal onClose={onClose} ruleColor="#7a9a5a">
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Todo..."
          className="w-full bg-transparent border-none outline-none caret-[#2c2010] text-[17px] font-semibold text-[#2a1e10] placeholder:text-[#c0aa88] mb-4"
          required
        />

        <div className="border-t border-black/8 pt-3 space-y-3">
          {projects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#9a8a70] w-14">Project</span>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setProjectId('')}
                  className="px-2 py-1 rounded text-[11px] transition-all"
                  style={projectId === '' ? { background: '#2c2010', color: '#faf5eb' } : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                  None
                </button>
                {projects.map(p => (
                  <button key={p.id} type="button" onClick={() => setProjectId(p.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all"
                    style={projectId === p.id
                      ? { background: (p.color || '#6366f1') + '33', color: p.color || '#6366f1', fontWeight: 600 }
                      : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#9a8a70] w-14">Tags</span>
              <div className="flex gap-1.5 flex-wrap">
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all"
                    style={selectedTagIds.has(tag.id)
                      ? { background: tag.color + '30', color: tag.color, fontWeight: 600 }
                      : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-black/8">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-[12px]" style={{ color: '#9a8a70' }}>
            Cancel
          </button>
          <button type="submit" disabled={updateTodo.isPending || !title.trim()}
            className="px-5 py-1.5 rounded text-[12px] font-medium disabled:opacity-50"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {updateTodo.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
