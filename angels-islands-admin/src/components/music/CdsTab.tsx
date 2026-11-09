import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Disc3 } from 'lucide-react'
import { musicApi } from '../../api/music'
import type { MusicCd } from '../../types/music'
import { SearchBox } from './TrackModal'
import { musicKeys } from './shared'

/** The CDs he owns (his "Rip by Sonic3k" shelf), each with its photos and scans — never used as the album cover. */
export default function CdsTab() {
  const { data: cds, isLoading } = useQuery({ queryKey: musicKeys.cds, queryFn: musicApi.cds })
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'acquired' | 'artist'>('acquired')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = (cds ?? []).filter(c => !needle
      || c.title.toLowerCase().includes(needle)
      || (c.artist?.name ?? '').toLowerCase().includes(needle)
      || (c.album?.title ?? '').toLowerCase().includes(needle))
    const by: Record<typeof sort, (a: MusicCd, b: MusicCd) => number> = {
      acquired: (a, b) => (a.acquiredAt ?? '9999').localeCompare(b.acquiredAt ?? '9999') || a.title.localeCompare(b.title),
      artist: (a, b) => (a.artist?.name ?? '~').localeCompare(b.artist?.name ?? '~') || a.title.localeCompare(b.title),
    }
    return [...list].sort(by[sort])
  }, [cds, q, sort])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="CD, artist or album" />
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white">
          <option value="acquired">In the order he got them</option><option value="artist">By artist</option>
        </select>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !shown.length ? (
        <p className="text-sm text-slate-400">No CD here yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map(c => <CdCard key={c.key} cd={c} />)}
        </div>
      )}
    </div>
  )
}

function CdCard({ cd }: { cd: MusicCd }) {
  const first = cd.media[0]
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center">
        {first ? (
          <a href={first.media.cdnUrl} target="_blank" rel="noreferrer" className="w-full h-full">
            <img src={first.media.thumbnailUrl ?? first.media.cdnUrl} alt={cd.title} loading="lazy" className="w-full h-full object-cover" />
          </a>
        ) : <Disc3 size={36} className="text-slate-200" />}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-sm text-slate-800 leading-snug">{cd.title}</div>
        <div className="text-xs text-slate-500">
          {cd.artist?.name}{cd.album && cd.album.title !== cd.title ? ` — ${cd.album.title}` : ''}
          {cd.edition && <span className="text-slate-400"> · {cd.edition}</span>}
        </div>
        {cd.acquired && <div className="text-xs text-slate-400">got it {cd.acquired}{cd.acquiredVia ? ` · ${cd.acquiredVia}` : ''}</div>}
        {cd.media.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pt-1">
            {cd.media.slice(1).map(m => (
              <a key={m.linkId} href={m.media.cdnUrl} target="_blank" rel="noreferrer" className="shrink-0" title={`${m.role.toLowerCase()}${m.label ? ` · ${m.label}` : ''}`}>
                <img src={m.media.thumbnailUrl ?? m.media.cdnUrl} alt={m.label ?? m.role} loading="lazy" className="h-14 w-14 rounded object-cover border border-slate-100" />
              </a>
            ))}
          </div>
        )}
        {cd.note && <p className="text-xs text-slate-500 pt-1">{cd.note}</p>}
      </div>
    </div>
  )
}
