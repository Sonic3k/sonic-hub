import { useState } from 'react'
import { Expand, Check } from 'lucide-react'
import Card, { TagChip, StatusPills, TYPE_COLOR, TYPE_CHIP_BG } from './Card'
import { useUpdateTask, useDeleteTask } from '../../hooks'
import { STATUS_LABEL, PRIORITY_COLOR } from '../../types'
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
      <div className="p-4">

        {/* Title row */}
        <div className="flex items-start gap-3 mb-3">
          <button onClick={cycleCheck}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ borderColor: isDone ? '#7a9a6a' : col, background: isDone ? '#7a9a6a' : 'transparent' }}>
            {isDone && <Check size={9} color="#fff" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            {expanded
              ? <textarea value={title} autoFocus rows={2}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { setTitle(e.target.value); setDirty(true) }}
                  className="w-full bg-transparent outline-none resize-none border-none text-[15px] font-heading font-semibold leading-snug"
                  style={{ color: '#1a1208', caretColor: col }}
                />
              : <p className="font-heading font-semibold text-[15px] leading-snug"
                  style={{ color: isDone ? '#b0a090' : '#1a1208', textDecoration: isDone ? 'line-through' : 'none' }}>
                  {task.title}
                </p>
            }

            {/* Note — italic, smaller, tinted */}
            {!expanded && task.description && (
              <p className="mt-1.5 text-[13px] leading-relaxed italic line-clamp-2"
                style={{ color: col + 'bb', fontFamily: "'Nunito', sans-serif" }}>
                {task.description}
              </p>
            )}
            {expanded && (
              <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                <textarea value={desc} rows={4}
                  onChange={e => { setDesc(e.target.value); setDirty(true) }}
                  placeholder="Add notes..."
                  className="w-full rounded-2xl px-3.5 py-2.5 text-[13px] outline-none resize-none leading-relaxed border-none"
                  style={{ background: 'rgba(255,255,255,.6)', color: '#3a2e20', caretColor: col, fontStyle: 'italic' }}
                />
              </div>
            )}
          </div>

          {/* Right: priority dot or expand icon */}
          {expanded
            ? <button onClick={e => { e.stopPropagation(); onFullScreen(task) }}
                className="p-1 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: col }}>
                <Expand size={14} />
              </button>
            : <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                style={{ background: PRIORITY_COLOR[task.priority] }} />
          }
        </div>

        {/* Status pills — only expanded */}
        {expanded && (
          <div className="mb-3" onClick={e => e.stopPropagation()}>
            <StatusPills value={status} options={STATUSES} color={col} chipBg={chipBg}
              onChange={s => { setStatus(s); setDirty(true) }} />
          </div>
        )}

        {/* Footer: small chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status chip — small, sentence case, rounded-full */}
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: chipBg, color: col }}>
            {STATUS_LABEL[status]}
          </span>

          {isOverdue && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(224,82,82,.15)', color: '#e05252' }}>
              Overdue
            </span>
          )}
          {isToday && !isOverdue && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: chipBg, color: col }}>
              Today
            </span>
          )}
          {task.dueDate && !isOverdue && !isToday && (
            <span className="text-[11px]" style={{ color: col + '99' }}>
              {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
          {task.childCount > 0 && (
            <span className="text-[11px]" style={{ color: col + '88' }}>{task.childCount} subtasks</span>
          )}
        </div>

        {/* Expanded actions */}
        {expanded && (
          <div className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: `1px solid ${col}20` }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) remove.mutate(task.id) }}
              className="text-[12px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: col }}>
              Delete
            </button>
            <div className="flex items-center gap-2.5">
              <button onClick={() => { setExpanded(false); setDirty(false); setTitle(task.title); setDesc(task.description ?? ''); setStatus(task.status) }}
                className="text-[12px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: col }}>
                Close
              </button>
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
