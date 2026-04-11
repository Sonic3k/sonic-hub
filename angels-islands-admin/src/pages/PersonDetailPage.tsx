import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, MessageSquare, User, Pencil, Save, X } from 'lucide-react'
import { Button, Input, Textarea } from '../components/ui'
import { usePerson, useUpdatePerson } from '../hooks/usePersons'
import { useFacts, useEpisodes, useChapters, useTraits, useArchives } from '../hooks/useMemory'
import type { PersonRequest, RelationshipType } from '../types'

const REL_LABELS: Record<RelationshipType, string> = {
  CRUSH: '💗 Crush', GIRLFRIEND: '❤️ Girlfriend', FRIEND: '🤝 Friend',
  EX: '💔 Ex', ACQUAINTANCE: '👋 Acquaintance', PEN_PAL: '✉️ Pen Pal', ONLINE_FRIEND: '💬 Online Friend',
}

type Tab = 'info' | 'memory' | 'chat'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pid = id!
  const navigate = useNavigate()
  const { data: person, isLoading } = usePerson(pid)
  const updatePerson = useUpdatePerson(pid)
  const { data: facts = [] } = useFacts(pid)
  const { data: episodes = [] } = useEpisodes(pid)
  const { data: chapters = [] } = useChapters(pid)
  const { data: traits = [] } = useTraits(pid)
  const { data: archives = [] } = useArchives(pid)
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PersonRequest>({})

  if (isLoading) return <div className="p-4 md:p-8 text-slate-400">Loading...</div>
  if (!person) return <div className="p-4 md:p-8 text-slate-400">Not found</div>

  const startEdit = () => {
    setForm({
      name: person.name || '', displayName: person.displayName || '', alternativeName: person.alternativeName || '',
      nickname: person.nickname || '', dateOfBirth: person.dateOfBirth || '', bio: person.bio || '',
      relationshipType: person.relationshipType || 'FRIEND', period: person.period || '',
      firstMet: person.firstMet || '', howWeMet: person.howWeMet || '', song: person.song || '',
    })
    setEditing(true)
  }

  const saveEdit = () => {
    updatePerson.mutate(form, { onSuccess: () => setEditing(false) })
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'info', label: 'Info', icon: User },
    { key: 'memory', label: 'Memory', icon: Brain },
    { key: 'chat', label: 'Chat Archives', icon: MessageSquare },
  ]

  const infoFields: { label: string; key: string; value?: string }[] = [
    { label: 'Name', key: 'name', value: person.name },
    { label: 'Display Name', key: 'displayName', value: person.displayName },
    { label: 'Alternative Name', key: 'alternativeName', value: person.alternativeName },
    { label: 'Nickname', key: 'nickname', value: person.nickname },
    { label: 'Birthday', key: 'dateOfBirth', value: person.dateOfBirth },
    { label: 'Relationship', key: 'relationshipType', value: person.relationshipType ? REL_LABELS[person.relationshipType] : undefined },
    { label: 'Period', key: 'period', value: person.period },
    { label: 'First Met', key: 'firstMet', value: person.firstMet },
    { label: 'How We Met', key: 'howWeMet', value: person.howWeMet },
    { label: 'Song', key: 'song', value: person.song },
    { label: 'Bio', key: 'bio', value: person.bio },
  ]

  return (
    <div className="p-4 md:p-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-4">
        <ArrowLeft size={14} />Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{person.displayName || person.name}</h1>
          {person.nickname && <p className="text-sm text-slate-400">{person.nickname}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {person.relationshipType && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">{REL_LABELS[person.relationshipType]}</span>}
            {person.period && <span className="text-xs text-slate-400">{person.period}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-100 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm shrink-0 font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && !editing && (
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="ghost" onClick={startEdit}><Pencil size={12} />Edit</Button>
          </div>
          <div className="space-y-3">
            {infoFields.filter(f => f.value).map(f => (
              <div key={f.key}>
                <span className="text-xs text-slate-400">{f.label}</span>
                <p className="text-sm text-slate-700">{f.value}</p>
              </div>
            ))}
            {infoFields.every(f => !f.value) && <p className="text-sm text-slate-400">No info yet.</p>}
          </div>
        </div>
      )}

      {tab === 'info' && editing && (
        <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-3">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X size={12} />Cancel</Button>
            <Button size="sm" onClick={saveEdit} disabled={updatePerson.isPending}><Save size={12} />Save</Button>
          </div>
          <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} />
          <Input label="Display Name" value={form.displayName} onChange={e => set('displayName', e.target.value)} />
          <Input label="Alternative Name" value={form.alternativeName} onChange={e => set('alternativeName', e.target.value)} />
          <Input label="Nickname" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
          <Input label="Birthday" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Relationship</label>
            <select className="w-full px-3 py-2.5 text-sm border rounded-lg border-slate-200 bg-white"
              value={form.relationshipType} onChange={e => set('relationshipType', e.target.value)}>
              {Object.entries(REL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Input label="Period" value={form.period} onChange={e => set('period', e.target.value)} placeholder="2010-2013" />
          <Input label="First Met" type="date" value={form.firstMet} onChange={e => set('firstMet', e.target.value)} />
          <Textarea label="How We Met" value={form.howWeMet} onChange={e => set('howWeMet', e.target.value)} rows={2} />
          <Input label="Song" value={form.song} onChange={e => set('song', e.target.value)} />
          <Textarea label="Bio" value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} />
        </div>
      )}

      {tab === 'memory' && (
        <div className="space-y-6">
          {chapters.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Life Chapters</h3>
              <div className="space-y-2">{chapters.map(c => (
                <div key={c.id} className="bg-white rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-pink-500">{c.period}</span>
                    {c.sentiment && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{c.sentiment}</span>}
                  </div>
                  {c.title && <p className="text-sm font-medium text-slate-700">{c.title}</p>}
                  {c.summary && <p className="text-xs text-slate-500 mt-1">{c.summary}</p>}
                </div>
              ))}</div>
            </section>
          )}
          {traits.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Personality Traits</h3>
              <div className="flex flex-wrap gap-2">{traits.map(t => (
                <span key={t.id} className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600" title={t.description || ''}>{t.trait}</span>
              ))}</div>
            </section>
          )}
          {facts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Facts</h3>
              <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-50">
                {facts.map(f => (
                  <div key={f.id} className="px-3 md:px-4 py-2.5 flex flex-wrap items-baseline gap-1.5 md:gap-3">
                    <span className="text-xs text-slate-400 w-20 shrink-0">{f.category}</span>
                    <span className="text-xs font-medium text-slate-600">{f.key}:</span>
                    <span className="text-xs text-slate-700">{f.value}</span>
                    {f.period && <span className="text-xs text-slate-300 ml-auto">{f.period}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {episodes.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Episodes</h3>
              <div className="space-y-2">{episodes.map(e => (
                <div key={e.id} className="bg-white rounded-lg p-4 border border-slate-100">
                  <p className="text-sm text-slate-700">{e.summary}</p>
                  <div className="flex gap-2 mt-2">
                    {e.emotion && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">{e.emotion}</span>}
                    {e.importance && <span className="text-xs text-slate-300">importance: {e.importance}/10</span>}
                    {e.occurredAt && <span className="text-xs text-slate-300 ml-auto">{new Date(e.occurredAt.endsWith('Z') ? e.occurredAt : e.occurredAt + 'Z').toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}
                  </div>
                </div>
              ))}</div>
            </section>
          )}
          {facts.length === 0 && episodes.length === 0 && chapters.length === 0 && traits.length === 0 && (
            <p className="text-sm text-slate-400">No memories yet. Import chat archives to extract memories.</p>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="space-y-3">
          {archives.length === 0 ? <p className="text-sm text-slate-400">No chat archives.</p> : (
            archives.map(a => (
              <div key={a.id} className="bg-white rounded-lg p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{a.platform}</span>
                    {a.title && <span className="text-sm text-slate-700 ml-2">{a.title}</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.extractionStatus === 'DONE' ? 'bg-green-50 text-green-600' :
                    a.extractionStatus === 'ERROR' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                  }`}>{a.extractionStatus}</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  {a.messageCount && <span>{a.messageCount} messages</span>}
                  {a.dateFrom && <span>{a.dateFrom} → {a.dateTo}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
