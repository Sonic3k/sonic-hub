import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { musicApi } from '../../api/music'
import type { ArtistKind, MusicArtist } from '../../types/music'
import { Button, Input, Modal, Select, Textarea } from '../ui'
import { Country, ListChips, PlayButton, Stars, TrackTitle, countryName, musicKeys, usePlaylists } from './shared'
import TrackModal, { SearchBox, errorText } from './TrackModal'

const KINDS: ArtistKind[] = ['SOLO', 'GROUP', 'DUO', 'PROJECT', 'VARIOUS']
type Sort = 'name' | 'songs' | 'favorite' | 'country'

/** Every artist: where it is from, the group a solo artist came from, how much he loves it. */
export default function ArtistsTab() {
  const qc = useQueryClient()
  const { data: artists, isLoading } = useQuery({ queryKey: musicKeys.artists, queryFn: musicApi.artists })
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('songs')
  const [open, setOpen] = useState<string | null>(null)

  const rate = useMutation({
    mutationFn: ({ key, v }: { key: string; v: number }) => musicApi.putArtist(key, { favorite: v }),
    onMutate: ({ key, v }) => qc.setQueryData<MusicArtist[]>(musicKeys.artists, old => old?.map(a => (a.key === key ? { ...a, favorite: v || null } : a))),
    onSettled: () => qc.invalidateQueries({ queryKey: musicKeys.artists }),
  })

  const shown = useMemo(() => {
    const w = q.toLowerCase()
    const r = (artists ?? []).filter(a => !w || a.name.toLowerCase().includes(w) || countryName(a.country).toLowerCase().includes(w))
    const by: Record<Sort, (a: MusicArtist, b: MusicArtist) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      songs: (a, b) => b.tracks - a.tracks || a.name.localeCompare(b.name),
      favorite: (a, b) => (b.favorite ?? 0) - (a.favorite ?? 0) || b.tracks - a.tracks,
      country: (a, b) => (a.country ?? 'ZZ').localeCompare(b.country ?? 'ZZ') || b.tracks - a.tracks,
    }
    return [...r].sort(by[sort])
  }, [artists, q, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-full md:w-72"><SearchBox value={q} onChange={setQ} placeholder="Artist or country…" /></div>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="songs">Most songs first</option><option value="favorite">Most loved first</option>
          <option value="country">By country</option><option value="name">By name</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{shown.length} artists</span>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50">
          {shown.map(a => (
            <div key={a.key} onClick={() => setOpen(a.key)}
              className="grid grid-cols-[1fr,auto] md:grid-cols-[minmax(0,2fr),5.5rem,minmax(0,1.2fr),4.5rem,auto] gap-x-3 items-center px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50/80">
              <div className="min-w-0">
                <div className="truncate text-slate-800">{a.name}<span className="text-xs text-slate-400 ml-2">{a.kind?.toLowerCase()}</span></div>
                {a.members.length > 0 && <div className="text-xs text-slate-400 truncate">Members on their own: {a.members.map(m => m.name).join(', ')}</div>}
              </div>
              <div className="hidden md:block"><Country code={a.country} /></div>
              <div className="hidden md:block text-xs text-slate-500 truncate">{a.parent ? `from ${a.parent.name}` : ''}</div>
              <div className="hidden md:block text-xs text-slate-500 tabular-nums">{a.tracks} songs</div>
              <Stars value={a.favorite} onChange={v => rate.mutate({ key: a.key, v })} />
            </div>
          ))}
        </div>
      )}
      {open && <ArtistModal artistKey={open} artists={artists ?? []} onClose={() => setOpen(null)} />}
    </div>
  )
}

function ArtistModal({ artistKey, artists, onClose }: { artistKey: string; artists: MusicArtist[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: a } = useQuery({ queryKey: musicKeys.artist(artistKey), queryFn: () => musicApi.artist(artistKey) })
  const { data: lists } = usePlaylists()
  const [kind, setKind] = useState('')
  const [country, setCountry] = useState('')
  const [parent, setParent] = useState('')
  const [favorite, setFavorite] = useState(0)
  const [summary, setSummary] = useState('')
  const [note, setNote] = useState('')
  const [track, setTrack] = useState<string | null>(null)

  useEffect(() => {
    if (!a) return
    setKind(a.kind ?? ''); setCountry(a.country ?? ''); setParent(a.parent?.key ?? ''); setFavorite(a.favorite ?? 0)
    setSummary(a.summary ?? ''); setNote(a.note ?? '')
  }, [a])

  const save = useMutation({
    mutationFn: () => musicApi.putArtist(artistKey, { kind, country, parentKey: parent, favorite, summary, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['music'] }); onClose() },
  })

  return (
    <Modal title={a?.name ?? 'Artist'} onClose={onClose} size="xl">
      {!a ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <Select label="Kind" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="">—</option>{KINDS.map(k => <option key={k} value={k}>{k.toLowerCase()}</option>)}
            </Select>
            <Input label={`Country ${country ? `(${countryName(country.toUpperCase())})` : ''}`} value={country} maxLength={2} onChange={e => setCountry(e.target.value.toUpperCase())} placeholder="IE" />
            <Select label="Came from (group)" value={parent} onChange={e => setParent(e.target.value)}>
              <option value="">—</option>
              {artists.filter(x => x.key !== a.key && (x.kind === 'GROUP' || x.kind === 'DUO' || x.key === parent)).map(x => <option key={x.key} value={x.key}>{x.name}</option>)}
            </Select>
            <div className="space-y-1"><div className="text-xs font-medium text-slate-600">Favorite</div><Stars value={favorite} onChange={setFavorite} size={20} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Textarea label="About the artist" rows={3} value={summary} onChange={e => setSummary(e.target.value)} />
            <Textarea label="His own words" rows={3} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {a.members.length > 0 && <p className="text-xs text-slate-500">Members on their own: {a.members.map(m => m.name).join(', ')}</p>}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Songs in his lists ({a.trackList.length})</h3>
            <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
              {a.trackList.map(t => (
                <div key={t.key} onClick={() => setTrack(t.key)} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
                  <PlayButton t={t} queue={a.trackList} /><span className="min-w-0 flex-1 truncate"><TrackTitle t={t} /></span>
                  <Stars value={t.favorite} /><ListChips keys={t.playlists} lists={lists} />
                </div>
              ))}
            </div>
          </div>
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
