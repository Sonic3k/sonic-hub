/* Pick photos for a memory: from an album (the memory's own albums first) or by searching captions and tags. */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, FolderOpen, Search } from 'lucide-react'
import clsx from 'clsx'
import api from '../../api/client'
import { collectionBrowseApi } from '../../api/collections'
import CollectionPicker from '../CollectionPicker'
import { Button, Modal } from '../ui'
import type { MediaFileResponse, MemoryCollectionRef } from '../../types'

type Source = { kind: 'album'; id: string; name: string } | { kind: 'search'; q: string }

export default function MediaPickerModal({ albums = [], already, onPick, onClose }: {
  /** the memory's own albums, offered first */
  albums?: MemoryCollectionRef[]
  /** ids already on the memory: shown ticked, not added twice */
  already: string[]
  onPick: (media: MediaFileResponse[]) => void
  onClose: () => void
}) {
  const [source, setSource] = useState<Source | null>(albums[0] ? { kind: 'album', id: albums[0].id, name: albums[0].name } : null)
  const [q, setQ] = useState('')
  const [browse, setBrowse] = useState(false)
  const [picked, setPicked] = useState<Map<string, MediaFileResponse>>(new Map())
  const have = new Set(already)

  const media = useQuery({
    queryKey: ['memory-picker', source],
    enabled: !!source,
    queryFn: async (): Promise<MediaFileResponse[]> => {
      if (!source) return []
      if (source.kind === 'album') return collectionBrowseApi.getCollectionMedia(source.id, 'effectiveDate', 'asc') as Promise<MediaFileResponse[]>
      const r = await api.get<{ content: MediaFileResponse[] }>('/api/media-files/search', { params: { q: source.q, size: 120, page: 0 } })
      return r.data.content
    },
  })
  useEffect(() => { setPicked(new Map()) }, [source])

  const toggle = (m: MediaFileResponse) => {
    if (have.has(m.id)) return
    setPicked(prev => { const n = new Map(prev); if (n.has(m.id)) n.delete(m.id); else n.set(m.id, m); return n })
  }
  const items = media.data ?? []

  return (
    <Modal title="Add photos" size="xl" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2 flex-1 min-w-[220px]" onSubmit={e => { e.preventDefault(); if (q.trim()) setSource({ kind: 'search', q: q.trim() }) }}>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search captions, tags…"
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none" />
            </div>
            <Button size="sm" variant="ghost" type="submit">Search</Button>
          </form>
          <button onClick={() => setBrowse(true)} className="flex items-center gap-1.5 text-xs text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-pink-300">
            <FolderOpen size={14} />Browse albums
          </button>
        </div>
        {albums.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {albums.map(a => (
              <button key={a.id} onClick={() => setSource({ kind: 'album', id: a.id, name: a.name })}
                className={clsx('text-xs px-2.5 py-1 rounded-full border transition-colors',
                  source?.kind === 'album' && source.id === a.id ? 'bg-pink-50 border-pink-200 text-pink-600' : 'border-slate-200 text-slate-500 hover:border-pink-300')}>
                {a.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">
          {!source ? 'Search, or open an album.' : source.kind === 'album' ? `Album: ${source.name}` : `Search: “${source.q}”`}
          {media.isFetching ? ' · loading…' : source ? ` · ${items.length} files` : ''}
        </p>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[52vh] overflow-y-auto">
          {items.map(m => {
            const on = picked.has(m.id), had = have.has(m.id), src = m.thumbnailUrl || m.cdnUrl
            return (
              <button key={m.id} type="button" onClick={() => toggle(m)} title={m.caption || m.fileName}
                className={clsx('relative aspect-square rounded-md overflow-hidden bg-slate-100', had && 'opacity-40 cursor-default')}>
                {src && <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />}
                {(on || had) && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>}
                {on && <span className="absolute inset-0 border-2 border-pink-500 rounded-md" />}
              </button>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onPick([...picked.values()])} disabled={!picked.size}>Add {picked.size || ''}</Button>
        </div>
      </div>
      {browse && <CollectionPicker title="Open an album" confirmLabel="Open"
        onSelect={(id, name) => { setSource({ kind: 'album', id, name }); setBrowse(false) }}
        onClose={() => setBrowse(false)} />}
    </Modal>
  )
}
