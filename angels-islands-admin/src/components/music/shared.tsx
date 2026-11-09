import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Pause, Play, Shuffle, SkipBack, SkipForward, Star, X } from 'lucide-react'
import { apiUrl, musicApi } from '../../api/music'
import type { MusicPlaylist, MusicTrack } from '../../types/music'

export const musicKeys = {
  artists: ['music', 'artists'] as const,
  albums: ['music', 'albums'] as const,
  tracks: ['music', 'tracks'] as const,
  cds: ['music', 'cds'] as const,
  playlists: ['music', 'playlists'] as const,
  artist: (k: string) => ['music', 'artist', k] as const,
  album: (k: string) => ['music', 'album', k] as const,
  track: (k: string) => ['music', 'track', k] as const,
  playlist: (k: string) => ['music', 'playlist', k] as const,
}

export const usePlaylists = () => useQuery({ queryKey: musicKeys.playlists, queryFn: musicApi.playlists })

// ── favorite: 1 to 5 stars; the same star again clears ───────────────────────

export function Stars({ value, onChange, size = 14 }: { value?: number | null; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  const v = hover || value || 0
  return (
    <span className="inline-flex items-center" onMouseLeave={() => setHover(0)} onClick={e => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={!onChange}
          onMouseEnter={() => onChange && setHover(i)}
          onClick={() => onChange?.(value === i ? 0 : i)}
          className={clsx('p-[1px] transition-colors', onChange ? 'cursor-pointer' : 'cursor-default')}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}>
          <Star size={size} className={i <= v ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
        </button>
      ))}
    </span>
  )
}

// ── country ──────────────────────────────────────────────────────────────────

const COUNTRY: Record<string, string> = {
  IE: 'Ireland', GB: 'United Kingdom', US: 'United States', CA: 'Canada', AU: 'Australia', DK: 'Denmark', SE: 'Sweden',
  NO: 'Norway', IS: 'Iceland', DE: 'Germany', NL: 'Netherlands', FR: 'France', IT: 'Italy', ES: 'Spain', VN: 'Vietnam',
  IL: 'Israel', PH: 'Philippines', CH: 'Switzerland', MT: 'Malta', SI: 'Slovenia', AZ: 'Azerbaijan', HK: 'Hong Kong', BB: 'Barbados',
  NZ: 'New Zealand', BE: 'Belgium', AT: 'Austria', FI: 'Finland',
}

export const countryName = (c?: string | null) => (c ? COUNTRY[c] ?? c : '')

/** "🇮🇪" from "IE" */
export function flag(c?: string | null) {
  if (!c || c.length !== 2) return ''
  return String.fromCodePoint(...[...c.toUpperCase()].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

export function Country({ code }: { code?: string | null }) {
  if (!code) return <span className="text-slate-300">—</span>
  return <span title={countryName(code)} className="whitespace-nowrap"><span className="mr-1">{flag(code)}</span><span className="text-slate-500 text-xs">{code}</span></span>
}

// ── the lists a song is in ───────────────────────────────────────────────────

/** "2008" for a WINDOW list, "15.07" for a FULL one (its year and month) */
export function listLabel(p?: MusicPlaylist) {
  if (!p) return '?'
  const y = p.takenAt?.slice(0, 4) ?? '?'
  if (p.kind === 'WINDOW') return y
  return p.takenAt ? `${y.slice(2)}.${p.takenAt.slice(5, 7)}` : y
}

export function ListChips({ keys, lists }: { keys: string[]; lists?: MusicPlaylist[] }) {
  const byKey = useMemo(() => new Map((lists ?? []).map(p => [p.key, p])), [lists])
  if (!keys.length) return null
  return (
    <span className="inline-flex flex-wrap gap-1">
      {keys.map(k => {
        const p = byKey.get(k)
        return (
          <span key={k} title={p?.title ?? k}
            className={clsx('px-1.5 py-[1px] rounded text-[10px] font-medium tabular-nums leading-4',
              p?.kind === 'WINDOW' ? 'bg-pink-50 text-pink-600 ring-1 ring-inset ring-pink-200' : 'bg-slate-100 text-slate-600')}>
            {listLabel(p)}
          </span>
        )
      })}
    </span>
  )
}

export const fmtSec = (s?: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '')
export const fmtMb = (b?: number | null) => (b ? `${(b / 1048576).toFixed(1)} MB` : '')

export function TrackTitle({ t }: { t: MusicTrack }) {
  return (
    <span className="min-w-0">
      <span className="text-slate-800">{t.title}</span>
      {t.version && <span className="text-slate-400"> · {t.version}</span>}
      {t.featuring && <span className="text-slate-400 text-xs"> feat. {t.featuring}</span>}
    </span>
  )
}

// ── one player for the whole page ────────────────────────────────────────────

interface PlayerState {
  current?: MusicTrack
  playing: boolean
  /** play this song; with a queue, the rest of it follows */
  play: (t: MusicTrack, queue?: MusicTrack[]) => void
  /** a list played in random order */
  shuffle: (queue: MusicTrack[]) => void
  toggle: () => void
}

const PlayerCtx = createContext<PlayerState | null>(null)
export const usePlayer = () => useContext(PlayerCtx)!

function shuffled<T>(a: T[]) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [queue, setQueue] = useState<MusicTrack[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = queue[index]

  const play = useCallback((t: MusicTrack, q?: MusicTrack[]) => {
    const list = (q ?? [t]).filter(x => x.hasAudio)
    const i = Math.max(0, list.findIndex(x => x.key === t.key))
    setQueue(list.length ? list : [t]); setIndex(list.length ? i : 0)
  }, [])
  const shuffle = useCallback((q: MusicTrack[]) => {
    const list = shuffled(q.filter(x => x.hasAudio))
    if (list.length) { setQueue(list); setIndex(0) }
  }, [])
  const toggle = useCallback(() => {
    const a = audio.current
    if (!a) return
    if (a.paused) void a.play(); else a.pause()
  }, [])
  const step = (d: number) => setIndex(i => (queue.length ? (i + d + queue.length) % queue.length : 0))

  useEffect(() => {
    const a = audio.current
    if (a && current?.audioUrl) { a.src = apiUrl(current.audioUrl)!; void a.play().catch(() => setPlaying(false)) }
  }, [current])

  const value = useMemo(() => ({ current, playing, play, shuffle, toggle }), [current, playing, play, shuffle, toggle])

  return (
    <PlayerCtx.Provider value={value}>
      {children}
      <audio ref={audio} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => (queue.length > 1 ? step(1) : setPlaying(false))} className="hidden" />
      {current && (
        <div className="fixed bottom-0 left-0 right-0 md:left-56 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-3 md:px-6 py-2.5
          flex items-center gap-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <button onClick={() => step(-1)} disabled={queue.length < 2} className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"><SkipBack size={16} /></button>
          <button onClick={toggle} className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 active:scale-95">
            {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>
          <button onClick={() => step(1)} disabled={queue.length < 2} className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"><SkipForward size={16} /></button>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate"><TrackTitle t={current} /></div>
            <div className="text-xs text-slate-400 truncate">
              {current.artist?.name}{current.album ? ` — ${current.album.title}` : ''}
              {queue.length > 1 && <span className="ml-2 tabular-nums">{index + 1} / {queue.length}</span>}
            </div>
          </div>
          {queue.length > 1 && (
            <button title="Shuffle again" onClick={() => shuffle(queue)} className="p-2 text-slate-400 hover:text-pink-500"><Shuffle size={16} /></button>
          )}
          <button title="Stop" onClick={() => { audio.current?.pause(); setQueue([]) }} className="p-2 text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
      )}
    </PlayerCtx.Provider>
  )
}

/** ▶ for one song (nothing when it has no file). */
export function PlayButton({ t, queue }: { t: MusicTrack; queue?: MusicTrack[] }) {
  const p = usePlayer()
  if (!t.hasAudio) return <span className="w-8 inline-block" />
  const on = p.current?.key === t.key
  return (
    <button onClick={e => { e.stopPropagation(); if (on) p.toggle(); else p.play(t, queue) }}
      className={clsx('w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors shrink-0',
        on ? 'bg-pink-500 text-white' : 'text-slate-400 hover:bg-pink-50 hover:text-pink-500')}
      aria-label={on && p.playing ? 'Pause' : 'Play'}>
      {on && p.playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
    </button>
  )
}
