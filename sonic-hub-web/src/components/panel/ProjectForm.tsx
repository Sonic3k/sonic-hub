import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../../types'

const COLORS = [
  '#c17f3e', '#7a9a6a', '#6b8fc0', '#b06080',
  '#8878a8', '#c08050', '#5a9a8a', '#a07850',
]

interface Props {
  project?: Project
  onSubmit: (data: { name: string; description?: string; color?: string }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ProjectForm({ project, onSubmit, onCancel, isLoading }: Props) {
  const [name, setName]         = useState(project?.name ?? '')
  const [description, setDesc]  = useState(project?.description ?? '')
  const [color, setColor]       = useState(project?.color ?? COLORS[0])

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDesc(project.description ?? '')
      setColor(project.color ?? COLORS[0])
    }
  }, [project?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description || undefined, color })
  }

  return (
    <form onSubmit={handleSubmit}
      className="border rounded-xl overflow-hidden"
      style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}>

      {/* Color bar at top */}
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="p-4 space-y-3">
        {/* Name */}
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Project name..."
          className="w-full bg-transparent border-none outline-none font-heading font-semibold text-base"
          style={{ color: '#1a1208', caretColor: '#c17f3e' }}
          required
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Short description (optional)..."
          rows={2}
          className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
          style={{ color: '#6b5e4e', caretColor: '#c17f3e' }}
        />

        {/* Color picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: '#9a8a7a' }}>Color</span>
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full transition-all active:scale-90"
                style={{
                  background: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                  opacity: color === c ? 1 : 0.5,
                }} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end items-center gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9a8a7a' }}>
            <X size={15} />
          </button>
          <button type="submit" disabled={isLoading || !name.trim()}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#c17f3e', color: '#fff' }}>
            {isLoading ? 'Saving...' : project ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  )
}
