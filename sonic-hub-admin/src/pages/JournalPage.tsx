import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Trash2 } from 'lucide-react'
import companionApi from '../api/companion'

interface Journal {
  id: string; assistant_id: string; date: string; content: string
  period_start: string; period_end: string; created_at: string
}

interface Assistant {
  id: string; nickname: string
}

export default function JournalPage() {
  const qc = useQueryClient()

  const { data: assistants = [] } = useQuery<Assistant[]>({
    queryKey: ['assistants'],
    queryFn: () => companionApi.get('/assistants').then(r => r.data),
  })

  const assistantId = assistants[0]?.id || ''

  const { data: journals = [], isLoading } = useQuery<Journal[]>({
    queryKey: ['journals', assistantId],
    queryFn: () => companionApi.get(`/journals/${assistantId}`).then(r => r.data),
    enabled: !!assistantId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companionApi.delete(`/journals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Journal</h1>
          <p className="text-sm text-slate-400 mt-0.5">Auto-generated daily summary at 4:00 AM</p>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : journals.length === 0 ? (
        <p className="text-center py-16 text-slate-400 text-sm">
          Chưa có journal nào. Sẽ tự động tạo lúc 4h sáng mỗi ngày.
        </p>
      ) : (
        <div className="space-y-4">
          {journals.map(j => (
            <div key={j.id} className="bg-white rounded-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(j.date + 'T00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <button onClick={() => { if (confirm('Xoá journal này?')) deleteMutation.mutate(j.id) }}
                  className="p-1 text-slate-300 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{j.content}</p>
              <p className="text-[10px] text-slate-300 mt-3">
                Period: {new Date(j.period_start).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {new Date(j.period_end).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
