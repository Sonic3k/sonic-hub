import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronLeft, Image, ArrowLeft, Camera, MapPin, FileText, Clock, Film, Info, X, Check, FolderPlus, Heart, ImageIcon, Users } from 'lucide-react'
import { mediaApi } from '../api/collections'
import { usePersons } from '../hooks/usePersons'
import { useTags } from '../hooks/useTags'
import type { MediaFileResponse } from '../types'

export function fmtDate(d?: string) {
  if (!d) return null
  // dateTaken is the local wall-clock at capture (stored as-is, no timezone shift) — display verbatim
  const dt = new Date(d)
  return dt.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function fmtSize(bytes?: number) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function fmtDuration(sec?: number) {
  if (!sec) return null
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Media Grid Item ──────────────────────────────────────────────────────────

export function MediaItem({ media, onClick, selected, onSelect, selectMode }: {
  media: MediaFileResponse; onClick: () => void
  selected: boolean; onSelect: (id: string) => void; selectMode: boolean
}) {
  return (
    <div className="relative cursor-pointer rounded-lg overflow-hidden bg-slate-100 group active:scale-[0.97] transition-transform duration-100">
      <div className="aspect-square" onClick={() => selectMode ? onSelect(media.id) : onClick()}>
        {media.fileType === 'VIDEO' && media.cdnUrl ? (
          <video src={`${media.cdnUrl}#t=0.5`} preload="metadata" muted playsInline
            className="w-full h-full object-cover pointer-events-none" />
        ) : (media.thumbnailUrl || media.cdnUrl) ? (
          <img src={media.thumbnailUrl || media.cdnUrl} alt={media.fileName} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={20} strokeWidth={1} /></div>
        )}
      </div>
      {media.isFavorite && (
        <div className="absolute bottom-1 left-1 text-pink-400 drop-shadow"><Heart size={12} fill="currentColor" /></div>
      )}
      {media.fileType === 'VIDEO' && (
        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded">
          {fmtDuration(media.duration) || '▶'}
        </div>
      )}
      {/* Select checkbox — visible on hover or when in select mode */}
      <div className={`absolute top-1.5 left-1.5 transition-opacity ${
        selected || selectMode ? 'opacity-100' : 'opacity-60 md:opacity-0 md:group-hover:opacity-100'
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

export function Lightbox({ media, allMedia, collectionId, onClose, onNavigate, onChanged, onAddTo }: {
  media: MediaFileResponse; allMedia: MediaFileResponse[]; collectionId: string | null
  onClose: () => void; onNavigate: (m: MediaFileResponse) => void
  onChanged: (m: MediaFileResponse) => void; onAddTo: (mediaId: string) => void
}) {
  const [showInfo, setShowInfo] = useState(false)
  const [coverDone, setCoverDone] = useState(false)
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
        {/* Media */}
        {media.cdnUrl ? (
          media.fileType === 'VIDEO' ? (
            <video key={media.id} src={media.cdnUrl} controls autoPlay playsInline
              className="max-w-full max-h-full object-contain select-none p-2" />
          ) : (
            <img src={media.cdnUrl} alt={media.fileName}
              className="max-w-full max-h-full object-contain select-none p-2" />
          )
        ) : (
          <div className="text-white/30 text-sm">No preview</div>
        )}

        {/* ── Floating controls ────────────────────────── */}
        {/* Back */}
        <button onClick={onClose}
          className="absolute top-3 left-3 md:top-4 md:left-4 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={22} />
        </button>

        {/* Counter + actions + Info */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5">
          <span className="text-white/40 text-xs tabular-nums mr-1">{idx + 1} / {allMedia.length}</span>
          <button title={media.isFavorite ? 'Unfavorite' : 'Favorite'}
            onClick={async () => onChanged(await mediaApi.patch(media.id, { isFavorite: !media.isFavorite }))}
            className={`p-2.5 md:p-2 rounded-full transition-colors ${media.isFavorite ? 'text-pink-400' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
            <Heart size={19} fill={media.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button title="Add to collection" onClick={() => onAddTo(media.id)}
            className="p-2.5 md:p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <FolderPlus size={19} />
          </button>
          {collectionId && (
            <button title="Set as collection cover"
              onClick={async () => { await mediaApi.setAsCover(collectionId, media.id); setCoverDone(true); setTimeout(() => setCoverDone(false), 1500) }}
              className={`p-2.5 md:p-2 rounded-full transition-colors ${coverDone ? 'text-green-400' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
              {coverDone ? <Check size={19} /> : <ImageIcon size={19} />}
            </button>
          )}
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
          <InfoContent media={media} cameraStr={cameraStr} settingsStr={settingsStr} exif={exif} vid={vid} onChanged={onChanged} />
        </div>
      </div>

      {/* ── Mobile: bottom sheet ───────────────────────── */}
      {showInfo && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-md border-t border-white/5 max-h-[55vh] overflow-y-auto animate-slide-up safe-bottom rounded-t-2xl z-10">
          <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 rounded-full bg-white/15" /></div>
          <InfoContent media={media} cameraStr={cameraStr} settingsStr={settingsStr} exif={exif} vid={vid} onChanged={onChanged} />
        </div>
      )}
    </div>
  )
}

// ── Info Content (shared between side panel & bottom sheet) ──────────────────

function InfoContent({ media, cameraStr, settingsStr, exif, vid, onChanged }: {
  media: MediaFileResponse; cameraStr: string; settingsStr: string
  exif?: MediaFileResponse['imageDetail']; vid?: MediaFileResponse['videoDetail']
  onChanged: (m: MediaFileResponse) => void
}) {
  const { data: allPersons = [] } = usePersons()
  const { data: allTags = [] } = useTags()
  const [addingTag, setAddingTag] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')

  const saveDate = async () => {
    setEditingDate(false)
    if (!dateDraft) return
    const current = (media.dateTaken || media.effectiveDate || '').slice(0, 16)
    if (dateDraft === current) return
    onChanged(await mediaApi.patch(media.id, { dateTaken: dateDraft }))
  }
  const taggedTagIds = new Set((media.tags || []).map(t => t.id))
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')
  const [addingPerson, setAddingPerson] = useState(false)
  const taggedIds = new Set((media.persons || []).map(p => p.id))

  const saveCaption = async () => {
    setEditingCaption(false)
    if (captionDraft === (media.caption || '')) return
    onChanged(await mediaApi.patch(media.id, { caption: captionDraft }))
  }

  return (
    <div className="p-4 md:p-5 space-y-5">
      {/* Caption */}
      <InfoSection icon={<FileText size={15} />} title="Caption">
        {editingCaption ? (
          <textarea autoFocus rows={2} value={captionDraft}
            onChange={e => setCaptionDraft(e.target.value)}
            onBlur={saveCaption}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCaption() } }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white/90 outline-none focus:border-pink-400/50 resize-none" />
        ) : (
          <p onClick={() => { setCaptionDraft(media.caption || ''); setEditingCaption(true) }}
            className={`text-sm cursor-text rounded px-0.5 -mx-0.5 hover:bg-white/5 ${media.caption ? 'text-white/80' : 'text-white/25 italic'}`}>
            {media.caption || 'Add a caption...'}
          </p>
        )}
      </InfoSection>

      {/* Tags */}
      <InfoSection icon={<Film size={15} className="hidden" />} title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {(media.tags || []).map(t => (
            <span key={t.id} className="flex items-center gap-1.5 text-xs pl-2 pr-1 py-1 rounded-full text-white"
              style={{ background: t.color || '#64748b' }}>
              {t.name}
              <button onClick={async () => onChanged(await mediaApi.removeTag(media.id, t.id))}
                className="opacity-70 hover:opacity-100 p-0.5"><X size={11} /></button>
            </span>
          ))}
          {addingTag ? (
            <select autoFocus
              onChange={async e => { if (e.target.value) onChanged(await mediaApi.addTag(media.id, e.target.value)); setAddingTag(false) }}
              onBlur={() => setAddingTag(false)}
              className="bg-[#222] text-white/80 text-xs rounded-full px-2 py-1 outline-none border border-white/10">
              <option value="">Choose...</option>
              {allTags.filter(t => !taggedTagIds.has(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <button onClick={() => setAddingTag(true)}
              className="text-white/40 hover:text-white/80 text-xs border border-dashed border-white/20 rounded-full px-2.5 py-1 transition-colors">
              + Tag
            </button>
          )}
        </div>
      </InfoSection>

      {/* People */}
      <InfoSection icon={<Users size={15} />} title="People">
        <div className="flex flex-wrap gap-1.5">
          {(media.persons || []).map(p => (
            <span key={p.id} className="flex items-center gap-1 bg-white/10 text-white/80 text-xs pl-2 pr-1 py-1 rounded-full">
              {p.displayName || p.name}
              <button onClick={async () => onChanged(await mediaApi.removePerson(media.id, p.id))}
                className="text-white/40 hover:text-white p-0.5"><X size={11} /></button>
            </span>
          ))}
          {addingPerson ? (
            <select autoFocus
              onChange={async e => { if (e.target.value) onChanged(await mediaApi.addPerson(media.id, e.target.value)); setAddingPerson(false) }}
              onBlur={() => setAddingPerson(false)}
              className="bg-[#222] text-white/80 text-xs rounded-full px-2 py-1 outline-none border border-white/10">
              <option value="">Choose...</option>
              {allPersons.filter(p => !taggedIds.has(p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.displayName || p.name}</option>
              ))}
            </select>
          ) : (
            <button onClick={() => setAddingPerson(true)}
              className="text-white/40 hover:text-white/80 text-xs border border-dashed border-white/20 rounded-full px-2.5 py-1 transition-colors">
              + Tag person
            </button>
          )}
        </div>
      </InfoSection>
      {/* Date — click to correct (scans / missing EXIF) */}
      <InfoSection icon={<Clock size={15} />} title="Date">
        {editingDate ? (
          <input type="datetime-local" autoFocus value={dateDraft}
            onChange={e => setDateDraft(e.target.value)}
            onBlur={saveDate}
            onKeyDown={e => { if (e.key === 'Enter') saveDate(); if (e.key === 'Escape') setEditingDate(false) }}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white/90 outline-none focus:border-pink-400/50 [color-scheme:dark]" />
        ) : (
          <p onClick={() => { setDateDraft((media.dateTaken || media.effectiveDate || '').slice(0, 16)); setEditingDate(true) }}
            title="Bấm để sửa ngày giờ (ảnh scan / thiếu EXIF)"
            className={`text-sm cursor-text rounded px-0.5 -mx-0.5 hover:bg-white/5 inline-flex items-center gap-2 ${
              media.dateTaken || media.effectiveDate ? 'text-white/80' : 'text-white/25 italic'
            }`}>
            {media.dateTaken || media.effectiveDate ? fmtDate(media.dateTaken || media.effectiveDate) : 'Set date...'}
            {media.timezone && <span className="text-white/25 text-[10px] not-italic">{media.timezone}</span>}
          </p>
        )}
        {media.dateTaken && media.uploadedAt && media.dateTaken !== media.uploadedAt && (
          <p className="text-white/30 text-[11px] mt-0.5">Uploaded {fmtDate(media.uploadedAt)}</p>
        )}
      </InfoSection>

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
