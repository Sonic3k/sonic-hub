import { type ReactNode } from 'react'
import clsx from 'clsx'
import { STATUS_LABEL, PROBLEM_STATUS_LABEL } from '../../types'
import type { TaskStatus, ProblemStatus } from '../../types'

export type CardType = 'task' | 'todo' | 'problem' | 'project'

export const TYPE_COLOR: Record<CardType, string> = {
  task:    '#c17f3e',
  todo:    '#7a9a6a',
  problem: '#b06070',
  project: '#6b8fc0',
}

export const TYPE_BG: Record<CardType, string> = {
  task:    '#fef0e0',
  todo:    '#ebf4e7',
  problem: '#fae8ec',
  project: '#e8eff9',
}

export const TYPE_CHIP_BG: Record<CardType, string> = {
  task:    'rgba(193,127,62,.18)',
  todo:    'rgba(122,154,106,.18)',
  problem: 'rgba(176,96,112,.18)',
  project: 'rgba(107,143,192,.18)',
}

interface Props {
  type: CardType
  expanded?: boolean
  faded?: boolean
  onClick?: () => void
  children: ReactNode
}

export default function Card({ type, expanded, faded, onClick, children }: Props) {
  const col = TYPE_COLOR[type]
  const bg  = TYPE_BG[type]
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl cursor-pointer select-none',
        faded && 'opacity-40',
        !expanded && 'transition-all duration-200 hover:-translate-y-1 hover:rotate-[0.4deg] active:scale-[0.97]',
        expanded && 'transition-shadow duration-200'
      )}
      style={{
        background: bg,
        boxShadow: expanded
          ? `0 8px 30px ${col}28, 0 2px 8px ${col}18`
          : `0 2px 12px ${col}20, 0 1px 3px ${col}12`,
      }}
    >
      {children}
    </div>
  )
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

export function TagChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: color + '22', color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {name}
    </span>
  )
}

export function StatusPills({ value, options, color, chipBg, onChange }: {
  value: TaskStatus
  options: TaskStatus[]
  color: string
  chipBg: string
  onChange: (s: TaskStatus) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
      {options.map(s => (
        <button key={s} onClick={() => onChange(s)}
          className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95"
          style={value === s
            ? { background: chipBg, color, fontWeight: 700 }
            : { background: 'transparent', color: color + '60', border: `1px solid ${color}30` }}>
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

export function ProblemStatusPills({ value, color, chipBg, onChange }: {
  value: ProblemStatus
  color: string
  chipBg: string
  onChange: (s: ProblemStatus) => void
}) {
  const options: ProblemStatus[] = ['NEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']
  return (
    <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
      {options.map(s => (
        <button key={s} onClick={() => onChange(s)}
          className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95"
          style={value === s
            ? { background: chipBg, color, fontWeight: 700 }
            : { background: 'transparent', color: color + '60', border: `1px solid ${color}30` }}>
          {PROBLEM_STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
