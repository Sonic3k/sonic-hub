import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, ChevronRight, ChevronLeft, Image, ArrowLeft, Camera, MapPin, FileText, Clock, Film, Info, Trash2, X, Check, Plus, FolderPlus, ImagePlus } from 'lucide-react'
import { collectionBrowseApi, uploadApi, collectionsApi } from '../api/collections'
import type { CollectionResponse, MediaFileResponse } from '../types'

function fmtDate(d?: string) {
  if (!d) return null
  // API returns LocalDateTime (UTC) without Z suffix — ensure parsed as UTC
  const dt = new Date(d.endsWith('Z') ? d : d + 'Z')
  return dt.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
    + ' · ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
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

function MediaItem({ media, onClick, selected, onSelect, selectMode }: {
  media: MediaFileResponse; onClick: () => void
  selected: boolean; onSelect: (id: string) => void; selectMode: boolean
}) {
  return (
    <div className="relative cursor-pointer rounded-lg overflow-hidden bg-slate-100 group active:scale-[0.97] transition-transform duration-100">
      <div className="aspect-square" onClick={() => selectMode ? onSelect(media.id) : onClick()}>
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
      {/* Select checkbox — visible on hover or when in select mode */}
      <div className={`absolute top-1.5 left-1.5 transition-opacity ${
        selected || selectMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <button onClick={e => { e.stopPropagation(); onSelect(media.id) }}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            selected
              ? 'bg-pink-500 text-white shadow-md'
              : 'bg-black/30 hover:bg-black/50 text-white/70 backdrop-blur-sm'
          }`}>
          {selected ? <Check size={14} strokeWidth={3} /> : null}
        </button>
      </div>
      {/* Selected overlay */}
      {selected && <div className="absolute inset-0 bg-pink-500/10 border-2 border-pink-500 rounded-lg pointer-events-none" />}
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
    <div className="fixed inset-0 z-50 bg-black flex">
      {/* ── Image area — shrinks when info panel opens ── */}
      <div className="flex-1 relative flex items-center justify-center min-w-0 transition-all duration-300">
        {/* Image */}
        {media.cdnUrl ? (
          <img src={media.cdnUrl} alt={media.fileName}
            className="max-w-full max-h-full object-contain select-none p-2" />
        ) : (
          <div className="text-white/30 text-sm">No preview</div>
        )}

        {/* ── Floating controls ────────────────────────── */}
        {/* Back */}
        <button onClick={onClose}
          className="absolute top-3 left-3 md:top-4 md:left-4 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={22} />
        </button>

        {/* Counter + Info */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-2">
          <span className="text-white/40 text-xs tabular-nums">{idx + 1} / {allMedia.length}</span>
          <button onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors ${showInfo ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
            <Info size={20} />
          </button>
        </div>

        {/* Prev */}
        {prev && (
          <button onClick={() => onNavigate(prev)}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white/60 hover:text-white rounded-full p-2.5 transition-all">
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Next */}
        {next && (
          <button onClick={() => onNavigate(next)}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white/60 hover:text-white rounded-full p-2.5 transition-all">
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* ── Desktop: side info panel (pushes image left) ── */}
      <div className={`hidden md:flex flex-col bg-[#111] border-l border-white/5 overflow-hidden transition-all duration-300 ${
        showInfo ? 'w-80' : 'w-0'
      }`}>
        <div className="w-80 h-full overflow-y-auto">
          <InfoContent media={media} cameraStr={cameraStr} settingsStr={settingsStr} exif={exif} vid={vid} />
        </div>
      </div>

      {/* ── Mobile: bottom sheet ───────────────────────── */}
      {showInfo && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-md border-t border-white/5 max-h-[55vh] overflow-y-auto animate-slide-up safe-bottom rounded-t-2xl z-10">
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newCollName, setNewCollName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sort, setSort] = useState<string>('effectiveDate')
  const addPhotosRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

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
    queryKey: ['collections', currentId, 'media', sort],
    queryFn: () => collectionBrowseApi.getCollectionMedia(currentId!, sort),
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

  const navigate = (id: string | null) => { setCurrentId(id); setSelectedIds(new Set()) }
  const collections = currentId ? children : topLevel
  const selectMode = selectedIds.size > 0

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} file(s)? This will also remove from storage.`)) return
    setDeleting(true)
    try {
      await uploadApi.deleteMedia(Array.from(selectedIds))
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['collections', currentId, 'media'] })
    } catch (err) { alert('Delete failed') }
    setDeleting(false)
  }

  const handleAddPhotos = async (files: FileList) => {
    if (!currentId || !files.length) return
    setUploading(true)
    let count = 0
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
      try {
        const media = await uploadApi.uploadFile(file, undefined, currentId)
        await uploadApi.linkMediaToCollection(currentId, media.id)
        count++
      } catch {}
    }
    setUploading(false)
    if (count > 0) qc.invalidateQueries({ queryKey: ['collections', currentId, 'media'] })
  }

  const handleCreateSubCollection = async () => {
    if (!currentId || !newCollName.trim()) return
    await collectionsApi.create({ name: newCollName.trim(), parentId: currentId })
    setNewCollName('')
    setShowNewCollection(false)
    qc.invalidateQueries({ queryKey: ['collections', currentId, 'children'] })
  }

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
          <div className="flex items-center gap-3">
            {current && <h1 className="text-lg md:text-xl font-semibold text-slate-800 flex-1">{current.name}</h1>}
            {/* + Add menu */}
            <div className="relative">
              <button onClick={() => setShowAddMenu(!showAddMenu)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  showAddMenu ? 'bg-pink-500 text-white rotate-45' : 'bg-white border border-slate-200 text-slate-500 hover:border-pink-300 hover:text-pink-500'
                }`}>
                <Plus size={20} />
              </button>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                  <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-48">
                    <button onClick={() => { addPhotosRef.current?.click(); setShowAddMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <ImagePlus size={16} className="text-slate-400" />Add photos
                    </button>
                    <button onClick={() => { setShowNewCollection(true); setShowAddMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <FolderPlus size={16} className="text-slate-400" />New sub-collection
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Hidden file input */}
          <input ref={addPhotosRef} type="file" multiple accept="image/*,video/*" className="hidden"
            onChange={e => { if (e.target.files) handleAddPhotos(e.target.files); e.target.value = '' }} />
          {/* Upload progress */}
          {uploading && <p className="text-xs text-pink-500 mt-2 animate-pulse">Uploading...</p>}
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
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Photos & Videos · {media.length}
            </h2>
            <div className="flex items-center gap-1">
              {/* Sort options */}
              {[
                { key: 'effectiveDate', label: 'Date' },
                { key: 'name', label: 'Name' },
                { key: 'uploadedAt', label: 'Added' },
              ].map(s => (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                    sort === s.key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}>{s.label}</button>
              ))}
            </div>
            {selectMode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-pink-500 font-medium">{selectedIds.size} selected</span>
                <button onClick={() => { const all = new Set<string>(media.map((m: MediaFileResponse) => m.id)); setSelectedIds(prev => prev.size === all.size ? new Set<string>() : all) }}
                  className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">
                  {selectedIds.size === media.length ? 'Deselect all' : 'Select all'}
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 disabled:opacity-50">
                  <Trash2 size={12} />{deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 md:gap-2">
            {media.map((m: MediaFileResponse) => (
              <MediaItem key={m.id} media={m}
                onClick={() => setSelectedMedia(m)}
                selected={selectedIds.has(m.id)}
                onSelect={toggleSelect}
                selectMode={selectMode} />
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

      {/* New sub-collection modal */}
      {showNewCollection && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewCollection(false)} />
          <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
            <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">New sub-collection</h3>
            <input className="w-full px-3 py-2.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50 outline-none mb-3"
              placeholder="Collection name..." value={newCollName} onChange={e => setNewCollName(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreateSubCollection()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewCollection(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleCreateSubCollection} disabled={!newCollName.trim()}
                className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Media detail lightbox */}
      {selectedMedia && (
        <Lightbox media={selectedMedia} allMedia={media}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)} />
      )}
    </div>
  )
}
