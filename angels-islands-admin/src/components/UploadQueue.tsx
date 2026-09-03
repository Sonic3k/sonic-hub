import { useCallback, useRef, useState } from 'react'
import { Check, RotateCw, X, AlertCircle, Copy, CopyX, Maximize2, Minimize2, UploadCloud, Loader2 } from 'lucide-react'
import { uploadApi } from '../api/collections'

const CONCURRENCY = 4

export interface QueueTask {
  file: File
  collectionId?: string
  personId?: string
  takenByPersonId?: string
  /** display label, defaults to file.name */
  label?: string
}

interface QueueItem extends QueueTask {
  id: string
  /** review: listed & duplicate-checked, waiting for the user to press Upload */
  status: 'review' | 'pending' | 'uploading' | 'done' | 'error' | 'duplicate'
  allowDuplicate?: boolean
  existing?: { fileName?: string; thumbnailUrl?: string; cdnUrl?: string }
}

export function useUploadQueue(onSettled?: () => void) {
  const queueRef = useRef<QueueItem[]>([])
  const workersRef = useRef(0)
  const [items, setItems] = useState<QueueItem[]>([])
  const sync = () => setItems([...queueRef.current])

  const worker = useCallback(async () => {
    workersRef.current++
    for (;;) {
      const next = queueRef.current.find(i => i.status === 'pending')
      if (!next) break
      next.status = 'uploading'; sync()
      try {
        const res = await uploadApi.uploadFile(next.file, next.personId, next.collectionId, next.allowDuplicate, next.takenByPersonId)
        if (res.duplicate) {
          next.status = 'duplicate'
          next.existing = res.existing
        } else {
          next.status = 'done'
        }
      } catch {
        next.status = 'error'
      }
      sync()
    }
    workersRef.current--
    if (workersRef.current === 0 && !queueRef.current.some(i => i.status === 'pending' || i.status === 'uploading')) {
      onSettled?.()
    }
  }, [onSettled])

  const kick = useCallback(() => {
    const pending = queueRef.current.filter(i => i.status === 'pending').length
    const spawn = Math.min(CONCURRENCY - workersRef.current, pending)
    for (let i = 0; i < spawn; i++) void worker()
  }, [worker])

  /** Pre-flight: mark tasks whose (name, size) already exist in their target collection
   *  as duplicates BEFORE any bytes move. Everything sits in 'review' until Upload. */
  const preflight = useCallback(async (batch: QueueItem[]) => {
    const byCollection = new Map<string, QueueItem[]>()
    for (const i of batch) {
      if (i.collectionId && !i.allowDuplicate) {
        const arr = byCollection.get(i.collectionId) || []
        arr.push(i); byCollection.set(i.collectionId, arr)
      }
    }
    await Promise.all(Array.from(byCollection.entries()).map(async ([cid, group]) => {
      try {
        const existing = new Set(await uploadApi.checkExisting(cid,
          group.map(g => ({ fileName: g.file.name, fileSize: g.file.size }))))
        for (const g of group) {
          if (existing.has(g.file.name) && g.status === 'review') {
            g.status = 'duplicate'
            g.existing = { fileName: g.file.name }
          }
        }
      } catch { /* best-effort; server hash check still guards */ }
    }))
    sync()
  }, [])

  /** Files land in review (listed + dup-checked); nothing uploads until startUpload(). */
  const enqueue = useCallback((tasks: QueueTask[]) => {
    if (!tasks.length) return
    const batch: QueueItem[] = tasks.map(t => ({
      ...t, id: Math.random().toString(36).slice(2), status: 'review' as const,
    }))
    queueRef.current.push(...batch)
    sync()
    void preflight(batch)
  }, [preflight])

  /** The confirm: review -> pending, workers start. Duplicates stay for Keep/Skip. */
  const startUpload = useCallback(() => {
    for (const i of queueRef.current) if (i.status === 'review') i.status = 'pending'
    sync(); kick()
  }, [kick])

  const removeItem = useCallback((id: string) => {
    queueRef.current = queueRef.current.filter(i => i.id !== id || i.status === 'uploading')
    sync()
  }, [])

  const skipDuplicate = useCallback((id?: string) => {
    queueRef.current = id
      ? queueRef.current.filter(i => i.id !== id)
      : queueRef.current.filter(i => i.status !== 'duplicate')
    sync()
  }, [])

  const keepDuplicate = useCallback((id?: string) => {
    for (const i of queueRef.current) {
      if (i.status === 'duplicate' && (!id || i.id === id)) {
        i.status = 'pending'
        i.allowDuplicate = true
      }
    }
    sync(); kick()
  }, [kick])

  const retryFailed = useCallback(() => {
    for (const i of queueRef.current) if (i.status === 'error') i.status = 'pending'
    sync(); kick()
  }, [kick])

  const clear = useCallback(() => {
    queueRef.current = queueRef.current.filter(i => i.status === 'pending' || i.status === 'uploading')
    sync()
  }, [])

  const busy = items.some(i => i.status === 'pending' || i.status === 'uploading')
  return { items, enqueue, startUpload, removeItem, retryFailed, clear, busy, skipDuplicate, keepDuplicate }
}

// ── Panel: collapsed corner widget ⇄ centered progress modal ─────────────────

type PanelProps = {
  items: QueueItem[]; busy: boolean
  onStart: () => void; onRemove: (id: string) => void
  onRetry: () => void; onClear: () => void
  onSkipDup: (id?: string) => void; onKeepDup: (id?: string) => void
}

function Row({ i, roomy, onRemove, onSkipDup, onKeepDup }: {
  i: QueueItem; roomy?: boolean; onRemove: (id: string) => void
  onSkipDup: (id?: string) => void; onKeepDup: (id?: string) => void
}) {
  return (
    <div className={`flex items-center gap-2 ${roomy ? 'text-xs py-0.5' : 'text-[11px]'} ${i.status === 'duplicate' ? 'bg-amber-50/60 -mx-1.5 px-1.5 py-1 rounded-lg' : ''}`}>
      {i.status === 'done' && <Check size={11} className="text-emerald-500 shrink-0" />}
      {i.status === 'error' && <AlertCircle size={11} className="text-rose-400 shrink-0" />}
      {i.status === 'uploading' && <span className="w-[11px] h-[11px] shrink-0 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />}
      {i.status === 'pending' && <span className="w-[11px] h-[11px] shrink-0 rounded-full border border-slate-200" />}
      {i.status === 'review' && <span className="w-[11px] h-[11px] shrink-0 rounded-full border border-pink-200 bg-pink-50" />}
      {i.status === 'duplicate' && (
        (i.existing?.thumbnailUrl || i.existing?.cdnUrl)
          ? <img src={i.existing.thumbnailUrl || i.existing.cdnUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0 border border-amber-200" />
          : <Copy size={11} className="text-amber-500 shrink-0" />
      )}
      <span className={`truncate flex-1 ${i.status === 'error' ? 'text-rose-400' : i.status === 'duplicate' ? 'text-amber-700' : 'text-slate-500'}`}>
        {i.label || i.file.name}
        {i.status === 'duplicate' && <span className="text-amber-500/80"> · already exists</span>}
      </span>
      {i.status === 'duplicate' && (
        <span className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onKeepDup(i.id)} title="Upload anyway (keep both)"
            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded transition-colors"><Copy size={13} /></button>
          <button onClick={() => onSkipDup(i.id)} title="Skip"
            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded transition-colors"><X size={13} /></button>
        </span>
      )}
      {i.status === 'review' && (
        <button onClick={() => onRemove(i.id)} title="Remove from batch"
          className="p-1.5 text-slate-300 hover:text-rose-400 rounded transition-colors shrink-0"><X size={13} /></button>
      )}
    </div>
  )
}

export function UploadQueuePanel(props: PanelProps) {
  const { items, busy, onStart, onRetry, onClear, onSkipDup, onKeepDup } = props
  const [expanded, setExpanded] = useState(false)
  if (!items.length) return null

  const review = items.filter(i => i.status === 'review').length
  const dups = items.filter(i => i.status === 'duplicate')
  const done = items.filter(i => i.status === 'done').length
  const errors = items.filter(i => i.status === 'error').length
  const settled = done + errors + dups.length
  const uploadTotal = items.length - review
  const showBar = busy || done + errors > 0
  const pct = uploadTotal > 0 ? Math.round((settled / uploadTotal) * 100) : 0

  const headline = busy
    ? `Uploading ${settled}/${uploadTotal}...${review > 0 ? ` · ${review} more ready` : ''}`
    : review > 0
      ? `${review} file${review !== 1 ? 's' : ''} ready${dups.length ? ` · ${dups.length} duplicate(s)` : ''}`
      : dups.length
        ? `${dups.length} duplicate(s) — choose action`
        : errors ? `Done · ${errors} failed` : `Uploaded ${done} file${done !== 1 ? 's' : ''}`

  const bulkAndControls = (
    <div className="flex items-center gap-1 flex-wrap">
      {review > 0 && (
        <button onClick={onStart}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-pink-500 hover:bg-pink-600 text-white rounded-full transition-all active:scale-95">
          <UploadCloud size={12} />Upload {review}
        </button>
      )}
      {dups.length > 1 && (
        <>
          <button onClick={() => onKeepDup()} title="Upload all duplicates as new copies"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 rounded transition-colors">
            <Copy size={11} />Keep all
          </button>
          <button onClick={() => onSkipDup()} title="Skip all duplicates"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded transition-colors">
            <CopyX size={11} />Skip all
          </button>
        </>
      )}
      {review > 0 && (
        <button onClick={onClear} title="Discard this batch (uploads in progress keep running)"
          className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors">
          Cancel
        </button>
      )}
      {!busy && errors > 0 && (
        <button onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded transition-colors">
          <RotateCw size={11} />Retry
        </button>
      )}
      {!busy && review === 0 && (
        <button onClick={onClear} className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors" title="Clear">
          <X size={13} />
        </button>
      )}
    </div>
  )

  // ── Expanded: centered modal for big batches ──
  if (expanded) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setExpanded(false)} />
        <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl md:mx-4 flex flex-col max-h-[88dvh]">
          <div className="flex justify-center pt-2 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
          <div className="p-4 md:p-5 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                {busy && <Loader2 size={14} className="animate-spin text-pink-400" />}{headline}
              </p>
              <button onClick={() => setExpanded(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100" title="Minimize">
                <Minimize2 size={15} />
              </button>
            </div>
            {showBar && (
              <div className="h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-pink-400 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="mt-3">{bulkAndControls}</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-1.5">
            {items.map(i => <Row key={i.id} i={i} roomy onRemove={props.onRemove} onSkipDup={onSkipDup} onKeepDup={onKeepDup} />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Collapsed: corner widget ──
  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 w-[calc(100vw-2rem)] max-w-xs">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-700 truncate">{headline}</p>
        <button onClick={() => setExpanded(true)} className="p-1 text-slate-300 hover:text-pink-500 rounded transition-colors shrink-0" title="Expand">
          <Maximize2 size={13} />
        </button>
      </div>
      {showBar && (
        <div className="h-0.5 bg-slate-100 rounded-full mb-2 overflow-hidden">
          <div className="h-full bg-pink-400 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="mb-2">{bulkAndControls}</div>
      <div className="max-h-36 overflow-y-auto space-y-1">
        {items.slice(0, 60).map(i => <Row key={i.id} i={i} onRemove={props.onRemove} onSkipDup={onSkipDup} onKeepDup={onKeepDup} />)}
        {items.length > 60 && (
          <button onClick={() => setExpanded(true)} className="text-[11px] text-pink-500 hover:underline">
            +{items.length - 60} more — expand
          </button>
        )}
      </div>
    </div>
  )
}
