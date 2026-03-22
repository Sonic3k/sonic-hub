import api from './client'
import type { Tag, TagRequest } from '../types'

export const tagsApi = {
  getAll: () =>
    api.get<Tag[]>('/api/tags').then(r => r.data),

  create: (data: TagRequest) =>
    api.post<Tag>('/api/tags', data).then(r => r.data),

  update: (id: string, data: TagRequest) =>
    api.put<Tag>(`/api/tags/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/tags/${id}`),
}
