import { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
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
  const [filter, setFilter]     = useState<TaskStatus | undefined>(undefined)
  const [selected, setSelected] = useState<Task | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)

  const { data: tasks = [], isLoading } = useTasks(filter)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

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
    if (selected?.id === task.id) setSelected(prev => prev ? { ...prev, status: next[task.status] } : null)
  }

  const isOverdue = (t: Task) =>
    t.dueDate && t.status !== 'DONE' && t.status !== 'CLOSED' && new Date(t.dueDate) < new Date()

  return (
    <div className="flex h-full relative">
      {/* List */}
      <div className={`flex flex-col overflow-hidden transition-all duration-200
        ${selected ? 'hidden md:flex md:flex-1' : 'flex flex-1'}`}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: '#e8e0d4' }}>
          <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Tasks</h1>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors active:scale-95"
            style={{ background: '#c17f3e', color: '#fff' }}>
            <Plus size={14} strokeWidth={2.5} /> New
          </button>
        </div>

        {/* Filters — horizontal scroll on mobile */}
        <div className="flex gap-1 px-4 md:px-6 py-2 border-b overflow-x-auto flex-shrink-0 scrollbar-none"
          style={{ borderColor: '#e8e0d4' }}>
          {FILTERS.map(f => (
            <button key={f.label} onClick={() => setFilter(f.value)}
              className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
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
            className="flex items-center gap-3 px-4 md:px-6 py-3 border-b bg-white flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#d8d0c8' }} />
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title..."
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
              className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
              style={{ color: '#1a1208', caretColor: '#c17f3e' }}
            />
          </form>
        )}

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 md:px-6 pt-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#ede9e3' }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="text-sm" style={{ color: '#b0a090' }}>No tasks here</p>
              <button onClick={() => setAdding(true)} className="text-sm font-semibold" style={{ color: '#c17f3e' }}>
                Add your first task
              </button>
            </div>
          ) : (
            <div className="py-1">
              {tasks.map(task => {
                const overdue = isOverdue(task)
                const isDone  = task.status === 'DONE' || task.status === 'CLOSED'
                const isSel   = selected?.id === task.id
                return (
                  <div key={task.id} onClick={() => setSelected(isSel ? null : task)}
                    className="flex items-center gap-3 px-4 md:px-6 py-3 cursor-pointer active:bg-orange-50 transition-colors"
                    style={{
                      background: isSel ? '#f0e8de' : 'transparent',
                      borderLeft: isSel ? '3px solid #c17f3e' : '3px solid transparent',
                    }}>
                    {/* Check */}
                    <button onClick={e => cycleStatus(e, task)}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors active:scale-90"
                      style={{
                        borderColor: isDone ? '#7a9a6a' : overdue ? '#e05252' : '#c8bdb0',
                        background: isDone ? '#7a9a6a' : 'transparent',
                      }}>
                      {isDone && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </button>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"
                        style={{ color: isDone ? '#b0a090' : '#1a1208', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {task.title}
                      </p>
                      {/* Mobile sub-row */}
                      <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                        {overdue && <span className="text-[10px] font-bold" style={{ color: '#e05252' }}>Overdue</span>}
                        {task.dueDate && !overdue && (
                          <span className="text-[10px]" style={{ color: '#9a8a7a' }}>
                            {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: STATUS_COLOR[task.status].bg, color: STATUS_COLOR[task.status].text }}>
                          {STATUS_LABEL[task.status]}
                        </span>
                      </div>
                    </div>

                    {/* Desktop meta */}
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                      <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
                      {overdue && <span className="text-[10px] font-bold" style={{ color: '#e05252' }}>Overdue</span>}
                      {task.dueDate && !overdue && (
                        <span className="text-[10px]" style={{ color: '#9a8a7a' }}>
                          {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
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
                        <span className="text-[10px] font-mono" style={{ color: '#b0a090' }}>{task.childCount}↓</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel — full screen on mobile, side panel on desktop */}
      {selected && (
        <div className="absolute inset-0 md:static md:inset-auto flex flex-col z-10"
          style={{ background: '#faf8f5' }}>
          {/* Mobile back button */}
          <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <button onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#c17f3e' }}>
              <ArrowLeft size={16} /> Tasks
            </button>
          </div>
          <TaskPanel key={selected.id} task={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
