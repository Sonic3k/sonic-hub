import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Card, { TYPE_COLOR } from './Card'
import { useUpdateProject, useDeleteProject, useProjectTasks, useProjectTodos, useProjectProblems } from '../../hooks'
import type { Project } from '../../types'

const COLORS = ['#c17f3e','#7a9a6a','#6b8fc0','#b06070','#8878a8','#c08050','#5a9a8a','#a07850']

interface Props { project: Project }

export default function ProjectCard({ project }: Props) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [name, setName]         = useState(project.name)
  const [desc, setDesc]         = useState(project.description ?? '')
  const [color, setColor]       = useState(project.color ?? TYPE_COLOR.project)
  const [dirty, setDirty]       = useState(false)

  const { data: tasks    = [] } = useProjectTasks(project.id)
  const { data: todos    = [] } = useProjectTodos(project.id)
  const { data: problems = [] } = useProjectProblems(project.id)

  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const totalTasks   = tasks.length
  const doneTasks    = tasks.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const openTodos    = todos.filter(t => !t.done).length
  const openProblems = problems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length
  const pct          = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const save = () => {
    if (!name.trim()) return
    updateProject.mutate(
      { id: project.id, data: { name: name.trim(), description: desc || undefined, color } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  return (
    <Card type="project" expanded={expanded}
      onClick={() => !expanded && setExpanded(true)}
      style={{ borderLeftColor: color } as React.CSSProperties}>
      <div className="p-4">

        {/* Color dot + name */}
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: color }} />
          {expanded ? (
            <input
              value={name} autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => { setName(e.target.value); setDirty(true) }}
              className="flex-1 bg-transparent outline-none font-heading font-semibold text-sm border-none"
              style={{ color: '#1a1208', caretColor: color }}
            />
          ) : (
            <p className="flex-1 font-heading font-semibold text-sm" style={{ color: '#1a1208' }}>
              {project.name}
            </p>
          )}
        </div>

        {/* Description */}
        {!expanded && project.description && (
          <p className="text-xs leading-relaxed mb-3 ml-5.5 line-clamp-2" style={{ color: '#9a8a7a' }}>
            {project.description}
          </p>
        )}
        {expanded && (
          <div className="mb-3 ml-[22px]" onClick={e => e.stopPropagation()}>
            <textarea
              value={desc}
              onChange={e => { setDesc(e.target.value); setDirty(true) }}
              rows={2}
              placeholder="Short description..."
              className="w-full bg-white border rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: color }}
            />
          </div>
        )}

        {/* Color picker (only expanded) */}
        {expanded && (
          <div className="flex items-center gap-1.5 mb-3 ml-[22px]" onClick={e => e.stopPropagation()}>
            {COLORS.map(c => (
              <button key={c} onClick={() => { setColor(c); setDirty(true) }}
                className="w-5 h-5 rounded-full transition-all active:scale-90"
                style={{
                  background: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                  opacity: color === c ? 1 : 0.45,
                }} />
            ))}
          </div>
        )}

        {/* Progress + stats */}
        <div className="ml-[22px]">
          {totalTasks > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8e0d4' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-[10px] font-semibold tabular-nums flex-shrink-0"
                style={{ color: '#9a8a7a' }}>{doneTasks}/{totalTasks}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            {openTodos > 0 && (
              <span className="text-[10px]" style={{ color: '#9a8a7a' }}>
                {openTodos} todo{openTodos > 1 ? 's' : ''}
              </span>
            )}
            {openProblems > 0 && (
              <span className="text-[10px] font-semibold" style={{ color: '#b06070' }}>
                {openProblems} problem{openProblems > 1 ? 's' : ''}
              </span>
            )}
            {totalTasks === 0 && openTodos === 0 && openProblems === 0 && (
              <span className="text-[10px]" style={{ color: '#c0b09a' }}>Empty</span>
            )}
          </div>
        </div>

        {/* Expanded actions */}
        {expanded && dirty && (
          <div className="flex justify-end gap-2 mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setExpanded(false); setDirty(false); setName(project.name); setDesc(project.description ?? ''); setColor(project.color ?? TYPE_COLOR.project) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: '#e8e0d4', color: '#9a8a7a' }}>
              Discard
            </button>
            <button onClick={save} disabled={updateProject.isPending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold active:scale-95 disabled:opacity-50"
              style={{ background: color, color: '#fff' }}>
              {updateProject.isPending ? '...' : 'Save'}
            </button>
          </div>
        )}
        {expanded && !dirty && (
          <div className="flex justify-between items-center mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${project.name}"?`)) deleteProject.mutate(project.id) }}
              className="text-xs font-medium" style={{ color: '#c0a090' }}>
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setExpanded(false)} className="text-xs font-medium" style={{ color: '#9a8a7a' }}>
                Close
              </button>
              <button onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`) }}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={{ background: color, color: '#fff' }}>
                Open <ArrowRight size={11} />
              </button>
            </div>
          </div>
        )}
        {!expanded && (
          <div className="flex justify-end mt-2">
            <button onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`) }}
              className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{ color }}>
              View <ArrowRight size={10} />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
