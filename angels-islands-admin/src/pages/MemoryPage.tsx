/* Memory: everything the hub knows about a person — episodes (with their photos, albums, tags, people), facts,
   life chapters and traits. Yours by default; imports and the AI write drafts, you confirm or fix them here. */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Image as ImageIcon, MapPin, Pencil, Plus, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { usePersons } from '../hooks/usePersons'
import { useChapters, useEpisodes, useFacts, useTraits } from '../hooks/useMemory'
import { memoryApi } from '../api/memory'
import EpisodeEditor from '../components/memory/EpisodeEditor'
import MemoryFormModal, { type MemoryFormKind } from '../components/memory/MemoryFormModal'
import { ConfirmButton, EPISODE_KINDS, StatusBadge, episodeWhen, groupFacts, kindLabel } from '../components/memory/shared'
import type { ChapterRequest, ChapterResponse, EpisodeResponse, FactRequest, FactResponse, PersonSummary, TraitRequest, TraitResponse } from '../types'

type Tab = 'episodes' | 'facts' | 'chapters' | 'traits'
const TABS: { key: Tab; label: string }[] = [{ key: 'episodes', label: 'Episodes' }, { key: 'facts', label: 'Facts' }, { key: 'chapters', label: 'Life chapters' }, { key: 'traits', label: 'Traits' }]

export default function MemoryPage() {
  const { data: persons = [] } = usePersons()
  const [sp, setSp] = useSearchParams()
  const self = persons.find(p => p.isSelf)
  const pid = sp.get('person') || self?.id || persons[0]?.id || ''
  const person = persons.find(p => p.id === pid)
  const tab = (sp.get('tab') as Tab) || 'episodes'
  const setParam = (k: string, v: string | null) => setSp(prev => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })

  const episodes = useEpisodes(pid), facts = useFacts(pid), chapters = useChapters(pid), traits = useTraits(pid)
  const count: Record<Tab, number | undefined> = { episodes: episodes.data?.length, facts: facts.data?.length, chapters: chapters.data?.length, traits: traits.data?.length }
  const drafts = [episodes.data, facts.data, chapters.data, traits.data].reduce((n, l) => n + (l?.filter(x => x.status === 'DRAFT').length ?? 0), 0)

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold text-slate-800">Memory</h1>
        <PersonMenu persons={persons} value={person} onChange={id => setParam('person', id === self?.id ? null : id)} />
        {pid && <span className="text-xs text-slate-400">{drafts > 0 ? `${drafts} drafts to check` : 'nothing left to check'}</span>}
      </div>

      <div className="flex gap-1 border-b border-slate-100 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setParam('tab', t.key === 'episodes' ? null : t.key)}
            className={clsx('px-3 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors',
              tab === t.key ? 'border-pink-500 text-pink-600 font-medium' : 'border-transparent text-slate-400 hover:text-slate-600')}>
            {t.label}{count[t.key] !== undefined && <span className="ml-1.5 text-xs text-slate-300">{count[t.key]}</span>}
          </button>
        ))}
      </div>

      {!pid ? <p className="text-sm text-slate-400">No persons yet.</p>
        : tab === 'episodes' ? <EpisodesTab pid={pid} all={episodes.data ?? []} loading={episodes.isLoading} />
        : tab === 'facts' ? <FactsTab pid={pid} facts={facts.data ?? []} />
        : tab === 'chapters' ? <ChaptersTab pid={pid} chapters={chapters.data ?? []} />
        : <TraitsTab pid={pid} traits={traits.data ?? []} />}
    </div>
  )
}

function PersonMenu({ persons, value, onChange }: { persons: PersonSummary[]; value?: PersonSummary; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const sorted = [...persons].sort((a, b) => Number(!!b.isSelf) - Number(!!a.isSelf) || (a.displayName || a.name).localeCompare(b.displayName || b.name))
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800">
        {value ? value.displayName || value.name : 'Choose a person'}{value?.isSelf && <span className="text-xs text-slate-400">(you)</span>}
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && <>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-56 max-h-80 overflow-y-auto">
          {sorted.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); setOpen(false) }}
              className={clsx('w-full text-left px-4 py-2.5 text-sm', p.id === value?.id ? 'text-pink-500 bg-pink-50/50' : 'text-slate-600 hover:bg-slate-50')}>
              {p.displayName || p.name}{p.isSelf && <span className="text-xs text-slate-400 ml-1">(you)</span>}
            </button>
          ))}
        </div>
      </>}
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className="px-2.5 py-2 text-sm border rounded-lg border-slate-200 bg-white text-slate-600 focus:border-pink-400 outline-none">{children}</select>
}

// ── Episodes ─────────────────────────────────────────────────────────────────

function EpisodesTab({ pid, all, loading }: { pid: string; all: EpisodeResponse[]; loading: boolean }) {
  const qc = useQueryClient()
  const [q, setQ] = useState(''), [dq, setDq] = useState('')
  const [kind, setKind] = useState(''), [status, setStatus] = useState(''), [source, setSource] = useState('')
  const [oldest, setOldest] = useState(false)
  const [edit, setEdit] = useState<EpisodeResponse | 'new' | null>(null)
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t) }, [q])
  // with words typed the API searches and ranks (marks optional); kind, status and source narrow what comes back
  const found = useQuery({ queryKey: ['episodes', pid, 'q', dq], queryFn: () => memoryApi.getEpisodes(pid, { q: dq }), enabled: !!dq })
  const sources = useMemo(() => [...new Set(all.map(e => e.source || ''))].sort(), [all])
  const list = useMemo(() => {
    const base = dq ? found.data ?? [] : all
    const l = base.filter(e => (!kind || (kind === '-' ? !e.kind : e.kind === kind)) && (!status || (status === '-' ? !e.status : e.status === status)) && (!source || (source === '-' ? !e.source : e.source === source)))
    if (dq) return l
    return [...l].sort((a, b) => {
      if (!a.occurredAt || !b.occurredAt) return a.occurredAt ? -1 : b.occurredAt ? 1 : 0
      return oldest ? a.occurredAt.localeCompare(b.occurredAt) : b.occurredAt.localeCompare(a.occurredAt)
    })
  }, [all, found.data, dq, kind, status, source, oldest])
  const refresh = () => qc.invalidateQueries({ queryKey: ['episodes', pid] })
  const confirm = async (e: EpisodeResponse) => { await memoryApi.updateEpisode(pid, e.id, { status: 'CONFIRMED' }); refresh() }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, story, place, tags, people, captions…"
            className="w-full pl-8 pr-8 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none" />
          {q && <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
        </div>
        <Select value={kind} onChange={setKind}>
          <option value="">All kinds</option>
          {EPISODE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label} · {all.filter(e => e.kind === k.value).length}</option>)}
          <option value="-">No kind · {all.filter(e => !e.kind).length}</option>
        </Select>
        <Select value={status} onChange={setStatus}>
          <option value="">Any status</option>
          <option value="DRAFT">Draft · {all.filter(e => e.status === 'DRAFT').length}</option>
          <option value="CONFIRMED">Confirmed · {all.filter(e => e.status === 'CONFIRMED').length}</option>
          <option value="-">Not set · {all.filter(e => !e.status).length}</option>
        </Select>
        {sources.length > 1 && <Select value={source} onChange={setSource}>
          <option value="">All sources</option>
          {sources.map(s => <option key={s || '-'} value={s || '-'}>{s || 'typed in'} · {all.filter(e => (e.source || '') === s).length}</option>)}
        </Select>}
        {!dq && <button onClick={() => setOldest(o => !o)} className="text-xs text-slate-500 px-2.5 py-2 rounded-lg hover:bg-slate-100">{oldest ? 'Oldest first' : 'Newest first'}</button>}
        <button onClick={() => setEdit('new')} className="flex items-center gap-1 text-sm text-white bg-pink-500 hover:bg-pink-600 px-3 py-2 rounded-lg"><Plus size={14} />New</button>
      </div>

      <p className="text-xs text-slate-400 mb-2">{loading || found.isFetching ? 'Loading…' : `${list.length} ${list.length === 1 ? 'memory' : 'memories'}${dq ? ` matching “${dq}”, best first` : ''}`}</p>
      <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
        {list.map(e => <EpisodeRow key={e.id} e={e} onOpen={() => setEdit(e)} onConfirm={() => confirm(e)} />)}
        {!loading && !list.length && <p className="text-sm text-slate-400 p-6 text-center">Nothing here.</p>}
      </div>

      {edit && <EpisodeEditor personId={pid} item={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)}
        onSaved={() => { refresh(); setEdit(null) }} onDeleted={() => { refresh(); setEdit(null) }} />}
    </div>
  )
}

function EpisodeRow({ e, onOpen, onConfirm }: { e: EpisodeResponse; onOpen: () => void; onConfirm: () => void }) {
  const cover = e.media?.[0]?.url
  const who = (e.persons ?? []).map(p => p.displayName || p.name)
  return (
    <div onClick={onOpen} className="group flex gap-3 px-3 md:px-4 py-3 cursor-pointer hover:bg-slate-50/60">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
        {cover ? <img src={`${cover.split('?')[0]}?width=200`} alt="" loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-slate-300" strokeWidth={1.5} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-pink-500">{episodeWhen(e) || 'no date'}</span>
          {e.kind && <span className="text-[11px] text-slate-400">{kindLabel(e.kind)}</span>}
          <StatusBadge status={e.status} />
        </div>
        <p className="text-sm font-medium text-slate-700 truncate">{e.title || e.summary}</p>
        {e.title && e.summary && e.summary !== e.title && <p className="text-xs text-slate-500 line-clamp-2">{e.summary}</p>}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
          {e.place && <span className="flex items-center gap-1"><MapPin size={11} />{e.place}</span>}
          {!!e.media?.length && <span className="flex items-center gap-1"><ImageIcon size={11} />{e.media.length}</span>}
          {who.length > 0 && <span>{who.join(', ')}</span>}
          {(e.tags ?? []).map(t => <span key={t.id} className="px-1.5 rounded bg-slate-50 text-slate-500">{t.name}</span>)}
        </div>
      </div>
      <span className="flex items-start gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {e.status === 'DRAFT' && <ConfirmButton onClick={onConfirm} />}
        <button onClick={ev => { ev.stopPropagation(); onOpen() }} className="p-1 text-slate-300 hover:text-pink-500 rounded"><Pencil size={13} /></button>
      </span>
    </div>
  )
}

// ── Facts, chapters, traits ──────────────────────────────────────────────────

function useMemoryForm(pid: string) {
  const qc = useQueryClient()
  const [form, setForm] = useState<{ kind: MemoryFormKind; item?: FactResponse | ChapterResponse | TraitResponse } | null>(null)
  const key = { fact: 'facts', chapter: 'chapters', trait: 'traits' }
  const refresh = (k: MemoryFormKind) => qc.invalidateQueries({ queryKey: [key[k], pid] })
  return { form, setForm, refresh }
}

function SectionHead({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-semibold text-slate-600">{label}</h3>
      <button onClick={onAdd} className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded"><Plus size={11} />Add</button>
    </div>
  )
}

function RowActions({ draft, onConfirm, onEdit, onDelete }: { draft: boolean; onConfirm: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      {draft && <ConfirmButton onClick={onConfirm} />}
      <button onClick={onEdit} className="p-1 text-slate-300 hover:text-pink-500 rounded"><Pencil size={12} /></button>
      <button onClick={onDelete} className="p-1 text-slate-300 hover:text-rose-500 rounded"><X size={12} /></button>
    </span>
  )
}

function FactsTab({ pid, facts }: { pid: string; facts: FactResponse[] }) {
  const { form, setForm, refresh } = useMemoryForm(pid)
  const groups = groupFacts(facts)
  const del = async (f: FactResponse) => { if (!confirm(`Delete fact "${f.key}"?`)) return; await memoryApi.deleteFact(pid, f.id); refresh('fact') }
  const ok = async (f: FactResponse) => { await memoryApi.updateFact(pid, f.id, { status: 'CONFIRMED' } as FactRequest); refresh('fact') }
  return (
    <section>
      <SectionHead label="Facts" onAdd={() => setForm({ kind: 'fact' })} />
      <div className="space-y-4">{groups.map(([category, list]) => (
        <div key={category}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">{category} <span className="text-slate-300">· {list.length}</span></p>
          <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-50">{list.map(f => (
            <div key={f.id} className="group px-3 md:px-4 py-2.5 flex flex-wrap items-baseline gap-1.5 md:gap-3">
              <span className="text-xs font-medium text-slate-600">{f.key}:</span>
              <span className="text-xs text-slate-700 flex-1 min-w-[50%]">{f.value}</span>
              <span className="ml-auto flex items-center gap-1.5">
                {f.period && <span className="text-xs text-slate-300">{f.period}</span>}
                {f.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-400">{f.source}</span>}
                <StatusBadge status={f.status} />
                <RowActions draft={f.status === 'DRAFT'} onConfirm={() => ok(f)} onEdit={() => setForm({ kind: 'fact', item: f })} onDelete={() => del(f)} />
              </span>
            </div>
          ))}</div>
        </div>
      ))}</div>
      {!facts.length && <p className="text-sm text-slate-400">No facts yet.</p>}
      {form && <MemoryFormModal personId={pid} kind={form.kind} item={form.item} categories={groups.map(([c]) => c)}
        onSaved={() => { refresh(form.kind); setForm(null) }} onClose={() => setForm(null)} />}
    </section>
  )
}

function ChaptersTab({ pid, chapters }: { pid: string; chapters: ChapterResponse[] }) {
  const { form, setForm, refresh } = useMemoryForm(pid)
  const del = async (c: ChapterResponse) => { if (!confirm(`Delete chapter "${c.title || c.period}"?`)) return; await memoryApi.deleteChapter(pid, c.id); refresh('chapter') }
  const ok = async (c: ChapterResponse) => { await memoryApi.updateChapter(pid, c.id, { status: 'CONFIRMED' } as ChapterRequest); refresh('chapter') }
  return (
    <section>
      <SectionHead label="Life chapters" onAdd={() => setForm({ kind: 'chapter' })} />
      <div className="space-y-2">{[...chapters].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(c => (
        <div key={c.id} className="group bg-white rounded-lg p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-pink-500">{c.period}</span>
            {c.sentiment && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{c.sentiment}</span>}
            {c.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-400">{c.source}</span>}
            <StatusBadge status={c.status} />
            <span className="ml-auto"><RowActions draft={c.status === 'DRAFT'} onConfirm={() => ok(c)} onEdit={() => setForm({ kind: 'chapter', item: c })} onDelete={() => del(c)} /></span>
          </div>
          {c.title && <p className="text-sm font-medium text-slate-700">{c.title}</p>}
          {c.summary && <p className="text-xs text-slate-500 mt-1">{c.summary}</p>}
        </div>
      ))}</div>
      {!chapters.length && <p className="text-sm text-slate-400">No life chapters yet.</p>}
      {form && <MemoryFormModal personId={pid} kind={form.kind} item={form.item}
        onSaved={() => { refresh(form.kind); setForm(null) }} onClose={() => setForm(null)} />}
    </section>
  )
}

function TraitsTab({ pid, traits }: { pid: string; traits: TraitResponse[] }) {
  const { form, setForm, refresh } = useMemoryForm(pid)
  const del = async (t: TraitResponse) => { if (!confirm(`Delete trait "${t.trait}"?`)) return; await memoryApi.deleteTrait(pid, t.id); refresh('trait') }
  const ok = async (t: TraitResponse) => { await memoryApi.updateTrait(pid, t.id, { status: 'CONFIRMED' } as TraitRequest); refresh('trait') }
  return (
    <section>
      <SectionHead label="Traits" onAdd={() => setForm({ kind: 'trait' })} />
      <div className="space-y-2">{traits.map(t => (
        <div key={t.id} className="group bg-white rounded-lg px-4 py-2.5 border border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{t.trait}</span>
            {t.period && <span className="text-[11px] text-slate-300">{t.period}</span>}
            {t.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-400">{t.source}</span>}
            <StatusBadge status={t.status} />
            <span className="ml-auto"><RowActions draft={t.status === 'DRAFT'} onConfirm={() => ok(t)} onEdit={() => setForm({ kind: 'trait', item: t })} onDelete={() => del(t)} /></span>
          </div>
          {t.description && <p className="text-xs text-slate-600 mt-1">{t.description}</p>}
          {t.evidence && <p className="text-[11px] text-slate-400 italic mt-0.5">"{t.evidence}"</p>}
        </div>
      ))}</div>
      {!traits.length && <p className="text-sm text-slate-400">No traits yet.</p>}
      {form && <MemoryFormModal personId={pid} kind={form.kind} item={form.item}
        onSaved={() => { refresh(form.kind); setForm(null) }} onClose={() => setForm(null)} />}
    </section>
  )
}
