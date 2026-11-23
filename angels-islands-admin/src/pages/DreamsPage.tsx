/* Dreams (giấc mơ): one record per dream, kept apart from memories — a dream did not happen. Its two texts stay apart:
   the dream as he told it, and what it calls up in his waking life (the real part). People are who appear in it; events
   are the real events it calls up (a reference: the dream does not go into the event). */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, Moon, Plus, Search, Trash2, Users, X } from 'lucide-react'
import clsx from 'clsx'
import { dreamsApi } from '../api/dreams'
import { eventsApi } from '../api/events'
import { usePersons } from '../hooks/usePersons'
import PersonSelectModal from '../components/PersonSelectModal'
import { Button, Modal } from '../components/ui'
import type { Dream, DreamRequest } from '../types'

/** today on this computer's calendar, yyyy-MM-dd */
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const day = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export default function DreamsPage() {
  const qc = useQueryClient()
  const { data: persons = [] } = usePersons()
  const self = persons.find(p => p.isSelf)
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState('')
  const open = sp.get('dream')
  const setOpen = (id: string | null) => setSp(prev => { const n = new URLSearchParams(prev); if (id) n.set('dream', id); else n.delete('dream'); return n }, { replace: true })
  const list = useQuery({ queryKey: ['dreams', self?.id], queryFn: () => dreamsApi.list({ personId: self?.id, inclPersons: true, inclEvents: true }), enabled: !!self })
  const all = list.data ?? []
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return !needle ? all : all.filter(d => `${d.title ?? ''} ${d.lead ?? ''} ${(d.persons ?? []).map(p => p.name).join(' ')}`.toLowerCase().includes(needle))
  }, [all, q])
  // morning by morning, the newest first (the API sends them so)
  const byDay = useMemo(() => {
    const m = new Map<string, Dream[]>()
    for (const d of shown) m.set(d.dreamtOn, [...(m.get(d.dreamtOn) ?? []), d])
    return [...m.entries()]
  }, [shown])
  const refresh = () => qc.invalidateQueries({ queryKey: ['dreams'] })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-slate-800">Dreams</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setOpen('new')}><Plus size={14} className="mr-1" />New dream</Button>
      </div>
      <div className="relative mb-5">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, opening, people…"
          className="w-full pl-8 pr-8 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none" />
        {q && <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
      </div>

      {list.isLoading ? <p className="text-sm text-slate-400">Loading…</p>
        : shown.length === 0 ? <p className="text-sm text-slate-400">No dreams{q ? ' match' : ' yet'}.</p>
        : byDay.map(([d, dreams]) => (
          <section key={d} className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-2">{day(d)}</h2>
            <div className="space-y-2">
              {dreams.map(x => (
                <button key={x.id} onClick={() => setOpen(x.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-pink-200 hover:bg-pink-50/30 text-left transition-colors">
                  <Moon size={16} className="text-slate-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-700 truncate">{x.title || '(no title)'}</div>
                    {x.lead && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{x.lead}</div>}
                    {(!!x.persons?.length || !!x.events?.length) && <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-1">
                      {!!x.persons?.length && <span className="flex items-center gap-1"><Users size={11} />{x.persons.map(p => p.displayName || p.name).join(', ')}</span>}
                      {!!x.events?.length && <span className="flex items-center gap-1"><CalendarRange size={11} />{x.events.map(e => e.title).join(', ')}</span>}
                    </div>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

      {open && self && <DreamEditor id={open === 'new' ? null : open} ownerId={self.id}
        onClose={() => setOpen(null)} onSaved={id => { refresh(); setOpen(id) }} onDeleted={() => { refresh(); setOpen(null) }} />}
    </div>
  )
}

/** The whole dream is read before the form opens, so a save writes back only what was read. */
function DreamEditor({ id, ownerId, onClose, onSaved, onDeleted }: {
  id: string | null; ownerId: string; onClose: () => void; onSaved: (id: string) => void; onDeleted: () => void
}) {
  const detail = useQuery({ queryKey: ['dream', id], queryFn: () => dreamsApi.get(id!), enabled: !!id })
  const [f, setF] = useState<DreamRequest>({ dreamtOn: today(), title: '', content: '', associations: '' })
  const [people, setPeople] = useState<{ id: string; name: string }[]>([])
  const [events, setEvents] = useState<{ id: string; title: string; when?: string | null }[]>([])
  const [pickPerson, setPickPerson] = useState(false)
  const [saving, setSaving] = useState(false), [err, setErr] = useState('')
  const d = detail.data

  useEffect(() => {
    if (!d) return
    setF({ dreamtOn: d.dreamtOn, sortOrder: d.sortOrder ?? undefined, title: d.title ?? '', content: d.content ?? '', associations: d.associations ?? '' })
    setPeople((d.persons ?? []).map(p => ({ id: p.id, name: p.displayName || p.name })))
    setEvents((d.events ?? []).map(e => ({ id: e.id, title: e.title, when: e.when })))
  }, [d])

  const set = (k: keyof DreamRequest, v: unknown) => setF(prev => ({ ...prev, [k]: v }))
  const save = async () => {
    setErr('')
    if (!f.dreamtOn?.trim() || !f.content?.trim()) { setErr('The morning and the dream itself are needed.'); return }
    setSaving(true)
    try {
      const body: DreamRequest = { ...f, personId: ownerId, personIds: people.map(p => p.id), eventIds: events.map(e => e.id) }
      const r = id ? await dreamsApi.update(id, body) : await dreamsApi.create(body)
      onSaved(r.id)
    } catch (e: any) { setErr(e?.response?.data?.error || e?.message || 'Save failed') }
    finally { setSaving(false) }
  }
  const remove = async () => {
    if (!id || !confirm('Delete this dream? The people and events it links to stay.')) return
    await dreamsApi.remove(id); onDeleted()
  }

  return (
    <Modal title={id ? (d?.title || 'Dream') : 'New dream'} onClose={onClose} size="xl">
      {id && detail.isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Field label="Morning" className="md:col-span-2"><input type="date" value={f.dreamtOn ?? ''} onChange={e => set('dreamtOn', e.target.value)} className={inp} /></Field>
            <Field label="Order that morning" className="md:col-span-1">
              <input type="number" min={1} value={f.sortOrder ?? ''} onChange={e => set('sortOrder', e.target.value ? Number(e.target.value) : undefined)} placeholder="next" className={inp} />
            </Field>
            <Field label="Title" className="md:col-span-3"><input value={f.title ?? ''} onChange={e => set('title', e.target.value)} className={inp} /></Field>
            <Field label="The dream — as he told it (none of it happened)" className="md:col-span-6">
              <textarea value={f.content ?? ''} onChange={e => set('content', e.target.value)} rows={8} className={clsx(inp, 'resize-y')} />
            </Field>
            <Field label="In waking life — what it calls up, in his words (real)" className="md:col-span-6">
              <textarea value={f.associations ?? ''} onChange={e => set('associations', e.target.value)} rows={3} className={clsx(inp, 'resize-y')} />
            </Field>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Users size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-500">People in it</span>
              <button onClick={() => setPickPerson(true)} className="text-xs text-pink-500 hover:text-pink-600 flex items-center gap-0.5"><Plus size={12} />Add</button>
            </div>
            <Chips items={people.map(p => ({ id: p.id, label: p.name }))} onRemove={x => setPeople(people.filter(p => p.id !== x))} />
          </div>
          <EventLinks ownerId={ownerId} items={events} onChange={setEvents} />

          {err && <p className="text-sm text-rose-500">{err}</p>}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            {id && <button onClick={remove} className="flex items-center gap-1 text-sm text-slate-400 hover:text-rose-500"><Trash2 size={14} />Delete</button>}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
      {pickPerson && <PersonSelectModal title="Add someone who is in it" onClose={() => setPickPerson(false)}
        onSelect={p => { if (!p.isSelf && !people.some(x => x.id === p.id)) setPeople([...people, { id: p.id, name: p.displayName || p.name }]); setPickPerson(false) }} />}
    </Modal>
  )
}

const inp = 'w-full px-2.5 py-2 text-sm border rounded-lg border-slate-200 bg-white text-slate-700 focus:border-pink-400 outline-none'

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={clsx('block', className)}><span className="block text-xs text-slate-400 mb-1">{label}</span>{children}</label>
}

function Chips({ items, onRemove }: { items: { id: string; label: string }[]; onRemove: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.length === 0 && <span className="text-xs text-slate-300">none</span>}
      {items.map(x => (
        <span key={x.id} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-100 rounded-full pl-2.5 pr-1 py-1 text-slate-600 max-w-full">
          <span className="truncate">{x.label}</span><button onClick={() => onRemove(x.id)} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
        </span>
      ))}
    </div>
  )
}

/** the real events it calls up: those linked, and a search over his events to add more */
function EventLinks({ ownerId, items, onChange }: { ownerId: string; items: { id: string; title: string; when?: string | null }[]; onChange: (x: { id: string; title: string; when?: string | null }[]) => void }) {
  const [q, setQ] = useState('')
  const all = useQuery({ queryKey: ['events', ownerId], queryFn: () => eventsApi.list({ personId: ownerId }) })
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase(); if (!needle) return []
    return (all.data ?? []).filter(e => !items.some(i => i.id === e.id) && `${e.title} ${e.place ?? ''} ${e.when}`.toLowerCase().includes(needle)).slice(0, 8)
  }, [all.data, q, items])
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5"><CalendarRange size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-500">Real events it calls up</span></div>
      <div className="mb-2"><Chips items={items.map(e => ({ id: e.id, label: e.when ? `${e.title} (${e.when})` : e.title }))} onRemove={x => onChange(items.filter(i => i.id !== x))} /></div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find an event to add…" className={inp} />
      {found.length > 0 && <div className="mt-1 border border-slate-100 rounded-lg divide-y divide-slate-50">
        {found.map(e => (
          <button key={e.id} onClick={() => { onChange([...items, { id: e.id, title: e.title, when: e.when }]); setQ('') }}
            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-pink-50/40">
            <span className="text-slate-400 mr-2">{e.when}</span>{e.title}
          </button>
        ))}
      </div>}
    </div>
  )
}
