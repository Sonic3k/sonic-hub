/* Clean tagging, everywhere it happens:
   - AlbumTagsSheet: tag / untag every photo in an album (sub-albums optional)
   - SelectionTagsSheet: tag / untag the photos you selected
   - TagToggle: tag one photo from the lightbox
   One look: colour dot, name, how many are tagged, the two actions that make sense. */
import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Search, X } from 'lucide-react'
import { useTags } from '../hooks/useTags'
import { tagsApi } from '../api/tags'
import { albumTagsApi, mediaApi } from '../api/collections'
import type { MediaFileResponse, TagResponse } from '../types'

export const PALETTE = ['#ec4899', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ef4444', '#64748b']

function Sheet({ title, sub, onClose, children, head }: { title: string; sub?: string; onClose: () => void; children: ReactNode; head?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:mx-4 rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[85dvh]">
        <div className="flex justify-center pt-2 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
        <div className="flex items-start gap-3 px-5 pt-4 pb-3">
          <div className="flex-1 min-w-0"><h3 className="text-base font-semibold text-slate-800 truncate">{title}</h3>{sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="p-1.5 -m-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
        {head}
        <div className="overflow-y-auto px-2 pb-3">{children}</div>
      </div>
    </div>
  )
}

function SearchCreate({ q, setQ, onCreate, creating }: { q: string; setQ: (v: string) => void; onCreate: (name: string) => void; creating: boolean }) {
  const exists = false
  return (
    <div className="px-5 pb-3">
      <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-pink-300 focus-within:bg-white">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search or create a tag…" className="flex-1 bg-transparent text-sm outline-none min-w-0"
          onKeyDown={e => { if (e.key === 'Enter' && q.trim() && !exists) onCreate(q.trim()) }} />
        {q.trim() && <button onClick={() => onCreate(q.trim())} disabled={creating} className="text-xs font-medium text-pink-600 hover:text-pink-700 whitespace-nowrap disabled:opacity-50">+ Create “{q.trim()}”</button>}
      </div>
    </div>
  )
}

function Row({ tag, count, total, busy, onAdd, onRemove, addLabel }: { tag: TagResponse; count: number; total: number; busy: boolean; onAdd: () => void; onRemove: () => void; addLabel: string }) {
  const full = total > 0 && count >= total, pct = total ? Math.round(count / total * 100) : 0
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${busy ? 'opacity-60' : 'hover:bg-slate-50'}`}>
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color || '#94a3b8' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2"><span className="text-sm font-medium text-slate-700 truncate">{tag.name}</span>
          <span className={`text-xs tabular-nums ${full ? 'text-emerald-600 font-medium' : count ? 'text-slate-500' : 'text-slate-300'}`}>{count ? (full ? <span className="inline-flex items-center gap-0.5"><Check size={11} />all</span> : `${count} / ${total}`) : '—'}</span></div>
        {count > 0 && !full && <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: tag.color || '#ec4899' }} /></div>}
      </div>
      {!full && <button onClick={onAdd} disabled={busy || !total} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-40 whitespace-nowrap">{addLabel}</button>}
      {count > 0 && <button onClick={onRemove} disabled={busy} className="text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap text-slate-500 hover:bg-rose-50 hover:text-rose-600">Remove</button>}
    </div>
  )
}

const order = (tags: TagResponse[], countOf: (id: string) => number, q: string) =>
  tags.filter(t => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => countOf(b.id) - countOf(a.id) || a.name.localeCompare(b.name))

function useCreateTag() {
  const qc = useQueryClient(), { data: tags = [] } = useTags(), [creating, setCreating] = useState(false)
  const create = async (name: string) => {
    const hit = tags.find(t => t.name.toLowerCase() === name.toLowerCase()); if (hit) return hit
    setCreating(true)
    try { const t = await tagsApi.create({ name, color: PALETTE[tags.length % PALETTE.length] }); await qc.invalidateQueries({ queryKey: ['tags'] }); return t }
    finally { setCreating(false) }
  }
  return { create, creating }
}

/* ── an album: every photo at once ── */
export function AlbumTagsSheet({ collectionId, name, onClose, onChanged }: { collectionId: string; name: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient(), { data: tags = [] } = useTags(), [deep, setDeep] = useState(true), [q, setQ] = useState(''), [busy, setBusy] = useState<string | null>(null)
  const { create, creating } = useCreateTag()
  const stats = useQuery({ queryKey: ['album-tag-stats', collectionId, deep], queryFn: () => albumTagsApi.stats(collectionId, deep) })
  const total = stats.data?.total ?? 0, countOf = (id: string) => stats.data?.tags.find(t => t.tagId === id)?.count ?? 0
  const run = async (tag: TagResponse, add: boolean) => {
    if (!add && !confirm(`Remove “${tag.name}” from ${countOf(tag.id)} photo(s) in this album?`)) return
    setBusy(tag.id)
    try {
      if (add) await albumTagsApi.tagAll(collectionId, tag.id, deep); else await albumTagsApi.untagAll(collectionId, tag.id, deep)
      await qc.invalidateQueries({ queryKey: ['album-tag-stats', collectionId] }); onChanged()
    } finally { setBusy(null) }
  }
  return (
    <Sheet title={`Tags · ${name}`} sub={stats.isLoading ? 'Counting photos…' : `${total} photo${total === 1 ? '' : 's'}${deep ? ', sub-albums included' : ''}`} onClose={onClose}
      head={<>
        <div className="px-5 pb-3"><label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={deep} onChange={e => setDeep(e.target.checked)} className="accent-pink-500" />Include sub-albums</label></div>
        <SearchCreate q={q} setQ={setQ} creating={creating} onCreate={async (n) => { const t = await create(n); setQ(''); run(t, true) }} />
      </>}>
      {order(tags, countOf, q).map(t => <Row key={t.id} tag={t} count={countOf(t.id)} total={total} busy={busy === t.id} addLabel="Tag all" onAdd={() => run(t, true)} onRemove={() => run(t, false)} />)}
      {!tags.length && <p className="text-sm text-slate-400 text-center py-8">No tags yet — type a name above to create one.</p>}
    </Sheet>
  )
}

/* ── a selection of photos ── */
export function SelectionTagsSheet({ media, onClose, onChanged }: { media: MediaFileResponse[]; onClose: () => void; onChanged: () => void }) {
  const { data: tags = [] } = useTags(), [q, setQ] = useState(''), [busy, setBusy] = useState<string | null>(null), [over, setOver] = useState<Record<string, number>>({})
  const { create, creating } = useCreateTag(), ids = media.map(m => m.id), total = media.length
  const base = useMemo(() => { const c: Record<string, number> = {}; media.forEach(m => (m.tags || []).forEach(t => { c[t.id] = (c[t.id] ?? 0) + 1 })); return c }, [media])
  const countOf = (id: string) => over[id] ?? base[id] ?? 0
  const run = async (tag: TagResponse, add: boolean) => {
    setBusy(tag.id)
    try { if (add) await mediaApi.tagBatch(ids, tag.id); else await mediaApi.untagBatch(ids, tag.id); setOver(o => ({ ...o, [tag.id]: add ? total : 0 })); onChanged() }
    finally { setBusy(null) }
  }
  return (
    <Sheet title={`Tag ${total} photo${total === 1 ? '' : 's'}`} sub="Changes apply to every selected photo" onClose={onClose}
      head={<SearchCreate q={q} setQ={setQ} creating={creating} onCreate={async (n) => { const t = await create(n); setQ(''); run(t, true) }} />}>
      {order(tags, countOf, q).map(t => <Row key={t.id} tag={t} count={countOf(t.id)} total={total} busy={busy === t.id} addLabel={total > 1 ? `Add to ${total}` : 'Add'} onAdd={() => run(t, true)} onRemove={() => run(t, false)} />)}
      {!tags.length && <p className="text-sm text-slate-400 text-center py-8">No tags yet — type a name above to create one.</p>}
    </Sheet>
  )
}

/* ── one photo, in the dark lightbox ── */
export function TagToggle({ media, onChanged }: { media: MediaFileResponse; onChanged: (m: MediaFileResponse) => void }) {
  const { data: tags = [] } = useTags(), [open, setOpen] = useState(false), [q, setQ] = useState(''), box = useRef<HTMLDivElement>(null)
  const { create } = useCreateTag(), on = new Set((media.tags || []).map(t => t.id))
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [open])
  const toggle = async (t: TagResponse) => onChanged(await (on.has(t.id) ? mediaApi.removeTag(media.id, t.id) : mediaApi.addTag(media.id, t.id)))
  const list = tags.filter(t => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="relative inline-block" ref={box}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40"><Plus size={11} />Tag</button>
      {open && (
        <div className="absolute z-20 left-0 top-full mt-2 w-60 rounded-xl bg-[#1c1c1f] border border-white/10 shadow-2xl p-1.5">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Find or create…"
            onKeyDown={async e => { if (e.key === 'Enter' && q.trim()) { const t = await create(q.trim()); setQ(''); if (!on.has(t.id)) onChanged(await mediaApi.addTag(media.id, t.id)) } }}
            className="w-full bg-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 outline-none placeholder:text-white/30 mb-1" />
          <div className="max-h-56 overflow-y-auto">
            {list.map(t => (
              <button key={t.id} onClick={() => toggle(t)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:bg-white/5 text-left">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color || '#94a3b8' }} /><span className="flex-1 truncate">{t.name}</span>{on.has(t.id) && <Check size={13} className="text-pink-400" />}
              </button>))}
            {!list.length && q.trim() && <p className="px-2.5 py-2 text-xs text-white/40">Enter to create “{q.trim()}”</p>}
          </div>
        </div>
      )}
    </div>
  )
}
