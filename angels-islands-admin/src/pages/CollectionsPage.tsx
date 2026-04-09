import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, ChevronRight, Image, X, Calendar, Camera, MapPin, Maximize2, Info, ArrowLeft } from 'lucide-react'
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
      className="group cursor-pointer bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-pink-100/50 hover:-translate-y-0.5 transition-all duration-300">
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
        {collection.thumbnailUrl ? (
          <img src={collection.thumbnailUrl} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <FolderOpen size={32} strokeWidth={1.2} />
            <span className="text-xs">{collection.mediaCount || 0} files</span>
          </div>
        )}
        {(collection.childrenCount ?? 0) > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-slate-500 px-2 py-0.5 rounded-full">
            {collection.childrenCount} sub
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-pink-600 transition-colors truncate">{collection.name}</h3>
        <div className="flex items-center gap-3 mt-1.5">
          {(collection.mediaCount ?? 0) > 0 && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Image size={10} />{collection.mediaCount}</span>
          )}
          {collection.persons && collection.persons.length > 0 && (
            <span className="text-[11px] text-pink-400 truncate">
              {Array.from(collection.persons).map((p: { displayName?: string; name: string }) => p.displayName || p.name).join(', ')}
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
      className="group cursor-pointer rounded-xl overflow-hidden bg-slate-50 relative hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-200">
      <div className="aspect-square">
        {url ? (
          <img src={url} alt={media.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Image size={24} strokeWidth={1} />
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[10px] text-white/90 truncate">{media.fileName}</p>
      </div>
    </div>
  )
}

// ── Media Detail Modal ───────────────────────────────────────────────────────

function MediaDetailModal({ media, onClose }: { media: MediaFileResponse; onClose: () => void }) {
  const url = media.cdnUrl
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative flex w-full h-full" onClick={e => e.stopPropagation()}>
        {/* Image area */}
        <div className="flex-1 flex items-center justify-center p-4 min-w-0">
          {url ? (
            <img src={url} alt={media.fileName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          ) : (
            <div className="text-slate-500 text-sm">No preview</div>
          )}
        </div>

        {/* Info sidebar */}
        <div className="w-80 bg-white/95 backdrop-blur-md border-l border-slate-100 overflow-y-auto shrink-0 hidden md:block">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Info size={14} />Details</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>

            <div className="space-y-4">
              <DetailRow label="File" value={media.fileName} />
              <DetailRow label="Type" value={`${media.fileType}${media.mimeType ? ' · ' + media.mimeType : ''}`} />
              {media.width && media.height && <DetailRow label="Dimensions" value={`${media.width} × ${media.height} px`} icon={<Maximize2 size={11} />} />}
              {media.fileSize && <DetailRow label="Size" value={formatSize(media.fileSize)} />}
              {media.effectiveDate && <DetailRow label="Date" value={formatDate(media.effectiveDate)} icon={<Calendar size={11} />} />}
              {media.caption && <DetailRow label="Caption" value={media.caption} />}
            </div>
          </div>
        </div>

        {/* Close button (mobile) */}
        <button onClick={onClose}
          className="absolute top-4 right-4 md:hidden bg-black/50 text-white rounded-full p-2">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">{icon}{label}</div>
      <div className="text-xs text-slate-700 break-all">{value}</div>
    </div>
  )
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ items, onNavigate }: { items: { id: string; name: string }[]; onNavigate: (id: string | null) => void }) {
  return (
    <div className="flex items-center gap-1 text-xs flex-wrap mb-5">
      <button onClick={() => onNavigate(null)}
        className="text-slate-400 hover:text-pink-500 transition-colors font-medium">
        All
      </button>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-1">
          <ChevronRight size={10} className="text-slate-300" />
          <button
            onClick={() => i < items.length - 1 ? onNavigate(item.id) : null}
            className={`transition-colors font-medium ${
              i === items.length - 1 ? 'text-slate-800' : 'text-slate-400 hover:text-pink-500'
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

  // Top-level collections
  const { data: topLevel = [], isLoading: loadingTop } = useQuery({
    queryKey: ['collections', 'top'],
    queryFn: () => collectionBrowseApi.getTopLevel(),
    enabled: !currentId,
  })

  // Current collection's children
  const { data: children = [] } = useQuery({
    queryKey: ['collections', currentId, 'children'],
    queryFn: () => collectionBrowseApi.getChildren(currentId!),
    enabled: !!currentId,
  })

  // Current collection's media
  const { data: media = [] } = useQuery({
    queryKey: ['collections', currentId, 'media'],
    queryFn: () => collectionBrowseApi.getCollectionMedia(currentId!),
    enabled: !!currentId,
  })

  // Breadcrumb
  const { data: breadcrumb = [] } = useQuery({
    queryKey: ['collections', currentId, 'breadcrumb'],
    queryFn: () => collectionBrowseApi.getBreadcrumb(currentId!),
    enabled: !!currentId,
  })

  // Current collection detail
  const { data: current } = useQuery({
    queryKey: ['collections', currentId, 'detail'],
    queryFn: () => collectionBrowseApi.getById(currentId!),
    enabled: !!currentId,
  })

  const navigate = (id: string | null) => setCurrentId(id)

  const collections = currentId ? children : topLevel
  const isLoading = !currentId && loadingTop

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        {currentId ? (
          <>
            <button onClick={() => {
              // Go up one level
              if (breadcrumb.length > 1) navigate(breadcrumb[breadcrumb.length - 2].id)
              else navigate(null)
            }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-pink-500 mb-3 transition-colors">
              <ArrowLeft size={12} />Back
            </button>
            <Breadcrumb items={breadcrumb} onNavigate={navigate} />
            {current && (
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-800">{current.name}</h1>
                {current.description && <p className="text-xs text-slate-400">{current.description}</p>}
              </div>
            )}
          </>
        ) : (
          <h1 className="text-xl font-semibold text-slate-800">Collections</h1>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}

      {/* Sub-collections */}
      {collections.length > 0 && (
        <div className="mb-8">
          {currentId && <h2 className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">Folders</h2>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {collections.map((c: CollectionResponse) => (
              <CollectionCard key={c.id} collection={c} onClick={() => navigate(c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Media grid */}
      {currentId && media.length > 0 && (
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
            Photos & Videos · {media.length}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {media.map((m: MediaFileResponse) => (
              <MediaItem key={m.id} media={m} onClick={() => setSelectedMedia(m)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {currentId && collections.length === 0 && media.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
          <p className="text-sm text-slate-400">This collection is empty</p>
        </div>
      )}

      {!currentId && collections.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <FolderOpen size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
          <p className="text-sm text-slate-400">No collections yet. Upload a folder to get started.</p>
        </div>
      )}

      {/* Media detail modal */}
      {selectedMedia && (
        <MediaDetailModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  )
}
