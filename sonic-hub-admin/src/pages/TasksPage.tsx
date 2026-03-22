import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../components/ui'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import { useRootTasks, useCreateTask } from '../hooks/useTasks'
import { STATUS_LABELS } from '../types'
import type { TaskStatus, TaskRequest } from '../types'

const STATUS_FILTERS: (TaskStatus | undefined)[] = [undefined, 'OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined)
  const [showCreate, setShowCreate] = useState(false)

  const { data: tasks = [], isLoading } = useRootTasks(statusFilter)
  const createTask = useCreateTask()

  const handleCreate = (data: TaskRequest) => {
    createTask.mutate(data, { onSuccess: () => setShowCreate(false) })
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
          <p className="text-sm text-slate-400 mt-0.5">{tasks.length} root task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          New Task
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s ?? 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-500 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-lg border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No tasks yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 text-indigo-500 text-sm hover:underline"
          >
            Create your first task
          </button>
        </div>
      ) : (
        <div>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {showCreate && (
        <TaskForm
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          isLoading={createTask.isPending}
        />
      )}
    </div>
  )
}
