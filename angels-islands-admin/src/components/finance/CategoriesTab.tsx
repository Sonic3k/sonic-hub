import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import { Button, Input, Modal, Select } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import type { BudgetGroup, CategoryKind, FinCategory } from '../../types/finance'
import { useFinCategories } from './shared'

const GROUPS: { key: BudgetGroup; label: string; help: string }[] = [
  { key: 'FLEXIBLE', label: 'Flexible', help: 'what the monthly “còn tiêu được” budget watches' },
  { key: 'FIXED', label: 'Fixed', help: 'bills that come anyway' },
  { key: 'SAVING', label: 'Saving', help: 'money put aside — reported apart, never counted as spending' },
]

export default function CategoriesTab() {
  const { data: categories = [] } = useFinCategories()
  const [editing, setEditing] = useState<FinCategory | 'new' | null>(null)

  const row = (c: FinCategory) => (
    <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-8 text-lg text-center">{c.icon || '·'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 truncate">{c.name}{c.archived && <span className="ml-2 text-xs text-slate-400">archived</span>}</p>
        <p className="text-[11px] text-slate-400 font-mono">{c.code}</p>
      </div>
      {c.system && <Lock size={13} className="text-slate-300" />}
      <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setEditing('new')}><Plus size={14} />Add category</Button></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {GROUPS.map(g => {
            const list = categories.filter(c => c.kind === 'EXPENSE' && c.budgetGroup === g.key)
            return (
              <div key={g.key}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">Spending · {g.label} <span className="normal-case tracking-normal font-normal">— {g.help}</span></p>
                <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">{list.map(row)}</div>
              </div>
            )
          })}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">Income</p>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">{categories.filter(c => c.kind === 'INCOME').map(row)}</div>
        </div>
      </div>
      {editing && <CategoryModal category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function CategoryModal({ category, onClose }: { category?: FinCategory; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '')
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'EXPENSE')
  const [group, setGroup] = useState<BudgetGroup>(category?.budgetGroup ?? 'FLEXIBLE')
  const [error, setError] = useState('')
  const done = () => { qc.invalidateQueries({ queryKey: ['fin'] }); onClose() }
  const save = useMutation({
    mutationFn: () => {
      const body = { name, icon, kind, budgetGroup: kind === 'EXPENSE' ? group : undefined }
      return category ? financeApi.updateCategory(category.id, body) : financeApi.createCategory(body)
    },
    onSuccess: done, onError: e => setError(apiError(e)),
  })
  const remove = useMutation({ mutationFn: () => financeApi.deleteCategory(category!.id), onSuccess: done, onError: e => setError(apiError(e)) })
  const archive = useMutation({ mutationFn: () => financeApi.updateCategory(category!.id, { archived: !category!.archived }), onSuccess: done, onError: e => setError(apiError(e)) })

  return (
    <Modal title={category ? category.name : 'New category'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Input label="Icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🐶" className="text-center text-lg" />
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Thú cưng" />
        </div>
        <Select label="Kind" value={kind} onChange={e => setKind(e.target.value as CategoryKind)} disabled={category?.system}>
          <option value="EXPENSE">Spending</option>
          <option value="INCOME">Income</option>
        </Select>
        {kind === 'EXPENSE' && (
          <Select label="Budget group" value={group} onChange={e => setGroup(e.target.value as BudgetGroup)}>
            {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label} — {g.help}</option>)}
          </Select>
        )}
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {category && !category.system ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => archive.mutate()}>{category.archived ? 'Unarchive' : 'Archive'}</Button>
              <Button size="sm" variant="danger" onClick={() => { if (confirm('Delete? Its transactions go back to review and its rules are removed.')) remove.mutate() }}><Trash2 size={14} />Delete</Button>
            </div>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { setError(''); save.mutate() }} disabled={!name.trim() || save.isPending}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
