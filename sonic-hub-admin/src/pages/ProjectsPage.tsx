import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Button, Input, Textarea, Modal } from '../components/ui'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects'
import type { Project } from '../types'

const PRESET_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']

function ProjectForm({ project, onSubmit, onClose, isLoading }: {
  project?: Project
  onSubmit: (data: { name: string; description?: string; color?: string }) => void
  onClose: () => void
  isLoading?: boolean
}) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PRESET_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description || undefined, color })
  }

  return (
    <Modal title={project ? 'Edit Project' : 'New Project'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)}
          placeholder="Project name..." autoFocus required />
        <Textarea label="Description" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const updateProject = useUpdateProject(editingProject?.id ?? '')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={14} />New Project</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-lg border border-slate-100 animate-pulse" />
        ))}</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No projects yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-indigo-500 text-sm hover:underline">
            Create your first project
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(project => (
            <div key={project.id}
              className="group flex items-center justify-between bg-white rounded-lg border border-slate-100 hover:border-slate-200 px-4 py-3 transition-all">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: project.color || '#94a3b8' }} />
                <div>
                  <span className="text-sm font-medium text-slate-700">{project.name}</span>
                  {project.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{project.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => setEditingProject(project)}>
                  <Pencil size={12} />
                </Button>
                <Button variant="danger" size="sm" onClick={() => {
                  if (confirm(`Delete project "${project.name}"?`)) deleteProject.mutate(project.id)
                }}>
                  <Trash2 size={12} />
                </Button>
                <ChevronRight size={14} className="text-slate-300 ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ProjectForm
          onSubmit={data => createProject.mutate(data, { onSuccess: () => setShowCreate(false) })}
          onClose={() => setShowCreate(false)}
          isLoading={createProject.isPending}
        />
      )}
      {editingProject && (
        <ProjectForm
          project={editingProject}
          onSubmit={data => updateProject.mutate(data, { onSuccess: () => setEditingProject(null) })}
          onClose={() => setEditingProject(null)}
          isLoading={updateProject.isPending}
        />
      )}
    </div>
  )
}
