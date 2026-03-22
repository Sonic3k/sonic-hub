import { useState } from 'react'
import { useTasks, useTodos, useProblems, useProjects } from '../hooks/useBoard'
import TaskSticker from '../components/sticker/TaskSticker'
import TodoSticker from '../components/sticker/TodoSticker'
import ProblemSticker from '../components/sticker/ProblemSticker'
import Topbar from '../components/layout/Topbar'
import QuickAdd from '../components/ui/QuickAdd'
import type { TaskStatus } from '../types'

const TASK_FILTERS: (TaskStatus | undefined)[] = [undefined, 'OPEN', 'IN_PROGRESS', 'SNOOZED']

type Section = 'tasks' | 'todos' | 'problems'

export default function BoardPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [taskFilter, setTaskFilter] = useState<TaskStatus | undefined>(undefined)
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [activeSection, setActiveSection] = useState<Section>('tasks')

  const { data: tasks = [] } = useTasks(taskFilter)
  const { data: todos = [] } = useTodos()
  const { data: problems = [] } = useProblems()
  const { data: projects = [] } = useProjects()

  const filteredTasks = projectFilter ? tasks.filter(t => t.projectId === projectFilter) : tasks
  const filteredTodos = projectFilter ? todos.filter(t => t.projectId === projectFilter) : todos
  const filteredProblems = projectFilter ? problems.filter(p => p.projectId === projectFilter) : problems

  const tasksDone = tasks.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length

  const sectionItems: Record<Section, number> = {
    tasks: filteredTasks.length,
    todos: filteredTodos.filter(t => !t.done).length,
    problems: filteredProblems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length,
  }

  return (
    <div className="min-h-screen" style={{ background: '#ede8df' }}>
      <Topbar onAdd={() => setShowAdd(true)} tasksDone={tasksDone} tasksTotal={tasks.length} />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Filters row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Project filter */}
          {projects.length > 0 && (
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-md border outline-none transition-colors"
              style={{ background: '#faf6ef', borderColor: '#ddd5c4', color: '#6b5c44' }}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <div className="w-px h-4 bg-[#ddd5c4]" />

          {/* Section tabs */}
          {(['tasks','todos','problems'] as Section[]).map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
              style={activeSection === s
                ? { background: '#2c2010', color: '#faf6ef' }
                : { background: '#faf6ef', color: '#6b5c44', border: '1px solid #ddd5c4' }}>
              {s}
              {sectionItems[s] > 0 && (
                <span className="px-1 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: activeSection === s ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.07)' }}>
                  {sectionItems[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task status filter */}
        {activeSection === 'tasks' && (
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {TASK_FILTERS.map(f => (
              <button key={f ?? 'all'} onClick={() => setTaskFilter(f)}
                className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                style={taskFilter === f
                  ? { background: '#6b5c44', color: '#faf6ef' }
                  : { background: 'rgba(0,0,0,.06)', color: '#8a7055' }}>
                {f === undefined ? 'All' : f === 'OPEN' ? 'Open' : f === 'IN_PROGRESS' ? 'In Progress' : 'Snoozed'}
              </button>
            ))}
          </div>
        )}

        {/* Board */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">

          {activeSection === 'tasks' && filteredTasks.map((task, i) => (
            <div key={task.id} className="break-inside-avoid">
              <TaskSticker task={task} index={i} />
            </div>
          ))}

          {activeSection === 'tasks' && filteredTasks.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#9a8a70]">
              <p className="text-sm">No tasks — pin one!</p>
            </div>
          )}

          {activeSection === 'todos' && filteredTodos.map((todo, i) => (
            <div key={todo.id} className="break-inside-avoid">
              <TodoSticker todo={todo} index={i} />
            </div>
          ))}

          {activeSection === 'todos' && filteredTodos.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#9a8a70]">
              <p className="text-sm">No todos yet</p>
            </div>
          )}

          {activeSection === 'problems' && filteredProblems.map((problem, i) => (
            <div key={problem.id} className="break-inside-avoid">
              <ProblemSticker problem={problem} index={i} />
            </div>
          ))}

          {activeSection === 'problems' && filteredProblems.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#9a8a70]">
              <p className="text-sm">No problems logged</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && <QuickAdd onClose={() => setShowAdd(false)} />}
    </div>
  )
}
