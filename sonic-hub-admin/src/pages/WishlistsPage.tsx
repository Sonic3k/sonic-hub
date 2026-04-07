import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Star, Archive, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import api from '../api/client'
import type { Wishlist } from '../types'

const CATEGORIES = ['general', 'tech', 'hobby', 'business', 'personal', 'creative']
const CAT_COLORS: Record<string, string> = {
  tech: 'bg-blue-50 text-blue-600', hobby: 'bg-green-50 text-green-600',
  business: 'bg-purple-50 text-purple-600', personal: 'bg-amber-50 text-amber-600',
  creative: 'bg-pink-50 text-pink-600', general: 'bg-slate-100 text-slate-500',
}

export default function WishlistsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'general' })

  const { data: items = [], isLoading } = useQuery<Wishlist[]>({
    queryKey: ['wishlists', showArchived],
    queryFn: () => api.get('/api/wishlists', { params: { archived: showArchived } }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/wishlists', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlists'] }); setShowCreate(false); setForm({ title: '', description: '', category: 'general' }) },
  })

  const archiveMutation = useMutation({
    mutationFn: (item: Wishlist) => api.put(`/api/wishlists/${item.id}`, { ...item, archived: !item.archived }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlists'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/wishlists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlists'] }),
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Wishlists</h1>
          <p className="text-sm text-slate-400 mt-0.5">{items.length} idea{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived(!showArchived)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              showArchived ? 'bg-slate-500 text-white border-slate-500' : 'bg-white text-slate-500 border-slate-200')}>
            <Archive size={12} className="inline mr-1" /> {showArchived ? 'Archived' : 'Active'}
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600">
            <Plus size={14} /> New Wish
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 space-y-3">
          <input placeholder="What's the dream?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div className="flex gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setForm({ ...form, category: c })}
                className={clsx('px-2.5 py-1 rounded text-xs font-medium', form.category === c ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500')}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => createMutation.mutate(form)} disabled={!form.title}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
        </div>
      )}

      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : items.length === 0 ? (
        <p className="text-center py-16 text-slate-400 text-sm">{showArchived ? 'No archived wishes' : 'No wishes yet. Dream big!'}</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <Star size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-800">{item.title}</div>
                {item.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full', CAT_COLORS[item.category] || CAT_COLORS.general)}>
                    {item.category}
                  </span>
                  {item.createdBy && <span className="text-xs text-slate-300">{item.createdBy}</span>}
                  <span className="text-xs text-slate-300">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => archiveMutation.mutate(item)} className="p-1 text-slate-300 hover:text-slate-500">
                  <Archive size={14} />
                </button>
                <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id) }} className="p-1 text-slate-300 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
