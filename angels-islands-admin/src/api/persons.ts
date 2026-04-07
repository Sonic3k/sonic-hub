import api from './client'
import type { Person } from '../types'

export const personsApi = {
  getAll: () => api.get<Person[]>('/api/persons').then(r => r.data),
  getById: (id: number) => api.get<Person>(`/api/persons/${id}`).then(r => r.data),
  create: (data: Partial<Person>) => api.post<Person>('/api/persons', data).then(r => r.data),
  update: (id: number, data: Partial<Person>) => api.put<Person>(`/api/persons/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/persons/${id}`),
}
