import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Lock, ArrowRight } from 'lucide-react'
import { Button, Input, Modal, Select } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import type { BudgetGroup, CategoryKind, FinCategory, FinFacet } from '../../types/finance'
import { TagPicker, isMainTag, useFinCategories, useFinFacets } from './shared'

const GROUPS: { key: BudgetGroup; label: string; help: string }[] = [
  { key: 'FLEXIBLE', label: 'Flexible', help: 'what the monthly “left to spend” budget watches' },
  { key: 'FIXED', label: 'Fixed', help: 'bills that come anyway' },
  { key: 'SAVING', label: 'Saving', help: 'money put aside — reported apart, never counted as spending' },
]

type Editing = { tag?: FinCategory; facetId?: string } | null

/**
 * Tags by facet. The main facet ("Hạng mục") holds the categories, which do the counting (spending or income, budget
 * group); the other facets hold tags that only add a point of view (who with, what form, the occasion). A line can
 * carry any number of tags, of every facet; a tag can bring others along.
 */
export default function CategoriesTab() {
  const { data: categories = [] } = useFinCategories()
  const { data: facets = [] } = useFinFacets()
  const [editing, setEditing] = useState<Editing>(null)
  const [facet, setFacet] = useState<FinFacet | 'new' | null>(null)
  const main = facets.find(f => f.main)
  const others = facets.filter(f => !f.main).sort((a, b) => a.sortOrder - b.sortOrder)
  const name = (id: string) => categories.find(c => c.id === id)?.name ?? '?'

  const row = (c: FinCategory) => (
    <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-8 text-lg text-center">{c.icon || '·'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 truncate">{c.name}{c.archived && <span className="ml-2 text-xs text-slate-400">archived</span>}</p>
        <p className="text-[11px] text-slate-400 truncate">
          <span className="font-mono">{c.code}</span>
          {c.impliesIds.length > 0 && <span className="ml-2 inline-flex items-center gap-1"><ArrowRight size={10} />brings {c.impliesIds.map(name).join(', ')}</span>}
        </p>
      </div>
      {c.system && <Lock size={13} className="text-slate-300" />}
      <button onClick={() => setEditing({ tag: c })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500 mr-auto">A transaction can carry many tags, of every facet. Categories do the counting; the other facets only add a point of view.</p>
        <Button size="sm" variant="ghost" onClick={() => setFacet('new')}><Plus size={14} />Add facet</Button>
        <Button size="sm" onClick={() => setEditing({ facetId: main?.id })}><Plus size={14} />Add category</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700 px-1">{main?.icon} {main?.name ?? 'Categories'} <span className="font-normal text-xs text-slate-400">— categories</span></p>
          {GROUPS.map(g => {
            const list = categories.filter(c => c.kind === 'EXPENSE' && c.budgetGroup === g.key)
            return (
              <div key={g.key}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">Spending · {g.label} <span className="normal-case tracking-normal font-normal">— {g.help}</span></p>
                <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">{list.map(row)}</div>
              </div>
            )
          })}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">Income</p>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">{categories.filter(c => c.kind === 'INCOME').map(row)}</div>
          </div>
        </div>
        <div className="space-y-4">
          {others.map(f => {
            const list = categories.filter(c => c.facetId === f.id && !isMainTag(c)).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            return (
              <div key={f.id} className={f.archived ? 'opacity-50' : ''}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <p className="text-sm font-semibold text-slate-700">{f.icon} {f.name}</p>
                  {f.perTransaction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600" title="Its tags describe one occasion: not carried into a rule learned from one line unless picked">per transaction</span>}
                  {f.archived && <span className="text-[10px] text-slate-400">archived</span>}
                  <button onClick={() => setFacet(f)} className="ml-auto p-1 rounded-lg hover:bg-slate-100 text-slate-400"><Pencil size={13} /></button>
                  <button onClick={() => setEditing({ facetId: f.id })} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400" title="Add a tag"><Plus size={14} /></button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                  {list.length ? list.map(row) : <p className="px-4 py-3 text-xs text-slate-400">No tags yet.</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {editing && <TagModal tag={editing.tag} facetId={editing.facetId} facets={facets} categories={categories} onClose={() => setEditing(null)} />}
      {facet && <FacetModal facet={facet === 'new' ? undefined : facet} onClose={() => setFacet(null)} />}
    </div>
  )
}

function TagModal({ tag, facetId, facets, categories, onClose }: {
  tag?: FinCategory; facetId?: string; facets: FinFacet[]; categories: FinCategory[]; onClose: () => void
}) {
  const qc = useQueryClient()
  const mainId = facets.find(f => f.main)?.id
  const [facet, setFacet] = useState(tag ? (isMainTag(tag) ? mainId : tag.facetId) ?? '' : facetId ?? mainId ?? '')
  const isMain = facet === mainId
  const [name, setName] = useState(tag?.name ?? '')
  const [icon, setIcon] = useState(tag?.icon ?? '')
  const [kind, setKind] = useState<CategoryKind>(tag && isMainTag(tag) ? tag.kind : 'EXPENSE')
  const [group, setGroup] = useState<BudgetGroup>(tag?.budgetGroup ?? 'FLEXIBLE')
  const [implies, setImplies] = useState<string[]>(tag?.impliesIds ?? [])
  const [error, setError] = useState('')
  const done = () => { qc.invalidateQueries({ queryKey: ['fin'] }); onClose() }
  const save = useMutation({
    mutationFn: () => {
      const body = { name, icon, impliesIds: implies,
        ...(isMain ? { kind, budgetGroup: kind === 'EXPENSE' ? group : undefined } : {}) }
      return tag ? financeApi.updateCategory(tag.id, body) : financeApi.createCategory({ ...body, facetId: facet || undefined })
    },
    onSuccess: done, onError: e => setError(apiError(e)),
  })
  const remove = useMutation({ mutationFn: () => financeApi.deleteCategory(tag!.id), onSuccess: done, onError: e => setError(apiError(e)) })
  const archive = useMutation({ mutationFn: () => financeApi.updateCategory(tag!.id, { archived: !tag!.archived }), onSuccess: done, onError: e => setError(apiError(e)) })
  const facetName = facets.find(f => f.id === facet)?.name ?? ''

  return (
    <Modal title={tag ? tag.name : isMain ? 'New category' : `New tag · ${facetName}`} onClose={onClose}>
      <div className="space-y-3">
        {!tag && (
          <Select label="Facet" value={facet} onChange={e => setFacet(e.target.value)}>
            {facets.filter(f => !f.archived).sort((a, b) => a.sortOrder - b.sortOrder).map(f => <option key={f.id} value={f.id}>{f.icon ? `${f.icon} ` : ''}{f.name}</option>)}
          </Select>
        )}
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Input label="Icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🐶" className="text-center text-lg" />
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder={isMain ? 'Pets' : 'Da Lat trip 11/2026'} />
        </div>
        {isMain && (
          <>
            <Select label="Kind" value={kind} onChange={e => setKind(e.target.value as CategoryKind)} disabled={tag?.system}>
              <option value="EXPENSE">Spending</option>
              <option value="INCOME">Income</option>
            </Select>
            {kind === 'EXPENSE' && (
              <Select label="Budget group" value={group} onChange={e => setGroup(e.target.value as BudgetGroup)}>
                {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label} — {g.help}</option>)}
              </Select>
            )}
          </>
        )}
        <div className="rounded-xl border border-dashed border-slate-200 p-3 space-y-2">
          <p className="text-xs font-medium text-slate-600">Brings along <span className="font-normal text-slate-400">— put on every line that gets this tag (e.g. Game → Entertainment + Digital)</span></p>
          <TagPicker facets={facets} categories={categories} selected={implies} onChange={setImplies} includeMain exclude={tag?.id} />
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {tag && !tag.system ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => archive.mutate()}>{tag.archived ? 'Unarchive' : 'Archive'}</Button>
              <Button size="sm" variant="danger" onClick={() => { if (confirm(isMainTag(tag) ? 'Delete? Its transactions go back to review and its rules lose it.' : 'Delete? It comes off every transaction and rule.')) remove.mutate() }}><Trash2 size={14} />Delete</Button>
            </div>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { setError(''); save.mutate() }} disabled={!name.trim() || !facet || save.isPending}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function FacetModal({ facet, onClose }: { facet?: FinFacet; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(facet?.name ?? '')
  const [icon, setIcon] = useState(facet?.icon ?? '')
  const [perTransaction, setPerTransaction] = useState(facet?.perTransaction ?? false)
  const [sortOrder, setSortOrder] = useState(facet ? String(facet.sortOrder) : '')
  const [error, setError] = useState('')
  const done = () => { qc.invalidateQueries({ queryKey: ['fin'] }); onClose() }
  const save = useMutation({
    mutationFn: () => {
      const body = { name, icon, perTransaction, sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined }
      return facet ? financeApi.updateFacet(facet.id, body) : financeApi.createFacet(body)
    },
    onSuccess: done, onError: e => setError(apiError(e)),
  })
  const remove = useMutation({ mutationFn: () => financeApi.deleteFacet(facet!.id), onSuccess: done, onError: e => setError(apiError(e)) })
  const archive = useMutation({ mutationFn: () => financeApi.updateFacet(facet!.id, { archived: !facet!.archived }), onSuccess: done, onError: e => setError(apiError(e)) })

  return (
    <Modal title={facet ? facet.name : 'New facet'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-[80px_1fr_90px] gap-3">
          <Input label="Icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="⚖️" className="text-center text-lg" />
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Necessity" />
          <Input label="Order" inputMode="numeric" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="auto" />
        </div>
        {!facet?.main && (
          <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="accent-pink-500 mt-0.5" checked={perTransaction} onChange={e => setPerTransaction(e.target.checked)} />
            <span><b className="font-medium">Per transaction</b> — its tags describe one occasion (who it was with, which trip), so a rule learned from one line leaves them out unless picked.</span>
          </label>
        )}
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {facet && !facet.main ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => archive.mutate()}>{facet.archived ? 'Unarchive' : 'Archive'}</Button>
              <Button size="sm" variant="danger" onClick={() => remove.mutate()} disabled={facet.tagCount > 0} title={facet.tagCount > 0 ? 'Delete its tags first, or archive it' : undefined}><Trash2 size={14} />Delete</Button>
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
