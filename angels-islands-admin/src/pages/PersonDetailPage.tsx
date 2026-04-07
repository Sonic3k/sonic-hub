import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Brain, MessageSquare, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePerson } from '../hooks/usePersons'
import { useFacts, useEpisodes, useChapters, useTraits, useArchives } from '../hooks/useMemory'

type Tab = 'info' | 'memory' | 'chat'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pid = Number(id)
  const navigate = useNavigate()
  const { data: person, isLoading } = usePerson(pid)
  const { data: facts = [] } = useFacts(pid)
  const { data: episodes = [] } = useEpisodes(pid)
  const { data: chapters = [] } = useChapters(pid)
  const { data: traits = [] } = useTraits(pid)
  const { data: archives = [] } = useArchives(pid)
  const [tab, setTab] = useState<Tab>('info')

  if (isLoading) return <div className="p-8 text-slate-400">Loading...</div>
  if (!person) return <div className="p-8 text-slate-400">Not found</div>

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'info', label: 'Info', icon: User },
    { key: 'memory', label: 'Memory', icon: Brain },
    { key: 'chat', label: 'Chat Archives', icon: MessageSquare },
  ]

  return (
    <div className="p-4 md:p-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-4">
        <ArrowLeft size={14} />Back
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">{person.displayName || person.name}</h1>
        {person.nickname && <p className="text-sm text-slate-400">{person.nickname}</p>}
        {person.period && <p className="text-xs text-slate-400 mt-1">{person.period}</p>}
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-100">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-3">
          {person.bio && <div><span className="text-xs text-slate-400">Bio</span><p className="text-sm text-slate-700">{person.bio}</p></div>}
          {person.dateOfBirth && <div><span className="text-xs text-slate-400">Birthday</span><p className="text-sm text-slate-700">{person.dateOfBirth}</p></div>}
          {person.howWeMet && <div><span className="text-xs text-slate-400">How we met</span><p className="text-sm text-slate-700">{person.howWeMet}</p></div>}
          {person.song && <div><span className="text-xs text-slate-400">Song</span><p className="text-sm text-slate-700">{person.song}</p></div>}
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
                  <div key={f.id} className="px-4 py-2.5 flex items-baseline gap-3">
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
                    {e.occurredAt && <span className="text-xs text-slate-300 ml-auto">{new Date(e.occurredAt).toLocaleDateString()}</span>}
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
