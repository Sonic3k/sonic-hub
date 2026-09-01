import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, FolderPlus, Trash2, X, Image as ImageIcon } from 'lucide-react'
import api from '../api/client'
import { mediaApi, uploadApi } from '../api/collections'
import { Lightbox, MediaItem } from '../components/media'
import CollectionPicker from '../components/CollectionPicker'
import type { MediaFileResponse } from '../types'

interface LibraryPageData {
  content: MediaFileResponse[]
  number: number
  last: boolean
  totalElements: number
}

const PAGE_SIZE = 100

function dayLabel(iso?: string) {
  if (!iso) return 'Unknown date'
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function LibraryPage() {
  const [fav, setFav] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaFileResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [picker, setPicker] = useState<string[] | null>(null) // ids to add
  const [deleting, setDeleting] = useState(false)
  const qc = useQueryClient()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['library', fav],
    queryFn: ({ pageParam = 0 }) =>
      api.get<LibraryPageData>('/api/media-files/library', { params: { page: pageParam, size: PAGE_SIZE, favorite: fav || undefined, inclDetails: true, inclPersons: true } })
        .then(r => r.data),
    initialPageParam: 0,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
  })

  const items: MediaFileResponse[] = useMemo(() => (data?.pages || []).flatMap(p => p.content), [data])
  const total = data?.pages?.[0]?.totalElements ?? 0

  // Group by day, preserving API order (effectiveDate desc)
  const sections = useMemo(() => {
    const out: { day: string; label: string; items: MediaFileResponse[] }[] = []
    for (const m of items) {
      const day = (m.effectiveDate || m.uploadedAt || '').slice(0, 10) || 'unknown'
      const lastSec = out[out.length - 1]
      if (lastSec && lastSec.day === day) lastSec.items.push(m)
      else out.push({ day, label: dayLabel(m.effectiveDate || m.uploadedAt), items: [m] })
    }
    return out
  }, [items])

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(onIntersect, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [onIntersect])

  const selectMode = selectedIds.size > 0
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['library'] }); qc.invalidateQueries({ queryKey: ['collections'] }) }
  const idsArr = () => Array.from(selectedIds)
  const allSelectedFavorite = idsArr().every(id => items.find(m => m.id === id)?.isFavorite)

  const handleFavoriteBatch = async () => {
    await mediaApi.favoriteBatch(idsArr(), !allSelectedFavorite)
    invalidate()
  }

  const handleDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} file(s)? This will also remove from storage.`)) return
    setDeleting(true)
    try {
      await uploadApi.deleteMedia(idsArr())
      setSelectedIds(new Set())
      invalidate()
    } catch { alert('Delete failed') }
    setDeleting(false)
  }

  const handleAddTo = async (targetId: string) => {
    if (!picker) return
    await mediaApi.addToCollectionBatch(targetId, picker)
    setPicker(null)
    setSelectedIds(new Set())
    invalidate()
  }

  return (
    <div className="p-3 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-lg md:text-xl font-semibold text-slate-800">Library</h1>
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-full p-0.5 text-xs">
          <button onClick={() => { setFav(false); setSelectedIds(new Set()) }}
            className={`px-3.5 py-1.5 rounded-full transition-colors ${!fav ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500'}`}>
            All
          </button>
          <button onClick={() => { setFav(true); setSelectedIds(new Set()) }}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full transition-colors ${fav ? 'bg-white text-pink-500 shadow-sm font-medium' : 'text-slate-500'}`}>
            <Heart size={11} fill={fav ? 'currentColor' : 'none'} />Favorites
          </button>
        </div>
        {total > 0 && <span className="text-[11px] text-slate-400">{total} items</span>}

        {/* Select toolbar */}
        {selectMode && (
          <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
            <span className="text-xs text-pink-500 font-medium mr-1">{selectedIds.size} selected</span>
            <button onClick={handleFavoriteBatch} title={allSelectedFavorite ? 'Unfavorite' : 'Favorite'}
              className={`p-1.5 rounded transition-colors ${allSelectedFavorite ? 'text-pink-500 bg-pink-50' : 'text-slate-400 hover:text-pink-500 hover:bg-pink-50'}`}>
              <Heart size={14} fill={allSelectedFavorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => setPicker(idsArr())} title="Add to collection"
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <FolderPlus size={14} />
            </button>
            <button onClick={handleDelete} disabled={deleting} title="Delete files"
              className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors">
              <Trash2 size={14} />
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-16">
          {fav ? <Heart size={36} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
               : <ImageIcon size={36} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />}
          <p className="text-sm text-slate-400">{fav ? 'No favorites yet' : 'No photos yet'}</p>
        </div>
      )}

      <div className="space-y-7">
        {sections.map(sec => (
          <div key={sec.day}>
            <h2 className="text-[13px] font-semibold text-slate-700 mb-2 capitalize sticky top-0 bg-[#fafafa]/90 backdrop-blur-sm py-1.5 z-[5] -mx-1 px-1">
              {sec.label}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 md:gap-2">
              {sec.items.map(m => (
                <MediaItem key={m.id} media={m}
                  onClick={() => setSelectedMedia(m)}
                  selected={selectedIds.has(m.id)}
                  onSelect={toggleSelect}
                  selectMode={selectMode} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <span className="text-xs text-slate-400 animate-pulse">Loading more...</span>}
      </div>

      {picker && (
        <CollectionPicker title={`Add ${picker.length} file(s) to...`} confirmLabel="Add"
          onSelect={handleAddTo} onClose={() => setPicker(null)} />
      )}

      {selectedMedia && (
        <Lightbox media={selectedMedia} allMedia={items} collectionId={null}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)}
          onChanged={m => { setSelectedMedia(m); invalidate() }}
          onAddTo={id => setPicker([id])} />
      )}
    </div>
  )
}
