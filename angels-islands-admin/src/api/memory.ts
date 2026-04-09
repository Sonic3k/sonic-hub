import api from './client'
import type { FactResponse, FactRequest, EpisodeResponse, EpisodeRequest, ChapterResponse, ChapterRequest, TraitResponse, TraitRequest, ChatArchiveResponse } from '../types'

const base = (pid: number) => `/api/persons/${pid}`

export const memoryApi = {
  getFacts: (pid: number) => api.get<FactResponse[]>(`${base(pid)}/memory/facts`).then(r => r.data),
  createFact: (pid: number, data: FactRequest) => api.post<FactResponse>(`${base(pid)}/memory/facts`, data).then(r => r.data),
  deleteFact: (pid: number, id: number) => api.delete(`${base(pid)}/memory/facts/${id}`),

  getEpisodes: (pid: number) => api.get<EpisodeResponse[]>(`${base(pid)}/memory/episodes`).then(r => r.data),
  createEpisode: (pid: number, data: EpisodeRequest) => api.post<EpisodeResponse>(`${base(pid)}/memory/episodes`, data).then(r => r.data),
  deleteEpisode: (pid: number, id: number) => api.delete(`${base(pid)}/memory/episodes/${id}`),

  getChapters: (pid: number) => api.get<ChapterResponse[]>(`${base(pid)}/memory/chapters`).then(r => r.data),
  createChapter: (pid: number, data: ChapterRequest) => api.post<ChapterResponse>(`${base(pid)}/memory/chapters`, data).then(r => r.data),
  deleteChapter: (pid: number, id: number) => api.delete(`${base(pid)}/memory/chapters/${id}`),

  getTraits: (pid: number) => api.get<TraitResponse[]>(`${base(pid)}/memory/traits`).then(r => r.data),
  createTrait: (pid: number, data: TraitRequest) => api.post<TraitResponse>(`${base(pid)}/memory/traits`, data).then(r => r.data),
  deleteTrait: (pid: number, id: number) => api.delete(`${base(pid)}/memory/traits/${id}`),

  getArchives: (pid: number) => api.get<ChatArchiveResponse[]>(`${base(pid)}/chat-archives`).then(r => r.data),
}
