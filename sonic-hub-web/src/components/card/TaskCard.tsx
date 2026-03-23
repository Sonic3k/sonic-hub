import { useState } from 'react'
import { Expand, Check } from 'lucide-react'
import Card, { Chip, TagChip, StatusPills, TYPE_COLOR } from './Card'
import { useUpdateTask, useDeleteTask } from '../../hooks'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR } from '../../types'
import type { Task, TaskStatus } from '../../types'

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']

interface Props {
  task: Task
  onFullScreen: (task: Task) => void
}

export default function TaskCard({ task, onFullScreen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle]       = useState(task.title)
  const [desc,  setDesc]        = useState(task.description ?? '')
  const [status, setStatus]     = useState<TaskStatus>(task.status)
  const [dirty,  setDirty]      = useState(false)

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const isDone    = status === 'DONE' || status === 'CLOSED'
  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date()
  const isToday   = task.dueDate && !isDone && new Date(task.dueDate).toDateString() === new Date().toDateString()

  const save = () => {
    if (!title.trim()) return
    updateTask.mutate(
      { id: task.id, data: { title: title.trim(), description: desc || undefined, status, priority: task.priority, tagIds: task.tags.map(t => t.id) } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  const cycleCheck = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next: Record<TaskStatus, TaskStatus> = {
      OPEN: 'IN_PROGRESS', IN_PROGRESS: 'DONE', SNOOZED: 'OPEN', DONE: 'OPEN', CLOSED: 'OPEN',
    }
    const ns = next[status]
    setStatus(ns)
    updateTask.mutate({ id: task.id, data: { title: task.title, status: ns, priority: task.priority } })
  }

  return (
    <Card type="task" expanded={expanded} faded={isDone}
      onClick={() => !expanded && setExpanded(true)}>
      <div className="p-4">

        {/* Top row */}
        <div className="flex items-start gap-2 mb-2">
          {/* Check circle */}
          <button onClick={cycleCheck}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ borderColor: isDone ? '#7a9a6a' : TYPE_COLOR.task, background: isDone ? '#7a9a6a' : 'transparent' }}>
            {isDone && <Check size={10} color="#fff" strokeWidth={3} />}
          </button>

          {/* Title */}
          {expanded ? (
            <textarea
              value={title}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => { setTitle(e.target.value); setDirty(true) }}
              rows={2}
              className="flex-1 bg-transparent outline-none resize-none font-heading font-semibold text-sm leading-snug border-none"
              style={{ color: '#1a1208', caretColor: TYPE_COLOR.task }}
            />
          ) : (
            <p className="flex-1 font-heading font-semibold text-sm leading-snug"
              style={{ color: isDone ? '#b0a090' : '#1a1208', textDecoration: isDone ? 'line-through' : 'none' }}>
              {task.title}
            </p>
          )}

          {/* Expand / full screen */}
          {expanded ? (
            <button onClick={e => { e.stopPropagation(); onFullScreen(task) }}
              className="p-1 rounded-lg flex-shrink-0 transition-colors hover:bg-black/5"
              style={{ color: TYPE_COLOR.task }}>
              <Expand size={13} />
            </button>
          ) : (
            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
              style={{ background: PRIORITY_COLOR[task.priority] }} />
          )}
        </div>

        {/* Description — collapsed: preview, expanded: textarea */}
        {!expanded && task.description && (
          <p className="text-xs leading-relaxed mb-2 ml-7 line-clamp-2" style={{ color: '#9a8a7a' }}>
            {task.description}
          </p>
        )}
        {expanded && (
          <div className="ml-7 mb-3" onClick={e => e.stopPropagation()}>
            <textarea
              value={desc}
              onChange={e => { setDesc(e.target.value); setDirty(true) }}
              rows={4}
              placeholder="Add notes..."
              className="w-full bg-white border rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
              style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: TYPE_COLOR.task }}
            />
          </div>
        )}

        {/* Status pills (only when expanded) */}
        {expanded && (
          <div className="ml-7 mb-3" onClick={e => e.stopPropagation()}>
            <StatusPills value={status} options={STATUSES}
              onChange={s => { setStatus(s); setDirty(true) }} />
          </div>
        )}

        {/* Footer chips */}
        <div className="flex items-center gap-1.5 flex-wrap ml-7">
          {!expanded && (
            <Chip
              label={STATUS_LABEL[status]}
              bg={STATUS_COLOR[status].bg}
              color={STATUS_COLOR[status].text}
            />
          )}
          {isOverdue && <Chip label="Overdue" bg="#fee2e2" color="#e05252" />}
          {isToday && !isOverdue && <Chip label="Today" bg="#fef3e2" color="#c17f3e" />}
          {!isOverdue && !isToday && task.dueDate && (
            <span className="text-[10px]" style={{ color: '#b0a090' }}>
              {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
          {task.childCount > 0 && (
            <span className="text-[10px] font-mono" style={{ color: '#b0a090' }}>{task.childCount} sub</span>
          )}
        </div>

        {/* Save / cancel row */}
        {expanded && dirty && (
          <div className="flex justify-end gap-2 mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setExpanded(false); setDirty(false); setTitle(task.title); setDesc(task.description ?? ''); setStatus(task.status) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={{ borderColor: '#e8e0d4', color: '#9a8a7a' }}>
              Discard
            </button>
            <button onClick={save} disabled={updateTask.isPending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: TYPE_COLOR.task, color: '#fff' }}>
              {updateTask.isPending ? '...' : 'Save'}
            </button>
          </div>
        )}
        {expanded && !dirty && (
          <div className="flex justify-between items-center mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id) }}
              className="text-xs font-medium transition-colors"
              style={{ color: '#c0a090' }}>
              Delete
            </button>
            <button onClick={() => setExpanded(false)}
              className="text-xs font-medium" style={{ color: '#9a8a7a' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
