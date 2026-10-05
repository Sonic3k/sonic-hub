import api from './client'
import type { JournalNoteResponse, JournalNoteRequest, ProblemResponse, ProblemRequest, Paged, JournalAuthor } from '../types'

export const journalApi = {
  /** author: 'me' | 'others' | an author name; authorId: one person's writings */
  notes: (params: { page?: number; size?: number; q?: string; kind?: string; status?: string; category?: string; problemId?: string; tagId?: string; author?: string; authorId?: string }) =>
    api.get<Paged<JournalNoteResponse>>('/api/journal/notes', { params }).then(r => r.data),
  authors: () => api.get<JournalAuthor[]>('/api/journal/authors').then(r => r.data),
  categories: () => api.get<string[]>('/api/journal/categories').then(r => r.data),
  createNote: (data: JournalNoteRequest) =>
    api.post<JournalNoteResponse>('/api/journal/notes', data).then(r => r.data),
  updateNote: (id: string, data: JournalNoteRequest) =>
    api.put<JournalNoteResponse>(`/api/journal/notes/${id}`, data).then(r => r.data),
  deleteNote: (id: string) => api.delete(`/api/journal/notes/${id}`),

  problems: () => api.get<ProblemResponse[]>('/api/journal/problems').then(r => r.data),
  createProblem: (data: ProblemRequest) =>
    api.post<ProblemResponse>('/api/journal/problems', data).then(r => r.data),
  updateProblem: (id: string, data: ProblemRequest) =>
    api.put<ProblemResponse>(`/api/journal/problems/${id}`, data).then(r => r.data),
  deleteProblem: (id: string) => api.delete(`/api/journal/problems/${id}`),
}
