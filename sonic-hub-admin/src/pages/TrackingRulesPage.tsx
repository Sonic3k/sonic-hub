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
  return parts.length ? parts.join(' · ') : 'Không có reminder'
}

function formatTracking(rule: TrackingRule): string {
  if (!rule.frequencyType) return ''
  const parts = [rule.frequencyType]
  if (rule.currentLimit != null) parts.push(`hiện: ${rule.currentLimit}`)
  if (rule.targetLimit != null) parts.push(`mục tiêu: ${rule.targetLimit}`)
  return parts.join(' · ')
}

export default function TrackingRulesPage() {
  const qc = useQueryClient()

  const { data: rules = [], isLoading } = useQuery<TrackingRule[]>({
    queryKey: ['tracking-rules'],
    queryFn: () => api.get('/api/tracking-rules/active').then(r => r.data),
  })

  // Load entity names
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

  if (isLoading) return <div className="p-8 text-center text-[#9ca3af]">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bell size={20} className="text-indigo-500" />
        <h1 className="text-lg font-semibold text-[#1a1d2d]">Tracking Rules</h1>
        <span className="text-xs text-[#9ca3af]">{rules.length} active</span>
      </div>

      {rules.length === 0 ? (
        <p className="text-center py-12 text-sm text-[#9ca3af]">
          Chưa có tracking rule nào. Tạo task/problem có reminder qua Tommy.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={clsx(
              'bg-white rounded-xl border p-4',
              rule.active ? 'border-[#e5e7eb]' : 'border-[#f3f4f6] opacity-50'
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Entity */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
                      rule.entityType === 'task' ? 'bg-blue-50 text-blue-600' :
                      rule.entityType === 'problem' ? 'bg-red-50 text-red-600' :
                      'bg-gray-50 text-gray-600'
                    )}>{rule.entityType}</span>
                    <span className="text-sm font-medium text-[#374151] truncate">
                      {entityNames[rule.entityId] || rule.entityId.slice(0, 8) + '...'}
                    </span>
                  </div>

                  {/* Reminder config */}
                  <div className="text-xs text-[#6b7280]">
                    🔔 {formatReminder(rule)}
                  </div>

                  {/* Tracking config */}
                  {rule.frequencyType && (
                    <div className="text-xs text-[#6b7280] mt-0.5">
                      📊 {formatTracking(rule)}
                    </div>
                  )}

                  {/* Message */}
                  {rule.reminderMessage && (
                    <div className="text-xs text-[#9ca3af] mt-1 italic truncate">
                      "{rule.reminderMessage}"
                    </div>
                  )}

                  {/* Last reminded */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[#9ca3af]">
                    {rule.lastRemindedAt && (
                      <span>Lần cuối: {new Date(rule.lastRemindedAt + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    <span>Tạo: {new Date(rule.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleMutation.mutate({ id: rule.id, entityType: rule.entityType, active: !rule.active })}
                    className={clsx('p-1.5 rounded-lg transition-colors',
                      rule.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'
                    )}
                    title={rule.active ? 'Tắt' : 'Bật'}
                  >
                    {rule.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => { if (confirm('Xoá tracking rule này?')) deleteMutation.mutate(rule.id) }}
                    className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
