import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { TYPE_COLOR } from './Card'
import { useUpdateProject, useDeleteProject, useProjectTasks, useProjectTodos, useProjectProblems } from '../../hooks'
import type { Project } from '../../types'

const COLORS = ['#c17f3e','#7a9a6a','#6b8fc0','#b06070','#8878a8','#c08050','#5a9a8a','#a07850']

// Custom background per project color instead of fixed type
function projectBg(color: string) {
  return color + '22'
}

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

  const update = useUpdateProject()
  const remove = useDeleteProject()

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const openTodos  = todos.filter(t => !t.done).length
  const openProbs  = problems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0

  const save = () => {
    if (!name.trim()) return
    update.mutate(
      { id: project.id, data: { name: name.trim(), description: desc || undefined, color } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  return (
    <div
      onClick={() => !expanded && setExpanded(true)}
      className={`rounded-2xl cursor-pointer transition-all duration-200 select-none ${!expanded ? 'hover:-translate-y-1 active:scale-[0.97]' : ''}`}
      style={{
        background: projectBg(color),
        boxShadow: expanded
          ? `0 8px 28px ${color}30, 0 2px 6px ${color}20`
          : `0 2px 10px ${color}22, 0 1px 3px ${color}15`,
      }}>
      <div className="p-4 pb-3">

        {/* Color dot + name */}
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0 transition-colors"
            style={{ background: color }} />
          {expanded
            ? <input value={name} autoFocus
                onClick={e => e.stopPropagation()}
                onChange={e => { setName(e.target.value); setDirty(true) }}
                className="flex-1 bg-transparent outline-none font-heading font-semibold text-[14px] border-none"
                style={{ color: '#1a1208', caretColor: color }} />
            : <p className="flex-1 font-heading font-semibold text-[14px]" style={{ color: '#1a1208' }}>
                {project.name}
              </p>
          }
        </div>

        {/* Description */}
        {!expanded && project.description && (
          <p className="text-[12px] leading-relaxed mb-3 ml-[22px] italic line-clamp-2"
            style={{ color: color + 'bb' }}>
            {project.description}
          </p>
        )}
        {expanded && (
          <div className="mb-3 ml-[22px]" onClick={e => e.stopPropagation()}>
            <textarea value={desc} rows={2}
              onChange={e => { setDesc(e.target.value); setDirty(true) }}
              placeholder="Short description..."
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none border-none"
              style={{ background: 'rgba(255,255,255,.55)', color: '#3a2e20', caretColor: color }}
            />
          </div>
        )}

        {/* Color picker (expanded) */}
        {expanded && (
          <div className="flex gap-1.5 mb-3 ml-[22px]" onClick={e => e.stopPropagation()}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => { setColor(c); setDirty(true) }}
                className="w-5 h-5 rounded-full transition-all active:scale-90"
                style={{ background: c, outline: color === c ? `2.5px solid ${c}` : 'none', outlineOffset: 2, opacity: color === c ? 1 : 0.4 }} />
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="ml-[22px]">
          {total > 0 && (
            <div className="mb-2">
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: color + '30' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-[11px] font-bold" style={{ color: color + 'aa' }}>
                {done}/{total} tasks done
              </span>
            </div>
          )}
          <div className="flex gap-3">
            {openTodos > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: color + 'aa' }}>
                {openTodos} todo{openTodos > 1 ? 's' : ''}
              </span>
            )}
            {openProbs > 0 && (
              <span className="text-[11px] font-bold" style={{ color: '#b06070' }}>
                {openProbs} problem{openProbs > 1 ? 's' : ''}
              </span>
            )}
            {total === 0 && openTodos === 0 && openProbs === 0 && (
              <span className="text-[11px]" style={{ color: color + '70' }}>Empty</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {expanded && (
          <div className="flex items-center justify-between mt-3 ml-[22px]" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${project.name}"?`)) remove.mutate(project.id) }}
              className="text-[12px] font-semibold" style={{ color: color + '80' }}>Delete</button>
            <div className="flex items-center gap-2">
              <button onClick={() => { setExpanded(false); setDirty(false); setName(project.name); setDesc(project.description ?? ''); setColor(project.color ?? TYPE_COLOR.project) }}
                className="text-[12px] font-semibold" style={{ color: color + '80' }}>Close</button>
              {dirty
                ? <button onClick={save} disabled={update.isPending}
                    className="px-4 py-1.5 rounded-full text-[12px] font-bold active:scale-95 disabled:opacity-50"
                    style={{ background: color, color: '#fff' }}>
                    {update.isPending ? '...' : 'Save'}
                  </button>
                : <button onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`) }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95"
                    style={{ background: color, color: '#fff' }}>
                    Open <ArrowRight size={11} />
                  </button>
              }
            </div>
          </div>
        )}
        {!expanded && (
          <button onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`) }}
            className="flex items-center gap-1 mt-2.5 ml-[22px] text-[11px] font-bold transition-colors"
            style={{ color: color + 'cc' }}>
            Open project <ArrowRight size={10} />
          </button>
        )}
      </div>
    </div>
  )
}
