import api from './client'

/** Kệ game (the game shelf) as the API gives and takes it. */
export interface GameCard {
  id: string; key: string; title: string; kind: string; platform?: string | null; played?: string | null; releaseYear?: number | null
  series?: { key: string; name: string } | null; seriesOrder?: number | null; favorite: boolean; handName?: string | null; handOrder?: number | null
  coverUrl?: string | null; iconUrl?: string | null; mine?: boolean; basedOnKey?: string | null; developer?: string | null; genre?: string | null; versions?: string | null
}
export interface GamePlay { id?: string; startAt?: string; endAt?: string | null; precision?: string; deviceKey?: string | null; via?: string | null; version?: string | null; evidence?: string | null; note?: string | null; approx?: boolean }
export interface GameLink { id?: string; kind: string; title?: string | null; url: string; note?: string | null }
export interface GameMedia { linkId: string; role: string; label?: string | null; media: { id: string; cdnUrl: string; fileName: string; caption?: string | null } }
export interface GameMemory { id: string; title?: string | null; when?: string | null }
export interface GamePackage { key: string; engine: string; title?: string | null; fileName?: string | null; fileSize?: number | null; saveFileName?: string | null; saveAt?: string | null; hasFile: boolean; hasSave: boolean; portal: boolean; config?: string | null }
export interface GameDetail extends GameCard { summary?: string | null; note?: string | null; plays: GamePlay[]; links: GameLink[]; media: GameMedia[]; memories: GameMemory[]; packages: GamePackage[] }
export interface GameSeries { key: string; name: string; summary?: string | null; sortOrder?: number | null }
export interface PlayIn { start: string; precision?: string; end?: string; device?: string; via?: string; version?: string; evidence?: string; note?: string; approx?: boolean }
export interface GameIn {
  title?: string; seriesKey?: string; seriesOrder?: number; kind?: string; basedOnKey?: string; platform?: string; releaseYear?: number
  developer?: string; genre?: string; versions?: string; summary?: string; note?: string; favorite?: boolean; handName?: string; handOrder?: number
  plays?: PlayIn[]; links?: GameLink[]; memoryIds?: string[]
}

export const gamesApi = {
  list: () => api.get<GameCard[]>('/api/games').then(r => r.data),
  get: (key: string) => api.get<GameDetail>(`/api/games/${key}`).then(r => r.data),
  put: (key: string, d: GameIn) => api.put<GameDetail>(`/api/games/${key}`, d).then(r => r.data),
  remove: (key: string) => api.delete(`/api/games/${key}`),
  series: () => api.get<GameSeries[]>('/api/game-series').then(r => r.data),
  unlink: (key: string, linkId: string) => api.delete(`/api/games/${key}/media/${linkId}`),
  asset: (key: string, file: File, role: string, label?: string) => {
    const f = new FormData(); f.append('file', file); f.append('role', role); if (label) f.append('label', label); f.append('lastModified', String(file.lastModified))
    return api.post(`/api/games/${key}/assets`, f, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  packageFile: (pkg: string, file: File, what: 'file' | 'save') => {
    const f = new FormData(); f.append('file', file); f.append('lastModified', String(file.lastModified))
    return api.post(`/api/game-packages/${pkg}/${what}`, f, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 }).then(r => r.data)
  },
}
