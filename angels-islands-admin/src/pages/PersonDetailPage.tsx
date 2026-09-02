import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, MessageSquare, User, Pencil, Save, X, Plus, Trash2, Upload, Image as ImageIcon, FolderOpen, FolderPlus, UserMinus, Bot } from 'lucide-react'
import { Button, Input, Textarea, Modal, Select } from '../components/ui'
import { usePerson, useUpdatePerson } from '../hooks/usePersons'
import { useFacts, useEpisodes, useChapters, useTraits, useArchives } from '../hooks/useMemory'
import { personsApi } from '../api/persons'
import { memoryApi } from '../api/memory'
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { PersonRequest, RelationshipType, ContactPlatform, ContactRequest, MediaFileResponse, CollectionResponse, ChatArchiveResponse, ChapterResponse, TraitResponse, FactResponse, EpisodeResponse, ChapterRequest, TraitRequest, FactRequest, EpisodeRequest } from '../types'
import api from '../api/client'
import { mediaApi, uploadApi, collectionBrowseApi, collectionsApi } from '../api/collections'
import { Lightbox, MediaItem } from '../components/media'
import CollectionPicker from '../components/CollectionPicker'
import ChatViewer from '../components/ChatViewer'
import CompanionTab from '../components/CompanionTab'

const REL_LABELS: Record<RelationshipType, string> = {
  CRUSH: '💗 Crush', GIRLFRIEND: '❤️ Girlfriend', FRIEND: '🤝 Friend',
  EX: '💔 Ex', ACQUAINTANCE: '👋 Acquaintance', PEN_PAL: '✉️ Pen Pal', ONLINE_FRIEND: '💬 Online Friend',
}

const CONTACT_PLATFORMS: ContactPlatform[] = ['YAHOO', 'FACEBOOK', 'ZALO', 'TELEGRAM', 'SMS', 'PHONE', 'BLOG', 'INSTAGRAM', 'TIKTOK', 'OTHER']

type Tab = 'info' | 'photos' | 'memory' | 'chat' | 'companion'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pid = id!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: person, isLoading } = usePerson(pid)
  const updatePerson = useUpdatePerson(pid)
  const { data: facts = [] } = useFacts(pid)
  const { data: episodes = [] } = useEpisodes(pid)
  const { data: chapters = [] } = useChapters(pid)
  const { data: traits = [] } = useTraits(pid)
  const { data: archives = [] } = useArchives(pid)
  const [tab, setTab] = useState<Tab>('info')
  const [viewerArchive, setViewerArchive] = useState<ChatArchiveResponse | null>(null)
  const [memForm, setMemForm] = useState<{ kind: 'chapter' | 'trait' | 'fact' | 'episode'; item?: ChapterResponse | TraitResponse | FactResponse | EpisodeResponse } | null>(null)

  const invalidateMemory = (kind: string) => {
    const key = { chapter: 'chapters', trait: 'traits', fact: 'facts', episode: 'episodes' }[kind]
    queryClient.invalidateQueries({ queryKey: [key, pid] })
  }
  const deleteMemItem = async (kind: 'chapter' | 'trait' | 'fact' | 'episode', id: string, label: string) => {
    if (!confirm(`Delete ${label}?`)) return
    if (kind === 'chapter') await memoryApi.deleteChapter(pid, id)
    if (kind === 'trait') await memoryApi.deleteTrait(pid, id)
    if (kind === 'fact') await memoryApi.deleteFact(pid, id)
    if (kind === 'episode') await memoryApi.deleteEpisode(pid, id)
    invalidateMemory(kind)
  }
  const wasExtracting = useRef(false)
  useEffect(() => {
    const extracting = archives.some(a => a.extractionStatus === 'EXTRACTING')
    if (wasExtracting.current && !extracting) {
      queryClient.invalidateQueries({ queryKey: ['facts', pid] })
      queryClient.invalidateQueries({ queryKey: ['episodes', pid] })
    }
    wasExtracting.current = extracting
  }, [archives, pid, queryClient])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PersonRequest>({})
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState<ContactRequest>({ platform: 'YAHOO', identifier: '' })

  const addContact = useMutation({
    mutationFn: (data: ContactRequest) => personsApi.addContact(pid, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['person', pid] }); setShowContactForm(false); setContactForm({ platform: 'YAHOO', identifier: '' }) },
  })
  const deleteContact = useMutation({
    mutationFn: (contactId: string) => personsApi.deleteContact(pid, contactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['person', pid] }),
  })
  const importChat = useMutation({
    mutationFn: (file: File) => memoryApi.importYahooChat(pid, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['archives', pid] }); queryClient.invalidateQueries({ queryKey: ['person', pid] }) },
  })
  const extractArchive = useMutation({
    mutationFn: (archiveId: string) => memoryApi.extractArchive(pid, archiveId),
    onSuccess: (res) => {
      if (res.status === 'NOT_CONFIGURED') alert(res.message || 'LLM not configured')
      queryClient.invalidateQueries({ queryKey: ['archives', pid] })
    },
  })

  const deleteArchive = useMutation({
    mutationFn: (archiveId: string) => memoryApi.deleteArchive(pid, archiveId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['archives', pid] }),
  })

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
    { key: 'photos', label: 'Photos', icon: ImageIcon },
    { key: 'memory', label: 'Memory', icon: Brain },
    { key: 'chat', label: 'Chat Archives', icon: MessageSquare },
    { key: 'companion', label: 'Companion', icon: Bot },
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
          <h1 className="text-xl font-semibold text-slate-800">
            {person.displayName || person.name}
            {person.isSelf && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium align-middle">SELF</span>}
          </h1>
          {person.nickname && <p className="text-sm text-slate-400">{person.nickname}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {person.relationshipType && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">{REL_LABELS[person.relationshipType]}</span>}
            {person.period && <span className="text-xs text-slate-400">{person.period}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm shrink-0 font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'photos' && <PersonPhotosTab personId={pid} />}

      {tab === 'companion' && <CompanionTab personId={pid} personName={person.displayName || person.name} />}

      {memForm && (
        <MemoryFormModal personId={pid} kind={memForm.kind} item={memForm.item}
          onSaved={() => { invalidateMemory(memForm.kind); setMemForm(null) }}
          onClose={() => setMemForm(null)} />
      )}

      {viewerArchive && (
        <ChatViewer personId={pid} archive={viewerArchive}
          personName={person.displayName || person.name}
          onClose={() => setViewerArchive(null)} />
      )}

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

      {tab === 'info' && (
        <div className="bg-white rounded-xl p-5 border border-slate-100 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Contacts / Identities</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowContactForm(true)}><Plus size={12} />Add</Button>
          </div>
          {(!person.contacts || person.contacts.length === 0) ? (
            <p className="text-xs text-slate-400">No contacts added yet.</p>
          ) : (
            <div className="space-y-2">
              {person.contacts.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{c.platform}</span>
                    <span className="text-sm text-slate-700 font-medium">{c.identifier}</span>
                    {c.displayName && <span className="text-xs text-slate-400">({c.displayName})</span>}
                  </div>
                  <button onClick={() => { if (confirm('Delete this contact?')) deleteContact.mutate(c.id) }}
                    className="text-slate-300 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showContactForm && (
        <Modal title="Add Contact" onClose={() => setShowContactForm(false)}>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Platform</label>
              <select className="w-full px-3 py-2.5 text-sm border rounded-lg border-slate-200 bg-white"
                value={contactForm.platform} onChange={e => setContactForm(f => ({ ...f, platform: e.target.value }))}>
                {CONTACT_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input label="Identifier *" value={contactForm.identifier} onChange={e => setContactForm(f => ({ ...f, identifier: e.target.value }))}
              placeholder="yahoo nick, fb link, phone number..." autoFocus />
            <Input label="Display Name" value={contactForm.displayName || ''} onChange={e => setContactForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Display name on that platform" />
            <Input label="Notes" value={contactForm.notes || ''} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowContactForm(false)}>Cancel</Button>
              <Button onClick={() => addContact.mutate(contactForm)} disabled={!contactForm.identifier.trim() || addContact.isPending}>Add</Button>
            </div>
          </div>
        </Modal>
      )}

      {tab === 'memory' && (
        <div className="space-y-6">
          {(
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-600">Life Chapters</h3>
                <button onClick={() => setMemForm({ kind: 'chapter' })}
                  className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded transition-colors">
                  <Plus size={11} />Add
                </button>
              </div>
              <div className="space-y-2">{chapters.map(c => (
                <div key={c.id} className="relative group bg-white rounded-lg p-4 border border-slate-100">
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setMemForm({ kind: 'chapter', item: c })} className="p-1 text-slate-300 hover:text-pink-500 rounded transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => deleteMemItem('chapter', c.id, `chapter "${c.period}"`)} className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"><X size={12} /></button>
                  </span>
                  <div className="flex items-center gap-2 mb-1 pr-14">
                    <span className="text-xs font-mono text-pink-500">{c.period}</span>
                    {c.sentiment && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{c.sentiment}</span>}
                  </div>
                  {c.title && <p className="text-sm font-medium text-slate-700">{c.title}</p>}
                  {c.summary && <p className="text-xs text-slate-500 mt-1">{c.summary}</p>}
                </div>
              ))}</div>
            </section>
          )}
          {(
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-600">Personality Traits</h3>
                <button onClick={() => setMemForm({ kind: 'trait' })}
                  className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded transition-colors">
                  <Plus size={11} />Add
                </button>
              </div>
              <div className="space-y-2">{traits.map(t => (
                <div key={t.id} className="relative group bg-white rounded-lg px-4 py-2.5 border border-slate-100">
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setMemForm({ kind: 'trait', item: t })} className="p-1 text-slate-300 hover:text-pink-500 rounded transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => deleteMemItem('trait', t.id, `trait "${t.trait}"`)} className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"><X size={12} /></button>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap pr-14">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{t.trait}</span>
                    {t.period && <span className="text-[11px] text-slate-300">{t.period}</span>}
                  </div>
                  {t.description && <p className="text-xs text-slate-600 mt-1">{t.description}</p>}
                  {t.evidence && <p className="text-[11px] text-slate-400 italic mt-0.5">"{t.evidence}"</p>}
                </div>
              ))}</div>
            </section>
          )}
          {(
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-600">Facts</h3>
                <button onClick={() => setMemForm({ kind: 'fact' })}
                  className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded transition-colors">
                  <Plus size={11} />Add
                </button>
              </div>
              <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-50">
                {facts.map(f => (
                  <div key={f.id} className="group px-3 md:px-4 py-2.5 flex flex-wrap items-baseline gap-1.5 md:gap-3">
                    <span className="text-xs text-slate-400 w-20 shrink-0">{f.category}</span>
                    <span className="text-xs font-medium text-slate-600">{f.key}:</span>
                    <span className="text-xs text-slate-700">{f.value}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {f.period && <span className="text-xs text-slate-300">{f.period}</span>}
                      <button onClick={() => setMemForm({ kind: 'fact', item: f })} className="p-1 text-slate-300 hover:text-pink-500 rounded transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"><Pencil size={12} /></button>
                      <button onClick={() => deleteMemItem('fact', f.id, `fact "${f.key}"`)} className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"><X size={12} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {(
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-600">Episodes</h3>
                <button onClick={() => setMemForm({ kind: 'episode' })}
                  className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded transition-colors">
                  <Plus size={11} />Add
                </button>
              </div>
              <div className="space-y-2">{episodes.map(e => (
                <div key={e.id} className="relative group bg-white rounded-lg p-4 border border-slate-100">
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setMemForm({ kind: 'episode', item: e })} className="p-1 text-slate-300 hover:text-pink-500 rounded transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => deleteMemItem('episode', e.id, `this episode`)} className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"><X size={12} /></button>
                  </span>
                  <p className="text-sm text-slate-700 pr-14">{e.summary}</p>
                  <div className="flex gap-2 mt-2">
                    {e.emotion && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">{e.emotion}</span>}
                    {e.importance && <span className="text-xs text-slate-300">importance: {e.importance}/10</span>}
                    {e.occurredAt && <span className="text-xs text-slate-300 ml-auto">{String(e.occurredAt).slice(0, 10)}</span>}
                  </div>
                </div>
              ))}</div>
            </section>
          )}
          {facts.length === 0 && episodes.length === 0 && chapters.length === 0 && traits.length === 0 && (
            <p className="text-sm text-slate-400">No memories yet — hit Extract on the Chat Archives tab, or add manually with + Add in each section.</p>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-600">Chat Archives</h3>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-pink-500 text-white hover:bg-pink-600 active:scale-95 transition-colors">
              <input type="file" accept=".txt" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (file) importChat.mutate(file)
                e.target.value = ''
              }} />
              <Upload size={12} />{importChat.isPending ? 'Importing...' : 'Import Yahoo'}
            </label>
          </div>
          {importChat.isSuccess && (
            <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg">
              Imported {(importChat.data as any)?.totalMessages} messages from {(importChat.data as any)?.totalConversations} conversations
            </div>
          )}
          {importChat.isError && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg">Import failed: {(importChat.error as Error)?.message}</div>
          )}
          {archives.length === 0 && !importChat.isPending ? <p className="text-sm text-slate-400">No chat archives.</p> : (
            archives.map(a => (
              <div key={a.id} className="bg-white rounded-lg p-4 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div onClick={() => setViewerArchive(a)} className="cursor-pointer min-w-0 flex items-center gap-2 hover:opacity-70 transition-opacity">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">{a.platform}</span>
                    {a.title && <span className="text-sm text-slate-700 truncate min-w-0">{a.title}</span>}
                    <span className="text-[11px] text-pink-400 shrink-0">Read →</span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.extractionStatus === 'DONE' ? 'bg-green-50 text-green-600' :
                      a.extractionStatus === 'ERROR' ? 'bg-red-50 text-red-600' :
                      a.extractionStatus === 'EXTRACTING' ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-slate-50 text-slate-500'
                    }`}>{a.extractionStatus}</span>
                    {a.extractionStatus !== 'EXTRACTING' && (
                      <button onClick={() => extractArchive.mutate(a.id)} title="Extract memories from this archive"
                        className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded transition-colors">
                        <Brain size={12} />{a.extractionStatus === 'DONE' ? 'Re-extract' : 'Extract'}
                      </button>
                    )}
                    <button onClick={() => { if (confirm('Delete this archive and all messages?')) deleteArchive.mutate(a.id) }}
                      className="text-slate-300 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  {a.messageCount && <span>{a.messageCount} messages</span>}
                  {a.dateFrom && <span>{String(a.dateFrom).slice(0, 10)} → {String(a.dateTo).slice(0, 10)}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}


// ── Photos tab: collections + all media of this person ──────────────────────

function PersonPhotosTab({ personId }: { personId: string }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [activeQ, setActiveQ] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<MediaFileResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [picker, setPicker] = useState<string[] | null>(null)
  const [linkPicker, setLinkPicker] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: collections = [] } = useQuery({
    queryKey: ['collections', 'person', personId],
    queryFn: () => collectionBrowseApi.getByPerson(personId),
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['media', 'person', personId, activeQ],
    queryFn: ({ pageParam = 0 }) =>
      api.get('/api/media-files/search', { params: {
        personId, q: activeQ || undefined, page: pageParam, size: 100, inclDetails: true, inclPersons: true, inclTags: true,
      } }).then(r => r.data as { content: MediaFileResponse[]; number: number; last: boolean; totalElements: number }),
    initialPageParam: 0,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
  })
  const items: MediaFileResponse[] = (data?.pages || []).flatMap(p => p.content)
  const total = data?.pages?.[0]?.totalElements ?? 0

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['media', 'person', personId] })
    qc.invalidateQueries({ queryKey: ['collections'] })
    qc.invalidateQueries({ queryKey: ['library'] })
  }
  const idsArr = () => Array.from(selectedIds)
  const selectMode = selectedIds.size > 0
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next
  })

  const unlinkCollection = async (c: CollectionResponse) => {
    if (!confirm(`Remove "${c.name}" from this person?`)) return
    const detail = await collectionBrowseApi.getById(c.id)
    const ids = (detail.persons || []).map(p => p.id).filter(x => x !== personId)
    await collectionsApi.update(c.id, { personIds: ids })
    invalidate()
  }

  const linkCollection = async (targetId: string) => {
    const detail = await collectionBrowseApi.getById(targetId)
    const ids = new Set((detail.persons || []).map(p => p.id))
    ids.add(personId)
    await collectionsApi.update(targetId, { personIds: Array.from(ids) })
    setLinkPicker(false)
    invalidate()
  }

  const removeFromPerson = async () => {
    if (!selectedIds.size || !confirm(`Untag ${selectedIds.size} file(s) from this person? Files are not deleted.`)) return
    await mediaApi.removePersonBatch(idsArr(), personId)
    setSelectedIds(new Set())
    invalidate()
  }

  const handleDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} file(s)? This also removes from storage.`)) return
    setDeleting(true)
    try { await uploadApi.deleteMedia(idsArr()); setSelectedIds(new Set()); invalidate() }
    catch { alert('Delete failed') }
    setDeleting(false)
  }

  const handleAddTo = async (targetId: string) => {
    if (!picker) return
    await mediaApi.addToCollectionBatch(targetId, picker)
    setPicker(null); setSelectedIds(new Set()); invalidate()
  }

  return (
    <div>
      {/* Person's collections */}
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Collections · {collections.length}</h2>
        <button onClick={() => setLinkPicker(true)}
          className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded transition-colors">
          <Plus size={11} />Link collection
        </button>
      </div>
      {collections.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-7">
          {collections.map((c: CollectionResponse) => (
            <div key={c.id} className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-pink-100/50 transition-all">
              <div onClick={() => navigate(`/collections?id=${c.id}`)}
                className="cursor-pointer aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                {c.thumbnailUrl
                  ? <img src={c.thumbnailUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                  : <FolderOpen size={24} strokeWidth={1.2} className="text-slate-300" />}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                <p className="text-[10px] text-slate-400">{c.mediaCount || 0} files</p>
              </div>
              <button onClick={() => unlinkCollection(c)} title="Remove from person"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 hover:bg-rose-500 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photos */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Photos & Videos · {total}</h2>
        {!selectMode && (
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setActiveQ(q.trim()); if (e.key === 'Escape') { setQ(''); setActiveQ('') } }}
            placeholder="Search..."
            className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-full outline-none focus:border-pink-300 w-32 md:w-44" />
        )}
        {selectMode && (
          <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
            <span className="text-xs text-pink-500 font-medium mr-1">{selectedIds.size} selected</span>
            <button onClick={() => setPicker(idsArr())} title="Add to collection"
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><FolderPlus size={14} /></button>
            <button onClick={removeFromPerson} title="Untag from this person"
              className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><UserMinus size={14} /></button>
            <button onClick={handleDelete} disabled={deleting} title="Delete files"
              className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"><Trash2 size={14} /></button>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"><X size={14} /></button>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon size={32} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
          <p className="text-sm text-slate-400">No photos for this person yet</p>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-2">
        {items.map(m => (
          <MediaItem key={m.id} media={m}
            onClick={() => setSelectedMedia(m)}
            selected={selectedIds.has(m.id)}
            onSelect={toggleSelect}
            selectMode={selectMode} />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center py-4">
          <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
            className="text-xs text-slate-500 hover:text-pink-500 px-3 py-1.5 rounded hover:bg-slate-100 disabled:opacity-50">
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {linkPicker && (
        <CollectionPicker title="Link collection to person" confirmLabel="Link"
          onSelect={linkCollection} onClose={() => setLinkPicker(false)} />
      )}
      {picker && (
        <CollectionPicker title={`Add ${picker.length} file(s) to...`} confirmLabel="Add"
          onSelect={handleAddTo} onClose={() => setPicker(null)} />
      )}
      {selectedMedia && (
        <Lightbox media={selectedMedia} allMedia={items} collectionId={null}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)}
          onChanged={m => { setSelectedMedia(m); invalidate() }}
          onAddTo={id => setPicker([id])} />
      )}
    </div>
  )
}


// ── Memory add/edit modal (facts / traits / episodes / chapters) ─────────────

const FACT_CATEGORIES = ['basic', 'preference', 'habit', 'work', 'family', 'hobby']

function MemoryFormModal({ personId, kind, item, onSaved, onClose }: {
  personId: string
  kind: 'chapter' | 'trait' | 'fact' | 'episode'
  item?: ChapterResponse | TraitResponse | FactResponse | EpisodeResponse
  onSaved: () => void
  onClose: () => void
}) {
  const editing = !!item
  const [f, setF] = useState<Record<string, string | number | undefined>>(() => {
    if (kind === 'fact') { const x = item as FactResponse | undefined; return { category: x?.category || 'basic', key: x?.key || '', value: x?.value || '', period: x?.period || '', confidence: x?.confidence ?? 0.8 } }
    if (kind === 'trait') { const x = item as TraitResponse | undefined; return { trait: x?.trait || '', description: x?.description || '', evidence: x?.evidence || '', period: x?.period || '' } }
    if (kind === 'episode') { const x = item as EpisodeResponse | undefined; return { summary: x?.summary || '', emotion: x?.emotion || '', importance: x?.importance ?? 5, occurredAt: x?.occurredAt ? String(x.occurredAt).slice(0, 10) : '' } }
    const x = item as ChapterResponse | undefined; return { period: x?.period || '', title: x?.title || '', summary: x?.summary || '', sentiment: x?.sentiment || '' }
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))


  const valid = kind === 'fact' ? !!(f.key && f.value)
    : kind === 'trait' ? !!f.trait
    : kind === 'episode' ? !!f.summary
    : !!f.period

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      if (kind === 'fact') {
        const data: FactRequest = { category: String(f.category), key: String(f.key), value: String(f.value), period: String(f.period), confidence: Number(f.confidence) }
        editing ? await memoryApi.updateFact(personId, item!.id, data) : await memoryApi.createFact(personId, data)
      } else if (kind === 'trait') {
        const data: TraitRequest = { trait: String(f.trait), description: String(f.description), evidence: String(f.evidence), period: String(f.period) }
        editing ? await memoryApi.updateTrait(personId, item!.id, data) : await memoryApi.createTrait(personId, data)
      } else if (kind === 'episode') {
        const data: EpisodeRequest = { summary: String(f.summary), emotion: String(f.emotion), importance: Number(f.importance), occurredAt: f.occurredAt ? `${f.occurredAt}T00:00:00` : undefined }
        editing ? await memoryApi.updateEpisode(personId, item!.id, data) : await memoryApi.createEpisode(personId, data)
      } else {
        const data: ChapterRequest = { period: String(f.period), title: String(f.title), summary: String(f.summary), sentiment: String(f.sentiment) }
        editing ? await memoryApi.updateChapter(personId, item!.id, data) : await memoryApi.createChapter(personId, data)
      }
      onSaved()
    } catch { alert('Save failed') }
    setSaving(false)
  }

  const titles = { fact: 'Fact', trait: 'Trait', episode: 'Episode', chapter: 'Life Chapter' }

  return (
    <Modal title={`${editing ? 'Edit' : 'Add'} ${titles[kind]}`} onClose={onClose}>
      <div className="space-y-3">
        {kind === 'fact' && <>
          <Select label="Category" value={String(f.category)} onChange={e => set('category', e.target.value)}>
            {FACT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Key *" value={String(f.key)} onChange={e => set('key', e.target.value)} placeholder="truong_hoc, mon_an_thich..." />
          <Input label="Value *" value={String(f.value)} onChange={e => set('value', e.target.value)} placeholder="Chu Van An High School" />
          <Input label="Period" value={String(f.period)} onChange={e => set('period', e.target.value)} placeholder="2010 or 2009-2011, empty = always true" />
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Confidence · {Number(f.confidence).toFixed(2)}</label>
            <input type="range" min={0.1} max={1} step={0.05} value={Number(f.confidence)}
              onChange={e => set('confidence', parseFloat(e.target.value))} className="w-full accent-pink-500" />
          </div>
        </>}
        {kind === 'trait' && <>
          <Input label="Trait *" value={String(f.trait)} onChange={e => set('trait', e.target.value)} placeholder="clingy, thoughtful..." />
          <Textarea label="Description" rows={2} value={String(f.description)} onChange={e => set('description', e.target.value)} />
          <Textarea label="Evidence" rows={2} value={String(f.evidence)} onChange={e => set('evidence', e.target.value)} placeholder='Verbatim chat line as evidence' />
          <Input label="Period" value={String(f.period)} onChange={e => set('period', e.target.value)} placeholder="2010" />
        </>}
        {kind === 'episode' && <>
          <Textarea label="Summary *" rows={3} value={String(f.summary)} onChange={e => set('summary', e.target.value)}
            placeholder="1-2 sentences you will still understand in 10 years" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emotion" value={String(f.emotion)} onChange={e => set('emotion', e.target.value)} placeholder="happy, sad, longing..." />
            <Input label="Date" type="date" value={String(f.occurredAt)} onChange={e => set('occurredAt', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Importance · {f.importance}/10</label>
            <input type="range" min={1} max={10} step={1} value={Number(f.importance)}
              onChange={e => set('importance', parseInt(e.target.value))} className="w-full accent-pink-500" />
          </div>
        </>}
        {kind === 'chapter' && <>
          <Input label="Period *" value={String(f.period)} onChange={e => set('period', e.target.value)} placeholder="2009-2011" />
          <Input label="Title" value={String(f.title)} onChange={e => set('title', e.target.value)} placeholder="High-school years" />
          <Textarea label="Summary" rows={3} value={String(f.summary)} onChange={e => set('summary', e.target.value)} />
          <Input label="Sentiment" value={String(f.sentiment)} onChange={e => set('sentiment', e.target.value)} placeholder="warm, romantic, tense..." />
        </>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  )
}
