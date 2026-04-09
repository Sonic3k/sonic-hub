import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '../api/tags'
import { Button, Modal, Input } from '../components/ui'
import type { TagResponse, TagRequest } from '../types'

export default function TagsPage() {
  const { data: tags = [], isLoading } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.getAll })
  const qc = useQueryClient()
  const create = useMutation({ mutationFn: (d: TagRequest) => tagsApi.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }) })
  const remove = useMutation({ mutationFn: (id: number) => tagsApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }) })
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Tags</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={14} />Add</Button>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t: TagResponse) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-white border border-slate-100">
              {t.color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />}
              {t.name}
              <button onClick={() => remove.mutate(t.id)} className="text-slate-300 hover:text-rose-400"><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
      )}
      {showForm && (
        <Modal title="New Tag" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} autoFocus required />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => { create.mutate({ name }); setShowForm(false); setName('') }} disabled={!name.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
