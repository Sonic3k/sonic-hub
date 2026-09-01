import { useCallback, useRef, useState } from 'react'
import { Check, RotateCw, X, AlertCircle } from 'lucide-react'
import { uploadApi } from '../api/collections'

const CONCURRENCY = 4

export interface QueueTask {
  file: File
  collectionId?: string
  personId?: string
  /** display label, defaults to file.name */
  label?: string
}

interface QueueItem extends QueueTask {
  id: string
  status: 'pending' | 'uploading' | 'done' | 'error'
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
        await uploadApi.uploadFile(next.file, next.personId, next.collectionId)
        next.status = 'done'
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

  const enqueue = useCallback((tasks: QueueTask[]) => {
    if (!tasks.length) return
    queueRef.current.push(...tasks.map(t => ({
      ...t, id: Math.random().toString(36).slice(2), status: 'pending' as const,
    })))
    sync(); kick()
  }, [kick])

  const retryFailed = useCallback(() => {
    for (const i of queueRef.current) if (i.status === 'error') i.status = 'pending'
    sync(); kick()
  }, [kick])

  const clear = useCallback(() => { queueRef.current = []; sync() }, [])

  const busy = items.some(i => i.status === 'pending' || i.status === 'uploading')
  return { items, enqueue, retryFailed, clear, busy }
}

export function UploadQueuePanel({ items, busy, onRetry, onClear }: {
  items: QueueItem[]; busy: boolean; onRetry: () => void; onClear: () => void
}) {
  if (!items.length) return null
  const done = items.filter(i => i.status === 'done').length
  const errors = items.filter(i => i.status === 'error').length
  const pct = Math.round((done + errors) / items.length * 100)

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-xs bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="h-1 bg-slate-100">
        <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-700">
          {busy ? `Uploading ${done + errors}/${items.length}...` : errors ? `Done · ${errors} failed` : `Uploaded ${done} file${done !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-1">
          {!busy && errors > 0 && (
            <button onClick={onRetry}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-pink-500 hover:bg-pink-50 rounded transition-colors">
              <RotateCw size={11} />Retry {errors} failed
            </button>
          )}
          {!busy && (
            <button onClick={onClear} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-1">
        {items.map(i => (
          <div key={i.id} className="flex items-center gap-2 text-[11px]">
            {i.status === 'done' && <Check size={11} className="text-emerald-500 shrink-0" />}
            {i.status === 'error' && <AlertCircle size={11} className="text-rose-400 shrink-0" />}
            {i.status === 'uploading' && <span className="w-[11px] h-[11px] shrink-0 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />}
            {i.status === 'pending' && <span className="w-[11px] h-[11px] shrink-0 rounded-full border border-slate-200" />}
            <span className={`truncate ${i.status === 'error' ? 'text-rose-400' : 'text-slate-500'}`}>
              {i.label || i.file.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
