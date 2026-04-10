import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, ChevronRight, ChevronLeft, Image, X, Info, ArrowLeft } from 'lucide-react'
import { collectionBrowseApi } from '../api/collections'
import type { CollectionResponse, MediaFileResponse } from '../types'

function formatDate(d?: string) {
  if (!d) return null
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatSize(bytes?: number) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection, onClick }: { collection: CollectionResponse; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="group cursor-pointer bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-pink-100/50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
        {collection.thumbnailUrl ? (
          <img src={collection.thumbnailUrl} alt={collection.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-300">
            <FolderOpen size={28} strokeWidth={1.2} />
            <span className="text-[10px]">{collection.mediaCount || 0} files</span>
          </div>
        )}
        {(collection.childrenCount ?? 0) > 0 && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[9px] font-bold text-slate-500 px-1.5 py-0.5 rounded-full">
            {collection.childrenCount} sub
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-[13px] font-semibold text-slate-800 group-hover:text-pink-600 transition-colors truncate">{collection.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          {(collection.mediaCount ?? 0) > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Image size={9} />{collection.mediaCount}</span>
          )}
          {collection.persons && collection.persons.length > 0 && (
            <span className="text-[10px] text-pink-400 truncate">
              {collection.persons.map(p => p.displayName || p.name).join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Media Grid Item ──────────────────────────────────────────────────────────

function MediaItem({ media, onClick }: { media: MediaFileResponse; onClick: () => void }) {
  const url = media.thumbnailUrl || media.cdnUrl
  return (
    <div onClick={onClick}
      className="cursor-pointer rounded-lg overflow-hidden bg-slate-100 relative active:scale-[0.97] transition-transform duration-100">
      <div className="aspect-square">
        {url ? (
          <img src={url} alt={media.fileName} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Image size={20} strokeWidth={1} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Media Detail Modal (lightbox + swipe on mobile) ──────────────────────────

function MediaDetailModal({ media, allMedia, onClose, onNavigate }: {
  media: MediaFileResponse; allMedia: MediaFileResponse[]; onClose: () => void; onNavigate: (m: MediaFileResponse) => void
}) {
  const [showInfo, setShowInfo] = useState(false)
  const idx = allMedia.findIndex(m => m.id === media.id)
  const prev = idx > 0 ? allMedia[idx - 1] : null
  const next = idx < allMedia.length - 1 ? allMedia[idx + 1] : null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white/60 text-xs truncate max-w-[60%]">{media.fileName}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowInfo(!showInfo)}
            className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <Info size={18} />
          </button>
          <button onClick={onClose}
            className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image + navigation */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-2" onClick={e => e.stopPropagation()}>
        {/* Prev button */}
        {prev && (
          <button onClick={() => onNavigate(prev)}
            className="absolute left-1 md:left-4 z-10 bg-black/40 hover:bg-black/60 text-white/80 rounded-full p-2 transition-colors">
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Image */}
        {media.cdnUrl ? (
          <img src={media.cdnUrl} alt={media.fileName}
            className="max-w-full max-h-full object-contain select-none" onClick={onClose} />
        ) : (
          <div className="text-slate-500 text-sm">No preview</div>
        )}

        {/* Next button */}
        {next && (
          <button onClick={() => onNavigate(next)}
            className="absolute right-1 md:right-4 z-10 bg-black/40 hover:bg-black/60 text-white/80 rounded-full p-2 transition-colors">
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="text-center text-white/40 text-[11px] py-1 shrink-0" onClick={e => e.stopPropagation()}>
        {idx + 1} / {allMedia.length}
      </div>

      {/* Info bottom sheet */}
      {showInfo && (
        <div className="bg-white rounded-t-2xl p-5 shrink-0 max-h-[40vh] overflow-y-auto animate-slide-up safe-bottom"
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-center mb-3 md:hidden">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <InfoCell label="File" value={media.fileName} span={2} />
            <InfoCell label="Type" value={media.mimeType} />
            <InfoCell label="Size" value={formatSize(media.fileSize)} />
            {media.width && media.height && <InfoCell label="Dimensions" value={`${media.width} × ${media.height}`} />}
            {media.effectiveDate && <InfoCell label="Date" value={formatDate(media.effectiveDate)} />}
            {media.caption && <InfoCell label="Caption" value={media.caption} span={2} />}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCell({ label, value, span }: { label: string; value?: string | null; span?: number }) {
  if (!value) return null
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{label}</div>
      <div className="text-slate-700 break-all">{value}</div>
    </div>
  )
}

// ── Breadcrumb (horizontal scroll on mobile) ─────────────────────────────────

function Breadcrumb({ items, onNavigate }: { items: { id: string; name: string }[]; onNavigate: (id: string | null) => void }) {
  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto scroll-snap-x pb-1 mb-4 -mx-1 px-1">
      <button onClick={() => onNavigate(null)}
        className="text-slate-400 hover:text-pink-500 transition-colors font-medium shrink-0 active:text-pink-600">
        All
      </button>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight size={10} className="text-slate-300" />
          <button
            onClick={() => i < items.length - 1 ? onNavigate(item.id) : null}
            className={`transition-colors font-medium whitespace-nowrap ${
              i === items.length - 1 ? 'text-slate-800' : 'text-slate-400 hover:text-pink-500 active:text-pink-600'
            }`}>
            {item.name}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<MediaFileResponse | null>(null)

  const { data: topLevel = [], isLoading: loadingTop } = useQuery({
    queryKey: ['collections', 'top'],
    queryFn: () => collectionBrowseApi.getTopLevel(),
    enabled: !currentId,
  })

  const { data: children = [] } = useQuery({
    queryKey: ['collections', currentId, 'children'],
    queryFn: () => collectionBrowseApi.getChildren(currentId!),
    enabled: !!currentId,
  })

  const { data: media = [] } = useQuery({
    queryKey: ['collections', currentId, 'media'],
    queryFn: () => collectionBrowseApi.getCollectionMedia(currentId!),
    enabled: !!currentId,
  })

  const { data: breadcrumb = [] } = useQuery({
    queryKey: ['collections', currentId, 'breadcrumb'],
    queryFn: () => collectionBrowseApi.getBreadcrumb(currentId!),
    enabled: !!currentId,
  })

  const { data: current } = useQuery({
    queryKey: ['collections', currentId, 'detail'],
    queryFn: () => collectionBrowseApi.getById(currentId!),
    enabled: !!currentId,
  })

  const navigate = (id: string | null) => setCurrentId(id)
  const collections = currentId ? children : topLevel
  const isLoading = !currentId && loadingTop

  return (
    <div className="p-3 md:p-6 lg:p-8">
      {/* Header */}
      {currentId ? (
        <div className="mb-4">
          <button onClick={() => {
            if (breadcrumb.length > 1) navigate(breadcrumb[breadcrumb.length - 2].id)
            else navigate(null)
          }} className="flex items-center gap-1 text-xs text-slate-400 active:text-pink-500 mb-2">
            <ArrowLeft size={12} />Back
          </button>
          <Breadcrumb items={breadcrumb} onNavigate={navigate} />
          {current && (
            <h1 className="text-lg md:text-xl font-semibold text-slate-800">{current.name}</h1>
          )}
        </div>
      ) : (
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 mb-5">Collections</h1>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}

      {/* Sub-collections */}
      {collections.length > 0 && (
        <div className="mb-6">
          {currentId && <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2.5">Folders</h2>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {collections.map((c: CollectionResponse) => (
              <CollectionCard key={c.id} collection={c} onClick={() => navigate(c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Media grid */}
      {currentId && media.length > 0 && (
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2.5">
            Photos & Videos · {media.length}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 md:gap-2">
            {media.map((m: MediaFileResponse) => (
              <MediaItem key={m.id} media={m} onClick={() => setSelectedMedia(m)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty states */}
      {currentId && collections.length === 0 && media.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen size={36} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
          <p className="text-sm text-slate-400">Empty collection</p>
        </div>
      )}
      {!currentId && collections.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FolderOpen size={36} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
          <p className="text-sm text-slate-400">No collections yet</p>
        </div>
      )}

      {/* Media detail */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          allMedia={media}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)}
        />
      )}
    </div>
  )
}
