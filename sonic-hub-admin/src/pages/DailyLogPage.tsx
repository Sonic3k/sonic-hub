import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Trash2, CheckCircle2, Clock, SkipForward, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import companionApi from '../api/companion'

interface DailyLogItem {
  title: string
  status: 'done' | 'in_progress' | 'skipped' | 'planned'
  type: 'today' | 'tomorrow'
}

interface DailyLog {
  id: string; assistant_id: string; date: string
  items: DailyLogItem[]; reflection: string | null
  created_at: string; updated_at: string
}

interface Assistant {
  id: string; nickname: string
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  done: { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
  in_progress: { icon: Clock, color: 'text-amber-500', label: 'In Progress' },
  skipped: { icon: SkipForward, color: 'text-slate-400', label: 'Skipped' },
  planned: { icon: ArrowRight, color: 'text-blue-500', label: 'Planned' },
}

export default function DailyLogPage() {
  const qc = useQueryClient()

  const { data: assistants = [] } = useQuery<Assistant[]>({
    queryKey: ['assistants'],
    queryFn: () => companionApi.get('/assistants').then(r => r.data),
  })

  const assistantId = assistants[0]?.id || ''

  const { data: logs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ['daily-logs', assistantId],
    queryFn: () => companionApi.get(`/daily-logs/${assistantId}`).then(r => r.data),
    enabled: !!assistantId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companionApi.delete(`/daily-logs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-logs'] }),
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Daily Log</h1>
          <p className="text-sm text-slate-400 mt-0.5">What you did today, what's planned for tomorrow</p>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : logs.length === 0 ? (
        <p className="text-center py-16 text-slate-400 text-sm">
          Chưa có daily log nào. Tommy sẽ hỏi lúc 22h hàng ngày.
        </p>
      ) : (
        <div className="space-y-4">
          {logs.map(log => {
            const todayItems = log.items.filter(i => i.type === 'today')
            const tomorrowItems = log.items.filter(i => i.type === 'tomorrow')

            return (
              <div key={log.id} className="bg-white rounded-lg border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {new Date(log.date + 'T00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {todayItems.filter(i => i.status === 'done').length}/{todayItems.length} done
                    </span>
                  </div>
                  <button onClick={() => { if (confirm('Xoá daily log này?')) deleteMutation.mutate(log.id) }}
                    className="p-1 text-slate-300 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Today items */}
                {todayItems.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Hôm nay</p>
                    <div className="space-y-1">
                      {todayItems.map((item, i) => {
                        const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned
                        const Icon = cfg.icon
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <Icon size={14} className={cfg.color} />
                            <span className={clsx('text-sm', item.status === 'skipped' ? 'text-slate-400 line-through' : 'text-slate-600')}>
                              {item.title}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Tomorrow items */}
                {tomorrowItems.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Ngày mai</p>
                    <div className="space-y-1">
                      {tomorrowItems.map((item, i) => {
                        const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned
                        const Icon = cfg.icon
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <Icon size={14} className={cfg.color} />
                            <span className="text-sm text-slate-600">{item.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Reflection */}
                {log.reflection && (
                  <p className="text-xs text-slate-400 italic border-t border-slate-50 pt-2 mt-2">
                    "{log.reflection}"
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
