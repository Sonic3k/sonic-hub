import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Play, CalendarRange } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input, Modal, Select } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import type { FinRule, RuleDirection } from '../../types/finance'
import { CategoryOptions, TagPill, TagPicker, finKeys, isMainTag, useFinAccounts, useFinCategories, useFinFacets } from './shared'

const DIR_LABEL: Record<RuleDirection, string> = { ANY: 'in & out', IN: 'money in', OUT: 'money out' }

const day = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`

/**
 * Words, a counterparty or a span of days → tags (or → one of my accounts). Tried in priority order; for each facet
 * the first rule that has tags there decides it.
 */
export default function RulesTab() {
  const qc = useQueryClient()
  const { data: rules = [] } = useQuery({ queryKey: finKeys.rules, queryFn: financeApi.rules })
  const [editing, setEditing] = useState<FinRule | 'new' | null>(null)
  const [msg, setMsg] = useState('')
  const apply = useMutation({
    mutationFn: financeApi.applyRules,
    onSuccess: r => { setMsg(`${r.updated} waiting transaction${r.updated === 1 ? '' : 's'} sorted`); qc.invalidateQueries({ queryKey: ['fin'] }) },
  })
  const toggle = useMutation({ mutationFn: (r: FinRule) => financeApi.updateRule(r.id, { active: !r.active }), onSuccess: () => qc.invalidateQueries({ queryKey: finKeys.rules }) })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500 mr-auto">Keywords are matched as whole words, accents and case ignored, in the memo and the bank line. Lower priority runs first; rules learned from a correction get 10, occasions 200. For each facet the first rule with tags there decides it.</p>
        {msg && <span className="text-xs text-pink-600">{msg}</span>}
        <Button size="sm" variant="ghost" onClick={() => apply.mutate()} disabled={apply.isPending}><Play size={14} />Run on waiting</Button>
        <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} />Add rule</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {rules.map(r => (
          <div key={r.id} className={clsx('flex items-center gap-3 px-4 py-3', !r.active && 'opacity-50')}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1">
                {(r.fromDate || r.toDate) && <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700"><CalendarRange size={11} />{r.fromDate ? day(r.fromDate) : '…'} – {r.toDate ? day(r.toDate) : '…'}</span>}
                {r.counterpartyName && <span className="text-[11px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-700">counterparty: {r.counterpartyName}</span>}
                {r.keywords.split('|').map(k => k.trim()).filter(Boolean).slice(0, 12).map(k => (
                  <span key={k} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{k}</span>
                ))}
                {r.keywords.split('|').length > 12 && <span className="text-[11px] text-slate-400">+{r.keywords.split('|').length - 12}</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1">
                <span>{DIR_LABEL[r.direction]} →</span>
                {r.transferAccountName
                  ? <span className="text-slate-700 font-medium">↔ {r.transferAccountName}</span>
                  : (r.tags ?? []).map(t => <TagPill key={t.id} tag={t} />)}
                {r.label && <span>· named “{r.label}”</span>}
                <span>· priority {r.priority} · {r.hits} hits · {r.origin === 'SEED' ? 'built-in' : 'mine'}</span>
              </p>
            </div>
            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer shrink-0">
              <input type="checkbox" className="accent-pink-500" checked={r.active} onChange={() => toggle.mutate(r)} />on
            </label>
            <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"><Pencil size={14} /></button>
          </div>
        ))}
      </div>
      {editing && <RuleModal rule={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function RuleModal({ rule, onClose }: { rule?: FinRule; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: categories = [] } = useFinCategories()
  const { data: facets = [] } = useFinFacets()
  const { data: accounts = [] } = useFinAccounts()
  const [keywords, setKeywords] = useState(rule?.keywords ?? '')
  const [label, setLabel] = useState(rule?.label ?? '')
  const byCounterparty = !!rule?.counterpartyName
  const [direction, setDirection] = useState<RuleDirection>(rule?.direction ?? 'OUT')
  const [target, setTarget] = useState<'category' | 'account'>(rule?.transferAccountId ? 'account' : 'category')
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '')
  /* the rule's other tags: everything it gives except the category picked above */
  const [tagIds, setTagIds] = useState<string[]>((rule?.tags ?? []).filter(t => t.id !== rule?.categoryId).map(t => t.id))
  const [fromDate, setFromDate] = useState(rule?.fromDate ?? '')
  const [toDate, setToDate] = useState(rule?.toDate ?? '')
  const [accountId, setAccountId] = useState(rule?.transferAccountId ?? '')
  const [priority, setPriority] = useState(rule ? String(rule.priority) : '')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const extra = tagIds.filter(id => { const c = categories.find(x => x.id === id); return c && !isMainTag(c) })
  /* a second category the rule gives (set from the Tiền page) is kept as it is */
  const moreMain = tagIds.filter(id => { const c = categories.find(x => x.id === id); return c && isMainTag(c) && id !== categoryId })
  const done = () => { qc.invalidateQueries({ queryKey: finKeys.rules }); onClose() }
  const body = () => ({
    keywords: byCounterparty ? undefined : keywords, label, direction, priority: priority.trim() ? Number(priority) || 10 : undefined,
    fromDate, toDate,
    ...(target === 'category'
      ? { categoryId: categoryId || undefined, tagIds: [...(categoryId ? [categoryId] : []), ...moreMain, ...extra] }
      : { transferAccountId: accountId || undefined }),
  })
  const save = useMutation({
    mutationFn: () => rule ? financeApi.updateRule(rule.id, body()) : financeApi.createRule(body()),
    onSuccess: done, onError: e => setError(apiError(e)),
  })
  /* save first, then run it over every line it fits */
  const saveApply = useMutation({
    mutationFn: async () => {
      const r = rule ? await financeApi.updateRule(rule.id, body()) : await financeApi.createRule(body())
      return financeApi.applyRule(r.id)
    },
    onSuccess: r => { setMsg(`Saved — ${r.updated} transaction${r.updated === 1 ? '' : 's'} changed`); qc.invalidateQueries({ queryKey: ['fin'] }) },
    onError: e => setError(apiError(e)),
  })
  const remove = useMutation({ mutationFn: () => financeApi.deleteRule(rule!.id), onSuccess: done, onError: e => setError(apiError(e)) })
  const occasion = !byCounterparty && !keywords.trim() && (!!fromDate || !!toDate)

  return (
    <Modal title={rule ? 'Edit rule' : 'New rule'} onClose={onClose}>
      <div className="space-y-3">
        {byCounterparty
          ? <p className="text-sm text-slate-600">Everything with <b>{rule!.counterpartyName}</b>{rule!.counterpartyAccount ? ` (${rule!.counterpartyAccount})` : ''}</p>
          : <Input label="Keywords (separate with |) — leave empty for an occasion" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="highlands | phúc long | katinat" />}
        <div className="grid grid-cols-2 gap-3">
          <Input label="From (optional)" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        {occasion && <p className="text-[11px] text-sky-700 -mt-1">An occasion: every line of those days gets its tags (bills, subscriptions and savings are left out). Tried last (priority 200).</p>}
        <Input label="Name the matching transactions (optional)" value={label} onChange={e => setLabel(e.target.value)} placeholder="Tiền nhà" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Applies to" value={direction} onChange={e => setDirection(e.target.value as RuleDirection)}>
            {(['OUT', 'IN', 'ANY'] as const).map(d => <option key={d} value={d}>{DIR_LABEL[d]}</option>)}
          </Select>
          <Input label="Priority" inputMode="numeric" value={priority} onChange={e => setPriority(e.target.value)} placeholder={occasion ? '200' : '10'} />
        </div>
        <div className="flex gap-1 text-xs">
          {(['category', 'account'] as const).map(m => (
            <button key={m} type="button" onClick={() => setTarget(m)}
              className={clsx('px-3 py-1.5 rounded-full font-medium', target === m ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500')}>
              {m === 'category' ? 'Category' : 'Moves money to my account'}
            </button>
          ))}
        </div>
        {target === 'category' ? (
          <div className="space-y-3">
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">{occasion ? '— no category (an occasion only adds tags) —' : '— choose a category —'}</option>
              <CategoryOptions categories={categories} />
            </Select>
            <div className="rounded-xl border border-dashed border-slate-200 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-600">More tags <span className="font-normal text-slate-400">— given too</span></p>
              <TagPicker facets={facets} categories={categories} selected={extra} onChange={ids => setTagIds([...moreMain, ...ids])} />
            </div>
          </div>
        ) : (
          <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">— which account —</option>
            {accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        )}
        {error && <p className="text-xs text-rose-500">{error}</p>}
        {msg && <p className="text-xs text-pink-600">{msg}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {rule ? <Button size="sm" variant="danger" onClick={() => { if (confirm('Delete this rule?')) remove.mutate() }}><Trash2 size={14} />Delete</Button> : <span />}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="ghost" onClick={() => { setError(''); setMsg(''); saveApply.mutate() }}
              disabled={(!byCounterparty && !keywords.trim() && !fromDate && !toDate) || saveApply.isPending}
              title="Save, then run this rule over every transaction it fits — decided ones too (what was chosen by hand stays)">
              <Play size={14} />Save & apply to all
            </Button>
            <Button onClick={() => { setError(''); save.mutate() }} disabled={(!byCounterparty && !keywords.trim() && !fromDate && !toDate) || save.isPending}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
