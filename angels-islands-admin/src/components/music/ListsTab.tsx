import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarRange, FolderOpen, Monitor, Shuffle } from 'lucide-react'
import { musicApi } from '../../api/music'
import type { MusicTrack } from '../../types/music'
import { Button } from '../ui'
import { PlayButton, Stars, TrackTitle, musicKeys, usePlayer, usePlaylists } from './shared'
import TrackModal from './TrackModal'

/** His lists in the order of his life: the songs of each checkpoint, played in random order like back then. */
export default function ListsTab() {
  const { data: lists, isLoading } = usePlaylists()
  const [sel, setSel] = useState<string | null>(null)
  useEffect(() => { if (!sel && lists?.length) setSel(lists[0].key) }, [lists, sel])

  return (
    <div className="grid md:grid-cols-[18rem,1fr] gap-4 items-start">
      <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50">
        {isLoading && <p className="p-3 text-sm text-slate-400">Loading…</p>}
        {(lists ?? []).map(p => (
          <button key={p.key} onClick={() => setSel(p.key)}
            className={clsx('w-full text-left px-3 py-2.5 transition-colors', sel === p.key ? 'bg-pink-50/70' : 'hover:bg-slate-50')}>
            <div className="flex items-center gap-2">
              <span className={clsx('px-1.5 rounded text-[10px] font-semibold',
                p.kind === 'WINDOW' ? 'bg-pink-100 text-pink-700' : p.kind === 'FULL' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700')}>
                {p.kind === 'WINDOW' ? 'NEW & MOST PLAYED' : p.kind === 'FULL' ? 'WHOLE LIST' : 'CURATED'}
              </span>
              <span className="text-xs text-slate-400 tabular-nums">{p.when}</span>
            </div>
            <div className="text-sm text-slate-800 mt-0.5 truncate">{p.title}</div>
            {(p.deviceName || p.withAudio < p.tracks) && (
              <div className="text-xs text-slate-400 truncate">
                {p.deviceName}{p.withAudio < p.tracks && <span className="text-amber-500">{p.deviceName ? ' · ' : ''}some songs have no file</span>}
              </div>
            )}
          </button>
        ))}
      </div>
      {sel && <ListDetail listKey={sel} />}
    </div>
  )
}

function ListDetail({ listKey }: { listKey: string }) {
  const { data: p } = useQuery({ queryKey: musicKeys.playlist(listKey), queryFn: () => musicApi.playlist(listKey) })
  const player = usePlayer()
  const [open, setOpen] = useState<string | null>(null)
  if (!p) return <p className="text-sm text-slate-400">Loading…</p>
  const tracks = p.entries.map(e => e.track).filter((t): t is MusicTrack => !!t)
  return (
    <div className="bg-white border border-slate-100 rounded-xl">
      <div className="p-4 border-b border-slate-100 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-800">{p.title}</h2>
          <Button size="sm" className="ml-auto" onClick={() => player.shuffle(tracks)} disabled={!tracks.some(t => t.hasAudio)}><Shuffle size={14} />Play at random</Button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><CalendarRange size={12} />{p.kind === 'WINDOW' ? `new or most played ${p.when}` : `every song on ${p.when}`}</span>
          {p.deviceName && <span className="inline-flex items-center gap-1"><Monitor size={12} />{p.deviceName}</span>}
          {p.eventTitle && <span className="inline-flex items-center gap-1 text-pink-600">{p.eventTitle}</span>}
          {p.sourceFolder && <span className="inline-flex items-center gap-1 text-slate-400"><FolderOpen size={12} />{p.sourceFolder}</span>}
        </div>
        {p.summary && <p className="text-sm text-slate-600">{p.summary}</p>}
      </div>
      <div className="divide-y divide-slate-50">
        {p.entries.map((e, i) => e.track && (
          <div key={e.track.key} onClick={() => setOpen(e.track!.key)}
            className="grid grid-cols-[1.75rem,auto,1fr,auto] md:grid-cols-[1.75rem,auto,minmax(0,2fr),minmax(0,1.2fr),7rem,auto] gap-x-3 items-center px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50/80">
            <span className="text-xs text-slate-300 tabular-nums text-right">{i + 1}</span>
            <PlayButton t={e.track} queue={tracks} />
            <div className="min-w-0 truncate"><TrackTitle t={e.track} /><div className="md:hidden text-xs text-slate-400 truncate">{e.track.artist?.name}</div></div>
            <div className="hidden md:block min-w-0 truncate text-slate-500">{e.track.artist?.name}</div>
            <div className="hidden md:block text-xs text-slate-400 tabular-nums" title={e.fileName ?? ''}>{e.fileModifiedAt?.slice(0, 10) ?? ''}</div>
            <Stars value={e.track.favorite} />
          </div>
        ))}
      </div>
      {open && <TrackModal trackKey={open} onClose={() => setOpen(null)} onOpen={setOpen} />}
    </div>
  )
}
