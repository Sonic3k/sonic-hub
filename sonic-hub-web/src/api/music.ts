/* Music: the lists he kept (checkpoints of his folders, his Spotify playlists) and his Spotify listening — every stream
   of his extended streaming history, counted by the API under any filter. */
import { get } from './client';

export interface ArtistRef { key: string; name: string; country?: string | null }
export interface Track {
  key: string; title: string; version?: string | null; featuring?: string | null; artist?: ArtistRef | null;
  album?: { key: string; title: string; releaseYear?: number | null } | null;
  favorite?: number | null; durationSec?: number | null; firstHeard?: string | null; firstHeardEvidence?: string | null;
  hasAudio: boolean; audioUrl?: string | null; playlists?: string[];
}
export interface Playlist {
  key: string; title: string; kind: 'WINDOW' | 'FULL' | 'CURATED'; when?: string | null; takenAt?: string | null; windowFrom?: string | null;
  deviceName?: string | null; eventId?: string | null; eventTitle?: string | null; sourceFolder?: string | null; spotifyId?: string | null;
  summary?: string | null; note?: string | null; tracks: number; withAudio: number;
}
export interface Entry { position?: number | null; fileName?: string | null; note?: string | null; addedAt?: string | null; track?: Track | null }
export interface PlaylistDetail extends Playlist { entries: Entry[] }

/** starts = every stream; plays = the ones of 30 seconds or more; ms = time played; songs, artists, days, first, last = counted on plays */
export interface Totals { starts: number; plays: number; ms: number; songs: number; artists: number; days: number; first: string | null; last: string | null }
export interface Row { key: string; label: string | null; sub: string | null; version: string | null; trackKey: string | null; starts: number; plays: number; ms: number; songs: number; days: number; first: string | null; last: string | null }
export interface Point { bucket: string; key: string | null; plays: number; ms: number }
export interface Report { total: Totals; rows: Row[]; series: Point[] | null }
export interface YearRow { year: string; total: Totals; topSong: Row | null; topArtist: Row | null; topPlaylist: Row | null }
export interface Overview { total: Totals; years: YearRow[] }
export interface Song {
  id: string; key: string; title: string; version: string | null; artist: string; assessment: string | null; total: Totals;
  picked: number; passed: number; finished: number; recording: Track | null;
  tracks: { spotifyId: string; name: string; album: string | null; plays: number }[];
  lists: { key: string; title: string; addedAt: string | null }[];
}
export interface DayPlay {
  at: string; ms: number; songId: string; title: string; version: string | null; artist: string; album: string | null; device: string | null; place: string | null;
  context: string | null; playlistKey: string | null; playlistTitle: string | null; start: string | null; end: string | null; shuffle: boolean | null;
}
/** What a report is cut down to: a stretch of time (from, to not included) and any side of a stream. */
export interface Filters { from?: string; to?: string; song?: string; artist?: string; album?: string; playlist?: string; context?: string; device?: string; place?: string; q?: string }
export type Group = 'year' | 'month' | 'day' | 'hour' | 'weekday' | 'punch' | 'song' | 'artist' | 'album' | 'playlist' | 'context' | 'device' | 'place' | 'start' | 'end' | 'shuffle' | 'session';

export const musicApi = {
  lists: () => get<Playlist[]>('/music/playlists'),
  list: (key: string) => get<PlaylistDetail>(`/music/playlists/${encodeURIComponent(key)}`),
  overview: () => get<Overview>('/music/spotify/overview'),
  report: (group: Group, f: Filters = {}, o: { by?: 'year' | 'month' | 'day' | 'hour' | 'weekday'; sort?: string; limit?: number } = {}) =>
    get<Report>('/music/spotify/report', { group, ...f, ...o }),
  song: (id: string) => get<Song>(`/music/spotify/songs/${id}`),
  day: (date: string) => get<DayPlay[]>('/music/spotify/day', { date }),
};
