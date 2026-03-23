import { type ReactNode } from 'react'
import clsx from 'clsx'

export type CardType = 'task' | 'todo' | 'problem' | 'project'

export const TYPE_COLOR: Record<CardType, string> = {
  task:    '#c17f3e',
  todo:    '#7a9a6a',
  problem: '#b06070',
  project: '#6b8fc0',
}

interface Props {
  type: CardType
  expanded?: boolean
  faded?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function Card({ type, expanded, faded, onClick, children, className, style }: Props) {
  const accent = TYPE_COLOR[type]
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer',
        'hover:shadow-md active:scale-[0.985]',
        expanded ? 'shadow-md' : 'shadow-sm',
        faded && 'opacity-50',
        className
      )}
      style={{
        background: '#faf8f5',
        borderColor: expanded ? accent + '60' : '#e8e0d4',
        borderLeftWidth: 3,
        borderLeftColor: accent,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Shared chip component ───────────────────────────────────────────────────
export function Chip({ label, bg, color, onClick }: {
  label: string
  bg: string
  color: string
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none',
        onClick && 'cursor-pointer active:scale-95 transition-transform'
      )}
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

// ── Tag dot chip ────────────────────────────────────────────────────────────
export function TagChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: color + '18', color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {name}
    </span>
  )
}

// ── Status pill row ─────────────────────────────────────────────────────────
import { STATUS_LABEL, STATUS_COLOR, PROBLEM_STATUS_LABEL, PROBLEM_STATUS_COLOR } from '../../types'
import type { TaskStatus, ProblemStatus } from '../../types'

export function StatusPills({ value, options, onChange }: {
  value: TaskStatus
  options: TaskStatus[]
  onChange: (s: TaskStatus) => void
}) {
  return (
    <div className="flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
      {options.map(s => (
        <button key={s} onClick={() => onChange(s)}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 border"
          style={value === s
            ? { background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].text, borderColor: 'transparent' }
            : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

export function ProblemStatusPills({ value, onChange }: {
  value: ProblemStatus
  onChange: (s: ProblemStatus) => void
}) {
  const options: ProblemStatus[] = ['NEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']
  return (
    <div className="flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
      {options.map(s => (
        <button key={s} onClick={() => onChange(s)}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 border"
          style={value === s
            ? { background: PROBLEM_STATUS_COLOR[s].bg, color: PROBLEM_STATUS_COLOR[s].text, borderColor: 'transparent' }
            : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
          {PROBLEM_STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
