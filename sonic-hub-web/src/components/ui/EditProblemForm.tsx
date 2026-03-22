import { useState } from 'react'
import EditModal from './EditModal'
import { useTags, useProjects } from '../../hooks/useBoard'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { problemsApi } from '../../api'
import { PROBLEM_STATUS_LABELS } from '../../types'
import type { Problem, ProblemStatus } from '../../types'

const STATUSES: ProblemStatus[] = ['NEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']

interface Props { problem: Problem; onClose: () => void }

const field = "w-full bg-black/5 rounded px-3 py-2 text-sm outline-none border border-transparent focus:border-[#b8905a] transition-colors text-[#2a1e10] placeholder:text-[#b0997a]"
const label = "block text-[10px] font-semibold uppercase tracking-wider mb-1"

export default function EditProblemForm({ problem, onClose }: Props) {
  const [title, setTitle] = useState(problem.title)
  const [note, setNote] = useState(problem.note ?? '')
  const [status, setStatus] = useState<ProblemStatus>(problem.status)
  const [projectId, setProjectId] = useState(problem.projectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(problem.tags.map(t => t.id)))

  const { data: tags = [] } = useTags()
  const { data: projects = [] } = useProjects()

  const qc = useQueryClient()
  const updateProblem = useMutation({
    mutationFn: (data: Parameters<typeof problemsApi.update>[1]) =>
      problemsApi.update(problem.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); onClose() },
  })

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    updateProblem.mutate({
      title: title.trim(),
      note: note || undefined,
      status,
      projectId: projectId || undefined,
      tagIds: [...selectedTagIds],
    })
  }

  return (
    <EditModal title="Edit Problem" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={label} style={{ color: '#9a8a70' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={field}
            placeholder="Problem title..." autoFocus required />
        </div>

        <div>
          <label className={label} style={{ color: '#9a8a70' }}>Notes</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            className={`${field} resize-none font-hand text-[13px]`}
            placeholder="Context, ideas, findings..." />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as ProblemStatus)} className={field}>
              {STATUSES.map(s => <option key={s} value={s}>{PROBLEM_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          {projects.length > 0 && (
            <div>
              <label className={label} style={{ color: '#9a8a70' }}>Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={field}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all"
                  style={selectedTagIds.has(tag.id)
                    ? { background: tag.color + '22', borderColor: tag.color, color: tag.color }
                    : { borderColor: 'rgba(0,0,0,.15)', color: '#9a8a70' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'rgba(0,0,0,.07)', color: '#6b5c44' }}>
            Cancel
          </button>
          <button type="submit" disabled={updateProblem.isPending || !title.trim()}
            className="px-4 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {updateProblem.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
