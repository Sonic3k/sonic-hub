import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import FullScreenPanel from './FullScreenPanel'
import { ProblemStatusPills, TagChip, TYPE_COLOR } from '../card/Card'
import { useUpdateProblem, useDeleteProblem, useTags, useProjects } from '../../hooks'
import type { Problem, ProblemStatus } from '../../types'

const label = (text: string) => (
  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9a8a7a' }}>{text}</p>
)

interface Props { problem: Problem; onClose: () => void }

export default function ProblemDetail({ problem, onClose }: Props) {
  const [title, setTitle]         = useState(problem.title)
  const [note, setNote]           = useState(problem.note ?? '')
  const [status, setStatus]       = useState<ProblemStatus>(problem.status)
  const [projectId, setProjectId] = useState(problem.projectId ?? '')
  const [tagIds, setTagIds]       = useState<Set<string>>(new Set(problem.tags.map(t => t.id)))
  const [dirty, setDirty]         = useState(false)

  const { data: tags     = [] } = useTags()
  const { data: projects = [] } = useProjects()
  const updateProblem = useUpdateProblem()
  const deleteProblem = useDeleteProblem()

  useEffect(() => {
    setTitle(problem.title); setNote(problem.note ?? '')
    setStatus(problem.status); setProjectId(problem.projectId ?? '')
    setTagIds(new Set(problem.tags.map(t => t.id))); setDirty(false)
  }, [problem.id])

  const toggleTag = (id: string) => {
    setTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setDirty(true)
  }

  const save = () => {
    if (!title.trim()) return
    updateProblem.mutate(
      { id: problem.id, data: { title, note: note || undefined, status, projectId: projectId || undefined, tagIds: [...tagIds] } },
      { onSuccess: () => setDirty(false) }
    )
  }

  return (
    <FullScreenPanel title="Problem" onClose={onClose} accentColor={TYPE_COLOR.problem}>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <textarea value={title} autoFocus rows={2}
          onChange={e => { setTitle(e.target.value); setDirty(true) }}
          className="w-full bg-transparent border-none outline-none resize-none font-heading font-semibold text-xl leading-snug"
          style={{ color: '#1a1208', caretColor: TYPE_COLOR.problem }}
        />

        <div>
          {label('Notes')}
          <textarea value={note} rows={8}
            onChange={e => { setNote(e.target.value); setDirty(true) }}
            placeholder="Context, findings, ideas to solve..."
            className="w-full bg-white border rounded-2xl px-4 py-3 text-sm outline-none resize-none leading-relaxed"
            style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: TYPE_COLOR.problem }}
          />
        </div>

        <div>
          {label('Status')}
          <ProblemStatusPills value={status} onChange={s => { setStatus(s); setDirty(true) }} />
        </div>

        {projects.length > 0 && (
          <div>
            {label('Project')}
            <div className="flex flex-wrap gap-1.5">
              {[{ id: '', name: 'None', color: undefined }, ...projects].map(p => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setDirty(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border"
                  style={projectId === p.id
                    ? { background: (p.color || '#1a1208') + '20', color: p.color || '#1a1208', borderColor: (p.color || '#1a1208') + '50' }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  {p.color && <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            {label('Tags')}
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className="transition-all active:scale-95"
                  style={{ opacity: tagIds.has(tag.id) ? 1 : 0.4 }}>
                  <TagChip name={tag.name} color={tag.color} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#e8e0d4' }}>
          <button onClick={() => { if (confirm(`Delete "${problem.title}"?`)) { deleteProblem.mutate(problem.id); onClose() } }}
            className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#c0a090' }}>
            <Trash2 size={14} /> Delete
          </button>
          {dirty && (
            <button onClick={save} disabled={updateProblem.isPending}
              className="px-5 py-2 rounded-full text-sm font-semibold active:scale-95 disabled:opacity-50"
              style={{ background: TYPE_COLOR.problem, color: '#fff' }}>
              {updateProblem.isPending ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </FullScreenPanel>
  )
}
