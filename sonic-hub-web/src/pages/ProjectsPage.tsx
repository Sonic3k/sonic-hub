import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProjects, useCreateProject } from '../hooks'
import ProjectCard from '../components/card/ProjectCard'
import MasonryGrid, { MasonryItem } from '../components/card/MasonryGrid'

const COLORS = ['#c17f3e','#7a9a6a','#6b8fc0','#b06070','#8878a8','#c08050','#5a9a8a','#a07850']

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()

  const [adding, setAdding]   = useState(false)
  const [name, setName]       = useState('')
  const [color, setColor]     = useState(COLORS[0])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createProject.mutate({ name: name.trim(), color },
      { onSuccess: () => { setName(''); setAdding(false) } })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4' }}>
        <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Projects</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
          style={{ background: '#6b8fc0', color: '#fff' }}>
          <Plus size={14} strokeWidth={2.5} /> New
        </button>
      </div>

      {adding && (
        <form onSubmit={handleCreate}
          className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: '#fff', borderColor: '#e8e0d4' }}>
          <div className="flex gap-1.5 flex-shrink-0">
            {COLORS.slice(0, 5).map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-4 h-4 rounded-full transition-all active:scale-90"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2, opacity: color === c ? 1 : 0.45 }} />
            ))}
          </div>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="Project name..."
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setName('') } }}
            className="flex-1 text-sm bg-transparent outline-none border-none font-heading font-semibold"
            style={{ color: '#1a1208', caretColor: color }} />
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <MasonryGrid>
            {[...Array(3)].map((_, i) => (
              <MasonryItem key={i}>
                <div className="h-28 rounded-2xl animate-pulse" style={{ background: '#ede9e3' }} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        ) : projects.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm" style={{ color: '#b0a090' }}>No projects yet</p>
            <button onClick={() => setAdding(true)} className="text-sm font-semibold" style={{ color: '#6b8fc0' }}>
              Create your first project
            </button>
          </div>
        ) : (
          <MasonryGrid>
            {projects.map(project => (
              <MasonryItem key={project.id}>
                <ProjectCard project={project} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        )}
      </div>
    </div>
  )
}
