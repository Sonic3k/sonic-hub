import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shuffle } from 'lucide-react'
import { musicApi } from '../../api/music'
import type { MusicTrack } from '../../types/music'
import { Button } from '../ui'
import { ListChips, PlayButton, Stars, TrackTitle, musicKeys, usePlayer, usePlaylists } from './shared'
import TrackModal, { SearchBox } from './TrackModal'

type Sort = 'artist' | 'heard' | 'favorite' | 'lists'
const PAGE = 150

/** Every recording in his lists: search, filter by list, rate on the spot, open one to tell its story. */
export default function SongsTab() {
  const qc = useQueryClient()
  const player = usePlayer()
  const { data: tracks, isLoading } = useQuery({ queryKey: musicKeys.tracks, queryFn: musicApi.tracks })
  const { data: lists } = usePlaylists()
  const [q, setQ] = useState('')
  const [list, setList] = useState('')
  const [rated, setRated] = useState<'' | 'rated' | 'unrated'>('')
  const [sort, setSort] = useState<Sort>('artist')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)

  const rate = useMutation({
    mutationFn: ({ key, v }: { key: string; v: number }) => musicApi.putTrack(key, { favorite: v }),
    onMutate: ({ key, v }) => qc.setQueryData<MusicTrack[]>(musicKeys.tracks, old => old?.map(t => (t.key === key ? { ...t, favorite: v || null } : t))),
    onSettled: () => qc.invalidateQueries({ queryKey: musicKeys.tracks }),
  })

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    let r = (tracks ?? []).filter(t => {
      if (list && !t.playlists.includes(list)) return false
      if (rated === 'rated' && !t.favorite) return false
      if (rated === 'unrated' && t.favorite) return false
      if (!words.length) return true
      const hay = `${t.title} ${t.version ?? ''} ${t.featuring ?? ''} ${t.artist?.name ?? ''} ${t.album?.title ?? ''}`.toLowerCase()
      return words.every(w => hay.includes(w))
    })
    if (sort === 'heard') r = [...r].sort((a, b) => (a.firstHeardAt ?? '9999').localeCompare(b.firstHeardAt ?? '9999'))
    if (sort === 'favorite') r = [...r].sort((a, b) => (b.favorite ?? 0) - (a.favorite ?? 0))
    if (sort === 'lists') r = [...r].sort((a, b) => b.playlists.length - a.playlists.length)
    return r
  }, [tracks, q, list, rated, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-full md:w-72"><SearchBox value={q} onChange={v => { setQ(v); setLimit(PAGE) }} placeholder="Song, artist, album…" /></div>
        <select value={list} onChange={e => { setList(e.target.value); setLimit(PAGE) }} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="">All his lists</option>
          {(lists ?? []).map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
        </select>
        <select value={rated} onChange={e => setRated(e.target.value as typeof rated)} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="">Rated or not</option><option value="rated">Rated</option><option value="unrated">Not rated</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="artist">By artist</option><option value="heard">By when he started</option>
          <option value="favorite">Most loved first</option><option value="lists">In most lists first</option>
        </select>
        <Button size="sm" variant="ghost" onClick={() => player.shuffle(shown)} disabled={!shown.some(t => t.hasAudio)}><Shuffle size={14} />Play these</Button>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50">
          {shown.slice(0, limit).map(t => (
            <div key={t.key} onClick={() => setOpen(t.key)}
              className="grid grid-cols-[auto,1fr,auto] md:grid-cols-[auto,minmax(0,2fr),minmax(0,1.3fr),6.5rem,auto,minmax(0,1fr)] gap-x-3 items-center px-3 py-2 text-sm cursor-pointer hover:bg-slate-50/80">
              <PlayButton t={t} queue={shown} />
              <div className="min-w-0 truncate"><TrackTitle t={t} /><div className="md:hidden text-xs text-slate-400 truncate">{t.artist?.name}</div></div>
              <div className="hidden md:block min-w-0 truncate text-slate-500">{t.artist?.name}<span className="text-slate-300">{t.album ? ` — ${t.album.title}` : ''}</span></div>
              <div className="hidden md:block text-xs text-slate-500 tabular-nums" title={t.firstHeardEvidence ?? ''}>{t.firstHeard ?? ''}</div>
              <Stars value={t.favorite} onChange={v => rate.mutate({ key: t.key, v })} />
              <div className="hidden md:flex justify-end"><ListChips keys={t.playlists} lists={lists} /></div>
            </div>
          ))}
          {shown.length > limit && (
            <button onClick={() => setLimit(limit + PAGE)} className="w-full py-3 text-sm text-pink-600 hover:bg-pink-50/50">Show more ({shown.length - limit} left)</button>
          )}
          {!shown.length && <p className="px-3 py-6 text-sm text-slate-400 text-center">No song matches.</p>}
        </div>
      )}
      {open && <TrackModal trackKey={open} onClose={() => setOpen(null)} onOpen={setOpen} />}
    </div>
  )
}
