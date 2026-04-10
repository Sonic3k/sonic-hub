import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, ChevronRight, ChevronLeft, Image, ArrowLeft, Camera, MapPin, FileText, Clock, Film, Info } from 'lucide-react'
import { collectionBrowseApi } from '../api/collections'
import type { CollectionResponse, MediaFileResponse } from '../types'

function fmtDate(d?: string) {
  if (!d) return null
  const dt = new Date(d)
  return dt.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function fmtSize(bytes?: number) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fmtDuration(sec?: number) {
  if (!sec) return null
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
  return (
    <div onClick={onClick}
      className="cursor-pointer rounded-lg overflow-hidden bg-slate-100 relative active:scale-[0.97] transition-transform duration-100">
      <div className="aspect-square">
        {(media.thumbnailUrl || media.cdnUrl) ? (
          <img src={media.thumbnailUrl || media.cdnUrl} alt={media.fileName} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={20} strokeWidth={1} /></div>
        )}
      </div>
      {media.fileType === 'VIDEO' && (
        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded">
          {fmtDuration(media.duration) || '▶'}
        </div>
      )}
    </div>
  )
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ media, allMedia, onClose, onNavigate }: {
  media: MediaFileResponse; allMedia: MediaFileResponse[]; onClose: () => void; onNavigate: (m: MediaFileResponse) => void
}) {
  const [showInfo, setShowInfo] = useState(false)
  const idx = allMedia.findIndex(m => m.id === media.id)
  const prev = idx > 0 ? allMedia[idx - 1] : null
  const next = idx < allMedia.length - 1 ? allMedia[idx + 1] : null
  const exif = media.imageDetail
  const vid = media.videoDetail

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && prev) onNavigate(prev)
    if (e.key === 'ArrowRight' && next) onNavigate(next)
    if (e.key === 'i') setShowInfo(v => !v)
  }, [prev, next, onClose, onNavigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [handleKey])

  const cameraStr = [exif?.cameraMake, exif?.cameraModel].filter(Boolean).join(' ')
  const settingsStr = [
    exif?.focalLength ? `${exif.focalLength}mm` : null,
    exif?.aperture ? `ƒ/${exif.aperture}` : null,
    exif?.shutterSpeed,
    exif?.iso ? `ISO ${exif.iso}` : null,
  ].filter(Boolean).join('  ·  ')

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* ── Image area — takes FULL screen ──────────────── */}
      <div className="absolute inset-0 flex items-center justify-center"
        onClick={onClose}>
        {media.cdnUrl ? (
          <img src={media.cdnUrl} alt={media.fileName}
            className="max-w-full max-h-full object-contain select-none" />
        ) : (
          <div className="text-white/30 text-sm">No preview</div>
        )}
      </div>

      {/* ── Floating controls (overlay) ────────────────── */}
      {/* Close */}
      <button onClick={e => { e.stopPropagation(); onClose() }}
        className="absolute top-3 left-3 md:top-4 md:left-4 z-20 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
        <ArrowLeft size={22} />
      </button>

      {/* Counter + Info toggle */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-2">
        <span className="text-white/40 text-xs tabular-nums">{idx + 1} / {allMedia.length}</span>
        <button onClick={e => { e.stopPropagation(); setShowInfo(!showInfo) }}
          className={`p-2 rounded-full transition-colors ${showInfo ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
          <Info size={20} />
        </button>
      </div>

      {/* Prev / Next */}
      {prev && (
        <button onClick={e => { e.stopPropagation(); onNavigate(prev) }}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/20 hover:bg-black/40 text-white/60 hover:text-white rounded-full p-2.5 transition-all">
          <ChevronLeft size={24} />
        </button>
      )}
      {next && (
        <button onClick={e => { e.stopPropagation(); onNavigate(next) }}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/20 hover:bg-black/40 text-white/60 hover:text-white rounded-full p-2.5 transition-all">
          <ChevronRight size={24} />
        </button>
      )}

      {/* ── Desktop: side info panel ───────────────────── */}
      {showInfo && (
        <div className="hidden md:block absolute top-0 right-0 bottom-0 w-80 bg-[#111]/95 backdrop-blur-md border-l border-white/5 overflow-y-auto z-30"
          onClick={e => e.stopPropagation()}>
          <InfoContent media={media} cameraStr={cameraStr} settingsStr={settingsStr} exif={exif} vid={vid} />
        </div>
      )}

      {/* ── Mobile: bottom sheet ───────────────────────── */}
      {showInfo && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-md border-t border-white/5 max-h-[55vh] overflow-y-auto animate-slide-up safe-bottom rounded-t-2xl z-30"
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 rounded-full bg-white/15" /></div>
          <InfoContent media={media} cameraStr={cameraStr} settingsStr={settingsStr} exif={exif} vid={vid} />
        </div>
      )}
    </div>
  )
}

// ── Info Content (shared between side panel & bottom sheet) ──────────────────

function InfoContent({ media, cameraStr, settingsStr, exif, vid }: {
  media: MediaFileResponse; cameraStr: string; settingsStr: string
  exif?: MediaFileResponse['imageDetail']; vid?: MediaFileResponse['videoDetail']
}) {
  return (
    <div className="p-4 md:p-5 space-y-5">
      {/* Date */}
      {(media.dateTaken || media.effectiveDate) && (
        <InfoSection icon={<Clock size={15} />} title="Date">
          <p className="text-white/80 text-sm">{fmtDate(media.dateTaken || media.effectiveDate)}</p>
          {media.dateTaken && media.uploadedAt && media.dateTaken !== media.uploadedAt && (
            <p className="text-white/30 text-[11px] mt-0.5">Uploaded {fmtDate(media.uploadedAt)}</p>
          )}
        </InfoSection>
      )}

      {/* Camera & EXIF */}
      {(cameraStr || settingsStr) && (
        <InfoSection icon={<Camera size={15} />} title="Camera">
          {cameraStr && <p className="text-white/80 text-sm">{cameraStr}</p>}
          {exif?.lensModel && <p className="text-white/40 text-xs mt-0.5">{exif.lensModel}</p>}
          {settingsStr && <p className="text-white/60 text-xs font-mono mt-1.5">{settingsStr}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
            {exif?.flashFired != null && <span className="text-white/40">{exif.flashFired ? '⚡ Flash' : '⚡ No flash'}</span>}
            {exif?.whiteBalance && <span className="text-white/40">WB: {exif.whiteBalance}</span>}
            {exif?.exposureMode && <span className="text-white/40">{exif.exposureMode}</span>}
            {exif?.meteringMode && <span className="text-white/40">{exif.meteringMode}</span>}
            {exif?.colorSpace && <span className="text-white/40">{exif.colorSpace}</span>}
          </div>
        </InfoSection>
      )}

      {/* Video */}
      {vid && (
        <InfoSection icon={<Film size={15} />} title="Video">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {vid.videoCodec && <InfoKV label="Codec" value={vid.videoCodec} />}
            {vid.audioCodec && <InfoKV label="Audio" value={vid.audioCodec} />}
            {vid.fps && <InfoKV label="FPS" value={`${vid.fps}`} />}
            {vid.bitrate && <InfoKV label="Bitrate" value={`${(vid.bitrate / 1000).toFixed(0)} kbps`} />}
            {media.duration && <InfoKV label="Duration" value={fmtDuration(media.duration)!} />}
          </div>
        </InfoSection>
      )}

      {/* Location */}
      {(media.latitude || media.displayedAddress) && (
        <InfoSection icon={<MapPin size={15} />} title="Location">
          {media.displayedAddress && <p className="text-white/80 text-sm">{media.displayedAddress}</p>}
          {media.latitude && media.longitude && (
            <p className="text-white/30 text-[11px] font-mono mt-0.5">
              {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
            </p>
          )}
        </InfoSection>
      )}

      {/* File details */}
      <InfoSection icon={<FileText size={15} />} title="File">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoKV label="Name" value={media.fileName} span />
          <InfoKV label="Type" value={media.mimeType || media.fileType} />
          <InfoKV label="Size" value={fmtSize(media.fileSize) || '—'} />
          {media.width && media.height && <InfoKV label="Dimensions" value={`${media.width} × ${media.height}`} />}
          {media.orientation && <InfoKV label="Orientation" value={media.orientation} />}
        </div>
      </InfoSection>

      {/* Tags / Classification */}
      {exif && (exif.isSelfie || exif.isScreenshot || exif.isPanorama || exif.isPortrait || exif.software) && (
        <div className="flex flex-wrap gap-1.5">
          {exif.isSelfie && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">Selfie</span>}
          {exif.isScreenshot && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">Screenshot</span>}
          {exif.isPanorama && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">Panorama</span>}
          {exif.isPortrait && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">Portrait</span>}
          {exif.software && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">{exif.software}</span>}
        </div>
      )}
    </div>
  )
}

function InfoSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/30">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{title}</span>
      </div>
      {children}
    </div>
  )
}

function InfoKV({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-white/30 text-[10px]">{label}</div>
      <div className="text-white/70 truncate">{value}</div>
    </div>
  )
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ items, onNavigate }: { items: { id: string; name: string }[]; onNavigate: (id: string | null) => void }) {
  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto scroll-snap-x pb-1 mb-4 -mx-1 px-1">
      <button onClick={() => onNavigate(null)}
        className="text-slate-400 hover:text-pink-500 active:text-pink-600 transition-colors font-medium shrink-0">All</button>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight size={10} className="text-slate-300" />
          <button onClick={() => i < items.length - 1 ? onNavigate(item.id) : null}
            className={`transition-colors font-medium whitespace-nowrap ${
              i === items.length - 1 ? 'text-slate-800' : 'text-slate-400 hover:text-pink-500'
            }`}>{item.name}</button>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<MediaFileResponse | null>(null)

  const { data: topLevel = [], isLoading } = useQuery({
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

  return (
    <div className="p-3 md:p-6 lg:p-8">
      {currentId ? (
        <div className="mb-4">
          <button onClick={() => {
            if (breadcrumb.length > 1) navigate(breadcrumb[breadcrumb.length - 2].id)
            else navigate(null)
          }} className="flex items-center gap-1 text-xs text-slate-400 active:text-pink-500 mb-2">
            <ArrowLeft size={12} />Back
          </button>
          <Breadcrumb items={breadcrumb} onNavigate={navigate} />
          {current && <h1 className="text-lg md:text-xl font-semibold text-slate-800">{current.name}</h1>}
        </div>
      ) : (
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 mb-5">Collections</h1>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}

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

      {selectedMedia && (
        <Lightbox media={selectedMedia} allMedia={media}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)} />
      )}
    </div>
  )
}
