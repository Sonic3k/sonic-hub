import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import EditModal from './EditModal'
import { useCreateTask, useCreateTodo, useCreateProblem, useProjects, useTags } from '../../hooks/useBoard'

type ItemType = 'task' | 'todo' | 'problem'
interface Props { onClose: () => void; defaultType?: ItemType }

export default function QuickAdd({ onClose, defaultType = 'task' }: Props) {
  const [type, setType] = useState<ItemType>(defaultType)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())

  
  const { data: projects = [] } = useProjects()
  const { data: tags = [] } = useTags()

  const createTask = useCreateTask()
  const createTodo = useCreateTodo()
  const createProblem = useCreateProblem()

  

  const isPending = createTask.isPending || createTodo.isPending || createProblem.isPending

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const ruleColors: Record<ItemType, string> = { task: '#b8905a', todo: '#7a9a5a', problem: '#c07860' }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const tagIds = [...selectedTagIds]
    const opts = { onSuccess: onClose }
    if (type === 'task') createTask.mutate({ title: title.trim(), projectId: projectId || undefined, tagIds }, opts)
    else if (type === 'todo') createTodo.mutate({ title: title.trim(), projectId: projectId || undefined, tagIds }, opts)
    else createProblem.mutate({ title: title.trim(), note: note || undefined, projectId: projectId || undefined, tagIds }, opts)
  }

  return (
    <EditModal onClose={onClose} ruleColor={ruleColors[type]}>
      <form onSubmit={handleSubmit}>
        {/* Type selector */}
        <div className="flex gap-1 mb-4">
          {(['task', 'todo', 'problem'] as ItemType[]).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className="px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-all"
              style={type === t ? { background: '#2c2010', color: '#faf5eb' } : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !expanded) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) } }}
          placeholder={type === 'problem' ? "What's the problem?" : type === 'todo' ? 'What needs doing?' : 'Task title...'}
          className="w-full bg-transparent border-none outline-none caret-[#2c2010] text-[17px] font-semibold text-[#2a1e10] placeholder:text-[#c0aa88]"
          required
        />

        {/* Description / notes area for problem or when expanded */}
        {(type === 'problem' || expanded) && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={type === 'problem' ? 'Context, findings, ideas...' : 'Add notes...'}
            rows={4}
            autoFocus={expanded}
            className="w-full bg-transparent border-none outline-none resize-none mt-2 placeholder:text-[#c0aa88]"
            style={{ caretColor: '#2c2010', fontFamily: "'Caveat', cursive", fontSize: '15px', lineHeight: '30px', color: '#5a3e28' }}
          />
        )}

        {/* Expand / meta section */}
        {type !== 'problem' && (
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 mt-2 text-[11px] transition-colors"
            style={{ color: '#b0997a' }}>
            <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            {expanded ? 'Less' : 'Add details...'}
          </button>
        )}

        {/* Meta — project + tags */}
        {(expanded || type === 'problem') && (
          <div className="mt-3 pt-3 border-t border-black/8 space-y-2">
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
        )}

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-black/8">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-[12px]" style={{ color: '#9a8a70' }}>
            Cancel
          </button>
          <button type="submit" disabled={isPending || !title.trim()}
            className="px-5 py-1.5 rounded text-[12px] font-medium disabled:opacity-50 transition-all hover:-translate-y-px"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {isPending ? 'Pinning...' : 'Pin it'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
