import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { financeApi } from '../../api/finance'
import { money } from '../../lib/money'
import type { FinAccount, FinCategory, FinTxn } from '../../types/finance'

export const finKeys = {
  accounts: ['fin', 'accounts'] as const,
  categories: ['fin', 'categories'] as const,
  rules: ['fin', 'rules'] as const,
  settings: ['fin', 'settings'] as const,
  txns: ['fin', 'txns'] as const,
  inbound: ['fin', 'inbound'] as const,
}

export const useFinAccounts = () => useQuery({ queryKey: finKeys.accounts, queryFn: financeApi.accounts })
export const useFinCategories = () => useQuery({ queryKey: finKeys.categories, queryFn: financeApi.categories })

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
