import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useUpdateProblem, useDeleteProblem, useTags, useProjects } from '../../hooks'
import { PROBLEM_STATUS_LABEL, PROBLEM_STATUS_COLOR } from '../../types'
import type { Problem, ProblemStatus } from '../../types'

const STATUSES: ProblemStatus[] = ['NEW','INVESTIGATING','RESOLVED','DISMISSED']

interface Props { problem: Problem; onClose: () => void }

export default function ProblemPanel({ problem, onClose }: Props) {
  const [title, setTitle]       = useState(problem.title)
  const [note, setNote]         = useState(problem.note ?? '')
  const [status, setStatus]     = useState<ProblemStatus>(problem.status)
  const [projectId, setProjectId] = useState(problem.projectId ?? '')
  const [tagIds, setTagIds]     = useState<Set<string>>(new Set(problem.tags.map(t => t.id)))
  const [dirty, setDirty]       = useState(false)

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
    updateProblem.mutate({
      id: problem.id,
      data: { title, note: note || undefined, status, projectId: projectId || undefined, tagIds: [...tagIds] },
    }, { onSuccess: () => setDirty(false) })
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${problem.title}"?`)) return
    deleteProblem.mutate(problem.id, { onSuccess: onClose })
  }

  return (
    <div className="h-full flex flex-col border-l overflow-y-auto" style={{ width: 360, background: '#faf8f5', borderColor: '#e8e0d4' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
        <span className="text-xs font-medium" style={{ color: '#9a8a7a' }}>Problem detail</span>
        <div className="flex items-center gap-1">
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#c0a090' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-black/5" style={{ color: '#9a8a7a' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">
        <textarea
          value={title}
          onChange={e => { setTitle(e.target.value); setDirty(true) }}
          autoFocus rows={2}
          placeholder="What's the problem?"
          className="w-full bg-transparent border-none outline-none resize-none text-[18px] font-semibold leading-snug"
          style={{ color: '#1a1208', caretColor: '#c17f3e', fontFamily: "'DM Sans', sans-serif" }}
        />

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9a8a7a' }}>Notes</label>
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setDirty(true) }}
            rows={8}
            placeholder="Context, findings, ideas to solve..."
            className="w-full bg-white rounded-lg border px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
            style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: '#c17f3e', fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Status</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => { setStatus(s); setDirty(true) }}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                style={status === s
                  ? { background: PROBLEM_STATUS_COLOR[s].bg, color: PROBLEM_STATUS_COLOR[s].text, borderColor: 'transparent' }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }
                }>
                {PROBLEM_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Project</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setProjectId(''); setDirty(true) }}
                className="px-2.5 py-1 rounded-lg text-xs transition-all border"
                style={projectId === ''
                  ? { background: '#1a1208', color: '#faf8f5', borderColor: 'transparent' }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                None
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setDirty(true) }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                  style={projectId === p.id
                    ? { background: (p.color || '#c17f3e') + '20', color: p.color || '#c17f3e', borderColor: (p.color || '#c17f3e') + '50', fontWeight: 600 }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#9a8a7a' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border"
                  style={tagIds.has(tag.id)
                    ? { background: tag.color + '20', color: tag.color, borderColor: tag.color + '50', fontWeight: 600 }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <div className="flex-shrink-0 px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#e8e0d4' }}>
          <span className="text-xs" style={{ color: '#9a8a7a' }}>Unsaved changes</span>
          <button onClick={save} disabled={updateProblem.isPending}
            className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: '#c17f3e', color: '#fff' }}>
            {updateProblem.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
