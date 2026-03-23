import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject,
         useProjectTasks, useProjectTodos, useProjectProblems } from '../hooks'
import type { Project, Task, Todo, Problem } from '../types'
import type { ProjectPayload } from '../api'

const COLORS = ['#c17f3e','#6b8cba','#7a9a6a','#a06b9a','#c97a5a','#6a9a8a','#8a7ac8','#ba7070']

// ── Inline form (create or edit) ─────────────────────────────────────────────
function ProjectForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Project
  onSave: (d: ProjectPayload) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName]   = useState(initial?.name ?? '')
  const [desc, setDesc]   = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: desc || undefined, color })
  }

  return (
    <form onSubmit={handleSubmit}
      className="mx-2 mb-2 rounded-xl border p-4 space-y-3"
      style={{ background: '#faf8f5', borderColor: '#c17f3e' }}>

      {/* Name */}
      <input
        autoFocus value={name} onChange={e => setName(e.target.value)}
        placeholder="Project name..."
        className="w-full bg-transparent border-none outline-none text-sm font-semibold"
        style={{ color: '#1a1208', caretColor: '#c17f3e' }}
        required
      />

      {/* Description */}
      <textarea
        value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Short description (optional)..."
        rows={2}
        className="w-full bg-white rounded-lg border px-3 py-2 text-sm outline-none resize-none"
        style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: '#c17f3e' }}
      />

      {/* Color picker */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: '#9a8a7a' }}>Color</span>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}>
              {color === c && <Check size={11} color="#fff" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          style={{ background: 'rgba(0,0,0,.06)', color: '#6b5e4e' }}>
          <X size={12} /> Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 active:scale-95"
          style={{ background: '#c17f3e', color: '#fff' }}>
          <Check size={12} /> {saving ? 'Saving...' : initial ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  )
}

// ── Project row ───────────────────────────────────────────────────────────────
function ProjectRow({
  project, onEdit, onDelete,
}: {
  project: Project
  onEdit: () => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const { data: tasks    = [] } = useProjectTasks(project.id)
  const { data: todos    = [] } = useProjectTodos(project.id)
  const { data: problems = [] } = useProjectProblems(project.id)

  const doneTasks    = tasks.filter((t: Task) => t.status === 'DONE' || t.status === 'CLOSED').length
  const openTodos    = todos.filter((t: Todo) => !t.done).length
  const openProblems = problems.filter((p: Problem) => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length
  const pct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  return (
    <div className="group flex items-center gap-3 mx-2 mb-2 px-4 py-3.5 rounded-xl border cursor-pointer transition-all active:scale-[0.99]"
      style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#c8b8a8'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e0d4'}
      onClick={() => navigate(`/projects/${project.id}`)}>

      {/* Color badge */}
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
        <div className="flex items-center gap-3 mt-1.5">
          {tasks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8e0d4' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: project.color || '#c17f3e' }} />
              </div>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#9a8a7a' }}>
                {doneTasks}/{tasks.length}
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
          {tasks.length === 0 && openTodos === 0 && openProblems === 0 && (
            <span className="text-[10px]" style={{ color: '#c0b09a' }}>Empty</span>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}>
        <button onClick={onEdit}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#9a8a7a' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0e8de'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#9a8a7a' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#e05252' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a8a7a' }}>
          <Trash2 size={13} />
        </button>
      </div>

      <ChevronRight size={14} style={{ color: '#c0b09a', flexShrink: 0 }} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [creating, setCreating]         = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)

  const handleCreate = (d: ProjectPayload) => {
    createProject.mutate(d, { onSuccess: () => setCreating(false) })
  }

  const handleUpdate = (id: string, d: ProjectPayload) => {
    updateProject.mutate({ id, data: d }, { onSuccess: () => setEditingId(null) })
  }

  const handleDelete = (project: Project) => {
    if (!confirm(`Delete "${project.name}"? All items will lose their project association.`)) return
    deleteProject.mutate(project.id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4' }}>
        <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Projects</h1>
        {!creating && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95 transition-transform"
            style={{ background: '#c17f3e', color: '#fff' }}>
            <Plus size={14} strokeWidth={2.5} /> New
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-3">

        {/* Create form */}
        {creating && (
          <ProjectForm
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={createProject.isPending}
          />
        )}

        {isLoading ? (
          <div className="px-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse mx-2" style={{ background: '#ede9e3' }} />
            ))}
          </div>
        ) : projects.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm" style={{ color: '#b0a090' }}>No projects yet</p>
            <button onClick={() => setCreating(true)} className="text-sm font-semibold" style={{ color: '#c17f3e' }}>
              Create your first project
            </button>
          </div>
        ) : (
          projects.map(p =>
            editingId === p.id ? (
              <ProjectForm
                key={p.id}
                initial={p}
                onSave={d => handleUpdate(p.id, d)}
                onCancel={() => setEditingId(null)}
                saving={updateProject.isPending}
              />
            ) : (
              <ProjectRow
                key={p.id}
                project={p}
                onEdit={() => setEditingId(p.id)}
                onDelete={() => handleDelete(p)}
              />
            )
          )
        )}
      </div>
    </div>
  )
}
