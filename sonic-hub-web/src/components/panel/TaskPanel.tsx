import { useState, useEffect } from 'react'
import { X, Trash2, ChevronRight } from 'lucide-react'
import { useUpdateTask, useDeleteTask, useTaskChildren, useTags, useProjects } from '../../hooks'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR } from '../../types'
import type { Task, TaskStatus, Priority } from '../../types'

const STATUSES: TaskStatus[] = ['OPEN','IN_PROGRESS','SNOOZED','DONE','CLOSED']
const PRIORITIES: Priority[] = ['LOW','MEDIUM','HIGH','URGENT']
const PRIORITY_LABEL: Record<Priority,string> = { LOW:'Low', MEDIUM:'Medium', HIGH:'High', URGENT:'Urgent' }

interface Props { task: Task; onClose: () => void }

export default function TaskPanel({ task, onClose }: Props) {
  const [title, setTitle]       = useState(task.title)
  const [desc,  setDesc]        = useState(task.description ?? '')
  const [status, setStatus]     = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate]   = useState(task.dueDate ?? '')
  const [projectId, setProjectId] = useState(task.projectId ?? '')
  const [tagIds, setTagIds]     = useState<Set<string>>(new Set(task.tags.map(t => t.id)))
  const [showChildren, setShowChildren] = useState(false)
  const [dirty, setDirty]       = useState(false)

  const { data: tags     = [] } = useTags()
  const { data: projects = [] } = useProjects()
  const { data: children = [] } = useTaskChildren(task.id, showChildren)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  // Reset when task changes
  useEffect(() => {
    setTitle(task.title); setDesc(task.description ?? '')
    setStatus(task.status); setPriority(task.priority)
    setDueDate(task.dueDate ?? ''); setProjectId(task.projectId ?? '')
    setTagIds(new Set(task.tags.map(t => t.id))); setDirty(false)
  }, [task.id])

  const markDirty = () => setDirty(true)

  const save = () => {
    if (!title.trim()) return
    updateTask.mutate({
      id: task.id,
      data: { title, description: desc || undefined, status, priority, dueDate: dueDate || undefined, projectId: projectId || undefined, tagIds: [...tagIds] },
    }, { onSuccess: () => setDirty(false) })
  }

  const toggleTag = (id: string) => {
    setTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    markDirty()
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${task.title}"?`)) return
    deleteTask.mutate(task.id, { onSuccess: onClose })
  }

  const isOverdue = dueDate && status !== 'DONE' && status !== 'CLOSED' && new Date(dueDate) < new Date()
  const isToday   = dueDate && new Date(dueDate).toDateString() === new Date().toDateString()

  return (
    <div className="h-full flex flex-col border-l overflow-y-auto" style={{ width: 360, background: '#faf8f5', borderColor: '#e8e0d4' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
        <span className="text-xs font-medium" style={{ color: '#9a8a7a' }}>Task detail</span>
        <div className="flex items-center gap-1">
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#c0a090' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-black/5" style={{ color: '#9a8a7a' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 space-y-5">
        {/* Title */}
        <textarea
          value={title}
          onChange={e => { setTitle(e.target.value); markDirty() }}
          autoFocus
          rows={2}
          placeholder="Task title..."
          className="w-full bg-transparent border-none outline-none resize-none text-[18px] font-semibold leading-snug"
          style={{ color: '#1a1208', caretColor: '#c17f3e', fontFamily: "'DM Sans', sans-serif" }}
        />

        {/* Description */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9a8a7a' }}>Notes</label>
          <textarea
            value={desc}
            onChange={e => { setDesc(e.target.value); markDirty() }}
            rows={6}
            placeholder="Add notes, context, anything..."
            className="w-full bg-white rounded-lg border px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
            style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: '#c17f3e', fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Status</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => { setStatus(s); markDirty() }}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                style={status === s
                  ? { background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].text, borderColor: 'transparent' }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }
                }>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Priority</label>
          <div className="flex gap-1.5">
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => { setPriority(p); markDirty() }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                style={priority === p
                  ? { background: PRIORITY_COLOR[p] + '20', color: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p] + '50', fontWeight: 600 }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }
                }>
                <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9a8a7a' }}>Due date</label>
          <input type="date" value={dueDate}
            onChange={e => { setDueDate(e.target.value); markDirty() }}
            className="bg-white border rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              borderColor: isOverdue ? '#e05252' : '#e8e0d4',
              color: isOverdue ? '#e05252' : isToday ? '#c17f3e' : '#3a2e20',
              caretColor: '#c17f3e',
            }}
          />
          {isOverdue && <p className="text-xs mt-1" style={{ color: '#e05252' }}>Overdue</p>}
          {isToday && !isOverdue && <p className="text-xs mt-1" style={{ color: '#c17f3e' }}>Due today</p>}
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Project</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setProjectId(''); markDirty() }}
                className="px-2.5 py-1 rounded-lg text-xs transition-all border"
                style={projectId === ''
                  ? { background: '#1a1208', color: '#faf8f5', borderColor: 'transparent' }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }
                }>
                None
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => { setProjectId(p.id); markDirty() }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                  style={projectId === p.id
                    ? { background: (p.color || '#c17f3e') + '20', color: p.color || '#c17f3e', borderColor: (p.color || '#c17f3e') + '50', fontWeight: 600 }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }
                  }>
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                  style={tagIds.has(tag.id)
                    ? { background: tag.color + '20', color: tag.color, borderColor: tag.color + '50', fontWeight: 600 }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }
                  }>
                  <span className="w-2 h-2 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks */}
        {task.childCount > 0 && (
          <div>
            <button onClick={() => setShowChildren(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: '#9a8a7a' }}>
              <ChevronRight size={13} style={{ transform: showChildren ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              {task.childCount} subtask{task.childCount > 1 ? 's' : ''}
            </button>
            {showChildren && children.length > 0 && (
              <div className="mt-2 space-y-1 pl-4 border-l-2" style={{ borderColor: '#e8e0d4' }}>
                {children.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLOR[c.status].text }} />
                    <span className="text-sm" style={{ color: c.status === 'DONE' ? '#b0a090' : '#3a2e20',
                      textDecoration: c.status === 'DONE' ? 'line-through' : 'none' }}>
                      {c.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="flex-shrink-0 px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#e8e0d4', background: '#faf8f5' }}>
          <span className="text-xs" style={{ color: '#9a8a7a' }}>Unsaved changes</span>
          <div className="flex gap-2">
            <button onClick={() => { setDirty(false); setTitle(task.title); setDesc(task.description ?? '') }}
              className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
              style={{ borderColor: '#e8e0d4', color: '#9a8a7a' }}>
              Discard
            </button>
            <button onClick={save} disabled={updateTask.isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: '#c17f3e', color: '#fff' }}>
              {updateTask.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
