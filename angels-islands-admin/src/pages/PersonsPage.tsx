import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Heart, Star } from 'lucide-react'
import { Button, Modal, Input, Textarea } from '../components/ui'
import { usePersons, useCreatePerson } from '../hooks/usePersons'
import type { Person, RelationshipType } from '../types'

const REL_LABELS: Record<RelationshipType, string> = {
  CRUSH: '💗 Crush', GIRLFRIEND: '❤️ Girlfriend', FRIEND: '🤝 Friend',
  EX: '💔 Ex', ACQUAINTANCE: '👋 Acquaintance', PEN_PAL: '✉️ Pen Pal', ONLINE_FRIEND: '💬 Online Friend',
}

export default function PersonsPage() {
  const { data: persons = [], isLoading } = usePersons()
  const createPerson = useCreatePerson()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', nickname: '', relationshipType: 'FRIEND' as RelationshipType, period: '', bio: '' })

  const handleCreate = () => {
    if (!form.name.trim()) return
    createPerson.mutate(form, { onSuccess: () => { setShowForm(false); setForm({ name: '', nickname: '', relationshipType: 'FRIEND', period: '', bio: '' }) } })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Persons</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={14} />Add</Button>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map((p: Person) => (
            <div key={p.id} onClick={() => navigate(`/persons/${p.id}`)}
              className="bg-white rounded-xl p-5 border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{p.displayName || p.name}</h3>
                  {p.nickname && <p className="text-xs text-slate-400">{p.nickname}</p>}
                </div>
                <div className="flex gap-1">
                  {p.isFavorite && <Heart size={14} className="text-rose-400 fill-rose-400" />}
                  {p.isFeatured && <Star size={14} className="text-amber-400 fill-amber-400" />}
                </div>
              </div>
              {p.relationshipType && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">{REL_LABELS[p.relationshipType] || p.relationshipType}</span>}
              {p.period && <p className="text-xs text-slate-400 mt-2">{p.period}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="New Person" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus required />
            <Input label="Nickname" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Relationship</label>
              <select className="w-full px-3 py-2 text-sm border rounded-lg border-slate-200"
                value={form.relationshipType} onChange={e => setForm({ ...form, relationshipType: e.target.value as RelationshipType })}>
                {Object.entries(REL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Input label="Period" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="2010-2013" />
            <Textarea label="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createPerson.isPending}>Create</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
