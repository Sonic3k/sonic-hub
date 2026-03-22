import { Trash2 } from 'lucide-react'
import StickerBase, { stickerColor, stickerRotation } from './StickerBase'
import { useDeleteProblem } from '../../hooks/useBoard'
import { PROBLEM_STATUS_LABELS } from '../../types'
import type { Problem } from '../../types'

interface Props { problem: Problem; index: number }

const STATUS_BG: Record<string, string> = {
  NEW: '#f0e8dc', INVESTIGATING: '#f0e4d8', RESOLVED: '#dce8dc', DISMISSED: '#e8e4e0',
}

export default function ProblemSticker({ problem, index }: Props) {
  const remove = useDeleteProblem()
  const isDismissed = problem.status === 'DISMISSED' || problem.status === 'RESOLVED'

  return (
    <div className="mb-3 group">
      <StickerBase
        color={stickerColor(index + 4)}
        rotation={stickerRotation(index + 3)}
        faded={isDismissed}
      >
        <div className="px-3 pt-2 pb-4 relative z-[1]">
          {/* Problem label */}
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9a6050] mb-1 block">
            Problem
          </span>

          <p className="text-[13px] font-medium leading-snug text-[#2a1e10] pr-4">
            {problem.title}
          </p>

          {problem.note && (
            <p className="font-hand text-[12px] text-[#7a6040] mt-1 leading-snug line-clamp-3">
              {problem.note}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: STATUS_BG[problem.status] || '#f0e8dc', color: '#6b4c2a' }}>
              {PROBLEM_STATUS_LABELS[problem.status]}
            </span>
            {problem.tags.map(tag => (
              <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: tag.color + '22', color: tag.color }}>
                {tag.name}
              </span>
            ))}
          </div>

          <button
            onClick={e => { e.stopPropagation(); if (confirm('Delete this problem?')) remove.mutate(problem.id) }}
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-[#9a8070] hover:text-[#8b3a2a] transition-all">
            <Trash2 size={11} />
          </button>
        </div>
      </StickerBase>
    </div>
  )
}
