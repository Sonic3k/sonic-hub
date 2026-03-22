import { useState, useRef, useEffect } from 'react'
import EditModal from './EditModal'
import { useTags, useProjects } from '../../hooks/useBoard'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { problemsApi } from '../../api'
import { PROBLEM_STATUS_LABELS } from '../../types'
import type { Problem, ProblemStatus } from '../../types'

const STATUSES: ProblemStatus[] = ['NEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']

interface Props { problem: Problem; onClose: () => void }

export default function EditProblemForm({ problem, onClose }: Props) {
  const [title, setTitle] = useState(problem.title)
  const [note, setNote] = useState(problem.note ?? '')
  const [status, setStatus] = useState<ProblemStatus>(problem.status)
  const [projectId, setProjectId] = useState(problem.projectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(problem.tags.map(t => t.id)))

  const titleRef = useRef<HTMLInputElement>(null)
  const { data: tags = [] } = useTags()
  const { data: projects = [] } = useProjects()

  useEffect(() => { titleRef.current?.focus() }, [])

  const qc = useQueryClient()
  const updateProblem = useMutation({
    mutationFn: (data: Parameters<typeof problemsApi.update>[1]) => problemsApi.update(problem.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); onClose() },
  })

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    updateProblem.mutate({ title: title.trim(), note: note || undefined, status, projectId: projectId || undefined, tagIds: [...selectedTagIds] })
  }

  return (
    <EditModal onClose={onClose} ruleColor="#c07860">
      <form onSubmit={handleSubmit}>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9a6050' }}>Problem</div>

        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the problem?"
          className="w-full bg-transparent border-none outline-none text-[17px] font-semibold text-[#2a1e10] placeholder:text-[#c0aa88] mb-3"
          required
        />

        {/* Notes — large handwritten area */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Context, findings, ideas to solve..."
          rows={7}
          className="w-full bg-transparent border-none outline-none resize-none placeholder:text-[#c0aa88]"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '16px', lineHeight: '32px', color: '#5a3e28' }}
        />

        <div className="border-t border-black/8 mt-1 pt-3 space-y-3">
          {/* Status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={status === s
                  ? { background: '#2c2010', color: '#faf5eb' }
                  : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                {PROBLEM_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#9a8a70] w-14">Project</span>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setProjectId('')}
                  className="px-2 py-1 rounded text-[11px] transition-all"
                  style={projectId === '' ? { background: '#2c2010', color: '#faf5eb' } : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                  None
                </button>
                {projects.map(p => (
                  <button key={p.id} type="button" onClick={() => setProjectId(p.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all"
                    style={projectId === p.id
                      ? { background: (p.color || '#6366f1') + '33', color: p.color || '#6366f1', fontWeight: 600 }
                      : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#9a8a70] w-14">Tags</span>
              <div className="flex gap-1.5 flex-wrap">
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all"
                    style={selectedTagIds.has(tag.id)
                      ? { background: tag.color + '30', color: tag.color, fontWeight: 600 }
                      : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-black/8">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-[12px]" style={{ color: '#9a8a70' }}>
            Cancel
          </button>
          <button type="submit" disabled={updateProblem.isPending || !title.trim()}
            className="px-5 py-1.5 rounded text-[12px] font-medium disabled:opacity-50"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {updateProblem.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
