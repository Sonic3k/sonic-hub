import api from './client'
import type { Problem, ProblemRequest, ProblemStatus } from '../types'

export const problemsApi = {
  getAll: (status?: ProblemStatus) =>
    api.get<Problem[]>('/api/problems', { params: status ? { status } : {} }).then(r => r.data),
  getById: (id: string) => api.get<Problem>(`/api/problems/${id}`).then(r => r.data),
  create: (data: ProblemRequest) => api.post<Problem>('/api/problems', data).then(r => r.data),
  update: (id: string, data: ProblemRequest) => api.put<Problem>(`/api/problems/${id}`, data).then(r => r.data),
  addTag: (problemId: string, tagId: string) => api.post<Problem>(`/api/problems/${problemId}/tags/${tagId}`).then(r => r.data),
  removeTag: (problemId: string, tagId: string) => api.delete<Problem>(`/api/problems/${problemId}/tags/${tagId}`).then(r => r.data),
  delete: (id: string) => api.delete(`/api/problems/${id}`),
}
