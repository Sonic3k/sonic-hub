import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, ChevronRight, Image, ArrowLeft, Trash2, X, Plus, FolderPlus, ImagePlus, UploadCloud, Heart, FolderInput, FolderMinus, MoreVertical, Pencil, Users, ImageIcon, UserPlus, ChevronDown, Search, Tag, Camera } from 'lucide-react'
import { collectionBrowseApi, uploadApi, collectionsApi, mediaApi } from '../api/collections'
import CollectionPicker from '../components/CollectionPicker'
import PersonSelectModal from '../components/PersonSelectModal'
import TagSelectModal from '../components/TagSelectModal'
import { useTags } from '../hooks/useTags'
import { tagsApi } from '../api/tags'
import { usePersons } from '../hooks/usePersons'
import { collectDroppedFiles, groupDropped } from '../lib/dropUpload'
import { useUploadQueue, UploadQueuePanel, type QueueTask } from '../components/UploadQueue'
import type { CollectionResponse, MediaFileResponse, PersonSummary, TagResponse } from '../types'
import { Lightbox, MediaItem } from '../components/media'


// ── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection, onClick, dragging, isDropTarget, onDragStartCard, onDragEndCard, onDragOverCard, onDragLeaveCard, onDropCard }: {
  collection: CollectionResponse; onClick: () => void
  dragging?: boolean; isDropTarget?: boolean
  onDragStartCard?: () => void; onDragEndCard?: () => void
  onDragOverCard?: (e: React.DragEvent) => void; onDragLeaveCard?: () => void; onDropCard?: (e: React.DragEvent) => void
}) {
  return (
    <div onClick={onClick}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', collection.id); onDragStartCard?.() }}
      onDragEnd={onDragEndCard}
      onDragOver={onDragOverCard}
      onDragLeave={onDragLeaveCard}
      onDrop={onDropCard}
      className={`group cursor-pointer bg-white rounded-2xl border overflow-hidden hover:shadow-lg hover:shadow-pink-100/50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ${
        isDropTarget ? 'border-pink-400 ring-2 ring-pink-300 scale-[1.02]' : 'border-slate-100'
      } ${dragging ? 'opacity-40' : ''}`}>
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
        {collection.tags && collection.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
            {collection.tags.slice(0, 2).map(t => (
              <span key={t.id} className="text-[9px] text-white px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
                style={{ background: t.color || '#94a3b8' }}>{t.name}</span>
            ))}
            {collection.tags.length > 2 && <span className="text-[9px] text-slate-400">+{collection.tags.length - 2}</span>}
          </div>
        )}
      </div>
    </div>
  )
}


// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ items, onNavigate, dropActive, onDropTo }: {
  items: { id: string; name: string }[]; onNavigate: (id: string | null) => void
  dropActive?: boolean; onDropTo?: (id: string | null) => void
}) {
  const [over, setOver] = useState<string | 'ALL' | null>(null)
  const crumbDrop = (key: string | 'ALL', id: string | null) => dropActive ? {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setOver(key) },
    onDragLeave: () => setOver(o => (o === key ? null : o)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(null); onDropTo?.(id) },
  } : {}
  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto scroll-snap-x pb-1 mb-4 -mx-1 px-1">
      <button onClick={() => onNavigate(null)} {...crumbDrop('ALL', null)}
        className={`transition-colors font-medium shrink-0 rounded px-1 ${
          over === 'ALL' ? 'bg-pink-100 text-pink-600 ring-1 ring-pink-300' : 'text-slate-400 hover:text-pink-500 active:text-pink-600'
        }`}>All</button>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight size={10} className="text-slate-300" />
          <button onClick={() => i < items.length - 1 ? onNavigate(item.id) : null} {...crumbDrop(item.id, item.id)}
            className={`transition-colors font-medium whitespace-nowrap max-w-[160px] truncate rounded px-1 ${
              over === item.id ? 'bg-pink-100 text-pink-600 ring-1 ring-pink-300'
                : i === items.length - 1 ? 'text-slate-800' : 'text-slate-400 hover:text-pink-500'
            }`}>{item.name}</button>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [searchParams] = useSearchParams()
  const [currentId, setCurrentId] = useState<string | null>(searchParams.get('id'))
  const [selectedMedia, setSelectedMedia] = useState<MediaFileResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newCollName, setNewCollName] = useState('')
  const [sort, setSort] = useState('effectiveDate')
  const [sortDir, setSortDir] = useState('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const addPhotosRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const sortOptions = [
    { sort: 'effectiveDate', dir: 'desc', label: 'Date · Newest first' },
    { sort: 'effectiveDate', dir: 'asc',  label: 'Date · Oldest first' },
    { sort: 'name',          dir: 'asc',  label: 'Name · A → Z' },
    { sort: 'name',          dir: 'desc', label: 'Name · Z → A' },
    { sort: 'uploadedAt',    dir: 'desc', label: 'Added · Newest first' },
    { sort: 'uploadedAt',    dir: 'asc',  label: 'Added · Oldest first' },
  ]
  const activeSort = sortOptions.find(o => o.sort === sort && o.dir === sortDir) || sortOptions[0]

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

  const { data: rootInfo } = useQuery({
    queryKey: ['collections', 'root'],
    queryFn: () => collectionBrowseApi.getRoot(),
  })

  const effectiveId = currentId ?? rootInfo?.id ?? null

  const { data: media = [] } = useQuery({
    queryKey: ['collections', effectiveId, 'media', sort, sortDir],
    queryFn: () => collectionBrowseApi.getCollectionMedia(effectiveId!, sort, sortDir),
    enabled: !!effectiveId,
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

  // ── Drag & drop upload ─────────────────────────────────────────────────────
  const [dragActive, setDragActive] = useState(false)
  const dragDepth = useRef(0)

  const queue = useUploadQueue(() => qc.invalidateQueries({ queryKey: ['collections'] }))

  const enqueueFolderGroups = async (groups: ReturnType<typeof groupDropped>['folders'], parentId?: string) => {
    for (const g of groups) {
      const tree = await uploadApi.createTree({
        rootName: g.rootName,
        parentId,
        personIds: tagAsPerson ? [tagAsPerson.id] : undefined,
        folders: g.innerFolders,
      })
      const tasks: QueueTask[] = g.files.map(f => ({
        file: f.file,
        collectionId: tree.pathToId[f.folder] || tree.rootId,
        personId: tagAsPerson?.id,
        takenByPersonId: byPerson?.id,
        label: `${g.rootName}/${f.folder ? f.folder + '/' : ''}${f.file.name}`,
      }))
      queue.enqueue(tasks)
    }
    qc.invalidateQueries({ queryKey: ['collections'] })
  }

  const moveCollectionTo = async (id: string, targetId: string) => {
    setDragCollId(null); setDropTargetId(null)
    if (id === targetId) return
    try {
      await collectionsApi.update(id, { parentId: targetId })
      qc.invalidateQueries({ queryKey: ['collections'] })
    } catch { alert('Move failed (into its own descendant?)') }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragActive(false)
    let dropped
    try { dropped = await collectDroppedFiles(e.dataTransfer) } catch { return }
    if (!dropped.length) return
    const { folders, loose } = groupDropped(dropped)

    // Folders become sub-collections of where you are (root screen = system root)
    if (folders.length) await enqueueFolderGroups(folders, currentId ?? undefined)
    // Loose files go straight into the current collection (root screen = system root).
    // effectiveId may still be null if the root query hasn't resolved (drop right after page load) — fetch it, never swallow.
    if (loose.length) {
      let target = effectiveId
      if (!target) {
        try { target = (await collectionBrowseApi.getRoot()).id } catch { alert('Could not resolve the root collection — try again in a moment'); return }
      }
      queue.enqueue(loose.map(file => ({ file, collectionId: target!, personId: tagAsPerson?.id, takenByPersonId: byPerson?.id })))
    }
  }

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      dragDepth.current++
      setDragActive(true)
    },
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) e.preventDefault()
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragActive(false)
    },
    onDrop: handleDrop,
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Manage actions ─────────────────────────────────────────────────────────
  const [picker, setPicker] = useState<null | { mode: 'add' | 'move' | 'moveCollection'; ids: string[] }>(null)
  const [personModal, setPersonModal] = useState<string[] | null>(null)   // media ids to tag person
  const [tagModal, setTagModal] = useState<string[] | null>(null)          // media ids to tag label
  const [takenByModal, setTakenByModal] = useState<string[] | null>(null)  // media ids to set photographer
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [collQ, setCollQ] = useState('')
  const { data: allColl = [] } = useQuery({
    queryKey: ['collections', 'all-names'],
    queryFn: () => collectionsApi.getAll(),
    enabled: collQ.trim().length > 0,
    staleTime: 60_000,
  })
  const collMatches = collQ.trim().length > 0
    ? allColl.filter((c: CollectionResponse) => c.name.toLowerCase().includes(collQ.trim().toLowerCase())).slice(0, 12)
    : []
  const [tagAsPerson, setTagAsPerson] = useState<PersonSummary | null>(null) // upload context: tag person
  const [showTagAsMenu, setShowTagAsMenu] = useState(false)
  const [byPerson, setByPerson] = useState<PersonSummary | null>(null)       // upload context: photographer
  const [dragCollId, setDragCollId] = useState<string | null>(null)          // collection card being dragged
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)      // card / crumb highlighted as drop target
  const [showByMenu, setShowByMenu] = useState(false)
  const [showCollMenu, setShowCollMenu] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [personsOpen, setPersonsOpen] = useState(false)
  const { data: allPersons = [] } = usePersons()

  const selectedList = () => Array.from(selectedIds)
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['collections'] })

  const allSelectedFavorite = media.length > 0 && selectedList().every(id => media.find((m: MediaFileResponse) => m.id === id)?.isFavorite)

  const handleFavoriteBatch = async () => {
    await mediaApi.favoriteBatch(selectedList(), !allSelectedFavorite)
    invalidateAll()
  }

  const handlePickerSelect = async (targetId: string) => {
    if (!picker) return
    if (picker.mode === 'add') {
      await mediaApi.addToCollectionBatch(targetId, picker.ids)
    } else if (picker.mode === 'move' && currentId) {
      await mediaApi.moveBatch(currentId, targetId, picker.ids)
      setSelectedIds(new Set())
    } else if (picker.mode === 'moveCollection' && currentId) {
      await collectionsApi.update(currentId, { parentId: targetId })
    }
    setPicker(null)
    invalidateAll()
  }

  const handleTakenByBatch = async (person: PersonSummary) => {
    if (!takenByModal) return
    await mediaApi.takenByBatch(takenByModal, person.id)
    setTakenByModal(null)
    setSelectedIds(new Set())
    invalidateAll()
  }

  const handleTagBatch = async (tag: TagResponse) => {
    if (!tagModal) return
    await mediaApi.tagBatch(tagModal, tag.id)
    setTagModal(null)
    setSelectedIds(new Set())
    invalidateAll()
  }

  const handleToggleTagOnCollection = async (tagId: string) => {
    if (!currentId || !current) return
    const ids = new Set((current.tags || []).map(t => t.id))
    if (ids.has(tagId)) ids.delete(tagId); else ids.add(tagId)
    await collectionsApi.update(currentId, { tagIds: Array.from(ids) })
    invalidateAll()
  }

  const handleTagPersonBatch = async (person: PersonSummary) => {
    if (!personModal) return
    await mediaApi.addPersonBatch(personModal, person.id)
    setPersonModal(null)
    setSelectedIds(new Set())
    invalidateAll()
  }

  const handleRemoveHere = async () => {
    if (!currentId || !selectedIds.size) return
    if (!confirm(`Remove ${selectedIds.size} file(s) from "${current?.name}"? Files stay in the library and other collections.`)) return
    await mediaApi.removeFromCollectionBatch(currentId, selectedList())
    setSelectedIds(new Set())
    invalidateAll()
  }

  const handleSetCoverSelected = async () => {
    if (!currentId || selectedIds.size !== 1) return
    await mediaApi.setAsCover(currentId, selectedList()[0])
    setSelectedIds(new Set())
    invalidateAll()
  }

  const handleRename = async () => {
    if (!currentId || !renameDraft.trim()) return
    await collectionsApi.update(currentId, { name: renameDraft.trim() })
    setRenameOpen(false)
    invalidateAll()
  }

  const handleTogglePersonOnCollection = async (personId: string) => {
    if (!currentId || !current) return
    const ids = new Set((current.persons || []).map(p => p.id))
    if (ids.has(personId)) ids.delete(personId); else ids.add(personId)
    await collectionsApi.update(currentId, { personIds: Array.from(ids) })
    invalidateAll()
  }

  const handleDeleteCollection = async () => {
    if (!currentId || !current) return
    if (!confirm(`Delete "${current.name}" and all its sub-collections? Photos are NOT deleted — they stay in the library and other collections.`)) return
    const parentId = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2].id : null
    await collectionsApi.delete(currentId)
    navigate(parentId)
    invalidateAll()
  }

  const handleDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} file(s)? This will also remove from storage.`)) return
    setDeleting(true)
    try {
      await uploadApi.deleteMedia(Array.from(selectedIds))
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['collections'] })
    } catch (err) { alert('Delete failed') }
    setDeleting(false)
  }

  const handleAddPhotos = (files: FileList) => {
    if (!effectiveId || !files.length) return
    const tasks: QueueTask[] = Array.from(files)
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map(file => ({ file, collectionId: effectiveId, personId: tagAsPerson?.id, takenByPersonId: byPerson?.id }))
    queue.enqueue(tasks)
  }

  const handleCreateSubCollection = async () => {
    if (!newCollName.trim()) return
    await collectionsApi.create({ name: newCollName.trim(), parentId: currentId ?? undefined })
    setNewCollName('')
    setShowNewCollection(false)
    qc.invalidateQueries({ queryKey: ['collections'] })
  }

  return (
    <div className="p-3 md:p-6 lg:p-8 min-h-[70dvh]" {...dragProps}>
      {/* Drop overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-50 bg-pink-500/5 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-dashed border-pink-400 px-8 py-6 flex flex-col items-center gap-2 mx-4">
            <UploadCloud size={28} className="text-pink-500" />
            <p className="text-sm font-semibold text-slate-800 text-center">
              {currentId && current ? `Drop into “${current.name}”` : 'Drop into Collections'}
            </p>
            <p className="text-[11px] text-slate-400 text-center">
              {currentId ? 'Files land right here · folders become sub-collections' : 'Files go to root · folders become new collections'}
            </p>
            {(tagAsPerson || byPerson) && (
              <p className="text-[11px] text-pink-500 font-medium">
                {tagAsPerson && `Will tag: ${tagAsPerson.displayName || tagAsPerson.name}`}
                {tagAsPerson && byPerson && ' · '}
                {byPerson && `Taken by: ${byPerson.displayName || byPerson.name}`}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="mb-4">
        {currentId && (
          <>
            <button onClick={() => {
              if (breadcrumb.length > 1) navigate(breadcrumb[breadcrumb.length - 2].id)
              else navigate(null)
            }} className="flex items-center gap-1 text-xs text-slate-400 active:text-pink-500 mb-2">
              <ArrowLeft size={12} />Back
            </button>
            <Breadcrumb items={breadcrumb} onNavigate={navigate}
            dropActive={!!dragCollId}
            onDropTo={async id => {
              if (!dragCollId) return
              const target = id ?? rootInfo?.id ?? (await collectionBrowseApi.getRoot()).id
              moveCollectionTo(dragCollId, target)
            }} />
          </>
        )}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap gap-y-2">
          <h1 className="text-lg md:text-xl font-semibold text-slate-800 flex-1 min-w-[110px] truncate">
            {currentId ? (current?.name ?? '') : 'Collections'}
          </h1>
          {!selectMode && <>
          {/* Jump search collection */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={collQ} onChange={e => setCollQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setCollQ('') }}
              placeholder="Find collection..."
              className="pl-8 pr-3 h-9 text-xs bg-white border border-slate-200 rounded-full outline-none focus:border-pink-300 w-28 md:w-48" />
            {collMatches.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCollQ('')} />
                <div className="absolute left-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-64 max-h-80 overflow-y-auto">
                  {collMatches.map((c: CollectionResponse) => (
                    <button key={c.id} onClick={() => { navigate(c.id); setCollQ('') }}
                      className="flex flex-col items-start w-full px-4 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <span className="text-sm text-slate-700 truncate w-full text-left">{c.name}</span>
                      {c.parentName && <span className="text-[10px] text-slate-400">in {c.parentName}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Tag-as upload context */}
          <div className="relative">
            <button onClick={() => setShowTagAsMenu(v => !v)} title="Every upload will be tagged with this person"
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium transition-all border ${
                tagAsPerson ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-slate-200 text-slate-500 hover:border-pink-300 hover:text-pink-500'
              }`}>
              <UserPlus size={13} />
              <span className="max-w-[110px] truncate">{tagAsPerson ? (tagAsPerson.displayName || tagAsPerson.name) : 'Tag as'}</span>
              <ChevronDown size={12} />
            </button>
            {showTagAsMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTagAsMenu(false)} />
                <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-48 max-h-72 overflow-y-auto">
                  <button onClick={() => { setTagAsPerson(null); setShowTagAsMenu(false) }}
                    className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                      !tagAsPerson ? 'text-pink-500 bg-pink-50/50' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}>None</button>
                  {allPersons.map(p => (
                    <button key={p.id} onClick={() => { setTagAsPerson(p); setShowTagAsMenu(false) }}
                      className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                        tagAsPerson?.id === p.id ? 'text-pink-500 bg-pink-50/50' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}>{p.displayName || p.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Taken-by upload context */}
          <div className="relative">
            <button onClick={() => setShowByMenu(v => !v)} title="Every upload will set this photographer"
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium transition-all border ${
                byPerson ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-slate-200 text-slate-500 hover:border-pink-300 hover:text-pink-500'
              }`}>
              <Camera size={13} />
              <span className="max-w-[100px] truncate">{byPerson ? (byPerson.displayName || byPerson.name) : 'By'}</span>
              <ChevronDown size={12} />
            </button>
            {showByMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowByMenu(false)} />
                <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-48 max-h-72 overflow-y-auto">
                  <button onClick={() => { setByPerson(null); setShowByMenu(false) }}
                    className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                      !byPerson ? 'text-pink-500 bg-pink-50/50' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}>None</button>
                  {allPersons.map(p => (
                    <button key={p.id} onClick={() => { setByPerson(p); setShowByMenu(false) }}
                      className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                        byPerson?.id === p.id ? 'text-pink-500 bg-pink-50/50' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}>{p.displayName || p.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* ⋯ Collection menu */}
          {currentId && (
            <div className="relative">
              <button onClick={() => setShowCollMenu(!showCollMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:border-pink-300 hover:text-pink-500 transition-all">
                <MoreVertical size={18} />
              </button>
              {showCollMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCollMenu(false)} />
                  <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-48">
                    <button onClick={() => { setRenameDraft(current?.name || ''); setRenameOpen(true); setShowCollMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <Pencil size={16} className="text-slate-400" />Rename
                    </button>
                    <button onClick={() => { setPicker({ mode: 'moveCollection', ids: [] }); setShowCollMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <FolderInput size={16} className="text-slate-400" />Move collection
                    </button>
                    <button onClick={() => { setPersonsOpen(true); setShowCollMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <Users size={16} className="text-slate-400" />Manage persons
                    </button>
                    <button onClick={() => { setManageTagsOpen(true); setShowCollMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                      <Tag size={16} className="text-slate-400" />Manage labels
                    </button>
                    <button onClick={() => { setShowCollMenu(false); handleDeleteCollection() }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 active:bg-rose-100 transition-colors">
                      <Trash2 size={16} className="text-rose-300" />Delete collection
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
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
                    <FolderPlus size={16} className="text-slate-400" />{currentId ? 'New sub-collection' : 'New collection'}
                  </button>
                </div>
              </>
            )}
          </div>
          </>}
        </div>
        {/* Hidden file input */}
        <input ref={addPhotosRef} type="file" multiple accept="image/*,video/*" className="hidden"
          onChange={e => { if (e.target.files) handleAddPhotos(e.target.files); e.target.value = '' }} />
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}

      {collections.length > 0 && (
        <div className="mb-6">
          {currentId && <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2.5">Folders</h2>}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
            {collections.map((c: CollectionResponse) => (
              <CollectionCard key={c.id} collection={c} onClick={() => navigate(c.id)}
                dragging={dragCollId === c.id}
                isDropTarget={dropTargetId === c.id && dragCollId !== c.id}
                onDragStartCard={() => setDragCollId(c.id)}
                onDragEndCard={() => { setDragCollId(null); setDropTargetId(null) }}
                onDragOverCard={e => { if (dragCollId && dragCollId !== c.id) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setDropTargetId(c.id) } }}
                onDragLeaveCard={() => setDropTargetId(t => (t === c.id ? null : t))}
                onDropCard={e => { if (dragCollId && dragCollId !== c.id) { e.preventDefault(); e.stopPropagation(); moveCollectionTo(dragCollId, c.id) } }} />
            ))}
          </div>
        </div>
      )}

      {media.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Photos & Videos · {media.length}
            </h2>
            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className="relative">
                <button onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                  {activeSort.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-48">
                      {sortOptions.map((o, i) => (
                        <button key={i} onClick={() => { setSort(o.sort); setSortDir(o.dir); setShowSortMenu(false) }}
                          className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                            sort === o.sort && sortDir === o.dir
                              ? 'text-pink-500 bg-pink-50/50'
                              : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                          }`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Select mode actions */}
              {selectMode && (
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  <span className="text-xs text-pink-500 font-medium mr-1">{selectedIds.size} selected</span>
                  <button onClick={() => { const all = new Set<string>(media.map((m: MediaFileResponse) => m.id)); setSelectedIds(prev => prev.size === all.size ? new Set<string>() : all) }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">
                    {selectedIds.size === media.length ? 'None' : 'All'}
                  </button>
                  <button onClick={handleFavoriteBatch} title={allSelectedFavorite ? 'Unfavorite' : 'Favorite'}
                    className={`p-1.5 rounded transition-colors ${allSelectedFavorite ? 'text-pink-500 bg-pink-50' : 'text-slate-400 hover:text-pink-500 hover:bg-pink-50'}`}>
                    <Heart size={14} fill={allSelectedFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={() => setPicker({ mode: 'add', ids: selectedList() })} title="Add to collection"
                    className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <FolderPlus size={14} />
                  </button>
                  <button onClick={() => setPersonModal(selectedList())} title="Tag person"
                    className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <UserPlus size={14} />
                  </button>
                  <button onClick={() => setTakenByModal(selectedList())} title="Set photographer (taken by)"
                    className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <Camera size={14} />
                  </button>
                  <button onClick={() => setTagModal(selectedList())} title="Add label (Travel, Family...)"
                    className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <Tag size={14} />
                  </button>
                  {currentId && (
                    <button onClick={() => setPicker({ mode: 'move', ids: selectedList() })} title="Move to collection"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <FolderInput size={14} />
                    </button>
                  )}
                  {currentId && (
                    <button onClick={handleRemoveHere} title="Remove from this collection"
                      className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <FolderMinus size={14} />
                    </button>
                  )}
                  {currentId && selectedIds.size === 1 && (
                    <button onClick={handleSetCoverSelected} title="Set as cover"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <ImageIcon size={14} />
                    </button>
                  )}
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

      {!isLoading && collections.length === 0 && media.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen size={36} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
          <p className="text-sm text-slate-500 font-medium">{currentId ? 'This collection is empty' : 'No collections yet'}</p>
          <p className="text-xs text-slate-400 mt-1 hidden md:block">Drag photos or whole folders anywhere on this page, or:</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <button onClick={() => addPhotosRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-pink-500 text-white px-3.5 py-2 rounded-full hover:bg-pink-600 active:scale-95 transition-all">
              <ImagePlus size={13} />Add photos
            </button>
            <button onClick={() => setShowNewCollection(true)}
              className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-full hover:border-pink-300 hover:text-pink-500 active:scale-95 transition-all">
              <FolderPlus size={13} />New collection
            </button>
          </div>
        </div>
      )}

      {/* New sub-collection modal */}
      {showNewCollection && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewCollection(false)} />
          <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
            <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{currentId ? 'New sub-collection' : 'New collection'}</h3>
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

      {/* Rename collection modal */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenameOpen(false)} />
          <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
            <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Rename collection</h3>
            <p className="text-[11px] text-slate-400 mb-3">Folder path in storage stays unchanged</p>
            <input className="w-full px-3 py-2.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50 outline-none mb-3"
              value={renameDraft} onChange={e => setRenameDraft(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleRename()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleRename} disabled={!renameDraft.trim()}
                className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage persons modal */}
      {personsOpen && current && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPersonsOpen(false)} />
          <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
            <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Persons in "{current.name}"</h3>
            <div className="flex flex-wrap gap-1.5 mb-4 max-h-60 overflow-y-auto">
              {allPersons.map(p => {
                const active = (current.persons || []).some(cp => cp.id === p.id)
                return (
                  <button key={p.id} onClick={() => handleTogglePersonOnCollection(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors active:scale-95 ${
                      active ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-pink-300'
                    }`}>{p.displayName || p.name}</button>
                )
              })}
              {allPersons.length === 0 && <p className="text-xs text-slate-400">No persons yet</p>}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setPersonsOpen(false)} className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Collection picker (add / move media / move collection) */}
      {picker && (
        <CollectionPicker
          title={picker.mode === 'add' ? `Add ${picker.ids.length} file(s) to...`
               : picker.mode === 'move' ? `Move ${picker.ids.length} file(s) to...`
               : `Move "${current?.name}" into...`}
          confirmLabel={picker.mode === 'add' ? 'Add' : 'Move'}
          excludeId={picker.mode === 'moveCollection' ? currentId ?? undefined : undefined}
          topLevelId={picker.mode === 'moveCollection' ? rootInfo?.id : undefined}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Taken-by batch */}
      {takenByModal && (
        <PersonSelectModal title={`Photographer for ${takenByModal.length} file(s)...`}
          onSelect={handleTakenByBatch} onClose={() => setTakenByModal(null)} />
      )}

      {/* Tag label batch */}
      {tagModal && (
        <TagSelectModal title={`Label ${tagModal.length} file(s) as...`}
          onSelect={handleTagBatch} onClose={() => setTagModal(null)} />
      )}

      {/* Manage labels on collection */}
      {manageTagsOpen && current && (
        <ManageTagsModal collectionName={current.name}
          activeIds={(current.tags || []).map(t => t.id)}
          onToggle={handleToggleTagOnCollection}
          onClose={() => setManageTagsOpen(false)} />
      )}

      {/* Tag person batch */}
      {personModal && (
        <PersonSelectModal title={`Tag ${personModal.length} file(s) with...`}
          onSelect={handleTagPersonBatch} onClose={() => setPersonModal(null)} />
      )}

      {/* Upload queue */}
      <UploadQueuePanel items={queue.items} busy={queue.busy} onStart={queue.startUpload} onRemove={queue.removeItem} onRetry={queue.retryFailed} onClear={queue.clear} onSkipDup={queue.skipDuplicate} onKeepDup={queue.keepDuplicate} />

      {/* Media detail lightbox */}
      {selectedMedia && (
        <Lightbox media={selectedMedia} allMedia={media} collectionId={currentId}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)}
          onChanged={m => { setSelectedMedia(m); invalidateAll() }}
          onAddTo={id => setPicker({ mode: 'add', ids: [id] })} />
      )}
    </div>
  )
}


// ── Manage labels modal (toggle tags on a collection) ────────────────────────

function ManageTagsModal({ collectionName, activeIds, onToggle, onClose }: {
  collectionName: string; activeIds: string[]
  onToggle: (tagId: string) => void; onClose: () => void
}) {
  const { data: tags = [] } = useTags()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()
  const active = new Set(activeIds)
  const PALETTE = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1']

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const created = await tagsApi.create({ name, color: PALETTE[tags.length % PALETTE.length] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      onToggle(created.id)
      setNewName('')
    } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
        <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Labels for "{collectionName}"</h3>
        <div className="flex flex-wrap gap-1.5 mb-4 max-h-60 overflow-y-auto">
          {tags.map(t => {
            const isOn = active.has(t.id)
            return (
              <button key={t.id} onClick={() => onToggle(t.id)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors active:scale-95 ${
                  isOn ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-pink-300'
                }`}
                style={isOn ? { background: t.color || '#ec4899' } : undefined}>
                {!isOn && <span className="w-2 h-2 rounded-full" style={{ background: t.color || '#94a3b8' }} />}
                {t.name}
              </button>
            )
          })}
          {tags.length === 0 && <p className="text-xs text-slate-400">No labels yet — create one below</p>}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mb-3">
          <Plus size={14} className="text-slate-300 shrink-0" />
          <input className="flex-1 px-2 py-1.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none"
            placeholder="New label (e.g. Travel, Family)..."
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          {newName.trim() && (
            <button onClick={handleCreate} disabled={creating}
              className="text-xs text-pink-500 font-medium px-2 py-1.5 hover:bg-pink-50 rounded disabled:opacity-50">Create</button>
          )}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600">Done</button>
        </div>
      </div>
    </div>
  )
}
