import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collectionsApi } from '../api/collections'
import { Button, Modal, Input, Textarea } from '../components/ui'
import type { CollectionResponse, CollectionRequest } from '../types'

export default function CollectionsPage() {
  const { data: collections = [], isLoading } = useQuery({ queryKey: ['collections'], queryFn: collectionsApi.getAll })
  const qc = useQueryClient()
  const create = useMutation({ mutationFn: (d: CollectionRequest) => collectionsApi.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }) })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Collections</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={14} />Add</Button>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c: CollectionResponse) => (
            <div key={c.id} className="bg-white rounded-xl p-5 border border-slate-100">
              <h3 className="font-semibold text-slate-800">{c.name}</h3>
              {c.description && <p className="text-xs text-slate-400 mt-1">{c.description}</p>}
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <Modal title="New Collection" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus required />
            <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => { create.mutate(form); setShowForm(false) }} disabled={!form.name.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
