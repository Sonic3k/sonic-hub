import api from './client'
import type { CollectionResponse, CollectionRequest } from '../types'

export const collectionsApi = {
  getAll: () => api.get<CollectionResponse[]>('/api/collections').then(r => r.data),
  create: (data: CollectionRequest) => api.post<CollectionResponse>('/api/collections', data).then(r => r.data),
  update: (id: number, data: CollectionRequest) => api.put<CollectionResponse>(`/api/collections/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/collections/${id}`),
}
