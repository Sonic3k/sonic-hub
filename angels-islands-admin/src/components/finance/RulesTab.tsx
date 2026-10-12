import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Play } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input, Modal, Select } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import type { FinRule, RuleDirection } from '../../types/finance'
import { CategoryOptions, finKeys, useFinAccounts, useFinCategories } from './shared'

const DIR_LABEL: Record<RuleDirection, string> = { ANY: 'in & out', IN: 'money in', OUT: 'money out' }

/** Words → category (or → one of my accounts). Tried in priority order; the first that matches wins. */
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
        <p className="text-xs text-slate-500 mr-auto">Keywords are matched as whole words, accents and case ignored, in the memo and the bank line. Lower priority runs first; rules learned from a correction get 10.</p>
        {msg && <span className="text-xs text-pink-600">{msg}</span>}
        <Button size="sm" variant="ghost" onClick={() => apply.mutate()} disabled={apply.isPending}><Play size={14} />Run on waiting</Button>
        <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} />Add rule</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {rules.map(r => (
          <div key={r.id} className={clsx('flex items-center gap-3 px-4 py-3', !r.active && 'opacity-50')}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1">
                {r.keywords.split('|').map(k => k.trim()).filter(Boolean).slice(0, 12).map(k => (
                  <span key={k} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{k}</span>
                ))}
                {r.keywords.split('|').length > 12 && <span className="text-[11px] text-slate-400">+{r.keywords.split('|').length - 12}</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {DIR_LABEL[r.direction]} → <span className="text-slate-700 font-medium">
                  {r.transferAccountName ? `↔ ${r.transferAccountName}` : `${r.categoryIcon ?? ''} ${r.categoryName}`}
                </span>
                <span> · priority {r.priority} · {r.hits} hits · {r.origin === 'SEED' ? 'built-in' : 'mine'}</span>
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
  const { data: accounts = [] } = useFinAccounts()
  const [keywords, setKeywords] = useState(rule?.keywords ?? '')
  const [direction, setDirection] = useState<RuleDirection>(rule?.direction ?? 'OUT')
  const [target, setTarget] = useState<'category' | 'account'>(rule?.transferAccountId ? 'account' : 'category')
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '')
  const [accountId, setAccountId] = useState(rule?.transferAccountId ?? '')
  const [priority, setPriority] = useState(String(rule?.priority ?? 10))
  const [error, setError] = useState('')
  const done = () => { qc.invalidateQueries({ queryKey: finKeys.rules }); onClose() }
  const save = useMutation({
    mutationFn: () => {
      const body = { keywords, direction, priority: Number(priority) || 10,
        categoryId: target === 'category' ? categoryId || undefined : undefined,
        transferAccountId: target === 'account' ? accountId || undefined : undefined }
      return rule ? financeApi.updateRule(rule.id, body) : financeApi.createRule(body)
    },
    onSuccess: done, onError: e => setError(apiError(e)),
  })
  const remove = useMutation({ mutationFn: () => financeApi.deleteRule(rule!.id), onSuccess: done, onError: e => setError(apiError(e)) })

  return (
    <Modal title={rule ? 'Edit rule' : 'New rule'} onClose={onClose}>
      <div className="space-y-3">
        <Input label="Keywords (separate with |)" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="highlands | phúc long | katinat" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Applies to" value={direction} onChange={e => setDirection(e.target.value as RuleDirection)}>
            {(['OUT', 'IN', 'ANY'] as const).map(d => <option key={d} value={d}>{DIR_LABEL[d]}</option>)}
          </Select>
          <Input label="Priority" inputMode="numeric" value={priority} onChange={e => setPriority(e.target.value)} />
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
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">— choose —</option>
            <CategoryOptions categories={categories} />
          </Select>
        ) : (
          <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">— which account —</option>
            {accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        )}
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {rule ? <Button size="sm" variant="danger" onClick={() => { if (confirm('Delete this rule?')) remove.mutate() }}><Trash2 size={14} />Delete</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { setError(''); save.mutate() }} disabled={!keywords.trim() || save.isPending}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
