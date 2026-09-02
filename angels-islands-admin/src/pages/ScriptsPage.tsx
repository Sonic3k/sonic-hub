import { useRef, useState } from 'react'
import { Wrench, Play, Loader2, Square } from 'lucide-react'
import api from '../api/client'

type Result = { ok: boolean; data?: unknown; msg?: string }

// ── One script card: confirm → run → show summary (mirrors mushroom-hills) ──
function ScriptCard({ title, description, danger, children, onRun, running, result }: {
  title: string; description: string; danger?: boolean
  children?: React.ReactNode
  onRun: () => void; running: boolean; result: Result | null
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 ${danger ? 'border-rose-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          {children && <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>}
        </div>
        <button onClick={onRun} disabled={running}
          className={`flex items-center gap-1.5 shrink-0 text-xs font-medium px-3.5 py-2 rounded-full transition-all active:scale-95 disabled:opacity-60 ${
            danger ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'
          }`}>
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {running ? 'Running...' : 'Run'}
        </button>
      </div>
      {result && (
        <pre className={`mt-3 text-[11px] leading-relaxed rounded-lg p-3 overflow-x-auto ${
          result.ok ? 'bg-slate-50 text-slate-600 border border-slate-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
        }`}>{result.ok ? JSON.stringify(result.data, null, 2) : result.msg}</pre>
      )}
    </div>
  )
}

function useScript(fn: () => Promise<unknown>, confirmText: string) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const run = async () => {
    if (!confirm(confirmText)) return
    setRunning(true); setResult(null)
    try { setResult({ ok: true, data: await fn() }) }
    catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setResult({ ok: false, msg: err.response?.data?.message || err.message || 'Failed' })
    }
    setRunning(false)
  }
  return { run, running, result }
}

// ── Batch loop runner (rescan / geocode): pages through until a page comes back empty ──
function useBatchLoop(endpoint: string, doneKey: string) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [progress, setProgress] = useState('')
  const stopRef = useRef(false)

  const run = async (batchSize: number, force: boolean, loop: boolean) => {
    if (!confirm(`Run ${endpoint}? ${loop ? 'Loops until done.' : 'One batch.'}`)) return
    setRunning(true); setResult(null); setProgress(''); stopRef.current = false
    const totals: Record<string, number> = {}
    let page = 0
    try {
      for (let i = 0; i < 1000; i++) {
        const r = await api.post<Record<string, unknown>>(`${endpoint}?batchSize=${batchSize}&force=${force}&page=${force ? page : 0}`).then((x: { data: Record<string, unknown> }) => x.data)
        for (const [k, v] of Object.entries(r)) if (typeof v === 'number') totals[k] = (totals[k] || 0) + v
        const scanned = Number(r[doneKey] ?? 0)
        page++
        setProgress(`page ${page} · totals ${JSON.stringify(totals)}`)
        if (!loop || scanned === 0 || stopRef.current) {
          setResult({ ok: true, data: loop ? totals : r })
          break
        }
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setResult({ ok: false, msg: err.response?.data?.message || err.message || 'Failed' })
    }
    setRunning(false)
  }
  const stop = () => { stopRef.current = true }
  return { run, stop, running, result, progress }
}

function BatchCard({ title, description, endpoint, doneKey }: {
  title: string; description: string; endpoint: string; doneKey: string
}) {
  const [batchSize, setBatchSize] = useState(20)
  const [force, setForce] = useState(false)
  const [loop, setLoop] = useState(true)
  const { run, stop, running, result, progress } = useBatchLoop(endpoint, doneKey)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1.5">Batch
              <input type="number" min={1} max={200} value={batchSize}
                onChange={e => setBatchSize(parseInt(e.target.value) || 20)}
                className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none focus:border-pink-400" />
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="accent-pink-500" />
              Force (re-run everything)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} className="accent-pink-500" />
              Loop until done
            </label>
          </div>
          {running && progress && <p className="text-[11px] text-pink-500 mt-2 font-mono">{progress}</p>}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={() => run(batchSize, force, loop)} disabled={running}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-all active:scale-95 disabled:opacity-60">
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? 'Running...' : 'Run'}
          </button>
          {running && (
            <button onClick={stop}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500 transition-colors">
              <Square size={12} />Stop
            </button>
          )}
        </div>
      </div>
      {result && (
        <pre className={`mt-3 text-[11px] leading-relaxed rounded-lg p-3 overflow-x-auto ${
          result.ok ? 'bg-slate-50 text-slate-600 border border-slate-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
        }`}>{result.ok ? JSON.stringify(result.data, null, 2) : result.msg}</pre>
      )}
    </div>
  )
}

export default function ScriptsPage() {
  const backfill = useScript(
    () => api.post('/api/scripts/backfill-media-source').then((r: { data: unknown }) => r.data),
    'Backfill mediaSource from data already in the DB?')
  const backfillExt = useScript(
    () => api.post('/api/scripts/backfill-file-extension').then((r: { data: unknown }) => r.data),
    'Derive file extension from file name for all rows missing it?')
  const clearOriginal = useScript(
    () => api.post('/api/scripts/clear-original-source').then((r: { data: unknown }) => r.data),
    'NULL out every legacy ORIGINAL mediaSource? (one-shot migration)')

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-lg md:text-xl font-semibold text-slate-800 flex items-center gap-2 mb-1">
        <Wrench size={18} className="text-pink-400" />Scripts
      </h1>
      <p className="text-xs text-slate-400 mb-6">Maintenance & migrations. Every script is safe to re-run; summaries show below each card.</p>

      <div className="space-y-4">
        <ScriptCard title="Backfill media source (DB-only, instant)"
          description="Fills mediaSource where it's still empty using the fileName + EXIF already stored in the DB — no B2 downloads. Run this right after detection rules improve (e.g. today's iPhone/Facebook fixes)."
          onRun={backfill.run} running={backfill.running} result={backfill.result} />

        <ScriptCard title="Backfill file extension (one SQL, instant)"
          description="Derives file_extension (jpg, heic, mp4...) from file_name for every row missing it — single native UPDATE, no downloads. New uploads set it automatically; this covers everything already in the library."
          onRun={backfillExt.run} running={backfillExt.running} result={backfillExt.result} />

        <ScriptCard title="Clear legacy ORIGINAL source" danger
          description="One-shot migration: sets mediaSource = NULL where it still says ORIGINAL (from the retired enum era). Null now means 'unknown'. Run once, then Backfill above re-detects real sources."
          onRun={clearOriginal.run} running={clearOriginal.running} result={clearOriginal.result} />

        <BatchCard title="Rescan metadata (downloads from B2 — heavy)"
          description="Re-extracts EXIF/GPS/video metadata, backfills content hash and media source, tags CLASSIFIED. Force re-scans everything page by page; without Force it only processes unscanned files."
          endpoint="/api/media-files/rescan-batch" doneKey="scanned" />

        <BatchCard title="Geocode GPS → address (Nominatim, rate-limited)"
          description="Resolves latitude/longitude into displayedAddress for the Map. Slow by design (public Nominatim rate limit). Force redoes files that already have an address."
          endpoint="/api/media-files/geocode-batch" doneKey="scanned" />
      </div>
    </div>
  )
}
