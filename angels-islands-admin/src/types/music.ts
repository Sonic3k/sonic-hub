// His music: see angels-islands-api MusicDto.

export interface ArtistRef { key: string; name: string; country?: string | null }
export interface AlbumRef { key: string; title: string; releaseYear?: number | null }
export interface PlaylistRef { key: string; title: string; kind: PlaylistKind; when?: string | null }

export type ArtistKind = 'SOLO' | 'GROUP' | 'DUO' | 'PROJECT' | 'VARIOUS'
export type AlbumKind = 'ALBUM' | 'SINGLE' | 'EP' | 'COMPILATION' | 'LIVE' | 'SOUNDTRACK'
export type LinkKind = 'YOUTUBE' | 'SPOTIFY' | 'APPLE_MUSIC' | 'SOUNDCLOUD' | 'LYRICS' | 'WIKI' | 'OFFICIAL' | 'OTHER'
export type TieRole = 'BACKGROUND' | 'TIED' | 'MENTIONED'
export type PlaylistKind = 'WINDOW' | 'FULL' | 'CURATED'

export interface MusicArtist {
  id: string; key: string; name: string; kind?: ArtistKind | null; country?: string | null
  summary?: string | null; note?: string | null; parent?: ArtistRef | null; favorite?: number | null
  tracks: number; albums: number; members: ArtistRef[]
}
export interface MusicArtistDetail extends MusicArtist {
  imageMediaId?: string | null; albumList: MusicAlbum[]; trackList: MusicTrack[]
}

export interface MusicAlbum {
  id: string; key: string; title: string; kind?: AlbumKind | null; coverUrl?: string | null
  summary?: string | null; note?: string | null; artist?: ArtistRef | null
  releaseYear?: number | null; favorite?: number | null; tracks: number; cds: number
}
export interface MusicAlbumDetail extends MusicAlbum {
  coverMediaId?: string | null; trackList: MusicTrack[]; cdList: MusicCd[]
}

export interface MusicTrack {
  id: string; key: string; title: string; version?: string | null; featuring?: string | null
  language?: string | null; genre?: string | null
  firstHeard?: string | null; firstHeardPrecision?: string | null; firstHeardEvidence?: string | null; firstHeardAt?: string | null; firstHeardApprox: boolean
  audioUrl?: string | null; hasAudio: boolean; versionOfKey?: string | null
  artist?: ArtistRef | null; album?: AlbumRef | null
  favorite?: number | null; releaseYear?: number | null; durationSec?: number | null; trackNo?: number | null
  playlists: string[]
}
export interface MusicLink { id: string; kind: LinkKind; title?: string | null; url: string; note?: string | null }
export interface MusicMemoryLink {
  id: string; title?: string | null; summary?: string | null; when?: string | null; kind?: string | null
  role: TieRole; note?: string | null; coverUrl?: string | null; occurredAt?: string | null
}
export interface MusicEventLink { id: string; title: string; when?: string | null; kind?: string | null; role: TieRole; note?: string | null; startAt?: string | null }
export interface MusicTrackDetail extends MusicTrack {
  summary?: string | null; note?: string | null
  audioFileName?: string | null; audioMime?: string | null; audioSourcePath?: string | null; audioSize?: number | null; audioBitrate?: number | null
  links: MusicLink[]; memories: MusicMemoryLink[]; events: MusicEventLink[]; inPlaylists: PlaylistRef[]; versions: MusicTrack[]
}

export interface MusicCdMedia {
  linkId: string; role: 'PHOTO' | 'SCAN'; label?: string | null
  media: { id: string; fileName?: string; cdnUrl?: string; thumbnailUrl?: string; effectiveDate?: string | null }
}
export interface MusicCd {
  id: string; key: string; title: string; edition?: string | null; format?: string | null
  acquired?: string | null; acquiredVia?: string | null; sourceFolder?: string | null; note?: string | null
  album?: AlbumRef | null; artist?: ArtistRef | null; discs?: number | null; acquiredAt?: string | null
  media: MusicCdMedia[]
}

export interface MusicPlaylist {
  id: string; key: string; title: string; kind: PlaylistKind; when?: string | null
  deviceKey?: string | null; deviceName?: string | null; eventId?: string | null; eventTitle?: string | null
  sourceFolder?: string | null; summary?: string | null; note?: string | null
  takenAt?: string | null; takenEnd?: string | null; windowFrom?: string | null; sortOrder?: number | null
  tracks: number; withAudio: number
}
export interface MusicEntry { position?: number | null; fileName?: string | null; note?: string | null; fileModifiedAt?: string | null; track?: MusicTrack | null }
export interface MusicPlaylistDetail extends MusicPlaylist { entries: MusicEntry[] }

// ── write (fields left out keep what is there; '' clears text; favorite 0 clears) ──
export interface ArtistIn { name?: string; kind?: string; country?: string; parentKey?: string; summary?: string; note?: string; favorite?: number }
export interface AlbumIn { title?: string; artistKey?: string; kind?: string; releaseYear?: number; summary?: string; note?: string; favorite?: number }
export interface TieIn { id: string; role?: TieRole; note?: string | null }
export interface TrackIn {
  title?: string; version?: string; artistKey?: string; featuring?: string; albumKey?: string; language?: string; genre?: string
  summary?: string; note?: string; favorite?: number
  firstHeard?: string; firstHeardPrecision?: string; firstHeardApprox?: boolean; firstHeardEvidence?: string
  links?: { kind: LinkKind; title?: string | null; url: string; note?: string | null }[]
  memories?: TieIn[]; events?: TieIn[]
}
export interface PlaylistIn { title?: string; summary?: string; note?: string; device?: string; eventId?: string }
