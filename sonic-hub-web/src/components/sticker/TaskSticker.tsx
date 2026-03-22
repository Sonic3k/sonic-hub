import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import StickerBase, { stickerColor, stickerRotation } from './StickerBase'
import EditTaskForm from '../ui/EditTaskForm'
import { useDeleteTask, useUpdateTask, useTaskChildren } from '../../hooks/useBoard'
import { STATUS_LABELS, PRIORITY_DOT } from '../../types'
import type { Task } from '../../types'

interface Props { task: Task; index: number }

export default function TaskSticker({ task, index }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()
  const { data: children = [] } = useTaskChildren(task.id, expanded)

  const isDone = task.status === 'DONE' || task.status === 'CLOSED'

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next: Record<string, string> = {
      OPEN: 'IN_PROGRESS', IN_PROGRESS: 'DONE', SNOOZED: 'OPEN', DONE: 'OPEN', CLOSED: 'OPEN',
    }
    updateTask.mutate({ id: task.id, data: { title: task.title, status: next[task.status] as Task['status'] } })
  }

  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date()
  const isToday = task.dueDate && !isDone &&
    new Date(task.dueDate).toDateString() === new Date().toDateString()

  return (
    <>
      <div className="mb-3 group">
        <StickerBase color={stickerColor(index)} rotation={stickerRotation(index)} faded={isDone}>
          <div className="px-3 pt-2 pb-4 relative z-[1]">
            {/* Priority dot */}
            <span className="absolute top-3 right-3 w-2 h-2 rounded-full"
              style={{ background: PRIORITY_DOT[task.priority] }} />

            {/* Edit button — visible on hover */}
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#9a8070] hover:text-[#5a3e28]">
              <Pencil size={11} />
            </button>

            {/* Title */}
            <p className={clsx('text-[13px] font-medium leading-snug pr-4 pt-1',
              isDone ? 'line-through text-[#9a8a70]' : 'text-[#2a1e10]')}>
              {task.title}
            </p>

            {task.description && (
              <p className="font-hand text-[13px] text-[#7a6040] mt-1 leading-snug line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <button onClick={cycleStatus}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/8 text-[#5a3e28] hover:bg-black/15 transition-colors">
                {STATUS_LABELS[task.status]}
              </button>
              {isOverdue && <span className="text-[10px] font-semibold text-[#8b3a2a]">⚠ Overdue</span>}
              {isToday && !isOverdue && <span className="text-[10px] font-semibold text-[#5a4a7a]">Today</span>}
              {task.dueDate && !isOverdue && !isToday && (
                <span className="text-[10px] text-[#8a7055]">
                  {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {task.tags.map(tag => (
                <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: tag.color + '22', color: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>

            {task.childCount > 0 && (
              <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                className="mt-2 flex items-center gap-1 text-[10px] text-[#8a7055] hover:text-[#5a3e28] transition-colors">
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {task.childCount} subtask{task.childCount > 1 ? 's' : ''}
              </button>
            )}

            {expanded && children.length > 0 && (
              <div className="mt-2 space-y-1 pl-2 border-l border-black/10">
                {children.map(child => (
                  <div key={child.id} className="flex items-center gap-1.5">
                    <span className={clsx('text-[11px]',
                      child.status === 'DONE' ? 'line-through text-[#9a8a70]' : 'text-[#5a3e28]')}>
                      {child.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Delete */}
            <button
              onClick={e => { e.stopPropagation(); if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id) }}
              className="absolute bottom-2 right-8 opacity-0 group-hover:opacity-100 text-[#9a8070] hover:text-[#8b3a2a] transition-all">
              <Trash2 size={11} />
            </button>

            {/* Done check */}
            <button onClick={cycleStatus}
              className={clsx(
                'absolute bottom-2 right-2 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] transition-all',
                isDone
                  ? 'bg-[#7a9a6a] border-[#7a9a6a] text-white'
                  : 'border-black/20 text-transparent hover:border-[#7a9a6a] hover:text-[#7a9a6a]'
              )}>
              ✓
            </button>
          </div>
        </StickerBase>
      </div>

      {editing && <EditTaskForm task={task} onClose={() => setEditing(false)} />}
    </>
  )
}
