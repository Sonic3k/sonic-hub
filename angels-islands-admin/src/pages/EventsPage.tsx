/* Events (sự kiện): the frames memories sit in — a trip, a concert, a move, buying a laptop. Each event holds its
   albums, memories, money and people; memories stay random, events are the clear timeline around them. */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, FolderOpen, Plus, Search, Trash2, Users, Wallet, X, Brain } from 'lucide-react'
import clsx from 'clsx'
import { eventsApi } from '../api/events'
import { memoryApi } from '../api/memory'
import { financeApi } from '../api/finance'
import { usePersons } from '../hooks/usePersons'
import CollectionPicker from '../components/CollectionPicker'
import PersonSelectModal from '../components/PersonSelectModal'
import { Button, Modal } from '../components/ui'
import type { EventMoney, LifeEventDetail, LifeEventRequest, LifeEventSummary } from '../types'

export const EVENT_KINDS = ['TRIP', 'CONCERT', 'SHOW', 'MILESTONE', 'PURCHASE', 'WORK', 'STUDY', 'GATHERING', 'CELEBRATION', 'MOVE', 'SPORT', 'OTHER']
const kindName = (k?: string | null) => (k ? k.charAt(0) + k.slice(1).toLowerCase() : '')
const PRECISIONS = ['YEAR', 'MONTH', 'DAY', 'MINUTE']

export function money(m: EventMoney[]): string {
  return m.filter(x => x.out > 0).map(x => `${Math.round(x.out).toLocaleString('en-US')} ${x.currency}`).join(' · ')
}

export default function EventsPage() {
  const qc = useQueryClient()
  const { data: persons = [] } = usePersons()
  const self = persons.find(p => p.isSelf)
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(''), [kind, setKind] = useState('')
  const open = sp.get('event')
  const setOpen = (id: string | null) => setSp(prev => { const n = new URLSearchParams(prev); if (id) n.set('event', id); else n.delete('event'); return n }, { replace: true })
  const list = useQuery({ queryKey: ['events', self?.id], queryFn: () => eventsApi.list({ personId: self?.id }), enabled: !!self })
  const all = list.data ?? []
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(e => (!kind || e.kind === kind) && (!needle || `${e.title} ${e.place ?? ''} ${e.summary ?? ''}`.toLowerCase().includes(needle)))
  }, [all, q, kind])
  const byYear = useMemo(() => {
    const m = new Map<string, LifeEventSummary[]>()
    for (const e of [...shown].sort((a, b) => b.startAt.localeCompare(a.startAt))) {
      const y = e.startAt.slice(0, 4); m.set(y, [...(m.get(y) ?? []), e])
    }
    return [...m.entries()]
  }, [shown])
  const titleOf = (id?: string | null) => all.find(e => e.id === id)?.title
  const refresh = () => qc.invalidateQueries({ queryKey: ['events'] })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-slate-800">Events</h1>
        <span className="text-xs text-slate-400">{all.length} events</span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setOpen('new')}><Plus size={14} className="mr-1" />New event</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, place, story…"
            className="w-full pl-8 pr-8 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none" />
          {q && <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
        </div>
        <select value={kind} onChange={e => setKind(e.target.value)}
          className="px-2.5 py-2 text-sm border rounded-lg border-slate-200 bg-white text-slate-600 focus:border-pink-400 outline-none">
          <option value="">All kinds</option>
          {EVENT_KINDS.map(k => <option key={k} value={k}>{kindName(k)}</option>)}
        </select>
      </div>

      {list.isLoading ? <p className="text-sm text-slate-400">Loading…</p>
        : shown.length === 0 ? <p className="text-sm text-slate-400">No events{q || kind ? ' match' : ' yet'}.</p>
        : byYear.map(([year, evs]) => (
          <section key={year} className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-2">{year}</h2>
            <div className="space-y-2">
              {evs.map(e => (
                <button key={e.id} onClick={() => setOpen(e.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-white hover:border-pink-200 hover:bg-pink-50/30 text-left transition-colors">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {e.coverUrl ? <img src={e.coverUrl + '?width=160'} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <CalendarRange size={20} className="text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">{e.title}</span>
                      {e.kind && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{kindName(e.kind)}</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {e.when}{e.place && <> · {e.place}</>}{e.parentId && titleOf(e.parentId) && <> · part of {titleOf(e.parentId)}</>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-1">
                      {e.albums > 0 && <span className="flex items-center gap-1"><FolderOpen size={11} />{e.albums}</span>}
                      {e.memories > 0 && <span className="flex items-center gap-1"><Brain size={11} />{e.memories}</span>}
                      {e.people > 0 && <span className="flex items-center gap-1"><Users size={11} />{e.people}</span>}
                      {money(e.money) && <span className="flex items-center gap-1"><Wallet size={11} />{money(e.money)}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

      {open && self && <EventEditor id={open === 'new' ? null : open} ownerId={self.id} events={all}
        onClose={() => setOpen(null)} onSaved={id => { refresh(); setOpen(id) }} onDeleted={() => { refresh(); setOpen(null) }} />}
    </div>
  )
}

/** start/end as the inputs show them: what the API keeps, cut to its precision */
function dateInput(at?: string | null, precision?: string | null): string {
  if (!at) return ''
  if (precision === 'YEAR' || precision === 'DECADE') return at.slice(0, 4)
  if (precision === 'MONTH' || precision === 'SEASON') return at.slice(0, 7)
  if (precision === 'DAY' || !precision) return at.slice(0, 10)
  return at.slice(0, 16)
}

function EventEditor({ id, ownerId, events, onClose, onSaved, onDeleted }: {
  id: string | null; ownerId: string; events: LifeEventSummary[]
  onClose: () => void; onSaved: (id: string) => void; onDeleted: () => void
}) {
  const detail = useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.get(id!), enabled: !!id })
  const [f, setF] = useState<LifeEventRequest>({ precision: 'DAY', kind: 'TRIP' })
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([])
  const [memories, setMemories] = useState<{ id: string; title: string }[]>([])
  const [txns, setTxns] = useState<LifeEventDetail['transactionList']>([])
  const [people, setPeople] = useState<{ id: string; name: string }[]>([])
  const [pickAlbum, setPickAlbum] = useState(false), [pickPerson, setPickPerson] = useState(false)
  const [saving, setSaving] = useState(false), [err, setErr] = useState('')
  const d = detail.data

  useEffect(() => {
    if (!d) return
    setF({ title: d.title, kind: d.kind ?? '', summary: d.summary ?? '', start: dateInput(d.startAt, d.precision), precision: d.precision ?? 'DAY',
      end: d.endAt ? d.endAt.slice(0, d.precision === 'MINUTE' ? 16 : 10) : '', approx: !!d.approx, place: d.place ?? '',
      importance: d.importance ?? undefined, parentId: d.parentId ?? '' })
    setAlbums(d.albumList.map(a => ({ id: a.id, name: a.name })))
    setMemories(d.memoryList.map(m => ({ id: m.id, title: m.title || m.summary?.slice(0, 80) || '(memory)' })))
    setTxns(d.transactionList)
    setPeople(d.persons.map(p => ({ id: p.id, name: p.nickname ? `${p.name} (${p.nickname})` : p.name })))
  }, [d])

  const set = (k: keyof LifeEventRequest, v: unknown) => setF(prev => ({ ...prev, [k]: v }))
  const save = async () => {
    setErr('')
    if (!f.title?.trim() || !f.start?.trim()) { setErr('Title and start are needed.'); return }
    setSaving(true)
    try {
      const body: LifeEventRequest = { ...f, personId: ownerId, parentId: f.parentId || '00000000-0000-0000-0000-000000000000',
        collectionIds: albums.map(a => a.id), episodeIds: memories.map(m => m.id), transactionIds: txns.map(t => t.id), personIds: people.map(p => p.id) }
      const r = id ? await eventsApi.update(id, body) : await eventsApi.create(body)
      onSaved(r.id)
    } catch (e: any) { setErr(e?.response?.data?.error || e?.message || 'Save failed') }
    finally { setSaving(false) }
  }
  const remove = async () => {
    if (!id || !confirm('Delete this event? Its albums, memories and money stay, only the links go.')) return
    await eventsApi.remove(id); onDeleted()
  }

  return (
    <Modal title={id ? (d?.title ?? 'Event') : 'New event'} onClose={onClose} size="xl">
      {id && detail.isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Field label="Title" className="md:col-span-4"><input value={f.title ?? ''} onChange={e => set('title', e.target.value)} className={inp} /></Field>
            <Field label="Kind" className="md:col-span-2">
              <select value={f.kind ?? ''} onChange={e => set('kind', e.target.value)} className={inp}>
                <option value="">—</option>{EVENT_KINDS.map(k => <option key={k} value={k}>{kindName(k)}</option>)}
              </select>
            </Field>
            <Field label="Start" className="md:col-span-2"><input value={f.start ?? ''} onChange={e => set('start', e.target.value)} placeholder="2023-02-16" className={inp} /></Field>
            <Field label="Known to" className="md:col-span-1">
              <select value={f.precision ?? 'DAY'} onChange={e => set('precision', e.target.value)} className={inp}>
                {PRECISIONS.map(p => <option key={p} value={p}>{kindName(p)}</option>)}
              </select>
            </Field>
            <Field label="Last day" className="md:col-span-2"><input value={f.end ?? ''} onChange={e => set('end', e.target.value)} placeholder="(one day)" className={inp} /></Field>
            <label className="md:col-span-1 flex items-end gap-2 text-sm text-slate-500 pb-2">
              <input type="checkbox" checked={!!f.approx} onChange={e => set('approx', e.target.checked)} /> About
            </label>
            <Field label="Place" className="md:col-span-3"><input value={f.place ?? ''} onChange={e => set('place', e.target.value)} className={inp} /></Field>
            <Field label="Part of" className="md:col-span-3">
              <select value={f.parentId ?? ''} onChange={e => set('parentId', e.target.value)} className={inp}>
                <option value="">—</option>
                {events.filter(e => e.id !== id).map(e => <option key={e.id} value={e.id}>{e.title} ({e.when})</option>)}
              </select>
            </Field>
            <Field label="What happened" className="md:col-span-6">
              <textarea value={f.summary ?? ''} onChange={e => set('summary', e.target.value)} rows={3} className={clsx(inp, 'resize-y')} />
            </Field>
          </div>

          <Links title="People" icon={Users} onAdd={() => setPickPerson(true)} items={people.map(p => ({ id: p.id, label: p.name }))}
            onRemove={x => setPeople(people.filter(p => p.id !== x))} />
          <Links title="Albums" icon={FolderOpen} onAdd={() => setPickAlbum(true)} items={albums.map(a => ({ id: a.id, label: a.name }))}
            onRemove={x => setAlbums(albums.filter(a => a.id !== x))} />
          <MemoryLinks ownerId={ownerId} start={f.start} items={memories} onChange={setMemories} />
          <MoneyLinks start={f.start} end={f.end} items={txns} onChange={setTxns} />

          {err && <p className="text-sm text-rose-500">{err}</p>}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            {id && <button onClick={remove} className="flex items-center gap-1 text-sm text-slate-400 hover:text-rose-500"><Trash2 size={14} />Delete</button>}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
      {pickAlbum && <CollectionPicker title="Add an album" confirmLabel="Add" onClose={() => setPickAlbum(false)}
        onSelect={(cid, name) => { if (!albums.some(a => a.id === cid)) setAlbums([...albums, { id: cid, name }]); setPickAlbum(false) }} />}
      {pickPerson && <PersonSelectModal title="Add a person" onClose={() => setPickPerson(false)}
        onSelect={p => { if (!people.some(x => x.id === p.id)) setPeople([...people, { id: p.id, name: p.displayName || p.name }]); setPickPerson(false) }} />}
    </Modal>
  )
}

const inp = 'w-full px-2.5 py-2 text-sm border rounded-lg border-slate-200 bg-white text-slate-700 focus:border-pink-400 outline-none'

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={clsx('block', className)}><span className="block text-xs text-slate-400 mb-1">{label}</span>{children}</label>
}

function Links({ title, icon: Icon, items, onAdd, onRemove }: {
  title: string; icon: typeof Users; items: { id: string; label: string }[]; onAdd: () => void; onRemove: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-500">{title}</span>
        <button onClick={onAdd} className="text-xs text-pink-500 hover:text-pink-600 flex items-center gap-0.5"><Plus size={12} />Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-xs text-slate-300">none</span>}
        {items.map(x => (
          <span key={x.id} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-100 rounded-full pl-2.5 pr-1 py-1 text-slate-600">
            {x.label}<button onClick={() => onRemove(x.id)} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

/** memories of the owner: those linked, and a search to add more (closest to the event's start first) */
function MemoryLinks({ ownerId, start, items, onChange }: { ownerId: string; start?: string; items: { id: string; title: string }[]; onChange: (x: { id: string; title: string }[]) => void }) {
  const [q, setQ] = useState('')
  const all = useQuery({ queryKey: ['episodes', ownerId], queryFn: () => memoryApi.getEpisodes(ownerId) })
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase(); if (!needle) return []
    const t = start ? new Date(start.length === 4 ? `${start}-01-01` : start.length === 7 ? `${start}-01` : start).getTime() : 0
    return (all.data ?? []).filter(e => !items.some(i => i.id === e.id) && `${e.title ?? ''} ${e.summary} ${e.place ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => Math.abs(new Date(a.occurredAt ?? 0).getTime() - t) - Math.abs(new Date(b.occurredAt ?? 0).getTime() - t)).slice(0, 8)
  }, [all.data, q, items, start])
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5"><Brain size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-500">Memories</span></div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.length === 0 && <span className="text-xs text-slate-300">none</span>}
        {items.map(x => (
          <span key={x.id} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-100 rounded-full pl-2.5 pr-1 py-1 text-slate-600 max-w-full">
            <span className="truncate">{x.title}</span><button onClick={() => onChange(items.filter(i => i.id !== x.id))} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
          </span>
        ))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a memory to add…" className={inp} />
      {found.length > 0 && <div className="mt-1 border border-slate-100 rounded-lg divide-y divide-slate-50">
        {found.map(e => (
          <button key={e.id} onClick={() => { onChange([...items, { id: e.id, title: e.title || e.summary.slice(0, 80) }]); setQ('') }}
            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-pink-50/40">
            <span className="text-slate-400 mr-2">{e.occurredAt?.slice(0, 10)}</span>{e.title || e.summary.slice(0, 90)}
          </button>
        ))}
      </div>}
    </div>
  )
}

/** money: the lines linked, and the ones of that time (a week around it) to tick */
function MoneyLinks({ start, end, items, onChange }: { start?: string; end?: string; items: LifeEventDetail['transactionList']; onChange: (x: LifeEventDetail['transactionList']) => void }) {
  const day = (s?: string) => (s && s.length >= 10 ? s.slice(0, 10) : s && s.length === 7 ? `${s}-01` : s && s.length === 4 ? `${s}-01-01` : '')
  const from = day(start), to = day(end) || from
  const shift = (d: string, n: number) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
  const near = useQuery({ queryKey: ['event-txns', from, to], enabled: !!from,
    queryFn: () => financeApi.transactions({ from: shift(from, -21), to: shift(to, 7), size: 200 }) })
  const linked = new Set(items.map(t => t.id))
  const rows = (near.data?.content ?? []).filter(t => t.kind !== 'TRANSFER')
  const toggle = (t: any) => linked.has(t.id) ? onChange(items.filter(i => i.id !== t.id))
    : onChange([...items, { id: t.id, occurredAt: t.occurredAt, amount: t.amount, currency: t.currency, kind: t.kind, description: t.description, payeeName: t.payeeName, category: t.categoryName, account: t.accountName }])
  const extra = items.filter(t => !rows.some(r => r.id === t.id))
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5"><Wallet size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-500">Money</span>
        <span className="text-xs text-slate-300">{from ? 'lines from three weeks before to a week after' : 'set a start to see the money of that time'}</span></div>
      <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
        {[...extra, ...rows].map((t: any) => (
          <label key={t.id} className={clsx('flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer', linked.has(t.id) ? 'bg-pink-50/40 text-slate-700' : 'text-slate-500 hover:bg-slate-50')}>
            <input type="checkbox" checked={linked.has(t.id)} onChange={() => toggle(t)} />
            <span className="text-slate-400 w-20 shrink-0">{t.occurredAt?.slice(0, 10)}</span>
            <span className="flex-1 truncate">{t.description || t.payeeName || t.category || t.categoryName || '—'}</span>
            <span className={clsx('tabular-nums shrink-0', t.amount < 0 ? 'text-slate-600' : 'text-emerald-600')}>{Math.round(t.amount).toLocaleString('en-US')} {t.currency}</span>
          </label>
        ))}
        {from && near.isLoading && <p className="px-3 py-2 text-xs text-slate-400">Loading…</p>}
        {from && !near.isLoading && rows.length + extra.length === 0 && <p className="px-3 py-2 text-xs text-slate-300">No money lines around then.</p>}
      </div>
    </div>
  )
}

