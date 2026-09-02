import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Send, Trash2, Save } from 'lucide-react'
import api from '../api/client'

interface CompanionConfig {
  enabled: boolean
  provider: string
  model: string
  temperature: number
  maxHistory: number
  useMemory: boolean
  useChatStyle: boolean
  extraPrompt?: string | null
  providerConfigured: boolean
}
interface ProviderInfo { provider: string; configured: boolean; models: { id: string; name: string }[] }
interface CompMsg { id: string; role: 'USER' | 'ASSISTANT'; channel: string; content: string; createdAt?: string }
interface MsgPage { content: CompMsg[]; number: number; last: boolean }

export default function CompanionTab({ personId, personName }: { personId: string; personName: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CompanionConfig | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: config } = useQuery<CompanionConfig>({
    queryKey: ['companion-config', personId],
    queryFn: () => api.get<CompanionConfig>(`/api/persons/${personId}/companion`).then(r => r.data),
  })
  const { data: providers = [] } = useQuery<ProviderInfo[]>({
    queryKey: ['companion-providers'],
    queryFn: () => api.get<ProviderInfo[]>('/api/companion/providers').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const { data: msgPage } = useQuery<MsgPage>({
    queryKey: ['companion-messages', personId],
    queryFn: () => api.get<MsgPage>(`/api/persons/${personId}/companion/messages`, { params: { size: 50 } }).then(r => r.data),
  })

  useEffect(() => { if (config && !form) setForm(config) }, [config, form])
  const messages = [...(msgPage?.content || [])].reverse()
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const save = useMutation({
    mutationFn: (f: CompanionConfig) => api.put(`/api/persons/${personId}/companion`, f).then(r => r.data),
    onSuccess: (data: CompanionConfig) => { setForm(data); qc.invalidateQueries({ queryKey: ['companion-config', personId] }) },
  })

  const clear = useMutation({
    mutationFn: () => api.delete(`/api/persons/${personId}/companion/messages`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companion-messages', personId] }),
  })

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    // optimistic user bubble
    qc.setQueryData<MsgPage>(['companion-messages', personId], old => ({
      content: [{ id: 'tmp-' + Date.now(), role: 'USER', channel: 'APP', content: text }, ...(old?.content || [])],
      number: 0, last: true,
    }))
    try {
      await api.post(`/api/persons/${personId}/companion/chat`, { message: text })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Chat failed')
    }
    qc.invalidateQueries({ queryKey: ['companion-messages', personId] })
    setSending(false)
  }

  if (!form) return <p className="text-sm text-slate-400">Loading...</p>
  const selectedProvider = providers.find(p => p.provider === form.provider)

  const set = <K extends keyof CompanionConfig>(k: K, v: CompanionConfig[K]) =>
    setForm(f => (f ? { ...f, [k]: v } : f))

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
      {/* ── Config ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Bot size={15} className="text-pink-400" />Companion</h2>
          <button onClick={() => set('enabled', !form.enabled)}
            className={`relative w-10 h-6 rounded-full transition-colors ${form.enabled ? 'bg-pink-500' : 'bg-slate-200'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Provider</label>
          <select value={form.provider}
            onChange={e => {
              const p = providers.find(x => x.provider === e.target.value)
              set('provider', e.target.value)
              if (p?.models[0]) set('model', p.models[0].id)
            }}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none bg-white">
            {providers.map(p => (
              <option key={p.provider} value={p.provider}>
                {p.provider}{p.configured ? '' : ' (no API key)'}
              </option>
            ))}
          </select>
          {selectedProvider && !selectedProvider.configured && (
            <p className="text-[11px] text-amber-600 mt-1">Set {form.provider === 'CLAUDE' ? 'ANTHROPIC' : form.provider}_API_KEY on the service</p>
          )}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Model</label>
          <select value={selectedProvider?.models.some(m => m.id === form.model) ? form.model : '__custom'}
            onChange={e => { if (e.target.value !== '__custom') set('model', e.target.value) }}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none bg-white">
            {selectedProvider?.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value="__custom">Custom...</option>
          </select>
          <input value={form.model} onChange={e => set('model', e.target.value)}
            className="mt-1.5 w-full px-3 py-1.5 text-xs border rounded-lg border-slate-200 focus:border-pink-400 outline-none font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Temp · {form.temperature.toFixed(1)}</label>
            <input type="range" min={0} max={1.5} step={0.1} value={form.temperature}
              onChange={e => set('temperature', parseFloat(e.target.value))}
              className="w-full accent-pink-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">History</label>
            <input type="number" min={2} max={100} value={form.maxHistory}
              onChange={e => set('maxHistory', parseInt(e.target.value) || 30)}
              className="mt-1 w-full px-3 py-1.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => set('useMemory', !form.useMemory)}
            className={`flex-1 text-xs px-2 py-1.5 rounded-full border transition-colors ${form.useMemory ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-slate-200 text-slate-400'}`}>
            Memory
          </button>
          <button onClick={() => set('useChatStyle', !form.useChatStyle)}
            className={`flex-1 text-xs px-2 py-1.5 rounded-full border transition-colors ${form.useChatStyle ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-slate-200 text-slate-400'}`}>
            Chat style
          </button>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Extra prompt</label>
          <textarea rows={3} value={form.extraPrompt || ''} onChange={e => set('extraPrompt', e.target.value)}
            placeholder="Tinh chỉnh thêm (tuỳ chọn)..."
            className="mt-1 w-full px-3 py-2 text-xs border rounded-lg border-slate-200 focus:border-pink-400 outline-none resize-none" />
        </div>

        <button onClick={() => save.mutate(form)} disabled={save.isPending}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50">
          <Save size={14} />{save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ── Chat ── */}
      <div className="bg-white rounded-2xl border border-slate-100 flex flex-col h-[70dvh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">{personName}</p>
          <button onClick={() => { if (confirm('Clear all companion messages?')) clear.mutate() }}
            className="text-slate-300 hover:text-rose-400 p-1.5 rounded transition-colors"><Trash2 size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {messages.length === 0 && (
            <p className="text-center text-sm text-slate-300 py-10">
              {form.enabled ? 'Nhắn gì đó đi...' : 'Bật companion rồi Save để bắt đầu'}
            </p>
          )}
          {messages.map((m, i) => {
            const isUser = m.role === 'USER'
            const sameSender = messages[i - 1]?.role === m.role
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${sameSender ? 'mt-0.5' : 'mt-2.5'}`}>
                <div className={`max-w-[80%] px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl ${
                  isUser ? 'bg-pink-500 text-white rounded-br-md' : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-md'
                }`}>
                  {m.content}
                  {m.channel === 'TELEGRAM' && <span className={`block text-[9px] mt-0.5 ${isUser ? 'text-pink-100/70' : 'text-slate-300'}`}>via Telegram</span>}
                </div>
              </div>
            )
          })}
          {sending && (
            <div className="flex justify-start mt-2.5">
              <div className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl rounded-bl-md animate-pulse">...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={!form.enabled}
            placeholder={form.enabled ? `Nhắn cho ${personName}...` : 'Companion đang tắt'}
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full outline-none focus:border-pink-300 disabled:opacity-50" />
          <button onClick={send} disabled={!form.enabled || sending || !input.trim()}
            className="p-2.5 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-40 transition-colors">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
