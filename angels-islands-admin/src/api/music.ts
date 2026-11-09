import api from './client'
import type {
  MusicArtist, MusicArtistDetail, MusicAlbum, MusicAlbumDetail, MusicTrack, MusicTrackDetail, MusicCd,
  MusicPlaylist, MusicPlaylistDetail, ArtistIn, AlbumIn, TrackIn, PlaylistIn,
} from '../types/music'

/** A path the API gives (an audio file) as a full address. */
export const apiUrl = (path?: string | null) => (path ? `${api.defaults.baseURL ?? ''}${path}` : undefined)

export const musicApi = {
  artists: () => api.get<MusicArtist[]>('/api/music/artists').then(r => r.data),
  artist: (key: string) => api.get<MusicArtistDetail>(`/api/music/artists/${key}`).then(r => r.data),
  putArtist: (key: string, d: ArtistIn) => api.put<MusicArtistDetail>(`/api/music/artists/${key}`, d).then(r => r.data),

  albums: () => api.get<MusicAlbum[]>('/api/music/albums').then(r => r.data),
  album: (key: string) => api.get<MusicAlbumDetail>(`/api/music/albums/${key}`).then(r => r.data),
  putAlbum: (key: string, d: AlbumIn) => api.put<MusicAlbumDetail>(`/api/music/albums/${key}`, d).then(r => r.data),

  tracks: () => api.get<MusicTrack[]>('/api/music/tracks').then(r => r.data),
  track: (key: string) => api.get<MusicTrackDetail>(`/api/music/tracks/${key}`).then(r => r.data),
  putTrack: (key: string, d: TrackIn) => api.put<MusicTrackDetail>(`/api/music/tracks/${key}`, d).then(r => r.data),

  cds: () => api.get<MusicCd[]>('/api/music/cds').then(r => r.data),

  playlists: () => api.get<MusicPlaylist[]>('/api/music/playlists').then(r => r.data),
  playlist: (key: string) => api.get<MusicPlaylistDetail>(`/api/music/playlists/${key}`).then(r => r.data),
  putPlaylist: (key: string, d: PlaylistIn) => api.put<MusicPlaylistDetail>(`/api/music/playlists/${key}`, d).then(r => r.data),
}
