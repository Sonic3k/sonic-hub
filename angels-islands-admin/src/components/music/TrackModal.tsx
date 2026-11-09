import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, Brain, ExternalLink, Link2, Plus, Search, Trash2 } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea } from '../ui'
import { musicApi } from '../../api/music'
import { memoryApi } from '../../api/memory'
import { eventsApi } from '../../api/events'
import { personsApi } from '../../api/persons'
import type { LinkKind, MusicTrackDetail, TieRole, TrackIn } from '../../types/music'
import { Country, ListChips, PlayButton, Stars, TrackTitle, fmtMb, fmtSec, musicKeys, usePlaylists } from './shared'

const LINK_KINDS: LinkKind[] = ['YOUTUBE', 'SPOTIFY', 'APPLE_MUSIC', 'SOUNDCLOUD', 'LYRICS', 'WIKI', 'OFFICIAL', 'OTHER']
const ROLES: { value: TieRole; label: string }[] = [
  { value: 'TIED', label: 'Tied to it' }, { value: 'BACKGROUND', label: 'Background music' }, { value: 'MENTIONED', label: 'Mentioned' },
]
const PRECISIONS = ['YEAR', 'SEASON', 'MONTH', 'DAY']

interface Tie { id: string; title: string; when?: string | null; role: TieRole; note?: string | null }
interface LinkRow { kind: LinkKind; title: string; url: string; note: string }

/** One recording: when he started listening to it, how much it means to him, his words, links, memories and events. */
export default function TrackModal({ trackKey, onClose, onOpen }: { trackKey: string; onClose: () => void; onOpen?: (key: string) => void }) {
  const qc = useQueryClient()
  const { data: t } = useQuery({ queryKey: musicKeys.track(trackKey), queryFn: () => musicApi.track(trackKey) })
  const { data: lists } = usePlaylists()

  const [favorite, setFavorite] = useState(0)
  const [firstHeard, setFirstHeard] = useState('')
  const [precision, setPrecision] = useState('')
  const [approx, setApprox] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [summary, setSummary] = useState('')
  const [note, setNote] = useState('')
  const [links, setLinks] = useState<LinkRow[]>([])
  const [memories, setMemories] = useState<Tie[]>([])
  const [events, setEvents] = useState<Tie[]>([])
  const [picking, setPicking] = useState<'memory' | 'event' | null>(null)

  useEffect(() => {
    if (!t) return
    setFavorite(t.favorite ?? 0)
    setFirstHeard(firstHeardInput(t)); setPrecision(t.firstHeardPrecision ?? ''); setApprox(t.firstHeardApprox)
    setEvidence(t.firstHeardEvidence ?? ''); setSummary(t.summary ?? ''); setNote(t.note ?? '')
    setLinks(t.links.map(l => ({ kind: l.kind, title: l.title ?? '', url: l.url, note: l.note ?? '' })))
    setMemories(t.memories.map(m => ({ id: m.id, title: m.title || m.summary?.slice(0, 80) || 'Memory', when: m.when, role: m.role, note: m.note })))
    setEvents(t.events.map(e => ({ id: e.id, title: e.title, when: e.when, role: e.role, note: e.note })))
  }, [t])

  const save = useMutation({
    mutationFn: () => {
      const d: TrackIn = {
        favorite, summary, note, firstHeardEvidence: evidence, firstHeardApprox: approx,
        firstHeard: firstHeard.trim(), firstHeardPrecision: precision || undefined,
        links: links.filter(l => l.url.trim()).map(l => ({ kind: l.kind, title: l.title || null, url: l.url.trim(), note: l.note || null })),
        memories: memories.map(m => ({ id: m.id, role: m.role, note: m.note ?? null })),
        events: events.map(e => ({ id: e.id, role: e.role, note: e.note ?? null })),
      }
      return musicApi.putTrack(trackKey, d)
    },
    onSuccess: d => {
      qc.setQueryData(musicKeys.track(trackKey), d)
      qc.invalidateQueries({ queryKey: ['music'] })
      onClose()
    },
  })

  return (
    <Modal title={t ? `${t.title}${t.version ? ` · ${t.version}` : ''}` : 'Song'} onClose={onClose} size="xl">
      {!t ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-6">
          <Header t={t} lists={lists} />

          <section className="grid md:grid-cols-[auto,1fr] gap-x-6 gap-y-4 items-start">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Favorite</div>
              <Stars value={favorite} onChange={setFavorite} size={20} />
            </div>
            <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-end">
              <Input label="Started listening (yyyy, yyyy-MM or yyyy-MM-dd)" value={firstHeard} onChange={e => setFirstHeard(e.target.value)} placeholder="2008" />
              <Select label="Known to" value={precision} onChange={e => setPrecision(e.target.value)}>
                <option value="">its form</option>
                {PRECISIONS.map(p => <option key={p} value={p}>{p.toLowerCase()}</option>)}
              </Select>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-3">
                <input type="checkbox" checked={approx} onChange={e => setApprox(e.target.checked)} className="accent-pink-500" /> about
              </label>
              <div className="col-span-3"><Input label="What shows it" value={evidence} onChange={e => setEvidence(e.target.value)} /></div>
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <Textarea label="About the song" rows={3} value={summary} onChange={e => setSummary(e.target.value)} />
            <Textarea label="His own words — what it means, where it takes him back to" rows={3} value={note} onChange={e => setNote(e.target.value)} />
          </section>

          <section>
            <SectionTitle icon={<Link2 size={14} />} title="Links" action={<Button size="sm" variant="ghost" onClick={() => setLinks([...links, { kind: 'YOUTUBE', title: '', url: '', note: '' }])}><Plus size={14} />Add</Button>} />
            {links.length === 0 && <p className="text-xs text-slate-400">No link yet (YouTube, Spotify, lyrics…).</p>}
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="grid grid-cols-[8rem,1fr,10rem,auto] gap-2 items-center">
                  <select value={l.kind} onChange={e => setLinks(links.map((x, j) => (j === i ? { ...x, kind: e.target.value as LinkKind } : x)))}
                    className="px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white">
                    {LINK_KINDS.map(k => <option key={k} value={k}>{k.replace('_', ' ').toLowerCase()}</option>)}
                  </select>
                  <input value={l.url} placeholder="https://…" onChange={e => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg min-w-0" />
                  <input value={l.title} placeholder="title" onChange={e => setLinks(links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg min-w-0" />
                  <div className="flex">
                    {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-pink-500"><ExternalLink size={14} /></a>}
                    <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <TieList icon={<Brain size={14} />} title="Memories" ties={memories} onChange={setMemories} onAdd={() => setPicking('memory')} />
          <TieList icon={<CalendarRange size={14} />} title="Events" ties={events} onChange={setEvents} onAdd={() => setPicking('event')} />

          {t.versions.length > 0 && (
            <section>
              <SectionTitle title="Other recordings of the song" />
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {t.versions.map(v => (
                  <div key={v.key} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50" onClick={() => onOpen?.(v.key)}>
                    <PlayButton t={v} /><TrackTitle t={v} /><span className="ml-auto"><ListChips keys={v.playlists} lists={lists} /></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {save.isError && <p className="text-xs text-rose-500">{errorText(save.error)}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
      {picking === 'memory' && <MemoryPicker onClose={() => setPicking(null)} onPick={x => { if (!memories.some(m => m.id === x.id)) setMemories([...memories, x]); setPicking(null) }} />}
      {picking === 'event' && <EventPicker onClose={() => setPicking(null)} onPick={x => { if (!events.some(m => m.id === x.id)) setEvents([...events, x]); setPicking(null) }} />}
    </Modal>
  )
}

function Header({ t, lists }: { t: MusicTrackDetail; lists?: ReturnType<typeof usePlaylists>['data'] }) {
  return (
    <div className="flex gap-3 items-start">
      <PlayButton t={t} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-sm text-slate-700">
          {t.artist ? <><span className="font-medium">{t.artist.name}</span> <Country code={t.artist.country} /></> : <span className="text-slate-400">Unknown artist</span>}
          {t.album && <span className="text-slate-500"> — {t.album.title}{t.album.releaseYear ? ` (${t.album.releaseYear})` : ''}</span>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {t.durationSec ? <span>{fmtSec(t.durationSec)}</span> : null}
          {t.hasAudio ? <span>{t.audioFileName} · {fmtMb(t.audioSize)}{t.audioBitrate ? ` · ${t.audioBitrate} kbps` : ''}</span> : <span className="text-amber-500">No file — links only</span>}
          {t.audioSourcePath && <span className="truncate max-w-full" title={t.audioSourcePath}>{t.audioSourcePath}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>In his lists:</span>{t.playlists.length ? <ListChips keys={t.playlists} lists={lists} /> : <span className="text-slate-300">none</span>}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title, icon, action }: { title: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{icon}{title}</h3>
      {action}
    </div>
  )
}

function TieList({ title, icon, ties, onChange, onAdd }: { title: string; icon: React.ReactNode; ties: Tie[]; onChange: (t: Tie[]) => void; onAdd: () => void }) {
  return (
    <section>
      <SectionTitle icon={icon} title={title} action={<Button size="sm" variant="ghost" onClick={onAdd}><Plus size={14} />Add</Button>} />
      {ties.length === 0 && <p className="text-xs text-slate-400">None yet.</p>}
      <div className="space-y-1.5">
        {ties.map((x, i) => (
          <div key={x.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate"><span className="text-slate-700">{x.title}</span>{x.when && <span className="text-slate-400 text-xs ml-2">{x.when}</span>}</span>
            <select value={x.role} onChange={e => onChange(ties.map((y, j) => (j === i ? { ...y, role: e.target.value as TieRole } : y)))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={() => onChange(ties.filter((_, j) => j !== i))} className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  )
}

function MemoryPicker({ onPick, onClose }: { onPick: (t: Tie) => void; onClose: () => void }) {
  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: personsApi.getAll })
  const [pid, setPid] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => { if (!pid && persons?.length) setPid((persons.find(p => p.isSelf) ?? persons[0]).id) }, [persons, pid])
  const { data: eps, isFetching } = useQuery({
    queryKey: ['music', 'pick-memory', pid, q],
    queryFn: () => memoryApi.getEpisodes(pid, { q: q || undefined }),
    enabled: !!pid,
  })
  return (
    <Modal title="Add a memory" onClose={onClose} size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-[10rem,1fr] gap-2">
          <select value={pid} onChange={e => setPid(e.target.value)} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            {(persons ?? []).map(p => <option key={p.id} value={p.id}>{p.isSelf ? `${p.displayName || p.name} (him)` : p.displayName || p.name}</option>)}
          </select>
          <SearchBox value={q} onChange={setQ} />
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
          {isFetching && <p className="text-xs text-slate-400 py-2">Searching…</p>}
          {(eps ?? []).slice(0, 80).map(e => (
            <button key={e.id} onClick={() => onPick({ id: e.id, title: e.title || e.summary.slice(0, 80), when: e.when, role: 'TIED' })}
              className="w-full text-left px-2 py-2 hover:bg-pink-50/50">
              <div className="text-sm text-slate-700">{e.title || e.summary.slice(0, 80)}</div>
              <div className="text-xs text-slate-400">{e.when ?? ''}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function EventPicker({ onPick, onClose }: { onPick: (t: Tie) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const { data: evs, isFetching } = useQuery({ queryKey: ['music', 'pick-event', q], queryFn: () => eventsApi.list({ q: q || undefined }) })
  return (
    <Modal title="Add an event" onClose={onClose} size="lg">
      <div className="space-y-3">
        <SearchBox value={q} onChange={setQ} />
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
          {isFetching && <p className="text-xs text-slate-400 py-2">Searching…</p>}
          {(evs ?? []).slice(0, 80).map(e => (
            <button key={e.id} onClick={() => onPick({ id: e.id, title: e.title, when: e.when, role: 'TIED' })}
              className="w-full text-left px-2 py-2 hover:bg-pink-50/50">
              <div className="text-sm text-slate-700">{e.title}</div>
              <div className="text-xs text-slate-400">{e.when}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value)
  useEffect(() => { const h = setTimeout(() => onChange(v), 250); return () => clearTimeout(h) }, [v, onChange])
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50" />
    </div>
  )
}

/** what the input shows for a stored date: as far as it is known */
function firstHeardInput(t: MusicTrackDetail) {
  if (!t.firstHeardAt) return ''
  const d = t.firstHeardAt
  switch (t.firstHeardPrecision) {
    case 'DECADE': case 'YEAR': return d.slice(0, 4)
    case 'SEASON': case 'MONTH': return d.slice(0, 7)
    case 'DAY': return d.slice(0, 10)
    default: return d.slice(0, 16)
  }
}

export function errorText(e: unknown) {
  const r = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data
  return r?.error || r?.message || String(e)
}
