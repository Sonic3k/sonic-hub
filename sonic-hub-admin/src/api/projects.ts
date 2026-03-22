import api from './client'
import type { Project, Task, Todo, Problem } from '../types'

export interface ProjectRequest {
  name: string
  description?: string
  color?: string
}

export const projectsApi = {
  getAll: () => api.get<Project[]>('/api/projects').then(r => r.data),
  getById: (id: string) => api.get<Project>(`/api/projects/${id}`).then(r => r.data),
  create: (data: ProjectRequest) => api.post<Project>('/api/projects', data).then(r => r.data),
  update: (id: string, data: ProjectRequest) => api.put<Project>(`/api/projects/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),

  getTasks: (id: string) => api.get<Task[]>(`/api/projects/${id}/tasks`).then(r => r.data),
  getTodos: (id: string) => api.get<Todo[]>(`/api/projects/${id}/todos`).then(r => r.data),
  getProblems: (id: string) => api.get<Problem[]>(`/api/projects/${id}/problems`).then(r => r.data),
}
