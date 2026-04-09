import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import clsx from 'clsx'
import api from '../api/client'
import type { TrackingRule, Task, Problem } from '../types'

const DOW_LABELS: Record<string, string> = { '1': 'T2', '2': 'T3', '3': 'T4', '4': 'T5', '5': 'T6', '6': 'T7', '7': 'CN' }

function formatDow(dow: string): string {
  return dow.split(',').map(d => DOW_LABELS[d.trim()] || d.trim()).join(', ')
}

function formatReminder(rule: TrackingRule): string {
  const parts: string[] = []
  if (rule.remindBeforeMinutes) parts.push(`${rule.remindBeforeMinutes}p trước deadline`)
  if (rule.remindAt) parts.push(`lúc ${new Date(rule.remindAt + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`)
  if (rule.remindIntervalDays) parts.push(`mỗi ${rule.remindIntervalDays} ngày`)
  if (rule.remindDaysOfWeek) parts.push(formatDow(rule.remindDaysOfWeek))
  if (rule.remindTime) parts.push(`lúc ${rule.remindTime}`)
  return parts.length ? parts.join(' · ') : 'Không có lịch nhắc'
}

function formatTracking(rule: TrackingRule): string {
  if (!rule.frequencyType) return ''
  const parts = [rule.frequencyType]
  if (rule.currentLimit != null) parts.push(`hiện: ${rule.currentLimit}`)
  if (rule.targetLimit != null) parts.push(`mục tiêu: ${rule.targetLimit}`)
  return parts.join(' · ')
}

const ENTITY_COLORS: Record<string, string> = {
  task: 'bg-blue-50 text-blue-600',
  problem: 'bg-red-50 text-red-600',
  todo: 'bg-green-50 text-green-600',
}

export default function TrackingRulesPage() {
  const qc = useQueryClient()

  const { data: rules = [], isLoading } = useQuery<TrackingRule[]>({
    queryKey: ['tracking-rules'],
    queryFn: () => api.get('/api/tracking-rules/active').then(r => r.data),
  })

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/api/tasks').then(r => r.data),
  })
  const { data: problems = [] } = useQuery<Problem[]>({
    queryKey: ['problems'],
    queryFn: () => api.get('/api/problems').then(r => r.data),
  })

  const entityNames: Record<string, string> = {}
  tasks.forEach(t => { entityNames[t.id] = t.title })
  problems.forEach(p => { entityNames[p.id] = p.title })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tracking-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracking-rules'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, entityType, active }: { id: string; entityType: string; active: boolean }) =>
      api.put(`/api/tracking-rules/${id}`, { entityType, active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracking-rules'] }),
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Tracking Rules</h1>
          <p className="text-sm text-slate-400 mt-0.5">{rules.length} active rules</p>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : rules.length === 0 ? (
        <p className="text-center py-16 text-slate-400 text-sm">
          Chưa có tracking rule nào. Tạo task/problem có reminder qua chat.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className={clsx(
              'flex items-start gap-3 p-3 bg-white rounded-lg border',
              rule.active ? 'border-slate-100' : 'border-slate-50 opacity-50'
            )}>
              <Bell size={14} className="text-slate-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {/* Entity name + type badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase',
                    ENTITY_COLORS[rule.entityType] || 'bg-slate-50 text-slate-500'
                  )}>{rule.entityType}</span>
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {entityNames[rule.entityId] || rule.entityId.slice(0, 8) + '...'}
                  </span>
                </div>

                {/* Reminder config */}
                <p className="text-xs text-slate-500 mt-1">🔔 {formatReminder(rule)}</p>

                {/* Tracking config */}
                {rule.frequencyType && (
                  <p className="text-xs text-slate-500 mt-0.5">📊 {formatTracking(rule)}</p>
                )}

                {/* Message */}
                {rule.reminderMessage && (
                  <p className="text-xs text-slate-400 mt-1 italic truncate">"{rule.reminderMessage}"</p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {rule.lastRemindedAt && (
                    <span className="text-[10px] text-slate-300">
                      Lần cuối: {new Date(rule.lastRemindedAt + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-300">
                    Tạo: {new Date(rule.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: rule.id, entityType: rule.entityType, active: !rule.active })}
                  className={clsx('p-1.5 rounded-lg transition-colors',
                    rule.active ? 'text-green-500 hover:bg-green-50' : 'text-slate-300 hover:bg-slate-50'
                  )}
                  title={rule.active ? 'Tắt' : 'Bật'}
                >
                  {rule.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => { if (confirm('Xoá tracking rule này?')) deleteMutation.mutate(rule.id) }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
