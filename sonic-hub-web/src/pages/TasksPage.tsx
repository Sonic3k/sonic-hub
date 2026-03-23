import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTask } from '../hooks'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR } from '../types'
import TaskPanel from '../components/panel/TaskPanel'
import type { Task, TaskStatus } from '../types'

const FILTERS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All',         value: undefined },
  { label: 'Open',        value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Snoozed',     value: 'SNOOZED' },
  { label: 'Done',        value: 'DONE' },
]

export default function TasksPage() {
  const [filter, setFilter]       = useState<TaskStatus | undefined>(undefined)
  const [selected, setSelected]   = useState<Task | null>(null)
  const [newTitle, setNewTitle]   = useState('')
  const [adding, setAdding]       = useState(false)

  const { data: tasks = [], isLoading } = useTasks(filter)
  const createTask  = useCreateTask()
  const updateTask  = useUpdateTask()

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTask.mutate({ title: newTitle.trim(), status: 'OPEN', priority: 'MEDIUM' }, {
      onSuccess: () => { setNewTitle(''); setAdding(false) },
    })
  }

  const cycleStatus = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    const next: Record<TaskStatus, TaskStatus> = {
      OPEN: 'IN_PROGRESS', IN_PROGRESS: 'DONE', SNOOZED: 'OPEN', DONE: 'OPEN', CLOSED: 'OPEN',
    }
    updateTask.mutate({ id: task.id, data: { title: task.title, status: next[task.status], priority: task.priority } })
    if (selected?.id === task.id) setSelected({ ...task, status: next[task.status] })
  }

  const isOverdue = (task: Task) =>
    task.dueDate && task.status !== 'DONE' && task.status !== 'CLOSED' && new Date(task.dueDate) < new Date()

  return (
    <div className="flex h-full">
      {/* List pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          <h1 className="text-base font-semibold" style={{ color: '#1a1208' }}>Tasks</h1>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#c17f3e', color: '#fff' }}>
            <Plus size={14} />New task
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-6 py-2.5 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          {FILTERS.map(f => (
            <button key={f.label} onClick={() => setFilter(f.value)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              style={filter === f.value
                ? { background: '#1a1208', color: '#faf8f5' }
                : { background: 'transparent', color: '#9a8a7a' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Add row */}
        {adding && (
          <form onSubmit={handleCreate}
            className="flex items-center gap-3 px-6 py-3 border-b bg-white flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#e8e0d4' }} />
            <input
              autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title... (Enter to save, Esc to cancel)"
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: '#1a1208', caretColor: '#c17f3e' }}
            />
          </form>
        )}

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-6 pt-6 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: '#ede9e3' }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="text-sm" style={{ color: '#b0a090' }}>No tasks here</p>
              <button onClick={() => setAdding(true)} className="text-sm" style={{ color: '#c17f3e' }}>
                Add your first task
              </button>
            </div>
          ) : (
            <div className="py-2">
              {tasks.map(task => {
                const overdue = isOverdue(task)
                const isSelected = selected?.id === task.id
                const isDone = task.status === 'DONE' || task.status === 'CLOSED'

                return (
                  <div key={task.id}
                    onClick={() => setSelected(isSelected ? null : task)}
                    className="flex items-center gap-3 px-6 py-2.5 cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? '#f0e8de' : 'transparent',
                      borderLeft: isSelected ? '2px solid #c17f3e' : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f5f2ee' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                    {/* Check circle */}
                    <button
                      onClick={e => cycleStatus(e, task)}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: isDone ? '#7a9a6a' : overdue ? '#e05252' : '#c8bdb0',
                        background: isDone ? '#7a9a6a' : 'transparent',
                      }}>
                      {isDone && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </button>

                    {/* Title */}
                    <span className="flex-1 text-sm truncate"
                      style={{ color: isDone ? '#b0a090' : '#1a1208', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>

                    {/* Meta chips */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Priority dot */}
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLOR[task.priority] }} />

                      {overdue && (
                        <span className="text-[10px] font-semibold" style={{ color: '#e05252' }}>Overdue</span>
                      )}
                      {task.dueDate && !overdue && (
                        <span className="text-[10px]" style={{ color: '#9a8a7a' }}>
                          {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      )}

                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: STATUS_COLOR[task.status].bg, color: STATUS_COLOR[task.status].text }}>
                        {STATUS_LABEL[task.status]}
                      </span>

                      {task.tags.slice(0, 2).map(tag => (
                        <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: tag.color + '20', color: tag.color }}>
                          {tag.name}
                        </span>
                      ))}

                      {task.childCount > 0 && (
                        <span className="text-[10px] font-mono" style={{ color: '#b0a090' }}>
                          {task.childCount}↓
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <TaskPanel
          key={selected.id}
          task={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
