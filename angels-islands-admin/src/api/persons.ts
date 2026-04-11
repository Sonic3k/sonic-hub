import api from './client'
import type { PersonSummary, PersonDetail, PersonRequest, ContactResponse, ContactRequest } from '../types'

export const personsApi = {
  getAll: () => api.get<PersonSummary[]>('/api/persons').then(r => r.data),
  getById: (id: string) => api.get<PersonDetail>(`/api/persons/${id}`).then(r => r.data),
  create: (data: PersonRequest) => api.post<PersonDetail>('/api/persons', data).then(r => r.data),
  update: (id: string, data: PersonRequest) => api.put<PersonDetail>(`/api/persons/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/persons/${id}`),
  // Contacts
  getContacts: (id: string) => api.get<ContactResponse[]>(`/api/persons/${id}/contacts`).then(r => r.data),
  addContact: (id: string, data: ContactRequest) => api.post<ContactResponse>(`/api/persons/${id}/contacts`, data).then(r => r.data),
  updateContact: (personId: string, contactId: string, data: ContactRequest) => api.put<ContactResponse>(`/api/persons/${personId}/contacts/${contactId}`, data).then(r => r.data),
  deleteContact: (personId: string, contactId: string) => api.delete(`/api/persons/${personId}/contacts/${contactId}`),
}
