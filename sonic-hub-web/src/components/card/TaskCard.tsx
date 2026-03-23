import { useState } from 'react'
import { Expand, Check } from 'lucide-react'
import Card, { TypeChip, TagChip, StatusPills, TYPE_COLOR, TYPE_CHIP_BG } from './Card'
import { useUpdateTask, useDeleteTask } from '../../hooks'
import { PRIORITY_COLOR } from '../../types'
import type { Task, TaskStatus } from '../../types'

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']

interface Props { task: Task; onFullScreen: (t: Task) => void }

export default function TaskCard({ task, onFullScreen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle]       = useState(task.title)
  const [desc,  setDesc]        = useState(task.description ?? '')
  const [status, setStatus]     = useState<TaskStatus>(task.status)
  const [dirty, setDirty]       = useState(false)

  const update = useUpdateTask()
  const remove = useDeleteTask()
  const col    = TYPE_COLOR.task
  const chipBg = TYPE_CHIP_BG.task
  const isDone = status === 'DONE' || status === 'CLOSED'

  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date()
  const isToday   = task.dueDate && !isDone && new Date(task.dueDate).toDateString() === new Date().toDateString()

  const save = () => {
    if (!title.trim()) return
    update.mutate(
      { id: task.id, data: { title, description: desc || undefined, status, priority: task.priority, tagIds: task.tags.map(t => t.id) } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  const cycleCheck = (e: React.MouseEvent) => {
    e.stopPropagation()
    const map: Record<TaskStatus, TaskStatus> = { OPEN:'IN_PROGRESS', IN_PROGRESS:'DONE', SNOOZED:'OPEN', DONE:'OPEN', CLOSED:'OPEN' }
    const ns = map[status]; setStatus(ns)
    update.mutate({ id: task.id, data: { title: task.title, status: ns, priority: task.priority } })
  }

  return (
    <Card type="task" expanded={expanded} faded={isDone}
      onClick={() => !expanded && setExpanded(true)}>
      <div className="p-4 pb-3">

        {/* Row 1: check + title + expand */}
        <div className="flex items-start gap-2.5">
          <button onClick={cycleCheck}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ borderColor: isDone ? '#7a9a6a' : col, background: isDone ? '#7a9a6a' : 'transparent' }}>
            {isDone && <Check size={10} color="#fff" strokeWidth={3} />}
          </button>

          {expanded
            ? <textarea value={title} autoFocus rows={2}
                onClick={e => e.stopPropagation()}
                onChange={e => { setTitle(e.target.value); setDirty(true) }}
                className="flex-1 bg-transparent outline-none resize-none font-heading font-semibold text-[14px] leading-snug border-none"
                style={{ color: '#1a1208', caretColor: col }} />
            : <p className="flex-1 font-heading font-semibold text-[14px] leading-snug"
                style={{ color: isDone ? '#9a8a7a' : '#1a1208', textDecoration: isDone ? 'line-through' : 'none' }}>
                {task.title}
              </p>
          }

          {expanded
            ? <button onClick={e => { e.stopPropagation(); onFullScreen(task) }}
                className="p-1 rounded-lg flex-shrink-0" style={{ color: col }}>
                <Expand size={13} />
              </button>
            : <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: PRIORITY_COLOR[task.priority] }} />
          }
        </div>

        {/* Description */}
        {!expanded && task.description && (
          <p className="text-[12px] leading-relaxed mt-2 ml-[30px] italic line-clamp-2"
            style={{ color: col + 'cc' }}>
            {task.description}
          </p>
        )}
        {expanded && (
          <div className="mt-2.5 ml-[30px]" onClick={e => e.stopPropagation()}>
            <textarea value={desc} rows={4}
              onChange={e => { setDesc(e.target.value); setDirty(true) }}
              placeholder="Add notes..."
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed border-none"
              style={{ background: 'rgba(255,255,255,.55)', color: '#3a2e20', caretColor: col }}
            />
          </div>
        )}

        {/* Status pills (expanded only) */}
        {expanded && (
          <div className="mt-2.5 ml-[30px]">
            <StatusPills value={status} options={STATUSES} color={col} chipBg={chipBg}
              onChange={s => { setStatus(s); setDirty(true) }} />
          </div>
        )}

        {/* Footer chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2.5 ml-[30px]">
          {!expanded && <TypeChip type="task" label={status.replace('_',' ')} />}
          {isOverdue && <span className="text-[11px] font-bold" style={{ color: '#e05252' }}>⚠ Overdue</span>}
          {isToday && !isOverdue && <span className="text-[11px] font-bold" style={{ color: col }}>Today</span>}
          {task.dueDate && !isOverdue && !isToday && (
            <span className="text-[11px]" style={{ color: col + 'aa' }}>
              {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
          {task.childCount > 0 && (
            <span className="text-[11px] font-semibold" style={{ color: col + '99' }}>{task.childCount} sub</span>
          )}
        </div>

        {/* Action row */}
        {expanded && (
          <div className="flex items-center justify-between mt-3 ml-[30px]" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) remove.mutate(task.id) }}
              className="text-[12px] font-semibold" style={{ color: col + '80' }}>Delete</button>
            <div className="flex gap-2">
              <button onClick={() => { setExpanded(false); setDirty(false); setTitle(task.title); setDesc(task.description ?? ''); setStatus(task.status) }}
                className="text-[12px] font-semibold" style={{ color: col + '80' }}>Close</button>
              {dirty && (
                <button onClick={save} disabled={update.isPending}
                  className="px-4 py-1.5 rounded-full text-[12px] font-bold active:scale-95 disabled:opacity-50"
                  style={{ background: col, color: '#fff' }}>
                  {update.isPending ? '...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
