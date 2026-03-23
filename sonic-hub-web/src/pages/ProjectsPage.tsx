
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useProjects, useProjectTasks, useProjectTodos, useProjectProblems } from '../hooks'
import type { Project } from '../types'

function ProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate()
  const { data: tasks    = [] } = useProjectTasks(project.id)
  const { data: todos    = [] } = useProjectTodos(project.id)
  const { data: problems = [] } = useProjectProblems(project.id)

  const totalTasks  = tasks.length
  const doneTasks   = tasks.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const openTodos   = todos.filter(t => !t.done).length
  const openProblems = problems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="flex items-center gap-3 px-4 md:px-6 py-4 cursor-pointer transition-colors rounded-xl mx-2 mb-1 active:scale-[0.99]"
      style={{ background: '#faf8f5', border: '1px solid #e8e0d4' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#c17f3e'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e0d4'}
    >
      {/* Color dot */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: (project.color || '#c17f3e') + '20' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: project.color || '#c17f3e' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-sm" style={{ color: '#1a1208' }}>{project.name}</p>
        {project.description && (
          <p className="text-xs truncate mt-0.5" style={{ color: '#9a8a7a' }}>{project.description}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          {totalTasks > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8e0d4' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: project.color || '#c17f3e' }} />
              </div>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#9a8a7a' }}>
                {doneTasks}/{totalTasks}
              </span>
            </div>
          )}
          {openTodos > 0 && (
            <span className="text-[10px]" style={{ color: '#9a8a7a' }}>{openTodos} todo{openTodos > 1 ? 's' : ''}</span>
          )}
          {openProblems > 0 && (
            <span className="text-[10px] font-semibold" style={{ color: '#e8924a' }}>
              {openProblems} problem{openProblems > 1 ? 's' : ''}
            </span>
          )}
          {totalTasks === 0 && openTodos === 0 && openProblems === 0 && (
            <span className="text-[10px]" style={{ color: '#c0b09a' }}>Empty</span>
          )}
        </div>
      </div>

      <ChevronRight size={15} style={{ color: '#c0b09a', flexShrink: 0 }} />
    </div>
  )
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4' }}>
        <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Projects</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {isLoading ? (
          <div className="px-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#ede9e3' }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm" style={{ color: '#b0a090' }}>No projects yet</p>
            <p className="text-xs" style={{ color: '#c0b09a' }}>Create projects from the admin panel</p>
          </div>
        ) : (
          projects.map(p => <ProjectRow key={p.id} project={p} />)
        )}
      </div>
    </div>
  )
}
