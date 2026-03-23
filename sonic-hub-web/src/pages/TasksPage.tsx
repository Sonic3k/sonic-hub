import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTasks, useCreateTask } from '../hooks'
import TaskCard from '../components/card/TaskCard'
import TaskDetail from '../components/panel/TaskDetail'
import MasonryGrid, { MasonryItem } from '../components/card/MasonryGrid'
import type { Task, TaskStatus } from '../types'

const FILTERS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All', value: undefined }, { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Snoozed', value: 'SNOOZED' },
  { label: 'Done', value: 'DONE' },
]

export default function TasksPage() {
  const [filter, setFilter]       = useState<TaskStatus | undefined>(undefined)
  const [fullScreen, setFullScreen] = useState<Task | null>(null)
  const [newTitle, setNewTitle]   = useState('')
  const [adding, setAdding]       = useState(false)

  const { data: tasks = [], isLoading } = useTasks(filter)
  const createTask = useCreateTask()

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTask.mutate({ title: newTitle.trim(), status: 'OPEN', priority: 'MEDIUM' },
      { onSuccess: () => { setNewTitle(''); setAdding(false) } })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4' }}>
        <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Tasks</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
          style={{ background: '#c17f3e', color: '#fff' }}>
          <Plus size={14} strokeWidth={2.5} /> New
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto flex-shrink-0 scrollbar-hide"
        style={{ borderColor: '#e8e0d4' }}>
        {FILTERS.map(f => (
          <button key={f.label} onClick={() => setFilter(f.value)}
            className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors"
            style={filter === f.value
              ? { background: '#1a1208', color: '#faf8f5' }
              : { background: 'transparent', color: '#9a8a7a' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Quick add */}
      {adding && (
        <form onSubmit={handleCreate}
          className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
          style={{ background: '#fff', borderColor: '#e8e0d4' }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#c17f3e' }} />
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title... (Enter to save, Esc to cancel)"
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            className="flex-1 text-sm bg-transparent outline-none border-none"
            style={{ color: '#1a1208', caretColor: '#c17f3e' }} />
        </form>
      )}

      {/* Masonry */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <MasonryGrid>
            {[...Array(6)].map((_, i) => (
              <MasonryItem key={i}>
                <div className="h-24 rounded-2xl animate-pulse" style={{ background: '#ede9e3' }} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm" style={{ color: '#b0a090' }}>No tasks here</p>
            <button onClick={() => setAdding(true)} className="text-sm font-semibold" style={{ color: '#c17f3e' }}>
              Add your first task
            </button>
          </div>
        ) : (
          <MasonryGrid>
            {tasks.map(task => (
              <MasonryItem key={task.id}>
                <TaskCard task={task} onFullScreen={setFullScreen} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        )}
      </div>

      {fullScreen && <TaskDetail task={fullScreen} onClose={() => setFullScreen(null)} />}
    </div>
  )
}
