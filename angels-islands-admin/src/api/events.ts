import api from './client'
import type { LifeEventAt, LifeEventDetail, LifeEventRequest, LifeEventSummary } from '../types'

export const eventsApi = {
  list: (params?: { personId?: string; kind?: string; q?: string }) => api.get<LifeEventSummary[]>('/api/events', { params }).then(r => r.data),
  get: (id: string) => api.get<LifeEventDetail>(`/api/events/${id}`).then(r => r.data),
  create: (d: LifeEventRequest) => api.post<LifeEventDetail>('/api/events', d).then(r => r.data),
  update: (id: string, d: LifeEventRequest) => api.put<LifeEventDetail>(`/api/events/${id}`, d).then(r => r.data),
  remove: (id: string) => api.delete(`/api/events/${id}`),
  at: (moment: string, personId?: string) => api.get<LifeEventAt>('/api/events/at', { params: { moment, personId } }).then(r => r.data),
}
