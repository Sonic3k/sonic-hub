import api from './client'
import type { Todo, TodoRequest } from '../types'

export const todosApi = {
  getAll: (standalone?: boolean) =>
    api.get<Todo[]>('/api/todos', { params: standalone ? { standalone: true } : {} }).then(r => r.data),
  getById: (id: string) => api.get<Todo>(`/api/todos/${id}`).then(r => r.data),
  create: (data: TodoRequest) => api.post<Todo>('/api/todos', data).then(r => r.data),
  update: (id: string, data: TodoRequest) => api.put<Todo>(`/api/todos/${id}`, data).then(r => r.data),
  toggleDone: (id: string) => api.patch<Todo>(`/api/todos/${id}/done`).then(r => r.data),
  addTag: (todoId: string, tagId: string) => api.post<Todo>(`/api/todos/${todoId}/tags/${tagId}`).then(r => r.data),
  removeTag: (todoId: string, tagId: string) => api.delete<Todo>(`/api/todos/${todoId}/tags/${tagId}`).then(r => r.data),
  delete: (id: string) => api.delete(`/api/todos/${id}`),
}
