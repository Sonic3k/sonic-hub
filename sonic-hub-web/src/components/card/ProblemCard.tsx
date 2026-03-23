import { useState } from 'react'
import { Expand } from 'lucide-react'
import Card, { TagChip, ProblemStatusPills, TYPE_COLOR } from './Card'
import { useUpdateProblem, useDeleteProblem } from '../../hooks'
import { PROBLEM_STATUS_LABEL, PROBLEM_STATUS_COLOR } from '../../types'
import type { Problem, ProblemStatus } from '../../types'

interface Props {
  problem: Problem
  onFullScreen: (problem: Problem) => void
}

export default function ProblemCard({ problem, onFullScreen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle]       = useState(problem.title)
  const [note, setNote]         = useState(problem.note ?? '')
  const [status, setStatus]     = useState<ProblemStatus>(problem.status)
  const [dirty, setDirty]       = useState(false)

  const updateProblem = useUpdateProblem()
  const deleteProblem = useDeleteProblem()
  const isResolved    = status === 'RESOLVED' || status === 'DISMISSED'

  const save = () => {
    if (!title.trim()) return
    updateProblem.mutate(
      { id: problem.id, data: { title: title.trim(), note: note || undefined, status, tagIds: problem.tags.map(t => t.id) } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  return (
    <Card type="problem" expanded={expanded} faded={isResolved}
      onClick={() => !expanded && setExpanded(true)}>
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          {/* Status dot */}
          <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: PROBLEM_STATUS_COLOR[status].text }} />

          {expanded ? (
            <textarea
              value={title} autoFocus rows={2}
              onClick={e => e.stopPropagation()}
              onChange={e => { setTitle(e.target.value); setDirty(true) }}
              className="flex-1 bg-transparent outline-none resize-none font-heading font-semibold text-sm leading-snug border-none"
              style={{ color: '#1a1208', caretColor: TYPE_COLOR.problem }}
            />
          ) : (
            <p className="flex-1 font-heading font-semibold text-sm leading-snug" style={{ color: '#1a1208' }}>
              {problem.title}
            </p>
          )}

          {expanded && (
            <button onClick={e => { e.stopPropagation(); onFullScreen(problem) }}
              className="p-1 rounded-lg flex-shrink-0 transition-colors hover:bg-black/5"
              style={{ color: TYPE_COLOR.problem }}>
              <Expand size={13} />
            </button>
          )}
        </div>

        {/* Note preview / textarea */}
        {!expanded && problem.note && (
          <p className="text-xs leading-relaxed mb-2 ml-4 line-clamp-2" style={{ color: '#9a8a7a' }}>
            {problem.note}
          </p>
        )}
        {expanded && (
          <div className="ml-4 mb-3" onClick={e => e.stopPropagation()}>
            <textarea
              value={note}
              onChange={e => { setNote(e.target.value); setDirty(true) }}
              rows={5}
              placeholder="Context, findings, ideas..."
              className="w-full bg-white border rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
              style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: TYPE_COLOR.problem }}
            />
          </div>
        )}

        {expanded && (
          <div className="ml-4 mb-3" onClick={e => e.stopPropagation()}>
            <ProblemStatusPills value={status} onChange={s => { setStatus(s); setDirty(true) }} />
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap ml-4">
          {!expanded && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: PROBLEM_STATUS_COLOR[status].bg, color: PROBLEM_STATUS_COLOR[status].text }}>
              {PROBLEM_STATUS_LABEL[status]}
            </span>
          )}
          {problem.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>

        {expanded && dirty && (
          <div className="flex justify-end gap-2 mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setExpanded(false); setDirty(false); setTitle(problem.title); setNote(problem.note ?? ''); setStatus(problem.status) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: '#e8e0d4', color: '#9a8a7a' }}>
              Discard
            </button>
            <button onClick={save} disabled={updateProblem.isPending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold active:scale-95 disabled:opacity-50"
              style={{ background: TYPE_COLOR.problem, color: '#fff' }}>
              {updateProblem.isPending ? '...' : 'Save'}
            </button>
          </div>
        )}
        {expanded && !dirty && (
          <div className="flex justify-between items-center mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${problem.title}"?`)) deleteProblem.mutate(problem.id) }}
              className="text-xs font-medium" style={{ color: '#c0a090' }}>
              Delete
            </button>
            <button onClick={() => setExpanded(false)} className="text-xs font-medium" style={{ color: '#9a8a7a' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
