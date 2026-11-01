/* What every memory screen shares: the kinds of memory, the status badge, how a memory's date reads. */
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { eventLabel } from '../EventDateEditor'
import type { EpisodeResponse, FactResponse, MemoryStatus } from '../../types'

/** The kinds an episode can be; free text on the API, these are the ones in use. */
export const EPISODE_KINDS: { value: string; label: string }[] = [
  { value: 'MOMENT', label: 'Moment' }, { value: 'MILESTONE', label: 'Milestone' }, { value: 'TRIP', label: 'Trip' },
  { value: 'CREATION', label: 'Creation' }, { value: 'KEEPSAKE', label: 'Keepsake' }, { value: 'DOCUMENT', label: 'Document' },
  { value: 'PLACE', label: 'Place' },
]
export const kindLabel = (k?: string | null) => (k ? EPISODE_KINDS.find(x => x.value === k)?.label ?? k : '')

export function StatusBadge({ status }: { status?: MemoryStatus | null }) {
  if (!status) return null
  return (
    <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded',
      status === 'DRAFT' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
      {status === 'DRAFT' ? 'Draft' : 'Confirmed'}
    </span>
  )
}

/** The small "mark as checked" action on a draft row. */
export function ConfirmButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }} title="Mark as confirmed"
      className="p-1 text-slate-300 hover:text-emerald-500 rounded transition-colors"><Check size={13} /></button>
  )
}

/** "Hè 1998", "1995", "08/1995", "15/07/2005 → 20/07/2005": the date as far as it is known, and the end of a memory that lasted. */
export function episodeWhen(e: EpisodeResponse): string {
  if (!e.occurredAt) return ''
  const w = eventLabel({ date: e.occurredAt, precision: e.precision ?? 'DAY', approx: !!e.approx })
  if (!e.endAt || e.endAt.slice(0, 10) === e.occurredAt.slice(0, 10)) return w
  return `${w} → ${eventLabel({ date: e.endAt, precision: 'DAY' })}`
}

/** Facts by category: scores first, the intimate ones last, the rest in the order they first appear. */
const FACT_FIRST = ['Điểm (Claude chấm)'], FACT_LAST = ['Tình dục & thân mật']
export function groupFacts(facts: FactResponse[]): [string, FactResponse[]][] {
  const m = new Map<string, FactResponse[]>()
  for (const f of facts) { const c = f.category || 'basic'; if (!m.has(c)) m.set(c, []); m.get(c)!.push(f) }
  const rank = (c: string) => FACT_FIRST.includes(c) ? 0 : FACT_LAST.includes(c) ? 2 : 1
  return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
}

/** Draft / Confirmed as two buttons, for the edit forms. */
export function StatusSwitch({ value, onChange }: { value?: MemoryStatus | null; onChange: (s: MemoryStatus) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {(['DRAFT', 'CONFIRMED'] as MemoryStatus[]).map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={clsx('px-3 py-1.5 text-xs rounded-md transition-colors',
              value === s ? 'bg-white shadow-sm font-medium ' + (s === 'DRAFT' ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-500 hover:text-slate-700')}>
            {s === 'DRAFT' ? 'Draft' : 'Confirmed'}
          </button>
        ))}
      </div>
    </div>
  )
}
