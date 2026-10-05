import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare, Search, ArrowLeft, Link2, Unlink, Loader2 } from 'lucide-react'
import { otherChatsApi } from '../api/otherChats'
import ChatViewer from '../components/ChatViewer'
import PersonSelectModal from '../components/PersonSelectModal'
import type { ChatArchiveResponse, PersonSummary } from '../types'

const PLATFORM_LABEL: Record<string, string> = { YAHOO: 'Yahoo', FACEBOOK: 'Facebook', SMS: 'SMS', ZALO: 'Zalo', TELEGRAM: 'Telegram', BLOG: 'Blog', OTHER: 'Other' }
const PLATFORM_CLS: Record<string, string> = {
  YAHOO: 'bg-violet-50 text-violet-600', FACEBOOK: 'bg-blue-50 text-blue-600', SMS: 'bg-emerald-50 text-emerald-700',
}
const platformCls = (p: string) => PLATFORM_CLS[p] || 'bg-slate-100 text-slate-600'

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const year = (iso?: string) => (iso ? String(iso).slice(0, 4) : '')
const day = (iso?: string) => (iso ? String(iso).slice(0, 10) : '')

interface Group {
  key: string; name: string; archives: ChatArchiveResponse[]; total: number
  from?: string; to?: string; platforms: string[]; linked?: { id: string; name?: string }
}

function groupArchives(list: ChatArchiveResponse[]): Group[] {
  const by = new Map<string, Group>()
  for (const a of list) {
    const key = a.counterpartKey || `archive:${a.id}`
    let g = by.get(key)
    if (!g) { g = { key, name: a.counterpart || a.title || 'Unknown', archives: [], total: 0, platforms: [] }; by.set(key, g) }
    g.archives.push(a)
    g.total += a.messageCount || 0
    if (a.dateFrom && (!g.from || a.dateFrom < g.from)) g.from = a.dateFrom
    if (a.dateTo && (!g.to || a.dateTo > g.to)) g.to = a.dateTo
    if (!g.platforms.includes(a.platform)) g.platforms.push(a.platform)
    if (a.personId) g.linked = { id: a.personId, name: a.personName }
  }
  for (const g of by.values()) {
    g.archives.sort((x, y) => (x.dateFrom || '').localeCompare(y.dateFrom || ''))
    g.platforms.sort()
  }
  return [...by.values()].sort((x, y) => y.total - x.total || x.name.localeCompare(y.name))
}

export default function OtherChatsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['other-chats'], queryFn: otherChatsApi.list })
  const [q, setQ] = useState('')
  const [selKey, setSelKey] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ChatArchiveResponse | null>(null)
  const [linking, setLinking] = useState(false)
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()

  const groups = useMemo(() => groupArchives(data), [data])
  const shown = useMemo(() => (q.trim() ? groups.filter(g => fold(g.name).includes(fold(q.trim()))) : groups), [groups, q])
  const sel = groups.find(g => g.key === selKey) || null
  const totalMessages = groups.reduce((s, g) => s + g.total, 0)

  const patchAll = async (g: Group, body: { personId?: string; unlink?: boolean }) => {
    setBusy(true)
    try {
      for (const a of g.archives) await otherChatsApi.patch(a.id, body)
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.response?.data?.error || 'Could not update this chat')
    } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['other-chats'] })
      qc.invalidateQueries({ queryKey: ['archives'] })
    }
  }

  const linkTo = async (p: PersonSummary) => {
    setLinking(false)
    if (!sel) return
    if (!confirm(`Show ${sel.name}'s ${sel.archives.length} conversation(s) on ${p.displayName || p.name}'s page too?`)) return
    await patchAll(sel, { personId: p.id })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 flex items-center gap-2">
          <MessagesSquare size={18} className="text-pink-400" />Other chats
        </h1>
        <span className="text-xs text-slate-400">
          {groups.length} people · {totalMessages.toLocaleString('vi-VN')} messages
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-5">Friends from Yahoo, Facebook and SMS who are not in Persons. Text only — kept for reading.</p>

      <div className="flex gap-5 items-start">
        {/* Friends */}
        <div className={`${sel ? 'hidden md:block' : 'block'} w-full md:w-72 shrink-0`}>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a friend..."
              className="w-full pl-8 pr-3 h-9 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-pink-300" />
          </div>
          {isLoading && <p className="text-sm text-slate-400 py-6 text-center">Loading...</p>}
          {!isLoading && shown.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">{groups.length ? 'No one by that name' : 'No other chats yet — run the importer.'}</p>
          )}
          <div className="space-y-1.5 md:max-h-[calc(100vh-11rem)] md:overflow-y-auto md:pr-1">
            {shown.map(g => (
              <button key={g.key} onClick={() => setSelKey(g.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  g.key === selKey ? 'bg-pink-50/60 border-pink-200' : 'bg-white border-slate-100 hover:border-pink-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 truncate flex-1">{g.name}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{g.total.toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {g.platforms.map(p => <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded ${platformCls(p)}`}>{PLATFORM_LABEL[p] || p}</span>)}
                  <span className="text-[10px] text-slate-400 ml-auto">{year(g.from)}{year(g.to) && year(g.to) !== year(g.from) ? `–${year(g.to)}` : ''}</span>
                </div>
                {g.linked && <p className="text-[10px] text-pink-500 mt-1">→ {g.linked.name || 'linked to a person'}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations of one friend */}
        {sel ? (
          <div className="flex-1 min-w-0">
            <button onClick={() => setSelKey(null)} className="md:hidden flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-3">
              <ArrowLeft size={14} />All friends
            </button>
            <div className="flex items-start gap-3 mb-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-800">{sel.name}</h2>
                <p className="text-xs text-slate-400">
                  {sel.total.toLocaleString('vi-VN')} messages · {day(sel.from)} → {day(sel.to)}
                </p>
              </div>
              {sel.linked ? (
                <div className="flex items-center gap-2">
                  <Link to={`/persons/${sel.linked.id}`} className="text-xs text-pink-500 hover:underline">On {sel.linked.name || 'person'}'s page →</Link>
                  <button onClick={() => { if (confirm('Make these other chats again (remove them from the person page)?')) void patchAll(sel, { unlink: true }) }}
                    disabled={busy} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 border border-slate-200 rounded-full px-2.5 py-1 disabled:opacity-50">
                    <Unlink size={11} />Unlink
                  </button>
                </div>
              ) : (
                <button onClick={() => setLinking(true)} disabled={busy}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-pink-500 border border-slate-200 hover:border-pink-300 rounded-full px-2.5 py-1 disabled:opacity-50">
                  {busy ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}Link to a person
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {sel.archives.map(a => (
                <button key={a.id} onClick={() => setViewer(a)}
                  className="w-full text-left bg-white rounded-lg p-4 border border-slate-100 hover:border-pink-200 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${platformCls(a.platform)}`}>{PLATFORM_LABEL[a.platform] || a.platform}</span>
                    <span className="text-sm text-slate-700 truncate min-w-0">{a.title || a.externalKey}</span>
                    <span className="text-[11px] text-pink-400 shrink-0 ml-auto">Read →</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    {a.messageCount != null && <span>{a.messageCount.toLocaleString('vi-VN')} messages</span>}
                    {a.dateFrom && <span>{day(a.dateFrom)} → {day(a.dateTo)}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center py-24 text-sm text-slate-300">
            Pick a friend on the left
          </div>
        )}
      </div>

      {viewer && (
        <ChatViewer archive={viewer} personName={sel?.name || viewer.counterpart || ''} onClose={() => setViewer(null)} />
      )}
      {linking && <PersonSelectModal title={`Link ${sel?.name || ''} to...`} onSelect={linkTo} onClose={() => setLinking(false)} />}
    </div>
  )
}
