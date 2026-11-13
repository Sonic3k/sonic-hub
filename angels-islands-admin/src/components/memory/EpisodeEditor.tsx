/* Add / edit one memory (episode): what happened, when and where as far as it is known, and what belongs to it —
   its photos (the first is the cover), albums, tags and the people who were there. */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, FolderOpen, ImagePlus, Plus, Tag as TagIcon, Trash2, UserPlus, X } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input, Modal, Textarea } from '../ui'
import { memoryApi } from '../../api/memory'
import { PRECISIONS, SEASONS, eventLabel, toIso } from '../EventDateEditor'
import CollectionPicker from '../CollectionPicker'
import TagSelectModal, { TagChip } from '../TagSelectModal'
import PersonSelectModal from '../PersonSelectModal'
import MediaPickerModal from './MediaPickerModal'
import { EPISODE_KINDS, StatusSwitch } from './shared'
import type { DatePrecision, EpisodeRequest, EpisodeResponse, MemoryCollectionRef, MemoryMediaRef, MemorySourceView, MemoryStatus, TagResponse } from '../../types'

const DATE_PRECISIONS = PRECISIONS.filter(p => ['DECADE', 'YEAR', 'SEASON', 'MONTH', 'DAY'].includes(p.value))
const field = 'px-3 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none'
const thumb = (url?: string) => (url ? `${url.split('?')[0]}?width=300` : '')

type PersonRef = { id: string; name: string; displayName?: string }

type Props = {
  personId: string
  item?: EpisodeResponse
  onSaved: (e: EpisodeResponse) => void
  onDeleted?: () => void
  onClose: () => void
}

/* A memory taken from a list does not carry all of its links (a list gets only the ones it asks the API for), and
   this form writes every link back on save. So editing never starts from the list's copy: the whole memory is read
   here by its id first, and the form opens on that. */
export default function EpisodeEditor(props: Props) {
  const id = props.item?.id
  const whole = useQuery({
    queryKey: ['episode', props.personId, id], queryFn: () => memoryApi.getEpisode(props.personId, id!),
    enabled: !!id, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  })
  if (id && !whole.data) return (
    <Modal title="Edit memory" size="xl" onClose={props.onClose}>
      <p className="text-sm text-slate-400 py-10 text-center">{whole.isError ? 'This memory could not be loaded — close and try again.' : 'Loading…'}</p>
    </Modal>
  )
  return <EpisodeForm {...props} item={id ? whole.data : undefined} />
}

function EpisodeForm({ personId, item, onSaved, onDeleted, onClose }: Props) {
  const editing = !!item
  const d = item?.occurredAt ?? ''
  const [title, setTitle] = useState(item?.title ?? '')
  const [summary, setSummary] = useState(item?.title && item.summary === item.title ? '' : item?.summary ?? '')
  const [kind, setKind] = useState(item?.kind ?? '')
  const [status, setStatus] = useState<MemoryStatus | null>(item ? item.status ?? null : 'CONFIRMED')
  // when: as far as it is known
  const [p, setP] = useState<DatePrecision>(item?.precision ?? (d ? 'DAY' : 'YEAR'))
  const [year, setYear] = useState(d.slice(0, 4))
  const [month, setMonth] = useState(d.slice(0, 7))
  const [season, setSeason] = useState(SEASONS.find(s => s.m === +d.slice(5, 7))?.m ?? 6)
  const [day, setDay] = useState(d.slice(0, 10))
  const [approx, setApprox] = useState(!!item?.approx)
  const [endAt, setEndAt] = useState(item?.endAt?.slice(0, 10) ?? '')
  const [place, setPlace] = useState(item?.place ?? '')
  const [lat, setLat] = useState(item?.latitude != null ? String(item.latitude) : '')
  const [lng, setLng] = useState(item?.longitude != null ? String(item.longitude) : '')
  const [emotion, setEmotion] = useState(item?.emotion ?? '')
  const [importance, setImportance] = useState(item?.importance ?? 5)
  const [media, setMedia] = useState<MemoryMediaRef[]>(item?.media ?? [])
  const [albums, setAlbums] = useState<MemoryCollectionRef[]>(item?.collections ?? [])
  const [tags, setTags] = useState<TagResponse[]>(item?.tags ?? [])
  const [people, setPeople] = useState<PersonRef[]>(item?.persons ?? [])
  const [sources, setSources] = useState<MemorySourceView[]>(item?.sourceViews ?? [])
  const [modal, setModal] = useState<'media' | 'album' | 'tag' | 'person' | null>(null)
  const [saving, setSaving] = useState(false)

  const iso = toIso(p, year, month, season, day, '')
  const dateTyped = !!(year || month || day)
  const valid = !!(title.trim() || summary.trim()) && (!dateTyped || !!iso)

  const move = (i: number, by: number) => setMedia(m => {
    const j = i + by; if (j < 0 || j >= m.length) return m
    const n = [...m]; [n[i], n[j]] = [n[j], n[i]]; return n
  })

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    const data: EpisodeRequest = {
      title: title.trim(), summary: summary.trim() || title.trim(), kind, emotion: emotion.trim(), importance,
      ...(iso ? { occurredAt: iso, precision: p, approx } : {}),
      ...(endAt ? { endAt: `${endAt}T00:00:00` } : {}),
      place: place.trim(),
      ...(lat && lng && !isNaN(+lat) && !isNaN(+lng) ? { latitude: +lat, longitude: +lng } : {}),
      mediaIds: media.map(m => m.id), collectionIds: albums.map(a => a.id), tagIds: tags.map(t => t.id), personIds: people.map(x => x.id),
      sources: sources.map(({ kind, threadId, archiveId, noteId, position, excerpt, author, saidAt, url }) => ({ kind, threadId, archiveId, noteId, position, excerpt, author, saidAt, url })),
      ...(status ? { status } : {}),
    }
    try {
      const saved = editing ? await memoryApi.updateEpisode(personId, item!.id, data) : await memoryApi.createEpisode(personId, data)
      onSaved(saved)
    } catch { alert('Save failed') }
    setSaving(false)
  }

  const remove = async () => {
    if (!item || !confirm(`Delete "${item.title || item.summary.slice(0, 40)}"?`)) return
    await memoryApi.deleteEpisode(personId, item.id)
    onDeleted?.()
  }

  return (
    <Modal title={editing ? 'Edit memory' : 'New memory'} size="xl" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Sầm Sơn 1993" />
        <Textarea label="What happened" rows={4} value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="A few sentences you will still understand in 10 years" />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kind</label>
            <div className="flex flex-wrap gap-1.5">
              {EPISODE_KINDS.map(k => (
                <button key={k.value} type="button" onClick={() => setKind(kind === k.value ? '' : k.value)}
                  className={clsx('text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                    kind === k.value ? 'bg-pink-50 border-pink-200 text-pink-600 font-medium' : 'border-slate-200 text-slate-500 hover:border-pink-300')}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <StatusSwitch value={status} onChange={setStatus} />
        </div>

        {/* when */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">When</label>
          <div className="flex flex-wrap items-center gap-2">
            <select value={p} onChange={e => setP(e.target.value as DatePrecision)} className={field}>
              {DATE_PRECISIONS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
            {(p === 'DECADE' || p === 'YEAR' || p === 'SEASON') && <input type="number" min={1800} max={2100} placeholder="Năm" value={year}
              onChange={e => setYear(e.target.value)} className={`${field} w-24`} />}
            {p === 'SEASON' && <select value={season} onChange={e => setSeason(+e.target.value)} className={field}>
              {SEASONS.map(s => <option key={s.m} value={s.m}>{s.label}</option>)}</select>}
            {p === 'MONTH' && <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={field} />}
            {p === 'DAY' && <input type="date" value={day} onChange={e => setDay(e.target.value)} className={field} />}
            <label className="flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" checked={approx} onChange={e => setApprox(e.target.checked)} />khoảng (~)</label>
            <span className="text-xs text-slate-400 ml-1">until</span>
            <input type="date" value={endAt} onChange={e => setEndAt(e.target.value)} className={field} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{iso ? eventLabel({ date: iso, precision: p, approx }) + (endAt ? ` → ${endAt}` : '') : dateTyped ? 'Not enough to make a date' : 'No date'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px] gap-3">
          <Input label="Place" value={place} onChange={e => setPlace(e.target.value)} placeholder="Sầm Sơn, Thanh Hoá" />
          <Input label="Latitude" value={lat} onChange={e => setLat(e.target.value)} placeholder="19.739" />
          <Input label="Longitude" value={lng} onChange={e => setLng(e.target.value)} placeholder="105.903" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Emotion" value={emotion} onChange={e => setEmotion(e.target.value)} placeholder="vui, bồi hồi…" />
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Importance · {importance}/10</label>
            <input type="range" min={1} max={10} step={1} value={importance} onChange={e => setImportance(parseInt(e.target.value))} className="w-full accent-pink-500 mt-2" />
          </div>
        </div>

        {/* photos */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs font-medium text-slate-500">Photos · {media.length}</label>
            <button type="button" onClick={() => setModal('media')} className="flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-2 py-1 rounded"><ImagePlus size={12} />Add</button>
          </div>
          {media.length === 0 ? <p className="text-xs text-slate-300">No photos yet. The first one becomes the cover.</p> : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
              {media.map((m, i) => (
                <div key={m.id} className="relative group aspect-square rounded-md overflow-hidden bg-slate-100" title={m.caption || m.fileName}>
                  {m.url && <img src={thumb(m.url)} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-black/60 text-white px-1 rounded">Cover</span>}
                  <span className="absolute inset-x-0 top-0 flex justify-between p-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <span className="flex gap-0.5">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center disabled:opacity-30"><ArrowLeft size={11} /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === media.length - 1} className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center disabled:opacity-30"><ArrowRight size={11} /></button>
                    </span>
                    <button type="button" onClick={() => setMedia(x => x.filter(y => y.id !== m.id))} className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center hover:bg-rose-500"><X size={11} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* albums, tags, people */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LinkBox label="Albums" icon={<FolderOpen size={12} />} onAdd={() => setModal('album')}>
            {albums.map(a => <Chip key={a.id} text={a.name} onRemove={() => setAlbums(x => x.filter(y => y.id !== a.id))} />)}
          </LinkBox>
          <LinkBox label="Tags" icon={<TagIcon size={12} />} onAdd={() => setModal('tag')}>
            {tags.map(t => <TagChip key={t.id} tag={t} onRemove={() => setTags(x => x.filter(y => y.id !== t.id))} />)}
          </LinkBox>
          <LinkBox label="People" icon={<UserPlus size={12} />} onAdd={() => setModal('person')}>
            {people.map(x => <Chip key={x.id} text={x.displayName || x.name} onRemove={() => setPeople(y => y.filter(z => z.id !== x.id))} />)}
          </LinkBox>
        </div>

        {sources.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Told in · {sources.length}</label>
            <div className="space-y-1.5">
              {sources.map((x, i) => (
                <div key={i} className="group flex gap-2 items-start rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 shrink-0 mt-0.5">{x.kind === 'FORUM' ? 'Forum' : x.kind === 'CHAT' ? 'Chat' : x.kind === 'NOTE' ? 'Note' : 'Link'}</span>
                  <div className="min-w-0 flex-1">
                    {x.excerpt && <p className="text-xs text-slate-700 line-clamp-3 whitespace-pre-line">{x.excerpt}</p>}
                    <p className="text-[11px] text-slate-400 truncate">{[x.author, x.saidAt?.slice(0, 16).replace('T', ' '),
                      x.kind === 'FORUM' ? x.threadTitle : x.kind === 'CHAT' ? [x.archivePlatform, x.archivePersonName].filter(Boolean).join(' · ') : x.kind === 'NOTE' ? x.noteTitle : x.url].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button type="button" onClick={() => setSources(s => s.filter((_, k) => k !== i))} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(item?.source || item?.externalKey) && (
          <p className="text-[11px] text-slate-300">{[item.source && `source: ${item.source}`, item.externalKey && `key: ${item.externalKey}`].filter(Boolean).join(' · ')}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {editing && <Button variant="danger" size="sm" onClick={remove}><Trash2 size={13} className="mr-1" />Delete</Button>}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>

      {modal === 'media' && <MediaPickerModal albums={albums} already={media.map(m => m.id)} onClose={() => setModal(null)}
        onPick={picked => { setMedia(m => [...m, ...picked.filter(x => !m.some(y => y.id === x.id)).map(x => ({ id: x.id, fileName: x.fileName, url: x.posterUrl || x.cdnUrl, caption: x.caption, width: x.width, height: x.height }))]); setModal(null) }} />}
      {modal === 'album' && <CollectionPicker title="Add an album" confirmLabel="Add" onClose={() => setModal(null)}
        onSelect={(id, name) => { setAlbums(a => a.some(x => x.id === id) ? a : [...a, { id, name }]); setModal(null) }} />}
      {modal === 'tag' && <TagSelectModal title="Add a tag" onClose={() => setModal(null)}
        onSelect={t => { setTags(x => x.some(y => y.id === t.id) ? x : [...x, t]); setModal(null) }} />}
      {modal === 'person' && <PersonSelectModal title="Who was there?" onClose={() => setModal(null)}
        onSelect={x => { setPeople(y => y.some(z => z.id === x.id) ? y : [...y, { id: x.id, name: x.name, displayName: x.displayName }]); setModal(null) }} />}
    </Modal>
  )
}

function LinkBox({ label, icon, onAdd, children }: { label: string; icon: React.ReactNode; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <button type="button" onClick={onAdd} className="ml-auto flex items-center gap-1 text-[11px] text-pink-500 hover:bg-pink-50 px-1.5 py-0.5 rounded">{icon}<Plus size={10} /></button>
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full bg-slate-100 text-slate-600">
      {text}<button type="button" onClick={onRemove} className="text-slate-400 hover:text-rose-500"><X size={11} /></button>
    </span>
  )
}
