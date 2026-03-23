import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import {
  useProjects, useProjectTasks, useProjectTodos, useProjectProblems,
  useCreateTask, useCreateTodo, useCreateProblem,
  useUpdateTask, useToggleTodo, useUpdateProject,
} from '../hooks'
import {
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
  PROBLEM_STATUS_LABEL, PROBLEM_STATUS_COLOR,
} from '../types'
import TaskDetail from '../components/panel/TaskDetail'
import TodoDetail from '../components/panel/TodoDetail'
import ProblemDetail from '../components/panel/ProblemDetail'

import type { Task, Todo, Problem, Tag, TaskStatus, Project } from '../types'

type AddType = 'task' | 'todo' | 'problem' | null
type Selected =
  | { kind: 'task';    item: Task }
  | { kind: 'todo';    item: Todo }
  | { kind: 'problem'; item: Problem }
  | null

function SectionHeader({ label, count, open, onToggle }: {
  label: string; count: number; open: boolean; onToggle: () => void
}) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 md:px-6 py-2 transition-colors"
      style={{ color: '#6b5e4e' }}>
      {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
        style={{ background: '#ede9e3', color: '#9a8a7a' }}>{count}</span>
    </button>
  )
}

const PROJ_COLORS = ['#c17f3e','#7a9a6a','#6b8fc0','#b06070','#8878a8','#c08050','#5a9a8a','#a07850']

function InlineProjectEdit({ project, onSave, onCancel, isSaving }: {
  project: Project
  onSave: (data: { name: string; description?: string; color?: string }) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [name, setName]   = useState(project.name)
  const [desc, setDesc]   = useState(project.description ?? '')
  const [color, setColor] = useState(project.color ?? '#c17f3e')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: desc || undefined, color })
  }

  return (
    <form onSubmit={handleSubmit}
      className="px-4 md:px-6 py-3 border-b flex-shrink-0 space-y-2"
      style={{ borderColor: '#e8e0d4', background: '#faf8f5', borderLeftWidth: 3, borderLeftColor: color }}>
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        className="w-full bg-transparent outline-none font-heading font-semibold text-sm border-none"
        style={{ color: '#1a1208', caretColor: color }} required />
      <input value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Short description..."
        className="w-full bg-transparent outline-none text-xs border-none"
        style={{ color: '#6b5e4e', caretColor: color }} />
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {PROJ_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-4 h-4 rounded-full transition-all active:scale-90"
              style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2, opacity: color === c ? 1 : 0.45 }} />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            className="text-xs font-semibold" style={{ color: '#9a8a7a' }}>Cancel</button>
          <button type="submit" disabled={isSaving}
            className="px-3 py-1 rounded-full text-xs font-semibold active:scale-95 disabled:opacity-50"
            style={{ background: color, color: '#fff' }}>
            {isSaving ? '...' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}


export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: projects = [] } = useProjects()
  const project = projects.find(p => p.id === id)

  const { data: tasks    = [], isLoading: lt } = useProjectTasks(id!)
  const { data: todos    = [], isLoading: lo } = useProjectTodos(id!)
  const { data: problems = [], isLoading: lp } = useProjectProblems(id!)

  const [selected,      setSelected]      = useState<Selected>(null)
  const [adding,        setAdding]        = useState<AddType>(null)
  const [newTitle,      setNewTitle]      = useState('')
  const [showDropdown,  setShowDropdown]  = useState(false)
  const [editingInfo,   setEditingInfo]   = useState(false)
  const [openTasks,     setOpenTasks]     = useState(true)
  const [openTodos,     setOpenTodos]     = useState(true)
  const [openProblems,  setOpenProblems]  = useState(true)
  const [taskFilter,    setTaskFilter]    = useState<'active' | 'all'>('active')

  const updateProject = useUpdateProject()
  const createTask    = useCreateTask()
  const createTodo    = useCreateTodo()
  const createProblem = useCreateProblem()
  const updateTask    = useUpdateTask()
  const toggleTodo    = useToggleTodo()

  const visibleTasks = taskFilter === 'active'
    ? tasks.filter((t: Task) => t.status !== 'DONE' && t.status !== 'CLOSED')
    : tasks

  const doneTasks        = tasks.filter((t: Task) => t.status === 'DONE' || t.status === 'CLOSED').length
  const openTodosCount   = todos.filter((t: Todo) => !t.done).length
  const openProblemsCount = problems.filter((p: Problem) => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length
  const pct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !adding) return
    const opts = { onSuccess: () => { setNewTitle(''); setAdding(null) } }
    if (adding === 'task')    createTask.mutate({ title: newTitle.trim(), status: 'OPEN', priority: 'MEDIUM', projectId: id }, opts)
    if (adding === 'todo')    createTodo.mutate({ title: newTitle.trim(), projectId: id }, opts)
    if (adding === 'problem') createProblem.mutate({ title: newTitle.trim(), status: 'NEW', projectId: id }, opts)
  }

  const cycleStatus = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    const next: Record<TaskStatus, TaskStatus> = {
      OPEN: 'IN_PROGRESS', IN_PROGRESS: 'DONE', SNOOZED: 'OPEN', DONE: 'OPEN', CLOSED: 'OPEN',
    }
    updateTask.mutate({ id: task.id, data: { title: task.title, status: next[task.status], priority: task.priority } })
  }

  const isLoading = lt || lo || lp

  return (
    <div className="flex h-full relative">
      {/* Main content */}
      <div className={`flex flex-col overflow-hidden ${selected ? 'hidden md:flex md:flex-1' : 'flex flex-1'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: '#e8e0d4' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#c17f3e' }}>
              <ArrowLeft size={15} />
              <span className="hidden md:inline">Projects</span>
            </button>
            {project && (
              <>
                <span style={{ color: '#d8d0c8' }}>/</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: project.color || '#c17f3e' }} />
                  <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>
                    {project.name}
                  </h1>
                  {/* Edit project info button */}
                  <button onClick={() => setEditingInfo(v => !v)}
                    className="p-1 rounded-md transition-colors hover:bg-black/5"
                    style={{ color: editingInfo ? '#c17f3e' : '#c0b09a' }}>
                    <Pencil size={13} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Add dropdown */}
          <div className="relative">
            <button onClick={() => setShowDropdown(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
              style={{ background: '#c17f3e', color: '#fff' }}>
              <Plus size={14} strokeWidth={2.5} /> Add <ChevronDown size={12} />
            </button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 rounded-xl overflow-hidden border shadow-lg"
                  style={{ background: '#faf8f5', borderColor: '#e8e0d4', minWidth: 140 }}>
                  {(['task', 'todo', 'problem'] as const).map(t => (
                    <button key={t} onClick={() => { setAdding(t); setShowDropdown(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium capitalize transition-colors"
                      style={{ color: '#3a2e20' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0e8de'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Inline project edit */}
        {editingInfo && project && (
          <InlineProjectEdit
            project={project}
            onSave={(data) => updateProject.mutate({ id: project.id, data }, { onSuccess: () => setEditingInfo(false) })}
            onCancel={() => setEditingInfo(false)}
            isSaving={updateProject.isPending}
          />
        )}

        {/* Summary bar */}
        {!isLoading && (tasks.length > 0 || todos.length > 0 || problems.length > 0) && (
          <div className="flex items-center gap-4 px-4 md:px-6 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: '#e8e0d4', background: '#faf8f5' }}>
            {tasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8e0d4' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: project?.color || '#c17f3e' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#9a8a7a' }}>
                  {doneTasks}/{tasks.length} done
                </span>
              </div>
            )}
            {openTodosCount > 0 && (
              <span className="text-xs" style={{ color: '#9a8a7a' }}>
                {openTodosCount} todo{openTodosCount > 1 ? 's' : ''}
              </span>
            )}
            {openProblemsCount > 0 && (
              <span className="text-xs font-semibold" style={{ color: '#e8924a' }}>
                {openProblemsCount} open problem{openProblemsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Inline add row */}
        {adding && (
          <form onSubmit={handleCreate}
            className="flex items-center gap-3 px-4 md:px-6 py-3 border-b bg-white flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
              style={{ background: '#f0e8de', color: '#c17f3e' }}>{adding}</span>
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder={adding === 'problem' ? 'Describe the problem...' : adding === 'todo' ? 'What needs doing...' : 'Task title...'}
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(null); setNewTitle('') } }}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: '#1a1208', caretColor: '#c17f3e' }} />
          </form>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="px-4 pt-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: '#ede9e3' }} />
              ))}
            </div>
          ) : (
            <>
              {/* Tasks */}
              <SectionHeader label="Tasks" count={visibleTasks.length}
                open={openTasks} onToggle={() => setOpenTasks(v => !v)} />
              {openTasks && (
                <>
                  {tasks.length > 0 && (
                    <div className="flex gap-1 px-4 md:px-6 pb-1">
                      {(['active', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setTaskFilter(f)}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize transition-colors"
                          style={taskFilter === f
                            ? { background: '#1a1208', color: '#faf8f5' }
                            : { background: 'transparent', color: '#9a8a7a' }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  {visibleTasks.length === 0 ? (
                    <p className="px-6 py-2 text-xs" style={{ color: '#c0b09a' }}>
                      {taskFilter === 'active' ? 'All tasks done 🎉' : 'No tasks yet'}
                    </p>
                  ) : visibleTasks.map((task: Task) => {
                    const isDone = task.status === 'DONE' || task.status === 'CLOSED'
                    const isSel  = selected?.kind === 'task' && selected.item.id === task.id
                    const isOver = task.dueDate && !isDone && new Date(task.dueDate) < new Date()
                    return (
                      <div key={task.id}
                        onClick={() => setSelected(isSel ? null : { kind: 'task', item: task })}
                        className="flex items-center gap-3 px-4 md:px-6 py-2.5 cursor-pointer transition-colors active:bg-orange-50"
                        style={{ background: isSel ? '#f0e8de' : 'transparent', borderLeft: isSel ? '3px solid #c17f3e' : '3px solid transparent' }}>
                        <button onClick={e => cycleStatus(e, task)}
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-90 transition-colors"
                          style={{ borderColor: isDone ? '#7a9a6a' : '#c8bdb0', background: isDone ? '#7a9a6a' : 'transparent' }}>
                          {isDone && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                        </button>
                        <span className="flex-1 text-sm font-medium truncate"
                          style={{ color: isDone ? '#b0a090' : '#1a1208', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
                          {isOver && <span className="text-[10px] font-bold" style={{ color: '#e05252' }}>Overdue</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: STATUS_COLOR[task.status].bg, color: STATUS_COLOR[task.status].text }}>
                            {STATUS_LABEL[task.status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Todos */}
              <div className="mt-3">
                <SectionHeader label="Todos" count={todos.length}
                  open={openTodos} onToggle={() => setOpenTodos(v => !v)} />
                {openTodos && (
                  todos.length === 0 ? (
                    <p className="px-6 py-2 text-xs" style={{ color: '#c0b09a' }}>No todos yet</p>
                  ) : todos.map((todo: Todo) => {
                    const isSel = selected?.kind === 'todo' && selected.item.id === todo.id
                    return (
                      <div key={todo.id}
                        onClick={() => setSelected(isSel ? null : { kind: 'todo', item: todo })}
                        className="flex items-center gap-3 px-4 md:px-6 py-2.5 cursor-pointer transition-colors active:bg-orange-50"
                        style={{ background: isSel ? '#f0e8de' : 'transparent', borderLeft: isSel ? '3px solid #c17f3e' : '3px solid transparent' }}>
                        <button onClick={e => { e.stopPropagation(); toggleTodo.mutate(todo.id) }}
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-90 transition-colors"
                          style={{ borderColor: todo.done ? '#7a9a6a' : '#c8bdb0', background: todo.done ? '#7a9a6a' : 'transparent' }}>
                          {todo.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                        </button>
                        <span className="flex-1 text-sm font-medium"
                          style={{ color: todo.done ? '#b0a090' : '#1a1208', textDecoration: todo.done ? 'line-through' : 'none' }}>
                          {todo.title}
                        </span>
                        {todo.tags.slice(0, 2).map((tag: Tag) => (
                          <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: tag.color + '20', color: tag.color }}>{tag.name}</span>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Problems */}
              <div className="mt-3">
                <SectionHeader label="Problems" count={problems.length}
                  open={openProblems} onToggle={() => setOpenProblems(v => !v)} />
                {openProblems && (
                  problems.length === 0 ? (
                    <p className="px-6 py-2 text-xs" style={{ color: '#c0b09a' }}>No problems logged</p>
                  ) : problems.map((problem: Problem) => {
                    const isSel = selected?.kind === 'problem' && selected.item.id === problem.id
                    return (
                      <div key={problem.id}
                        onClick={() => setSelected(isSel ? null : { kind: 'problem', item: problem })}
                        className="flex items-start gap-3 px-4 md:px-6 py-3 cursor-pointer transition-colors active:bg-orange-50"
                        style={{ background: isSel ? '#f0e8de' : 'transparent', borderLeft: isSel ? '3px solid #c17f3e' : '3px solid transparent' }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: PROBLEM_STATUS_COLOR[problem.status].text }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#1a1208' }}>{problem.title}</p>
                          {problem.note && (
                            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#9a8a7a' }}>{problem.note}</p>
                          )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5"
                          style={{ background: PROBLEM_STATUS_COLOR[problem.status].bg, color: PROBLEM_STATUS_COLOR[problem.status].text }}>
                          {PROBLEM_STATUS_LABEL[problem.status]}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="absolute inset-0 md:static md:inset-auto flex flex-col z-10"
          style={{ background: '#faf8f5' }}>
          <div className="md:hidden flex items-center px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <button onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#c17f3e' }}>
              <ArrowLeft size={16} /> {project?.name}
            </button>
          </div>
          {selected.kind === 'task'    && <TaskDetail    key={selected.item.id} task={selected.item}    onClose={() => setSelected(null)} />}
          {selected.kind === 'todo'    && <TodoDetail    key={selected.item.id} todo={selected.item}    onClose={() => setSelected(null)} />}
          {selected.kind === 'problem' && <ProblemDetail key={selected.item.id} problem={selected.item} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  )
}
