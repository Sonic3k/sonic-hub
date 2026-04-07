import api from './client'
import type { Fact, Episode, LifeChapter, PersonalityTrait, ChatArchive, ChatMessage } from '../types'

const base = (personId: number) => `/api/persons/${personId}`

export const memoryApi = {
  getFacts: (pid: number) => api.get<Fact[]>(`${base(pid)}/memory/facts`).then(r => r.data),
  createFact: (pid: number, data: Partial<Fact>) => api.post<Fact>(`${base(pid)}/memory/facts`, data).then(r => r.data),
  deleteFact: (pid: number, id: number) => api.delete(`${base(pid)}/memory/facts/${id}`),

  getEpisodes: (pid: number) => api.get<Episode[]>(`${base(pid)}/memory/episodes`).then(r => r.data),
  createEpisode: (pid: number, data: Partial<Episode>) => api.post<Episode>(`${base(pid)}/memory/episodes`, data).then(r => r.data),
  deleteEpisode: (pid: number, id: number) => api.delete(`${base(pid)}/memory/episodes/${id}`),

  getChapters: (pid: number) => api.get<LifeChapter[]>(`${base(pid)}/memory/chapters`).then(r => r.data),
  createChapter: (pid: number, data: Partial<LifeChapter>) => api.post<LifeChapter>(`${base(pid)}/memory/chapters`, data).then(r => r.data),
  deleteChapter: (pid: number, id: number) => api.delete(`${base(pid)}/memory/chapters/${id}`),

  getTraits: (pid: number) => api.get<PersonalityTrait[]>(`${base(pid)}/memory/traits`).then(r => r.data),
  createTrait: (pid: number, data: Partial<PersonalityTrait>) => api.post<PersonalityTrait>(`${base(pid)}/memory/traits`, data).then(r => r.data),
  deleteTrait: (pid: number, id: number) => api.delete(`${base(pid)}/memory/traits/${id}`),

  getArchives: (pid: number) => api.get<ChatArchive[]>(`${base(pid)}/chat-archives`).then(r => r.data),
  getMessages: (pid: number, archiveId: number) => api.get<ChatMessage[]>(`${base(pid)}/chat-archives/${archiveId}/messages`).then(r => r.data),
}
