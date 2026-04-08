import { useState } from 'react'
import { ChevronRight, Plus, Pencil, Trash2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button } from './ui'
import TaskForm from './TaskForm'
import { useTaskChildren, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { STATUS_LABELS, STATUS_COLORS } from '../types'
import type { Task, TaskRequest } from '../types'

interface Props {
  task: Task
  depth?: number
}

export default function TaskCard({ task, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: children = [], isLoading: loadingChildren } = useTaskChildren(task.id)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask(task.id)
  const deleteTask = useDeleteTask()

  const hasChildren = task.childCount > 0

  const handleCreate = (data: TaskRequest) => {
    createTask.mutate({ ...data, parentId: task.id }, {
      onSuccess: () => {
        setShowCreate(false)
        setExpanded(true)
      },
    })
  }

  const handleUpdate = (data: TaskRequest) => {
    updateTask.mutate(data, { onSuccess: () => setShowEdit(false) })
  }

  const handleDelete = () => {
    if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id)
  }

  return (
    <div className={clsx('group', depth > 0 && 'ml-6 border-l border-slate-100 pl-4')}>
      <div className="bg-white rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all p-3.5 mb-2">
        <div className="flex items-start gap-2">
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className={clsx(
              'mt-0.5 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0',
              !hasChildren && 'invisible'
            )}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-slate-800 leading-snug">{task.title}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus size={12} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)}>
                  <Pencil size={12} />
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>

            {task.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
              {task.someday && (
                <Badge className="bg-violet-50 text-violet-500">Someday</Badge>
              )}
              {task.dueDateTime && (
                <span className="text-xs text-orange-500 font-medium">
                  ⏰ {new Date(task.dueDateTime + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {!task.dueDateTime && task.dueDate && (
                <span className="text-xs text-slate-400">📅 {task.dueDate}</span>
              )}
              {task.duePeriod && (
                <span className="text-xs text-blue-400">📆 {task.duePeriod}</span>
              )}
              {task.createdBy && (
                <span className="text-xs text-pink-300">{task.createdBy}</span>
              )}
              {task.childCount > 0 && (
                <span className="text-xs text-slate-400 font-mono">{task.childCount} sub</span>
              )}
              {task.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                  style={{ background: (tag.color || '#64748b') + '18', color: tag.color || '#64748b' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color || '#64748b' }} />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && (
        <div className="mb-2">
          {loadingChildren ? (
            <p className="text-xs text-slate-400 ml-6 py-2">Loading...</p>
          ) : (
            children.map(child => (
              <TaskCard key={child.id} task={child} depth={depth + 1} />
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <TaskForm
          parentId={task.id}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          isLoading={createTask.isPending}
        />
      )}
      {showEdit && (
        <TaskForm
          task={task}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          isLoading={updateTask.isPending}
        />
      )}
    </div>
  )
}
