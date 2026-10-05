import api from './client'
import type { TagResponse, TagRequest, TagStats } from '../types'

export const tagsApi = {
  getAll: () => api.get<TagResponse[]>('/api/tags').then(r => r.data),
  stats: () => api.get<TagStats[]>('/api/tags/stats').then(r => r.data),
  create: (data: TagRequest) => api.post<TagResponse>('/api/tags', data).then(r => r.data),
  update: (id: string, data: Partial<TagRequest>) => api.put<TagResponse>(`/api/tags/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/tags/${id}`),
}
