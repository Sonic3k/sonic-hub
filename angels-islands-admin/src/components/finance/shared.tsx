import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { financeApi } from '../../api/finance'
import { money } from '../../lib/money'
import type { FinAccount, FinCategory, FinFacet, FinTagRef, FinTxn } from '../../types/finance'

export const finKeys = {
  accounts: ['fin', 'accounts'] as const,
  facets: ['fin', 'facets'] as const,
  categories: ['fin', 'categories'] as const,
  rules: ['fin', 'rules'] as const,
  settings: ['fin', 'settings'] as const,
  txns: ['fin', 'txns'] as const,
  inbound: ['fin', 'inbound'] as const,
}

export const useFinAccounts = () => useQuery({ queryKey: finKeys.accounts, queryFn: financeApi.accounts })
export const useFinCategories = () => useQuery({ queryKey: finKeys.categories, queryFn: financeApi.categories })
export const useFinFacets = () => useQuery({ queryKey: finKeys.facets, queryFn: financeApi.facets })

/** Is this tag one of the main facet's — a category? */
export const isMainTag = (c: Pick<FinCategory, 'kind'>) => c.kind !== 'ANY'

/**
 * Tags as toggle chips, facet by facet (the main facet's categories too with includeMain). `selected` is the chosen
 * ids; `exclude` leaves one tag out (a tag cannot bring itself along).
 */
export function TagPicker({ facets, categories, selected, onChange, includeMain, exclude }: {
  facets: FinFacet[]; categories: FinCategory[]; selected: string[]; onChange: (ids: string[]) => void
  includeMain?: boolean; exclude?: string
}) {
  const live = facets.filter(f => !f.archived && (includeMain || !f.main)).sort((a, b) => a.sortOrder - b.sortOrder)
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  return (
    <div className="space-y-2.5">
      {live.map(f => {
        const tags = categories.filter(c => c.id !== exclude && (!c.archived || selected.includes(c.id))
          && (f.main ? isMainTag(c) : c.facetId === f.id && !isMainTag(c)))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        if (!tags.length) return null
        return (
          <div key={f.id}>
            <p className="text-[11px] font-medium text-slate-400 mb-1">{f.icon ? `${f.icon} ` : ''}{f.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(c => (
                <button key={c.id} type="button" onClick={() => toggle(c.id)}
                  className={clsx('px-2.5 py-1 rounded-full text-xs border transition-colors',
                    selected.includes(c.id) ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** A tag on a row: a small pill; dashed when another tag brought it along. */
export function TagPill({ tag }: { tag: FinTagRef }) {
  return (
    <span className={clsx('inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[11px] leading-4',
      tag.by === 'IMPLIED' ? 'border border-dashed border-slate-200 text-slate-400' : tag.main ? 'bg-pink-50 text-pink-700' : 'bg-slate-100 text-slate-600')}>
      {tag.icon && <span>{tag.icon}</span>}{tag.name}
    </span>
  )
}

const GROUP_LABEL: Record<string, string> = { FLEXIBLE: 'Flexible', FIXED: 'Fixed', SAVING: 'Saving' }

/** Categories grouped the way people think of them: spending by budget group, then income. */
export function CategoryOptions({ categories, kind }: { categories: FinCategory[]; kind?: 'EXPENSE' | 'INCOME' }) {
  const live = categories.filter(c => !c.archived)
  const groups: [string, FinCategory[]][] = []
  if (kind !== 'INCOME') for (const g of ['FLEXIBLE', 'FIXED', 'SAVING'])
    groups.push([`Spending · ${GROUP_LABEL[g]}`, live.filter(c => c.kind === 'EXPENSE' && c.budgetGroup === g)])
  if (kind !== 'EXPENSE') groups.push(['Income', live.filter(c => c.kind === 'INCOME')])
  return (
    <>
      {groups.filter(([, cs]) => cs.length).map(([label, cs]) => (
        <optgroup key={label} label={label}>
          {cs.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
        </optgroup>
      ))}
    </>
  )
}

export function AccountDot({ account, size = 8 }: { account?: Pick<FinAccount, 'color'> | null; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: account?.color || '#94a3b8' }} />
}

export function Amount({ t, className }: { t: FinTxn; className?: string }) {
  const tone = t.kind === 'TRANSFER' ? 'text-slate-400' : t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
  return <span className={clsx('font-semibold tabular-nums whitespace-nowrap', tone, className)}>{money(t.amount, t.currency, true)}</span>
}

export const STATUS_TONE: Record<string, string> = {
  SAVED: 'bg-emerald-50 text-emerald-600', DUPLICATE: 'bg-slate-100 text-slate-500', IGNORED: 'bg-amber-50 text-amber-600',
  FAILED: 'bg-rose-50 text-rose-600', NEW: 'bg-blue-50 text-blue-600',
}

export const MODE_TONE: Record<string, string> = {
  FEED: 'bg-violet-50 text-violet-600', RECONCILE: 'bg-sky-50 text-sky-600', POOL: 'bg-lime-50 text-lime-700',
}
