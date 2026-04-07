import api from './client'
import type { Collection } from '../types'

export const collectionsApi = {
  getAll: () => api.get<Collection[]>('/api/collections').then(r => r.data),
  create: (data: Partial<Collection>) => api.post<Collection>('/api/collections', data).then(r => r.data),
  update: (id: number, data: Partial<Collection>) => api.put<Collection>(`/api/collections/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/collections/${id}`),
}
