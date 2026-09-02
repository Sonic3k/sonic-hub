import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { X, Search, MessageSquare } from 'lucide-react'
import api from '../api/client'
import type { ChatArchiveResponse } from '../types'

interface ChatMsg {
  id: string
  sender: string
  senderType: 'SELF' | 'PERSON'
  content: string
  timestamp?: string
  seq?: number
}
interface MsgPage { content: ChatMsg[]; number: number; last: boolean; totalElements: number }

function dayLabel(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}
function timeLabel(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatViewer({ personId, archive, personName, onClose }: {
  personId: string
  archive: ChatArchiveResponse
  personName: string
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [activeQ, setActiveQ] = useState('')

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['chat-messages', archive.id, activeQ],
    queryFn: ({ pageParam = 0 }) =>
      api.get<MsgPage>(`/api/persons/${personId}/chat-archives/${archive.id}/messages`, {
        params: { page: pageParam, size: 200, q: activeQ || undefined },
      }).then(r => r.data),
    initialPageParam: 0,
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
  })

  const messages: ChatMsg[] = (data?.pages || []).flatMap(p => p.content)
  const total = data?.pages?.[0]?.totalElements ?? 0
  const searching = !!activeQ

  const submitSearch = () => setActiveQ(q.trim())

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 md:px-5 py-3 bg-white border-b border-slate-100 shrink-0">
        <MessageSquare size={18} className="text-pink-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{archive.title || archive.platform}</p>
          <p className="text-[11px] text-slate-400">
            {searching ? `${total} matches` : `${total} messages`} · {personName}
          </p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitSearch(); if (e.key === 'Escape') { setQ(''); setActiveQ('') } }}
            placeholder="Search in chat..."
            className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full outline-none focus:border-pink-300 w-28 md:w-52" />
          {activeQ && (
            <button onClick={() => { setQ(''); setActiveQ('') }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-0.5"><X size={12} /></button>
          )}
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-0">
        <div className="max-w-2xl mx-auto py-4 space-y-1">
          {isLoading && <p className="text-center text-sm text-slate-400 py-8">Loading...</p>}
          {!isLoading && messages.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">{searching ? 'No matches' : 'No messages'}</p>
          )}

          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const day = (m.timestamp || '').slice(0, 10)
            const newDay = !searching && day !== (prev?.timestamp || '').slice(0, 10)
            const isSelf = m.senderType === 'SELF'
            const sameSender = !newDay && prev?.senderType === m.senderType
            return (
              <div key={m.id}>
                {(newDay || (searching && day !== (prev?.timestamp || '').slice(0, 10))) && (
                  <div className="flex justify-center py-3">
                    <span className="text-[10px] text-slate-400 bg-white border border-slate-100 rounded-full px-3 py-1 capitalize">
                      {dayLabel(m.timestamp)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} ${sameSender ? 'mt-0.5' : 'mt-2.5'}`}>
                  <div className={`max-w-[78%] px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl ${
                    isSelf
                      ? 'bg-pink-500 text-white rounded-br-md'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md'
                  }`}>
                    {m.content}
                    <span className={`block text-[9px] mt-0.5 text-right ${isSelf ? 'text-pink-100/80' : 'text-slate-300'}`}>
                      {timeLabel(m.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {hasNextPage && (
            <div className="flex justify-center py-4">
              <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                className="text-xs text-slate-500 hover:text-pink-500 bg-white border border-slate-200 px-4 py-2 rounded-full disabled:opacity-50">
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
