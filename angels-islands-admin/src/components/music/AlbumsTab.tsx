import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Disc3 } from 'lucide-react'
import { musicApi } from '../../api/music'
import type { AlbumKind, MusicAlbum, MusicCd } from '../../types/music'
import { Button, Input, Modal, Select, Textarea } from '../ui'
import { ListChips, PlayButton, Stars, TrackTitle, musicKeys, usePlaylists } from './shared'
import TrackModal, { SearchBox, errorText } from './TrackModal'

const KINDS: AlbumKind[] = ['ALBUM', 'SINGLE', 'EP', 'COMPILATION', 'LIVE', 'SOUNDTRACK']
type Sort = 'artist' | 'songs' | 'favorite' | 'year'

/** Every album his songs come from: how many of its songs are in his lists, the CDs of it he owns. */
export default function AlbumsTab() {
  const qc = useQueryClient()
  const { data: albums, isLoading } = useQuery({ queryKey: musicKeys.albums, queryFn: musicApi.albums })
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('songs')
  const [open, setOpen] = useState<string | null>(null)

  const rate = useMutation({
    mutationFn: ({ key, v }: { key: string; v: number }) => musicApi.putAlbum(key, { favorite: v }),
    onMutate: ({ key, v }) => qc.setQueryData<MusicAlbum[]>(musicKeys.albums, old => old?.map(a => (a.key === key ? { ...a, favorite: v || null } : a))),
    onSettled: () => qc.invalidateQueries({ queryKey: musicKeys.albums }),
  })

  const shown = useMemo(() => {
    const w = q.toLowerCase()
    const r = (albums ?? []).filter(a => !w || a.title.toLowerCase().includes(w) || (a.artist?.name ?? '').toLowerCase().includes(w))
    const by: Record<Sort, (a: MusicAlbum, b: MusicAlbum) => number> = {
      artist: () => 0,
      songs: (a, b) => b.tracks - a.tracks,
      favorite: (a, b) => (b.favorite ?? 0) - (a.favorite ?? 0) || b.tracks - a.tracks,
      year: (a, b) => (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999),
    }
    return [...r].sort(by[sort])
  }, [albums, q, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-full md:w-72"><SearchBox value={q} onChange={setQ} placeholder="Album or artist…" /></div>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="songs">Most songs in his lists</option><option value="favorite">Most loved first</option>
          <option value="year">By year</option><option value="artist">By artist</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{shown.length} albums</span>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50">
          {shown.map(a => (
            <div key={a.key} onClick={() => setOpen(a.key)}
              className="grid grid-cols-[1fr,auto] md:grid-cols-[minmax(0,2fr),minmax(0,1.2fr),3.5rem,6rem,4.5rem,auto] gap-x-3 items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50/80">
              <div className="min-w-0 truncate text-slate-800">{a.title}<span className="md:hidden text-xs text-slate-400"> — {a.artist?.name ?? 'Various'}</span></div>
              <div className="hidden md:block min-w-0 truncate text-slate-500">{a.artist?.name ?? 'Various artists'}</div>
              <div className="hidden md:block text-xs text-slate-500 tabular-nums">{a.releaseYear ?? ''}</div>
              <div className="hidden md:block text-xs text-slate-400">{a.kind?.toLowerCase()}</div>
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 tabular-nums">{a.tracks}{a.cds > 0 && <span title={`${a.cds} CD`} className="text-pink-500 inline-flex items-center"><Disc3 size={13} /></span>}</div>
              <Stars value={a.favorite} onChange={v => rate.mutate({ key: a.key, v })} />
            </div>
          ))}
        </div>
      )}
      {open && <AlbumModal albumKey={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function AlbumModal({ albumKey, onClose }: { albumKey: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: a } = useQuery({ queryKey: musicKeys.album(albumKey), queryFn: () => musicApi.album(albumKey) })
  const { data: lists } = usePlaylists()
  const [kind, setKind] = useState('')
  const [year, setYear] = useState('')
  const [favorite, setFavorite] = useState(0)
  const [summary, setSummary] = useState('')
  const [note, setNote] = useState('')
  const [track, setTrack] = useState<string | null>(null)

  useEffect(() => {
    if (!a) return
    setKind(a.kind ?? ''); setYear(a.releaseYear ? String(a.releaseYear) : ''); setFavorite(a.favorite ?? 0)
    setSummary(a.summary ?? ''); setNote(a.note ?? '')
  }, [a])

  const save = useMutation({
    mutationFn: () => musicApi.putAlbum(albumKey, { kind, releaseYear: year ? Number(year) : 0, favorite, summary, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['music'] }); onClose() },
  })

  return (
    <Modal title={a ? `${a.title}${a.artist ? ` — ${a.artist.name}` : ''}` : 'Album'} onClose={onClose} size="xl">
      {!a ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <Select label="Kind" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="">—</option>{KINDS.map(k => <option key={k} value={k}>{k.toLowerCase()}</option>)}
            </Select>
            <Input label="Year" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <div className="space-y-1"><div className="text-xs font-medium text-slate-600">Favorite</div><Stars value={favorite} onChange={setFavorite} size={20} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Textarea label="About the album" rows={3} value={summary} onChange={e => setSummary(e.target.value)} />
            <Textarea label="His own words" rows={3} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Its songs in his lists ({a.trackList.length})</h3>
            <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
              {a.trackList.map(t => (
                <div key={t.key} onClick={() => setTrack(t.key)} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
                  <PlayButton t={t} queue={a.trackList} />
                  <span className="text-xs text-slate-300 w-5 tabular-nums">{t.trackNo ?? ''}</span>
                  <span className="min-w-0 flex-1 truncate"><TrackTitle t={t} /></span>
                  <Stars value={t.favorite} /><ListChips keys={t.playlists} lists={lists} />
                </div>
              ))}
            </div>
          </div>
          {a.cdList.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">His CDs of it</h3>
              <div className="space-y-3">{a.cdList.map(c => <CdBlock key={c.key} cd={c} />)}</div>
            </div>
          )}
          {save.isError && <p className="text-xs text-rose-500">{errorText(save.error)}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
      {track && <TrackModal trackKey={track} onClose={() => setTrack(null)} onOpen={setTrack} />}
    </Modal>
  )
}

/** A CD he owns, with its photos and scans. */
export function CdBlock({ cd }: { cd: MusicCd }) {
  return (
    <div className="border border-slate-100 rounded-lg p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-slate-800">{cd.title}</span>
        {cd.acquired && <span className="text-xs text-slate-400">got it {cd.acquired}{cd.acquiredVia ? ` · ${cd.acquiredVia}` : ''}</span>}
      </div>
      {cd.media.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {cd.media.map(m => (
            <a key={m.linkId} href={m.media.cdnUrl} target="_blank" rel="noreferrer" className="shrink-0" title={`${m.role.toLowerCase()}${m.label ? ` · ${m.label}` : ''}`}>
              <img src={m.media.thumbnailUrl ?? m.media.cdnUrl} alt={m.label ?? m.role} className="h-24 w-auto rounded-md border border-slate-100 object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      ) : <p className="mt-1 text-xs text-slate-400">No photo or scan yet.</p>}
    </div>
  )
}
