import api from './client'
import type { FactResponse, FactRequest, EpisodeResponse, EpisodeRequest, ChapterResponse, ChapterRequest, TraitResponse, TraitRequest, ChatArchiveResponse } from '../types'

const base = (pid: string) => `/api/persons/${pid}`

export const memoryApi = {
  getFacts: (pid: string) => api.get<FactResponse[]>(`${base(pid)}/memory/facts`).then(r => r.data),
  createFact: (pid: string, data: FactRequest) => api.post<FactResponse>(`${base(pid)}/memory/facts`, data).then(r => r.data),
  deleteFact: (pid: string, id: string) => api.delete(`${base(pid)}/memory/facts/${id}`),

  getEpisodes: (pid: string) => api.get<EpisodeResponse[]>(`${base(pid)}/memory/episodes`).then(r => r.data),
  createEpisode: (pid: string, data: EpisodeRequest) => api.post<EpisodeResponse>(`${base(pid)}/memory/episodes`, data).then(r => r.data),
  deleteEpisode: (pid: string, id: string) => api.delete(`${base(pid)}/memory/episodes/${id}`),

  getChapters: (pid: string) => api.get<ChapterResponse[]>(`${base(pid)}/memory/chapters`).then(r => r.data),
  createChapter: (pid: string, data: ChapterRequest) => api.post<ChapterResponse>(`${base(pid)}/memory/chapters`, data).then(r => r.data),
  deleteChapter: (pid: string, id: string) => api.delete(`${base(pid)}/memory/chapters/${id}`),

  getTraits: (pid: string) => api.get<TraitResponse[]>(`${base(pid)}/memory/traits`).then(r => r.data),
  createTrait: (pid: string, data: TraitRequest) => api.post<TraitResponse>(`${base(pid)}/memory/traits`, data).then(r => r.data),
  deleteTrait: (pid: string, id: string) => api.delete(`${base(pid)}/memory/traits/${id}`),

  getArchives: (pid: string) => api.get<ChatArchiveResponse[]>(`${base(pid)}/chat-archives`).then(r => r.data),
}
