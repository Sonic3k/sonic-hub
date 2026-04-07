import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import api from '../api/client'
import type { Entry } from '../types'

const ENTRY_TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-slate-100 text-slate-600',
  OCCURRENCE: 'bg-orange-50 text-orange-600',
  PROGRESS: 'bg-green-50 text-green-600',
  MOOD: 'bg-purple-50 text-purple-600',
  REMINDER: 'bg-blue-50 text-blue-600',
  REMINDER_RESPONSE: 'bg-cyan-50 text-cyan-600',
}

export default function EntriesPage() {
  const qc = useQueryClient()
  const [days, setDays] = useState(7)

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ['entries', days],
    queryFn: () => api.get('/api/entries/recent', { params: { days } }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  })

  // Group by date
  const grouped: Record<string, Entry[]> = {}
  for (const e of entries) {
    const date = new Date(e.createdAt).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(e)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Entries</h1>
          <p className="text-sm text-slate-400 mt-0.5">{entries.length} entries in last {days} days</p>
        </div>
        <div className="flex gap-1.5">
          {[3, 7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                days === d ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-500')}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : entries.length === 0 ? (
        <p className="text-center py-16 text-slate-400 text-sm">No entries in the last {days} days</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">{date}</h3>
              <div className="space-y-1.5">
                {items.map(e => (
                  <div key={e.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
                    <Activity size={14} className="text-slate-300 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{e.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full', ENTRY_TYPE_COLORS[e.entryType] || ENTRY_TYPE_COLORS.NOTE)}>
                          {e.entryType}
                        </span>
                        <span className="text-xs text-slate-300">{e.entityType}</span>
                        {e.createdBy && <span className="text-xs text-slate-300">{e.createdBy}</span>}
                        <span className="text-xs text-slate-300">{new Date(e.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteMutation.mutate(e.id)} className="p-1 text-slate-300 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
