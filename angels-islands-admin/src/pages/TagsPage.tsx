/* Tags — one clean list: colour, name, where it is used. Rename and recolour in place. */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Check } from 'lucide-react'
import { tagsApi } from '../api/tags'
import { PALETTE } from '../components/TagPanel'
import type { TagStats } from '../types'

export default function TagsPage() {
  const qc = useQueryClient(), { data: rows = [], isLoading } = useQuery({ queryKey: ['tag-stats'], queryFn: tagsApi.stats })
  const [q, setQ] = useState(''), [adding, setAdding] = useState(false), [name, setName] = useState(''), [color, setColor] = useState(PALETTE[0])
  const refresh = () => { qc.invalidateQueries({ queryKey: ['tag-stats'] }); qc.invalidateQueries({ queryKey: ['tags'] }) }
  const list = rows.filter(r => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()))
  const create = async () => { if (!name.trim()) return; await tagsApi.create({ name: name.trim(), color }); setName(''); setAdding(false); refresh() }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1"><h1 className="text-lg font-semibold text-slate-800">Tags</h1><p className="text-xs text-slate-400 mt-0.5">{rows.length} tags · shown as regions on the website</p></div>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600"><Plus size={15} />New tag</button>
      </div>

      {adding && (
        <div className="mb-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} placeholder="Tag name — e.g. Family, Hà Nội, FC Westlife"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-400 outline-none" />
          <div className="flex items-center gap-2 mt-3">
            <Swatches value={color} onPick={setColor} />
            <div className="ml-auto flex gap-2"><button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={create} disabled={!name.trim()} className="px-3 py-1.5 text-sm rounded-lg bg-pink-500 text-white font-medium disabled:opacity-40">Create</button></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 h-10 px-3 mb-3 rounded-xl bg-white border border-slate-200 focus-within:border-pink-300">
        <Search size={15} className="text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tags…" className="flex-1 text-sm outline-none bg-transparent" />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-400">Loading…</p>}
        {!isLoading && !list.length && <p className="p-6 text-sm text-slate-400">{rows.length ? 'No tag matches.' : 'No tags yet.'}</p>}
        {list.map(r => <TagLine key={r.id} t={r} onChanged={refresh} />)}
      </div>
    </div>
  )
}

function Swatches({ value, onPick }: { value?: string; onPick: (c: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{PALETTE.map(c => (
    <button key={c} onClick={() => onPick(c)} className="w-6 h-6 rounded-full grid place-items-center ring-offset-2 hover:scale-110 transition-transform" style={{ background: c, boxShadow: value === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}>
      {value === c && <Check size={12} className="text-white" />}</button>))}</div>
}

function TagLine({ t, onChanged }: { t: TagStats; onChanged: () => void }) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(t.name), [picking, setPicking] = useState(false)
  const save = async () => { setEditing(false); if (draft.trim() && draft.trim() !== t.name) { await tagsApi.update(t.id, { name: draft.trim() }); onChanged() } else setDraft(t.name) }
  const recolor = async (c: string) => { setPicking(false); await tagsApi.update(t.id, { color: c }); onChanged() }
  const used = [t.mediaCount && `${t.mediaCount} photo${t.mediaCount === 1 ? '' : 's'}`, t.albumCount && `${t.albumCount} album${t.albumCount === 1 ? '' : 's'}`, t.noteCount && `${t.noteCount} note${t.noteCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')
  const del = async () => { if (!confirm(used ? `Delete “${t.name}”? It will be removed from ${used}.` : `Delete “${t.name}”?`)) return; await tagsApi.delete(t.id); onChanged() }
  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <div className="relative">
        <button onClick={() => setPicking(v => !v)} title="Change colour" className="w-4 h-4 rounded-full block hover:scale-125 transition-transform" style={{ background: t.color || '#94a3b8' }} />
        {picking && <div className="absolute z-10 left-0 top-6 p-2 rounded-xl bg-white border border-slate-200 shadow-lg w-[176px]"><Swatches value={t.color} onPick={recolor} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(t.name); setEditing(false) } }} className="w-full text-sm font-medium px-2 py-1 -mx-2 rounded-md border border-pink-300 outline-none" />
          : <button onClick={() => setEditing(true)} className="text-sm font-medium text-slate-800 hover:text-pink-600 text-left truncate max-w-full" title="Rename">{t.name}</button>}
        <p className="text-xs text-slate-400 mt-0.5">{used || 'Not used yet'}</p>
      </div>
      <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block" title={`${t.mediaCount} photos`}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(Math.log10(1 + t.mediaCount) / 3 * 100))}%`, background: t.color || '#94a3b8' }} />
      </div>
      <button onClick={del} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-100 md:opacity-0 md:group-hover:opacity-100" title="Delete"><Trash2 size={15} /></button>
    </div>
  )
}
