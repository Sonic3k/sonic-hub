import api from './client'
import type { Tag } from '../types'

export const tagsApi = {
  getAll: () => api.get<Tag[]>('/api/tags').then(r => r.data),
  create: (data: Partial<Tag>) => api.post<Tag>('/api/tags', data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/tags/${id}`),
}
