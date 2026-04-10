import { useState } from 'react'
import { usePersons } from '../hooks/usePersons'
import { useFacts, useEpisodes, useChapters, useTraits } from '../hooks/useMemory'
import type { PersonSummary } from '../types'

export default function MemoryPage() {
  const { data: persons = [] } = usePersons()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: facts = [] } = useFacts(selectedId || '')
  const { data: episodes = [] } = useEpisodes(selectedId || '')
  const { data: chapters = [] } = useChapters(selectedId || '')
  const { data: traits = [] } = useTraits(selectedId || '')

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Memory Explorer</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {persons.map((p: PersonSummary) => (
          <button key={p.id} onClick={() => setSelectedId(p.id)}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
              selectedId === p.id ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-pink-300'
            }`}>
            {p.displayName || p.name}
          </button>
        ))}
      </div>

      {!selectedId ? <p className="text-sm text-slate-400">Select a person to explore their memory.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-600">Facts ({facts.length})</h2>
            {facts.map(f => (
              <div key={f.id} className="bg-white rounded-lg p-3 border border-slate-100 text-xs">
                <span className="text-slate-400">{f.category}/</span>
                <span className="font-medium text-slate-600">{f.key}</span>: <span className="text-slate-700">{f.value}</span>
                {f.period && <span className="text-slate-300 ml-2">({f.period})</span>}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-600">Episodes ({episodes.length})</h2>
            {episodes.map(e => (
              <div key={e.id} className="bg-white rounded-lg p-3 border border-slate-100 text-xs">
                <p className="text-slate-700">{e.summary}</p>
                <div className="flex gap-2 mt-1">
                  {e.emotion && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">{e.emotion}</span>}
                  {e.occurredAt && <span className="text-slate-300">{new Date(e.occurredAt.endsWith('Z') ? e.occurredAt : e.occurredAt + 'Z').toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-600">Life Chapters ({chapters.length})</h2>
            {chapters.map(c => (
              <div key={c.id} className="bg-white rounded-lg p-3 border border-slate-100 text-xs">
                <span className="font-mono text-pink-500">{c.period}</span>
                {c.title && <span className="font-medium text-slate-700 ml-2">{c.title}</span>}
                {c.summary && <p className="text-slate-500 mt-1">{c.summary}</p>}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-600">Personality ({traits.length})</h2>
            <div className="flex flex-wrap gap-2">
              {traits.map(t => (
                <span key={t.id} className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600" title={t.description || ''}>{t.trait}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
