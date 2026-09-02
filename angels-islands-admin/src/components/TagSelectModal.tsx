import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTags } from '../hooks/useTags'
import { tagsApi } from '../api/tags'
import type { TagResponse } from '../types'

const PALETTE = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1']

export function TagChip({ tag, onClick, active, onRemove }: {
  tag: TagResponse; onClick?: () => void; active?: boolean; onRemove?: () => void
}) {
  return (
    <span onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${onClick ? 'cursor-pointer active:scale-95' : ''} ${
        active ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-pink-300'
      }`}
      style={active ? { background: tag.color || '#ec4899' } : undefined}>
      {!active && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tag.color || '#94a3b8' }} />}
      {tag.name}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove() }} className="opacity-60 hover:opacity-100 -mr-0.5">×</button>
      )}
    </span>
  )
}

export default function TagSelectModal({ title, onSelect, onClose }: {
  title: string
  onSelect: (tag: TagResponse) => void
  onClose: () => void
}) {
  const { data: tags = [] } = useTags()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const created = await tagsApi.create({ name, color: PALETTE[tags.length % PALETTE.length] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      onSelect(created)
    } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
        <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
        <div className="flex flex-wrap gap-1.5 mb-4 max-h-60 overflow-y-auto">
          {tags.map(t => <TagChip key={t.id} tag={t} onClick={() => onSelect(t)} />)}
          {tags.length === 0 && <p className="text-xs text-slate-400">Chưa có tag nào — tạo cái đầu tiên bên dưới</p>}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <Plus size={14} className="text-slate-300 shrink-0" />
          <input className="flex-1 px-2 py-1.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none"
            placeholder="Tag mới (vd: Travel, Family)..."
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          {newName.trim() && (
            <button onClick={handleCreate} disabled={creating}
              className="text-xs text-pink-500 font-medium px-2 py-1.5 hover:bg-pink-50 rounded disabled:opacity-50">Create</button>
          )}
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  )
}
