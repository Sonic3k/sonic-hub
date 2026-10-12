import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import { fmtDateTime } from '../../lib/money'
import { finKeys, STATUS_TONE } from './shared'

/** Every payload that reached the webhook, as it came — to see what SePay sent and replay one after a fix. */
export default function InboundTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const { data } = useQuery({ queryKey: [...finKeys.inbound, page], queryFn: () => financeApi.inbound(page, 30) })
  const replay = useMutation({
    mutationFn: financeApi.replay,
    onSuccess: r => { setMsg(`${r.status}: ${r.message ?? ''}`); qc.invalidateQueries({ queryKey: ['fin'] }) },
    onError: e => setMsg(apiError(e)),
  })
  const pretty = (s: string) => { try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s } }

  return (
    <div className="space-y-3">
      {msg && <p className="text-xs text-pink-600">{msg}</p>}
      {!data?.content.length ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">Nothing received yet. Once SePay is linked, every transaction shows up here first.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {data.content.map(i => (
            <div key={i.id}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70" onClick={() => setOpen(open === i.id ? null : i.id)}>
                {open === i.id ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <span className={clsx('text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS_TONE[i.status])}>{i.status}</span>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">{fmtDateTime(i.createdAt)}</span>
                <span className="text-sm text-slate-700 truncate flex-1 min-w-0">{i.message || i.externalId || '—'}</span>
                {(i.status === 'FAILED' || i.status === 'IGNORED') && (
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); replay.mutate(i.id) }}><RotateCcw size={13} />Replay</Button>
                )}
              </div>
              {open === i.id && (
                <pre className="mx-4 mb-3 text-[11px] leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto text-slate-600">{pretty(i.payload)}</pre>
              )}
            </div>
          ))}
        </div>
      )}
      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Newer</Button>
          <Button size="sm" variant="ghost" disabled={!!data?.last} onClick={() => setPage(p => p + 1)}>Older</Button>
        </div>
      )}
    </div>
  )
}
