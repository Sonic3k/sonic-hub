import api from './client'
import type { TagResponse, TagRequest } from '../types'

export const tagsApi = {
  getAll: () => api.get<TagResponse[]>('/api/tags').then(r => r.data),
  create: (data: TagRequest) => api.post<TagResponse>('/api/tags', data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/tags/${id}`),
}
