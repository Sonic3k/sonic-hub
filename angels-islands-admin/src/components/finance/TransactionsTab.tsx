import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Plus, Search, Sparkles, ArrowLeftRight } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import { fmtDay, shiftMonth, utc, vnMonth, vnd } from '../../lib/money'
import type { FinTxn } from '../../types/finance'
import { AccountDot, Amount, TagPill, finKeys, isMainTag, useFinAccounts, useFinCategories, useFinFacets } from './shared'
import TxnModal from './TxnModal'

const PAGE = 60

/** Every transaction of a month, filterable; tap one to fix it. Waiting ones show their guess and a ✓. */
export default function TransactionsTab() {
  const qc = useQueryClient()
  const { data: accounts = [] } = useFinAccounts()
  const { data: categories = [] } = useFinCategories()
  const { data: facets = [] } = useFinFacets()
  const [month, setMonth] = useState(vnMonth())
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<FinTxn | 'new' | null>(null)
  const [msg, setMsg] = useState('')

  const query = { month: status === 'REVIEW' ? undefined : month, accountId: accountId || undefined, categoryId: categoryId || undefined,
    status: status || undefined, q: q.trim() || undefined, page, size: PAGE }
  const { data, isLoading } = useQuery({ queryKey: [...finKeys.txns, query], queryFn: () => financeApi.transactions(query) })
  const rows = data?.content ?? []

  const confirm = useMutation({ mutationFn: (id: string) => financeApi.confirm(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['fin'] }), onError: e => setMsg(apiError(e)) })
  const confirmAll = useMutation({
    mutationFn: financeApi.confirmAll,
    onSuccess: r => { setMsg(`${r.updated} confirmed`); qc.invalidateQueries({ queryKey: ['fin'] }) },
  })

  const byDay = useMemo(() => {
    const groups: { day: string; items: FinTxn[] }[] = []
    for (const t of rows) {
      const day = utc(t.occurredAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      const g = groups[groups.length - 1]
      if (g && g.day === day) g.items.push(t); else groups.push({ day, items: [t] })
    }
    return groups
  }, [rows])

  const totals = useMemo(() => {
    let out = 0, inn = 0
    for (const t of rows) { if (t.kind === 'TRANSFER' || t.amountVnd == null) continue; if (t.amountVnd < 0) out -= t.amountVnd; else inn += t.amountVnd }
    return { out, inn }
  }, [rows])

  const filterCls = 'px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full outline-none focus:border-pink-300'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'REVIEW' && (
          <div className="flex items-center rounded-full bg-white border border-slate-200">
            <button className="p-1.5 text-slate-400 hover:text-slate-700" onClick={() => { setMonth(shiftMonth(month, -1)); setPage(0) }}><ChevronLeft size={16} /></button>
            <span className="text-xs font-semibold text-slate-700 tabular-nums w-16 text-center">{month.slice(5)}/{month.slice(0, 4)}</span>
            <button className="p-1.5 text-slate-400 hover:text-slate-700" onClick={() => { setMonth(shiftMonth(month, 1)); setPage(0) }}><ChevronRight size={16} /></button>
          </div>
        )}
        <select className={filterCls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">All</option>
          <option value="REVIEW">Needs review</option>
          <option value="OK">Done</option>
        </select>
        <select className={filterCls} value={accountId} onChange={e => { setAccountId(e.target.value); setPage(0) }}>
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={filterCls} value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(0) }}>
          <option value="">All tags</option>
          <option value="none">Uncategorized</option>
          <optgroup label="Categories">
            {categories.filter(isMainTag).map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
          </optgroup>
          {facets.filter(f => !f.main && !f.archived).sort((a, b) => a.sortOrder - b.sortOrder).map(f => (
            <optgroup key={f.id} label={f.name}>
              {categories.filter(c => c.facetId === f.id && !isMainTag(c)).map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-400 focus-within:border-pink-300">
          <Search size={13} />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder="Search" className="outline-none w-24 md:w-36 text-slate-700" />
        </label>
        <div className="ml-auto flex gap-2">
          {status === 'REVIEW' && rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => confirmAll.mutate()}><Check size={14} />Confirm all guesses</Button>
          )}
          <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} />Add</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span>{data?.totalElements ?? 0} transactions</span>
        <span>Out <b className="text-rose-600 tabular-nums">{vnd(totals.out)}</b></span>
        <span>In <b className="text-emerald-600 tabular-nums">{vnd(totals.inn)}</b></span>
        <span className="text-slate-400">(this page, transfers left out)</span>
        {msg && <span className="text-pink-600">{msg}</span>}
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">Nothing here.</div>
      ) : (
        <div className="space-y-4">
          {byDay.map(g => (
            <div key={g.day}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">{fmtDay(g.items[0].occurredAt)}</p>
              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                {g.items.map(t => {
                  const acc = accounts.find(a => a.id === t.accountId)
                  return (
                    <div key={t.id} onClick={() => setEditing(t)}
                      className={clsx('flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70 active:bg-slate-50', t.status === 'REVIEW' && 'bg-amber-50/40')}>
                      <span className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-base shrink-0">
                        {t.kind === 'TRANSFER' ? <ArrowLeftRight size={15} className="text-slate-400" /> : t.categoryIcon || '❔'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 truncate">{t.description || t.bankDescription || '—'}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                          <AccountDot account={acc} />{t.accountName}
                          {t.counterparty && t.kind !== 'TRANSFER' && <span className="truncate max-w-[14rem]">{t.amount < 0 ? '→' : '←'} {t.counterparty}</span>}
                          <span>·</span>
                          {t.kind === 'TRANSFER' ? <span>↔ {t.transferAccountName ?? 'own account'}</span>
                            : t.categoryName ? <span className={clsx(t.status === 'REVIEW' && 'text-amber-600')}>{t.categoryName}{t.status === 'REVIEW' && '?'}</span>
                            : <span className="text-amber-600">needs a category</span>}
                          {t.categorizedBy === 'AI' && <Sparkles size={11} className="text-violet-500" />}
                          <span>· {utc(t.occurredAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</span>
                          {t.note && <span className="italic truncate max-w-[12rem]">“{t.note}”</span>}
                        </p>
                        {(t.tags ?? []).some(x => x.id !== t.categoryId) && (
                          <div className="flex flex-wrap gap-1 mt-1">{(t.tags ?? []).filter(x => x.id !== t.categoryId).map(x => <TagPill key={x.id} tag={x} />)}</div>
                        )}
                      </div>
                      <Amount t={t} className="text-sm" />
                      {t.status === 'REVIEW' && (t.categoryId || t.kind === 'TRANSFER') && (
                        <button title="The guess is right" onClick={e => { e.stopPropagation(); confirm.mutate(t.id) }}
                          className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 shrink-0">
                          <Check size={15} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} />Newer</Button>
              <span>{page + 1} / {data?.totalPages}</span>
              <Button size="sm" variant="ghost" disabled={!!data?.last} onClick={() => setPage(p => p + 1)}>Older<ChevronRight size={14} /></Button>
            </div>
          )}
        </div>
      )}

      {editing && <TxnModal txn={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
