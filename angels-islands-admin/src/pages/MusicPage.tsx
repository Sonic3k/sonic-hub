import { useState } from 'react'
import { Disc3, ListMusic, Mic2, Music2, Users } from 'lucide-react'
import { PlayerProvider } from '../components/music/shared'
import SongsTab from '../components/music/SongsTab'
import ArtistsTab from '../components/music/ArtistsTab'
import AlbumsTab from '../components/music/AlbumsTab'
import ListsTab from '../components/music/ListsTab'
import CdsTab from '../components/music/CdsTab'

type Tab = 'songs' | 'artists' | 'albums' | 'lists' | 'cds'

const TABS: { key: Tab; label: string; icon: typeof Music2 }[] = [
  { key: 'songs', label: 'Songs', icon: Music2 },
  { key: 'artists', label: 'Artists', icon: Users },
  { key: 'albums', label: 'Albums', icon: Mic2 },
  { key: 'lists', label: 'His lists', icon: ListMusic },
  { key: 'cds', label: 'CDs', icon: Disc3 },
]

/** The songs he loves: favorites, when he started on each, the lists of each period, his CDs. One player for the page. */
export default function MusicPage() {
  const [tab, setTab] = useState<Tab>('songs')
  return (
    <PlayerProvider>
      <div className="p-4 md:p-8 pb-28">
        <h1 className="text-lg font-semibold text-slate-800 mb-5">Music</h1>
        <div className="flex gap-1 mb-6 border-b border-slate-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm shrink-0 font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>
        {tab === 'songs' && <SongsTab />}
        {tab === 'artists' && <ArtistsTab />}
        {tab === 'albums' && <AlbumsTab />}
        {tab === 'lists' && <ListsTab />}
        {tab === 'cds' && <CdsTab />}
      </div>
    </PlayerProvider>
  )
}
