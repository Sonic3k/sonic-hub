import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Textarea, Select, Modal } from '../components/ui'
import { useProblems, useCreateProblem, useUpdateProblem, useDeleteProblem } from '../hooks/useProblems'
import { useProjects } from '../hooks/useProjects'
import { useTags } from '../hooks/useTags'
import {
  type Problem, type ProblemRequest, type ProblemStatus,
  PROBLEM_STATUS_LABELS, PROBLEM_STATUS_COLORS,
} from '../types'

const STATUSES: ProblemStatus[] = ['NEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']

function ProblemForm({ problem, onSubmit, onClose, isLoading }: {
  problem?: Problem
  onSubmit: (data: ProblemRequest) => void
  onClose: () => void
  isLoading?: boolean
}) {
  const { data: projects = [] } = useProjects()
  const { data: tags = [] } = useTags()
  const [title, setTitle] = useState(problem?.title ?? '')
  const [note, setNote] = useState(problem?.note ?? '')
  const [status, setStatus] = useState<ProblemStatus>(problem?.status ?? 'NEW')
  const [projectId, setProjectId] = useState(problem?.projectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(problem?.tags.map(t => t.id) ?? [])
  )

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      note: note || undefined,
      status,
      projectId: projectId || undefined,
      tagIds: [...selectedTagIds],
    })
  }

  return (
    <Modal title={problem ? 'Edit Problem' : 'Log Problem'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What's the problem?" autoFocus required />
        <Textarea label="Notes" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Describe the problem, context, ideas..." rows={4} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value as ProblemStatus)}>
            {STATUSES.map(s => <option key={s} value={s}>{PROBLEM_STATUS_LABELS[s]}</option>)}
          </Select>
          <Select label="Project" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {tags.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all"
                  style={selectedTagIds.has(tag.id)
                    ? { background: tag.color + '22', borderColor: tag.color, color: tag.color }
                    : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color || '#94a3b8' }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading || !title.trim()}>
            {isLoading ? 'Saving...' : problem ? 'Save Changes' : 'Log Problem'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ProblemsPage() {
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | undefined>(undefined)
  const { data: problems = [], isLoading } = useProblems(statusFilter)
  const createProblem = useCreateProblem()
  const deleteProblem = useDeleteProblem()
  const [showCreate, setShowCreate] = useState(false)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const updateProblem = useUpdateProblem(editingProblem?.id ?? '')

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Problems</h1>
          <p className="text-sm text-slate-400 mt-0.5">{problems.length} logged</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={14} />Log Problem</Button>
      </div>

      <div className="flex gap-1.5 mb-6 flex-wrap">
        {([undefined, ...STATUSES] as (ProblemStatus | undefined)[]).map(s => (
          <button key={s ?? 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            {s ? PROBLEM_STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-lg border border-slate-100 animate-pulse" />
        ))}</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No problems logged</p>
        </div>
      ) : (
        <div className="space-y-2">
          {problems.map(problem => (
            <div key={problem.id}
              className="group bg-white rounded-lg border border-slate-100 hover:border-slate-200 px-4 py-3 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">{problem.title}</span>
                  {problem.note && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{problem.note}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${PROBLEM_STATUS_COLORS[problem.status]}`}>
                      {PROBLEM_STATUS_LABELS[problem.status]}
                    </span>
                    {problem.projectName && (
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                        {problem.projectName}
                      </span>
                    )}
                    {problem.tags.map(tag => (
                      <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: tag.color + '18', color: tag.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => setEditingProblem(problem)}>
                    <Pencil size={12} />
                  </Button>
                  <Button variant="danger" size="sm"
                    onClick={() => { if (confirm(`Delete "${problem.title}"?`)) deleteProblem.mutate(problem.id) }}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ProblemForm
          onSubmit={data => createProblem.mutate(data, { onSuccess: () => setShowCreate(false) })}
          onClose={() => setShowCreate(false)}
          isLoading={createProblem.isPending}
        />
      )}
      {editingProblem && (
        <ProblemForm
          problem={editingProblem}
          onSubmit={data => updateProblem.mutate(data, { onSuccess: () => setEditingProblem(null) })}
          onClose={() => setEditingProblem(null)}
          isLoading={updateProblem.isPending}
        />
      )}
    </div>
  )
}
