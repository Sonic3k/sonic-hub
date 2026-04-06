import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Brain, Heart, MessageSquare, Sparkles, Play, Plus, Save, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import companionApi from '../api/companion'
import clsx from 'clsx'

type Tab = 'assistants' | 'personality' | 'memory' | 'conversations' | 'playground'

interface Assistant {
  id: string; name: string; nickname: string
  avatar_url: string | null; date_of_birth: string | null
  bio: string | null; active: boolean
}
interface PersonalityItem {
  aspect: string; instruction: string
  examples: { good?: string[]; bad?: string[] } | null
  version: number; active: boolean
}
interface ProfileFact { category: string; key: string; value: string; confidence: number; updated_at: string }
interface Episode { summary: string; emotion: string | null; importance: number; occurred_at: string }
interface Conversation { id: string; started_at: string; ended_at: string | null; summary: string | null; is_active: boolean }
interface Message { id: string; role: string; content: string; timestamp: string; channel_type: string }

const tabs: { key: Tab; label: string; icon: typeof Bot }[] = [
  { key: 'assistants', label: 'Assistants', icon: Bot },
  { key: 'personality', label: 'Personality', icon: Sparkles },
  { key: 'memory', label: 'Memory', icon: Brain },
  { key: 'conversations', label: 'Conversations', icon: MessageSquare },
  { key: 'playground', label: 'Playground', icon: Play },
]

export default function CompanionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('assistants')
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)

  const { data: assistants = [] } = useQuery<Assistant[]>({
    queryKey: ['assistants'],
    queryFn: () => companionApi.get('/assistants').then(r => r.data),
  })

  // Auto-select first assistant
  if (!selectedAssistant && assistants.length > 0) {
    setSelectedAssistant(assistants[0])
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
          <Heart size={18} className="text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#1a1d2d]">Companion</h1>
          <p className="text-sm text-[#6b7280]">
            {selectedAssistant ? `Active: ${selectedAssistant.nickname}` : 'No assistant yet'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#e5e7eb]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            )}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'assistants' && <AssistantsTab selected={selectedAssistant} onSelect={setSelectedAssistant} />}
      {activeTab === 'personality' && selectedAssistant && <PersonalityTab assistantId={selectedAssistant.id} />}
      {activeTab === 'memory' && selectedAssistant && <MemoryTab assistantId={selectedAssistant.id} />}
      {activeTab === 'conversations' && selectedAssistant && <ConversationsTab assistantId={selectedAssistant.id} />}
      {activeTab === 'playground' && selectedAssistant && <PlaygroundTab assistant={selectedAssistant} />}
      {activeTab !== 'assistants' && !selectedAssistant && (
        <div className="text-center py-16 text-[#9ca3af]">
          <Bot size={48} className="mx-auto mb-3 opacity-40" />
          <p>No assistant selected. Go to Assistants tab to create or seed one.</p>
        </div>
      )}
    </div>
  )
}

// ─── Assistants Tab ───

function AssistantsTab({ selected, onSelect }: { selected: Assistant | null; onSelect: (a: Assistant) => void }) {
  const qc = useQueryClient()
  const { data: assistants = [], isLoading } = useQuery<Assistant[]>({
    queryKey: ['assistants'],
    queryFn: () => companionApi.get('/assistants').then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => companionApi.post('/seed'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assistants'] }),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', nickname: '', date_of_birth: '', bio: '' })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => companionApi.post('/assistants', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistants'] })
      setShowCreate(false)
      setForm({ name: '', nickname: '', date_of_birth: '', bio: '' })
    },
  })

  return (
    <div>
      {/* Seed button */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
          <Sparkles size={15} />
          {seedMutation.isPending ? 'Seeding...' : 'Seed Default (Tommy Filan)'}
        </button>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1d2d] text-white rounded-lg text-sm font-medium hover:bg-[#2a2d3d]">
          <Plus size={15} />
          Create New
        </button>
      </div>

      {seedMutation.isSuccess && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ {(seedMutation.data?.data as any)?.message || 'Done!'}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-[#e5e7eb]">
          <h3 className="text-sm font-semibold mb-3">New Assistant</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Nickname" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.nickname}
            className="mt-3 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">
            Create
          </button>
        </div>
      )}

      {/* Assistant list */}
      {isLoading ? <p className="text-sm text-[#9ca3af]">Loading...</p> : (
        <div className="space-y-2">
          {assistants.length === 0 && (
            <p className="text-center py-8 text-[#9ca3af] text-sm">No assistants yet. Click "Seed Default" to create Tommy Filan.</p>
          )}
          {assistants.map(a => (
            <div key={a.id} onClick={() => onSelect(a)}
              className={clsx(
                'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                selected?.id === a.id
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-[#e5e7eb] hover:border-[#c4c9d9]'
              )}>
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {a.nickname.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-[#1a1d2d]">{a.nickname}</div>
                <div className="text-xs text-[#6b7280]">{a.name} · {a.date_of_birth || 'No DOB'}</div>
                {a.bio && <div className="text-xs text-[#9ca3af] mt-0.5">{a.bio}</div>}
              </div>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full', a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {a.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Personality Tab ───

function PersonalityTab({ assistantId }: { assistantId: string }) {
  const qc = useQueryClient()
  const { data: items = [] } = useQuery<PersonalityItem[]>({
    queryKey: ['personality', assistantId],
    queryFn: () => companionApi.get(`/personality/${assistantId}`).then(r => r.data),
  })

  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const updateMutation = useMutation({
    mutationFn: (data: { aspect: string; instruction: string }) =>
      companionApi.put('/personality', { assistant_id: assistantId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personality', assistantId] })
      setEditing(null)
    },
  })

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-[#9ca3af] py-8 text-center">No personality set. Run seed first.</p>}
      {items.map(p => (
        <div key={p.aspect} className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">{p.aspect}</span>
            <span className="text-xs text-[#9ca3af]">v{p.version}</span>
          </div>
          {editing === p.aspect ? (
            <div>
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                rows={4} className="w-full px-3 py-2 border rounded-lg text-sm resize-y" />
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateMutation.mutate({ aspect: p.aspect, instruction: editValue })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs">
                  <Save size={12} /> Save
                </button>
                <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-[#6b7280]">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{p.instruction}</p>
              {p.examples && (
                <div className="mt-2 space-y-1">
                  {p.examples.good && <div className="text-xs text-green-600">✓ {p.examples.good.join(' | ')}</div>}
                  {p.examples.bad && <div className="text-xs text-red-400">✗ {p.examples.bad.join(' | ')}</div>}
                </div>
              )}
              <button onClick={() => { setEditing(p.aspect); setEditValue(p.instruction) }}
                className="mt-2 text-xs text-indigo-500 hover:underline">Edit</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Memory Tab ───

function MemoryTab({ assistantId }: { assistantId: string }) {
  const { data: profile = [] } = useQuery<ProfileFact[]>({
    queryKey: ['profile', assistantId],
    queryFn: () => companionApi.get(`/profile/${assistantId}`).then(r => r.data),
  })
  const { data: episodes = [] } = useQuery<Episode[]>({
    queryKey: ['episodes', assistantId],
    queryFn: () => companionApi.get(`/episodes/${assistantId}`).then(r => r.data),
  })

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Profile Facts */}
      <div>
        <h3 className="text-sm font-semibold text-[#1a1d2d] mb-3 flex items-center gap-2">
          <Brain size={15} /> Profile Facts ({profile.length})
        </h3>
        {profile.length === 0 ? (
          <p className="text-xs text-[#9ca3af]">No facts yet. Chat to build memory.</p>
        ) : (
          <div className="space-y-1.5">
            {profile.map(f => (
              <div key={f.key} className="bg-white rounded-lg border border-[#e5e7eb] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#374151]">{f.key}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280]">{f.category}</span>
                </div>
                <div className="text-sm text-[#1a1d2d]">{f.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Episodes */}
      <div>
        <h3 className="text-sm font-semibold text-[#1a1d2d] mb-3 flex items-center gap-2">
          <Heart size={15} /> Episodes ({episodes.length})
        </h3>
        {episodes.length === 0 ? (
          <p className="text-xs text-[#9ca3af]">No episodes yet. Chat to create memories.</p>
        ) : (
          <div className="space-y-1.5">
            {episodes.map((e, i) => (
              <div key={i} className="bg-white rounded-lg border border-[#e5e7eb] px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[#9ca3af]">{new Date(e.occurred_at).toLocaleDateString('vi-VN')}</span>
                  {e.emotion && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{e.emotion}</span>}
                  <span className="text-[10px] text-[#9ca3af]">⭐{e.importance}</span>
                </div>
                <div className="text-sm text-[#374151]">{e.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Conversations Tab ───

function ConversationsTab({ assistantId }: { assistantId: string }) {
  const [openConv, setOpenConv] = useState<string | null>(null)

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations', assistantId],
    queryFn: () => companionApi.get(`/conversations/${assistantId}`).then(r => r.data),
  })

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', assistantId, openConv],
    queryFn: () => companionApi.get(`/conversations/${assistantId}/${openConv}/messages`).then(r => r.data),
    enabled: !!openConv,
  })

  return (
    <div>
      {conversations.length === 0 ? (
        <p className="text-center py-8 text-sm text-[#9ca3af]">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#e5e7eb]">
              <button onClick={() => setOpenConv(openConv === c.id ? null : c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                {openConv === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <div className="flex-1">
                  <span className="text-sm text-[#374151]">
                    {new Date(c.started_at).toLocaleString('vi-VN')}
                  </span>
                  <span className={clsx('ml-2 text-xs px-1.5 py-0.5 rounded', c.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500')}>
                    {c.is_active ? 'Active' : 'Ended'}
                  </span>
                </div>
              </button>
              {openConv === c.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-[#f3f4f6] pt-3 max-h-96 overflow-y-auto">
                  {messages.map(m => (
                    <div key={m.id} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={clsx(
                        'max-w-[70%] px-3 py-2 rounded-xl text-sm',
                        m.role === 'user'
                          ? 'bg-indigo-500 text-white rounded-br-sm'
                          : 'bg-[#f3f4f6] text-[#374151] rounded-bl-sm'
                      )}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className={clsx('text-[10px] mt-1', m.role === 'user' ? 'text-indigo-200' : 'text-[#9ca3af]')}>
                          {new Date(m.timestamp).toLocaleTimeString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Playground Tab ───

function PlaygroundTab({ assistant }: { assistant: Assistant }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])

  const chatMutation = useMutation({
    mutationFn: (msg: string) => companionApi.post('/chat', {
      channel: 'playground',
      external_id: 'admin-playground',
      message: msg,
      assistant_id: assistant.id,
    }),
    onSuccess: (res) => {
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    },
  })

  const send = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input }])
    chatMutation.mutate(input)
    setInput('')
  }

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] flex flex-col" style={{ height: '500px' }}>
      <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
          {assistant.nickname.charAt(0)}
        </div>
        <span className="text-sm font-medium">{assistant.nickname}</span>
        <span className="text-xs text-[#9ca3af]">Playground</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[#9ca3af] mt-16">Say something to test {assistant.nickname}...</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={clsx(
              'max-w-[70%] px-3 py-2 rounded-xl text-sm',
              m.role === 'user'
                ? 'bg-indigo-500 text-white rounded-br-sm'
                : 'bg-[#f3f4f6] text-[#374151] rounded-bl-sm'
            )}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-[#f3f4f6] px-4 py-2 rounded-xl text-sm text-[#9ca3af] animate-pulse">typing...</div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#e5e7eb] flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Message ${assistant.nickname}...`}
          className="flex-1 px-3 py-2 border rounded-lg text-sm" />
        <button onClick={send} disabled={chatMutation.isPending || !input.trim()}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  )
}
