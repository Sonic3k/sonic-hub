import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCreateTask, useCreateTodo, useCreateProblem, useProjects, useTags } from '../../hooks/useBoard'
import type { TaskStatus, Priority } from '../../types'

type ItemType = 'task' | 'todo' | 'problem'

interface Props { onClose: () => void; defaultType?: ItemType }

const TYPE_LABELS: Record<ItemType, string> = { task: 'Task', todo: 'Todo', problem: 'Problem' }

export default function QuickAdd({ onClose, defaultType = 'task' }: Props) {
  const [type, setType] = useState<ItemType>(defaultType)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [projectId, setProjectId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: projects = [] } = useProjects()
  const { data: tags = [] } = useTags()
  const createTask = useCreateTask()
  const createTodo = useCreateTodo()
  const createProblem = useCreateProblem()

  useEffect(() => { inputRef.current?.focus() }, [])

  const isPending = createTask.isPending || createTodo.isPending || createProblem.isPending

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const tagIds = [...selectedTagIds]
    const opts = { onSuccess: onClose }

    if (type === 'task') {
      createTask.mutate({ title: title.trim(), projectId: projectId || undefined, tagIds }, opts)
    } else if (type === 'todo') {
      createTodo.mutate({ title: title.trim(), projectId: projectId || undefined, tagIds }, opts)
    } else {
      createProblem.mutate({ title: title.trim(), note: note || undefined, projectId: projectId || undefined, tagIds }, opts)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4" style={{ background: '#faf5eb', borderRadius: '3px', boxShadow: '4px 8px 24px rgba(80,50,10,.2)' }}>
        {/* Top rule */}
        <div className="h-1 rounded-t-sm opacity-70" style={{ background: '#b8905a' }} />

        <div className="p-5">
          {/* Type tabs */}
          <div className="flex gap-1 mb-4">
            {(['task','todo','problem'] as ItemType[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors capitalize"
                style={type === t
                  ? { background: '#2c2010', color: '#faf5eb' }
                  : { background: 'rgba(0,0,0,.07)', color: '#6b5c44' }}>
                {TYPE_LABELS[t]}
              </button>
            ))}
            <button onClick={onClose} className="ml-auto text-[#9a8a70] hover:text-[#5a3e28] transition-colors">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
              placeholder={`${TYPE_LABELS[type]} title...`}
              className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-[#2a1e10] placeholder:text-[#b0997a]" />

            {type === 'problem' && (
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Notes, context, ideas..."
                rows={3}
                className="w-full bg-transparent border-none outline-none text-[13px] font-hand text-[#6b5040] placeholder:text-[#c0a888] resize-none" />
            )}

            <div className="flex gap-2">
              {projects.length > 0 && (
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="bg-black/6 text-[#6b5c44] text-xs rounded px-2 py-1 border-none outline-none flex-1 max-w-[140px]">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            {tags.length > 0 && (
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
            )}

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={isPending || !title.trim()}
                className="px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: '#2c2010', color: '#faf5eb' }}>
                {isPending ? 'Pinning...' : 'Pin it'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
