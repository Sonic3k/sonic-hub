import api from './client'
import type { Task, Todo, Problem, Project, Tag, TaskStatus, Priority, ProblemStatus } from '../types'

// --- Tasks ---
export const tasksApi = {
  getRoots: (status?: TaskStatus) =>
    api.get<Task[]>('/api/tasks', { params: status ? { status } : {} }).then(r => r.data),
  getChildren: (id: string) =>
    api.get<Task[]>(`/api/tasks/${id}/children`).then(r => r.data),
  create: (data: Partial<Task> & { title: string; tagIds?: string[] }) =>
    api.post<Task>('/api/tasks', data).then(r => r.data),
  update: (id: string, data: Partial<Task> & { title: string; tagIds?: string[]; priority?: Priority; dueDate?: string; status?: TaskStatus }) =>
    api.put<Task>(`/api/tasks/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
}

// --- Todos ---
export const todosApi = {
  getAll: () => api.get<Todo[]>('/api/todos').then(r => r.data),
  create: (data: { title: string; projectId?: string; tagIds?: string[] }) =>
    api.post<Todo>('/api/todos', data).then(r => r.data),
  update: (id: string, data: { title: string; projectId?: string; tagIds?: string[] }) =>
    api.put<Todo>(`/api/todos/${id}`, data).then(r => r.data),
  toggleDone: (id: string) => api.patch<Todo>(`/api/todos/${id}/done`).then(r => r.data),
  delete: (id: string) => api.delete(`/api/todos/${id}`),
}

// --- Problems ---
export const problemsApi = {
  getAll: (status?: ProblemStatus) =>
    api.get<Problem[]>('/api/problems', { params: status ? { status } : {} }).then(r => r.data),
  create: (data: { title: string; note?: string; status?: ProblemStatus; projectId?: string; tagIds?: string[] }) =>
    api.post<Problem>('/api/problems', data).then(r => r.data),
  update: (id: string, data: Partial<Problem> & { title: string; tagIds?: string[] }) =>
    api.put<Problem>(`/api/problems/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/problems/${id}`),
}

// --- Projects ---
export const projectsApi = {
  getAll: () => api.get<Project[]>('/api/projects').then(r => r.data),
}

// --- Tags ---
export const tagsApi = {
  getAll: () => api.get<Tag[]>('/api/tags').then(r => r.data),
}
