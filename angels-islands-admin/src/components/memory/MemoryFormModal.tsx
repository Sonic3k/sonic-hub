/* Add / edit a fact, a trait or a life chapter. Episodes have their own editor (EpisodeEditor). */
import { useState } from 'react'
import { Button, Input, Textarea, Modal } from '../ui'
import { memoryApi } from '../../api/memory'
import { StatusSwitch } from './shared'
import type { ChapterRequest, ChapterResponse, FactRequest, FactResponse, MemoryStatus, TraitRequest, TraitResponse } from '../../types'

const FACT_CATEGORIES = ['basic', 'preference', 'habit', 'work', 'family', 'hobby']

export type MemoryFormKind = 'chapter' | 'trait' | 'fact'

export default function MemoryFormModal({ personId, kind, item, categories = [], onSaved, onClose }: {
  personId: string
  categories?: string[]
  kind: MemoryFormKind
  item?: ChapterResponse | TraitResponse | FactResponse
  onSaved: () => void
  onClose: () => void
}) {
  const editing = !!item
  const [f, setF] = useState<Record<string, string | number | undefined>>(() => {
    if (kind === 'fact') { const x = item as FactResponse | undefined; return { category: x?.category || 'basic', key: x?.key || '', value: x?.value || '', period: x?.period || '', confidence: x?.confidence ?? 0.8 } }
    if (kind === 'trait') { const x = item as TraitResponse | undefined; return { trait: x?.trait || '', description: x?.description || '', evidence: x?.evidence || '', period: x?.period || '' } }
    const x = item as ChapterResponse | undefined; return { period: x?.period || '', title: x?.title || '', summary: x?.summary || '', sentiment: x?.sentiment || '', sortOrder: x?.sortOrder ?? '' }
  })
  // a new item is typed in by you: confirmed; an existing one keeps its status until you change it
  const [status, setStatus] = useState<MemoryStatus | null>(item ? item.status ?? null : 'CONFIRMED')
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))

  const valid = kind === 'fact' ? !!(f.key && f.value) : kind === 'trait' ? !!f.trait : !!f.period

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    const st = status ?? undefined
    try {
      if (kind === 'fact') {
        const data: FactRequest = { category: String(f.category), key: String(f.key), value: String(f.value), period: String(f.period), confidence: Number(f.confidence), status: st }
        editing ? await memoryApi.updateFact(personId, item!.id, data) : await memoryApi.createFact(personId, data)
      } else if (kind === 'trait') {
        const data: TraitRequest = { trait: String(f.trait), description: String(f.description), evidence: String(f.evidence), period: String(f.period), status: st }
        editing ? await memoryApi.updateTrait(personId, item!.id, data) : await memoryApi.createTrait(personId, data)
      } else {
        const data: ChapterRequest = { period: String(f.period), title: String(f.title), summary: String(f.summary), sentiment: String(f.sentiment),
          sortOrder: f.sortOrder === '' || f.sortOrder === undefined ? undefined : Number(f.sortOrder), status: st }
        editing ? await memoryApi.updateChapter(personId, item!.id, data) : await memoryApi.createChapter(personId, data)
      }
      onSaved()
    } catch { alert('Save failed') }
    setSaving(false)
  }

  const titles = { fact: 'Fact', trait: 'Trait', chapter: 'Life Chapter' }

  return (
    <Modal title={`${editing ? 'Edit' : 'Add'} ${titles[kind]}`} onClose={onClose}>
      <div className="space-y-3">
        {kind === 'fact' && <>
          {/* free text with suggestions: imports write their own categories ("Điểm (Claude chấm)"…) and a fixed list would turn them into "basic" on save */}
          <Input label="Category" list="fact-categories" value={String(f.category)} onChange={e => set('category', e.target.value)} />
          <datalist id="fact-categories">
            {[...new Set([...FACT_CATEGORIES, ...categories])].map(c => <option key={c} value={c} />)}
          </datalist>
          <Input label="Key *" value={String(f.key)} onChange={e => set('key', e.target.value)} placeholder="truong_hoc, mon_an_thich..." />
          <Textarea label="Value *" rows={2} value={String(f.value)} onChange={e => set('value', e.target.value)} placeholder="Chu Van An High School" />
          <Input label="Period" value={String(f.period)} onChange={e => set('period', e.target.value)} placeholder="2010 or 2009-2011, empty = always true" />
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Confidence · {Number(f.confidence).toFixed(2)}</label>
            <input type="range" min={0.1} max={1} step={0.05} value={Number(f.confidence)}
              onChange={e => set('confidence', parseFloat(e.target.value))} className="w-full accent-pink-500" />
          </div>
        </>}
        {kind === 'trait' && <>
          <Input label="Trait *" value={String(f.trait)} onChange={e => set('trait', e.target.value)} placeholder="clingy, thoughtful..." />
          <Textarea label="Description" rows={2} value={String(f.description)} onChange={e => set('description', e.target.value)} />
          <Textarea label="Evidence" rows={2} value={String(f.evidence)} onChange={e => set('evidence', e.target.value)} placeholder='Verbatim chat line as evidence' />
          <Input label="Period" value={String(f.period)} onChange={e => set('period', e.target.value)} placeholder="2010" />
        </>}
        {kind === 'chapter' && <>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Input label="Period *" value={String(f.period)} onChange={e => set('period', e.target.value)} placeholder="2009-2011" />
            <Input label="Order" type="number" value={String(f.sortOrder ?? '')} onChange={e => set('sortOrder', e.target.value)} placeholder="2009010" />
          </div>
          <Input label="Title" value={String(f.title)} onChange={e => set('title', e.target.value)} placeholder="High-school years" />
          <Textarea label="Summary" rows={3} value={String(f.summary)} onChange={e => set('summary', e.target.value)} />
          <Input label="Sentiment" value={String(f.sentiment)} onChange={e => set('sentiment', e.target.value)} placeholder="warm, romantic, tense..." />
        </>}
        <StatusSwitch value={status} onChange={setStatus} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  )
}
