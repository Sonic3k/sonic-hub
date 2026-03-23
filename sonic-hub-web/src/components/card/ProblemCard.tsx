import { useState } from 'react'
import { Expand } from 'lucide-react'
import Card, { TagChip, ProblemStatusPills, TYPE_COLOR, TYPE_CHIP_BG } from './Card'
import { useUpdateProblem, useDeleteProblem } from '../../hooks'
import { PROBLEM_STATUS_LABEL } from '../../types'
import type { Problem, ProblemStatus } from '../../types'

interface Props { problem: Problem; onFullScreen: (p: Problem) => void }

export default function ProblemCard({ problem, onFullScreen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle]       = useState(problem.title)
  const [note, setNote]         = useState(problem.note ?? '')
  const [status, setStatus]     = useState<ProblemStatus>(problem.status)
  const [dirty, setDirty]       = useState(false)

  const update     = useUpdateProblem()
  const remove     = useDeleteProblem()
  const col        = TYPE_COLOR.problem
  const chipBg     = TYPE_CHIP_BG.problem
  const isResolved = status === 'RESOLVED' || status === 'DISMISSED'

  const save = () => {
    if (!title.trim()) return
    update.mutate(
      { id: problem.id, data: { title, note: note || undefined, status, tagIds: problem.tags.map(t => t.id) } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  return (
    <Card type="problem" expanded={expanded} faded={isResolved}
      onClick={() => !expanded && setExpanded(true)}>
      <div className="p-4 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: col }} />

          {expanded
            ? <textarea value={title} autoFocus rows={2}
                onClick={e => e.stopPropagation()}
                onChange={e => { setTitle(e.target.value); setDirty(true) }}
                className="flex-1 bg-transparent outline-none resize-none font-heading font-semibold text-[14px] leading-snug border-none"
                style={{ color: '#1a1208', caretColor: col }} />
            : <p className="flex-1 font-heading font-semibold text-[14px] leading-snug" style={{ color: '#1a1208' }}>
                {problem.title}
              </p>
          }

          {expanded && (
            <button onClick={e => { e.stopPropagation(); onFullScreen(problem) }}
              className="p-1 rounded-lg flex-shrink-0" style={{ color: col }}>
              <Expand size={13} />
            </button>
          )}
        </div>

        {!expanded && problem.note && (
          <p className="text-[12px] leading-relaxed mt-2 ml-5 italic line-clamp-2" style={{ color: col + 'bb' }}>
            {problem.note}
          </p>
        )}
        {expanded && (
          <div className="mt-2.5 ml-5" onClick={e => e.stopPropagation()}>
            <textarea value={note} rows={5}
              onChange={e => { setNote(e.target.value); setDirty(true) }}
              placeholder="Context, findings, ideas..."
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed border-none"
              style={{ background: 'rgba(255,255,255,.55)', color: '#3a2e20', caretColor: col }}
            />
          </div>
        )}
        {expanded && (
          <div className="mt-2.5 ml-5">
            <ProblemStatusPills value={status} color={col} chipBg={chipBg}
              onChange={s => { setStatus(s); setDirty(true) }} />
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap mt-2.5 ml-5">
          {!expanded && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: chipBg, color: col }}>
              {PROBLEM_STATUS_LABEL[status]}
            </span>
          )}
          {problem.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>

        {expanded && (
          <div className="flex items-center justify-between mt-3 ml-5" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${problem.title}"?`)) remove.mutate(problem.id) }}
              className="text-[12px] font-semibold" style={{ color: col + '80' }}>Delete</button>
            <div className="flex gap-2">
              <button onClick={() => { setExpanded(false); setDirty(false); setTitle(problem.title); setNote(problem.note ?? ''); setStatus(problem.status) }}
                className="text-[12px] font-semibold" style={{ color: col + '80' }}>Close</button>
              {dirty && (
                <button onClick={save} disabled={update.isPending}
                  className="px-4 py-1.5 rounded-full text-[12px] font-bold active:scale-95 disabled:opacity-50"
                  style={{ background: col, color: '#fff' }}>
                  {update.isPending ? '...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
