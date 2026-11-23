import api from './client'
import type { Dream, DreamRequest } from '../types'

export const dreamsApi = {
  /** newest morning first; people and events only when asked (the editor reads the whole dream with get) */
  list: (params?: { personId?: string; q?: string; inclPersons?: boolean; inclEvents?: boolean }) => api.get<Dream[]>('/api/dreams', { params }).then(r => r.data),
  get: (id: string) => api.get<Dream>(`/api/dreams/${id}`).then(r => r.data),
  create: (d: DreamRequest) => api.post<Dream>('/api/dreams', d).then(r => r.data),
  update: (id: string, d: DreamRequest) => api.put<Dream>(`/api/dreams/${id}`, d).then(r => r.data),
  remove: (id: string) => api.delete(`/api/dreams/${id}`),
}
