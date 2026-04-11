import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Heart, Star } from 'lucide-react'
import { Button, Modal, Input, Textarea } from '../components/ui'
import { usePersons, useCreatePerson } from '../hooks/usePersons'
import type { PersonSummary, PersonRequest, RelationshipType } from '../types'

const REL_LABELS: Record<RelationshipType, string> = {
  CRUSH: '💗 Crush', GIRLFRIEND: '❤️ Girlfriend', FRIEND: '🤝 Friend',
  EX: '💔 Ex', ACQUAINTANCE: '👋 Acquaintance', PEN_PAL: '✉️ Pen Pal', ONLINE_FRIEND: '💬 Online Friend',
}

const emptyForm = { name: '', displayName: '', nickname: '', dateOfBirth: '', relationshipType: 'FRIEND' as RelationshipType, period: '', firstMet: '', howWeMet: '', song: '', bio: '', isSelf: false }

export default function PersonsPage() {
  const { data: persons = [], isLoading } = usePersons()
  const createPerson = useCreatePerson()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const handleCreate = () => {
    if (!form.name.trim()) return
    const payload: PersonRequest = { ...form } as PersonRequest
    if (!form.displayName) delete payload.displayName
    if (!form.dateOfBirth) delete payload.dateOfBirth
    if (!form.firstMet) delete payload.firstMet
    createPerson.mutate(payload, { onSuccess: () => { setShowForm(false); setForm(emptyForm) } })
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Persons</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={14} />Add</Button>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map((p: PersonSummary) => (
            <div key={p.id} onClick={() => navigate(`/persons/${p.id}`)}
              className="bg-white rounded-xl p-4 md:p-5 border border-slate-100 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{p.displayName || p.name}</h3>
                  {p.nickname && <p className="text-xs text-slate-400">{p.nickname}</p>}
                </div>
                <div className="flex gap-1">
                  {p.isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">SELF</span>}
                  {p.isFavorite && <Heart size={14} className="text-rose-400 fill-rose-400" />}
                  {p.isFeatured && <Star size={14} className="text-amber-400 fill-amber-400" />}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {p.relationshipType && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">{REL_LABELS[p.relationshipType] || p.relationshipType}</span>}
                {p.period && <span className="text-xs text-slate-400">{p.period}</span>}
              </div>
              {p.song && <p className="text-xs text-slate-300 mt-2 italic">♪ {p.song}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="New Person" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <Input label="Name *" value={form.name} onChange={e => set('name', e.target.value)} autoFocus required />
            <Input label="Display Name" value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Tên hiển thị" />
            <Input label="Nickname" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Relationship</label>
              <select className="w-full px-3 py-2.5 text-sm border rounded-lg border-slate-200 bg-white"
                value={form.relationshipType} onChange={e => set('relationshipType', e.target.value)}>
                {Object.entries(REL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Input label="Period" value={form.period} onChange={e => set('period', e.target.value)} placeholder="2010-2013" />
            <Input label="First Met" type="date" value={form.firstMet} onChange={e => set('firstMet', e.target.value)} />
            <Textarea label="How We Met" value={form.howWeMet} onChange={e => set('howWeMet', e.target.value)} rows={2} placeholder="Gặp nhau ở đâu, hoàn cảnh gì..." />
            <Input label="Song" value={form.song} onChange={e => set('song', e.target.value)} placeholder="Bài hát gắn liền" />
            <Textarea label="Bio" value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isSelf} onChange={e => setForm(f => ({ ...f, isSelf: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-200" />
              <span className="text-xs text-slate-600">This is me (Sonic3k)</span>
            </label>
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
