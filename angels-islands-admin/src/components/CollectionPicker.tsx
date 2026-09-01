import { useState } from 'react'
import { ChevronRight, FolderOpen, Plus, Check } from 'lucide-react'
import { collectionBrowseApi, collectionsApi } from '../api/collections'
import type { CollectionResponse } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Props {
  title: string
  confirmLabel?: string
  /** hide this collection and its subtree (for move-collection) */
  excludeId?: string
  /** when set, show a "Top level" row that selects this id (system root) */
  topLevelId?: string
  onSelect: (id: string, name: string) => void
  onClose: () => void
}

function Row({ c, depth, excludeId, selectedId, onPick, expanded, toggle, childrenMap }: {
  c: CollectionResponse; depth: number; excludeId?: string; selectedId: string | null
  onPick: (id: string, name: string) => void
  expanded: Set<string>; toggle: (id: string) => void
  childrenMap: Record<string, CollectionResponse[]>
}) {
  if (c.id === excludeId) return null
  const isOpen = expanded.has(c.id)
  const kids = childrenMap[c.id]
  return (
    <>
      <div onClick={() => onPick(c.id, c.name)}
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
          selectedId === c.id ? 'bg-pink-50 text-pink-600' : 'text-slate-700 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${8 + depth * 18}px` }}>
        {(c.childrenCount ?? 0) > 0 ? (
          <button onClick={e => { e.stopPropagation(); toggle(c.id) }}
            className="p-0.5 text-slate-300 hover:text-slate-500">
            <ChevronRight size={13} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        ) : <span className="w-[18px]" />}
        <FolderOpen size={14} className={selectedId === c.id ? 'text-pink-400' : 'text-slate-300'} />
        <span className="truncate flex-1">{c.name}</span>
        {selectedId === c.id && <Check size={14} className="text-pink-500" />}
      </div>
      {isOpen && kids?.map(k => (
        <Row key={k.id} c={k} depth={depth + 1} excludeId={excludeId} selectedId={selectedId}
          onPick={onPick} expanded={expanded} toggle={toggle} childrenMap={childrenMap} />
      ))}
    </>
  )
}

export default function CollectionPicker({ title, confirmLabel = 'Choose', excludeId, topLevelId, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [childrenMap, setChildrenMap] = useState<Record<string, CollectionResponse[]>>({})
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()

  const { data: topLevel = [] } = useQuery({
    queryKey: ['collections', 'top'],
    queryFn: () => collectionBrowseApi.getTopLevel(),
  })

  const toggle = async (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    if (!childrenMap[id]) {
      const kids = await collectionBrowseApi.getChildren(id)
      setChildrenMap(prev => ({ ...prev, [id]: kids }))
    }
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      // Create under the selected collection, else top-level
      const created = await collectionsApi.create({
        name,
        parentId: selected && selected.id !== topLevelId ? selected.id : undefined,
      })
      qc.invalidateQueries({ queryKey: ['collections'] })
      onSelect(created.id, created.name)
    } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5 flex flex-col max-h-[80dvh]">
        <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>

        <div className="flex-1 overflow-y-auto -mx-2 px-2 min-h-[200px]">
          {topLevelId && (
            <div onClick={() => setSelected({ id: topLevelId, name: 'Top level' })}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                selected?.id === topLevelId ? 'bg-pink-50 text-pink-600' : 'text-slate-700 hover:bg-slate-50'
              }`}>
              <span className="w-[18px]" />
              <FolderOpen size={14} className={selected?.id === topLevelId ? 'text-pink-400' : 'text-slate-300'} />
              <span className="flex-1 italic">Top level</span>
              {selected?.id === topLevelId && <Check size={14} className="text-pink-500" />}
            </div>
          )}
          {topLevel.map((c: CollectionResponse) => (
            <Row key={c.id} c={c} depth={0} excludeId={excludeId} selectedId={selected?.id ?? null}
              onPick={(id, name) => setSelected({ id, name })}
              expanded={expanded} toggle={toggle} childrenMap={childrenMap} />
          ))}
          {topLevel.length === 0 && <p className="text-xs text-slate-400 px-2 py-4">No collections yet</p>}
        </div>

        {/* New collection inline */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <Plus size={14} className="text-slate-300 shrink-0" />
          <input className="flex-1 px-2 py-1.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none"
            placeholder={selected && selected.id !== topLevelId ? `New inside "${selected.name}"...` : 'New collection...'}
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          {newName.trim() && (
            <button onClick={handleCreate} disabled={creating}
              className="text-xs text-pink-500 font-medium px-2 py-1.5 hover:bg-pink-50 rounded disabled:opacity-50">Create</button>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={() => selected && onSelect(selected.id, selected.name)} disabled={!selected}
            className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
