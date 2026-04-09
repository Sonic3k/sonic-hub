import api from './client'
import type { PersonSummary, PersonDetail, PersonRequest } from '../types'

export const personsApi = {
  getAll: () => api.get<PersonSummary[]>('/api/persons').then(r => r.data),
  getById: (id: number) => api.get<PersonDetail>(`/api/persons/${id}`).then(r => r.data),
  create: (data: PersonRequest) => api.post<PersonDetail>('/api/persons', data).then(r => r.data),
  update: (id: number, data: PersonRequest) => api.put<PersonDetail>(`/api/persons/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/persons/${id}`),
}
