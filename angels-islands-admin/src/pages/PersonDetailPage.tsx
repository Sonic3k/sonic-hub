import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, MessageSquare, User, Pencil, Save, X, Plus, Trash2, Upload, Image as ImageIcon, FolderOpen, FolderPlus, UserMinus } from 'lucide-react'
import { Button, Input, Textarea, Modal } from '../components/ui'
import { usePerson, useUpdatePerson } from '../hooks/usePersons'
import { useFacts, useEpisodes, useChapters, useTraits, useArchives } from '../hooks/useMemory'
import { personsApi } from '../api/persons'
import { memoryApi } from '../api/memory'
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { PersonRequest, RelationshipType, ContactPlatform, ContactRequest, MediaFileResponse, CollectionResponse, ChatArchiveResponse } from '../types'
import api from '../api/client'
import { mediaApi, uploadApi, collectionBrowseApi, collectionsApi } from '../api/collections'
import { Lightbox, MediaItem } from '../components/media'
import CollectionPicker from '../components/CollectionPicker'
import ChatViewer from '../components/ChatViewer'

const REL_LABELS: Record<RelationshipType, string> = {
  CRUSH: '💗 Crush', GIRLFRIEND: '❤️ Girlfriend', FRIEND: '🤝 Friend',
  EX: '💔 Ex', ACQUAINTANCE: '👋 Acquaintance', PEN_PAL: '✉️ Pen Pal', ONLINE_FRIEND: '💬 Online Friend',
}

const CONTACT_PLATFORMS: ContactPlatform[] = ['YAHOO', 'FACEBOOK', 'ZALO', 'TELEGRAM', 'SMS', 'PHONE', 'BLOG', 'INSTAGRAM', 'TIKTOK', 'OTHER']

type Tab = 'info' | 'photos' | 'memory' | 'chat'

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

      {tab === 'photos' && <PersonPhotosTab personId={pid} />}

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
              placeholder="nick yahoo, link fb, số đt..." autoFocus />
            <Input label="Display Name" value={contactForm.displayName || ''} onChange={e => setContactForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Tên hiển thị trên platform" />
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
                <div className="flex items-center justify-between">
                  <div onClick={() => setViewerArchive(a)} className="cursor-pointer min-w-0 hover:opacity-70 transition-opacity">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{a.platform}</span>
                    {a.title && <span className="text-sm text-slate-700 ml-2">{a.title}</span>}
                    <span className="text-[11px] text-pink-400 ml-2">Read →</span>
                  </div>
                  <div className="flex items-center gap-2">
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


// ── Photos tab: collections + toàn bộ ảnh của person ─────────────────────────

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
        personId, q: activeQ || undefined, page: pageParam, size: 100, inclDetails: true, inclPersons: true,
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
      {/* Collections của person */}
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
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photos */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Photos & Videos · {total}</h2>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') setActiveQ(q.trim()); if (e.key === 'Escape') { setQ(''); setActiveQ('') } }}
          placeholder="Search..."
          className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-full outline-none focus:border-pink-300 w-32 md:w-44" />
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
